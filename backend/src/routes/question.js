// src/routes/question.js

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const { authenticateToken, authorizeAdmin } = require("../middleware/auth");
const { GoogleGenAI } = require("@google/genai");

const prisma = new PrismaClient();
const router = express.Router();

// Danh sách cho phép của subject và type để validate
const ALLOWED_SUBJECTS = ["Toan", "Van", "Anh", "Ly", "Hoa", "Sinh", "Su", "Dia"];
const ALLOWED_TYPES = ["single", "multi", "boolean"];

/**
 * Hàm gọi Gemini (GoogleGenAI) để phân loại subject + type.
 * @param {Object} contentObj chính là object JSON của câu hỏi (client gửi).
 * @returns {Promise<{subject: string, type: string}>} kết quả phân loại
 */
async function classifyWithGemini(contentObj) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("Thiếu biến môi trường GEMINI_API_KEY");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Chuyển contentObj thành string JSON để đưa vào prompt
  const contentStr = JSON.stringify(contentObj);

  const config = {
    responseMimeType: "application/json",
    systemInstruction: [
      {
        text: `Dưới đây là câu hỏi thuộc một trong các môn: Toan, Ly, Hoa, Sinh, Su, Dia, Anh, Van.
Và thuộc một trong các loại: Trắc nghiệm 1 đáp án (single), Trắc nghiệm nhiều đáp án (multi), Đúng/Sai (boolean).
Hãy phân loại câu hỏi theo môn và loại câu hỏi.
Đầu ra có dạng JSON: {"subject":"môn học","type":"loại câu hỏi"}.
Chỉ trả về JSON thuần, không văn bản thừa.
Môn Toán là Toan, Văn là Van, Lý là Ly, Hoá là Hoa, Sinh là Sinh, Sử là Su, Địa là Dia, Tiếng Anh là Anh.
Loại câu hỏi là: single, multi, boolean.`,
      },
    ],
  };

  const contents = [
    {
      role: "user",
      parts: [
        {
          text: contentStr,
        },
      ],
    },
  ];

  // Gọi API tạo content stream
  const responseStream = await ai.models.generateContentStream({
    model: "gemini-2.0-flash",
    config,
    contents,
  });

  // Kết hợp các chunk trả về thành 1 string rồi parse JSON
  let fullText = "";
  for await (const chunk of responseStream) {
    fullText += chunk.text;
  }

  try {
    // fullText phải là JSON: {"subject":"...","type":"..."}
    const parsed = JSON.parse(fullText);
    const { subject, type } = parsed;

    return { subject, type };
  } catch (e) {
    throw new Error("Gemini trả về không phải JSON hợp lệ: " + fullText);
  }
}

/**
 * POST /questions
 * Body: {
 *   content: {...},              // JSON object của câu hỏi (bắt buộc)
 *   subject: "Toan" | "Van" | ...,// nếu ai_check=false thì bắt buộc và phải hợp lệ
 *   type: "single" | "multi" | "boolean", // nếu ai_check=false thì bắt buộc và phải hợp lệ
 *   ai_check: true | false       // mặc định false, nếu true sẽ override subject+type bằng kết quả AI
 * }
 *
 * Chỉ ADMIN mới được phép gọi.
 */
router.post(
  "/questions",
  authenticateToken,
  authorizeAdmin,
  async (req, res) => {
    try {
      const { content, subject, type, ai_check } = req.body;

      // 1. Kiểm tra content
      if (!content) {
        return res
          .status(400)
          .json({ error: "Trường 'content' (JSON) là bắt buộc." });
      }

      // Client gửi content ở dạng object (parsed JSON). Ta có thể kiểm tra sơ bộ:
      if (typeof content !== "object") {
        return res
          .status(400)
          .json({ error: "Trường 'content' phải là một JSON object." });
      }

      // 2. Xử lý ai_check
      let finalSubject = subject;
      let finalType = type;

      if (ai_check) {
        // Gọi Gemini để tự phân loại
        try {
          const result = await classifyWithGemini(content);
          finalSubject = result.subject;
          finalType = result.type;
        } catch (err) {
          console.error("Lỗi khi gọi Gemini:", err);
          return res
            .status(500)
            .json({ error: "Không thể phân loại bằng AI: " + err.message });
        }
      } else {
        // Nếu ai_check = false, thì subject và type do client gửi phải hợp lệ
        if (!finalSubject || !finalType) {
          return res
            .status(400)
            .json({ error: "Phải cung cấp 'subject' và 'type' khi ai_check=false." });
        }
      }

      // 3. Validate finalSubject và finalType
      if (!ALLOWED_SUBJECTS.includes(finalSubject)) {
        return res.status(400).json({
          error:
            "Giá trị 'subject' không hợp lệ. Phải là một trong: " +
            ALLOWED_SUBJECTS.join(", "),
        });
      }
      if (!ALLOWED_TYPES.includes(finalType)) {
        return res.status(400).json({
          error:
            "Giá trị 'type' không hợp lệ. Phải là một trong: " +
            ALLOWED_TYPES.join(", "),
        });
      }

      // 4. Lưu vào database
      const created = await prisma.question.create({
        data: {
          content: content, // Prisma tự cast sang Json
          subject: finalSubject,
          type: finalType,
          aiCheck: Boolean(ai_check),
          createdById: req.user.id,
        },
      });

      return res.status(201).json({
        message: "Tạo câu hỏi thành công.",
        question: created,
      });
    } catch (e) {
      console.error("Lỗi khi tạo question:", e);
      return res.status(500).json({ error: "Lỗi server." });
    }
  }
);

router.get(
    "/list",
    authenticateToken,
    authorizeAdmin,
    async (req, res) => {
      try {
        // 1. Đọc page & pageSize từ query string, ép kiểu
        const page = parseInt(req.query.page, 10) || 1;
        const pageSize = parseInt(req.query.pageSize, 10) || 10;
        if (page < 1 || pageSize < 1) {
          return res.status(400).json({
            error: "page và pageSize phải là số nguyên >= 1.",
          });
        }
  
        const skip = (page - 1) * pageSize;
  
        // 2. Lấy danh sách question (skip/take) và đếm tổng
        const [questions, total] = await Promise.all([
          prisma.question.findMany({
            skip,
            take: pageSize,
            orderBy: { createdAt: "desc" },
          }),
          prisma.question.count(),
        ]);
  
        // 3. Chuyển mỗi question thành đối tượng tách riêng question + answers
        const formatted = questions.map((q) => {
          // content đã lưu trong DB
          const content = q.content;
  
          // Với type single/multi: content.question & content.answers (mảng)
          // Với type boolean: content.question & content.isTrue (boolean)
          let questionText = "";
          let answersData = null;
  
          if (q.type === "single" || q.type === "multi") {
            // Mong content có dạng { question: string, answers: [ { content, isCorrect }, … ] }
            questionText = content.question;
            answersData = content.answers || [];
          } else if (q.type === "boolean") {
            // Mong content có dạng { question: string, isTrue: boolean }
            questionText = content.question;
            answersData = content.isTrue; // trả boolean
          }
  
          return {
            id: q.id,
            subject: q.subject,
            type: q.type,
            question: questionText,
            answers: answersData,
          };
        });
  
        return res.json({
          page,
          pageSize,
          total,
          questions: formatted,
        });
      } catch (err) {
        console.error("Lỗi GET /questions/list:", err);
        return res.status(500).json({ error: "Lỗi server." });
      }
    }
  );
  

module.exports = router;

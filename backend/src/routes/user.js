// src/routes/user.js

const express = require("express");
const { PrismaClient } = require("@prisma/client");
const redisClient = require("../redisClient");

const prisma = new PrismaClient();
const router = express.Router();

// Helper: shuffle array (Fisher–Yates)
function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * GET /api/question
 * - Không yêu cầu login.
 * - Sử dụng một Redis list chung key = "questions_queue".
 * - Nếu queue rỗng: fetch tất cả Question IDs từ Postgres, shuffle, RPUSH vào "questions_queue".
 * - Lấy 1 questionId bằng LPOP, rồi fetch question từ DB, sanitize (bỏ isCorrect/isTrue), trả về.
 */
router.get("/question", async (req, res) => {
  try {
    const redisKey = "questions_queue";

    // 1. Kiểm tra độ dài queue
    const listLength = await redisClient.LLEN(redisKey);

    if (listLength === 0) {
      // Lấy tất cả question IDs
      const allQuestions = await prisma.question.findMany({
        select: { id: true },
      });
      const allIDs = allQuestions.map((q) => q.id);

      if (allIDs.length === 0) {
        return res
          .status(404)
          .json({ error: "Chưa có câu hỏi nào trong hệ thống." });
      }

      // Shuffle và RPUSH vào Redis
      const shuffled = shuffleArray(allIDs);
      const stringIDs = shuffled.map((id) => id.toString());
      await redisClient.RPUSH(redisKey, stringIDs);

      // (Tuỳ chọn) đặt TTL cho queue, ví dụ 24h = 86400s:
      // await redisClient.EXPIRE(redisKey, 86400);
    }

    // 2. Lấy 1 questionId
    const nextIdStr = await redisClient.LPOP(redisKey);
    if (!nextIdStr) {
      return res
        .status(500)
        .json({ error: "Không thể lấy câu hỏi từ Redis queue." });
    }
    const questionId = parseInt(nextIdStr, 10);

    // 3. Lấy question từ DB
    const question = await prisma.question.findUnique({
      where: { id: questionId },
    });
    if (!question) {
      return res.status(404).json({ error: "Câu hỏi không tồn tại." });
    }

    // 4. Sanitize content trước khi trả (bỏ isCorrect / isTrue)
    let sanitizedContent = JSON.parse(JSON.stringify(question.content));

    if (question.type === "single" || question.type === "multi") {
      if (Array.isArray(sanitizedContent.answers)) {
        sanitizedContent.answers = sanitizedContent.answers.map((ans) => {
          const { isCorrect, ...rest } = ans;
          return rest;
        });
      }
    } else if (question.type === "boolean") {
      if (sanitizedContent.hasOwnProperty("isTrue")) {
        delete sanitizedContent.isTrue;
      }
    }

    return res.json({
      question: {
        id: question.id,
        subject: question.subject,
        type: question.type,
        content: sanitizedContent,
      },
    });
  } catch (err) {
    console.error("Lỗi GET /api/question:", err);
    return res.status(500).json({ error: "Lỗi server." });
  }
});

/**
 * POST /api/interactions
 * Body: { questionId: number, correct: boolean, skipped: boolean, latency: number }
 * - Không yêu cầu login.
 * - Push log vào Redis list "interaction_logs" (mọi người dùng đều push vào chung).
 * - Trả về 201 { status: "ok" }.
 */
router.post("/interactions", async (req, res) => {
  try {
    const { questionId, correct, skipped, latency } = req.body;

    // Validate
    if (
      typeof questionId !== "number" ||
      typeof correct !== "boolean" ||
      typeof skipped !== "boolean" ||
      typeof latency !== "number"
    ) {
      return res.status(400).json({
        error:
          "Body phải gồm { questionId:number, correct:boolean, skipped:boolean, latency:number }",
      });
    }

    const logEntry = {
      // user_id: bỏ vì không login
      question_id: questionId,
      is_correct: correct,
      skipped: skipped,
      latency_ms: latency,
      timestamp: Date.now(),
    };

    await redisClient.LPUSH(
      "interaction_logs",
      JSON.stringify(logEntry)
    );

    return res.status(201).json({ status: "ok" });
  } catch (err) {
    console.error("Lỗi POST /api/interactions:", err);
    return res.status(500).json({ error: "Lỗi server." });
  }
});

/**
 * POST /api/session-stats
 * Body: { appear: number, correctPct: number, wrongPct: number, skip: number, avgTimeMs: number }
 * - Không yêu cầu login.
 * - Push vào Redis list "session_stats".
 * - Trả về 201 { saved: true }.
 */
router.post("/session-stats", async (req, res) => {
  try {
    const { appear, correctPct, wrongPct, skip, avgTimeMs } = req.body;

    if (
      typeof appear !== "number" ||
      typeof correctPct !== "number" ||
      typeof wrongPct !== "number" ||
      typeof skip !== "number" ||
      typeof avgTimeMs !== "number"
    ) {
      return res.status(400).json({
        error:
          "Body phải gồm { appear:number, correctPct:number, wrongPct:number, skip:number, avgTimeMs:number }",
      });
    }

    const sessionStatsEntry = {
      // user_id: bỏ vì không login
      appear,
      correct_pct: correctPct,
      wrong_pct: wrongPct,
      skip_count: skip,
      avg_time_ms: avgTimeMs,
      timestamp: Date.now(),
    };

    await redisClient.LPUSH(
      "session_stats",
      JSON.stringify(sessionStatsEntry)
    );

    return res.status(201).json({ saved: true });
  } catch (err) {
    console.error("Lỗi POST /api/session-stats:", err);
    return res.status(500).json({ error: "Lỗi server." });
  }
});

router.post("/check-answer", async (req, res) => {
    try {
      const { questionId, selectedIndex, selectedIndices, answer } = req.body;
  
      if (typeof questionId !== "number") {
        return res
          .status(400)
          .json({ error: "Field 'questionId' (number) là bắt buộc." });
      }
  
      // 1. Lấy question từ DB
      const question = await prisma.question.findUnique({
        where: { id: questionId },
        select: {
          type: true,
          content: true,
        },
      });
      if (!question) {
        return res.status(404).json({ error: "Câu hỏi không tồn tại." });
      }
  
      const { type, content } = question;
  
      // 2. Kiểm tra theo từng loại
      if (type === "single") {
        // Bắt buộc có selectedIndex
        if (typeof selectedIndex !== "number") {
          return res.status(400).json({
            error:
              "Với câu hỏi type='single', phải truyền 'selectedIndex' (number).",
          });
        }
  
        // content.answers: mảng
        if (
          !content.answers ||
          !Array.isArray(content.answers) ||
          selectedIndex < 0 ||
          selectedIndex >= content.answers.length
        ) {
          return res.status(400).json({
            error: "selectedIndex không hợp lệ hoặc question không có answers.",
          });
        }
  
        // Tìm index đúng duy nhất
        const correctIndex = content.answers.findIndex(
          (ans) => ans.isCorrect === true
        );
  
        const userChoosesCorrect =
          content.answers[selectedIndex].isCorrect === true;
  
        // Trả về: correct boolean, plus correctAnswer nếu user sai
        if (userChoosesCorrect) {
          return res.json({ correct: true });
        } else {
          return res.json({
            correct: false,
            correctAnswer: correctIndex >= 0 ? correctIndex : null,
          });
        }
      } else if (type === "multi") {
        // Bắt buộc có selectedIndices
        if (!Array.isArray(selectedIndices)) {
          return res.status(400).json({
            error:
              "Với câu hỏi type='multi', phải truyền 'selectedIndices' (number[]).",
          });
        }
        const answersArray = content.answers;
        if (!answersArray || !Array.isArray(answersArray)) {
          return res.status(400).json({
            error: "Question này không có trường answers hợp lệ.",
          });
        }
  
        // Tìm tất cả index đúng
        const correctIndices = [];
        answersArray.forEach((ans, idx) => {
          if (ans.isCorrect === true) correctIndices.push(idx);
        });
  
        // Chuyển selectedIndices thành Set, correctIndices thành Set
        const selectedSet = new Set(selectedIndices);
        const correctSet = new Set(correctIndices);
  
        // So sánh hai Set cho bằng nhau (có cùng phần tử)
        let isExactMatch = false;
        if (selectedSet.size === correctSet.size) {
          isExactMatch = [...selectedSet].every((i) =>
            correctSet.has(i)
          );
        }
  
        if (isExactMatch) {
          return res.json({ correct: true });
        } else {
          return res.json({
            correct: false,
            correctIndices,
          });
        }
      } else if (type === "boolean") {
        // Bắt buộc có answer: boolean
        if (typeof answer !== "boolean") {
          return res.status(400).json({
            error:
              "Với câu hỏi type='boolean', phải truyền 'answer' (boolean).",
          });
        }
  
        // content.isTrue phải có
        if (!content.hasOwnProperty("isTrue")) {
          return res.status(500).json({
            error: "Câu hỏi boolean không có trường 'isTrue' trong content.",
          });
        }
  
        const correctValue = content.isTrue === true;
        if (answer === correctValue) {
          return res.json({ correct: true });
        } else {
          return res.json({
            correct: false,
            correctValue,
          });
        }
      } else {
        return res
          .status(400)
          .json({ error: "Type câu hỏi không hợp lệ (phải là single/multi/boolean)." });
      }
    } catch (err) {
      console.error("Lỗi POST /api/check-answer:", err);
      return res.status(500).json({ error: "Lỗi server." });
    }
  });
  
  module.exports = router;

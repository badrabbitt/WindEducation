/* ---------- app/api/hint/route.js ---------- (unchanged) */
import { GoogleGenAI } from "@google/genai";

export async function POST(request) {
  try {
    const { stem } = await request.json();
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const config = {
      responseMimeType: "text/plain",
      systemInstruction: [
        {
          text:
            "Bạn là giáo sư tinh thông tất cả các môn học gồm: Toán, Văn, Tiếng Anh, Vật lý, Hoá học, Sinh học, lịch sử, địa lý tại Việt Nam. Hãy đưa ra một vài hướng dẫn cho học sinh để giải bài tập dưới đây. Đầu ra dưới dạng Markdown (không dùng cấu trúc dạng bảng trong suốt quá trình trả lời). Công thức toán được viết bằng LaTeX, đặt trong cặp dấu $..$",
        },
      ],
    };
    const contents = [{ role: "user", parts: [{ text: stem }] }];
    const stream = await ai.models.generateContentStream({
      model: "gemini-2.0-flash",
      config,
      contents,
    });
    let text = "";
    for await (const chunk of stream) text += chunk.text;
    return Response.json({ markdown: text.trim() });
  } catch {
    return new Response("{\"error\":true}", { status: 500 });
  }
}

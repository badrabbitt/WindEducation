/* ---------- app/api/classify/route.js ---------- */
import { GoogleGenAI } from "@google/genai";

export async function POST(request) {
  try {
    const { stem } = await request.json();
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const config = {
      responseMimeType: "application/json",
      systemInstruction: [{
        text: `Dưới đây là câu hỏi thuộc một trong các môn: Toán, Lý, Hoá, Sinh, Sử, Địa, Tiếng Anh, Văn. Và thuộc một trong các loại: Trắc nghiệm 1 đáp án, Trắc nghiệm nhiều đáp án, Đúng/Sai. Hãy phân loại câu hỏi theo môn và loại câu hỏi. Đầu ra có dạng:{
\"subject\":\"môn học\",
\"type\":\"loại câu hỏi\"}
Môn Toán là toan, Văn là van, Lý là ly, Hoá là hoa, Sinh là sinh, Sử là su, địa là dia, tiếng anh là tienganh. Loại câu hỏi là: single, multi, boolean`}
      ]
    };
    const contents = [{ role: "user", parts: [{ text: stem }] }];

    const resStream = await ai.models.generateContentStream({ model: "gemini-2.0-flash", config, contents });
    let full = "";
    for await (const chunk of resStream) full += chunk.text;
    const parsed = JSON.parse(full.trim());
    return Response.json(parsed);
  } catch (err) {
    return new Response("{\"subject\":null,\"type\":null}", { status: 500 });
  }
}
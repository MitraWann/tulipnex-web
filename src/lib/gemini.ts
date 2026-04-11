import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ 
  apiKey: process.env.GEMINI_API_KEY || "" 
});

export async function summarizeArticle(title: string, content: string) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Buatkan ringkasan dari artikel blog berikut ke dalam Bahasa Indonesia yang kasual, padat, dan jelas (maksimal 3 kalimat).\n\nJudul: ${title}\nKonten: ${content.replace(/<[^>]*>?/gm, '')}`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Maaf, gagal membuat ringkasan otomatis.";
  }
}

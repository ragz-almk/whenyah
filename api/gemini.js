// api/gemini.js
import { GoogleGenAI } from '@google/genai';

export default async function handler(req, res) {
    // Hanya menerima method POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Mengambil API Key dari Vercel Environment Variables
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return res.status(500).json({ error: 'API Key tidak ditemukan di server.' });
    }

    // Inisialisasi Google Gen AI SDK (seperti di dokumentasimu!)
    const ai = new GoogleGenAI({ apiKey: apiKey });

    try {
        // Mengambil data yang dikirim dari frontend (script.js)
        const { contents, systemInstruction, generationConfig } = req.body;

        // Memanggil Gemini API menggunakan SDK baru
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: contents,
            config: {
                // Menyesuaikan format system instruction & mimeType untuk SDK baru
                systemInstruction: systemInstruction?.parts?.[0]?.text || systemInstruction,
                responseMimeType: generationConfig?.responseMimeType || "application/json",
            }
        });

        // Supaya frontend (script.js) kita tidak error karena perubahan struktur balasan,
        // kita bungkus response dari SDK agar bentuknya sama seperti REST API sebelumnya.
        res.status(200).json({
            candidates: [
                {
                    content: {
                        parts: [
                            { text: response.text }
                        ]
                    }
                }
            ]
        });

    } catch (error) {
        console.error("API Error dari SDK:", error);
        res.status(500).json({ error: error.message });
    }
}

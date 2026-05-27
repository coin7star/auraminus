export const runtime = "edge";

function cleanJson(text = "") {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

export async function POST(req) {
  try {
    const { imageBase64, mimeType, style } = await req.json();

    if (!imageBase64 || !mimeType) {
      return Response.json({ error: "Gambar belum dikirim" }, { status: 400 });
    }

    const prompt = `
Kamu adalah AI editor meme khusus Mobile Legends: Bang Bang untuk web AuraMinus.

Tugas:
Analisa gambar yang diupload user. Anggap ini konten Mobile Legends untuk test MVP.

Buat caption meme video pendek khusus MLBB.

Style:
${style || "epic fail"}

Aturan:
- Bahasa Indonesia santai
- Lucu, Gen Z, cocok TikTok
- Fokus Mobile Legends
- Jangan bahas game lain
- Jangan SARA
- Jangan hina fisik
- Jangan seksual
- Maksimal 8 kata per caption

Balas JSON valid saja.

Format:
{
  "title": "judul pendek",
  "captionTop": "caption atas",
  "captionBottom": "caption bawah",
  "endingText": "caption ending",
  "hashtags": ["#AuraMinus", "#MobileLegends", "#MLBB"]
}
`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: imageBase64
                  }
                }
              ]
            }
          ]
        })
      }
    );

    const data = await response.json();
    const raw = data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let ai;

    try {
      ai = JSON.parse(cleanJson(raw));
    } catch {
      ai = {
        title: "MLBB Aura Minus",
        captionTop: "Katanya jago mekanik",
        captionBottom: "Pas war malah ilang",
        endingText: "Aura turun satu rank 😭",
        hashtags: ["#AuraMinus", "#MobileLegends", "#MLBB"]
      };
    }

    return Response.json({ success: true, ai });
  } catch {
    return Response.json(
      { error: "Gagal analisa gambar MLBB" },
      { status: 500 }
    );
  }
}
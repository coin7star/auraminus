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
Kamu adalah AI editor video meme khusus Mobile Legends: Bang Bang untuk web AuraMinus.

Tugas:
Analisa screenshot MLBB yang diupload user, lalu buat script video pendek 6 detik.

Style user:
${style || "epic fail"}

Aturan:
- Bahasa Indonesia santai
- Lucu, Gen Z, cocok TikTok
- Fokus Mobile Legends saja
- Jangan bahas game lain
- Jangan SARA
- Jangan hina fisik
- Jangan seksual
- Maksimal 7 kata per scene
- Balas JSON valid saja

Format JSON:
{
  "title": "judul pendek",
  "template": "epic_fail / win_streak / turun_bintang / dark_system / mvp_kalah",
  "scene1": "opening hook",
  "scene2": "analisa momen",
  "scene3": "punchline lucu",
  "endingText": "ending pendek",
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
        template: "epic_fail",
        scene1: "Katanya jago mekanik",
        scene2: "Pas war malah hilang",
        scene3: "Tim cuma bisa pasrah",
        endingText: "Aura turun satu rank 😭",
        hashtags: ["#AuraMinus", "#MobileLegends", "#MLBB"]
      };
    }

    return Response.json({ success: true, ai });
  } catch {
    return Response.json(
      { error: "Gagal analisa screenshot MLBB" },
      { status: 500 }
    );
  }
}
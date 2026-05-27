export const runtime = "edge";

function cleanJson(text = "") {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

export async function POST(req) {
  try {
    const { imageBase64, mimeType, style, heroName } = await req.json();

    if (!imageBase64 || !mimeType) {
      return Response.json({ error: "Gambar belum dikirim" }, { status: 400 });
    }

    const prompt = `
Kamu adalah AI editor meme khusus Mobile Legends: Bang Bang untuk web AuraMinus.

Hero pilihan user:
${heroName || "Tidak diisi, analisa dari gambar"}

Style:
${style || "epic fail"}

Tugas:
Analisa screenshot MLBB ini lalu buat script video pendek.

Aturan:
- Fokus Mobile Legends saja
- Kalau heroName diisi, gunakan hero itu sebagai konteks utama
- Bahasa Indonesia santai
- Lucu, Gen Z, cocok TikTok
- Jangan bahas game lain
- Jangan SARA
- Jangan hina fisik
- Jangan seksual
- Maksimal 7 kata per scene
- Balas JSON valid saja

Format JSON:
{
  "title": "judul pendek",
  "scene1": "opening hook",
  "scene2": "analisa momen",
  "scene3": "punchline lucu",
  "endingText": "ending pendek",
  "caption": "caption pendek",
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
      const hero = heroName || "Hero MLBB";

      ai = {
        title: `${hero} Aura Minus`,
        scene1: `${hero} siap montage`,
        scene2: "Musuh mulai panik",
        scene3: "Tapi tim malah war random",
        endingText: "Aura turun satu rank 😭",
        caption: `${hero} mode AuraMinus`,
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
export const runtime = "edge";

function cleanJson(text = "") {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

export async function POST(req) {
  try {
    const { imageBase64, mimeType, style } = await req.json();

    if (!imageBase64 || !mimeType) {
      return Response.json(
        { error: "Gambar belum dikirim" },
        { status: 400 }
      );
    }

    const prompt = `
Kamu adalah AI editor meme gaming Indonesia untuk web AuraMinus.

Konsep:
- Upload gameplay
- AI bikin meme video
- Lucu
- Gen Z
- TikTok vibes
- Gaming roast

Style:
${style || "toxic roast"}

Balas JSON valid saja.

Format:
{
  "title": "judul",
  "captionTop": "caption atas",
  "captionBottom": "caption bawah",
  "endingText": "caption ending",
  "hashtags": ["#AuraMinus", "#gaming"]
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
                {
                  text: prompt
                },
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

    const raw =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let ai;

    try {
      ai = JSON.parse(cleanJson(raw));
    } catch {
      ai = {
        title: "AuraMinus Moment",
        captionTop: "Katanya last game",
        captionBottom: "Malah turun bintang",
        endingText: "Aura turun drastis 😭",
        hashtags: ["#AuraMinus", "#gaming"]
      };
    }

    return Response.json({
      success: true,
      ai
    });
  } catch (error) {
    return Response.json(
      {
        error: "Gagal analisa gameplay"
      },
      {
        status: 500
      }
    );
  }
}
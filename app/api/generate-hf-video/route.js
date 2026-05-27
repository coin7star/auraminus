export const runtime = "edge";

function cleanJson(text = "") {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

async function createPrompt({ imageBase64, mimeType, style, heroName }) {
  const prompt = `
Kamu adalah AI editor cinematic Mobile Legends: Bang Bang.

Hero pilihan user:
${heroName || "Tidak diisi, analisa dari gambar"}

Style:
${style || "epic cinematic"}

Buat JSON valid untuk video image-to-video.

WAJIB:
- Fokus Mobile Legends: Bang Bang
- Kalau heroName diisi, gunakan hero itu sebagai karakter utama
- Hero/gameplay terasa hidup
- Cinematic gaming edit
- Aura glow
- Dynamic camera movement
- Anime esports vibe
- Dramatic MLBB montage
- No text overlay
- No watermark

Format:
{
  "title": "",
  "caption": "",
  "videoPrompt": "",
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

  try {
    return JSON.parse(cleanJson(raw));
  } catch {
    const hero = heroName || "MLBB hero";

    return {
      title: `${hero} HF Motion`,
      caption: `${hero} mode cinematic test 😭🔥`,
      videoPrompt: `Cinematic Mobile Legends montage featuring ${hero}, glowing aura, dynamic camera, esports anime style, no text overlay.`,
      hashtags: ["#AuraMinus", "#MobileLegends", "#MLBB"]
    };
  }
}

function base64ToUint8Array(base64) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

export async function POST(req) {
  try {
    const { imageBase64, mimeType, style, heroName } = await req.json();

    if (!process.env.HF_TOKEN) {
      return Response.json(
        { error: "HF_TOKEN belum diisi" },
        { status: 500 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return Response.json(
        { error: "GEMINI_API_KEY belum diisi" },
        { status: 500 }
      );
    }

    if (!imageBase64 || !mimeType) {
      return Response.json(
        { error: "Gambar atau mimeType kosong" },
        { status: 400 }
      );
    }

    const ai = await createPrompt({
      imageBase64,
      mimeType,
      style,
      heroName
    });

    const imageBytes = base64ToUint8Array(imageBase64);

    const hfRes = await fetch(
      "https://api-inference.huggingface.co/models/stabilityai/stable-video-diffusion-img2vid",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.HF_TOKEN}`,
          "Content-Type": mimeType,
          Accept: "video/mp4, application/octet-stream, application/json"
        },
        body: imageBytes
      }
    );

    const contentType = hfRes.headers.get("content-type") || "";

    if (!hfRes.ok) {
      let detail;

      if (contentType.includes("application/json")) {
        detail = await hfRes.json();
      } else {
        detail = await hfRes.text();
      }

      return Response.json(
        {
          error: "HuggingFace gagal generate video",
          detail
        },
        { status: 500 }
      );
    }

    if (contentType.includes("application/json")) {
      const json = await hfRes.json();

      return Response.json(
        {
          error: "HuggingFace belum mengirim file video",
          detail: json,
          ai
        },
        { status: 500 }
      );
    }

    const videoBuffer = await hfRes.arrayBuffer();
    const videoBase64 = btoa(
      String.fromCharCode(...new Uint8Array(videoBuffer))
    );

    return Response.json({
      success: true,
      ai,
      videoBase64,
      mimeType: contentType || "video/mp4"
    });
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Generate HuggingFace gagal"
      },
      { status: 500 }
    );
  }
}

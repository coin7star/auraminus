export const runtime = "edge";

function cleanJson(text = "") {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

function getExt(mimeType = "") {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

function checkEnv() {
  const missing = [];

  if (!process.env.GEMINI_API_KEY) missing.push("GEMINI_API_KEY");
  if (!process.env.FAL_KEY) missing.push("FAL_KEY");
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    missing.push("NEXT_PUBLIC_SUPABASE_URL");
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    missing.push("SUPABASE_SERVICE_ROLE_KEY");
  }

  if (missing.length > 0) {
    throw new Error(`ENV belum lengkap: ${missing.join(", ")}`);
  }
}

async function uploadToSupabase({ imageBase64, mimeType }) {
  const ext = getExt(mimeType);
  const fileName = `mlbb/${crypto.randomUUID()}.${ext}`;

  const binary = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));

  const uploadRes = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/auraminus-uploads/${fileName}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: process.env.SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": mimeType,
        "x-upsert": "true"
      },
      body: binary
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Upload Supabase gagal: ${errText}`);
  }

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auraminus-uploads/${fileName}`;
}

async function createPrompt({ imageBase64, mimeType, style }) {
  const prompt = `
Kamu adalah AI editor cinematic Mobile Legends: Bang Bang.

Analisa screenshot MLBB ini.

Buat:
1. Judul pendek
2. Caption Indonesia
3. Prompt cinematic bahasa Inggris untuk AI video image-to-video

Style:
${style}

WAJIB:
- Fokus Mobile Legends: Bang Bang
- Hero/gameplay terasa hidup
- Cinematic gaming edit
- Aura glow
- Dynamic camera movement
- Anime esports vibe
- Dramatic MLBB montage
- No text overlay
- No watermark
- Jangan ubah jadi game lain

Balas JSON valid saja:

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
    return {
      title: "Epic MLBB Montage",
      caption: "Aura MLBB naik brutal 😭🔥",
      videoPrompt:
        "Epic cinematic Mobile Legends gameplay montage. Animate the uploaded MLBB screenshot with dynamic camera movement, subtle hero motion, glowing aura effects, energy particles, dramatic esports lighting, smooth motion, intense TikTok gaming edit style, no text overlay, no watermark.",
      hashtags: ["#AuraMinus", "#MobileLegends", "#MLBB"]
    };
  }
}

export async function POST(req) {
  try {
    checkEnv();

    const { imageBase64, mimeType, style } = await req.json();

    if (!imageBase64 || !mimeType) {
      return Response.json(
        { error: "Gambar atau mimeType kosong" },
        { status: 400 }
      );
    }

    const imageUrl = await uploadToSupabase({
      imageBase64,
      mimeType
    });

    const ai = await createPrompt({
      imageBase64,
      mimeType,
      style: style || "epic cinematic"
    });

    const falRes = await fetch(
      "https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video",
      {
        method: "POST",
        headers: {
          Authorization: `Key ${process.env.FAL_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          prompt: ai.videoPrompt,
          image_url: imageUrl,
          duration: "10",
          aspect_ratio: "9:16",
          negative_prompt:
            "low quality, blurry, watermark, ugly, distorted, bad anatomy, text overlay"
        })
      }
    );

    const falData = await falRes.json();

    if (!falRes.ok) {
      return Response.json(
        {
          error: "Fal AI gagal",
          detail: falData
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      requestId: falData.request_id,
      imageUrl,
      ai,
      raw: falData
    });
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Generate Fal AI gagal"
      },
      { status: 500 }
    );
  }
}
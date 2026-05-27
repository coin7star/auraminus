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
  if (!process.env.PIAPI_KEY) missing.push("PIAPI_KEY");
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

async function createPrompt({ imageBase64, mimeType, style, heroName }) {
  const prompt = `
Kamu adalah AI editor cinematic Mobile Legends: Bang Bang.

Hero pilihan user:
${heroName || "Tidak diisi, analisa dari gambar"}

Style:
${style || "epic cinematic"}

Buat:
1. Judul pendek
2. Caption Indonesia
3. Prompt cinematic bahasa Inggris untuk image-to-video AI

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
    const hero = heroName || "MLBB hero";

    return {
      title: `${hero} Cinematic Montage`,
      caption: `${hero} aura naik brutal 😭🔥`,
      videoPrompt: `Epic cinematic Mobile Legends montage featuring ${hero}. Animate the uploaded MLBB screenshot with dynamic camera movement, subtle hero motion, glowing aura effects, energy particles, dramatic esports lighting, smooth motion, intense TikTok gaming edit style, no text overlay, no watermark.`,
      hashtags: ["#AuraMinus", "#MobileLegends", "#MLBB"]
    };
  }
}

export async function POST(req) {
  try {
    checkEnv();

    const { imageBase64, mimeType, style, heroName } = await req.json();

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
      style,
      heroName
    });

    const piapiRes = await fetch("https://api.piapi.ai/api/v1/task", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": process.env.PIAPI_KEY
      },
      body: JSON.stringify({
        model: "kling",
        task_type: "video_generation",
        input: {
          prompt: ai.videoPrompt,
          image_url: imageUrl
        },
        config: {
          service_mode: "public",
          aspect_ratio: "9:16",
          duration: 5
        }
      })
    });

    const piapiData = await piapiRes.json();

    if (!piapiRes.ok) {
      return Response.json(
        {
          error: "PiAPI gagal",
          detail: piapiData
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      taskId:
        piapiData?.data?.task_id ||
        piapiData?.task_id ||
        piapiData?.id ||
        null,
      imageUrl,
      ai,
      raw: piapiData
    });
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Generate PiAPI gagal"
      },
      { status: 500 }
    );
  }
}
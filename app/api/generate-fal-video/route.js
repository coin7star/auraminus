export const runtime = "edge";

function cleanJson(text = "") {
  return text.replace(/```json/g, "").replace(/```/g, "").trim();
}

function getExt(mimeType = "") {
  if (mimeType.includes("png")) return "png";
  if (mimeType.includes("webp")) return "webp";
  return "jpg";
}

async function uploadToSupabase({ imageBase64, mimeType }) {
  const ext = getExt(mimeType);

  const fileName = `mlbb/${crypto.randomUUID()}.${ext}`;

  const binary = Uint8Array.from(
    atob(imageBase64),
    (c) => c.charCodeAt(0)
  );

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

    throw new Error(`Upload gagal: ${errText}`);
  }

  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/auraminus-uploads/${fileName}`;
}

async function createPrompt({
  imageBase64,
  mimeType,
  style
}) {
  const prompt = `
Kamu adalah AI editor cinematic Mobile Legends.

Analisa screenshot MLBB ini.

Buat:
1. Judul pendek
2. Caption Indonesia
3. Prompt cinematic bahasa Inggris untuk AI video

Style:
${style}

WAJIB:
- hero terasa hidup
- cinematic gaming edit
- aura glow
- dynamic camera
- anime esports vibe
- dramatic MLBB montage
- no text overlay

Balas JSON valid:

{
  "title": "",
  "caption": "",
  "videoPrompt": "",
  "hashtags": []
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

  try {
    return JSON.parse(cleanJson(raw));
  } catch {
    return {
      title: "Epic MLBB Montage",
      caption: "Aura MLBB naik brutal 😭🔥",
      videoPrompt:
        "Epic cinematic Mobile Legends montage, dynamic camera movement, anime gaming edit, glowing aura effects, energy particles, smooth motion, esports vibe, dramatic lighting, hero alive animation, TikTok gaming style.",
      hashtags: [
        "#AuraMinus",
        "#MLBB",
        "#MobileLegends"
      ]
    };
  }
}

export async function POST(req) {
  try {
    const {
      imageBase64,
      mimeType,
      style
    } = await req.json();

    if (!imageBase64) {
      return Response.json(
        {
          error: "Image kosong"
        },
        {
          status: 400
        }
      );
    }

    const imageUrl = await uploadToSupabase({
      imageBase64,
      mimeType
    });

    const ai = await createPrompt({
      imageBase64,
      mimeType,
      style
    });

    const falRes = await fetch(
      "https://fal.run/fal-ai/kling-video/v1/standard/image-to-video",
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
            "low quality, blurry, watermark, ugly"
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
        {
          status: 500
        }
      );
    }

    return Response.json({
      success: true,
      requestId: falData.request_id,
      ai
    });
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Generate gagal"
      },
      {
        status: 500
      }
    );
  }
}
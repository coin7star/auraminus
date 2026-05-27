export const runtime = "edge";

const FAL_MODEL_ENDPOINT =
  "https://queue.fal.run/fal-ai/kling-video/v1/standard/image-to-video";

export async function POST(req) {
  try {
    const { requestId } = await req.json();

    if (!requestId) {
      return Response.json(
        { error: "requestId kosong" },
        { status: 400 }
      );
    }

    if (!process.env.FAL_KEY) {
      return Response.json(
        { error: "FAL_KEY belum diisi" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `${FAL_MODEL_ENDPOINT}/requests/${requestId}/status`,
      {
        method: "GET",
        headers: {
          Authorization: `Key ${process.env.FAL_KEY}`
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error: "Gagal cek status Fal AI",
          detail: data
        },
        { status: 500 }
      );
    }

    if (data.status === "COMPLETED") {
      const resultRes = await fetch(
        `${FAL_MODEL_ENDPOINT}/requests/${requestId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Key ${process.env.FAL_KEY}`
          }
        }
      );

      const result = await resultRes.json();

      if (!resultRes.ok) {
        return Response.json(
          {
            error: "Fal AI selesai, tapi gagal ambil result",
            detail: result
          },
          { status: 500 }
        );
      }

      return Response.json({
        success: true,
        done: true,
        status: data.status,
        videoUrl:
          result?.video?.url ||
          result?.videos?.[0]?.url ||
          result?.output?.video?.url ||
          result?.output?.videos?.[0]?.url ||
          null,
        raw: result
      });
    }

    if (data.status === "FAILED") {
      return Response.json(
        {
          success: false,
          error: "Fal AI gagal generate video",
          detail: data
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      done: false,
      status: data.status,
      raw: data
    });
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Check Fal AI gagal"
      },
      { status: 500 }
    );
  }
}
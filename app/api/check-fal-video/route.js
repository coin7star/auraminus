export const runtime = "edge";

export async function POST(req) {
  try {
    const { requestId } = await req.json();

    const response = await fetch(
      `https://fal.run/fal-ai/kling-video/v1/standard/image-to-video/requests/${requestId}/status`,
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
          error: "Gagal cek fal status",
          detail: data
        },
        {
          status: 500
        }
      );
    }

    if (data.status === "COMPLETED") {
      const resultRes = await fetch(
        `https://fal.run/fal-ai/kling-video/v1/standard/image-to-video/requests/${requestId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Key ${process.env.FAL_KEY}`
          }
        }
      );

      const result = await resultRes.json();

      return Response.json({
        success: true,
        done: true,
        videoUrl:
          result?.video?.url ||
          result?.videos?.[0]?.url ||
          null,
        raw: result
      });
    }

    return Response.json({
      success: true,
      done: false,
      status: data.status
    });
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Check fal gagal"
      },
      {
        status: 500
      }
    );
  }
}
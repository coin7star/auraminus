export const runtime = "edge";

function findVideoUrl(data) {
  return (
    data?.data?.output?.video_url ||
    data?.data?.output?.video ||
    data?.data?.output?.url ||
    data?.output?.video_url ||
    data?.output?.video ||
    data?.output?.url ||
    data?.video_url ||
    data?.video ||
    data?.url ||
    null
  );
}

export async function POST(req) {
  try {
    const { taskId } = await req.json();

    if (!taskId) {
      return Response.json(
        { error: "taskId kosong" },
        { status: 400 }
      );
    }

    if (!process.env.PIAPI_KEY) {
      return Response.json(
        { error: "PIAPI_KEY belum diisi" },
        { status: 500 }
      );
    }

    const response = await fetch(
      `https://api.piapi.ai/api/v1/task/${taskId}`,
      {
        method: "GET",
        headers: {
          "X-API-Key": process.env.PIAPI_KEY
        }
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(
        {
          error: "Gagal cek status PiAPI",
          detail: data
        },
        { status: 500 }
      );
    }

    const status =
      data?.data?.status ||
      data?.status ||
      data?.data?.state ||
      data?.state ||
      "unknown";

    const videoUrl = findVideoUrl(data);

    const isDone =
      status === "completed" ||
      status === "succeeded" ||
      status === "success" ||
      status === "finished" ||
      Boolean(videoUrl);

    const isFailed =
      status === "failed" ||
      status === "error" ||
      status === "cancelled";

    if (isFailed) {
      return Response.json(
        {
          success: false,
          error: "PiAPI gagal generate video",
          status,
          detail: data
        },
        { status: 500 }
      );
    }

    return Response.json({
      success: true,
      done: isDone,
      status,
      videoUrl,
      raw: data
    });
  } catch (error) {
    return Response.json(
      {
        error: error.message || "Check PiAPI gagal"
      },
      { status: 500 }
    );
  }
}
"use client";

import { useState } from "react";

export default function AuraMinusApp() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState("epic cinematic");
  const [engine, setEngine] = useState("canvas");
  const [heroName, setHeroName] = useState("");
  const [progress, setProgress] = useState("");
  const [ai, setAi] = useState(null);
  const [requestId, setRequestId] = useState("");
  const [taskId, setTaskId] = useState("");

  async function fileToBase64(inputFile) {
    const buffer = await inputFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";

    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  }

  function wait(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function formatErrorDetail(data) {
    if (!data) return "";
    if (typeof data === "string") return data;

    try {
      return JSON.stringify(data, null, 2);
    } catch {
      return String(data);
    }
  }

  function makeBlobUrlFromBase64(base64, mimeType = "video/mp4") {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
  }

  async function analyzeForCanvas() {
    const imageBase64 = await fileToBase64(file);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageBase64,
        mimeType: file.type,
        style,
        heroName
      })
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "AI gagal analisa gambar");
    }

    return data.ai;
  }

  async function startFalGeneration() {
    const imageBase64 = await fileToBase64(file);

    const res = await fetch("/api/generate-fal-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageBase64,
        mimeType: file.type,
        style,
        heroName
      })
    });

    const data = await res.json();

    if (!data.success) {
      const detail = formatErrorDetail(data.detail);
      throw new Error(
        `${data.error || "Gagal mulai Fal AI video"}${
          detail ? `\n${detail}` : ""
        }`
      );
    }

    return data;
  }

  async function checkFalStatus(id) {
    const res = await fetch("/api/check-fal-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requestId: id
      })
    });

    const data = await res.json();

    if (!data.success) {
      const detail = formatErrorDetail(data.detail);
      throw new Error(
        `${data.error || "Gagal cek status Fal AI"}${
          detail ? `\n${detail}` : ""
        }`
      );
    }

    return data;
  }

  async function pollFalVideo(id) {
    for (let i = 1; i <= 90; i++) {
      setProgress(`Fal AI lagi bikin video MLBB... (${i}/90)`);

      const status = await checkFalStatus(id);

      if (status.done && status.videoUrl) {
        return status.videoUrl;
      }

      if (status.done && !status.videoUrl) {
        throw new Error("Fal AI selesai, tapi videoUrl kosong");
      }

      await wait(4000);
    }

    throw new Error("Timeout. Video Fal AI belum selesai.");
  }

  async function startPiapiGeneration() {
    const imageBase64 = await fileToBase64(file);

    const res = await fetch("/api/generate-piapi-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageBase64,
        mimeType: file.type,
        style,
        heroName
      })
    });

    const data = await res.json();

    if (!data.success) {
      const detail = formatErrorDetail(data.detail);
      throw new Error(
        `${data.error || "Gagal mulai PiAPI video"}${
          detail ? `\n${detail}` : ""
        }`
      );
    }

    return data;
  }

  async function checkPiapiStatus(id) {
    const res = await fetch("/api/check-piapi-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        taskId: id
      })
    });

    const data = await res.json();

    if (!data.success) {
      const detail = formatErrorDetail(data.detail);
      throw new Error(
        `${data.error || "Gagal cek status PiAPI"}${
          detail ? `\n${detail}` : ""
        }`
      );
    }

    return data;
  }

  async function pollPiapiVideo(id) {
    for (let i = 1; i <= 90; i++) {
      setProgress(`PiAPI Kling lagi bikin video MLBB... (${i}/90)`);

      const status = await checkPiapiStatus(id);

      if (status.done && status.videoUrl) {
        return status.videoUrl;
      }

      if (status.done && !status.videoUrl) {
        throw new Error("PiAPI selesai, tapi videoUrl kosong");
      }

      await wait(4000);
    }

    throw new Error("Timeout. Video PiAPI belum selesai.");
  }

  async function generateWithHuggingFace() {
    setProgress("HuggingFace SVD lagi bikin video...");

    const imageBase64 = await fileToBase64(file);

    const res = await fetch("/api/generate-hf-video", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageBase64,
        mimeType: file.type,
        style,
        heroName
      })
    });

    const data = await res.json();

    if (!data.success) {
      const detail = formatErrorDetail(data.detail);
      throw new Error(
        `${data.error || "HuggingFace gagal"}${detail ? `\n${detail}` : ""}`
      );
    }

    setAi(data.ai);

    const url = makeBlobUrlFromBase64(data.videoBase64, data.mimeType);
    setVideoUrl(url);
    setProgress("Selesai. Video HuggingFace siap!");
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();

      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Gagal load gambar"));

      img.src = src;
    });
  }

  function drawWrappedText(ctx, text, x, y, maxWidth, fontSize, color = "white") {
    ctx.font = `900 ${fontSize}px Arial`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const words = String(text || "").split(" ");
    const lines = [];
    let line = "";

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const width = ctx.measureText(testLine).width;

      if (width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }

    if (line) lines.push(line);

    lines.forEach((item, index) => {
      const lineY = y + index * (fontSize + 10);

      ctx.lineWidth = 9;
      ctx.strokeStyle = "black";
      ctx.strokeText(item, x, lineY);

      ctx.fillStyle = color;
      ctx.fillText(item, x, lineY);
    });
  }

  function getCurrentScene(result, percent) {
    if (percent < 0.25) {
      return {
        text: result.scene1 || `${heroName || "Hero"} mulai montage`,
        y: 170,
        size: 48,
        color: "white"
      };
    }

    if (percent < 0.5) {
      return {
        text: result.scene2 || "Musuh mulai panik",
        y: 1040,
        size: 44,
        color: "white"
      };
    }

    if (percent < 0.75) {
      return {
        text: result.scene3 || "Tim auto tepuk tangan",
        y: 1040,
        size: 44,
        color: "#facc15"
      };
    }

    return {
      text: result.endingText || "Aura naik brutal 😭🔥",
      y: 1030,
      size: 44,
      color: "#4ade80"
    };
  }

  async function renderCanvasVideo(result) {
    setProgress("Canvas Test bikin video MLBB...");

    if (!window.MediaRecorder) {
      throw new Error("Browser ini belum support MediaRecorder");
    }

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;

    const ctx = canvas.getContext("2d");
    const img = await loadImage(preview);
    const stream = canvas.captureStream(30);

    let mimeType = "video/webm";

    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
      mimeType = "video/webm;codecs=vp9";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8")) {
      mimeType = "video/webm;codecs=vp8";
    }

    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        chunks.push(event.data);
      }
    };

    const done = new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        resolve(URL.createObjectURL(blob));
      };
    });

    recorder.start();

    const duration = 6500;
    const start = performance.now();

    function drawFrame(now) {
      const elapsed = now - start;
      const percent = Math.min(elapsed / duration, 1);

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.max(
        canvas.width / img.width,
        canvas.height / img.height
      );

      const zoom = 1 + percent * 0.1;
      const width = img.width * scale * zoom;
      const height = img.height * scale * zoom;
      const x = (canvas.width - width) / 2;
      const y = (canvas.height - height) / 2;

      ctx.drawImage(img, x, y, width, height);

      ctx.fillStyle = "rgba(0, 0, 0, 0.36)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(0, 0, 0, 0.72)";
      ctx.fillRect(0, 0, canvas.width, 250);
      ctx.fillRect(0, canvas.height - 340, canvas.width, 340);

      ctx.font = "900 30px Arial";
      ctx.textAlign = "center";
      ctx.fillStyle = "#4ade80";
      ctx.fillText("AuraMinus MLBB", canvas.width / 2, 70);

      drawWrappedText(
        ctx,
        result.title || `${heroName || "MLBB"} Montage`,
        canvas.width / 2,
        125,
        640,
        34,
        "white"
      );

      const scene = getCurrentScene(result, percent);

      drawWrappedText(
        ctx,
        scene.text,
        canvas.width / 2,
        scene.y,
        640,
        scene.size,
        scene.color
      );

      ctx.font = "700 24px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.65)";
      ctx.textAlign = "center";
      ctx.fillText(
        result.hashtags?.slice(0, 3).join(" ") || "#AuraMinus #MLBB",
        canvas.width / 2,
        1225
      );

      ctx.fillStyle = "rgba(255,255,255,0.9)";
      ctx.fillRect(80, 1260, 560 * percent, 8);

      if (elapsed < duration) {
        requestAnimationFrame(drawFrame);
      } else {
        recorder.stop();
      }
    }

    requestAnimationFrame(drawFrame);

    return done;
  }

  async function generateWithCanvas() {
    setProgress("AI analisa screenshot MLBB...");
    const result = await analyzeForCanvas();

    setAi(result);

    const url = await renderCanvasVideo(result);

    setVideoUrl(url);
    setProgress("Selesai. Video Canvas Test siap!");
  }

  async function generateWithFal() {
    setProgress("Upload gambar + AI bikin prompt MLBB...");
    const result = await startFalGeneration();

    setAi(result.ai);
    setRequestId(result.requestId);

    if (!result.requestId) {
      throw new Error("Fal AI tidak mengirim requestId");
    }

    setProgress("Fal AI mulai generate video cinematic...");
    const finalVideoUrl = await pollFalVideo(result.requestId);

    setVideoUrl(finalVideoUrl);
    setProgress("Selesai. Video Fal AI siap!");
  }

  async function generateWithPiapi() {
    setProgress("Upload gambar + AI bikin prompt PiAPI...");
    const result = await startPiapiGeneration();

    setAi(result.ai);
    setTaskId(result.taskId);

    if (!result.taskId) {
      throw new Error("PiAPI tidak mengirim taskId");
    }

    setProgress("PiAPI Kling mulai generate video...");
    const finalVideoUrl = await pollPiapiVideo(result.taskId);

    setVideoUrl(finalVideoUrl);
    setProgress("Selesai. Video PiAPI siap!");
  }

  async function generateVideo() {
    if (!file) {
      alert("Upload screenshot Mobile Legends dulu");
      return;
    }

    try {
      setLoading(true);
      setVideoUrl("");
      setAi(null);
      setRequestId("");
      setTaskId("");

      if (engine === "fal") {
        await generateWithFal();
      } else if (engine === "piapi") {
        await generateWithPiapi();
      } else if (engine === "hf") {
        await generateWithHuggingFace();
      } else {
        await generateWithCanvas();
      }
    } catch (error) {
      alert(error.message || "Gagal generate video");
      setProgress("");
    } finally {
      setLoading(false);
    }
  }

  function handleFile(e) {
    const selected = e.target.files?.[0];

    if (!selected) return;

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setVideoUrl("");
    setAi(null);
    setProgress("");
    setRequestId("");
    setTaskId("");
  }

  return (
    <main>
      <section>
        <div className="card">
          <div className="badge">AuraMinus MLBB Editor</div>

          <h1 className="hero-title">
            MLBB Screenshot,
            <br />
            Jadi Video Hidup 😭🔥
          </h1>

          <p className="hero-desc">
            Upload screenshot Mobile Legends. Pilih engine gratis untuk test,
            Fal AI, PiAPI Kling, atau HuggingFace SVD.
          </p>

          <div className="grid">
            <div className="panel">
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="input"
              />

              <input
                type="text"
                value={heroName}
                onChange={(e) => setHeroName(e.target.value)}
                placeholder="Nama hero, contoh: Benedetta, Ling, Fanny"
                className="input"
                style={{ marginTop: "14px" }}
              />

              <select
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className="select"
              >
                <option value="canvas">Canvas Test Gratis</option>
                <option value="hf">HuggingFace SVD</option>
                <option value="fal">Fal AI Cinematic</option>
                <option value="piapi">PiAPI Kling</option>
              </select>

              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="select"
              >
                <option value="epic cinematic">Epic Cinematic</option>
                <option value="savage montage">Savage Montage</option>
                <option value="dark system">Dark System</option>
                <option value="mvp flex">MVP Flex</option>
                <option value="turun bintang drama">Turun Bintang Drama</option>
              </select>

              <button
                onClick={generateVideo}
                disabled={loading}
                className="button"
              >
                {loading
                  ? "Generating..."
                  : engine === "fal"
                  ? "Generate Fal AI Video"
                  : engine === "piapi"
                  ? "Generate PiAPI Video"
                  : engine === "hf"
                  ? "Generate HuggingFace Video"
                  : "Generate Canvas Test"}
              </button>

              {progress && <p className="progress">{progress}</p>}

              {requestId && <p className="progress">Fal Request ID: {requestId}</p>}

              {taskId && <p className="progress">PiAPI Task ID: {taskId}</p>}
            </div>

            <div className="panel">
              {preview ? (
                <img src={preview} alt="preview" className="preview-img" />
              ) : (
                <div className="preview-box">
                  Upload screenshot Mobile Legends
                </div>
              )}
            </div>
          </div>

          {ai && (
            <div className="result-card">
              <h2 className="result-title">{ai.title}</h2>
              <p className="result-text">
                {ai.caption || ai.scene1}
              </p>
              {ai.scene2 && <p className="result-text">{ai.scene2}</p>}
              {ai.scene3 && <p className="result-text">{ai.scene3}</p>}
              {ai.endingText && (
                <p className="result-text">{ai.endingText}</p>
              )}
              <p className="hashtags">{ai.hashtags?.join(" ")}</p>
            </div>
          )}

          {videoUrl && (
            <div className="result-card">
              <video src={videoUrl} controls className="video" />

              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="download"
              >
                Buka / Download Video
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

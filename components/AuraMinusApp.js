"use client";

import { useState } from "react";

export default function AuraMinusApp() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState("epic fail");
  const [progress, setProgress] = useState("");
  const [ai, setAi] = useState(null);

  async function fileToBase64(inputFile) {
    const buffer = await inputFile.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let binary = "";

    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }

    return btoa(binary);
  }

  async function analyzeImage() {
    const imageBase64 = await fileToBase64(file);

    const res = await fetch("/api/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        imageBase64,
        mimeType: file.type,
        style
      })
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "AI gagal analisa gambar");
    }

    return data.ai;
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
    if (percent < 0.22) {
      return {
        text: result.scene1 || "Katanya jago mekanik",
        y: 170,
        size: 48,
        color: "white"
      };
    }

    if (percent < 0.48) {
      return {
        text: result.scene2 || "Pas war malah hilang",
        y: 1040,
        size: 44,
        color: "white"
      };
    }

    if (percent < 0.75) {
      return {
        text: result.scene3 || "Tim cuma bisa pasrah",
        y: 1040,
        size: 44,
        color: "#facc15"
      };
    }

    return {
      text: result.endingText || "Aura turun satu rank 😭",
      y: 1030,
      size: 44,
      color: "#4ade80"
    };
  }

  async function renderCanvasVideo(result) {
    setProgress("AI script jadi video MLBB...");

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
        result.title || "MLBB Aura Minus",
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

  async function generateVideo() {
    if (!file) {
      alert("Upload screenshot Mobile Legends dulu");
      return;
    }

    try {
      setLoading(true);
      setVideoUrl("");
      setAi(null);

      setProgress("AI analisa screenshot MLBB...");
      const result = await analyzeImage();

      setAi(result);

      const url = await renderCanvasVideo(result);

      setVideoUrl(url);
      setProgress("Selesai. Video MLBB siap!");
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

    if (videoUrl) {
      URL.revokeObjectURL(videoUrl);
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setVideoUrl("");
    setAi(null);
    setProgress("");
  }

  return (
    <main>
      <section>
        <div className="card">
          <div className="badge">AuraMinus MLBB</div>

          <h1 className="hero-title">
            Mobile Legends,
            <br />
            Turunkan Aura 😭🔥
          </h1>

          <p className="hero-desc">
            Upload screenshot Mobile Legends: Bang Bang. AI akan analisa gambar,
            bikin script meme, lalu web otomatis membuat video pendek.
          </p>

          <div className="grid">
            <div className="panel">
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="input"
              />

              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="select"
              >
                <option value="epic fail">Epic Fail MLBB</option>
                <option value="win streak">Win Streak Flex</option>
                <option value="turun bintang">Turun Bintang</option>
                <option value="dark system">Dark System</option>
                <option value="mvp kalah">MVP Tapi Kalah</option>
              </select>

              <button
                onClick={generateVideo}
                disabled={loading}
                className="button"
              >
                {loading ? "Generating..." : "Generate Video MLBB"}
              </button>

              {progress && <p className="progress">{progress}</p>}
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
              <p className="result-text">{ai.scene1}</p>
              <p className="result-text">{ai.scene2}</p>
              <p className="result-text">{ai.scene3}</p>
              <p className="result-text">{ai.endingText}</p>
              <p className="hashtags">{ai.hashtags?.join(" ")}</p>
            </div>
          )}

          {videoUrl && (
            <div className="result-card">
              <video src={videoUrl} controls className="video" />

              <a
                href={videoUrl}
                download="auraminus-mlbb-video.webm"
                className="download"
              >
                Download Video MLBB
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
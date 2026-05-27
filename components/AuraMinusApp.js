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
      img.onerror = reject;
      img.src = src;
    });
  }

  function drawText(ctx, text, x, y, maxWidth, fontSize) {
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

    lines.push(line);

    lines.forEach((item, index) => {
      const lineY = y + index * (fontSize + 10);

      ctx.lineWidth = 8;
      ctx.strokeStyle = "black";
      ctx.strokeText(item, x, lineY);

      ctx.fillStyle = "white";
      ctx.fillText(item, x, lineY);
    });
  }

  async function renderCanvasVideo(result) {
    setProgress("Bikin video test MLBB...");

    const canvas = document.createElement("canvas");
    canvas.width = 720;
    canvas.height = 1280;

    const ctx = canvas.getContext("2d");
    const img = await loadImage(preview);

    const stream = canvas.captureStream(30);
    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm"
    });

    const chunks = [];

    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const done = new Promise((resolve) => {
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        resolve(URL.createObjectURL(blob));
      };
    });

    recorder.start();

    const duration = 6000;
    const start = performance.now();

    function drawFrame(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);

      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const scale = Math.max(
        canvas.width / img.width,
        canvas.height / img.height
      );

      const zoom = 1 + progress * 0.08;
      const w = img.width * scale * zoom;
      const h = img.height * scale * zoom;
      const x = (canvas.width - w) / 2;
      const y = (canvas.height - h) / 2;

      ctx.drawImage(img, x, y, w, h);

      ctx.fillStyle = "rgba(0,0,0,0.35)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = "rgba(0,0,0,0.65)";
      ctx.fillRect(0, 0, canvas.width, 210);
      ctx.fillRect(0, canvas.height - 260, canvas.width, 260);

      drawText(ctx, result.captionTop, canvas.width / 2, 105, 640, 46);
      drawText(ctx, result.captionBottom, canvas.width / 2, 1040, 640, 42);
      drawText(ctx, result.endingText, canvas.width / 2, 1160, 640, 38);

      ctx.font = "700 28px Arial";
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.textAlign = "center";
      ctx.fillText("AuraMinus MLBB", canvas.width / 2, 1240);

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

      setProgress("AI analisa gambar MLBB...");
      const result = await analyzeImage();

      setAi(result);

      const url = await renderCanvasVideo(result);

      setVideoUrl(url);
      setProgress("Selesai. Video test siap!");
    } catch (error) {
      alert(error.message || "Gagal generate video test");
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
            Upload screenshot Mobile Legends: Bang Bang. AI akan bikin caption
            meme MLBB lalu web membuat video test otomatis.
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
                <option value="toxic roast">Roast MLBB</option>
                <option value="sad moment">Turun Bintang</option>
                <option value="rank push">Push Rank Gagal</option>
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
              <p className="result-text">{ai.captionTop}</p>
              <p className="result-text">{ai.captionBottom}</p>
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
                Download Video Test
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
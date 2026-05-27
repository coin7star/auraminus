"use client";

import { useState } from "react";

export default function AuraMinusApp() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState("epic cinematic");
  const [progress, setProgress] = useState("");
  const [ai, setAi] = useState(null);
  const [requestId, setRequestId] = useState("");

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
        style
      })
    });

    const data = await res.json();

    if (!data.success) {
      throw new Error(data.error || "Gagal mulai Fal AI video");
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
      throw new Error(data.error || "Gagal cek status Fal AI");
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

      await wait(4000);
    }

    throw new Error("Timeout. Video Fal AI belum selesai.");
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

      setProgress("Upload gambar + AI bikin prompt MLBB...");
      const result = await startFalGeneration();

      setAi(result.ai);
      setRequestId(result.requestId);

      setProgress("Fal AI mulai generate video cinematic...");
      const finalVideoUrl = await pollFalVideo(result.requestId);

      setVideoUrl(finalVideoUrl);
      setProgress("Selesai. Video AI MLBB siap!");
    } catch (error) {
      alert(error.message || "Gagal generate video AI");
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
  }

  return (
    <main>
      <section>
        <div className="card">
          <div className="badge">AuraMinus MLBB + Fal AI</div>

          <h1 className="hero-title">
            MLBB Screenshot,
            <br />
            Jadi Video Hidup 😭🔥
          </h1>

          <p className="hero-desc">
            Upload screenshot Mobile Legends. Gemini akan analisa gambar, lalu
            Fal AI mengubahnya jadi video cinematic image-to-video.
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
                {loading ? "Generating AI Video..." : "Generate Fal AI Video"}
              </button>

              {progress && <p className="progress">{progress}</p>}

              {requestId && (
                <p className="progress">
                  Request ID: {requestId}
                </p>
              )}
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
              <p className="result-text">{ai.caption}</p>
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
                Buka / Download Video AI
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
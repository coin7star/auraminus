"use client";

import { useRef, useState } from "react";

export default function AuraMinusApp() {
  const ffmpegRef = useRef(null);
  const ffmpegHelpersRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState("toxic roast");
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

  async function loadFFmpeg() {
    if (typeof window === "undefined") {
      throw new Error("FFmpeg hanya bisa jalan di browser");
    }

    if (ffmpegRef.current) return ffmpegRef.current;

    setProgress("Load engine video...");

    const ffmpegModule = await import("@ffmpeg/ffmpeg");
    const utilModule = await import("@ffmpeg/util");

    const ffmpeg = new ffmpegModule.FFmpeg();
    const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.10/dist/umd";

    await ffmpeg.load({
      coreURL: await utilModule.toBlobURL(
        `${baseURL}/ffmpeg-core.js`,
        "text/javascript"
      ),
      wasmURL: await utilModule.toBlobURL(
        `${baseURL}/ffmpeg-core.wasm`,
        "application/wasm"
      )
    });

    ffmpegRef.current = ffmpeg;
    ffmpegHelpersRef.current = {
      fetchFile: utilModule.fetchFile
    };

    return ffmpeg;
  }

  function safeText(text = "") {
    return String(text)
      .replace(/\\/g, "\\\\")
      .replace(/:/g, "\\:")
      .replace(/'/g, "\\'")
      .replace(/,/g, "\\,")
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]");
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
      throw new Error(data.error || "AI gagal analisa gameplay");
    }

    return data.ai;
  }

  async function generateVideo() {
    if (!file) {
      alert("Upload gameplay dulu");
      return;
    }

    try {
      setLoading(true);
      setVideoUrl("");
      setAi(null);

      setProgress("AI lagi analisa gameplay...");
      const result = await analyzeImage();
      setAi(result);

      const ffmpeg = await loadFFmpeg();
      const { fetchFile } = ffmpegHelpersRef.current;

      setProgress("Render video meme...");
      await ffmpeg.writeFile("input.png", await fetchFile(file));

      const top = safeText(result.captionTop || "Katanya last game");
      const bottom = safeText(result.captionBottom || "Malah turun bintang");
      const ending = safeText(result.endingText || "Aura turun drastis");

      await ffmpeg.exec([
        "-loop",
        "1",
        "-i",
        "input.png",
        "-t",
        "8",
        "-vf",
        `scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,zoompan=z='min(zoom+0.0015,1.12)':d=240:s=1080x1920:fps=30,drawtext=text='${top}':fontcolor=white:fontsize=64:borderw=6:bordercolor=black:x=(w-text_w)/2:y=180,drawtext=text='${bottom}':fontcolor=white:fontsize=58:borderw=6:bordercolor=black:x=(w-text_w)/2:y=h-360,drawtext=text='${ending}':fontcolor=yellow:fontsize=52:borderw=5:bordercolor=black:x=(w-text_w)/2:y=h-200`,
        "-pix_fmt",
        "yuv420p",
        "-movflags",
        "faststart",
        "output.mp4"
      ]);

      const data = await ffmpeg.readFile("output.mp4");
      const url = URL.createObjectURL(
        new Blob([data.buffer], { type: "video/mp4" })
      );

      setVideoUrl(url);
      setProgress("Selesai 😭🔥");
    } catch (error) {
      alert(error.message || "Gagal generate");
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
          <div className="badge">AuraMinus AI</div>

          <h1 className="hero-title">
            Upload Gameplay,
            <br />
            Turunkan Aura 😭🔥
          </h1>

          <p className="hero-desc">
            Upload screenshot gameplay ML, PUBG, Valorant, atau game lain lalu
            AI bakal bikin video meme otomatis.
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
                <option value="toxic roast">Toxic Roast</option>
                <option value="sad moment">Sad Moment</option>
                <option value="epic fail">Epic Fail</option>
                <option value="sigma edit">Sigma Edit</option>
              </select>

              <button
                onClick={generateVideo}
                disabled={loading}
                className="button"
              >
                {loading ? "Generating..." : "Generate AuraMinus Video"}
              </button>

              {progress && <p className="progress">{progress}</p>}
            </div>

            <div className="panel">
              {preview ? (
                <img src={preview} alt="preview" className="preview-img" />
              ) : (
                <div className="preview-box">Preview gameplay</div>
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
                download="auraminus-video.mp4"
                className="download"
              >
                Download Video
              </a>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
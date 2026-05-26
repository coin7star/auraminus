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
    <main className="min-h-screen px-5 py-10">
      <section className="mx-auto max-w-5xl">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-6">
          <div className="mb-5 inline-flex rounded-full bg-white/10 px-4 py-2 text-sm text-white/70">
            AuraMinus AI
          </div>

          <h1 className="text-4xl font-black md:text-6xl">
            Upload Gameplay,
            <br />
            Turunkan Aura 😭🔥
          </h1>

          <p className="mt-5 max-w-2xl text-white/60">
            Upload screenshot gameplay ML, PUBG, Valorant, atau game lain lalu
            AI bakal bikin video meme otomatis.
          </p>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              <input
                type="file"
                accept="image/*"
                onChange={handleFile}
                className="w-full rounded-2xl bg-white/10 p-4"
              />

              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="mt-5 w-full rounded-2xl bg-white/10 p-4"
              >
                <option className="bg-black" value="toxic roast">
                  Toxic Roast
                </option>
                <option className="bg-black" value="sad moment">
                  Sad Moment
                </option>
                <option className="bg-black" value="epic fail">
                  Epic Fail
                </option>
                <option className="bg-black" value="sigma edit">
                  Sigma Edit
                </option>
              </select>

              <button
                onClick={generateVideo}
                disabled={loading}
                className="mt-5 w-full rounded-2xl bg-white px-5 py-4 font-black text-black disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate AuraMinus Video"}
              </button>

              {progress && (
                <p className="mt-4 text-sm text-white/60">{progress}</p>
              )}
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/40 p-5">
              {preview ? (
                <img
                  src={preview}
                  alt="preview"
                  className="max-h-[500px] w-full rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-[500px] items-center justify-center rounded-2xl border border-dashed border-white/10 text-white/40">
                  Preview gameplay
                </div>
              )}
            </div>
          </div>

          {ai && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
              <h2 className="text-2xl font-black">{ai.title}</h2>
              <p className="mt-3 text-white/70">{ai.captionTop}</p>
              <p className="text-white/70">{ai.captionBottom}</p>
              <p className="text-white/70">{ai.endingText}</p>
              <p className="mt-3 text-sm text-white/40">
                {ai.hashtags?.join(" ")}
              </p>
            </div>
          )}

          {videoUrl && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
              <video
                src={videoUrl}
                controls
                className="mx-auto max-h-[700px] rounded-2xl"
              />

              <a
                href={videoUrl}
                download="auraminus-video.mp4"
                className="mt-5 block rounded-2xl bg-green-400 px-5 py-4 text-center font-black text-black"
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
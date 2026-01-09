"use client";

import { useEffect, useRef, useState } from "react";

export default function CameraTestPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let stream: MediaStream | null = null;

    async function run() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e: any) {
        setErr(e?.message || String(e));
      }
    }

    run();

    return () => {
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <main style={{ padding: 24, color: "white" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700 }}>Kamera / Mikrofon Test</h1>
      <p>İzin verince aşağıda görüntü gelmeli.</p>

      {err ? (
        <pre style={{ whiteSpace: "pre-wrap", color: "#ff6b6b" }}>Hata: {err}</pre>
      ) : null}

      <video
        ref={videoRef}
        style={{ width: "100%", maxWidth: 720, marginTop: 16, border: "1px solid #444", borderRadius: 12 }}
        playsInline
        muted
      />
    </main>
  );
}

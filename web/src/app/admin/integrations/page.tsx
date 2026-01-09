"use client";

import { useEffect, useState } from "react";

type ScormItem = {
  id: string;
  name: string;
  size: number;
  uploadedAt: string;
};

export default function AdminIntegrationsPage() {
  const [items, setItems] = useState<ScormItem[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/integrations/scorm");
    const data = await res.json();
    setItems(data.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function upload() {
    if (!file) return;

    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/integrations/scorm", {
        method: "POST",
        body: fd,
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Yükleme hatası");
        return;
      }

      setFile(null);
      await load();
      alert("SCORM paketi yüklendi (mock).");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 900 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Entegrasyonlar</h1>

      <section
        style={{
          marginTop: 18,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 10,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>
          SCORM (1.2 / 2004) — Paket Yükleme (Mock)
        </h2>
        <p style={{ opacity: 0.8 }}>
          ZIP dosyası yüklenir, sistem “SCORM içerik” olarak kaydeder (local
          geliştirme).
        </p>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="file"
            accept=".zip"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            onClick={upload}
            disabled={!file || loading}
            style={{
              padding: "6px 10px",
              border: "1px solid #333",
              borderRadius: 8,
              cursor: !file || loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Yükleniyor..." : "Yükle"}
          </button>
        </div>

        <div style={{ marginTop: 12 }}>
          <strong>Yüklenen paketler</strong>
          <ul style={{ marginTop: 8 }}>
            {items.map((it) => (
              <li key={it.id}>
                {it.name} — {Math.round(it.size / 1024)} KB —{" "}
                {new Date(it.uploadedAt).toLocaleString("tr-TR")}
              </li>
            ))}
            {items.length === 0 && <li>Henüz yüklenen yok</li>}
          </ul>
        </div>
      </section>

      <section
        style={{
          marginTop: 18,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 10,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>
          LTI 1.3 / Harici Araç (Temel)
        </h2>
        <p style={{ opacity: 0.8 }}>
          Bu projede LTI handshake yerine, “harici araç tanımlama + embed (iframe)”
          yaklaşımı gösterilir.
        </p>
      </section>

      <section
        style={{
          marginTop: 18,
          padding: 12,
          border: "1px solid #ddd",
          borderRadius: 10,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>
          Jitsi / BigBlueButton (Temel)
        </h2>
        <p style={{ opacity: 0.8 }}>
          Canlı ders için oda linki üretme ve ders içinde açma (mock / self-host).
        </p>
      </section>
    </div>
  );
}

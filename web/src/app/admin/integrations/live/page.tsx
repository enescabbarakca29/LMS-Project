"use client";

import { useEffect, useState } from "react";

type Provider = "jitsi" | "bbb";

type LiveSession = {
  id: string;
  provider: Provider;
  room: string;
  url: string;
  createdAt: string;
};

export default function LiveIntegrationsPage() {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const res = await fetch("/api/integrations/live");
    const data = await res.json();
    setSessions(data.sessions ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function create(provider: Provider) {
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Hata");
        return;
      }
      await load();
      setPreviewUrl(data.session?.url ?? "");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Canlı Ders Entegrasyonu</h1>
      <p style={{ opacity: 0.8 }}>
        Jitsi Meet ve BigBlueButton için canlı oturum oluşturma ve ders içinde embed (iframe) altyapısı.
      </p>

      <section style={card}>
        <h2 style={h2}>Oturum Oluştur</h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={() => create("jitsi")} disabled={loading} style={btn(loading)}>
            {loading ? "..." : "Jitsi Oturumu Oluştur"}
          </button>
          <button onClick={() => create("bbb")} disabled={loading} style={btn(loading)}>
            {loading ? "..." : "BigBlueButton Oturumu Oluştur (Mock)"}
          </button>
          <button onClick={load} disabled={loading} style={btn(loading)}>
            {loading ? "..." : "Yenile"}
          </button>
        </div>
        <p style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
          Not: BigBlueButton gerçek sunucu URL’i projeye göre değişir. Burada “mock link üretimi” gösteriyoruz.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2}>Oturumlar</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {sessions.map((s) => (
            <div key={s.id} style={row}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {s.provider.toUpperCase()} — {s.room}
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>{s.url}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  {new Date(s.createdAt).toLocaleString("tr-TR")}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setPreviewUrl(s.url)} style={btn(false)}>
                  Önizle
                </button>
                <a href={s.url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                  Yeni sekmede aç
                </a>
              </div>
            </div>
          ))}
          {sessions.length === 0 && <div style={{ opacity: 0.8 }}>Henüz oturum yok.</div>}
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>Önizleme</h2>
        {!previewUrl ? (
          <div style={{ opacity: 0.8 }}>Listeden bir oturum seçip “Önizle”ye bas.</div>
        ) : (
          <>
            <div style={{ marginBottom: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <code style={{ fontSize: 12, opacity: 0.85 }}>{previewUrl}</code>
              <button onClick={() => setPreviewUrl("")} style={btn(false)}>
                Kapat
              </button>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden" }}>
              <iframe
                src={previewUrl}
                style={{ width: "100%", height: 560, border: 0 }}
                allow="camera; microphone; fullscreen; speaker; display-capture"
              />
            </div>

            <p style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
              Eğer iframe engellenirse (X-Frame-Options), “Yeni sekmede aç” ile entegrasyon demosu yapılır.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

const card: React.CSSProperties = {
  marginTop: 14,
  padding: 12,
  border: "1px solid #ddd",
  borderRadius: 10,
};

const h2: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
  margin: 0,
  marginBottom: 8,
};

const row: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: 10,
  padding: 10,
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  flexWrap: "wrap",
};

const btn = (disabled: boolean): React.CSSProperties => ({
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.3)",
  background: "transparent",
  color: "inherit",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
});

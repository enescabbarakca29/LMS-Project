"use client";

import { useEffect, useMemo, useState } from "react";

type LtiTool = {
  id: string;
  name: string;
  url: string;
  createdAt: string;
};

export default function LtiAdminPage() {
  const [tools, setTools] = useState<LtiTool[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const canAdd = useMemo(() => name.trim().length > 0 && /^https?:\/\//i.test(url.trim()), [name, url]);

  async function load() {
    const res = await fetch("/api/integrations/lti");
    const data = await res.json();
    setTools(data.tools ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function addTool() {
    if (!canAdd) return;
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/lti", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Hata");
        return;
      }
      setName("");
      setUrl("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function removeTool(id: string) {
    if (!confirm("Silinsin mi?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/lti?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Silme hatası");
        return;
      }
      if (previewUrl && tools.find((t) => t.id === id)?.url === previewUrl) {
        setPreviewUrl("");
      }
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>LTI 1.3 — Harici Araç Yönetimi (Temel)</h1>
      <p style={{ opacity: 0.8 }}>
        Bu projede “LTI handshake” yerine, harici araç tanımlama + ders içinde embed (iframe) altyapısı gösterilir.
      </p>

      <section style={{ marginTop: 14, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Yeni Araç Ekle</h2>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 2fr auto", alignItems: "center" }}>
          <input
            placeholder="Araç adı (örn: GeoGebra)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={inp}
          />
          <input
            placeholder="URL (https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={inp}
          />
          <button onClick={addTool} disabled={!canAdd || loading} style={btn(!canAdd || loading)}>
            {loading ? "..." : "Ekle"}
          </button>
        </div>
        <p style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
          Not: Bazı siteler iframe’e izin vermez (X-Frame-Options). Bu durumda link olarak açacağız.
        </p>
      </section>

      <section style={{ marginTop: 14, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Kayıtlı Araçlar</h2>

        <div style={{ display: "grid", gap: 8 }}>
          {tools.map((t) => (
            <div
              key={t.id}
              style={{
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 10,
                padding: 10,
                display: "grid",
                gridTemplateColumns: "1fr auto auto",
                gap: 10,
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontWeight: 700 }}>{t.name}</div>
                <div style={{ fontSize: 13, opacity: 0.8 }}>{t.url}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  {new Date(t.createdAt).toLocaleString("tr-TR")}
                </div>
              </div>

              <button
                onClick={() => setPreviewUrl(t.url)}
                style={btn(false)}
                disabled={loading}
                title="iframe ile önizle"
              >
                Önizle
              </button>

              <button
                onClick={() => removeTool(t.id)}
                style={{ ...btn(false), borderColor: "#b33" }}
                disabled={loading}
                title="sil"
              >
                Sil
              </button>
            </div>
          ))}

          {tools.length === 0 && <div style={{ opacity: 0.8 }}>Henüz araç eklenmedi.</div>}
        </div>
      </section>

      <section style={{ marginTop: 14, padding: 12, border: "1px solid #ddd", borderRadius: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 700 }}>Önizleme</h2>

        {!previewUrl ? (
          <div style={{ opacity: 0.8 }}>Bir araç seçip “Önizle”ye bas.</div>
        ) : (
          <>
            <div style={{ marginBottom: 8, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <code style={{ fontSize: 12, opacity: 0.85 }}>{previewUrl}</code>
              <a href={previewUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                Yeni sekmede aç
              </a>
              <button onClick={() => setPreviewUrl("")} style={btn(false)}>
                Kapat
              </button>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden" }}>
              <iframe
                src={previewUrl}
                style={{ width: "100%", height: 520, border: 0 }}
                allow="clipboard-read; clipboard-write; fullscreen"
              />
            </div>

            <p style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
              Eğer burada boş/engel çıkarsa site iframe’e izin vermiyor olabilir. Bu durumda “Yeni sekmede aç” ile
              entegrasyon gösterimi yapılır.
            </p>
          </>
        )}
      </section>
    </div>
  );
}

const inp: React.CSSProperties = {
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.2)",
  background: "transparent",
  color: "inherit",
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

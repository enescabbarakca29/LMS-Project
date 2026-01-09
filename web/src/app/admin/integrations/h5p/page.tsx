"use client";

import { useEffect, useMemo, useState } from "react";

type H5pItem = {
  id: string;
  title: string;
  url: string;
  createdAt: string;
};

export default function H5pAdminPage() {
  const [items, setItems] = useState<H5pItem[]>([]);
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const canAdd = useMemo(
    () => title.trim().length > 0 && /^https?:\/\//i.test(url.trim()),
    [title, url]
  );

  async function load() {
    const res = await fetch("/api/integrations/h5p");
    const data = await res.json();
    setItems(data.items ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!canAdd) return;
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/h5p", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Hata");
        return;
      }
      setTitle("");
      setUrl("");
      await load();
      setPreviewUrl(data.item?.url ?? "");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Silinsin mi?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/h5p?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Silme hatası");
        return;
      }
      // preview silinenle aynıysa kapat
      const removed = items.find((x) => x.id === id);
      if (removed?.url && previewUrl === removed.url) setPreviewUrl("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>H5P — İnteraktif İçerik (Embed)</h1>
      <p style={{ opacity: 0.8 }}>
        H5P içerikleri URL üzerinden “embed/iframe” ile ders içine eklenebilir. (Self-host / üçüncü taraf)
      </p>

      <section style={card}>
        <h2 style={h2}>Yeni H5P İçeriği Ekle</h2>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 2fr auto", alignItems: "center" }}>
          <input
            placeholder="Başlık (örn: Sürükle-bırak etkinliği)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={inp}
          />
          <input
            placeholder="URL (https://...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            style={inp}
          />
          <button onClick={add} disabled={!canAdd || loading} style={btn(!canAdd || loading)}>
            {loading ? "..." : "Ekle"}
          </button>
        </div>
        <p style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
          Not: Bazı servisler iframe’i engelleyebilir. Bu durumda “Yeni sekmede aç” ile demo yapılır.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2}>Kayıtlı H5P İçerikleri</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {items.map((it) => (
            <div key={it.id} style={row}>
              <div>
                <div style={{ fontWeight: 700 }}>{it.title}</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>{it.url}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  {new Date(it.createdAt).toLocaleString("tr-TR")}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button onClick={() => setPreviewUrl(it.url)} style={btn(false)} disabled={loading}>
                  Önizle
                </button>
                <a href={it.url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                  Yeni sekmede aç
                </a>
                <button
                  onClick={() => remove(it.id)}
                  style={{ ...btn(false), borderColor: "#b33" }}
                  disabled={loading}
                >
                  Sil
                </button>
              </div>
            </div>
          ))}
          {items.length === 0 && <div style={{ opacity: 0.8 }}>Henüz içerik eklenmedi.</div>}
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>Önizleme</h2>
        {!previewUrl ? (
          <div style={{ opacity: 0.8 }}>Listeden bir içerik seçip “Önizle”ye bas.</div>
        ) : (
          <>
            <div style={{ marginBottom: 8, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <code style={{ fontSize: 12, opacity: 0.85 }}>{previewUrl}</code>
              <button onClick={() => setPreviewUrl("")} style={btn(false)}>
                Kapat
              </button>
            </div>

            <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, overflow: "hidden" }}>
              <iframe src={previewUrl} style={{ width: "100%", height: 560, border: 0 }} />
            </div>
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

"use client";

import { useEffect, useMemo, useState } from "react";

type LinkType = "google_calendar" | "teams_meeting" | "drive_link";

type WorkspaceLink = {
  id: string;
  type: LinkType;
  title: string;
  url: string;
  createdAt: string;
};

function isHttpUrl(url: string) {
  return /^https?:\/\//i.test(url.trim());
}

// Basit Google Calendar link üretici (OAuth yok, link bazlı)
function buildGoogleCalendarLink(params: {
  title: string;
  details?: string;
  location?: string;
  startISO: string; // YYYY-MM-DDTHH:mm
  endISO: string; // YYYY-MM-DDTHH:mm
}) {
  // Google Calendar URL'inde Zulu formatı lazım: YYYYMMDDTHHmmssZ
  const toGCal = (isoLocal: string) => {
    // local string → Date → UTC format
    const d = new Date(isoLocal);
    const pad = (n: number) => String(n).padStart(2, "0");
    const y = d.getUTCFullYear();
    const m = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hh = pad(d.getUTCHours());
    const mm = pad(d.getUTCMinutes());
    const ss = pad(d.getUTCSeconds());
    return `${y}${m}${day}T${hh}${mm}${ss}Z`;
  };

  const dates = `${toGCal(params.startISO)}/${toGCal(params.endISO)}`;

  const sp = new URLSearchParams({
    action: "TEMPLATE",
    text: params.title,
    dates,
  });

  if (params.details) sp.set("details", params.details);
  if (params.location) sp.set("location", params.location);

  return `https://calendar.google.com/calendar/render?${sp.toString()}`;
}

export default function WorkspaceAdminPage() {
  const [links, setLinks] = useState<WorkspaceLink[]>([]);
  const [loading, setLoading] = useState(false);

  // ortak ekleme
  const [type, setType] = useState<LinkType>("google_calendar");
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");

  // google calendar helper
  const [gcTitle, setGcTitle] = useState("Ders Oturumu");
  const [gcStart, setGcStart] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm
  });
  const [gcEnd, setGcEnd] = useState(() => {
    const d = new Date();
    d.setHours(d.getHours() + 2);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [gcDetails, setGcDetails] = useState("LMS üzerinden planlandı.");
  const [gcLocation, setGcLocation] = useState("Online");

  const canAdd = useMemo(() => title.trim().length > 0 && isHttpUrl(url), [title, url]);

  async function load() {
    const res = await fetch("/api/integrations/workspace");
    const data = await res.json();
    setLinks(data.links ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function add() {
    if (!canAdd) return;
    setLoading(true);
    try {
      const res = await fetch("/api/integrations/workspace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, title: title.trim(), url: url.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Hata");
        return;
      }
      setTitle("");
      setUrl("");
      await load();
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Silinsin mi?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/integrations/workspace?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error ?? "Silme hatası");
        return;
      }
      await load();
    } finally {
      setLoading(false);
    }
  }

  function quickFillGoogleCalendar() {
    const link = buildGoogleCalendarLink({
      title: gcTitle.trim() || "Ders Oturumu",
      details: gcDetails.trim(),
      location: gcLocation.trim(),
      startISO: gcStart,
      endISO: gcEnd,
    });

    setType("google_calendar");
    setTitle(`Google Calendar: ${gcTitle.trim() || "Ders Oturumu"}`);
    setUrl(link);
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>Google Workspace + Microsoft 365</h1>
      <p style={{ opacity: 0.8 }}>
        Drive/OneDrive dosya linkleri, Teams toplantı linkleri ve Google Calendar “takvime ekle” bağlantısı desteği.
      </p>

      <section style={card}>
        <h2 style={h2}>Google Calendar — “Takvime Ekle” Linki Üret</h2>
        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "1fr 1fr", alignItems: "center" }}>
          <input value={gcTitle} onChange={(e) => setGcTitle(e.target.value)} placeholder="Etkinlik adı" style={inp} />
          <input value={gcLocation} onChange={(e) => setGcLocation(e.target.value)} placeholder="Konum" style={inp} />
          <input type="datetime-local" value={gcStart} onChange={(e) => setGcStart(e.target.value)} style={inp} />
          <input type="datetime-local" value={gcEnd} onChange={(e) => setGcEnd(e.target.value)} style={inp} />
          <input
            value={gcDetails}
            onChange={(e) => setGcDetails(e.target.value)}
            placeholder="Açıklama"
            style={{ ...inp, gridColumn: "1 / -1" }}
          />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={quickFillGoogleCalendar} style={btn(false)} disabled={loading}>
            Linki Hazırla
          </button>
          <span style={{ fontSize: 13, opacity: 0.75 }}>
            “Linki Hazırla” → aşağıdaki forma otomatik doldurur. Sonra “Kaydet”.
          </span>
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>Link Ekle (Calendar / Teams / Drive-OneDrive)</h2>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
          <label style={{ opacity: 0.85 }}>Tür</label>
          <select value={type} onChange={(e) => setType(e.target.value as LinkType)} style={inp}>
            <option value="google_calendar">Google Calendar</option>
            <option value="teams_meeting">Microsoft Teams</option>
            <option value="drive_link">Drive / OneDrive</option>
          </select>

          <label style={{ opacity: 0.85 }}>Başlık</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Başlık" style={inp} />

          <label style={{ opacity: 0.85 }}>URL</label>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://..." style={inp} />
        </div>

        <div style={{ marginTop: 10 }}>
          <button onClick={add} disabled={!canAdd || loading} style={btn(!canAdd || loading)}>
            {loading ? "..." : "Kaydet"}
          </button>
        </div>

        <p style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
          Not: Bu projede OAuth yerine “link bazlı entegrasyon” gösterilir. Üretimde OAuth / API anahtarları eklenebilir.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2}>Kayıtlı Linkler</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {links.map((l) => (
            <div key={l.id} style={row}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {l.type === "google_calendar"
                    ? "Google Calendar"
                    : l.type === "teams_meeting"
                    ? "Microsoft Teams"
                    : "Drive / OneDrive"}{" "}
                  — {l.title}
                </div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>{l.url}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  {new Date(l.createdAt).toLocaleString("tr-TR")}
                </div>
              </div>

              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <a href={l.url} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>
                  Aç
                </a>
                <button onClick={() => remove(l.id)} style={{ ...btn(false), borderColor: "#b33" }} disabled={loading}>
                  Sil
                </button>
              </div>
            </div>
          ))}

          {links.length === 0 && <div style={{ opacity: 0.8 }}>Henüz link yok.</div>}
        </div>
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

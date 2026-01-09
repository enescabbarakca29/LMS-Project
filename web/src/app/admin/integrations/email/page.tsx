"use client";

import { useEffect, useMemo, useState } from "react";

type MailItem = {
  id: string;
  to: string;
  subject: string;
  message: string;
  status: "MOCK_SENT";
  createdAt: string;
};

function isEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function EmailIntegrationsPage() {
  const [sent, setSent] = useState<MailItem[]>([]);
  const [to, setTo] = useState("test@example.com");
  const [subject, setSubject] = useState("LMS Bildirim Testi");
  const [message, setMessage] = useState("Merhaba, bu bir SMTP entegrasyon test mesajıdır.");
  const [loading, setLoading] = useState(false);

  const canSend = useMemo(
    () => isEmail(to) && subject.trim().length > 0 && message.trim().length > 0,
    [to, subject, message]
  );

  async function load() {
    const res = await fetch("/api/notify/email");
    const data = await res.json();
    setSent(data.sent ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function send() {
    if (!canSend) return;
    setLoading(true);
    try {
      const res = await fetch("/api/notify/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: to.trim(), subject: subject.trim(), message: message.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Gönderim hatası");
        return;
      }
      await load();
      alert("Mail gönderildi (mock). /admin/audit üzerinden logu görebilirsin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>SMTP — E-posta Bildirimi (Mock)</h1>
      <p style={{ opacity: 0.8 }}>
        Local ortamda SMTP yerine “mock gönderim” yapılır. Production’da nodemailer + gerçek SMTP sunucusuna taşınabilir.
      </p>

      <section style={card}>
        <h2 style={h2}>Test Mail Gönder</h2>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
          <label style={{ opacity: 0.85 }}>Kime</label>
          <input value={to} onChange={(e) => setTo(e.target.value)} style={inp} placeholder="email@domain.com" />

          <label style={{ opacity: 0.85 }}>Konu</label>
          <input value={subject} onChange={(e) => setSubject(e.target.value)} style={inp} placeholder="Konu" />

          <label style={{ opacity: 0.85 }}>Mesaj</label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            style={{ ...inp, minHeight: 100 }}
            placeholder="Mesaj"
          />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={send} disabled={!canSend || loading} style={btn(!canSend || loading)}>
            {loading ? "..." : "Gönder"}
          </button>
          <button onClick={load} disabled={loading} style={btn(loading)}>
            {loading ? "..." : "Yenile"}
          </button>
        </div>

        <p style={{ marginTop: 8, fontSize: 13, opacity: 0.75 }}>
          Not: Bu demo, “SMTP ile bildirim gönderme altyapısı”nı gösterir. Gönderimler audit log’a yazılır.
        </p>
      </section>

      <section style={card}>
        <h2 style={h2}>Gönderilenler</h2>
        <div style={{ display: "grid", gap: 8 }}>
          {sent.map((m) => (
            <div key={m.id} style={row}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {m.to} — <span style={{ opacity: 0.9 }}>{m.subject}</span>
                </div>
                <div style={{ fontSize: 13, opacity: 0.85, whiteSpace: "pre-wrap" }}>{m.message}</div>
                <div style={{ fontSize: 12, opacity: 0.65 }}>
                  {new Date(m.createdAt).toLocaleString("tr-TR")} — {m.status}
                </div>
              </div>
            </div>
          ))}
          {sent.length === 0 && <div style={{ opacity: 0.8 }}>Henüz gönderim yok.</div>}
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

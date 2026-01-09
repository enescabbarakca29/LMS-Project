"use client";

import { useEffect, useState } from "react";

type AuditRecord = {
  at: string;
  userId?: string;
  courseId?: string;
  action: string;
  detail?: Record<string, any>;
};

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/audit");
      const data = await res.json();
      setLogs(data.logs ?? []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Audit Log</h1>
        <button
          onClick={load}
          style={{ padding: "6px 10px", border: "1px solid #333", borderRadius: 8 }}
          disabled={loading}
        >
          {loading ? "Yenileniyor..." : "Yenile"}
        </button>
      </div>

      <p style={{ opacity: 0.8, marginTop: 8 }}>
        Kritik işlemler kayıt altına alınır (ör. SCORM yükleme, quiz import/export).
      </p>

      <div
        style={{
          marginTop: 12,
          border: "1px solid #ddd",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "rgba(255,255,255,0.06)" }}>
              <th style={th}>Zaman</th>
              <th style={th}>Aksiyon</th>
              <th style={th}>Detay</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l, idx) => (
              <tr key={idx} style={{ borderTop: "1px solid rgba(255,255,255,0.12)" }}>
                <td style={td}>{new Date(l.at).toLocaleString("tr-TR")}</td>
                <td style={td}><code>{l.action}</code></td>
                <td style={td}>
                  <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                    {l.detail ? JSON.stringify(l.detail, null, 2) : "-"}
                  </pre>
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td style={td} colSpan={3}>
                  Henüz log yok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  fontWeight: 700,
};

const td: React.CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "top",
  fontSize: 14,
};

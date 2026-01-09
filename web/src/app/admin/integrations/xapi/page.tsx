"use client";

import { useEffect, useMemo, useState } from "react";

type XApiVerb = "initialized" | "experienced" | "completed" | "answered" | "passed" | "failed";
type ObjType = "course" | "module" | "content" | "quiz";

type XApiStatement = {
  id: string;
  actor: { userId: string; name?: string };
  verb: XApiVerb;
  object: { type: ObjType; id: string; title?: string };
  result?: { success?: boolean; score?: number };
  timestamp: string;
};

export default function XApiAdminPage() {
  const [statements, setStatements] = useState<XApiStatement[]>([]);
  const [loading, setLoading] = useState(false);

  // test form
  const [userId, setUserId] = useState("u_demo");
  const [name, setName] = useState("Demo User");
  const [verb, setVerb] = useState<XApiVerb>("experienced");
  const [objType, setObjType] = useState<ObjType>("content");
  const [objId, setObjId] = useState("c_001");
  const [objTitle, setObjTitle] = useState("Örnek İçerik");
  const [score, setScore] = useState<number>(85);
  const [success, setSuccess] = useState(true);

  const canSend = useMemo(() => userId.trim() && objType && objId.trim() && verb, [userId, objType, objId, verb]);

  async function load() {
    const res = await fetch("/api/integrations/xapi");
    const data = await res.json();
    setStatements(data.statements ?? []);
  }

  useEffect(() => {
    load();
  }, []);

  async function sendTest() {
    if (!canSend) return;
    setLoading(true);
    try {
      const payload: any = {
        actor: { userId: userId.trim(), name: name.trim() || undefined },
        verb,
        object: { type: objType, id: objId.trim(), title: objTitle.trim() || undefined },
      };

      // Bazı verb’lerde result mantıklı
      if (verb === "passed" || verb === "failed" || verb === "answered" || verb === "completed") {
        payload.result = { success, score: Number.isFinite(score) ? score : undefined };
      }

      const res = await fetch("/api/integrations/xapi", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error ?? "Hata");
        return;
      }
      await load();
      alert("xAPI event kaydedildi. /admin/audit üzerinden XAPI_RECORD görebilirsin.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1100 }}>
      <h1 style={{ fontSize: 22, fontWeight: 700 }}>xAPI (Tin Can) — Öğrenme Kayıtları</h1>
      <p style={{ opacity: 0.8 }}>
        Kullanıcı etkileşimleri xAPI benzeri statement formatında kayıt altına alınır (experienced, completed, passed...).
      </p>

      <section style={card}>
        <h2 style={h2}>Test Statement Gönder</h2>

        <div style={{ display: "grid", gap: 8, gridTemplateColumns: "220px 1fr", alignItems: "center" }}>
          <label style={lbl}>userId</label>
          <input value={userId} onChange={(e) => setUserId(e.target.value)} style={inp} />

          <label style={lbl}>name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} style={inp} />

          <label style={lbl}>verb</label>
          <select value={verb} onChange={(e) => setVerb(e.target.value as XApiVerb)} style={inp}>
            <option value="initialized">initialized</option>
            <option value="experienced">experienced</option>
            <option value="completed">completed</option>
            <option value="answered">answered</option>
            <option value="passed">passed</option>
            <option value="failed">failed</option>
          </select>

          <label style={lbl}>object.type</label>
          <select value={objType} onChange={(e) => setObjType(e.target.value as ObjType)} style={inp}>
            <option value="course">course</option>
            <option value="module">module</option>
            <option value="content">content</option>
            <option value="quiz">quiz</option>
          </select>

          <label style={lbl}>object.id</label>
          <input value={objId} onChange={(e) => setObjId(e.target.value)} style={inp} />

          <label style={lbl}>object.title</label>
          <input value={objTitle} onChange={(e) => setObjTitle(e.target.value)} style={inp} />

          <label style={lbl}>result.success</label>
          <select value={success ? "true" : "false"} onChange={(e) => setSuccess(e.target.value === "true")} style={inp}>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>

          <label style={lbl}>result.score</label>
          <input
            type="number"
            value={score}
            onChange={(e) => setScore(Number(e.target.value))}
            style={inp}
          />
        </div>

        <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button onClick={sendTest} disabled={!canSend || loading} style={btn(!canSend || loading)}>
            {loading ? "..." : "Gönder"}
          </button>
          <button onClick={load} disabled={loading} style={btn(loading)}>
            {loading ? "..." : "Yenile"}
          </button>
        </div>
      </section>

      <section style={card}>
        <h2 style={h2}>Kayıtlar</h2>

        <div style={{ display: "grid", gap: 8 }}>
          {statements.map((s) => (
            <div key={s.id} style={row}>
              <div style={{ fontWeight: 700 }}>
                <code>{s.verb}</code> — {s.actor.userId} — {s.object.type}:{s.object.id}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {s.object.title ? `title: ${s.object.title}` : ""}
              </div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {s.result ? `result: ${JSON.stringify(s.result)}` : "result: -"}
              </div>
              <div style={{ fontSize: 12, opacity: 0.65 }}>
                {new Date(s.timestamp).toLocaleString("tr-TR")}
              </div>
            </div>
          ))}
          {statements.length === 0 && <div style={{ opacity: 0.8 }}>Henüz kayıt yok.</div>}
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

const lbl: React.CSSProperties = { opacity: 0.85 };

const btn = (disabled: boolean): React.CSSProperties => ({
  padding: "8px 10px",
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.3)",
  background: "transparent",
  color: "inherit",
  cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.6 : 1,
});

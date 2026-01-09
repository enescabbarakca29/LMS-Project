"use client";

import { useEffect, useMemo, useState } from "react";
import RoleGate from "@/app/components/auth/RoleGate";
import { DEMO_USERS, getUser, setRole } from "@/app/lib/auth/storage";
import type { Role } from "@/app/lib/auth/types";

type Row = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

const ROLE_LABEL: Record<Role, string> = {
  SUPER_ADMIN: "Süper Admin",
  ADMIN: "Yönetici",
  INSTRUCTOR: "Eğitmen",
  ASSISTANT: "Asistan",
  STUDENT: "Öğrenci",
  GUEST: "Misafir",
};

export default function UsersPage() {
  const [meRole, setMeRole] = useState<Role>("GUEST");
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    const me = getUser();
    setMeRole(me?.role ?? "GUEST");

    // Demo listeyi ekrana basalım (DB yoksa bile yeterli)
    setRows(
      DEMO_USERS.map(({ password: _pw, ...u }) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
      }))
    );
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.name.toLowerCase().includes(s) ||
        r.email.toLowerCase().includes(s) ||
        ROLE_LABEL[r.role].toLowerCase().includes(s)
    );
  }, [q, rows]);

  function changeMyRole(next: Role) {
    // Bu sadece demo: localStorage'daki aktif kullanıcının rolünü değiştirir
    setRole(next);
    setMeRole(next);
    alert(`Aktif kullanıcı rolü değişti: ${ROLE_LABEL[next]}`);
  }

  return (
    <RoleGate minRole="ADMIN" redirectTo="/login?redirect=/users">
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Kullanıcı Yönetimi</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Bu ekran sadece <b>ADMIN</b> ve üstü rollere açıktır.
        </p>

        {/* Arama + Demo rol değiştirme */}
        <div
          style={{
            marginTop: 16,
            display: "flex",
            gap: 10,
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ara: isim, e-posta, rol..."
            style={{
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ddd",
              minWidth: 260,
            }}
          />

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, opacity: 0.8 }}>
              Aktif rol: <b>{ROLE_LABEL[meRole]}</b>
            </span>

            <select
              value={meRole}
              onChange={(e) => changeMyRole(e.target.value as Role)}
              style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
              title="Demo amaçlı: aktif kullanıcı rolünü değiştirir"
            >
              {(
                [
                  "SUPER_ADMIN",
                  "ADMIN",
                  "INSTRUCTOR",
                  "ASSISTANT",
                  "STUDENT",
                  "GUEST",
                ] as Role[]
              ).map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tablo */}
        <div style={{ marginTop: 16, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left" }}>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Ad</th>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>E-posta</th>
                <th style={{ padding: 10, borderBottom: "1px solid #eee" }}>Rol</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{u.name}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>{u.email}</td>
                  <td style={{ padding: 10, borderBottom: "1px solid #f2f2f2" }}>
                    {ROLE_LABEL[u.role]}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 10, opacity: 0.7 }}>
                    Sonuç bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p style={{ marginTop: 14, fontSize: 12, opacity: 0.75 }}>
          Not: Bu sayfa demo amaçlıdır. API/DB bağlanınca kullanıcılar backend’den gelecektir.
        </p>
      </div>
    </RoleGate>
  );
}

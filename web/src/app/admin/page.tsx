"use client";

import RoleGate from "@/app/components/auth/RoleGate";
import { getUser, logout } from "@/app/lib/auth/storage";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminPage() {
  const router = useRouter();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    const u = getUser();
    setName(u?.name || "");
  }, []);

  return (
    <RoleGate minRole="ADMIN" redirectTo="/login?redirect=/admin">
      <div style={{ padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800 }}>Admin Panel</h1>
        <p style={{ marginTop: 8, opacity: 0.8 }}>
          Hoş geldin, <b>{name}</b>. (Bu sayfa sadece ADMIN ve üstü rollere açık)
        </p>

        <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
          <button
            onClick={() => router.push("/users")}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}
          >
            Kullanıcı Yönetimi
          </button>

          <button
            onClick={() => {
              logout();
              router.replace("/login");
            }}
            style={{ padding: 10, borderRadius: 10, border: "1px solid #111", background: "#111", color: "#fff", cursor: "pointer" }}
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    </RoleGate>
  );
}

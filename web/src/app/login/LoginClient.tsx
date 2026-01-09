"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@/app/lib/auth/types";

type Step = "CREDENTIALS" | "TWO_FA";

export default function LoginClient() {
  const router = useRouter();
  const sp = useSearchParams();
  const redirect = sp.get("redirect") || "/";
  const cameFromProtected = !!sp.get("redirect");

  const [step, setStep] = useState<Step>("CREDENTIALS");
  const [pendingUser, setPendingUser] = useState<User | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [err, setErr] = useState<string | null>(null);

  // Demo hint’i clientte yükle (storage importu build/prerender’a takılmasın)
  const [demoHintText, setDemoHintText] = useState<string>("Yükleniyor...");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const mod = await import("@/app/lib/auth/storage");
        const hint = mod.DEMO_USERS.map((u) => `${u.role} → ${u.email} / abc123`).join(" | ");
        if (mounted) setDemoHintText(hint);
      } catch {
        if (mounted) setDemoHintText("Demo hesaplar yüklenemedi.");
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const demoHint = useMemo(() => demoHintText, [demoHintText]);

  function validatePassword(pw: string) {
    if (pw.length < 6) return "Şifre en az 6 karakter olmalı.";
    if (!/[A-Za-z]/.test(pw)) return "Şifre en az 1 harf içermeli.";
    if (!/[0-9]/.test(pw)) return "Şifre en az 1 rakam içermeli.";
    return null;
  }

  async function onSubmitCredentials(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    const pwErr = validatePassword(password);
    if (pwErr) return setErr(pwErr);

    try {
      const mod = await import("@/app/lib/auth/storage");
      const user = mod.verifyCredentials(email.trim(), password);

      if (!user) return setErr("E-posta veya şifre hatalı.");

      setPendingUser(user);
      setStep("TWO_FA");
      setOtp("");
    } catch {
      setErr("Login modülü yüklenemedi. Lütfen tekrar deneyin.");
    }
  }

  async function onSubmit2FA(e: FormEvent) {
    e.preventDefault();
    setErr(null);

    if (otp.trim() !== "123456") return setErr("2FA kodu hatalı. Demo kod: 123456");

    if (!pendingUser) {
      setErr("Oturum doğrulama hatası. Lütfen tekrar deneyin.");
      setStep("CREDENTIALS");
      return;
    }

    try {
      const mod = await import("@/app/lib/auth/storage");
      mod.persistUser(pendingUser);
      router.replace(redirect);
    } catch {
      setErr("Oturum kaydedilemedi. Lütfen tekrar deneyin.");
    }
  }

  function resetToCredentials() {
    setStep("CREDENTIALS");
    setPendingUser(null);
    setOtp("");
    setErr(null);
  }

  return (
    <div style={{ minHeight: "70vh", display: "grid", placeItems: "center", padding: 24 }}>
      <div
        style={{
          width: "100%",
          maxWidth: 460,
          border: "1px solid #e5e5e5",
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>
          {step === "CREDENTIALS" ? "Giriş Yap" : "2FA Doğrulama"}
        </h1>

        {step === "CREDENTIALS" && cameFromProtected && (
          <div
            style={{
              marginBottom: 10,
              padding: 10,
              borderRadius: 10,
              border: "1px solid #ffcc00",
              background: "rgba(255, 204, 0, 0.12)",
              fontSize: 12,
            }}
          >
            Bu sayfaya erişim için yetkin yok. Devam etmek için uygun rol ile giriş yap.
          </div>
        )}

        {step === "CREDENTIALS" && (
          <>
            <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 12 }}>Demo hesaplar: {demoHint}</p>

            <form onSubmit={onSubmitCredentials} style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>E-posta</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@lms.com"
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                  autoComplete="email"
                />
              </label>

              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>Şifre</span>
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type="password"
                  placeholder="abc123"
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                  autoComplete="current-password"
                />
                <span style={{ fontSize: 11, opacity: 0.75 }}>
                  Şifre politikası: en az 6 karakter, en az 1 harf ve 1 rakam.
                </span>
              </label>

              {err && <div style={{ fontSize: 12, color: "crimson" }}>{err}</div>}

              <button
                type="submit"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                  marginTop: 4,
                }}
              >
                Devam (2FA)
              </button>
            </form>

            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <button
                type="button"
                onClick={() => alert("OAuth (Google) entegrasyonu demo: backend hazır olunca bağlanacak.")}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}
              >
                Google ile giriş (demo)
              </button>

              <button
                type="button"
                onClick={() => alert("OAuth (Microsoft) entegrasyonu demo: backend hazır olunca bağlanacak.")}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}
              >
                Microsoft ile giriş (demo)
              </button>

              <button
                type="button"
                onClick={() => alert("SSO (SAML) / LDAP demo: kurum entegrasyonu için planlandı.")}
                style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}
              >
                SSO / LDAP ile giriş (demo)
              </button>
            </div>
          </>
        )}

        {step === "TWO_FA" && (
          <>
            <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 12 }}>
              {pendingUser?.email} için doğrulama kodu gir. (Demo kod: <b>123456</b>)
            </p>

            <form onSubmit={onSubmit2FA} style={{ display: "grid", gap: 10 }}>
              <label style={{ display: "grid", gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 600 }}>2FA Kodu</span>
                <input
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd" }}
                  inputMode="numeric"
                />
              </label>

              {err && <div style={{ fontSize: 12, color: "crimson" }}>{err}</div>}

              <button
                type="submit"
                style={{
                  padding: 10,
                  borderRadius: 10,
                  border: "1px solid #111",
                  background: "#111",
                  color: "white",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Doğrula ve Giriş Yap
              </button>

              <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => alert("Demo: Kod yeniden gönderildi. Kod: 123456")}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}
                >
                  Kodu Yeniden Gönder (demo)
                </button>

                <button
                  type="button"
                  onClick={resetToCredentials}
                  style={{ padding: 10, borderRadius: 10, border: "1px solid #ddd", cursor: "pointer" }}
                >
                  Geri Dön
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

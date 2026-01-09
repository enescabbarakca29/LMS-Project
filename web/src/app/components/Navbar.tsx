"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getUser, logout } from "@/app/lib/auth/storage";
import type { Role } from "@/app/lib/auth/types";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const { theme, setTheme } = useTheme();
  const { i18n } = useTranslation();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [role, setRole] = useState<Role | null>(null);

  useEffect(() => {
    setMounted(true);

    const sync = () => {
      const u = getUser();
      setRole(u?.role ?? null);
    };

    sync(); // ilk yüklemede

    // Sekmeye geri dönünce rolü güncelle
    window.addEventListener("focus", sync);

    // Aynı sekmede login/logout/2FA tamamlanınca (persistUser) rolü güncelle
    window.addEventListener("auth-changed", sync);

    // Farklı sekmede localStorage değişirse rolü güncelle
    const onStorage = () => sync();
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("focus", sync);
      window.removeEventListener("auth-changed", sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  if (!mounted) return null;

  const isTR = i18n.language?.startsWith("tr");

  const toggleLanguage = () => {
    const nextLang = isTR ? "en" : "tr";
    localStorage.setItem("lang", nextLang);
    i18n.changeLanguage(nextLang);
  };

  return (
    <header className="border-b border-white/20">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        {/* Sol taraf */}
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold text-white">
            LMS Web
          </Link>

          {/* Her giriş yapan */}
          {role && (
            <Link
              href="/courses"
              className="rounded-md px-3 py-1 text-sm text-white hover:bg-white/10 transition"
            >
              Courses
            </Link>
          )}

          {/* Admin & Super Admin */}
          {(role === "ADMIN" || role === "SUPER_ADMIN") && (
            <>
              <Link
                href="/admin"
                className="rounded-md px-3 py-1 text-sm text-white hover:bg-white/10 transition"
              >
                Admin Panel
              </Link>

              <Link
                href="/users"
                className="rounded-md px-3 py-1 text-sm text-white hover:bg-white/10 transition"
              >
                Users
              </Link>
            </>
          )}

          {/* Eğitmen */}
          {(role === "INSTRUCTOR" || role === "ADMIN" || role === "SUPER_ADMIN") && (
            <Link
              href="/courses/new"
              className="rounded-md px-3 py-1 text-sm text-white hover:bg-white/10 transition"
            >
              New Course
            </Link>
          )}
        </div>

        {/* Sağ taraf */}
        <nav className="flex items-center gap-3">
          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="rounded-md border border-white/30 px-3 py-1 text-sm text-white hover:bg-white/10 transition"
            title="Change language"
          >
            {isTR ? "EN" : "TR"}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="rounded-md border border-white/30 px-3 py-1 text-sm text-white hover:bg-white/10 transition"
            title="Toggle theme"
          >
            {theme === "dark" ? "🌙 Dark" : "☀️ Light"}
          </button>

          {/* Logout */}
          {role && (
            <button
              onClick={() => {
                logout(); // storage.ts içinde auth-changed dispatch ediyor
                router.replace("/login");
              }}
              className="rounded-md border border-white/30 px-3 py-1 text-sm text-white hover:bg-red-500/20 transition"
            >
              Çıkış
            </button>
          )}
        </nav>
      </div>
    </header>
  );
}

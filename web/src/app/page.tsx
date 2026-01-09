"use client";

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";

export default function Home() {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Hydration mismatch'i engeller
  if (!mounted) return null;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-white">
        {t("title")}
      </h1>

      <p className="text-gray-300 max-w-2xl">
        {t("description")}
      </p>

      <div className="rounded-xl border border-white/15 bg-white/5 p-5">
        <h2 className="text-lg font-semibold text-white">
          {t("features")}
        </h2>
        <ul className="mt-3 list-disc space-y-2 pl-6 text-gray-200">
          <li>{t("feature_1")}</li>
          <li>{t("feature_2")}</li>
          <li>{t("feature_3")}</li>
          <li>{t("feature_4")}</li>
        </ul>
      </div>

      {/* GİRİŞ YAP BUTONU */}
      <div className="pt-4">
        <Link
          href="/login"
          className="inline-block rounded-xl bg-white px-6 py-3 font-semibold text-black transition hover:bg-gray-200"
        >
          Giriş Yap
        </Link>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

type ModuleItem = {
  id: string;
  title: string;
  createdAt: string;
};

type AccessSettings = {
  password?: string;
  openAt?: string; // ISO
  allowedGroups?: string[];
};

function nowTR() {
  return new Date().toLocaleString("tr-TR");
}

function slugId(prefix: string) {
  const n = Math.floor(100 + Math.random() * 900);
  return `${prefix}${n}`;
}

export default function CourseModulesPage() {
  const params = useParams<{ id: string }>();
  const courseId = params?.id;

  if (!courseId) {
    return (
      <div className="rounded-lg border border-white/20 p-4 text-gray-300">
        Ders ID bulunamadı. Lütfen dersler sayfasından tekrar gir.
      </div>
    );
  }

  const storageKey = useMemo(() => `course_modules_${courseId}`, [courseId]);
  const accessKey = useMemo(() => `course_access_${courseId}`, [courseId]);

  const [title, setTitle] = useState("");
  const [modules, setModules] = useState<ModuleItem[]>([]);

  // ---- access control state
  const [access, setAccess] = useState<AccessSettings>({});
  const [userGroup, setUserGroup] = useState<string>("A");
  const [passwordInput, setPasswordInput] = useState("");
  const [unlocked, setUnlocked] = useState<boolean>(false);

  const load = () => {
    const raw = localStorage.getItem(storageKey);
    try {
      const parsed: ModuleItem[] = raw ? JSON.parse(raw) : [];
      setModules(parsed);
    } catch {
      setModules([]);
    }
  };

  const loadAccess = () => {
    const ug = localStorage.getItem("user_group");
    if (ug) setUserGroup(ug);

    const raw = localStorage.getItem(accessKey);
    const s: AccessSettings = raw ? JSON.parse(raw) : {};
    setAccess(s);

    const ok = localStorage.getItem(`course_access_ok_${courseId}`) === "1";
    setUnlocked(ok);
  };

  useEffect(() => {
    load();
    loadAccess();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, accessKey]);

  // ---- access logic
  const now = Date.now();
  const openAtMs = access.openAt ? new Date(access.openAt).getTime() : null;

  const dateLocked = openAtMs !== null && now < openAtMs;

  const groupLocked =
    Array.isArray(access.allowedGroups) &&
    access.allowedGroups.length > 0 &&
    !access.allowedGroups.includes(userGroup);

  const passwordLocked = !!access.password && !unlocked;

  const isLocked = dateLocked || groupLocked || passwordLocked;

  const tryUnlock = () => {
    if (!access.password) return;
    if (passwordInput === access.password) {
      localStorage.setItem(`course_access_ok_${courseId}`, "1");
      setUnlocked(true);
      setPasswordInput("");
    } else {
      alert("Şifre yanlış.");
    }
  };

  const addModule = (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;

    const newModule: ModuleItem = {
      id: slugId("M"),
      title: t,
      createdAt: nowTR(),
    };

    setModules((prev) => {
      const updated = [newModule, ...prev];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });

    setTitle("");
  };

  const removeModule = (moduleId: string) => {
    if (!confirm("Bu modülü silmek istediğine emin misin?")) return;

    setModules((prev) => {
      const updated = prev.filter((m) => m.id !== moduleId);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      return updated;
    });

    localStorage.removeItem(`module_items_${courseId}_${moduleId}`);
  };

  // ---- locked UI
  if (isLocked) {
    return (
      <div className="space-y-4 max-w-xl">
        <Link href={`/courses/${courseId}`} className="text-sm text-gray-300 hover:underline">
          ← Derse dön
        </Link>

        <div className="rounded-lg border border-white/20 p-4">
          <h1 className="text-xl font-semibold text-white">Ders Kilitli</h1>

          {dateLocked && (
            <p className="mt-2 text-gray-300">
              Ders şu tarihte açılacak:{" "}
              <span className="text-white">
                {new Date(access.openAt!).toLocaleString("tr-TR")}
              </span>
            </p>
          )}

          {groupLocked && (
            <p className="mt-2 text-gray-300">
              Bu ders sadece şu gruplara açık:{" "}
              <span className="text-white">
                {(access.allowedGroups || []).join(", ")}
              </span>
              . Senin grubun: <span className="text-white">{userGroup}</span>
            </p>
          )}

          {passwordLocked && (
            <div className="mt-4 space-y-2">
              <label className="block text-sm text-white">Şifre</label>
              <div className="flex gap-2">
                <input
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black outline-none"
                  placeholder="Ders şifresini gir"
                />
                <button
                  onClick={tryUnlock}
                  className="shrink-0 rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition"
                >
                  Aç
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---- normal UI
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Link href={`/courses/${courseId}`} className="text-sm text-gray-300 hover:underline">
            ← Derse dön
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-white">Modüller ({courseId})</h1>
          <p className="text-sm text-gray-300">Ders içeriğini modüller halinde organize et.</p>
        </div>

        <Link
          href={`/courses/${courseId}/edit`}
          className="rounded-md border border-white/30 px-3 py-1 text-sm text-white hover:bg-white/10 transition"
        >
          Ders Bilgilerini Düzenle
        </Link>
      </div>

      <form onSubmit={addModule} className="space-y-2">
        <label className="block text-sm text-white">Yeni Modül Adı</label>
        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: 1. Hafta - Giriş"
            className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition"
          >
            Ekle
          </button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2">
        {modules.length === 0 ? (
          <div className="rounded-lg border border-white/20 p-4 text-gray-300">
            Henüz modül yok. Yukarıdan ekleyebilirsin.
          </div>
        ) : (
          modules.map((m) => (
            <div key={m.id} className="rounded-lg border border-white/20 p-4 hover:bg-white/5 transition">
              <div className="text-xs text-gray-400">{m.id}</div>
              <div className="text-lg font-medium text-white">{m.title}</div>
              <div className="text-xs text-gray-300">Oluşturulma: {m.createdAt}</div>

              <div className="mt-3 flex gap-3">
                <Link
                  href={`/courses/${courseId}/modules/${m.id}`}
                  className="rounded-md border border-white/30 px-3 py-1 text-sm text-white hover:bg-white/10 transition"
                >
                  İçerikler
                </Link>

                <button
                  onClick={() => removeModule(m.id)}
                  className="rounded-md border border-red-400 px-3 py-1 text-sm text-red-300 hover:bg-red-500/10 transition"
                >
                  Sil
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

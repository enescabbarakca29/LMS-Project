"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type Course = {
  id: string;
  title: string;
  instructor: string;
  descriptionHtml?: string;
  createdAt?: string;
};

type AccessSettings = {
  password?: string;
  openAt?: string; // ISO
  allowedGroups?: string[];
};

type ModuleItem = {
  id: string;
  title: string;
  createdAt: string;
};

const defaultCourses: Course[] = [
  { id: "C101", title: "Sayısal Mantık Tasarımı", instructor: "Dr. A. Yılmaz" },
  { id: "C102", title: "Veri Mühendisliğine Giriş", instructor: "Dr. B. Demir" },
  { id: "C103", title: "Yapay Zeka Temelleri", instructor: "Dr. C. Kaya" },
];

const GROUPS = ["A", "B", "C"];

function accessKey(courseId: string) {
  return `course_access_${courseId}`;
}
function prereqKey(courseId: string) {
  return `course_prereq_${courseId}`;
}
function completedKey() {
  return `courses_completed`;
}

export default function CourseDetailPage() {
  const params = useParams();
  const courseId = params?.id as string;

  // ✅ HOOKLARIN HEPSİ HER RENDER ÇALIŞMALI (return yok)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [course, setCourse] = useState<Course | null>(null);

  // ---- Access settings state
  const aKey = useMemo(() => (courseId ? accessKey(courseId) : ""), [courseId]);
  const [password, setPassword] = useState("");
  const [openAt, setOpenAt] = useState(""); // datetime-local
  const [allowedGroups, setAllowedGroups] = useState<string[]>([]);
  const [savedToast, setSavedToast] = useState<string>("");

  // ---- mock user group
  const [userGroup, setUserGroup] = useState<string>("A");

  // ---- prereq / completed
  const [prereqs, setPrereqs] = useState<string[]>([]);
  const [completed, setCompleted] = useState<string[]>([]);

  // ---- all courses (demo)
  const [allCourses, setAllCourses] = useState<Course[]>([]);

  useEffect(() => {
    if (!mounted) return;
    if (!courseId) return;

    const raw = localStorage.getItem("courses");
    const stored: Course[] = raw ? JSON.parse(raw) : [];
    const all = [...defaultCourses, ...stored];

    setAllCourses(all);
    setCourse(all.find((c) => c.id === courseId) || null);
  }, [mounted, courseId]);

  useEffect(() => {
    if (!mounted) return;
    if (!courseId) return;
    if (!aKey) return;

    // load user group
    const ug = localStorage.getItem("user_group");
    if (ug) setUserGroup(ug);

    // load access settings
    const raw = localStorage.getItem(aKey);
    const s: AccessSettings = raw ? JSON.parse(raw) : {};
    setPassword(s.password ?? "");
    setOpenAt(s.openAt ? new Date(s.openAt).toISOString().slice(0, 16) : "");
    setAllowedGroups(Array.isArray(s.allowedGroups) ? s.allowedGroups : []);

    // load prereqs
    const rawP = localStorage.getItem(prereqKey(courseId));
    const p: string[] = rawP ? JSON.parse(rawP) : [];
    setPrereqs(Array.isArray(p) ? p : []);

    // load completed (demo)
    const rawC = localStorage.getItem(completedKey());
    const c: string[] = rawC ? JSON.parse(rawC) : [];
    setCompleted(Array.isArray(c) ? c : []);
  }, [mounted, courseId, aKey]);

  const saveAccess = () => {
    if (!courseId || !aKey) return;

    const settings: AccessSettings = {
      password: password.trim() || undefined,
      openAt: openAt ? new Date(openAt).toISOString() : undefined,
      allowedGroups: allowedGroups.length ? allowedGroups : undefined,
    };

    localStorage.setItem(aKey, JSON.stringify(settings));
    localStorage.removeItem(`course_access_ok_${courseId}`);

    setSavedToast("Erişim ayarları kaydedildi ✅");
    window.setTimeout(() => setSavedToast(""), 1500);
  };

  const toggleGroup = (g: string) => {
    setAllowedGroups((prev) =>
      prev.includes(g) ? prev.filter((x) => x !== g) : [...prev, g]
    );
  };

  const handleDelete = () => {
    const isDefault = defaultCourses.some((c) => c.id === courseId);
    if (isDefault) {
      alert("Varsayılan dersler silinemez (mock).");
      return;
    }

    if (!confirm("Bu dersi silmek istediğine emin misin?")) return;

    const raw = localStorage.getItem("courses");
    const stored: Course[] = raw ? JSON.parse(raw) : [];
    const updated = stored.filter((c) => c.id !== courseId);

    localStorage.setItem("courses", JSON.stringify(updated));
    localStorage.removeItem(aKey);
    localStorage.removeItem(`course_access_ok_${courseId}`);
    localStorage.removeItem(prereqKey(courseId));

    window.location.href = "/courses";
  };

  const setAndSaveUserGroup = (g: string) => {
    setUserGroup(g);
    localStorage.setItem("user_group", g);
  };

  const handleCopy = () => {
    if (!course) return;

    const newIdRaw = prompt(
      "Yeni ders ID gir (örn: C101-2026B):",
      `${courseId}-COPY`
    );
    if (newIdRaw === null) return;

    const newCourseId = newIdRaw.trim();
    if (!newCourseId) {
      alert("Geçerli bir ID girmelisin.");
      return;
    }

    const raw = localStorage.getItem("courses");
    const stored: Course[] = raw ? JSON.parse(raw) : [];
    const all = [...defaultCourses, ...stored];

    if (all.some((c) => c.id === newCourseId)) {
      alert("Bu ID zaten var. Başka bir ID seç.");
      return;
    }

    const newCourse: Course = {
      ...course,
      id: newCourseId,
      title: `${course.title} (Kopya)`,
      createdAt: new Date().toISOString(),
    };

    localStorage.setItem("courses", JSON.stringify([newCourse, ...stored]));

    // access kopyala
    const oldAccessRaw = localStorage.getItem(accessKey(courseId));
    if (oldAccessRaw) localStorage.setItem(accessKey(newCourseId), oldAccessRaw);
    localStorage.removeItem(`course_access_ok_${newCourseId}`);

    // prereq kopyala
    const oldP = localStorage.getItem(prereqKey(courseId));
    if (oldP) localStorage.setItem(prereqKey(newCourseId), oldP);

    // modules kopyala
    const oldModulesKey = `course_modules_${courseId}`;
    const newModulesKey = `course_modules_${newCourseId}`;
    const rawModules = localStorage.getItem(oldModulesKey);
    const modules: ModuleItem[] = rawModules ? JSON.parse(rawModules) : [];
    localStorage.setItem(newModulesKey, JSON.stringify(modules));

    // module items kopyala
    modules.forEach((m) => {
      const oldItemsKey = `module_items_${courseId}_${m.id}`;
      const newItemsKey = `module_items_${newCourseId}_${m.id}`;
      const rawItems = localStorage.getItem(oldItemsKey);
      if (rawItems) localStorage.setItem(newItemsKey, rawItems);
    });

    alert(`Ders kopyalandı ✅ Yeni ders: ${newCourseId}`);
    window.location.href = `/courses/${newCourseId}`;
  };

  const toggleCompleted = (id: string) => {
    setCompleted((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem(completedKey(), JSON.stringify(next));
      return next;
    });
  };

  // prereq lock
  const unmetPrereqs = prereqs.filter((p) => !completed.includes(p));
  const prereqLocked = unmetPrereqs.length > 0;

  // ✅ ARTIK RETURN'LAR EN SONA
  if (!mounted) {
    return (
      <div className="rounded-lg border border-white/20 p-4 text-gray-300">
        Yükleniyor...
      </div>
    );
  }

  if (!courseId) {
    return (
      <div className="rounded-lg border border-white/20 p-4 text-gray-300">
        URL parametreleri eksik görünüyor.
      </div>
    );
  }

  if (!course) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-white">Ders bulunamadı</h1>
        <p className="text-gray-300">ID: {courseId}</p>
        <Link href="/courses" className="underline text-gray-200">
          ← Courses’a dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/courses" className="underline text-gray-200">
        ← Courses’a dön
      </Link>

      <div className="rounded-lg border border-white/20 p-4">
        <div className="text-sm text-gray-400">{course.id}</div>
        <h1 className="text-2xl font-semibold text-white">{course.title}</h1>
        <div className="text-sm text-gray-300">
          Instructor: {course.instructor}
        </div>

        {course.createdAt && (
          <div className="mt-1 text-xs text-gray-400">
            Oluşturulma: {new Date(course.createdAt).toLocaleString("tr-TR")}
          </div>
        )}

        {course.descriptionHtml && (
          <div
            className="mt-4 rounded-md border border-white/10 bg-white/5 p-3 text-gray-100"
            dangerouslySetInnerHTML={{ __html: course.descriptionHtml }}
          />
        )}

        {/* Ön Koşullar */}
        {prereqs.length > 0 && (
          <div className="mt-4 rounded-md border border-white/10 bg-white/5 p-3">
            <div className="text-sm text-white font-medium">Ön Koşullar</div>
            <div className="mt-1 text-sm text-gray-200">{prereqs.join(", ")}</div>

            {prereqLocked && (
              <div className="mt-2 text-sm text-red-300">
                Bu derse erişim için tamamlanması gereken dersler var:{" "}
                <span className="text-red-200">{unmetPrereqs.join(", ")}</span>
              </div>
            )}
          </div>
        )}

        {/* Butonlar */}
        <div className="mt-4 flex flex-wrap gap-3">
          {prereqLocked ? (
            <button
              type="button"
              onClick={() =>
                alert(
                  `Ön koşullar tamamlanmadan modüllere girilemez: ${unmetPrereqs.join(
                    ", "
                  )}`
                )
              }
              className="rounded-md border border-white/20 px-4 py-2 text-gray-300 cursor-not-allowed opacity-70"
            >
              Modüller (Kilitli)
            </button>
          ) : (
            <Link
              href={`/courses/${courseId}/modules`}
              className="rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition"
            >
              Modüller
            </Link>
          )}

          {/* ✅ YENİ: Değerlendirmeler (URL yazmadan girilsin) */}
          <Link
            href={`/courses/${courseId}/assessment`}
            className="rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition"
          >
            Değerlendirmeler
          </Link>

          <Link
            href={`/courses/${courseId}/edit`}
            className="rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition"
          >
            Düzenle
          </Link>

          <button
            onClick={handleCopy}
            className="rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition"
          >
            Dersi Kopyala
          </button>

          <button
            onClick={handleDelete}
            className="rounded-md border border-red-400 px-4 py-2 text-red-300 hover:bg-red-500/10 transition"
          >
            Dersi Sil
          </button>
        </div>
      </div>

      {/* Demo: Ders Tamamlama */}
      <div className="rounded-lg border border-white/20 p-4 space-y-3">
        <div className="text-lg font-semibold text-white">Demo: Ders Tamamlama</div>
        <div className="text-sm text-gray-300">
          Ön koşul sistemini göstermek için dersleri “tamamlandı” işaretle.
        </div>

        <div className="flex flex-wrap gap-2">
          {allCourses.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggleCompleted(c.id)}
              className={
                "rounded-md border px-3 py-1 text-sm transition " +
                (completed.includes(c.id)
                  ? "border-green-400 text-green-200 bg-green-500/10"
                  : "border-white/20 text-gray-200 hover:bg-white/5")
              }
            >
              {c.id} {completed.includes(c.id) ? "✓" : ""}
            </button>
          ))}
        </div>

        <div className="text-xs text-gray-400">
          Bu bölüm sadece demo içindir (localStorage: courses_completed).
        </div>
      </div>

      {/* ---- 5.2: Erişim Kontrolü ---- */}
      <div className="rounded-lg border border-white/20 p-4 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-white">Erişim Ayarları</h2>
          {savedToast && <div className="text-sm text-green-300">{savedToast}</div>}
        </div>

        {/* Mock: Kullanıcı grubu seçimi */}
        <div className="rounded-md border border-white/10 bg-white/5 p-3">
          <div className="text-sm text-gray-200 mb-2">Mock Kullanıcı Grubu</div>
          <select
            value={userGroup}
            onChange={(e) => setAndSaveUserGroup(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white outline-none"
          >
            {GROUPS.map((g) => (
              <option key={g} value={g}>
                Grup {g}
              </option>
            ))}
          </select>
          <div className="mt-2 text-xs text-gray-400">
            Bu seçim sadece demo içindir (localStorage.user_group).
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-white mb-1">
              Ders Şifresi (opsiyonel)
            </label>
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Boş bırakılırsa şifre yok"
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black outline-none"
            />
            <div className="mt-1 text-xs text-gray-400">
              Şifre varsa, modüllere girmeden önce sorulur.
            </div>
          </div>

          <div>
            <label className="block text-sm text-white mb-1">
              Açılma Tarihi (opsiyonel)
            </label>
            <input
              type="datetime-local"
              value={openAt}
              onChange={(e) => setOpenAt(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white outline-none"
            />
            <div className="mt-1 text-xs text-gray-400">
              Tarih gelecekteyse ders kilitli görünür.
            </div>
          </div>
        </div>

        <div>
          <div className="block text-sm text-white mb-2">
            İzinli Gruplar (opsiyonel)
          </div>
          <div className="flex flex-wrap gap-2">
            {GROUPS.map((g) => {
              const on = allowedGroups.includes(g);
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => toggleGroup(g)}
                  className={
                    "rounded-md border px-3 py-1 text-sm transition " +
                    (on
                      ? "border-green-400 text-green-200 bg-green-500/10"
                      : "border-white/20 text-gray-200 hover:bg-white/5")
                  }
                >
                  Grup {g}
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-gray-400">
            Seçilmezse herkes erişebilir. Seçilirse sadece bu gruplar erişebilir.
          </div>
        </div>

        <button
          onClick={saveAccess}
          className="rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition"
        >
          Ayarları Kaydet
        </button>
      </div>
    </div>
  );
}

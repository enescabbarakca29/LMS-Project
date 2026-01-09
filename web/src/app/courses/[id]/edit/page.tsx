"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import RichTextEditor from "@/app/components/RichTextEditor";

type Course = {
  id: string;
  title: string;
  instructor: string;
  descriptionHtml?: string;
  createdAt?: string;
};

const defaultCourses: Course[] = [
  { id: "C101", title: "Sayısal Mantık Tasarımı", instructor: "Dr. A. Yılmaz" },
  { id: "C102", title: "Veri Mühendisliğine Giriş", instructor: "Dr. B. Demir" },
  { id: "C103", title: "Yapay Zeka Temelleri", instructor: "Dr. C. Kaya" },
];

function prereqKey(courseId: string) {
  return `course_prereq_${courseId}`;
}

export default function EditCoursePage() {
  const params = useParams();
  const courseId = params?.id as string;

  // ✅ hydration gate (hooklar önce)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notFound, setNotFound] = useState(false);

  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [prereqs, setPrereqs] = useState<string[]>([]);
  const pKey = useMemo(() => (courseId ? prereqKey(courseId) : ""), [courseId]);

  useEffect(() => {
    if (!mounted) return;
    if (!courseId) return;

    const raw = localStorage.getItem("courses");
    const stored: Course[] = raw ? JSON.parse(raw) : [];
    const all = [...defaultCourses, ...stored];
    setAllCourses(all);

    const course = all.find((c) => c.id === courseId);
    if (!course) {
      setNotFound(true);
      return;
    }

    setTitle(course.title);
    setDescription(course.descriptionHtml || "");

    // prereq load
    const rawP = localStorage.getItem(pKey);
    const parsed: string[] = rawP ? JSON.parse(rawP) : [];
    setPrereqs(Array.isArray(parsed) ? parsed : []);
  }, [mounted, courseId, pKey]);

  const togglePrereq = (id: string) => {
    setPrereqs((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!courseId || !pKey) return;

    // Varsayılan dersleri değiştirmeyelim
    const isDefault = defaultCourses.some((c) => c.id === courseId);
    if (isDefault) {
      alert("Varsayılan dersler düzenlenemez (mock).");
      return;
    }

    const raw = localStorage.getItem("courses");
    const stored: Course[] = raw ? JSON.parse(raw) : [];

    const updated = stored.map((c) =>
      c.id === courseId
        ? { ...c, title: title.trim(), descriptionHtml: description }
        : c
    );

    localStorage.setItem("courses", JSON.stringify(updated));

    // prereq save
    const clean = prereqs.filter((x) => x !== courseId);
    localStorage.setItem(pKey, JSON.stringify(clean));

    window.location.href = `/courses/${courseId}`;
  };

  // ✅ return’ler en sonda
  if (!mounted) {
    return (
      <div className="rounded-lg border border-white/20 p-4 text-gray-300">
        Yükleniyor...
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-semibold text-white">Ders bulunamadı</h1>
        <Link href="/courses" className="underline text-gray-200">
          ← Courses’a dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Link href={`/courses/${courseId}`} className="underline text-gray-200">
        ← Detaya dön
      </Link>

      <h1 className="text-2xl font-semibold text-white">Dersi Düzenle</h1>

      <form className="space-y-4" onSubmit={handleSave}>
        <div className="space-y-1">
          <label className="text-sm font-medium text-white">Ders Adı</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-white">Ders Açıklaması</label>
          <RichTextEditor value={description} onChange={setDescription} />
        </div>

        {/* ✅ Ön Koşullar */}
        <div className="rounded-lg border border-white/20 p-4 space-y-2">
          <div className="text-sm font-medium text-white">Ön Koşullar (opsiyonel)</div>
          <div className="text-xs text-gray-400">
            Bu dersin açılabilmesi için önce tamamlanması gereken dersleri seç.
          </div>

          <div className="mt-2 space-y-2">
            {allCourses
              .filter((c) => c.id !== courseId)
              .map((c) => {
                const on = prereqs.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => togglePrereq(c.id)}
                    className={
                      "w-full text-left rounded-md border px-3 py-2 text-sm transition " +
                      (on
                        ? "border-green-400 text-green-200 bg-green-500/10"
                        : "border-white/20 text-gray-200 hover:bg-white/5")
                    }
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {c.id} — {c.title}
                      </span>
                      <span className="text-xs">{on ? "Seçili" : "Seç"}</span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        <button
          type="submit"
          className="rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition"
        >
          Kaydet
        </button>
      </form>
    </div>
  );
}

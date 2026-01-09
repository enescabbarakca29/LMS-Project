"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Course = {
  id: string;
  title: string;
  instructor: string;
  descriptionHtml?: string;
  createdAt?: string;
};

type ContentType = "video" | "pdf" | "scorm" | "h5p";

type ContentItem = {
  id: string;
  type: ContentType;
  title: string;
  url?: string;
  createdAt: string;
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

function nowTR() {
  return new Date().toLocaleString("tr-TR");
}

function randId(prefix: string) {
  const n = Math.floor(100 + Math.random() * 900);
  return `${prefix}${n}`;
}

function courseExists(all: Course[], id: string) {
  return all.some((c) => c.id.toLowerCase() === id.toLowerCase());
}

// ✅ ŞABLON (A): tek şablon
type Template = {
  id: "theory";
  name: string;
  modules: Array<{
    title: string;
    items: Array<{ type: ContentType; title: string; url?: string }>;
  }>;
};

const TEMPLATES: Template[] = [
  {
    id: "theory",
    name: "Teorik Ders Şablonu",
    modules: [
      {
        title: "1. Hafta - Giriş",
        items: [
          { type: "pdf", title: "Ders Tanıtımı (PDF)" },
          { type: "video", title: "Tanıtım Videosu", url: "https://www.youtube.com/" },
        ],
      },
      {
        title: "2. Hafta - Temel Kavramlar",
        items: [
          { type: "pdf", title: "Konu Anlatımı (PDF)" },
          { type: "h5p", title: "Kısa Quiz (H5P)" },
        ],
      },
      {
        title: "3. Hafta - Uygulama / Değerlendirme",
        items: [
          { type: "scorm", title: "Uygulama Paketi (SCORM)" },
          { type: "pdf", title: "Ödev / Çalışma Kağıdı (PDF)" },
        ],
      },
    ],
  },
];

export default function NewCoursePage() {
  // ✅ hook order sabit
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [instructor, setInstructor] = useState("");

  const [templateId, setTemplateId] = useState<string>(""); // "" = şablonsuz

  const selectedTemplate = useMemo(
    () => TEMPLATES.find((t) => t.id === templateId) ?? null,
    [templateId]
  );

  const createFromTemplate = (newId: string, tpl: Template) => {
    // 1) modülleri üret
    const modules: ModuleItem[] = tpl.modules.map((m) => ({
      id: randId("M"),
      title: m.title,
      createdAt: nowTR(),
    }));

    // 2) course_modules_{courseId}
    localStorage.setItem(`course_modules_${newId}`, JSON.stringify(modules));

    // 3) her modül için module_items_{courseId}_{moduleId}
    modules.forEach((mod, idx) => {
      const tplItems = tpl.modules[idx]?.items ?? [];
      const items: ContentItem[] = tplItems.map((it) => ({
        id: randId("I"),
        type: it.type,
        title: it.title,
        url: it.url,
        createdAt: nowTR(),
      }));

      localStorage.setItem(
        `module_items_${newId}_${mod.id}`,
        JSON.stringify(items)
      );
    });
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!mounted) return;

    const id = courseId.trim();
    const t = title.trim();
    const ins = instructor.trim();

    if (!id || !t || !ins) {
      alert("Lütfen ID, ders adı ve eğitmen alanlarını doldur.");
      return;
    }

    const raw = localStorage.getItem("courses");
    const stored: Course[] = raw ? JSON.parse(raw) : [];
    const all = [...defaultCourses, ...stored];

    if (courseExists(all, id)) {
      alert("Bu ders ID zaten var. Başka bir ID seç.");
      return;
    }

    const newCourse: Course = {
      id,
      title: t,
      instructor: ins,
      createdAt: new Date().toISOString(),
      descriptionHtml: "",
    };

    // dersi kaydet
    localStorage.setItem("courses", JSON.stringify([newCourse, ...stored]));

    // şablon seçildiyse: modül + içerik oluştur
    if (selectedTemplate) {
      createFromTemplate(id, selectedTemplate);
    }

    // derse git
    window.location.href = `/courses/${id}`;
  };

  if (!mounted) {
    return (
      <div className="rounded-lg border border-white/20 p-4 text-gray-300">
        Yükleniyor...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Link href="/courses" className="underline text-gray-200">
        ← Courses’a dön
      </Link>

      <h1 className="text-2xl font-semibold text-white">Yeni Ders Oluştur</h1>

      <form onSubmit={handleCreate} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-white">Ders ID</label>
          <input
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            placeholder="Örn: C201"
            className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
          <div className="text-xs text-gray-400">
            ID benzersiz olmalı (C101, C102 gibi).
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-white">Ders Adı</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Veri Yapıları"
            className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium text-white">Eğitmen</label>
          <input
            value={instructor}
            onChange={(e) => setInstructor(e.target.value)}
            placeholder="Örn: Dr. X"
            className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-white/40"
          />
        </div>

        {/* ✅ Şablonlar */}
        <div className="rounded-lg border border-white/20 p-4 space-y-2">
          <div className="text-sm font-medium text-white">Şablonlar (opsiyonel)</div>
          <div className="text-xs text-gray-400">
            Şablon seçersen ders oluşturulurken modüller ve örnek içerikler otomatik eklenir.
          </div>

          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white outline-none"
          >
            <option value="">Şablon seçme (boş ders)</option>
            {TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {selectedTemplate && (
            <div className="mt-3 rounded-md border border-white/10 bg-white/5 p-3">
              <div className="text-sm text-white font-medium">Önizleme</div>
              <ul className="mt-2 list-disc pl-6 text-sm text-gray-200 space-y-1">
                {selectedTemplate.modules.map((m, idx) => (
                  <li key={idx}>
                    {m.title}{" "}
                    <span className="text-gray-400">
                      ({m.items.map((x) => x.type.toUpperCase()).join(", ")})
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition"
        >
          Oluştur
        </button>
      </form>
    </div>
  );
}

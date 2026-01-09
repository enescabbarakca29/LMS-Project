"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";

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

export default function CoursesPage() {
  const { t } = useTranslation();
  const [courses, setCourses] = useState<Course[]>(defaultCourses);

  const load = () => {
    const raw = localStorage.getItem("courses");
    const stored: Course[] = raw ? JSON.parse(raw) : [];
    setCourses([...defaultCourses, ...stored]);
  };

  useEffect(() => {
    load();
  }, []);

  const handleDeleteFromList = (id: string) => {
    const isDefault = defaultCourses.some((c) => c.id === id);
    if (isDefault) {
      alert(t("default_delete_error"));
      return;
    }

    if (!confirm(t("delete_confirm"))) return;

    const raw = localStorage.getItem("courses");
    const stored: Course[] = raw ? JSON.parse(raw) : [];
    const updated = stored.filter((c) => c.id !== id);
    localStorage.setItem("courses", JSON.stringify(updated));

    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-white">{t("courses")}</h1>

      <div className="grid gap-4 md:grid-cols-2">
        {courses.map((course) => (
          <div
            key={course.id}
            className="rounded-lg border border-white/20 p-4 transition hover:bg-white/5"
          >
            <Link href={`/courses/${course.id}`} className="no-underline">
              <div className="text-sm text-gray-400">{course.id}</div>
              <div className="text-lg font-medium text-white">
                {course.title}
              </div>
              <div className="text-sm text-gray-300">
                {t("instructor")}: {course.instructor}
              </div>

              {course.descriptionHtml && (
                <div
                  className="mt-2 text-sm text-gray-200"
                  dangerouslySetInnerHTML={{ __html: course.descriptionHtml }}
                />
              )}
            </Link>

            <div className="mt-3 flex gap-3">
              <Link
                href={`/courses/${course.id}/edit`}
                className="rounded-md border border-white/30 px-3 py-1 text-sm text-white hover:bg-white/10 transition"
              >
                {t("edit")}
              </Link>

              <button
                onClick={() => handleDeleteFromList(course.id)}
                className="rounded-md border border-red-400 px-3 py-1 text-sm text-red-300 hover:bg-red-500/10 transition"
              >
                {t("delete")}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Question } from "../types";

function shuffle<T>(arr: T[]) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// ✅ type normalizer (aynı mantık quiz page ile)
const normalizedType = (t: unknown) =>
  String(t || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

export default function QuizStartPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params?.id as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [count, setCount] = useState(5);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted || !courseId) return;
    const raw = localStorage.getItem(`question_bank_${courseId}`);
    const parsed: Question[] = raw ? JSON.parse(raw) : [];
    setQuestions(parsed);
  }, [mounted, courseId]);

  // ✅ max sınırı dinamik olsun
  const maxCount = useMemo(() => Math.max(1, questions.length || 1), [questions.length]);

  // ✅ soru sayısı değişince count’u mantıklı aralıkta tut
  useEffect(() => {
    setCount((c) => Math.min(Math.max(1, c), maxCount));
  }, [maxCount]);

  const startQuiz = () => {
    if (questions.length === 0) {
      alert("Soru bankası boş.");
      return;
    }

    const selected = shuffle(questions).slice(0, Math.min(count, questions.length));
    const quizId = `quiz_${Date.now()}`;

    // ✅ bazı soru tipleri için başlangıç cevapları (daha stabil)
    const initialAnswers: Record<string, any> = {};

    for (const q of selected) {
      const nt = normalizedType(q.type);
      const qq = q as any;

      if (nt === "ordering") {
        const items = Array.isArray(qq.items) ? qq.items : [];
        initialAnswers[q.id] = items.map((_: any, idx: number) => idx); // [0,1,2,...]
      }

      if (nt === "matching") {
        initialAnswers[q.id] = {}; // {leftIndex: rightIndex}
      }

      if (nt === "multi_select") {
        initialAnswers[q.id] = []; // number[]
      }

      if (nt === "code_runner") {
        initialAnswers[q.id] = { code: String(qq.starter ?? ""), output: "" };
      }

      if (nt === "hotspot") {
        initialAnswers[q.id] = null; // {x,y} click ile dolacak
      }

      if (nt === "file_upload") {
        initialAnswers[q.id] = null; // {name,size,type}
      }
    }

    localStorage.setItem(
      quizId,
      JSON.stringify({
        courseId,
        questions: selected,
        answers: initialAnswers,
        startedAt: new Date().toISOString(),
      })
    );

    // ✅ window.location yerine router (SPA)
    router.push(`/courses/${courseId}/assessment/quiz/${quizId}`);
  };

  if (!mounted) {
    return <div className="text-gray-300">Yükleniyor...</div>;
  }

  return (
    <div className="space-y-6 max-w-xl">
      <Link href={`/courses/${courseId}/assessment`} className="underline text-gray-300">
        ← Soru Bankasına dön
      </Link>

      <h1 className="text-2xl font-semibold text-white">Quiz Başlat</h1>

      <div className="rounded-lg border border-white/20 p-4 space-y-4">
        <div className="text-sm text-gray-300">
          Soru bankasında toplam <b>{questions.length}</b> soru var.
        </div>

        <div>
          <label className="block text-sm text-white mb-1">Quizde kaç soru olsun?</label>
          <input
            type="number"
            min={1}
            max={questions.length || 1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
          />
          <div className="mt-1 text-xs text-gray-400">
            Maksimum: {questions.length || 1}
          </div>
        </div>

        <button
          onClick={startQuiz}
          className="rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10"
        >
          Quiz Başlat
        </button>
      </div>
    </div>
  );
}

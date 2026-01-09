"use client";

import { useEffect, useMemo, useState, type MouseEvent } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Question } from "../../types";

type GradeItem = {
  quizId: string;
  date: string;

  // otomatik (objektif) kısım
  objectiveScore: number;
  objectiveTotal: number;

  // manuel (rubrik) kısım
  manualScore: number;
  manualTotal: number;
  manualBreakdown?: Record<string, number>; // questionId -> puan

  // cevaplar + sorular (rubrik için gerekli)
  answers: Record<string, any>;
  questions: Question[];

  status: "auto" | "pending_review" | "graded";
};

type QuizState = {
  courseId: string;
  questions: Question[];
  answers?: Record<string, any>;
};

// QTI-benzeri export formatı (demo/akademik)
type QtiExport = {
  qtiVersion: "2.1";
  exportedAt: string;
  quizId: string;
  courseId: string;
  questions: Question[];
};

export default function QuizPage() {
  const params = useParams();
  const quizId = params?.quizId as string;

  const [quiz, setQuiz] = useState<QuizState | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitted, setSubmitted] = useState(false);
  const [objectiveScore, setObjectiveScore] = useState(0);
  const [totalPossible, setTotalPossible] = useState(0);

  // QTI import UI state
  const [qtiError, setQtiError] = useState<string>("");

  // ✅ type normalizer (open_ended vs open-ended vs openEnded vb.)
  const normalizedType = (t: unknown) =>
    String(t || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "_")
      .replace(/-/g, "_");

  const isManualType = (t: unknown) => {
    const nt = normalizedType(t);
    // manuel değerlendirilecekler
    return nt === "open_ended" || nt === "short_answer" || nt === "long_answer" || nt === "file_upload";
  };

  const isTextAnswerType = (t: unknown) => {
    const nt = normalizedType(t);
    return nt === "open_ended" || nt === "short_answer" || nt === "long_answer";
  };

  const isObjectiveType = (t: unknown) => !isManualType(t);

  useEffect(() => {
    if (!quizId) return;
    const raw = localStorage.getItem(quizId);
    if (!raw) return;

    const parsed: QuizState = JSON.parse(raw);

    // ✅ bazı türler için varsayılan cevaplar (UI düzgün çalışsın)
    const initAnswers: Record<string, any> = { ...(parsed.answers || {}) };

    for (const q of parsed.questions) {
      const nt = normalizedType(q.type);
      const qq = q as any;

      if (nt === "ordering" && initAnswers[q.id] == null) {
        const items: any[] = qq.items || [];
        initAnswers[q.id] = items.map((_: any, idx: number) => idx); // [0,1,2...]
      }

      if (nt === "matching" && initAnswers[q.id] == null) {
        initAnswers[q.id] = {}; // {leftIndex: rightIndex}
      }

      if (nt === "multi_select" && initAnswers[q.id] == null) {
        initAnswers[q.id] = []; // number[]
      }

      if (nt === "code_runner" && initAnswers[q.id] == null) {
        initAnswers[q.id] = { code: qq.starter || "", output: "" };
      }
    }

    setQuiz(parsed);
    setAnswers(initAnswers);
  }, [quizId]);

  const answerQuestion = (qid: string, value: any) => {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  };

  const toggleMulti = (qid: string, idx: number) => {
    const current: number[] = Array.isArray(answers[qid]) ? answers[qid] : [];
    const set = new Set(current);
    if (set.has(idx)) set.delete(idx);
    else set.add(idx);
    answerQuestion(qid, Array.from(set).sort((a, b) => a - b));
  };

  const updateMatching = (qid: string, leftIndex: number, rightIndex: number) => {
    const m: Record<number, number> = answers[qid] && typeof answers[qid] === "object" ? { ...answers[qid] } : {};
    m[leftIndex] = rightIndex;
    answerQuestion(qid, m);
  };

  const moveOrdering = (qid: string, from: number, dir: -1 | 1) => {
    const order: number[] = Array.isArray(answers[qid]) ? [...answers[qid]] : [];
    const to = from + dir;
    if (to < 0 || to >= order.length) return;
    const tmp = order[from];
    order[from] = order[to];
    order[to] = tmp;
    answerQuestion(qid, order);
  };

  // ✅ React import gerektirmesin diye MouseEvent type kullandık
  const clickHotspot = (qid: string, e: MouseEvent<HTMLDivElement>, w: number, h: number) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const x = Math.round(e.clientX - rect.left);
    const y = Math.round(e.clientY - rect.top);
    // sınırlar içine al
    const cx = Math.max(0, Math.min(w, x));
    const cy = Math.max(0, Math.min(h, y));
    answerQuestion(qid, { x: cx, y: cy });
  };

  const runCodeDemo = (qid: string, expectedOutput: string) => {
    const cur = answers[qid] || { code: "", output: "" };
    const code = String(cur.code ?? "");
    // demo: kod içinde expectedOutput geçiyorsa doğru çıktı üret
    const ok = expectedOutput && code.includes(expectedOutput);
    const output = ok ? expectedOutput : "demo: çıktı eşleşmedi";
    answerQuestion(qid, { code, output });
  };

  const submitQuiz = () => {
    if (!quiz) return;

    let objTotal = 0;
    let objEarned = 0;
    let manualTotal = 0;

    for (const q of quiz.questions) {
      const t = normalizedType(q.type);
      const qq = q as any;

      // totals
      if (isObjectiveType(q.type)) objTotal += q.points;
      else manualTotal += q.points;

      // objective grading
      if (t === "multiple_choice") {
        if (answers[q.id] === qq.correctOption) objEarned += q.points;
      }

      if (t === "true_false") {
        if (answers[q.id] === qq.correctBoolean) objEarned += q.points;
      }

      if (t === "multi_select") {
        const a: number[] = Array.isArray(answers[q.id]) ? answers[q.id].map(Number) : [];
        const correct: number[] = Array.isArray(qq.correctOptions) ? qq.correctOptions.map(Number) : [];
        const s1 = new Set(a);
        const s2 = new Set(correct);
        const ok = s1.size === s2.size && [...s1].every((x) => s2.has(x));
        if (ok) objEarned += q.points;
      }

      if (t === "matching") {
        const left: string[] = Array.isArray(qq.left) ? qq.left : [];
        const correctMap: Record<number, number> = qq.correctMap || {};
        const ansMap: Record<number, number> = answers[q.id] || {};
        const total = left.length || 0;
        if (total > 0) {
          let correctCount = 0;
          for (let i = 0; i < total; i++) {
            if (Number(ansMap[i]) === Number(correctMap[i])) correctCount++;
          }
          // kısmi puan
          objEarned += (correctCount / total) * q.points;
        }
      }

      if (t === "ordering") {
        const a: number[] = Array.isArray(answers[q.id]) ? answers[q.id].map(Number) : [];
        const correct: number[] = Array.isArray(qq.correctOrder) ? qq.correctOrder.map(Number) : [];
        const ok = a.length === correct.length && a.every((v, i) => v === correct[i]);
        if (ok) objEarned += q.points;
      }

      if (t === "fill_blank") {
        const a = String(answers[q.id] ?? "").trim().toLowerCase();
        const c = String(qq.correct ?? "").trim().toLowerCase();
        if (a && a === c) objEarned += q.points;
      }

      if (t === "calculation") {
        const x = Number(answers[q.id]);
        const correct = Number(qq.correctNumber);
        const tol = Number(qq.tolerance ?? 0);
        const ok = Number.isFinite(x) && Number.isFinite(correct) && Math.abs(x - correct) <= tol;
        if (ok) objEarned += q.points;
      }

      if (t === "hotspot") {
        const p = answers[q.id] || {};
        const x = Number(p.x);
        const y = Number(p.y);
        const r = qq.correctRect || { x: 0, y: 0, w: 0, h: 0 };
        const ok =
          Number.isFinite(x) &&
          Number.isFinite(y) &&
          x >= r.x &&
          x <= r.x + r.w &&
          y >= r.y &&
          y <= r.y + r.h;
        if (ok) objEarned += q.points;
      }

      if (t === "code_runner") {
        const out = String(answers[q.id]?.output ?? "").trim();
        const expected = String(qq.expectedOutput ?? "").trim();
        if (out && expected && out === expected) objEarned += q.points;
      }
    }

    const total = objTotal + manualTotal;

    setObjectiveScore(Math.round(objEarned * 100) / 100);
    setTotalPossible(total);
    setSubmitted(true);

    // grade kaydet (rubrik için answers + questions dahil)
    const grade: GradeItem = {
      quizId,
      date: new Date().toISOString(),
      objectiveScore: Math.round(objEarned * 100) / 100,
      objectiveTotal: objTotal,
      manualScore: 0,
      manualTotal,
      answers,
      questions: quiz.questions,
      status: (manualTotal > 0 ? "pending_review" : "auto") as GradeItem["status"],
    };

    const key = `grades_${quiz.courseId}`;
    const rawGrades = localStorage.getItem(key);
    const list: GradeItem[] = rawGrades ? JSON.parse(rawGrades) : [];
    list.push(grade);
    localStorage.setItem(key, JSON.stringify(list));
  };

  // =========================
  // QTI 2.1 (demo) import/export
  // =========================
  const canQti = useMemo(() => !!quiz && !!quizId, [quiz, quizId]);

  const exportQti = () => {
  if (!quiz) return;

  const payload: QtiExport = {
    qtiVersion: "2.1",
    exportedAt: new Date().toISOString(),
    quizId,
    courseId: quiz.courseId,
    questions: quiz.questions,
  };

  // ✅ QTI EXPORT audit
  fetch("/api/quiz/qti-log", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "QUIZ_EXPORT",
      quizId,
      courseId: quiz.courseId,
    }),
  }).catch(() => {});

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `qti_${quizId}.json`;
  a.click();

  URL.revokeObjectURL(url);
};


  const importQti = async (file: File | null) => {
    setQtiError("");
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as Partial<QtiExport>;

      if (parsed.qtiVersion !== "2.1") throw new Error("qtiVersion 2.1 değil");
      if (!parsed.courseId || !Array.isArray(parsed.questions)) throw new Error("courseId/questions eksik");
      if (!quizId) throw new Error("quizId yok");

      // QuizState’e çevir
      const newState: QuizState = {
        courseId: String(parsed.courseId),
        questions: parsed.questions as Question[],
        answers: {},
      };

      localStorage.setItem(quizId, JSON.stringify(newState));

      // ✅ QTI IMPORT audit
      fetch("/api/quiz/qti-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "QUIZ_IMPORT",
          quizId,
          courseId: newState.courseId,
        }),  
      }).catch(() => {});  


      // yeniden yükle
      setQuiz(newState);
      setAnswers({});
      setSubmitted(false);
      setObjectiveScore(0);
      setTotalPossible(0);
    } catch (e: any) {
      setQtiError(e?.message ?? "QTI import hatası");
    }
  };

  if (!quiz) {
    return <div className="text-gray-300">Quiz yükleniyor...</div>;
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <Link href={`/courses/${quiz.courseId}/assessment`} className="underline text-gray-300">
        ← Değerlendirmelere dön
      </Link>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h1 className="text-2xl font-semibold text-white">Quiz</h1>

        {/* QTI Import/Export (demo) */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={exportQti}
            disabled={!canQti}
            className="rounded-md border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10 disabled:opacity-50"
            title="QTI 2.1 (demo) dışa aktar"
          >
            QTI Export
          </button>

          <label className="rounded-md border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10 cursor-pointer">
            QTI Import
            <input
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => importQti(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {qtiError && (
        <div className="rounded-md border border-red-400/50 bg-red-500/10 p-3 text-red-200 text-sm">
          QTI Import Hatası: {qtiError}
        </div>
      )}

      {quiz.questions.map((q, i) => {
        const nt = normalizedType(q.type);
        const qq = q as any;

        return (
          <div key={q.id} className="rounded-lg border border-white/20 p-4 space-y-2">
            <div className="text-sm text-gray-400">
              Soru {i + 1} • {q.points} puan • {String(q.type)} •{" "}
              {isObjectiveType(q.type) ? "Otomatik" : "Manuel"}
            </div>

            <div className="text-white font-medium">{q.text}</div>

            {/* Çoktan seçmeli */}
            {nt === "multiple_choice" && Array.isArray(qq.options) && (
              <div className="space-y-1">
                {qq.options.map((op: string, idx: number) => (
                  <label key={idx} className="flex items-center gap-2 text-gray-200">
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === idx}
                      onChange={() => answerQuestion(q.id, idx)}
                    />
                    {op}
                  </label>
                ))}
              </div>
            )}

            {/* Çoklu seçim */}
            {nt === "multi_select" && Array.isArray(qq.options) && (
              <div className="space-y-1">
                {qq.options.map((op: string, idx: number) => {
                  const cur: number[] = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                  const checked = cur.includes(idx);
                  return (
                    <label key={idx} className="flex items-center gap-2 text-gray-200">
                      <input type="checkbox" checked={checked} onChange={() => toggleMulti(q.id, idx)} />
                      {op}
                    </label>
                  );
                })}
                <div className="text-xs text-gray-400 mt-1">Birden fazla seçenek işaretlenebilir.</div>
              </div>
            )}

            {/* True/False */}
            {nt === "true_false" && (
              <div className="space-y-1">
                <label className="flex items-center gap-2 text-gray-200">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === true}
                    onChange={() => answerQuestion(q.id, true)}
                  />
                  Doğru
                </label>

                <label className="flex items-center gap-2 text-gray-200">
                  <input
                    type="radio"
                    name={q.id}
                    checked={answers[q.id] === false}
                    onChange={() => answerQuestion(q.id, false)}
                  />
                  Yanlış
                </label>
              </div>
            )}

            {/* Eşleştirme */}
            {nt === "matching" && Array.isArray(qq.left) && Array.isArray(qq.right) && (
              <div className="space-y-2">
                <div className="text-sm text-gray-200">Eşleştirme</div>
                {qq.left.map((l: string, li: number) => {
                  const map: Record<number, number> = answers[q.id] || {};
                  const v = map[li];
                  return (
                    <div key={li} className="flex items-center gap-2">
                      <div className="w-1/2 text-gray-200">{l}</div>
                      <select
                        value={Number.isFinite(v) ? v : ""}
                        onChange={(e) => updateMatching(q.id, li, Number(e.target.value))}
                        className="w-1/2 rounded-md border border-white/20 bg-black px-3 py-2 text-white"
                      >
                        <option value="" disabled>
                          Seç...
                        </option>
                        {qq.right.map((r: string, ri: number) => (
                          <option key={ri} value={ri}>
                            {r}
                          </option>
                        ))}
                      </select>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Sıralama */}
            {nt === "ordering" && Array.isArray(qq.items) && (
              <div className="space-y-2">
                <div className="text-sm text-gray-200">Sıralama</div>
                {(() => {
                  const order: number[] = Array.isArray(answers[q.id]) ? answers[q.id] : [];
                  return (
                    <div className="space-y-2">
                      {order.map((itemIdx, pos) => (
                        <div key={`${pos}_${itemIdx}`} className="flex items-center gap-2">
                          <div className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-gray-200">
                            {qq.items?.[itemIdx] ?? `Item ${itemIdx}`}
                          </div>
                          <button
                            type="button"
                            onClick={() => moveOrdering(q.id, pos, -1)}
                            className="rounded-md border border-white/30 px-2 py-1 text-white hover:bg-white/10"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={() => moveOrdering(q.id, pos, 1)}
                            className="rounded-md border border-white/30 px-2 py-1 text-white hover:bg-white/10"
                          >
                            ↓
                          </button>
                        </div>
                      ))}
                    </div>
                  );
                })()}
                <div className="text-xs text-gray-400">Oklarla sıralamayı değiştir.</div>
              </div>
            )}

            {/* Boşluk doldurma */}
            {nt === "fill_blank" && (
              <div className="space-y-2">
                <div className="text-gray-200 text-sm">{String(qq.fillText || "").replace("___", "_____")}</div>
                <input
                  value={String(answers[q.id] ?? "")}
                  onChange={(e) => answerQuestion(q.id, e.target.value)}
                  placeholder="Boşluğu doldur..."
                  className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
                />
              </div>
            )}

            {/* Hesaplama */}
            {nt === "calculation" && (
              <div className="space-y-2">
                <input
                  type="number"
                  value={answers[q.id] ?? ""}
                  onChange={(e) => answerQuestion(q.id, e.target.value)}
                  placeholder="Sonucu gir..."
                  className="mt-1 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
                />
                <div className="text-xs text-gray-400">Tolerans: ±{Number(qq.tolerance ?? 0)}</div>
              </div>
            )}

            {/* Hotspot (mock) */}
            {nt === "hotspot" && (
              <div className="space-y-2">
                <div className="text-sm text-gray-200">Hotspot (demo)</div>
                <div
                  onClick={(e) =>
                    clickHotspot(q.id, e, Number(qq.imageWidth ?? 400), Number(qq.imageHeight ?? 220))
                  }
                  style={{
                    width: Number(qq.imageWidth ?? 400),
                    height: Number(qq.imageHeight ?? 220),
                  }}
                  className="relative cursor-crosshair rounded-md border border-white/20 bg-white/5"
                  title="Doğru bölgeyi tıkla"
                >
                  {answers[q.id]?.x != null && answers[q.id]?.y != null && (
                    <div
                      style={{
                        left: answers[q.id].x - 4,
                        top: answers[q.id].y - 4,
                      }}
                      className="absolute h-2 w-2 rounded-full bg-red-500"
                    />
                  )}
                </div>
                <div className="text-xs text-gray-400">
                  Tıklanan nokta: {answers[q.id]?.x != null ? `(${answers[q.id].x}, ${answers[q.id].y})` : "—"}
                </div>
              </div>
            )}

            {/* Kod çalıştırma (mock) */}
            {nt === "code_runner" && (
              <div className="space-y-2">
                <div className="text-sm text-gray-200">Kod Çalıştırma (demo)</div>

                <textarea
                  value={String(answers[q.id]?.code ?? "")}
                  onChange={(e) => answerQuestion(q.id, { ...(answers[q.id] || {}), code: e.target.value })}
                  className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black font-mono"
                  rows={5}
                />

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => runCodeDemo(q.id, String(qq.expectedOutput ?? ""))}
                    className="rounded-md border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10"
                  >
                    Çalıştır (demo)
                  </button>

                  <div className="text-xs text-gray-400 self-center">
                    Beklenen çıktı:{" "}
                    <span className="text-gray-200 font-mono">{String(qq.expectedOutput ?? "")}</span>
                  </div>
                </div>

                <textarea
                  value={String(answers[q.id]?.output ?? "")}
                  readOnly
                  className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black font-mono"
                  rows={2}
                  placeholder="Çıktı..."
                />
              </div>
            )}

            {/* ✅ Open-ended / Short-answer / Long-answer: cevap yaz */}
            {isTextAnswerType(q.type) && (
              <textarea
                value={String(answers[q.id] ?? "")}
                onChange={(e) => answerQuestion(q.id, e.target.value)}
                placeholder="Cevabını yaz..."
                className="mt-2 w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
                rows={nt === "long_answer" ? 6 : 3}
              />
            )}

            {/* Dosya yükleme (mock) */}
            {nt === "file_upload" && (
              <div className="space-y-2">
                <div className="text-xs text-gray-400">İzin verilen: {String(qq.allowed ?? "demo")}</div>
                <input
                  type="file"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    answerQuestion(q.id, f ? { name: f.name, size: f.size, type: f.type } : null);
                  }}
                  className="block w-full text-sm text-gray-200"
                />
                <div className="text-xs text-gray-400">Seçilen: {answers[q.id]?.name ? answers[q.id].name : "—"}</div>
              </div>
            )}
          </div>
        );
      })}

      {!submitted ? (
        <button onClick={submitQuiz} className="rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10">
          Quiz’i Bitir
        </button>
      ) : (
        <div className="rounded-lg border border-green-400 p-4 text-green-200 space-y-1">
          <div>
            Otomatik Puan: <b>{objectiveScore}</b>
          </div>
          <div>
            Toplam (maks): <b>{totalPossible}</b>
          </div>
          <div className="text-sm text-green-100">
            Manuel türler (açık uçlu/kısa/uzun cevap veya dosya) varsa rubrik değerlendirmesi bekler.
          </div>
        </div>
      )}
    </div>
  );
}

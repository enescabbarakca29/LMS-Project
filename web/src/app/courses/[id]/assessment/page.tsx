"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Question, QuestionType } from "./types";

function randId(prefix: string) {
  const n = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${n}`;
}

type GradeItem = {
  quizId: string;
  date: string;

  objectiveScore: number;
  objectiveTotal: number;

  manualScore: number;
  manualTotal: number;
  manualBreakdown?: Record<string, number>;

  answers: Record<string, number | boolean | string | any>;
  questions: Question[];

  status: "auto" | "pending_review" | "graded";

  plagiarismPercent?: number; // 0-100
  plagiarismLevel?: "low" | "medium" | "high";
};

function clamp(n: number, min: number, max: number) {
  if (Number.isNaN(n)) return min;
  return Math.max(min, Math.min(max, n));
}

// ✅ type normalizer
function normalizedType(t: unknown) {
  return String(t || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
}

function isTextType(t: unknown) {
  const nt = normalizedType(t);
  return nt === "open_ended" || nt === "short_answer" || nt === "long_answer";
}

// ✅ deterministik hash
function hashString(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) >>> 0;
  }
  return h;
}

// ✅ %8 - %48 arası deterministik benzerlik
function similarityFromText(text: string) {
  const h = hashString(text || "");
  const percent = 8 + (h % 41); // 8..48

  let level: "low" | "medium" | "high" = "low";
  if (percent >= 30) level = "high";
  else if (percent >= 18) level = "medium";

  return { percent, level };
}

// helpers
function splitLines(s: string) {
  return (s || "")
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
}
function splitComma(s: string) {
  return (s || "")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export default function AssessmentPage() {
  const params = useParams();
  const courseId = params?.id as string;

  const storageKey = `question_bank_${courseId}`;

  const [mounted, setMounted] = useState(false);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [grades, setGrades] = useState<GradeItem[]>([]);

  // form state
  const [type, setType] = useState<QuestionType>("multiple_choice");
  const [text, setText] = useState("");

  // multiple choice (single)
  const [options, setOptions] = useState<string[]>(["", "", "", ""]);
  const [correctOption, setCorrectOption] = useState<number>(0);

  // true/false
  const [correctBool, setCorrectBool] = useState<boolean>(true);

  // multi select
  const [multiCorrect, setMultiCorrect] = useState<string>("0,2"); // indexes e.g. "0,2"

  // matching
  const [matchLeft, setMatchLeft] = useState<string>("A\nB\nC");
  const [matchRight, setMatchRight] = useState<string>("1\n2\n3");
  const [matchMap, setMatchMap] = useState<string>("0:0\n1:1\n2:2"); // left:right

  // ordering
  const [orderItems, setOrderItems] = useState<string>("Bir\nİki\nÜç");
  const [orderCorrect, setOrderCorrect] = useState<string>("0,1,2"); // indices

  // fill blank
  const [fillText, setFillText] = useState<string>("HTTP ___ portu 80'dir.");
  const [fillCorrect, setFillCorrect] = useState<string>("default");

  // short/long answers
  const [shortAccepted, setShortAccepted] = useState<string>("anahtar,keyword"); // comma keywords
  const [longPrompt, setLongPrompt] = useState<string>("Açıkla...");

  // file upload
  const [fileAllowed, setFileAllowed] = useState<string>("pdf,docx,png (demo)");

  // calculation
  const [calcCorrect, setCalcCorrect] = useState<number>(42);
  const [calcTol, setCalcTol] = useState<number>(0);

  // hotspot (mock)
  const [hotW, setHotW] = useState<number>(400);
  const [hotH, setHotH] = useState<number>(220);
  const [hotRect, setHotRect] = useState<string>("x=120,y=60,w=80,h=50");

  // code runner (mock)
  const [codeStarter, setCodeStarter] = useState<string>(
    `print("hello")`
  );
  const [codeExpected, setCodeExpected] = useState<string>("hello");

  const [points, setPoints] = useState<number>(1);

  useEffect(() => setMounted(true), []);

  const loadAll = () => {
    if (!courseId) return;

    const raw = localStorage.getItem(storageKey);
    const parsed: Question[] = raw ? JSON.parse(raw) : [];
    setQuestions(parsed);

    const gRaw = localStorage.getItem(`grades_${courseId}`);
    const gParsed: GradeItem[] = gRaw ? JSON.parse(gRaw) : [];
    setGrades(Array.isArray(gParsed) ? gParsed : []);
  };

  useEffect(() => {
    if (!mounted || !courseId) return;
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, courseId]);

  const saveQuestions = (next: Question[]) => {
    setQuestions(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const saveGrades = (next: GradeItem[]) => {
    setGrades(next);
    localStorage.setItem(`grades_${courseId}`, JSON.stringify(next));
  };

  const addQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const nt = normalizedType(type);

    // ⚠️ types.ts senin projede farklı olabilir diye any ile genişletiyoruz
    const q: any = {
      id: randId("Q"),
      type,
      text: text.trim(),
      points,
    };

    // Single choice
    if (nt === "multiple_choice") {
      q.options = options;
      q.correctOption = correctOption;
    }

    // True/False
    if (nt === "true_false") {
      q.correctBoolean = correctBool;
    }

    // Multi select
    if (nt === "multi_select") {
      q.options = options;
      q.correctOptions = splitComma(multiCorrect)
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));
    }

    // Matching
    if (nt === "matching") {
      const left = splitLines(matchLeft);
      const right = splitLines(matchRight);
      const mapping: Record<number, number> = {};
      splitLines(matchMap).forEach((line) => {
        const [l, r] = line.split(":").map((x) => x.trim());
        const li = Number(l);
        const ri = Number(r);
        if (Number.isFinite(li) && Number.isFinite(ri)) mapping[li] = ri;
      });
      q.left = left;
      q.right = right;
      q.correctMap = mapping;
    }

    // Ordering
    if (nt === "ordering") {
      q.items = splitLines(orderItems);
      q.correctOrder = splitComma(orderCorrect)
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n));
    }

    // Fill blank
    if (nt === "fill_blank") {
      q.fillText = fillText;
      q.correct = fillCorrect;
    }

    // Short answer
    if (nt === "short_answer") {
      q.accepted = splitComma(shortAccepted);
    }

    // Long answer
    if (nt === "long_answer") {
      q.prompt = longPrompt || q.text;
    }

    // File upload (mock)
    if (nt === "file_upload") {
      q.prompt = q.text;
      q.allowed = fileAllowed;
    }

    // Calculation
    if (nt === "calculation") {
      q.correctNumber = Number(calcCorrect);
      q.tolerance = Number(calcTol) || 0;
    }

    // Hotspot (mock)
    if (nt === "hotspot") {
      // parse: x=..,y=..,w=..,h=..
      const m: any = {};
      hotRect
        .split(",")
        .map((x) => x.trim())
        .forEach((kv) => {
          const [k, v] = kv.split("=").map((s) => s.trim());
          if (k && v) m[k] = Number(v);
        });

      q.imageWidth = Number(hotW) || 400;
      q.imageHeight = Number(hotH) || 220;
      q.correctRect = {
        x: Number(m.x) || 0,
        y: Number(m.y) || 0,
        w: Number(m.w) || 50,
        h: Number(m.h) || 50,
      };
      q.prompt = q.text;
    }

    // Code runner (mock)
    if (nt === "code_runner") {
      q.prompt = q.text;
      q.starter = codeStarter;
      q.expectedOutput = codeExpected;
    }

    saveQuestions([q as Question, ...questions]);

    // reset
    setText("");
    setOptions(["", "", "", ""]);
    setCorrectOption(0);
    setCorrectBool(true);
    setMultiCorrect("0,2");
    setMatchLeft("A\nB\nC");
    setMatchRight("1\n2\n3");
    setMatchMap("0:0\n1:1\n2:2");
    setOrderItems("Bir\nİki\nÜç");
    setOrderCorrect("0,1,2");
    setFillText("HTTP ___ portu 80'dir.");
    setFillCorrect("default");
    setShortAccepted("anahtar,keyword");
    setLongPrompt("Açıkla...");
    setFileAllowed("pdf,docx,png (demo)");
    setCalcCorrect(42);
    setCalcTol(0);
    setHotW(400);
    setHotH(220);
    setHotRect("x=120,y=60,w=80,h=50");
    setCodeStarter(`print("hello")`);
    setCodeExpected("hello");
    setPoints(1);
    setType("multiple_choice");
  };

  const removeQuestion = (id: string) => {
    if (!confirm("Bu soruyu silmek istiyor musun?")) return;
    saveQuestions(questions.filter((q) => q.id !== id));
  };

  const gradeWithRubric = (g: GradeItem) => {
    const openQuestions = (g.questions || []).filter((q) => isTextType(q.type));
    if (openQuestions.length === 0) {
      alert("Bu quizde rubrik gerektiren soru yok.");
      return;
    }

    const breakdown: Record<string, number> = { ...(g.manualBreakdown || {}) };
    let sum = 0;

    for (const q of openQuestions) {
      const ans = String(g.answers?.[q.id] ?? "");
      const prev = breakdown[q.id] ?? 0;

      const input = prompt(
        `Rubrik Puanı (0-${q.points})\n\nSoru: ${q.text}\nCevap: ${ans}\n\nMevcut: ${prev}`,
        String(prev)
      );

      if (input === null) {
        return;
      }

      const val = clamp(Number(input), 0, (q as any).points ?? 1);
      breakdown[q.id] = val;
      sum += val;
    }

    const nextGrades: GradeItem[] = grades.map((x) => {
      if (x.quizId !== g.quizId) return x;

      const manualTotal =
        x.manualTotal ??
        openQuestions.reduce((a, q) => a + ((q as any).points || 0), 0);

      return {
        ...x,
        manualBreakdown: breakdown,
        manualScore: sum,
        manualTotal,
        status: "graded" as GradeItem["status"],
      };
    });

    saveGrades(nextGrades);
    alert("Rubrik puanları kaydedildi ✅");
  };

  const computeAndSavePlagiarism = (g: GradeItem) => {
    const openQuestions = (g.questions || []).filter((q) => isTextType(q.type));

    const combinedAnswers = openQuestions
      .map((q) => String(g.answers?.[q.id] ?? ""))
      .join(" | ")
      .trim();

    if (!combinedAnswers) {
      alert("Benzerlik hesaplamak için açık uçlu/kısa cevap bulunamadı.");
      return;
    }

    const { percent, level } = similarityFromText(combinedAnswers);

    const next: GradeItem[] = grades.map((x) =>
      x.quizId === g.quizId
        ? {
            ...x,
            plagiarismPercent: percent,
            plagiarismLevel: level,
          }
        : x
    );

    saveGrades(next);
    alert(`Benzerlik hesaplandı ✅ (%${percent})`);
  };

  if (!mounted) {
    return (
      <div className="rounded-lg border border-white/20 p-4 text-gray-300">
        Yükleniyor...
      </div>
    );
  }

  const nt = normalizedType(type);

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href={`/courses/${courseId}`}
        className="text-sm text-gray-300 underline"
      >
        ← Derse dön
      </Link>

      <h1 className="text-2xl font-semibold text-white">
        Değerlendirme Araçları – Soru Bankası
      </h1>

      {/* Quiz Başlat */}
      <div className="flex flex-wrap gap-3">
        <Link
          href={`/courses/${courseId}/assessment/quiz`}
          className="rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10 transition"
        >
          Quiz Başlat
        </Link>
      </div>

      {/* ✅ Not Defteri */}
      <div className="rounded-lg border border-white/20 p-4 space-y-2">
        <div className="text-lg font-semibold text-white">Not Defteri</div>

        {grades.length === 0 ? (
          <div className="text-sm text-gray-300">
            Henüz quiz sonucu yok. “Quiz Başlat” ile deneyebilirsin.
          </div>
        ) : (
          <div className="space-y-2">
            {grades
              .slice()
              .reverse()
              .slice(0, 5)
              .map((g, idx) => {
                const totalScore = (g.objectiveScore || 0) + (g.manualScore || 0);
                const totalPossible = (g.objectiveTotal || 0) + (g.manualTotal || 0);

                return (
                  <div
                    key={`${g.quizId}_${idx}`}
                    className="rounded-md border border-white/10 bg-white/5 p-3 text-gray-200"
                  >
                    <div className="text-xs text-gray-400">
                      {new Date(g.date).toLocaleString("tr-TR")}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div>
                        Quiz: <span className="text-gray-300">{g.quizId}</span>
                      </div>
                      <div className="text-xs text-gray-400">•</div>
                      <div className="text-sm">
                        Durum:{" "}
                        <span className="text-gray-100">
                          {g.status === "pending_review"
                            ? "Rubrik Bekliyor"
                            : g.status === "graded"
                            ? "Değerlendirildi"
                            : "Otomatik"}
                        </span>
                      </div>
                    </div>

                    <div className="mt-1 font-medium text-white">
                      Toplam: {totalScore} / {totalPossible}
                    </div>

                    <div className="text-sm text-gray-200">
                      Otomatik: {g.objectiveScore} / {g.objectiveTotal}
                      {Number(g.manualTotal || 0) > 0 && (
                        <>
                          {" "}
                          • Manuel: {g.manualScore} / {g.manualTotal}
                        </>
                      )}
                    </div>

                    {/* plagiarism */}
                    <div className="text-sm text-gray-200">
                      Benzerlik:{" "}
                      {typeof g.plagiarismPercent === "number" ? (
                        <span className="text-gray-100">
                          %{g.plagiarismPercent} (
                          {g.plagiarismLevel === "high"
                            ? "Yüksek"
                            : g.plagiarismLevel === "medium"
                            ? "Orta"
                            : "Düşük"}
                          )
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {/* ✅ Rubrik Değerlendirme + Plagiarism */}
      <div className="rounded-lg border border-white/20 p-4 space-y-3">
        <div className="text-lg font-semibold text-white">Rubrik Değerlendirme</div>
        <div className="text-sm text-gray-300">
          Açık uçlu / kısa cevap içeren quizler burada “manuel” puanlanır (prompt ile).
          Ayrıca “Benzerlik Hesapla” ile plagiarism (mock) yüzdesi üretilir.
        </div>

        {grades.filter((g) => Number(g.manualTotal || 0) > 0).length === 0 ? (
          <div className="text-sm text-gray-300">
            Henüz rubrik gerektiren bir quiz sonucu yok.
          </div>
        ) : (
          <div className="space-y-2">
            {grades
              .slice()
              .reverse()
              .filter((g) => Number(g.manualTotal || 0) > 0)
              .slice(0, 10)
              .map((g) => (
                <div
                  key={g.quizId}
                  className="rounded-md border border-white/10 bg-white/5 p-3 text-gray-200
                             flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="text-xs text-gray-400">
                      {new Date(g.date).toLocaleString("tr-TR")}
                    </div>
                    <div className="text-white font-medium break-all">
                      Quiz: {g.quizId}
                    </div>
                    <div className="text-sm text-gray-200">
                      Durum:{" "}
                      <span className="text-gray-100">
                        {g.status === "graded" ? "Değerlendirildi" : "Bekliyor"}
                      </span>
                      {" • "}
                      Manuel: {g.manualScore} / {g.manualTotal}
                      {" • "}
                      Benzerlik:{" "}
                      {typeof g.plagiarismPercent === "number" ? (
                        <span className="text-gray-100">%{g.plagiarismPercent}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </div>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end">
                    <button
                      type="button"
                      onClick={() => gradeWithRubric(g)}
                      className="rounded-md border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10 transition"
                    >
                      Puan Ver
                    </button>

                    <button
                      type="button"
                      onClick={() => computeAndSavePlagiarism(g)}
                      className="rounded-md border border-yellow-400 px-3 py-2 text-sm text-yellow-200 hover:bg-yellow-500/10 transition"
                    >
                      Benzerlik Hesapla
                    </button>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Soru ekleme */}
      <form
        onSubmit={addQuestion}
        className="rounded-lg border border-white/20 p-4 space-y-4"
      >
        <div>
          <label className="block text-sm text-white mb-1">Soru Türü</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as QuestionType)}
            className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white"
          >
            <option value="multiple_choice">Çoktan Seçmeli</option>
            <option value="multi_select">Çoklu Seçim</option>
            <option value="true_false">Doğru / Yanlış</option>
            <option value="matching">Eşleştirme</option>
            <option value="ordering">Sıralama</option>
            <option value="fill_blank">Boşluk Doldurma</option>
            <option value="short_answer">Kısa Cevap</option>
            <option value="long_answer">Uzun Cevap</option>
            <option value="file_upload">Dosya Yükleme</option>
            <option value="calculation">Hesaplama</option>
            <option value="hotspot">Hotspot</option>
            <option value="code_runner">Kod Çalıştırma</option>

            {/* eskiler (uyumluluk) */}
            <option value="open_ended">Açık Uçlu</option>
          </select>
          <div className="text-xs text-gray-400 mt-1">
            Not: Bazı türler demo/mock çalışır (dosya, hotspot, kod çalıştırma).
          </div>
        </div>

        <div>
          <label className="block text-sm text-white mb-1">Soru Metni</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
          />
        </div>

        {/* Single choice */}
        {nt === "multiple_choice" && (
          <div className="space-y-2">
            <div className="text-sm text-white">Şıklar</div>
            {options.map((op, i) => (
              <input
                key={i}
                value={op}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                placeholder={`Seçenek ${i + 1}`}
                className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
              />
            ))}

            <div>
              <label className="block text-sm text-white mb-1">Doğru Seçenek</label>
              <select
                value={correctOption}
                onChange={(e) => setCorrectOption(Number(e.target.value))}
                className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white"
              >
                {options.map((_, i) => (
                  <option key={i} value={i}>
                    Seçenek {i + 1}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Multi select */}
        {nt === "multi_select" && (
          <div className="space-y-2">
            <div className="text-sm text-white">Şıklar</div>
            {options.map((op, i) => (
              <input
                key={i}
                value={op}
                onChange={(e) => {
                  const next = [...options];
                  next[i] = e.target.value;
                  setOptions(next);
                }}
                placeholder={`Seçenek ${i + 1}`}
                className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
              />
            ))}

            <div>
              <label className="block text-sm text-white mb-1">
                Doğru Seçenekler (index, virgül)
              </label>
              <input
                value={multiCorrect}
                onChange={(e) => setMultiCorrect(e.target.value)}
                placeholder="0,2"
                className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
              />
              <div className="text-xs text-gray-400 mt-1">
                Örn: 0,2 demek Seçenek 1 ve Seçenek 3 doğru.
              </div>
            </div>
          </div>
        )}

        {/* True/False */}
        {nt === "true_false" && (
          <div>
            <label className="block text-sm text-white mb-1">Doğru Cevap</label>
            <select
              value={correctBool ? "true" : "false"}
              onChange={(e) => setCorrectBool(e.target.value === "true")}
              className="w-full rounded-md border border-white/20 bg-black px-3 py-2 text-white"
            >
              <option value="true">Doğru</option>
              <option value="false">Yanlış</option>
            </select>
          </div>
        )}

        {/* Matching */}
        {nt === "matching" && (
          <div className="space-y-2">
            <div className="text-sm text-white">Eşleştirme (Demo)</div>
            <label className="block text-xs text-gray-300">Sol Liste (satır satır)</label>
            <textarea
              value={matchLeft}
              onChange={(e) => setMatchLeft(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
            <label className="block text-xs text-gray-300">Sağ Liste (satır satır)</label>
            <textarea
              value={matchRight}
              onChange={(e) => setMatchRight(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
            <label className="block text-xs text-gray-300">
              Doğru Map (her satır: solIndex:sağIndex)
            </label>
            <textarea
              value={matchMap}
              onChange={(e) => setMatchMap(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
            <div className="text-xs text-gray-400">
              Örn: 0:2 → sol 0, sağ 2 ile eşleşir.
            </div>
          </div>
        )}

        {/* Ordering */}
        {nt === "ordering" && (
          <div className="space-y-2">
            <div className="text-sm text-white">Sıralama</div>
            <label className="block text-xs text-gray-300">Ögeler (satır satır)</label>
            <textarea
              value={orderItems}
              onChange={(e) => setOrderItems(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
            <label className="block text-xs text-gray-300">
              Doğru sıra (index virgül) — örn: 2,0,1
            </label>
            <input
              value={orderCorrect}
              onChange={(e) => setOrderCorrect(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
          </div>
        )}

        {/* Fill blank */}
        {nt === "fill_blank" && (
          <div className="space-y-2">
            <div className="text-sm text-white">Boşluk Doldurma</div>
            <label className="block text-xs text-gray-300">Metin (___ boşluk)</label>
            <input
              value={fillText}
              onChange={(e) => setFillText(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
            <label className="block text-xs text-gray-300">Doğru cevap</label>
            <input
              value={fillCorrect}
              onChange={(e) => setFillCorrect(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
          </div>
        )}

        {/* Short answer */}
        {nt === "short_answer" && (
          <div className="space-y-2">
            <div className="text-sm text-white">Kısa Cevap (Kısmen otomatik)</div>
            <label className="block text-xs text-gray-300">
              Kabul edilen anahtar kelimeler (virgül)
            </label>
            <input
              value={shortAccepted}
              onChange={(e) => setShortAccepted(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
            <div className="text-xs text-gray-400">
              Quiz tarafında içerik eşleşmesi ile kısmi puanlanabilir (demo).
            </div>
          </div>
        )}

        {/* Long answer */}
        {nt === "long_answer" && (
          <div className="space-y-2">
            <div className="text-sm text-white">Uzun Cevap (Manuel)</div>
            <label className="block text-xs text-gray-300">Prompt/İpucu</label>
            <input
              value={longPrompt}
              onChange={(e) => setLongPrompt(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
          </div>
        )}

        {/* File upload */}
        {nt === "file_upload" && (
          <div className="space-y-2">
            <div className="text-sm text-white">Dosya Yükleme (Mock/Manuel)</div>
            <label className="block text-xs text-gray-300">İzin verilen tipler</label>
            <input
              value={fileAllowed}
              onChange={(e) => setFileAllowed(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
          </div>
        )}

        {/* Calculation */}
        {nt === "calculation" && (
          <div className="space-y-2">
            <div className="text-sm text-white">Hesaplama</div>
            <label className="block text-xs text-gray-300">Doğru sonuç</label>
            <input
              type="number"
              value={calcCorrect}
              onChange={(e) => setCalcCorrect(Number(e.target.value))}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
            <label className="block text-xs text-gray-300">Tolerans (±)</label>
            <input
              type="number"
              value={calcTol}
              onChange={(e) => setCalcTol(Number(e.target.value))}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
          </div>
        )}

        {/* Hotspot */}
        {nt === "hotspot" && (
          <div className="space-y-2">
            <div className="text-sm text-white">Hotspot (Mock)</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs text-gray-300">Görsel genişlik</label>
                <input
                  type="number"
                  value={hotW}
                  onChange={(e) => setHotW(Number(e.target.value))}
                  className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-300">Görsel yükseklik</label>
                <input
                  type="number"
                  value={hotH}
                  onChange={(e) => setHotH(Number(e.target.value))}
                  className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
                />
              </div>
            </div>
            <label className="block text-xs text-gray-300">
              Doğru bölge (x=,y=,w=,h=)
            </label>
            <input
              value={hotRect}
              onChange={(e) => setHotRect(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
            />
          </div>
        )}

        {/* Code runner */}
        {nt === "code_runner" && (
          <div className="space-y-2">
            <div className="text-sm text-white">Kod Çalıştırma (Mock)</div>
            <label className="block text-xs text-gray-300">Başlangıç kodu</label>
            <textarea
              value={codeStarter}
              onChange={(e) => setCodeStarter(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black font-mono"
            />
            <label className="block text-xs text-gray-300">Beklenen çıktı</label>
            <input
              value={codeExpected}
              onChange={(e) => setCodeExpected(e.target.value)}
              className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black font-mono"
            />
          </div>
        )}

        <div>
          <label className="block text-sm text-white mb-1">Puan</label>
          <input
            type="number"
            min={1}
            value={points}
            onChange={(e) => setPoints(Number(e.target.value))}
            className="w-full rounded-md border border-white/20 bg-white px-3 py-2 text-black"
          />
        </div>

        <button className="rounded-md border border-white/30 px-4 py-2 text-white hover:bg-white/10">
          Soru Ekle
        </button>
      </form>

      {/* Soru listesi */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="text-gray-300">Henüz soru eklenmedi.</div>
        ) : (
          questions.map((q: any) => (
            <div key={q.id} className="rounded-lg border border-white/20 p-4">
              <div className="text-xs text-gray-400">
                {q.id} • {String(q.type)} • {q.points} puan
              </div>
              <div className="text-white font-medium">{q.text}</div>

              {/* küçük özet */}
              <div className="mt-2 text-sm text-gray-300">
                {normalizedType(q.type) === "multiple_choice" && (
                  <div>Seçenek sayısı: {(q.options || []).length} • Doğru: {Number(q.correctOption) + 1}</div>
                )}
                {normalizedType(q.type) === "multi_select" && (
                  <div>Çoklu doğru: {(q.correctOptions || []).join(", ")}</div>
                )}
                {normalizedType(q.type) === "true_false" && (
                  <div>Doğru cevap: {q.correctBoolean ? "Doğru" : "Yanlış"}</div>
                )}
                {normalizedType(q.type) === "fill_blank" && (
                  <div>Boşluk: "{q.fillText}" • Cevap: "{q.correct}"</div>
                )}
                {normalizedType(q.type) === "calculation" && (
                  <div>Doğru: {q.correctNumber} (±{q.tolerance ?? 0})</div>
                )}
                {normalizedType(q.type) === "file_upload" && (
                  <div>Dosya: {q.allowed}</div>
                )}
                {normalizedType(q.type) === "code_runner" && (
                  <div>Beklenen çıktı: "{q.expectedOutput}"</div>
                )}
              </div>

              <div className="mt-2">
                <button
                  onClick={() => removeQuestion(q.id)}
                  className="text-sm text-red-300 underline"
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

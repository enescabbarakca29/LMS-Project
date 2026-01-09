import React, { useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, useColorScheme, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";

type Choice = "A" | "B" | "C" | "D" | "E";
type Question = { id: string; text: string; choices: { key: Choice; text: string }[] };

function pad2(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}
function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${pad2(m)}:${pad2(s)}`;
}

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#0B0F19" : "#F5F7FB";
  const card = isDark ? "#111827" : "#FFFFFF";
  const text = isDark ? "#F9FAFB" : "#111827";
  const sub = isDark ? "rgba(249,250,251,0.7)" : "rgba(17,24,39,0.65)";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.18)";
  const blue = "#2563EB";
  const green = "#16a34a";
  const red = "#ef4444";

  // ✅ Mock quiz (şimdilik sabit) — literal type fix
  const questions: Question[] = useMemo(
    () => [
      {
        id: "q1",
        text: "Soru 1: Kombinasyonel devrelerde bellek var mı?",
        choices: [
          { key: "A" as const, text: "Evet" },
          { key: "B" as const, text: "Hayır" },
          { key: "C" as const, text: "Bazen" },
          { key: "D" as const, text: "Saat sinyaline bağlı" },
          { key: "E" as const, text: "Tanımsız" },
        ],
      },
      {
        id: "q2",
        text: "Soru 2: XOR kapısının çıktısı ne zaman 1 olur?",
        choices: [
          { key: "A" as const, text: "Girişler eşitse" },
          { key: "B" as const, text: "Girişlerden biri 1 ise" },
          { key: "C" as const, text: "Girişler farklıysa" },
          { key: "D" as const, text: "Her zaman" },
          { key: "E" as const, text: "Asla" },
        ],
      },
      {
        id: "q3",
        text: "Soru 3: Flip-flop hangi devre türüne örnektir?",
        choices: [
          { key: "A" as const, text: "Kombinasyonel" },
          { key: "B" as const, text: "Ardışıl" },
          { key: "C" as const, text: "Analog" },
          { key: "D" as const, text: "Sayısal değil" },
          { key: "E" as const, text: "Gürültü filtresi" },
        ],
      },
      ...Array.from({ length: 7 }).map((_, i) => ({
        id: `q${i + 4}`,
        text: `Soru ${i + 4}: Deneme sorusu`,
        choices: [
          { key: "A" as const, text: "A" },
          { key: "B" as const, text: "B" },
          { key: "C" as const, text: "C" },
          { key: "D" as const, text: "D" },
          { key: "E" as const, text: "E" },
        ],
      })),
    ],
    []
  );

  const STORAGE_KEY = useMemo(() => `lms_quiz_${id || "unknown"}_v1`, [id]);

  const TOTAL_SECONDS = 5 * 60;

  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);
  const [answers, setAnswers] = useState<Record<string, Choice | null>>({});
  const [ready, setReady] = useState(false);

  // ✅ timer typing fix
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  async function load() {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as { answers?: Record<string, Choice | null>; secondsLeft?: number };
        setAnswers(parsed?.answers || {});
        if (typeof parsed?.secondsLeft === "number") {
          setSecondsLeft(Math.max(0, Math.min(TOTAL_SECONDS, parsed.secondsLeft)));
        }
      } else {
        const init: Record<string, Choice | null> = {};
        for (const q of questions) init[q.id] = null;
        setAnswers(init);
      }
    } catch {
      const init: Record<string, Choice | null> = {};
      for (const q of questions) init[q.id] = null;
      setAnswers(init);
    } finally {
      setReady(true);
    }
  }

  async function save(nextAnswers: Record<string, Choice | null>, nextSecondsLeft = secondsLeft) {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ answers: nextAnswers, secondsLeft: nextSecondsLeft, savedAt: new Date().toISOString() })
      );
    } catch {}
  }

  function submit(auto = false) {
    if (!auto) {
      Alert.alert("Gönderilsin mi?", "Cevaplarını göndermek istiyor musun?", [
        { text: "İptal", style: "cancel" },
        {
          text: "Gönder",
          onPress: () => {
            router.push({
              pathname: "/content/quiz/result/[id]",
              params: { id: String(id || "q1"), payload: JSON.stringify({ answers, total: questions.length }) },
            });
          },
        },
      ]);
      return;
    }

    router.replace({
      pathname: "/content/quiz/result/[id]",
      params: { id: String(id || "q1"), payload: JSON.stringify({ answers, total: questions.length, auto: true }) },
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!ready) return;

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setSecondsLeft((s) => (s - 1 < 0 ? 0 : s - 1));
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [ready]);

  useEffect(() => {
    if (!ready) return;

    save(answers, secondsLeft);

    if (secondsLeft === 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      submit(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, answers, ready]);

  if (!id) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, padding: 16, justifyContent: "center" }}>
        <Text style={{ color: text, fontSize: 18, fontWeight: "800" }}>Quiz id bulunamadı.</Text>
        <Text style={{ color: sub, marginTop: 8 }}>content/index’ten /content/quiz/q1 gibi açılmalı.</Text>
      </View>
    );
  }

  const timeColor = secondsLeft <= 20 ? red : blue;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <View
        style={{
          backgroundColor: card,
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: border,
          gap: 6,
        }}
      >
        <Text style={{ color: text, fontSize: 18, fontWeight: "900" }}>Quiz • {String(id)}</Text>
        <Text style={{ color: sub }}>
          Süre: <Text style={{ color: timeColor, fontWeight: "900" }}>{fmtTime(secondsLeft)}</Text>
        </Text>
        <Text style={{ color: sub, fontSize: 12 }}>Süre bitince otomatik gönderilir. Seçimler otomatik kaydedilir.</Text>
      </View>

      {questions.map((q, idx) => {
        const selected = answers[q.id] ?? null;
        return (
          <View
            key={q.id}
            style={{
              backgroundColor: card,
              borderRadius: 16,
              padding: 14,
              borderWidth: 1,
              borderColor: border,
              gap: 10,
            }}
          >
            <Text style={{ color: text, fontWeight: "900" }}>
              {idx + 1}) {q.text}
            </Text>

            <View style={{ gap: 8 }}>
              {q.choices.map((c) => {
                const active = selected === c.key;
                return (
                  <Pressable
                    key={c.key}
                    onPress={() => {
                      const next = { ...answers, [q.id]: c.key };
                      setAnswers(next);
                      save(next);
                    }}
                    style={{
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: active ? blue : border,
                      backgroundColor: active ? "rgba(37,99,235,0.10)" : "transparent",
                    }}
                  >
                    <Text style={{ color: text, fontWeight: active ? "900" : "700" }}>
                      {c.key}) {c.text}
                    </Text>
                  </Pressable>
                );
              })}

              <Pressable
                onPress={() => {
                  const next = { ...answers, [q.id]: null };
                  setAnswers(next);
                  save(next);
                }}
                style={{
                  padding: 10,
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: border,
                  alignSelf: "flex-start",
                }}
              >
                <Text style={{ color: sub, fontWeight: "800" }}>Boş bırak</Text>
              </Pressable>
            </View>
          </View>
        );
      })}

      <Pressable
        onPress={() => submit(false)}
        style={{
          backgroundColor: green,
          borderRadius: 16,
          padding: 16,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>Onayla ve Gönder</Text>
      </Pressable>
    </ScrollView>
  );
}

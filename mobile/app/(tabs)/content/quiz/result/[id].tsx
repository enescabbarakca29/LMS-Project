import React, { useMemo } from "react";
import { View, Text, ScrollView, Pressable, useColorScheme } from "react-native";
import { useLocalSearchParams, router } from "expo-router";

type Choice = "A" | "B" | "C" | "D" | "E";

export default function QuizResultScreen() {
  const { id, payload } = useLocalSearchParams<{ id: string; payload?: string }>();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#0B0F19" : "#F5F7FB";
  const card = isDark ? "#111827" : "#FFFFFF";
  const text = isDark ? "#F9FAFB" : "#111827";
  const sub = isDark ? "rgba(249,250,251,0.7)" : "rgba(17,24,39,0.65)";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.18)";
  const blue = "#2563EB";

  const data = useMemo(() => {
    try {
      return payload ? (JSON.parse(payload) as any) : null;
    } catch {
      return null;
    }
  }, [payload]);

  const answers: Record<string, Choice | null> = data?.answers || {};
  const total: number = Number(data?.total || 0);
  const auto: boolean = Boolean(data?.auto);

  const answeredCount = Object.values(answers).filter((v) => v !== null).length;

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
        <Text style={{ color: text, fontSize: 18, fontWeight: "900" }}>Quiz Sonucu • {String(id)}</Text>
        <Text style={{ color: sub }}>
          Durum: <Text style={{ color: text, fontWeight: "900" }}>{auto ? "Süre doldu (auto)" : "Manuel gönderim"}</Text>
        </Text>
        <Text style={{ color: sub }}>
          İşaretlenen: <Text style={{ color: text, fontWeight: "900" }}>{answeredCount}</Text>
          {total ? ` / ${total}` : ""}
        </Text>
      </View>

      <View
        style={{
          backgroundColor: card,
          borderRadius: 16,
          padding: 14,
          borderWidth: 1,
          borderColor: border,
          gap: 10,
        }}
      >
        <Text style={{ color: text, fontWeight: "900" }}>Cevaplar</Text>

        {Object.keys(answers).length === 0 ? (
          <Text style={{ color: sub }}>Payload boş geldi. Quiz ekranından gelince dolu olur.</Text>
        ) : (
          Object.entries(answers).map(([qid, val]) => (
            <View
              key={qid}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                paddingVertical: 10,
                borderBottomWidth: 1,
                borderBottomColor: border,
              }}
            >
              <Text style={{ color: sub }}>{qid}</Text>
              <Text style={{ color: text, fontWeight: "900" }}>{val ?? "—"}</Text>
            </View>
          ))
        )}
      </View>

      <Pressable
        onPress={() => router.back()}
        style={{
          backgroundColor: blue,
          borderRadius: 16,
          padding: 16,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 16 }}>Geri Dön</Text>
      </Pressable>
    </ScrollView>
  );
}

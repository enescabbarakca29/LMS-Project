import { useMemo } from "react";
import { View, Text, ScrollView, Pressable, useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

type ContentType = "pdf" | "video" | "quiz";

type ContentItem = {
  id: string;
  type: ContentType;
  title: string;
  subtitle?: string;
};

export default function ContentIndex() {
  const router = useRouter();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#0B0F19" : "#F5F7FB";
  const card = isDark ? "#111827" : "#FFFFFF";
  const text = isDark ? "#F9FAFB" : "#111827";
  const subText = isDark ? "rgba(249,250,251,0.7)" : "rgba(17,24,39,0.65)";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.18)";

  const items = useMemo<ContentItem[]>(
    () => [
      {
        id: "pdf-1",
        type: "pdf",
        title: "Ders Notu (PDF)",
        subtitle: "Sayısal Mantık • Hafta 1",
      },
      {
        id: "video-1",
        type: "video",
        title: "Video Ders",
        subtitle: "Kombinasyonel Devreler",
      },
      {
        id: "quiz-1",
        type: "quiz",
        title: "Quiz",
        subtitle: "Kısa sınav • 10 soru",
      },
    ],
    []
  );

  function iconFor(type: ContentType) {
    if (type === "pdf") return "document-text-outline";
    if (type === "video") return "play-circle-outline";
    return "help-circle-outline";
  }

  function go(item: ContentItem) {
    // ✅ TS-safe routing: pathname + params
    if (item.type === "pdf") {
      router.push({ pathname: "/content/pdf/[id]" as const, params: { id: item.id } });
      return;
    }
    if (item.type === "video") {
      router.push({ pathname: "/content/video/[id]" as const, params: { id: item.id } });
      return;
    }
    if (item.type === "quiz") {
      router.push({ pathname: "/content/quiz/[id]" as const, params: { id: item.id } });
      return;
    }
  }

  function goNotes(item: ContentItem) {
    // ✅ /content/notes/[kind]/[id]
    router.push({
      pathname: "/content/notes/[kind]/[id]" as const,
      params: { kind: item.type, id: item.id },
    });
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ fontSize: 22, fontWeight: "900", color: text }}>İçerikler</Text>

      {items.map((it) => (
        <View
          key={it.id}
          style={{
            backgroundColor: card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: border,
            gap: 10,
          }}
        >
          {/* Ana karta tıklama -> içeriği aç */}
          <Pressable onPress={() => go(it)} style={{ gap: 10 }}>
            <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
              <Ionicons name={iconFor(it.type) as any} size={26} color={isDark ? "#93C5FD" : "#2563EB"} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ color: text, fontSize: 16, fontWeight: "800" }}>{it.title}</Text>
                {!!it.subtitle && <Text style={{ color: subText, fontSize: 12 }}>{it.subtitle}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={20} color={subText} />
            </View>
          </Pressable>

          {/* Not butonu -> not ekranı */}
          <Pressable
            onPress={() => goNotes(it)}
            style={{
              alignSelf: "flex-start",
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              paddingVertical: 10,
              paddingHorizontal: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: border,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(17,24,39,0.04)",
            }}
          >
            <Ionicons name="create-outline" size={18} color={isDark ? "#93C5FD" : "#2563EB"} />
            <Text style={{ color: text, fontWeight: "800" }}>Not Al</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

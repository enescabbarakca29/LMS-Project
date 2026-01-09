import { useMemo, useState } from "react";
import { View, Text, ScrollView, Pressable, useColorScheme, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { API_BASE_URL } from "@/src/config/api";

export default function OMRResult() {
  const { data } = useLocalSearchParams<{ data?: string }>();
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#0B0F19" : "#F5F7FB";
  const card = isDark ? "#111827" : "#FFFFFF";
  const text = isDark ? "#F9FAFB" : "#111827";
  const subText = isDark ? "rgba(249,250,251,0.7)" : "rgba(17,24,39,0.65)";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.18)";

  const parsed = useMemo(() => {
    try {
      return data ? JSON.parse(decodeURIComponent(data)) : null;
    } catch {
      return { error: "JSON parse edilemedi", raw: data };
    }
  }, [data]);

  const [loading, setLoading] = useState(false);

  async function onApprove() {
    try {
      if (!parsed || (parsed as any)?.error) {
        Alert.alert("Hata", "Onaylanacak geçerli bir sonuç yok.");
        return;
      }

      setLoading(true);

      const res = await fetch(`${API_BASE_URL}/api/omr/submit`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(parsed),
      });

      const txt = await res.text();
      let json: any = null;
      try {
        json = txt ? JSON.parse(txt) : null;
      } catch {
        json = { raw: txt };
      }

      if (!res.ok) {
        throw new Error(json?.error ?? json?.raw ?? `HTTP ${res.status}`);
      }

      Alert.alert("✅ Onaylandı", "Sonuç backend'e kaydedildi (approved).", [
        { text: "Tamam", onPress: () => router.back() },
      ]);
    } catch (e: any) {
      Alert.alert("Gönderim Hatası", e?.message ?? "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ color: text, fontSize: 22, fontWeight: "900" }}>Optik Sonuç</Text>
      <Text style={{ color: subText }}>Kullanıcı doğrulaması + JSON export</Text>

      <View style={{ backgroundColor: card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: border }}>
        <Text style={{ color: text, fontWeight: "800", marginBottom: 8 }}>JSON</Text>
        <Text style={{ color: subText, fontFamily: "monospace" }}>
          {JSON.stringify(parsed, null, 2)}
        </Text>
      </View>

      <Pressable
        onPress={() => router.back()}
        style={{ padding: 14, borderRadius: 12, backgroundColor: "#374151", alignItems: "center" }}
      >
        <Text style={{ color: "white", fontWeight: "900" }}>Geri Dön</Text>
      </Pressable>

      <Pressable
        disabled={loading || !parsed || (parsed as any)?.error}
        onPress={onApprove}
        style={{
          padding: 14,
          borderRadius: 12,
          backgroundColor: loading ? "#93C5FD" : "#2563EB",
          alignItems: "center",
          opacity: !parsed || (parsed as any)?.error ? 0.5 : 1,
        }}
      >
        <Text style={{ color: "white", fontWeight: "900" }}>
          {loading ? "Onaylanıyor..." : "Sonucu Onayla"}
        </Text>
      </Pressable>

      <Text style={{ color: subText, fontSize: 12 }}>
        API: {API_BASE_URL}
      </Text>
    </ScrollView>
  );
}

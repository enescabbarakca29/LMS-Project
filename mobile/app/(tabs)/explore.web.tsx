import { View, Text, useColorScheme } from "react-native";

export default function OptikWeb() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#0B0F19" : "#F5F7FB";
  const card = isDark ? "#111827" : "#FFFFFF";
  const text = isDark ? "#F9FAFB" : "#111827";
  const subText = isDark ? "rgba(249,250,251,0.7)" : "rgba(17,24,39,0.65)";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.18)";

  return (
    <View style={{ flex: 1, backgroundColor: bg, padding: 16, justifyContent: "center" }}>
      <View style={{ backgroundColor: card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: border, gap: 10 }}>
        <Text style={{ color: text, fontSize: 22, fontWeight: "900" }}>Optik Okuyucu</Text>
        <Text style={{ color: subText }}>
          Kamera modülü web’de devre dışı. En doğru test: telefon (Expo Go) veya Android emulator.
        </Text>
        <Text style={{ color: subText }}>
          Sonraki adım: foto çek → backend’e gönder → JSON sonuç göster.
        </Text>
      </View>
    </View>
  );
}

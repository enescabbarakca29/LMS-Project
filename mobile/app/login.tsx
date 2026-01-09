import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  Alert,
  useColorScheme,
} from "react-native";
import { router } from "expo-router";
import { setToken } from "../src/storage/token";

import * as LocalAuthentication from "expo-local-authentication";
import { getBiometricEnabled } from "@/src/storage/biometric";

export default function LoginScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const [email, setEmail] = useState("test@example.com");
  const [password, setPassword] = useState("123456");
  const [loading, setLoading] = useState(false);

  const bg = isDark ? "#0B0F19" : "#F5F7FB";
  const card = isDark ? "#111827" : "#FFFFFF";
  const text = isDark ? "#F9FAFB" : "#111827";
  const subText = isDark ? "rgba(249,250,251,0.7)" : "rgba(17,24,39,0.65)";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.18)";
  const inputBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(17,24,39,0.04)";

  async function requireBiometricIfEnabled(): Promise<boolean> {
    const enabled = await getBiometricEnabled();
    if (!enabled) return true;

    // Cihaz kontrolü
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const enrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !enrolled) {
      Alert.alert(
        "Biometrik kullanılamıyor",
        "Cihazda biometrik yok veya kayıt yapılmamış. Profil ekranından biometrik giriş kapatılabilir."
      );
      return false;
    }

    const res = await LocalAuthentication.authenticateAsync({
      promptMessage: "Biometrik doğrulama",
      cancelLabel: "İptal",
      fallbackLabel: "Şifre kullan",
    });

    if (!res.success) {
      // kullanıcı iptal etti / başarısız
      return false;
    }
    return true;
  }

  async function onLogin() {
    try {
      setLoading(true);

      // 1) Biometrik açıksa doğrulat
      const ok = await requireBiometricIfEnabled();
      if (!ok) return;

      // 2) TODO: backend /login (şimdilik demo)
      const fakeToken = "demo-token";
      await setToken(fakeToken);

      router.replace("/(tabs)");
    } catch (e: any) {
      Alert.alert("Login hata", e?.message ?? "Bilinmeyen hata");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg, padding: 20, justifyContent: "center" }}>
      <View style={{ backgroundColor: card, borderRadius: 16, padding: 18, borderWidth: 1, borderColor: border, gap: 12 }}>
        <Text style={{ fontSize: 28, fontWeight: "800", color: text }}>LMS Mobile</Text>
        <Text style={{ color: subText }}>Giriş yap</Text>

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="E-posta"
          placeholderTextColor={subText}
          autoCapitalize="none"
          keyboardType="email-address"
          style={{
            borderWidth: 1,
            borderColor: border,
            backgroundColor: inputBg,
            color: text,
            padding: 12,
            borderRadius: 12,
          }}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Şifre"
          placeholderTextColor={subText}
          secureTextEntry
          style={{
            borderWidth: 1,
            borderColor: border,
            backgroundColor: inputBg,
            color: text,
            padding: 12,
            borderRadius: 12,
          }}
        />

        <Pressable
          onPress={onLogin}
          disabled={loading}
          style={{
            padding: 14,
            borderRadius: 12,
            backgroundColor: loading ? "#374151" : "#2563EB",
            alignItems: "center",
            marginTop: 6,
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {loading ? "Giriş yapılıyor..." : "Giriş Yap"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

import { useEffect, useState } from "react";
import {
  View,
  Text,
  Pressable,
  useColorScheme,
  Switch,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { clearToken } from "../../src/storage/token";
import { t, setLocale, getLocale } from "@/src/i18n";

import * as LocalAuthentication from "expo-local-authentication";
import { getBiometricEnabled, setBiometricEnabled } from "@/src/storage/biometric";

/** A11y helpers */
const HIT_SLOP_10 = { top: 10, bottom: 10, left: 10, right: 10 };

export default function ProfileScreen() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#0B0F19" : "#F5F7FB";
  const card = isDark ? "#111827" : "#FFFFFF";
  const text = isDark ? "#F9FAFB" : "#111827";
  const subText = isDark ? "rgba(249,250,251,0.7)" : "rgba(17,24,39,0.65)";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.18)";

  const [locale, setLocalState] = useState(getLocale());
  const [bioEnabled, setBioEnabled] = useState(false);
  const [notiBusy, setNotiBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const v = await getBiometricEnabled();
      setBioEnabled(v);
    })();
  }, []);

  async function onLogout() {
    await clearToken();
    router.replace("/login");
  }

  async function changeLang(l: "tr" | "en" | "de") {
    await setLocale(l);
    setLocalState(l);
  }

  function LangButton({
    code,
    label,
    a11yLabel,
  }: {
    code: "tr" | "en" | "de";
    label: string;
    a11yLabel: string;
  }) {
    const active = locale === code;

    return (
      <Pressable
        onPress={() => changeLang(code)}
        hitSlop={HIT_SLOP_10}
        accessible
        accessibilityRole="button"
        accessibilityLabel={a11yLabel}
        accessibilityHint={t("language")}
        style={{
          paddingVertical: 10,
          paddingHorizontal: 14,
          borderRadius: 10,
          borderWidth: 1,
          borderColor: active ? "#2563EB" : border,
          backgroundColor: active ? "#2563EB" : "transparent",
          minHeight: 44,
          justifyContent: "center",
        }}
      >
        <Text style={{ color: active ? "white" : text, fontWeight: "700" }}>
          {label}
        </Text>
      </Pressable>
    );
  }

  async function sendTestNotification() {
    // Expo Go (SDK 53+) remote push desteklemiyor.
    // Biz burada sadece LOCAL (trigger: null) bildirim deneriz.
    setNotiBusy(true);
    try {
      const Notifications = await import("expo-notifications");

      // izin iste (local için yeterli)
      await Notifications.requestPermissionsAsync();

      await Notifications.scheduleNotificationAsync({
        content: {
          title: "LMS Bildirim",
          body: "Bu bir test bildirimidir ✅",
        },
        trigger: null,
      });

      Alert.alert("Bildirim", "Test bildirimi gönderildi.");
    } catch (e: any) {
      Alert.alert(
        "Bildirim çalışmadı",
        e?.message ??
          "Expo Go'da push özellikleri sınırlı. Remote push için development build gerekir."
      );
    } finally {
      setNotiBusy(false);
    }
  }

  async function toggleBiometric(next: boolean) {
    try {
      if (next) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();

        if (!hasHardware) {
          Alert.alert("Biometrik yok", "Bu cihazda biometrik donanım bulunamadı.");
          return;
        }
        if (!enrolled) {
          Alert.alert("Kayıt yok", "Önce telefonda parmak izi / yüz tanıma eklemelisin.");
          return;
        }

        const res = await LocalAuthentication.authenticateAsync({
          promptMessage: "Biometrik girişi etkinleştir",
          cancelLabel: "İptal",
        });

        if (!res.success) return;
      }

      await setBiometricEnabled(next);
      setBioEnabled(next);
    } catch (e: any) {
      Alert.alert("Hata", e?.message ?? "Biometrik ayarı değiştirilemedi.");
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: bg, padding: 20 }}>
      <View
        style={{
          backgroundColor: card,
          borderRadius: 16,
          padding: 18,
          borderWidth: 1,
          borderColor: border,
          gap: 14,
        }}
      >
        <Text
          style={{ fontSize: 22, fontWeight: "800", color: text }}
          accessibilityRole="header"
        >
          {t("profile")}
        </Text>

        {/* Dil */}
        <Text style={{ color: subText }}>{t("language")}</Text>
        <View style={{ flexDirection: "row", gap: 10 }}>
          <LangButton code="tr" label="🇹🇷 TR" a11yLabel="Türkçe" />
          <LangButton code="en" label="🇬🇧 EN" a11yLabel="English" />
          <LangButton code="de" label="🇩🇪 DE" a11yLabel="Deutsch" />
        </View>

        {/* Biometrik */}
        <View
          accessible
          accessibilityLabel="Biometrik giriş"
          accessibilityHint="Face ID veya parmak izi ile giriş"
          style={{
            marginTop: 6,
            padding: 12,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: border,
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            minHeight: 56,
          }}
        >
          <View style={{ gap: 4, flex: 1, paddingRight: 10 }}>
            <Text style={{ color: text, fontWeight: "800" }}>Biometrik Giriş</Text>
            <Text style={{ color: subText, fontSize: 12 }}>Face ID / Parmak izi ile giriş</Text>
          </View>

          <Switch
            value={bioEnabled}
            onValueChange={toggleBiometric}
            accessibilityLabel="Biometrik giriş anahtarı"
            accessibilityHint="Açıp kapatmak için dokun"
            accessibilityState={{ checked: bioEnabled }}
          />
        </View>

        {/* Test bildirim */}
        <Pressable
          onPress={sendTestNotification}
          disabled={notiBusy}
          hitSlop={HIT_SLOP_10}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Test bildirimi gönder"
          accessibilityHint="Cihaza yerel test bildirimi gönderir"
          style={{
            marginTop: 8,
            padding: 14,
            borderRadius: 12,
            backgroundColor: notiBusy ? "#6B7280" : "#0EA5E9",
            alignItems: "center",
            minHeight: 44,
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>
            {notiBusy ? "Gönderiliyor..." : t("testNotification")}
          </Text>
        </Pressable>

        {/* Çıkış */}
        <Pressable
          onPress={onLogout}
          hitSlop={HIT_SLOP_10}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Çıkış yap"
          accessibilityHint="Hesaptan çıkış yapar ve giriş ekranına döner"
          style={{
            marginTop: 12,
            padding: 14,
            borderRadius: 12,
            backgroundColor: "#DC2626",
            alignItems: "center",
            minHeight: 44,
            justifyContent: "center",
          }}
        >
          <Text style={{ color: "white", fontWeight: "800" }}>Çıkış Yap</Text>
        </Pressable>

        {Platform.OS !== "web" ? (
          <Text style={{ color: subText, fontSize: 11, marginTop: 6 }}>
            A11y: label/role/hitSlop/min touch target (44dp) eklendi.
          </Text>
        ) : null}
      </View>
    </View>
  );
}

import React, { useMemo } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { WebView } from "react-native-webview";

const PDF_BASE = "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf"; 
// örnek public pdf base (test için). İstersen kendi base’ini yazarsın.

export default function PdfViewerScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  // ✅ id'ye göre PDF url üret
  // Örn: /content/pdf/1 -> .../dummy.pdf
  const pdfUrl = useMemo(() => {
    if (!id) return "";
    // burada kendi sistemine göre eşleştireceğiz:
    // şimdilik test için "dummy.pdf" kullanıyorum
    return `${PDF_BASE}/dummy.pdf`;
  }, [id]);

  // ✅ Google Docs Viewer ile Android'de daha stabil
  const viewerUrl = useMemo(() => {
    if (!pdfUrl) return "";
    return `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(pdfUrl)}`;
  }, [pdfUrl]);

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>PDF Viewer</Text>
        <Text style={styles.sub}>PDF linki bulunamadı. (id boş)</Text>
        <Pressable onPress={() => router.back()} style={styles.btn}>
          <Text style={styles.btnText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  if (!viewerUrl) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>PDF Viewer</Text>
        <Text style={styles.sub}>PDF URL üretilemedi.</Text>
        <Pressable onPress={() => router.back()} style={styles.btn}>
          <Text style={styles.btnText}>Geri Dön</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.headerTitle}>Ders Notu (PDF)</Text>
      </View>

      <WebView
        source={{ uri: viewerUrl }}
        startInLoadingState
        renderLoading={() => (
          <View style={styles.loading}>
            <ActivityIndicator size="large" />
            <Text style={styles.loadingText}>PDF yükleniyor...</Text>
          </View>
        )}
        // bazı android cihazlarda gerekli olabiliyor
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        allowsFullscreenVideo
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 12,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
  },
  backText: { fontSize: 24, lineHeight: 24, marginTop: -2 },
  headerTitle: { fontSize: 16, fontWeight: "800" },

  loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  loadingText: { color: "#374151" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 10 },
  title: { fontSize: 18, fontWeight: "900" },
  sub: { color: "#374151", textAlign: "center" },
  btn: { marginTop: 8, backgroundColor: "#2563eb", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "700" },
});

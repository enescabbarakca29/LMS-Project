import { useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  Image,
  useColorScheme,
  Alert,
  ScrollView,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router } from "expo-router";
import { API_BASE_URL } from "@/src/config/api";

const UPLOAD_TIMEOUT_MS = 45000; // batch daha uzun sürebilir
const MAX_PAGES = 10;

export default function OptikNative() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#0B0F19" : "#F5F7FB";
  const card = isDark ? "#111827" : "#FFFFFF";
  const text = isDark ? "#F9FAFB" : "#111827";
  const subText = isDark ? "rgba(249,250,251,0.7)" : "rgba(17,24,39,0.65)";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.18)";

  const cameraRef = useRef<CameraView | null>(null);
  const [permission, requestPermission] = useCameraPermissions();

  // ✅ çoklu sayfa
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function takePhoto() {
    try {
      setErr(null);

      if (photos.length >= MAX_PAGES) {
        Alert.alert("Limit", `En fazla ${MAX_PAGES} sayfa ekleyebilirsin.`);
        return;
      }

      const cam: any = cameraRef.current;
      if (!cam?.takePictureAsync) return;

      const pic = await cam.takePictureAsync({
        quality: 0.55,
        skipProcessing: true,
      });

      const uri = pic?.uri;
      if (!uri) throw new Error("Foto URI alınamadı");

      // listeye ekle
      setPhotos((prev) => [...prev, uri]);
    } catch (e: any) {
      const msg = e?.message ?? "Foto çekme hatası";
      setErr(msg);
      Alert.alert("Hata", msg);
    }
  }

  async function pingHealth() {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const res = await fetch(`${API_BASE_URL}/health`, { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch {
      return false;
    }
  }

  async function uploadBatchToBackend(uris: string[]) {
    const ok = await pingHealth();
    if (!ok) {
      throw new Error(
        `Backend'e ulaşılamıyor. Aynı Wi-Fi'da mısın?\nAPI: ${API_BASE_URL}`
      );
    }

    const form = new FormData();

    // ✅ backend: upload.array("images")
    uris.forEach((uri, idx) => {
      form.append("images", {
        uri,
        name: `page_${idx + 1}.jpg`,
        type: "image/jpeg",
      } as any);
    });

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPLOAD_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(`${API_BASE_URL}/api/omr/scan-batch`, {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });
    } catch (e: any) {
      clearTimeout(timeout);
      if (e?.name === "AbortError") throw new Error("İstek zaman aşımına uğradı (timeout).");
      throw new Error("Network request failed (telefon backend'e ulaşamadı).");
    } finally {
      clearTimeout(timeout);
    }

    const txt = await res.text();
    let data: any = null;
    try {
      data = txt ? JSON.parse(txt) : null;
    } catch {
      data = { raw: txt };
    }

    if (!res.ok) {
      const msg = data?.error ?? data?.raw ?? `HTTP ${res.status}`;
      throw new Error(msg);
    }

    return data;
  }

  function removeLast() {
    setPhotos((prev) => prev.slice(0, -1));
  }

  function clearAll() {
    setPhotos([]);
  }

  if (!permission) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ color: text }}>Kamera kontrol ediliyor…</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={{ flex: 1, backgroundColor: bg, padding: 16, justifyContent: "center", gap: 12 }}>
        <View style={{ backgroundColor: card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: border }}>
          <Text style={{ color: text, fontSize: 18, fontWeight: "800" }}>Kamera İzni</Text>
          <Text style={{ color: subText, marginTop: 6 }}>Optik okuyucu için kamera izni gerekiyor.</Text>

          <Pressable
            onPress={requestPermission}
            style={{ marginTop: 10, padding: 14, borderRadius: 12, backgroundColor: "#2563EB", alignItems: "center" }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>İzin Ver</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: bg }} contentContainerStyle={{ padding: 16, gap: 12 }}>
      <Text style={{ color: text, fontSize: 22, fontWeight: "900" }}>Optik Okuyucu</Text>
      <Text style={{ color: subText }}>
        Fotoğraf çek → (çoklu sayfa) → backend OCR/OMR → sonuç doğrula → ana programa gönder
      </Text>

      <View style={{ height: 360, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: border }}>
        <CameraView ref={cameraRef} style={{ flex: 1 }} facing="back" />

        <View style={{ padding: 12, backgroundColor: "rgba(0,0,0,0.35)", gap: 10 }}>
          <Pressable
            onPress={takePhoto}
            disabled={loading}
            style={{
              padding: 14,
              borderRadius: 12,
              backgroundColor: loading ? "#6B7280" : "#22C55E",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "900" }}>
              Foto Çek (Sayfa Ekle) • {photos.length}/{MAX_PAGES}
            </Text>
          </Pressable>

          {err ? <Text style={{ color: "#FCA5A5", fontWeight: "700" }}>{err}</Text> : null}
        </View>
      </View>

      {/* ✅ Önizleme listesi */}
      {photos.length > 0 && (
        <View style={{ backgroundColor: card, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: border, gap: 10 }}>
          <Text style={{ color: text, fontWeight: "800" }}>
            Önizleme ({photos.length} sayfa)
          </Text>

          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {photos.map((uri, idx) => (
              <View key={uri + idx} style={{ width: "48%", gap: 6 }}>
                <Text style={{ color: subText, fontSize: 12 }}>Sayfa {idx + 1}</Text>
                <Image source={{ uri }} style={{ width: "100%", height: 120, borderRadius: 12 }} />
              </View>
            ))}
          </View>

          <View style={{ flexDirection: "row", gap: 10 }}>
            <Pressable
              onPress={removeLast}
              disabled={loading || photos.length === 0}
              style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: "#374151", alignItems: "center" }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>Son Sayfayı Sil</Text>
            </Pressable>

            <Pressable
              onPress={clearAll}
              disabled={loading || photos.length === 0}
              style={{ flex: 1, padding: 12, borderRadius: 12, backgroundColor: "#7F1D1D", alignItems: "center" }}
            >
              <Text style={{ color: "white", fontWeight: "800" }}>Temizle</Text>
            </Pressable>
          </View>

          <Pressable
            disabled={loading || photos.length === 0}
            onPress={async () => {
              try {
                setLoading(true);
                setErr(null);

                const json = await uploadBatchToBackend(photos);

                const payload = encodeURIComponent(JSON.stringify(json));
                router.push(`/omr-result?data=${payload}`);
              } catch (e: any) {
                const msg = e?.message ?? "Gönderim hatası";
                setErr(msg);
                Alert.alert("Gönderim Hatası", msg);
              } finally {
                setLoading(false);
              }
            }}
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: loading ? "#9CA3AF" : "#F59E0B",
              alignItems: "center",
            }}
          >
            <Text style={{ color: "white", fontWeight: "800" }}>
              {loading ? `Gönderiliyor... (${photos.length} sayfa)` : `Batch Gönder (${photos.length} sayfa)`}
            </Text>
          </Pressable>

          <Text style={{ color: subText, fontSize: 12 }}>API: {API_BASE_URL}</Text>
        </View>
      )}
    </ScrollView>
  );
}

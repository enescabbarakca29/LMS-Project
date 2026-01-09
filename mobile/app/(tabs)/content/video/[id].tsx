import React, { useMemo, useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Video, ResizeMode, AVPlaybackStatus } from "expo-av";
import { getProgress, setProgress } from "@/src/storage/progress";

const VIDEO_BASE =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample";
// test için public mp4 (hls değil ama player çalışmasını doğrular)

const SAVE_EVERY_MS = 2500;

export default function VideoScreen() {
  const params = useLocalSearchParams<{ id?: string }>();
  const id = typeof params?.id === "string" ? params.id : "";

  const videoUri = useMemo(() => {
    if (!id) return "";
    // test: id ne olursa olsun aynı video
    return `${VIDEO_BASE}/BigBuckBunny.mp4`;
  }, [id]);

  const videoRef = useRef<Video>(null);
  const lastSavedAtRef = useRef(0);
  const pendingSeekRef = useRef<number | null>(null);
  const [restored, setRestored] = useState(false);

  const [rate, setRate] = useState(1.0);

  // ✅ Kaldığı yeri oku
  useEffect(() => {
    (async () => {
      try {
        if (!id) return;
        const rec = await getProgress("video", String(id));
        if (rec?.position && rec.position > 0) {
          pendingSeekRef.current = rec.position; // ms
        }
      } finally {
        setRestored(true);
      }
    })();
  }, [id]);

  const onStatus = async (status: AVPlaybackStatus) => {
    if (!status.isLoaded) return;

    // ✅ İlk yüklemede seek uygula (1 kere)
    if (restored && pendingSeekRef.current != null && videoRef.current) {
      const pos = pendingSeekRef.current;
      pendingSeekRef.current = null;
      try {
        await videoRef.current.setPositionAsync(pos);
      } catch {
        // ignore
      }
    }

    // ✅ Belirli aralıklarla kaydet
    const now = Date.now();
    if (now - lastSavedAtRef.current < SAVE_EVERY_MS) return;
    lastSavedAtRef.current = now;

    const position = Number(status.positionMillis ?? 0);
    const duration = Number(status.durationMillis ?? 0);
    const progress =
      duration > 0 ? Math.min(1, Math.max(0, position / duration)) : 0;

    await setProgress({
      kind: "video",
      contentId: String(id),
      position,
      progress,
      updatedAt: new Date().toISOString(),
    });
  };

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Video</Text>
        <Text style={styles.sub}>Video id yok.</Text>
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
        <Text style={styles.headerTitle}>Video Ders</Text>
      </View>

      <View style={styles.playerWrap}>
        <Video
          ref={videoRef}
          style={styles.video}
          source={{ uri: videoUri }}
          useNativeControls
          resizeMode={ResizeMode.CONTAIN}
          rate={rate}
          shouldPlay
          onPlaybackStatusUpdate={onStatus}
        />
      </View>

      <View style={styles.controls}>
        <Text style={styles.label}>Hız:</Text>

        {([0.75, 1.0, 1.25, 1.5] as const).map((r) => (
          <Pressable
            key={r}
            onPress={() => setRate(r)}
            style={[styles.pill, rate === r && styles.pillActive]}
          >
            <Text style={[styles.pillText, rate === r && styles.pillTextActive]}>
              {r}x
            </Text>
          </Pressable>
        ))}
      </View>
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

  playerWrap: { padding: 12 },
  video: {
    width: "100%",
    height: 220,
    backgroundColor: "#000",
    borderRadius: 12,
  },

  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 6,
  },
  label: { fontWeight: "800", color: "#111827" },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fff",
  },
  pillActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  pillText: { fontWeight: "800", color: "#111827" },
  pillTextActive: { color: "#fff" },

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 10,
  },
  title: { fontSize: 18, fontWeight: "900" },
  sub: { color: "#374151", textAlign: "center" },
  btn: {
    marginTop: 8,
    backgroundColor: "#2563eb",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  btnText: { color: "#fff", fontWeight: "700" },
});

import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  useColorScheme,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";
import { t } from "@/src/i18n";

type Course = {
  id: string;
  title: string;
  instructor: string;
  progress: number; // 0..1
  next: string;
};

const STORAGE_KEY = "lms_courses_cache_v1";
const META_KEY = "lms_courses_cache_meta_v1";

export default function CoursesTab() {
  const scheme = useColorScheme();
  const isDark = scheme === "dark";

  const bg = isDark ? "#0B0F19" : "#F5F7FB";
  const card = isDark ? "#111827" : "#FFFFFF";
  const text = isDark ? "#F9FAFB" : "#111827";
  const subText = isDark ? "rgba(249,250,251,0.7)" : "rgba(17,24,39,0.65)";
  const border = isDark ? "rgba(255,255,255,0.14)" : "rgba(17,24,39,0.18)";
  const track = isDark ? "rgba(255,255,255,0.10)" : "rgba(17,24,39,0.10)";

  const seedCourses = useMemo<Course[]>(
    () => [
      {
        id: "c1",
        title: "Sayısal Mantık Tasarımı",
        instructor: "Dr. Öğr. Üyesi ...",
        progress: 0.35,
        next: "Modül 3 • Kombinasyonel Devreler",
      },
      {
        id: "c2",
        title: "Sayısal İşaret İşleme",
        instructor: "Dr. Öğr. Üyesi ...",
        progress: 0.6,
        next: "Quiz • Fourier Serileri",
      },
      {
        id: "c3",
        title: "Yapay Zeka Uygulamaları",
        instructor: "Dr. Öğr. Üyesi ...",
        progress: 0.12,
        next: "Ders • Optimizasyon Giriş",
      },
    ],
    []
  );

  const [courses, setCourses] = useState<Course[]>([]);
  const [cacheReady, setCacheReady] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  function formatCachedAt(iso: string | null) {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString("tr-TR");
    } catch {
      return iso;
    }
  }

  async function readCache() {
    const cached = await AsyncStorage.getItem(STORAGE_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as Course[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setCourses(parsed);
        setCacheReady(true);
        const meta = await AsyncStorage.getItem(META_KEY);
        if (meta) {
          try {
            const m = JSON.parse(meta) as { cachedAt?: string };
            setCachedAt(m?.cachedAt ?? null);
          } catch {}
        }
        return true;
      }
    }
    return false;
  }

  async function writeCache(list: Course[]) {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    await AsyncStorage.setItem(
      META_KEY,
      JSON.stringify({ cachedAt: new Date().toISOString() })
    );
    setCachedAt(new Date().toISOString());
    setCacheReady(true);
  }

  useEffect(() => {
    // network listener
    const unsub = NetInfo.addEventListener((state) => {
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);
    });

    // init: önce cache, sonra online ise cache güncelle
    (async () => {
      const state = await NetInfo.fetch();
      const offline = !(state.isConnected && state.isInternetReachable !== false);
      setIsOffline(offline);

      const hasCache = await readCache();

      if (!offline) {
        // online ise seed’i "online data" kabul edip cache güncelle
        await writeCache(seedCourses);
        setCourses(seedCourses);
      } else {
        // offline: cache yoksa seed göster ama "cache hazır" deme
        if (!hasCache) {
          setCourses(seedCourses);
          setCacheReady(false);
        }
      }
    })();

    return () => unsub();
  }, [seedCourses]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: bg }}
      contentContainerStyle={{ padding: 16, gap: 12 }}
    >
      <Text style={{ fontSize: 22, fontWeight: "900", color: text }}>
        {t("courses")}
      </Text>

      {/* Offline/Online banner */}
      <View
        style={{
          backgroundColor: card,
          borderRadius: 16,
          padding: 12,
          borderWidth: 1,
          borderColor: border,
          gap: 6,
        }}
      >
        <Text style={{ color: text, fontWeight: "800" }}>
          {isOffline ? "Offline Mod" : "Online"}
        </Text>
        <Text style={{ color: subText, fontSize: 12 }}>
          Son güncelleme: {formatCachedAt(cachedAt)}
        </Text>
        <Text style={{ color: subText, fontSize: 12 }}>
          {isOffline
            ? "İnternet yok. Dersler cache’ten gösterilir (varsa)."
            : "İnternet var. Dersler güncellendi ve cache’e kaydedildi."}
        </Text>
      </View>

      {/* Cache durumu */}
      <Text style={{ color: subText, marginBottom: 6 }}>
        {cacheReady ? t("offlineReady") : "Cache yok (offline iken ilk kez açıldı)."}
      </Text>

      {courses.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => {}}
          style={{
            backgroundColor: card,
            borderRadius: 16,
            padding: 16,
            borderWidth: 1,
            borderColor: border,
            gap: 10,
          }}
        >
          <View style={{ gap: 4 }}>
            <Text style={{ color: text, fontSize: 18, fontWeight: "800" }}>
              {c.title}
            </Text>
            <Text style={{ color: subText }}>{c.instructor}</Text>
          </View>

          <Text style={{ color: subText }}>{c.next}</Text>

          <View
            style={{
              height: 10,
              backgroundColor: track,
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <View
              style={{
                height: "100%",
                width: `${Math.round(c.progress * 100)}%`,
                backgroundColor: "#2563EB",
              }}
            />
          </View>

          <Text style={{ color: subText, fontSize: 12 }}>
            İlerleme: %{Math.round(c.progress * 100)}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

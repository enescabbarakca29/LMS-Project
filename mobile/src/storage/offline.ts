import AsyncStorage from "@react-native-async-storage/async-storage";

const COURSES_KEY = "lms_offline_courses_v1";
const META_KEY = "lms_offline_meta_v1";

export type OfflineCourse = {
  id: string;
  title: string;
  instructor: string;
  progress: number; // 0..1
  next: string;
};

export async function saveCoursesToCache(courses: OfflineCourse[]) {
  await AsyncStorage.setItem(COURSES_KEY, JSON.stringify(courses));
  await AsyncStorage.setItem(
    META_KEY,
    JSON.stringify({ cachedAt: new Date().toISOString() })
  );
}

export async function loadCoursesFromCache(): Promise<OfflineCourse[] | null> {
  const raw = await AsyncStorage.getItem(COURSES_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as OfflineCourse[];
  } catch {
    return null;
  }
}

export async function getCacheMeta(): Promise<{ cachedAt: string } | null> {
  const raw = await AsyncStorage.getItem(META_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { cachedAt: string };
  } catch {
    return null;
  }
}

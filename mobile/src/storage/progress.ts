// src/storage/progress.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ContentKind = "pdf" | "video" | "quiz";

export type ProgressRecord = {
  contentId: string;
  kind: ContentKind;
  progress: number;        // 0..1
  position?: number;       // video ms / pdf page gibi
  updatedAt: string;       // ISO
};

const keyOf = (kind: ContentKind, contentId: string) => `progress:${kind}:${contentId}`;

export async function getProgress(kind: ContentKind, contentId: string) {
  const raw = await AsyncStorage.getItem(keyOf(kind, contentId));
  if (!raw) return null;
  try { return JSON.parse(raw) as ProgressRecord; } catch { return null; }
}

export async function setProgress(rec: ProgressRecord) {
  await AsyncStorage.setItem(keyOf(rec.kind, rec.contentId), JSON.stringify(rec));
}

export async function clearProgress(kind: ContentKind, contentId: string) {
  await AsyncStorage.removeItem(keyOf(kind, contentId));
}

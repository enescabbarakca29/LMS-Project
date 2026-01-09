import AsyncStorage from "@react-native-async-storage/async-storage";

export type NoteKind = "pdf" | "video" | "quiz";

export type NoteRecord = {
  kind: NoteKind;
  contentId: string;
  text: string;
  updatedAt: string; // ISO
};

const keyOf = (kind: NoteKind, contentId: string) => `lms_notes_${kind}_${contentId}`;

export async function getNote(kind: NoteKind, contentId: string) {
  try {
    const raw = await AsyncStorage.getItem(keyOf(kind, contentId));
    if (!raw) return null;
    return JSON.parse(raw) as NoteRecord;
  } catch {
    return null;
  }
}

export async function setNote(kind: NoteKind, contentId: string, text: string) {
  const rec: NoteRecord = {
    kind,
    contentId,
    text,
    updatedAt: new Date().toISOString(),
  };
  try {
    await AsyncStorage.setItem(keyOf(kind, contentId), JSON.stringify(rec));
    return rec;
  } catch {
    return null;
  }
}

export async function clearNote(kind: NoteKind, contentId: string) {
  try {
    await AsyncStorage.removeItem(keyOf(kind, contentId));
    return true;
  } catch {
    return false;
  }
}

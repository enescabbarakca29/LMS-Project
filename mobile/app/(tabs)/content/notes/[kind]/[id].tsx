import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, TextInput, Alert } from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { clearNote, getNote, setNote } from "@/src/storage/notes";

type Kind = "pdf" | "video" | "quiz";

export default function NotesScreen() {
  const params = useLocalSearchParams<{ id?: string; kind?: string }>();

  const kind = useMemo<Kind>(() => {
    const k = params?.kind;
    return (k === "pdf" || k === "video" || k === "quiz") ? k : "pdf";
  }, [params?.kind]);

  const id = typeof params?.id === "string" ? params.id : "";

  const [text, setText] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!id) return;
      const rec = await getNote(kind, id);
      if (rec?.text) setText(rec.text);
      if (rec?.updatedAt) setSavedAt(rec.updatedAt);
    })();
  }, [kind, id]);

  const save = async () => {
    if (!id) return;
    const rec = await setNote(kind, id, text);
    if (!rec) return Alert.alert("Hata", "Not kaydedilemedi.");
    setSavedAt(rec.updatedAt);
    Alert.alert("Kaydedildi", "Notunuz cihazda saklandı.");
  };

  const clear = async () => {
    if (!id) return;
    const ok = await clearNote(kind, id);
    if (!ok) return Alert.alert("Hata", "Not silinemedi.");
    setText("");
    setSavedAt(null);
  };

  if (!id) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Notlar</Text>
        <Text style={styles.sub}>İçerik id yok.</Text>
        <Pressable onPress={() => router.back()} style={styles.btn}>
          <Text style={styles.btnText}>Geri</Text>
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
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Notlar</Text>
          <Text style={styles.headerSub}>
            {kind.toUpperCase()} • {id} {savedAt ? `• ${new Date(savedAt).toLocaleString("tr-TR")}` : ""}
          </Text>
        </View>
      </View>

      <View style={styles.body}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Bu içerik için not yaz..."
          multiline
          style={styles.input}
        />

        <View style={styles.row}>
          <Pressable onPress={save} style={[styles.action, styles.save]}>
            <Text style={styles.actionText}>Kaydet</Text>
          </Pressable>
          <Pressable
            onPress={() =>
              Alert.alert("Silinsin mi?", "Not kalıcı olarak silinecek.", [
                { text: "Vazgeç", style: "cancel" },
                { text: "Sil", style: "destructive", onPress: clear },
              ])
            }
            style={[styles.action, styles.del]}
          >
            <Text style={styles.actionText}>Sil</Text>
          </Pressable>
        </View>

        <Text style={styles.tip}>
          Notlar cihazda saklanır (offline çalışır).
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#fff" },
  header: {
    height: 62,
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
  headerTitle: { fontSize: 16, fontWeight: "900" },
  headerSub: { fontSize: 12, color: "#6b7280", marginTop: 2 },

  body: { padding: 12, gap: 12 },
  input: {
    minHeight: 220,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    padding: 12,
    textAlignVertical: "top",
    fontSize: 14,
  },
  row: { flexDirection: "row", gap: 10 },
  action: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  save: { backgroundColor: "#16a34a" },
  del: { backgroundColor: "#ef4444" },
  actionText: { color: "#fff", fontWeight: "900" },

  tip: { color: "#6b7280", fontSize: 12 },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 20, gap: 10 },
  title: { fontSize: 18, fontWeight: "900" },
  sub: { color: "#374151", textAlign: "center" },
  btn: { marginTop: 8, backgroundColor: "#2563eb", paddingVertical: 12, paddingHorizontal: 16, borderRadius: 10 },
  btnText: { color: "#fff", fontWeight: "700" },
});

import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Alert,
  Pressable,
} from "react-native";
import { useMemo, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";

const API_BASE = "http://192.168.163.51:3005"; // kendi IP'nize göre değiştirin aynı zamanda telefon ile desktopunuz aynı ağa bağlanmalı.
// Android Emulator: 10.0.2.2
// Gerçek telefon: bilgisayar IP (örn: 192.168.1.34)
// iOS Simulator: http://localhost:3005

const CHOICES = ["A", "B", "C", "D", "E"] as const;
type AnswerChoice = (typeof CHOICES)[number];
type AnswersMap = Record<string, AnswerChoice | null>;

export default function OMRScreen() {
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  // ✅ doğrulama/düzeltme state
  const [editableAnswers, setEditableAnswers] = useState<AnswersMap>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);

  // result içindeki answer key'lerini 1..N sırala
  const questionKeys = useMemo(() => {
    const ans = (editableAnswers ?? {}) as AnswersMap;
    return Object.keys(ans)
      .map((k) => Number(k))
      .filter((n) => !Number.isNaN(n))
      .sort((a, b) => a - b)
      .map(String);
  }, [editableAnswers]);

  // 📷 Kamera
  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("İzin gerekli", "Kamera izni vermen gerekiyor.");
      return;
    }

    const res = await ImagePicker.launchCameraAsync({
      quality: 1,
      allowsEditing: false,
    });

    if (!res.canceled) {
      setImage(res.assets[0]);
      setResult(null);
      setEditableAnswers({});
      setSubmitResult(null);
    }
  };

  // 🖼️ Galeri
  const pickFromGallery = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      quality: 1,
      allowsEditing: false,
    });

    if (!res.canceled) {
      setImage(res.assets[0]);
      setResult(null);
      setEditableAnswers({});
      setSubmitResult(null);
    }
  };

  // 🚀 Backend’e gönder
  const sendToBackend = async () => {
    if (!image) return;

    setLoading(true);
    setResult(null);
    setEditableAnswers({});
    setSubmitResult(null);

    try {
      const formData = new FormData();

      formData.append("image", {
        uri: image.uri,
        name: "optik.jpg",
        type: "image/jpeg",
      } as any);

      const res = await fetch(`${API_BASE}/api/omr/scan`, {
        method: "POST",
        body: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      const json = await res.json();
      setResult(json);

      // ✅ doğrulama için kopya answers
      const ans = (json?.answers ?? {}) as AnswersMap;
      setEditableAnswers(ans);
    } catch (e) {
      Alert.alert("Hata", "Backend'e bağlanılamadı");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Submit (Onayla & Kaydet)
  const submitApproved = async () => {
    if (!result) return;

    setSubmitting(true);
    setSubmitResult(null);

    try {
      const payload = {
        ...result,
        answers: editableAnswers,
        status: "approved",
        approvedAt: new Date().toISOString(),
      };

      const res = await fetch(`${API_BASE}/api/omr/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      setSubmitResult(json);
      Alert.alert("Kaydedildi", "Sonuç onaylandı ve kaydedildi.");
    } catch (e) {
      console.error(e);
      setSubmitResult({ error: "submit_failed" });
      Alert.alert("Hata", "Kaydetme başarısız oldu.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Optik Okuma</Text>

      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.button} onPress={takePhoto}>
          <Ionicons name="camera-outline" size={22} color="#fff" />
          <Text style={styles.buttonText}>Kamera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={pickFromGallery}>
          <Ionicons name="image-outline" size={22} color="#fff" />
          <Text style={styles.buttonText}>Galeri</Text>
        </TouchableOpacity>
      </View>

      {image && (
        <>
          <Image source={{ uri: image.uri }} style={styles.preview} />

          <TouchableOpacity style={styles.sendButton} onPress={sendToBackend}>
            <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
            <Text style={styles.buttonText}>Optiği Tara</Text>
          </TouchableOpacity>
        </>
      )}

      {loading && <ActivityIndicator size="large" style={{ marginTop: 20 }} />}

      {/* ✅ DOĞRULAMA UI */}
      {result && (
        <View style={styles.verifyBox}>
          <Text style={styles.verifyTitle}>Sonuç Doğrulama</Text>

          {questionKeys.length === 0 ? (
            <Text style={{ marginTop: 6 }}>Cevap bulunamadı.</Text>
          ) : (
            <View style={{ marginTop: 10, gap: 10 }}>
              {questionKeys.map((qKey) => {
                const selected = editableAnswers[qKey] ?? null;

                return (
                  <View key={qKey} style={styles.questionCard}>
                    <Text style={styles.questionTitle}>Soru {qKey}</Text>

                    <View style={styles.choiceRow}>
                      {CHOICES.map((c) => {
                        const active = selected === c;
                        return (
                          <Pressable
                            key={c}
                            onPress={() =>
                              setEditableAnswers((prev) => ({
                                ...prev,
                                [qKey]: c,
                              }))
                            }
                            style={[
                              styles.choiceBtn,
                              active && styles.choiceBtnActive,
                            ]}
                          >
                            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                              {c}
                            </Text>
                          </Pressable>
                        );
                      })}

                      <Pressable
                        onPress={() =>
                          setEditableAnswers((prev) => ({
                            ...prev,
                            [qKey]: null,
                          }))
                        }
                        style={[
                          styles.choiceBtn,
                          selected === null && styles.choiceBtnEmptyActive,
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            selected === null && styles.choiceTextEmptyActive,
                          ]}
                        >
                          Boş
                        </Text>
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          <TouchableOpacity
            style={[styles.approveButton, submitting && { opacity: 0.6 }]}
            onPress={submitApproved}
            disabled={submitting}
          >
            <Ionicons name="checkmark-done-outline" size={22} color="#fff" />
            <Text style={styles.buttonText}>
              {submitting ? "Kaydediliyor..." : "Onayla ve Kaydet"}
            </Text>
          </TouchableOpacity>

          {submitResult && (
            <View style={styles.submitBox}>
              <Text style={{ fontWeight: "700", marginBottom: 6 }}>Submit cevabı</Text>
              <Text style={styles.resultText}>{JSON.stringify(submitResult, null, 2)}</Text>
            </View>
          )}
        </View>
      )}

      {/* Eski JSON sonucu (aynen kalsın) */}
      {result && (
        <View style={styles.resultBox}>
          <Text style={styles.resultTitle}>Sonuç (Ham JSON)</Text>
          <Text style={styles.resultText}>{JSON.stringify(result, null, 2)}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 16,
    textAlign: "center",
  },
  buttonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  button: {
    flexDirection: "row",
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 8,
    width: "48%",
    justifyContent: "center",
    alignItems: "center",
  },
  sendButton: {
    flexDirection: "row",
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 8,
    marginTop: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  approveButton: {
    flexDirection: "row",
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 10,
    marginTop: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    marginLeft: 6,
    fontWeight: "600",
  },
  preview: {
    width: "100%",
    height: 320,
    marginTop: 12,
    borderRadius: 10,
  },

  // ✅ doğrulama alanı
  verifyBox: {
    marginTop: 20,
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  verifyTitle: {
    fontWeight: "800",
    fontSize: 16,
  },
  questionCard: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  questionTitle: {
    fontWeight: "800",
    marginBottom: 8,
  },
  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  choiceBtn: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    backgroundColor: "#FFFFFF",
  },
  choiceBtnActive: {
    borderColor: "#16A34A",
    backgroundColor: "#DCFCE7",
  },
  choiceText: {
    fontWeight: "800",
    color: "#111827",
  },
  choiceTextActive: {
    color: "#166534",
  },
  choiceBtnEmptyActive: {
    borderColor: "#EF4444",
    backgroundColor: "#FEE2E2",
  },
  choiceTextEmptyActive: {
    color: "#991B1B",
  },

  submitBox: {
    marginTop: 12,
    backgroundColor: "#F3F4F6",
    padding: 12,
    borderRadius: 8,
  },

  // eski sonuç kutusu
  resultBox: {
    marginTop: 16,
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 8,
  },
  resultTitle: {
    fontWeight: "bold",
    marginBottom: 6,
  },
  resultText: {
    fontSize: 12,
    fontFamily: "monospace",
  },
});

export type QuestionType =
  | "multiple_choice"
  | "true_false"
  | "short_answer"
  | "matching"
  | "open_ended";

export type Question = {
  id: string;
  type: QuestionType;
  text: string;

  // Ortak
  points: number;

  // ========== Çoktan Seçmeli ==========
  options?: string[];
  correctOption?: number;

  // ========== Doğru / Yanlış ==========
  correctBoolean?: boolean;

  // ========== Kısa Cevap ==========
  // (ileride otomatik puanlama için)
  correctText?: string;

  // ========== Eşleştirme ==========
  pairs?: {
    left: string;
    right: string;
  }[];

  // ========== Açık Uçlu / Rubrik ==========
  // (rubrik sistemi için opsiyonel)
  rubricId?: string;
};

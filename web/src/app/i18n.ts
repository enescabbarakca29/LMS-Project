"use client";

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const savedLang =
  typeof window !== "undefined" ? localStorage.getItem("lang") : null;

i18n.use(initReactI18next).init({
  resources: {
    tr: {
      translation: {
        title: "LMS Web",
        description:
          "Bu uygulama kapsamlı bir Öğrenim Yönetim Sistemi (LMS) için geliştirilen web arayüzüdür.",
        features: "Özellikler",
        feature_1: "Ders oluşturma ve yönetimi",
        feature_2: "İçerik yükleme (PDF, Video)",
        feature_3: "Sınav ve değerlendirme",
        feature_4: "Kullanıcı rolleri",

        /* Courses page */
        courses: "Dersler",
        instructor: "Eğitmen",
        edit: "Düzenle",
        delete: "Sil",
        delete_confirm: "Bu dersi silmek istediğine emin misin?",
        default_delete_error: "Varsayılan dersler silinemez (mock).",
      },
    },
    en: {
      translation: {
        title: "LMS Web",
        description:
          "This application is a web interface developed for a comprehensive Learning Management System (LMS).",
        features: "Features",
        feature_1: "Course creation and management",
        feature_2: "Content upload (PDF, Video)",
        feature_3: "Exams and evaluation",
        feature_4: "User roles",

        /* Courses page */
        courses: "Courses",
        instructor: "Instructor",
        edit: "Edit",
        delete: "Delete",
        delete_confirm: "Are you sure you want to delete this course?",
        default_delete_error: "Default courses cannot be deleted (mock).",
      },
    },
  },
  lng: savedLang ?? "tr",
  fallbackLng: "tr",
  react: {
    useSuspense: false,
  },
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

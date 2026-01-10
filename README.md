# LMS-Project 

Bu proje, **Learning Management System (LMS)** kapsamında geliştirilen  
**web, mobil, masaüstü ve backend** bileşenlerini tek bir repo (monorepo) altında toplar.

Proje; ders yönetimi, kullanıcı yönetimi, sınav/ölçme-değerlendirme ve
optik form (OMR) tabanlı sınav okuma gibi modülleri içerecek şekilde tasarlanmıştır.

---

## 📁 Proje Yapısı

```text
LMS-Project/
├── backend/    # Backend servisleri (API, OMR, veri işleme)
├── web/        # Next.js tabanlı web uygulaması
├── mobile/     # Expo React Native mobil uygulaması
├── desktop/    # Electron masaüstü uygulaması
├── .gitignore
└── README.md

🧩 Modüller
🌐 Web (web)

Next.js tabanlı LMS web arayüzü

Dersler, modüller, quiz/sınav yönetimi

Rol bazlı kullanıcı yapısı (admin, öğretmen, öğrenci)
Çalıştırma:

npm install
npm run dev



📱 Mobile (mobile)

Expo React Native ile geliştirilen mobil uygulama

Ders içeriklerine erişim

Video, PDF ve quiz görüntüleme

Mobil OMR / kamera entegrasyonu (planlanan)

Çalıştırma:

npm install
npx expo start



🖥 Desktop (desktop)

Electron tabanlı masaüstü uygulaması

Güvenli sınav ortamı (Safe Exam Browser benzeri yapı)

Offline/yerel kullanım senaryoları



⚙️ Backend (backend)

API servisleri

Optik Form Okuma (OMR) ve veri işleme

Sınav sonuçlarının değerlendirilmesi

Veritabanı ve servis entegrasyonları



🎯 Amaçlar

Çok platformlu (web / mobile / desktop) LMS geliştirmek

Ölçme ve değerlendirme süreçlerini dijitalleştirmek

Optik formlar ile sınav okuma ve analiz

Akademik proje ve ders kapsamına uygun modüler yapı



🛠 Kullanılan Teknolojiler

Frontend (Web): Next.js, React

Mobile: Expo, React Native

Desktop: Electron

Backend: Node.js / Python (OMR)

Versiyon Kontrol: Git & GitHub




📌 Notlar

Her modül kendi klasörü içinde bağımsız olarak çalıştırılabilir.

Ortam değişkenleri .env dosyaları ile yönetilir (.env.example önerilir).

Repo monorepo yapısındadır, tek GitHub reposu üzerinden yönetilir.


👤 Geliştirici

Enes Cabbar AKÇA
Ankara Üniversitesi – Yapay Zeka & Veri Mühendisliği

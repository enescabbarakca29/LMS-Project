export default function PrivacyPage() {
  return (
    <main style={{ padding: "24px", maxWidth: 800, margin: "0 auto" }}>
      <h1>Gizlilik ve Veri Koruma (KVKK)</h1>

      <p>
        Bu uygulama, eğitim amaçlı geliştirilmiş bir Öğrenim Yönetim Sistemi (LMS)
        prototipidir.
      </p>

      <h2>Toplanan Veriler</h2>
      <ul>
        <li>Kişisel veri toplanmamaktadır.</li>
        <li>Gerçek kullanıcı bilgileri saklanmamaktadır.</li>
        <li>Tüm içerikler demo ve test amaçlıdır.</li>
      </ul>

      <h2>Loglama ve İzleme</h2>
      <p>
        Sistem üzerinde gerçekleştirilen kritik işlemler (ör. SCORM yükleme,
        quiz import/export, canlı ders oluşturma) audit log ve xAPI kayıtları
        ile izlenmektedir. Bu kayıtlar kişisel veri içermemektedir.
      </p>

      <h2>Veri Güvenliği</h2>
      <p>
        Uygulama production ortamında HTTPS (TLS) üzerinden çalışacak şekilde
        tasarlanmıştır. Veri güvenliği ve gizliliği KVKK prensiplerine uygun
        olarak ele alınmıştır.
      </p>
    </main>
  );
}

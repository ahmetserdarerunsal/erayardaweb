import type { Metadata } from "next";

export const metadata: Metadata = { title: "Kurulum bekleniyor" };

export default function AdminSetupPage() {
  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <p className="admin-login__brand">Ekrem Eray Arda</p>
        <h1>Kurulum tamamlanmadı</h1>
        <p className="admin-login__lead">
          Yönetim paneli için veritabanı bağlantısı henüz tanımlanmamış.
          Projedeki <strong>KURULUM.md</strong> dosyasındaki adımları
          tamamlayın; ardından panel otomatik olarak açılacaktır.
        </p>
        <div className="admin-note" data-tone="warn" style={{ marginTop: "1.5rem" }}>
          <p>
            Eksik ayarlar: <code>NEXT_PUBLIC_SUPABASE_URL</code> ve{" "}
            <code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>
          </p>
        </div>
      </div>
    </div>
  );
}

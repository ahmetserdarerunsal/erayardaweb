import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Yetkisiz erişim" };

export default function AdminForbiddenPage() {
  return (
    <div className="admin-login">
      <div className="admin-login__card">
        <p className="admin-login__brand">Ekrem Eray Arda</p>
        <h1>Bu bölüme erişiminiz yok</h1>
        <p className="admin-login__lead">
          Hesabınız panele tanımlı değil veya bu bölüm için yetkiniz
          bulunmuyor. Erişim gerekiyorsa site yöneticisiyle görüşün.
        </p>
        <div className="admin-actions" style={{ marginTop: "1.75rem" }}>
          <Link className="admin-btn admin-btn--ghost" href="/admin/giris">
            Farklı hesapla giriş yap
          </Link>
          <Link className="admin-btn admin-btn--ghost" href="/">
            Siteye dön
          </Link>
        </div>
      </div>
    </div>
  );
}

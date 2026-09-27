import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import loginPhoto from "../../../../public/images/hero-mobile.png";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Giriş" };

export default function AdminLoginPage() {
  if (!isSupabaseConfigured) redirect("/admin/kurulum");

  return (
    <div className="admin-login admin-login--split">
      <aside className="admin-login__visual">
        <Image
          className="admin-login__photo"
          src={loginPhoto}
          alt=""
          priority
          quality={85}
          sizes="(max-width: 900px) 100vw, 50vw"
        />
        <div className="admin-login__scrim" aria-hidden="true" />

        <div className="admin-login__visual-body">
          <p className="admin-login__wordmark">Ekrem Eray Arda</p>
          <p className="admin-login__tagline">
            İBB ve Kartal Belediye Meclis Üyesi
          </p>
        </div>
      </aside>

      <main className="admin-login__panel">
        <div className="admin-login__card">
          <p className="admin-login__brand">Yönetim Paneli</p>
          <h1>Giriş yapın</h1>
          <p className="admin-login__lead">
            Faaliyet, fotoğraf ve video içeriklerini yönetmek için hesabınızla
            oturum açın.
          </p>

          <Suspense fallback={<div className="admin-form" />}>
            <LoginForm />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

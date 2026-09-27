import type { Metadata } from "next";
import { ErrorNotice } from "@/components/layout/ErrorNotice";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getSiteProfile } from "@/lib/public-content";

export const metadata: Metadata = { title: "Sayfa bulunamadı" };

/**
 * Hiçbir rotayla eşleşmeyen adresler buraya düşer.
 *
 * Kök yerleşim yalnızca html/body kurduğu için başlık ve alt bilgi burada
 * elle ekleniyor; aksi hâlde 404 sayfası çerçevesiz kalırdı.
 */
export default async function NotFound() {
  const profile = await getSiteProfile();

  return (
    <>
      <a className="skip-link" href="#ana-icerik">
        İçeriğe geç
      </a>
      <Header name={profile.name} title={profile.title} />
      <ErrorNotice
        code="404"
        title="Sayfa bulunamadı"
        description="Aradığınız sayfa taşınmış veya kaldırılmış olabilir. Menüden ilgili bölüme geçebilir ya da ana sayfaya dönebilirsiniz."
      />
      <Footer name={profile.name} title={profile.title} />
    </>
  );
}

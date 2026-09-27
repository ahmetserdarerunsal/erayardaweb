import type { ReactNode } from "react";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getSiteProfile } from "@/lib/public-content";

/** Ziyaretçiye açık sayfaların ortak çerçevesi. /admin bunu kullanmaz. */
export default async function SiteLayout({ children }: { children: ReactNode }) {
  const profile = await getSiteProfile();
  return (
    <>
      <a className="skip-link" href="#ana-icerik">
        İçeriğe geç
      </a>
      <Header name={profile.name} title={profile.title} />
      {children}
      <Footer name={profile.name} title={profile.title} />
    </>
  );
}

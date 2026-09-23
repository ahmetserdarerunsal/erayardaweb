import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { profile } from "@/data/profile";
import "./globals.css";

const montserrat = Montserrat({ variable: "--font-montserrat", subsets: ["latin", "latin-ext"], display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(profile.siteUrl),
  title: `${profile.name} | ${profile.title}`,
  description: profile.description,
  openGraph: { type: "website", locale: "tr_TR", title: profile.name, description: profile.description },
  twitter: { card: "summary", title: profile.name, description: profile.description },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={montserrat.variable}>
      <body>
        <a className="skip-link" href="#ana-icerik">İçeriğe geç</a>
        <Header />
        <div id="ana-icerik">{children}</div>
        <Footer />
      </body>
    </html>
  );
}

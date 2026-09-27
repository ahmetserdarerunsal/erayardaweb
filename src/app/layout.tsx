import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { getSiteProfile } from "@/lib/public-content";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getSiteProfile();
  return {
    metadataBase: new URL(profile.siteUrl),
    title: { default: `${profile.name} | ${profile.title}`, template: `%s | ${profile.name}` },
    description: profile.description,
    // Görseller dosya adından otomatik bağlanır: app/opengraph-image.png
    // hem Open Graph hem de Twitter kartına verilir.
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: profile.siteUrl,
      siteName: profile.name,
      title: `${profile.name} | ${profile.title}`,
      description: profile.description,
    },
    twitter: {
      card: "summary_large_image",
      title: `${profile.name} | ${profile.title}`,
      description: profile.description,
    },
    alternates: { canonical: profile.siteUrl },
    robots: { index: true, follow: true },
  };
}

/**
 * Kök yerleşim yalnızca html/body kurar.
 *
 * Site başlığı ve alt bilgisi (site) grubuna taşındı; böylece /admin
 * ziyaretçiye açık siteden tamamen bağımsız kendi tasarımıyla çalışır.
 */
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="tr" className={montserrat.variable} data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  );
}

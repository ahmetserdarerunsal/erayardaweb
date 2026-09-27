import type { MetadataRoute } from "next";
import { getSiteProfile } from "@/lib/public-content";

/**
 * Sitemap adresi MUTLAK olmalı: arama motorları robots.txt içindeki göreli
 * yolu yok sayar. Adres site profilinden (NEXT_PUBLIC_SITE_URL) gelir.
 */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const { siteUrl } = await getSiteProfile();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Panel ve uç noktalar dizine girmez; /admin ayrıca noindex başlığı da alır.
      disallow: ["/admin", "/admin/", "/api/"],
    },
    sitemap: new URL("/sitemap.xml", siteUrl).toString(),
    host: siteUrl,
  };
}

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90],
    remotePatterns: [
      ...(process.env.NEXT_PUBLIC_SUPABASE_URL
        ? [{ protocol: "https" as const, hostname: new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname, pathname: "/storage/v1/object/public/**" }]
        : []),
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
    ],
  },
  /**
   * Güvenlik başlıkları burada duruyor, barındırıcı dosyasında değil:
   * Netlify'dan Vercel'e geçildiğinde netlify.toml'daki başlıklar sessizce
   * devre dışı kalıyordu. Buradan verilince platform bağımsız çalışıyor.
   *
   * CSP bilerek yok: Supabase, YouTube/Vimeo gömüleri ve Google Fonts için
   * ayrı izin listesi gerekiyor, yanlış yazılmış bir CSP sayfayı sessizce
   * bozar. Yayına çıktıktan sonra rapor modunda denenmeli.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
        ],
      },
      {
        // Panel hiçbir arama motoruna verilmez.
        source: "/admin/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
  async redirects() {
    return [
      // Eski istemciler /favicon.ico adresini doğrudan ister; ikon PNG
      // olduğu için 404 yerine oraya yönlendiriliyor.
      { source: "/favicon.ico", destination: "/icon.png", permanent: true },
      // Kartal ve İstanbul sayfaları tek bir Faaliyetler çatısında birleştirildi.
      { source: "/kartal", destination: "/faaliyetler", permanent: true },
      { source: "/kartal/:path*", destination: "/faaliyetler", permanent: true },
      { source: "/istanbul", destination: "/faaliyetler", permanent: true },
      { source: "/istanbul/:path*", destination: "/faaliyetler", permanent: true },
      // Eski basın/metin içeriği Faaliyetler'e, görsel medya arşivi Fotoğraf'a taşındı.
      { source: "/basin", destination: "/faaliyetler", permanent: true },
      { source: "/basin/:path*", destination: "/faaliyetler", permanent: true },
      { source: "/medya", destination: "/fotograflar", permanent: true },
      { source: "/medya/:path*", destination: "/fotograflar", permanent: true },
      { source: "/basin-medya", destination: "/fotograflar", permanent: true },
      { source: "/basin-medya/:path*", destination: "/fotograflar", permanent: true },
    ];
  },
};

export default nextConfig;

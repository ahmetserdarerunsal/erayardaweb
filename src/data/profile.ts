export const profile = {
  name: "Ekrem Eray Arda",
  title: "İBB ve Kartal Belediye Meclis Üyesi",
  description: "Ekrem Eray Arda’nın çalışmaları, açıklamaları ve medya içerikleri için kişisel kamusal web sitesi.",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export const navigation = [
  { label: "Ana Sayfa", href: "/" },
  { label: "Ekrem Eray Arda", href: "/ekrem-eray-arda" },
  { label: "Kartal", href: "/kartal" },
  { label: "İstanbul", href: "/istanbul" },
  { label: "Basın", href: "/basin" },
  { label: "Medya", href: "/medya" },
  { label: "İletişim", href: "/iletisim" },
] as const;

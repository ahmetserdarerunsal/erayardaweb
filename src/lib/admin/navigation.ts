export type AdminNavItem = {
  label: string;
  href: string;
  /** Bu aşamada henüz kurulmamış bölümler pasif gösterilir. */
  ready: boolean;
  /** Yalnızca yönetici rolüne açık. */
  yoneticiOnly?: boolean;
};

/**
 * Panelin sol menüsü. `ready: false` olanlar tıklanamaz ve "yakında"
 * etiketiyle görünür — kullanıcıya çalışmayan bir ekran açtırmamak için.
 */
export const adminNavigation: readonly AdminNavItem[] = [
  { label: "Genel Bakış", href: "/admin", ready: true },
  { label: "Fotoğraf Yönetimi", href: "/admin/fotograflar", ready: true },
  { label: "Video Yönetimi", href: "/admin/videolar", ready: true },
  { label: "Gelen Mesajlar", href: "/admin/mesajlar", ready: true, yoneticiOnly: true },
  { label: "Faaliyetler", href: "/admin/faaliyetler", ready: true },
  { label: "Medya Kütüphanesi", href: "/admin/medya", ready: true },
  { label: "Sayfa Yönetimi", href: "/admin/sayfalar", ready: true },
  { label: "Site Ayarları", href: "/admin/ayarlar", ready: true, yoneticiOnly: true },
  { label: "Kullanıcılar", href: "/admin/kullanicilar", ready: true, yoneticiOnly: true },
  { label: "İşlem Geçmişi", href: "/admin/gecmis", ready: true, yoneticiOnly: true },
];

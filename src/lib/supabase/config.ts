/**
 * Supabase yapılandırması.
 *
 * Değişkenler tanımlı değilse uygulama çökmez; `isSupabaseConfigured` false
 * döner ve panel "kurulum bekleniyor" ekranını gösterir. Böylece anahtarlar
 * girilmeden önce de site normal çalışmaya devam eder.
 */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * Publishable key — tarayıcıya gönderilir, gizli değildir.
 * Supabase'in eski adlandırmasında "anon" anahtarıydı; RLS'te yine `anon`
 * rolüne karşılık gelir. Güvenlik bu anahtarın gizliliğiyle değil, RLS
 * politikalarıyla sağlanır.
 */
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLISHABLE_KEY);

/** Yüklenen dosyaların tutulduğu Storage bucket'ı. */
export const MEDIA_BUCKET = "medya";

export const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

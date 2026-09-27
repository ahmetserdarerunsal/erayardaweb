import "server-only";

import { createClient } from "@supabase/supabase-js";
import { unstable_cache } from "next/cache";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "@/lib/supabase/config";
import type {
  Activity,
  ActivityCategoryId,
  ActivityImage,
  ActivityKind,
  ActivityLocationId,
  ActivitySource,
  PhotoAlbum,
  PublishedActivity,
  VideoEntry,
} from "@/types/content";

/**
 * Panelden yönetilen bütün içerik aynı tazeleme süresini kullanır.
 * Farklı süreler, yöneticinin "neden bu sayfa güncellenmedi" sorusuna yol açar.
 * Anında görünmesi gerektiğinde /api/revalidate tetiklenir.
 */
export const CONTENT_REVALIDATE_SECONDS = 300;

export const CONTENT_TAGS = {
  activities: "activities",
  photos: "photo-albums",
  videos: "videos",
  pages: "page-content",
  settings: "site-settings",
} as const;

export type SiteProfile = {
  name: string;
  title: string;
  description: string;
  siteUrl: string;
};

export type BiographySection = {
  number: string;
  category: string;
  title: string;
  paragraphs: readonly string[];
  subsections?: readonly { title: string; paragraphs: readonly string[] }[];
  requiresOfficialVerification?: boolean;
};

export type AboutContent = {
  heroSummary: string;
  sections: readonly BiographySection[];
};

export type SocialPlatform = {
  id: "instagram" | "facebook" | "x";
  label: string;
  href: string | null;
};

/**
 * Sitenin canlı adresi. Sitemap, robots.txt, canonical ve paylaşım görseli
 * adresleri buradan üretilir.
 *
 * `NEXT_PUBLIC_*` değişkenleri BUILD sırasında koda gömülür; yayına çıktıktan
 * sonra Vercel'de değiştirmek yetmez, yeniden deploy gerekir. Değer eksik
 * kalırsa arama motorlarına localhost adresleri gider ve bu sessizce olur —
 * bu yüzden üretim derlemesinde yüksek sesle uyarıyoruz.
 */
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

if (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(SITE_URL)) {
  console.warn(
    [
      "",
      "  UYARI: NEXT_PUBLIC_SITE_URL tanımlı değil veya hâlâ localhost.",
      `  Şu an: ${SITE_URL}`,
      "  Sitemap, robots.txt, canonical ve paylaşım görseli adresleri bu",
      "  değerden üretiliyor. Canlı alan adını ortam değişkenlerine girip",
      "  YENİDEN DEPLOY edin.",
      "",
    ].join("\n"),
  );
}

const FALLBACK_PROFILE: SiteProfile = {
  name: "Ekrem Eray Arda",
  title: "İBB ve Kartal Belediye Meclis Üyesi",
  description:
    "Ekrem Eray Arda'nın çalışmaları, açıklamaları ve medya içerikleri için kişisel kamusal web sitesi.",
  siteUrl: SITE_URL,
};

function publicClient() {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function storageUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/medya/${path
    .split("/")
    .map(encodeURIComponent)
    .join("/")}`;
}

function assertQuery(error: { message: string } | null, context: string) {
  if (error) throw new Error(`${context}: ${error.message}`);
}

export const getSiteProfile = unstable_cache(
  async (): Promise<SiteProfile> => {
    const { data, error } = await publicClient()
      .from("page_content")
      .select("published_content")
      .eq("page_key", "site")
      .eq("section_key", "profile")
      .maybeSingle();
    assertQuery(error, "Site profili okunamadı");
    return { ...FALLBACK_PROFILE, ...((data?.published_content ?? {}) as Partial<SiteProfile>) };
  },
  ["site-profile"],
  { revalidate: CONTENT_REVALIDATE_SECONDS, tags: [CONTENT_TAGS.pages] },
);

export const getAboutContent = unstable_cache(
  async (): Promise<AboutContent> => {
    const { data, error } = await publicClient()
      .from("page_content")
      .select("published_content")
      .eq("page_key", "about")
      .eq("section_key", "biography")
      .maybeSingle();
    assertQuery(error, "Biyografi okunamadı");
    const content = (data?.published_content ?? {}) as Partial<AboutContent>;
    return { heroSummary: content.heroSummary ?? "", sections: content.sections ?? [] };
  },
  ["about-content"],
  { revalidate: CONTENT_REVALIDATE_SECONDS, tags: [CONTENT_TAGS.pages] },
);

export const getSocialPlatforms = unstable_cache(
  async (): Promise<readonly SocialPlatform[]> => {
    const { data, error } = await publicClient()
      .from("site_settings")
      .select("value")
      .eq("key", "social_links")
      .maybeSingle();
    assertQuery(error, "Sosyal bağlantılar okunamadı");
    return Array.isArray(data?.value) ? (data.value as SocialPlatform[]) : [];
  },
  ["social-links"],
  { revalidate: CONTENT_REVALIDATE_SECONDS, tags: [CONTENT_TAGS.settings] },
);

type ActivityRow = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: unknown;
  event_date: string | null;
  event_end_date: string | null;
  event_date_approx: string | null;
  date_note: string | null;
  categories: string[];
  location: string;
  kind: string;
  cover_media_id: string | null;
  missing_info: string[];
  featured: boolean;
  created_at: string;
};

export const getPublishedActivities = unstable_cache(
  async (): Promise<readonly PublishedActivity[]> => {
    const client = publicClient();
    const [activitiesResult, sourcesResult, galleriesResult, mediaResult] = await Promise.all([
      client.from("activities").select("id,slug,title,summary,body,event_date,event_end_date,event_date_approx,date_note,categories,location,kind,cover_media_id,missing_info,featured,created_at").eq("status", "published"),
      client.from("activity_sources").select("activity_id,label,url,publisher,confirms,retrieved_at,sort_order").order("sort_order"),
      client.from("activity_gallery").select("activity_id,media_id,caption,sort_order").order("sort_order"),
      client.from("media_library").select("id,storage_path,alt_text,width,height"),
    ]);
    assertQuery(activitiesResult.error, "Faaliyetler okunamadı");
    assertQuery(sourcesResult.error, "Faaliyet kaynakları okunamadı");
    assertQuery(galleriesResult.error, "Faaliyet galerileri okunamadı");
    assertQuery(mediaResult.error, "Medya kayıtları okunamadı");

    const media = new Map((mediaResult.data ?? []).map((item) => [item.id, item]));
    return ((activitiesResult.data ?? []) as ActivityRow[])
      .map((row): PublishedActivity => {
        const toImage = (mediaId: string, caption?: string | null): ActivityImage | null => {
          const item = media.get(mediaId);
          return item
            ? {
                src: storageUrl(item.storage_path),
                alt: item.alt_text,
                width: item.width,
                height: item.height,
                caption: caption ?? undefined,
              }
            : null;
        };
        const gallery = (galleriesResult.data ?? [])
          .filter((item) => item.activity_id === row.id)
          .flatMap((item) => {
            const image = toImage(item.media_id, item.caption);
            return image ? [image] : [];
          });
        const sources: ActivitySource[] = (sourcesResult.data ?? [])
          .filter((item) => item.activity_id === row.id)
          .map((item) => ({
            label: item.label,
            url: item.url,
            publisher: item.publisher ?? "",
            confirms: item.confirms ?? "",
            retrieved: item.retrieved_at ?? "",
          }));
        const date = row.event_date;
        const dateApprox = row.event_date_approx;
        return {
          id: row.id,
          slug: row.slug,
          title: row.title,
          summary: row.summary,
          body: Array.isArray(row.body) ? row.body.filter((value): value is string => typeof value === "string") : [],
          date,
          endDate: row.event_end_date,
          dateApprox,
          dateNote: row.date_note ?? undefined,
          categories: row.categories as ActivityCategoryId[],
          location: row.location as ActivityLocationId,
          cover: row.cover_media_id ? toImage(row.cover_media_id) : null,
          gallery,
          kind: row.kind as ActivityKind,
          sources,
          publicationStatus: "published",
          missingInfo: row.missing_info,
          featured: row.featured,
          sortDate: date ?? `${dateApprox}-01`,
        };
      })
      .sort((a, b) => b.sortDate.localeCompare(a.sortDate) || b.id.localeCompare(a.id));
  },
  ["published-activities"],
  { revalidate: CONTENT_REVALIDATE_SECONDS, tags: [CONTENT_TAGS.activities] },
);

export async function getActivityBySlug(slug: string) {
  return (await getPublishedActivities()).find((activity) => activity.slug === slug);
}

export const getPublishedPhotoAlbums = unstable_cache(
  async (): Promise<readonly PhotoAlbum[]> => {
    const client = publicClient();
    const [albumsResult, photosResult, mediaResult] = await Promise.all([
      client.from("photo_albums").select("id,slug,title,description,cover_photo_id,sort_order,created_at,published_at").eq("status", "published").order("sort_order"),
      client.from("photos").select("id,album_id,media_id,alt_text,caption,sort_order").order("sort_order"),
      client.from("media_library").select("id,storage_path,alt_text,width,height"),
    ]);
    assertQuery(albumsResult.error, "Fotoğraf albümleri okunamadı");
    assertQuery(photosResult.error, "Fotoğraflar okunamadı");
    assertQuery(mediaResult.error, "Fotoğraf medyaları okunamadı");
    const media = new Map((mediaResult.data ?? []).map((item) => [item.id, item]));
    return (albumsResult.data ?? []).map((album) => ({
      id: album.id,
      slug: album.slug,
      title: album.title,
      description: album.description,
      coverPhotoId: album.cover_photo_id,
      status: "published" as const,
      sortOrder: album.sort_order,
      createdAt: album.created_at,
      publishedAt: album.published_at,
      photos: (photosResult.data ?? [])
        .filter((photo) => photo.album_id === album.id)
        .flatMap((photo) => {
          const asset = media.get(photo.media_id);
          return asset ? [{ id: photo.id, src: storageUrl(asset.storage_path), alt: photo.alt_text || asset.alt_text, width: asset.width, height: asset.height, caption: photo.caption, sortOrder: photo.sort_order }] : [];
        }),
    }));
  },
  ["published-photo-albums"],
  { revalidate: CONTENT_REVALIDATE_SECONDS, tags: [CONTENT_TAGS.photos] },
);

export const getPublishedVideos = unstable_cache(
  async (): Promise<readonly VideoEntry[]> => {
    const client = publicClient();
    const [videosResult, mediaResult] = await Promise.all([
      client.from("videos").select("id,slug,title,description,provider,original_url,video_id,thumbnail_url,custom_thumbnail_media_id,video_storage_path,video_mime_type,embed_status,created_at,published_at,sort_order").eq("status", "published").lte("published_at", new Date().toISOString()).order("sort_order"),
      client.from("media_library").select("id,storage_path"),
    ]);
    assertQuery(videosResult.error, "Videolar okunamadı");
    assertQuery(mediaResult.error, "Video medyaları okunamadı");
    const media = new Map((mediaResult.data ?? []).map((item) => [item.id, item.storage_path]));
    return (videosResult.data ?? []).map((video) => {
      const customThumbnailPath = video.custom_thumbnail_media_id
        ? media.get(video.custom_thumbnail_media_id)
        : null;
      return ({
      id: video.id,
      slug: video.slug,
      title: video.title,
      description: video.description,
      provider: video.provider,
      originalUrl: video.original_url,
      videoId: video.video_id,
      thumbnailUrl: video.thumbnail_url,
      customThumbnail: customThumbnailPath ? storageUrl(customThumbnailPath) : null,
      videoFileUrl: video.video_storage_path ? storageUrl(video.video_storage_path) : null,
      videoFileMimeType: video.video_mime_type,
      embedStatus: video.embed_status,
      createdAt: video.created_at,
      publishedAt: video.published_at,
      status: "published" as const,
      sortOrder: video.sort_order,
      });
    });
  },
  ["published-videos"],
  { revalidate: CONTENT_REVALIDATE_SECONDS, tags: [CONTENT_TAGS.videos] },
);

export const activityCategories: readonly { id: ActivityCategoryId; label: string }[] = [
  { id: "meclis", label: "Meclis Çalışmaları" },
  { id: "saha", label: "Sahadan" },
  { id: "etkinlikler", label: "Etkinlikler" },
  { id: "genclik-spor", label: "Gençlik ve Spor" },
  { id: "ziyaretler", label: "Ziyaretler" },
];

export const activityKindLabels: Record<ActivityKind, string> = { calisma: "Yürütülen çalışma", katilim: "Katılım sağlanan etkinlik" };
const locations: Record<ActivityLocationId, string> = { kartal: "Kartal", istanbul: "İstanbul", ankara: "Ankara", diger: "Diğer" };
export const categoryLabel = (id: ActivityCategoryId) => activityCategories.find((item) => item.id === id)?.label ?? id;
export const locationLabel = (id: ActivityLocationId) => locations[id] ?? id;

const dayFormatter = new Intl.DateTimeFormat("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
const monthFormatter = new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" });
export function formatActivityRange(activity: Activity): string {
  if (activity.date) {
    const start = dayFormatter.format(new Date(`${activity.date}T00:00:00`));
    return activity.endDate && activity.endDate !== activity.date
      ? `${start} – ${dayFormatter.format(new Date(`${activity.endDate}T00:00:00`))}`
      : start;
  }
  return activity.dateApprox ? monthFormatter.format(new Date(`${activity.dateApprox}-01T00:00:00`)) : "";
}
export const activityDateTimeAttr = (activity: Activity) => activity.date ?? activity.dateApprox ?? undefined;

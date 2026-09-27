import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MediaManager, type MediaItem } from "./MediaManager";

export const metadata: Metadata = { title: "Medya Kütüphanesi" };

export default async function AdminMediaPage() {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();

  // Kullanım, dosya başına ayrı sorgu yerine tek seferde çekilip eşleniyor;
  // aksi hâlde her dosya için dört sorgu atmak gerekirdi.
  const [mediaResult, photos, gallery, covers, videoThumbs, albums, activities] =
    await Promise.all([
      supabase
        .from("media_library")
        .select("id,storage_path,file_name,mime_type,size_bytes,width,height,alt_text,created_at")
        .order("created_at", { ascending: false }),
      supabase.from("photos").select("media_id,album_id"),
      supabase.from("activity_gallery").select("media_id,activity_id"),
      supabase.from("activities").select("id,title,cover_media_id").not("cover_media_id", "is", null),
      supabase
        .from("videos")
        .select("id,title,custom_thumbnail_media_id")
        .not("custom_thumbnail_media_id", "is", null),
      supabase.from("photo_albums").select("id,title"),
      supabase.from("activities").select("id,title"),
    ]);

  const albumAdi = new Map((albums.data ?? []).map((a) => [a.id, a.title]));
  const faaliyetAdi = new Map((activities.data ?? []).map((a) => [a.id, a.title]));

  const kullanim = new Map<string, string[]>();
  const ekle = (mediaId: string | null, etiket: string) => {
    if (!mediaId) return;
    const mevcut = kullanim.get(mediaId) ?? [];
    if (!mevcut.includes(etiket)) mevcut.push(etiket);
    kullanim.set(mediaId, mevcut);
  };

  for (const row of photos.data ?? []) {
    ekle(row.media_id, `albüm: ${albumAdi.get(row.album_id) ?? "bilinmeyen"}`);
  }
  for (const row of gallery.data ?? []) {
    ekle(row.media_id, `paylaşım galerisi: ${faaliyetAdi.get(row.activity_id) ?? "bilinmeyen"}`);
  }
  for (const row of covers.data ?? []) {
    ekle(row.cover_media_id, `paylaşım kapağı: ${row.title}`);
  }
  for (const row of videoThumbs.data ?? []) {
    ekle(row.custom_thumbnail_media_id, `video kapağı: ${row.title}`);
  }

  const media: MediaItem[] = (mediaResult.data ?? []).map((item) => ({
    ...item,
    usage: kullanim.get(item.id) ?? [],
  }));

  const totalBytes = media.reduce((sum, item) => sum + item.size_bytes, 0);

  return (
    <MediaManager
      media={media}
      canDelete={session.role === "yonetici"}
      totalBytes={totalBytes}
    />
  );
}

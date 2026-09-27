import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PhotoManager } from "./PhotoManager";

export const metadata: Metadata = { title: "Fotoğraf Yönetimi" };

export default async function AdminPhotosPage() {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const [albums, photos, media] = await Promise.all([
    supabase.from("photo_albums").select("id,title,description,status,cover_photo_id,sort_order").order("sort_order"),
    supabase.from("photos").select("id,album_id,media_id,sort_order").order("sort_order"),
    supabase.from("media_library").select("id,storage_path,alt_text,width,height"),
  ]);
  // NOT: Buraya `key` vermeyin. İçeriğe bağlı bir key, her kapak/sıra
  // değişiminde bileşeni yeniden kurar ve seçili albümü sıfırlar.
  // Sunucu verisiyle eşitleme PhotoManager içinde yapılıyor.
  return (
    <PhotoManager
      albums={albums.data ?? []}
      photos={photos.data ?? []}
      media={media.data ?? []}
      canPublish={session.canPublish}
    />
  );
}

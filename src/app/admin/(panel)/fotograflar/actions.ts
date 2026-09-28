"use server";

import { revalidatePath, updateTag } from "next/cache";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdminSession, requirePublisher, requireYonetici } from "@/lib/admin/session";
import { CONTENT_TAGS } from "@/lib/public-content";
import { MEDIA_BUCKET } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ActionResult = { ok: boolean; message: string };

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function refreshPhotos() {
  updateTag(CONTENT_TAGS.photos);
  revalidatePath("/fotograflar");
}

export async function createAlbum(input: { title: string; description: string }): Promise<ActionResult> {
  const session = await requireAdminSession();
  const title = input.title.trim();
  if (title.length < 2 || title.length > 120) return { ok: false, message: "Albüm adı 2–120 karakter olmalı." };
  const supabase = await createSupabaseServerClient();
  const base = slugify(title) || "album";
  const { error } = await supabase.from("photo_albums").insert({
    title,
    description: input.description.trim() || null,
    slug: `${base}-${Date.now().toString(36)}`,
    created_by: session.userId,
  });
  if (error) return { ok: false, message: error.message };
  refreshPhotos();
  return { ok: true, message: "Albüm oluşturuldu." };
}

export type UploadedPhoto = {
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  altText: string;
};

export async function registerPhotos(albumId: string, files: UploadedPhoto[]): Promise<ActionResult> {
  const session = await requireAdminSession();
  if (!albumId || files.length === 0 || files.length > 30) return { ok: false, message: "Geçerli bir albüm ve en fazla 30 fotoğraf seçin." };
  if (files.some((file) => file.width < 1 || file.height < 1 || file.sizeBytes < 1 || !file.storagePath.startsWith(`albumler/${albumId}/`))) {
    return { ok: false, message: "Yükleme bilgileri geçersiz." };
  }
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase.from("photos").select("id", { count: "exact", head: true }).eq("album_id", albumId);
  let order = count ?? 0;
  for (const file of files) {
    const { data: media, error: mediaError } = await supabase.from("media_library").insert({
      storage_path: file.storagePath,
      file_name: file.fileName.slice(0, 255),
      mime_type: file.mimeType,
      size_bytes: file.sizeBytes,
      width: file.width,
      height: file.height,
      alt_text: file.altText.trim().slice(0, 300),
      uploaded_by: session.userId,
    }).select("id").single();
    if (mediaError || !media) return { ok: false, message: mediaError?.message ?? "Medya kaydı oluşturulamadı." };
    const { error: photoError } = await supabase.from("photos").insert({ album_id: albumId, media_id: media.id, sort_order: order++ });
    if (photoError) return { ok: false, message: photoError.message };
  }
  refreshPhotos();
  return { ok: true, message: `${files.length} fotoğraf albüme eklendi.` };
}

export async function reorderPhotos(albumId: string, photoIds: string[]): Promise<ActionResult> {
  await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const results = await Promise.all(photoIds.map((id, sort_order) => supabase.from("photos").update({ sort_order }).eq("id", id).eq("album_id", albumId)));
  const failed = results.find((result) => result.error);
  if (failed?.error) return { ok: false, message: failed.error.message };
  refreshPhotos();
  return { ok: true, message: "Fotoğraf sırası kaydedildi." };
}

export async function setAlbumCover(albumId: string, photoId: string): Promise<ActionResult> {
  await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const { data: photo } = await supabase.from("photos").select("id").eq("id", photoId).eq("album_id", albumId).maybeSingle();
  if (!photo) return { ok: false, message: "Fotoğraf bu albüme ait değil." };
  const { error } = await supabase.from("photo_albums").update({ cover_photo_id: photoId }).eq("id", albumId);
  if (error) return { ok: false, message: error.message };
  refreshPhotos();
  return { ok: true, message: "Albüm kapağı güncellendi." };
}

export async function setAlbumPublication(albumId: string, publish: boolean): Promise<ActionResult> {
  await requirePublisher();
  const supabase = await createSupabaseServerClient();
  if (publish) {
    const { count } = await supabase.from("photos").select("id", { count: "exact", head: true }).eq("album_id", albumId);
    if (!count) return { ok: false, message: "Boş albüm yayımlanamaz." };
  }
  const { error } = await supabase.from("photo_albums").update({
    status: publish ? "published" : "draft",
    published_at: publish ? new Date().toISOString() : null,
  }).eq("id", albumId);
  if (error) return { ok: false, message: error.message };
  refreshPhotos();
  return { ok: true, message: publish ? "Albüm yayımlandı." : "Albüm taslağa alındı." };
}

/**
 * Albümden bir fotoğrafı kaldırır.
 *
 * Kayıt silinince `photo_albums.cover_photo_id` şema gereği null olur, yani
 * kapak seçiliyse kapak seçimi düşer ve ilk fotoğrafa geri dönülür.
 *
 * Altındaki dosya başka hiçbir yerde kullanılmıyorsa depodan da silinir;
 * aksi hâlde kütüphanede sahipsiz dosya birikir. Depodan silme yalnızca
 * yöneticiye açık olduğundan, editör sildiğinde dosya kütüphanede kalır ve
 * "kullanılmayan" olarak görünür.
 */
export async function deletePhoto(photoId: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();

  const { data: photo } = await supabase
    .from("photos")
    .select("id, media_id")
    .eq("id", photoId)
    .maybeSingle();

  if (!photo) return { ok: false, message: "Fotoğraf bulunamadı." };

  const { error } = await supabase.from("photos").delete().eq("id", photoId);
  if (error) return { ok: false, message: error.message };

  let dosyaSilindi = false;
  if (session.role === "yonetici") {
    const [baskaFoto, galeri, kapak, videoKapak] = await Promise.all([
      supabase.from("photos").select("id", { count: "exact", head: true }).eq("media_id", photo.media_id),
      supabase.from("activity_gallery").select("media_id", { count: "exact", head: true }).eq("media_id", photo.media_id),
      supabase.from("activities").select("id", { count: "exact", head: true }).eq("cover_media_id", photo.media_id),
      supabase.from("videos").select("id", { count: "exact", head: true }).eq("custom_thumbnail_media_id", photo.media_id),
    ]);

    const kalanKullanim =
      (baskaFoto.count ?? 0) + (galeri.count ?? 0) + (kapak.count ?? 0) + (videoKapak.count ?? 0);

    if (kalanKullanim === 0) {
      const { data: media } = await supabase
        .from("media_library")
        .select("storage_path")
        .eq("id", photo.media_id)
        .maybeSingle();

      if (media) {
        await supabase.storage.from(MEDIA_BUCKET).remove([media.storage_path]);
        await supabase.from("media_library").delete().eq("id", photo.media_id);
        dosyaSilindi = true;
      }
    }
  }

  await writeAudit(session, {
    action: "sildi",
    entityType: "fotoğraf",
    entityId: photoId,
    changes: { dosyaDaSilindi: dosyaSilindi },
  });

  refreshPhotos();
  return {
    ok: true,
    message: dosyaSilindi
      ? "Fotoğraf silindi, dosya depodan da kaldırıldı."
      : "Fotoğraf albümden kaldırıldı. Dosya Medya Kütüphanesi'nde duruyor.",
  };
}

/** Albümü ve içindeki fotoğraf kayıtlarını siler. Yalnızca yönetici. */
export async function deleteAlbum(albumId: string): Promise<ActionResult> {
  const session = await requireYonetici();
  const supabase = await createSupabaseServerClient();

  const { data: album } = await supabase
    .from("photo_albums")
    .select("title, status")
    .eq("id", albumId)
    .maybeSingle();

  if (!album) return { ok: false, message: "Albüm bulunamadı." };
  if (album.status === "published") {
    return { ok: false, message: "Yayındaki albüm silinemez. Önce taslağa alın." };
  }

  // `photos` kayıtları cascade ile gider; dosyalar Medya Kütüphanesi'nde
  // "kullanılmayan" olarak kalır ve oradan toplu temizlenebilir.
  const { error } = await supabase.from("photo_albums").delete().eq("id", albumId);
  if (error) return { ok: false, message: error.message };

  await writeAudit(session, {
    action: "sildi",
    entityType: "albüm",
    entityId: albumId,
    changes: { başlık: album.title },
  });

  refreshPhotos();
  return {
    ok: true,
    message: "Albüm silindi. Fotoğraf dosyaları Medya Kütüphanesi'nde kaldı.",
  };
}

"use server";

import { revalidatePath, updateTag } from "next/cache";
import { requireAdminSession, requirePublisher } from "@/lib/admin/session";
import { CONTENT_TAGS } from "@/lib/public-content";
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

"use server";

import { revalidatePath, updateTag } from "next/cache";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdminSession, requirePublisher, requireYonetici } from "@/lib/admin/session";
import { CONTENT_TAGS } from "@/lib/public-content";
import { MEDIA_BUCKET } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { analyzeVideoUrl, resolveBestYoutubeThumbnail } from "@/lib/video-providers";
import type { ActionResult } from "../fotograflar/actions";

function slugify(value: string) {
  return value.toLocaleLowerCase("tr-TR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80);
}

function refreshVideos() {
  updateTag(CONTENT_TAGS.videos);
  revalidatePath("/videolar");
}

async function getOEmbed(provider: string, url: string) {
  const endpoint = provider === "youtube"
    ? `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`
    : provider === "vimeo"
      ? `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`
      : null;
  if (!endpoint) return null;
  try {
    const response = await fetch(endpoint, { signal: AbortSignal.timeout(7000), cache: "no-store" });
    if (!response.ok) return null;
    return (await response.json()) as { title?: string; thumbnail_url?: string };
  } catch {
    return null;
  }
}

/**
 * Platformun verdiği kapak yerine mevcut en yüksek çözünürlüklüyü seçer.
 * YouTube oEmbed hep hqdefault (480×360) döndürdüğü için kartlarda bulanık
 * ve siyah bantlı görünüyordu.
 */
async function bestThumbnail(
  provider: string,
  videoId: string | null,
  fallback: string | null | undefined,
): Promise<string | null> {
  if (provider === "youtube" && videoId) {
    return resolveBestYoutubeThumbnail(videoId);
  }
  return fallback ?? null;
}

export async function createVideo(input: { url: string; title: string; description: string }): Promise<ActionResult> {
  const session = await requireAdminSession();
  const analysis = analyzeVideoUrl(input.url);
  if (!analysis.supported || !analysis.provider || !analysis.originalUrl) return { ok: false, message: analysis.message ?? "Video bağlantısı desteklenmiyor." };
  const metadata = await getOEmbed(analysis.provider, analysis.originalUrl);
  const title = input.title.trim() || metadata?.title?.trim() || "";
  if (title.length < 2 || title.length > 180) return { ok: false, message: "Başlık 2–180 karakter olmalı. Platform başlığı alınamadıysa başlığı elle girin." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("videos").insert({
    slug: `${slugify(title) || "video"}-${Date.now().toString(36)}`,
    title,
    description: input.description.trim(),
    provider: analysis.provider,
    original_url: analysis.originalUrl,
    video_id: analysis.videoId,
    thumbnail_url: await bestThumbnail(analysis.provider, analysis.videoId, metadata?.thumbnail_url),
    embed_status: metadata ? "allowed" : "unknown",
    created_by: session.userId,
  });
  if (error) return { ok: false, message: error.message };
  refreshVideos();
  return { ok: true, message: metadata ? "Video ve platform bilgileri eklendi." : "Video taslak olarak eklendi; platform bilgileri otomatik doğrulanamadı." };
}

export async function setVideoPublication(videoId: string, publish: boolean): Promise<ActionResult> {
  const session = await requirePublisher();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("videos").update({ status: publish ? "published" : "draft", published_at: publish ? new Date().toISOString() : null }).eq("id", videoId);
  if (error) return { ok: false, message: error.message };

  await writeAudit(session, {
    action: publish ? "yayımladı" : "taslağa aldı",
    entityType: "video",
    entityId: videoId,
  });

  refreshVideos();
  return { ok: true, message: publish ? "Video yayımlandı." : "Video taslağa alındı." };
}


/** Başlık ve açıklamayı düzenler. Bozuk karakterli başlıkları düzeltmek için. */
export async function updateVideoDetails(
  videoId: string,
  input: { title: string; description: string },
): Promise<ActionResult> {
  await requireAdminSession();
  const title = input.title.trim();
  if (title.length < 2 || title.length > 180) {
    return { ok: false, message: "Başlık 2–180 karakter olmalı." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("videos")
    .update({ title, description: input.description.trim().slice(0, 2000) })
    .eq("id", videoId);

  if (error) return { ok: false, message: error.message };
  refreshVideos();
  return { ok: true, message: "Video bilgileri güncellendi." };
}

/** Platformdan gelen kapağı en yüksek çözünürlükle yeniden çeker. */
export async function refreshVideoThumbnail(videoId: string): Promise<ActionResult> {
  await requireAdminSession();
  const supabase = await createSupabaseServerClient();

  const { data: video, error: readError } = await supabase
    .from("videos")
    .select("provider, video_id, original_url")
    .eq("id", videoId)
    .maybeSingle();

  if (readError || !video) return { ok: false, message: readError?.message ?? "Video bulunamadı." };
  if (video.provider !== "youtube" || !video.video_id) {
    return { ok: false, message: "Bu platform için otomatik kapak yenileme desteklenmiyor." };
  }

  const url = await resolveBestYoutubeThumbnail(video.video_id);
  const { error } = await supabase.from("videos").update({ thumbnail_url: url }).eq("id", videoId);
  if (error) return { ok: false, message: error.message };

  refreshVideos();
  const size = url.split("/").pop()?.replace(".jpg", "") ?? "";
  return { ok: true, message: `Kapak yenilendi (${size}).` };
}

export type UploadedThumbnail = {
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
};

/** Yöneticinin yüklediği kapak, platform kapağının yerine geçer. */
export async function setVideoCustomThumbnail(
  videoId: string,
  file: UploadedThumbnail,
): Promise<ActionResult> {
  const session = await requireAdminSession();

  if (!file.storagePath.startsWith(`videolar/${videoId}/`) || file.width < 1 || file.height < 1) {
    return { ok: false, message: "Yükleme bilgileri geçersiz." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: media, error: mediaError } = await supabase
    .from("media_library")
    .insert({
      storage_path: file.storagePath,
      file_name: file.fileName.slice(0, 255),
      mime_type: file.mimeType,
      size_bytes: file.sizeBytes,
      width: file.width,
      height: file.height,
      alt_text: "",
      uploaded_by: session.userId,
    })
    .select("id")
    .single();

  if (mediaError || !media) {
    return { ok: false, message: mediaError?.message ?? "Medya kaydı oluşturulamadı." };
  }

  const { error } = await supabase
    .from("videos")
    .update({ custom_thumbnail_media_id: media.id })
    .eq("id", videoId);

  if (error) return { ok: false, message: error.message };
  refreshVideos();
  return { ok: true, message: "Kapak fotoğrafı ayarlandı." };
}

/** Yüklenen kapağı kaldırır; platform kapağına geri dönülür. */
export async function clearVideoCustomThumbnail(videoId: string): Promise<ActionResult> {
  await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("videos")
    .update({ custom_thumbnail_media_id: null })
    .eq("id", videoId);

  if (error) return { ok: false, message: error.message };
  refreshVideos();
  return { ok: true, message: "Kapak kaldırıldı, platform görseli kullanılacak." };
}

/**
 * Videoyu siler. Şemadaki politika gereği yalnızca yönetici.
 *
 * Yayındaki video doğrudan silinmez: tek tıkla canlı sayfadan içerik
 * kaldırmak, önce taslağa alıp sonra silmekten daha kolay olmamalı.
 *
 * Yöneticinin yüklediği kapak başka yerde kullanılmıyorsa depodan da
 * kaldırılır; platformdan gelen kapak zaten bizde tutulmuyor.
 */
export async function deleteVideo(videoId: string): Promise<ActionResult> {
  const session = await requireYonetici();
  const supabase = await createSupabaseServerClient();

  const { data: video } = await supabase
    .from("videos")
    .select("title, status, custom_thumbnail_media_id")
    .eq("id", videoId)
    .maybeSingle();

  if (!video) return { ok: false, message: "Video bulunamadı." };
  if (video.status === "published") {
    return { ok: false, message: "Yayındaki video silinemez. Önce taslağa alın." };
  }

  const { error } = await supabase.from("videos").delete().eq("id", videoId);
  if (error) return { ok: false, message: error.message };

  let kapakSilindi = false;
  if (video.custom_thumbnail_media_id) {
    const mediaId = video.custom_thumbnail_media_id;
    const [foto, galeri, kapak, baskaVideo] = await Promise.all([
      supabase.from("photos").select("id", { count: "exact", head: true }).eq("media_id", mediaId),
      supabase.from("activity_gallery").select("media_id", { count: "exact", head: true }).eq("media_id", mediaId),
      supabase.from("activities").select("id", { count: "exact", head: true }).eq("cover_media_id", mediaId),
      supabase.from("videos").select("id", { count: "exact", head: true }).eq("custom_thumbnail_media_id", mediaId),
    ]);

    const kalan =
      (foto.count ?? 0) + (galeri.count ?? 0) + (kapak.count ?? 0) + (baskaVideo.count ?? 0);

    if (kalan === 0) {
      const { data: media } = await supabase
        .from("media_library")
        .select("storage_path")
        .eq("id", mediaId)
        .maybeSingle();
      if (media) {
        await supabase.storage.from(MEDIA_BUCKET).remove([media.storage_path]);
        await supabase.from("media_library").delete().eq("id", mediaId);
        kapakSilindi = true;
      }
    }
  }

  await writeAudit(session, {
    action: "sildi",
    entityType: "video",
    entityId: videoId,
    changes: { başlık: video.title, kapakDaSilindi: kapakSilindi },
  });

  refreshVideos();
  return {
    ok: true,
    message: kapakSilindi ? "Video ve yüklenen kapağı silindi." : "Video silindi.",
  };
}

"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath, updateTag } from "next/cache";
import { requireAdminSession, requirePublisher, requireYonetici } from "@/lib/admin/session";
import { readImageInfo } from "@/lib/image-dimensions";
import { CONTENT_TAGS } from "@/lib/public-content";
import {
  analyzeSocialPostUrl,
  fetchSocialPost,
  type FetchedSocialPost,
  type PostImage,
} from "@/lib/social-posts";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, MEDIA_BUCKET } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActivityCategoryId, ActivityLocationId } from "@/types/content";
import type { ActionResult } from "../fotograflar/actions";

type SupabaseServerClient = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function slugify(value: string) {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function refreshActivities() {
  updateTag(CONTENT_TAGS.activities);
  revalidatePath("/faaliyetler");
}

const VALID_CATEGORIES: readonly ActivityCategoryId[] = [
  "meclis",
  "saha",
  "etkinlikler",
  "genclik-spor",
  "ziyaretler",
];
const VALID_LOCATIONS: readonly ActivityLocationId[] = ["kartal", "istanbul", "ankara", "diger"];

const EXACT_DATE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;
const MONTH_ONLY = /^\d{4}-(?:0[1-9]|1[0-2])$/;

/** Metni kelime sınırında keser; ortasından bölünmüş kelime bırakmaz. */
function truncateAtWord(value: string, limit: number): string {
  if (value.length <= limit) return value;
  const cut = value.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Gönderilerin başlığı yoktur. Uydurmak yerine metnin ilk cümlesini başlık
 * olarak öneriyoruz — bilgi yine gönderinin kendisinden geliyor. Yönetici
 * panelde bunu her zaman değiştirebilir.
 */
function deriveTitle(post: FetchedSocialPost): string {
  const firstLine = post.text.split("\n").map((line) => line.trim()).find(Boolean);
  if (!firstLine) return `X gönderisi (@${post.authorHandle})`.slice(0, 180);

  const sentence = firstLine.split(/(?<=[.!?…])\s/)[0] ?? firstLine;
  return truncateAtWord(sentence, 90);
}

/**
 * Gönderi metninin tamamı TEK alana, özete yazılır; gövde boş bırakılır.
 *
 * Önce özete kısaltılmış bir alıntı, gövdeye de tam metin konuyordu; detay
 * sayfası ikisini de gösterdiği için aynı yazı hem üstte hem altta
 * çıkıyordu. Paragraf araları korunuyor — detay sayfası `pre-line` ile
 * basıyor, kartta ise satır sonları boşluğa dönüşüp iki satıra kırpılıyor.
 */
function splitPostText(text: string): { summary: string; body: string[] } {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((part) => part.replace(/\n/g, " ").trim())
    .filter(Boolean);

  return { summary: paragraphs.join("\n\n"), body: [] };
}

/**
 * Gönderi görselini kendi depomuza indirir.
 *
 * Uzak adresi doğrudan kullanmıyoruz: gönderi silinirse veya X adresleri
 * değişirse sitedeki kapak kırılırdı. `media_library.width/height` zorunlu
 * olduğu için boyutu okunamayan dosya kaydedilmez.
 */
async function importImage(
  supabase: SupabaseServerClient,
  activityId: string,
  imageUrl: string,
  userId: string,
): Promise<string | null> {
  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(15000),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const contentType = (response.headers.get("content-type") ?? "").split(";")[0].trim();
    if (!ALLOWED_IMAGE_TYPES.includes(contentType as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      return null;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_UPLOAD_BYTES) return null;

    const info = readImageInfo(bytes);
    if (!info) return null;

    const extension = contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
    const storagePath = `faaliyetler/${activityId}/${randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, bytes, { contentType, upsert: false });
    if (uploadError) return null;

    const { data: media, error: mediaError } = await supabase
      .from("media_library")
      .insert({
        storage_path: storagePath,
        file_name: storagePath.split("/").pop() ?? "gorsel.jpg",
        mime_type: contentType,
        size_bytes: bytes.length,
        width: info.width,
        height: info.height,
        alt_text: "",
        uploaded_by: userId,
      })
      .select("id")
      .single();

    return mediaError ? null : (media?.id ?? null);
  } catch {
    return null;
  }
}

/**
 * Bir X gönderisinden taslak faaliyet oluşturur.
 *
 * Kayıt bilerek TASLAK açılır: başlık gönderiden türetilmiştir, kategori ve
 * konum henüz bilinmiyordur. Yayımlamadan önce yöneticinin gözden geçirmesi
 * gerekir.
 */
export async function createActivityFromPost(url: string): Promise<ActionResult> {
  const session = await requireAdminSession();

  const result = await fetchSocialPost(url);
  if (!result.ok) return { ok: false, message: result.message };

  const post = result.post;
  const { summary, body } = splitPostText(post.text);
  const title = deriveTitle(post);

  const missingInfo: string[] = [];
  if (!post.date) missingInfo.push("Gönderi tarihi okunamadı, elle girilmeli.");
  missingInfo.push("Konum ve kategori seçilmedi.");
  // Gönderi, faaliyetin kendisini değil yalnızca paylaşıldığını kanıtlar.
  missingInfo.push("Faaliyeti doğrulayan bağımsız bir kaynak eklenmedi.");

  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("activity_sources")
    .select("activity_id")
    .eq("url", post.canonicalUrl)
    .maybeSingle();
  if (existing) {
    return { ok: false, message: "Bu gönderi zaten bir faaliyet kaydına bağlı." };
  }

  const { data: activity, error } = await supabase
    .from("activities")
    .insert({
      slug: `${slugify(title) || "faaliyet"}-${Date.now().toString(36)}`,
      title,
      summary,
      body,
      event_date: post.date,
      location: "diger",
      kind: "katilim",
      status: "draft",
      missing_info: missingInfo,
      created_by: session.userId,
      updated_by: session.userId,
    })
    .select("id")
    .single();

  if (error || !activity) {
    return { ok: false, message: error?.message ?? "Faaliyet oluşturulamadı." };
  }

  const { error: sourceError } = await supabase.from("activity_sources").insert({
    activity_id: activity.id,
    label: `@${post.authorHandle} gönderisi`,
    url: post.canonicalUrl,
    publisher: "X",
    confirms: "Gönderinin içeriği ve paylaşıldığı tarih (birincil kaynak).",
    retrieved_at: new Date().toISOString().slice(0, 10),
  });

  const alinan = await importPostImages(supabase, activity.id, post.images, session.userId);

  refreshActivities();

  const notes = [
    post.images.length === 0
      ? "gönderide fotoğraf yok"
      : `${alinan}/${post.images.length} fotoğraf alındı`,
    sourceError ? "KAYNAK EKLENEMEDİ" : "gönderi kaynak olarak eklendi",
  ];
  return {
    ok: true,
    message: `Taslak oluşturuldu (${notes.join(", ")}). Bilgileri gözden geçirip yayımlayın.`,
  };
}

/**
 * Gönderinin bütün fotoğraflarını indirir: ilki kapak, kalanlar galeri.
 *
 * Tek tek indiriliyor; biri başarısız olursa diğerleri yine de kaydedilsin
 * diye. Geri dönen sayı gerçekten alınan fotoğraf sayısıdır, denenen değil.
 */
async function importPostImages(
  supabase: SupabaseServerClient,
  activityId: string,
  images: readonly PostImage[],
  userId: string,
  options: { setCover: boolean; galleryFrom?: number } = { setCover: true },
): Promise<number> {
  const mediaIds: string[] = [];

  for (const image of images) {
    const mediaId = await importImage(supabase, activityId, image.url, userId);
    if (mediaId) mediaIds.push(mediaId);
  }

  if (mediaIds.length === 0) return 0;

  // Kapak yalnızca henüz yoksa atanır; yenileme sırasında mevcut kapağın
  // üzerine yazmak yöneticinin seçtiği görseli sessizce değiştirirdi.
  const galleryIds = options.setCover ? mediaIds.slice(1) : mediaIds;
  if (options.setCover) {
    await supabase
      .from("activities")
      .update({ cover_media_id: mediaIds[0] })
      .eq("id", activityId);
  }

  if (galleryIds.length > 0) {
    const offset = options.galleryFrom ?? 0;
    await supabase.from("activity_gallery").insert(
      galleryIds.map((mediaId, index) => ({
        activity_id: activityId,
        media_id: mediaId,
        sort_order: offset + index,
      })),
    );
  }

  return mediaIds.length;
}

/**
 * Kaydı bağlı olduğu X gönderisinden yeniden okur.
 *
 * Eski sürüm metni 220 karakterde kesiyor ve yalnızca ilk fotoğrafı
 * alıyordu; bu eylem o kayıtları elle düzeltmeden tamamlamayı sağlar.
 * Başlık, kategori, konum gibi elle girilen alanlara dokunulmaz.
 */
export async function refreshActivityFromPost(activityId: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();

  const { data: sources } = await supabase
    .from("activity_sources")
    .select("url")
    .eq("activity_id", activityId)
    .eq("publisher", "X");

  const postUrl = sources?.find((item) => analyzeSocialPostUrl(item.url).supported)?.url;
  if (!postUrl) {
    return { ok: false, message: "Bu kayda bağlı bir X gönderisi yok." };
  }

  const result = await fetchSocialPost(postUrl);
  if (!result.ok) return { ok: false, message: result.message };
  const post = result.post;

  const { summary } = splitPostText(post.text);
  if (!summary) {
    return { ok: false, message: "Gönderi metni okunamadı; kayıt değiştirilmedi." };
  }

  const guncelleme: Record<string, unknown> = { summary, body: [], updated_by: session.userId };
  if (post.date) guncelleme.event_date = post.date;

  const { error } = await supabase.from("activities").update(guncelleme).eq("id", activityId);
  if (error) return { ok: false, message: error.message };

  // Eksik fotoğraflar tamamlanır; zaten kayıtlı olanlar yeniden indirilmez.
  const { count: mevcutGaleri } = await supabase
    .from("activity_gallery")
    .select("*", { count: "exact", head: true })
    .eq("activity_id", activityId);
  const { data: kayit } = await supabase
    .from("activities")
    .select("cover_media_id")
    .eq("id", activityId)
    .maybeSingle();

  const kayitliGorsel = (kayit?.cover_media_id ? 1 : 0) + (mevcutGaleri ?? 0);
  let eklenen = 0;
  if (post.images.length > kayitliGorsel) {
    eklenen = await importPostImages(
      supabase,
      activityId,
      post.images.slice(kayitliGorsel),
      session.userId,
      { setCover: !kayit?.cover_media_id, galleryFrom: mevcutGaleri ?? 0 },
    );
  }

  refreshActivities();
  return {
    ok: true,
    message: `Gönderiden güncellendi: ${summary.length} karakter metin${
      eklenen ? `, ${eklenen} fotoğraf eklendi` : ""
    }.`,
  };
}

export async function createBlankActivity(title: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  const clean = title.trim();
  if (clean.length < 2 || clean.length > 180) {
    return { ok: false, message: "Başlık 2–180 karakter olmalı." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("activities").insert({
    slug: `${slugify(clean) || "faaliyet"}-${Date.now().toString(36)}`,
    title: clean,
    location: "diger",
    status: "draft",
    missing_info: ["Tarih, konum ve kategori girilmedi."],
    created_by: session.userId,
    updated_by: session.userId,
  });

  if (error) return { ok: false, message: error.message };
  refreshActivities();
  return { ok: true, message: "Boş taslak oluşturuldu." };
}

export type ActivityFormInput = {
  title: string;
  /** Paylaşımın tam metni. Ayrı bir gövde alanı yok: detay sayfası tek
      metin gösteriyor, ikiye bölününce aynı yazı iki kez çıkıyordu. */
  summary: string;
  /** YYYY-MM-DD, YYYY-MM veya boş. */
  eventDate: string;
  eventDateApprox: string;
  location: string;
  categories: string[];
  missingInfo: string;
};

export async function updateActivity(
  activityId: string,
  input: ActivityFormInput,
): Promise<ActionResult> {
  const session = await requireAdminSession();

  const title = input.title.trim();
  if (title.length < 2 || title.length > 180) {
    return { ok: false, message: "Başlık 2–180 karakter olmalı." };
  }

  const eventDate = input.eventDate.trim();
  const eventDateApprox = input.eventDateApprox.trim();
  if (eventDate && !EXACT_DATE.test(eventDate)) {
    return { ok: false, message: "Tarih GG.AA.YYYY takviminden seçilmeli." };
  }
  if (eventDateApprox && !MONTH_ONLY.test(eventDateApprox)) {
    return { ok: false, message: "Yaklaşık tarih YYYY-AA biçiminde olmalı (örnek: 2026-09)." };
  }

  const categories = input.categories.filter((value): value is ActivityCategoryId =>
    VALID_CATEGORIES.includes(value as ActivityCategoryId),
  );
  const location = VALID_LOCATIONS.includes(input.location as ActivityLocationId)
    ? input.location
    : "diger";

  const supabase = await createSupabaseServerClient();

  const { data: current } = await supabase
    .from("activities")
    .select("status")
    .eq("id", activityId)
    .maybeSingle();

  // Veritabanı kısıtı bunu zaten reddeder; mesajı anlaşılır tutmak için
  // burada yakalıyoruz.
  if (current?.status === "published" && !eventDate && !eventDateApprox) {
    return {
      ok: false,
      message: "Yayımdaki bir kaydın tarihi boşaltılamaz. Önce taslağa alın.",
    };
  }

  const { error } = await supabase
    .from("activities")
    .update({
      title,
      summary: input.summary.trim().slice(0, 4000),
      event_date: eventDate || null,
      event_date_approx: eventDate ? null : eventDateApprox || null,
      categories,
      location,
      missing_info: input.missingInfo
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      updated_by: session.userId,
    })
    .eq("id", activityId);

  if (error) return { ok: false, message: error.message };
  refreshActivities();
  return { ok: true, message: "Faaliyet güncellendi." };
}

export async function setActivityPublication(
  activityId: string,
  publish: boolean,
): Promise<ActionResult> {
  await requirePublisher();
  const supabase = await createSupabaseServerClient();

  if (publish) {
    const { data: activity } = await supabase
      .from("activities")
      .select("event_date, event_date_approx")
      .eq("id", activityId)
      .maybeSingle();

    if (!activity?.event_date && !activity?.event_date_approx) {
      return {
        ok: false,
        message:
          "Tarihi olmayan faaliyet yayımlanamaz. Kesin tarihi girin; gün bilinmiyorsa yaklaşık ay yazın.",
      };
    }
  }

  const { error } = await supabase
    .from("activities")
    .update({
      status: publish ? "published" : "draft",
      published_at: publish ? new Date().toISOString() : null,
    })
    .eq("id", activityId);

  if (error) return { ok: false, message: error.message };
  refreshActivities();
  return { ok: true, message: publish ? "Faaliyet yayımlandı." : "Faaliyet taslağa alındı." };
}

export type UploadedCover = {
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
};

export async function setActivityCover(
  activityId: string,
  file: UploadedCover,
): Promise<ActionResult> {
  const session = await requireAdminSession();

  if (!file.storagePath.startsWith(`faaliyetler/${activityId}/`) || file.width < 1 || file.height < 1) {
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
    .from("activities")
    .update({ cover_media_id: media.id, updated_by: session.userId })
    .eq("id", activityId);

  if (error) return { ok: false, message: error.message };
  refreshActivities();
  return { ok: true, message: "Kapak fotoğrafı ayarlandı." };
}

export async function clearActivityCover(activityId: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("activities")
    .update({ cover_media_id: null, updated_by: session.userId })
    .eq("id", activityId);

  if (error) return { ok: false, message: error.message };
  refreshActivities();
  return { ok: true, message: "Kapak kaldırıldı." };
}

export async function addActivitySource(
  activityId: string,
  input: { label: string; url: string; publisher: string; confirms: string },
): Promise<ActionResult> {
  await requireAdminSession();

  const label = input.label.trim();
  const url = input.url.trim();
  if (label.length < 2) return { ok: false, message: "Kaynak adı en az 2 karakter olmalı." };
  if (!/^https:\/\/\S+$/.test(url)) return { ok: false, message: "Kaynak bağlantısı https ile başlamalı." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("activity_sources").insert({
    activity_id: activityId,
    label: label.slice(0, 200),
    url,
    publisher: input.publisher.trim().slice(0, 120) || null,
    // Kaynağın NEYİ doğruladığı boş bırakılmaz; bu ayrım projenin kuralı.
    confirms: input.confirms.trim().slice(0, 300) || null,
    retrieved_at: new Date().toISOString().slice(0, 10),
  });

  if (error) return { ok: false, message: error.message };
  refreshActivities();
  return { ok: true, message: "Kaynak eklendi." };
}

export async function removeActivitySource(sourceId: string): Promise<ActionResult> {
  await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("activity_sources").delete().eq("id", sourceId);
  if (error) return { ok: false, message: error.message };
  refreshActivities();
  return { ok: true, message: "Kaynak kaldırıldı." };
}

/** Silme geri alınamaz; şemada olduğu gibi yalnızca yöneticiye açık. */
export async function deleteActivity(activityId: string): Promise<ActionResult> {
  await requireYonetici();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("activities").delete().eq("id", activityId);
  if (error) return { ok: false, message: error.message };
  refreshActivities();
  return { ok: true, message: "Faaliyet silindi." };
}

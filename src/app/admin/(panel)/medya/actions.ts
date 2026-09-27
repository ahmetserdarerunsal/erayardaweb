"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdminSession, requireYonetici } from "@/lib/admin/session";
import { MEDIA_BUCKET } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "../fotograflar/actions";

/**
 * Alternatif metin, görseli göremeyen ziyaretçi için. Boş bırakılabilir;
 * uydurma açıklama yazmaktansa boş kalması iyidir.
 */
export async function updateMediaAlt(mediaId: string, altText: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from("media_library")
    .update({ alt_text: altText.trim().slice(0, 300) })
    .eq("id", mediaId);

  if (error) return { ok: false, message: error.message };

  await writeAudit(session, {
    action: "alternatif metnini değiştirdi",
    entityType: "medya",
    entityId: mediaId,
  });

  revalidatePath("/admin/medya");
  return { ok: true, message: "Alternatif metin kaydedildi." };
}

/**
 * Dosyayı hem depodan hem kayıttan siler.
 *
 * Kullanımda olan dosya silinmez: `photos` ve `activity_gallery` yabancı
 * anahtarları `restrict`/`cascade` karışık davrandığı için burada önce
 * kontrol ediliyor — aksi hâlde sitede kırık görsel kalabilir.
 */
export async function deleteMedia(mediaId: string): Promise<ActionResult> {
  const session = await requireYonetici();
  const supabase = await createSupabaseServerClient();

  const { data: media } = await supabase
    .from("media_library")
    .select("id,storage_path,file_name")
    .eq("id", mediaId)
    .maybeSingle();

  if (!media) return { ok: false, message: "Medya kaydı bulunamadı." };

  const [foto, galeri, kapak, videoKapak] = await Promise.all([
    supabase.from("photos").select("id", { count: "exact", head: true }).eq("media_id", mediaId),
    supabase
      .from("activity_gallery")
      .select("media_id", { count: "exact", head: true })
      .eq("media_id", mediaId),
    supabase
      .from("activities")
      .select("id", { count: "exact", head: true })
      .eq("cover_media_id", mediaId),
    supabase
      .from("videos")
      .select("id", { count: "exact", head: true })
      .eq("custom_thumbnail_media_id", mediaId),
  ]);

  const kullanim =
    (foto.count ?? 0) + (galeri.count ?? 0) + (kapak.count ?? 0) + (videoKapak.count ?? 0);

  if (kullanim > 0) {
    return {
      ok: false,
      message: `Bu dosya ${kullanim} yerde kullanılıyor. Önce kullanıldığı yerlerden kaldırın.`,
    };
  }

  const { error: storageError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .remove([media.storage_path]);
  if (storageError) {
    return { ok: false, message: `Depodan silinemedi: ${storageError.message}` };
  }

  const { error } = await supabase.from("media_library").delete().eq("id", mediaId);
  if (error) return { ok: false, message: error.message };

  await writeAudit(session, {
    action: "sildi",
    entityType: "medya",
    entityId: mediaId,
    changes: { dosya: media.file_name },
  });

  revalidatePath("/admin/medya");
  return { ok: true, message: "Dosya silindi." };
}

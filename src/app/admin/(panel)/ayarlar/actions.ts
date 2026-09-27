"use server";

import { revalidatePath, updateTag } from "next/cache";
import { writeAudit } from "@/lib/admin/audit";
import { requireYonetici } from "@/lib/admin/session";
import { CONTENT_TAGS } from "@/lib/public-content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "../fotograflar/actions";

export type SocialInput = { id: string; label: string; href: string };

const PLATFORMLAR = new Set(["instagram", "facebook", "x"]);

/**
 * Sosyal medya bağlantıları.
 *
 * Boş bırakılan bağlantı `null` olarak kaydedilir; sitede tıklanamaz hâle
 * gelir. Uydurma bir adres yazmaktansa bağlantıyı pasif bırakmak tercih
 * edilir — bu projenin kuralı.
 */
export async function updateSocialLinks(inputs: SocialInput[]): Promise<ActionResult> {
  const session = await requireYonetici();

  const temiz: { id: string; label: string; href: string | null }[] = [];
  for (const item of inputs) {
    if (!PLATFORMLAR.has(item.id)) continue;
    const href = item.href.trim();
    if (href && !/^https:\/\/\S+$/.test(href)) {
      return { ok: false, message: `${item.label} adresi https:// ile başlamalı.` };
    }
    temiz.push({ id: item.id, label: item.label.trim().slice(0, 40) || item.id, href: href || null });
  }

  if (temiz.length === 0) return { ok: false, message: "Kaydedilecek bağlantı yok." };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("site_settings")
    .upsert(
      { key: "social_links", value: temiz, updated_by: session.userId },
      { onConflict: "key" },
    );

  if (error) return { ok: false, message: error.message };

  await writeAudit(session, {
    action: "güncelledi",
    entityType: "sosyal bağlantılar",
    entityId: "social_links",
    changes: Object.fromEntries(temiz.map((t) => [t.id, t.href ?? "tanımsız"])),
  });

  updateTag(CONTENT_TAGS.settings);
  revalidatePath("/iletisim");
  revalidatePath("/");
  revalidatePath("/admin/ayarlar");

  const pasif = temiz.filter((t) => !t.href).length;
  return {
    ok: true,
    message: pasif
      ? `Kaydedildi. ${pasif} bağlantı boş bırakıldı, sitede tıklanamaz görünecek.`
      : "Sosyal medya bağlantıları kaydedildi.",
  };
}

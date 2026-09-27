"use server";

import { revalidatePath, updateTag } from "next/cache";
import { writeAudit } from "@/lib/admin/audit";
import { requireAdminSession, requirePublisher } from "@/lib/admin/session";
import { CONTENT_TAGS } from "@/lib/public-content";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "../fotograflar/actions";

function refreshPages() {
  updateTag(CONTENT_TAGS.pages);
  revalidatePath("/");
  revalidatePath("/ekrem-eray-arda");
  revalidatePath("/admin/sayfalar");
}

export type ProfileInput = { name: string; title: string; description: string };

/**
 * Site kimliği: ad, unvan ve arama motorlarına verilen açıklama.
 *
 * Taslağa yazılır, ayrıca yayımlanması gerekir. `published_content` ayrı
 * sütunda durduğu için yarım kalmış bir düzenleme ziyaretçiye sızmaz.
 */
export async function saveProfileDraft(input: ProfileInput): Promise<ActionResult> {
  const session = await requireAdminSession();

  const name = input.name.trim();
  const title = input.title.trim();
  const description = input.description.trim();

  if (name.length < 2 || name.length > 120) {
    return { ok: false, message: "Ad soyad 2–120 karakter olmalı." };
  }
  if (title.length < 2 || title.length > 160) {
    return { ok: false, message: "Unvan 2–160 karakter olmalı." };
  }
  if (description.length > 320) {
    return {
      ok: false,
      message: "Açıklama en fazla 320 karakter olmalı; arama sonuçlarında fazlası kesilir.",
    };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("page_content")
    .update({ draft_content: { name, title, description }, updated_by: session.userId })
    .eq("page_key", "site")
    .eq("section_key", "profile");

  if (error) return { ok: false, message: error.message };

  await writeAudit(session, {
    action: "taslağını kaydetti",
    entityType: "site kimliği",
    entityId: "site/profile",
    changes: { ad: name, unvan: title },
  });

  revalidatePath("/admin/sayfalar");
  return { ok: true, message: "Taslak kaydedildi. Siteye yansıması için yayımlayın." };
}

export type BiographyInput = { heroSummary: string; sections: string };

/**
 * Biyografi bölümleri.
 *
 * Metin biçimi bilinçli olarak basit: her bölüm `## Başlık` satırıyla
 * başlar, altındaki paragraflar boş satırla ayrılır. Zengin metin editörü
 * yerine bunu seçtik — biçimlendirme kaçaklarıyla uğraşmadan, düz metin
 * olarak okunup yazılabiliyor.
 */
function parseBiography(raw: string): { ok: true; sections: unknown[] } | { ok: false; message: string } {
  const bloklar = raw.split(/\n(?=##\s)/).map((b) => b.trim()).filter(Boolean);
  if (bloklar.length === 0) return { ok: false, message: "En az bir bölüm yazın." };

  const sections = [];
  for (const [index, blok] of bloklar.entries()) {
    const satirlar = blok.split("\n");
    const baslik = satirlar[0].replace(/^##\s*/, "").trim();
    if (!baslik) {
      return { ok: false, message: `${index + 1}. bölümün başlığı boş. Satır "## " ile başlamalı.` };
    }
    const paragraphs = satirlar
      .slice(1)
      .join("\n")
      .split(/\n{2,}/)
      .map((p) => p.replace(/\n/g, " ").trim())
      .filter(Boolean);
    if (paragraphs.length === 0) {
      return { ok: false, message: `"${baslik}" bölümünün metni boş.` };
    }
    sections.push({
      number: String(index + 1).padStart(2, "0"),
      category: "Hakkında",
      title: baslik,
      paragraphs,
    });
  }
  return { ok: true, sections };
}

export async function saveBiographyDraft(input: BiographyInput): Promise<ActionResult> {
  const session = await requireAdminSession();

  const parsed = parseBiography(input.sections);
  if (!parsed.ok) return { ok: false, message: parsed.message };

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("page_content")
    .update({
      draft_content: { heroSummary: input.heroSummary.trim(), sections: parsed.sections },
      updated_by: session.userId,
    })
    .eq("page_key", "about")
    .eq("section_key", "biography");

  if (error) return { ok: false, message: error.message };

  await writeAudit(session, {
    action: "taslağını kaydetti",
    entityType: "biyografi",
    entityId: "about/biography",
    changes: { bölüm: parsed.sections.length },
  });

  revalidatePath("/admin/sayfalar");
  return {
    ok: true,
    message: `Taslak kaydedildi (${parsed.sections.length} bölüm). Siteye yansıması için yayımlayın.`,
  };
}

/** Taslağı yayına alır. Yayımlama yetkisi olmayan editör bunu yapamaz. */
export async function publishPageSection(
  pageKey: string,
  sectionKey: string,
): Promise<ActionResult> {
  const session = await requirePublisher();
  const supabase = await createSupabaseServerClient();

  const { data: row } = await supabase
    .from("page_content")
    .select("draft_content,requires_verification")
    .eq("page_key", pageKey)
    .eq("section_key", sectionKey)
    .maybeSingle();

  if (!row) return { ok: false, message: "Bölüm bulunamadı." };
  if (!row.draft_content || Object.keys(row.draft_content).length === 0) {
    return { ok: false, message: "Taslak boş; yayımlanacak bir şey yok." };
  }

  const { error } = await supabase
    .from("page_content")
    .update({
      published_content: row.draft_content,
      published_at: new Date().toISOString(),
      updated_by: session.userId,
      ...(row.requires_verification
        ? { verified_at: new Date().toISOString(), verified_by: session.userId }
        : {}),
    })
    .eq("page_key", pageKey)
    .eq("section_key", sectionKey);

  if (error) return { ok: false, message: error.message };

  await writeAudit(session, {
    action: "yayımladı",
    entityType: "sayfa içeriği",
    entityId: `${pageKey}/${sectionKey}`,
  });

  refreshPages();
  return { ok: true, message: "Yayımlandı. Site güncellendi." };
}

/** Taslağı yayındaki hâline geri döndürür. */
export async function discardDraft(pageKey: string, sectionKey: string): Promise<ActionResult> {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();

  const { data: row } = await supabase
    .from("page_content")
    .select("published_content")
    .eq("page_key", pageKey)
    .eq("section_key", sectionKey)
    .maybeSingle();

  if (!row?.published_content) {
    return { ok: false, message: "Yayımlanmış bir sürüm yok; geri alınacak bir şey bulunamadı." };
  }

  const { error } = await supabase
    .from("page_content")
    .update({ draft_content: row.published_content, updated_by: session.userId })
    .eq("page_key", pageKey)
    .eq("section_key", sectionKey);

  if (error) return { ok: false, message: error.message };

  revalidatePath("/admin/sayfalar");
  return { ok: true, message: "Taslak, yayındaki sürüme döndürüldü." };
}

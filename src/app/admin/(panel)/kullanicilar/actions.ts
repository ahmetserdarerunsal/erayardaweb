"use server";

import { revalidatePath } from "next/cache";
import { writeAudit } from "@/lib/admin/audit";
import { requireYonetici } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "../fotograflar/actions";

const ROLLER = new Set(["yonetici", "editor"]);

/**
 * Yöneticinin kendi yetkisini elinden almasını engeller.
 *
 * Tek yönetici kendini pasife alır veya editöre düşürürse panele bir daha
 * kimse giremez; kurtarmak için veritabanına elle müdahale gerekir.
 */
function kendiniKilitliyorMu(
  session: { userId: string },
  hedefId: string,
  degisim: { role?: string; isActive?: boolean },
): string | null {
  if (session.userId !== hedefId) return null;
  if (degisim.role && degisim.role !== "yonetici") {
    return "Kendi rolünüzü düşüremezsiniz. Başka bir yönetici bu değişikliği yapabilir.";
  }
  if (degisim.isActive === false) {
    return "Kendi hesabınızı pasife alamazsınız.";
  }
  return null;
}

export async function updateUser(
  userId: string,
  input: { fullName: string; role: string; canPublish: boolean; isActive: boolean },
): Promise<ActionResult> {
  const session = await requireYonetici();

  const fullName = input.fullName.trim();
  if (fullName.length < 2 || fullName.length > 120) {
    return { ok: false, message: "Ad soyad 2–120 karakter olmalı." };
  }
  if (!ROLLER.has(input.role)) return { ok: false, message: "Geçersiz rol." };

  const engel = kendiniKilitliyorMu(session, userId, {
    role: input.role,
    isActive: input.isActive,
  });
  if (engel) return { ok: false, message: engel };

  const supabase = await createSupabaseServerClient();

  // Son aktif yöneticiyi kaybetmemek için sayım.
  if (input.role !== "yonetici" || !input.isActive) {
    const { count } = await supabase
      .from("admin_profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "yonetici")
      .eq("is_active", true);
    const { data: mevcut } = await supabase
      .from("admin_profiles")
      .select("role,is_active")
      .eq("id", userId)
      .maybeSingle();

    const sonYonetici =
      mevcut?.role === "yonetici" && mevcut?.is_active && (count ?? 0) <= 1;
    if (sonYonetici) {
      return {
        ok: false,
        message: "Sistemdeki tek aktif yönetici bu hesap. Önce başka bir yönetici tanımlayın.",
      };
    }
  }

  const { error } = await supabase
    .from("admin_profiles")
    .update({
      full_name: fullName,
      role: input.role,
      // Yönetici zaten yayımlayabilir; bayrağı tutarlı tutuyoruz.
      can_publish: input.role === "yonetici" ? true : input.canPublish,
      is_active: input.isActive,
    })
    .eq("id", userId);

  if (error) return { ok: false, message: error.message };

  await writeAudit(session, {
    action: "güncelledi",
    entityType: "kullanıcı",
    entityId: userId,
    changes: {
      ad: fullName,
      rol: input.role,
      yayımlayabilir: input.role === "yonetici" ? true : input.canPublish,
      aktif: input.isActive,
    },
  });

  revalidatePath("/admin/kullanicilar");
  return { ok: true, message: "Kullanıcı güncellendi." };
}

"use server";

import { requireYonetici } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ActionResult } from "../fotograflar/actions";

const statuses = new Set(["new", "read", "in_progress", "done", "archived"]);

export async function updateMessage(messageId: string, status: string, adminNote: string): Promise<ActionResult> {
  const session = await requireYonetici();
  if (!statuses.has(status)) return { ok: false, message: "Geçersiz mesaj durumu." };
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("contact_messages").update({
    status,
    admin_note: adminNote.trim().slice(0, 2000) || null,
    ...(status === "new" ? { read_at: null, read_by: null } : { read_at: new Date().toISOString(), read_by: session.userId }),
  }).eq("id", messageId);
  if (error) return { ok: false, message: error.message };
  return { ok: true, message: "Mesaj güncellendi." };
}

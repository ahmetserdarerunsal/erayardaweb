import "server-only";

import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AdminSession } from "./session";

/**
 * İşlem geçmişi kaydı.
 *
 * `audit_logs` tablosuna yazma yetkisi `authenticated` rolüne verilmedi:
 * kayıt bırakan kişinin o kaydı sonradan değiştirememesi gerekiyor. Bu
 * yüzden yazma secret key ile yapılır, okuma normal oturumla.
 *
 * Geçmiş kaydı asıl işlemi ASLA engellemez — burada bir hata olursa
 * sunucu günlüğüne düşer, kullanıcının yaptığı iş geri alınmaz.
 */
export type AuditEntry = {
  /** Ne yapıldı: "yayımladı", "sildi", "güncelledi" … */
  action: string;
  /** Hangi tür kayıt: "faaliyet", "video", "albüm", "kullanıcı" … */
  entityType: string;
  entityId?: string | null;
  /** Değişikliğin özeti. Gizli veri yazılmaz. */
  changes?: Record<string, unknown> | null;
};

export async function writeAudit(session: AdminSession, entry: AuditEntry): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    await admin.from("audit_logs").insert({
      actor_id: session.userId,
      actor_name: session.fullName,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId ?? null,
      changes: entry.changes ?? null,
    });
  } catch (error) {
    console.error("İşlem geçmişi yazılamadı:", error);
  }
}

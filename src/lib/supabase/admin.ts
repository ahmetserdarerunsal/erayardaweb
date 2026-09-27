import "server-only";

import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./config";

/**
 * Secret key istemcisi (eski adıyla service_role) — RLS'i tamamen atlar.
 *
 * SADECE sunucu tarafında, RLS'in yetersiz kaldığı işlemler için kullanılır
 * (işlem geçmişi yazma gibi). `server-only` importu bu dosyanın istemci
 * paketine girmesini derleme zamanında engeller.
 */
export function createSupabaseAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;

  if (!SUPABASE_URL || !secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY tanımlı değil. .env.local dosyasını kontrol edin.",
    );
  }

  return createClient(SUPABASE_URL, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./config";

/**
 * Sunucu tarafı istemci. Oturum çerezlerini okur, yetki RLS ile belirlenir.
 * Server Component içinde çerez yazılamadığı için setAll sessizce yutulur;
 * oturum tazeleme proxy.ts tarafında yapılır.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Component'ten çağrıldı; proxy.ts oturumu zaten tazeliyor.
        }
      },
    },
  });
}

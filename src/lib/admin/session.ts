import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type AdminRole = "yonetici" | "editor";

export type AdminSession = {
  userId: string;
  email: string;
  fullName: string;
  role: AdminRole;
  canPublish: boolean;
};

/**
 * Panelin her sayfasında çağrılır. proxy.ts'teki kontrolün üstüne ikinci
 * katman: kullanıcı oturum açmış olsa bile admin_profiles kaydı yoksa veya
 * pasifse panele giremez.
 */
export async function requireAdminSession(): Promise<AdminSession> {
  if (!isSupabaseConfigured) redirect("/admin/kurulum");

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/admin/giris");

  const { data: profile } = await supabase
    .from("admin_profiles")
    .select("full_name, role, can_publish, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !profile.is_active) redirect("/admin/yetkisiz");

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName: profile.full_name as string,
    role: profile.role as AdminRole,
    canPublish: profile.role === "yonetici" || Boolean(profile.can_publish),
  };
}

/** Yalnızca yöneticiye açık bölümler için. */
export async function requireYonetici(): Promise<AdminSession> {
  const session = await requireAdminSession();
  if (session.role !== "yonetici") redirect("/admin/yetkisiz");
  return session;
}

/** Yayımlama gerektiren işlemler için. */
export async function requirePublisher(): Promise<AdminSession> {
  const session = await requireAdminSession();
  if (!session.canPublish) redirect("/admin/yetkisiz");
  return session;
}

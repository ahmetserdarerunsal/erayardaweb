import type { Metadata } from "next";
import { requireYonetici } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { UserManager } from "./UserManager";

export const metadata: Metadata = { title: "Kullanıcılar" };

export default async function AdminUsersPage() {
  const session = await requireYonetici();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("admin_profiles")
    .select("id,full_name,role,can_publish,is_active,created_at")
    .order("created_at");

  return <UserManager users={data ?? []} currentUserId={session.userId} />;
}

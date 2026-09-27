import type { ReactNode } from "react";
import { AdminShell } from "../AdminShell";
import { requireAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Panel her istekte taze veri gösterir; önbelleğe alınmaz.
export const dynamic = "force-dynamic";

export default async function AdminPanelLayout({ children }: { children: ReactNode }) {
  // proxy.ts'in üstüne ikinci yetki katmanı.
  const session = await requireAdminSession();

  let unreadCount = 0;
  if (session.role === "yonetici") {
    const supabase = await createSupabaseServerClient();
    const { count } = await supabase
      .from("contact_messages")
      .select("id", { count: "exact", head: true })
      .eq("status", "new");
    unreadCount = count ?? 0;
  }

  return (
    <AdminShell session={session} unreadCount={unreadCount}>
      {children}
    </AdminShell>
  );
}

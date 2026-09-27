import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ActivityManager } from "./ActivityManager";

export const metadata: Metadata = { title: "Faaliyetler" };

export default async function AdminActivitiesPage() {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();

  const [activitiesResult, sourcesResult, mediaResult] = await Promise.all([
    supabase
      .from("activities")
      .select(
        "id,slug,title,summary,body,event_date,event_date_approx,categories,location,kind,cover_media_id,status,missing_info",
      )
      .order("event_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
    supabase
      .from("activity_sources")
      .select("id,activity_id,label,url,publisher,confirms")
      .order("sort_order"),
    supabase.from("media_library").select("id,storage_path,width,height"),
  ]);

  // NOT: Buraya `key` vermeyin. İçeriğe bağlı bir key, her kaydetme veya
  // yayımlama sonrasında bileşeni yeniden kurar ve açık olan düzenleme
  // formunu kapatır.
  return (
    <ActivityManager
      activities={activitiesResult.data ?? []}
      sources={sourcesResult.data ?? []}
      media={mediaResult.data ?? []}
      canPublish={session.canPublish}
      canDelete={session.role === "yonetici"}
    />
  );
}

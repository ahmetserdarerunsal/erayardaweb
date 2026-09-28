import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { VideoManager } from "./VideoManager";

export const metadata: Metadata = { title: "Video Yönetimi" };

export default async function AdminVideosPage() {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();

  const [videosResult, mediaResult] = await Promise.all([
    supabase
      .from("videos")
      .select(
        "id,title,description,provider,original_url,thumbnail_url,custom_thumbnail_media_id,embed_status,status,created_at",
      )
      .order("created_at", { ascending: false }),
    supabase.from("media_library").select("id,storage_path,width,height"),
  ]);

  return (
    <VideoManager
      videos={videosResult.data ?? []}
      media={mediaResult.data ?? []}
      canPublish={session.canPublish}
      canDelete={session.role === "yonetici"}
    />
  );
}

import type { Metadata } from "next";
import { requireYonetici } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SettingsManager } from "./SettingsManager";
import type { SocialInput } from "./actions";

export const metadata: Metadata = { title: "Site Ayarları" };

export default async function AdminSettingsPage() {
  await requireYonetici();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", "social_links")
    .maybeSingle();

  const links = Array.isArray(data?.value) ? (data.value as SocialInput[]) : [];

  return <SettingsManager links={links} />;
}

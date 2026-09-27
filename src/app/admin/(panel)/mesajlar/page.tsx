import type { Metadata } from "next";
import { requireYonetici } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { MessageManager } from "./MessageManager";

export const metadata: Metadata = { title: "Gelen Mesajlar" };

export default async function AdminMessagesPage() {
  await requireYonetici();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("contact_messages").select("id,sender_name,sender_email,message,status,admin_note,created_at,read_at").order("created_at", { ascending: false }).limit(500);
  return <MessageManager messages={data ?? []} loadError={error?.message ?? null} />;
}

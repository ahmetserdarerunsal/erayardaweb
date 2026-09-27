import type { Metadata } from "next";
import { requireAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  PageManager,
  type BiographyContent,
  type ProfileContent,
  type SectionState,
} from "./PageManager";

export const metadata: Metadata = { title: "Sayfa Yönetimi" };

type Row = {
  page_key: string;
  section_key: string;
  draft_content: unknown;
  published_content: unknown;
  published_at: string | null;
};

function toState<T extends object>(row: Row | undefined): SectionState<T> {
  const draft = (row?.draft_content ?? {}) as T;
  const published = (row?.published_content ?? null) as T | null;
  return {
    draft,
    published,
    // Karşılaştırma JSON üzerinden: alan sırası ikisinde de aynı kaynaktan
    // geldiği için güvenilir.
    dirty: JSON.stringify(draft) !== JSON.stringify(published ?? {}),
    publishedAt: row?.published_at ?? null,
  };
}

export default async function AdminPagesPage() {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("page_content")
    .select("page_key,section_key,draft_content,published_content,published_at");

  const rows = (data ?? []) as Row[];
  const find = (page: string, section: string) =>
    rows.find((r) => r.page_key === page && r.section_key === section);

  return (
    <PageManager
      profile={toState<ProfileContent>(find("site", "profile"))}
      biography={toState<BiographyContent>(find("about", "biography"))}
      canPublish={session.canPublish}
    />
  );
}

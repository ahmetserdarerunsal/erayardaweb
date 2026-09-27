import type { Metadata } from "next";
import Link from "next/link";
import { requireAdminSession } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Genel Bakış" };

type Stat = { label: string; value: number; tone?: "alert" };


export default async function AdminOverviewPage() {
  const session = await requireAdminSession();
  const supabase = await createSupabaseServerClient();
  const head = { count: "exact" as const, head: true };

  const [publishedActivities, draftActivities, albums, videos, unread] = await Promise.all([
    supabase.from("activities").select("id", head).eq("status", "published"),
    supabase.from("activities").select("id", head).eq("status", "draft"),
    supabase.from("photo_albums").select("id", head),
    supabase.from("videos").select("id", head),
    session.role === "yonetici"
      ? supabase.from("contact_messages").select("id", head).eq("status", "new")
      : Promise.resolve({ count: 0 }),
  ]);

  const n = (r: { count: number | null }) => r.count ?? 0;

  const stats: Stat[] = [
    { label: "Yayımlanmış faaliyet", value: n(publishedActivities) },
    { label: "Taslak faaliyet", value: n(draftActivities) },
    { label: "Fotoğraf albümü", value: n(albums) },
    { label: "Video", value: n(videos) },
  ];

  if (session.role === "yonetici") {
    const unreadCount = n(unread);
    stats.push({
      label: "Okunmamış mesaj",
      value: unreadCount,
      tone: unreadCount > 0 ? "alert" : undefined,
    });
  }

  return (
    <>
      <div className="admin-grid">
        {stats.map((stat) => (
          <div className="admin-card" key={stat.label}>
            <p className="admin-stat__label">{stat.label}</p>
            <p className="admin-stat__value" data-tone={stat.tone}>
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Hızlı işlemler</h2>
        </div>
        <div className="admin-actions">
          <Link className="admin-btn" href="/admin/fotograflar">
            Fotoğraf yükle
          </Link>
          <Link className="admin-btn" href="/admin/videolar">
            Video ekle
          </Link>
          {session.role === "yonetici" ? (
            <Link className="admin-btn admin-btn--ghost" href="/admin/mesajlar">
              Gelen mesajlar
            </Link>
          ) : null}
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-note">
          <p>
            <strong>Bu aşamada hazır olan bölümler:</strong> Fotoğraf Yönetimi,
            Video Yönetimi ve Gelen Mesajlar.
          </p>
          <p>
            Faaliyetler, Sayfa Yönetimi ve diğer bölümler menüde “Yakında”
            olarak görünüyor; bu içerikler şimdilik geliştirici tarafından
            güncelleniyor.
          </p>
        </div>
      </section>
    </>
  );
}

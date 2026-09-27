import type { Metadata } from "next";
import { requireYonetici } from "@/lib/admin/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "İşlem Geçmişi" };

const formatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

type AuditRow = {
  id: number;
  actor_name: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  changes: Record<string, unknown> | null;
  created_at: string;
};

/** Değişiklik özetini tek satırda okunur hâle getirir. */
function summarise(changes: Record<string, unknown> | null): string {
  if (!changes) return "";
  return Object.entries(changes)
    .map(([key, value]) => {
      const text =
        value === null || value === undefined
          ? "—"
          : typeof value === "object"
            ? JSON.stringify(value)
            : String(value);
      return `${key}: ${text.length > 70 ? `${text.slice(0, 70)}…` : text}`;
    })
    .join(" · ");
}

export default async function AdminHistoryPage() {
  await requireYonetici();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase
    .from("audit_logs")
    .select("id,actor_name,action,entity_type,entity_id,changes,created_at")
    .order("id", { ascending: false })
    .limit(200);

  const rows = (data ?? []) as AuditRow[];

  return (
    <>
      <section className="admin-card admin-manage-head">
        <div>
          <p className="admin-eyebrow">Kayıt defteri</p>
          <h2>İşlem Geçmişi</h2>
          <p>
            Panelde yapılan değişiklikler. Kayıtlar yalnızca eklenir; buradan
            silinemez veya düzenlenemez. Son 200 işlem gösterilir.
          </p>
        </div>
      </section>

      {error ? (
        <p className="admin-feedback" data-ok={false} role="status">
          Geçmiş okunamadı: {error.message}
        </p>
      ) : null}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Son işlemler</h2>
          <span>{rows.length} kayıt</span>
        </div>

        {rows.length === 0 ? (
          <p className="admin-empty">
            Henüz kayıt yok. Panelde bir değişiklik yaptığınızda burada görünür.
          </p>
        ) : (
          <ol className="admin-timeline">
            {rows.map((row) => (
              <li key={row.id}>
                <time dateTime={row.created_at}>
                  {formatter.format(new Date(row.created_at))}
                </time>
                <p>
                  <strong>{row.actor_name ?? "Bilinmeyen kullanıcı"}</strong>{" "}
                  <span className="admin-timeline__entity">{row.entity_type}</span>{" "}
                  {row.action}
                </p>
                {row.changes ? (
                  <p className="admin-timeline__detail">{summarise(row.changes)}</p>
                ) : null}
              </li>
            ))}
          </ol>
        )}
      </section>
    </>
  );
}

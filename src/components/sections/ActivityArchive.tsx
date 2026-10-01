import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";
import {
  categoryLabel,
  getPublishedActivities,
} from "@/lib/public-content";
import type { PublishedActivity } from "@/types/content";

/**
 * Kapak fotoğrafı yüklenmemiş kartlarda görsel alanını dolduran tipografik
 * kompozisyon. `cover` alanı dolduğu anda yerini otomatik olarak fotoğrafa
 * bırakır; kart yüksekliği ve 16:9 oranı iki durumda da aynıdır.
 */
function ActivityPlaceholder({ index, label }: { index: string; label: string }) {
  return (
    <span className="activity-card__placeholder" aria-hidden="true">
      <span className="activity-card__placeholder-index">{index}</span>
      <span className="activity-card__placeholder-label">{label}</span>
    </span>
  );
}

function ActivityCard({
  activity,
  index,
}: {
  activity: PublishedActivity;
  index: number;
}) {
  const ordinal = String(index + 1).padStart(2, "0");
  // Tür etiketleri ("katılım sağlanan etkinlik" vb.) arayüzden kaldırıldı;
  // kategorisi olmayan kayıtta yedek olarak yalın bir söz kullanılıyor.
  const placeholderLabel = activity.categories[0]
    ? categoryLabel(activity.categories[0])
    : "Faaliyet";

  return (
    <article className="activity-card">
      <Link href={`/faaliyetler/${activity.slug}`}>
        <span className="activity-card__media">
          {activity.cover ? (
            <Image
              src={activity.cover.src}
              alt={activity.cover.alt}
              fill
              sizes="(max-width: 640px) 100vw, 46vw"
              quality={90}
            />
          ) : (
            <ActivityPlaceholder index={ordinal} label={placeholderLabel} />
          )}
        </span>

        <span className="activity-card__body">
          <h3>{activity.title}</h3>

          <span className="activity-card__summary">{activity.summary}</span>

          <span className="activity-cta">
            Detayı gör
            <span aria-hidden="true">↗</span>
          </span>
        </span>
      </Link>
    </article>
  );
}

export async function ActivityArchive() {
  const entries = await getPublishedActivities();

  return (
    // Başlık hero'da zaten var; tekrar eden etiket satırı kaldırıldı.
    <section className="activity-archive" aria-label="Faaliyet arşivi">
      <Container>
        {entries.length === 0 ? (
          <div className="activity-empty">
            <p className="status-label">İçerik hazırlığında</p>
            <p className="activity-empty__lead">
              Faaliyetler hazır olduğunda bu arşivde güncelden
              eskiye doğru yayımlanacaktır.
            </p>
          </div>
        ) : (
          <div className="activity-grid">
            {entries.map((activity, index) => (
              <ActivityCard activity={activity} index={index} key={activity.id} />
            ))}
          </div>
        )}
      </Container>
    </section>
  );
}

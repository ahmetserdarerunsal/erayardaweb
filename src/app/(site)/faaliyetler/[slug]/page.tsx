import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import {
  activityDateTimeAttr,
  categoryLabel,
  formatActivityRange,
  getActivityBySlug,
  getPublishedActivities,
  locationLabel,
} from "@/lib/public-content";

type ActivityPageProps = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return (await getPublishedActivities()).map((activity) => ({ slug: activity.slug }));
}

export async function generateMetadata({ params }: ActivityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);

  if (!activity) return { title: "Paylaşım bulunamadı" };

  return { title: activity.title, description: activity.summary };
}

export default async function ActivityDetailPage({ params }: ActivityPageProps) {
  const { slug } = await params;
  const activity = await getActivityBySlug(slug);

  if (!activity) notFound();

  return (
    <main id="ana-icerik" className="activity-detail">
      <Container>
        <Link className="arrow-link activity-detail__back" href="/faaliyetler">
          Paylaşımlar
          <span aria-hidden="true">↙</span>
        </Link>

        {/* Tür etiketi ("katılım sağlanan etkinlik" vb.) ziyaretçiye bir şey
            anlatmıyordu, kaldırıldı — alan veritabanında duruyor. Konum da
            yalnızca gerçekten biliniyorsa yazılıyor; "Diğer" yazmanın
            okuyucuya faydası yok. */}
        <p className="activity-meta">
          <time dateTime={activityDateTimeAttr(activity)}>{formatActivityRange(activity)}</time>
          {activity.location !== "diger" ? <span>{locationLabel(activity.location)}</span> : null}
        </p>

        <h1>{activity.title}</h1>
        <p className="activity-detail__summary">{activity.summary}</p>

        {activity.cover ? (
          <figure className="activity-detail__cover">
            {/* Boyutlar görselin kendisinden geliyor: sabit 16:9 verilince
                dikey fotoğraflar kırpılıyordu. */}
            <Image
              src={activity.cover.src}
              alt={activity.cover.alt}
              width={activity.cover.width}
              height={activity.cover.height}
              sizes="(max-width: 820px) 100vw, 70rem"
              quality={90}
            />
            {activity.cover.caption ? <figcaption>{activity.cover.caption}</figcaption> : null}
          </figure>
        ) : null}

        {/* Ayrı gövde bloğu kaldırıldı: metnin tamamı başlığın hemen altında
            bir kez gösteriliyor, aksi hâlde aynı yazı hem üstte hem altta
            görünüyordu. */}

        {activity.gallery.length > 0 ? (
          <div className="activity-detail__gallery">
            {activity.gallery.map((image) => (
              <figure key={image.src}>
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={image.width}
                  height={image.height}
                  sizes="(max-width: 820px) 100vw, 34rem"
                />
                {image.caption ? <figcaption>{image.caption}</figcaption> : null}
              </figure>
            ))}
          </div>
        ) : null}

        <p className="activity-tags activity-detail__tags">
          {activity.categories.map((category) => (
            <span key={category}>{categoryLabel(category)}</span>
          ))}
        </p>

        {activity.sources.length > 0 ? (
          <section className="activity-detail__sources" aria-labelledby="activity-sources">
            <h2 id="activity-sources" className="section-kicker">
              Kaynaklar
            </h2>
            <ul>
              {activity.sources.map((source) => (
                <li key={source.url}>
                  <a href={source.url} rel="noopener noreferrer" target="_blank">
                    {source.label}
                    <span aria-hidden="true">↗</span>
                  </a>
                  <span className="activity-detail__source-meta">{source.publisher}</span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </Container>
    </main>
  );
}

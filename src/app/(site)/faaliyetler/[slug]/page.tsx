import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import {
  activityDateTimeAttr,
  activityKindLabels,
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

  if (!activity) return { title: "Faaliyet bulunamadı" };

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
          Faaliyetler
          <span aria-hidden="true">↙</span>
        </Link>

        <p className="activity-meta">
          <span className="activity-meta__kind" data-kind={activity.kind}>
            {activityKindLabels[activity.kind]}
          </span>
          <time dateTime={activityDateTimeAttr(activity)}>{formatActivityRange(activity)}</time>
          <span>{locationLabel(activity.location)}</span>
        </p>

        <h1>{activity.title}</h1>
        <p className="activity-detail__summary">{activity.summary}</p>

        {activity.cover ? (
          <figure className="activity-detail__cover">
            <Image
              src={activity.cover.src}
              alt={activity.cover.alt}
              width={1600}
              height={900}
              quality={90}
            />
            {activity.cover.caption ? <figcaption>{activity.cover.caption}</figcaption> : null}
          </figure>
        ) : null}

        <div className="activity-detail__body">
          {activity.body.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
        </div>

        {activity.gallery.length > 0 ? (
          <div className="activity-detail__gallery">
            {activity.gallery.map((image) => (
              <figure key={image.src}>
                <Image src={image.src} alt={image.alt} width={1200} height={800} />
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

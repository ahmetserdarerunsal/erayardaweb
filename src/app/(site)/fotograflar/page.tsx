import type { Metadata } from "next";
import { PhotoArchive } from "@/components/media/PhotoArchive";
import { Container } from "@/components/ui/Container";

const lead = "Çalışmalardan, ziyaretlerden ve etkinliklerden kareler.";

export const metadata: Metadata = {
  title: "Fotoğraf",
  description: lead,
};

export default function PhotosPage() {
  return (
    <main id="ana-icerik" className="media-page">
      <section className="media-page__hero">
        <Container>
          <p className="section-kicker">04 / Fotoğraf</p>
          <h1>FOTOĞRAF ARŞİVİ</h1>
          <p className="media-page__lead">{lead}</p>
        </Container>
      </section>
      <PhotoArchive />
    </main>
  );
}

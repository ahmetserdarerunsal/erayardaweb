import type { Metadata } from "next";
import { VideoArchive } from "@/components/media/VideoArchive";
import { Container } from "@/components/ui/Container";

const lead = "Konuşmalar, röportajlar ve video kayıtları.";

export const metadata: Metadata = {
  title: "Video",
  description: lead,
};

export default function VideosPage() {
  return (
    <main id="ana-icerik" className="media-page">
      <section className="media-page__hero">
        <Container>
          <p className="section-kicker">05 / Video</p>
          <h1>VİDEO ARŞİVİ</h1>
          <p className="media-page__lead">{lead}</p>
        </Container>
      </section>
      <VideoArchive />
    </main>
  );
}

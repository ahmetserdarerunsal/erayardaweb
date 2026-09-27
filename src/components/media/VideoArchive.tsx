import { Container } from "@/components/ui/Container";
import { getPublishedVideos } from "@/lib/public-content";
import { VideoGallery } from "./VideoGallery";

export async function VideoArchive() {
  const videos = await getPublishedVideos();

  return (
    // Başlık hero'da zaten var; tekrar eden etiket satırı kaldırıldı.
    <section className="media-archive" aria-label="Video arşivi">
      <Container>
        {videos.length > 0 ? (
          <VideoGallery videos={videos} />
        ) : (
          <p className="video-empty">Henüz yayımlanmış video bulunmuyor.</p>
        )}
      </Container>
    </section>
  );
}

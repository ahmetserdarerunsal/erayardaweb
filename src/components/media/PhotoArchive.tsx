import { Container } from "@/components/ui/Container";
import { getPublishedPhotoAlbums } from "@/lib/public-content";
import { PhotoGallery } from "./PhotoGallery";

export async function PhotoArchive() {
  const albums = await getPublishedPhotoAlbums();

  return (
    // Başlık hero'da zaten var; tekrar eden etiket satırı kaldırıldı.
    // Erişilebilirlik için bölüm adı aria-label ile korunuyor.
    <section className="media-archive" aria-label="Fotoğraf arşivi">
      <Container>
        {albums.length > 0 ? (
          <PhotoGallery albums={albums} />
        ) : (
          <p className="photo-empty">Henüz yayımlanmış fotoğraf albümü bulunmuyor.</p>
        )}
      </Container>
    </section>
  );
}

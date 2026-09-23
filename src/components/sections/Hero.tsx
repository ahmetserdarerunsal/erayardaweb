import { Container } from "@/components/ui/Container";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";
import { profile } from "@/data/profile";

export function Hero() {
  return (
    <section className="hero" aria-labelledby="hero-title">
      <PhotoPlaceholder label="Hero fotoğrafı eklenecek" className="photo-placeholder--fill photo-placeholder--hero" />
      <div className="hero__shade" />
      <Container className="hero__content">
        <p className="hero__index">01 — Kişisel / Kamusal</p>
        <h1 id="hero-title"><span>EKREM</span><span>ERAY ARDA</span></h1>
        <p className="hero__title">{profile.title}</p>
        <div className="hero__scroll" aria-hidden="true"><span>Keşfet</span><i /></div>
      </Container>
    </section>
  );
}

import { getImageProps } from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function Hero({ title }: { title: string }) {
  const common = {
    alt: "Ekrem Eray Arda, İstanbul Boğazı manzarası önünde",
    sizes: "100vw",
    quality: 90,
    fetchPriority: "high" as const,
  };

  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({
    ...common,
    src: "/images/hero-desktop.png",
    width: 1672,
    height: 941,
  });

  const {
    props: { srcSet: mobileSrcSet, ...mobileImageProps },
  } = getImageProps({
    ...common,
    src: "/images/hero-mobile.png",
    width: 941,
    height: 1672,
  });

  return (
    <section className="hero photo-hero" aria-labelledby="hero-title">
      <picture className="photo-hero__picture">
        <source media="(min-width: 821px)" srcSet={desktopSrcSet} />
        <source media="(max-width: 820px)" srcSet={mobileSrcSet} />
        <img {...mobileImageProps} alt={common.alt} className="photo-hero__image" />
      </picture>
      <div className="photo-hero__shade" aria-hidden="true" />

      <Container className="photo-hero__content">
        <div className="photo-hero__copy">
          <h1 id="hero-title" aria-label="Ekrem Eray Arda">
            <span className="photo-hero__title-desktop" aria-hidden="true">EKREM</span>
            <span className="photo-hero__title-desktop" aria-hidden="true">ERAY ARDA</span>
            <span className="photo-hero__title-mobile" aria-hidden="true">EKREM ERAY</span>
            <span className="photo-hero__title-mobile" aria-hidden="true">ARDA</span>
          </h1>
          <p className="photo-hero__role">{title}</p>
          <Link className="photo-hero__link" href="/faaliyetler">
            Çalışmaları Keşfet
            <span aria-hidden="true">↓</span>
          </Link>
        </div>
      </Container>
    </section>
  );
}

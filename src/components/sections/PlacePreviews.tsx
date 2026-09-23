import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { ImageReveal } from "@/components/motion/ImageReveal";
import { FadeIn } from "@/components/motion/FadeIn";
import { PhotoPlaceholder } from "@/components/ui/PhotoPlaceholder";

export function PlacePreviews() {
  return (
    <>
      <section className="place place--kartal" aria-labelledby="kartal-heading"><Container className="place__grid">
        <div className="place__copy"><p className="section-index">04 / Yerel</p><h2 id="kartal-heading">KARTAL</h2><FadeIn><p>Projeler, saha ziyaretleri, açıklamalar ve mahallelerden notlar için hazırlanmış ön izleme alanı.</p><span className="demo-label">Demo içerik</span><Link href="/kartal" prefetch={false} className="text-link">Kartal’a bak <span aria-hidden="true">↗</span></Link></FadeIn></div>
        <ImageReveal className="place__media"><PhotoPlaceholder label="Kartal fotoğrafı eklenecek" /></ImageReveal>
      </Container></section>
      <section className="place place--istanbul" aria-labelledby="istanbul-heading"><PhotoPlaceholder label="İstanbul fotoğrafı eklenecek" className="photo-placeholder--fill photo-placeholder--istanbul" /><Container className="place__overlay"><p className="section-index">05 / Metropol</p><h2 id="istanbul-heading">İSTANBUL</h2><FadeIn className="place__overlay-copy"><p>Kentin gündemi, meclis çalışmaları ve İstanbul’a dair değerlendirmeler için yalın bir giriş.</p><span className="demo-label">Demo içerik</span><Link href="/istanbul" prefetch={false} className="text-link text-link--light">İstanbul’a bak <span aria-hidden="true">↗</span></Link></FadeIn></Container></section>
    </>
  );
}

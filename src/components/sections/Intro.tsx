import { Container } from "@/components/ui/Container";
import { FadeIn } from "@/components/motion/FadeIn";
import { TextReveal } from "@/components/motion/TextReveal";

export function Intro() {
  return (
    <section className="intro" aria-labelledby="intro-heading">
      <Container className="intro__grid">
        <p className="section-index">02 / Yaklaşım</p>
        <div className="intro__display" id="intro-heading" role="heading" aria-level={2}>
          <TextReveal>EKREM</TextReveal><TextReveal>ERAY</TextReveal><TextReveal>ARDA</TextReveal>
        </div>
        <FadeIn className="intro__copy">
          <p className="demo-label">Tanıtım metni · Demo içerik</p>
          <p>Kartal ve İstanbul odağında kamusal çalışmaları, güncel açıklamaları ve sahadan notları yalın bir editoryal düzende bir araya getiren kişisel platform.</p>
          <p className="intro__note">Doğrulanmış biyografi metni sağlandığında bu nötr tanıtım içeriği güncellenecektir.</p>
        </FadeIn>
      </Container>
    </section>
  );
}

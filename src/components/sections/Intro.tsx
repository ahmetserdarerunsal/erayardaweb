import Link from "next/link";
import { Container } from "@/components/ui/Container";

export function Intro({ title }: { title: string }) {
  return (
    <section
      className="activities-intro"
      id="calismalar"
      aria-labelledby="activities-intro-heading"
    >
      <Container>
        <header className="activities-intro__header">
          <p className="section-kicker">03 / Paylaşımlar</p>
          <h2 id="activities-intro-heading">PAYLAŞIMLAR</h2>
        </header>

        <div className="activities-intro__body">
          <p className="activities-intro__role">{title}</p>
          <p className="activities-intro__lead">
            Meclis çalışmaları, saha ziyaretleri, toplantılar ve katılım sağlanan
            etkinlikler.
          </p>
        </div>

        <nav className="activities-intro__links" aria-label="Paylaşımlar">
          <Link href="/faaliyetler">
            <span className="activities-intro__link-title">Tüm Paylaşımları Gör</span>
            <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </Container>
    </section>
  );
}

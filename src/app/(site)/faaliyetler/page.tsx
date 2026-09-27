import type { Metadata } from "next";
import { ActivityArchive } from "@/components/sections/ActivityArchive";
import { Container } from "@/components/ui/Container";

const lead = "Meclis çalışmaları, ziyaretler, toplantılar ve etkinlikler.";

export const metadata: Metadata = {
  title: "Paylaşımlar",
  description: lead,
};

export default function ActivitiesPage() {
  return (
    <main id="ana-icerik" className="activities-page">
      <section className="activities-page__hero">
        <Container>
          <p className="section-kicker">03 / Paylaşımlar</p>
          <h1>PAYLAŞIMLAR</h1>
          <p className="activities-page__lead">{lead}</p>
        </Container>
      </section>

      <ActivityArchive />
    </main>
  );
}

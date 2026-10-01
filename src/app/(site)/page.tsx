import { Hero } from "@/components/sections/Hero";
import { getSiteProfile } from "@/lib/public-content";

export default async function Home() {
  const profile = await getSiteProfile();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: profile.name,
    jobTitle: profile.title,
  };

  return (
    <main id="ana-icerik">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Hero title={profile.title} />
    </main>
  );
}

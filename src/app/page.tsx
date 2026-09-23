import { Hero } from "@/components/sections/Hero";
import { Intro } from "@/components/sections/Intro";
import { SelectedWorks } from "@/components/sections/SelectedWorks";
import { PlacePreviews } from "@/components/sections/PlacePreviews";
import { PressPreview } from "@/components/sections/PressPreview";
import { MediaPreview } from "@/components/sections/MediaPreview";
import { SocialSection } from "@/components/sections/SocialSection";
import { profile } from "@/data/profile";

export default function Home() {
  const structuredData = { "@context": "https://schema.org", "@type": "Person", name: profile.name, jobTitle: profile.title };
  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <Hero />
      <Intro />
      <SelectedWorks />
      <PlacePreviews />
      <PressPreview />
      <MediaPreview />
      <SocialSection />
    </main>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import aboutPhoto from "../../../../public/images/ekrem-eray-arda-hero-kursu-istanbul.png";
import { BiographyReveal } from "@/components/motion/BiographyReveal";
import { getAboutContent, getSiteProfile } from "@/lib/public-content";

export async function generateMetadata(): Promise<Metadata> {
  const profile = await getSiteProfile();
  return { title: "Hakkında", description: `${profile.name} — ${profile.title}.` };
}

export default async function AboutPage() {
  const [profile, about] = await Promise.all([getSiteProfile(), getAboutContent()]);
  return (
    <main id="ana-icerik" className="about-page">
      <section className="about-page__hero" aria-labelledby="about-title">
        <div className="about-page__copy">
          <p className="about-page__label">Hakkında</p>
          <h1 id="about-title">
            <span>Ekrem</span>
            {" "}
            <span>Eray Arda</span>
          </h1>
          <p className="about-page__role">{profile.title}</p>
          <p className="about-page__summary">{about.heroSummary}</p>
        </div>

        <figure className="about-page__media">
          <Image
            className="about-page__image"
            src={aboutPhoto}
            alt="Ekrem Eray Arda kürsüde konuşma yaparken"
            sizes="100vw"
            quality={90}
            preload
          />
        </figure>
      </section>

      <section className="biography" aria-label="Biyografi">
        {about.sections.map((section, index) => (
          <article
            className={`biography-section biography-section--${index % 2 === 0 ? "light" : "dark"}`}
            key={section.number}
          >
            <BiographyReveal
              className="container biography-section__inner"
              immediate={index === 0}
            >
              <div className="biography-section__meta">
                <span>{section.number}</span>
                <span>{section.category}</span>
              </div>

              <h2>{section.title}</h2>

              <div className="biography-section__content">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}

                {section.subsections?.map((subsection) => (
                  <div className="biography-section__subsection" key={subsection.title}>
                    <h3>{subsection.title}</h3>
                    {subsection.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                ))}
              </div>
            </BiographyReveal>
          </article>
        ))}
      </section>
    </main>
  );
}

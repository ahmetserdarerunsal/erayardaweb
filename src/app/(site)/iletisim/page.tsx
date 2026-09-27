import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { contactCopy } from "@/lib/site-constants";
import { getSocialPlatforms, type SocialPlatform } from "@/lib/public-content";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { ContactForm } from "./ContactForm";

export const metadata: Metadata = {
  title: "İletişim",
  description: "Ekrem Eray Arda ile iletişim ve sosyal medya bağlantıları.",
};

type SocialPlatformId = SocialPlatform["id"];

function PlatformIcon({ id }: { id: SocialPlatformId }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
  };

  if (id === "instagram") {
    return (
      <svg {...common} className="contact-social__icon">
        <rect x="3.2" y="3.2" width="17.6" height="17.6" rx="5" />
        <circle cx="12" cy="12" r="4.1" />
        <circle cx="17.1" cy="6.9" r="0.9" fill="currentColor" stroke="none" />
      </svg>
    );
  }

  if (id === "facebook") {
    return (
      <svg {...common} className="contact-social__icon">
        <path d="M15.4 4.4h-1.7a3 3 0 0 0-3 3v12.2" />
        <path d="M8.6 11.7h5.6" />
      </svg>
    );
  }

  return (
    <svg {...common} className="contact-social__icon">
      <path d="M5.2 5.2 18.8 18.8" />
      <path d="M18.8 5.2 5.2 18.8" />
    </svg>
  );
}

function SocialRow({ id, label, href }: { id: SocialPlatformId; label: string; href: string | null }) {
  // Adres tanımlanmadıysa satır bağlantı değildir, tıklanamaz.
  if (!href) {
    return (
      <div className="contact-social__row" data-pending="true">
        <PlatformIcon id={id} />
        <span className="contact-social__label">{label}</span>
        <span className="contact-social__pending">Yakında</span>
      </div>
    );
  }

  return (
    <a
      className="contact-social__row"
      href={href}
      rel="me noopener noreferrer"
      target="_blank"
    >
      <PlatformIcon id={id} />
      <span className="contact-social__label">{label}</span>
      <span className="contact-social__arrow" aria-hidden="true">
        →
      </span>
    </a>
  );
}

export default async function ContactPage() {
  const socialPlatforms = await getSocialPlatforms();
  const formEnabled = isSupabaseConfigured;

  return (
    <main id="ana-icerik" className="contact-page">
      <section className="contact-page__hero">
        <Container>
          <p className="section-kicker">{contactCopy.kicker}</p>
          <h1>{contactCopy.title}</h1>
        </Container>
      </section>

      <Container>
        <div className="contact-layout">
          <section className="contact-social" aria-labelledby="contact-social-heading">
            <h2 id="contact-social-heading" className="section-kicker">
              {contactCopy.socialHeading}
            </h2>

            <div className="contact-social__list">
              {socialPlatforms.map((platform) => (
                <SocialRow
                  key={platform.id}
                  id={platform.id}
                  label={platform.label}
                  href={platform.href}
                />
              ))}
            </div>
          </section>

          <section className="contact-listen" aria-labelledby="contact-listen-heading">
            <h2 id="contact-listen-heading">{contactCopy.listenHeading}</h2>
            <p className="contact-listen__lead">{contactCopy.listenLead}</p>

            <ContactForm enabled={formEnabled} />
          </section>
        </div>
      </Container>
    </main>
  );
}

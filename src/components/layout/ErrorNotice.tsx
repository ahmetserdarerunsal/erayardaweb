import Link from "next/link";
import { Container } from "@/components/ui/Container";

type ErrorNoticeProps = {
  /** Büyük tipografiyle yazılan kod: 404, HATA … */
  code: string;
  title: string;
  description: string;
  /** Sunucu hatalarında "tekrar dene" düğmesi için. */
  action?: React.ReactNode;
};

/**
 * 404 ve hata ekranlarının ortak gövdesi.
 *
 * Kök `not-found.tsx` bunu Header/Footer ile sarar; `(site)` grubundaki
 * sürüm ise çerçeveyi zaten grubun yerleşiminden aldığı için sarmaz.
 */
export function ErrorNotice({ code, title, description, action }: ErrorNoticeProps) {
  return (
    <main id="ana-icerik" className="interior">
      <Container>
        <div className="interior__topline">
          <span className="section-kicker">{code}</span>
          <span className="status-label">{title}</span>
        </div>

        <h1>{title.toLocaleUpperCase("tr-TR")}</h1>

        <div className="interior__message">
          <p>{description}</p>
          {action}
          <Link className="arrow-link" href="/">
            Ana sayfaya dön
            <span aria-hidden="true">↙</span>
          </Link>
        </div>
      </Container>
    </main>
  );
}

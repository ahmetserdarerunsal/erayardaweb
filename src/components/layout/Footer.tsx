import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { navigation } from "@/lib/site-constants";

const footerNavigation = navigation;

export function Footer({ name, title }: { name: string; title: string }) {
  return (
    <footer className="site-footer">
      <Container>
        <div className="site-footer__main">
          <div className="site-footer__identity">
            <Link className="site-footer__brand" href="/">
              {name}
            </Link>
            <p className="site-footer__title">{title}</p>
          </div>

          <nav aria-label="Alt navigasyon" className="footer-nav">
            {footerNavigation.map((item) => (
              <Link key={item.href} href={item.href}>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="site-footer__bottom">
          <span>© {new Date().getFullYear()} {name.toUpperCase()}. Tüm hakları saklıdır.</span>
          <span>Kartal · İstanbul</span>
        </div>
      </Container>
    </footer>
  );
}

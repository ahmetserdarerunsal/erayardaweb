import Link from "next/link";
import { Container } from "@/components/ui/Container";
import { navigation, profile } from "@/data/profile";
import { socialLinks } from "@/data/social";

export function Footer() {
  return (
    <footer className="site-footer">
      <Container>
        <div className="site-footer__top">
          <div><p className="site-footer__name">EKREM ERAY<br />ARDA</p><p className="site-footer__title">{profile.title}</p></div>
          <nav aria-label="Alt navigasyon" className="footer-nav">{navigation.map((item) => <Link key={item.href} href={item.href} prefetch={item.href === "/" ? undefined : false}>{item.label}</Link>)}</nav>
          <div className="footer-social">{socialLinks.map((item) => <a key={item.label} href={item.href} target="_blank" rel="noreferrer">{item.label}</a>)}</div>
        </div>
        <div className="site-footer__bottom"><span>© {new Date().getFullYear()} {profile.name}</span><span>İçerikler güncellenecektir.</span></div>
      </Container>
    </footer>
  );
}

import Link from "next/link";
import { HeaderNavigation } from "./HeaderNavigation";
import { MobileMenu } from "./MobileMenu";

export function Header({ name, title }: { name: string; title: string }) {
  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="wordmark" aria-label={`${name} ana sayfa`}>
          <span>Ekrem Eray Arda</span>
        </Link>

        <HeaderNavigation />

        <MobileMenu name={name} title={title} />
      </div>
    </header>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { navigation } from "@/lib/site-constants";

export function HeaderNavigation() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateHeader = () => setScrolled(window.scrollY > 24);

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
    return () => window.removeEventListener("scroll", updateHeader);
  }, [pathname]);

  return (
    <>
      {/* Yalnızca kaydırma durumu. Hangi sayfada olunduğu CSS tarafında,
          sayfanın render ettiği hero'dan okunuyor; burada üretilince ilk
          boyamada yanlış oluyordu. */}
      <span className="header-route-state" data-scrolled={scrolled ? "true" : "false"} hidden />

      <nav className="desktop-nav" aria-label="Ana navigasyon">
        {navigation.slice(0, -1).map((item) => {
          const active = pathname === item.href;

          return (
            <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined}>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <Link
        className="header-contact"
        href="/iletisim"
        aria-current={pathname === "/iletisim" ? "page" : undefined}
      >
        İletişim <span aria-hidden="true">↗</span>
      </Link>
    </>
  );
}

"use client";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { MobileMenu } from "./MobileMenu";
import { navigation, profile } from "@/data/profile";

export function Header() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 32);
    onScroll(); window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <header className={`site-header ${scrolled ? "site-header--solid" : ""}`}>
        <div className="site-header__inner">
          <Link href="/" className="wordmark" aria-label={`${profile.name} ana sayfa`}><span>EKREM ERAY</span><span>ARDA</span></Link>
          <nav className="desktop-nav" aria-label="Ana navigasyon">
            {navigation.map((item) => <Link key={item.href} href={item.href} prefetch={item.href === "/" ? undefined : false}>{item.label}</Link>)}
          </nav>
          <button type="button" className="menu-button header-menu-button" aria-expanded={open} aria-controls="mobile-menu-panel" onClick={() => setOpen(true)}>MENÜ</button>
        </div>
      </header>
      <MobileMenu open={open} onClose={close} />
    </>
  );
}

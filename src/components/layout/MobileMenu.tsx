"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { navigation } from "@/lib/site-constants";

export function MobileMenu({ name, title }: { name: string; title: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const openButtonRef = useRef<HTMLButtonElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const openButton = openButtonRef.current;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpen(false);
        return;
      }

      if (event.key !== "Tab") return;
      const panel = document.getElementById("mobile-menu-panel");
      const focusable = panel?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled])',
      );

      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      openButton?.focus();
    };
  }, [open]);

  return (
    <div className="mobile-navigation">
      <button
        ref={openButtonRef}
        type="button"
        className="menu-toggle"
        aria-expanded={open}
        aria-controls="mobile-menu-panel"
        onClick={() => setOpen(true)}
      >
        <span>Menü</span>
        <i aria-hidden="true" />
      </button>

      {open ? (
        <div
          id="mobile-menu-panel"
          className="mobile-menu"
          role="dialog"
          aria-modal="true"
          aria-label="Ana menü"
        >
          <div className="mobile-menu__top">
            <Link href="/" className="mobile-menu__brand" onClick={() => setOpen(false)}>
              {name}
            </Link>
            <button
              ref={closeButtonRef}
              type="button"
              className="menu-close"
              onClick={() => setOpen(false)}
              aria-label="Menüyü kapat"
            >
              Kapat
            </button>
          </div>

          <nav aria-label="Mobil ana navigasyon" className="mobile-menu__nav">
            {navigation.map((item, index) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={pathname === item.href ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <span aria-hidden="true">0{index + 1}</span>
                {item.label}
              </Link>
            ))}
          </nav>

          <p className="mobile-menu__foot">{title}</p>
        </div>
      ) : null}
    </div>
  );
}

"use client";
import Link from "next/link";
import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { navigation, profile } from "@/data/profile";

export function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const priorOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab") return;
      const panel = document.getElementById("mobile-menu-panel");
      const focusable = panel?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = priorOverflow; document.removeEventListener("keydown", onKeyDown); };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div id="mobile-menu-panel" className="mobile-menu" role="dialog" aria-modal="true" aria-label="Ana menü" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }}>
          <div className="mobile-menu__top">
            <Link href="/" className="mobile-menu__brand" onClick={onClose}>{profile.name}</Link>
            <button ref={closeRef} type="button" className="menu-button" onClick={onClose} aria-label="Menüyü kapat"><span aria-hidden="true">KAPAT</span></button>
          </div>
          <nav aria-label="Mobil ana navigasyon" className="mobile-menu__nav">
            {navigation.map((item, index) => (
              <motion.div key={item.href} initial={reduce ? false : { opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: reduce ? 0 : 0.08 + index * 0.045 }}>
                <Link href={item.href} prefetch={item.href === "/" ? undefined : false} onClick={onClose}><span aria-hidden="true">0{index + 1}</span>{item.label}</Link>
              </motion.div>
            ))}
          </nav>
          <p className="mobile-menu__foot">{profile.title}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

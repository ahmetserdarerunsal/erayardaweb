"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { adminNavigation } from "@/lib/admin/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { AdminSession } from "@/lib/admin/session";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR") ?? "")
    .join("");
}

export function AdminShell({
  session,
  unreadCount,
  children,
}: {
  session: AdminSession;
  unreadCount: number;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  const visibleNav = adminNavigation.filter(
    (item) => !item.yoneticiOnly || session.role === "yonetici",
  );

  const activeItem = visibleNav.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.replace("/admin/giris");
    router.refresh();
  }

  return (
    <div className="admin-shell" data-drawer={drawerOpen ? "open" : "closed"}>
      {drawerOpen ? (
        <button
          className="admin-scrim"
          type="button"
          aria-label="Menüyü kapat"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <aside className="admin-sidebar">
        <button
          className="admin-drawer-close"
          type="button"
          onClick={() => setDrawerOpen(false)}
        >
          Menüyü kapat
        </button>

        <Link
          className="admin-sidebar__brand"
          href="/admin"
          onClick={() => setDrawerOpen(false)}
        >
          Ekrem Eray Arda
          <span>Yönetim Paneli</span>
        </Link>

        <nav className="admin-nav" aria-label="Panel menüsü">
          {visibleNav.map((item) => {
            const isActive = item === activeItem;
            const showBadge = item.href === "/admin/mesajlar" && unreadCount > 0;

            if (!item.ready) {
              return (
                <a key={item.href} aria-disabled="true" title="Bu bölüm henüz hazır değil">
                  {item.label}
                  <span className="admin-nav__soon">Yakında</span>
                </a>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                onClick={() => setDrawerOpen(false)}
              >
                {item.label}
                {showBadge ? <span className="admin-nav__badge">{unreadCount}</span> : null}
              </Link>
            );
          })}
        </nav>

        <div className="admin-sidebar__foot">
          <a href="/" target="_blank" rel="noopener noreferrer">
            Siteyi görüntüle ↗
          </a>
        </div>
      </aside>

      <div className="admin-main">
        <header className="admin-topbar">
          <button
            className="admin-drawer-toggle"
            type="button"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen(true)}
          >
            Menü
          </button>

          <h1 className="admin-topbar__title">{activeItem?.label ?? "Yönetim Paneli"}</h1>

          <div className="admin-topbar__spacer" />

          <div className="admin-topbar__user">
            <span className="admin-topbar__avatar" aria-hidden="true">
              {initials(session.fullName)}
            </span>
            <span>
              {session.fullName}
              <span className="admin-topbar__role">
                {session.role === "yonetici" ? "Yönetici" : "Editör"}
              </span>
            </span>
          </div>

          <button
            className="admin-btn admin-btn--ghost"
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Çıkılıyor" : "Çıkış"}
          </button>
        </header>

        <main className="admin-content">{children}</main>
      </div>
    </div>
  );
}

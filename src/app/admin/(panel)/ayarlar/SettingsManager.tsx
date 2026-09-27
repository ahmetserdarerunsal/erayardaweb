"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "../fotograflar/actions";
import { updateSocialLinks, type SocialInput } from "./actions";

const VARSAYILAN: SocialInput[] = [
  { id: "instagram", label: "Instagram", href: "" },
  { id: "facebook", label: "Facebook", href: "" },
  { id: "x", label: "X", href: "" },
];

export function SettingsManager({ links }: { links: SocialInput[] }) {
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  // Kayıtta olmayan platformlar da boş olarak gösterilir ki sonradan
  // eklemek için veritabanına dokunmak gerekmesin.
  const satirlar = VARSAYILAN.map(
    (varsayilan) => links.find((item) => item.id === varsayilan.id) ?? varsayilan,
  );

  return (
    <>
      <section className="admin-card admin-manage-head">
        <div>
          <p className="admin-eyebrow">Site genelinde</p>
          <h2>Site Ayarları</h2>
          <p>
            Sosyal medya bağlantıları hem İletişim sayfasında hem alt bilgide
            kullanılır. Boş bıraktığınız bağlantı sitede tıklanamaz görünür —
            olmayan bir adres yazmaktansa boş bırakın.
          </p>
        </div>

        <form
          className="admin-form admin-manage-head__wide"
          action={(formData) =>
            startTransition(async () =>
              setFeedback(
                await updateSocialLinks(
                  satirlar.map((satir) => ({
                    id: satir.id,
                    label: satir.label,
                    href: String(formData.get(satir.id) ?? ""),
                  })),
                ),
              ),
            )
          }
        >
          {satirlar.map((satir) => (
            <div className="admin-field" key={satir.id}>
              <label htmlFor={`link-${satir.id}`}>{satir.label}</label>
              <input
                id={`link-${satir.id}`}
                name={satir.id}
                type="url"
                defaultValue={satir.href ?? ""}
                placeholder="https://…"
              />
              <p className="admin-field__hint">
                {satir.href ? "Sitede tıklanabilir." : "Boş — sitede pasif görünüyor."}
              </p>
            </div>
          ))}

          <div className="admin-actions">
            <button className="admin-btn" disabled={pending}>
              Bağlantıları kaydet
            </button>
          </div>
        </form>
      </section>

      {feedback ? (
        <p className="admin-feedback" data-ok={feedback.ok} role="status">
          {feedback.message}
        </p>
      ) : null}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Kodda tanımlı ayarlar</h2>
        </div>
        <div className="admin-note">
          <p>
            <strong>Site adresi</strong> (<code>NEXT_PUBLIC_SITE_URL</code>) panelden
            değiştirilemez. Derleme sırasında koda gömülüyor; sitemap, robots.txt,
            canonical ve paylaşım görseli adresleri ondan üretiliyor. Değiştirmek
            için Vercel → Settings → Environment Variables, sonra yeniden deploy.
          </p>
          <p>
            <strong>Kurumsal renkler ve tipografi</strong> <code>globals.css</code>
            içindeki değişkenlerde durur. Tema değiştirmek kod değişikliği gerektirir.
          </p>
        </div>
      </section>
    </>
  );
}

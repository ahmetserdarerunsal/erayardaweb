"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "../fotograflar/actions";
import {
  discardDraft,
  publishPageSection,
  saveBiographyDraft,
  saveProfileDraft,
} from "./actions";

export type ProfileContent = { name?: string; title?: string; description?: string };
export type BiographySection = { title?: string; paragraphs?: string[] };
export type BiographyContent = { heroSummary?: string; sections?: BiographySection[] };

export type SectionState<T> = {
  draft: T;
  published: T | null;
  /** Taslak ile yayındaki sürüm farklı mı? */
  dirty: boolean;
  publishedAt: string | null;
};

/** Bölümleri `## Başlık` biçiminde düz metne çevirir. */
function biographyToText(content: BiographyContent): string {
  return (content.sections ?? [])
    .map((s) => `## ${s.title ?? ""}\n\n${(s.paragraphs ?? []).join("\n\n")}`)
    .join("\n\n");
}

const formatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function DurumSatiri({
  state,
  canPublish,
  pending,
  onPublish,
  onDiscard,
}: {
  state: SectionState<unknown>;
  canPublish: boolean;
  pending: boolean;
  onPublish: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="admin-actions admin-publish-bar">
      <span className="admin-status">
        {state.dirty ? "Yayımlanmamış değişiklik var" : "Yayındaki sürümle aynı"}
      </span>
      {state.publishedAt ? (
        <span className="admin-field__hint">
          Son yayım: {formatter.format(new Date(state.publishedAt))}
        </span>
      ) : (
        <span className="admin-field__hint">Hiç yayımlanmadı</span>
      )}
      {canPublish ? (
        <button className="admin-btn" type="button" disabled={pending || !state.dirty} onClick={onPublish}>
          Yayımla
        </button>
      ) : (
        <span className="admin-field__hint">Yayımlama yetkiniz yok.</span>
      )}
      {state.dirty && state.published ? (
        <button className="admin-btn admin-btn--ghost" type="button" disabled={pending} onClick={onDiscard}>
          Değişiklikleri at
        </button>
      ) : null}
    </div>
  );
}

export function PageManager({
  profile,
  biography,
  canPublish,
}: {
  profile: SectionState<ProfileContent>;
  biography: SectionState<BiographyContent>;
  canPublish: boolean;
}) {
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => setFeedback(await action()));

  return (
    <>
      <section className="admin-card admin-manage-head">
        <div>
          <p className="admin-eyebrow">Sayfa metinleri</p>
          <h2>Sayfa Yönetimi</h2>
          <p>
            Ana sayfa ve Hakkında sayfasının metinleri. Her bölümün taslağı ve
            yayındaki sürümü ayrı tutulur: yazdığınız şey siz{" "}
            <strong>Yayımla</strong> demeden ziyaretçiye görünmez.
          </p>
        </div>
      </section>

      {feedback ? (
        <p className="admin-feedback" data-ok={feedback.ok} role="status">
          {feedback.message}
        </p>
      ) : null}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Site kimliği</h2>
          <span>Başlıkta, alt bilgide ve arama sonuçlarında görünür</span>
        </div>

        <div className="admin-card">
          <form
            className="admin-form"
            action={(formData) =>
              run(() =>
                saveProfileDraft({
                  name: String(formData.get("name") ?? ""),
                  title: String(formData.get("title") ?? ""),
                  description: String(formData.get("description") ?? ""),
                }),
              )
            }
          >
            <div className="admin-field">
              <label htmlFor="profile-name">Ad soyad</label>
              <input id="profile-name" name="name" defaultValue={profile.draft.name ?? ""} required maxLength={120} />
            </div>
            <div className="admin-field">
              <label htmlFor="profile-title">Unvan</label>
              <input id="profile-title" name="title" defaultValue={profile.draft.title ?? ""} required maxLength={160} />
            </div>
            <div className="admin-field">
              <label htmlFor="profile-description">Arama motoru açıklaması</label>
              <textarea
                id="profile-description"
                name="description"
                defaultValue={profile.draft.description ?? ""}
                rows={3}
                maxLength={320}
              />
              <p className="admin-field__hint">
                Google sonuçlarında başlığın altında çıkar. 320 karakterden uzunu kesilir.
              </p>
            </div>
            <div className="admin-actions">
              <button className="admin-btn admin-btn--ghost" disabled={pending}>
                Taslağı kaydet
              </button>
            </div>
          </form>

          <DurumSatiri
            state={profile}
            canPublish={canPublish}
            pending={pending}
            onPublish={() => run(() => publishPageSection("site", "profile"))}
            onDiscard={() => run(() => discardDraft("site", "profile"))}
          />
        </div>
      </section>

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Biyografi</h2>
          <span>Hakkında sayfası</span>
        </div>

        <div className="admin-card">
          <form
            className="admin-form"
            action={(formData) =>
              run(() =>
                saveBiographyDraft({
                  heroSummary: String(formData.get("heroSummary") ?? ""),
                  sections: String(formData.get("sections") ?? ""),
                }),
              )
            }
          >
            <div className="admin-field">
              <label htmlFor="bio-hero">Giriş özeti</label>
              <textarea
                id="bio-hero"
                name="heroSummary"
                defaultValue={biography.draft.heroSummary ?? ""}
                rows={3}
              />
              <p className="admin-field__hint">
                Hakkında sayfasında fotoğrafın yanında duran kısa paragraf.
              </p>
            </div>

            <div className="admin-field">
              <label htmlFor="bio-sections">Bölümler</label>
              <textarea
                id="bio-sections"
                name="sections"
                defaultValue={biographyToText(biography.draft)}
                rows={20}
              />
              <p className="admin-field__hint">
                Her bölüm <code>## Başlık</code> satırıyla başlar. Altındaki
                paragrafları boş satırla ayırın. Bölüm numaraları kendiliğinden
                verilir.
              </p>
            </div>

            <div className="admin-actions">
              <button className="admin-btn admin-btn--ghost" disabled={pending}>
                Taslağı kaydet
              </button>
            </div>
          </form>

          <DurumSatiri
            state={biography}
            canPublish={canPublish}
            pending={pending}
            onPublish={() => run(() => publishPageSection("about", "biography"))}
            onDiscard={() => run(() => discardDraft("about", "biography"))}
          />
        </div>
      </section>
    </>
  );
}

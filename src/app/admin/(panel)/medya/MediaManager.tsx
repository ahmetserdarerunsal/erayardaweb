"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { MEDIA_BUCKET, SUPABASE_URL } from "@/lib/supabase/config";
import type { ActionResult } from "../fotograflar/actions";
import { deleteMedia, updateMediaAlt } from "./actions";

export type MediaItem = {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  width: number;
  height: number;
  alt_text: string;
  created_at: string;
  /** Sunucuda hesaplanan kullanım yerleri. */
  usage: string[];
};

function storageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.round(bytes / 1024)} KB`;
}

const formatter = new Intl.DateTimeFormat("tr-TR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function MediaManager({
  media,
  canDelete,
  totalBytes,
}: {
  media: MediaItem[];
  canDelete: boolean;
  totalBytes: number;
}) {
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"hepsi" | "kullanilan" | "bos">("hepsi");
  const [pending, startTransition] = useTransition();

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => setFeedback(await action()));

  const gorunen = media.filter((item) =>
    filter === "kullanilan"
      ? item.usage.length > 0
      : filter === "bos"
        ? item.usage.length === 0
        : true,
  );
  const bosSayisi = media.filter((item) => item.usage.length === 0).length;

  return (
    <>
      <section className="admin-card admin-manage-head">
        <div>
          <p className="admin-eyebrow">Depo</p>
          <h2>Medya Kütüphanesi</h2>
          <p>
            Panele yüklenmiş bütün görseller. Yükleme, kullanılacağı bölümden
            yapılır — fotoğraf albümünden, video kapağından veya paylaşımdan.
            Burası yüklenenleri görmek, açıklamalarını düzeltmek ve artık
            kullanılmayanları temizlemek içindir.
          </p>
        </div>

        <div className="admin-note">
          <p>
            {media.length} dosya · toplam {formatSize(totalBytes)} ·{" "}
            {bosSayisi > 0
              ? `${bosSayisi} dosya hiçbir yerde kullanılmıyor`
              : "hepsi kullanımda"}
          </p>
        </div>

        <div className="admin-inline-form admin-manage-head__wide">
          {(
            [
              ["hepsi", `Hepsi (${media.length})`],
              ["kullanilan", `Kullanımda (${media.length - bosSayisi})`],
              ["bos", `Kullanılmayan (${bosSayisi})`],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`admin-btn ${filter === id ? "" : "admin-btn--ghost"}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      {feedback ? (
        <p className="admin-feedback" data-ok={feedback.ok} role="status">
          {feedback.message}
        </p>
      ) : null}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Dosyalar</h2>
          <span>{gorunen.length} görünüyor</span>
        </div>

        {gorunen.length === 0 ? (
          <p className="admin-empty">
            {media.length === 0
              ? "Henüz dosya yüklenmemiş."
              : "Bu süzgeçle eşleşen dosya yok."}
          </p>
        ) : (
          <div className="admin-record-list">
            {gorunen.map((item) => (
              <article className="admin-card admin-record" key={item.id}>
                <div className="admin-record__cover">
                  <Image
                    src={storageUrl(item.storage_path)}
                    alt={item.alt_text || ""}
                    width={320}
                    height={180}
                  />
                </div>

                <div>
                  <p className="admin-eyebrow">
                    {item.width}×{item.height} · {formatSize(item.size_bytes)} ·{" "}
                    {formatter.format(new Date(item.created_at))}
                  </p>
                  <h3>{item.file_name}</h3>

                  {item.usage.length > 0 ? (
                    <p>Kullanıldığı yer: {item.usage.join(", ")}</p>
                  ) : (
                    <p className="admin-note">
                      Hiçbir yerde kullanılmıyor — silinebilir.
                    </p>
                  )}

                  {editing === item.id ? (
                    <form
                      className="admin-form"
                      action={(formData) => {
                        setEditing(null);
                        run(() =>
                          updateMediaAlt(item.id, String(formData.get("altText") ?? "")),
                        );
                      }}
                    >
                      <div className="admin-field">
                        <label htmlFor={`alt-${item.id}`}>
                          Alternatif metin — görseli göremeyenler için
                        </label>
                        <input
                          id={`alt-${item.id}`}
                          name="altText"
                          defaultValue={item.alt_text}
                          maxLength={300}
                          placeholder="Görselde ne olduğunu yazın"
                        />
                        <p className="admin-field__hint">
                          Bilmiyorsanız boş bırakın; uydurma açıklama yazmayın.
                        </p>
                      </div>
                      <div className="admin-actions">
                        <button className="admin-btn" disabled={pending}>
                          Kaydet
                        </button>
                        <button
                          className="admin-btn admin-btn--ghost"
                          type="button"
                          onClick={() => setEditing(null)}
                        >
                          Vazgeç
                        </button>
                      </div>
                    </form>
                  ) : (
                    <p>
                      {item.alt_text ? (
                        <>Alternatif metin: {item.alt_text}</>
                      ) : (
                        <em>Alternatif metin girilmemiş.</em>
                      )}
                    </p>
                  )}
                </div>

                <div className="admin-record__action">
                  <span>{item.usage.length > 0 ? "Kullanımda" : "Boşta"}</span>

                  <a
                    className="admin-btn admin-btn--ghost"
                    href={storageUrl(item.storage_path)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Aç ↗
                  </a>

                  {editing !== item.id ? (
                    <button
                      className="admin-btn admin-btn--ghost"
                      type="button"
                      disabled={pending}
                      onClick={() => setEditing(item.id)}
                    >
                      Açıklama
                    </button>
                  ) : null}

                  {canDelete && item.usage.length === 0 ? (
                    <button
                      className="admin-btn admin-btn--ghost"
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        // Silme geri alınamaz; dosya depodan da kalkar.
                        if (!window.confirm(`"${item.file_name}" kalıcı olarak silinsin mi?`)) {
                          return;
                        }
                        run(() => deleteMedia(item.id));
                      }}
                    >
                      Sil
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

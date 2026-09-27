"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  MEDIA_BUCKET,
  SUPABASE_URL,
} from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { analyzeVideoUrl, videoProviderAdapters } from "@/lib/video-providers";
import type { ActionResult } from "../fotograflar/actions";
import {
  clearVideoCustomThumbnail,
  createVideo,
  refreshVideoThumbnail,
  setVideoCustomThumbnail,
  setVideoPublication,
  updateVideoDetails,
  type UploadedThumbnail,
} from "./actions";

type Video = {
  id: string;
  title: string;
  description: string;
  provider: string;
  original_url: string | null;
  thumbnail_url: string | null;
  custom_thumbnail_media_id: string | null;
  embed_status: string;
  status: string;
  created_at: string;
};

type Media = { id: string; storage_path: string; width: number; height: number };

function storageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

/** Yüklenen görselin gerçek boyutunu okur; kayıt boyutsuz yapılmaz. */
function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    image.src = url;
  });
}

export function VideoManager({
  videos,
  media,
  canPublish,
}: {
  videos: Video[];
  media: Media[];
  canPublish: boolean;
}) {
  const [url, setUrl] = useState("");
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const analysis = analyzeVideoUrl(url);
  const mediaMap = new Map(media.map((item) => [item.id, item]));

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => setFeedback(await action()));

  async function uploadCover(videoId: string, files: FileList | null) {
    const file = files?.[0];
    if (!file) return;

    if (!ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number])) {
      setFeedback({ ok: false, message: "Yalnızca JPEG, PNG, WebP ve AVIF yüklenebilir." });
      return;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setFeedback({ ok: false, message: "Dosya 10 MB sınırını aşıyor." });
      return;
    }

    const dimensions = await readDimensions(file);
    if (dimensions.width < 1) {
      setFeedback({ ok: false, message: "Görsel okunamadı." });
      return;
    }

    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-60);
    const storagePath = `videolar/${videoId}/${crypto.randomUUID()}-${safeName}`;

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (error) {
      setFeedback({ ok: false, message: `Yükleme başarısız: ${error.message}` });
      return;
    }

    const uploaded: UploadedThumbnail = {
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      ...dimensions,
    };
    run(() => setVideoCustomThumbnail(videoId, uploaded));
  }

  return (
    <>
      <section className="admin-card admin-manage-head">
        <div>
          <p className="admin-eyebrow">Bağlantı ile ekle</p>
          <h2>Video arşivi</h2>
          <p>YouTube, Vimeo, Instagram, Facebook, X ve TikTok bağlantıları otomatik tanınır.</p>
        </div>
        <form
          className="admin-form"
          action={(formData) =>
            run(() =>
              createVideo({
                url: String(formData.get("url") ?? ""),
                title: String(formData.get("title") ?? ""),
                description: String(formData.get("description") ?? ""),
              }),
            )
          }
        >
          <div className="admin-field">
            <label htmlFor="video-url">Video bağlantısı</label>
            <input
              id="video-url"
              name="url"
              type="url"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://…"
            />
            <p className="admin-field__hint">
              {url
                ? analysis.supported && analysis.provider
                  ? `${videoProviderAdapters[analysis.provider as keyof typeof videoProviderAdapters]?.label ?? analysis.provider} algılandı`
                  : analysis.message
                : "HTTPS platform bağlantısını yapıştırın."}
            </p>
          </div>
          <div className="admin-field">
            <label htmlFor="video-title">Başlık</label>
            <input
              id="video-title"
              name="title"
              maxLength={180}
              placeholder="YouTube/Vimeo için boş bırakılabilir"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="video-description">Açıklama</label>
            <textarea id="video-description" name="description" rows={3} maxLength={1000} />
          </div>
          <button className="admin-btn" disabled={pending || !analysis.supported}>
            Videoyu ekle
          </button>
        </form>
      </section>

      {feedback ? (
        <p className="admin-feedback" data-ok={feedback.ok} role="status">
          {feedback.message}
        </p>
      ) : null}

      <section className="admin-section">
        <div className="admin-section__head">
          <h2>Kayıtlı videolar</h2>
          <span>{videos.length} video</span>
        </div>

        {videos.length === 0 ? (
          <p className="admin-empty">Henüz video eklenmedi.</p>
        ) : (
          <div className="admin-record-list">
            {videos.map((video) => {
              const custom = video.custom_thumbnail_media_id
                ? mediaMap.get(video.custom_thumbnail_media_id)
                : undefined;
              const cover = custom ? storageUrl(custom.storage_path) : video.thumbnail_url;
              const isEditing = editing === video.id;

              return (
                <article className="admin-card admin-record" key={video.id}>
                  <div className="admin-record__cover">
                    {cover ? (
                      <Image src={cover} alt="" width={320} height={180} />
                    ) : (
                      <span className="admin-record__placeholder">
                        {video.provider.toUpperCase()}
                      </span>
                    )}
                    <p className="admin-field__hint">
                      {custom ? "Yüklenen kapak" : "Platform kapağı"}
                    </p>
                  </div>

                  <div>
                    <p className="admin-eyebrow">
                      {video.provider} ·{" "}
                      {video.embed_status === "allowed" ? "doğrulandı" : "doğrulanmadı"}
                    </p>

                    {isEditing ? (
                      <form
                        className="admin-form"
                        action={(formData) => {
                          setEditing(null);
                          run(() =>
                            updateVideoDetails(video.id, {
                              title: String(formData.get("title") ?? ""),
                              description: String(formData.get("description") ?? ""),
                            }),
                          );
                        }}
                      >
                        <div className="admin-field">
                          <label htmlFor={`title-${video.id}`}>Başlık</label>
                          <input
                            id={`title-${video.id}`}
                            name="title"
                            defaultValue={video.title}
                            maxLength={180}
                            required
                          />
                        </div>
                        <div className="admin-field">
                          <label htmlFor={`desc-${video.id}`}>Açıklama</label>
                          <textarea
                            id={`desc-${video.id}`}
                            name="description"
                            defaultValue={video.description}
                            rows={2}
                            maxLength={1000}
                          />
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
                      <>
                        <h3>{video.title}</h3>
                        {video.description ? <p>{video.description}</p> : null}
                        {video.original_url ? (
                          <a href={video.original_url} target="_blank" rel="noreferrer">
                            Kaynağı aç ↗
                          </a>
                        ) : null}
                      </>
                    )}
                  </div>

                  <div className="admin-record__action">
                    <span>{video.status === "published" ? "Yayında" : "Taslak"}</span>

                    {!isEditing ? (
                      <button
                        className="admin-btn admin-btn--ghost"
                        type="button"
                        disabled={pending}
                        onClick={() => setEditing(video.id)}
                      >
                        Düzenle
                      </button>
                    ) : null}

                    <label className="admin-btn admin-btn--ghost">
                      Kapak yükle
                      <input
                        hidden
                        type="file"
                        accept={ALLOWED_IMAGE_TYPES.join(",")}
                        onChange={(event) => void uploadCover(video.id, event.target.files)}
                      />
                    </label>

                    {custom ? (
                      <button
                        className="admin-btn admin-btn--ghost"
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => clearVideoCustomThumbnail(video.id))}
                      >
                        Kapağı kaldır
                      </button>
                    ) : video.provider === "youtube" ? (
                      <button
                        className="admin-btn admin-btn--ghost"
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => refreshVideoThumbnail(video.id))}
                      >
                        Kapağı yenile
                      </button>
                    ) : null}

                    {canPublish ? (
                      <button
                        className="admin-btn"
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          run(() => setVideoPublication(video.id, video.status !== "published"))
                        }
                      >
                        {video.status === "published" ? "Taslağa al" : "Yayımla"}
                      </button>
                    ) : null}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
    </>
  );
}

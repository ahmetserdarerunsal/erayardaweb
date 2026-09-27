"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { analyzeSocialPostUrl } from "@/lib/social-posts";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_UPLOAD_BYTES,
  MEDIA_BUCKET,
  SUPABASE_URL,
} from "@/lib/supabase/config";
import type { ActionResult } from "../fotograflar/actions";
import {
  addActivitySource,
  clearActivityCover,
  createActivityFromPost,
  createBlankActivity,
  deleteActivity,
  removeActivitySource,
  setActivityCover,
  setActivityPublication,
  updateActivity,
  type UploadedCover,
} from "./actions";

type Activity = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  body: unknown;
  event_date: string | null;
  event_date_approx: string | null;
  categories: string[];
  location: string;
  kind: string;
  cover_media_id: string | null;
  status: string;
  missing_info: string[];
};

type Source = {
  id: string;
  activity_id: string;
  label: string;
  url: string;
  publisher: string | null;
  confirms: string | null;
};

type Media = { id: string; storage_path: string; width: number; height: number };

const CATEGORIES = [
  { id: "meclis", label: "Meclis Çalışmaları" },
  { id: "saha", label: "Sahadan" },
  { id: "etkinlikler", label: "Etkinlikler" },
  { id: "genclik-spor", label: "Gençlik ve Spor" },
  { id: "ziyaretler", label: "Ziyaretler" },
];

const LOCATIONS = [
  { id: "kartal", label: "Kartal" },
  { id: "istanbul", label: "İstanbul" },
  { id: "ankara", label: "Ankara" },
  { id: "diger", label: "Belirtilmedi" },
];

const KINDS = [
  { id: "calisma", label: "Yürütülen çalışma" },
  { id: "katilim", label: "Katılım sağlanan etkinlik" },
];

function storageUrl(path: string) {
  return `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${path}`;
}

function bodyToText(body: unknown): string {
  return Array.isArray(body) ? body.filter((part) => typeof part === "string").join("\n\n") : "";
}

function formatDate(activity: Activity): string {
  if (activity.event_date) {
    return new Intl.DateTimeFormat("tr-TR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }).format(new Date(`${activity.event_date}T00:00:00`));
  }
  if (activity.event_date_approx) {
    return `${new Intl.DateTimeFormat("tr-TR", { month: "long", year: "numeric" }).format(
      new Date(`${activity.event_date_approx}-01T00:00:00`),
    )} (yaklaşık)`;
  }
  return "Tarih girilmedi";
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

export function ActivityManager({
  activities,
  sources,
  media,
  canPublish,
  canDelete,
}: {
  activities: Activity[];
  sources: Source[];
  media: Media[];
  canPublish: boolean;
  canDelete: boolean;
}) {
  const [postUrl, setPostUrl] = useState("");
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [sourceFormFor, setSourceFormFor] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const analysis = analyzeSocialPostUrl(postUrl);
  const mediaMap = new Map(media.map((item) => [item.id, item]));

  const run = (action: () => Promise<ActionResult>) =>
    startTransition(async () => setFeedback(await action()));

  async function uploadCover(activityId: string, files: FileList | null) {
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
    const storagePath = `faaliyetler/${activityId}/${crypto.randomUUID()}-${safeName}`;

    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(storagePath, file, { contentType: file.type, upsert: false });

    if (error) {
      setFeedback({ ok: false, message: `Yükleme başarısız: ${error.message}` });
      return;
    }

    const uploaded: UploadedCover = {
      storagePath,
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      ...dimensions,
    };
    run(() => setActivityCover(activityId, uploaded));
  }

  return (
    <>
      <section className="admin-card admin-manage-head">
        <div>
          <p className="admin-eyebrow">Gönderiden ekle</p>
          <h2>Faaliyetler</h2>
          <p>
            Bir X gönderisinin bağlantısını yapıştırın; metni, tarihi ve varsa görseli
            gönderiden alınır, gönderi de kaynak olarak kaydedilir. Kayıt taslak açılır —
            başlık gönderiden türetildiği için yayımlamadan önce gözden geçirin.
          </p>
        </div>

        <form
          className="admin-form"
          action={() => {
            const url = postUrl;
            setPostUrl("");
            run(() => createActivityFromPost(url));
          }}
        >
          <div className="admin-field">
            <label htmlFor="post-url">X gönderi bağlantısı</label>
            <input
              id="post-url"
              name="url"
              type="url"
              required
              value={postUrl}
              onChange={(event) => setPostUrl(event.target.value)}
              placeholder="https://x.com/kullanici/status/1234567890"
            />
            <p className="admin-field__hint">
              {postUrl
                ? analysis.supported
                  ? `X gönderisi algılandı (@${analysis.authorHandle})`
                  : analysis.message
                : "Gönderinin kendi adresini kullanın, profil adresini değil."}
            </p>
          </div>
          <button className="admin-btn" disabled={pending || !analysis.supported}>
            Gönderiden oluştur
          </button>
        </form>

        <form
          className="admin-inline-form admin-manage-head__wide"
          action={(formData) => run(() => createBlankActivity(String(formData.get("title") ?? "")))}
        >
          <div className="admin-field">
            <label htmlFor="blank-title">Bağlantısı olmayan faaliyet</label>
            <input id="blank-title" name="title" maxLength={180} placeholder="Başlık yazıp ekleyin" />
          </div>
          <button className="admin-btn admin-btn--ghost" disabled={pending}>
            Boş taslak aç
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
          <h2>Kayıtlı faaliyetler</h2>
          <span>{activities.length} kayıt</span>
        </div>

        {activities.length === 0 ? (
          <p className="admin-empty">Henüz faaliyet eklenmedi.</p>
        ) : (
          <div className="admin-record-list">
            {activities.map((activity) => {
              const cover = activity.cover_media_id
                ? mediaMap.get(activity.cover_media_id)
                : undefined;
              const activitySources = sources.filter((item) => item.activity_id === activity.id);
              const isEditing = editing === activity.id;
              const isPublished = activity.status === "published";

              return (
                <article className="admin-card admin-record" key={activity.id}>
                  <div className="admin-record__cover">
                    {cover ? (
                      <Image src={storageUrl(cover.storage_path)} alt="" width={320} height={180} />
                    ) : (
                      <span className="admin-record__placeholder">KAPAK YOK</span>
                    )}
                    <p className="admin-field__hint">{formatDate(activity)}</p>
                  </div>

                  <div>
                    <p className="admin-eyebrow">
                      {LOCATIONS.find((item) => item.id === activity.location)?.label ??
                        activity.location}
                      {" · "}
                      {KINDS.find((item) => item.id === activity.kind)?.label ?? activity.kind}
                    </p>

                    {isEditing ? (
                      <form
                        className="admin-form"
                        action={(formData) => {
                          setEditing(null);
                          run(() =>
                            updateActivity(activity.id, {
                              title: String(formData.get("title") ?? ""),
                              summary: String(formData.get("summary") ?? ""),
                              body: String(formData.get("body") ?? ""),
                              eventDate: String(formData.get("eventDate") ?? ""),
                              eventDateApprox: String(formData.get("eventDateApprox") ?? ""),
                              kind: String(formData.get("kind") ?? ""),
                              location: String(formData.get("location") ?? ""),
                              categories: formData.getAll("categories").map(String),
                              missingInfo: String(formData.get("missingInfo") ?? ""),
                            }),
                          );
                        }}
                      >
                        <div className="admin-field">
                          <label htmlFor={`title-${activity.id}`}>Başlık</label>
                          <input
                            id={`title-${activity.id}`}
                            name="title"
                            defaultValue={activity.title}
                            maxLength={180}
                            required
                          />
                        </div>

                        <div className="admin-field">
                          <label htmlFor={`summary-${activity.id}`}>
                            Özet — kartta iki satır görünür
                          </label>
                          <textarea
                            id={`summary-${activity.id}`}
                            name="summary"
                            defaultValue={activity.summary}
                            rows={2}
                            maxLength={600}
                          />
                        </div>

                        <div className="admin-field">
                          <label htmlFor={`body-${activity.id}`}>
                            Detay metni — boş satır yeni paragraf açar
                          </label>
                          <textarea
                            id={`body-${activity.id}`}
                            name="body"
                            defaultValue={bodyToText(activity.body)}
                            rows={5}
                          />
                        </div>

                        <div className="admin-field">
                          <label htmlFor={`date-${activity.id}`}>Kesin tarih</label>
                          <input
                            id={`date-${activity.id}`}
                            name="eventDate"
                            type="date"
                            defaultValue={activity.event_date ?? ""}
                          />
                          <p className="admin-field__hint">
                            Gün bilinmiyorsa burayı boş bırakın, aşağıya yalnızca ayı yazın.
                            Uydurma gün yazmayın.
                          </p>
                        </div>

                        <div className="admin-field">
                          <label htmlFor={`approx-${activity.id}`}>Yalnızca ay biliniyorsa</label>
                          <input
                            id={`approx-${activity.id}`}
                            name="eventDateApprox"
                            type="month"
                            defaultValue={activity.event_date_approx ?? ""}
                          />
                        </div>

                        <div className="admin-field">
                          <label htmlFor={`kind-${activity.id}`}>Tür</label>
                          <select id={`kind-${activity.id}`} name="kind" defaultValue={activity.kind}>
                            {KINDS.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="admin-field">
                          <label htmlFor={`location-${activity.id}`}>Konum</label>
                          <select
                            id={`location-${activity.id}`}
                            name="location"
                            defaultValue={activity.location}
                          >
                            {LOCATIONS.map((item) => (
                              <option key={item.id} value={item.id}>
                                {item.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <fieldset className="admin-field admin-checks">
                          <legend>Kategoriler</legend>
                          {CATEGORIES.map((item) => (
                            <label key={item.id}>
                              <input
                                type="checkbox"
                                name="categories"
                                value={item.id}
                                defaultChecked={activity.categories.includes(item.id)}
                              />
                              {item.label}
                            </label>
                          ))}
                        </fieldset>

                        <div className="admin-field">
                          <label htmlFor={`missing-${activity.id}`}>
                            Eksik bilgiler — her satır bir madde, sitede görünmez
                          </label>
                          <textarea
                            id={`missing-${activity.id}`}
                            name="missingInfo"
                            defaultValue={activity.missing_info.join("\n")}
                            rows={3}
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
                        <h3>{activity.title}</h3>
                        {activity.summary ? <p>{activity.summary}</p> : null}

                        {activity.missing_info.length > 0 ? (
                          <p className="admin-note">
                            Eksik: {activity.missing_info.join(" · ")}
                          </p>
                        ) : null}

                        <ul className="admin-source-list">
                          {activitySources.map((source) => (
                            <li key={source.id}>
                              <a href={source.url} target="_blank" rel="noreferrer">
                                {source.label} ↗
                              </a>
                              {source.confirms ? <span> — {source.confirms}</span> : null}
                              <button
                                className="admin-btn admin-btn--ghost"
                                type="button"
                                disabled={pending}
                                onClick={() => run(() => removeActivitySource(source.id))}
                              >
                                Kaldır
                              </button>
                            </li>
                          ))}
                        </ul>

                        {sourceFormFor === activity.id ? (
                          <form
                            className="admin-form"
                            action={(formData) => {
                              setSourceFormFor(null);
                              run(() =>
                                addActivitySource(activity.id, {
                                  label: String(formData.get("label") ?? ""),
                                  url: String(formData.get("url") ?? ""),
                                  publisher: String(formData.get("publisher") ?? ""),
                                  confirms: String(formData.get("confirms") ?? ""),
                                }),
                              );
                            }}
                          >
                            <div className="admin-field">
                              <label htmlFor={`src-label-${activity.id}`}>Kaynak adı</label>
                              <input id={`src-label-${activity.id}`} name="label" required />
                            </div>
                            <div className="admin-field">
                              <label htmlFor={`src-url-${activity.id}`}>Bağlantı</label>
                              <input
                                id={`src-url-${activity.id}`}
                                name="url"
                                type="url"
                                required
                                placeholder="https://…"
                              />
                              <p className="admin-field__hint">
                                Haberin veya belgenin kendisine bağlanın, kurumun ana sayfasına
                                değil.
                              </p>
                            </div>
                            <div className="admin-field">
                              <label htmlFor={`src-pub-${activity.id}`}>Yayıncı</label>
                              <input id={`src-pub-${activity.id}`} name="publisher" />
                            </div>
                            <div className="admin-field">
                              <label htmlFor={`src-confirms-${activity.id}`}>
                                Bu kaynak neyi doğruluyor?
                              </label>
                              <input
                                id={`src-confirms-${activity.id}`}
                                name="confirms"
                                placeholder="Örn: etkinliğin yapıldığını, katılımı değil"
                              />
                            </div>
                            <div className="admin-actions">
                              <button className="admin-btn" disabled={pending}>
                                Kaynağı ekle
                              </button>
                              <button
                                className="admin-btn admin-btn--ghost"
                                type="button"
                                onClick={() => setSourceFormFor(null)}
                              >
                                Vazgeç
                              </button>
                            </div>
                          </form>
                        ) : (
                          <button
                            className="admin-btn admin-btn--ghost"
                            type="button"
                            onClick={() => setSourceFormFor(activity.id)}
                          >
                            Kaynak ekle
                          </button>
                        )}
                      </>
                    )}
                  </div>

                  <div className="admin-record__action">
                    <span>{isPublished ? "Yayında" : "Taslak"}</span>

                    {isPublished ? (
                      <a
                        className="admin-btn admin-btn--ghost"
                        href={`/faaliyetler/${activity.slug}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Sitede gör ↗
                      </a>
                    ) : null}

                    {!isEditing ? (
                      <button
                        className="admin-btn admin-btn--ghost"
                        type="button"
                        disabled={pending}
                        onClick={() => setEditing(activity.id)}
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
                        onChange={(event) => void uploadCover(activity.id, event.target.files)}
                      />
                    </label>

                    {cover ? (
                      <button
                        className="admin-btn admin-btn--ghost"
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => clearActivityCover(activity.id))}
                      >
                        Kapağı kaldır
                      </button>
                    ) : null}

                    {canPublish ? (
                      <button
                        className="admin-btn"
                        type="button"
                        disabled={pending}
                        onClick={() => run(() => setActivityPublication(activity.id, !isPublished))}
                      >
                        {isPublished ? "Taslağa al" : "Yayımla"}
                      </button>
                    ) : null}

                    {canDelete ? (
                      <button
                        className="admin-btn admin-btn--ghost"
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          // Silme geri alınamaz; yanlışlıkla tıklamaya karşı onay.
                          if (!window.confirm(`"${activity.title}" kalıcı olarak silinsin mi?`)) return;
                          run(() => deleteActivity(activity.id));
                        }}
                      >
                        Sil
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

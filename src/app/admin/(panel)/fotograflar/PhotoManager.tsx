"use client";

import { useMemo, useState, useTransition } from "react";
import Image from "next/image";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, MEDIA_BUCKET, SUPABASE_URL } from "@/lib/supabase/config";
import { createAlbum, deleteAlbum, deletePhoto, registerPhotos, reorderPhotos, setAlbumCover, setAlbumPublication, type ActionResult, type UploadedPhoto } from "./actions";

type Album = { id: string; title: string; description: string | null; status: string; cover_photo_id: string | null; sort_order: number };
type Photo = { id: string; album_id: string; media_id: string; sort_order: number };
type Media = { id: string; storage_path: string; alt_text: string; width: number; height: number };

function imageSize(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => { resolve({ width: image.naturalWidth, height: image.naturalHeight }); URL.revokeObjectURL(url); };
    image.onerror = () => { reject(new Error("Görsel boyutu okunamadı.")); URL.revokeObjectURL(url); };
    image.src = url;
  });
}

export function PhotoManager({ albums, photos, media, canPublish, canDelete }: { albums: Album[]; photos: Photo[]; media: Media[]; canPublish: boolean; canDelete: boolean }) {
  const [selected, setSelected] = useState(albums[0]?.id ?? "");
  const [ordered, setOrdered] = useState<Photo[]>(photos);

  // Sürükle-bırak sırasında anında tepki vermek için sıralama yerelde tutulur.
  // Sunucudan yeni veri geldiğinde bunu tazelemek gerekir; aksi hâlde yeni
  // yüklenen fotoğraflar sayfa elle yenilenene kadar görünmez.
  // Render sırasında düzeltmek, efektle yapmaktan daha doğrudur: fazladan
  // bir çizim turu oluşmaz.
  const photosRevision = photos.map((item) => `${item.id}:${item.sort_order}`).join("|");
  const [syncedRevision, setSyncedRevision] = useState(photosRevision);
  if (syncedRevision !== photosRevision) {
    setSyncedRevision(photosRevision);
    setOrdered(photos);
  }
  const [dragged, setDragged] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<ActionResult | null>(null);
  const [pending, startTransition] = useTransition();
  const mediaMap = useMemo(() => new Map(media.map((item) => [item.id, item])), [media]);
  const album = albums.find((item) => item.id === selected) ?? albums[0];
  // Seçili albüm silinmişse ilkine düşülür; tüm işlemler bu kimliği kullanır.
  const activeId = album?.id ?? "";
  const albumPhotos = ordered.filter((item) => item.album_id === album?.id).sort((a, b) => a.sort_order - b.sort_order);

  function run(action: () => Promise<ActionResult>) {
    startTransition(async () => setFeedback(await action()));
  }

  async function upload(files: FileList | null) {
    if (!files || !activeId) return;
    const list = Array.from(files);
    if (list.some((file) => !ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number]) || file.size > MAX_UPLOAD_BYTES)) {
      setFeedback({ ok: false, message: "Yalnızca JPEG, PNG, WebP veya AVIF; dosya başına en fazla 10 MB." });
      return;
    }
    setFeedback(null);
    const supabase = createSupabaseBrowserClient();
    const uploaded: UploadedPhoto[] = [];
    for (const file of list) {
      const dimensions = await imageSize(file);
      const safeName = file.name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-120);
      const storagePath = `albumler/${activeId}/${crypto.randomUUID()}-${safeName}`;
      const { error } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, file, { contentType: file.type, upsert: false });
      if (error) { setFeedback({ ok: false, message: error.message }); return; }
      uploaded.push({ storagePath, fileName: file.name, mimeType: file.type, sizeBytes: file.size, ...dimensions, altText: "" });
    }
    run(() => registerPhotos(activeId, uploaded));
  }

  function move(photoId: string, direction: -1 | 1) {
    const ids = albumPhotos.map((item) => item.id);
    const index = ids.indexOf(photoId);
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    setOrdered((current) => current.map((photo) => photo.album_id === activeId ? { ...photo, sort_order: ids.indexOf(photo.id) } : photo));
    run(() => reorderPhotos(activeId, ids));
  }

  function dropBefore(targetId: string) {
    if (!dragged || dragged === targetId) return;
    const ids = albumPhotos.map((item) => item.id).filter((id) => id !== dragged);
    ids.splice(ids.indexOf(targetId), 0, dragged);
    setOrdered((current) => current.map((photo) => photo.album_id === activeId ? { ...photo, sort_order: ids.indexOf(photo.id) } : photo));
    setDragged(null);
    run(() => reorderPhotos(activeId, ids));
  }

  return (
    <>
      <section className="admin-card admin-manage-head">
        <div><p className="admin-eyebrow">Arşiv</p><h2>Fotoğraf albümleri</h2><p>Albüm oluşturun, görselleri toplu yükleyin, sıralayın ve yayımlayın.</p></div>
        <form action={(formData) => run(() => createAlbum({ title: String(formData.get("title") ?? ""), description: String(formData.get("description") ?? "") }))} className="admin-inline-form">
          <input name="title" required maxLength={120} placeholder="Yeni albüm adı" aria-label="Yeni albüm adı" />
          <input name="description" maxLength={500} placeholder="Kısa açıklama" aria-label="Kısa açıklama" />
          <button className="admin-btn" disabled={pending}>Albüm oluştur</button>
        </form>
      </section>
      {feedback ? <p className="admin-feedback" data-ok={feedback.ok}>{feedback.message}</p> : null}
      {albums.length === 0 ? <p className="admin-empty">Henüz albüm yok. İlk albümü yukarıdaki formdan oluşturun.</p> : (
        <div className="admin-manager">
          <aside className="admin-list" aria-label="Albümler">{albums.map((item) => <button type="button" key={item.id} data-active={item.id === activeId} onClick={() => setSelected(item.id)}><strong>{item.title}</strong><span>{item.status === "published" ? "Yayında" : "Taslak"}</span></button>)}</aside>
          {album ? <section className="admin-card">
            <div className="admin-section__head"><div><h2>{album.title}</h2><p>{album.description}</p></div><div className="admin-actions"><label className="admin-btn admin-btn--ghost">Çoklu yükle<input hidden multiple type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} onChange={(event) => void upload(event.target.files)} /></label>{canPublish ? <button className="admin-btn" disabled={pending} onClick={() => run(() => setAlbumPublication(album.id, album.status !== "published"))}>{album.status === "published" ? "Taslağa al" : "Yayımla"}</button> : null}{canDelete && album.status !== "published" ? <button className="admin-btn admin-btn--ghost" disabled={pending} onClick={() => { if (!window.confirm(`"${album.title}" albümü ve içindeki fotoğraf kayıtları silinsin mi? Dosyalar Medya Kütüphanesi'nde kalır.`)) return; run(() => deleteAlbum(album.id)); }}>Albümü sil</button> : null}</div></div>
            {albumPhotos.length === 0 ? <p className="admin-empty">Bu albümde fotoğraf yok.</p> : <div className="admin-photo-grid">{albumPhotos.map((photo, index) => { const asset = mediaMap.get(photo.media_id); if (!asset) return null; const src = `${SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${asset.storage_path}`; return <article key={photo.id} draggable onDragStart={() => setDragged(photo.id)} onDragEnd={() => setDragged(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropBefore(photo.id)} data-dragged={dragged === photo.id}><Image src={src} alt={asset.alt_text} width={asset.width} height={asset.height} /><div><span title="Sürükleyerek sıralayın">↕ {index + 1}</span><button type="button" onClick={() => move(photo.id, -1)} aria-label="Yukarı taşı">←</button><button type="button" onClick={() => move(photo.id, 1)} aria-label="Aşağı taşı">→</button><button type="button" data-cover={album.cover_photo_id ? album.cover_photo_id === photo.id : index === 0} title={album.cover_photo_id ? undefined : "Kapak seçilmedi; ilk fotoğraf kullanılıyor"} onClick={() => run(() => setAlbumCover(album.id, photo.id))}>{album.cover_photo_id === photo.id ? "Kapak" : !album.cover_photo_id && index === 0 ? "Kapak (varsayılan)" : "Kapak yap"}</button><button type="button" className="admin-photo-grid__delete" title="Bu fotoğrafı albümden sil" disabled={pending} onClick={() => { if (!window.confirm("Bu fotoğraf albümden silinsin mi? Geri alınamaz.")) return; run(() => deletePhoto(photo.id)); }}>Sil</button></div></article>; })}</div>}
          </section> : null}
        </div>
      )}
    </>
  );
}

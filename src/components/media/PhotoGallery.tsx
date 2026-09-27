"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { PhotoAlbum } from "@/types/content";

function albumCover(album: PhotoAlbum) {
  return album.photos.find((photo) => photo.id === album.coverPhotoId) ?? album.photos[0];
}

function PhotoPlaceholder({ index, preview }: { index: string; preview: boolean }) {
  return (
    <span className="photo-card__placeholder" aria-hidden="true">
      <span className="photo-card__placeholder-index">{index}</span>
      <span className="photo-card__placeholder-label">
        {preview ? "Taslak albüm" : "Fotoğraf albümü"}
      </span>
    </span>
  );
}

export function PhotoGallery({
  albums,
  preview = false,
}: {
  albums: readonly PhotoAlbum[];
  preview?: boolean;
}) {
  const [activeAlbum, setActiveAlbum] = useState<PhotoAlbum | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    if (!activeAlbum) return;
    const album = activeAlbum;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButtonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActiveAlbum(null);
      if (event.key === "ArrowRight") {
        setActiveIndex((index) => (index + 1) % album.photos.length);
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex(
          (index) => (index - 1 + album.photos.length) % album.photos.length,
        );
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus();
    };
  }, [activeAlbum]);

  function openAlbum(album: PhotoAlbum, trigger: HTMLButtonElement) {
    triggerRef.current = trigger;
    setActiveIndex(0);
    setActiveAlbum(album);
  }

  function movePhoto(direction: -1 | 1) {
    if (!activeAlbum) return;
    setActiveIndex(
      (index) => (index + direction + activeAlbum.photos.length) % activeAlbum.photos.length,
    );
  }

  return (
    <>
      <div className="photo-grid">
        {albums.map((album, index) => {
          const cover = albumCover(album);
          const canOpen = album.photos.length > 0;
          const ordinal = String(index + 1).padStart(2, "0");
          const cardContent = (
            <>
              <span className="photo-card__media">
                {cover ? (
                  <Image
                    src={cover.src}
                    alt={cover.alt}
                    fill
                    sizes="(max-width: 640px) 100vw, 46vw"
                    quality={90}
                  />
                ) : (
                  <PhotoPlaceholder index={ordinal} preview={preview} />
                )}
              </span>
              <span className="photo-card__body">
                <span className="photo-card__title">{album.title}</span>
                {album.description ? (
                  <span className="photo-card__description">{album.description}</span>
                ) : null}
                {canOpen ? (
                  <span className="photo-card__cta">
                    Albümü görüntüle <span aria-hidden="true">↗</span>
                  </span>
                ) : null}
              </span>
            </>
          );

          return (
            <article className="photo-card" key={album.id}>
              {canOpen ? (
                <button
                  className="photo-card__button"
                  type="button"
                  onClick={(event) => openAlbum(album, event.currentTarget)}
                  aria-label={`${album.title} albümünü görüntüle`}
                >
                  {cardContent}
                </button>
              ) : (
                <div className="photo-card__static">{cardContent}</div>
              )}
            </article>
          );
        })}
      </div>

      {activeAlbum ? (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-labelledby="lightbox-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setActiveAlbum(null);
          }}
        >
          <div className="lightbox__top">
            <div>
              <p className="lightbox__counter">
                {String(activeIndex + 1).padStart(2, "0")} /{" "}
                {String(activeAlbum.photos.length).padStart(2, "0")}
              </p>
              <h2 id="lightbox-title">{activeAlbum.title}</h2>
            </div>
            <button
              ref={closeButtonRef}
              className="lightbox__close"
              type="button"
              onClick={() => setActiveAlbum(null)}
            >
              Kapat <span aria-hidden="true">×</span>
            </button>
          </div>

          <figure
            className="lightbox__figure"
            onTouchStart={(event) => {
              touchStartX.current = event.changedTouches[0]?.clientX ?? null;
            }}
            onTouchEnd={(event) => {
              if (touchStartX.current === null || activeAlbum.photos.length < 2) return;
              const distance = event.changedTouches[0].clientX - touchStartX.current;
              if (Math.abs(distance) > 48) movePhoto(distance < 0 ? 1 : -1);
              touchStartX.current = null;
            }}
          >
            <Image
              key={activeAlbum.photos[activeIndex].id}
              className="lightbox__image"
              src={activeAlbum.photos[activeIndex].src}
              alt={activeAlbum.photos[activeIndex].alt}
              width={activeAlbum.photos[activeIndex].width}
              height={activeAlbum.photos[activeIndex].height}
              sizes="100vw"
              quality={90}
              priority
            />
            {activeAlbum.photos[activeIndex].caption ? (
              <figcaption>{activeAlbum.photos[activeIndex].caption}</figcaption>
            ) : null}
          </figure>

          {activeAlbum.photos.length > 1 ? (
            <div className="lightbox__controls" aria-label="Fotoğraf kontrolleri">
              <button
                type="button"
                onClick={() => movePhoto(-1)}
                aria-label="Önceki fotoğraf"
              >
                ← Önceki
              </button>
              <button
                type="button"
                onClick={() => movePhoto(1)}
                aria-label="Sonraki fotoğraf"
              >
                Sonraki →
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

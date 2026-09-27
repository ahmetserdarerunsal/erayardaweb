"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { buildTrustedEmbedUrl } from "@/lib/video-providers";
import type { VideoEntry } from "@/types/content";

function VideoPlaceholder({ index, preview }: { index: string; preview: boolean }) {
  return (
    <span className="video-card__placeholder" aria-hidden="true">
      <span className="video-card__placeholder-index">{index}</span>
      <span className="video-card__placeholder-label">
        {preview ? "Taslak video" : "Video arşivi"}
      </span>
    </span>
  );
}

function PlayIcon() {
  return (
    <span className="video-card__play" aria-hidden="true">
      <span />
    </span>
  );
}

function VideoPlayer({
  video,
  index,
  preview,
}: {
  video: VideoEntry;
  index: string;
  preview: boolean;
}) {
  const [activated, setActivated] = useState(false);
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnail = video.customThumbnail ?? video.thumbnailUrl;
  const embedUrl = buildTrustedEmbedUrl(video);
  const isFile = video.provider === "file" && Boolean(video.videoFileUrl);
  let safeOriginalUrl: string | null = null;
  try {
    if (video.originalUrl && new URL(video.originalUrl).protocol === "https:") {
      safeOriginalUrl = video.originalUrl;
    }
  } catch {
    safeOriginalUrl = null;
  }

  useEffect(() => {
    if (activated && isFile) void videoRef.current?.play();
  }, [activated, isFile]);

  if (preview) {
    return (
      <div className="video-card__preview">
        <VideoPlaceholder index={index} preview />
        <PlayIcon />
      </div>
    );
  }

  if (activated && embedUrl) {
    return (
      <iframe
        src={embedUrl}
        title={video.title}
        loading="lazy"
        allow="encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    );
  }

  if (activated && isFile && video.videoFileUrl) {
    return (
      <video
        ref={videoRef}
        controls
        playsInline
        preload="metadata"
        poster={thumbnail ?? undefined}
        aria-label={video.title}
      >
        <source src={video.videoFileUrl} type={video.videoFileMimeType ?? undefined} />
        Tarayıcınız video oynatmayı desteklemiyor.
      </video>
    );
  }

  if (activated && safeOriginalUrl) {
    return (
      <div className="video-card__fallback">
        <p>Bu video site içinde oynatılamıyor.</p>
        <a href={safeOriginalUrl} target="_blank" rel="noopener noreferrer">
          Videoyu orijinal platformda izle <span aria-hidden="true">↗</span>
        </a>
      </div>
    );
  }

  if (activated) {
    return (
      <div className="video-card__fallback" role="status">
        <p>Video kaynağı kullanılamıyor.</p>
      </div>
    );
  }

  return (
    <button
      className="video-card__activate"
      type="button"
      onClick={() => setActivated(true)}
      aria-label={`${video.title} videosunu aç`}
    >
      {thumbnail && !thumbnailFailed ? (
        <Image
          src={thumbnail}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 46vw"
          quality={90}
          onError={() => setThumbnailFailed(true)}
        />
      ) : (
        <VideoPlaceholder index={index} preview={false} />
      )}
      <PlayIcon />
    </button>
  );
}

export function VideoGallery({
  videos,
  preview = false,
}: {
  videos: readonly VideoEntry[];
  preview?: boolean;
}) {
  return (
    <div className="video-grid">
      {videos.map((video, index) => (
        <article className="video-card" key={video.id}>
          <div className="video-card__media">
            <VideoPlayer
              video={video}
              index={String(index + 1).padStart(2, "0")}
              preview={preview}
            />
          </div>
          <h3>{video.title}</h3>
        </article>
      ))}
    </div>
  );
}

import type { KnownVideoProvider, VideoEntry, VideoProvider } from "@/types/content";

export type VideoUrlAnalysis = {
  provider: VideoProvider | null;
  originalUrl: string | null;
  videoId: string | null;
  videoFileUrl: string | null;
  supported: boolean;
  message: string | null;
};

export type VideoProviderAdapter = {
  label: string;
  strategy: "iframe" | "official-widget" | "native";
  trustedEmbedHost: string | null;
};

export const videoProviderAdapters: Record<KnownVideoProvider, VideoProviderAdapter> = {
  youtube: { label: "YouTube", strategy: "iframe", trustedEmbedHost: "www.youtube-nocookie.com" },
  instagram: { label: "Instagram", strategy: "official-widget", trustedEmbedHost: "www.instagram.com" },
  facebook: { label: "Facebook", strategy: "official-widget", trustedEmbedHost: "www.facebook.com" },
  x: { label: "X", strategy: "official-widget", trustedEmbedHost: "platform.twitter.com" },
  tiktok: { label: "TikTok", strategy: "iframe", trustedEmbedHost: "www.tiktok.com" },
  vimeo: { label: "Vimeo", strategy: "iframe", trustedEmbedHost: "player.vimeo.com" },
  file: { label: "Video dosyası", strategy: "native", trustedEmbedHost: null },
};

function isHost(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

function cleanId(value: string | null | undefined, pattern: RegExp): string | null {
  return value && pattern.test(value) ? value : null;
}

/**
 * Admin panelindeki tek bağlantı alanının kullanacağı saf analiz fonksiyonu.
 * Ağ isteği veya scraping yapmaz; kısa bağlantılar daha sonra sunucuda resmî
 * API/oEmbed akışıyla çözülmelidir.
 */
export function analyzeVideoUrl(input: string): VideoUrlAnalysis {
  const value = input.trim();
  const failure = (message: string, originalUrl: string | null = null): VideoUrlAnalysis => ({
    provider: null,
    originalUrl,
    videoId: null,
    videoFileUrl: null,
    supported: false,
    message,
  });

  if (!value) return failure("Video bağlantısı boş olamaz.");

  if (value.startsWith("/") && /\.(?:mp4|webm)(?:\?.*)?$/i.test(value)) {
    return {
      provider: "file",
      originalUrl: null,
      videoId: null,
      videoFileUrl: value,
      supported: true,
      message: null,
    };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return failure("Geçerli bir HTTPS video bağlantısı girin.");
  }

  if (url.protocol !== "https:") {
    return failure("Yalnızca HTTPS video bağlantıları desteklenir.");
  }

  const originalUrl = url.toString();
  const host = url.hostname.toLowerCase();
  if (/\.(?:mp4|webm)$/i.test(url.pathname)) {
    return {
      provider: "file",
      originalUrl,
      videoId: null,
      videoFileUrl: originalUrl,
      supported: true,
      message: null,
    };
  }

  if (isHost(host, "youtu.be") || isHost(host, "youtube.com")) {
    const id = cleanId(
      isHost(host, "youtu.be")
        ? url.pathname.split("/").filter(Boolean)[0]
        : url.searchParams.get("v") ?? url.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1],
      /^[A-Za-z0-9_-]{6,}$/,
    );
    return { provider: "youtube", originalUrl, videoId: id, videoFileUrl: null, supported: Boolean(id), message: id ? null : "YouTube video kimliği bulunamadı." };
  }

  if (isHost(host, "instagram.com")) {
    const id = cleanId(url.pathname.match(/^\/(?:reel|reels|p|tv)\/([^/]+)/)?.[1], /^[\w-]+$/);
    return { provider: "instagram", originalUrl, videoId: id, videoFileUrl: null, supported: Boolean(id), message: id ? null : "Instagram gönderi kimliği bulunamadı." };
  }

  if (isHost(host, "facebook.com") || isHost(host, "fb.watch")) {
    const id = cleanId(url.searchParams.get("v") ?? url.pathname.match(/\/(?:videos|reel)\/(\d+)/)?.[1], /^\d+$/);
    return { provider: "facebook", originalUrl, videoId: id, videoFileUrl: null, supported: Boolean(id), message: id ? null : "Kısa Facebook bağlantısı sunucuda doğrulanmalı." };
  }

  if (isHost(host, "x.com") || isHost(host, "twitter.com")) {
    const id = cleanId(url.pathname.match(/\/status\/(\d+)/)?.[1], /^\d+$/);
    return { provider: "x", originalUrl, videoId: id, videoFileUrl: null, supported: Boolean(id), message: id ? null : "X gönderi kimliği bulunamadı." };
  }

  if (isHost(host, "tiktok.com")) {
    const id = cleanId(url.pathname.match(/\/video\/(\d+)/)?.[1], /^\d+$/);
    return { provider: "tiktok", originalUrl, videoId: id, videoFileUrl: null, supported: Boolean(id), message: id ? null : "Kısa TikTok bağlantısı sunucuda doğrulanmalı." };
  }

  if (isHost(host, "vimeo.com")) {
    const id = cleanId(url.pathname.match(/\/(?:video\/)?(\d+)(?:\/|$)/)?.[1], /^\d+$/);
    return { provider: "vimeo", originalUrl, videoId: id, videoFileUrl: null, supported: Boolean(id), message: id ? null : "Vimeo video kimliği bulunamadı." };
  }

  return failure("Bu video platformu henüz desteklenmiyor.", originalUrl);
}

/**
 * YouTube'un oEmbed yanıtı her zaman hqdefault (480×360, 4:3) döndürür.
 * Bu görsel 16:9 kartta hem bulanık hem de siyah bantlı görünür.
 *
 * Bunun yerine en yüksek çözünürlükten başlayıp inen bir sıra denenir.
 * maxresdefault her videoda bulunmaz; olmayan çözünürlük 404 döner.
 */
const YOUTUBE_THUMBNAIL_SIZES = ["maxresdefault", "sddefault", "hqdefault"] as const;

export function youtubeThumbnailCandidates(videoId: string): string[] {
  return YOUTUBE_THUMBNAIL_SIZES.map(
    (size) => `https://i.ytimg.com/vi/${encodeURIComponent(videoId)}/${size}.jpg`,
  );
}

/**
 * Mevcut olan en yüksek çözünürlüklü YouTube kapağını döndürür.
 * Ağ erişimi yoksa hqdefault'a düşer — o her videoda vardır.
 */
export async function resolveBestYoutubeThumbnail(videoId: string): Promise<string> {
  const candidates = youtubeThumbnailCandidates(videoId);

  for (const url of candidates) {
    try {
      const response = await fetch(url, {
        method: "HEAD",
        signal: AbortSignal.timeout(5000),
        cache: "no-store",
      });
      if (response.ok) return url;
    } catch {
      // Ağ hatası: bir sonraki çözünürlüğü dene.
    }
  }

  return candidates[candidates.length - 1];
}

/** Yalnızca sabit, resmî platform alan adlarından güvenli iframe URL'si üretir. */
export function buildTrustedEmbedUrl(video: VideoEntry): string | null {
  if (video.embedStatus !== "allowed" || !video.videoId) return null;

  const id = encodeURIComponent(video.videoId);
  switch (video.provider) {
    case "youtube":
      return `https://www.youtube-nocookie.com/embed/${id}?autoplay=0&rel=0`;
    case "instagram":
      return `https://www.instagram.com/p/${id}/embed/`;
    case "facebook":
      return video.originalUrl
        ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(video.originalUrl)}&show_text=false`
        : null;
    case "x":
      return `https://platform.twitter.com/embed/Tweet.html?id=${id}&dnt=true`;
    case "tiktok":
      return `https://www.tiktok.com/player/v1/${id}?autoplay=0`;
    case "vimeo":
      return `https://player.vimeo.com/video/${id}?autoplay=0`;
    default:
      return null;
  }
}

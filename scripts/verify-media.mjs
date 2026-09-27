import assert from "node:assert/strict";
import {
  analyzeVideoUrl,
  buildTrustedEmbedUrl,
} from "../src/lib/video-providers.ts";

const cases = [
  ["YouTube", "https://www.youtube.com/watch?v=M7lc1UVf-VE", "youtube", "M7lc1UVf-VE"],
  ["YouTube Shorts", "https://youtube.com/shorts/M7lc1UVf-VE", "youtube", "M7lc1UVf-VE"],
  ["Instagram Reels", "https://www.instagram.com/reel/ABC_def-12/", "instagram", "ABC_def-12"],
  ["Facebook video", "https://www.facebook.com/example/videos/1234567890/", "facebook", "1234567890"],
  ["X", "https://x.com/example/status/1234567890", "x", "1234567890"],
  ["TikTok", "https://www.tiktok.com/@example/video/1234567890", "tiktok", "1234567890"],
  ["Vimeo", "https://vimeo.com/123456789", "vimeo", "123456789"],
  ["MP4", "/uploads/example.mp4", "file", null],
  ["WebM", "https://media.example.org/example.webm", "file", null],
];

for (const [label, url, provider, videoId] of cases) {
  const result = analyzeVideoUrl(url);
  assert.equal(result.supported, true, `${label} desteklenmeli`);
  assert.equal(result.provider, provider, `${label} sağlayıcısı`);
  assert.equal(result.videoId, videoId, `${label} video kimliği`);
}

for (const value of ["", "not-a-url", "http://youtube.com/watch?v=M7lc1UVf-VE", "https://youtube.com.evil.test/watch?v=M7lc1UVf-VE"]) {
  assert.equal(analyzeVideoUrl(value).supported, false, `Geçersiz bağlantı reddedilmeli: ${value}`);
}

const baseVideo = {
  id: "test",
  slug: "test",
  title: "Test",
  description: "",
  provider: "youtube",
  originalUrl: "https://www.youtube.com/watch?v=M7lc1UVf-VE",
  videoId: "M7lc1UVf-VE",
  thumbnailUrl: null,
  customThumbnail: null,
  videoFileUrl: null,
  videoFileMimeType: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  publishedAt: "2026-01-01T00:00:00.000Z",
  status: "published",
  sortOrder: 0,
};

assert.equal(buildTrustedEmbedUrl({ ...baseVideo, embedStatus: "blocked" }), null);
assert.match(
  buildTrustedEmbedUrl({ ...baseVideo, embedStatus: "allowed" }) ?? "",
  /^https:\/\/www\.youtube-nocookie\.com\/embed\//,
);

const trustedHosts = {
  youtube: "www.youtube-nocookie.com",
  instagram: "www.instagram.com",
  facebook: "www.facebook.com",
  x: "platform.twitter.com",
  tiktok: "www.tiktok.com",
  vimeo: "player.vimeo.com",
};

for (const [, url, provider] of cases.filter(([, , provider]) => provider !== "file")) {
  const analysis = analyzeVideoUrl(url);
  const embedUrl = buildTrustedEmbedUrl({
    ...baseVideo,
    provider,
    originalUrl: analysis.originalUrl,
    videoId: analysis.videoId,
    embedStatus: "allowed",
  });
  assert.ok(embedUrl, `${provider} için embed URL üretilmeli`);
  assert.equal(new URL(embedUrl).hostname, trustedHosts[provider]);
}

console.log(`Media adapters: ${cases.length} geçerli ve 4 geçersiz senaryo PASS`);

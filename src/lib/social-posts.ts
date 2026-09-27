/**
 * Sosyal medya gönderisinden faaliyet kaydı üretmek için okuma katmanı.
 *
 * KURAL: buradan dönen her alan gönderinin kendisinden gelir. Okunamayan
 * bilgi tahmin edilmez; `warnings` ile yöneticiye bildirilir ve kayıt taslak
 * kalır. Tarihsiz kayıt zaten veritabanı kısıtıyla yayımlanamaz.
 */

export type SocialPlatformId = "x";

export type SocialUrlAnalysis = {
  platform: SocialPlatformId | null;
  /** İzleme parametrelerinden arındırılmış kalıcı bağlantı. */
  canonicalUrl: string | null;
  postId: string | null;
  authorHandle: string | null;
  supported: boolean;
  message: string | null;
};

export const socialPlatformLabels: Record<SocialPlatformId, string> = { x: "X" };

/**
 * Ağ isteği yapmayan saf çözümleme — panelde yazarken anlık ipucu göstermek
 * için istemci tarafında da çağrılır.
 */
export function analyzeSocialPostUrl(input: string): SocialUrlAnalysis {
  const value = input.trim();
  const failure = (message: string): SocialUrlAnalysis => ({
    platform: null,
    canonicalUrl: null,
    postId: null,
    authorHandle: null,
    supported: false,
    message,
  });

  if (!value) return failure("Gönderi bağlantısı boş olamaz.");

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return failure("Geçerli bir HTTPS bağlantısı girin.");
  }

  if (url.protocol !== "https:") return failure("Yalnızca HTTPS bağlantıları desteklenir.");

  const host = url.hostname.toLowerCase().replace(/^(?:www|mobile)\./, "");

  if (host === "x.com" || host === "twitter.com") {
    const match = url.pathname.match(/^\/([A-Za-z0-9_]{1,15})\/status(?:es)?\/(\d{1,25})/);
    if (!match) {
      return failure(
        "Bu X bağlantısı bir gönderiyi göstermiyor. Örnek: https://x.com/kullanici/status/1234567890",
      );
    }
    return {
      platform: "x",
      canonicalUrl: `https://x.com/${match[1]}/status/${match[2]}`,
      postId: match[2],
      authorHandle: match[1],
      supported: true,
      message: null,
    };
  }

  return failure("Şimdilik yalnızca X gönderileri desteklenir.");
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z]+);/g, (match, entity: string) => {
    try {
      if (entity.startsWith("#x") || entity.startsWith("#X")) {
        return String.fromCodePoint(Number.parseInt(entity.slice(2), 16));
      }
      if (entity.startsWith("#")) {
        return String.fromCodePoint(Number.parseInt(entity.slice(1), 10));
      }
    } catch {
      return match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function stripTags(value: string): string {
  return decodeEntities(value.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""));
}

/**
 * oEmbed yanıtındaki blockquote'un ilk paragrafı gönderi metnidir.
 *
 * X, gönderiye iliştirilen medyayı `pic.twitter.com/...`, alıntılanan
 * bağlantıyı da `https://t.co/...` olarak metnin SONUNA yazar. Bunlar metnin
 * parçası değil, gösterim artığıdır. Yalnızca sondakiler atılır — metnin
 * içinde geçen bağlantıyı yazarın kendisi yazmıştır, korunur.
 */
const TRAILING_MEDIA_MARKER = /\s*(?:https:\/\/t\.co\/\w+|pic\.(?:twitter|x)\.com\/\w+)$/;

function extractText(html: string): string {
  const paragraph = html.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  if (!paragraph) return "";

  let text = stripTags(paragraph).replace(/[ \t]+\n/g, "\n").trim();
  while (TRAILING_MEDIA_MARKER.test(text)) {
    text = text.replace(TRAILING_MEDIA_MARKER, "").trim();
  }
  return text;
}

const ENGLISH_MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

/**
 * Blockquote'un son bağlantısı gönderi tarihidir. oEmbed'i bilerek `lang=en`
 * ile çağırıyoruz: yerelleştirilmiş ay adları çözümlemeyi kırılgan yapar.
 */
function extractDate(html: string): string | null {
  const anchorTexts = [...html.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)].map((match) =>
    stripTags(match[1]).trim(),
  );

  for (const text of anchorTexts.reverse()) {
    const parts = text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
    if (!parts) continue;

    const month = ENGLISH_MONTHS.indexOf(parts[1].toLowerCase());
    const day = Number(parts[2]);
    if (month < 0 || day < 1 || day > 31) continue;

    return `${parts[3]}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  return null;
}

/** Tarayıcı taklidi yapmıyoruz; X bu kimlikle de meta etiketlerini veriyor. */
const LINK_PREVIEW_UA = "ErayArdaSite/1.0 (+link-preview)";

/**
 * Gönderinin kendi görselini arar.
 *
 * Metin gönderilerinde `og:image` yazarın 200x200 profil fotoğrafıdır; onu
 * kapak yapmak 16:9 kartta kötü görünür. Bir bağlantı paylaşımında ise
 * `card_img` gelir, o da üçüncü tarafın görselidir. Bu yüzden yalnızca
 * gönderinin kendi medyasını taşıyan yollar kabul edilir — fotoğraf
 * `/media/`, video ve GIF kapakları ise `*_video_thumb/` altındadır.
 */
const POST_MEDIA_PATHS = [
  "/media/",
  "/amplify_video_thumb/",
  "/ext_tw_video_thumb/",
  "/tweet_video_thumb/",
];
async function findPostImage(pageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(pageUrl, {
      headers: { "user-agent": LINK_PREVIEW_UA, accept: "text/html" },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const html = (await response.text()).slice(0, 400_000);
    const raw =
      html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i)?.[1] ??
      html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:image"/i)?.[1];
    if (!raw) return null;

    const image = new URL(decodeEntities(raw));
    const isPostMedia =
      image.hostname === "pbs.twimg.com" &&
      POST_MEDIA_PATHS.some((prefix) => image.pathname.startsWith(prefix));
    if (!isPostMedia) return null;

    image.searchParams.set("format", "jpg");
    image.searchParams.set("name", "large");
    return image.toString();
  } catch {
    return null;
  }
}

export type FetchedSocialPost = {
  platform: SocialPlatformId;
  canonicalUrl: string;
  postId: string;
  authorName: string;
  authorHandle: string;
  text: string;
  /** ISO 8601 (YYYY-MM-DD); okunamazsa null. */
  date: string | null;
  imageUrl: string | null;
  /** Yöneticiye gösterilecek eksikler. */
  warnings: string[];
};

type OEmbedResponse = { author_name?: string; author_url?: string; html?: string; url?: string };

/**
 * oEmbed uç noktası publish.twitter.com'dan publish.x.com'a taşındı; eski
 * adres 301 veriyor, doğrudan yenisini çağırıyoruz.
 */
const X_OEMBED_ENDPOINT = "https://publish.x.com/oembed";

export async function fetchSocialPost(
  input: string,
): Promise<{ ok: true; post: FetchedSocialPost } | { ok: false; message: string }> {
  const analysis = analyzeSocialPostUrl(input);
  if (!analysis.supported || !analysis.canonicalUrl || !analysis.postId || !analysis.platform) {
    return { ok: false, message: analysis.message ?? "Bağlantı desteklenmiyor." };
  }

  const endpoint = `${X_OEMBED_ENDPOINT}?url=${encodeURIComponent(
    analysis.canonicalUrl,
  )}&omit_script=1&dnt=true&hide_thread=1&lang=en`;

  let payload: OEmbedResponse;
  try {
    const response = await fetch(endpoint, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (response.status === 404) {
      return {
        ok: false,
        message: "Gönderi bulunamadı. Silinmiş veya gizli bir hesaba ait olabilir.",
      };
    }
    if (!response.ok) {
      return {
        ok: false,
        message: `X yanıt vermedi (HTTP ${response.status}). Bir süre sonra tekrar deneyin.`,
      };
    }
    payload = (await response.json()) as OEmbedResponse;
  } catch {
    return { ok: false, message: "X'e ulaşılamadı. Bağlantıyı ve internet erişimini kontrol edin." };
  }

  const html = payload.html ?? "";
  const text = extractText(html);
  const date = extractDate(html);
  const imageUrl = await findPostImage(analysis.canonicalUrl);

  const warnings: string[] = [];
  if (!text) warnings.push("Gönderi metni okunamadı; özeti elle yazın.");
  if (!date) {
    warnings.push("Gönderi tarihi okunamadı; tarihi elle girin (tarihsiz kayıt yayımlanamaz).");
  }
  if (!imageUrl) {
    warnings.push("Gönderide kapak olarak kullanılabilecek bir görsel yok; kapağı elle yükleyebilirsiniz.");
  }

  return {
    ok: true,
    post: {
      platform: analysis.platform,
      canonicalUrl: analysis.canonicalUrl,
      postId: analysis.postId,
      authorName: (payload.author_name ?? "").trim(),
      authorHandle: payload.author_url?.split("/").filter(Boolean).pop() ?? analysis.authorHandle ?? "",
      text,
      date,
      imageUrl,
      warnings,
    },
  };
}

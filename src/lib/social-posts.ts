/**
 * Sosyal medya gönderisinden faaliyet kaydı üretmek için okuma katmanı.
 *
 * KURAL: buradan dönen her alan gönderinin kendisinden gelir. Okunamayan
 * bilgi tahmin edilmez; `warnings` ile yöneticiye bildirilir ve kayıt taslak
 * kalır. Tarihsiz kayıt zaten veritabanı kısıtıyla yayımlanamaz.
 *
 * Üç kaynak sırayla denenir, çünkü hiçbiri tek başına yetmiyor:
 *
 *   1. cdn.syndication.twimg.com — resmî gömme aracının kullandığı JSON.
 *      Bütün fotoğrafları gerçek boyutlarıyla, kesin tarihi ve metni verir.
 *      Ama uzun gönderilerde metni ~280 karakterde keser.
 *   2. Gönderi sayfasının HTML'i — uzun gönderilerde "daha fazla göster"in
 *      arkasındaki tam metin (NoteTweet) yalnızca burada bulunuyor.
 *   3. publish.x.com/oembed — ilk ikisi yanıt vermezse metin ve tarih için
 *      son çare. Fotoğraf vermez.
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
 * X, gönderiye iliştirilen medyayı `pic.twitter.com/...`, alıntıladığı
 * bağlantıyı da `https://t.co/...` olarak metnin SONUNA yazar. Bunlar metnin
 * parçası değil, gösterim artığıdır. Yalnızca sondakiler atılır — metnin
 * içinde geçen bağlantıyı yazarın kendisi yazmıştır, korunur.
 */
const TRAILING_MEDIA_MARKER = /\s*(?:https:\/\/t\.co\/\w+|pic\.(?:twitter|x)\.com\/\w+)$/;

function trimTrailingMedia(value: string): string {
  let text = value.trim();
  while (TRAILING_MEDIA_MARKER.test(text)) {
    text = text.replace(TRAILING_MEDIA_MARKER, "").trim();
  }
  return text;
}

/** Tarayıcı taklidi yapmıyoruz; X bu kimlikle de yanıt veriyor. */
const LINK_PREVIEW_UA = "ErayArdaSite/1.0 (+link-preview)";

export type PostImage = { url: string; width: number; height: number };

type SyndicationPhoto = { url?: string; width?: number; height?: number };
type SyndicationResponse = {
  text?: string;
  display_text_range?: [number, number];
  created_at?: string;
  photos?: SyndicationPhoto[];
  user?: { name?: string; screen_name?: string };
};

/**
 * Resmî gömme aracının JSON'u. Bütün fotoğraflar ve kesin tarih buradan.
 * `token` herhangi bir değer olabiliyor; uç nokta belgelenmemiş ama X'in
 * kendi embed widget'ının kullandığı adres.
 */
async function fetchSyndication(postId: string): Promise<SyndicationResponse | null> {
  try {
    const response = await fetch(
      `https://cdn.syndication.twimg.com/tweet-result?id=${encodeURIComponent(postId)}&lang=tr&token=a`,
      {
        headers: { accept: "application/json", "user-agent": LINK_PREVIEW_UA },
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as SyndicationResponse;
  } catch {
    return null;
  }
}

/**
 * Uzun gönderilerin ("daha fazla göster") tam metni.
 *
 * Ne oEmbed ne de syndication bunu veriyor; ikisi de ~280 karakterde kesiyor.
 * Metin yalnızca gönderi sayfasının sunucu tarafı yükünde, `note_tweet_results`
 * bloğunun içinde bulunuyor. Blok yoksa gönderi zaten kısa demektir.
 */
async function fetchLongFormText(pageUrl: string): Promise<string | null> {
  try {
    const response = await fetch(pageUrl, {
      headers: { "user-agent": LINK_PREVIEW_UA, accept: "text/html" },
      signal: AbortSignal.timeout(12000),
      cache: "no-store",
    });
    if (!response.ok) return null;

    const html = await response.text();
    const start = html.indexOf("note_tweet_results");
    if (start < 0) return null;

    const block = html.slice(start, start + 8000);
    const match = block.match(/text:"((?:[^"\\]|\\.)*)"/);
    if (!match) return null;

    const text = match[1]
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(Number.parseInt(hex, 16)))
      .replace(/\\n/g, "\n")
      .replace(/\\t/g, "\t")
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, "\\");

    return text.trim() || null;
  } catch {
    return null;
  }
}

const ENGLISH_MONTHS = [
  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
];

/**
 * oEmbed yedeğinde tarih, blockquote'un son bağlantısındadır. `lang=en` ile
 * çağırıyoruz: yerelleştirilmiş ay adları çözümlemeyi kırılgan yapar.
 */
function extractDateFromOEmbed(html: string): string | null {
  const anchors = [...html.matchAll(/<a[^>]*>([\s\S]*?)<\/a>/gi)].map((m) => stripTags(m[1]).trim());

  for (const text of anchors.reverse()) {
    const parts = text.match(/^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/);
    if (!parts) continue;
    const month = ENGLISH_MONTHS.indexOf(parts[1].toLowerCase());
    const day = Number(parts[2]);
    if (month < 0 || day < 1 || day > 31) continue;
    return `${parts[3]}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  return null;
}

type OEmbedResponse = { author_name?: string; author_url?: string; html?: string };

async function fetchOEmbed(canonicalUrl: string): Promise<OEmbedResponse | null> {
  try {
    const response = await fetch(
      `https://publish.x.com/oembed?url=${encodeURIComponent(canonicalUrl)}&omit_script=1&dnt=true&hide_thread=1&lang=en`,
      {
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(12000),
        cache: "no-store",
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as OEmbedResponse;
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
  /** Gönderinin bütün fotoğrafları, paylaşıldıkları sırayla. */
  images: PostImage[];
  /** Yöneticiye gösterilecek eksikler. */
  warnings: string[];
};

export async function fetchSocialPost(
  input: string,
): Promise<{ ok: true; post: FetchedSocialPost } | { ok: false; message: string }> {
  const analysis = analyzeSocialPostUrl(input);
  if (!analysis.supported || !analysis.canonicalUrl || !analysis.postId || !analysis.platform) {
    return { ok: false, message: analysis.message ?? "Bağlantı desteklenmiyor." };
  }

  const { canonicalUrl, postId } = analysis;

  // Üçü paralel: biri yanıt vermezse diğerleri yine de sonuç üretir.
  const [syndication, longForm, oembed] = await Promise.all([
    fetchSyndication(postId),
    fetchLongFormText(canonicalUrl),
    fetchOEmbed(canonicalUrl),
  ]);

  if (!syndication && !oembed) {
    return {
      ok: false,
      message:
        "Gönderi okunamadı. Silinmiş, gizli bir hesaba ait olabilir ya da X geçici olarak yanıt vermiyor.",
    };
  }

  // Metin: uzun gönderi > syndication (gösterilen aralıkla kırpılmış) > oEmbed.
  const syndicationText = syndication?.text
    ? trimTrailingMedia(syndication.text.slice(0, syndication.display_text_range?.[1]))
    : "";
  const oembedParagraph = oembed?.html?.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  const oembedText = oembedParagraph ? trimTrailingMedia(stripTags(oembedParagraph)) : "";
  const text = (longForm && trimTrailingMedia(longForm)) || syndicationText || oembedText;

  // Tarih: syndication kesin zaman damgası verir, oEmbed yalnızca gün.
  const date = syndication?.created_at
    ? new Date(syndication.created_at).toISOString().slice(0, 10)
    : oembed?.html
      ? extractDateFromOEmbed(oembed.html)
      : null;

  const images: PostImage[] = (syndication?.photos ?? []).flatMap((photo) => {
    if (!photo.url) return [];
    try {
      const url = new URL(photo.url);
      if (url.hostname !== "pbs.twimg.com") return [];
      // `large` 2048 pikselle sınırlı; `orig` 10 MB yükleme sınırını aşabiliyor.
      url.searchParams.set("format", "jpg");
      url.searchParams.set("name", "large");
      return [{ url: url.toString(), width: photo.width ?? 0, height: photo.height ?? 0 }];
    } catch {
      return [];
    }
  });

  const warnings: string[] = [];
  if (!text) warnings.push("Gönderi metni okunamadı; metni elle yazın.");
  if (!date) {
    warnings.push("Gönderi tarihi okunamadı; tarihi elle girin (tarihsiz kayıt yayımlanamaz).");
  }
  if (images.length === 0) {
    warnings.push("Gönderide fotoğraf yok; kapağı elle yükleyebilirsiniz.");
  }
  if (!syndication && oembedText) {
    warnings.push("Fotoğraflar alınamadı, yalnızca metin okunabildi. Bir süre sonra tekrar deneyin.");
  }

  return {
    ok: true,
    post: {
      platform: analysis.platform,
      canonicalUrl,
      postId,
      authorName: (syndication?.user?.name ?? oembed?.author_name ?? "").trim(),
      authorHandle:
        syndication?.user?.screen_name ??
        oembed?.author_url?.split("/").filter(Boolean).pop() ??
        analysis.authorHandle ??
        "",
      text,
      date,
      images,
      warnings,
    },
  };
}

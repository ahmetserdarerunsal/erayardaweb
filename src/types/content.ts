

/** Yönetim paneli ve kamuya açık arşivler için ortak yayın durumu. */
export type MediaPublicationStatus = "draft" | "published" | "archived";

/** Boyutlar, görsel oranını yerleşim kayması olmadan korumak için zorunludur. */
export type PhotoAsset = {
  id: string;
  src: string;
  alt: string;
  width: number;
  height: number;
  caption?: string | null;
  /** Yönetim panelindeki sürükle-bırak sırası. */
  sortOrder: number;
};

export type PhotoAlbum = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  /** Albümdeki bir PhotoAsset kaydının kimliği. */
  coverPhotoId: string | null;
  photos: readonly PhotoAsset[];
  status: MediaPublicationStatus;
  /** Albümlerin yönetim panelindeki sırası. */
  sortOrder: number;
  createdAt: string;
  /** ISO 8601 (YYYY-MM-DD). Taslaklarda null olabilir. */
  publishedAt: string | null;
};

export type KnownVideoProvider =
  | "youtube"
  | "instagram"
  | "facebook"
  | "x"
  | "tiktok"
  | "vimeo"
  | "file";

/** Bilinen sağlayıcılarda otomatik tamamlama sunar, yeni adapter'lara da açıktır. */
export type VideoProvider = KnownVideoProvider | (string & {});

export type VideoEmbedStatus = "allowed" | "blocked" | "unknown";

export type VideoEntry = {
  id: string;
  slug: string;
  title: string;
  description: string;
  provider: VideoProvider;
  originalUrl: string | null;
  videoId: string | null;
  /** Platformdan resmî API/oEmbed ile alınabilen kapak. */
  thumbnailUrl: string | null;
  /** Yöneticinin yüklediği kapak, varsa platform kapağını geçersiz kılar. */
  customThumbnail: string | null;
  /** Doğrudan yüklenen MP4/WebM dosyası. */
  videoFileUrl: string | null;
  videoFileMimeType?: "video/mp4" | "video/webm" | null;
  /** Admin önizlemesinde gerçekten doğrulandıktan sonra `allowed` yapılır. */
  embedStatus: VideoEmbedStatus;
  createdAt: string;
  /** ISO 8601. İleri tarihli yayın planlamasını da destekler. */
  publishedAt: string | null;
  status: MediaPublicationStatus;
  sortOrder: number;
};

/** Faaliyet taksonomisi — ana menüde sayfa olarak görünmez, yalnızca filtre olarak kullanılır. */
export type ActivityCategoryId =
  | "meclis"
  | "saha"
  | "etkinlikler"
  | "genclik-spor"
  | "ziyaretler";

export type ActivityLocationId = "kartal" | "istanbul" | "ankara" | "diger";

/**
 * Doğrudan yürütülen bir çalışma ile yalnızca katılım sağlanan bir etkinlik
 * arasındaki ayrımı korur; ikisi aynı şeymiş gibi sunulmaz.
 */
export type ActivityKind = "calisma" | "katilim";

export type ActivityImage = { src: string; alt: string; caption?: string };

/**
 * Bir faaliyetin kaynağı. `confirms` alanı, kaynağın fiilen neyi doğruladığını
 * yazar — etkinliğin kendisini doğrulayan bir haber, Arda'nın katılımını
 * doğrulamayabilir. İkisi karıştırılmaz.
 */
export type ActivitySource = {
  label: string;
  url: string;
  publisher: string;
  /** Bu kaynağın kanıtladığı bilgi. */
  confirms: string;
  /** Kaynağın görüntülendiği tarih, ISO 8601 (YYYY-MM-DD) */
  retrieved: string;
};

/** Doğrulaması tamamlanmayan kayıt "draft" kalır ve kamuya açık arşive girmez. */
export type ActivityPublicationStatus = "published" | "draft";

export type Activity = {
  id: string;
  slug: string;
  title: string;
  /** Kısa açıklama (excerpt) */
  summary: string;
  /** Tam açıklama (content) */
  body: readonly string[];
  /** Kesin etkinlik tarihi, ISO 8601 (YYYY-MM-DD). Gün bilinmiyorsa null. */
  date: string | null;
  /** Birden fazla güne yayılan etkinliklerde bitiş tarihi. */
  endDate?: string | null;
  /**
   * Yalnızca ay biliniyorsa, ISO 8601 (YYYY-MM). Arşivde "Eylül 2026" olarak
   * gösterilir; uydurma bir gün yazmaktansa hassasiyeti düşürmek tercih edilir.
   */
  dateApprox?: string | null;
  /** Tarihle ilgili, yayımlanmayan iç not. */
  dateNote?: string;
  categories: readonly ActivityCategoryId[];
  location: ActivityLocationId;
  cover: ActivityImage | null;
  gallery: readonly ActivityImage[];
  kind: ActivityKind;
  sources: readonly ActivitySource[];
  publicationStatus: ActivityPublicationStatus;
  /**
   * Tamamlanmayı bekleyen eksikler. Yalnızca iç takip içindir; yayımı
   * engellemez. Yayımın tek koşulu: publicationStatus === "published" ve
   * çözümlenebilir bir tarih (date veya dateApprox).
   */
  missingInfo: readonly string[];
  featured?: boolean;
};

/** Kamuya açık arşivde gösterilen faaliyet; sıralama anahtarı çözümlenmiştir. */
export type PublishedActivity = Activity & { sortDate: string };

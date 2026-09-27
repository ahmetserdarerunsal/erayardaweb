# Devir Notu — Yönetim Paneli

Bu dosya, projeyi devralan geliştirici içindir. Sitenin kamuya açık kısmı
bitmiş durumda; yönetim panelinin altyapısı kuruldu, içerik modülleri
yazılmayı bekliyor.

---

## 1. Yığın

| | |
|---|---|
| Framework | Next.js **16.3.5**, App Router, Turbopack |
| React | 19.2.8 |
| Stil | Elle yazılmış CSS (`src/app/globals.css`), Tailwind v4 kurulu ama kullanılmıyor |
| Veritabanı / Auth / Depolama | Supabase (proje: `erayardaweb`, bölge Frankfurt) |
| Hosting | Vercel — **canlı**: https://erayardaweb.vercel.app |
| Dil | Arayüzün tamamı Türkçe |

Bağımlılıklar kasıtlı olarak az: `@supabase/supabase-js`, `@supabase/ssr`,
`framer-motion`, `server-only`. ORM yok, UI kütüphanesi yok.

---

## 2. Next.js 16 tuzakları

Bunlar eğitim verisinden farklı, dikkat:

1. **`middleware.ts` yok, `proxy.ts` var.** Konvansiyon yeniden adlandırıldı.
   Supabase'in resmî rehberi hâlâ `middleware.ts` diyor; o rehberi izlerseniz
   oturum yönetimi sessizce çalışmaz. Dosya: `src/proxy.ts`.
2. **`params` ve `searchParams` birer Promise.** `await params` gerekir.
3. **Rota grupları diskte klasör seviyesi ekler.** `(site)` grubuna taşınan
   dosyalarda göreli import yolları bir seviye derinleşti.
4. Dokümantasyon `node_modules/next/dist/docs/` altında; kod yazmadan önce
   ilgili sayfayı okuyun (projenin `AGENTS.md` dosyası bunu şart koşuyor).

---

## 3. Dizin yapısı

```
src/app/
  layout.tsx            html/body + Montserrat + globals.css (SADECE bu)
  (site)/
    layout.tsx          Header + Footer + skip-link
    page.tsx            ana sayfa
    ekrem-eray-arda/    Hakkında
    faaliyetler/        arşiv + [slug] detay
    fotograflar/        fotoğraf arşivi
    videolar/           video arşivi
    iletisim/           Seni Dinliyorum formu
    basin|basin-medya|kartal|istanbul|medya/   eski sayfalar, erişilemez
  admin/
    layout.tsx          .admin sarmalayıcı + admin.css + robots noindex
    admin.css           panele özel tasarım sistemi (siteden bağımsız)
    AdminShell.tsx      sol menü, üst bar, mobil çekmece (client)
    giris/              bölünmüş giriş ekranı (fotoğraflı)
    kurulum/            .env eksikse gösterilir
    yetkisiz/           yetkisi olmayan kullanıcı
    (panel)/
      layout.tsx        requireAdminSession() + AdminShell
      page.tsx          Genel Bakış
  robots.ts, sitemap.ts

src/lib/
  admin/session.ts      requireAdminSession / requireYonetici / requirePublisher
  admin/navigation.ts   sol menü tanımı (ready: false olanlar "Yakında")
  supabase/config.ts    URL + publishable key, isSupabaseConfigured
  supabase/client.ts    tarayıcı istemcisi
  supabase/server.ts    sunucu istemcisi (çerez tabanlı)
  supabase/admin.ts     secret key istemcisi, server-only
  video-providers.ts

src/proxy.ts            oturum tazeleme + /admin koruması
supabase/migrations/    0001 (şema) + 0002 (service_role izinleri)
```

**Kritik ayrım:** `/admin` ziyaretçiye açık siteden tamamen bağımsızdır.
Kök layout yalnızca `html`/`body` kurar; Header/Footer `(site)` grubundadır.
Panele site çerçevesi sızdırmayın.

---

## 4. Güvenlik modeli — üç katman

1. **`src/proxy.ts`** — oturumu olmayanı `/admin/giris`'e yollar. İlk savunma,
   tek başına yeterli değil.
2. **`requireAdminSession()`** — her panel sayfasında çağrılır. Oturum açmış
   olsa bile `admin_profiles` kaydı yoksa veya `is_active = false` ise
   `/admin/yetkisiz`'e atar.
3. **RLS** — asıl yetki burada. 37 politika, `is_admin()`, `is_yonetici()`,
   `can_publish()` fonksiyonları üzerinden.

Arayüzde yetki kontrolü yapmak yeterli değildir; RLS'i de güncelleyin.

### Doğrulanmış kurallar

Bunlar canlı veritabanında test edildi, bozulmamalı:

| Kural | Durum |
|---|---|
| Ziyaretçi yayımlanmış faaliyet/albüm/video okur | ✓ |
| Ziyaretçi **gelen mesajları okuyamaz** | ✓ engelli |
| Ziyaretçi **yönetici listesini okuyamaz** | ✓ engelli |
| Ziyaretçi mesaj bırakabilir | ✓ |
| Ziyaretçi `status`/`admin_note` alanlarını dolduramaz | ✓ sütun bazlı izin |
| Dışarıdan kayıt | ✓ kapalı (`signup_disabled`) |
| service_role tam erişim | ✓ (0002 ile) |

`SUPABASE_SECRET_KEY` asla istemciye gitmez — `src/lib/supabase/admin.ts`
`server-only` ile korunuyor.

---

## 5. Veritabanı

12 tablo: `admin_profiles`, `media_library`, `activities`,
`activity_gallery`, `activity_sources`, `photo_albums`, `photos`, `videos`,
`contact_messages`, `page_content`, `site_settings`, `audit_logs`.

Şemaya gömülü iş kuralları — bunlar bilinçli, kaldırmayın:

- `activities_published_needs_date`: tarihi (gün veya ay) olmayan faaliyet
  `published` yapılamaz. Uydurma tarih yazmamak için.
- `activity_sources.confirms`: kaynağın **neyi** doğruladığını yazar.
  Etkinliği doğrulayan haber, kişinin katılımını doğrulamayabilir.
- `page_content.draft_content` / `published_content`: ayrı sütunlar.
  Yayımlanmamış değişiklik ziyaretçiye sızmaz.
- `videos_needs_source`: ya platform bağlantısı ya yüklenmiş dosya olmalı.

**Önemli:** Proje "Automatically expose new tables" **kapalı** kuruldu.
Yeni tablo eklerseniz `anon` / `authenticated` / `service_role` izinlerini
**elle** vermeniz gerekir, yoksa API'den görünmez. Örnek için 0001'in sonuna
ve 0002'ye bakın.

Depolama: `medya` bucket'ı, 10 MB sınır, `image/jpeg|png|webp|avif`.
Kurallar 0001'in içinde, panelden elle bir şey yapmaya gerek yok.

---

## 6. Ortam değişkenleri

`.env.local` doldurulmuş ve çalışıyor. Şablon: `.env.example`.

```
NEXT_PUBLIC_SITE_URL
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY    # sb_publishable_... (gizli değil)
SUPABASE_SECRET_KEY                     # sb_secret_...      (GİZLİ)
REVALIDATE_SECRET
```

Supabase yeni anahtar formatına geçti: eski `anon`/`service_role` yerine
`publishable`/`secret`. RLS'te aynı rollere karşılık geliyorlar.

`NEXT_PUBLIC_SITE_URL` **build zamanında** okunur; değiştirince yeniden
deploy gerekir.

---

## 7. Şu an ne çalışıyor

- Kamuya açık sitenin tamamı (6 sayfa) — tasarımı bitmiş, dokunmayın
- `/admin` giriş ekranı (fotoğraflı bölünmüş düzen)
- Oturum koruması, roller, yetkisiz/kurulum ekranları
- Genel Bakış: canlı sayaçlar (faaliyet, albüm, video, okunmamış mesaj)
- Fotoğraf, Video, Gelen Mesajlar ve **Faaliyetler** modülleri
- Sol menü — hazır olmayan bölümler "Yakında" etiketiyle pasif

### Faaliyetler modülü — X gönderisinden içe aktarma

`/admin/faaliyetler` bir X gönderi bağlantısından taslak faaliyet üretir.
Okuma katmanı `src/lib/social-posts.ts`:

- oEmbed **publish.x.com/oembed** adresinden çağrılır (eski
  `publish.twitter.com` 301 veriyor). Bilerek `lang=en` gönderilir:
  yerelleştirilmiş ay adları tarih çözümlemesini kırılganlaştırır.
- Metin, blockquote'un ilk paragrafından alınır. X'in metin sonuna eklediği
  `pic.twitter.com/...` ve `https://t.co/...` artıkları temizlenir; metnin
  **içinde** geçen bağlantılar yazarın kendi içeriğidir, korunur.
- Kapak yalnızca gönderinin kendi medyasından alınır (`pbs.twimg.com` +
  `/media/` veya `*_video_thumb/`). Profil avatarı ve bağlantı kartı görseli
  (`card_img`) reddedilir — biri 200×200, diğeri üçüncü tarafın görseli.
- Görsel uzaktan bağlanmaz, **indirilip kendi depomuza yazılır**; gönderi
  silinirse sitedeki kapak kırılmasın diye. `media_library.width/height`
  zorunlu olduğundan boyut `src/lib/image-dimensions.ts` ile dosya
  başlığından okunur (PNG / JPEG / WebP).

Kayıt her zaman **taslak** açılır: başlık gönderi metninden türetilmiştir,
konum `diger`, kategori boştur. Gönderi otomatik olarak kaynak listesine
eklenir ve `confirms` alanına "gönderinin içeriği (birincil kaynak)" yazılır
— gönderi, faaliyetin gerçekleştiğini değil paylaşıldığını kanıtlar.

`lint`, `typecheck`, `build` temiz.

## 8. Ne yapılmadı

Sol menüde `ready: false` olan her şey. Öncelik sırası:

Medya Kütüphanesi, Sayfa Yönetimi, Site Ayarları, Kullanıcılar ve İşlem
Geçmişi. Faaliyetler modülünde de şunlar yok: galeri (`activity_gallery`)
yönetimi, sıralama (`sort_order`), öne çıkarma (`featured`) ve X dışındaki
platformlardan içe aktarma — `social-posts.ts` bunun için yeni bir
`SocialPlatformId` eklenecek şekilde yazıldı.

### Statik → dinamik geçişi: tamamlandı

`src/data/*.ts` kaldırıldı; içerik artık yalnızca Supabase'de. Sayfalar
`src/lib/public-content.ts` üzerinden `unstable_cache` ile okuyor
(`CONTENT_REVALIDATE_SECONDS = 300`), panel yayımladığında `updateTag` +
`revalidatePath` ile anında tazeleniyor.

**Aynı içeriği iki kaynaktan yönetmeyin.** Yeni bir içerik türü eklerken
`CONTENT_TAGS`'e etiket ekleyin ve `/api/revalidate` izin listesini
güncelleyin; tanımsız etiket 400 döner, sessizce yutulmaz.

---

## 9. Proje kuralları

Bunlar kullanıcıyla birlikte oturmuş kurallar, korunmalı:

- **Uydurma içerik yok.** Faaliyet, tarih, kaynak veya fotoğraf uydurulmaz.
  Doğrulanmamış kayıt `draft` kalır.
- **Sahte başarı mesajı yok.** Servis bağlı değilse form canlıya açılmaz.
- **Tarih hassasiyeti düşürülür, uydurulmaz.** Gün bilinmiyorsa `dateApprox`
  ile "Eylül 2026" gösterilir.
- Kurumsal renkler: `#102A43` lacivert, `#2A4E8A` destek, `#F8F6F1` kırık
  beyaz. Font Montserrat. Gold, gereksiz gradient, kalın çerçeve, SaaS kartı
  kullanılmaz.
- Panel tasarımı siteden bağımsızdır, `admin.css` içinde durur.
- Kamuya açık sayfaların tasarımı **değiştirilmez**.

## 10. Bilinen eksikler (panel dışı)

Yayın öncesi kapatılanlar:

- ✅ 404 (`app/not-found.tsx` + `(site)/not-found.tsx`) ve hata sınırları
  (`(site)/error.tsx`, `global-error.tsx`). Hata ayrıntısı ziyaretçiye
  yazılmaz, yalnızca `digest` kodu gösterilir.
- ✅ Paylaşım görseli `app/opengraph-image.png` (1200×630), ikonlar
  `app/icon.svg` ve `app/apple-icon.png`. Next varsayılanı `favicon.ico`
  silindi. Görseller `scripts/generate-og.mjs` ile üretildi; yeniden üretmek
  gerekirse dev sunucusu açıkken çalıştırılır.
- ✅ `robots.ts` mutlak sitemap adresi veriyor, `/admin` ve `/api` dizine
  kapatıldı.
- ✅ Erişilemeyen eski sayfalar (`basin`, `istanbul`, `kartal`, `medya`)
  ve `InteriorPlaceholder` silindi. Yönlendirmeler `next.config.ts`
  içinde duruyor, 308 veriyor.
- ✅ Güvenlik başlıkları `next.config.ts` içindeki `headers()` ile veriliyor,
  barındırıcı dosyasında değil: `netlify.toml`'daki başlıklar Vercel'e
  geçildiğinde sessizce devre dışı kalırdı. CSP bilerek eklenmedi —
  Supabase, YouTube/Vimeo ve Google Fonts için izin listesi gerekir, yanlış
  yazılan CSP sayfayı sessizce bozar; önce rapor modunda denenmeli.
- ✅ Barındırıcı Netlify'dan **Vercel**'e alındı; `netlify.toml` kaldırıldı.
  Vercel için ayrı dosya gerekmiyor.

Açık kalanlar:

- ⚠️ **Alan adı bağlanmadı.** Site şu an `erayardaweb.vercel.app`
  üzerinde. Gerçek alan adı eklenince `NEXT_PUBLIC_SITE_URL` de
  güncellenmeli ve **yeniden deploy** edilmeli — bu değer build
  sırasında koda gömülüyor, sitemap/robots/canonical ondan üretiliyor.
- ⚠️ **GitHub bağlantısı yok.** Vercel hesabına GitHub Login Connection
  eklenmediği için `vercel git connect` 400 dönüyor. Bağlanana kadar
  dağıtım elle: `npx vercel --prod`.

## Dağıtım

Proje: `serdarerunsal071-7983/erayardaweb`. Ortam değişkenlerinin beşi de
Production ve Preview için tanımlı (`npx vercel env ls`).

```
npx vercel --prod      # elle dağıtım
npx vercel env ls      # değişkenleri listele
```

GitHub bağlandıktan sonra master'a her push otomatik dağıtılır.

## 11. Güvenlik notu

`SUPABASE_SECRET_KEY` bir sohbet penceresine yapıştırıldı. Supabase
panelinden (Project Settings → API Keys → Secret keys) **yenilenmeli** ve
`.env.local` güncellenmeli.

## 12. Çalıştırma

```
npm run dev        # http://localhost:3000, panel /admin
npm run lint
npm run typecheck
npm run build
```

Üretime dağıtım kullanıcının açık onayı olmadan yapılmaz.

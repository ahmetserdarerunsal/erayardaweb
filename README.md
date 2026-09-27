# Ekrem Eray Arda — kişisel web sitesi

İBB ve Kartal Belediye Meclis Üyesi Ekrem Eray Arda'nın kamuya açık web
sitesi ve Türkçe yönetim paneli.

**Canlı:** https://erayardaweb.vercel.app · **Panel:** `/admin`

## Yığın

| | |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| React | 19 |
| Stil | Elle yazılmış CSS (`src/app/globals.css`) |
| Veritabanı / kimlik / depolama | Supabase |
| Hosting | Vercel |

Bağımlılıklar kasıtlı olarak az: ORM yok, UI kütüphanesi yok.

## Çalıştırma

```bash
cp .env.example .env.local   # değerleri doldurun
npm install
npm run dev                  # http://localhost:3000
```

```bash
npm run lint
npm run typecheck
npm run build
```

## Bilmeniz gerekenler

**Bu, bildiğiniz Next.js değil.** Sürüm 16'da `middleware.ts` **`proxy.ts`**
olarak yeniden adlandırıldı; Supabase'in resmî rehberi hâlâ eskisini
söylüyor ve o rehber izlenirse oturum yönetimi sessizce çalışmaz. `params`
ve `searchParams` artık birer Promise.

**İçerik kodda değil.** Ziyaretçinin gördüğü her şey Supabase'den gelir ve
`/admin` üzerinden yönetilir. Aynı içeriği ikinci bir yerden yönetmeyin.

**`NEXT_PUBLIC_SITE_URL` build sırasında koda gömülür.** Sitemap, robots.txt,
canonical ve paylaşım görseli adresleri ondan üretilir; değiştirince yeniden
deploy gerekir. Değer eksikse üretim derlemesi uyarı basar.

**Uydurma içerik yok.** Faaliyet, tarih, kaynak veya fotoğraf uydurulmaz.
Tarihi çözümlenemeyen kayıt veritabanı kısıtıyla yayımlanamaz; bir kaynağın
neyi doğruladığı ayrı alanda tutulur, çünkü etkinliği doğrulayan bir haber
kişinin katılımını doğrulamayabilir.

## Dizinler

```
src/app/(site)/     ziyaretçiye açık sayfalar
src/app/admin/      yönetim paneli (kendi tasarım sistemi)
src/lib/            Supabase istemcileri, içerik okuma katmanı
src/proxy.ts        oturum tazeleme + /admin koruması
supabase/migrations/  şema, izinler, tohum veri
scripts/            görsel üretimi ve doğrulama araçları
```

Ayrıntılı devir notu **[DEVAM.md](DEVAM.md)**, kurulum adımları
**[KURULUM.md](KURULUM.md)** içinde.

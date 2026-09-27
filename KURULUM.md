# Supabase Kurulumu — Adım Adım

Bu dosyayı takip ederek ~10 dakikada altyapıyı hazırlayabilirsiniz.
Sonunda bana **3 değer** ileteceksiniz.

> **Önce şunu kontrol edin:** Supabase ücretsiz planda hesap başına 2 aktif
> proje sınırı vardır. Yeni proje açamıyorsanız eski bir projeyi
> dondurun (pause) veya silin.

---

## 1. Proje oluşturma

1. [supabase.com](https://supabase.com) → **Start your project**
2. GitHub hesabınızla giriş yapın
3. **New project**
4. Formu doldurun:

   | Alan | Değer |
   |---|---|
   | Organization | Kişisel hesabınız |
   | Name | `erayardaweb` |
   | Database Password | **Güçlü bir şifre üretin ve kaydedin** |
   | Region | **Central EU (Frankfurt)** |

5. **Security** bölümündeki üç seçeneği şöyle ayarlayın:

   | Seçenek | Ayar | Neden |
   |---|---|---|
   | Enable Data API | **Açık** | Panel bu API üzerinden çalışıyor, kapatılırsa hiçbir şey çalışmaz |
   | Automatically expose new tables | **Kapalı** | Supabase'in kendi önerisi. Migration izinleri zaten tek tek veriyor |
   | Enable automatic RLS | **Açık** | Ek güvenlik ağı: ileride eklenen tablolar da otomatik korumalı olur |

   **GitHub (optional)** kısmını boş bırakın, gerekli değil.

6. **Create new project** → kurulum 1–2 dakika sürer

Bölge önemli: Frankfurt hem Türkiye'ye en yakın hem de AB içinde,
kişisel veri açısından doğru tercih.

> Veritabanı şifresini kaybetmeyin. Bana göndermenize gerek yok.

---

## 2. Veritabanı ve depolamayı kurma

1. Sol menüden **SQL Editor** (`</>` simgesi)
2. **New query**
3. Bu projedeki `supabase/migrations/0001_initial_schema.sql` dosyasını açın,
   **tamamını** kopyalayın
4. SQL Editor'e yapıştırın
5. Sağ altta **Run** (veya `Ctrl+Enter`)
6. Altta yeşil **Success. No rows returned** yazmalı

Bu tek adım şunları yapar:

- 12 tablo ve ilişkileri
- 33 güvenlik politikası (RLS)
- Data API rol izinleri
- `medya` adlı depolama alanı (10 MB sınır, yalnızca görsel formatları)
- Depolama yetki kuralları

Yani Storage tarafında elle kural eklemenize **gerek yok**.

Hata alırsanız kırmızı mesajı bana olduğu gibi gönderin.

Bu adım yalnızca yeni nesne oluşturur; hiçbir şeyi silmez.

---

## 3. İlk yönetici hesabınız

1. Sol menüden **Authentication** → **Users**
2. **Add user** → **Create new user**
3. E-posta ve güçlü bir şifre girin (en az 12 karakter)
4. **Auto Confirm User** seçeneğini **açın** (e-posta doğrulaması beklemeyin)
5. **Create user**
6. Oluşan kullanıcının satırına tıklayın, **User UID** değerini kopyalayın

Şimdi bu kullanıcıyı yönetici yapalım:

7. **SQL Editor** → **New query**
8. Aşağıyı yapıştırın, `BURAYA_UID` ve `Adınız Soyadınız` kısımlarını değiştirin:

```sql
insert into admin_profiles (id, full_name, role, can_publish, is_active)
values ('BURAYA_UID', 'Adınız Soyadınız', 'yonetici', true, true);
```

9. **Run** → `Success` görmelisiniz

Şifreniz Supabase tarafından hash'lenerek saklanır; ne ben ne de veritabanı
düz metin şifreyi görür.

---

## 4. Genel kullanıcı kaydını kapatma

1. **Authentication** → **Sign In / Providers**
2. **Email** sağlayıcısını açın
3. **Allow new users to sign up** seçeneğini **kapatın**
4. **Save**

Bu, panele dışarıdan kimsenin kayıt olamamasını sağlar. Yeni hesaplar
yalnızca sizin tarafınızdan açılır.

---

## 5. Anahtarları alma

1. Sol altta **Project Settings** (dişli) → **API**
2. Şu üç değeri kopyalayın:

**Project Settings → API Keys** sayfasında:

| Etiket | Görünüm |
|---|---|
| **Publishable key** | `sb_publishable_...` — gizli değil |
| **Secret key** | `sb_secret_...` — **GİZLİ** (göz simgesiyle görünür olur) |

Project URL'i **Settings → General → Project ID**'den veya ana sayfadan alabilirsiniz.

### Secret key hakkında

Bu anahtar bütün güvenlik kurallarını atlar. Bana ilettikten sonra iş
bitince Supabase panelinden **Reset** ile yenilemeniz iyi olur.
Kodda asla tarayıcıya gönderilmez, yalnızca sunucu tarafında kullanılır.

---

## 6. `.env.local` dosyası

Proje klasöründe:

```
cp .env.example .env.local
```

Ardından dosyayı açıp doldurun:

| Değişken | Nereden |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Sitenizin adresi |
| `NEXT_PUBLIC_SUPABASE_URL` | Adım 5 → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Adım 5 → Publishable key |
| `SUPABASE_SECRET_KEY` | Adım 5 → Secret key |
| `REVALIDATE_SECRET` | `openssl rand -base64 32` |

> `.env.local` dosyası `.gitignore` içindedir, GitHub'a gitmez.

---

## 7. Yerelde test

```
npm run dev
```

Tarayıcıda `http://localhost:3000/admin` → giriş ekranı çıkmalı.
Adım 3'te oluşturduğunuz hesapla girin.

---

## 8. Vercel'e yayımlama

Vercel, Next.js'in kendi platformu: ISR, sunucu eylemleri ve on-demand
revalidation eklenti olmadan çalışıyor. Ayrı bir yapılandırma dosyası yok —
yönlendirmeler ve güvenlik başlıkları `next.config.ts` içinde duruyor.

### 8.1 Projeyi bağlama

1. Kodu bir GitHub deposuna gönderin (Vercel depodan okuyacak).
2. [vercel.com/new](https://vercel.com/new) → depoyu seçin.
3. Framework **Next.js** olarak otomatik algılanır; build komutunu
   değiştirmeyin.
4. **Deploy** demeden önce aşağıdaki ortam değişkenlerini girin.

### 8.2 Ortam değişkenleri

**Settings → Environment Variables.** `.env.local` dosyasını sürükleyip
toplu içe aktarabilirsiniz. Hepsi Production, Preview ve Development için
işaretlenmeli.

| Değişken | Değer |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canlı adres, sonunda eğik çizgi olmadan |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` ile aynı |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `.env.local` ile aynı |
| `SUPABASE_SECRET_KEY` | `.env.local` ile aynı — **gizli** |
| `REVALIDATE_SECRET` | `.env.local` ile aynı — **gizli** |

> **`NEXT_PUBLIC_SITE_URL` build sırasında okunur.** Sitemap, robots.txt,
> canonical ve paylaşım görseli adresleri bundan üretilir. Değiştirdikten
> sonra **yeniden deploy** edin, yoksa eski adres gömülü kalır.

Alan adı henüz yoksa önce Vercel'in verdiği `...vercel.app` adresini yazın;
alan adı bağlanınca değeri güncelleyip yeniden deploy etmek yeterli.

### 8.3 Alan adı

**Settings → Domains** → alan adını ekleyin. Vercel hangi DNS kaydını
gireceğinizi söyler (genelde `A` kaydı ya da `www` için `CNAME`).
Sertifika otomatik gelir. Sonra `NEXT_PUBLIC_SITE_URL`'i güncelleyip
yeniden deploy edin.

### 8.4 Yayın sonrası kontrol

- `/robots.txt` → `Sitemap:` satırı canlı alan adını göstermeli
- `/sitemap.xml` → adresler `localhost` içermemeli
- `/admin` → giriş ekranına yönlenmeli, `X-Robots-Tag: noindex` dönmeli
- Bir sayfayı sosyal medyada paylaşıp önizleme görselini kontrol edin

Deploy'u ben yapmayacağım — onayınız olmadan üretime dağıtım yok.

---

## Sorun çıkarsa

| Belirti | Olası sebep |
|---|---|
| `/admin` → "Kurulum tamamlanmadı" | `.env.local` eksik veya dev sunucusu yeniden başlatılmadı |
| Giriş oluyor ama "erişiminiz yok" diyor | Adım 3'teki `admin_profiles` kaydı eklenmemiş |
| `relation "admin_profiles" does not exist` | Adım 2 çalıştırılmamış |
| Fotoğraf yüklenmiyor | Adım 2'deki depolama bölümü hata vermiş olabilir |

Hata mesajını olduğu gibi bana gönderin.

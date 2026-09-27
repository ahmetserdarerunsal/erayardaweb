-- ===========================================================================
-- Ekrem Eray Arda — yönetim paneli şeması (Supabase / PostgreSQL)
--
-- Bu migration YALNIZCA yeni nesne oluşturur. Hiçbir tabloyu silmez,
-- hiçbir sütunu değiştirmez, veri kaybına yol açmaz.
--
-- Supabase panelinde SQL Editor'e yapıştırıp Run demeniz yeterlidir.
-- Depolama (Storage) kuralları da en altta yer alır; panelden elle kural
-- eklemenize gerek yoktur.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Ortak tipler
-- ---------------------------------------------------------------------------

create type admin_role as enum ('yonetici', 'editor');
create type publication_status as enum ('draft', 'published', 'archived');
create type message_status as enum ('new', 'read', 'in_progress', 'done', 'archived');
create type activity_kind as enum ('calisma', 'katilim');
create type video_embed_status as enum ('allowed', 'blocked', 'unknown');

-- ---------------------------------------------------------------------------
-- Yönetici profilleri — Supabase'in auth.users tablosunu genişletir
-- ---------------------------------------------------------------------------

create table admin_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role admin_role not null default 'editor',
  -- Editörlerin yayımlama yetkisi ayrıca tanımlanabilir.
  can_publish boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table admin_profiles is
  'Panele erişebilen kullanıcılar. Genel kayıt kapalıdır; kayıtlar yalnızca yönetici tarafından açılır.';

-- Politikalarda tekrar tekrar kullanılan yardımcılar.
-- security definer: RLS döngüsüne girmemesi için.
create or replace function is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from admin_profiles where id = auth.uid() and is_active);
$$;

create or replace function is_yonetici()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from admin_profiles
    where id = auth.uid() and is_active and role = 'yonetici'
  );
$$;

create or replace function can_publish()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from admin_profiles
    where id = auth.uid() and is_active and (role = 'yonetici' or can_publish)
  );
$$;

-- ---------------------------------------------------------------------------
-- Medya kütüphanesi — Supabase Storage'a yüklenen her dosyanın kaydı
-- ---------------------------------------------------------------------------

create table media_library (
  id uuid primary key default gen_random_uuid(),
  -- 'medya' bucket'ı içindeki yol.
  storage_path text not null unique,
  file_name text not null,
  mime_type text not null,
  size_bytes bigint not null,
  -- Yerleşim kayması olmaması için boyut zorunludur.
  width integer not null,
  height integer not null,
  alt_text text not null default '',
  uploaded_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create index media_library_created_at_idx on media_library (created_at desc);

-- ---------------------------------------------------------------------------
-- Faaliyetler
-- ---------------------------------------------------------------------------

create table activities (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  summary text not null default '',
  -- Zengin metin editörünün çıktısı.
  body jsonb not null default '[]'::jsonb,
  -- Kesin gün bilinmiyorsa null kalır; uydurma tarih yazılmaz.
  event_date date,
  event_end_date date,
  -- Yalnızca ay biliniyorsa 'YYYY-MM'.
  event_date_approx text,
  -- Yayımlanmayan iç not.
  date_note text,
  categories text[] not null default '{}',
  location text not null default 'istanbul',
  kind activity_kind not null default 'katilim',
  cover_media_id uuid references media_library (id) on delete set null,
  status publication_status not null default 'draft',
  -- Tamamlanmayı bekleyen eksikler; yayımı engellemez, iç takip içindir.
  missing_info text[] not null default '{}',
  featured boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  -- KURAL: tarihi çözümlenemeyen kayıt yayımlanamaz.
  constraint activities_published_needs_date check (
    status <> 'published'
    or event_date is not null
    or event_date_approx is not null
  ),
  -- 'YYYY-MM' biçim güvencesi.
  constraint activities_date_approx_format check (
    event_date_approx is null or event_date_approx ~ '^\d{4}-(0[1-9]|1[0-2])$'
  )
);

create index activities_status_idx on activities (status);
create index activities_order_idx on activities (event_date desc nulls last, created_at desc);

create table activity_gallery (
  activity_id uuid not null references activities (id) on delete cascade,
  media_id uuid not null references media_library (id) on delete cascade,
  caption text,
  sort_order integer not null default 0,
  primary key (activity_id, media_id)
);

-- KURAL: kaynağın NEYİ doğruladığı ayrı tutulur. Etkinliği doğrulayan bir
-- haber, kişinin katılımını doğrulamayabilir; ikisi karıştırılmamalıdır.
create table activity_sources (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references activities (id) on delete cascade,
  label text not null,
  url text not null,
  publisher text,
  confirms text,
  retrieved_at date,
  sort_order integer not null default 0
);

create index activity_sources_activity_idx on activity_sources (activity_id);

-- ---------------------------------------------------------------------------
-- Fotoğraf albümleri
-- ---------------------------------------------------------------------------

create table photo_albums (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text,
  cover_photo_id uuid,
  status publication_status not null default 'draft',
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz
);

create table photos (
  id uuid primary key default gen_random_uuid(),
  album_id uuid not null references photo_albums (id) on delete cascade,
  media_id uuid not null references media_library (id) on delete restrict,
  -- Albüme özel metin; boşsa media_library.alt_text kullanılır.
  alt_text text,
  caption text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create index photos_album_idx on photos (album_id, sort_order);

-- Kapak, aynı albümün fotoğrafı olmalıdır.
alter table photo_albums
  add constraint photo_albums_cover_fk
  foreign key (cover_photo_id) references photos (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Videolar — öncelik orijinal platform bağlantısı, dosya yükleme istisna
-- ---------------------------------------------------------------------------

create table videos (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  -- youtube | instagram | facebook | x | tiktok | vimeo | file | ...
  provider text not null,
  original_url text,
  video_id text,
  -- Platformun resmî oEmbed/API çıktısından gelen kapak.
  thumbnail_url text,
  -- Yöneticinin yüklediği kapak; varsa platform kapağını geçersiz kılar.
  custom_thumbnail_media_id uuid references media_library (id) on delete set null,
  -- İleride doğrudan MP4/WebM yükleme için; normalde boş kalır.
  video_storage_path text,
  video_mime_type text,
  -- Yalnızca admin önizlemesinde gerçekten doğrulandıktan sonra 'allowed'.
  embed_status video_embed_status not null default 'unknown',
  status publication_status not null default 'draft',
  sort_order integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- İleri tarihli yayın planlamasını da destekler.
  published_at timestamptz,
  -- Ya platform bağlantısı ya da yüklenmiş dosya olmalı.
  constraint videos_needs_source check (
    original_url is not null or video_storage_path is not null
  )
);

create index videos_status_idx on videos (status, sort_order);

-- ---------------------------------------------------------------------------
-- Seni Dinliyorum — gelen mesajlar
-- ---------------------------------------------------------------------------

create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  sender_name text not null,
  -- İsteğe bağlı; boşsa göndericiye yanıt verilemez.
  sender_email text,
  message text not null,
  status message_status not null default 'new',
  -- Yalnızca hız sınırı ve kötüye kullanım incelemesi için; ham IP saklanmaz.
  ip_hash text,
  user_agent text,
  admin_note text,
  read_at timestamptz,
  read_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  -- Veri saklama politikası: bu tarihten sonra silinebilir.
  purge_after date
);

create index contact_messages_status_idx on contact_messages (status, created_at desc);

-- ---------------------------------------------------------------------------
-- Sayfa içerikleri ve site ayarları
-- ---------------------------------------------------------------------------

-- KURAL: taslak ve yayımlanmış içerik ayrı sütunlarda durur; yayımlanmamış
-- değişiklik ziyaretçiye sızmaz.
create table page_content (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  section_key text not null,
  draft_content jsonb not null default '{}'::jsonb,
  published_content jsonb,
  -- Siyasi görev, tarih ve biyografi metinleri için doğrulama takibi.
  requires_verification boolean not null default false,
  verified_at timestamptz,
  verified_by uuid references auth.users (id) on delete set null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  unique (page_key, section_key)
);

create table site_settings (
  key text primary key,
  value jsonb not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- İşlem geçmişi
-- ---------------------------------------------------------------------------

create table audit_logs (
  id bigserial primary key,
  actor_id uuid references auth.users (id) on delete set null,
  actor_name text,
  action text not null,
  entity_type text not null,
  entity_id text,
  changes jsonb,
  created_at timestamptz not null default now()
);

create index audit_logs_created_at_idx on audit_logs (created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at otomatiği
-- ---------------------------------------------------------------------------

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger activities_touch before update on activities
  for each row execute function touch_updated_at();
create trigger photo_albums_touch before update on photo_albums
  for each row execute function touch_updated_at();
create trigger videos_touch before update on videos
  for each row execute function touch_updated_at();
create trigger page_content_touch before update on page_content
  for each row execute function touch_updated_at();

-- ===========================================================================
-- Row Level Security
--
-- Kural: RLS her tabloda AÇIK. Yetki arayüzde değil burada belirlenir.
-- Ziyaretçi (anon) yalnızca yayımlanmış içeriği okur.
-- ===========================================================================

alter table admin_profiles   enable row level security;
alter table media_library    enable row level security;
alter table activities       enable row level security;
alter table activity_gallery enable row level security;
alter table activity_sources enable row level security;
alter table photo_albums     enable row level security;
alter table photos           enable row level security;
alter table videos           enable row level security;
alter table contact_messages enable row level security;
alter table page_content     enable row level security;
alter table site_settings    enable row level security;
alter table audit_logs       enable row level security;

-- --- Yönetici profilleri ---------------------------------------------------
create policy "Kullanici kendi profilini gorur"
  on admin_profiles for select using (id = auth.uid() or is_yonetici());
create policy "Profilleri yalnizca yonetici yonetir"
  on admin_profiles for all using (is_yonetici()) with check (is_yonetici());

-- --- Ziyaretçiye açık okuma (yalnızca yayımlanmış) --------------------------
create policy "Yayimlanmis faaliyetler herkese acik"
  on activities for select using (
    is_admin()
    or (status = 'published'
        and (event_date is not null or event_date_approx is not null))
  );
create policy "Yayimlanmis albumler herkese acik"
  on photo_albums for select using (status = 'published' or is_admin());
create policy "Album fotograflari herkese acik"
  on photos for select using (
    is_admin() or exists (
      select 1 from photo_albums a
      where a.id = photos.album_id and a.status = 'published'
    )
  );
create policy "Yayimlanmis videolar herkese acik"
  on videos for select using (
    is_admin()
    or (status = 'published' and published_at is not null and published_at <= now())
  );
create policy "Faaliyet galerisi herkese acik"
  on activity_gallery for select using (
    is_admin() or exists (
      select 1 from activities a
      where a.id = activity_gallery.activity_id and a.status = 'published'
    )
  );
create policy "Faaliyet kaynaklari herkese acik"
  on activity_sources for select using (
    is_admin() or exists (
      select 1 from activities a
      where a.id = activity_sources.activity_id and a.status = 'published'
    )
  );
create policy "Medya herkese acik okunur"
  on media_library for select using (true);
create policy "Yayimlanmis sayfa icerigi herkese acik"
  on page_content for select using (published_content is not null or is_admin());
create policy "Site ayarlari herkese acik okunur"
  on site_settings for select using (true);

-- --- İçerik yazma: editör hazırlar, yayımlama ayrı yetki -------------------
create policy "Adminler faaliyet olusturur"
  on activities for insert with check (is_admin() and (status <> 'published' or can_publish()));
create policy "Adminler faaliyet gunceller"
  on activities for update using (is_admin())
  with check (is_admin() and (status <> 'published' or can_publish()));
create policy "Faaliyeti yalnizca yonetici siler"
  on activities for delete using (is_yonetici());

create policy "Adminler album olusturur"
  on photo_albums for insert with check (is_admin() and (status <> 'published' or can_publish()));
create policy "Adminler album gunceller"
  on photo_albums for update using (is_admin())
  with check (is_admin() and (status <> 'published' or can_publish()));
create policy "Albumu yalnizca yonetici siler"
  on photo_albums for delete using (is_yonetici());

create policy "Adminler video olusturur"
  on videos for insert with check (is_admin() and (status <> 'published' or can_publish()));
create policy "Adminler video gunceller"
  on videos for update using (is_admin())
  with check (is_admin() and (status <> 'published' or can_publish()));
create policy "Videoyu yalnizca yonetici siler"
  on videos for delete using (is_yonetici());

create policy "Adminler fotograf yazar"
  on photos for all using (is_admin()) with check (is_admin());
create policy "Adminler galeri yazar"
  on activity_gallery for all using (is_admin()) with check (is_admin());
create policy "Adminler kaynak yazar"
  on activity_sources for all using (is_admin()) with check (is_admin());
create policy "Adminler medya yukler"
  on media_library for insert with check (is_admin());
create policy "Adminler medya gunceller"
  on media_library for update using (is_admin()) with check (is_admin());
create policy "Medyayi yalnizca yonetici siler"
  on media_library for delete using (is_yonetici());

create policy "Sayfa icerigini adminler duzenler"
  on page_content for all using (is_admin()) with check (is_admin());
create policy "Site ayarlarini yalnizca yonetici degistirir"
  on site_settings for all using (is_yonetici()) with check (is_yonetici());

-- --- Gelen mesajlar --------------------------------------------------------
-- Ziyaretçi mesaj BIRAKABILIR ama hiçbir mesajı OKUYAMAZ.
create policy "Herkes mesaj birakabilir"
  on contact_messages for insert with check (true);
create policy "Mesajlari yalnizca yonetici okur"
  on contact_messages for select using (is_yonetici());
create policy "Mesajlari yalnizca yonetici gunceller"
  on contact_messages for update using (is_yonetici()) with check (is_yonetici());
create policy "Mesajlari yalnizca yonetici siler"
  on contact_messages for delete using (is_yonetici());

-- --- İşlem geçmişi ---------------------------------------------------------
-- Kayıtlar yalnızca sunucu tarafında (service role) yazılır; kimse silemez.
create policy "Islem gecmisini adminler okur"
  on audit_logs for select using (is_admin());

-- ===========================================================================
-- DEPOLAMA (Storage)
--
-- 'medya' bucket'ı ve kuralları. Bunlar sayesinde Supabase panelinde elle
-- politika oluşturmanıza gerek kalmaz.
-- ===========================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'medya', 'medya', true, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
on conflict (id) do nothing;

-- Yayımlanan görseller zaten herkese açık; okuma serbest.
create policy "Medya dosyalari herkese acik okunur"
  on storage.objects for select
  using (bucket_id = 'medya');

-- Yükleme, değiştirme ve silme yalnızca panele tanımlı kullanıcılara açık.
create policy "Medyayi yalnizca adminler yukler"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'medya' and public.is_admin());

create policy "Medyayi yalnizca adminler gunceller"
  on storage.objects for update to authenticated
  using (bucket_id = 'medya' and public.is_admin())
  with check (bucket_id = 'medya' and public.is_admin());

create policy "Medyayi yalnizca yonetici siler"
  on storage.objects for delete to authenticated
  using (bucket_id = 'medya' and public.is_yonetici());

-- ===========================================================================
-- DATA API İZİNLERİ
--
-- Supabase'de bir tablonun API'den erişilebilmesi için hem RLS'i geçmesi
-- HEM DE rol izninin bulunması gerekir. Proje kurulumunda "Automatically
-- expose new tables" kapatılmışsa bu izinler otomatik verilmez.
--
-- Aşağıda izinler AÇIKÇA tanımlanır; böylece o seçenek açık da olsa kapalı
-- da olsa şema doğru çalışır ve hiçbir tablo yanlışlıkla fazla yetki almaz.
-- ===========================================================================

grant usage on schema public to anon, authenticated;

-- --- Ziyaretçi (anon): yalnızca okuma ---------------------------------------
-- Hangi satırları görebileceğini RLS politikaları belirler.
grant select on
  activities,
  activity_gallery,
  activity_sources,
  photo_albums,
  photos,
  videos,
  media_library,
  page_content,
  site_settings
to anon;

-- Ziyaretçi mesaj BIRAKABILIR ama okuyamaz; status/admin_note gibi alanları
-- da dolduramaz.
grant insert (sender_name, sender_email, message, ip_hash, user_agent)
  on contact_messages to anon;

-- --- Oturum açmış kullanıcı (authenticated) ---------------------------------
-- Yetkiyi RLS politikaları belirler: admin_profiles kaydı olmayan biri
-- oturum açsa bile hiçbir satıra erişemez.
grant select, insert, update, delete on
  activities,
  activity_gallery,
  activity_sources,
  photo_albums,
  photos,
  videos,
  media_library,
  page_content,
  site_settings,
  contact_messages,
  admin_profiles
to authenticated;

-- İşlem geçmişi yalnızca okunur; yazma service role ile yapılır.
grant select on audit_logs to authenticated;
grant usage on sequence audit_logs_id_seq to authenticated;

-- --- Sunucu tarafı (service_role) -------------------------------------------
-- RLS'i atlar, ancak tablo düzeyinde GRANT olmadan hiçbir sorgu çalışmaz.
-- "Automatically expose new tables" kapalıysa bu izinler otomatik verilmez.
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;

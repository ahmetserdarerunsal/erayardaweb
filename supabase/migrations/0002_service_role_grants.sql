-- ===========================================================================
-- DÜZELTME: service_role izinleri
--
-- 0001'de anon ve authenticated rollerine izin verildi ama service_role
-- atlandı. Proje "Automatically expose new tables" kapalı kurulduğu için
-- Supabase bu izinleri otomatik vermiyor; sonuç olarak sunucu tarafındaki
-- yönetim işlemleri (işlem geçmişi yazma, mesaj okuma) çalışmıyordu.
--
-- service_role RLS'i zaten atlar, ancak tablo düzeyinde GRANT olmadan
-- hiçbir sorgu çalışmaz.
-- ===========================================================================

grant usage on schema public to service_role;

grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- Sonradan eklenecek tablolar da otomatik erişilebilir olsun.
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;

-- Kurulum sırasında oluşturulan test mesajını temizle.
delete from contact_messages where sender_name = 'KURULUM TESTI';

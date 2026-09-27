# Medya taşıma ve yönetim paneli hazırlık raporu

## Mevcut içerik incelemesi

- `src/data/media.ts` ve `src/data/press.ts` içinde taşınabilecek yayımlanmış kayıt bulunmadı.
- `/basin` ve `/medya` sayfaları yalnızca yer tutucu metinlerden oluşuyordu.
- `/basin-medya`, boş `pressEntries` ve `mediaEntries` dizilerini birleştiriyordu; doğrulanmış yazı, röportaj, fotoğraf veya video kaybı yoktur.
- Belirsiz eski veri silinmedi. Eski sayfa ve uyumluluk tipleri kaynakta korunurken istekler kalıcı yönlendirmelerle yeni adreslere aktarıldı.

## Yönlendirme kararları

- `/basin` ve alt yolları: yazılı kamusal içerik için en yakın mevcut sistem olan `/faaliyetler`.
- `/medya`, `/basin-medya` ve alt yolları: yeni görsel arşiv girişi olan `/fotograflar`.
- Gelecekte eski bir URL'nin video olduğu kesinleşirse o tekil yol `/videolar` altındaki karşılığına özel olarak yönlendirilmelidir.

## Yazılı içerik için taşıma kuralı

Yeni bir açıklama veya röportaj bulunduğunda otomatik olarak faaliyet sayılmamalıdır. Tarihi, kaynağı ve Ekrem Eray Arda ile ilişkisi doğrulandıktan sonra `Activity` modelinin `sources`, `publicationStatus` ve tarih alanları kullanılmalı; doğrulanamayan kayıt taslak kalmalıdır.

## Sonraki aşama: admin/API sınırı

Gerçek yönetim panelinde aşağıdaki sunucu tarafı işlemler ayrı yetkili endpoint veya Server Action'larda kurulmalıdır:

1. Video bağlantısını `analyzeVideoUrl` ile doğrulama ve platform/kimlik tespiti.
2. Yalnızca resmî API veya oEmbed uç noktalarıyla metadata önizlemesi; kimlik bilgilerini tarayıcıya göndermeme.
3. Gömme iznini gerçek site alan adında önizleyip `embedStatus` alanına kaydetme.
4. Özel kapakları ve fotoğrafları belirlenmiş depolama hizmetine yükleme; boyut, MIME, kota, zararlı dosya ve kullanım hakkı kontrolleri.
5. Taslak, ileri tarihli yayın, yayından kaldırma, arşivleme ve silme işlemleri için yetkilendirme ve denetim kaydı.
6. Albüm fotoğrafları ve videolar için atomik sıralama güncellemesi.

Kimlik doğrulama, veritabanı ve dosya depolama hizmeti henüz belirlenmediğinden bu aşamada sahte API veya çalışıyormuş gibi görünen admin ekranı eklenmedi.

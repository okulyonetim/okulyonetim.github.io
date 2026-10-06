# Koruk Asistan — Rol / Modül / Sayfa / İşlem Matrisi

Bu belge, mevcut `PermissionService` ve `oy_roller/{rolId}.yetkiler` modelinin yenilenmesinde kullanılacak çalışma matrisidir. Firestore yapısı ve mevcut permission anahtarları korunur; yeni ayrıntılar mevcut anahtarların üzerine değil, merkezi katalogda tanımlanır.

## Yetki seviyeleri

| Seviye | Anlamı |
|---|---|
| `hidden` | Menüde ve sayfada gizli; işlem yok |
| `preview` | Modül/sayfa önizleme düzeyi; veri değiştirme yok |
| `read` | Görüntüleme / salt okunur |
| `edit` | Görüntüleme + düzenleme / yazma |

Legacy `gizle`, `goruntule`, `duzenle` değerleri geriye dönük uyumluluk için korunur.

## Modül matrisi

### Ana Sayfa
- `module.dashboard`
- Karşılama
- Okul özeti
- Yaklaşanlar
- Duyurular
- Bugünün nöbeti

### Kadrolar
- `module.people`
- `people.teachers` — Öğretmenler
- `people.classes` — Sınıflar
- `people.students` — Öğrenciler
- `people.students.edit` — Öğrenci düzenleme
- `people.attendance.edit` — Yoklama düzenleme

### Akademik
- `module.academic`
- `academic.exams` — Sınavlar
- `academic.exams.edit` — Sınav düzenleme
- `academic.plans` — Yıllık planlar
- `academic.schedule` — Ders Programı
- `academic.schedule.edit` — Ders Programı düzenleme

### Yönetim
- `module.management`
- `management.duty` — Nöbet
- `management.duty.edit` — Nöbet düzenleme
- `management.personnel` — Personel
- Aylık İşler
- Öğretmen izinleri
- Puantaj / imza sirküsü
- Dilekçe / izinler
- Toplantı çizelgesi

### İletişim
- `module.communication`
- `communication.messages` — Mesajlaşma
- `communication.messages.send` — Mesaj gönderme
- `communication.announcements` — Duyurular
- `communication.polls` — Anketler
- `communication.polls.edit` — Anket yönetimi
- `communication.news` — Haberler
- `communication.news.edit` — Haber yönetimi
- `communication.calendar` — Takvim
- `communication.calendar.edit` — Takvim düzenleme
- `communication.notes` — Notlar
- `communication.notes.edit` — Not düzenleme

### Taşıma
- `module.transport`
- `transport.services` — Servisler
- `transport.services.edit` — Servis düzenleme
- `transport.seating` — Servis oturma planı
- `transport.seating.edit` — Servis oturma planı düzenleme
- `transport.classSeating` — Sınıf oturma planı
- `transport.classSeating.edit` — Sınıf oturma planı düzenleme
- `transport.report.inspection` — Yemek/servis denetim formu
- `transport.report.monthly` — Aylık takip
- Harita

### Yemek
- Günlük menü
- Haftalık menü
- Aylık menü
- Yemek denetim formu

### Dokümanlar
- `module.documents`
- `documents.view` — Doküman görüntüleme
- `documents.edit` — Doküman düzenleme
- Evrak Takibi
- PDF işlemleri
- Aylık İşler
- Akademik Takvim

### Raporlar
- Genel okul raporları
- Öğrenci raporları
- Öğretmen raporları
- Sınıf raporları
- Özel raporlar
- PDF / Excel dışa aktarma
- Rapor sütun özelleştirme

### Araçlar
- `module.tools`
- `tools.checklists` — Kontrol Listeleri
- `tools.map` — Harita
- `tools.schedules` — Çizelgeler
- `tools.attendance` — Devamsızlık
- `tools.gradebook` — Ödev / Not
- Yıllık planlar ve BEP
- Maarif Model
- ŞÖK
- Zümre
- Sosyal Kulüpler
- Rehberlik
- Belirli Gün ve Haftalar
- Diğer Evraklar

### Ayarlar
- `module.settings`
- `settings.school` — Okul Bilgileri
- `settings.school.edit` — Okul bilgileri düzenleme
- `settings.users` — Kullanıcı Yönetimi
- `settings.roles` — Rol Yönetimi
- `settings.roles.edit` — Rol düzenleme
- `settings.app` — Uygulama Düzeni
- `settings.app.edit` — Uygulama düzenleme
- Kullanıcı istatistikleri
- Yedekleme / geri yükleme
- Depolama
- Hatırlatıcı ayarları

## Rol modeli

Her rol kendi `yetkiler` nesnesine sahip olur:

```text
oy_roller/{rolId}
  ad
  aciklama
  yetkiler
    module.people: read
    people.teachers: edit
    people.students: read
    people.students.edit: hidden
    ...
```

Kullanıcı yalnızca `rolId` ile role bağlanır. Kullanıcı bazında ikinci bir permission sistemi oluşturulmaz.

## Özel roller

Rol yönetimi şu işlemleri destekleyecek:
- yeni rol oluşturma
- rol adını/açıklamasını değiştirme
- tüm katalogdaki yetkileri tek tek seçme
- modülün tamamını toplu seçme
- tümünü aç / tümünü kapat
- rolü kopyalama
- varsayılan rol şablonundan oluşturma
- rol silme; atanmış kullanıcı varsa silmeme

## Güvenlik sınırı

- Süper Yönetici `admin === true` ile üst sınırdır.
- Normal yönetici rol/yetki ekranını yalnız `settings.roles.edit` verildiyse kullanabilir.
- Kullanıcı yönetimi ile rol yönetimi ayrı permission'lardır.
- Firestore rules değiştirilmez.
- `oy_roller` ve `oy_kullanicilar` mevcut koleksiyonları korunur.
- Menü görünürlüğü, sayfa erişimi ve mutation kontrolleri aynı permission kararını kullanmalıdır.

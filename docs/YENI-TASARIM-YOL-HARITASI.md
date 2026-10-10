# Yeni Tasarım (V3) — Yol Haritası

## Kurallar
1. **Üretim dokunulmaz.** `index.html`, `service-worker.js` ve mevcut modüller değişmez. V3 yalnız `beta.html` ve `design-lab.html` ile yüklenir.
2. **Tek merkez:** tüm renk/yuvarlaklık/gölge/yazı tipi/hareket değerleri `css/v3/tokens.css` içindedir. Diğer v3 dosyaları renk kodu yazmaz (test denetler).
3. **Mantık değişmez.** V3 katmanı veri/Firebase/AppStore'a yazmaz; kapatma: `?skin=off` veya `localStorage['ka-skin']='off'`.
4. **Raporlama tek merkez:** A4 çıktı stilleri `css/v3/report.css` + `--ka-report-*` tokenları (Aşama R).
5. **Geri tuşu tek merkez:** pencere/panel kapatma `js/v3/nav.js` üzerinden yürür; `.ka-modal-backdrop`/`.ka-sheet-backdrop` sınıfı taşıyan her pencere otomatik geri-yığınına girer, modülde ek kod gerekmez.

## Dosya yapısı
| Dosya | Görev |
|---|---|
| `css/v3/tokens.css` | Tek kaynak: açık/koyu tema, sahne paleti, rapor tokenları |
| `css/v3/components.css` | Modül bazlı bileşen stilleri (aşama aşama dolar) |
| `css/v3/home.css` | Ana sayfa: hero sahnesi, bannerlar, özet kartları |
| `css/v3/scenes.css` | Animasyonlu illüstrasyonlar (renk istisnası: sanat) |
| `css/v3/report.css` | Rapor merkezi (Aşama R) |
| `js/v3/scene-skin.js` | Sahne motoru (SchoolLiveStatus okur, DOM'a sahne ekler) |
| `js/v3/theme.js` | Tema motoru (tek kontrol noktası: mod/vurgu/yoğunluk/yazı) |
| `js/v3/nav.js` | Merkezi geri yığını (geri tuşu/Esc/kendi kapatma hep aynı davranır) |
| `beta.html` | Gerçek uygulama + V3 (gerçek veriyle test) |
| `design-lab.html` | Girişsiz test laboratuvarı: Mevcut/V3 yan yana, açık/koyu, mod/hava/saat |
| `tests/design-v3-contract.test.js` | İzolasyon + token + renk disiplini + saf-görsel sözleşmesi |

## Test yöntemi (her aşama için)
1. `design-lab.html?split=1` ile Mevcut | V3 yan yana; açık + koyu; dar ekran (390px).
2. `beta.html` ile gerçek veride ilgili ekranın elle kontrolü (rol: yönetici + öğretmen).
3. `node scripts/run-client-tests.mjs` — yeni başarısız test olmamalı. (Depo ilk durumda 89 başarısız test içeriyor; bunlar ayrıca ele alınmalı.)
4. Kabul: işlev kontrol listesi (kaydet/sil/ara/filtre/yazdır) mevcut sürümle aynı sonuç vermeli.

## Aşamalar
| Aşama | Kapsam | Çıktı |
|---|---|---|
| 0 | Temel: token merkezi, tema motoru, **merkezi geri yığını (nav.js)**, beta, lab, sözleşme testi | ✔ |
| 1 | Ana Sayfa: tüm bölümler, bildirim/profil panelleri | home.css |
| 2 | Öğrenciler (liste, detay, yoklama) | components.css §2 |
| 3 | Öğretmenler (liste, detay, belgeler) | §3 |
| 4 | Nöbetler (haftalık program, rapor) | §4 |
| 5 | Personel İşleri (puantaj, imza sirküsü, maaş) | §5 |
| 6 | Çizelgeler (ders programı, sınıf, servis) | §6 |
| R | Rapor merkezi: dağınık `<style>/@page` bloklarını `report.css`'e toplama | report.css |
| 7+ | Kalan modüller → beta'dan üretime geçiş (rol bazlı açma) | — |

## Rapor denetimi (mevcut durum)
`--ka-report-*` tokenları zaten var (taban CSS'te 83 kullanım; management.js 34, transport.js 57). Ancak şu dosyalar kendi `<style>/@page` ve sabit renklerini taşıyor — Aşama R'de merkezileştirilecek:

| Dosya | @page | <style> | sabit renk |
|---|---|---|---|
| js/core/schedule-report-redesign.js | 0 | 1 | 31 |
| js/modules/report-engine.js | 1 | 1 | 20 |
| js/core/report-customizer.js | 0 | 0 | 25 |
| js/modules/food-menu.js | 1 | 3 | 9 |
| js/modules/management.js | 1 | 2 | 7 |
| js/core/report-output.js | 1 | 1 | 3 |
| js/modules/reports.js | 0 | 1 | 5 |
| js/modules/transport.js | 0 | 3 | 0 (token kullanıyor) |

Öneri: tek `ReportTheme` (başlık, logo, yazı tipi, tablo, imza alanı) → `report-output.js` ortak çıkış noktası olarak kullanılır; modüller yalnız içerik üretir.

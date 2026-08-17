# Optik Okuma Modülü — v36-galeriSessizHataDuzeltme
**Tarih:** Ağustos 2026

## v36 — Galeriden okuma sessiz kalma hatası
- `formuOkuVeGoster()` artık UI dönüşü yerine ham OMR sonuç nesnesini döndürür.
- Galeri akışı `basarili`, `uyarilar`, `kontrolGerekli` alanlarını gerçekten görebilir.
- Başarısız otomatik okuma görünür hata/uyarı kutusunda nedenini gösterir.
- Otomatik okuma başarısızsa önce sayfa köşeleri CV ile bulunur ve otomatik yeniden deneme yapılır.
- Bu da başarısızsa elle köşe seçimine geçilir.
- Hiçbir aşamada sessiz `return` bırakılmadı; kullanıcıya sonuç veya hata gösterilir.
- Galeri CV köşe tespiti aktif formun en-boy oranını kullanır.
- Cache: `app.js?v=36`, `omrEngine.js?v=36`.

# Optik Okuma Modülü — v35-hareketliOtomatikKose
**Tarih:** Ağustos 2026

## v35 — Canlı otomatik hareketli köşe bulucu
- Kamera ekranındaki 4 sabit yeşil hedef/kutucuk kaldırıldı.
- Her analiz karesinde `sayfaKoseleriniAraCV()` tüm görüntüde gerçek kağıt dış dörtgenini arar.
- Bulunan köşeler video üzerindeki gerçek konumlarına dönüştürülür ve kağıt hareket ettikçe birlikte hareket eder.
- EMA tabanlı yumuşatma ile köşe işaretlerinin titremesi azaltıldı.
- Ortalama köşe hareketi 14 px altında 3 ardışık tur kalırsa hizalama kararlı kabul edilir.
- Canlı tarama modunda kararlı gerçek dörtgen bulunduğunda otomatik okuma tetiklenir.
- Manuel `Köşe Seç` yedek akış olarak korunur.
- Aktif formun en-boy oranı sayfa tespitine verilir; kapı/dolap gibi yanlış büyük dörtgenlerin kabul edilme olasılığı azaltılır.
- Sabit `_beklenenKoseKonumlariHesapla`/`kutucukDoluMu` mantığı canlı tespit kararından çıkarıldı.
- Cache: `app.js?v=35`, `omrEngine.js?v=35`.

# Optik Okuma Modülü — v34-yatayLgsGaleriUyumluluk
**Tarih:** Ağustos 2026

## v34 — Galeriden eski yatay LGS formu
- Galeride yatay A4 LGS görüntüsü otomatik algılanır.
- Yeni/dikey LGS şablonu değiştirilmeden eski yatay LGS için ayrı koordinat modeli eklendi.
- 6 nirengi karesi, 90 soru, 3 haneli öğrenci no ve A/B kitapçık alanı desteklenir.
- Tekli, toplu ve elle-köşeli galeri okumaları aynı yatay şablon seçimini kullanır.
- Kamera akışı etkilenmez; uyumluluk yalnız `galeri:true` okumalarında devrededir.
- Cache: `omrEngine.js?v=34`, `app.js?v=34`.

# Optik Okuma Modülü — v33-performans
**Tarih:** Ağustos 2026

## v33 — Performans Optimizasyonu
- Canonical homografi warp döngüsü allocation-free ve satır bazlı artımlı projektif hesaplamaya geçirildi.
- Her pikselde `noktayiDonustur()` + geçici renk dizisi üretme kaldırıldı.
- Baloncuk yerel araması kaba→ince (coarse-to-fine) hale getirildi.
- Nihai ince çözünürlük korunurken tipik ROI ölçüm sayısı yaklaşık 3–4 kat azaltıldı.
- `duzCanvasUret()` dönüşüne teşhis amaçlı `warpMs` süresi eklendi.
- Okuma/kalite eşikleri ve v30–v32 karar mantığı değiştirilmedi.
- Cache sürümü `omrEngine.js?v=33`.

# Optik Okuma Modülü — v32-formKaliteMotoru
**Tarih:** Ağustos 2026

## v32 — Form Kalite Karar Motoru
- Hizalama, birleşik bubble güveni, öğrenci no güveni, düşük güvenli soru oranı,
  çoklu işaret ve görüntü uyarıları tek 0–100 kalite skorunda birleştirildi.
- 85–100: Güvenli → otomatik kayıt.
- 65–84: Kontrol → sonuç gösterilir, otomatik kayıt yapılmaz.
- 0–64: Yeniden Tara → sonuç başarısız sayılır ve kayıt yapılmaz.
- Hizalama < %65 veya düşük güvenli soru oranı > %25 ise sert yeniden-tarama kapısı.
- Öğrenci numarası belirsizse yanlış öğrenciye otomatik bağlama engellenir.
- `formKalite`, `otomatikKaydet`, `kontrolGerekli` alanları eklenir.
- Sonuç durum mesajında kalite puanı gösterilir.
- Cache sürümü `omrEngine.js?v=32`.

---

# Optik Okuma Modülü — v31-birlesikBubbleGuven
**Tarih:** Ağustos 2026

## v31 — Birleşik Bubble Güven Skoru
- Native `liboptikokuyucu.so` analizindeki iki-geçişli satır normalizasyonu karar mekanizmasına bağlandı.
- Her soru için dört sinyal birleştiriliyor: mutlak koyuluk, en iyi/ikinci farkı, göreli satır ayrışması ve yerel kontrast.
- Yeni `birlesikGuven` (0..1), `guvenBilesenleri` ve `kontrolOnerilir` alanları eklendi.
- Eski `guven` alanı geriye dönük uyumluluk için korunuyor ve mutlak doluluk oranını göstermeye devam ediyor.
- Birleşik güven < 0.38 ise tek eşik geçti diye cevap kesinleştirilmiyor; `dusukGuven` olarak belirsiz bırakılıyor.
- `bubbleKalite` özeti: ortalama birleşik güven + kontrol önerilen soru sayısı.
- Sonuç ekranında artık mutlak doluluk ve birleşik güven birlikte gösteriliyor.
- Cache-busting sürümü `omrEngine.js?v=31`.

---

# Optik Okuma Modülü — v30-6noktaGeometri
**Tarih:** Ağustos 2026

## 6 Nokta Geometrik Doğrulama
- 4 köşe markerından tam projektif homografi kuruluyor.
- Sol-orta ve sağ-orta markerlar homografiyi kurmak için değil, bağımsız doğrulama kanıtı olarak kullanılıyor.
- Orta markerların beklenen projektif konuma artığı ve kenar doğrusuna sapması mm cinsinden ölçülüyor.
- `hizalamaGuveni` (0..1), `hizalamaDurumu` (`guvenli`/`kontrol`/`red`) ve ayrıntılı geometri teşhisi üretiliyor.
- `<0.65` güven: cevap okumaya geçmeden reddedilir. `0.65–0.85`: okunur fakat otomatik kaydedilmez. `>=0.85`: güvenli kabul edilir.
- Kritik hata düzeltmesi: `homografiHesapla()` tam 4 nokta beklediği halde eski akış 6 marker bulunduğunda 6 noktayı gönderebiliyordu. Artık H yalnızca 4 köşeden kuruluyor; 5. ve 6. marker doğrulama içindir.
- `formOkuyucu.js` orta güvenli sonuçları `omrSonucHazir` olayıyla otomatik kaydetmiyor.
- `optik/index.html` cache sürümü `omrEngine.js?v=30` olarak güncellendi.

---

# Optik Okuma Modülü — v23-siyahBeyaz6Nokta
**Tarih:** Ağustos 2026

## Değiştirilen Dosyalar

### omrEngine.js (v23-siyahBeyaz6Nokta)
- `adaptifEsikle`: OpenCV.js adaptiveThreshold + Otsu fallback (Test Plus yaklaşımı)
- `baloncukDolulukBinary`: countNonZero piksel sayımı
- `homografiElleKoselerdenHesapla`: kaynak nokta hizalama merkezi → sayfa köşeleri
- `_ortaKareleriAra`: sol-orta ve sağ-orta hizalama karelerini ara
- `formuOtomatikDuzlestir`: 6 noktalı homografi desteği (≥4 nokta)
- `_binaryImageData` her okumada sıfırlanıyor
- Köşe seçim UI kaldırıldı (camera.js)

### layoutEngine.js
- `STANDART_BALONCUK_CAP`: 2.75mm → 4.0mm
- `hizalamaIsaretleriEkle`: sol-orta + sağ-orta kareler eklendi (6 nokta)

### pdfFormGenerator.js
- `ANA_RENK`: [194,24,91] bordo → [0,0,0] siyah
- `ACIK_RENK`: açık pembe → açık gri [220,220,220]
- `ZEBRA_ACIK`: çok açık pembe → çok açık gri [240,240,240]

### galeriSecici.js
- `cvHazirBekle` import ve çağrısı eklendi
- Köşe seçim UI hâlâ mevcut (tek dosya galeri için)

### camera.js
- `_canliOtomatikOku`: CV köşelerini kullanır, QR yok
- `capturePhoto`: köşe seçim UI kaldırıldı, CV köşeleri otomatik

## Önemli Notlar
- Yeni form (4mm baloncuk, 6 nokta) eski formlarla uyumsuz
- Siyah beyaz baskı için tasarlandı
- adaptiveThreshold için OpenCV.js gerekli (cvHazirBekle bekler)

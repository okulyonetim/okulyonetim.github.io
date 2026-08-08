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

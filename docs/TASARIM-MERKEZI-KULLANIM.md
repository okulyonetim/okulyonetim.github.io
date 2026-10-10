# Merkezi Tasarım ve Tema — Kullanım Kuralları (V3)

## Tek kontrol noktaları
| Ne | Nerede | Nasıl değişir |
|---|---|---|
| Tüm renk/ölçü/gölge/yuvarlaklık | `css/v3/tokens.css` | Yalnız bu dosya |
| Vurgu rengi | `--v3-accent` | `KorukTheme.set({accent:'mavi'})` — hover, yumuşak ton, odak, modül rozetleri otomatik türer |
| Açık/Koyu/Otomatik | `js/v3/theme.js` | `KorukTheme.set({mode:'dark'})` |
| Yoğunluk, yazı boyu | `--v3-density`, `--v3-font` | `KorukTheme.set({density:'compact', font:1.12})` |
| Düğme/pencere/kart cilası | `css/v3/components.css` | Yalnız token kullanır |
| Geri tuşu / Esc / pencere kapatma | `js/v3/nav.js` | Otomatik: `.ka-modal-backdrop`/`.ka-sheet-backdrop` sınıfı yeter, modülde ek kod yok |
| Test ve karşılaştırma | `design-lab.html` | Mevcut/V3, açık/koyu, kontrast denetimi |

## Modül yazarken kurallar
1. Renk kodu (`#xxxxxx`, `rgb()`) yazma; `var(--ka-*)` kullan.
2. Kendi `<style>` bloğu ekleme; ortak bileşen sınıflarını kullan (`ka-btn`, `ka-card`, `ka-field`, `ka-modal`, `ka-list-card`, `ka-badge`, `ka-table`, `ka-empty`).
3. Yeni bir görünüm gerekiyorsa önce `components.css`'e ortak bileşen olarak eklenir, modüle değil.
4. Tema kontrolü yalnız `KorukTheme` ile; modül `data-theme` yazmaz.
5. Her değişiklik: `node tests/design-v3-contract.test.js` ve `node scripts/audit-design-leaks.mjs` (rapor azalmalı).

## Not
Test ortamında mevcut tasarımda Sil ve Hayalet düğmeleri birincil renkte görünüyordu (43 + 34 kullanım); V3 bunu merkezde düzeltir.
Bu sürüm yalnız beta.html ve design-lab.html'de etkindir; index.html (üretim) değişmedi.

## Geri tuşu sorunu (çözüldü — Aşama 0)
Üretimde her modül kendi pencere/paneli için ayrı geri-tuşu/Esc davranışı yazıyordu — "her sayfa farklı bir yama" şikayetinin asıl kaynağı buydu.
`js/v3/nav.js` artık bunu tek yerden çözer: bir pencere açıldığında (`.ka-modal-backdrop` veya `.ka-sheet-backdrop` sınıfıyla DOM'a eklendiğinde) otomatik olarak geri-yığınına girer;
tarayıcı/telefon geri tuşu, `Esc` tuşu ve `KorukNav.back()` her zaman en üstteki pencereyi kapatır. Modül kendi X düğmesiyle kapatırsa yığın ve tarayıcı geçmişi otomatik eşitlenir.
Hiçbir modülde kod değişikliği gerekmez — yalnız bu iki ortak sınıfı kullanan pencereler kapsanır. Playwright davranış testi: `python3 scripts/design-lab-check.py`.

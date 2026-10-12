# Koruk Asistan Tasarım Sistemi

Uygulamanın görsel ayarlarının **tek kaynağı**, `css/design-system-base.css` dosyasının en üstündeki **TEMA MERKEZİ** bloğudur
(`css/design-system.css` yalnızca bu dosyayı içe aktaran giriş noktasıdır). Renk, yüzey, metin, gölge, bulanıklık, köşe yuvarlaklığı,
çizgi kalınlığı, yazı tipi/boyutu/kalınlığı, boşluk (yoğunluk), hareket süreleri ve ikon boyutları yalnızca orada tanımlanır;
başka hiçbir yerde `html`/`:root` düzeyinde değişken tanımlanmaz ve bileşen kurallarında sabit değer bulunmaz.

Cam görünüm (glassmorphism) bu blokla yönetilir: `--gl-*` (cam yüzey/metin/kenar/gölge/blur), `--hd-*` (üst başlık), `--pp-*` (açılır pencere),
`--ka-*` (uygulama genelindeki anlamsal renkler) ve ana sayfa/menü/kabuk/sayfa bileşenleri bu değişkenleri kullanır.

## Nereden değişiklik yapılır?

`css/design-system-base.css` dosyasının başındaki **TEMA MERKEZİ** bloğunu düzenleyin. Blok üç parçadır:

1. `:root` (ortak) — ölçüler, yazı tipleri, **MARKA PALETİ**, **KATEGORİ PALETİ** ve palete bağlı türev (`var()`) tanımlar. İki temada aynı olanlar burada durur.
2. `:root` (açık palet) — yalnızca açık temada farklı olan değerler.
3. `html[data-theme="dark"]` (koyu palet) — aynı değişkenlerin koyu karşılıkları; açık palet ile aynı sırada tutulur.

### Hızlı tarif

| İstek | Değiştirilecek yer |
|---|---|
| Marka sarısını başka renk yap | **MARKA PALETİ** bölümü: `--t-accent-rgb` (ana renk) + aynı bölümdeki türevler `--t-accent-deep`, `--t-accent-bright`, `--t-on-accent`, `--t-gold-hi-rgb`, `--t-gold-lo-rgb`, `--t-gold-hover-hi-rgb`, `--t-gold-hover-lo-rgb`, `--t-on-accent-ink`, `--t-accent-dim`; açık palette `--t-tint-rgb`, `--t-accent-text`, `--t-accent-mid`, `--t-accent-ink`, `--t-accent-strong`; koyu palette aynı adlar + `--t-accent-shade`. Hepsi `TEMA MERKEZİ` içinde, yan yana. `--t-gold-*` aynı zamanda sarı düğmelerin cam rengidir. |
| **Sarı ana eylem düğmeleri** (+ Öğretmen, Şimdi Senkronize Et, Yeni Plan Tanımı, ↑ düğmesi, alt menü düğmesi …) — cam, bulanıklık, kenar, yazı rengi, gölge, hover/basılı/pasif/odak | **BİRİNCİL DÜĞME (ALTIN CAM)** bölümü: `--ka-btn-primary-*` (aşağıdaki tabloya bakın) |
| **Her sayfanın başlık kartı** (geri düğmesinin altındaki başlık + açıklama + rozet) — zemin, çerçeve, köşe, gölge, yazı boyutu/rengi, ikon kutusu | **SAYFA BAŞLIĞI** bölümü: `--ka-ph-*` (aşağıdaki tabloya bakın) |
| Ana sayfa bölümü / menü grubu / rozet renkleri | `--c-*` (KATEGORİ PALETİ, RGB üçlüsü) |
| Kart/cam yüzey opaklığı, kenar, bulanıklık | `--gl-bg`, `--gl-field`, `--gl-edge`, `--gl-sep`, `--gl-blur`, `--gl-shadow` (açık + koyu palet) |
| **Pencere / alt sayfa / menü başlığı** (üst şerit: başlık, açıklama, × düğmesi) — boşluk, alt çizgi, yazı boyutu/rengi, kapat düğmesi | **PENCERE** bölümü: `--ka-sheet-head-*`, `--ka-sheet-close-*` (aşağıdaki tabloya bakın) |
| **Kaydırırken üstte kalan şeritler** (yapışkan araç çubuğu, alt kaydet çubuğu, tablo başlığı / ilk sütun) — zemin | `--ka-sticky-bg`, `--ka-sticky-cell-bg` (bkz. *Yapışkan şeritler*) |
| **Ana sayfa · Haftanın Nöbet Programı** — her günün yazı rengi, bölüm zemini, sol çubuğu | `--ka-wd-1` … `--ka-wd-5` ve `--ka-wd-bg-a*`, `--ka-wd-bar-w`, `--ka-wd-ink-mix` (bkz. *Haftalık nöbet günleri*) |
| **Alt menü** (alt navigasyon çubuğu) — çubuk zemini, sekme renkleri, seçili kapsül, ortadaki menü düğmesi | `--ka-nav-*` (bkz. *Alt menü*) |
| Üst başlık / açılır pencere yüzeyi | `--hd-*`, `--pp-*` |
| Sayfa zemini, metin, kenarlık | `--ka-app-bg`, `--ka-text`, `--ka-text-muted`, `--ka-border` |
| Tüm yazıları büyüt/küçült, yoğunluğu değiştir, gölgeyi kapat | `--ka-font-scale`, `--ka-density`, `--ka-shadow-a` (bkz. *Genel düğmeler*) |
| Modüle özgü bir rengi (otobüs koltuğu, zil durumu, hava durumu…) değiştir | `--k-*` renk havuzu (satır yorumu hangi modül olduğunu söyler) |

**Kural:** bir bileşen kuralında renk kodu (`#xxxxxx`, `rgb()`) yazmak yerine bu değişkenlerden biri kullanılır. Yeni bir renk gerekiyorsa önce TEMA MERKEZİ'ne eklenir.
Rapor/A4 baskı renkleri (`--ka-report-*`) kâğıt çıktısı olduğu için temadan bağımsızdır.

**Sürüm kuralı:** `design-system-base.css` her değiştiğinde `css/design-system.css` içindeki `@import ...?v=` ve `index.html` içindeki `css/design-system.css?v=` birer artırılır.

### Bileşenler: buton, kutu, kart, kapak, pencere, rozet, sekme, tablo, arama kutusu

Şekil değerleri de aynı bloktan gelir. **Tek düğme** `--ka-radius-base`'tir (varsayılan 14px): `--ka-r-1…--ka-r-10` köşe ölçeği bundan türer
(0px yaparsan her şey köşeli, 20px yaparsan çok yuvarlak olur). Her bileşen ailesi kendi değişkenini ölçekteki bir basamağa bağlar ve istenirse tek başına değiştirilir:

| Aile | Köşe | Diğer değişkenler |
|---|---|---|
| Buton (`.ka-btn*`, ikon düğmeleri, alt menü öğeleri) | `--ka-btn-radius`, `-sm`, `-lg` | `--ka-btn-grow` (tüm yüksekliklere ±px), `--ka-btn-h-sm/md/lg`, `--ka-btn-px`, `--ka-btn-gap`, `--ka-btn-weight`, `--ka-btn-border-w`; çeşitler: `--ka-btn-danger-*`, `--ka-btn-ghost-*`, `--ka-button-secondary-*` |
| Form kutusu (input/select/textarea) | `--ka-field-radius`, `-sm` | `--ka-field-grow`, `--ka-field-h-md`, `--ka-field-px/py`, `--ka-field-border-w`, `--ka-field-ring`, `--ka-field-textarea-h` |
| Arama / komut kutusu | `--ka-cmd-radius` | `--ka-cmd-h`, `--ka-cmd-bg`, `--ka-cmd-border`, `--ka-cmd-shadow`, `--ka-cmd-icon` |
| Kart | `--ka-card-radius`, `-sm` (iç kutu), `-lg` | `--ka-card-pad`, `--ka-card-border-w`, `--ka-card-bg`, `--gl-*` (cam) |
| Kapak (ana sayfa hero'su) | `--ka-cover-radius`, `-sm`, `-lg` | `--ka-hero-bg`, `--ka-hero-border`, `--ka-hero-shadow` |
| **Sayfa başlığı ve detay kapağı** (her sayfanın üst kartı) | `--ka-ph-radius` | `--ka-ph-*` (aşağıda) |
| Pencere / alt sayfa | `--ka-sheet-radius`, `-lg` | `--ka-sheet-pad`, `--ka-shadow-modal`, `--ka-overlay` |
| Rozet / etiket | `--ka-chip-radius`, `-sm` | `--ka-chip-h`, `--ka-chip-px`, `--ka-chip-weight` |
| Sekme | `--ka-tab-radius` | `--ka-tab-h`, `--ka-tab-px`, `--ka-tab-weight` |
| Tablo | `--ka-table-radius` | `--ka-table-cell-py/px` |

Şekil düğmeleri: `--ka-border-w` (tüm çizgi kalınlığı), `--ka-ring-w` (odak halkası), `--ka-blur-k` (bulanıklık çarpanı), `--ka-orb-a/b/c/-blur` (koyu temada arka plan ışık küreleri).

**Kural:** bileşen kuralında sabit köşe (`border-radius:14px`) veya `1px solid` yazılmaz; `var(--ka-r-*)`, aile değişkeni veya `var(--ka-border-w)` kullanılır
(`tests/theme-center-contract.test.js` denetler; rapor/belge önizleme kâğıt yüzeyleri istisnadır).

### Sayfa başlığı (`--ka-ph-*`)

Tüm modül sayfalarının başlık kartı (öğretmenler, öğrenciler, haberler, yemek, notlar, ayarlar… ~20 farklı yapı) ve **detay sayfalarının kapakları** (sınıf, öğrenci, öğretmen profili, servis, profilim, arama, istatistik…) **tek kabukla** çizilir; her değer `TEMA MERKEZİ > SAYFA BAŞLIĞI` bölümündedir.

| Değişken | Etkisi |
|---|---|
| `--ka-ph-bg` | Kart zemini (`transparent` = kartsız, düz başlık) |
| `--ka-ph-border-w`, `--ka-ph-border` | Çerçeve kalınlığı (0 = çerçevesiz) ve rengi |
| `--ka-ph-radius`, `--ka-ph-shadow`, `--ka-ph-blur` | Köşe, gölge (`none` = düz), cam bulanıklığı |
| `--ka-ph-pad-y`, `--ka-ph-pad-x`, `--ka-ph-gap`, `--ka-ph-min-h` | İç boşluk, öğeler arası boşluk, en az yükseklik (ör. `120px` = daha kapak gibi) |
| `--ka-ph-bar-pad-y`, `--ka-ph-bar-pad-x`, `--ka-ph-bar-title-size` | Çubuk biçimli başlık (detay sayfalarının üstündeki geri / başlık / düzenle çubuğu) |
| `--ka-ph-title`, `-size`, `-weight`, `-tracking`, `-lh` | Başlık yazısı |
| `--ka-ph-sub`, `-size`, `-lh` | Açıklama yazısı |
| `--ka-ph-kicker`, `-size`, `-tracking` | Başlık üstündeki küçük etiket |
| `--ka-ph-icon-bg`, `-fg`, `-border`, `-radius`, `-shadow`, `-size` | Başlıktaki ikon kutusu (`-size` yalnız genel `ka-page-head__icon` içindir; özel başlıkların ikon boyutu kendi kurallarındadır) |
| `--ka-ph-deco` | Sayfaların kendi süs şekilleri/emojileri (`none` kapalı, `block` açık) |

Yeni bir sayfa başlığı eklerken işaretlemeye `class="ka-page-head"` vermek yeter (ikon kutusu için `ka-page-head__icon`; yerleşim — ikon, metin bloğu, sağda düğme — kabukta hazırdır, satır içi stil gerekmez). Başlık, formun durduğu kartın **dışında**, kardeş öğe olarak yazılır (`<header class="ka-page-head">…</header><article class="ka-card">…`); başlığı kartın içine koymayın. Sayfanın ilk satırı "başlık + sağda rozet/düğme" ise ve ilk kart başlıksa (`section.ka-page`) ayrıca işaretlemeye gerek yoktur.

### Pencere başlığı (`--ka-sheet-head-*`, `--ka-sheet-close-*`)

Tüm açılır pencerelerin (`.ka-modal__header`, duyuru penceresi dahil), people detay panelinin (`.detay-head`), klasik pencerenin (`.classic-modal-head`), duyuru ayrıntısının, servis oturma düzenleyicisinin ve menü sayfasının üst şeridi **tek kabukla** çizilir; her değer `TEMA MERKEZİ > PENCERE` bölümündedir. Sayfa başlığı kartından (`--ka-ph-*`) ayrıdır: bu, pencere içinde duran düz bir şerittir.

| Değişken | Etkisi |
|---|---|
| `--ka-sheet-head-bg` | Şerit zemini (`transparent` = pencere yüzeyi görünür) |
| `--ka-sheet-head-stuck-bg` | İçerik altından kayan (yapışkan) şeridin zemini (varsayılan `--ka-sticky-bg`) |
| `--ka-sheet-head-border-w`, `--ka-sheet-head-border` | Alt çizgi kalınlığı (0 = çizgisiz) ve rengi |
| `--ka-sheet-head-pad-y`, `-pad-x`, `-gap` | İç boşluk ve başlık ile kapat düğmesi arası |
| `--ka-sheet-head-title`, `-size`, `-weight`, `-lh` | Başlık yazısı |
| `--ka-sheet-head-sub`, `-size` | Açıklama yazısı |
| `--ka-sheet-head-kicker`, `-size` | Başlık üstündeki küçük etiket (ör. YENİ DUYURU) |
| `--ka-sheet-close-size`, `-bg`, `-fg`, `-border`, `-radius` | Kapat (×) düğmesi — şeritlerin hepsinde aynı |

Yeni bir pencere yazarken başlık şeridine `ka-modal__header` sınıfı vermek yeter; ayrıca renk, boşluk veya yazı boyutu yazmayın. Servis oturma düzenleyicisinin şeridi, yoğun bir düzenleyici olduğu için kendi sıkı iç boşluğunu korur.

### Yapışkan şeritler (`--ka-sticky-bg`, `--ka-sticky-cell-bg`)

Kaydırırken içeriğin üstünde kalan her şeridin (öğretmen profili araç çubuğu, sınıf detayı üst çubuğu, servis düzenleyici araç/alt çubuğu, rapor özelleştirici başlık/altlığı, alt kaydet çubukları…) ve yapışkan tablo başlığı / ilk sütununun zemini **opaktır**; saydam bırakılırsa alttan kayan yazılar üst üste biner. Zemin tek yerden gelir:

| Değişken | Etkisi |
|---|---|
| `--ka-sticky-bg` | Yapışkan şeritlerin opak zemini (varsayılan açılır pencere yüzeyi `--pp-solid`) |
| `--ka-sticky-cell-bg` | Yapışkan tablo başlığı, ilk sütun ve sekme şeridinin opak, hafif tonlu zemini |

Yeni bir `position:sticky` şerit yazarsanız seçicisini dosya sonundaki *YAPIŞKAN ŞERİTLER* kabuğuna ekleyin; ayrıca `background` yazmayın. Bilerek cam (blur) bırakılan şeritler — uygulama üst başlığı, çalışma alanı başlıkları ve kaydet çubukları — kabuğun dışındadır; yeni bir cam şerit eklenirse `tests/theme-center-contract.test.js` içindeki istisna listesine yazılır (test, kabuğa da istisnaya da girmeyen sticky şeridi reddeder).

### Haftalık nöbet günleri (`--ka-wd-*`)

Ana sayfadaki *Haftanın Nöbet Programı* kartında her gün kendi renginde görünür: gün adı yazısı, gün bölümünün zemini (üstten alta sönen ton) ve soldaki renk çubuğu. Bugünün bölümü aynı renkte ama daha koyu tonla öne çıkar; ayrıca BUGÜN etiketi durur. Gün sırası pazartesiden cumaya sabittir.

| Değişken | Etkisi |
|---|---|
| `--ka-wd-1` … `--ka-wd-5` | Pazartesi … Cuma rengi — RGB üçlüsü; KATEGORİ PALETİ'nden (`--c-*`) birini yazın (varsayılan: indigo, amber, rose, cyan, violet) |
| `--ka-wd-bg-a`, `--ka-wd-bg-a-end` | Gün bölümü zemin yoğunluğu: üstte / altta (0 = zemin yok) |
| `--ka-wd-bg-a-today` | Bugünün bölümünün üst yoğunluğu |
| `--ka-wd-bar-w` | Soldaki renk çubuğunun kalınlığı (0 = çubuksuz) |
| `--ka-wd-ink-mix` | Gün adı yazısında gün renginin oranı; kalanı metin rengidir (düşürürseniz yazı koyulaşır/açılır, okunurluk artar) |

Hepsi aynı rengi isterseniz beş değişkene aynı değeri yazmanız yeterlidir.

### Alt menü (`--ka-nav-*`)

Alt navigasyon çubuğu: yuvarlak üst köşeli cam çubuk, kutusuz çizgi ikonlar, seçili sekmede renkli kapsül ve ortada yükselen menü düğmesi. Her sekmenin kendi rengi vardır; seçili sekmenin kapsülü, ikonu ve yazısı o renkle boyanır, çubuğun üst kenarındaki ince çizgi de dört rengi sırayla taşır.

| Değişken | Etkisi |
|---|---|
| `--ka-nav-tab-1` … `--ka-nav-tab-4` | Ana Sayfa, Profilim, Arama, Hızlı Not rengi — RGB üçlüsü (varsayılan: marka rengi, sky, violet, emerald). Hepsine aynı değeri yazarsanız tek renkli olur |
| `--ka-nav-bg`, `--ka-nav-border`, `--ka-nav-shadow` | Çubuk zemini, üst çizgisi, gölgesi (açık ve koyu palet ayrı) |
| `--ka-nav-text` | Pasif sekme yazı ve ikonları |
| `--ka-nav-radius`, `--ka-nav-blur` | Çubuğun üst köşe yuvarlaklığı ve cam bulanıklığı |
| `--ka-nav-label-size` | Sekme yazısı boyutu |
| `--ka-nav-pill-w`, `--ka-nav-pill-a`, `--ka-nav-pill-edge-a`, `--ka-nav-pill-glow-a` | Seçili kapsülün genişliği, zemin / çizgi / ışıma yoğunluğu (0 = yok) |
| `--ka-nav-ink-mix` | Seçili sekmenin yazı/ikon rengi: sekme renginin oranı, kalanı metin rengi (okunurluk için) |
| `--ka-nav-menu-ring` | Ortadaki menü düğmesinin çevresindeki halka. Düğmenin kendisi (cam, ikon, kenar, gölge) birincil düğme malzemesini kullanır → aşağıdaki bölüm |

Çubuğun yüksekliği `--ka-bottom-nav-height` ile ayarlanır; sayfa alt boşlukları bu değişkenden hesaplanır.

### Birincil düğme — Altın Cam (`--ka-btn-primary-*`)

Uygulamadaki tüm sarı ana eylem düğmeleri tek malzemeyi paylaşır: üstte beyaz parlama, altında altın tonlu yarı saydam cam, arkasını bulandıran `backdrop-filter`, ince saydam kenar, altın ışıma ve içte parlak çizgi. Açık temada kahverengi, koyu temada krem yazı kullanılır. Malzeme `TEMA MERKEZİ` içindeki **BİRİNCİL DÜĞME (ALTIN CAM)** bölümünde ve açık/koyu palet bloklarında durur; düğmelere tek tek dokunmak gerekmez.

| Değişken | Etkisi |
|---|---|
| `--ka-btn-primary-blur`, `--ka-btn-primary-sat` | Cam bulanıklığı (`--ka-blur-k` ile ölçeklenir; 0 = bulanıksız) ve arkadaki rengin doygunluğu |
| `--ka-btn-primary-gloss-a` | Üstteki beyaz parlamanın yoğunluğu |
| `--ka-btn-primary-tint-hi-a`, `--ka-btn-primary-tint-lo-a` | Altın tonun iki ucunun yoğunluğu (renkler `--t-gold-hi-rgb` / `--t-gold-lo-rgb`) |
| `--ka-btn-primary-smoke-rgb`, `--ka-btn-primary-smoke-a` | Camın altındaki koyu "duman" katmanı: rengi ve yoğunluğu (açık temada 0; koyu temada yazı okunurluğunu sağlar) |
| `--ka-btn-primary-ink`, `--ka-btn-primary-ink-shadow` | Yazı/ikon rengi ve yazı gölgesi |
| `--ka-btn-primary-edge` | Saydam kenar çizgisinin rengi |
| `--ka-btn-primary-shadow` | Dış ışıma + iç parlak çizgi |
| `--ka-btn-primary-hover-boost` | Üzerine gelince tona eklenen yoğunluk |
| `--ka-btn-primary-press-scale`, `--ka-btn-primary-press-dim` | Basılınca küçülme ve kararma (1 = etkisiz) |
| `--ka-btn-primary-disabled-a`, `--ka-btn-primary-disabled-sat` | Pasif düğmenin opaklığı ve canlılığı |
| `--ka-btn-primary-ring` | Klavye odak halkasının rengi |
| `--ka-btn-primary-bg`, `--ka-btn-primary-bg-hover`, `--ka-btn-primary-filter` | Yukarıdakilerden birleşen hazır katmanlar (çoğunlukla elle değiştirilmez) |

Yeni bir sarı düğme eklerken kendi `background`/`box-shadow` kuralını **yazmayın**; seçicisini dosya sonundaki "BİRİNCİL DÜĞME — ALTIN CAM" grup kuralının listesine ekleyin (normal, hover, basılı, pasif ve odak durumları aynı listeden gelir). Sözleşme testi, bu bölümün dışında düz sarı (`rgb(var(--t-gold-*-rgb))`) zemin yazılmasına izin vermez. Seçili sekme/hap dolguları, bildirim sayacı rozeti, ikon-avatar kutuları ve ilerleme çubukları bilerek düz sarı kalır.

### Genel düğmeler — tek değer, tüm uygulama

Aşağıdaki değişkenlerin her biri `TEMA MERKEZİ` içinde **tek yerde** durur ve uygulamanın tamamını etkiler. Varsayılanlar mevcut görünümü korur (çarpanlar 1, eklemeler 0).

| Değişken | Etkisi | Varsayılan |
|---|---|---|
| `--ka-font-scale` | Tüm yazı boyutlarını çarpar (1.1 = hepsi %10 büyük) | `1` |
| `--ka-fw-shift` | Tüm yazı kalınlıklarını kaydırır (-100 = bir kademe ince) | `0` |
| `--ka-lh-k` / `--ka-tracking-k` | Satır aralığı / harf aralığı çarpanı | `1` |
| `--ka-density` | Tüm iç boşluk, dış boşluk ve aralıkları çarpar (.9 = sıkı, 1.1 = ferah) | `1` |
| `--ka-radius-base` | Tüm köşe yuvarlaklığı (0 = köşeli) | `14px` |
| `--ka-border-w` | Tüm ince çizgilerin kalınlığı | `1px` |
| `--ka-ring-w` / `--ka-ring-offset` | Odak halkası kalınlığı / nesneden uzaklığı | `3px` / `2px` |
| `--ka-shadow-a` | Gölge koyuluğu (0 = düz, gölgesiz tasarım) | `1` |
| `--ka-shadow-k` / `--ka-shadow-rgb` | Gölge boyutu-yayılımı / gölge rengi | `1` / `0,0,0` |
| `--ka-blur-k` | Cam bulanıklığı çarpanı | `1` |
| `--ka-motion-k` | Tüm geçiş ve animasyon sürelerini çarpar (0 = animasyonsuz) | `1` |
| `--ka-icon-k` | İkon, avatar ve kare kutu boyutları | `1` |
| `--ka-btn-grow` / `--ka-field-grow` / `--ka-row-grow` | Düğme / form kutusu / satır yüksekliğine px ekler | `0px` |
| `--ka-font`, `--ka-font-mono` | Yazı tipi ailesi | Inter, JetBrains Mono |

### Basamaklar (merdivenler) ve renk havuzu

Eski modüllerdeki tek tek ayarlanmış değerler kaybolmasın diye **her değer merkezde bir basamak** olarak durur; bileşen kuralları sabit sayı yerine basamağı kullanır. Bir basamağı tek başına değiştirmek, o değeri kullanan her yeri değiştirir.

| Basamak | Örnek | Ne için |
|---|---|---|
| `--ka-fs-N` | `--ka-fs-13` | Yazı boyutu (N = px). `--ka-font-scale` ile çarpılır; `--ka-fs-rem-*` rem tabanlı olanlardır |
| `--ka-fw-N` | `--ka-fw-800` | Yazı kalınlığı |
| `--ka-lh-N`, `--ka-ls-N` | `--ka-lh-1-25`, `--ka-ls-08` | Satır yüksekliği, harf aralığı (`n` = eksi) |
| `--ka-sp-N` | `--ka-sp-12` | Boşluk (padding / margin / gap, N = px). `--ka-density` ile çarpılır |
| `--ka-sh-N` | `--ka-sh-24` | Gölge ölçüleri (kaydırma, bulanıklık, yayılım) |
| `--ka-ic-N` | `--ka-ic-44` | İkon / kare kutu / avatar boyutu |
| `--ka-rs-N` | `--ka-rs-4` | Küçük köşeler (≤7px); `--ka-radius-base` ile orantılı |
| `--ka-dur-N`, `--ka-ease-N` | `--ka-dur-200` | Geçiş süresi (ms), hareket eğrisi |
| `--k-*` (renk havuzu) | `--k-green-17684f` | Modüllere özgü renkler (rgb üçlüsü). Kategorilere göre gruplanmıştır; her satırın yorumu rengi hangi modüllerin kullandığını söyler |

Not: marka ve kategori renkleri (`--t-*`, `--c-*`) renk havuzundan ayrıdır; modül renkleri (otobüs koltukları, hava durumu, bildirim zili durumları, bordro vb.) havuzdadır.

**Kural:** Merkez dışındaki hiçbir kuralda sabit renk, yazı boyutu, kalınlık, boşluk, gölge ölçüsü, süre, köşe veya çizgi kalınlığı yazılmaz — basamak veya düğme kullanılır. Yeni bir değer gerekiyorsa önce merkeze eklenir.
`tests/theme-center-contract.test.js` bunu bütün üretim CSS'inde ve JS içine gömülü ekran stillerinde denetler (rapor/belge kâğıt yüzeyleri ve yazdırma kuralları istisnadır).

**Sınırlar (dürüst liste):**

- **Kâğıt çıktısı** (A4 rapor, yazdırma, PDF — `.ka-report*`, `@media print`, JS içindeki rapor/yazdırma `<style>` blokları) temadan bağımsızdır; renkleri `--ka-report-*` ile, ölçüleri mm/pt ile belirlenir.
- **Yerleşim geometrisi** merkezde değildir: kolon genişlikleri, `max-width`, `grid-template-columns`, konum kaydırmaları (`top/left/...`), `transform` ve `@media` kırılma noktaları (CSS değişkeni kabul etmez).
- **Çizim ve illüstrasyonlar:** hava durumu SVG sahnesinin paleti (`js/v3/hava-durumu-skin.js`), çizim defteri (canvas) renkleri.
- **Statik dosyalar:** `manifest.json` renkleri, uygulama ikonları, açılış görseli; HTML `<meta theme-color>` ilk değeri (çalışınca merkezden güncellenir).
- **Kullanıcı verisi:** yöneticinin menü kartına seçtiği özel renkler kullanıcıya aittir; seçilmemiş kartların varsayılan rengi marka renginden okunur.
- Düğmeler `html` düzeyinde okunur; bir alt öğeye yerel `--ka-density` vermek çalışmaz.
- Çarpanlar makul aralıkta (±%10–15) denenmiştir; çok uç değerlerde sabit yükseklikli bazı yerleşimler taşabilir.

### Sık kullanılan değişkenler


| Değişken | Değiştirdiği yer |
|---|---|
| `--ka-app-bg` | Uygulamanın tüm ana arka planı |
| `--ka-header-bg` | Üst header arka planı |
| `--ka-header-text` | Header ana yazıları |
| `--ka-nav-bg` | Alt menü çubuğunun zemini (açık/koyu palette ayrı) |
| `--ka-nav-text` | Pasif sekme yazı ve ikonları |
| `--ka-nav-border`, `--ka-nav-shadow` | Alt menü çubuğunun üst çizgisi ve gölgesi |
| `--ka-button-bg` | Ana butonların arka planı |
| `--ka-button-hover` | Ana buton hover/basılı hali |
| `--ka-button-text` | Ana buton yazısı |
| `--ka-card-bg` | Kart arka planları |
| `--ka-card-raised-bg` | Modal ve yükseltilmiş yüzeyler |
| `--ka-input-bg` | Input, select ve textarea arka planı |
| `--ka-input-text` | Form alanı yazıları |
| `--ka-input-border` | Form alanı kenarlığı |
| `--ka-text` | Uygulama genelindeki normal metin |
| `--ka-text-muted` | Açıklama ve yardımcı metin |
| `--ka-border` | Genel standart kenarlık |
| `--ka-primary` | Marka/aktif öğe/checkbox ana vurgu rengi |
| `--ka-danger` | Yalnız gerçek hata, tehlike ve kritik işlemler |
| `--ka-font` | Uygulamanın temel yazı tipi |
| `--ka-font-size-md` | Uygulamanın temel yazı boyutu |
| `--ka-radius-md` | Buton ve input köşe yuvarlaklığı |
| `--ka-radius-lg` | Kart ve modal köşe yuvarlaklığı |
| `--ka-report-bg` | A4 rapor kağıdı zemini |
| `--ka-report-text` | Rapor ana yazı rengi |

## Örnek

Uygulamanın açık tema arka planını değiştirmek için yalnızca:

```css
--ka-app-bg: #f7f8fa;
```

Header'ı zümrüt yapmak için:

```css
--ka-header-bg: #0b7657;
--ka-header-text: #ffffff;
--ka-header-muted: #d8f3e9;
```

Tüm ana butonları değiştirmek için:

```css
--ka-button-bg: #0b7657;
--ka-button-hover: #086447;
--ka-button-text: #ffffff;
```

Bu değişiklikler için component selector'larına veya ekran bazlı CSS dosyalarına dokunmayın.

## Mimari kural

- `app-v2.html` yalnız `css/design-system.css` yükler.
- Yeni v2 modülleri kendi `<style>` etiketini veya runtime CSS enjeksiyonunu üretmez.
- Yeni bir ekran mevcut componentlerden farklı bir görünüme ihtiyaç duyarsa önce `design-system.css` içine yeniden kullanılabilir bir `ka-*` component sınıfı eklenir.
- `modern.css`, `fix.css`, `v2.css`, `theme.css` gibi ikinci genel stil katmanları oluşturulmaz.
- Ekrana özgü renk sabitlemek yerine semantik değişken kullanılır.

Bu belge kullanım rehberidir; **stil değerlerinin gerçek kaynağı değildir**. Gerçek değerler her zaman `css/design-system.css` içindedir.

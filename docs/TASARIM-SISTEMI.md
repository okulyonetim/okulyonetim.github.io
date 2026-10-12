# Koruk Asistan Tasarım Sistemi

Uygulamanın görsel ayarlarının **tek kaynağı**, `css/design-system-base.css` dosyasının en üstündeki **TEMA MERKEZİ** bloğudur
(`css/design-system.css` yalnızca bu dosyayı içe aktaran giriş noktasıdır). Renk, yüzey, metin, gölge, bulanıklık, köşe yuvarlaklığı,
yazı tipi ve boşluk değerleri yalnızca orada tanımlanır; başka hiçbir yerde `html`/`:root` düzeyinde değişken tanımlanmaz.

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
| Marka sarısını başka renk yap | **MARKA PALETİ** bölümü: `--t-accent-rgb` (ana renk) + aynı bölümdeki türevler `--t-accent-deep`, `--t-accent-bright`, `--t-on-accent`, `--t-gold-hi-rgb`, `--t-gold-lo-rgb`, `--t-on-accent-ink`, `--t-accent-dim`; açık palette `--t-tint-rgb`, `--t-accent-text`, `--t-accent-mid`, `--t-accent-ink`, `--t-accent-strong`, `--t-accent-pale`; koyu palette aynı adlar + `--t-accent-shade`. Hepsi `TEMA MERKEZİ` içinde, yan yana. |
| Ana sayfa bölümü / menü grubu / rozet renkleri | `--c-*` (KATEGORİ PALETİ, RGB üçlüsü) |
| Kart/cam yüzey opaklığı, kenar, bulanıklık | `--gl-bg`, `--gl-field`, `--gl-edge`, `--gl-sep`, `--gl-blur`, `--gl-shadow` (açık + koyu palet) |
| Üst başlık / açılır pencere yüzeyi | `--hd-*`, `--pp-*` |
| Sayfa zemini, metin, kenarlık | `--ka-app-bg`, `--ka-text`, `--ka-text-muted`, `--ka-border` |

**Kural:** bir bileşen kuralında renk kodu (`#xxxxxx`, `rgb()`) yazmak yerine bu değişkenlerden biri kullanılır. Yeni bir renk gerekiyorsa önce TEMA MERKEZİ'ne eklenir.
Rapor/A4 baskı renkleri (`--ka-report-*`) kâğıt çıktısı olduğu için temadan bağımsızdır.

**Sürüm kuralı:** `design-system-base.css` her değiştiğinde `css/design-system.css` içindeki `@import ...?v=` ve `index.html` içindeki `css/design-system.css?v=` birer artırılır.

### Sık kullanılan değişkenler


| Değişken | Değiştirdiği yer |
|---|---|
| `--ka-app-bg` | Uygulamanın tüm ana arka planı |
| `--ka-header-bg` | Üst header arka planı |
| `--ka-header-text` | Header ana yazıları |
| `--ka-nav-bg` | Navigasyon / alt menü arka planı |
| `--ka-nav-text` | Pasif navigasyon yazı ve ikonları |
| `--ka-nav-active-bg` | Seçili navigasyon öğesinin zemini |
| `--ka-nav-active-text` | Seçili navigasyon yazı ve ikonları |
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

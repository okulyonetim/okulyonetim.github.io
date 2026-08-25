# Koruk Asistan Tasarım Sistemi

Koruk Asistan'ın uygulama genelindeki görsel ayarlarının **tek kaynağı** `css/design-system.css` dosyasıdır. Başka bir CSS dosyasına genel tema rengi, buton rengi, input rengi, header rengi, font veya kart görünümü eklenmemelidir.

## Nereden değişiklik yapılır?

`css/design-system.css` dosyasının en üstündeki **1. HIZLI TEMA AYARLARI** bölümünü düzenleyin. Açık tema burada tanımlanır. Aynı dosyadaki **2. KOYU TEMA** bölümünde aynı değişkenlerin koyu tema karşılıkları bulunur.

En sık kullanılacak değişkenler:

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

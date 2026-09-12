# Okul Yönetim — Mevzuat AI Worker

Bu Worker, Okul Yönetim uygulamasındaki Mevzuat Asistanı için güncel resmî web araştırması + yerel mevzuat bağlamını birleştirir.

## Ne yapar?

- Her soruda OpenAI Responses API web search aracını kullanır.
- Mevzuat.gov.tr, Resmî Gazete, MEB ve diğer `.gov.tr` resmî kaynaklarını esas almasını ister.
- Uygulamadan gelen yerel mevzuat parçalarını yardımcı bağlam olarak kullanır.
- Yerel metin ile güncel resmî kaynak çelişirse güncel resmî kaynağı esas alır.
- Varsayılan olarak ayrıntılı cevap üretir: Sonuç, Mevzuat dayanağı, Ayrıntılı açıklama, Okul yönetiminde uygulama, İstisnalar ve Kaynaklar.
- Uygulamanın mevcut `{ text, sources }` yanıt sözleşmesiyle uyumludur.

## Cloudflare'da ilk kurulum

Cloudflare hesabında Workers & Pages bölümünden GitHub deposunu bağlayın. Root directory olarak `worker/mevzuat-ai` seçin.

Build command gerekmez. Deploy command:

```bash
npx wrangler deploy
```

Worker secret olarak yalnızca şunu ekleyin:

```text
OPENAI_API_KEY=...
```

`OPENAI_API_KEY` hiçbir zaman GitHub dosyasına yazılmamalıdır.

İsteğe bağlı değişkenler:

```text
OPENAI_MODEL=chat-latest
APP_ORIGIN=https://okulyonetim.github.io
```

## Yerelde

```bash
npm install
npm run check
npm run dev
```

## Uygulamaya bağlama

Deploy sonrası Cloudflare size örneğin şu biçimde bir adres verir:

```text
https://okulyonetim-mevzuat-ai.<hesap>.workers.dev/
```

Bu adres alındıktan sonra `js/modules/legislation.js` içindeki `API` sabiti yeni adrese çevrilmelidir. Ardından PWA cache sürümü yükseltilmelidir.

## Güvenlik

Worker yalnız uygulama origin'ine CORS izni verir. OpenAI anahtarı yalnız Cloudflare secret olarak saklanır ve tarayıcıya gönderilmez. Uygulama yerel mevzuatın yalnız soruyla ilgili seçilmiş parçalarını Worker'a yollar.

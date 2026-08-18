const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('css/web-desktop.css', 'utf8');
const bridge = fs.readFileSync('css/tasima-takip.css', 'utf8');

assert(bridge.trimStart().startsWith("@import url('./web-desktop.css');"), 'Web responsive CSS her görünümde yüklenmeli.');
assert(css.includes('@media (min-width: 768px)'), 'Tablet breakpointi bulunmalı.');
assert(css.includes('@media (min-width: 1024px)'), 'Masaüstü breakpointi bulunmalı.');
assert(css.includes('.bottom-nav') && css.includes('display: none !important'), 'Masaüstünde mobil bottom-nav gizlenmeli.');
assert(css.includes('main.content') && css.includes('max-width: 1680px'), 'Masaüstü içerik alanı geniş ekrana göre sınırlandırılmalı.');
assert(css.includes('.sidebar') && css.includes('position: sticky'), 'Masaüstü sidebar sabit/sticky olmalı.');
assert(css.includes('.table-responsive') && css.includes('overflow-x: auto'), 'Geniş tablolar kendi alanında yatay kaydırılmalı.');
assert(css.includes('.modal') && css.includes('calc(100vw - 96px)'), 'Masaüstü modallar viewporta göre sınırlandırılmalı.');
assert(css.includes('.an-kart-grid') && css.includes('repeat(3, minmax(0, 1fr))'), 'Alt navigasyon kartları masaüstünde çok sütunlu olmalı.');
assert(!/^\s*\.bottom-nav\s*\{\s*display:\s*none/im.test(css.split('@media (min-width: 1024px)')[0]), 'Mobil bottom-nav breakpoint dışında gizlenmemeli.');

// v2: 1024–1100px aralığında ana styles.css mobil sidebar kurallarıyla çakışmamalı.
assert(css.includes('#app > .sidebar + div'), 'Ana içerik inline style yerine yapısal app-shell seçicisiyle hedeflenmeli.');
assert(css.includes('transform: none !important'), 'Masaüstünde mobil off-canvas transform kesin olarak iptal edilmeli.');
assert(css.includes('width: var(--sidebar-w) !important'), '1024–1100px aralığında mobil !important sidebar genişliği ezilmeli.');
assert(css.includes('body.nav-open::after') && css.includes('content: none !important'), 'Tablet görünümünden kalan nav-open perdesi masaüstünde kaldırılmalı.');
assert(css.includes('body.nav-collapsed #app > .sidebar') && css.includes('flex-basis: var(--sidebar-w-collapsed)'), 'Daraltılmış sidebar flex-basis değeri de 72px olmalı.');
assert(css.includes('body.nav-collapsed #app > .sidebar .nt-label'), '1024–1100px aralığında daraltılmış sidebar etiketleri gizli kalmalı.');

console.log('Web responsive smoke testleri başarılı.');

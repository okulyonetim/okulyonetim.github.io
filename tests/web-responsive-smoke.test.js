const fs = require('fs');
const assert = require('assert');

const css = fs.readFileSync('css/web-desktop.css', 'utf8');
const bridge = fs.readFileSync('css/tasima-takip.css', 'utf8');
const dash2 = fs.readFileSync('css/dashboard-v2.css','utf8');
const shellFix = fs.readFileSync('css/web-shell-fix.css','utf8');
const mobileCss = fs.readFileSync('css/mobil-dashboard.css','utf8');
const webInit = fs.readFileSync('js/dashboard-v2-init.js','utf8');
const webSidebar = fs.readFileSync('js/web-sidebar-v2.js','utf8');

assert(bridge.trimStart().startsWith("@import url('./web-desktop.css');"), 'Web responsive CSS her görünümde yüklenmeli.');
assert(css.includes('@media (min-width: 768px)'), 'Tablet breakpointi bulunmalı.');
assert(css.includes('@media (min-width: 1024px)'), 'Masaüstü breakpointi bulunmalı.');
assert(css.includes('.bottom-nav') && css.includes('display: none !important'), 'Masaüstünde mobil bottom-nav gizlenmeli.');
assert(css.includes('main.content') && css.includes('max-width: 1680px'), 'Masaüstü içerik alanı geniş ekrana göre sınırlandırılmalı.');
assert(css.includes('.sidebar') && css.includes('position: sticky'), 'Temel masaüstü sidebar fallbacki bulunmalı.');
assert(css.includes('.table-responsive') && css.includes('overflow-x: auto'), 'Geniş tablolar kendi alanında yatay kaydırılmalı.');
assert(css.includes('.modal') && css.includes('calc(100vw - 96px)'), 'Masaüstü modallar viewporta göre sınırlandırılmalı.');
assert(css.includes('.an-kart-grid') && css.includes('repeat(3, minmax(0, 1fr))'), 'Alt navigasyon kartları masaüstünde çok sütunlu olmalı.');
assert(!/^\s*\.bottom-nav\s*\{\s*display:\s*none/im.test(css.split('@media (min-width: 1024px)')[0]), 'Mobil bottom-nav breakpoint dışında gizlenmemeli.');
assert(css.includes('#app > .sidebar + div'), 'Ana içerik inline style yerine yapısal app-shell seçicisiyle hedeflenmeli.');
assert(css.includes('transform: none !important'), 'Masaüstünde mobil off-canvas transform kesin olarak iptal edilmeli.');
assert(css.includes('width: var(--sidebar-w) !important'), '1024–1100px aralığında mobil !important sidebar genişliği ezilmeli.');
assert(css.includes('body.nav-open::after') && css.includes('content: none !important'), 'Tablet görünümünden kalan nav-open perdesi masaüstünde kaldırılmalı.');
assert(css.includes('body.nav-collapsed #app > .sidebar') && css.includes('flex-basis: var(--sidebar-w-collapsed)'), 'Temel daraltılmış sidebar fallbacki bulunmalı.');
assert(css.includes('body.nav-collapsed #app > .sidebar .nt-label'), 'Temel daraltılmış sidebar etiketleri gizli kalmalı.');
assert(css.includes('@media (min-width: 1200px)'), 'v3 yönetim ekranı breakpointi bulunmalı.');
assert(css.includes('#navDuzeniGrupListesi') && css.includes('repeat(2, minmax(0, 1fr))'), 'Navigasyon Düzeni geniş ekranda en az iki sütunlu olmalı.');
assert(css.includes('#navDuzeniYonetimBolumu') && css.includes('grid-column: 1 / -1'), 'Navigasyon Düzeni yönetim bloğu gerektiğinde tam satır kullanmalı.');
assert(css.includes('.modal:has(#ndOgeAnaListe)'), 'Navigasyon öğe yönetimi modalı masaüstünde genişletilmeli.');
assert(css.includes('#ndOgeAnaListe') && css.includes('max-height: 42vh'), 'Navigasyon öğe listesi kendi alanında dikey kaydırılmalı.');
assert(css.includes('@media (min-width: 1600px)') && css.includes('max-width: 1780px'), 'Büyük monitörler için ayrı içerik genişliği standardı bulunmalı.');
assert(css.includes('repeat(3, minmax(0, 1fr))'), 'Çok geniş ekranda navigasyon grup kartları üç sütuna çıkabilmeli.');

assert(dash2.includes('@media (min-width:1024px)') || dash2.includes('@media (min-width: 1024px)'), 'Dashboard v2 içinde masaüstü shell breakpointi bulunmalı.');
assert(shellFix.includes('@media (min-width: 1024px)'), 'Web shell fix masaüstü breakpointine sahip olmalı.');
assert(mobileCss.includes('@media (max-width: 1023px)'), 'Yeni mobil CSS açıkça mobil breakpointine sahip olmalı.');
assert(webInit.includes("matchMedia('(min-width: 1024px)')") || /function\s+isWeb\s*\(\)\s*\{\s*return\s+window\.innerWidth\s*>=\s*1024\s*;?\s*\}/.test(webInit), 'Web init masaüstü breakpointiyle korunmalı.');
assert(webInit.includes('mobilWebStilleriniKaldir'), 'Mobilde web stil katmanları devre dışı bırakılmalı.');
assert(webInit.includes('wsThemeToggle'), 'Web topbarında açık/koyu tema kontrolü bulunmalı.');
assert(webInit.includes("s.src='js/web-sidebar-v2.js'"), 'Yeni web sidebar controller yüklenmeli.');
assert(webSidebar.includes("id=\"ws2Collapse\"") || webSidebar.includes("id='ws2Collapse'"), 'Web sidebar v2 daraltma kontrolü bulunmalı.');
assert(webSidebar.includes('nav-collapsed'), 'Web sidebar v2 daraltılmış görünümü yönetmeli.');

console.log('Web responsive smoke testleri başarılı.');

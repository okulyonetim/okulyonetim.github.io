const fs=require('fs');
const assert=require('assert');

const shell=fs.readFileSync('index.html','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const shellUi=fs.readFileSync('js/core/shell-ui.js','utf8');
const live=fs.readFileSync('js/modules/school-live-status.js','utf8');

assert(shell.includes('css/design-system.css'),'Ana kabuk tek design system yüklemeli.');
assert(!shell.includes('web-shell-fix.css'),'Ayrı web shell tasarımı yüklenmemeli.');
assert(!shell.includes('web-desktop.css'),'Ayrı desktop tema dosyası yüklenmemeli.');
assert(!shell.includes('mobile-theme-consistency.css'),'Ayrı mobil tema katmanı yüklenmemeli.');
assert(design.includes('@media'),'Tek design system responsive kuralları kendi içinde taşımalı.');
assert(design.includes('--ka-safe-top')&&design.includes('safe-area-inset-bottom'),'iOS safe-area altyapısı merkezi design system içinde olmalı.');
assert(design.includes('100dvh'),'Mobil Safari/Chrome için dinamik viewport kullanılmalı.');
assert(shell.includes('class="ka-school-meta"')&&shell.includes('Koruk Asistan'),'Mobil/web ortak header okul meta satırını aynı shell içinde taşımalı.');
assert(design.includes('@media(max-width:390px)')&&design.includes('.ka-school-logo{width:37px;height:37px'),'Dar telefon header ayarı aynı merkezi design system içinde bulunmalı.');
assert(shell.includes('data-ka-notification-count')&&design.includes('.ka-header-notification{position:relative;overflow:visible}')&&design.includes('[data-ka-notification-count]{position:absolute;top:0;right:0'),'Bildirim rozeti zilin sağ üst köşesinde merkezi design system ile konumlanmalı.');
assert(shellUi.includes("arr('sinavlar')")&&shellUi.includes("arr('denemeSinavlari')")&&shellUi.includes("arr('gorevler')")&&shellUi.includes("arr('hatirlaticilar')"),'Header bildirim merkezi ana sayfadaki yaklaşan etkinlik kaynaklarını okumalı.');
assert(shellUi.includes("module:'academic',page:'written'")&&shellUi.includes("module:'academic',page:'trial'")&&shellUi.includes("module:direct?'management':'communication'")&&shellUi.includes('routeModule(r.module'),'Her bildirim kendi ilgili modül/sayfa hedefine gitmeli.');
assert(shellUi.includes('function openProfilePopover()')&&shellUi.includes('p=popoverBase(anchor'),'Profil fotoğrafı bildirim penceresiyle aynı popover altyapısını kullanmalı.');
assert(!live.includes("bell.addEventListener('click'")&&!live.includes("routeModule?.('communication',{bottom:'menu'})"),'Canlı durum motoru header zilini ikinci kez bağlayıp İletişim/Duyurular sayfasına yönlendirmemeli.');
assert(loader.includes("define('dashboard'"),'Dashboard lazy modül olarak tanımlanmalı.');
assert(!loader.includes('dashboard-v2-init.js'),'Ayrı eski web dashboard motoru loadera dönmemeli.');
assert(!loader.includes('web-sidebar-v2.js'),'Ayrı eski web sidebar motoru loadera dönmemeli.');
assert(sw.includes("'./css/design-system.css'"),'Design system offline kabukta tutulmalı.');
assert(!sw.includes("'./css/web-shell-fix.css'"),'Web override SW precache içine dönmemeli.');

console.log('Tek responsive çekirdek / Android+iOS+web tasarım sözleşmesi başarılı.');

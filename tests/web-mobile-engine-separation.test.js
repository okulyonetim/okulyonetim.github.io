const fs=require('fs');
const assert=require('assert');

const shell=fs.readFileSync('index.html','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

assert(shell.includes('css/design-system.css'),'Ana kabuk tek design system yüklemeli.');
assert(!shell.includes('web-shell-fix.css'),'Ayrı web shell tasarımı yüklenmemeli.');
assert(!shell.includes('web-desktop.css'),'Ayrı desktop tema dosyası yüklenmemeli.');
assert(!shell.includes('mobile-theme-consistency.css'),'Ayrı mobil tema katmanı yüklenmemeli.');
assert(design.includes('@media'),'Tek design system responsive kuralları kendi içinde taşımalı.');
assert(design.includes('--ka-safe-top')&&design.includes('safe-area-inset-bottom'),'iOS safe-area altyapısı merkezi design system içinde olmalı.');
assert(design.includes('100dvh'),'Mobil Safari/Chrome için dinamik viewport kullanılmalı.');
assert(loader.includes("define('dashboard'"),'Dashboard lazy modül olarak tanımlanmalı.');
assert(!loader.includes('dashboard-v2-init.js'),'Ayrı eski web dashboard motoru loadera dönmemeli.');
assert(!loader.includes('web-sidebar-v2.js'),'Ayrı eski web sidebar motoru loadera dönmemeli.');
assert(sw.includes("'./css/design-system.css'"),'Design system offline kabukta tutulmalı.');
assert(!sw.includes("'./css/web-shell-fix.css'"),'Web override SW precache içine dönmemeli.');

console.log('Tek responsive çekirdek / Android+iOS+web tasarım sözleşmesi başarılı.');

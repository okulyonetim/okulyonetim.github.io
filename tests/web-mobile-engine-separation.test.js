const fs=require('fs');
const assert=require('assert');

const shell=fs.readFileSync('app-v2.html','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

assert(shell.includes('css/design-system.css'),'V2 kabuğu tek design system yüklemeli.');
assert(!shell.includes('web-shell-fix.css'),'Ayrı web shell tasarımı yüklenmemeli.');
assert(!shell.includes('web-desktop.css'),'Ayrı desktop tasarımı yüklenmemeli.');
assert(!shell.includes('mobile-theme-consistency.css'),'Ayrı mobil tema katmanı yüklenmemeli.');
assert(!shell.includes('dashboard-home.css'),'V2 kabuğunda eski mobil dashboard CSS yüklenmemeli.');
assert(design.includes('@media'),'Tek design system responsive kuralları kendi içinde taşımalı.');
assert(loader.includes("define('dashboard'"),'Dashboard lazy modül olarak tanımlanmalı.');
assert(!loader.includes('dashboard-v2-init.js'),'Ayrı web dashboard motoru loadera dönmemeli.');
assert(!loader.includes('web-sidebar-v2.js'),'Ayrı web sidebar motoru loadera dönmemeli.');
assert(sw.includes("'./css/design-system.css'"),'Design system offline kabukta tutulmalı.');
assert(!sw.includes("'./css/web-shell-fix.css'"),'Web override SW precache içine dönmemeli.');

console.log('Tek responsive motor / tek design system testi başarılı.');

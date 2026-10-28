/* Çizelge ("form-*") sayfaları: menü etiketi değişse de doğru çizelge açılmalı (Plan Teslim Takibi boş açılıyordu). */
const fs=require('fs'),assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8'),core=fs.readFileSync('js/modules/rubric-settings-core.js','utf8'),nav=fs.readFileSync('js/core/app-nav.js','utf8');
const FORM_PAGES=new Function('return '+shell.match(/const FORM_PAGES=Object\.freeze\((\{[^}]*\})\)/)[1])();
const line=name=>core.split('\n').find(l=>l.startsWith(name));
const norm=new Function(`${line('const norm=')};return norm`)();
const typeFromTitle=new Function('norm',`${line('function typeFromTitle')};return typeFromTitle`)(norm);

/* Her çizelge sayfasının kanonik adı bir çizelge türüne çözülür ve türler birbirinden farklıdır. */
const turler=Object.entries(FORM_PAGES).map(([k,ad])=>{const t=typeFromTitle(ad);assert(t,`${k} (${ad}) bir çizelge türüne çözülmeli.`);return t});
assert.strictEqual(new Set(turler).size,Object.keys(FORM_PAGES).length,'Her çizelge sayfası ayrı bir türe bağlanmalı.');
assert.strictEqual(typeFromTitle(FORM_PAGES['form-bep']),'bepPlani','Plan Teslim Takibi = yıllık / BEP planları çizelgesi.');

/* Menüdeki her form-* sayfası kayıtlı ve çizelge açılışı menü etiketine bağlı değil. */
const menuFormlari=[...nav.matchAll(/\['(form-[a-z]+)','[^']+','[a-z]+','[^']*','tools','\1'/g)].map(m=>m[1]);
assert(menuFormlari.length>=8,'Menüde form sayfaları bulunmalı.');
menuFormlari.forEach(k=>assert(FORM_PAGES[k],`${k} FORM_PAGES içinde olmalı.`));
const bas=shell.indexOf('function applyFormPage('),af=shell.slice(bas,shell.indexOf('\nfunction ',bas+10));
assert(/openPage\?\.\('forms',wanted\)/.test(af)&&!/openPage\?\.\('forms',title\)/.test(af),'Çizelge, menü etiketiyle değil kanonik adla açılmalı.');
console.log('form-sayfalari-rota: OK');

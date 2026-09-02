const fs=require('fs');
const assert=require('assert');
const management=fs.readFileSync('js/modules/management.js','utf8');
const classic=fs.readFileSync('js/modules/classic-personnel-parity.js','utf8');
const css=fs.readFileSync('css/design-system.css','utf8');

new Function(management);

assert(
  management.includes("(function(global){\n'use strict';if(window.ManagementModule)return;")&&management.trimEnd().endsWith('})(window);'),
  'Management çalışma alanı window nesnesini global parametresi olarak almalı; aksi halde Yazdır ve Kapat tıklamaları ReferenceError üretir.'
);

for(const label of [
  'Puantaj ve İmza Sirküsü','İmza Sirküsü','Puantaj','Yazdır','HTML İndir','Kapat',
  'Dönem ve Personel','Başlangıç Tarihi','Bitiş Tarihi','Resmî Tatiller',
  'Personel seçin','Yatay A4','Dikey A4'
]) assert(management.includes(label),`Puantaj/İmza görünür sözleşmesi eksik: ${label}`);

for(const token of [
  'function ptImzaDocument()','function ptPuantajDocument()',
  "arr('personel')","arr('personelIzinler')","arr('resmiTatiller')",
  'NobetService.tatilEkle','NobetService.tatilSil',
  "if(izin)return kod;if(ptTatil(g.iso))return'T'",
  "return wd===0||wd===6?'H':'X'",
  'ReportEngine.printHtml','ptDownload()',
  "ptState.mode==='puantaj'?'yatay':'dikey'",
  'ptState.personelId=p.id','ShellUI.routeModule'
]) assert(management.includes(token),`Puantaj/İmza canonical davranışı eksik: ${token}`);

assert(!classic.includes('decoratePuantaj')&&!classic.includes('puantajTablosu'),'Classic parite puantajı DOM yamalarıyla yeniden sahiplenmemeli.');
for(const selector of [
  '.ka-pt-page','.ka-pt-header','.ka-pt-tabs','.ka-pt-workspace',
  '.ka-pt-controls','.ka-pt-preview','.ka-pt-preview-scene',
  '[data-theme="dark"] .ka-pt-header','@media(max-width:760px)','@media(max-width:460px)'
]) assert(css.includes(selector),`Puantaj/İmza tasarım sözleşmesi eksik: ${selector}`);

assert(css.includes('[data-orientation="yatay"][data-zoom="100"] .ka-pt-preview-scene{width:1123px;height:794px}'),'Yatay A4 önizleme gerçek piksel sahnesiyle ölçeklenmeli.');
console.log('Personel puantaj + imza sirküsü işlev/görünüm paritesi başarılı.');

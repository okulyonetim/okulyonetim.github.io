const fs=require('fs');
const assert=require('assert');
const tools=fs.readFileSync('js/modules/tools.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
assert(!tools.includes('data-tools-tab'),'Tools ana iç sekme üretmemeli.');
assert(tools.includes("function openPage(page,title='')"),'ToolsModule doğrudan sayfa açma API sağlamalı.');
for(const page of ['checklists','map','forms','attendance'])assert(tools.includes(`'${page}'`),`Tools ayrı sayfa hedefi eksik: ${page}`);
for(const token of ['KontrolListeleriService','HaritaService','CizelgelerService','DevamsizlikCizelgesiService','tamamlamaKaydet','favoriSil','renderForms','renderAttendance'])assert(tools.includes(token),`Tools gerçek davranışı eksik: ${token}`);

for(const token of ['function renderChecklists()','geciken','yaklasan','data-kl-item-new','data-kl-summary','data-kl-print','baglıEvrak','hedefOgretmenIdler','gorevYeriKademeleri','ReportEngine.printReport'])assert(tools.includes(token),`Kontrol Listeleri görünür paritesi eksik: ${token}`);
assert(tools.includes("for(const tip of FORM_TYPES)"),'Kontrol Listeleri bağlı evrak verilerini local-first hydrate etmeli.');
assert(!tools.includes('MutationObserver'),'Tools canonical ekranı MutationObserver parity katmanı kullanmamalı.');
assert(shell.includes("name==='tools'&&['checklists','map','attendance'].includes(page)"),'Shell Tools ana sayfalarını doğrudan route etmeli.');
assert(shell.includes('ToolsModule?.openPage?.(page,title)'),'Shell Tools tab click yerine openPage kullanmalı.');
assert(shell.includes("ToolsModule?.openPage?.('forms',title)"),'Form sayfaları gizli Tools sekmesi yerine forms openPage kullanmalı.');
assert(!shell.includes('[data-tools-tab='),'Shell Tools tab selector kullanmamalı.');
console.log('Tools ayrı sayfa + form filtre routing sözleşmesi başarılı.');

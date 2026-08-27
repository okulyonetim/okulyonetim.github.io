const fs=require('fs');
const assert=require('assert');
const academic=fs.readFileSync('js/modules/academic.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');

assert(!academic.includes('data-academic-tab'),'Academic modülü iç sekme üretmemeli.');
assert(academic.includes("function openPage(page,title='')"),'AcademicModule doğrudan sayfa açma API sözleşmesi sağlamalı.');
for(const page of ['schedule','written','trial','results','plans','calendar'])assert(academic.includes(`'${page}'`),`Academic ayrı sayfa hedefi eksik: ${page}`);
assert(academic.includes('denemeSayacBaslat')&&academic.includes('denemeSayacDurdur')&&academic.includes('timerState'),'Deneme sınavı sayaç davranışı korunmalı.');
for(const token of ['planCurrentWeekIndex','planTracked','ogretmenYillikPlanSecimleri','yillikPlanNotlari','data-plan-select','data-plan-note','data-plan-prev','data-plan-next']) assert(academic.includes(token),`Yıllık Plan gerçek haftalık takip sözleşmesi eksik: ${token}`);
assert(academic.includes("PermissionService?.can?.('academic.plans','edit')")&&academic.includes("PermissionService?.can?.('academic.plans','read')"),'Yıllık Plan merkezi PermissionService kullanmalı.');
assert(academic.includes("title==='Deneme Sonuçları'")&&academic.includes("title==='Test Sonuçları'"),'Deneme ve Test Sonuçları ayrı filtrelenmiş sayfa davranışını korumalı.');
assert(shell.includes("name==='academic'&&['schedule','written','trial','results','plans','calendar'].includes(page)"),'Shell Academic sayfalarını doğrudan route etmelidir.');
assert(shell.includes('AcademicModule?.openPage?.(page,title)'),'Shell Academic sayfasını tab click ile değil openPage API ile açmalıdır.');
assert(!shell.includes('[data-academic-tab='),'Shell Academic tab selector kullanmamalı.');
console.log('Academic ayrı sayfa + deneme sayacı + sonuç filtreleme sözleşmesi başarılı.');

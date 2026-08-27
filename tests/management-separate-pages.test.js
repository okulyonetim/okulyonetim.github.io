const fs=require('fs');
const assert=require('assert');
const management=fs.readFileSync('js/modules/management.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');

assert(!management.includes('data-management-tab'),'Management iç sekme üretmemeli.');
assert(management.includes("function openPage(page,title='')"),'ManagementModule doğrudan sayfa açma API sözleşmesi sağlamalı.');
for(const page of ['staff','tasks','leaves','duty','puantaj','dilekce'])assert(management.includes(`'${page}'`),`Management ayrı sayfa hedefi eksik: ${page}`);
for(const token of ['exceliUygula','otomatikDagitimUygula','defterDolduToggle','createDutyReport','DUTY_TASKS','data-duty-book','nobetYerleri','nobetAtamalari','nobetciAmirleri','resmiTatiller'])assert(management.includes(token),`Nöbet gerçek davranış sözleşmesi eksik: ${token}`);
for(const token of ['data-duty-places','data-duty-excel','dutyPlacesModal','dutyExcelModal','readDutyExcel','dutyExcelMappingModal','xlsx.full.min.js']) assert(management.includes(token),`Nöbet Excel/yer yönetimi sözleşmesi eksik: ${token}`);
assert(management.includes("PermissionService?.can?.('management.duty.edit','edit')"),'Nöbet servis yetkisi merkezi PermissionService kullanmalı.');
assert(management.includes('AppLoader?.loadScript?.'),'Nöbet Excel kütüphanesi merkezi lazy loader ile yüklenmeli.');
assert(shell.includes("name==='management'&&['staff','tasks','leaves','duty','puantaj','dilekce'].includes(page)"),'Shell Management sayfalarını doğrudan route etmelidir.');
assert(shell.includes('ManagementModule?.openPage?.(page,title)'),'Shell Management sayfasını tab click ile değil openPage API ile açmalıdır.');
assert(!shell.includes('[data-management-tab='),'Shell Management tab selector kullanmamalı.');
console.log('Management ayrı sayfa + nöbet gerçek davranış sözleşmesi başarılı.');

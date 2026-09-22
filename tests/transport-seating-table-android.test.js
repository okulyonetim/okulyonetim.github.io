const fs=require('fs');
const js=fs.readFileSync('js/modules/transport.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

if(!js.includes("b.addEventListener('pointerup',run,{passive:false})")) throw new Error('Birleştir/Ayır Android pointerup kullanmalı.');
if(!js.includes("b.addEventListener('click',run,{passive:false})")) throw new Error('Birleştir/Ayır Android click yedeği eksik.');
if(!js.includes("querySelector('[data-sbe-unmerge]')?.addEventListener('pointerup'")) throw new Error('Ayır Android pointerup kullanmalı.');
if(!js.includes("querySelector('[data-sbe-delete]')?.addEventListener('pointerup'")) throw new Error('Sil Android pointerup kullanmalı.');
if(!js.includes("if(Math.abs(x-acc)<=16)")) throw new Error('Sütun resize sınır hesabı eksik.');
if(!js.includes("sbeTableResizeStart(e,'col',c)")) throw new Error('Sütun resize seçili sınırı doğru kolona bağlamalı.');
if(!js.includes("const colTemplate=colWidths.map(v=>Math.max(1,Number(v)||1)+'fr').join(' ')")) throw new Error('Rapor sütun oranları editör ölçülerini korumalı.');
if(!loader.includes("js/modules/transport.js?v=926")) throw new Error('Transport cache sürümü yenilenmemiş.');
if(!sw.includes("./js/modules/transport.js?v=926")) throw new Error('Service Worker transport sürümü yenilenmemiş.');
console.log('Servis oturma Android kontrol/resize/rapor smoke testi başarılı.');

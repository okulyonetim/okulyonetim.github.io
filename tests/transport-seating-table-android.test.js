const fs=require('fs');
const js=fs.readFileSync('js/modules/transport.js','utf8');
const loader=fs.readFileSync('js/app-loader.js','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

if(!js.includes("cell.addEventListener('pointerup',e=>")) throw new Error('Tablo hücreleri Android pointerup ile çalışmalı.');
if(!js.includes("if((e.type==='pointerup'||e.type==='touchend')")) throw new Error('Tablo dokunma zinciri korunmalı.');
if(!js.includes('function sbeTableUnmergeSelection()')) throw new Error('Tablo hücre ayırma işlemi bulunmalı.');
if(!js.includes('function sbeTableResizeStart(ev,type,index)')) throw new Error('Satır/sütun yeniden boyutlandırma motoru bulunmalı.');
if(!js.includes("if(Math.abs(x-acc)<=16)")) throw new Error('Sütun resize sınır hesabı eksik.');
if(!js.includes("sbeTableResizeStart(e,'col',c)")) throw new Error('Sütun resize seçili sınırı doğru kolona bağlamalı.');
if(!js.includes("const colTemplate=colWidths.map(v=>(Math.max(1,Number(v)||1)/totalCol*100).toFixed(4)+'%').join(' ')")) throw new Error('Rapor sütun oranları editör ölçülerini korumalı.');
if(!loader.includes("js/modules/transport.js?v=947")) throw new Error('Transport cache sürümü yenilenmemiş.');
if(!sw.includes("./js/modules/transport.js?v=947")) throw new Error('Service Worker transport sürümü yenilenmemiş.');
console.log('Servis oturma Android kontrol/resize/rapor smoke testi başarılı.');

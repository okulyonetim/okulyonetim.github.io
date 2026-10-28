/* Tebliğ-Tebellüğ (ve Proje/Dilimiz) sayfasındaki "Geri": Menü'den açıldığında Dokümanlar listesine değil, geldiği sayfaya dönmeli.
 * Dokümanlar listesinin kendi düğmesinden açıldığında ise listeye dönmeye devam eder. */
const fs=require('fs');
const assert=require('assert');
const docs=fs.readFileSync('js/modules/documents.js','utf8');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

assert(/function geriDon\(\)\{if\(shellAcilis&&window\.ShellUI\?\.back\)\{window\.ShellUI\.back\(\);return\}mode='list';tebligState=null;shellAcilis=false;render\(\)\}/.test(docs),'Geri: kabuk rotasından açıldıysa ShellUI.back(), değilse liste');
assert(docs.includes("out.querySelector('[data-teblig-back]')?.addEventListener('click',geriDon)"),'Tebliğ Geri düğmesi geriDon kullanmalı');
assert(docs.includes('window.DilimizModule.render(out,{back:geriDon})'),'Dilimiz Geri düğmesi geriDon kullanmalı');
assert(!/data-teblig-back[^;]*mode='list'/.test(docs)&&!docs.includes("{back:()=>{mode='list';render()}}"),'Geri düğmeleri doğrudan listeye sabitlenmemeli');
assert(/function openTeblig\(o\)\{[^}]*shellAcilis=!!o&&o\.shell===true/.test(docs)&&/function openDilimiz\(o\)\{[^}]*shellAcilis=!!o&&o\.shell===true/.test(docs),'Açılış kaynağı (kabuk / liste düğmesi) saklanmalı');
assert(docs.includes("addEventListener('click',openTeblig)"),'Liste düğmesi olay nesnesiyle çağırır; kabuk açılışı sayılmamalı (shell===true şartı)');
assert(/function unmount\(\)\{[^}]*shellAcilis=false/.test(docs),'Modül kapanınca açılış kaynağı sıfırlanmalı');
assert(shell.includes('global.DocumentsModule.openTeblig({shell:true})')&&shell.includes('global.DocumentsModule.openDilimiz({shell:true})'),'Kabuk rotaları sayfayı shell:true ile açmalı');

const v=index.match(/js\/core\/shell-ui\.js\?v=(\d+)/)?.[1];
assert(v&&Number(v)>=1116,'shell-ui.js sürümü artırılmalı');
assert(sw.includes(`'./js/core/shell-ui.js?v=${v}'`),'Service Worker güncel shell-ui.js sürümünü önbelleğe almalı');
console.log('teblig-geri-kabuk: OK');

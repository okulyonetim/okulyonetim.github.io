const assert=require('assert');const fs=require('fs');
const tools=fs.readFileSync('js/modules/tools.js','utf8'),css=fs.readFileSync('css/design-system-base.css','utf8');
for(const t of ['kkl-card','kkl-ring','kkl-task','data-kl-item-open','data-kkl-search','data-kkl-lfilter','function itemDetail(','function checklistResultsHtml(','kkr-table','kkr-sum','kcz-form kkl-sheet'])assert(tools.includes(t),`Kontrol Listeleri yeni tasarım parçası eksik: ${t}`);
for(const t of ['data-kl-toggle','data-kl-item-new','data-kl-summary','data-kl-print','tamamlamaKaydet','kontrolToggle','listeGuncelle'])assert(tools.includes(t),`Mevcut davranış korunmalı: ${t}`);
assert(!tools.includes('ka-checklist-task'),'Eski madde satırı sınıfı kalmamalı.');
const a=css.indexOf('/* ===== KONTROL LİSTELERİ (kkl-*)'),b=css.indexOf('/* ===== WEB ARAYÜZÜ (≥1100px)');
assert(a>0&&b>a,'kkl bölümü WEB bölümünden önce olmalı.');
const sec=css.slice(a,b);
assert(!/#[0-9a-fA-F]{3,8}\b/.test(sec.replace(/\/\*[\s\S]*?\*\//g,'')),'kkl bölümünde sabit renk olmamalı.');
for(const line of sec.split('\n')){if(/^(html\[data-theme\]|@media|\}|\s+html\[data-theme\]|\/\*|\s|$)/.test(line))continue;assert.fail('kkl bölümünde kapsamsız kural: '+line.slice(0,80))}
const p=css.indexOf('.ka-report .kkr-sum{'),m=css.indexOf('SERVİS OTURMA IZGARASI');assert(p>0&&p<m,'Kağıt CSS oturma ızgarasından önce durmalı.');
console.log('ok');

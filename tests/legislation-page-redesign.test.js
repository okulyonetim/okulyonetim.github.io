const fs=require('fs');
const assert=require('assert');
const ui=fs.readFileSync('js/modules/legislation-ui.js','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');

for(const token of [
  'ka-legislation-page','ka-legislation-hero','ka-legislation-local-badge','ka-legislation-summary',
  'ka-legislation-actions','ka-legislation-switch','ka-legislation-surface','ka-legislation-search',
  'ka-legislation-source','ka-legislation-empty','ka-legislation-chat','ka-legislation-messages',
  'ka-legislation-composer','ka-legislation-modal'
]) assert(ui.includes(token),`Yeni Mevzuat görünür çalışma alanı eksik: ${token}`);

for(const token of [
  '.ka-legislation-page{width:100%;max-width:820px',
  '.ka-legislation-hero{position:relative;overflow:hidden',
  '.ka-legislation-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))',
  '.ka-legislation-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))',
  '.ka-legislation-switch{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))',
  '.ka-legislation-chat{height:min(60vh,640px)',
  '.ka-legislation-source{min-width:0;min-height:72px',
  '@media(max-width:560px){.ka-legislation-page'
]) assert(design.includes(token),`Merkezi Mevzuat tasarım sözleşmesi eksik: ${token}`);

assert(ui.includes('data-legislation-stat="records"')&&ui.includes('data-legislation-stat="sections"')&&ui.includes('data-legislation-stat="categories"'),'Mevzuat özet sayaçları bulunmalı.');
assert(ui.includes('function visibleRows()')&&ui.includes('legislationSourceSearch'),'Yerel arşiv filtresi korunmalı.');
assert(ui.includes('data-legislation-prompt')&&ui.includes('ka-legislation-chat-welcome'),'Soru ekranında başlangıç yönlendirmesi bulunmalı.');
assert(ui.includes('Cihazda saklanır')&&ui.includes("hiçbir veri Firestore'a gitmez"),'Yerel saklama güvencesi görünür olmalı.');
assert(!ui.includes('style="'),'Mevzuat sayfası görünür stil sahipliğini JS içinde inline olarak taşımamalı.');
assert(!ui.includes('db.collection(')&&!ui.includes('firebase.firestore'),'Mevzuat presentation Firestore kullanmamalı.');
for(const call of ['engine().list()','engine().add({baslik,kaynak,kategori,metin})','engine().importJson(parsed)','engine().remove(b.dataset.legislationDelete)','engine().ask(q)']) assert(ui.includes(call),`Canonical LegislationEngine çağrısı korunmalı: ${call}`);
console.log('Mevzuat mobil çalışma alanı + merkezi tasarım sözleşmesi başarılı.');

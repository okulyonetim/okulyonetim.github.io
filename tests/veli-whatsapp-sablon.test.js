const test = require('node:test'), assert = require('node:assert'), fs = require('fs');
const people = fs.readFileSync('js/modules/people.js', 'utf8'), rubric = fs.readFileSync('js/modules/rubric-tools.js', 'utf8'), tools = fs.readFileSync('js/modules/tools.js', 'utf8');
test('yoklama servisi hazır mesaj şablonları ve numarasız WhatsApp bağlantısı sunar', () => {
  for (const id of ['standart', 'nazik', 'mazeret', 'uyari', 'kisa']) assert.ok(people.includes(`id:'${id}'`), id);
  for (const k of ['sablonPaneliHtml', 'sablonPaneliBagla', 'sablonOzelKaydet', 'telefonsuz']) assert.ok(people.includes(k), k);
  assert.ok(people.includes('Sayın {veli}, öğrenciniz {ogrenci}, {tarih} tarihinde {durum}. Bilginize. — {okul}'), 'standart şablon eski metinle aynı');
});
test('Devamsızlar ve Sınıf Yoklaması sayfaları şablon paneli ve WhatsApp butonu kullanır; bağlantı tıklanınca güncel şablonla üretilir', () => {
  assert.ok(rubric.includes('sablonPaneliHtml') && rubric.includes('sablonPaneliBagla') && rubric.includes('{telefonsuz:true}'));
  assert.ok(tools.includes('sablonPaneliHtml') && tools.includes('data-att-wa') && tools.includes('data-att-msg'));
  assert.ok(!/data-url="\$\{esc\(wa\)\}"/.test(rubric), 'bağlantı render anında sabitlenmemeli');
});

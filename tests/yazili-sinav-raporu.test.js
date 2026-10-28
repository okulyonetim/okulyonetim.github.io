/* Yazılı Sınavlar sayfası: Yazdır düğmesi + A4 "Yazılı Sınav Takvimi" raporu (tarih sırasıyla, süzgeçli, müdür onayı sağda). */
const assert=require('assert'),fs=require('fs');
const src=fs.readFileSync('js/modules/academic.js','utf8'),css=fs.readFileSync('css/design-system-base.css','utf8'),loader=fs.readFileSync('js/app-loader.js','utf8'),sw=fs.readFileSync('service-worker.js','utf8');
const bas=src.indexOf('const WRITTEN_GUNLER='),son=src.indexOf('async function printWrittenReport(');
assert(bas>0&&son>bas,'Rapor kodu bulunmalı.');
const data={
 sinavlar:[
  {id:'a',tur:'Yazılı',ders:'Matematik',siniflar:'5-B',donem:'1. Dönem',yaziliSirasi:'1. Yazılı',dersSaati:'3',ogretmenId:'o2',tarih:'2026-10-20',senaryoNo:'2'},
  {id:'b',tur:'Yazılı',ders:'Fen <b>Bilimleri</b>',siniflar:'5-A, 5-B',donem:'1. Dönem',yaziliSirasi:'1. Yazılı',dersSaati:'1',ogretmenId:'o1',tarih:'2026-10-20',senaryoNo:''},
  {id:'c',tur:'Yazılı',ders:'Türkçe',siniflar:'6-A',donem:'1. Dönem',yaziliSirasi:'2. Yazılı',dersSaati:'2',ogretmenId:'o1',tarih:'2026-10-12'},
  {id:'d',tur:'Yazılı',ders:'İngilizce',siniflar:'5-A',donem:'2. Dönem',yaziliSirasi:'1. Yazılı',dersSaati:'',ogretmenId:'',tarih:'2027-03-02'},
  {id:'e',tur:'Yazılı',ders:'Din',siniflar:'',sinif:'8-A',donem:'1. Dönem',yaziliSirasi:'1. Yazılı',tarih:''}],
 ogretmenler:[{id:'o1',ad:'Ayşe',soyad:'Kaya'},{id:'o2',ad:'Mehmet',soyad:'Demir'},{id:'m1',ad:'bilal',soyad:'baykar'}],
 okulBilgileri:[{id:'ayarlar',okulAdi:'Koruk İlk - Ortaokulu',mudurId:'m1'}]};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const make=new Function('arr','esc','teacherName','date','today','scheduleSchoolInfo','scheduleAcademicYear',src.slice(bas,son)+';return{writtenReportRows,writtenReportDoc,writtenPrincipalName}');
const R=make(t=>data[t]||[],esc,id=>{const o=data.ogretmenler.find(x=>x.id===id);return o?`${o.ad} ${o.soyad}`:'—'},v=>v?String(v).split('-').reverse().join('.'):'—',()=>'2026-10-28',()=>({okulAdi:'Koruk İlk - Ortaokulu'}),()=>'2026-2027');
const ids=f=>R.writtenReportRows(f).map(x=>x.id).join('');
assert.strictEqual(ids({}),'cbade','Tarih sırası (eskiden yeniye), aynı gün ders saatine göre; tarihsiz sona.');
assert.strictEqual(ids({donem:'1. Dönem'}),'cbae','Dönem süzgeci.');
assert.strictEqual(ids({donem:'1. Dönem',yazili:'1. Yazılı'}),'bae','Yazılı sırası süzgeci.');
assert.strictEqual(ids({sinif:'5-A'}),'bd','Sınıf süzgeci (çoklu sınıf kaydı içinden).');
assert.strictEqual(ids({sinif:'8-A'}),'e','Yalnız eski "sinif" alanı olan kayıt da bulunur.');
assert.strictEqual(ids({sinif:'9-Z'}),'','Eşleşme yoksa boş.');
assert.strictEqual(R.writtenPrincipalName(),'Bilal BAYKAR','Müdür adı: ad baş harfi büyük, soyad büyük.');

const t1=R.writtenReportDoc(R.writtenReportRows({}),{}),t2=R.writtenReportDoc(R.writtenReportRows({donem:'1. Dönem',yazili:'1. Yazılı',sinif:'5-A'}),{donem:'1. Dönem',yazili:'1. Yazılı',sinif:'5-A'});
assert.strictEqual(t1.title,'Yazılı Sınav Takvimi');
assert.strictEqual(t2.title,'5-A Sınıfı 1. Dönem 1. Yazılı Sınav Takvimi','Başlıkta "Yazılı" yinelenmez.');
assert(t1.body.includes('Dönem / Yazılı')&&!t2.body.includes('Dönem / Yazılı'),'Dönem/Yazılı sütunu yalnız süzgeç tam değilken görünür.');
assert.strictEqual(t1.ustBaslik,'2026-2027 EĞİTİM ÖĞRETİM YILI','Üst başlık: eğitim öğretim yılı.');
assert.strictEqual(t1.okulAdi,'KORUK İLK - ORTAOKULU MÜDÜRLÜĞÜ','Okul adı: müdürlük.');
assert(!t1.body.includes('kwr-baslik')&&!t1.body.includes('EĞİTİM ÖĞRETİM YILI'),'Başlık gövdede değil, rapor motorunun (logolu, özelleştirilebilir) üst bilgisinde olur.');
assert(t1.body.includes('<td class="kwr-orta kwr-nw">20.10.2026</td><td class="kwr-orta">Salı</td><td class="kwr-orta">1. ders</td>'),'Tarih, gün adı ve ders saati yazılır.');
assert(t1.body.indexOf('Türkçe')<t1.body.indexOf('Matematik')&&t1.body.indexOf('Matematik')<t1.body.indexOf('İngilizce'),'Satırlar tarih sırasında.');
assert(!t1.body.includes('<b>Bilimleri</b>')&&t1.body.includes('Fen &lt;b&gt;Bilimleri&lt;/b&gt;'),'Ders adı kaçışlanır.');
assert((t1.body.match(/<tbody>[\s\S]*<\/tbody>/)[0].match(/<tr>/g)||[]).length===5,'Her sınav bir satır.');
assert(/<div class="kwr-imza"><b>OLUR<\/b><span>28\.10\.2026<\/span><span>Bilal BAYKAR<\/span><b>Okul Müdürü<\/b><\/div>/.test(t1.body),'Müdür onayı: OLUR, tarih, ad, unvan.');
assert(t1.body.indexOf('</table>')<t1.body.indexOf('kwr-imzalar'),'İmza tablodan sonra gelir.');
assert(!/undefined|NaN|\[object/.test(t1.body+t2.body),'Çıktıda artık değer yok.');

/* Sayfa düğmesi, bağlantı, yazdırma ayarları */
assert(src.includes('data-written-print>Yazdır</button>')&&src.includes("out.querySelector('[data-written-print]')?.addEventListener('click',writtenReportModal)"),'Yazılı Sınavlar sayfasında Yazdır düğmesi olmalı ve rapor penceresini açmalı.');
const pr=src.slice(src.indexOf('async function printWrittenReport('),src.indexOf('function writtenReportModal('));
assert(/kenarBosluk:10/.test(pr)&&/akis:true/.test(pr)&&/yon:'dikey'/.test(pr),'Rapor her sayfada 10 mm üst/alt boşlukla basılır.');
assert(/logoGoster:true/.test(pr)&&/baslikGoster:true/.test(pr)&&/ustBaslik:doc\.ustBaslik/.test(pr)&&/okulAdi:doc\.okulAdi/.test(pr),'Rapor okul logolu üst bilgiyle basılır.');
assert(!/ozellestirilebilir/.test(pr),'Rapor özelleştirme penceresi önizlemeden önce açılır.');
assert(pr.includes('Seçilen ölçütlere uygun yazılı sınav yok.'),'Boş sonuçta uyarı verilir.');
/* CSS: tasarım belirteçleri + mm; müdür sağda, yazılar blok içinde ortalı */
const kwr=css.slice(css.indexOf('/* ===== A4 — Yazılı Sınav Takvimi (.kwr-*)'));
assert(!/\d(?:\.\d+)?px/.test(kwr)&&!/#[0-9a-fA-F]{3,8}\b/.test(kwr),'Rapor stilleri sabit px / renk içermemeli.');
assert(/\.kwr-imzalar\{[^}]*justify-content:flex-end/.test(kwr)&&/\.kwr-imza\{[^}]*align-items:center[^}]*text-align:center/.test(kwr),'Müdür bloğu sağ kenarda, yazılar blok içinde ortalı.');
assert(/\.kwr-tablo thead\{display:table-header-group\}/.test(kwr),'Başlık satırı her sayfada tekrarlanır.');
const mm=c=>Number((kwr.match(new RegExp('\\.'+c+'\\{width:([\\d.]+)mm\\}'))||[])[1]);
assert(mm('kwr-c-tarih')>=22&&mm('kwr-c-sira')>=11,'Tarih (gg.aa.yyyy) ve Sıra sütunları tek satıra sığacak genişlikte.');
assert(/\.kwr-tablo \.kwr-nw\{[^}]*white-space:nowrap/.test(kwr),'Tarih hücresi tek satırda kalır.');
assert(loader.includes('academic.js?v=898')&&sw.includes('academic.js?v=898'),'academic.js sürümü yenilenmeli.');
console.log('yazili-sinav-raporu: OK');

/* Koruk Asistan — TYMM gözlem formu çıktısı
 * Her form A4 yatay yeni bir sayfada başlar: MEB üst yazısı, ölçüt başlıklı tablo, imza bölümü.
 * Öğrenci sayısı bir sayfaya sığmazsa tablo sayfa sonunda bölünür ve ölçüt başlığı sonraki sayfada yinelenir (thead).
 * Çıktı ReportEngine ile yazdırılır / PDF olur.
 */
(function(global){
'use strict';
if(global.TymmPrint)return;

const core=()=>global.TymmCore;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const up=v=>String(v??'').toLocaleUpperCase('tr');
const DOT='……………………';
const ACIKLAMA='1 Geliştirilmeli • 2 Yeterli • 3 İyi • 4 Çok İyi. Ortalamanın ondalığı 0,5 ve üstüyse üst düzey, altıysa kendi düzeyi alınır.';

/* A4 yatay yazı alanı 277 mm; sıra, öğrenci no, ad, ortalama ve değerlendirme sütunları sabit, kalanı ölçütlere eşit bölünür. */
const GENISLIK={yazi:277,sira:9,no:13,ad:40,ort:15,deger:23};
GENISLIK.sabit=GENISLIK.sira+GENISLIK.no+GENISLIK.ad+GENISLIK.ort+GENISLIK.deger;

function sinifYazisi(c){
 return c.sinif&&c.sube?`${c.sinif}/${c.sube} SINIFI`:up(c.sinifAd||'')+(c.sinifAd?'':'SINIF');
}

function ustYazi(c,f){
 const donem=`${esc(c.yil)} EĞİTİM ÖĞRETİM YILI ${c.donem}. DÖNEM`;
 return`<header class="tm-head"><p>T.C.</p><p>${esc(up(c.ilce)||DOT)} KAYMAKAMLIĞI</p><p>${esc(up(c.okul)||DOT)} MÜDÜRLÜĞÜ</p><p>${donem}</p><p class="tm-class">${esc(sinifYazisi(c))} ${esc(up(c.ders))} DERSİ</p><h1 class="tm-title">${esc(core().printTitle(f))}</h1></header><p class="tm-legend">${esc(ACIKLAMA)}</p>`;
}
function tabloBasi(f){
 const n=f.olcutler.length,kolon=(GENISLIK.yazi-GENISLIK.sabit)/n;
 const cols=`<colgroup><col style="width:${GENISLIK.sira}mm"><col style="width:${GENISLIK.no}mm"><col style="width:${GENISLIK.ad}mm">${f.olcutler.map(()=>`<col style="width:${kolon.toFixed(2)}mm">`).join('')}<col style="width:${GENISLIK.ort}mm"><col style="width:${GENISLIK.deger}mm"></colgroup>`;
 const grp=f.gruplar?`<tr class="tm-grp"><th colspan="3"></th>${f.gruplar.map(g=>`<th colspan="${g.say}">${esc(g.ad)}</th>`).join('')}<th colspan="2"></th></tr>`:'';
 const baslik=`<tr><th>Sıra No</th><th>Öğrenci No</th><th class="tm-ad">Adı Soyadı</th>${f.olcutler.map(o=>`<th class="tm-oc">${esc(o.metin)} <span>(${esc(o.kod)})</span></th>`).join('')}<th>Ortalama</th><th>Değerlendirme</th></tr>`;
 return`${cols}<thead>${grp}${baslik}</thead>`;
}
function satir(c,f,o,sira){
 const k=core(),ozet=k.rowSummary(c.doc,f,o.id);
 const puan=Array.from(f.olcutler.keys(),i=>{const v=k.score(c.doc,f,o.id,i);return`<td class="tm-p">${v||''}</td>`}).join('');
 return`<tr><td class="tm-p">${sira}</td><td class="tm-p">${esc(k.studentNo(o))}</td><td class="tm-ad">${esc(k.studentName(o))}</td>${puan}<td class="tm-p">${esc(ozet.ortMetin)}</td><td class="tm-p">${esc(ozet.duzeyAd)}</td></tr>`;
}
function altYazi(c){
 return`<footer class="tm-foot"><div class="tm-sign"><b>Sınıf Öğretmeni</b><span>${esc(c.ogretmen||DOT)}</span><span>İmza: ${DOT}</span><span>Tarih: …/…/20…</span></div><div class="tm-sign tm-sign--ok"><b>UYGUNDUR</b><span>…/…/20…</span><span>${esc(c.mudur||DOT)}</span><span>Okul Müdürü</span></div></footer>`;
}
function sayfa(c,f){
 const govde=c.ogrenciler.map((o,i)=>satir(c,f,o,i+1)).join('');
 return`<section class="tm-page">${ustYazi(c,f)}<table class="tm-tbl">${tabloBasi(f)}<tbody>${govde}</tbody></table>${altYazi(c)}</section>`;
}
function html(c){return`<div class="tm-print">${c.formlar.map(f=>sayfa(c,f)).join('')}</div>`}
function dosyaAdi(c){
 const t=s=>String(s??'').replace(/[^\wÇĞİÖŞÜçğıöşü-]+/g,'_').replace(/^_+|_+$/g,'');
 return['TYMM',t(c.sinifAd),t(c.ders),c.donem+'_Donem'].filter(Boolean).join('_');
}
function print(c){
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 if(!c?.formlar?.length){global.toast?.('Yazdırılacak form yok.');return false}
 global.ReportEngine.printReport('TYMM Gözlem Formu',html(c),{fileName:dosyaAdi(c),yon:'yatay',akis:true,kenarBosluk:10,logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' '});
 return true;
}

global.TymmPrint={print,html,dosyaAdi};
})(window);

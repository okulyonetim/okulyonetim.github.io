/* Koruk Asistan — Yazılı Kâğıdı Teslim Tutanağı: saf mantık (ekrandan bağımsız, testlenir)
 * - Yazılı sınav kayıtlarından öğretmenin sınıf / ders / dönem başına miktarı: bir sınavın her sınıfı bir sayılır. Miktar birimi "top" (kâğıt destesi) ya da "adet" seçilir.
 * - Toplamlar, sayının yazıyla yazılışı ("on iki"), tarih biçimi ve A4 belge gövdesi (kâğıt stili: css/design-system-base.css .ytt-*).
 * Ekran: yazili-teslim.js. Çıktı merkezi ReportEngine ile yazdırılır / PDF alınır.
 */
(function(global){
'use strict';
if(global.YaziliTeslimCore)return;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NOKTA='………………………',NOKTA_K='………………',MIN_SATIR=3,TOP_UST=999;
/* Miktar birimi: tutanak sütun başlıkları ve özet cümlesi seçilen birimle yazılır. */
const BIRIMLER={top:{ad:'Top',baslik:'Top Sayısı',kucuk:'top'},adet:{ad:'Adet',baslik:'Adet Sayısı',kucuk:'adet'}};
const birimNormal=v=>{const k=String(v??'').trim().toLowerCase();return BIRIMLER[k]?k:'top'};

/* ── sayılar ── */
const BIRLER=['','bir','iki','üç','dört','beş','altı','yedi','sekiz','dokuz'],ONLAR=['','on','yirmi','otuz','kırk','elli','altmış','yetmiş','seksen','doksan'];
const ucHane=x=>{const y=Math.floor(x/100),o=Math.floor(x%100/10),b=x%10;return[y?(y>1?`${BIRLER[y]} `:'')+'yüz':'',ONLAR[o],BIRLER[b]].filter(Boolean).join(' ')};
/* 0–999 999 → "yüz yirmi üç"; sayılar TDK yazımıyla ayrı yazılır. */
function sayiYazi(n){
 n=Math.floor(Number(n));
 if(!Number.isFinite(n)||n<=0)return'sıfır';
 if(n>999999)return String(n);
 const bin=Math.floor(n/1000),kalan=n%1000;
 return[bin?(bin>1?`${ucHane(bin)} `:'')+'bin':'',kalan?ucHane(kalan):''].filter(Boolean).join(' ');
}
/* Giriş metni → 0–999 tam sayı (boş / geçersiz → 0). */
const topSayisi=v=>{const n=Math.floor(Number(String(v??'').trim().replace(',','.')));return Number.isFinite(n)&&n>0?Math.min(TOP_UST,n):0};
const satirToplami=r=>topSayisi(r?.d1)+topSayisi(r?.d2);
function toplamlar(satirlar){
 const l=Array.isArray(satirlar)?satirlar:[];
 const d1=l.reduce((a,r)=>a+topSayisi(r?.d1),0),d2=l.reduce((a,r)=>a+topSayisi(r?.d2),0);
 return{d1,d2,toplam:d1+d2};
}

/* ── yazılı sınav kayıtlarından satırlar ── */
const sinifListesi=s=>String(s?.siniflar||s?.sinif||'').split(',').map(x=>x.trim()).filter(Boolean);
/* Öğretmenin sınavları → [{sinif, ders, d1, d2}] (sınıf sırasıyla, sonra ders adıyla). Her sınav, seçtiği her sınıf için bir sayılır. */
function sinavSatirlari(sinavlar,ogretmenId){
 const map=new Map(),id=String(ogretmenId??'').trim();
 if(!id)return[];
 (Array.isArray(sinavlar)?sinavlar:[]).forEach(s=>{
  if(!s||String(s.ogretmenId??'')!==id)return;
  const ders=String(s.ders||'').trim(),alan=s.donem==='1. Dönem'?'d1':s.donem==='2. Dönem'?'d2':'';
  if(!ders||!alan)return;
  sinifListesi(s).forEach(sinif=>{const k=`${sinif}\u0000${ders}`,r=map.get(k)||{sinif,ders,d1:0,d2:0};r[alan]+=1;map.set(k,r)});
 });
 return[...map.values()].sort((a,b)=>a.sinif.localeCompare(b.sinif,'tr',{numeric:true,sensitivity:'base'})||a.ders.localeCompare(b.ders,'tr'));
}

/* ── metin biçimleri ── */
const tarihMetni=(iso,bos=NOKTA_K)=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));return m?`${m[3]}.${m[2]}.${m[1]}`:bos};
/* "Koruk İlk - Ortaokulu" / "… Müdürlüğü" → "KORUK İLK - ORTAOKULU MÜDÜRLÜĞÜNE" */
function muhatap(okul){
 const ad=String(okul||'').trim().toLocaleUpperCase('tr').replace(/\s*M[ÜU]D[ÜU]RL[ÜU][ĞG][ÜU](NE)?$/,'').trim();
 return`${ad||NOKTA} MÜDÜRLÜĞÜNE`;
}
/* "Matematik" → "Matematik Öğretmeni"; boşsa noktalı. */
const gorevMetni=brans=>{const b=String(brans||'').trim();return b?(/öğretmen/i.test(b)?b:`${b} Öğretmeni`):`${NOKTA_K} Öğretmeni`};
const adMetni=ad=>String(ad||'').trim()||NOKTA;

/* ── A4 belge gövdesi ── */
function imzaBlok(baslik,tarih,ad,gorev,sinif=''){
 return`<div class="ytt-imza${sinif?` ${sinif}`:''}">${baslik?`<b>${esc(baslik)}</b>`:''}<span>${esc(tarih)}</span><span>${esc(ad)}</span><span>${esc(gorev)}</span></div>`;
}
/* m: {okul, yil, belgeTarihi, ogretmen, brans, teslimAlan, teslimUnvan, teslimTarihi, birim:'top'|'adet', satirlar:[{sinif,ders,d1,d2}]} */
function belge(m={}){
 const satirlar=(Array.isArray(m.satirlar)?m.satirlar:[]).filter(r=>r&&(String(r.sinif||'').trim()||String(r.ders||'').trim()||topSayisi(r.d1)||topSayisi(r.d2)));
 const T=toplamlar(satirlar),dolu=satirlar.length>0&&T.toplam>0,bos=Math.max(0,MIN_SATIR-satirlar.length);
 const B=BIRIMLER[birimNormal(m.birim)];
 const hucre=n=>n>0?String(n):'';
 const satirHtml=satirlar.map((r,i)=>`<tr><td class="ytt-orta">${i+1}</td><td class="ytt-orta">${esc(String(r.sinif||'').trim())}</td><td>${esc(String(r.ders||'').trim())}</td><td class="ytt-orta">${hucre(topSayisi(r.d1))}</td><td class="ytt-orta">${hucre(topSayisi(r.d2))}</td><td class="ytt-orta">${hucre(satirToplami(r))}</td></tr>`).join('');
 const bosHtml=Array.from({length:bos},(_,i)=>`<tr><td class="ytt-orta">${satirlar.length+i+1}</td><td></td><td></td><td></td><td></td><td></td></tr>`).join('');
 const yil=String(m.yil||'').trim()||'……………';
 const ad=adMetni(m.ogretmen),gorev=gorevMetni(m.brans);
 const ozet=dolu
  ?`Toplam <b>${T.toplam}</b> (${esc(sayiYazi(T.toplam))}) ${B.kucuk} sınav kâğıdı teslim edilmiştir.`
  :`Toplam <b>………</b> (…………………) ${B.kucuk} sınav kâğıdı teslim edilmiştir.`;
 const kolon=['ytt-c-sira','ytt-c-sinif','','ytt-c-top','ytt-c-top','ytt-c-top'].map(c=>`<col${c?` class="${c}"`:''}>`).join('');
 return`<article class="ytt-paper">
<div class="ytt-baslik">YAZILI KÂĞIDI TESLİM TUTANAĞI</div>
<div class="ytt-muhatap">${esc(muhatap(m.okul))}</div>
<p class="ytt-govde">${esc(yil)} Eğitim-Öğretim yılı içerisinde okutmuş olduğum derslerden yapmış olduğum yazılı sınavlarına ait sınav kâğıtlarının teslim alınması için;</p>
<p class="ytt-govde">Gereğini bilgilerinize arz ederim.</p>
<div class="ytt-basvuru">${imzaBlok('',tarihMetni(m.belgeTarihi),ad,gorev)}</div>
<table class="ytt-tablo"><colgroup>${kolon}</colgroup><thead><tr><th>Sıra<br>No</th><th>Sınıf</th><th>Dersin Adı</th><th>1. Dönem Yazılı Kâğıdı<br>(${B.baslik})</th><th>2. Dönem Yazılı Kâğıdı<br>(${B.baslik})</th><th>Toplam Yazılı Kâğıdı<br>(${B.baslik})</th></tr></thead><tbody>${satirHtml}${bosHtml}<tr class="ytt-toplam"><td colspan="3" class="ytt-sag">TOPLAM</td><td class="ytt-orta">${hucre(T.d1)}</td><td class="ytt-orta">${hucre(T.d2)}</td><td class="ytt-orta">${hucre(T.toplam)}</td></tr></tbody></table>
<p class="ytt-ozet">${ozet}</p>
<div class="ytt-imzalar">${imzaBlok('Teslim Eden',tarihMetni(m.teslimTarihi),ad,gorev)}${imzaBlok('Teslim Alan',tarihMetni(m.teslimTarihi),adMetni(m.teslimAlan),String(m.teslimUnvan||'').trim()||NOKTA_K)}</div>
</article>`;
}

global.YaziliTeslimCore={sayiYazi,topSayisi,BIRIMLER,birimNormal,satirToplami,toplamlar,sinavSatirlari,tarihMetni,muhatap,gorevMetni,belge,MIN_SATIR,TOP_UST};
})(window);

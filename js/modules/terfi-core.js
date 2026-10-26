/* Koruk Asistan — Kariyer terfi hesabı (saf mantık, DOM yok)
 * Öğretmen kaydındaki derece, kademe ve son terfi tarihinden bir sonraki terfiyi hesaplar; öğretmen detayı ve İdareci Pano aynı kuralı kullanır.
 * Kural: sonraki terfi son terfiden 1 yıl sonradır. Her terfide kademe 1 artar; 3. kademeden sonra derece bir ilerler
 * (derece numarası 1 azalır, 1 en yüksektir) ve kademe 1'e döner. 1. derecede kademe 4'e kadar çıkılır; 1. derece 4. kademede terfi biter.
 */
(function(g){
'use strict';
if(g.TerfiCore)return;

const ISO=/^(\d{4})-(\d{2})-(\d{2})/;
const pad=n=>String(n).padStart(2,'0');
const num=v=>{const m=String(v??'').match(/\d+/),n=m?Number(m[0]):NaN;return Number.isFinite(n)&&n>0?n:NaN};
const isoOnly=v=>ISO.test(String(v||''))?String(v).slice(0,10):'';

/* 29 Şubat'ta alınan terfi, artık olmayan yılda 28 Şubat sayılır. */
function birYilSonra(iso){
 const m=ISO.exec(String(iso||''));if(!m)return'';
 const y=Number(m[1])+1,gun=Math.min(Number(m[3]),new Date(y,Number(m[2]),0).getDate());
 return `${y}-${m[2]}-${pad(gun)}`;
}
function ileri(derece,kademe){
 if(derece===1)return kademe>=4?null:{derece:1,kademe:kademe+1};
 return kademe>=3?{derece:derece-1,kademe:1}:{derece,kademe:kademe+1};
}
/* t: öğretmen kaydı (derece, kademeNo, sonTerfiTarihi).
 * durum: 'eksik' (derece/kademe yok) · 'bitti' (1. derece 4. kademe) · 'tarih-yok' (son terfi tarihi yok) · 'var' */
function sonraki(t){
 const derece=num(t?.derece),kademe=num(t?.kademeNo??t?.kademeDerece);
 if(!Number.isFinite(derece)||!Number.isFinite(kademe))return{durum:'eksik'};
 const mevcut={derece,kademe},sonra=ileri(derece,kademe),son=isoOnly(t?.sonTerfiTarihi);
 if(!sonra)return{durum:'bitti',mevcut,son};
 const tarih=birYilSonra(son);
 return{durum:tarih?'var':'tarih-yok',mevcut,sonra,son,tarih,dereceDegisir:sonra.derece!==derece};
}
const etiket=r=>!r?.sonra?'':r.dereceDegisir
 ?`Derece ${r.mevcut.derece} · Kademe ${r.mevcut.kademe} → Derece ${r.sonra.derece} · Kademe ${r.sonra.kademe}`
 :`Derece ${r.mevcut.derece} · Kademe ${r.mevcut.kademe} → ${r.sonra.kademe}`;

g.TerfiCore={sonraki,etiket,birYilSonra,ileri};
})(typeof window!=='undefined'?window:globalThis);

/* Koruk Asistan — Günün ayeti / hadisi / özlü sözü havuzları
 * Üç tür (ana sayfada tek kartta) her gün kendi havuzundan bir söz gösterir; seçim gün numarasına göre sıradandır (aynı gün herkes aynı sözü görür).
 * Havuz = hazır liste (gunun-sozleri-veri.js) + yöneticinin eklediği sözler. Hazır sözlerin metni / kaynağı Ayarlar'dan düzenlenir, istenmeyenler havuzdan çıkarılır.
 * Ayarlar: AppConfig.get().sozHavuzu
 *   { ayet|hadis|ozluSoz: { kapali:[hazır söz id'leri], duzenle:{ id:{metin,kaynak} }, ozel:[{metin,kaynak}] } }
 * Dashboard (kart) ve Ayarlar (havuz editörü) bu tek kaynağı kullanır.
 */
(function(global){
'use strict';
if(global.GununSozleri)return;
if(!global.GununSozleriVeri)throw new Error('Söz verisi yüklenmeden havuz kurulamaz.');
const VERI=global.GununSozleriVeri;
const TURLER=[
 {key:'ayet',baslik:'Günün Ayeti',kisa:'Ayet',aciklama:'Meal metinleri kısa tutulmuştur; kendi mealinizi “Söz ekle” ile havuza katabilir, hazır meali düzenleyebilirsiniz.'},
 {key:'hadis',baslik:'Günün Hadisi',kisa:'Hadis',aciklama:'Kaynak bilgisi hadisin geçtiği eserdir.'},
 {key:'ozluSoz',baslik:'Günün Özlü Sözü',kisa:'Özlü söz',aciklama:'Atatürk, düşünür ve atasözlerinden seçmeler; kaynağı kesin olmayan sözler “atfedilir” diye işaretlidir. Okulunuza uygun sözleri ekleyebilirsiniz.'}
];
const SINIR={metin:300,kaynak:80,ozel:300};
const str=(v,max)=>String(v??'').replace(/\s+/g,' ').trim().slice(0,max);
const turKey=k=>TURLER.some(t=>t.key===k)?k:'ayet';
const duz=v=>v&&typeof v==='object'&&!Array.isArray(v);
/* Ayarlar kaydından tek bir türün kapalı / düzenlenmiş / özel listelerini güvenli biçimde çıkarır. */
function ayar(sozHavuzu,tur){
 const t=turKey(tur),raw=duz(sozHavuzu)?sozHavuzu[t]:null,ids=new Set(VERI[t].map(x=>x[0])),duzenle={};
 if(duz(raw?.duzenle))for(const[id,v]of Object.entries(raw.duzenle)){const metin=str(v?.metin,SINIR.metin);if(ids.has(id)&&metin)duzenle[id]={metin,kaynak:str(v?.kaynak,SINIR.kaynak)}}
 return{
  kapali:Array.isArray(raw?.kapali)?[...new Set(raw.kapali.map(String).filter(id=>ids.has(id)))]:[],
  duzenle,
  ozel:Array.isArray(raw?.ozel)?raw.ozel.map(x=>({metin:str(x?.metin,SINIR.metin),kaynak:str(x?.kaynak,SINIR.kaynak)})).filter(x=>x.metin).slice(0,SINIR.ozel):[]
 };
}
/* Hazır sözler, düzenlenmemiş ilk hâliyle. */
const hazir=tur=>VERI[turKey(tur)].map(([id,metin,kaynak])=>({id,metin,kaynak,hazir:true}));
/* Editör listesi: tüm hazır sözler (düzenleme uygulanmış; kapalı / düzenlendi bayraklı) + eklenen sözler; yazım sırası korunur. */
function tumu(tur,sozHavuzu){
 const a=ayar(sozHavuzu,tur),kapali=new Set(a.kapali);
 return[
  ...hazir(tur).map(x=>{const d=a.duzenle[x.id];return{id:x.id,metin:d?d.metin:x.metin,kaynak:d?d.kaynak:x.kaynak,hazir:true,kapali:kapali.has(x.id),duzenlendi:!!d&&(d.metin!==x.metin||d.kaynak!==x.kaynak)}}),
  ...a.ozel.map((x,i)=>({id:`ozel-${i+1}`,metin:x.metin,kaynak:x.kaynak,hazir:false,kapali:false,duzenlendi:false}))
 ];
}
/* Gün sırası id'nin sabit özetine göre karıştırılır: konular art arda gelmez, bir söz eklenip çıkarılınca diğerlerinin göreli sırası değişmez. */
function ozet(s){let h=2166136261;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
/* Aktif havuz: kapatılmamış sözler, gün sırasıyla. */
function havuz(tur,sozHavuzu){
 const t=turKey(tur);
 return tumu(t,sozHavuzu).filter(x=>!x.kapali).map(x=>({...x,sira:ozet(`${t}:${x.id}`)})).sort((a,b)=>a.sira-b.sira||(a.id<b.id?-1:1)).map(({sira,...x})=>x);
}
/* Yerel takvim gününün numarası (saat dilimi kaymaz). */
const gunNo=(d=new Date())=>Math.floor(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())/864e5);
function bugun(tur,sozHavuzu,d=new Date()){const list=havuz(tur,sozHavuzu);return list.length?list[gunNo(d)%list.length]:null}
global.GununSozleri={TURLER,SINIR,ayar,hazir,tumu,havuz,gunNo,bugun};
})(window);

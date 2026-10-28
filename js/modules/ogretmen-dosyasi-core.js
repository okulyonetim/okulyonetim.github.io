/* Koruk Asistan — Öğretmen Dosyası çekirdeği (saf mantık, DOM'suz)
 * · Word şablonlarındaki {{YER_TUTUCU}} alanlarını hesap/okul bilgisiyle doldurur (JSZip, tembel).
 * · İlerleme durumu (hazır / gerekmez işaretleri, yüklenen dosyalar, eklenen maddeler) ve cihazlar arası birleştirme.
 * Ekran: ogretmen-dosyasi.js · Evrak listesi: evrak-katalog.js · Şablonlar: assets/ogretmen-dosyasi/
 */
(function(global){
'use strict';
if(global.OgretmenDosyasiCore)return;

const DOCX_TURU='application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const PDF_TURU='application/pdf';
const JSZIP_YOLU='assets/vendor/jszip.min.js';
const NOKTA='……………………………';

const upper=s=>String(s??'').replace(/\s+/g,' ').trim().toLocaleUpperCase('tr');
const xmlKac=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
/* Yalnız <w:t> içine yazılan değer: satır sonu → Word satır sonu (işaretin geçtiği <w:t> xml:space="preserve" olmalıdır). */
const xmlMetin=s=>xmlKac(s).replace(/\r?\n/g,'</w:t><w:br/><w:t xml:space="preserve">');
/* "ahmet YILMAZ" → "Ahmet YILMAZ": adlar baş harfi büyük, soyad tamamen büyük (imza biçimi). */
function imzaAd(s){
 const w=String(s||'').trim().split(/\s+/).filter(Boolean);
 if(!w.length)return'';
 const son=w.pop().toLocaleUpperCase('tr');
 return[...w.map(x=>x.charAt(0).toLocaleUpperCase('tr')+x.slice(1).toLocaleLowerCase('tr')),son].join(' ');
}
const ustMakam=(il,ilce)=>{
 const i=String(il||'').trim(),c=String(ilce||'').trim();
 if(i&&(!c||/merkez/i.test(c)))return`${upper(i)} VALİLİĞİ`;
 if(c)return`${upper(c)} KAYMAKAMLIĞI`;
 return'…………… VALİLİĞİ / KAYMAKAMLIĞI';
};
const okulMudurlugu=okul=>{
 const o=upper(okul);
 if(!o)return'……………………………… MÜDÜRLÜĞÜ';
 return/MÜDÜRLÜĞÜ$/.test(o)?o:`${o} MÜDÜRLÜĞÜ`;
};
/* Kapaktaki "Branşı" satırı: yöneticide unvan, öğretmende branş. */
const bransMetni=(unvan,brans)=>/müdür/i.test(unvan||'')?String(unvan).trim():String(brans||unvan||'').trim();
/* İmza altı görev satırı: "Sosyal Bilgiler Öğretmeni", "Müdür Yardımcısı". */
function gorevMetni(unvan,brans){
 const u=String(unvan||'').trim(),b=String(brans||'').trim();
 if(/müdür/i.test(u))return u;
 if(b)return/öğretmen/i.test(b)?b:`${b} Öğretmeni`;
 return u||'Öğretmen';
}
const tarihMetni=(d=new Date())=>d.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'});

/* Kaynak bilgiden şablon alanlarını üretir. TC kimlik no bilerek boş bırakılır (kişisel veri; elle yazılır). */
function degerler(k={}){
 const ad=imzaAd(k.ad),mudur=imzaAd(k.mudur),brans=bransMetni(k.unvan,k.brans),okul=String(k.okul||'').trim(),yil=String(k.yil||'');
 return{
  OKUL:okul||NOKTA,OKUL_BUYUK:upper(okul)||NOKTA,OKUL_MUDURLUGU:okulMudurlugu(okul),
  UST_MAKAM:ustMakam(k.il,k.ilce),IL:String(k.il||'').trim(),ILCE:String(k.ilce||'').trim(),
  AD_SOYAD:ad||NOKTA,AD_SOYAD_BUYUK:upper(ad)||NOKTA,
  BRANS:brans||NOKTA,BRANS_BUYUK:upper(brans)||NOKTA,GOREV:gorevMetni(k.unvan,k.brans),
  MUDUR:mudur||NOKTA,YIL:yil,TARIH:k.tarih||tarihMetni(),TC:''
 };
}
/* Uygulamadaki Ders Saatleri ayarından tablo satırları: ders, teneffüs ve öğle arası sırayla (Okul Raporları › Ders Giriş-Çıkış Saatleri ile aynı hesap).
 * cfg = { donemler|dersler: [{saat,baslangic,bitis}], ogleArasiVarMi, ogleArasi: {sonrakiDers,baslangic,bitis} } → [{tur:'SAAT'|'ARA', AD, GIRIS, CIKIS, SURE}] */
const dakika=s=>{const m=/^(\d{1,2}):(\d{2})$/.exec(String(s||'').trim());return m?Number(m[1])*60+Number(m[2]):NaN};
const sureMetni=(a,b)=>{const d=dakika(b)-dakika(a);return Number.isFinite(d)&&d>0?`${d} dk`:''};
function dersSaatSatirlari(cfg){
 const kaynak=Array.isArray(cfg?.donemler)&&cfg.donemler.length?cfg.donemler:Array.isArray(cfg?.dersler)?cfg.dersler:[];
 const dersler=kaynak.map((r,i)=>({saat:Number(r.saat)||i+1,bas:String(r.baslangic||'').trim(),bit:String(r.bitis||'').trim()})).filter(r=>r.bas&&r.bit);
 const satirlar=[];
 dersler.forEach((r,i)=>{
  satirlar.push({tur:'SAAT',AD:`${r.saat}. Ders`,GIRIS:r.bas,CIKIS:r.bit,SURE:sureMetni(r.bas,r.bit)});
  const s=dersler[i+1];if(!s)return;
  const ogle=cfg.ogleArasiVarMi!==false&&Number(cfg.ogleArasi?.sonrakiDers||0)===i+1;
  const a=ogle?(cfg.ogleArasi?.baslangic||r.bit):r.bit,b=ogle?(cfg.ogleArasi?.bitis||s.bas):s.bas;
  if(Number.isFinite(dakika(a))&&Number.isFinite(dakika(b))&&dakika(b)>dakika(a))satirlar.push({tur:'ARA',AD:ogle?'Öğle Arası':'Teneffüs',GIRIS:a,CIKIS:b,SURE:sureMetni(a,b)});
 });
 return satirlar;
}

/* Tekrarlanan tablo satırları: şablonda {{TUR_ALAN}} (örn. {{SAAT_AD}}, {{ARA_AD}}) içeren satır o türün örnek satırıdır.
 * gruplar: birlikte yazılan türler (her grup şablonda ayrı bir tabloya / bölüme karşılık gelir). Bir grubun örnek satırları listedeki
 * sırayla çoğaltılır (ilk örneğin yerine), grubun diğer örnek satırları silinir. Birden çok satırlık blok için her satıra ayrı tür verilir
 * ve liste blok blok dizilir (örn. ETK1, ETK2, ETK3, ETK1, ETK2, ETK3 …). */
const SATIR_GRUPLARI=[['SAAT','ARA']];
const XML_SATIR=/<w:tr[ >](?:(?!<w:tr[ >])[\s\S])*?<\/w:tr>/g;
function satirCogalt(xml,satirlar,gruplar=SATIR_GRUPLARI){
 const alan=new RegExp(`\\{\\{(${gruplar.flat().join('|')})_[A-Z0-9_]+\\}\\}`);
 const turu=tr=>(alan.exec(tr)||[])[1];
 const sablon={};
 for(const tr of String(xml).match(XML_SATIR)||[]){const t=turu(tr);if(t&&!sablon[t])sablon[t]=tr}
 const yazildi=new Set();
 return String(xml).replace(XML_SATIR,tr=>{
  const t=turu(tr);
  if(!t)return tr;
  const g=gruplar.findIndex(x=>x.includes(t));
  if(yazildi.has(g))return'';
  yazildi.add(g);
  return(satirlar||[]).filter(s=>gruplar[g].includes(s.tur)).map(s=>(sablon[s.tur]||'').replace(new RegExp(`\\{\\{${s.tur}_([A-Z0-9_]+)\\}\\}`,'g'),(_,k)=>xmlMetin(s[k]))).join('');
 });
}

/* {{ALAN}} → değer (XML'e uygun kaçışla; değerdeki satır sonları Word satır sonu olur). Bilinmeyen alan boş bırakılır; ekranda "{{…}}" görünmez. */
const xmlDoldur=(xml,v,satirlar,gruplar)=>satirCogalt(xml,satirlar,gruplar).replace(/\{\{([A-Z0-9_]+)\}\}/g,(_,k)=>xmlMetin(v[k]));
const DOLDURULAN=/^word\/(document|header\d*|footer\d*)\.xml$/;

function betikYukle(src,hazir){
 if(hazir())return Promise.resolve();
 const hata=()=>new Error('Word paketleyici yüklenemedi.');
 if(!global.AppLoader?.loadScript)return Promise.reject(hata());
 return global.AppLoader.loadScript(src).then(()=>{if(!hazir())throw hata()});
}
/* .docx şablon baytları + alanlar (+ tekrarlanan satırlar) → doldurulmuş .docx Blob.
 * donustur (isteğe bağlı): alanlar yazıldıktan sonra word/document.xml metnini değiştiren işlev (örn. imza tablosunu yeniden yazar). */
async function docxDoldur(tampon,v,satirlar,gruplar,donustur){
 await betikYukle(JSZIP_YOLU,()=>typeof global.JSZip!=='undefined');
 let paket;try{paket=await global.JSZip.loadAsync(tampon)}catch(_){throw new Error('Şablon geçerli bir Word (.docx) belgesi değil.')}
 for(const ad of Object.keys(paket.files)){
  if(!DOLDURULAN.test(ad))continue;
  let xml=xmlDoldur(await paket.file(ad).async('string'),v,satirlar,gruplar);
  if(ad==='word/document.xml'&&typeof donustur==='function')xml=donustur(xml);
  paket.file(ad,xml);
 }
 return paket.generateAsync({type:'blob',mimeType:DOCX_TURU,compression:'DEFLATE'});
}
/* İndirilecek dosya adı yalnız ASCII olur (tarayıcı ve Android kaydetme yollarında Türkçe karakterli adlar bozulabiliyor):
 * "Öğretmen Dosyası Kapağı" + "Ali VELİ" → Ogretmen_Dosyasi_Kapagi-Ali_VELI.docx */
const TR_ASCII={ç:'c',Ç:'C',ğ:'g',Ğ:'G',ı:'i',İ:'I',ö:'o',Ö:'O',ş:'s',Ş:'S',ü:'u',Ü:'U',â:'a',Â:'A',î:'i',Î:'I',û:'u',Û:'U'};
const asciiParca=s=>String(s||'').replace(/[çÇğĞıİöÖşŞüÜâÂîÎûÛ]/g,c=>TR_ASCII[c]).replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
const dosyaAdi=(ad,kisi,uzanti)=>`${[asciiParca(ad),asciiParca(kisi)].filter(Boolean).join('-')||'Dosya'}.${uzanti}`;

/* ── İlerleme durumu ──
 * durum = { m:{maddeId:{s:'h'|'g'|'',t}}, f:{dosyaId:{m,a,y,b,t,x}}, o:{ozelId:{ad,t,x}} }
 * m: işaret (h = hazır, g = bende gerekmez, '' = temizlendi) · f: yüklenen dosyalar (x = silindi) · o: eklenen maddeler (x = silindi)
 * Her anahtar kendi zaman damgasıyla (t, ms) birleşir: cihazlar arası son yazan kazanır, dosya ve madde listeleri birleşim olarak korunur. */
const bosDurum=()=>({m:{},f:{},o:{}});
function durumTemizle(x){
 const d=bosDurum();
 if(!x||typeof x!=='object')return d;
 for(const k of Object.keys(d)){
  const kaynak=x[k];if(!kaynak||typeof kaynak!=='object')continue;
  for(const [id,e] of Object.entries(kaynak)){if(id&&e&&typeof e==='object'&&Number.isFinite(Number(e.t)))d[k][id]={...e,t:Number(e.t)}}
 }
 return d;
}
function durumBirlestir(a,b){
 const x=durumTemizle(a),y=durumTemizle(b),s=bosDurum();
 for(const k of Object.keys(s)){
  for(const id of new Set([...Object.keys(x[k]),...Object.keys(y[k])])){
   const p=x[k][id],q=y[k][id];
   s[k][id]=!p?q:!q?p:(q.t>p.t?q:p);
  }
 }
 return s;
}
/* Anahtar sırasından bağımsız eşitlik (birleştirme sırası farklı olabilir). */
const sirali=d=>JSON.stringify(Object.keys(d).sort().map(k=>[k,typeof d[k]==='object'&&d[k]?sirali(d[k]):d[k]]));
const durumAyni=(a,b)=>sirali(durumTemizle(a))===sirali(durumTemizle(b));
const isaret=(d,id)=>{const s=d?.m?.[id]?.s;return s==='h'||s==='g'?s:''};
function isaretle(d,id,s,t=Date.now()){d.m[id]={s:s==='h'||s==='g'?s:'',t};return d}
const dosyalar=(d,id)=>Object.entries(d?.f||{}).filter(([,e])=>e.m===id&&!e.x).map(([i,e])=>({i,...e})).sort((p,q)=>p.t-q.t);
function dosyaEkle(d,i,e,t=Date.now()){d.f[i]={m:e.m,a:String(e.a||''),y:String(e.y||''),b:Number(e.b)||0,t};return d}
function dosyaSil(d,i,t=Date.now()){if(d.f[i])d.f[i]={...d.f[i],x:1,t};return d}
const ozeller=d=>Object.entries(d?.o||{}).filter(([,e])=>!e.x).map(([id,e])=>({id,ad:e.ad,t:e.t})).sort((p,q)=>p.t-q.t);
function ozelEkle(d,id,ad,t=Date.now()){d.o[id]={ad:String(ad||'').trim().slice(0,120),t};return d}
function ozelSil(d,id,t=Date.now()){if(d.o[id])d.o[id]={...d.o[id],x:1,t};return d}
/* Madde sayıları: "gerekmez" işaretliler toplamdan çıkar. Dosya yüklemek maddeyi "hazır" işaretler (ekran yapar); sayım yalnız işarete bakar. */
function ilerleme(maddeIdleri,d){
 let hazir=0,gerekmez=0;
 for(const id of maddeIdleri){
  const s=isaret(d,id);
  if(s==='g')gerekmez++;else if(s==='h')hazir++;
 }
 const toplam=maddeIdleri.length-gerekmez;
 return{hazir,gerekmez,toplam,yuzde:toplam?Math.round(hazir/toplam*100):0};
}
const durumAnahtari=yil=>`ogretmenDosyasi_${String(yil||'').replace(/[^0-9]+/g,'_')}`;

global.OgretmenDosyasiCore={DOCX_TURU,PDF_TURU,upper,imzaAd,ustMakam,okulMudurlugu,bransMetni,gorevMetni,tarihMetni,degerler,dersSaatSatirlari,satirCogalt,xmlDoldur,docxDoldur,dosyaAdi,
 bosDurum,durumTemizle,durumBirlestir,durumAyni,isaret,isaretle,dosyalar,dosyaEkle,dosyaSil,ozeller,ozelEkle,ozelSil,ilerleme,durumAnahtari};
})(window);

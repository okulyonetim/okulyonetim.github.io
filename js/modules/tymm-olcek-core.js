/* Koruk Asistan — TYMM ilkokul ölçekleri çekirdeği
 * DOM'suz saf mantık: katalog arama, form başlıkları, puan kaydı (kısa metin), ortalama/düzey, ilerleme.
 * Ekran: tymm-olcek.js · Çıktı: tymm-olcek-print.js · Katalog: data/tymm/{sinif}.json (scripts/tymm-pdf-katalog.py üretir)
 *
 * Puan kaydı: bir derste her öğrenci için her form tek bir kısa metindir; her ölçüt bir hane (0 boş, 1–4 puan).
 * Örnek: puanlar['tema-1']['ogr7']='3402'. Ölçüt sırası katalogdaki sıradır (kodlar bir formda tekrar edebilir).
 */
(function(global){
'use strict';
if(global.TymmCore)return;

const SURUM=1;
const PUANLAR=[{n:1,ad:'Geliştirilmeli'},{n:2,ad:'Yeterli'},{n:3,ad:'İyi'},{n:4,ad:'Çok İyi'}];
const DONEMLER=[{n:1,ad:'1. Dönem'},{n:2,ad:'2. Dönem'}];
const SINIFLAR=[1,2,3,4];

const str=(v,n=200)=>String(v??'').trim().slice(0,n);
const pad=n=>String(n).padStart(2,'0');
function isoDay(d=new Date()){return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
/* Eğitim öğretim yılı: Ağustos'tan itibaren yeni yıl sayılır. */
function schoolYear(d=new Date()){const y=d.getFullYear(),m=d.getMonth();return m>=7?`${y}-${y+1}`:`${y-1}-${y}`}
/* Dönem: Eylül–Ocak 1. dönem, Şubat–Haziran 2. dönem. */
function currentTerm(d=new Date()){const m=d.getMonth();return m>=1&&m<=7?2:1}

/* ── sınıf / öğrenci ── */
function gradeOf(v){const m=String(v??'').match(/\d+/),n=m?Number(m[0]):0;return n>=1&&n<=12?n:0}
function classGrade(c){return gradeOf(c?.seviye)||gradeOf(c?.ad??c?.sinifAdi??c?.sinif)}
function classLabel(c){return str(c?.ad??c?.sinifAdi??c?.sinif,40)}
function branchOf(label){const m=String(label??'').match(/(?:^|[\s\d\-/.])([A-ZÇĞİÖŞÜ])\s*$/i);return m?m[1].toLocaleUpperCase('tr'):''}
/* Yalnız 1–4. sınıflar; kademe bilgisi olmayan sınıf adından anlaşılır. */
const isPrimary=c=>{const g=classGrade(c);return g>=1&&g<=4};
function studentName(v){return str(v?.ogrenciAdi||v?.adSoyad||[v?.ad,v?.soyad].filter(Boolean).join(' ')||'Öğrenci',120)}
function studentNo(v){return str(v?.ogrenciNo??v?.no,20)}
function sortStudents(list){
 return[...list].sort((a,b)=>{
  const an=Number(studentNo(a))||0,bn=Number(studentNo(b))||0;
  if(an!==bn&&an&&bn)return an-bn;
  if(!an!==!bn)return an?-1:1;
  return studentName(a).localeCompare(studentName(b),'tr');
 });
}

/* ── katalog ── */
const termOf=(cat,donem)=>cat?.donemler?.[String(donem)]||null;
const coursesOf=(cat,donem)=>termOf(cat,donem)?.dersler||[];
const courseOf=(cat,donem,key)=>coursesOf(cat,donem).find(d=>d.key===key)||null;
const formOf=(course,key)=>course?.formlar?.find(f=>f.key===key)||null;
const criteriaCount=course=>(course?.formlar||[]).reduce((n,f)=>n+f.olcutler.length,0);

/* Ekran başlığı: {etiket:'1. Tema', ad:'MÜZİK DİLİ', parca:'Dinleme · 1/2'} */
function formLabel(f){
 const no=f.no||0;
 let etiket='';
 if(f.tur==='tema')etiket=no?`${no}. Tema`:'Tema';
 else if(f.tur==='ünite')etiket=no?`${no}. Ünite`:'Ünite';
 else if(f.tur==='alan')etiket=`${f.harf||no}. Öğrenme Alanı`;
 else if(f.tur==='konu')etiket=`${no}. Konu`;
 const parca=f.parca?[f.parcaAd?capital(f.parcaAd):'',`${f.parca[0]}/${f.parca[1]}`].filter(Boolean).join(' · '):'';
 return{etiket,ad:f.ad,parca,alt:f.alt||''};
}
function capital(s){const t=String(s||'').toLocaleLowerCase('tr');return t.charAt(0).toLocaleUpperCase('tr')+t.slice(1)}
function formText(f){const l=formLabel(f);return[l.etiket,l.ad,l.parca].filter(Boolean).join(' · ')}
/* Basılı form başlığı, MEB gözlem formundaki yazımla. */
function printTitle(f){
 const no=f.no||0,q=t=>`“${t}”`;
 let h;
 if(f.tur==='tema')h=no?`${no}. TEMA ${q(f.ad)}`:`${q(f.ad)} TEMASI`;
 else if(f.tur==='ünite')h=no?`${no}. ÜNİTE ${q(f.ad)}`:`${q(f.ad)} ÜNİTESİ`;
 else if(f.tur==='alan')h=`${f.harf||no}. ÖĞRENME ALANI ${q(f.ad)}`;
 else if(f.tur==='konu')h=`${no}. KONU ${q(f.ad)}`;
 else h=f.ad;
 const parts=[h];
 if(f.parcaAd)parts.push(f.parcaAd);
 if(f.alt)parts.push(f.alt);
 let t=parts.join(' – ')+' – GÖZLEM FORMU';
 if(f.parca)t+=` (${f.parca[0]}/${f.parca[1]})`;
 if(f.not)t+=` (${f.not})`;
 return t;
}

/* ── puan kaydı ── */
const safe=v=>String(v??'').replace(/[^\w.-]+/g,'_').slice(0,80);
function docId({sahipUid,sinifId,yil,donem,ders}){return['tymm',safe(sahipUid),safe(sinifId),safe(yil),String(donem),safe(ders)].join('.')}
function blank(ctx={}){
 const d={
  surum:SURUM,sahipUid:str(ctx.sahipUid,80),sinifId:str(ctx.sinifId,80),sinifAd:str(ctx.sinifAd,40),
  sinif:gradeOf(ctx.sinif)||gradeOf(ctx.sinifAd),sube:str(ctx.sube,10),yil:str(ctx.yil,12)||schoolYear(),
  donem:Number(ctx.donem)===2?2:1,ders:str(ctx.ders,40),puanlar:{},olusturma:ctx.olusturma||new Date().toISOString(),guncelleme:ctx.guncelleme||''
 };
 d.id=str(ctx.id,200)||docId(d);
 return d;
}
/* Kayıtlı dosyayı okur: bozuk haneleri ayıklar, katalog değiştiyse uzunluğu ölçüt sayısına getirir. */
function normalize(raw,course){
 const d=blank({...raw,sahipUid:raw?.sahipUid,id:raw?.id});
 d.olusturma=str(raw?.olusturma,40)||d.olusturma;d.guncelleme=str(raw?.guncelleme,40);
 const src=raw?.puanlar&&typeof raw.puanlar==='object'?raw.puanlar:{};
 for(const f of course?.formlar||[]){
  const byStudent=src[f.key];if(!byStudent||typeof byStudent!=='object')continue;
  const n=f.olcutler.length,out={};
  for(const [ogr,v] of Object.entries(byStudent)){
   const s=String(v??'').replace(/[^0-4]/g,'0').slice(0,n).padEnd(n,'0');
   if(/[1-4]/.test(s))out[ogr]=s;
  }
  if(Object.keys(out).length)d.puanlar[f.key]=out;
 }
 if(!course)d.puanlar=src;
 return d;
}
const cells=(d,f,ogr)=>{const s=d?.puanlar?.[f.key]?.[ogr];return s&&s.length===f.olcutler.length?s:'0'.repeat(f.olcutler.length)};
function score(d,f,ogr,i){return Number(cells(d,f,ogr)[i])||0}
function store(d,f,ogr,s){
 if(/[1-4]/.test(s)){(d.puanlar[f.key]??={})[ogr]=s}
 else if(d.puanlar[f.key]){delete d.puanlar[f.key][ogr];if(!Object.keys(d.puanlar[f.key]).length)delete d.puanlar[f.key]}
}
function setScore(d,f,ogr,i,v){
 const n=f.olcutler.length;if(!(i>=0&&i<n))return d;
 const p=[...cells(d,f,ogr)];p[i]=String(Math.max(0,Math.min(4,Number(v)||0)));store(d,f,ogr,p.join(''));return d;
}
function fillRow(d,f,ogr,v){store(d,f,ogr,String(Math.max(0,Math.min(4,Number(v)||0))).repeat(f.olcutler.length));return d}
function fillColumn(d,f,ogrIds,i,v){for(const o of ogrIds)setScore(d,f,o,i,v);return d}
function clearForm(d,f,ogrIds){
 if(!ogrIds){delete d.puanlar[f.key];return d}
 for(const o of ogrIds)store(d,f,o,'');
 return d;
}

/* ── ortalama ve düzey ── */
/* Ortalamanın ondalığı 0,5 ve üstüyse üst düzey, altıysa kendi düzeyi (tam sayı hesabıyla, kayan nokta hatası olmaz). */
function level(sum,count){
 if(!count)return 0;
 const base=Math.floor(sum/count),rest=sum-base*count;
 return Math.max(1,Math.min(4,base+(rest*2>=count?1:0)));
}
const levelName=n=>PUANLAR.find(p=>p.n===n)?.ad||'';
function avgText(sum,count){
 if(!count)return'';
 return(Math.round(sum/count*100)/100).toLocaleString('tr-TR',{minimumFractionDigits:0,maximumFractionDigits:2});
}
function rowSummary(d,f,ogr){
 const s=cells(d,f,ogr);let sum=0,count=0;
 for(const ch of s){const n=Number(ch);if(n){sum+=n;count++}}
 const total=f.olcutler.length,lv=level(sum,count);
 return{dolu:count,toplam:total,tam:count===total,ort:count?sum/count:null,ortMetin:avgText(sum,count),duzey:lv,duzeyAd:levelName(lv)};
}
function formProgress(d,f,ogrIds){
 let dolu=0;for(const o of ogrIds)for(const ch of cells(d,f,o))if(ch!=='0')dolu++;
 return{dolu,toplam:ogrIds.length*f.olcutler.length};
}
function courseProgress(d,course,ogrIds){
 let dolu=0,toplam=0;
 for(const f of course?.formlar||[]){const p=formProgress(d,f,ogrIds);dolu+=p.dolu;toplam+=p.toplam}
 return{dolu,toplam,yuzde:toplam?Math.round(dolu/toplam*100):0};
}
/* Sütun ortalaması (ölçütün sınıf ortalaması). */
function columnAverage(d,f,ogrIds,i){
 let sum=0,count=0;for(const o of ogrIds){const n=score(d,f,o,i);if(n){sum+=n;count++}}
 return{ort:count?sum/count:null,ortMetin:avgText(sum,count),say:count};
}

global.TymmCore={
 SURUM,PUANLAR,DONEMLER,SINIFLAR,schoolYear,currentTerm,isoDay,
 gradeOf,classGrade,classLabel,branchOf,isPrimary,studentName,studentNo,sortStudents,
 termOf,coursesOf,courseOf,formOf,criteriaCount,formLabel,formText,printTitle,capital,
 docId,blank,normalize,score,setScore,fillRow,fillColumn,clearForm,cells,
 level,levelName,avgText,rowSummary,formProgress,courseProgress,columnAverage
};
})(typeof window!=='undefined'?window:globalThis);

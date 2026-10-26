/* Koruk Asistan — BEP (Bireyselleştirilmiş Eğitim Programı) çekirdeği
 * DOM'suz saf mantık: kayıt şeması, kazanım düzleştirme, amaç üretme, doğrulama, özet.
 * Ekran: bep.js · Çıktı: bep-print.js · Katalog: data/bep/index.json ve data/bep/dersler/*.json
 */
(function(global){
'use strict';
if(global.BepCore)return;

const SURUM=2;
const LIMIT={metin:2000,kisa:160,ders:12,amac:60,kda:12,ekip:10,secenek:30};
const OLCUTLER=['%60 (3/5)','%80 (4/5)','%100 (5/5)'];
const ADIMLAR=[
 {id:'ogrenci',ad:'Öğrenci'},
 {id:'performans',ad:'Performans'},
 {id:'amaclar',ad:'Amaçlar'},
 {id:'duzenleme',ad:'Düzenleme'},
 {id:'ekip',ad:'Ekip'},
 {id:'cikti',ad:'Çıktı'}
];
const DURUMLAR=[{id:'',ad:'Başlanmadı'},{id:'devam',ad:'Devam ediyor'},{id:'tamam',ad:'Kazandı'}];

const str=(v,n=LIMIT.metin)=>String(v??'').replace(/\r\n?/g,'\n').trim().slice(0,n);
const uniq=a=>[...new Set((Array.isArray(a)?a:[]).map(x=>str(x,LIMIT.kisa)).filter(Boolean))].slice(0,LIMIT.secenek);
const tr=v=>String(v??'').toLocaleLowerCase('tr');
const pad=n=>String(n).padStart(2,'0');
function rid(p){return`${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2,7)}`}
function isoDay(d=new Date()){return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function isoOk(v){return/^\d{4}-\d{2}-\d{2}$/.test(String(v||''))&&!Number.isNaN(new Date(v+'T00:00:00').getTime())}
function trDate(v){if(!isoOk(v))return'';const[y,m,d]=v.split('-');return`${d}.${m}.${y}`}
/* Eğitim öğretim yılı: Ağustos'tan itibaren yeni yıl sayılır (okullar Eylül'de açılır). */
function schoolYear(d=new Date()){const y=d.getFullYear(),m=d.getMonth();return m>=7?`${y}-${y+1}`:`${y-1}-${y}`}
function gradeOf(v){const m=String(v??'').match(/\d+/);const n=m?Number(m[0]):0;return n>=1&&n<=12?n:0}

/* ── katalog ── */
function kademeOf(index,grade){
 for(const k of index?.kademeler||[])for(const g of k.gruplar||[])if(gradeOf(g.ad)===grade)return{kademe:k.ad,grup:g};
 return null;
}
function gradeList(index){
 const out=[];
 for(const k of index?.kademeler||[])for(const g of k.gruplar||[]){const n=gradeOf(g.ad);if(n)out.push({sinif:n,ad:g.ad,kademe:k.ad,dersSayisi:(g.dersler||[]).length})}
 return out.sort((a,b)=>a.sinif-b.sinif);
}
function coursesOf(index,grade){
 const hit=kademeOf(index,grade);if(!hit)return[];
 return(hit.grup.dersler||[]).map(d=>({key:d.f,ad:d.ad,dosya:d.dosya,sinif:grade,kademe:hit.kademe,grup:hit.grup.ad,kazanim:d.ks||d.n||0}))
  .sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));
}
function courseKey(sinif,ad){return`${sinif}-${tr(ad).replace(/[^a-z0-9ğüşıöç]+/g,'-').replace(/^-|-$/g,'')}`}

/* ders dosyası → [{ad, kazanimlar:[{kod,metin,alt[]}]}] */
function unitsOf(ders){
 return(ders?.u||[]).map(u=>({
  ad:str(u.ad||u.n||'Ünite',LIMIT.kisa),
  kazanimlar:(u.a||[]).map(x=>({kod:str(x.k||x.kod,60),metin:str(x.m||x.ad,400),alt:(x.s||[]).map(s=>str(s,400)).filter(Boolean)})).filter(x=>x.metin)
 })).filter(u=>u.kazanimlar.length);
}
function filterUnits(units,q){
 const t=tr(q).trim();if(!t)return units;
 return units.map(u=>({ad:u.ad,kazanimlar:u.kazanimlar.filter(x=>tr(`${x.kod} ${x.metin} ${u.ad}`).includes(t))})).filter(u=>u.kazanimlar.length);
}

/* ── kayıt ── */
function emptyVarsayilan(){return{yontem:[],materyal:[],olcut:OLCUTLER[1],baslangic:'',bitis:''}}
function makeGoal(item,unite,def={}){
 const d={...emptyVarsayilan(),...def};
 return{
  id:rid('a'),kod:str(item.kod,60),unite:str(unite,LIMIT.kisa),uda:str(item.metin,600),
  kda:(item.alt||[]).slice(0,LIMIT.kda).map(m=>({id:rid('k'),metin:str(m,400)})),
  yontem:uniq(d.yontem),materyal:uniq(d.materyal),olcut:OLCUTLER.includes(d.olcut)?d.olcut:OLCUTLER[1],
  baslangic:isoOk(d.baslangic)?d.baslangic:'',bitis:isoOk(d.bitis)?d.bitis:'',durum:'',not:''
 };
}
function manualGoal(def={}){return makeGoal({kod:'',metin:'',alt:[]},'',def)}
function blank(ctx={}){
 const now=new Date().toISOString();
 return normalize({
  id:ctx.id||'',sahipUid:ctx.uid||'',olusturanAd:ctx.ad||'',olusturma:now,guncelleme:now,
  yil:schoolYear(),okul:ctx.okul||'',
  ogrenci:{adSoyad:'',sinif:'',sube:'',no:'',dogum:'',tani:[],taniNot:'',raporTarihi:'',raporKurum:''},
  performans:{guclu:'',ilgi:'',gereksinim:'',genel:''},
  duzenleme:{ortam:'',sinav:'',destek:'',davranis:'',aile:''},
  varsayilan:emptyVarsayilan(),
  dersler:[],
  ekip:ctx.ekip||defaultTeam(ctx.mudur||'',ctx.ogretmen||''),
  toplanti:{tarih:isoDay(),yer:'',sonraki:''}
 });
}
function defaultTeam(mudur='',ogretmen=''){
 return[
  {unvan:'Okul Müdürü / Müdür Yardımcısı',ad:str(mudur,LIMIT.kisa)},
  {unvan:'Sınıf / Şube Öğretmeni',ad:str(ogretmen,LIMIT.kisa)},
  {unvan:'Rehber Öğretmen',ad:''},
  {unvan:'Veli',ad:''}
 ];
}
function normGoal(a){
 return{
  id:str(a?.id,40)||rid('a'),kod:str(a?.kod,60),unite:str(a?.unite,LIMIT.kisa),uda:str(a?.uda,600),
  kda:(Array.isArray(a?.kda)?a.kda:[]).slice(0,LIMIT.kda).map(k=>({id:str(k?.id,40)||rid('k'),metin:str(k?.metin,400)})),
  yontem:uniq(a?.yontem),materyal:uniq(a?.materyal),olcut:OLCUTLER.includes(a?.olcut)?a.olcut:OLCUTLER[1],
  baslangic:isoOk(a?.baslangic)?a.baslangic:'',bitis:isoOk(a?.bitis)?a.bitis:'',
  durum:['devam','tamam'].includes(a?.durum)?a.durum:'',not:str(a?.not,400)
 };
}
function normalize(r){
 r=r&&typeof r==='object'?r:{};
 const o=r.ogrenci||{},p=r.performans||{},d=r.duzenleme||{},v=r.varsayilan||{},t=r.toplanti||{};
 return{
  surum:SURUM,id:str(r.id,60),sahipUid:str(r.sahipUid,80),olusturanAd:str(r.olusturanAd,LIMIT.kisa),
  olusturma:str(r.olusturma,40),guncelleme:str(r.guncelleme,40),
  yil:/^\d{4}-\d{4}$/.test(r.yil||'')?r.yil:schoolYear(),okul:str(r.okul,LIMIT.kisa),
  ogrenci:{
   adSoyad:str(o.adSoyad,LIMIT.kisa),sinif:gradeOf(o.sinif)?String(gradeOf(o.sinif)):'',sube:str(o.sube,12),no:str(o.no,20),
   dogum:isoOk(o.dogum)?o.dogum:'',tani:uniq(o.tani),taniNot:str(o.taniNot,600),raporTarihi:isoOk(o.raporTarihi)?o.raporTarihi:'',raporKurum:str(o.raporKurum,LIMIT.kisa)
  },
  performans:{guclu:str(p.guclu),ilgi:str(p.ilgi),gereksinim:str(p.gereksinim),genel:str(p.genel)},
  duzenleme:{ortam:str(d.ortam),sinav:str(d.sinav),destek:str(d.destek),davranis:str(d.davranis),aile:str(d.aile)},
  varsayilan:{yontem:uniq(v.yontem),materyal:uniq(v.materyal),olcut:OLCUTLER.includes(v.olcut)?v.olcut:OLCUTLER[1],baslangic:isoOk(v.baslangic)?v.baslangic:'',bitis:isoOk(v.bitis)?v.bitis:''},
  dersler:(Array.isArray(r.dersler)?r.dersler:[]).slice(0,LIMIT.ders).map(x=>({
   key:str(x?.key,80),ad:str(x?.ad,LIMIT.kisa),sinif:gradeOf(x?.sinif)?String(gradeOf(x.sinif)):'',kademe:str(x?.kademe,30),dosya:str(x?.dosya,100),
   performans:str(x?.performans,800),amaclar:(Array.isArray(x?.amaclar)?x.amaclar:[]).slice(0,LIMIT.amac).map(normGoal)
  })).filter(x=>x.ad),
  ekip:(Array.isArray(r.ekip)?r.ekip:[]).slice(0,LIMIT.ekip).map(x=>({unvan:str(x?.unvan,LIMIT.kisa),ad:str(x?.ad,LIMIT.kisa)})).filter(x=>x.unvan||x.ad),
  toplanti:{tarih:isoOk(t.tarih)?t.tarih:'',yer:str(t.yer,LIMIT.kisa),sonraki:isoOk(t.sonraki)?t.sonraki:''}
 };
}

/* ── ders / amaç işlemleri (kayıt üzerinde yerinde çalışır, aynı kaydı döndürür) ── */
function addCourse(rec,course){
 if(rec.dersler.length>=LIMIT.ders)return null;
 const ex=rec.dersler.find(x=>x.key===course.key);if(ex)return ex;
 const c={key:course.key,ad:course.ad,sinif:String(course.sinif),kademe:course.kademe||'',dosya:course.dosya||'',performans:'',amaclar:[]};
 rec.dersler.push(c);return c;
}
function removeCourse(rec,key){rec.dersler=rec.dersler.filter(x=>x.key!==key)}
function hasGoal(course,kod,uda){return course.amaclar.some(a=>(kod&&a.kod===kod)||(!kod&&a.uda===uda))}
function addGoal(rec,course,item,unite){
 if(course.amaclar.length>=LIMIT.amac||hasGoal(course,item.kod,item.metin))return null;
 const g=makeGoal(item,unite,rec.varsayilan);course.amaclar.push(g);return g;
}
function removeGoal(course,id){course.amaclar=course.amaclar.filter(a=>a.id!==id)}
function applyDefaults(rec,fields=['yontem','materyal','olcut','baslangic','bitis']){
 rec.dersler.forEach(c=>c.amaclar.forEach(a=>fields.forEach(f=>{
  const v=rec.varsayilan[f];
  if(Array.isArray(v)){if(v.length)a[f]=uniq(v)}else if(v)a[f]=v;
 })));
 return rec;
}
function moveItem(list,i,delta){const j=i+delta;if(i<0||j<0||i>=list.length||j>=list.length)return list;const[x]=list.splice(i,1);list.splice(j,0,x);return list}

/* ── doğrulama / özet ── */
function goalCount(rec){return rec.dersler.reduce((n,c)=>n+c.amaclar.length,0)}
function kdaCount(rec){return rec.dersler.reduce((n,c)=>n+c.amaclar.reduce((m,a)=>m+a.kda.filter(k=>k.metin).length,0),0)}
function titleOf(rec){
 const o=rec.ogrenci||{},sinif=o.sinif?`${o.sinif}${o.sube?'/'+o.sube:'. Sınıf'}`:'';
 return[o.adSoyad||'İsimsiz öğrenci',sinif,rec.yil].filter(Boolean).join(' · ');
}
/* Her adımın durumu: 'tamam' | 'eksik' | 'bos' ; eksikler ileti listesiyle gelir. */
function check(rec){
 const issues=[],add=(adim,m)=>issues.push({adim,ileti:m});
 const o=rec.ogrenci;
 if(!o.adSoyad)add('ogrenci','Öğrencinin adı soyadı yazılmamış.');
 if(!o.sinif)add('ogrenci','Sınıf seçilmemiş.');
 if(!o.tani.length&&!o.taniNot)add('ogrenci','Tanı veya özel eğitim gereksinimi belirtilmemiş.');
 if(!rec.performans.guclu&&!rec.performans.gereksinim&&!rec.performans.genel)add('performans','Eğitsel performans düzeyi boş.');
 if(!rec.dersler.length)add('amaclar','Henüz ders seçilmemiş.');
 rec.dersler.forEach(c=>{
  if(!c.amaclar.length)add('amaclar',`${c.ad}: kazanım seçilmemiş.`);
  c.amaclar.forEach(a=>{
   if(!a.uda)add('amaclar',`${c.ad}: boş bir uzun dönemli amaç var.`);
   else if(!a.kda.some(k=>k.metin))add('amaclar',`${c.ad} · ${a.kod||a.uda.slice(0,40)}: kısa dönemli amaç yok.`);
   if(a.baslangic&&a.bitis&&a.bitis<a.baslangic)add('amaclar',`${c.ad} · ${a.kod||a.uda.slice(0,40)}: bitiş tarihi başlangıçtan önce.`);
  });
 });
 if(!rec.duzenleme.ortam&&!rec.duzenleme.sinav&&!rec.duzenleme.destek)add('duzenleme','Eğitim ortamı ve sınav düzenlemeleri boş.');
 if(!rec.ekip.some(x=>x.ad))add('ekip','BEP ekibinde adı yazılı kimse yok.');
 return issues;
}
function stepStates(rec){
 const issues=check(rec),by=id=>issues.filter(x=>x.adim===id).length;
 const has={
  ogrenci:!!rec.ogrenci.adSoyad,
  performans:!!(rec.performans.guclu||rec.performans.gereksinim||rec.performans.genel||rec.performans.ilgi),
  amaclar:goalCount(rec)>0,
  duzenleme:!!(rec.duzenleme.ortam||rec.duzenleme.sinav||rec.duzenleme.destek||rec.duzenleme.davranis||rec.duzenleme.aile),
  ekip:rec.ekip.some(x=>x.ad),
  cikti:issues.length===0
 };
 const out={};
 ADIMLAR.forEach(s=>{out[s.id]=s.id==='cikti'?(issues.length?'eksik':'tamam'):!has[s.id]?'bos':by(s.id)?'eksik':'tamam'});
 return out;
}
function summary(rec){return{ders:rec.dersler.length,amac:goalCount(rec),kda:kdaCount(rec),eksik:check(rec).length}}
function matches(rec,q){
 const t=tr(q).trim();if(!t)return true;
 return tr([rec.ogrenci.adSoyad,rec.ogrenci.sinif,rec.ogrenci.sube,rec.ogrenci.no,rec.yil,...rec.ogrenci.tani,...rec.dersler.map(c=>c.ad)].join(' ')).includes(t);
}
function fileName(rec){
 const base=[rec.ogrenci.adSoyad||'BEP',rec.ogrenci.sinif?rec.ogrenci.sinif+'-sinif':'',rec.yil].filter(Boolean).join(' ');
 return'BEP '+base.replace(/[\\/:*?"<>|]+/g,' ').replace(/\s+/g,' ').trim();
}

global.BepCore={
 SURUM,LIMIT,OLCUTLER,ADIMLAR,DURUMLAR,
 schoolYear,gradeOf,isoOk,isoDay,trDate,tr,rid,
 gradeList,coursesOf,courseKey,unitsOf,filterUnits,
 blank,defaultTeam,normalize,makeGoal,manualGoal,
 addCourse,removeCourse,addGoal,removeGoal,hasGoal,applyDefaults,moveItem,
 check,stepStates,summary,goalCount,kdaCount,titleOf,matches,fileName
};
})(window);

/* Koruk Asistan — İdareci Pano: saf mantık (DOM yok)
 * Okulun anlık durumunu tek bir model hâlinde üretir: şu an, nöbetçiler, gelmeyenler, sınıflarda şu an, öğretmen durumu,
 * ders programı tablosu, takvim, terfisi yaklaşanlar, belirli günler, yaklaşanlar, sınıf rehber öğretmenleri.
 * Ekran: idareci-pano.js · Veri: AppStore koleksiyonları (ogretmenler, siniflar, dersProgrami, nobetAtamalari, nobetYerleri,
 * ogretmenIzinleri, sinavlar, denemeSinavlari, toplantiCizelgesi) ve SchoolLiveStatus.status() çıktısı olduğu gibi verilir.
 */
(function(g){
'use strict';
if(g.IdareciPanoCore)return;

const GUNLER=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const AYLAR=['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık'];
const arr=v=>Array.isArray(v)?v:[];
const pad=n=>String(n).padStart(2,'0');
const fold=v=>String(v??'').toLocaleLowerCase('tr').replace(/ı/g,'i').replace(/ş/g,'s').replace(/ğ/g,'g').replace(/ü/g,'u').replace(/ö/g,'o').replace(/ç/g,'c').trim();
const isoOf=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const ISO=/^(\d{4})-(\d{2})-(\d{2})/;
function parseIso(s){const m=ISO.exec(String(s||''));return m?new Date(Number(m[1]),Number(m[2])-1,Number(m[3])):null}
/* a − b gün farkı (ISO tarihler) */
function dayDiff(a,b){const x=parseIso(a),y=parseIso(b);return x&&y?Math.round((x-y)/864e5):NaN}
const dm=iso=>{const d=parseIso(iso);return d?`${d.getDate()} ${AYLAR[d.getMonth()]}`:''};
function rangeText(a,b){
 const x=parseIso(a),y=parseIso(b||a);
 if(!x)return'';
 if(!y||isoOf(x)===isoOf(y))return dm(a);
 if(x.getMonth()===y.getMonth()&&x.getFullYear()===y.getFullYear())return `${x.getDate()}–${y.getDate()} ${AYLAR[y.getMonth()]}`;
 return `${dm(a)} – ${dm(b)}`;
}
const kalanText=n=>n<=0?'Bugün':n===1?'Yarın':`${n} gün`;
function hmSec(sec){
 if(!Number.isFinite(Number(sec)))return'';
 const s=((Math.round(Number(sec))%86400)+86400)%86400;
 return `${pad(Math.floor(s/3600))}:${pad(Math.floor((s%3600)/60))}`;
}

/* ── öğretmen / ders / sınıf yardımcıları ── */
const teacherName=t=>String(t?.adSoyad||[t?.ad,t?.soyad].filter(Boolean).join(' ')||'').trim();
const periodOf=x=>Number(x?.saat??x?.dersSaati);
const classLabel=x=>String(x?.sinif||x?.sinifAdi||x?.sube||'').trim();
const lessonLabel=x=>String(x?.ders||x?.dersAdi||x?.brans||'Ders').trim();
const teacherMap=data=>{const m=new Map();arr(data?.ogretmenler).forEach(t=>{if(t&&t.id!=null)m.set(String(t.id),t)});return m};
function lessonTeacher(row,tmap){
 const direct=String(row?.ogretmenAdSoyad||row?.ogretmenAdi||'').trim();
 return direct||teacherName(tmap.get(String(row?.ogretmenId)))||'Öğretmen';
}
const classSort=(a,b)=>String(a?.ad||'').localeCompare(String(b?.ad||''),'tr',{numeric:true});
const classMatch=(row,cls)=>String(row?.sinifId||'')===String(cls?.id)||(!!classLabel(row)&&fold(classLabel(row))===fold(cls?.ad));
const activeTeachers=data=>arr(data?.ogretmenler).filter(t=>t&&t.aktif!==false);
const lessonsOn=(data,dayIdx)=>arr(data?.dersProgrami).filter(x=>x&&fold(x.gun)===fold(GUNLER[dayIdx]));

/* ── izinler ── */
const leaveStart=x=>String(x?.baslangic||x?.baslangicTarihi||x?.tarih||'').slice(0,10);
const leaveEnd=x=>{const a=leaveStart(x);return String(x?.bitis||x?.bitisTarihi||x?.tarih||a).slice(0,10)};
const leaveKind=x=>String(x?.tur||x?.izinTuru||x?.raporTuru||'').trim();
function activeLeaves(data,todayIso){
 return arr(data?.ogretmenIzinleri).filter(x=>{const a=leaveStart(x),b=leaveEnd(x);return a&&a<=todayIso&&(!b||b>=todayIso)});
}

/* ── nöbet ── */
function dutyPlace(x,data){return String(x?.yerAdi||arr(data?.nobetYerleri).find(y=>String(y.id)===String(x?.yerId))?.ad||'')}
function isDutyChief(x,data){
 const y=fold(dutyPlace(x,data)),r=fold(x?.rol||x?.gorev||x?.tur||'');
 if(r.includes('mudur')||r.includes('idareci')||r.includes('sorumlu'))return true;
 return y.includes('mudur yardimci')||y.includes('mudur yrd')||y.includes('idare')||y==='mudur'||y==='mudurluk';
}
function placeRank(v){const n=fold(v);return n.includes('bahce')?0:(n.includes('bina')||n.includes('kat')||n.includes('koridor'))?1:(n.includes('mudur')||n.includes('idare'))?3:2}

/* ── şu anki ders dilimi ── */
function periodInfo(live){
 if(live?.mode==='lesson'&&Number(live.period)>0)return{p:Number(live.period),label:`${live.period}. ders`,now:true};
 if(['break','lunch','before','idle'].includes(live?.mode)&&Number(live.nextPeriod)>0)return{p:Number(live.nextPeriod),label:`Sıradaki: ${live.nextPeriod}. ders`,now:false};
 return null;
}
function liveView(live){
 const segs=arr(live?.segments),next=segs[Number(live?.index)+1]||null;
 const nextView=next?{label:next.type==='lesson'?`${next.period}. Ders`:(next.label||'Teneffüs'),aralik:`${hmSec(next.start)} – ${hmSec(next.end)}`}:null;
 const mode=String(live?.mode||'empty');
 const timed=Number.isFinite(Number(live?.remaining))&&Number.isFinite(Number(live?.start))&&Number.isFinite(Number(live?.end));
 const title=mode==='lesson'?`${live.period}. Ders`:String(live?.label||'Ders saatleri');
 return{
  mode,title,sub:String(live?.sub||''),
  aralik:timed&&mode!=='idle'&&mode!=='before'?`${hmSec(live.start)} – ${hmSec(live.end)}`:'',
  progress:timed?Math.round(Math.max(0,Math.min(1,Number(live.progress)||0))*100):0,
  kalanSn:timed?Math.max(0,Math.floor(Number(live.remaining))):null,
  sure:timed?Math.round((Number(live.end)-Number(live.start))/60):0,
  canli:mode==='lesson',sonraki:nextView
 };
}

/* ── ana model ── */
function snapshot(data,live,now=new Date()){
 const today=isoOf(now),dayIdx=now.getDay(),per=periodInfo(live),tmap=teacherMap(data);
 const leaves=activeLeaves(data,today),leaveBy=new Map(leaves.map(x=>[String(x.ogretmenId),x]));
 const lessons=lessonsOn(data,dayIdx),classes=arr(data?.siniflar).filter(Boolean).slice().sort(classSort);

 /* sınıflarda şu an */
 const siniflar=per?classes.map(cls=>{
  const rows=lessons.filter(x=>periodOf(x)===per.p&&classMatch(x,cls));
  if(!rows.length)return{sinif:String(cls.ad||''),ders:'Şu an ders yok',ogr:'—',durum:'yok'};
  const free=rows.filter(x=>!leaveBy.has(String(x.ogretmenId)));
  const ders=[...new Set(rows.map(lessonLabel))].slice(0,2).join(' / ');
  if(!free.length)return{sinif:String(cls.ad||''),ders,ogr:'Öğretmen izinli',durum:'bos'};
  return{sinif:String(cls.ad||''),ders,ogr:[...new Set(free.map(x=>lessonTeacher(x,tmap)))].slice(0,2).join(', '),durum:'ders'};
 }):[];

 /* öğretmen durumu: okulda olup bu saatte boş / dersi bitmiş / henüz başlamamış */
 let ogretmenler=null;
 if(per){
  ogretmenler={oda:[],biten:[],gelecek:[]};
  const byT=new Map();
  lessons.forEach(x=>{const k=String(x.ogretmenId);if(!byT.has(k))byT.set(k,[]);byT.get(k).push(periodOf(x))});
  activeTeachers(data).forEach(t=>{
   const k=String(t.id),ps=(byT.get(k)||[]).filter(Number.isFinite).sort((a,b)=>a-b);
   if(leaveBy.has(k)||!ps.length||ps.includes(per.p))return;
   const ad=teacherName(t),last=ps[ps.length-1],first=ps[0];
   if(last<per.p)ogretmenler.biten.push({ad,not:`Son dersi ${last}. ders`});
   else if(first>per.p)ogretmenler.gelecek.push({ad,not:`İlk dersi ${first}. ders`});
   else ogretmenler.oda.push({ad,not:`Sonraki dersi ${ps.find(p=>p>per.p)}. ders`});
  });
  for(const k of Object.keys(ogretmenler))ogretmenler[k].sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));
 }

 /* nöbetçiler */
 const duties=arr(data?.nobetAtamalari).filter(x=>x&&String(x.tarih||'').slice(0,10)===today);
 const nameOf=x=>lessonTeacher(x,tmap);
 const nobet={
  amir:duties.filter(x=>isDutyChief(x,data)).map(nameOf),
  liste:duties.filter(x=>!isDutyChief(x,data)).sort((a,b)=>placeRank(dutyPlace(a,data))-placeRank(dutyPlace(b,data))||nameOf(a).localeCompare(nameOf(b),'tr')).map(x=>({ad:nameOf(x),yer:dutyPlace(x,data)||'Nöbet yeri'}))
 };

 /* gelmeyenler + dersi boş kalan sınıflar */
 const seen=new Set(),gelmeyen={liste:[],bosDersler:[]};
 leaves.forEach(x=>{
  const k=String(x.ogretmenId||x.ogretmenAdi||'');
  if(seen.has(k))return;seen.add(k);
  const ad=String(x.ogretmenAdi||x.personelAdi||'').trim()||teacherName(tmap.get(String(x.ogretmenId)))||'Öğretmen';
  gelmeyen.liste.push({ad,neden:leaveKind(x)||'İzinli',aralik:rangeText(leaveStart(x),leaveEnd(x))});
  const mine=lessons.filter(l=>String(l.ogretmenId)===String(x.ogretmenId));
  const by=new Map();
  mine.forEach(l=>{const c=classLabel(l);if(!c)return;if(!by.has(c))by.set(c,[]);by.get(c).push(periodOf(l))});
  by.forEach((ps,sinif)=>gelmeyen.bosDersler.push({sinif,saatler:ps.filter(Number.isFinite).sort((a,b)=>a-b),ogr:ad}));
 });
 gelmeyen.bosDersler.sort((a,b)=>a.sinif.localeCompare(b.sinif,'tr',{numeric:true}));

 /* üst şerit */
 const derste=siniflar.filter(s=>s.durum==='ders').length,bos=siniflar.filter(s=>s.durum==='bos').map(s=>s.sinif);
 const canli=liveView(live);
 const sonrakiZil=Number.isFinite(Number(live?.end))&&['lesson','break','lunch'].includes(live?.mode)?hmSec(live.end):'';

 return{
  tarih:{iso:today,gun:GUNLER[dayIdx],uzun:`${now.getDate()} ${AYLAR[now.getMonth()]} ${now.getFullYear()}, ${GUNLER[dayIdx]}`},
  donem:per,canli,siniflar,ogretmenler,nobet,gelmeyen,
  kpi:{derste,bos,izinli:gelmeyen.liste.length,sonrakiZil}
 };
}

/* ── ders programı tablosu (öğretmen ya da sınıf) ── */
function programSecenekleri(data){
 return{
  ogretmen:activeTeachers(data).map(t=>({id:String(t.id),ad:teacherName(t)})).filter(x=>x.ad).sort((a,b)=>a.ad.localeCompare(b.ad,'tr')),
  sinif:arr(data?.siniflar).filter(Boolean).slice().sort(classSort).map(c=>({id:String(c.id),ad:String(c.ad||'')}))
 };
}
function programTablosu(data,live,{tur='ogretmen',id=''}={},now=new Date()){
 const tmap=teacherMap(data),rows=arr(data?.dersProgrami).filter(Boolean);
 const cls=tur==='sinif'?arr(data?.siniflar).find(c=>String(c.id)===String(id)):null;
 const mine=rows.filter(x=>tur==='sinif'?(!!cls&&classMatch(x,cls)):String(x.ogretmenId)===String(id));
 let saatler=arr(live?.segments).filter(s=>s.type==='lesson').map(s=>({n:Number(s.period),saat:`${hmSec(s.start)}–${hmSec(s.end)}`}));
 if(!saatler.length){
  const max=Math.max(0,...rows.map(periodOf).filter(Number.isFinite));
  for(let i=1;i<=max;i++)saatler.push({n:i,saat:''});
 }
 const aktif=live?.mode==='lesson'?Number(live.period):0;
 const gunler=[1,2,3,4,5].map(d=>({
  gun:GUNLER[d],bugun:now.getDay()===d,
  hucre:saatler.map(s=>{
   const hit=mine.filter(x=>fold(x.gun)===fold(GUNLER[d])&&periodOf(x)===s.n);
   if(!hit.length)return{a:'',b:'',var:false,simdi:false};
   const first=hit[0],extra=hit.length>1?` +${hit.length-1}`:'';
   return tur==='sinif'
    ?{a:lessonLabel(first)+extra,b:lessonTeacher(first,tmap),var:true,simdi:now.getDay()===d&&s.n===aktif}
    :{a:(classLabel(first)||'—')+extra,b:lessonLabel(first),var:true,simdi:now.getDay()===d&&s.n===aktif};
  })
 }));
 return{saatler,gunler,aktif};
}

/* ── terfisi yaklaşanlar ── */
/* Kaynak öğretmen detayıdır: derece, kademe ve son terfi tarihi. Sonraki terfi (1 yıl sonra) ve yeni derece/kademe TerfiCore'dan gelir. */
function terfiler(data,todayIso,gun=30){
 const T=g.TerfiCore;if(!T)return[];
 return activeTeachers(data)
  .map(t=>({t,r:T.sonraki(t)}))
  .filter(x=>x.r.durum==='var')
  .map(x=>({...x,d:dayDiff(x.r.tarih,todayIso)}))
  .filter(x=>x.d>=0&&x.d<=gun)
  .sort((a,b)=>a.d-b.d||teacherName(a.t).localeCompare(teacherName(b.t),'tr'))
  .map(({t,r,d})=>({ad:teacherName(t),det:T.etiket(r),tarih:dm(r.tarih),kalan:kalanText(d),gun:d}));
}

/* ── belirli gün ve haftalar: liste [{ad,tarihBaslangic,tarihBitis,resmi}] ── */
function ozelGunler(list,todayIso,gun=14,max=4){
 return arr(list).map(x=>{
  const a=String(x?.tarihBaslangic||'').slice(0,10),b=String(x?.tarihBitis||a).slice(0,10)||a;
  return{x,a,b,d0:dayDiff(a,todayIso),d1:dayDiff(b,todayIso)};
 }).filter(r=>ISO.test(r.a)&&r.d1>=0&&r.d0<=gun).sort((p,q)=>p.d0-q.d0).slice(0,max).map(r=>({
  ad:String(r.x.ad||'').trim(),tarih:rangeText(r.a,r.b)+(r.x.resmi?' · resmî':''),
  kalan:r.d0<=0?(r.d0===0?'Bugün':'Sürüyor'):kalanText(r.d0),resmi:!!r.x.resmi
 }));
}

/* ── takvim olayları: sınav, toplantı, belirli gün ── */
function meetingTitle(x){
 const type=x?.tur==='sok'?'ŞÖK':x?.tur==='zumre'?'Zümre':'Toplantı',topic=String(x?.konu||'').trim();
 let scope='';
 if(x?.tur==='zumre'){
  if(x?.kademe==='ilkokul')scope=arr(x.zumreSeviyeleri).map(Number).filter(Boolean).sort((a,b)=>a-b).map(n=>`${n}. Sınıf`).join(', ');
  else scope=String(x?.dersAdi||x?.bransAdi||'').trim();
 }
 return scope?`${type}: ${scope}`:topic?`${type}: ${topic}`:type;
}
function olaylar(data,ozel=[]){
 const out=[];
 [...arr(data?.sinavlar),...arr(data?.denemeSinavlari)].forEach(x=>{
  const t=String(x?.tarih||'').slice(0,10);
  if(ISO.test(t))out.push({tarih:t,saat:String(x.saat||x.baslamaSaati||'').slice(0,5),ad:String(x.ad||x.ders||x.sinavAdi||'Sınav'),tur:'sinav'});
 });
 arr(data?.toplantiCizelgesi).forEach(x=>{
  const t=String(x?.tarih||'').slice(0,10);
  if(ISO.test(t))out.push({tarih:t,saat:String(x.saat||'').slice(0,5),ad:meetingTitle(x),tur:'toplanti'});
 });
 /* hatırlatıcılar: tamamlananlar ve izin/rapor bildirimleri (Gelmeyenler kartında zaten var) dışarıda kalır */
 arr(data?.hatirlaticilar).forEach(x=>{
  const t=String(x?.tarih||'').slice(0,10),ad=String(x?.baslik||'').trim();
  if(!ISO.test(t)||!ad||x?.tamamlandi||/\b(izin|rapor)/.test(fold(ad)))return;
  out.push({tarih:t,saat:String(x.saat||'').slice(0,5),ad,tur:'hatirlatici'});
 });
 arr(ozel).forEach(x=>{
  const a=String(x?.tarihBaslangic||'').slice(0,10),b=String(x?.tarihBitis||a).slice(0,10)||a;
  if(!ISO.test(a))return;
  const n=Math.min(14,Math.max(0,dayDiff(b,a)||0));
  const d0=parseIso(a);
  for(let i=0;i<=n;i++){const d=new Date(d0.getFullYear(),d0.getMonth(),d0.getDate()+i);out.push({tarih:isoOf(d),saat:'',ad:String(x.ad||''),tur:'ozel'})}
 });
 return out.filter(x=>x.ad).sort((a,b)=>(a.tarih+(a.saat||'99:99')).localeCompare(b.tarih+(b.saat||'99:99')));
}
function yaklasanlar(list,todayIso,gun=14,max=4){
 return arr(list).filter(x=>x.tur!=='ozel').map(x=>({...x,d:dayDiff(x.tarih,todayIso)})).filter(x=>x.d>=0&&x.d<=gun).slice(0,max)
  .map(x=>({ad:x.ad,zaman:`${dm(x.tarih)}${x.saat?` · ${x.saat}`:''}`,kalan:kalanText(x.d),tur:x.tur}));
}
function geriSayim(list,todayIso){
 const row=arr(list).map(x=>({x,d:dayDiff(String(x?.tarih||'').slice(0,10),todayIso)})).filter(r=>x_ok(r)).sort((a,b)=>a.d-b.d)[0];
 return row?{ad:String(row.x.ad||'Sınav'),gun:row.d}:null;
}
function x_ok(r){return r.x?.goster!==false&&Number.isFinite(r.d)&&r.d>=0}

/* ── ay takvimi (hafta Pazartesi başlar) ── */
function ayTakvimi(year,month,olayList,todayIso){
 const first=new Date(year,month,1),lead=(first.getDay()+6)%7,days=new Date(year,month+1,0).getDate();
 const total=Math.ceil((lead+days)/7)*7,byDay=new Map();
 arr(olayList).forEach(o=>{if(!byDay.has(o.tarih))byDay.set(o.tarih,[]);byDay.get(o.tarih).push(o)});
 const hucreler=[];
 for(let i=0;i<total;i++){
  const d=new Date(year,month,1-lead+i),iso=isoOf(d),col=i%7;
  hucreler.push({iso,gun:d.getDate(),diger:d.getMonth()!==month,bugun:iso===todayIso,haftaSonu:col>=5,isaret:(byDay.get(iso)||[]).length});
 }
 return{baslik:`${AYLAR[month]} ${year}`,hucreler};
}
const gunOlaylari=(list,iso)=>arr(list).filter(o=>o.tarih===iso);

/* ── sınıf rehber öğretmenleri ── */
function rehberler(data){
 const tmap=teacherMap(data);
 return arr(data?.siniflar).filter(Boolean).slice().sort(classSort).map(c=>{
  const lvl=Number(String(c.seviye||c.ad||'').match(/\d+/)?.[0])||0,t=tmap.get(String(c.sinifOgretmeniId));
  return{sinif:String(c.ad||''),ad:t?teacherName(t):'',kademe:lvl>=1&&lvl<=4?'ilk':lvl>=5&&lvl<=8?'orta':'diger'};
 });
}

/* ── Dilimizin Zenginlikleri (MEB proje eylem planı: dilimiz.js PLANLAR) ── */
const KISA_AY={Eki:9,Kas:10,Ara:11,Oca:0,Şub:1,Mar:2,Nis:3,May:4,Haz:5};
const DZ_KADEME={ilkokul:'İlkokul',ortaokul:'Ortaokul'};
/* "5–9 Eki" · "12 Eki – 6 Kas" · "29 Ara" → eğitim yılı (Eylül'de başlar) içinde ISO aralığı; tarih değilse null */
function adimAraligi(txt,yil){
 const t=String(txt||'').trim(),L='([A-Za-zÇĞİÖŞÜçğıöşü]{3})';
 let m=new RegExp(`^(\\d{1,2})\\s*[–-]\\s*(\\d{1,2})\\s+${L}$`).exec(t),a,b;
 if(m)a=[+m[1],m[3]],b=[+m[2],m[3]];
 else if((m=new RegExp(`^(\\d{1,2})\\s+${L}\\s*[–-]\\s*(\\d{1,2})\\s+${L}$`).exec(t)))a=[+m[1],m[2]],b=[+m[3],m[4]];
 else if((m=new RegExp(`^(\\d{1,2})\\s+${L}$`).exec(t)))a=[+m[1],m[2]],b=a;
 else return null;
 if(!(a[1] in KISA_AY)||!(b[1] in KISA_AY))return null;
 const iso=([d,k])=>{const ay=KISA_AY[k];return `${ay>=8?yil:yil+1}-${pad(ay+1)}-${pad(d)}`};
 return{bas:iso(a),bit:iso(b)};
}
/* Okulun kademeleri sınıf listesinden bulunur (1–4 ilkokul, 5–8 ortaokul); hiç sınıf yoksa ikisi de gösterilir. */
function dilimizKademeleri(data){
 const set=new Set();
 arr(data?.siniflar).forEach(c=>{const n=Number(String(c?.seviye||c?.ad||'').match(/\d+/)?.[0])||0;if(n>=1&&n<=4)set.add('ilkokul');else if(n>=5&&n<=8)set.add('ortaokul')});
 return set.size?['ilkokul','ortaokul'].filter(k=>set.has(k)):['ilkokul','ortaokul'];
}
const kisalt=(t,max=110)=>{const x=String(t||'').replace(/\s+/g,' ').trim(),c=x.search(/[.!?](\s|$)/),y=c>=0&&c<x.length-1?x.slice(0,c+1):x;return y.length>max?y.slice(0,max-1).trimEnd()+'…':y};
/* Her kademe için şu an süren adımlar ve yaklaşan (gün içinde) adımlar; hiçbiri yoksa sıradaki adım. Okul girdisi (sorumlu öğretmen, aylık not) girdi(kademe,no)'dan gelir. */
function dilimiz(planlar,girdi,kademeler,todayIso,gun=14,maxFaaliyet=2,maxAdim=2){
 const d=parseIso(todayIso);if(!d)return[];
 const yil=d.getMonth()>=8?d.getFullYear():d.getFullYear()-1;
 return arr(kademeler).filter(k=>DZ_KADEME[k]&&arr(planlar?.[k]).length).map(k=>{
  const adimlar=[];
  arr(planlar[k]).forEach(a=>arr(a[5]).forEach(st=>{
   const r=adimAraligi(st[2],yil);if(!r)return;
   adimlar.push({no:a[1],ad:a[2],adim:st[0],metin:kisalt(st[1]),bas:r.bas,bit:r.bit,sure:r.bas<=todayIso&&r.bit>=todayIso});
  }));
  let sec=adimlar.filter(x=>x.sure||(x.bas>todayIso&&dayDiff(x.bas,todayIso)<=gun));
  if(!sec.length){const n=adimlar.filter(x=>x.bas>todayIso).sort((a,b)=>a.bas.localeCompare(b.bas))[0];if(n)sec=[n]}
  sec.sort((a,b)=>(b.sure-a.sure)||a.bas.localeCompare(b.bas)||String(a.adim).localeCompare(String(b.adim),'tr',{numeric:true}));
  const by=new Map();
  sec.forEach(x=>{
   if(!by.has(x.no))by.set(x.no,{no:x.no,ad:x.ad,adimlar:[]});
   by.get(x.no).adimlar.push({adim:x.adim,metin:x.metin,tarih:rangeText(x.bas,x.bit),durum:x.sure?'suruyor':'yakin',kalan:x.sure?'Sürüyor':kalanText(dayDiff(x.bas,todayIso))});
  });
  const faaliyetler=[...by.values()].slice(0,maxFaaliyet).map(f=>{
   const e=girdi?.(k,f.no)||{};
   return{...f,adimlar:f.adimlar.slice(0,maxAdim),fazla:Math.max(0,f.adimlar.length-maxAdim),sorumlu:arr(e.ogretmenler).map(o=>String(o?.ad||'').trim()).filter(Boolean),not:String(e.not||'').trim(),okulTarih:String(e.tarih||'').trim()};
  });
  return{kademe:k,ad:DZ_KADEME[k],faaliyetler};
 }).filter(x=>x.faaliyetler.length);
}

/* ── paylaşım özeti (düz metin) ── */
function ozetMetni(model,okul=''){
 const L=[`${okul?okul+' — ':''}İdareci Pano`,model.tarih.uzun];
 if(model.canli?.title)L.push(`Şu an: ${model.canli.title}${model.canli.aralik?` (${model.canli.aralik})`:''}`);
 if(model.nobet.amir.length)L.push(`Nöbetçi idareci: ${model.nobet.amir.join(', ')}`);
 if(model.nobet.liste.length)L.push('Nöbetçiler: '+model.nobet.liste.map(n=>`${n.ad} (${n.yer})`).join(', '));
 if(model.gelmeyen.liste.length)L.push('Gelmeyenler: '+model.gelmeyen.liste.map(n=>`${n.ad} — ${n.neden}`).join(', '));
 if(model.kpi.bos.length)L.push(`Dersi boş sınıf: ${model.kpi.bos.join(', ')}`);
 return L.join('\n');
}

g.IdareciPanoCore={
 GUNLER,AYLAR,isoOf,parseIso,dayDiff,rangeText,kalanText,hmSec,teacherName,fold,
 periodInfo,liveView,snapshot,programSecenekleri,programTablosu,terfiler,ozelGunler,olaylar,yaklasanlar,geriSayim,
 ayTakvimi,gunOlaylari,rehberler,dilimiz,dilimizKademeleri,adimAraligi,ozetMetni,activeLeaves,isDutyChief
};
})(typeof window!=='undefined'?window:globalThis);

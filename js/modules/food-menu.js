/* Koruk Asistan — Yemek Menüsü modülü
 * Günlük / Haftalık / Aylık menü + Yemek Denetim Formu tek dosyada.
 * Veri: DeviceData 'yemekMenuleri' koleksiyonu, ay bazlı ({id:'YYYY-MM', menu:{gün:{items:[]}}}).
 * Görünüm (ekran + A4 çıktı) tamamen merkezi CSS'tedir: css/design-system-base.css → TEMA MERKEZİ --ka-food-* + "YEMEK MENÜSÜ" bölümü.
 * Bu dosya yalnızca işaretleme üretir: ekran sınıfları ka-fm-*, çıktı sınıfları ka-fmp-*; hafta günü rengi data-dow özniteliğinden gelir.
 */
(function(global){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
function toast(msg){global.toast?.(msg)}

const FOOD_DATA_TYPE='yemekMenuleri';

/* 2026 Kasım Ortak Yemek Listesi — yalnızca Kasım 2026 menüsü boşsa ilk kurulum verisi olarak kullanılır. */
const OFFICIAL_FOOD_MENU_2026_11=Object.freeze({
  2:['Tavuklu Bahçıvan Kebabı','Bulgur Pilavı','Ayran','Ekmek(75 g)'],
  3:['Kıymalı Kabak Musakka','Soslu Makarna','Şekerpare','Ekmek(75 g)'],
  4:['Mercimek Çorbası','Etli Patates Oturtma','Mandalina','Ekmek(75 g)'],
  5:['Etli Nohut','Pirinç Pilavı','Yoğurt','Ekmek(75 g)'],
  6:['Sebzeli Tavuk','Bulgur Pilavı','Salata','Ekmek(75 g)'],
  9:['Et Sote','Soslu Makarna','Ayran','Ekmek(75 g)'],
  10:['Yayla Çorbası','Kıymalı Patates','Elma','Ekmek(75 g)'],
  11:['Sebzeli Tavuk','Soslu Makarna','Şekerpare','Ekmek(75 g)'],
  12:['Güveç','Şehriyeli Pirinç Pilavı','Ayran','Ekmek(75 g)'],
  13:['İzmir Köfte','Soslu Makarna','Salata','Ekmek(75 g)'],
  /* 16-20 Kasım Ara Tatil */
  23:['Etli Kuru Fasulye','Pirinç Pilavı','Yoğurt','Ekmek(75 g)'],
  24:['Etli Patates Oturtma','Salçalı Bulgur Pilavı','Kek/Kurabiye','Ekmek(75 g)'],
  25:['Tavuk Haşlama','Soslu Makarna','Ayran','Ekmek(75 g)'],
  26:['Etli Türlü','Mercimek Çorbası','Salata','Ekmek(75 g)'],
  27:['Patlıcan Musakka','Pirinç Pilavı','Ayran','Ekmek(75 g)'],
  30:['Tavuk Sote','Bulgur Pilavı','Mandalina','Ekmek(75 g)']
});

/* 2026 Ekim Ortak Yemek Listesi — yalnızca Ekim 2026 menüsü boşsa ilk kurulum verisi olarak kullanılır. */
const OFFICIAL_FOOD_MENU_2026_10=Object.freeze({
  1:['Kıymalı Kabak Musakka','Bulgur Pilavı','Ayran','Ekmek(75 g)'],
  2:['Tas Kebabı','Bezelyeli Pirinç Pilavı','Ayran','Ekmek(75 g)'],
  5:['Etli Taze Fasulye','Yayla Çorbası','İrmik Helvası','Ekmek(75 g)'],
  6:['Terbiyeli Köfte','Fırında Patates','Ayran','Ekmek(75 g)'],
  7:['Fırın Tavuk','Soslu Makarna','Ayran','Ekmek(75 g)'],
  8:['Etli Patates','Bulgur Pilavı','Çoban Salata','Ekmek(75 g)'],
  9:['Kıymalı Barbunya','Pirinç Pilavı','Turşu','Ekmek(75 g)'],
  12:['Orman Kebabı','Şehriyeli Pirinç Pilavı','Meyve','Ekmek(75 g)'],
  13:['Sebzeli Tavuk','Mercimek Çorbası','Yoğurt','Ekmek(75 g)'],
  14:['Güveç','Pirinç Pilavı','Haydari','Ekmek(75 g)'],
  15:['Kuru Köfte','Bulgur Pilavı','Salata','Ekmek(75 g)'],
  16:['Ezogelin Çorba','Tavuklu Köri Soslu Makarna','Meyve','Ekmek(75 g)'],
  19:['Etli Kuru Fasulye','Bulgur Pilavı','Meyve','Ekmek(75 g)'],
  20:['Et Sote','Bezelyeli Pirinç Pilavı','Haydari','Ekmek(75 g)'],
  21:['Tavuk Haşlama','Soslu Makarna','Ayran','Ekmek(75 g)'],
  22:['Kıymalı Bezelye','Mercimek Çorbası','Salata','Ekmek(75 g)'],
  23:['Patates Oturtma','Salçalı Bulgur Pilavı','Kek/Kurabiye','Ekmek(75 g)'],
  26:['Patlıcan Musakka','Bulgur Pilavı','Yoğurt','Ekmek(75 g)'],
  27:['Tavuklu Şehriyeli Nohut Ç.','Pirinç Pilavı','Sigara Böreği','Ekmek(75 g)'],
  28:['Etli Taze Fasulye','Sade Makarna','Ayran','Ekmek(75 g)'],
  30:['Kıymalı Kabak Musakka','Soslu Makarna','Şekerpare','Ekmek(75 g)']
});

function localIso(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')}
let active='monthly',mounted=false,unsubs=[],pendingPage=null;
let foodMenuCurrentMonth=foodMenuMonthKey(localIso(new Date())),foodMenuViewDate=localIso(new Date()),foodMenuCache={};

const WD_LONG=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'];
const trd=(d,o)=>d.toLocaleDateString('tr-TR',o);

function foodMenuMonthKey(date){const d=new Date(date+'T00:00:00');return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}

async function seedOfficialOctober2026(){
 const key='2026-10';
 const all=foodMenuLoad();
 const existing=all[key]||{};
 const hasExisting=Object.values(existing).some(v=>foodDayItems(v).length);
 if(hasExisting)return false;
 const menu={};
 for(let day=1;day<=31;day++)menu[day]={items:Array.isArray(OFFICIAL_FOOD_MENU_2026_10[day])?[...OFFICIAL_FOOD_MENU_2026_10[day]]:[]};
 all[key]=menu;
 const saved=await foodMenuLocalSave();
 if(saved)console.info('[FoodMenu] 2026 Ekim ortak yemek listesi cihaza aktarıldı.');
 return saved;
}
async function seedOfficialNovember2026(){
 const key='2026-11';
 const all=foodMenuLoad();
 const existing=all[key]||{};
 const hasExisting=Object.values(existing).some(v=>foodDayItems(v).length);
 if(hasExisting)return false;
 const menu={};
 for(let day=1;day<=30;day++)menu[day]={items:Array.isArray(OFFICIAL_FOOD_MENU_2026_11[day])?[...OFFICIAL_FOOD_MENU_2026_11[day]]:[]};
 all[key]=menu;
 const saved=await foodMenuLocalSave();
 if(saved)console.info('[FoodMenu] 2026 Kasım ortak yemek listesi cihaza aktarıldı.');
 return saved;
}
let foodMenuHydrated=false,foodSelfSaving=false,foodSaveSeq=0,foodMenuStoreRef=null;
function foodMenuLoad(){
 const storeRows=global.AppStore?.data?.(FOOD_DATA_TYPE);
 if(storeRows!==foodMenuStoreRef){
  const rows=Array.isArray(storeRows)?storeRows:(global.DeviceData?.list?.(FOOD_DATA_TYPE)||[]),out={};
  rows.forEach(r=>{if(r?.id)out[r.id]=r.menu||{}});
  foodMenuCache=out;foodMenuStoreRef=storeRows;foodMenuHydrated=true;
 }
 if(!foodMenuHydrated){
  const rows=global.DeviceData?.list?.(FOOD_DATA_TYPE)||[],out={};
  rows.forEach(r=>{if(r?.id)out[r.id]=r.menu||{}});
  foodMenuCache=out;foodMenuStoreRef=global.AppStore?.data?.(FOOD_DATA_TYPE)||null;foodMenuHydrated=true;
 }
 return foodMenuCache;
}
function foodMenuPersistRows(x){return Object.entries(x||{}).map(([id,menu])=>({id,menu:menu||{}}))}
function foodMenuClean(key){
 const id=String(key||foodMenuCurrentMonth||'').trim(),menu=foodMenuLoad()[id]||{};
 return Object.fromEntries(Object.entries(menu).map(([day,v])=>[day,{...(v||{}),items:foodDayItems(v)}]));
}
async function foodMenuLocalSave(){
 const rows=foodMenuPersistRows(foodMenuLoad());
 if(!global.DeviceData?.persist)return false;
 foodSelfSaving=true;
 try{await global.DeviceData.persist(FOOD_DATA_TYPE,rows);return true}
 catch(e){console.warn('[FoodMenu] Yerel kayıt başarısız:',e?.message||e);return false}
 finally{foodSelfSaving=false}
}
async function foodMenuSave(x,key=foodMenuCurrentMonth){
 foodMenuCache=x;
 const id=String(key||foodMenuCurrentMonth||'').trim();
 if(!id||!global.DeviceData?.set||!global.COL?.yemekMenuleri)return false;
 const clean=foodMenuClean(id),seq=++foodSaveSeq;
 foodSelfSaving=true;
 try{
  await global.DeviceData.set(FOOD_DATA_TYPE,global.COL.yemekMenuleri,id,{menu:clean},{merge:false});
  return true;
 }catch(e){
  console.warn('[FoodMenu] Firestore kayıt kuyruğa alınamadı:',e?.message||e);
  return false;
 }finally{if(seq===foodSaveSeq)foodSelfSaving=false}
}
function foodMenuData(key){
 const all=foodMenuLoad(),id=String(key||'').trim(),isNew=!all[id];
 if(!id)return {};
 if(isNew)all[id]={};
 for(let i=1;i<=31;i++)all[id][i]??={items:[]};
 return all[id];
}
function foodDayItems(x){
 const old=[x?.corba,x?.ana,x?.yardimci,x?.tatli].map(v=>String(v||'').trim()).filter(Boolean);
 const items=Array.isArray(x?.items)?x.items.map(v=>String(v??'').trim()).filter(Boolean):[];
 return items.length?items:old;
}
function foodDayRaw(x){
 const items=Array.isArray(x?.items)?x.items.map(v=>String(v??'')):[];
 if(items.some(v=>v.trim()))return items;
 const old=foodDayItems({corba:x?.corba,ana:x?.ana,yardimci:x?.yardimci,tatli:x?.tatli});
 return old.length?old:items;
}
function foodDayEnsure(x){if(!x||typeof x!=='object')x={};x.items=foodDayRaw(x);return x}
const monthKeyOf=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
const monthLabel=key=>trd(new Date(Number(key.slice(0,4)),Number(key.slice(5,7))-1,1),{month:'long',year:'numeric'});
function foodMenuMonthOptions(selected){
 const now=new Date(),keys=new Set([selected]);
 for(let n=-12;n<=12;n++)keys.add(monthKeyOf(new Date(now.getFullYear(),now.getMonth()+n,1)));
 return [...keys].filter(Boolean).sort().map(k=>'<option value="'+k+'"'+(k===selected?' selected':'')+'>'+esc(monthLabel(k))+'</option>').join('');
}
function foodMenuShiftMonth(key,step){return monthKeyOf(new Date(Number(key.slice(0,4)),Number(key.slice(5,7))-1+step,1))}
/* Hafta sonu atlanır: günlük menüde ‹ › düğmeleri bir önceki / sonraki iş gününe götürür. */
function foodShiftWeekday(iso,step){const d=new Date(iso+'T00:00:00');do{d.setDate(d.getDate()+step)}while(d.getDay()===0||d.getDay()===6);return localIso(d)}
function foodWeekStart(iso){const b=new Date(iso+'T00:00:00'),dow=b.getDay()||7;b.setDate(b.getDate()-dow+1);return b}
function isToday(iso){return iso===localIso(new Date())}

/* Ayın Pzt–Cum hücreleri, sütunlar gerçek haftaya hizalı (boş günler boş hücre). */
function foodMenuPrintWeeks(key){
 const y=Number(key.slice(0,4)),m=Number(key.slice(5,7))-1,last=new Date(y,m+1,0).getDate();
 const firstDow=new Date(y,m,1).getDay(),weeks=[];
 for(let start=1-((firstDow+6)%7);start<=last;start+=7){
  const row=[];
  for(let ci=0;ci<5;ci++){const day=start+ci;row.push(day>=1&&day<=last?day:0)}
  if(row.some(Boolean))weeks.push(row);
 }
 return weeks;
}
/* Yazı boyutu: en kalabalık haftaya göre 10,5pt'den 4,5pt'ye kadar, sayfaya sığan en büyük değer.
   Ölçüler ka-fmp-* çıktı düzenine göredir: A4 yatay, kenar 6 mm → ızgara alanı ≈ 150 mm, hücre genişliği ≈ 52 mm. */
function foodMenuPrintFontSize(weeks,data){
 const AVAIL_MM=148,ROW_OVERHEAD_MM=9,GAP_MM=1.6*(weeks.length-1);
 for(let fs=10.5;fs>=4.5;fs-=.5){
  const cpl=Math.max(8,Math.floor(50/(fs*0.2))),lineMm=fs*0.3528*1.22+0.6;
  let total=GAP_MM;
  weeks.forEach(row=>{
   const lines=Math.max(0,...row.map(d=>d?foodDayItems(data[d]||{}).reduce((n,t)=>n+Math.max(1,Math.ceil(t.length/cpl)),0):0));
   total+=Math.max(17,ROW_OVERHEAD_MM+lines*lineMm);
  });
  if(total<=AVAIL_MM)return fs;
 }
 return 4.5;
}
/* ── A4 çıktı: ortak parçalar ── */
function foodPrintHead(kind,whenHtml){
 const sc=foodSchool(),logo=global.ReportEngine?.logoUrl?.()||'assets/logo.png';
 return '<header class="ka-fmp-head"><img class="ka-fmp-logo" src="'+esc(logo)+'" alt=""><div class="ka-fmp-school"><b>'+esc(sc.okulAdi)+'</b>'+(sc.ilce?'<i>'+esc(sc.ilce)+'</i>':'')+'</div>'
  +'<div class="ka-fmp-title"><div class="ka-fmp-when">'+whenHtml+'</div><b>'+esc(kind)+'</b></div></header><div class="ka-fmp-stripe" aria-hidden="true"></div>';
}
function foodPrintFoot(){
 const name=foodPrincipal();
 return '<footer class="ka-fmp-foot"><i class="ka-fmp-wish">Afiyet olsun.</i>'+(name?'<div class="ka-fmp-sign"><b>'+esc(name.toLocaleUpperCase('tr-TR'))+'</b><i>Okul Müdürü</i></div>':'')+'</footer>';
}
function foodPrintCell(day,dow,items){
 const none=!items.length;
 return '<div class="ka-fmp-cell'+(none?' is-off':'')+'" data-dow="'+dow+'"><div class="ka-fmp-d"><em>'+String(day).padStart(2,'0')+'</em></div>'
  +items.map(v=>'<div class="ka-fmp-i">'+esc(v)+'</div>').join('')+'</div>';
}
function foodPrintGridHead(){let h='';for(let dow=1;dow<=5;dow++)h+='<div class="ka-fmp-h" data-dow="'+dow+'">'+WD_LONG[dow]+'</div>';return h}
/* Aylık: tüm ay, Pzt–Cum sütunları gerçek haftaya hizalı. */
function foodMenuPrintBody(key,data){
 const y=Number(key.slice(0,4)),m=Number(key.slice(5,7))-1,weeks=foodMenuPrintWeeks(key),fs=foodMenuPrintFontSize(weeks,data);
 const mon=trd(new Date(y,m,1),{month:'long'});
 let grid=foodPrintGridHead();
 weeks.forEach(row=>row.forEach((day,ci)=>{grid+=day?foodPrintCell(day,ci+1,foodDayItems(data[day]||{})):'<div class="ka-fmp-cell is-blank" aria-hidden="true"></div>'}));
 return '<div class="ka-fmp ka-fmp--month" style="--fm-fs:'+fs+'pt;--fm-rows:'+weeks.length+'">'+foodPrintHead('Yemek menüsü','<em>'+esc(mon)+'</em><i>'+y+'</i>')
  +'<div class="ka-fmp-grid">'+grid+'</div>'+foodPrintFoot()+'</div>';
}
/* Haftalık: seçili haftanın Pzt–Cum günleri, tek sayfa yatay, büyük yazı. */
function foodWeekPrintBody(iso){
 const mon=foodWeekStart(iso),fri=new Date(mon);fri.setDate(mon.getDate()+4);
 let grid=foodPrintGridHead(),most=0;
 for(let i=0;i<5;i++){
  const d=new Date(mon);d.setDate(mon.getDate()+i);
  const items=foodDayItems(foodMenuData(monthKeyOf(d))[d.getDate()]||{});most=Math.max(most,items.length);
  grid+=foodPrintCell(d.getDate(),d.getDay(),items);
 }
 const fs=most<=4?16:most<=6?14:most<=8?12:10,y=fri.getFullYear();
 const same=mon.getMonth()===fri.getMonth(),when=same?mon.getDate()+'–'+fri.getDate()+' '+trd(fri,{month:'long'}):mon.getDate()+' '+trd(mon,{month:'short'})+' – '+fri.getDate()+' '+trd(fri,{month:'short'});
 return '<div class="ka-fmp ka-fmp--week" style="--fm-fs:'+fs+'pt">'+foodPrintHead('Haftalık yemek menüsü','<em>'+esc(when)+'</em><i>'+y+'</i>')
  +'<div class="ka-fmp-grid">'+grid+'</div>'+foodPrintFoot()+'</div>';
}
/* Günlük: seçili günün menüsü, A4 dikey, yemekhane panosuna asılacak büyüklükte. */
function foodDayPrintBody(iso){
 const d=new Date(iso+'T00:00:00'),items=foodDayItems(foodMenuData(monthKeyOf(d))[d.getDate()]||{}),n=items.length,fs=n<=5?30:n<=7?24:n<=10?19:15,dow=d.getDay();
 const list=n?'<ul class="ka-fmp-dishes">'+items.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':'<div class="ka-fmp-none">Bu gün için menü girilmemiş.</div>';
 return '<div class="ka-fmp ka-fmp--day" data-dow="'+dow+'" style="--fm-fs:'+fs+'pt">'+foodPrintHead('Günlük yemek menüsü','<em>'+esc(trd(d,{month:'long'}))+'</em><i>'+d.getFullYear()+'</i>')
  +'<section class="ka-fmp-hero"><em>'+String(d.getDate()).padStart(2,'0')+'</em><div><b>'+WD_LONG[dow]+'</b><i>'+esc(trd(d,{day:'numeric',month:'long',year:'numeric'}))+'</i></div></section>'
  +list+foodPrintFoot()+'</div>';
}

const TITLES={daily:'Günlük Menü',weekly:'Haftalık Menü',monthly:'Aylık Menü',audit:'Yemek Denetim Formu'};
const SUBTITLES={daily:'Seçili günün öğle yemeği menüsü.',weekly:'Pazartesiden Cumaya haftalık menü.',monthly:'Pazartesiden Cumaya. Her güne istediğiniz kadar yemek ekleyebilirsiniz.',audit:'Ücretsiz öğle yemeği denetim ve kontrol formu.'};

/* ── Ekran: ortak parçalar ── */
const stepBtn=(attr,val,label,glyph)=>'<button class="ka-fm-step" type="button" '+attr+'="'+val+'" aria-label="'+label+'">'+glyph+'</button>';
function dayTab(day,d,today){
 return '<div class="ka-fm-day__tab"><em class="ka-fm-day__no">'+String(day).padStart(2,'0')+'</em><i class="ka-fm-day__wd">'+esc(trd(d,{weekday:'short'}))+'</i>'+(today?'<i class="ka-fm-day__now">Bugün</i>':'')+'</div>';
}
function foodMenuProgress(weeks,data){let total=0,filled=0;weeks.forEach(r=>r.forEach(d=>{if(!d)return;total++;if(foodDayItems(data[d]||{}).length)filled++}));return{total,filled}}

function dailyView(){
 const viewDate=foodMenuViewDate||localIso(new Date()),vd=new Date(viewDate+'T00:00:00'),key=monthKeyOf(vd),day=vd.getDate(),dow=vd.getDay(),weekend=dow===0||dow===6;
 const items=foodDayItems(foodDayEnsure(foodMenuData(key)[day]||{})),today=isToday(viewDate);
 const bar='<div class="ka-card ka-fm-bar"><div class="ka-card__body ka-stack"><div class="ka-fm-stepper">'+stepBtn('data-fm-day-step','-1','Önceki gün','‹')
  +'<label class="ka-fm-month"><span class="ka-fm-month__name">'+esc(trd(vd,{day:'numeric',month:'long'}))+'</span><input type="date" data-fm-day value="'+esc(viewDate)+'" aria-label="Tarih seç"></label>'+stepBtn('data-fm-day-step','1','Sonraki gün','›')+'</div>'
  +'<div class="ka-fm-actions">'+(today?'':'<button class="ka-btn ka-btn--secondary" type="button" data-fm-today>Bugün</button>')+'<button class="ka-btn" type="button" data-fm-print="daily">🖨 A4 çıktı</button></div></div></div>';
 let body;
 if(items.length){
  body='<article class="ka-fm-hero" data-dow="'+dow+'"><div class="ka-fm-hero__date"><em class="ka-fm-hero__no">'+String(day).padStart(2,'0')+'</em><div class="ka-fm-hero__meta"><b>'+WD_LONG[dow]+'</b><i>'+esc(trd(vd,{month:'long',year:'numeric'}))+'</i>'+(today?'<i class="ka-fm-day__now">Bugün</i>':'')+'</div></div>'
   +'<ul class="ka-fm-dishes">'+items.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul></article>';
 }else if(weekend){
  body='<div class="ka-fm-empty"><i class="ka-fm-empty__icon" aria-hidden="true">🍽️</i><div><b>Hafta sonu</b><p>Okulda yemek servisi yapılmaz. Bir iş günü seçin.</p></div></div>';
 }else{
  body='<div class="ka-fm-empty" data-dow="'+dow+'"><i class="ka-fm-empty__icon" aria-hidden="true">🍽️</i><div><b>Bu gün için menü girilmemiş</b><p>Aylık menüde bu güne yemek ekleyebilirsiniz.</p></div><button class="ka-btn ka-btn--secondary" type="button" data-fm-goto="monthly">Aylık menüde ekle</button></div>';
 }
 return bar+body;
}

function weeklyView(){
 const viewDate=foodMenuViewDate||localIso(new Date()),mon=foodWeekStart(viewDate),fri=new Date(mon);fri.setDate(mon.getDate()+4);
 const range=mon.getMonth()===fri.getMonth()?mon.getDate()+'–'+fri.getDate()+' '+trd(fri,{month:'long'}):mon.getDate()+' '+trd(mon,{month:'short'})+' – '+fri.getDate()+' '+trd(fri,{month:'short'});
 const bar='<div class="ka-card ka-fm-bar"><div class="ka-card__body ka-stack"><div class="ka-fm-stepper">'+stepBtn('data-fm-week-step','-1','Önceki hafta','‹')
  +'<label class="ka-fm-month"><span class="ka-fm-month__name">'+esc(range)+'</span><input type="date" data-fm-week-date value="'+esc(viewDate)+'" aria-label="Haftadan bir tarih seç"></label>'+stepBtn('data-fm-week-step','1','Sonraki hafta','›')+'</div>'
  +'<div class="ka-fm-actions"><button class="ka-btn" type="button" data-fm-print="weekly">🖨 A4 çıktı</button></div></div></div>';
 const days=Array.from({length:5},(_,i)=>{
  const d=new Date(mon);d.setDate(mon.getDate()+i);
  const iso=localIso(d),items=foodDayItems(foodMenuData(monthKeyOf(d))[d.getDate()]||{});
  return '<article class="ka-fm-day ka-fm-day--view'+(items.length?'':' is-empty')+(isToday(iso)?' is-today':'')+'" data-dow="'+d.getDay()+'">'+dayTab(d.getDate(),d,isToday(iso))
   +'<div class="ka-fm-day__body">'+(items.length?'<ul class="ka-fm-dishes">'+items.map(v=>'<li>'+esc(v)+'</li>').join('')+'</ul>':'<div class="ka-fm-day__none">Menü girilmemiş</div>')+'</div></article>';
 }).join('');
 return bar+'<div class="ka-fm-days">'+days+'</div>';
}

function monthlyView(){
 const key=foodMenuCurrentMonth||monthKeyOf(new Date()),data=foodMenuData(key),y=Number(key.slice(0,4)),m=Number(key.slice(5,7))-1,weeks=foodMenuPrintWeeks(key),prog=foodMenuProgress(weeks,data);
 const pct=prog.total?Math.round(prog.filled/prog.total*100):0;
 const bar='<div class="ka-card ka-fm-bar"><div class="ka-card__body ka-stack"><div class="ka-fm-stepper">'+stepBtn('data-fm-month-step','-1','Önceki ay','‹')
  +'<label class="ka-fm-month"><span class="ka-fm-month__name">'+esc(monthLabel(key))+'</span><select data-fm-month aria-label="Ay seç">'+foodMenuMonthOptions(key)+'</select></label>'+stepBtn('data-fm-month-step','1','Sonraki ay','›')+'</div>'
  +'<div class="ka-fm-meter" style="--fm-p:'+pct+'%" role="img" aria-label="'+prog.filled+' / '+prog.total+' gün dolu"><i></i></div><div class="ka-fm-meter__text">'+prog.filled+' / '+prog.total+' iş günü için menü girildi</div>'
  +'<div class="ka-fm-actions"><button class="ka-btn" type="button" data-fm-save>💾 Kaydet</button><button class="ka-btn ka-btn--secondary" type="button" data-fm-print="monthly">🖨 A4 çıktı</button></div></div></div>';
 const wk=weeks.map(row=>{
  const nums=row.filter(Boolean),a=nums[0],b=nums[nums.length-1],label=a===b?a+' '+trd(new Date(y,m,a),{month:'long'}):a+'–'+b+' '+trd(new Date(y,m,a),{month:'long'});
  const cards=row.map((day,ci)=>{
   if(!day)return '<div class="ka-fm-day ka-fm-day--blank" aria-hidden="true"></div>';
   const d=new Date(y,m,day),iso=localIso(d),today=isToday(iso),items=foodDayRaw(foodDayEnsure(data[day]||{})),filled=items.some(v=>String(v).trim());
   return '<article class="ka-fm-day'+(today?' is-today':'')+(filled?'':' is-empty')+'" data-dow="'+d.getDay()+'" data-fm-day-card="'+day+'">'+dayTab(day,d,today)
    +'<div class="ka-fm-day__body"><div class="ka-fm-items">'+items.map((v,j)=>'<div class="ka-fm-item"><input class="ka-input ka-fm-input" type="text" data-fm-item="'+day+'" value="'+esc(v)+'" placeholder="Yemek adı"><button class="ka-fm-x" type="button" data-fm-remove="'+day+':'+j+'" aria-label="Sil">×</button></div>').join('')+'</div>'
    +'<button class="ka-fm-add" type="button" data-fm-add="'+day+'">+ Yemek ekle</button></div></article>';
  }).join('');
  return '<section class="ka-fm-week"><div class="ka-fm-week__label" role="heading" aria-level="3">'+esc(label)+'</div><div class="ka-fm-days">'+cards+'</div></section>';
 }).join('');
 return bar+wk;
}

/* --- Yemek Denetim Formu --- */
function foodInspectors(){const ts=arr('ogretmenler').filter(x=>x?.id).slice().sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr'));const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{};const mudur=school.mudurId?ts.find(x=>x.id===school.mudurId):null;const yard=ts.find(x=>/müdür yardımc|mudur yardimc/i.test(String(x.unvan||x.gorev||x.gorevi||'')));return{ts,mudur:mudur?.id||'',yard:yard?.id||''}}
const FOOD_CHECKS=['Yemekler paslanmaz çelik-krom ve ısı yalıtımlı kaplarda taze ve sıcak bir şekilde okula getirildi mi? (Teknik Şartname)','Yemekler, yemek saatinden önce okulda hazır oldu mu? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Yemekler "Aylık Yemek Listesine" uygun olarak getirildi mi? (Teknik Şartname)','Yemeklerin miktarı ve bozuk olup olmadığı durumu "Muayene Kabul Komisyonu" tarafından teslim alınırken ve öğrencilere servis yapılmadan önce kontrol edildi mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Getirilen yemekler imza karşılığı sevk irsaliyesi veya tutanakla okula teslim edildi mi? (Teknik Şartname)','Ambalajlı gıdaların kullanım tarihleri uygun mu? (Teknik Şartname)','Gelen yemeklerden ilgili mevzuatta belirtilen süreye uygun olarak günlük numune alındı mı? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Yemekler öğrencilere zamanında ve sıcak bir şekilde servis edildi mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 13/3-d, 13/4-d, 20/3, Teknik Şartname)','Yemekler, sıhhi ve disposable (tek kullanımlık) malzemelerden oluşan setlerle servis edildi mi? (Teknik Şartname)','Yemekte görevli personel dağıtım esnasında takılması gereken ekipmanları kullanarak yemek servisini gerçekleştirdi mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 13/4-e, Teknik Şartname)','Yemekte görevli personel yemek dağıtımı yaparken hijyen şartlarına uygun bir şekilde hareket etti mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Yemek sonrası; yemek yenilen bölümün temizliği yapıldı mı? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)'];
let foodState={date:localIso(new Date()),count:String(arr('veliler').length||0),teacher:''};
function foodSchool(){const x=arr('okulBilgileri').find(r=>r.id==='ayarlar')||arr('okulBilgileri')[0]||global.okulBilgileriAyari||{};return{il:x.il||x.ili||x.sehir||x.ilAdi||'',ilce:x.ilce||x.ilceAdi||x.mudurluk||'',okulAdi:x.okulAdi||x.ad||'KORUK İLK-ORTAOKULU'}}
/* Çıktıdaki imza: okul bilgilerindeki müdür (öğretmen kaydından); kayıt yoksa imza bloğu çıkmaz. */
function foodPrincipal(){
 const x=arr('okulBilgileri').find(r=>r.id==='ayarlar')||arr('okulBilgileri')[0]||global.okulBilgileriAyari||{},t=x.mudurId?arr('ogretmenler').find(o=>String(o.id)===String(x.mudurId)):null;
 return t?`${t.ad||''} ${t.soyad||''}`.replace(/\s+/g,' ').trim():String(x.mudurAdSoyad||x.mudurAdi||x.mudur||'').trim();
}
function foodInspectorName(id){const x=arr('ogretmenler').find(t=>String(t.id)===String(id));return x?`${x.ad||''} ${x.soyad||''}`.replace(/\s+/g,' ').trim():''}
function foodRows(){return FOOD_CHECKS.map((q,i)=>`<tr><td class="food-q" style="width:60%!important">${i+1}. ${esc(q)}</td><td class="food-blank" style="width:10%!important"></td><td class="food-blank" style="width:10%!important"></td><td class="food-note-cell" style="width:20%!important"></td></tr>`).join('')}
function foodPrintBody(){const sc=foodSchool(),dt=foodState.date?new Date(foodState.date+'T00:00:00').toLocaleDateString('tr-TR'):'',ins=foodInspectors(),teacher=foodInspectorName(foodState.teacher||'');return`<div class="food-form-page"><style>@page{size:A4 portrait;margin:0}.food-form-page{font-family:Arial,sans-serif;color:#111;font-size:8pt;line-height:1.08;width:100%;min-height:277mm;box-sizing:border-box;padding:5mm 6mm}.food-form-head{border:1px solid #111;text-align:center;padding:2.8mm 2mm 2.4mm;line-height:1.08}.food-form-head div{font-weight:700;font-size:8.5pt}.food-form-head strong{display:block;font-size:10pt;margin-top:1.2mm}.food-form-head b{display:block;font-size:7.4pt;margin-top:.8mm}.food-meta{display:grid;grid-template-columns:1fr 1fr;border-left:1px solid #111;border-right:1px solid #111;border-bottom:1px solid #111}.food-meta>div{display:grid;grid-template-columns:52% 48%;min-height:11mm}.food-meta>div+div{border-left:1px solid #111}.food-meta b{padding:2mm;border-right:1px solid #111;font-size:7.3pt;display:flex;align-items:center}.food-meta span{padding:2mm;font-size:7.6pt;display:flex;align-items:center}.food-note{margin:2.5mm 0 2mm;text-align:center;font-size:7pt;line-height:1.15}.food-table{width:100%;border-collapse:collapse;table-layout:fixed}.food-table th,.food-table td{border:1px solid #111}.food-table th{background:#fff;text-align:center;padding:2mm .8mm;font-size:7.6pt;font-weight:700;line-height:1.08;height:10mm}.food-table td{padding:1.4mm 1.2mm;vertical-align:middle}.food-table .food-q{font-size:7pt;line-height:1.12}.food-table .food-blank{height:12mm}.food-table .food-note-cell{height:12mm}.food-sign-date{text-align:center;margin:5mm 0 3mm;font-size:7.6pt}.food-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;text-align:center;direction:ltr}.food-signatures>div{min-height:30mm;display:flex;flex-direction:column;justify-content:flex-end}.food-signatures strong{display:block;min-height:6mm;font-size:7.6pt}.food-signatures span{display:block;font-size:7.3pt;margin-top:1.2mm}.food-signatures small{display:block;font-size:7.1pt;margin-top:.4mm}</style><header class="food-form-head"><div>${esc(sc.il).toLocaleUpperCase('tr-TR')} İLİ &nbsp;&nbsp;&nbsp; ${esc(sc.ilce).toLocaleUpperCase('tr-TR')} İLÇESİ &nbsp;&nbsp;&nbsp; ${esc(sc.okulAdi).toLocaleUpperCase('tr-TR')}</div><strong>ÜCRETSİZ ÖĞLE YEMEĞİ DENETİM VE KONTROL FORMU</strong><b>(TAŞIMA MERKEZ OKUL/KURUM MÜDÜRLÜĞÜNCE KULLANILACAK)</b></header><div class="food-meta"><div><b>YEMEK SUNULAN ÖĞRENCİ SAYISI</b><span>${esc(foodState.count)}</span></div><div><b>DENETİM VE KONTROL TARİHİ</b><span>${esc(dt)}</span></div></div><p class="food-note"><b>Not:</b> Çizelgede yer alan denetim ve kontrol maddeleri ile ilgili "Evet / Hayır" bölümü işaretlendikten sonra belirtilen maddelerle ilgili olarak gerek duyulması halinde çizelgede yer alan "AÇIKLAMALAR" bölümü kullanılacaktır.</p><table class="food-table"><thead><tr><th style="width:60%">KONULAR</th><th style="width:10%">EVET</th><th style="width:10%">HAYIR</th><th style="width:20%">AÇIKLAMALAR</th></tr></thead><tbody>${foodRows()}</tbody></table><div class="food-sign-date">${esc(dt)}</div><div class="food-signatures"><div><strong>${esc(teacher)}</strong><span>Denetleyen</span><small>Öğretmen</small></div><div><strong>${esc(foodInspectorName(ins.yard))}</strong><span>Denetleyen</span><small>Müdür Yardımcısı</small></div><div><strong>${esc(foodInspectorName(ins.mudur))}</strong><span>Denetleyen</span><small>Okul Müdürü</small></div></div></div>`}
function auditView(){
 const ins=foodInspectors(),opts=ins.ts.filter(t=>t.id!==ins.mudur&&t.id!==ins.yard).map(t=>`<option value="${esc(t.id)}" ${String(t.id)===String(foodState.teacher)?'selected':''}>${esc(`${t.ad||''} ${t.soyad||''}`.trim())}</option>`).join('');
 if(!foodState.teacher)foodState.teacher=ins.ts.find(t=>t.id!==ins.mudur&&t.id!==ins.yard)?.id||'';
 return `<div class="ka-row ka-row--between ka-wrap"><p class="ka-muted">${esc(foodSchool().okulAdi)} — yalnızca çıktı alınır, form elle doldurulur.</p><button class="ka-btn" type="button" data-food-print>🖨 A4 / PDF Yazdır</button></div><div class="ka-card"><div class="ka-card__body"><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Yemek sunulan öğrenci sayısı</span><input id="food-count" inputmode="numeric" value="${esc(foodState.count)}"></label><label class="ka-field"><span class="ka-field__label">Denetim ve kontrol tarihi</span><input id="food-date" type="date" value="${esc(foodState.date)}"></label></div><label class="ka-field"><span class="ka-field__label">Denetleyen öğretmen</span><select data-food-teacher><option value="">Öğretmen seçin</option>${opts}</select></label><p class="ka-muted">Formdaki Evet, Hayır ve Açıklamalar alanlarına uygulama üzerinden veri girilmez. Çıktı üzerinde elle doldurulur.</p></div></div>`;
}

async function printMode(mode){
 if(!global.ReportEngine?.printReport){toast?.('Yazdırma bileşeni yüklenemedi.');return}
 try{
  if(mode==='monthly'){
   const key=foodMenuCurrentMonth||monthKeyOf(new Date());
   await global.ReportEngine.printReport('Aylık Yemek Menüsü',foodMenuPrintBody(key,foodMenuData(key)),{yon:'yatay',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:6,fontSize:8,compact:true,fileName:'Aylik_Yemek_Menusu_'+key});
  }else if(mode==='weekly'){
   const iso=foodMenuViewDate||localIso(new Date());
   await global.ReportEngine.printReport('Haftalık Yemek Menüsü',foodWeekPrintBody(iso),{yon:'yatay',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:6,fontSize:8,compact:true,fileName:'Haftalik_Yemek_Menusu_'+localIso(foodWeekStart(iso))});
  }else if(mode==='daily'){
   const iso=foodMenuViewDate||localIso(new Date());
   await global.ReportEngine.printReport('Günlük Yemek Menüsü',foodDayPrintBody(iso),{yon:'dikey',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:8,fontSize:8,compact:true,fileName:'Gunluk_Yemek_Menusu_'+iso});
  }else{
   await global.ReportEngine.printReport('Ücretsiz Öğle Yemeği Denetim ve Kontrol Formu',foodPrintBody(),{yon:'dikey',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:5,fontSize:8,compact:true,fileName:'Ucretsiz_Ogle_Yemegi_Denetim_Formu'});
  }
 }catch(e){toast?.('A4 çıktı hazırlanamadı: '+(e?.message||e))}
}

function shell(){return '<section class="ka-page ka-stack ka-fm" data-food-menu-module><header class="ka-page-head"><span class="ka-page-head__icon" aria-hidden="true">🍽️</span><div><small>YEMEK</small><h2 data-food-title>Menü</h2><p data-food-sub></p></div></header><div id="foodMenuContent" class="ka-stack"></div></section>'}

const VIEW_TABS=[['daily','Günlük'],['weekly','Haftalık'],['monthly','Aylık']];
function viewTabs(){return '<div class="ka-fm-views" role="tablist" aria-label="Menü görünümü">'+VIEW_TABS.map(([k,l])=>'<button class="ka-tab'+(k===active?' is-active':'')+'" type="button" role="tab" aria-selected="'+(k===active)+'" data-fm-view="'+k+'">'+l+'</button>').join('')+'</div>'}
function setViewDate(iso){foodMenuViewDate=iso;foodMenuCurrentMonth=monthKeyOf(new Date(iso+'T00:00:00'))}
function render(){
 if(!mounted)return;
 const out=document.getElementById('foodMenuContent');
 if(!out)return;
 const html=active==='daily'?dailyView():active==='weekly'?weeklyView():active==='monthly'?monthlyView():auditView();
 out.innerHTML=(active==='audit'?'':viewTabs())+html;
 out.querySelectorAll('[data-fm-view]').forEach(b=>b.addEventListener('click',()=>{if(b.dataset.fmView===active)return;active=b.dataset.fmView;render()}));
 const h=document.querySelector('[data-food-title]');
 if(h)h.textContent=TITLES[active]||'Yemek';
 const sub=document.querySelector('[data-food-sub]');
 if(sub)sub.textContent=SUBTITLES[active]||'';
 if(active==='monthly'){
  out.querySelector('[data-fm-month]')?.addEventListener('change',e=>{foodMenuCurrentMonth=e.target.value;render()});
  out.querySelectorAll('[data-fm-month-step]').forEach(b=>b.addEventListener('click',()=>{foodMenuCurrentMonth=foodMenuShiftMonth(foodMenuCurrentMonth||monthKeyOf(new Date()),Number(b.dataset.fmMonthStep));render()}));
  if(!out.__foodMonthlyEventsBound){
   out.__foodMonthlyEventsBound=true;
   out.addEventListener('input',e=>{
    const inp=e.target?.closest?.('[data-fm-item]');
    if(!inp)return;
    const day=Number(inp.dataset.fmItem),d=foodMenuData(foodMenuCurrentMonth)[day]||{};
    if(!Number.isInteger(day)||day<1||day>31)return;
    foodDayEnsure(d);
    const rows=[...out.querySelectorAll('[data-fm-item="'+day+'"]')];
    d.items=rows.map(x=>x.value);
    void foodMenuLocalSave();
   });
   out.addEventListener('click',e=>{
    const add=e.target?.closest?.('[data-fm-add]');
    if(add){
     e.preventDefault();
     e.stopPropagation();
     const day=Number(add.dataset.fmAdd);
     if(!Number.isInteger(day)||day<1||day>31)return;
     const d=foodMenuData(foodMenuCurrentMonth)[day]||{};
     foodDayEnsure(d);
     d.items.push('');
     void foodMenuLocalSave();
     render();
     requestAnimationFrame(()=>out.querySelector('[data-fm-item="'+day+'"]')?.focus());
     return;
    }
    const remove=e.target?.closest?.('[data-fm-remove]');
    if(remove){
     e.preventDefault();
     e.stopPropagation();
     const [day,j]=String(remove.dataset.fmRemove).split(':').map(Number);
     if(!Number.isInteger(day)||day<1||day>31||!Number.isInteger(j))return;
     const d=foodMenuData(foodMenuCurrentMonth)[day]||{};
     foodDayEnsure(d);
     d.items.splice(j,1);
     void foodMenuLocalSave();
     render();
     return;
    }
    if(e.target?.closest?.('[data-fm-save]')){
     e.preventDefault();
     e.stopPropagation();
     foodMenuSave(foodMenuLoad(),foodMenuCurrentMonth);
     toast?.('Yemek menüsü kaydedildi ve senkronizasyon kuyruğuna alındı.');
    }
   });
  }
 }else{
  out.onclick=null;
 }
 if(active==='daily'){
  const di=out.querySelector('[data-fm-day]');
  di?.addEventListener('change',e=>{if(e.target.value){setViewDate(e.target.value);render()}});
  di?.addEventListener('click',()=>{try{di.showPicker?.()}catch(_){}});
  out.querySelectorAll('[data-fm-day-step]').forEach(b=>b.addEventListener('click',()=>{setViewDate(foodShiftWeekday(foodMenuViewDate||localIso(new Date()),Number(b.dataset.fmDayStep)));render()}));
  out.querySelector('[data-fm-today]')?.addEventListener('click',()=>{setViewDate(localIso(new Date()));render()});
  out.querySelector('[data-fm-goto]')?.addEventListener('click',e=>{
   active=e.currentTarget.dataset.fmGoto==='monthly'?'monthly':active;render();
   const day=new Date((foodMenuViewDate||localIso(new Date()))+'T00:00:00').getDate();
   requestAnimationFrame(()=>document.querySelector('[data-fm-day-card="'+day+'"]')?.scrollIntoView({block:'center'}));
  });
 }
 if(active==='weekly'){
  const wi=out.querySelector('[data-fm-week-date]');
  wi?.addEventListener('change',e=>{if(e.target.value){setViewDate(e.target.value);render()}});
  wi?.addEventListener('click',()=>{try{wi.showPicker?.()}catch(_){}});
  out.querySelectorAll('[data-fm-week-step]').forEach(b=>b.addEventListener('click',()=>{const d=new Date((foodMenuViewDate||localIso(new Date()))+'T00:00:00');d.setDate(d.getDate()+7*Number(b.dataset.fmWeekStep));setViewDate(localIso(d));render()}));
 }
 out.querySelector('[data-fm-print]')?.addEventListener('click',e=>printMode(e.currentTarget.dataset.fmPrint));
 if(active==='audit'){
  out.querySelector('#food-count')?.addEventListener('input',e=>foodState.count=e.target.value);
  out.querySelector('#food-date')?.addEventListener('change',e=>{foodState.date=e.target.value;render()});
  out.querySelector('[data-food-teacher]')?.addEventListener('change',e=>{foodState.teacher=e.target.value});
  out.querySelector('[data-food-print]')?.addEventListener('click',()=>printMode('audit'));
 }
 global.PermissionService?.apply?.(document.getElementById('v2ModuleRoot')||document);
}

function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];const u=global.AppStore?.subscribe?.('data.yemekMenuleri',()=>{if(foodSelfSaving)return;foodMenuHydrated=false;requestAnimationFrame(render)});if(u)unsubs.push(u)}

async function prepareLocal(){
 if(!global.SyncEngine)return;
 global.SyncEngine.register?.('yemekMenuleri',global.COL?.yemekMenuleri);
 await global.SyncEngine.localHydrate?.(['yemekMenuleri']);
 await seedOfficialOctober2026();
 await seedOfficialNovember2026();
 if(global.navigator?.onLine&&typeof global.SyncEngine.sync==='function'){
  try{await global.SyncEngine.sync(['yemekMenuleri'])}
  catch(e){console.warn('[FoodMenu] Uzak menü senkronizasyonu başarısız:',e?.message||e);global.SyncEngine.schedule?.(100)}
 }else{
  global.SyncEngine.schedule?.(100);
 }
}

async function mount(root=document.getElementById('v2ModuleRoot')){
 if(!root)return false;
 mounted=true;
 root.innerHTML=shell();
 subscribe();
 await prepareLocal();
 if(pendingPage){active=pendingPage.page;pendingPage=null}
 render();
 return true;
}
function unmount(){mounted=false;unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
function openPage(page,title=''){
 const map={daily:'daily',weekly:'weekly',monthly:'monthly',audit:'audit',foodDaily:'daily',foodWeekly:'weekly',foodMonthly:'monthly',food:'audit'};
 const target=map[page];
 if(!target)return false;
 if(!mounted){pendingPage={page:target,title};return true}
 active=target;
 render();
 return true;
}
function back(){return false}

window.FoodMenuModule={mount,unmount,render,prepareLocal,openPage,back,printBody:key=>foodMenuPrintBody(key,foodMenuData(key)),printWeekBody:foodWeekPrintBody,printDayBody:foodDayPrintBody};
window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='food')mount()});
})(window);

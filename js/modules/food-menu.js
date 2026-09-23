/* Koruk Asistan — Yemek Menüsü modülü
 * Günlük / Haftalık / Aylık menü + Yemek Denetim Formu tek dosyada.
 * Veri: DeviceData 'yemekMenuleri' koleksiyonu, ay bazlı ({id:'YYYY-MM', menu:{gün:{items:[]}}}).
 */
(function(global){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
function toast(msg){global.toast?.(msg)}

const FOOD_DATA_TYPE='yemekMenuleri';
let active='monthly',mounted=false,unsubs=[],pendingPage=null;
let foodMenuCurrentMonth=foodMenuMonthKey(new Date().toISOString().slice(0,10)),foodMenuViewDate=new Date().toISOString().slice(0,10),foodMenuCache={};

const DAY_THEMES=[
 null,
 {bg:'#EEF2FF',border:'#C7D2FE',text:'#4338CA',name:'Pazartesi'},
 {bg:'#ECFEFF',border:'#A5F3FC',text:'#0E7490',name:'Salı'},
 {bg:'#FFFBEB',border:'#FDE68A',text:'#B45309',name:'Çarşamba'},
 {bg:'#F0FDF4',border:'#BBF7D0',text:'#15803D',name:'Perşembe'},
 {bg:'#FDF2F8',border:'#FBCFE8',text:'#BE185D',name:'Cuma'},
];
function themeFor(dow){return DAY_THEMES[dow]||DAY_THEMES[1]}

function foodMenuMonthKey(date){const d=new Date(date+'T00:00:00');return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
let foodMenuHydrated=false;
function foodMenuLoad(){if(!foodMenuHydrated){const rows=global.DeviceData?.list?.(FOOD_DATA_TYPE)||[];const out={};rows.forEach(r=>{if(r?.id)out[r.id]=r.menu||{}});foodMenuCache=out;foodMenuHydrated=true}return foodMenuCache}
function foodMenuSave(x){foodMenuCache=x;const rows=Object.entries(x||{}).map(([id,menu])=>({id,menu}));if(global.DeviceData?.persist)global.DeviceData.persist(FOOD_DATA_TYPE,rows).catch(()=>{})}
function foodMenuData(key){const all=foodMenuLoad();all[key]??={};for(let i=1;i<=31;i++)all[key][i]??={items:[]};foodMenuSave(all);return all[key]}
function foodDayItems(x){
 const old=[x?.corba,x?.ana,x?.yardimci,x?.tatli].map(v=>String(v||'').trim()).filter(Boolean);
 const items=Array.isArray(x?.items)?x.items.map(v=>String(v??'').trim()).filter(Boolean):[];
 return items.length?items:old;
}
function foodDayEnsure(x){if(!x||typeof x!=='object')x={};x.items=foodDayItems(x);return x}
function foodMenuMonthOptions(selected){const now=new Date(),out=[];for(let n=-2;n<=10;n++){const d=new Date(now.getFullYear(),now.getMonth()+n,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');out.push('<option value="'+k+'" '+(k===selected?'selected':'')+'>'+d.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})+'</option>')}return out.join('')}
function isToday(iso){return iso===new Date().toISOString().slice(0,10)}

function foodMenuCalendarRows(key,data){
 const y=Number(key.slice(0,4)),m=Number(key.slice(5,7))-1,last=new Date(y,m+1,0).getDate();
 const weekdays=[];
 for(let day=1;day<=last;day++){const dow=new Date(y,m,day).getDay();if(dow>=1&&dow<=5)weekdays.push(day)}
 const weeks=Math.ceil(weekdays.length/5);
 let rows='';
 for(let w=0;w<weeks;w++){
  rows+='<div class="food-cal-week">';
  for(let ci=0;ci<5;ci++){
   const day=weekdays[w*5+ci];
   if(!day){rows+='<div class="food-cal-cell food-cal-cell--empty"></div>';continue}
   const d=new Date(y,m,day),iso=d.toISOString().slice(0,10),dow=d.getDay(),th=themeFor(dow),today=isToday(iso);
   const x=foodDayEnsure(data[day]||{}),items=foodDayItems(x);
   rows+='<div class="food-cal-cell'+(today?' food-cal-cell--today':'')+'" style="background:'+th.bg+';border-color:'+th.border+'">'
    +'<div class="food-cal-date"><strong style="color:'+th.text+'">'+String(day).padStart(2,'0')+'</strong>'
    +'<span style="color:'+th.text+'">'+esc(d.toLocaleDateString('tr-TR',{weekday:'short'}))+'</span>'
    +'<button class="food-add-btn" type="button" data-fm-add="'+day+'" style="color:'+th.text+';border-color:'+th.border+'" aria-label="Yemek ekle">+</button></div>'
    +'<div class="food-cal-items">'+(items.length?items.map((v,j)=>'<div class="food-item-row"><input type="text" data-fm-item="'+day+'" value="'+esc(v)+'" placeholder="Yemek adı"><button class="food-remove-btn" type="button" data-fm-remove="'+day+':'+j+'" aria-label="Sil">×</button></div>').join(''):'<div class="food-cal-empty">Henüz yemek eklenmedi</div>')+'</div></div>';
  }
  rows+='</div>';
 }
 return rows;
}

const FOOD_MENU_STYLE='<style>'
 +'[data-food-menu-module] select[data-fm-month]{background:#fff!important;color:#111!important;border:1px solid rgba(0,0,0,.2);border-radius:8px;padding:6px 10px;font-size:13px}'
 +'.food-tabs{display:flex;gap:6px;overflow-x:auto;padding-bottom:2px}'
 +'.food-tab{padding:8px 14px;border-radius:999px;border:1px solid var(--ka-border,#e4e8e6);background:var(--ka-card,#fff);font-weight:600;font-size:13px;white-space:nowrap;cursor:pointer}'
 +'.food-tab.is-active{background:#0f6e56;border-color:#0f6e56;color:#fff}'
 +'.food-cal-week{display:grid;grid-template-columns:repeat(5,minmax(150px,1fr));gap:8px;margin-bottom:8px}'
 +'.food-cal-cell{border:1.5px solid;border-radius:12px;padding:8px;min-height:130px}'
 +'.food-cal-cell--empty{background:transparent;border:none}'
 +'.food-cal-cell--today{box-shadow:0 0 0 2px #0f6e56 inset}'
 +'.food-cal-date{display:grid;grid-template-columns:26px 1fr auto;align-items:center;gap:4px;margin-bottom:6px}'
 +'.food-cal-date strong{font-size:16px}'
 +'.food-cal-date span{font-size:11px;font-weight:700;text-transform:uppercase}'
 +'.food-add-btn{width:22px;height:22px;border-radius:50%;background:#fff;border:1.5px solid;font-weight:700;line-height:1;cursor:pointer}'
 +'.food-cal-items{display:flex;flex-direction:column;gap:4px}'
 +'.food-cal-empty{font-size:12px;color:rgba(0,0,0,.55);padding:4px 0}'
 +'.food-item-row{display:grid;grid-template-columns:1fr auto;gap:4px}'
 +'.food-item-row input{width:100%;min-width:0;box-sizing:border-box;padding:5px 7px;border-radius:8px;border:1px solid rgba(0,0,0,.2);font-size:12px;background:#fff!important;color:#111!important}'
 +'.food-remove-btn{border:none;background:transparent;font-size:16px;cursor:pointer;opacity:.6}'
 +'.food-day-item{display:flex;align-items:center;gap:10px;padding:10px 4px;border-bottom:1px solid var(--ka-border,#e4e8e6);font-size:15px}'
 +'.food-day-item:last-child{border-bottom:0}'
 +'.food-day-no{font-weight:700;min-width:24px;color:#0f6e56}'
 +'.food-day-empty{padding:12px 0;color:var(--ka-muted,#6b756f)}'
 +'.food-week-item{padding:6px 8px;border-radius:8px;margin-bottom:4px;font-size:13px}'
 +'.food-week-day small{display:block;margin-top:4px;font-weight:400;opacity:.7}'
 +'@media (max-width:640px){.food-cal-week{grid-template-columns:1fr}}'
 +'</style>';

const TITLES={daily:'Günlük Menü',weekly:'Haftalık Menü',monthly:'Aylık Menü',audit:'Yemek Denetim Formu'};

function dailyView(){
 const now=new Date(),viewDate=foodMenuViewDate||now.toISOString().slice(0,10);
 const vd=new Date(viewDate+'T00:00:00'),key=foodMenuMonthKey(viewDate),day=vd.getDate();
 const x=foodDayEnsure(foodMenuData(key)[day]||{}),items=foodDayItems(x);
 const menu=items.length?items.map((v,i)=>'<div class="food-day-item"><span class="food-day-no">'+(i+1)+'.</span><span>'+esc(v)+'</span></div>').join(''):'<div class="food-day-empty">Bu gün için aylık menüye yemek girilmemiş.</div>';
 return '<div class="ka-row ka-row--between ka-wrap"><p class="ka-muted">'+esc(vd.toLocaleDateString('tr-TR',{dateStyle:'full'}))+'</p><div class="ka-row"><input class="ka-input" type="date" data-fm-day value="'+esc(viewDate)+'"><button class="ka-btn" type="button" data-fm-print="daily">🖨 A4</button></div></div><div class="ka-card"><div class="ka-card__body">'+menu+'</div></div>';
}

function weeklyView(){
 const now=new Date(),viewDate=foodMenuViewDate||now.toISOString().slice(0,10),base=new Date(viewDate+'T00:00:00'),dow=base.getDay()||7,mon=new Date(base);
 mon.setDate(base.getDate()-dow+1);
 const weekEnd=new Date(mon);weekEnd.setDate(mon.getDate()+4);
 const weekTitle=mon.toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'})+' – '+weekEnd.toLocaleDateString('tr-TR',{day:'2-digit',month:'long',year:'numeric'});
 const rows=Array.from({length:5},(_,i)=>{
  const d=new Date(mon);d.setDate(mon.getDate()+i);
  const iso=d.toISOString().slice(0,10),k=foodMenuMonthKey(iso),th=themeFor(d.getDay()),items=foodDayItems(foodMenuData(k)[d.getDate()]||{});
  const menu=items.length?items.map((v,j)=>'<div class="food-week-item" style="background:'+th.bg+';color:'+th.text+'">'+(j+1)+'. '+esc(v)+'</div>').join(''):'<span class="ka-muted">Menü girilmemiş</span>';
  return '<tr><th style="color:'+th.text+'"><div class="food-week-day">'+esc(d.toLocaleDateString('tr-TR',{weekday:'long'}))+'<small>'+esc(d.toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'}))+'</small></div></th><td>'+menu+'</td></tr>';
 }).join('');
 return '<div class="ka-row ka-row--between ka-wrap"><p class="ka-muted">'+esc(weekTitle)+'</p><div class="ka-row"><input class="ka-input" type="date" data-fm-week-date value="'+esc(viewDate)+'"><button class="ka-btn" type="button" data-fm-print="weekly">🖨 A4</button></div></div><div class="ka-card"><div class="ka-card__body"><div class="ka-table-wrap"><table class="ka-table"><thead><tr><th>Gün</th><th>Yemekler</th></tr></thead><tbody>'+rows+'</tbody></table></div></div></div>';
}

function monthlyView(){
 const now=new Date(),initial=foodMenuCurrentMonth||foodMenuMonthKey(now.toISOString().slice(0,10)),data=foodMenuData(initial);
 const rows=foodMenuCalendarRows(initial,data);
 return '<div class="ka-row ka-row--between ka-wrap"><p class="ka-muted">Pazartesi–Cuma. Her güne istediğiniz kadar yemek satırı ekleyebilirsiniz.</p><div class="ka-row"><select data-fm-month>'+foodMenuMonthOptions(initial)+'</select><button class="ka-btn" type="button" data-fm-save>💾 Kaydet</button><button class="ka-btn" type="button" data-fm-print="monthly">🖨 A4</button></div></div>'+rows;
}

/* --- Yemek Denetim Formu --- */
function foodInspectors(){const ts=arr('ogretmenler').filter(x=>x?.id).slice().sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr'));const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{};const mudur=school.mudurId?ts.find(x=>x.id===school.mudurId):null;const yard=ts.find(x=>/müdür yardımc|mudur yardimc/i.test(String(x.unvan||x.gorev||x.gorevi||'')));return{ts,mudur:mudur?.id||'',yard:yard?.id||''}}
const FOOD_CHECKS=['Yemekler paslanmaz çelik-krom ve ısı yalıtımlı kaplarda taze ve sıcak bir şekilde okula getirildi mi? (Teknik Şartname)','Yemekler, yemek saatinden önce okulda hazır oldu mu? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Yemekler "Aylık Yemek Listesine" uygun olarak getirildi mi? (Teknik Şartname)','Yemeklerin miktarı ve bozuk olup olmadığı durumu "Muayene Kabul Komisyonu" tarafından teslim alınırken ve öğrencilere servis yapılmadan önce kontrol edildi mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Getirilen yemekler imza karşılığı sevk irsaliyesi veya tutanakla okula teslim edildi mi? (Teknik Şartname)','Ambalajlı gıdaların kullanım tarihleri uygun mu? (Teknik Şartname)','Gelen yemeklerden ilgili mevzuatta belirtilen süreye uygun olarak günlük numune alındı mı? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Yemekler öğrencilere zamanında ve sıcak bir şekilde servis edildi mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 13/3-d, 13/4-d, 20/3, Teknik Şartname)','Yemekler, sıhhi ve disposable (tek kullanımlık) malzemelerden oluşan setlerle servis edildi mi? (Teknik Şartname)','Yemekte görevli personel dağıtım esnasında takılması gereken ekipmanları kullanarak yemek servisini gerçekleştirdi mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 13/4-e, Teknik Şartname)','Yemekte görevli personel yemek dağıtımı yaparken hijyen şartlarına uygun bir şekilde hareket etti mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Yemek sonrası; yemek yenilen bölümün temizliği yapıldı mı? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)'];
let foodState={date:new Date().toISOString().slice(0,10),count:String(arr('veliler').length||0),teacher:''};
function foodSchool(){const x=arr('okulBilgileri').find(r=>r.id==='ayarlar')||arr('okulBilgileri')[0]||global.okulBilgileriAyari||{};return{il:x.il||x.ili||x.sehir||x.ilAdi||'',ilce:x.ilce||x.ilceAdi||x.mudurluk||'',okulAdi:x.okulAdi||x.ad||'KORUK İLK-ORTAOKULU'}}
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
  if(mode==='daily'||mode==='weekly'||mode==='monthly'){
   const now=new Date(),key=foodMenuCurrentMonth||foodMenuMonthKey(now.toISOString().slice(0,10)),data=foodMenuData(key);
   const rows=foodMenuCalendarRows(key,data);
   const body='<div class="fm-print">'+FOOD_MENU_STYLE+'<h1>'+esc(foodSchool().okulAdi)+'</h1><h2>'+esc(new Date(Number(key.slice(0,4)),Number(key.slice(5,7))-1,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'}).toUpperCase())+' YEMEK MENÜSÜ</h2>'+rows+'</div>';
   await global.ReportEngine.printReport('Yemek Menüsü',body,{yon:'yatay',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:6,fontSize:8,compact:true,fileName:'Yemek_Menusu'});
  }else{
   await global.ReportEngine.printReport('Ücretsiz Öğle Yemeği Denetim ve Kontrol Formu',foodPrintBody(),{yon:'dikey',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:5,fontSize:8,compact:true,fileName:'Ucretsiz_Ogle_Yemegi_Denetim_Formu'});
  }
 }catch(e){toast?.('A4 çıktı hazırlanamadı: '+(e?.message||e))}
}

function shell(){return '<section class="ka-stack" data-food-menu-module><div class="ka-row ka-row--between"><div><h2 data-food-title>🍽️ Yemek</h2><p class="ka-muted">Günlük, haftalık, aylık menü ve denetim formu.</p></div></div>'+FOOD_MENU_STYLE+'<div id="foodMenuContent" class="ka-stack"></div></section>'}

function render(){
 if(!mounted)return;
 const out=document.getElementById('foodMenuContent');
 if(!out)return;
 const html=active==='daily'?dailyView():active==='weekly'?weeklyView():active==='monthly'?monthlyView():auditView();
 out.innerHTML=html;
 const h=document.querySelector('[data-food-title]');
 if(h)h.textContent='🍽️ '+(TITLES[active]||'Yemek');
 if(active==='monthly'){
  out.querySelector('[data-fm-month]')?.addEventListener('change',e=>{foodMenuCurrentMonth=e.target.value;render()});
  out.querySelectorAll('[data-fm-item]').forEach(inp=>inp.addEventListener('input',()=>{
   const day=Number(inp.dataset.fmItem),d=foodMenuData(foodMenuCurrentMonth)[day]||{};
   foodDayEnsure(d);
   const rows=[...out.querySelectorAll('[data-fm-item="'+day+'"]')];
   d.items=rows.map(x=>x.value.trim()).filter(Boolean);
   foodMenuSave(foodMenuLoad());
  }));
  out.querySelectorAll('[data-fm-add]').forEach(btn=>btn.addEventListener('click',()=>{
   const day=Number(btn.dataset.fmAdd),d=foodMenuData(foodMenuCurrentMonth)[day]||{};
   foodDayEnsure(d);d.items.push('');
   foodMenuSave(foodMenuLoad());render();
   requestAnimationFrame(()=>out.querySelectorAll('[data-fm-item="'+day+'"]')[d.items.length-1]?.focus());
  }));
  out.querySelectorAll('[data-fm-remove]').forEach(btn=>btn.addEventListener('click',()=>{
   const [day,j]=String(btn.dataset.fmRemove).split(':').map(Number),d=foodMenuData(foodMenuCurrentMonth)[day]||{};
   foodDayEnsure(d);if(Number.isInteger(j))d.items.splice(j,1);
   foodMenuSave(foodMenuLoad());render();
  }));
  out.querySelector('[data-fm-save]')?.addEventListener('click',()=>{foodMenuSave(foodMenuLoad());toast?.('Yemek menüsü kaydedildi.');});
 }
 if(active==='daily'){
  out.querySelector('[data-fm-day]')?.addEventListener('change',e=>{if(e.target.value){foodMenuViewDate=e.target.value;foodMenuCurrentMonth=foodMenuMonthKey(e.target.value);render()}});
 }
 if(active==='weekly'){
  out.querySelector('[data-fm-week-date]')?.addEventListener('change',e=>{if(e.target.value){foodMenuViewDate=e.target.value;render()}});
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

function subscribe(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];const u=global.AppStore?.subscribe?.('data.yemekMenuleri',()=>{foodMenuHydrated=false;requestAnimationFrame(render)});if(u)unsubs.push(u)}

async function prepareLocal(){if(!global.SyncEngine)return;global.SyncEngine.register?.('yemekMenuleri',global.COL?.yemekMenuleri);await global.SyncEngine.localHydrate?.(['yemekMenuleri']);global.SyncEngine.schedule?.(100)}

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

window.FoodMenuModule={mount,unmount,render,prepareLocal,openPage,back};
window.addEventListener('koruk:module-ready',e=>{if(e.detail?.name==='food')mount()});
})(window);

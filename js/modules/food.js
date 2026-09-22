/* Koruk Asistan — Yemek Modülü */
(function(global){
'use strict';
if(global.FoodModule)return;
const device=()=>global.DeviceData;
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let active='foodMonthly',mounted=false;
function foodInspectors(){const ts=arr('ogretmenler').filter(x=>x?.id).slice().sort((a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr'));const school=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{};const mudur=school.mudurId?ts.find(x=>x.id===school.mudurId):null;const yard=ts.find(x=>/müdür yardımc|mudur yardimc/i.test(String(x.unvan||x.gorev||x.gorevi||'')));return{ts,mudur:mudur?.id||'',yard:yard?.id||''}}
const FOOD_CHECKS=['Yemekler paslanmaz çelik-krom ve ısı yalıtımlı kaplarda taze ve sıcak bir şekilde okula getirildi mi? (Teknik Şartname)','Yemekler, yemek saatinden önce okulda hazır oldu mu? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Yemekler “Aylık Yemek Listesine” uygun olarak getirildi mi? (Teknik Şartname)','Yemeklerin miktarı ve bozuk olup olmadığı durumu “Muayene Kabul Komisyonu” tarafından teslim alınırken ve öğrencilere servis yapılmadan önce kontrol edildi mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Getirilen yemekler imza karşılığı sevk irsaliyesi veya tutanakla okula teslim edildi mi? (Teknik Şartname)','Ambalajlı gıdaların kullanım tarihleri uygun mu? (Teknik Şartname)','Gelen yemeklerden ilgili mevzuatta belirtilen süreye uygun olarak günlük numune alındı mı? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Yemekler öğrencilere zamanında ve sıcak bir şekilde servis edildi mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 13/3-d, 13/4-d, 20/3, Teknik Şartname)','Yemekler, sıhhi ve disposable (tek kullanımlık) malzemelerden oluşan setlerle servis edildi mi? (Teknik Şartname)','Yemekte görevli personel dağıtım esnasında takılması gereken ekipmanları kullanarak yemek servisini gerçekleştirdi mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 13/4-e, Teknik Şartname)','Yemekte görevli personel yemek dağıtımı yaparken hijyen şartlarına uygun bir şekilde hareket etti mi? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)','Yemek sonrası; yemek yenilen bölümün temizliği yapıldı mı? (Millî Eğitim Bakanlığı Taşıma Yoluyla Eğitime Erişim Yönetmeliği 20/3, Teknik Şartname)'];
let foodState={date:new Date().toISOString().slice(0,10),count:String(arr('veliler').length||0),answers:Array(12).fill(''),notes:Array(12).fill(''),inspectors:['','']};
function foodSchool(){const x=arr('okulBilgileri').find(r=>r.id==='ayarlar')||arr('okulBilgileri')[0]||global.okulBilgileriAyari||{};return{il:x.il||x.ili||x.sehir||x.ilAdi||'',ilce:x.ilce||x.ilceAdi||x.mudurluk||'',okulAdi:x.okulAdi||x.ad||'KORUK İLK-ORTAOKULU'}}
function foodInspectorName(id){const x=arr('ogretmenler').find(t=>String(t.id)===String(id));return x?`${x.ad||''} ${x.soyad||''}`.replace(/\\s+/g,' ').trim():''}
function foodRows(){return FOOD_CHECKS.map((q,i)=>`<tr><td class="food-q" style="width:60%!important">${i+1}. ${esc(q)}</td><td class="food-blank" style="width:10%!important"></td><td class="food-blank" style="width:10%!important"></td><td class="food-note-cell" style="width:20%!important"></td></tr>`).join('')}
function foodPrintBody(){const sc=foodSchool(),dt=foodState.date?new Date(foodState.date+'T00:00:00').toLocaleDateString('tr-TR'):'',ins=foodInspectors(),teacher=foodInspectorName(foodState.teacher||'');return`<div class="food-form-page"><style>@page{size:A4 portrait;margin:0}.food-form-page{font-family:Arial,sans-serif;color:#111;font-size:8pt;line-height:1.08;width:100%;min-height:277mm;box-sizing:border-box;padding:5mm 6mm}.food-form-head{border:1px solid #111;text-align:center;padding:2.8mm 2mm 2.4mm;line-height:1.08}.food-form-head div{font-weight:700;font-size:8.5pt}.food-form-head strong{display:block;font-size:10pt;margin-top:1.2mm}.food-form-head b{display:block;font-size:7.4pt;margin-top:.8mm}.food-meta{display:grid;grid-template-columns:1fr 1fr;border-left:1px solid #111;border-right:1px solid #111;border-bottom:1px solid #111}.food-meta>div{display:grid;grid-template-columns:52% 48%;min-height:11mm}.food-meta>div+div{border-left:1px solid #111}.food-meta b{padding:2mm;border-right:1px solid #111;font-size:7.3pt;display:flex;align-items:center}.food-meta span{padding:2mm;font-size:7.6pt;display:flex;align-items:center}.food-note{margin:2.5mm 0 2mm;text-align:center;font-size:7pt;line-height:1.15}.food-table{width:100%;border-collapse:collapse;table-layout:fixed}.food-table col:nth-child(1){width:60%!important}.food-table col:nth-child(2),.food-table col:nth-child(3){width:10%!important}.food-table col:nth-child(4){width:20%!important}.food-table th,.food-table td{border:1px solid #111}.food-table th{background:#fff;text-align:center;padding:2mm .8mm;font-family:Arial,sans-serif;font-size:7.6pt;font-weight:700;line-height:1.08;height:10mm}.food-table td{padding:1.4mm 1.2mm;vertical-align:middle}.food-table .food-q{width:60%!important;font-size:7pt;line-height:1.12}.food-table .food-blank{width:10%!important;height:12mm}.food-table .food-note-cell{width:20%!important;height:12mm}.food-table th:nth-child(1){width:60%}.food-table th:nth-child(2),.food-table th:nth-child(3){width:10%}.food-table th:nth-child(4){width:20%}.food-sign-date{text-align:center;margin:5mm 0 3mm;font-size:7.6pt}.food-signatures{display:grid;grid-template-columns:repeat(3,1fr);gap:6mm;text-align:center;direction:ltr}.food-signatures>div{min-height:30mm;display:flex;flex-direction:column;justify-content:flex-end}.food-signatures strong{display:block;min-height:6mm;font-size:7.6pt}.food-signatures span{display:block;font-size:7.3pt;margin-top:1.2mm}.food-signatures small{display:block;font-size:7.1pt;margin-top:.4mm}</style><header class="food-form-head"><div>${esc(sc.il).toLocaleUpperCase('tr-TR')} İLİ &nbsp;&nbsp;&nbsp; ${esc(sc.ilce).toLocaleUpperCase('tr-TR')} İLÇESİ &nbsp;&nbsp;&nbsp; ${esc(sc.okulAdi).toLocaleUpperCase('tr-TR')}</div><strong>ÜCRETSİZ ÖĞLE YEMEĞİ DENETİM VE KONTROL FORMU</strong><b>(TAŞIMA MERKEZ OKUL/KURUM MÜDÜRLÜĞÜNCE KULLANILACAK)</b></header><div class="food-meta"><div><b>YEMEK SUNULAN ÖĞRENCİ SAYISI</b><span>${esc(foodState.count)}</span></div><div><b>DENETİM VE KONTROL TARİHİ</b><span>${esc(dt)}</span></div></div><p class="food-note"><b>Not:</b> Çizelgede yer alan denetim ve kontrol maddeleri ile ilgili “Evet / Hayır” bölümü işaretlendikten sonra belirtilen maddelerle ilgili olarak gerek duyulması halinde çizelgede yer alan “AÇIKLAMALAR” bölümü kullanılacaktır.</p><table class="food-table"><colgroup><col style="width:60%"><col style="width:10%"><col style="width:10%"><col style="width:20%"></colgroup><thead><tr><th style="width:60%!important">KONULAR</th><th style="width:10%!important">EVET</th><th style="width:10%!important">HAYIR</th><th style="width:20%!important">AÇIKLAMALAR</th></tr></thead><tbody>${foodRows()}</tbody></table><div class="food-sign-date">${esc(dt)}</div><div class="food-signatures"><div><strong>${esc(teacher)}</strong><span>Denetleyen</span><small>Öğretmen</small></div><div><strong>${esc(foodInspectorName(ins.yard))}</strong><span>Denetleyen</span><small>Müdür Yardımcısı</small></div><div><strong>${esc(foodInspectorName(ins.mudur))}</strong><span>Denetleyen</span><small>Okul Müdürü</small></div></div></div>`}
const FOOD_MENU_KEY='koruk_yemek_menusu_v1',FOOD_DATA_TYPE='yemekMenuleri';let foodMenuCurrentMonth=foodMenuMonthKey(new Date().toISOString().slice(0,10)),foodMenuViewDate=new Date().toISOString().slice(0,10),foodMenuCache={};
function foodMenuLoad(){const rows=global.DeviceData?.list?.(FOOD_DATA_TYPE)||[];if(rows.length){const out={};rows.forEach(r=>{if(r?.id)out[r.id]=r.menu||{}});foodMenuCache=out;return out}return foodMenuCache}
function foodMenuSave(x){foodMenuCache=x;const rows=Object.entries(x||{}).map(([id,menu])=>({id,menu}));if(global.DeviceData?.persist)global.DeviceData.persist(FOOD_DATA_TYPE,rows).catch(()=>{})}
function foodMenuMonthKey(date){const d=new Date(date+'T00:00:00');return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')}
function foodMenuData(key){const all=foodMenuLoad();all[key]??={};for(let i=1;i<=31;i++)all[key][i]??={corba:'',ana:'',yardimci:'',tatli:''};foodMenuSave(all);return all[key]}
function foodMenuMonthOptions(selected){const now=new Date(),out=[];for(let n=-2;n<=10;n++){const d=new Date(now.getFullYear(),now.getMonth()+n,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');out.push(`<option value="${k}" ${k===selected?'selected':''}>${d.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})}</option>`)}return out.join('')}
function foodMenuDayName(k,day){const d=new Date(k+'-'+String(day).padStart(2,'0')+'T00:00:00');return d.toLocaleDateString('tr-TR',{weekday:'long'})}
function foodMenuDate(k,day){return k+'-'+String(day).padStart(2,'0')}
function foodDayItems(x){
 const old=[x?.corba,x?.ana,x?.yardimci,x?.tatli].map(v=>String(v||'').trim()).filter(Boolean);
 const items=Array.isArray(x?.items)?x.items.map(v=>String(v??'').trim()).filter(Boolean):[];
 return items.length?items:old;
}
function foodDayEnsure(x){
 if(!x||typeof x!=='object')x={};
 x.items=foodDayItems(x);
 return x;
}
function foodMenuMonthOptions(selected){
 const now=new Date(),out=[];
 for(let n=-2;n<=10;n++){
  const d=new Date(now.getFullYear(),now.getMonth()+n,1),k=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');
  out.push('<option value="'+k+'" '+(k===selected?'selected':'')+'>'+d.toLocaleDateString('tr-TR',{month:'long',year:'numeric'})+'</option>');
 }
 return out.join('');
}
function foodMenuDayName(k,day){const d=new Date(k+'-'+String(day).padStart(2,'0')+'T00:00:00');return d.toLocaleDateString('tr-TR',{weekday:'long'})}
function foodMenuDate(k,day){return k+'-'+String(day).padStart(2,'0')}
function foodMenuPrint(mode){
 const sc=foodSchool(),k=foodMenuCurrentMonth||foodMenuMonthKey(new Date().toISOString().slice(0,10)),data=foodMenuData(k);
 const title=mode==='foodMonthly'?'Aylık Yemek Menüsü':mode==='foodWeekly'?'Haftalık Yemek Menüsü':'Günlük Yemek Menüsü';
 if(mode==='foodMonthly'){
  const y=Number(k.slice(0,4)),m=Number(k.slice(5,7))-1,last=new Date(y,m+1,0).getDate(),first=new Date(y,m,1),offset=(first.getDay()||7)-1,weeks=Math.ceil((offset+last)/7);
  let rows='';
  for(let w=0;w<weeks;w++){
   rows+='<tr>';
   for(let ci=0;ci<5;ci++){
    const day=w*7+ci-offset+1;
    if(day<1||day>last){rows+='<td class="empty"></td>';continue}
    const items=foodDayItems(data[day]||{});
    const d=new Date(y,m,day);
    rows+='<td><div class="day-head"><b>'+String(day).padStart(2,'0')+'</b><span>'+esc(d.toLocaleDateString('tr-TR',{weekday:'long'}))+'</span></div><div class="day-items">'+(items.length?items.map(v=>'<div>'+esc(v)+'</div>').join(''):'<div class="muted">Menü girilmemiş</div>')+'</div></td>';
   }
   rows+='</tr>';
  }
  const body='<div class="fm-month-print"><h1>'+esc(sc.okulAdi||'KORUK İLK - ORTAOKULU')+'</h1><h2>'+esc(new Date(y,m,1).toLocaleDateString('tr-TR',{month:'long',year:'numeric'}).toUpperCase())+' AYLIK YEMEK MENÜSÜ</h2><table><thead><tr><th>Pazartesi</th><th>Salı</th><th>Çarşamba</th><th>Perşembe</th><th>Cuma</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  const extra='<style>@page{size:A4 landscape;margin:8mm}.fm-month-print{font-family:Arial,sans-serif;color:#17241f}.fm-month-print h1{text-align:center;font-size:15pt;margin:0 0 2mm}.fm-month-print h2{text-align:center;font-size:12pt;margin:0 0 5mm}.fm-month-print table{width:100%;border-collapse:collapse;table-layout:fixed}.fm-month-print th{border:1px solid #465850;background:#e8efec;padding:2.2mm;text-align:center;font-size:8.5pt}.fm-month-print td{border:1px solid #66766f;vertical-align:top;padding:2mm;height:31mm}.fm-month-print td.empty{background:#f5f7f6}.fm-month-print .day-head{display:flex;align-items:center;gap:2mm;border-bottom:1px solid #b9c5c0;padding-bottom:1.2mm;margin-bottom:1.5mm}.fm-month-print .day-head b{font-size:11pt}.fm-month-print .day-head span{font-size:7.5pt;font-weight:700}.fm-month-print .day-items{font-size:8pt;line-height:1.45}.fm-month-print .day-items div{padding:.6mm 0}.fm-month-print .muted{color:#7b8580;font-style:italic}</style>';
  return window.ReportEngine.printReport(title,body,{yon:'yatay',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:5,fileName:title.replaceAll(' ','_'),extraHead:extra});
 }
 const viewDate=foodMenuViewDate||new Date().toISOString().slice(0,10);
 if(mode==='foodDaily'){
  const d=new Date(viewDate+'T00:00:00'),kk=foodMenuMonthKey(viewDate),items=foodDayItems(foodMenuData(kk)[d.getDate()]||{});
  const rows=items.map(v=>'<tr><td>'+esc(v)+'</td></tr>').join('')||'<tr><td>Menü girilmemiş</td></tr>';
  const body='<div class="fm-print"><h1>'+esc(sc.okulAdi)+'</h1><h2>'+esc(d.toLocaleDateString('tr-TR',{dateStyle:'full'}))+'</h2><table><thead><tr><th>Menü</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
  return window.ReportEngine.printReport(title,body,{yon:'dikey',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:7,fileName:title.replaceAll(' ','_')});
 }
 const base=new Date(viewDate+'T00:00:00'),w=base.getDay()||7,mon=new Date(base);mon.setDate(base.getDate()-w+1);
 const rows=Array.from({length:5},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);const kk=foodMenuMonthKey(d.toISOString().slice(0,10)),items=foodDayItems(foodMenuData(kk)[d.getDate()]||{});return '<tr><th>'+esc(d.toLocaleDateString('tr-TR',{weekday:'long',day:'2-digit',month:'2-digit'}))+'</th><td>'+ (items.length?items.map(esc).join('<br>'):'—') +'</td></tr>'}).join('');
 const body='<div class="fm-print"><h1>'+esc(sc.okulAdi)+'</h1><h2>'+esc(title)+'</h2><table><thead><tr><th>Gün</th><th>Yemekler</th></tr></thead><tbody>'+rows+'</tbody></table></div>';
 return window.ReportEngine.printReport(title,body,{yon:'dikey',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:7,fileName:title.replaceAll(' ','_')});
}
function foodMenuCalendarRows(k,data){
 const y=Number(k.slice(0,4)),m=Number(k.slice(5,7))-1,last=new Date(y,m+1,0).getDate();
 const first=new Date(y,m,1),offset=(first.getDay()||7)-1,weeks=Math.ceil((offset+last)/7),days=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];
 return Array.from({length:weeks},(_,w)=>{
  return '<div class="food-calendar-week">'+Array.from({length:5},(_,ci)=>{
   const day=w*7+ci-offset+1;
   if(day<1||day>last)return '<div class="food-calendar-cell is-empty"></div>';
   const x=foodDayEnsure(data[day]||{}),items=foodDayItems(x);
   const fields=items.map((v,j)=>'<div class="food-menu-item-row"><input data-fm-item="'+day+'" value="'+esc(v)+'" placeholder="Yemek"><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-fm-remove="'+day+':'+j+'" aria-label="Yemeği sil">×</button></div>').join('');
   return '<div class="food-calendar-cell"><div class="food-calendar-date"><strong>'+String(day).padStart(2,'0')+'</strong><span>'+days[ci]+'</span><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-fm-add="'+day+'">+ Yemek</button></div><div class="food-calendar-items">'+(fields||'<span class="ka-muted">—</span>')+'</div></div>';
  }).join('')+'</div>';
 }).join('');
}
function foodMenuPage(mode){
 const now=new Date(),initial=foodMenuCurrentMonth||foodMenuMonthKey(now.toISOString().slice(0,10)),data=foodMenuData(initial);
 if(mode==='foodDaily'){
  const viewDate=foodMenuViewDate||now.toISOString().slice(0,10),vd=new Date(viewDate+'T00:00:00'),key=foodMenuMonthKey(viewDate),day=vd.getDate(),x=foodDayEnsure(foodMenuData(key)[day]||{}),items=foodDayItems(x);
  return{count:items.length,html:'<section class="ka-stack" data-food-menu-page data-food-menu-mode="foodDaily"><div class="ka-row ka-row--between ka-wrap"><div><h3>☀️ Günlük Menü</h3><p class="ka-muted">'+esc(vd.toLocaleDateString('tr-TR',{dateStyle:'full'}))+'</p></div><div class="ka-row"><input class="ka-input" type="date" data-fm-day value="'+esc(viewDate)+'"><button class="ka-btn" type="button" data-fm-print>🖨 A4</button></div></div><div class="ka-card"><div class="ka-card__body food-day-menu">'+(items.length?items.map((v,i)=>'<div><b>'+(i+1)+'.</b><span>'+esc(v)+'</span></div>').join(''):'<div><span>Menü girilmemiş</span></div>')+'</div></div></section>'};
 }
 if(mode==='foodWeekly'){
  const viewDate=foodMenuViewDate||now.toISOString().slice(0,10),base=new Date(viewDate+'T00:00:00'),day=base.getDay()||7,mon=new Date(base);mon.setDate(base.getDate()-day+1);
  const rows=Array.from({length:5},(_,i)=>{const d=new Date(mon);d.setDate(mon.getDate()+i);const k=foodMenuMonthKey(d.toISOString().slice(0,10)),items=foodDayItems(foodMenuData(k)[d.getDate()]||{});return '<tr><th>'+esc(d.toLocaleDateString('tr-TR',{weekday:'long',day:'2-digit',month:'2-digit'}))+'</th><td>'+ (items.length?items.map((v,j)=>(j+1)+'. '+esc(v)).join('<br>'):'—') +'</td></tr>'}).join('');
  return{count:5,html:'<section class="ka-stack" data-food-menu-page data-food-menu-mode="foodWeekly"><div class="ka-row ka-row--between ka-wrap"><div><h3>📆 Haftalık Menü</h3><p class="ka-muted">Seçilen haftanın Pazartesi–Cuma menüsü</p></div><div class="ka-row"><input class="ka-input" type="date" data-fm-week-date value="'+esc(viewDate)+'"><button class="ka-btn" type="button" data-fm-print>🖨 A4</button></div></div><div class="ka-card"><div class="ka-card__body"><div class="ka-table-wrap"><table class="ka-table food-week-table"><thead><tr><th>Gün</th><th>Yemekler</th></tr></thead><tbody>'+rows+'</tbody></table></div></div></div></section>'};
 }
 const max=new Date(Number(initial.slice(0,4)),Number(initial.slice(5,7)),0).getDate();
 const rows=foodMenuCalendarRows(initial,data);
 return{count:max,html:'<section class="ka-stack" data-food-menu-page data-food-menu-mode="foodMonthly"><style>.food-month-calendar{overflow-x:auto}.food-calendar-week{display:grid;grid-template-columns:repeat(5,minmax(180px,1fr));min-width:900px;border-left:1px solid var(--ka-border,#d7dfdc)}.food-calendar-cell{min-height:145px;border-right:1px solid var(--ka-border,#d7dfdc);border-bottom:1px solid var(--ka-border,#d7dfdc);padding:8px;background:var(--ka-card,#fff)}.food-calendar-cell.is-empty{background:rgba(127,127,127,.04)}.food-calendar-date{display:grid;grid-template-columns:34px 1fr auto;gap:5px;align-items:center;padding-bottom:7px;border-bottom:1px solid var(--ka-border,#e4e8e6);margin-bottom:7px}.food-calendar-date strong{font-size:17px}.food-calendar-date span{font-size:12px;font-weight:700}.food-calendar-items{display:flex;flex-direction:column;gap:5px}.food-menu-item-row{display:grid;grid-template-columns:1fr auto;gap:4px}.food-menu-item-row input{width:100%;min-width:0;box-sizing:border-box;padding:6px 7px}.food-menu-item-row .ka-btn{padding:4px 7px}.food-calendar-head{display:grid;grid-template-columns:repeat(5,minmax(180px,1fr));min-width:900px;background:var(--ka-surface,#f4f7f5);border:1px solid var(--ka-border,#d7dfdc);border-bottom:0}.food-calendar-head b{padding:9px;text-align:center;border-right:1px solid var(--ka-border,#d7dfdc)}.food-calendar-head b:last-child{border-right:0}.food-month-calendar .ka-input{max-width:180px}</style><div class="ka-row ka-row--between ka-wrap"><div><h3>🗓️ Aylık Menü</h3><p class="ka-muted">Pazartesi–Cuma. Her güne istediğiniz kadar yemek satırı ekleyebilirsiniz.</p></div><div class="ka-row"><select data-fm-month>'+foodMenuMonthOptions(initial)+'</select><button class="ka-btn" type="button" data-fm-save>💾 Kaydet</button><button class="ka-btn" type="button" data-fm-print>🖨 A4</button></div></div><div class="ka-card"><div class="ka-card__body food-month-calendar"><div class="food-calendar-head"><b>Pazartesi</b><b>Salı</b><b>Çarşamba</b><b>Perşembe</b><b>Cuma</b></div>'+rows+'</div></div></section>'};
}

function foodPage(){const sc=foodSchool(),ins=foodInspectors(),opts=ins.ts.filter(t=>t.id!==ins.mudur&&t.id!==ins.yard).map(t=>`<option value="${esc(t.id)}" ${String(t.id)===String(foodState.teacher)?"selected":""}>${esc(`${t.ad||''} ${t.soyad||''}`.trim())}</option>`).join('');if(!foodState.teacher)foodState.teacher=ins.ts.find(t=>t.id!==ins.mudur&&t.id!==ins.yard)?.id||'';return{count:12,html:`<section class="ka-stack" data-food-page><div class="ka-row ka-row--between ka-wrap"><div><h3>🍽️ Ücretsiz Öğle Yemeği Denetim ve Kontrol Formu</h3><p class="ka-muted">${esc(sc.okulAdi)} — yalnızca çıktı alınır, form elle doldurulur.</p></div><button class="ka-btn" type="button" data-food-print>🖨 A4 / PDF Yazdır</button></div><div class="ka-card"><div class="ka-card__body"><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Yemek sunulan öğrenci sayısı</span><input id="food-count" inputmode="numeric" value="${esc(foodState.count)}"></label><label class="ka-field"><span class="ka-field__label">Denetim ve kontrol tarihi</span><input id="food-date" type="date" value="${esc(foodState.date)}"></label></div><label class="ka-field"><span class="ka-field__label">Denetleyen öğretmen</span><select data-food-teacher><option value="">Öğretmen seçin</option>${opts}</select></label><p class="ka-muted">Formdaki Evet, Hayır ve Açıklamalar alanlarına uygulama üzerinden veri girilmez. Çıktı üzerinde elle doldurulur.</p></div></div></section>`}}
function shell(){return '<section class="ka-stack" data-food-module><div class="ka-row ka-row--between"><div><h2>Yemek</h2><p class="ka-muted" data-food-subtitle>Günlük, haftalık ve aylık yemek menüleri.</p></div><span id="foodCount" class="ka-badge"></span></div><div id="foodContent" class="ka-stack"></div></section>'}
function bind(){
 const fm=document.querySelector('[data-food-menu-page]');
 if(fm){
  const q=s=>fm.querySelector(s);
  q('[data-fm-month]')?.addEventListener('change',e=>{foodMenuCurrentMonth=e.target.value;render()});
  q('[data-fm-day]')?.addEventListener('change',e=>{if(e.target.value){foodMenuViewDate=e.target.value;foodMenuCurrentMonth=foodMenuMonthKey(e.target.value);render()}});
  q('[data-fm-week-date]')?.addEventListener('change',e=>{if(e.target.value){foodMenuViewDate=e.target.value;render()}});
  fm.querySelectorAll('[data-fm-item]').forEach(inp=>inp.addEventListener('input',()=>{const day=Number(inp.dataset.fmItem),d=foodMenuData(foodMenuCurrentMonth)[day]||{};foodDayEnsure(d);d.items=[...fm.querySelectorAll('[data-fm-item="'+day+'"]')].map(x=>x.value.trim()).filter(Boolean);foodMenuSave(foodMenuLoad())}));
  fm.querySelectorAll('[data-fm-add]').forEach(btn=>btn.addEventListener('click',()=>{const day=Number(btn.dataset.fmAdd),d=foodMenuData(foodMenuCurrentMonth)[day]||{};foodDayEnsure(d);d.items.push('');foodMenuSave(foodMenuLoad());render();requestAnimationFrame(()=>document.querySelector('[data-food-menu-page] [data-fm-item="'+day+'"]')?.focus())}));
  fm.querySelectorAll('[data-fm-remove]').forEach(btn=>btn.addEventListener('click',()=>{const p=String(btn.dataset.fmRemove).split(':').map(Number),d=foodMenuData(foodMenuCurrentMonth)[p[0]]||{};foodDayEnsure(d);if(Number.isInteger(p[1]))d.items.splice(p[1],1);foodMenuSave(foodMenuLoad());render()}));
  q('[data-fm-save]')?.addEventListener('click',()=>{foodMenuSave(foodMenuLoad());global.toast?.('Yemek menüsü kaydedildi.')});
  q('[data-fm-print]')?.addEventListener('click',()=>foodMenuPrint(fm.dataset.foodMenuMode||active).catch(e=>global.toast?.('A4 çıktı hazırlanamadı: '+(e?.message||e))));
 }
 const fp=document.querySelector('[data-food-page]');
 if(fp){
  fp.querySelector('#food-count')?.addEventListener('input',e=>foodState.count=e.target.value);
  fp.querySelector('#food-date')?.addEventListener('change',e=>{foodState.date=e.target.value;render()});
  fp.querySelector('[data-food-teacher]')?.addEventListener('change',e=>foodState.teacher=e.target.value);
  fp.querySelector('[data-food-print]')?.addEventListener('click',async()=>{const sel=fp.querySelector('[data-food-teacher]');if(sel?.value)foodState.teacher=sel.value;try{await global.ReportEngine.printReport('Ücretsiz Öğle Yemeği Denetim ve Kontrol Formu',foodPrintBody(),{yon:'dikey',logoGoster:false,baslikGoster:false,tarihGoster:false,kenarBosluk:5,fontSize:8,compact:true,fileName:'Ucretsiz_Ogle_Yemegi_Denetim_Formu'})}catch(e){global.toast?.('Form hazırlanamadı: '+(e?.message||e))}});
 }
}
function render(){if(!mounted)return;const out=document.getElementById('foodContent');if(!out)return;const r=active==='foodDaily'?foodMenuPage('foodDaily'):active==='foodWeekly'?foodMenuPage('foodWeekly'):active==='foodMonthly'?foodMenuPage('foodMonthly'):foodPage();out.innerHTML=r.html;const c=document.getElementById('foodCount');if(c)c.textContent=active==='food'?'Denetim formu':String(r.count)+' kayıt';const sub=document.querySelector('[data-food-module] [data-food-subtitle]');if(sub)sub.textContent=({foodDaily:'Seçilen günün yemek menüsü.',foodWeekly:'Pazartesi–Cuma haftalık yemek menüsü.',foodMonthly:'Aylık menüyü gün gün düzenleyin.',food:'Yemek denetim ve kontrol formu.'}[active]||'Yemek menüleri.');bind();global.PermissionService?.apply?.(document.getElementById('v2ModuleRoot')||document)}
async function prepareLocal(){try{if(global.SyncEngine){if(global.COL?.yemekMenuleri)global.SyncEngine.register?.('yemekMenuleri',global.COL.yemekMenuleri);await global.SyncEngine.localHydrate?.(['yemekMenuleri']);global.SyncEngine.schedule?.(60)}}catch(e){console.warn('[Food] local prepare',e)}}
async function mount(){if(mounted){render();return true}mounted=true;const root=document.getElementById('v2ModuleRoot');if(root)root.innerHTML=shell();await prepareLocal();render();return true}
function unmount(){mounted=false;document.querySelector('[data-food-module]')?.remove()}
function openPage(page,title=''){const allowed=['foodDaily','foodWeekly','foodMonthly','food'];if(!allowed.includes(page))return false;active=page;if(!mounted)return mount().then(()=>{if(title)document.getElementById('v2ModuleTitle')?.replaceChildren(document.createTextNode(title));render();return true});if(title)document.getElementById('v2ModuleTitle')?.replaceChildren(document.createTextNode(title));render();return true}
global.FoodModule={mount,unmount,render,openPage,prepareLocal};
})(window);

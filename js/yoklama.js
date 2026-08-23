/* Koruk Asistan — Öğrenci Yoklama v5
 * Mevcut oy_yoklama veri modelini kullanır.
 * Öğretmen: erişebildiği sınıflarda yoklama alır ve toplu kaydeder.
 * Admin: tüm sınıflar, geçmiş kayıtlar ve veli bilgilendirme ekranını görür.
 */
(function(){
'use strict';

var state={tab:'yoklama',sinifId:'',tarih:'',draft:{},belge:null,kirli:false};

var ICON={
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>',
 users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 2.7-6.5 6.5-6.5S15.5 16 15.5 20"/><path d="M16 6a3 3 0 0 1 0 6M17 14c2.5.5 4 2.3 4 5"/></svg>',
 save:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3M8 15h8"/></svg>',
 wa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.3A8.4 8.4 0 1 1 21 11.5z"/><path d="M8.8 8.5c.3-.5.5-.5.8-.5h.5c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.8c-.2.2-.2.4 0 .7.5.9 1.2 1.6 2.1 2.1.3.2.5.2.7 0l.9-1c.2-.2.4-.3.7-.2l1.7.8"/></svg>',
 sms:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9h10M7 13h7"/></svg>'
};

function esc(v){
 if(typeof window.escapeHtml==='function') return window.escapeHtml(v==null?'':String(v));
 return String(v==null?'':v).replace(/[&<>"']/g,'');
}
function notify(m){if(typeof window.toast==='function')window.toast(m);else console.log('[yoklama]',m)}
function adminMi(){return !!(window.AKTIF_KULLANICI&&window.AKTIF_KULLANICI.admin===true)}
function today(){
 if(window.YoklamaService&&typeof window.YoklamaService.bugununTarihi==='function')return window.YoklamaService.bugununTarihi();
 var d=new Date(),p=function(n){return String(n).padStart(2,'0')};
 return d.getFullYear()+'-'+p(d.getMonth()+1)+'-'+p(d.getDate());
}
function classes(){
 try{
  if(window.YoklamaService&&typeof window.YoklamaService.erisilebilirSiniflar==='function')return window.YoklamaService.erisilebilirSiniflar();
  return Array.isArray(window.siniflar)?window.siniflar:[];
 }catch(e){console.warn('[yoklama] sınıflar alınamadı',e);return Array.isArray(window.siniflar)?window.siniflar:[]}
}
function currentClass(){return (Array.isArray(window.siniflar)?window.siniflar:[]).find(function(s){return s.id===state.sinifId})||null}
function roster(sinifId){
 var list=Array.isArray(window.veliler)?window.veliler:[];
 return list.filter(function(v){return v.sinifId===sinifId}).slice().sort(function(a,b){
  return String(a.ogrenciNo||'').localeCompare(String(b.ogrenciNo||''),'tr',{numeric:true})||String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr');
 });
}
function empty(title,desc){return '<div class="yv4-empty"><span>'+ICON.users+'</span><b>'+esc(title)+'</b><small>'+esc(desc)+'</small></div>'}
function setPull(enabled){if(typeof window._pullToRefreshAyarla==='function')window._pullToRefreshAyarla(enabled)}
function serviceReady(){return !!(window.YoklamaService&&window.YoklamaRepository)}

function close(){
 var el=document.getElementById('yokOverlay');if(el)el.remove();
 document.body.classList.remove('yok-v4-open','modal-open');
 setPull(true);
}

function open(){
 try{
  if(typeof window.gorebilir==='function'&&!window.gorebilir('yoklama')&&!adminMi()){notify('Bu işlem için yetkiniz yok.');return}
  close();
  state={tab:'yoklama',sinifId:'',tarih:today(),draft:{},belge:null,kirli:false};
  var ov=document.createElement('div');ov.id='yokOverlay';ov.className='yok-v4';document.body.appendChild(ov);
  document.body.classList.add('yok-v4-open','modal-open');setPull(false);
  renderShell();
 }catch(e){
  console.error('[yoklama] ekran açılamadı',e);close();notify('Yoklama ekranı açılamadı. Sayfayı yenileyip tekrar deneyin.');
 }
}

function renderShell(){
 var ov=document.getElementById('yokOverlay');if(!ov)return;
 var role=adminMi()?'Yönetici':'Öğretmen';
 var tabs=adminMi()?'<nav class="yv4-tabs"><button data-y-tab="yoklama" class="active">Yoklama Al</button><button data-y-tab="gecmis">Tüm Sınıflar</button><button data-y-tab="devamsiz">Devamsızlar</button></nav>':'';
 ov.innerHTML='<header class="yv4-top"><button class="yv4-icon" id="yv4Back" type="button">'+ICON.back+'</button><b>Öğrenci Yoklama</b><span class="yv4-role">'+role+'</span></header>'+
 '<main class="yv4-main"><section class="yv4-hero"><small>GÜNLÜK YOKLAMA</small><h1>Yoklamayı hızlı ve güvenli kaydedin</h1><p>Sınıfı seçin, öğrencileri işaretleyin ve tek dokunuşla kaydedin.</p></section>'+tabs+'<div id="yv4Content"></div></main>';
 document.getElementById('yv4Back').onclick=close;
 Array.prototype.forEach.call(ov.querySelectorAll('[data-y-tab]'),function(b){b.onclick=function(){switchTab(b.getAttribute('data-y-tab'))}});
 renderTab();
}
function switchTab(tab){
 state.tab=tab;
 Array.prototype.forEach.call(document.querySelectorAll('[data-y-tab]'),function(b){b.classList.toggle('active',b.getAttribute('data-y-tab')===tab)});
 renderTab();
}
function renderTab(){if(state.tab==='gecmis')return renderHistory();if(state.tab==='devamsiz')return renderAbsents();renderAttendance()}

function classOptions(){
 var html='<option value="">Sınıf seçin</option>';
 classes().forEach(function(s){html+='<option value="'+esc(s.id)+'"'+(state.sinifId===s.id?' selected':'')+'>'+esc(s.ad||'Sınıf')+'</option>'});
 return html;
}
function renderAttendance(){
 var c=document.getElementById('yv4Content');if(!c)return;
 c.innerHTML='<section class="yv4-selectors"><label><span>Sınıf</span><select id="yv4Class">'+classOptions()+'</select></label><label><span>Tarih</span><input id="yv4Date" type="date" value="'+esc(state.tarih)+'"></label></section><div id="yv4Roster">'+empty('Sınıf seçin','Yoklama almak için sınıfınızı seçin.')+'</div>';
 document.getElementById('yv4Class').onchange=function(e){state.sinifId=e.target.value;loadAttendance()};
 document.getElementById('yv4Date').onchange=function(e){state.tarih=e.target.value;loadAttendance()};
 if(state.sinifId)loadAttendance();
}
async function loadAttendance(){
 var host=document.getElementById('yv4Roster');if(!host)return;
 if(!state.sinifId||!state.tarih){host.innerHTML=empty('Sınıf ve tarih seçin','Öğrenci listesi seçimden sonra açılır.');return}
 var list=roster(state.sinifId);
 if(!list.length&&Array.isArray(window.veliler)&&window.veliler.length===0){
  host.innerHTML=empty('Öğrenciler hazırlanıyor','Öğrenci verisi yükleniyor…');
  for(var i=0;i<8&&!list.length;i++){await new Promise(function(r){setTimeout(r,250)});list=roster(state.sinifId)}
 }
 if(!list.length){host.innerHTML=empty('Bu sınıfta öğrenci bulunamadı','Sınıf-öğrenci eşleşmesini kontrol edin.');return}
 state.draft={};state.belge=null;state.kirli=false;
 host.innerHTML=rosterShell(list);renderRoster(list);
 if(!serviceReady()){notify('Yoklama servisi henüz hazır değil; öğrenci listesi açıldı.');return}
 try{
  var b=await window.YoklamaService.belgeGetir(state.sinifId,state.tarih);
  if(!document.getElementById('yv4Roster'))return;
  state.belge=b;state.draft=Object.assign({},b&&b.kayitlar?b.kayitlar:{});renderRoster(list);
 }catch(e){console.warn('[yoklama] kayıt okunamadı',e);notify('Eski yoklama kaydı yüklenemedi; liste kullanılabilir.')}
}
function rosterShell(list){
 var name=currentClass()?currentClass().ad:'Öğrenciler';
 return '<div class="yv4-summary" id="yv4Summary"></div><div class="yv4-list-head"><div><b>'+esc(name)+'</b><small>'+list.length+' öğrenci</small></div><button id="yv4AllPresent" type="button">Tümünü Var Yap</button></div><div class="yv4-students" id="yv4Students"></div><div class="yv4-savebar"><div><b id="yv4SaveState">Yeni yoklama</b><small>Değişiklikler Kaydet butonuna basınca Firestore’a yazılır.</small></div><button id="yv4Save" type="button">'+ICON.save+'<span>Yoklamayı Kaydet</span></button></div>';
}
function renderRoster(list){
 var box=document.getElementById('yv4Students');if(!box)return;
 var html='';list.forEach(function(o,i){html+=studentRow(o,i)});box.innerHTML=html;updateSummary(list);
 Array.prototype.forEach.call(box.querySelectorAll('[data-status]'),function(b){b.onclick=function(){state.draft[b.getAttribute('data-student')]=b.getAttribute('data-status');state.kirli=true;renderRoster(list)}});
 var all=document.getElementById('yv4AllPresent');if(all)all.onclick=function(){list.forEach(function(o){state.draft[o.id]='var'});state.kirli=true;renderRoster(list)};
 var save=document.getElementById('yv4Save');if(save)save.onclick=function(){saveAttendance(list)};
 var st=document.getElementById('yv4SaveState');if(st)st.textContent=state.belge?(state.kirli?'Değişiklik var':'Kayıtlı yoklama'):'Yeni yoklama';
}
function studentRow(o,i){
 var d=state.draft[o.id]||'',name=o.ogrenciAdi||'Öğrenci',no=o.ogrenciNo?'No: '+o.ogrenciNo:'Numara yok',buttons='';
 var statuses=(window.YoklamaService&&window.YoklamaService.DURUMLAR)||['var','yok','gec','izinli'];
 var names=(window.YoklamaService&&window.YoklamaService.DURUM_ADLARI)||{var:'Var',yok:'Yok',gec:'Geç',izinli:'İzinli'};
 statuses.forEach(function(s){buttons+='<button type="button" data-student="'+esc(o.id)+'" data-status="'+s+'" class="'+s+(d===s?' active':'')+'">'+names[s]+'</button>'});
 return '<article class="yv4-student"><div class="yv4-student-info"><span class="yv4-num">'+(i+1)+'</span><div><b>'+esc(name)+'</b><small>'+esc(no)+'</small></div><em class="'+d+'">'+(d?names[d]:'İşaretlenmedi')+'</em></div><div class="yv4-statuses">'+buttons+'</div></article>';
}
function updateSummary(list){
 var s={var:0,yok:0,gec:0,izinli:0};list.forEach(function(o){var d=state.draft[o.id];if(d&&s[d]!=null)s[d]++});
 var el=document.getElementById('yv4Summary');if(!el)return;
 el.innerHTML='<div><small>Toplam</small><b>'+list.length+'</b></div><div class="green"><small>Var</small><b>'+s.var+'</b></div><div class="blue"><small>Yok</small><b>'+s.yok+'</b></div><div class="amber"><small>Geç</small><b>'+s.gec+'</b></div><div class="violet"><small>İzinli</small><b>'+s.izinli+'</b></div>';
}
async function saveAttendance(list){
 var missing=list.filter(function(o){return !state.draft[o.id]});if(missing.length){notify(missing.length+' öğrenci işaretlenmedi.');return}
 if(!window.YoklamaService||typeof window.YoklamaService.yoklamaKaydet!=='function'){notify('Yoklama servisi yüklenemedi.');return}
 var btn=document.getElementById('yv4Save');if(btn)btn.disabled=true;
 try{await window.YoklamaService.yoklamaKaydet(state.sinifId,state.tarih,state.draft);state.belge={sinifId:state.sinifId,tarih:state.tarih,kayitlar:Object.assign({},state.draft)};state.kirli=false;notify('Yoklama kaydedildi.');renderRoster(list)}
 catch(e){console.error('[yoklama] kayıt hatası',e);notify(e&&e.message==='yetkisiz'?'Bu sınıf için kayıt yetkiniz yok.':'Yoklama kaydedilemedi.')}
 finally{if(btn)btn.disabled=false}
}

async function renderHistory(){
 var c=document.getElementById('yv4Content');if(!c)return;var tarih=state.tarih||today();
 c.innerHTML='<section class="yv4-history-head"><label><span>Tarih</span><input id="yv4HistoryDate" type="date" value="'+esc(tarih)+'"></label><div><b>Tüm Sınıflar</b><small>Seçilen tarihte kaydedilmiş yoklamalar</small></div></section><div id="yv4HistoryList">'+empty('Yoklamalar yükleniyor','Kaydedilmiş sınıf yoklamaları getiriliyor.')+'</div>';
 document.getElementById('yv4HistoryDate').onchange=function(e){state.tarih=e.target.value;renderHistory()};
 try{
  var docs=await window.YoklamaService.gunOzetiGetir(tarih),map={};docs.forEach(function(x){map[x.sinifId]=x});var all=Array.isArray(window.siniflar)?window.siniflar.slice():[],html='<div class="yv4-class-grid">';
  all.sort(function(a,b){return String(a.ad||'').localeCompare(String(b.ad||''),'tr')}).forEach(function(s){var d=map[s.id],vals=d?Object.values(d.kayitlar||{}):[],y=vals.filter(function(x){return x==='yok'}).length,g=vals.filter(function(x){return x==='gec'}).length;html+='<button class="yv4-class-card" type="button" data-open-class="'+esc(s.id)+'"><span>'+esc(s.ad)+'</span><b>'+(d?vals.length+' kayıt':'Yoklama yok')+'</b><small>'+(d?y+' yok · '+g+' geç':'Bu tarihte kayıt bulunmuyor')+'</small></button>'});html+='</div>';
  var h=document.getElementById('yv4HistoryList');if(!h)return;h.innerHTML=html;Array.prototype.forEach.call(h.querySelectorAll('[data-open-class]'),function(b){b.onclick=function(){state.sinifId=b.getAttribute('data-open-class');switchTab('yoklama')}});
 }catch(e){var h2=document.getElementById('yv4HistoryList');if(h2)h2.innerHTML=empty('Yoklamalar alınamadı','Bağlantıyı kontrol edip tekrar deneyin.')}
}
async function renderAbsents(){
 var c=document.getElementById('yv4Content');if(!c)return;var tarih=state.tarih||today();
 c.innerHTML='<section class="yv4-history-head"><label><span>Tarih</span><input id="yv4AbsentDate" type="date" value="'+esc(tarih)+'"></label><div><b>Devamsız Öğrenciler</b><small>WhatsApp veya SMS ile öğrenci bazında veli bilgilendirme</small></div></section><div id="yv4AbsentList">'+empty('Devamsızlar yükleniyor','Yok ve Geç kayıtları kontrol ediliyor.')+'</div>';
 document.getElementById('yv4AbsentDate').onchange=function(e){state.tarih=e.target.value;renderAbsents()};
 try{
  var rows=await window.YoklamaService.gununDevamsizlariGetir(tarih),h=document.getElementById('yv4AbsentList');if(!h)return;window._yv4Absents=rows;
  if(!rows.length){h.innerHTML=empty('Devamsız öğrenci yok','Seçilen tarihte Yok veya Geç kaydı bulunmuyor.');return}
  var html='<div class="yv4-absents">';rows.forEach(function(s,i){html+=absentRow(s,i)});html+='</div>';h.innerHTML=html;
  Array.prototype.forEach.call(h.querySelectorAll('[data-wa]'),function(b){b.onclick=function(){openMessage(Number(b.getAttribute('data-wa')),'wa')}});Array.prototype.forEach.call(h.querySelectorAll('[data-sms]'),function(b){b.onclick=function(){openMessage(Number(b.getAttribute('data-sms')),'sms')}});
 }catch(e){var h2=document.getElementById('yv4AbsentList');if(h2)h2.innerHTML=empty('Devamsızlar alınamadı',e&&e.message==='yetkisiz'?'Bu ekran yalnız yöneticilere açıktır.':'Bağlantıyı kontrol edin.')}
}
function absentRow(s,i){
 var phone=!!(window.YoklamaService&&window.YoklamaService._telefonuTemizle(s.telefon));
 return '<article class="yv4-absent'+(s.gonderildi?' sent':'')+'"><div class="yv4-absent-state '+esc(s.durum)+'">'+esc(window.YoklamaService.DURUM_ADLARI[s.durum])+'</div><div class="yv4-absent-main"><b>'+esc(s.ogrenciAdi)+' <span>'+esc(s.sinifAdi)+'</span></b><small>'+esc(s.veliAdi||'Veli bilgisi yok')+' · '+esc(s.telefon||'Telefon yok')+'</small>'+(s.gonderildi?'<em>Bilgilendirme açıldı</em>':'')+'</div><div class="yv4-message-actions"><button type="button" data-wa="'+i+'"'+(phone?'':' disabled')+' class="wa">'+ICON.wa+'<span>WhatsApp</span></button><button type="button" data-sms="'+i+'"'+(phone?'':' disabled')+' class="sms">'+ICON.sms+'<span>SMS</span></button></div></article>';
}
function openMessage(i,type){
 var s=(window._yv4Absents||[])[i];if(!s)return;var link=type==='wa'?window.YoklamaService.whatsappLinkOlustur(s):window.YoklamaService.smsLinkOlustur(s);if(!link)return;
 if(type==='wa')window.open(link,'_blank');else window.location.href=link;
 window.YoklamaService.mesajGonderildiIsaretle(s.sinifId,s.tarih,s.ogrenciId).then(function(){s.gonderildi=true;setTimeout(renderAbsents,200)}).catch(function(){});
}

window.yoklamaAc=open;
window.yoklamaKapat=close;
window.yoklamaDevamsizlarAc=function(){if(adminMi())switchTab('devamsiz')};
window.yoklamaDevamsizlarKapat=function(){switchTab('yoklama')};
})();

/* Koruk Asistan — Öğrenci Yoklama v4
 * Öğretmen: erişebildiği sınıflarda yoklama alır ve toplu kaydeder.
 * Admin: tüm sınıflar, geçmiş tarih ve devamsız veli mesajlarını yönetir.
 * Veri modeli değişmez: oy_yoklama / {sinifId}_{YYYY-MM-DD}.
 */
let _yokState={tab:'yoklama',sinifId:'',tarih:'',draft:{},belge:null,yukleniyor:false,kirli:false};
const _YOK_ICON={
 back:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>',
 users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c0-4 2.7-6.5 6.5-6.5S15.5 16 15.5 20"/><path d="M16 6a3 3 0 0 1 0 6M17 14c2.5.5 4 2.3 4 5"/></svg>',
 calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></svg>',
 save:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3M8 15h8"/></svg>',
 wa:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9"><path d="M21 11.5a8.4 8.4 0 0 1-12.4 7.4L3 20.5l1.6-5.3A8.4 8.4 0 1 1 21 11.5z"/><path d="M8.7 8.4c.2-.5.4-.5.7-.5h.6c.2 0 .4.1.5.4l.8 1.8c.1.3.1.5-.1.7l-.6.8c-.2.2-.2.4 0 .7.5.9 1.2 1.6 2.1 2.1.3.2.5.2.7 0l.9-1c.2-.2.4-.3.7-.2l1.8.9"/></svg>',
 sms:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M7 9h10M7 13h7"/></svg>'
};
function _yEsc(v){return typeof escapeHtml==='function'?escapeHtml(v??''):String(v??'').replace(/[&<>"']/g,'')}
function _yAdmin(){return !!(typeof AKTIF_KULLANICI!=='undefined'&&AKTIF_KULLANICI?.admin===true)}
function _yClasses(){try{return YoklamaService.erisilebilirSiniflar()}catch(_){return[]}}
function _yClass(){return (typeof siniflar!=='undefined'?siniflar:[]).find(s=>s.id===_yokState.sinifId)||null}
function _yRoster(sinifId){return (typeof veliler!=='undefined'?veliler:[]).filter(v=>v.sinifId===sinifId).slice().sort((a,b)=>String(a.ogrenciNo||'').localeCompare(String(b.ogrenciNo||''),'tr',{numeric:true})||String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr'))}
function _yToday(){return typeof YoklamaService!=='undefined'?YoklamaService.bugununTarihi():new Date().toISOString().slice(0,10)}
function _yFormatDate(x){if(!x)return'';const p=x.split('-');return p.length===3?`${p[2]}.${p[1]}.${p[0]}`:x}
function _yNotify(m){if(typeof toast==='function')toast(m)}

function yoklamaAc(){
 if(typeof gorebilir==='function'&&!gorebilir('yoklama')){_yNotify('Bu işlem için yetkiniz yok.');return}
 yoklamaKapat();_yokState={tab:'yoklama',sinifId:'',tarih:_yToday(),draft:{},belge:null,yukleniyor:false,kirli:false};
 const ov=document.createElement('div');ov.id='yokOverlay';ov.className='yok-v4';document.body.appendChild(ov);document.body.classList.add('yok-v4-open','modal-open');
 if(typeof _pullToRefreshAyarla==='function')_pullToRefreshAyarla(false);_yRenderShell();
}
function yoklamaKapat(){document.getElementById('yokOverlay')?.remove();document.body.classList.remove('yok-v4-open','modal-open');if(typeof _pullToRefreshAyarla==='function')_pullToRefreshAyarla(true)}
function yoklamaDevamsizlarKapat(){_yTab('yoklama')}
function yoklamaDevamsizlarAc(){if(_yAdmin())_yTab('devamsiz')}

function _yRenderShell(){
 const ov=document.getElementById('yokOverlay');if(!ov)return;const admin=_yAdmin();
 ov.innerHTML=`<header class="yv4-top"><button class="yv4-icon" id="yv4Back">${_YOK_ICON.back}</button><b>Öğrenci Yoklama</b><span class="yv4-role">${admin?'Yönetici':'Öğretmen'}</span></header>
 <main class="yv4-main">
  <section class="yv4-hero"><small>GÜNLÜK YOKLAMA</small><h1>Yoklamayı hızlı ve güvenli kaydedin</h1><p>Öğrencileri yerel listeden anında açın; kaydettiğiniz yoklama yönetici ve öğrenci detaylarında aynı kaynaktan görünür.</p></section>
  ${admin?`<nav class="yv4-tabs"><button data-y-tab="yoklama" class="active">Yoklama Al</button><button data-y-tab="gecmis">Tüm Sınıflar</button><button data-y-tab="devamsiz">Devamsızlar</button></nav>`:''}
  <div id="yv4Content"></div>
 </main>`;
 document.getElementById('yv4Back').onclick=yoklamaKapat;ov.querySelectorAll('[data-y-tab]').forEach(b=>b.onclick=()=>_yTab(b.dataset.yTab));_yRenderTab();
}
function _yTab(tab){_yokState.tab=tab;document.querySelectorAll('[data-y-tab]').forEach(b=>b.classList.toggle('active',b.dataset.yTab===tab));_yRenderTab()}
function _yRenderTab(){if(_yokState.tab==='gecmis')return _yRenderAdminHistory();if(_yokState.tab==='devamsiz')return _yRenderAbsents();_yRenderAttendance()}

function _yClassOptions(){return `<option value="">Sınıf seçin</option>`+_yClasses().map(s=>`<option value="${_yEsc(s.id)}" ${_yokState.sinifId===s.id?'selected':''}>${_yEsc(s.ad)}</option>`).join('')}
function _yRenderAttendance(){
 const c=document.getElementById('yv4Content');if(!c)return;c.innerHTML=`<section class="yv4-selectors"><label><span>Sınıf</span><select id="yv4Class">${_yClassOptions()}</select></label><label><span>Tarih</span><input id="yv4Date" type="date" value="${_yEsc(_yokState.tarih)}"></label></section><div id="yv4Roster">${_yEmpty('Sınıf seçin','Yoklama almak için sınıfınızı seçin.')}</div>`;
 document.getElementById('yv4Class').onchange=e=>{_yokState.sinifId=e.target.value;_yLoadAttendance()};document.getElementById('yv4Date').onchange=e=>{_yokState.tarih=e.target.value;_yLoadAttendance()};if(_yokState.sinifId)_yLoadAttendance();
}
async function _yLoadAttendance(){
 const host=document.getElementById('yv4Roster');if(!host||!_yokState.sinifId||!_yokState.tarih){if(host)host.innerHTML=_yEmpty('Sınıf ve tarih seçin','Öğrenci listesi seçimden sonra açılır.');return}
 _yokState.yukleniyor=true;_yokState.draft={};_yokState.belge=null;let roster=_yRoster(_yokState.sinifId);
 if(!roster.length&&typeof veliler!=='undefined'&&veliler.length===0){host.innerHTML=_yEmpty('Öğrenciler hazırlanıyor','Yerel öğrenci verisi yükleniyor…');for(let i=0;i<8&&!roster.length;i++){await new Promise(r=>setTimeout(r,250));roster=_yRoster(_yokState.sinifId)}}
 if(!roster.length){host.innerHTML=_yEmpty('Bu sınıfta öğrenci bulunamadı','Sınıf-öğrenci eşleşmesini kontrol edin.');return}
 host.innerHTML=_yRosterHtml(roster);try{const b=await YoklamaService.belgeGetir(_yokState.sinifId,_yokState.tarih);_yokState.belge=b;_yokState.draft={...(b?.kayitlar||{})}}catch(e){console.warn('[yoklama] kayıt okunamadı',e);_yokState.draft={}}
 _yokState.yukleniyor=false;_yRenderRosterState(roster);
}
function _yRosterHtml(roster){return `<div class="yv4-summary" id="yv4Summary"></div><div class="yv4-list-head"><div><b>${_yEsc(_yClass()?.ad||'Öğrenciler')}</b><small>${roster.length} öğrenci</small></div><button id="yv4AllPresent">Tümünü Var Yap</button></div><div class="yv4-students" id="yv4Students"></div><div class="yv4-savebar"><div><b id="yv4SaveState">Kaydedilmedi</b><small>Değişiklikler kaydet butonuna kadar yalnız bu ekranda tutulur.</small></div><button id="yv4Save">${_YOK_ICON.save}<span>Yoklamayı Kaydet</span></button></div>`}
function _yRenderRosterState(roster){
 const list=document.getElementById('yv4Students');if(!list)return;list.innerHTML=roster.map((o,i)=>_yStudentRow(o,i)).join('');_yUpdateSummary(roster);
 list.querySelectorAll('[data-status]').forEach(b=>b.onclick=()=>{_yokState.draft[b.dataset.student]=b.dataset.status;_yokState.kirli=true;_yRenderRosterState(roster)});
 document.getElementById('yv4AllPresent').onclick=()=>{roster.forEach(o=>_yokState.draft[o.id]='var');_yokState.kirli=true;_yRenderRosterState(roster)};
 document.getElementById('yv4Save').onclick=()=>_ySaveAttendance(roster);
 const st=document.getElementById('yv4SaveState');if(st)st.textContent=_yokState.belge?(_yokState.kirli?'Değişiklik var':'Kayıtlı yoklama'):'Yeni yoklama';
}
function _yStudentRow(o,i){const d=_yokState.draft[o.id]||'',ad=o.ogrenciAdi||'Öğrenci',no=o.ogrenciNo?`No: ${o.ogrenciNo}`:'Numara yok';return `<article class="yv4-student"><div class="yv4-student-info"><span class="yv4-num">${i+1}</span><div><b>${_yEsc(ad)}</b><small>${_yEsc(no)}</small></div><em class="${d}">${d?YoklamaService.DURUM_ADLARI[d]:'İşaretlenmedi'}</em></div><div class="yv4-statuses">${YoklamaService.DURUMLAR.map(s=>`<button data-student="${_yEsc(o.id)}" data-status="${s}" class="${s} ${d===s?'active':''}">${YoklamaService.DURUM_ADLARI[s]}</button>`).join('')}</div></article>`}
function _yUpdateSummary(roster){const s={var:0,yok:0,gec:0,izinli:0,bos:0};roster.forEach(o=>{const d=_yokState.draft[o.id];d&&s[d]!==undefined?s[d]++:s.bos++});const el=document.getElementById('yv4Summary');if(el)el.innerHTML=`<div><small>Toplam</small><b>${roster.length}</b></div><div class="green"><small>Var</small><b>${s.var}</b></div><div class="blue"><small>Yok</small><b>${s.yok}</b></div><div class="amber"><small>Geç</small><b>${s.gec}</b></div><div class="violet"><small>İzinli</small><b>${s.izinli}</b></div>`}
async function _ySaveAttendance(roster){const missing=roster.filter(o=>!_yokState.draft[o.id]);if(missing.length){_yNotify(`${missing.length} öğrenci işaretlenmedi. Tümünü Var Yap ile hızlıca tamamlayabilirsiniz.`);return}const btn=document.getElementById('yv4Save');if(btn)btn.disabled=true;try{await YoklamaService.yoklamaKaydet(_yokState.sinifId,_yokState.tarih,_yokState.draft);_yokState.belge={sinifId:_yokState.sinifId,tarih:_yokState.tarih,kayitlar:{..._yokState.draft}};_yokState.kirli=false;_yNotify('Yoklama kaydedildi.');_yRenderRosterState(roster)}catch(e){_yNotify(e.message==='yetkisiz'?'Bu sınıf için yoklama kaydetme yetkiniz yok.':'Yoklama kaydedilemedi.')}finally{if(btn)btn.disabled=false}}

async function _yRenderAdminHistory(){
 const c=document.getElementById('yv4Content');if(!c)return;const tarih=_yokState.tarih||_yToday();c.innerHTML=`<section class="yv4-history-head"><label><span>Tarih</span><input id="yv4HistoryDate" type="date" value="${_yEsc(tarih)}"></label><div><b>Tüm Sınıflar</b><small>Seçilen tarihte kaydedilmiş yoklamalar</small></div></section><div id="yv4HistoryList">${_yEmpty('Yoklamalar yükleniyor','Kaydedilmiş sınıf yoklamaları getiriliyor.')}</div>`;document.getElementById('yv4HistoryDate').onchange=e=>{_yokState.tarih=e.target.value;_yRenderAdminHistory()};
 try{const docs=await YoklamaService.gunOzetiGetir(tarih),by=new Map(docs.map(x=>[x.sinifId,x]));const classes=(typeof siniflar!=='undefined'?siniflar:[]).slice().sort((a,b)=>String(a.ad).localeCompare(String(b.ad),'tr'));const h=document.getElementById('yv4HistoryList');h.innerHTML=`<div class="yv4-class-grid">${classes.map(s=>{const d=by.get(s.id),vals=Object.values(d?.kayitlar||{}),yok=vals.filter(x=>x==='yok').length,gec=vals.filter(x=>x==='gec').length;return `<button class="yv4-class-card" data-open-class="${_yEsc(s.id)}"><span>${_yEsc(s.ad)}</span><b>${d?`${vals.length} kayıt`:'Yoklama yok'}</b><small>${d?`${yok} yok · ${gec} geç`:'Bu tarihte kayıt bulunmuyor'}</small></button>`}).join('')}</div>`;h.querySelectorAll('[data-open-class]').forEach(b=>b.onclick=()=>{_yokState.sinifId=b.dataset.openClass;_yokState.tab='yoklama';document.querySelectorAll('[data-y-tab]').forEach(x=>x.classList.toggle('active',x.dataset.yTab==='yoklama'));_yRenderAttendance()})}catch(e){document.getElementById('yv4HistoryList').innerHTML=_yEmpty('Yoklamalar alınamadı','Bağlantıyı kontrol edip tekrar deneyin.')}
}

async function _yRenderAbsents(){
 const c=document.getElementById('yv4Content');if(!c)return;const tarih=_yokState.tarih||_yToday();c.innerHTML=`<section class="yv4-history-head"><label><span>Tarih</span><input id="yv4AbsentDate" type="date" value="${_yEsc(tarih)}"></label><div><b>Devamsız Öğrenciler</b><small>WhatsApp veya SMS ile öğrenci bazında veli bilgilendirme</small></div></section><div id="yv4AbsentList">${_yEmpty('Devamsızlar yükleniyor','Yok ve geç kayıtları kontrol ediliyor.')}</div>`;document.getElementById('yv4AbsentDate').onchange=e=>{_yokState.tarih=e.target.value;_yRenderAbsents()};
 try{const rows=await YoklamaService.gununDevamsizlariGetir(tarih),h=document.getElementById('yv4AbsentList');window._yv4Absents=rows;if(!rows.length){h.innerHTML=_yEmpty('Devamsız öğrenci yok','Seçilen tarihte Yok veya Geç kaydı bulunmuyor.');return}h.innerHTML=`<div class="yv4-absents">${rows.map((s,i)=>_yAbsentRow(s,i)).join('')}</div>`;h.querySelectorAll('[data-wa]').forEach(b=>b.onclick=()=>_yOpenMessage(+b.dataset.wa,'wa'));h.querySelectorAll('[data-sms]').forEach(b=>b.onclick=()=>_yOpenMessage(+b.dataset.sms,'sms'))}catch(e){document.getElementById('yv4AbsentList').innerHTML=_yEmpty('Devamsızlar alınamadı',e.message==='yetkisiz'?'Bu ekran yalnız yöneticilere açıktır.':'Bağlantıyı kontrol edin.')}
}
function _yAbsentRow(s,i){const phone=!!YoklamaService._telefonuTemizle(s.telefon);return `<article class="yv4-absent ${s.gonderildi?'sent':''}"><div class="yv4-absent-state ${s.durum}">${YoklamaService.DURUM_ADLARI[s.durum]}</div><div class="yv4-absent-main"><b>${_yEsc(s.ogrenciAdi)} <span>${_yEsc(s.sinifAdi)}</span></b><small>${_yEsc(s.veliAdi||'Veli bilgisi yok')} · ${_yEsc(s.telefon||'Telefon yok')}</small>${s.gonderildi?'<em>Bilgilendirme açıldı</em>':''}</div><div class="yv4-message-actions"><button data-wa="${i}" ${phone?'':'disabled'} class="wa">${_YOK_ICON.wa}<span>WhatsApp</span></button><button data-sms="${i}" ${phone?'':'disabled'} class="sms">${_YOK_ICON.sms}<span>SMS</span></button></div></article>`}
function _yOpenMessage(i,type){const s=(window._yv4Absents||[])[i];if(!s)return;const link=type==='wa'?YoklamaService.whatsappLinkOlustur(s):YoklamaService.smsLinkOlustur(s);if(!link)return;type==='wa'?window.open(link,'_blank'):(location.href=link);YoklamaService.mesajGonderildiIsaretle(s.sinifId,s.tarih,s.ogrenciId).then(()=>{s.gonderildi=true;setTimeout(_yRenderAbsents,250)}).catch(()=>{})}
function _yEmpty(title,desc){return `<div class="yv4-empty"><span>${_YOK_ICON.users}</span><b>${_yEsc(title)}</b><small>${_yEsc(desc)}</small></div>`}

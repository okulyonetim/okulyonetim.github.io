/* Koruk Asistan — Tutanak Hazırla
 * Olay bilgisini yazın, hazır metinden başlayın, imzalayanları sıralayın; A4 tutanak olarak yazdırın / PDF alın.
 * Kayıtlar oy_tutanaklar koleksiyonunda DeviceData/SyncEngine ile tutulur; öğretmen yalnız kendi kayıtlarını, yönetici hepsini listede görür.
 * Çıktı merkezi ReportEngine ile alınır (okul adı/logo orada gelir).
 */
(function(global){
'use strict';
if(global.TutanakModule)return;
const T='tutanaklar';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const device=()=>global.DeviceData;
const isManager=()=>user().admin===true||!!global.PermissionService?.isManager?.();
const MAX_IMZA=6;
const FORM_KEYS=['baslik','olayTarih','olaySaat','yer','ders','anlatim','duzTarih','duzSaat'];
const NOKTA='…………………………………………';
// Hazır metinler: boş bırakılan yerler (………) kullanıcı tarafından doldurulur; metin yalnız görülen olayı yazar.
const HAZIR=[
 {ad:'Öğrenciler arasında kavga',yer:'',metin:'………………… sınıfı öğrencisi ………………… ile ………………… sınıfı öğrencisi ………………… arasında sözlü tartışma çıkmış, tartışma sonrasında taraflar birbirine fiziksel müdahalede bulunmuştur. Olay yanımızdaki nöbetçi öğretmen/öğretmenler tarafından fark edilerek taraflar ayrılmıştır. Öğrencilerin üzerinde gözle görülür bir yaralanma ………………… (var / yok). Taraflar idareye bildirilmiştir.'},
 {ad:'Öğrenci davranışı / sözlü taciz',yer:'',metin:'………………… sınıfı öğrencisi ………………… ders/etkinlik sırasında ………………… öğrencisine/öğretmenine yönelik uygunsuz söz ve davranışlarda bulunmuştur. Öğrenci bu davranışından dolayı sözlü olarak uyarılmıştır. Davranışın tekrarı hâlinde okul yönetimine bilgi verileceği söylenmiştir.'},
 {ad:'Okul eşyasına zarar verme',yer:'',metin:'………………… yerinde bulunan ………………… ’in/’ın ………………… biçiminde zarar gördüğü tespit edilmiştir. Zarar tespit edilirken ………………… hazır bulunmuştur. Hasarın ………………… sınıfı öğrencisi/öğrencileri tarafından verildiği ………………… (görülmüştür / iddia edilmektedir / kesin olarak bilinmemektedir). Konuyla ilgili işlem yapılmak üzere okul idaresine bilgi verilmiştir.'},
 {ad:'Eşya kaybı',yer:'',metin:'………………… sınıfı öğrencisi ………………… ’in ………………… marka/model, ………………… renkli ………………… eşyasını ………………… saatleri arasında ………………… yerinde kaybettiğini bildirmesi üzerine ilgili yerlerde arama yapılmış, eşya ………………… (bulunmuştur / bulunamamıştır). Konu okul idaresine iletilmiştir.'},
 {ad:'Öğrencinin rahatsızlanması / kaza',yer:'',metin:'………………… sınıfı öğrencisi ………………… ders/etkinlik sırasında ………………… şikâyetiyle rahatsızlanmış / ………………… biçiminde kaza geçirmiştir. Öğrenciye ilk müdahale ………………… tarafından yapılmış, öğrencinin velisi ………………… saatinde ………………… yoluyla bilgilendirilmiştir. Öğrenci ………………… (veliye teslim edilmiştir / sağlık kuruluşuna sevk edilmiştir / sınıfına geri dönmüştür).'},
 {ad:'Okuldan izinsiz ayrılma / devamsızlık',yer:'',metin:'………………… sınıfı öğrencisi ………………… ’in ………………… tarihinde ………………… ders saatlerinde okulda bulunmadığı/okuldan izinsiz ayrıldığı tespit edilmiştir. Öğrencinin velisi ………………… ile ………………… saatinde iletişime geçilmiştir. Durum ………………… olarak değerlendirilmiş ve idareye bildirilmiştir.'},
 {ad:'Yasak eşya / cep telefonu tespiti',yer:'',metin:'………………… sınıfı öğrencisi ………………… ’in yanında/çantasında ………………… ’in bulunduğu tespit edilmiştir. Eşya öğrenci huzurunda alınarak ………………… ’e teslim edilmiş, öğrenci ve velisi ………………… konusunda bilgilendirilmiştir. Eşya ………………… tarihinde ………………… ’e teslim edilmiştir.'},
 {ad:'Veli ile yaşanan olay',yer:'',metin:'………………… sınıfı öğrencisi ………………… ’in velisi ………………… okula gelerek ………………… konusunda görüşme talep etmiştir. Görüşme sırasında veli ………………… biçiminde davranmış, kendisine okul kuralları hatırlatılmıştır. Görüşme ………………… (sakin biçimde sonlandırılmıştır / sonlandırılamamıştır). Olay okul idaresine bildirilmiştir.'},
 {ad:'Evrak / belge teslim tutanağı',yer:'',metin:'Aşağıda cinsi ve sayısı yazılı belgeler ………………… tarafından ………………… ’e eksiksiz olarak teslim edilmiştir.\n1) ………………… ( ………… adet)\n2) ………………… ( ………… adet)\n3) ………………… ( ………… adet)\nTeslim edilen belgeler teslim alan tarafından sayılmış ve kontrol edilmiştir.'},
 {ad:'Demirbaş / malzeme teslim tutanağı',yer:'',metin:'Okula ait aşağıdaki demirbaş/malzemeler ………………… tarafından ………………… ’e sağlam ve çalışır durumda teslim edilmiştir.\n1) ………………… ( ………… adet)\n2) ………………… ( ………… adet)\n3) ………………… ( ………… adet)\nTeslim alan malzemelerden sorumludur.'},
 {ad:'Nöbet görevinde tespit',yer:'Okul bahçesi',metin:'Nöbet görevi sırasında ………………… yerinde ………………… sınıfı öğrencisi/öğrencileri ………………… ’in yapıldığı görülmüştür. Öğrenci/öğrenciler sözlü olarak uyarılmış, olay nöbetçi müdür yardımcısına bildirilmiştir.'},
 {ad:'Toplantı yapıldı (kurul / zümre)',yer:'Öğretmenler odası',metin:'………………… kurulu/zümresi toplantısı ………………… başkanlığında yapılmıştır. Toplantıda gündem maddeleri görüşülmüş ve aşağıdaki kararlar oybirliği/oyçokluğuyla alınmıştır.\n1) …………………\n2) …………………\n3) …………………'}
];
const REHBER=['Olayı gördüğünüz gibi, yorum katmadan yazın; kim, ne zaman, nerede, ne yaptı açık olsun.','Yalnızca gördüğünüz veya bizzat tespit ettiğiniz şeyleri yazın; kanaat, suçlama ve tahmin cümlelerinden kaçının.','Öğrenci ve kişi adlarını tam ve doğru yazın; sınıf, saat ve yeri belirtin.','Tutanak en az 2, tercihen 3 kişi tarafından imzalanmalıdır; en yetkili kişi 1. sırada yazılır.','En az 2 nüsha çıktı alın; her ikisinde de ıslak imza bulunmalıdır. Biri idarede, biri sizde kalır.','Tutanakta silinti veya kazıntı olmamalıdır; hata varsa yeniden düzenleyin.'];
let state=null,tab='hazirla',histQuery='';
function pad(n){return String(n).padStart(2,'0')}
function today(){const d=new Date();return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function nowTime(){const d=new Date();return`${pad(d.getHours())}:${pad(d.getMinutes())}`}
function teacher(){const id=user().bagliOgretmenId||user().ogretmenId||'';return rows('ogretmenler').find(x=>String(x.id)===String(id))||null}
function teacherName(t){return t?(`${t.ad||''} ${t.soyad||''}`.trim()||t.adSoyad||''):''}
function unvanOf(t){const b=String(t?.brans||'').trim();return b?(/öğretmen/i.test(b)?b:`${b} Öğretmeni`):''}
function blank(){const t=teacher();return{id:'',baslik:'',olayTarih:today(),olaySaat:nowTime(),yer:'',ders:'',anlatim:'',duzTarih:today(),duzSaat:nowTime(),imzalar:[{ad:teacherName(t),unvan:unvanOf(t)},{ad:'',unvan:''},{ad:'',unvan:''}]}}
function ensure(){if(!state)state=blank();return state}
function trDate(v){if(!v)return'';const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?v:`${pad(d.getDate())}/${pad(d.getMonth()+1)}/${d.getFullYear()}`}
function imzaSayisi(s){return(s.imzalar||[]).filter(x=>String(x.ad||'').trim()).length}
function records(){const uid=user().uid,all=rows(T),mine=isManager()?all:all.filter(x=>x.olusturanUid===uid);return mine.slice().sort((a,b)=>String(b.olayTarih||'').localeCompare(String(a.olayTarih||''))||String(b.eklenmeTarihi||'').localeCompare(String(a.eklenmeTarihi||'')))}
const norm=v=>String(v||'').toLocaleLowerCase('tr');
let remoteAt=0;
function refreshRemote(){const now=Date.now();if(!navigator.onLine||!global.SyncEngine?.sync||now-remoteAt<45000)return;remoteAt=now;Promise.resolve(global.SyncEngine.sync([T],{force:true,full:true})).catch(e=>console.warn('[Tutanak eşitleme]',e?.message||e))}
async function prepare(){const SE=global.SyncEngine,col=global.COL?.tutanaklar;if(!SE||!col)return;try{SE.register(T,col);await SE.localHydrate([T]);SE.schedule(100);refreshRemote()}catch(e){console.warn('[Tutanak]',e?.message||e)}}
function cleanImzalar(s){return(s.imzalar||[]).map(x=>({ad:String(x.ad||'').trim(),unvan:String(x.unvan||'').trim()})).filter(x=>x.ad||x.unvan)}
async function save(root){
 const s=ensure(),ad=String(s.baslik||'').trim();
 if(!ad)return global.toast?.('Kayıt için bir ad yazın. Örnek: 7/B kavga – 12 Eylül');
 if(!String(s.anlatim||'').trim())return global.toast?.('Olayın anlatımını yazın.');
 const v={};FORM_KEYS.forEach(k=>v[k]=String(s[k]||'').trim());v.imzalayanlar=cleanImzalar(s);
 try{
  if(s.id){await device().update(T,global.COL.tutanaklar,s.id,v)}
  else{const row=await device().add(T,global.COL.tutanaklar,{...v,olusturanUid:user().uid||'',olusturanAd:user().adSoyad||user().ad||user().kullaniciAdi||'',eklenmeTarihi:new Date().toISOString()});s.id=row?.id||(typeof row==='string'?row:'')||s.id}
  global.toast?.('Tutanak kaydedildi.');render(root)
 }catch(e){global.toast?.('Kaydedilemedi: '+(e?.message||e))}
}
function loadRecord(r,root){
 const base=blank(),im=Array.isArray(r.imzalayanlar)&&r.imzalayanlar.length?r.imzalayanlar.map(x=>({ad:x.ad||'',unvan:x.unvan||''})):base.imzalar;
 state={...base,...Object.fromEntries(FORM_KEYS.map(k=>[k,r[k]||base[k]||''])),imzalar:im,id:r.id};tab='hazirla';render(root);root?.querySelector('[data-ttn-page]')?.scrollIntoView?.({block:'start'})
}
function field(label,html,cls=''){return`<label class="ka-field ${cls}"><span class="ka-field__label">${esc(label)}</span>${html}</label>`}
function input(key,type='text',ph=''){return`<input class="ka-input" type="${type}" value="${esc(ensure()[key])}" placeholder="${esc(ph)}" data-ttn="${key}" autocomplete="off">`}
function imzaHtml(s){
 const list=s.imzalar||[],n=list.length;
 return`<div class="ttn-imzalar">${list.map((x,i)=>`<div class="ttn-imza"><input class="ka-input" type="text" value="${esc(x.ad)}" placeholder="${i+1}. kişi — Adı Soyadı" data-ttn-imza="${i}" data-k="ad" autocomplete="off"><input class="ka-input" type="text" value="${esc(x.unvan)}" placeholder="Unvan (Öğretmen, Öğrenci Velisi…)" data-ttn-imza="${i}" data-k="unvan" autocomplete="off"><span class="ttn-imza__acts"><button class="ka-btn ka-btn--secondary ka-btn--icon" type="button" data-ttn-up="${i}" aria-label="Yukarı taşı" ${i===0?'disabled':''}>▲</button><button class="ka-btn ka-btn--secondary ka-btn--icon" type="button" data-ttn-down="${i}" aria-label="Aşağı taşı" ${i===n-1?'disabled':''}>▼</button><button class="ka-btn ka-btn--secondary ka-btn--icon" type="button" data-ttn-rm="${i}" aria-label="Kişiyi kaldır">✕</button></span></div>`).join('')}</div>${n<MAX_IMZA?'<button class="ka-btn ka-btn--secondary" type="button" data-ttn-add>+ Kişi ekle</button>':''}`
}
function historyHtml(){
 const q=norm(histQuery.trim()),all=records(),list=all.filter(r=>!q||norm([r.baslik,r.yer,r.anlatim,r.olusturanAd].join(' ')).includes(q));
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><div class="vgf-hist-head"><strong>💾 Kayıtlı tutanaklarım <span class="ka-badge">${all.length}</span></strong><input class="ka-input" type="search" placeholder="Ad veya olay ara" value="${esc(histQuery)}" data-ttn-search></div>
 ${list.length?`<div class="vgf-hist">${list.map(r=>`<div class="vgf-rec ${ensure().id===r.id?'is-open':''}"><button class="vgf-rec__main" type="button" data-ttn-open="${esc(r.id)}"><strong>${esc(r.baslik||'Tutanak')}</strong><small>${esc(trDate(r.olayTarih))}${r.olayTarih&&r.olaySaat?' · '+esc(r.olaySaat):''}${isManager()&&r.olusturanAd?' · '+esc(r.olusturanAd):''}</small><small class="vgf-rec__why">${esc(String(r.anlatim||'').replace(/\s+/g,' '))}</small></button><span class="vgf-rec__acts"><button class="ka-btn ka-btn--secondary" type="button" data-ttn-rprint="${esc(r.id)}">🖨</button><button class="ka-btn ka-btn--secondary" type="button" data-ttn-del="${esc(r.id)}" aria-label="Sil">🗑</button></span></div>`).join('')}</div>`:`<p class="ka-muted">${all.length?'Aramaya uyan tutanak yok.':'Henüz kayıtlı tutanağınız yok. Yukarıya bir ad yazıp Kaydet’e basın; sonra istediğiniz zaman bu listeden açıp düzenleyebilirsiniz.'}</p>`}</div></article>`
}
function tabsHtml(){return`<div class="ttn-tabs" role="tablist">${[['hazirla','📋 Tutanak Hazırla'],['metinler','📚 Hazır Metinler'],['rehber','ℹ️ Nasıl Tutulur?']].map(([k,l])=>`<button type="button" role="tab" class="ka-btn ${tab===k?'':'ka-btn--secondary'}" aria-selected="${tab===k}" data-ttn-tab="${k}">${l}</button>`).join('')}</div>`}
function viewHazirla(s){
 const n=imzaSayisi(s);
 return`${n<2?`<div class="ttn-warn" role="alert">⚠ <b>En az 2 imza olmalıdır.</b> Aşağıya en az bir kişi daha ekleyin.</div>`:''}
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>🕒 Olayın zamanı ve yeri</strong><div class="ka-grid">${field('Olay tarihi',input('olayTarih','date'))}${field('Olay saati',input('olaySaat','time'))}${field('Yer (sınıf / bölüm)',input('yer','text','Örn: 7/A sınıfı, okul bahçesi'))}${field('Ders / etkinlik (isteğe bağlı)',input('ders','text','Örn: Türkçe dersi, teneffüs'))}</div></div></article>
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>📝 Olayın anlatımı</strong><label class="ka-field"><span class="ka-field__label">Ne oldu?</span><textarea class="ka-input" rows="8" placeholder="Olayı olduğu gibi, yorum katmadan yazın. Kimin ne yaptığı açık olsun." data-ttn="anlatim">${esc(s.anlatim)}</textarea></label><p class="ka-muted">Yalnızca gördüğünüzü yazın; kanaat ve suçlama cümlelerinden kaçının. Hazır bir kalıp için <b>Hazır Metinler</b> sekmesine bakın.</p></div></article>
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>✒️ İmzalayanlar</strong><p class="ka-muted">En az 2, tercihen 3 kişi olmalı. Sıra soldan sağa yazılır: en yetkili kişi 1. sırada. Yerini ▲▼ düğmeleriyle değiştirebilirsiniz.</p>${imzaHtml(s)}</div></article>
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>📅 Düzenleme zamanı</strong><div class="ka-grid">${field('Düzenleme tarihi',input('duzTarih','date'))}${field('Düzenleme saati',input('duzSaat','time'))}</div><p class="ka-muted">Kapanış cümlesinde geçer: “İş bu tutanak … tarihinde, saat … sıralarında tarafımızca düzenlenerek kayıt altına alınmıştır.”</p></div></article>
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>💾 Kayıt adı</strong><div class="ttn-save">${input('baslik','text','Örn: 7/B kavga – 12 Eylül')}<button class="ka-btn" type="button" data-ttn-save>${s.id?'Değişiklikleri kaydet':'Kaydet'}</button></div></div></article>
 <footer class="vgf-actions"><button class="ka-btn ka-btn--secondary" type="button" data-ttn-reset>${s.id?'Yeni tutanak':'Temizle'}</button><button class="ka-btn" type="button" data-ttn-print>🖨 Yazdır / PDF</button></footer>
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Önizleme</strong><div class="ttn-preview ka-report">${paper(s)}</div></div></article>
 ${historyHtml()}`
}
function viewMetinler(){
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>Hazır metinler</strong><p class="ka-muted">Bir kalıp seçtiğinizde metin forma gelir. <b>…………</b> işaretli yerleri olaya göre doldurun, olmayan cümleleri silin.</p><div class="ttn-list">${HAZIR.map((h,i)=>`<div class="ttn-tpl"><div><strong>${esc(h.ad)}</strong><small>${esc(h.metin.replace(/\s+/g,' ').slice(0,110))}…</small></div><button class="ka-btn" type="button" data-ttn-tpl="${i}">Kullan</button></div>`).join('')}</div></div></article>`
}
function viewRehber(){return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>Tutanak nasıl tutulur?</strong><ol class="ttn-guide">${REHBER.map(x=>`<li>${esc(x)}</li>`).join('')}</ol></div></article>`}
function render(root=document.getElementById('v2ModuleRoot')){
 if(!root)return false;const s=ensure();
 root.innerHTML=`<section class="vgf-page ttn-page" data-ttn-page><header class="vgf-head"><div><h2>Tutanak Hazırla</h2>${s.id?'<span class="ka-badge">Kayıtlı tutanak düzenleniyor</span>':''}<p class="ka-muted">Olayı anlatın; tarih-saat ile başlayan tutanak metni ve imza bölümü otomatik oluşur. Yazdırıp ıslak imza ile onaylayın.</p></div></header>${tabsHtml()}${tab==='metinler'?viewMetinler():tab==='rehber'?viewRehber():viewHazirla(s)}</section>`;
 bind(root);return true
}
function bind(root){
 root.querySelectorAll('[data-ttn]').forEach(el=>el.addEventListener('input',()=>{ensure()[el.dataset.ttn]=el.value;if(el.dataset.ttn!=='baslik')updatePreview(root)}));
 root.querySelectorAll('[data-ttn-imza]').forEach(el=>el.addEventListener('input',()=>{const s=ensure(),i=Number(el.dataset.ttnImza);if(s.imzalar[i])s.imzalar[i][el.dataset.k]=el.value;updatePreview(root)}));
 root.querySelectorAll('[data-ttn-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.ttnTab;render(root)}));
 root.querySelectorAll('[data-ttn-tpl]').forEach(b=>b.addEventListener('click',()=>{const h=HAZIR[Number(b.dataset.ttnTpl)],s=ensure();if(!h)return;if(String(s.anlatim||'').trim()&&!confirm('Anlatım alanındaki metin bu kalıpla değiştirilsin mi?'))return;s.anlatim=h.metin;if(h.yer&&!String(s.yer||'').trim())s.yer=h.yer;if(!String(s.baslik||'').trim())s.baslik=h.ad;tab='hazirla';render(root);global.toast?.('Hazır metin forma eklendi.')}));
 root.querySelector('[data-ttn-add]')?.addEventListener('click',()=>{const s=ensure();if(s.imzalar.length<MAX_IMZA)s.imzalar.push({ad:'',unvan:''});render(root)});
 root.querySelectorAll('[data-ttn-rm]').forEach(b=>b.addEventListener('click',()=>{const s=ensure(),i=Number(b.dataset.ttnRm);s.imzalar.splice(i,1);if(!s.imzalar.length)s.imzalar.push({ad:'',unvan:''});render(root)}));
 const move=(i,d)=>{const a=ensure().imzalar,j=i+d;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];render(root)};
 root.querySelectorAll('[data-ttn-up]').forEach(b=>b.addEventListener('click',()=>move(Number(b.dataset.ttnUp),-1)));
 root.querySelectorAll('[data-ttn-down]').forEach(b=>b.addEventListener('click',()=>move(Number(b.dataset.ttnDown),1)));
 root.querySelector('[data-ttn-save]')?.addEventListener('click',()=>save(root));
 root.querySelector('[data-ttn-print]')?.addEventListener('click',()=>print());
 root.querySelector('[data-ttn-reset]')?.addEventListener('click',()=>{state=blank();render(root)});
 root.querySelector('[data-ttn-search]')?.addEventListener('input',e=>{histQuery=e.target.value;const pos=e.target.selectionStart;render(root);const n=root.querySelector('[data-ttn-search]');n?.focus();n?.setSelectionRange?.(pos,pos)});
 root.querySelectorAll('[data-ttn-open]').forEach(b=>b.addEventListener('click',()=>{const r=rows(T).find(x=>x.id===b.dataset.ttnOpen);if(r)loadRecord(r,root)}));
 root.querySelectorAll('[data-ttn-rprint]').forEach(b=>b.addEventListener('click',()=>{const r=rows(T).find(x=>x.id===b.dataset.ttnRprint);if(r)print(fromRecord(r))}));
 root.querySelectorAll('[data-ttn-del]').forEach(b=>b.addEventListener('click',async()=>{const r=rows(T).find(x=>x.id===b.dataset.ttnDel);if(!r||!confirm(`“${r.baslik||'Tutanak'}” silinsin mi?`))return;try{await device().remove(T,global.COL.tutanaklar,r.id);if(state?.id===r.id)state=blank();global.toast?.('Tutanak silindi.');render(root)}catch(e){global.toast?.('Silinemedi: '+(e?.message||e))}}))
}
function fromRecord(r){const base=blank();return{...base,...Object.fromEntries(FORM_KEYS.map(k=>[k,r[k]||base[k]||''])),imzalar:(r.imzalayanlar||[]).map(x=>({ad:x.ad||'',unvan:x.unvan||''})),id:r.id}}
function updatePreview(root){const box=root?.querySelector('.ttn-preview');if(box)box.innerHTML=paper(ensure());const w=root?.querySelector('.ttn-warn');const n=imzaSayisi(ensure());if(w)w.hidden=n>=2}
// Tutanak metni: tarih/saat + (yer, ders) ile başlar; "'te/'ta" ekleri kullanılmaz ("sıralarında").
function giris(s){
 const t=trDate(s.olayTarih)||'…/…/……',sa=s.olaySaat||'…:…',yer=String(s.yer||'').trim(),ders=String(s.ders||'').trim();
 return`${t} tarihinde saat ${sa} sıralarında${yer?`, ${yer} yerinde`:''}${ders?` (${ders})`:''} aşağıda açıklanan olay meydana gelmiştir.`
}
function kapanis(s){return`İş bu tutanak ${trDate(s.duzTarih)||'…/…/……'} tarihinde, saat ${s.duzSaat||'…:…'} sıralarında tarafımızca düzenlenerek kayıt altına alınmıştır.`}
function paper(s){
 const im=(s.imzalar||[]).filter(x=>String(x.ad||'').trim()||String(x.unvan||'').trim());
 const list=im.length?im:[{ad:'',unvan:''},{ad:'',unvan:''}];
 const anlatim=String(s.anlatim||'').trim();
 return`<article class="ttn-paper"><h1 class="ttn-title">TUTANAKTIR</h1><p class="ttn-intro">${esc(giris(s))}</p><div class="ttn-body">${anlatim?esc(anlatim):`<span class="ttn-dots">${NOKTA}${NOKTA}</span>`}</div><p class="ttn-close">${esc(kapanis(s))}</p><div class="ttn-sign" style="--ttn-n:${list.length}">${list.map(x=>`<div><b class="ttn-imza-l">İmza</b><span>${esc(x.ad)||'…………………………'}</span><b>${esc(x.unvan)}</b></div>`).join('')}</div></article>`
}
function reportBody(data){return`<div class="ttn-print">${paper(data||ensure())}</div>`}
function print(data){
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 const s=data||ensure();
 if(imzaSayisi(s)<2&&!confirm('Tutanakta 2’den az imza var. Yine de yazdırılsın mı?'))return false;
 global.ReportEngine.printReport('Tutanak',reportBody(s),{fileName:'Tutanak',yon:'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' '});return true
}
function open(){state=blank();tab='hazirla';histQuery='';const ok=render();prepare().then(()=>{if(document.querySelector('[data-ttn-page]')&&tab==='hazirla'){const a=document.activeElement;if(!a||!a.closest?.('[data-ttn-page]')||a===document.body)render()}});return ok}
global.TutanakModule={open,render,print,reportBody,records,paper,giris,kapanis,HAZIR,reset:()=>{state=blank();tab='hazirla';histQuery='';return state}};
})(window);

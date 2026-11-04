/* Koruk Asistan — Ek Ders İşlemleri
 * Aylık ek ders ücret onayının iki belgesi dönem bazında tutulur: onay yazısı (PDF) ve onay çizelgesi (PDF, tek sayfa yatay A4).
 * Belgelerde T.C. kimlik numarası, imza kodu gibi kişisel veriler bulunur; bu yüzden uygulamanın herkese açık dosyalarına
 * KONMAZ. Mevcut Dokümanlar altyapısıyla (özel depolama, görünürlük "Kişisel": yalnız yükleyen ve yönetici) saklanır.
 * Yükleme/silme/indirme/açma: documents.js (DokumanlarService, DocumentsModule). Stil: css/design-system-base.css (.kek-*).
 */
(function(global){
'use strict';
if(global.EkDersModule)return;
const KATEGORI='Ek Ders İşlemleri';
const TURLER=Object.freeze([
 {id:'yazi',ad:'Ek Ders Ücret Onay Yazısı',not:'İl/İlçe Millî Eğitim Müdürlüğü onay yazısı (PDF)',ikon:'📄'},
 {id:'cizelge',ad:'Ek Ders Ücret Onay Çizelgesi',not:'Tek sayfa, yatay A4 çizelge (PDF)',ikon:'📊'}
]);
const AYLAR=Object.freeze(['Ocak','Şubat','Mart','Nisan','Mayıs','Haziran','Temmuz','Ağustos','Eylül','Ekim','Kasım','Aralık']);
const MAX_BOYUT=10*1024*1024;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const admin=()=>global.AKTIF_KULLANICI?.admin===true;
const canEdit=()=>global.PermissionService?.can?.('documents.edit','edit')??false;
const toast=m=>global.toast?.(m);

/* Dönem: ek ders onayı genellikle bir önceki ayın çalışması için ayın başında yapılır; ayın ilk yarısında önceki ay önerilir. */
function varsayilanDonem(now=new Date()){const d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-15);return{ay:d.getMonth(),yil:d.getFullYear()}}
const S={...varsayilanDonem(),mesgul:'',ilerleme:0};
const donemAnahtar=(ay=S.ay,yil=S.yil)=>`${yil}-${String(ay+1).padStart(2,'0')}`;
const donemEtiket=(a=donemAnahtar())=>{const[y,m]=String(a).split('-');return`${AYLAR[Number(m)-1]||''} ${y}`.trim()};
let mounted=false,root=null,unsubs=[];

/* Belgeler: Dokümanlar ile aynı yerel veri (yönetici hepsini, diğerleri açık + kendi belgelerini görür). */
function zaman(d){const t=d?.yuklenmeTarihi;if(!t)return 0;if(typeof t.toMillis==='function')return t.toMillis();if(typeof t.seconds==='number')return t.seconds*1000;return new Date(t).getTime()||0}
function tumBelgeler(){
 const m=new Map(),kaynak=admin()?arr('dokumanlar'):[...arr('dokumanlarAcik'),...arr('dokumanlarBenim')];
 for(const d of kaynak)if(d?.id&&d.kategori===KATEGORI&&global.DokumanlarService?.gorunurMu?.(d)!==false)m.set(d.id,d);
 return[...m.values()].sort((a,b)=>zaman(b)-zaman(a));
}
const belgeler=(tur,donem)=>tumBelgeler().filter(d=>d.ekDersTur===tur&&d.ekDersDonem===donem);
const kayitliDonemler=()=>[...new Set(tumBelgeler().map(d=>d.ekDersDonem).filter(Boolean))].sort().reverse();
const boyut=n=>{n=Number(n)||0;if(!n)return'';return n<1048576?`${(n/1024).toFixed(1)} KB`:`${(n/1048576).toFixed(1)} MB`};
const tarihMetni=d=>{const t=zaman(d);return t?new Date(t).toLocaleString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}):''};

/* ── ekran ── */
function belgeSatiri(d,duzenle){
 const meta=[boyut(d.dosyaBoyutu),tarihMetni(d)].filter(Boolean).join(' · ');
 return`<div class="kek-dosya" data-kek-belge="${esc(d.id)}"><button type="button" class="kek-dosya__ad" data-kek-ac="${esc(d.id)}"><span aria-hidden="true">📄</span><span class="kek-dosya__metin"><strong>${esc(d.dosyaAdi||d.ad||'Belge')}</strong><small class="ka-muted">${esc(meta)}</small></span></button><div class="ka-row kek-dosya__eylem"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-kek-indir="${esc(d.id)}">İndir</button>${duzenle?`<button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-kek-sil="${esc(d.id)}">Sil</button>`:''}</div></div>`;
}
function bolum(tur,donem,duzenle){
 const liste=belgeler(tur.id,donem),yukluyor=S.mesgul===tur.id;
 const yukle=duzenle?`<button class="ka-btn ${liste.length?'ka-btn--secondary':''} ka-btn--sm" type="button" data-kek-yukle="${tur.id}" ${S.mesgul?'disabled':''}>${yukluyor?`Yükleniyor… %${S.ilerleme}`:liste.length?'PDF’i Değiştir':'PDF Yükle'}</button>`:'';
 return`<article class="ka-card kek-bolum" data-kek-tur="${tur.id}"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between kek-bolum__baslik"><div class="ka-row kek-bolum__ad"><span class="kek-bolum__ikon" aria-hidden="true">${tur.ikon}</span><div><h3>${esc(tur.ad)}</h3><div class="ka-muted">${esc(tur.not)}</div></div></div>${yukle}</div>${liste.length?liste.map(d=>belgeSatiri(d,duzenle)).join(''):`<div class="ka-empty">${esc(donemEtiket(donem))} için henüz yüklenmedi.</div>`}</div></article>`;
}
function ciz(){
 if(!mounted||!root)return;
 const donem=donemAnahtar(),duzenle=canEdit(),kayitli=kayitliDonemler();
 root.innerHTML=`<section class="ka-stack kek-sayfa" data-ekders-module><div class="ka-row ka-row--between"><div><h2>Ek Ders İşlemleri</h2><p class="ka-muted">Aylık ek ders ücret onay yazısı ve onay çizelgesi.</p></div><span class="ka-badge">${esc(donemEtiket(donem))}</span></div>
 <article class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-grid"><label class="ka-field"><span class="ka-field__label">Ay</span><select data-kek-ay>${AYLAR.map((a,i)=>`<option value="${i}" ${i===S.ay?'selected':''}>${a}</option>`).join('')}</select></label><label class="ka-field"><span class="ka-field__label">Yıl</span><input type="number" inputmode="numeric" min="2020" max="2100" value="${S.yil}" data-kek-yil></label></div>${kayitli.length?`<div class="ka-row ka-wrap kek-donemler" aria-label="Kayıtlı dönemler">${kayitli.map(a=>`<button class="ka-btn ${a===donem?'':'ka-btn--secondary'} ka-btn--sm" type="button" data-kek-donem="${a}">${esc(donemEtiket(a))}</button>`).join('')}</div>`:''}</div></article>
 ${TURLER.map(t=>bolum(t,donem,duzenle)).join('')}
 <p class="ka-muted kek-not">Belgeler “Kişisel” olarak saklanır: yalnız siz ve yönetici görür. Çizelgede T.C. kimlik numaraları bulunduğundan herkese açık yapmayın.</p>
 <input type="file" accept="application/pdf,.pdf" hidden data-kek-dosya></section>`;
 baglan();
}
function baglan(){
 const ay=root.querySelector('[data-kek-ay]'),yil=root.querySelector('[data-kek-yil]');
 ay?.addEventListener('change',()=>{S.ay=Number(ay.value)||0;ciz()});
 yil?.addEventListener('change',()=>{const y=Math.round(Number(yil.value));if(y>=2020&&y<=2100){S.yil=y;ciz()}else yil.value=S.yil});
 root.querySelectorAll('[data-kek-donem]').forEach(b=>b.addEventListener('click',()=>{const[y,m]=b.dataset.kekDonem.split('-').map(Number);S.ay=m-1;S.yil=y;ciz()}));
 const girdi=root.querySelector('[data-kek-dosya]');let hedef=null;
 root.querySelectorAll('[data-kek-yukle]').forEach(b=>b.addEventListener('click',()=>{hedef=TURLER.find(t=>t.id===b.dataset.kekYukle);if(hedef&&girdi){girdi.value='';girdi.click()}}));
 girdi?.addEventListener('change',()=>{const f=girdi.files?.[0];if(hedef&&f)yukle(hedef,f)});
 root.querySelectorAll('[data-kek-ac]').forEach(b=>b.addEventListener('click',()=>global.DocumentsModule?.openDocument?.(b.dataset.kekAc)));
 root.querySelectorAll('[data-kek-indir]').forEach(b=>b.addEventListener('click',()=>global.DocumentsModule?.downloadDocument?.(b.dataset.kekIndir)));
 root.querySelectorAll('[data-kek-sil]').forEach(b=>b.addEventListener('click',()=>sil(b.dataset.kekSil)));
}

/* ── işlemler ── */
function hataMetni(e){
 const m=String(e?.message||e||'');
 if(m==='yetkisiz')return'Bu işlem için yetkiniz yok.';
 if(m.startsWith('depolama-siniri:'))return m.slice(16)||'Depolama sınırına ulaşıldı.';
 return m||'İşlem yapılamadı.';
}
async function yukle(tur,dosya){
 if(S.mesgul)return;
 if(!(dosya.type==='application/pdf'||/\.pdf$/i.test(dosya.name||'')))return toast('Yalnız PDF dosyası yüklenebilir.');
 if(dosya.size>MAX_BOYUT)return toast('Dosya 10 MB’tan büyük olamaz.');
 if(!global.DokumanlarService?.dokumanEkle)return toast('Doküman servisi hazır değil.');
 const donem=donemAnahtar(),eskiler=belgeler(tur.id,donem);
 S.mesgul=tur.id;S.ilerleme=0;ciz();
 try{
  await global.DokumanlarService.dokumanEkle({ad:`${tur.ad} — ${donemEtiket(donem)}`,kategori:KATEGORI,aciklama:'',ekDersTur:tur.id,ekDersDonem:donem,gorunurluk:'kisisel'},dosya,p=>{S.ilerleme=p;const b=root?.querySelector(`[data-kek-yukle="${tur.id}"]`);if(b)b.textContent=`Yükleniyor… %${p}`});
  /* Değiştirme: yeni dosya yüklendikten SONRA aynı dönemin eski dosyası silinir (yükleme başarısızsa eskisi kalır). */
  for(const d of eskiler)await global.DokumanlarService.dokumanSil(d.id,d.storagePath,d).catch(e=>console.warn('[Ek Ders] eski belge silinemedi',e?.message||e));
  toast('Belge yüklendi.');
 }catch(e){console.warn('[Ek Ders/yukle]',e);toast(hataMetni(e))}
 finally{S.mesgul='';S.ilerleme=0;ciz()}
}
async function sil(id){
 const d=tumBelgeler().find(x=>x.id===id);if(!d||!canEdit())return;
 if(!confirm(`“${d.dosyaAdi||d.ad||'Belge'}” silinsin mi?`))return;
 try{await global.DokumanlarService.dokumanSil(id,d.storagePath,d);toast('Belge silindi.')}
 catch(e){toast(e?.message==='sahip-degil'?'Bu belgeyi yalnız yükleyen kişi veya yönetici silebilir.':hataMetni(e))}
}

/* ── yaşam döngüsü ── */
async function open(target=document.getElementById('v2ModuleRoot')){
 if(!target)return false;
 unmount();mounted=true;root=target;
 ['data.dokumanlar','data.dokumanlarAcik','data.dokumanlarBenim'].forEach(p=>{const u=global.AppStore?.subscribe?.(p,()=>requestAnimationFrame(ciz));if(u)unsubs.push(u)});
 ciz();
 try{await global.DocumentsModule?.prepareLocal?.()}catch(e){console.warn('[Ek Ders/hazırlık]',e?.message||e)}
 ciz();return true;
}
function unmount(){mounted=false;root=null;S.mesgul='';unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
global.EkDersModule={open,unmount,render:ciz,varsayilanDonem,donemAnahtar,donemEtiket};
})(window);

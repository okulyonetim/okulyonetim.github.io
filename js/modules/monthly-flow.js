/* Koruk Asistan — Aylık Yönetim Akışı
 * Eğitim yılının her ayı için idarenin takip edeceği iş ve işlemlerin öz kontrol listesi.
 * Maddeler ilgili uygulama sayfalarına bağlanır; işaret, not, yıldız ve gizleme tercihleri cihazda (KaPrefs)
 * saklanır ve kullanıcının kendi tercih belgesine eşitlenir (yeni koleksiyon/kural yok).
 */
(function(global){
'use strict';
if(global.MonthlyFlowModule)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PREF='aylik-akis-v1';
/* Bağlantılar: [etiket, modül, sayfa] — menüdeki kayıtlarla aynı rotalar. */
const L={
 ogretmen:['Öğretmenler','people','teachers'],sinif:['Sınıflar','people','classes'],ogrenci:['Öğrenciler','people','students'],
 ders:['Ders Programı','academic','schedule'],nobet:['Nöbet Programı','management','duty'],yoklama:['Öğrenci Yoklama','tools','student-attendance'],
 belirli:['Belirli Gün & Haftalar','tools','form-belirli'],zumre:['Zümre','tools','form-zumre'],sok:['ŞÖK','tools','form-sok'],bep:['Yıllık / BEP Planı','tools','form-bep'],
 rehberlik:['Rehberlik','tools','form-rehberlik'],maarif:['Maarif Model Raporları','tools','form-maarif'],kulup:['Sosyal Kulüpler','tools','form-kulup'],diger:['Diğer Evraklar','tools','form-diger'],
 aylik:['Aylık İşler','management','tasks'],kurul:['Kurul ve Komisyonlar','committees','home'],menu:['Aylık Menü','food','monthly'],yemekden:['Yemek Denetimi','food','audit'],
 tasima:['Taşıma İşlemleri','transport','services'],oturma:['Servis Oturma','transport','busSeats'],devamsizlik:['Devamsızlık Çizelgesi','tools','attendance'],not:['Not Çizelgesi','tools','grades'],
 odev:['Ödev Takip Çizelgesi','tools','homework'],toplanti:['Toplantı Çizelgesi','management','meeting-schedule'],puantaj:['Puantaj & İmza Sirküsü','management','puantaj'],
 izin:['İzin İşlemleri','management','staff-leaves'],tutanak:['Tutanak Hazırla','tutanak',''],veligor:['Veli Görüşme Formu','parentmeeting',''],dilekce:['Dilekçe Oluştur','dilekcehazirla',''],
 gezi:['Gezi Planı','gezi',''],yazili:['Yazılı Sınavlar','academic','written'],deneme:['Deneme Sınavları','academic','trial'],takvim:['Akademik Takvim','academic','calendar'],
 kontrol:['Kontrol Listeleri','tools','checklists'],rapor:['Okul Raporları','reports','home'],evrak:['Evrak Takibi','documents','evrak']
};
/* Her madde: [metin, bağlantı anahtarları]. Metinler okul uygulamasına göre yazılmıştır; resmî tarih/mevzuat içermez,
   güncel talimat ve resmî yazılara göre idare tarafından doğrulanmalıdır. */
const MONTHS=[
{k:'eylul',ad:'Eylül',ic:'📖',m:9,it:[
 ['Öğretmen, sınıf ve öğrenci kayıtlarının güncellenmesi; sınıf mevcutlarının kontrolü',['ogretmen','sinif','ogrenci']],
 ['Ders programının hazırlanıp öğretmen ve öğrencilere duyurulması',['ders']],
 ['Nöbet yerleri ve nöbet programının oluşturulması',['nobet']],
 ['Öğretmenler kurulu ve zümre toplantılarının planlanması',['toplanti','zumre']],
 ['Yıllık planlar ile BEP ve ŞÖK çalışmalarının başlatılması',['bep','sok']],
 ['Sosyal kulüp ve toplulukların kurulması, danışman öğretmenlerin belirlenmesi',['kulup']],
 ['Okul kurul, komisyon ve ekiplerinin oluşturulması',['kurul']],
 ['Rehberlik yıllık çalışma programının hazırlanması',['rehberlik']],
 ['Yemek ve kantin denetim düzeninin kurulması',['yemekden']],
 ['Belirli gün ve haftaların yıllık takviminin hazırlanması',['belirli']],
 ['Öğrenci yoklama düzeninin başlatılması; devamsızlığın velilere bildirilmesi',['yoklama']],
 ['Eğitim öğretim yılı çalışma takviminin personele duyurulması',['takvim']]]},
{k:'ekim',ad:'Ekim',ic:'🍂',m:10,it:[
 ['Zümre toplantılarının yapılması ve tutanaklarının dosyalanması',['zumre','tutanak']],
 ['Sınıf/şube veli toplantılarının yapılması',['veligor']],
 ['Okul güvenliği ve afet hazırlığı kontrollerinin yapılması',['kontrol']],
 ['Yazılı sınav takviminin belirlenip duyurulması',['yazili']],
 ['Belirli gün ve haftalara ait programların uygulanması',['belirli']],
 ['Aylık yemek menüsünün hazırlanması ve yemek denetimi',['menu','yemekden']],
 ['Nöbet çizelgesinin ve nöbet defterinin kontrolü',['nobet']],
 ['Aylık devamsızlık çizelgesinin hazırlanması',['devamsizlik']],
 ['Personel puantaj ve izin kayıtlarının kontrolü',['puantaj','izin']],
 ['Kulüp çalışma planlarının uygulanması',['kulup']],
 ['Kurul ve komisyon toplantılarının yapılması',['kurul']],
 ['Aylık işlerin takibi ve ay sonu değerlendirmesi',['aylik']]]},
{k:'kasim',ad:'Kasım',ic:'🍁',m:11,it:[
 ['Birinci yazılı sınavların yapılması ve not girişlerinin planlanması',['yazili','not']],
 ['Atatürk Haftası ve belirli gün programlarının uygulanması',['belirli']],
 ['Öğretmenler Günü programının planlanması',['belirli']],
 ['Rehberlik ve veli görüşmelerinin yürütülmesi',['rehberlik','veligor']],
 ['Ödev takip çizelgelerinin kontrolü',['odev']],
 ['Aylık devamsızlık çizelgesinin hazırlanması',['devamsizlik']],
 ['Puantaj ve izin kayıtlarının kontrolü',['puantaj','izin']],
 ['Yemek denetimi ve aylık menünün hazırlanması',['yemekden','menu']],
 ['Kurul ve komisyon çalışmalarının değerlendirilmesi',['kurul']],
 ['Gelen-giden evrakın dosyalanması',['diger','evrak']]]},
{k:'aralik',ad:'Aralık',ic:'❄️',m:12,it:[
 ['Dönem içi başarı durumunun öğretmenler ve zümrelerle değerlendirilmesi',['zumre','not']],
 ['Yarıyıl öncesi yazılı sınav ve not girişlerinin takibi',['yazili','not']],
 ['Deneme sınavlarının planlanması ve sonuçların incelenmesi',['deneme']],
 ['Rehberlik çalışmalarının ve öğrenci izleme sonuçlarının değerlendirilmesi',['rehberlik']],
 ['Aylık devamsızlık çizelgesinin hazırlanması; devamsızlığı artan öğrencilerin velilerle görüşülmesi',['devamsizlik','veligor']],
 ['Puantaj ve izin kayıtlarının kontrolü',['puantaj','izin']],
 ['Yemek denetimi ve aylık menünün hazırlanması',['yemekden','menu']],
 ['Belirli gün ve haftalara ait programların uygulanması',['belirli']],
 ['Dönem sonu raporlarının hazırlık çalışmalarının başlatılması',['rapor']]]},
{k:'ocak',ad:'Ocak',ic:'⛷️',m:1,it:[
 ['Dönem sonu not girişlerinin ve karne işlemlerinin tamamlanması',['not']],
 ['Dönem sonu öğretmenler kurulunun yapılması ve tutanağa bağlanması',['toplanti','tutanak']],
 ['Zümre toplantılarında dönem değerlendirmesi yapılması',['zumre']],
 ['Dönem devamsızlık toplamlarının çıkarılması',['devamsizlik']],
 ['Kulüp, rehberlik ve kurul dönem raporlarının hazırlanması',['kulup','rehberlik','kurul']],
 ['Yarıyıl tatili öncesi nöbet ve okul güvenliği düzenlemelerinin yapılması',['nobet']],
 ['Dönem sonu okul raporlarının hazırlanması',['rapor']],
 ['Evrakların dosyalanması ve arşivlenmesi',['diger','evrak']]]},
{k:'subat',ad:'Şubat',ic:'📝',m:2,it:[
 ['İkinci dönem ders programının ve nöbet programının güncellenmesi',['ders','nobet']],
 ['İkinci dönem zümre ve öğretmenler kurulu toplantılarının planlanması',['toplanti','zumre']],
 ['Yıllık plan, BEP ve ŞÖK çalışmalarının gözden geçirilmesi',['bep','sok']],
 ['Rehberlik çalışma programının ikinci dönem için güncellenmesi',['rehberlik']],
 ['Sınıf/şube veli toplantılarının yapılması',['veligor']],
 ['Kulüp çalışmalarının yeniden planlanması',['kulup']],
 ['Aylık devamsızlık çizelgesinin hazırlanması',['devamsizlik']],
 ['Yemek denetimi ve aylık menünün hazırlanması',['yemekden','menu']],
 ['Puantaj ve izin kayıtlarının kontrolü',['puantaj','izin']]]},
{k:'mart',ad:'Mart',ic:'🌱',m:3,it:[
 ['İstiklal Marşı’nın Kabulü ve Çanakkale Zaferi ile ilgili programların uygulanması',['belirli']],
 ['Yazılı sınavların yapılması ve not girişlerinin takibi',['yazili','not']],
 ['Veli görüşmelerinin ve rehberlik çalışmalarının yürütülmesi',['veligor','rehberlik']],
 ['Maarif Model faaliyet ve raporlarının güncellenmesi',['maarif']],
 ['Ödev takip çizelgelerinin kontrolü',['odev']],
 ['Aylık devamsızlık çizelgesinin hazırlanması',['devamsizlik']],
 ['Yemek denetimi ve aylık menünün hazırlanması',['yemekden','menu']],
 ['Puantaj ve izin kayıtlarının kontrolü',['puantaj','izin']],
 ['Kurul ve komisyon çalışmalarının değerlendirilmesi',['kurul']]]},
{k:'nisan',ad:'Nisan',ic:'🌷',m:4,it:[
 ['23 Nisan Ulusal Egemenlik ve Çocuk Bayramı hazırlıklarının yapılması',['belirli']],
 ['Belirli gün ve haftalara ait programların uygulanması',['belirli']],
 ['Yazılı ve deneme sınavlarının yapılması, sonuçların incelenmesi',['yazili','deneme']],
 ['Okul gezisi ve etkinlik planlarının hazırlanıp onaya sunulması',['gezi']],
 ['Aylık devamsızlık çizelgesinin hazırlanması',['devamsizlik']],
 ['Yemek denetimi ve aylık menünün hazırlanması',['yemekden','menu']],
 ['Puantaj ve izin kayıtlarının kontrolü',['puantaj','izin']],
 ['Rehberlik ve veli görüşmelerinin yürütülmesi',['rehberlik','veligor']]]},
{k:'mayis',ad:'Mayıs',ic:'🌸',m:5,it:[
 ['19 Mayıs Atatürk’ü Anma, Gençlik ve Spor Bayramı programının hazırlanması',['belirli']],
 ['Yıl sonu sınav ve not girişi takviminin hazırlanıp duyurulması',['yazili','not']],
 ['Okul gezisi ve sosyal etkinlik planlarının tamamlanması',['gezi']],
 ['Kulüp faaliyet raporlarının hazırlanması',['kulup']],
 ['Zümre toplantılarında yıl sonu değerlendirmesi yapılması',['zumre']],
 ['Aylık devamsızlık çizelgesinin hazırlanması',['devamsizlik']],
 ['Yemek denetimi ve aylık menünün hazırlanması',['yemekden','menu']],
 ['Puantaj ve izin kayıtlarının kontrolü',['puantaj','izin']],
 ['Kurul ve komisyon yıl sonu çalışmalarının planlanması',['kurul']]]},
{k:'haziran',ad:'Haziran',ic:'🎓',m:6,it:[
 ['Yıl sonu not girişlerinin, karne ve belge işlemlerinin tamamlanması',['not']],
 ['Eğitim öğretim yılı sonu öğretmenler kurulunun yapılması ve tutanağa bağlanması',['toplanti','tutanak']],
 ['Zümre, kulüp, rehberlik ve kurul yıl sonu raporlarının hazırlanması',['zumre','kulup','rehberlik','kurul']],
 ['Devamsızlık yıl toplamlarının çıkarılması',['devamsizlik']],
 ['Okul raporlarının hazırlanması ve arşivlenmesi',['rapor']],
 ['Evrakların dosyalanıp yeni eğitim yılı için arşivlenmesi',['diger','evrak']],
 ['Yaz dönemi çalışma planının hazırlanması; personel izin planlaması',['izin','aylik']],
 ['Okul demirbaş, kütüphane ve araç-gereç kayıtlarının kontrolü',[]]]},
{k:'yaz',ad:'Yaz Dönemi',ic:'☀️',m:0,it:[
 ['Yeni eğitim öğretim yılı hazırlık çalışmalarının planlanması',['takvim']],
 ['Okul bakım, onarım ve temizlik ihtiyaçlarının belirlenmesi',[]],
 ['Kayıt dönemi için öğrenci ve sınıf bilgilerinin hazırlanması',['sinif','ogrenci']],
 ['Personel izin kullanımlarının ve yaz dönemi nöbet düzeninin takibi',['izin','nobet']],
 ['Geçen yıl evrak ve raporlarının arşiv kontrolü',['diger','evrak']],
 ['Yeni yıl ders programı ve öğretmen görev dağılımının taslağının hazırlanması',['ders','ogretmen']]]}
];
const SECTIONS=[
 {k:'tasima',ad:'Taşıma merkezi okul işlemleri',ic:'🚌',not:'Yalnız taşımalı öğrencisi olan okullar içindir.',it:[
  ['Taşımalı öğrenci listesinin ve servis güzergâhının güncel olup olmadığının kontrolü',['tasima']],
  ['Taşımalı öğrenci devam çizelgesinin hazırlanıp ilgili birime gönderilmesi',['devamsizlik']],
  ['Servis araçlarının belge ve sürücü bilgilerinin kontrolü',['tasima']],
  ['Servis oturma planının güncellenmesi',['oturma']],
  ['Taşıma ve yemek hizmetine ait hakediş evrakının hazırlanması',['evrak']]]},
 {k:'pansiyon',ad:'Pansiyonlu okul işlemleri',ic:'🛏️',not:'Yalnız pansiyonu olan okullar içindir.',it:[
  ['Pansiyondaki öğrenci mevcut ve devam kayıtlarının kontrolü',['yoklama']],
  ['Pansiyon nöbet çizelgesinin hazırlanması',['nobet']],
  ['Günlük yemek listesinin ve yemek denetiminin yapılması',['yemekden']],
  ['Parasız yatılılık ve burs iş ve işlemlerinin takibi',['evrak']],
  ['Pansiyon evrak ve künye kayıtlarının dosyalanması',['diger']]]}
];
let root=null,ay='',st=null,notOpen='',showHidden=false,catalogLoaded=false;
const blank=()=>({done:{},star:{},hide:{},note:{},custom:{},sec:{}});
function load(){try{const r=JSON.parse(global.KaPrefs?.get(PREF,'')||'null');if(r&&typeof r==='object')return{...blank(),...r}}catch(_){}return blank()}
/* Hesap bazlı eşitleme: kullanıcının kendi tercih belgesi (oy_kullaniciTercihleri/{uid}); yeni koleksiyon/kural gerekmez.
   Cihazda her zaman yerel kopya tutulur; çevrimdışıyken ya da hata olursa yalnız yerel çalışır. */
let pushT=0;
const ref=()=>{try{const u=global.auth?.currentUser;return u&&global.db?global.db.collection('oy_kullaniciTercihleri').doc(u.uid):null}catch(_){return null}};
function push(){clearTimeout(pushT);pushT=setTimeout(()=>{const r=ref();if(!r)return;try{r.set({aylikAkis:JSON.stringify(st),aylikAkisT:st.t||Date.now()},{merge:true}).catch(()=>{})}catch(_){}},800)}
function pull(){const r=ref();if(!r)return;try{r.get().then(d=>{const x=d.exists?d.data():null;if(!x||!x.aylikAkis){if(st&&(st.t||0)>0)push();return}let rem;try{rem=JSON.parse(x.aylikAkis)}catch(_){return}const rt=Number(x.aylikAkisT)||0,lt=(st&&st.t)||0;
 if(rt>lt){st={...blank(),...rem,t:rt};try{global.KaPrefs?.set(PREF,JSON.stringify(st))}catch(_){}if(root&&root.querySelector('[data-maf-page]')&&!notOpen)render(root)}else if(lt>rt)push()}).catch(()=>{})}catch(_){}}
function save(){st.t=Date.now();try{global.KaPrefs?.set(PREF,JSON.stringify(st))}catch(_){}push()}
function ensure(){if(!st)st=load();return st}
function curKey(){const m=new Date().getMonth()+1;return(MONTHS.find(x=>x.m===m)||MONTHS[MONTHS.length-1]).k}
const month=()=>MONTHS.find(x=>x.k===ay)||MONTHS[0];
function itemsOf(mo){
 const s=ensure(),out=[];
 mo.it.forEach((x,i)=>out.push({id:`${mo.k}:${i}`,t:x[0],l:x[1]}));
 SECTIONS.filter(sc=>s.sec[sc.k]).forEach(sc=>sc.it.forEach((x,i)=>out.push({id:`${mo.k}:${sc.k}:${i}`,t:x[0],l:x[1],sec:sc.ad})));
 (s.custom[mo.k]||[]).forEach(c=>out.push({id:c.id,t:c.t,l:[],own:true}));
 return out
}
function stats(mo){const s=ensure(),l=itemsOf(mo).filter(x=>!s.hide[x.id]);return{total:l.length,done:l.filter(x=>s.done[x.id]).length}}
function linkHtml(k){const x=L[k];return x?`<button type="button" class="maf-link" data-maf-go="${esc(k)}"><span aria-hidden="true">🔗</span><span>${esc(x[0])}</span><span aria-hidden="true">↗</span></button>`:''}
function itemHtml(x){
 const s=ensure(),done=!!s.done[x.id],star=!!s.star[x.id],note=s.note[x.id]||'',open=notOpen===x.id;
 return`<article class="maf-item${done?' is-done':''}${star?' is-star':''}" data-maf-item="${esc(x.id)}">
<button type="button" class="maf-check" role="checkbox" aria-checked="${done}" aria-label="Tamamlandı olarak işaretle" data-maf-done="${esc(x.id)}">${done?'✓':''}</button>
<div class="maf-body"><p class="maf-text">${esc(x.t)}</p>${x.sec?`<small class="ka-muted">${esc(x.sec)}</small>`:''}
${x.l.length?`<div class="maf-links">${x.l.map(linkHtml).join('')}</div>`:''}
${note&&!open?`<button type="button" class="maf-note" data-maf-note="${esc(x.id)}">📝 ${esc(note)}</button>`:''}
${open?`<div class="maf-noteedit"><textarea class="ka-input" rows="2" data-maf-notetext="${esc(x.id)}" placeholder="Notunuz">${esc(note)}</textarea><div class="maf-noteact"><button type="button" class="ka-btn ka-btn--sm" data-maf-notesave="${esc(x.id)}">Kaydet</button><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-maf-notecancel>Vazgeç</button></div></div>`:(!note?`<button type="button" class="maf-notebtn" data-maf-note="${esc(x.id)}">✎ Not ekle</button>`:'')}</div>
<div class="maf-tools"><button type="button" class="maf-icon${star?' is-on':''}" data-maf-star="${esc(x.id)}" aria-pressed="${star}" aria-label="Önemli">${star?'★':'☆'}</button><button type="button" class="maf-icon" data-maf-hide="${esc(x.id)}" aria-label="${x.own?'Maddeyi sil':'Bu maddeyi gizle'}">×</button></div></article>`
}
function render(r=document.getElementById('v2ModuleRoot')){
 if(!r)return false;root=r;const s=ensure();if(!ay)ay=curKey();const mo=month(),stt=stats(mo);
 const all=itemsOf(mo),vis=all.filter(x=>!s.hide[x.id]),hid=all.filter(x=>s.hide[x.id]);
 const days=(global.BelirliGunlerCatalog?.CATALOG||[]).filter(x=>x[0]===mo.ad);
 r.innerHTML=`<section class="vgf-page maf-page" data-maf-page>
<header class="vgf-head"><div><h2>Aylık Yönetim Akışı</h2><p class="ka-muted">Her ayın idari iş ve işlemleri. Tamamladığınız maddeyi işaretleyin; işaretler ve notlar hesabınıza kaydedilir; web ve Android’de aynı görünür.</p></div></header>
<div class="maf-months" role="tablist">${MONTHS.map(x=>`<button type="button" role="tab" class="ka-btn ${x.k===ay?'':'ka-btn--secondary'}" aria-selected="${x.k===ay}" data-maf-month="${x.k}">${x.ic} ${esc(x.ad)}</button>`).join('')}</div>
<article class="ka-card maf-progress"><div class="ka-card__body"><strong>${stt.done} / ${stt.total} madde tamamlandı</strong><div class="maf-bar" role="progressbar" aria-valuemin="0" aria-valuemax="${stt.total}" aria-valuenow="${stt.done}"><span style="width:${stt.total?Math.round(stt.done*100/stt.total):0}%"></span></div></div></article>
${days.length?`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>📅 Belirli gün ve haftalar</strong><ul class="maf-days">${days.map(x=>`<li>${esc(x[2])} — ${esc(x[1])}</li>`).join('')}</ul>${linkHtml('belirli')}</div></article>`:''}
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>${mo.ic} ${esc(mo.ad)} — yapılacaklar</strong><div class="maf-list">${vis.length?vis.map(itemHtml).join(''):'<p class="ka-muted">Bu ay için görünür madde yok.</p>'}</div>
<form class="maf-add" data-maf-add><input class="ka-input" data-maf-addtext placeholder="Bu listeye kendi işinizi ekleyin…" autocomplete="off"><button type="submit" class="ka-btn ka-btn--secondary">+ Ekle</button></form>
${hid.length?`<button type="button" class="ka-btn ka-btn--secondary maf-showhid" data-maf-showhid>${showHidden?'Gizlenenleri sakla':`Gizlenenleri göster (${hid.length})`}</button>${showHidden?`<div class="maf-list maf-hidden">${hid.map(x=>`<article class="maf-item is-hidden"><div class="maf-body"><p class="maf-text">${esc(x.t)}</p></div><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-maf-unhide="${esc(x.id)}">Geri al</button></article>`).join('')}</div>`:''}`:''}</div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>🏫 Okul türüne göre ek işler</strong><p class="ka-muted">Okulunuza uyan bölümleri açın; maddeler yukarıdaki aylık listeye eklenir.</p><div class="maf-secs">${SECTIONS.map(sc=>`<button type="button" class="ka-btn ${s.sec[sc.k]?'':'ka-btn--secondary'}" aria-pressed="${!!s.sec[sc.k]}" data-maf-sec="${sc.k}">${sc.ic} ${esc(sc.ad)}</button>`).join('')}</div>${SECTIONS.filter(sc=>s.sec[sc.k]).map(sc=>`<small class="ka-muted">${esc(sc.ad)}: ${esc(sc.not)}</small>`).join('')}</div></article>
<p class="ka-muted maf-foot">Madde metinleri genel çalışma önerisidir; güncel mevzuat, resmî yazı ve ilçe/il müdürlüğü talimatlarına göre doğrulayın.</p></section>`;
 bind(r);
 if(!catalogLoaded){catalogLoaded=true;global.AppLoader?.loadScript?.('js/modules/belirli-gunler-catalog.js').then(()=>{if(global.BelirliGunlerCatalog?.CATALOG&&root&&root.querySelector('[data-maf-page]'))render(root)}).catch(()=>{})}
 return true
}
function go(k){const x=L[k];if(!x)return;try{global.ShellUI?.routeModule?.(x[1],{bottom:'menu',page:x[2]||'',title:x[0]})}catch(e){global.toast?.('Sayfa açılamadı.')}}
function bind(r){
 const s=ensure(),q=(sel,fn)=>r.querySelectorAll(sel).forEach(fn),re=()=>{save();render(r)};
 q('[data-maf-month]',b=>b.addEventListener('click',()=>{ay=b.dataset.mafMonth;notOpen='';showHidden=false;render(r)}));
 q('[data-maf-done]',b=>b.addEventListener('click',()=>{const id=b.dataset.mafDone;if(s.done[id])delete s.done[id];else s.done[id]=1;re()}));
 q('[data-maf-star]',b=>b.addEventListener('click',()=>{const id=b.dataset.mafStar;if(s.star[id])delete s.star[id];else s.star[id]=1;re()}));
 q('[data-maf-hide]',b=>b.addEventListener('click',()=>{const id=b.dataset.mafHide,c=s.custom[ay]||[],i=c.findIndex(x=>x.id===id);if(i>=0){c.splice(i,1);delete s.done[id];delete s.star[id];delete s.note[id]}else s.hide[id]=1;re()}));
 q('[data-maf-unhide]',b=>b.addEventListener('click',()=>{delete s.hide[b.dataset.mafUnhide];re()}));
 q('[data-maf-showhid]',b=>b.addEventListener('click',()=>{showHidden=!showHidden;render(r)}));
 q('[data-maf-note]',b=>b.addEventListener('click',()=>{notOpen=b.dataset.mafNote;render(r);r.querySelector('[data-maf-notetext]')?.focus()}));
 q('[data-maf-notesave]',b=>b.addEventListener('click',()=>{const id=b.dataset.mafNotesave,v=String(r.querySelector('[data-maf-notetext]')?.value||'').trim();if(v)s.note[id]=v;else delete s.note[id];notOpen='';re()}));
 q('[data-maf-notecancel]',b=>b.addEventListener('click',()=>{notOpen='';render(r)}));
 q('[data-maf-go]',b=>b.addEventListener('click',()=>go(b.dataset.mafGo)));
 q('[data-maf-sec]',b=>b.addEventListener('click',()=>{const k=b.dataset.mafSec;if(s.sec[k])delete s.sec[k];else s.sec[k]=1;re()}));
 r.querySelector('[data-maf-add]')?.addEventListener('submit',e=>{e.preventDefault();const i=r.querySelector('[data-maf-addtext]'),v=String(i?.value||'').trim();if(!v)return;(s.custom[ay]||(s.custom[ay]=[])).push({id:`${ay}:own:${Date.now().toString(36)}`,t:v.slice(0,300)});re()})
}
function open(){st=load();ay=curKey();notOpen='';showHidden=false;const ok=render();pull();return ok}
global.MonthlyFlowModule={open,render,MONTHS,SECTIONS,LINKS:L,itemsOf,stats,reset:()=>{st=blank();return st}};
})(window);

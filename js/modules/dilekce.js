/* Koruk Asistan — Dilekçe Oluştur
 * Hitap edilen makamı ve konuyu yazın, hazır metinden başlayın, imza bilgilerini kontrol edin; A4 dilekçe olarak yazdırın / PDF alın.
 * Kayıtlar oy_dilekceKayitlari koleksiyonunda DeviceData/SyncEngine ile tutulur; öğretmen yalnız kendi kayıtlarını, yönetici hepsini listede görür.
 * T.C. kimlik numarası YALNIZ çıktıya yazılır, kayda (veritabanına) alınmaz.
 */
(function(global){
'use strict';
if(global.DilekceModule)return;
const T='dilekceKayitlari';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const device=()=>global.DeviceData;
const isManager=()=>user().admin===true||!!global.PermissionService?.isManager?.();
const FORM_KEYS=['baslik','makam','konu','metin','ad','unvan','tarih','adres','tel','hitapOzel','govdeOzel','kapanisOzel','bosluk','imzaBosluk','ekBosluk'];
const KAYIT_KEYS=[...FORM_KEYS];
const KAPANIS='Gereğini bilgilerinize arz ederim.';
const KATEGORILER=['İzin','Sağlık','Atama ve görevlendirme','Özlük','Belge talebi','Nöbet ve ders programı','Eğitim ve etkinlik','Şikâyet ve öneri'];
// Hazır metinler: "Okulunuz … öğretmeniyim." açılışından sonra gelir; …… işaretli yerler kullanıcı tarafından doldurulur.
const H=(k,ad,konu,metin)=>({k,ad,konu,metin});
const HAZIR=[
 H(0,'Yıllık izin','Yıllık izin talebi','…… / …… / …… – …… / …… / …… tarihleri arasında (…… gün) yıllık iznimi kullanmak istiyorum. İznim süresince ………………… ’in/’ın iletişim bilgileri ile ulaşılabilirim.'),
 H(0,'Mazeret izni','Mazeret izni talebi','………………… nedeniyle …… / …… / …… tarihinde (…… gün) mazeret izni kullanmak istiyorum. Gerekçemi gösteren belge ekte sunulmuştur.'),
 H(0,'Evlilik izni','Evlilik izni talebi','…… / …… / …… tarihinde evleniyorum. Bu nedenle …… / …… / …… – …… / …… / …… tarihleri arasında evlilik izni kullanmak istiyorum. Evlilik belgemi izin dönüşünde teslim edeceğim.'),
 H(0,'Doğum / yarım gün izin','Doğum nedeniyle izin talebi','…… / …… / …… tarihinde doğum yapacağım/yaptım. İlgili mevzuat çerçevesinde doğum iznimin başlatılmasını ve gerekli işlemlerin yapılmasını arz ederim.'),
 H(0,'Babalık izni','Babalık izni talebi','…… / …… / …… tarihinde çocuğum dünyaya gelmiştir. Doğum belgesi ekte sunulmuştur. İlgili mevzuat çerçevesinde babalık izni kullanmak istiyorum.'),
 H(0,'Ölüm nedeniyle izin','Yakın akraba vefatı nedeniyle izin talebi','………………… ’in vefatı nedeniyle …… / …… / …… tarihinde göreve gelemedim/gelemeyeceğim. Bu günler için mazeret izni kullanmak istiyorum. Vefat belgesi ekte sunulmuştur.'),
 H(0,'Ücretsiz izin','Aylıksız izin talebi','………………… nedeniyle …… / …… / …… – …… / …… / …… tarihleri arasında aylıksız izin kullanmak istiyorum. Gereğinin yapılmasını arz ederim.'),
 H(0,'Refakat izni','Hasta yakınına refakat izni talebi','………………… ’in …………………  hastanesinde tedavi gördüğü ve refakatçi gerektiği sağlık raporuyla belgelenmiştir. Bu nedenle …… / …… / …… – …… / …… / …… tarihleri arasında refakat izni kullanmak istiyorum.'),
 H(0,'Süt izni','Süt izni talebi','Çocuğum …… / …… / …… doğumludur. İlgili mevzuat çerçevesinde süt izni kullanmak istiyorum. Süt izni saatlerinin ders programıma uygun biçimde düzenlenmesini arz ederim.'),
 H(0,'Saatlik izin','Saatlik izin talebi','…… / …… / …… tarihinde saat …… ile …… arasında ………………… nedeniyle izin kullanmak istiyorum. Derslerimin ………………… tarafından yürütülmesi için gerekli düzenlemenin yapılmasını arz ederim.'),
 H(1,'Rapor sonrası göreve başlama','Göreve başlama bildirimi','…… / …… / …… – …… / …… / …… tarihleri arasında rapor kullandım. Rapor süremin bitmesi nedeniyle …… / …… / …… tarihinde görevime başladığımı bilgilerinize arz ederim. Rapor belgem ekte sunulmuştur.'),
 H(1,'Rapor süresi uzatma bildirimi','Raporumun uzatıldığına ilişkin bildirim','…… / …… / …… tarihinde aldığım rapor, doktor kontrolü sonrası …… gün daha uzatılmıştır. Yeni rapor belgem ekte sunulmuştur. Bilgilerinize arz ederim.'),
 H(1,'Hastane randevusu için izin','Sağlık kontrolü için izin talebi','…… / …… / …… tarihinde saat …… ’de ………………… hastanesinde randevum bulunmaktadır. Bu nedenle ilgili gün/saatlerde izin kullanmak istiyorum. Randevu belgem ekte sunulmuştur.'),
 H(1,'Sağlık nedeniyle yer değişikliği','Sağlık nedeniyle yer değiştirme talebi','………………… hastalığım nedeniyle (sağlık kurulu raporu ekte sunulmuştur) ………………… ’deki bir okula/kuruma yer değiştirmemin yapılması hususunda gereğini arz ederim.'),
 H(1,'Nöbet muafiyeti (sağlık)','Sağlık nedeniyle nöbet muafiyeti talebi','………………… rahatsızlığım nedeniyle (sağlık raporu ekte sunulmuştur) nöbet görevlerimi ………………… süreyle yerine getirmekte güçlük çekmekteyim. Nöbet görevimden muaf tutulmamı arz ederim.'),
 H(2,'İl içi yer değiştirme','İl içi isteğe bağlı yer değiştirme talebi','Halen ………………… ’de görev yapmaktayım. ………………… nedeniyle ………………… ’deki okullardan birine atamamın yapılmasını arz ederim.'),
 H(2,'İl dışı yer değiştirme','İl dışı yer değiştirme talebi','Halen ………………… ilinde görev yapmaktayım. ………………… nedeniyle ………………… iline atamamın yapılmasını arz ederim.'),
 H(2,'Eş durumu mazereti','Eş durumu nedeniyle yer değiştirme talebi','Eşim ………………… ’de ………………… olarak görev yapmaktadır. Eş durumu belgeleri ekte sunulmuştur. Eşimin görev yaptığı ………………… iline/ilçesine atamamın yapılmasını arz ederim.'),
 H(2,'Görevlendirme talebi','Görevlendirme talebi','………………… ’de ………………… konusunda görevlendirilmem hususunda gereğini arz ederim. Görevlendirmenin ders programımı aksatmayacak biçimde yürütüleceğini bildiririm.'),
 H(2,'Norm fazlası bildirimi','Norm fazlası durumuna ilişkin dilekçe','Okulumuzda ………………… branşında norm fazlası durumu oluşmuştur. Bu durumda ………………… tercih sırasına göre atanmak istiyorum. Gereğini arz ederim.'),
 H(2,'Başka okulda ek görev','Başka okulda ders görevlendirmesi talebi','………………… okulunda ders yükünü tamamlamak üzere haftada …… saat ders vermek istiyorum. Gerekli görevlendirmenin yapılmasını arz ederim.'),
 H(2,'Birim değişikliği talebi','Görev yeri/birim değişikliği talebi','Halen ………………… biriminde görev yapmaktayım. ………………… nedeniyle ………………… birimine/okula/kuruma geçmem hususunda gereğini arz ederim.'),
 H(3,'Hizmet belgesi talebi','Hizmet belgesi talebi','………………… amacıyla kullanılmak üzere hizmet belgemin düzenlenerek tarafıma verilmesini arz ederim.'),
 H(3,'Maaş / ek ders bordrosu','Maaş ve ek ders bordrosu bilgisi talebi','…… / …… / …… dönemine ait maaş ve ek ders bordrolarımın bir örneğinin tarafıma verilmesini arz ederim.'),
 H(3,'Kademe / derece ilerlemesi','Kademe ilerlemesi talebi','Hizmet sürem dikkate alınarak kademe/derece ilerlememin incelenmesini ve gerekli işlemin yapılmasını arz ederim.'),
 H(3,'Adres / ad değişikliği bildirimi','Adres bilgisi değişikliği bildirimi','…… / …… / …… tarihinde ………………… olarak değişen adres/iletişim bilgilerimin özlük dosyama işlenmesini arz ederim. Yeni adresim: …………………'),
 H(3,'Aile yardımı bildirimi','Aile yardımı ödeneği bildirimi','…… / …… / …… tarihinde ………………… (evlendim / çocuğum oldu / eşim işe başladı / eşim işten ayrıldı). Aile yardımı ödeneği bilgilerimin güncellenmesini arz ederim. İlgili belgeler ekte sunulmuştur.'),
 H(3,'Özlük dosyası belge teslimi','Özlük dosyasına belge teslimi','Aşağıda adı yazılı belgenin özlük dosyama konulmasını arz ederim.'),
 H(3,'Askerlik borçlanması','Askerlik borçlanması talebi','Askerlik hizmetimi ………………… tarihleri arasında yaptım. Askerlik borçlanmasına ilişkin işlemlerin yapılmasını ve gerekli belgelerin düzenlenmesini arz ederim.'),
 H(4,'Görev belgesi','Görev belgesi talebi','………………… ’e sunulmak üzere görev belgemin düzenlenerek tarafıma verilmesini arz ederim.'),
 H(4,'Çalışma belgesi (banka / kurum)','Çalışma belgesi talebi','………………… ’e ibraz edilmek üzere kurumunuzda çalıştığıma dair belgenin düzenlenerek tarafıma verilmesini arz ederim.'),
 H(4,'Belge örneği / onaylı suret','Belge örneği talebi','Okulunuzda bulunan ………………… belgesinin/evrakının okul müdürlüğünce onaylı bir örneğinin tarafıma verilmesini arz ederim.'),
 H(4,'Hizmet dökümü','Hizmet dökümü talebi','Bugüne kadar geçen hizmet sürelerimi gösteren hizmet dökümümün tarafıma verilmesini arz ederim.'),
 H(4,'Ders programı örneği','Ders programı belgesi talebi','………………… dönemi ders programımın onaylı bir örneğinin tarafıma verilmesini arz ederim.'),
 H(5,'Nöbet yeri değişikliği','Nöbet yeri değişikliği talebi','Halen ………………… günü ………………… nöbet yerinde görevliyim. ………………… nedeniyle nöbet yerimin ………………… olarak değiştirilmesini arz ederim.'),
 H(5,'Nöbet günü değişikliği','Nöbet günü değişikliği talebi','Haftalık nöbet günüm ………………… ’dir. ………………… nedeniyle nöbet günümün ………………… olarak değiştirilmesini, uygun değilse ………………… ile karşılıklı değişimine izin verilmesini arz ederim.'),
 H(5,'Nöbet yerine değişim','Nöbet değişimi bildirimi','…… / …… / …… tarihindeki nöbetimi ………………… ile karşılıklı değiştirdik. Bilgilerinize ve gereğini arz ederim.'),
 H(5,'Ders programı değişikliği','Ders programı değişikliği talebi','Haftalık ders programımda …………………  gününde oluşan boş saatlerin/yoğunluğun ………………… biçiminde düzenlenmesini arz ederim.'),
 H(5,'Ders yükü talebi','Ders yükü düzenleme talebi','Haftalık ders yüküm …… saattir. ………………… nedeniyle ders yükümün ………………… biçiminde düzenlenmesini arz ederim.'),
 H(5,'Zümre başkanlığı','Zümre başkanlığı görevi hakkında','Zümre başkanlığı görevime ilişkin ………………… hususunda bilgi verilmesini/görev dağılımının gözden geçirilmesini arz ederim.'),
 H(6,'Hizmet içi eğitime katılım','Hizmet içi eğitime katılma izni','…… / …… / …… – …… / …… / …… tarihleri arasında ………………… tarafından düzenlenen ………………… konulu eğitime katılmak istiyorum. Katılım belgesini eğitim sonunda teslim edeceğim. İzin verilmesini arz ederim.'),
 H(6,'Lisansüstü eğitim izni','Lisansüstü eğitim nedeniyle izin talebi','………………… Üniversitesi ………………… programına devam etmekteyim. Dersler için …… / …… / …… tarihlerinde izin kullanmak istiyorum. Ders programı belgesi ekte sunulmuştur.'),
 H(6,'Kurs / seminer katılımı','Kurs veya seminere katılma izni','…… / …… / …… tarihinde ………………… tarafından düzenlenecek ………………… seminerine/kursuna katılmak istiyorum. Katılım için izin verilmesini arz ederim.'),
 H(6,'Etkinlik düzenleme izni','Etkinlik düzenleme izni talebi','………………… sınıf/sınıflarıyla …… / …… / …… tarihinde ………………… etkinliğini düzenlemek istiyorum. Etkinliğin planı ekte sunulmuştur. Gereğini arz ederim.'),
 H(6,'Gezi / gözlem izni','Gezi ve gözlem düzenleme izni talebi','…… / …… / …… tarihinde ………………… sınıfı öğrencileriyle ………………… ’e gezi/gözlem düzenlemek istiyorum. Gerekli izinlerin verilmesini ve velilerden izin belgelerinin toplanmasına olur verilmesini arz ederim.'),
 H(6,'Proje / yarışma görevlendirme','Proje veya yarışma görevlendirmesi talebi','………………… projesi/yarışması kapsamında …… / …… / …… tarihlerinde görevlendirilmem hususunda gereğini arz ederim.'),
 H(7,'Şikâyet (genel)','Şikâyet dilekçesi','…… / …… / …… tarihinde ………………… yerinde ………………… olayı yaşanmıştır. Olay şu şekildedir: ………………… Konunun incelenerek gereğinin yapılmasını arz ederim.'),
 H(7,'Öneri','Öneri','………………… konusunda şu önerimi sunmak istiyorum: ………………… Önerimin değerlendirilmesini arz ederim.'),
 H(7,'Karara itiraz','Karara itiraz dilekçesi','…… / …… / …… tarih ve ………………… sayılı karar/işlem hakkında ………………… gerekçeleriyle itirazım bulunmaktadır. İşlemin yeniden değerlendirilmesini arz ederim.'),
 H(7,'Ek ders / nöbet ücreti itirazı','Ek ders ve nöbet ücretine itiraz','…… / …… dönemi ek ders / nöbet ücreti hesabında ………………… eksikliği/hatası bulunduğunu tespit ettim. İlgili belgeler ekte sunulmuştur. Hesabın yeniden kontrol edilmesini arz ederim.'),
 H(7,'Savunma süresi uzatma','Savunma süresinin uzatılması talebi','…… / …… / …… tarihli yazı ile benden savunma istenmiştir. ………………… nedeniyle savunmamı süresinde hazırlayamadım. Bana …… gün ek süre verilmesini arz ederim.'),
 H(7,'Teşekkür / bilgilendirme','Bilgilendirme','………………… konusunda bilgilerinize sunmak istediğim husus şudur: ………………… Bilgilerinize arz ederim.')
];
let state=null,tab='hazirla',histQuery='',tplCat=-1,tplQuery='';
function pad(n){return String(n).padStart(2,'0')}
function today(){const d=new Date();return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function trDate(v){if(!v)return'';const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?v:`${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`}
function teacher(){const id=user().bagliOgretmenId||user().ogretmenId||'';return rows('ogretmenler').find(x=>String(x.id)===String(id))||null}
function teacherName(t){return t?(`${t.ad||''} ${t.soyad||''}`.trim()||t.adSoyad||''):''}
function unvanOf(t){const b=String(t?.brans||'').trim();return b?(/öğretmen/i.test(b)?b:`${b} Öğretmeni`):'Öğretmen'}
function okulAdi(){const r=global.ReportEngine?.schoolInfo?.();return String(r?.okulAdi||'').trim()}
function blank(){const t=teacher();return{id:'',baslik:'',makam:okulAdi(),konu:'',metin:'',acilis:true,ad:teacherName(t),unvan:unvanOf(t),tarih:today(),adres:'',tel:'',tc:'',ekVar:'hayir',ekler:[''],hitapOzel:'',govdeOzel:'',kapanisOzel:'',bosluk:'5',imzaBosluk:'14',ekBosluk:'20'}}
function ensure(){if(!state)state=blank();return state}
// "Öğretmeni" → "Öğretmeniyim", "Müdür" → "Müdürüm": 1. tekil kişi eki (ünlü uyumu).
function ben(w){w=String(w||'').trim();if(!w)return'';const m=w.toLocaleLowerCase('tr').match(/[aeıioöuü](?=[^aeıioöuü]*$)/);if(!m)return w;const v={a:'ı','ı':'ı',e:'i',i:'i',o:'u',u:'u','ö':'ü','ü':'ü'}[m[0]],ends=/[aeıioöuüAEIİOÖUÜ]$/.test(w);return`${w}${ends?'y':''}${v}m`}
function acilisCumlesi(s){const u=String(s.unvan||'').trim();return`Okulunuz ${u?ben(u):'………………… öğretmeniyim'}.`}
function hitap(s){const m=String(s.makam||'').trim().toLocaleUpperCase('tr');if(!m)return'……………………… MÜDÜRLÜĞÜNE';return/(LÜĞÜNE|LİĞİNE|LIĞINA|LUĞUNA|MAKAMINA|KURULUNA|BAŞKANLIĞINA)$/.test(m)?m:`${m} MÜDÜRLÜĞÜNE`}
function records(){const uid=user().uid,all=rows(T),mine=isManager()?all:all.filter(x=>x.olusturanUid===uid);return mine.slice().sort((a,b)=>String(b.tarih||'').localeCompare(String(a.tarih||''))||String(b.eklenmeTarihi||'').localeCompare(String(a.eklenmeTarihi||'')))}
const norm=v=>String(v||'').toLocaleLowerCase('tr');
let remoteAt=0,zoomFull=false,resizeBound=false;
function refreshRemote(){const now=Date.now();if(!navigator.onLine||!global.SyncEngine?.sync||now-remoteAt<45000)return;remoteAt=now;Promise.resolve(global.SyncEngine.sync([T],{force:true,full:true})).catch(e=>console.warn('[Dilekçe eşitleme]',e?.message||e))}
async function prepare(){const SE=global.SyncEngine,col=global.COL?.dilekceKayitlari;if(!SE||!col)return;try{SE.register(T,col);await SE.localHydrate([T]);SE.schedule(100);refreshRemote()}catch(e){console.warn('[Dilekçe]',e?.message||e)}}
const cleanEkler=s=>(s.ekVar==='evet'?(s.ekler||[]):[]).map(x=>String(x||'').trim()).filter(Boolean);
async function save(root){
 const s=ensure(),ad=String(s.baslik||'').trim();
 if(!ad)return global.toast?.('Kayıt için bir ad yazın. Örnek: Yıllık izin – Temmuz');
 if(!String(s.metin||'').trim())return global.toast?.('Dilekçe metnini yazın.');
 const v={};KAYIT_KEYS.forEach(k=>v[k]=String(s[k]||'').trim());v.acilis=!!s.acilis;v.ekVar=s.ekVar==='evet'?'evet':'hayir';v.ekler=cleanEkler(s);
 try{
  if(s.id){await device().update(T,global.COL.dilekceKayitlari,s.id,v)}
  else{const row=await device().add(T,global.COL.dilekceKayitlari,{...v,olusturanUid:user().uid||'',olusturanAd:user().adSoyad||user().ad||user().kullaniciAdi||'',eklenmeTarihi:new Date().toISOString()});s.id=row?.id||(typeof row==='string'?row:'')||s.id}
  global.toast?.('Dilekçe kaydedildi.');render(root)
 }catch(e){global.toast?.('Kaydedilemedi: '+(e?.message||e))}
}
function fromRecord(r){const b=blank(),ek=Array.isArray(r.ekler)?r.ekler.slice():[];return{...b,...Object.fromEntries(FORM_KEYS.map(k=>[k,r[k]||b[k]||''])),acilis:r.acilis!==false,ekVar:r.ekVar==='evet'||ek.length?'evet':'hayir',ekler:ek.length?ek:[''],tc:'',id:r.id}}
function loadRecord(r,root){state=fromRecord(r);tab='hazirla';render(root);root?.querySelector('[data-dlk-page]')?.scrollIntoView?.({block:'start'})}
function field(label,html,cls=''){return`<label class="ka-field ${cls}"><span class="ka-field__label">${esc(label)}</span>${html}</label>`}
function input(key,type='text',ph=''){return`<input class="ka-input" type="${type}" value="${esc(ensure()[key])}" placeholder="${esc(ph)}" data-dlk="${key}" autocomplete="off">`}
function historyHtml(){
 const q=norm(histQuery.trim()),all=records(),list=all.filter(r=>!q||norm([r.baslik,r.konu,r.metin,r.olusturanAd].join(' ')).includes(q));
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><div class="vgf-hist-head"><strong>💾 Kayıtlı dilekçelerim <span class="ka-badge">${all.length}</span></strong><input class="ka-input" type="search" placeholder="Ad veya konu ara" value="${esc(histQuery)}" data-dlk-search></div>
 ${list.length?`<div class="vgf-hist">${list.map(r=>`<div class="vgf-rec ${ensure().id===r.id?'is-open':''}"><button class="vgf-rec__main" type="button" data-dlk-open="${esc(r.id)}"><strong>${esc(r.baslik||'Dilekçe')}</strong><small>${esc(trDate(r.tarih))}${r.konu?' · '+esc(r.konu):''}${isManager()&&r.olusturanAd?' · '+esc(r.olusturanAd):''}</small><small class="vgf-rec__why">${esc(String(r.metin||'').replace(/\s+/g,' '))}</small></button><span class="vgf-rec__acts"><button class="ka-btn ka-btn--secondary" type="button" data-dlk-rprint="${esc(r.id)}" aria-label="Yazdır">🖨</button><button class="ka-btn ka-btn--secondary" type="button" data-dlk-del="${esc(r.id)}" aria-label="Sil">🗑</button></span></div>`).join('')}</div>`:`<p class="ka-muted">${all.length?'Aramaya uyan dilekçe yok.':'Henüz kayıtlı dilekçeniz yok. Yukarıya bir ad yazıp Kaydet’e basın; sonra istediğiniz zaman bu listeden açabilirsiniz.'}</p>`}</div></article>`
}
function tabsHtml(){return`<div class="ttn-tabs" role="tablist">${[['hazirla','✍️ Dilekçe Hazırla'],['metinler','📚 Hazır Metinler']].map(([k,l])=>`<button type="button" role="tab" class="ka-btn ${tab===k?'':'ka-btn--secondary'}" aria-selected="${tab===k}" data-dlk-tab="${k}">${l}</button>`).join('')}</div>`}
function ekHtml(s){
 const evet=s.ekVar==='evet';
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>📎 Ek belge</strong><label class="ka-field"><span class="ka-field__label">Dilekçeye ek belge koyacak mısınız?</span><select class="ka-input" data-dlk-ekvar><option value="hayir" ${evet?'':'selected'}>Hayır, ek yok</option><option value="evet" ${evet?'selected':''}>Evet, ek var</option></select></label>
 ${evet?`<div class="ttn-imzalar">${(s.ekler||['']).map((x,i)=>`<div class="dlk-ek"><input class="ka-input" type="text" value="${esc(x)}" placeholder="${i+1}- Belge adı" data-dlk-ek="${i}" autocomplete="off"><button class="ka-btn ka-btn--secondary ka-btn--icon" type="button" data-dlk-ekrm="${i}" aria-label="Satırı kaldır">✕</button></div>`).join('')}</div><button class="ka-btn ka-btn--secondary" type="button" data-dlk-ekadd>+ Ek satırı</button>`:''}</div></article>`
}
function viewHazirla(s){
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>📄 Dilekçe bilgileri</strong>
  ${field('Hitap edilen makam',input('makam','text','Örn: Koruk Ortaokulu'))}<p class="ka-muted">Belgeye “… MÜDÜRLÜĞÜNE” olarak basılır. Başka makama yazıyorsanız tam yazın (örn. “… İlçe Milli Eğitim Müdürlüğüne”).</p>
  ${field('Konu (isteğe bağlı)',input('konu','text','Örn: Yıllık izin talebi'))}
  <button class="dlk-promo" type="button" data-dlk-tab="metinler"><span aria-hidden="true">📚</span><span><strong>Sıfırdan yazmayın — ${HAZIR.length} hazır dilekçe metni var.</strong><small>İzin, sağlık, atama, özlük, belge talebi, nöbet, eğitim ve şikâyet başlıklarında. Birine tıklayın, metin buraya yazılsın.</small></span><span aria-hidden="true">→</span></button>
  <label class="ka-field"><span class="ka-field__label">Dilekçe metni</span><textarea class="ka-input" rows="8" placeholder="“Okulunuz … öğretmeniyim.” ifadesinden sonrası buraya yazılır." data-dlk="metin">${esc(s.metin)}</textarea></label>
  <label class="dlk-check"><input type="checkbox" data-dlk-acilis ${s.acilis?'checked':''}><span>Metin “${esc(acilisCumlesi(s))}” ile başlasın</span></label><p class="ka-muted">Açılış cümlesi otomatik eklenir; kaldırmak için işareti kaldırın. Sonunda “${KAPANIS}” her hâlde eklenir.</p></div></article>
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>✒️ İmza bilgileri</strong><div class="ka-grid">${field('Adı soyadı',input('ad'))}${field('Unvan / görev',input('unvan'))}${field('Tarih',input('tarih','date'))}${field('Adres',input('adres','text','Ev/iş adresiniz'))}${field('Telefon',input('tel','tel','05.. ... .. ..'))}${field('T.C. kimlik no (yalnız çıktıya yazılır, kaydedilmez)',input('tc','text','Siz yazın'))}</div></div></article>
 ${ekHtml(s)}
 <article class="ka-card"><div class="ka-card__body ka-stack"><strong>💾 Kayıt adı</strong><div class="ttn-save">${input('baslik','text','Örn: Yıllık izin – Temmuz')}<button class="ka-btn" type="button" data-dlk-save>${s.id?'Değişiklikleri kaydet':'Kaydet'}</button></div></div></article>
 <footer class="vgf-actions"><button class="ka-btn ka-btn--secondary" type="button" data-dlk-reset>${s.id?'Yeni dilekçe':'Temizle'}</button><button class="ka-btn" type="button" data-dlk-print>🖨 Yazdır / PDF</button></footer>
 <article class="ka-card"><div class="ka-card__body ka-stack"><div class="ttn-prevhead"><strong>Önizleme</strong><button class="ka-btn ka-btn--secondary" type="button" data-dlk-zoom>${zoomFull?'Sayfaya sığdır':'Yakınlaştır'}</button></div><p class="ka-muted">Yazdırma önizlemesi gibi tam sayfa görünür. Metne dokunup doğrudan değiştirebilirsiniz.</p><div class="ttn-gaps">${gapCtl('bosluk','Dilekçe metni ile kapanış arası',s)}${gapCtl('imzaBosluk','Kapanış ile adres/imza arası',s)}${gapCtl('ekBosluk','Adres/imza ile ekler arası',s)}</div><div class="ttn-preview" data-dlk-preview><div class="ttn-sheetwrap"><div class="ttn-sheet ka-report"><div class="dlk-print">${paper(s,true)}</div></div></div></div></div></article>
 ${historyHtml()}`
}
function viewMetinler(){
 const q=norm(tplQuery.trim()),list=HAZIR.map((h,i)=>({h,i})).filter(({h})=>(tplCat<0||h.k===tplCat)&&(!q||norm(h.ad+' '+h.konu+' '+h.metin).includes(q)));
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>Hazır dilekçe metinleri <span class="ka-badge">${list.length}</span></strong><p class="ka-muted">Bir metin seçtiğinizde forma gelir. <b>…………</b> işaretli yerleri doldurun, olmayan cümleleri silin.</p>
 <input class="ka-input" type="search" placeholder="Metin ara (örn. nöbet, rapor, izin)" value="${esc(tplQuery)}" data-dlk-tsearch>
 <div class="dlk-chips"><button type="button" class="ka-btn ${tplCat<0?'':'ka-btn--secondary'}" data-dlk-cat="-1">Tümü</button>${KATEGORILER.map((c,i)=>`<button type="button" class="ka-btn ${tplCat===i?'':'ka-btn--secondary'}" data-dlk-cat="${i}">${esc(c)}</button>`).join('')}</div>
 <div class="ttn-list">${list.length?list.map(({h,i})=>`<div class="ttn-tpl"><div><strong>${esc(h.ad)}</strong><small>${esc(KATEGORILER[h.k])} · ${esc(h.metin.replace(/\s+/g,' ').slice(0,90))}…</small></div><button class="ka-btn" type="button" data-dlk-tpl="${i}">Kullan</button></div>`).join(''):'<p class="ka-muted">Aramaya uyan metin yok.</p>'}</div></div></article>`
}
function render(root=document.getElementById('v2ModuleRoot')){
 if(!root)return false;const s=ensure();
 root.innerHTML=`<section class="vgf-page ttn-page dlk-page" data-dlk-page><header class="vgf-head"><div><h2>Dilekçe Oluştur</h2>${s.id?'<span class="ka-badge">Kayıtlı dilekçe düzenleniyor</span>':''}<p class="ka-muted">Okul adı, adınız ve unvanınız hesabınızdan gelir. Metni yazın ya da <b>Hazır Metinler</b>’den seçin; önizleme anında güncellenir.</p></div></header>${tabsHtml()}${tab==='metinler'?viewMetinler():viewHazirla(s)}</section>`;
 bind(root);fit(root);if(!resizeBound){resizeBound=true;global.addEventListener('resize',()=>fit(document.querySelector('[data-dlk-page]')))}
 return true
}
const GAP_DEF={bosluk:5,imzaBosluk:14,ekBosluk:20};
function gapOf(s,k){const n=parseFloat(s[k]);return Number.isFinite(n)?Math.max(0,Math.min(150,n)):GAP_DEF[k]}
function gapCtl(k,label,s){return`<div class="ttn-gap"><span>${label}</span><div><button class="ka-btn ka-btn--secondary" type="button" data-dlk-gap="${k}" data-d="-4" aria-label="${label} azalt">−</button><b data-dlk-gapv="${k}">${gapOf(s,k)} mm</b><button class="ka-btn ka-btn--secondary" type="button" data-dlk-gap="${k}" data-d="4" aria-label="${label} artır">+</button></div></div>`}
function fit(root){
 const box=root?.querySelector('[data-dlk-preview]'),wrap=box?.querySelector('.ttn-sheetwrap'),sh=wrap?.querySelector('.ttn-sheet');if(!sh)return;
 sh.style.transform='';const w=sh.offsetWidth,k=zoomFull?1:Math.min(1,(box.clientWidth-2)/w);
 sh.style.transform=k<1?`scale(${k})`:'';wrap.style.width=`${w*k}px`;wrap.style.height=`${sh.offsetHeight*k}px`
}
function updatePreview(root){const box=root?.querySelector('[data-dlk-preview] .dlk-print');if(box)box.innerHTML=paper(ensure(),true);fit(root)}
const NOKTALI=v=>/^[.…\s]*$/.test(v);
function sheetEdit(root,el){
 const s=ensure(),k=el.dataset.dlkEd,v=String(el.innerText||'').replace(/\u00a0/g,' ').replace(/\n+$/,''),sync=(key,val)=>{s[key]=val;const i=root.querySelector(`[data-dlk="${key}"]`);if(i)i.value=val},val=NOKTALI(v)?'':v.trim();
 if(k==='hitap')s.hitapOzel=v.trim()===hitap(s)?'':v;
 else if(k==='govde')s.govdeOzel=v;
 else if(k==='kapanis')s.kapanisOzel=v.trim()===KAPANIS?'':v;
 else if(k==='konu')sync('konu',val);
 else if(['adres','tel','ad','unvan','tc'].includes(k))sync(k,val);
 else if(k.startsWith('ek:')){const n=Number(k.slice(3));if(s.ekler[n]!==undefined){s.ekler[n]=val;const i=root.querySelector(`[data-dlk-ek="${n}"]`);if(i)i.value=val}}
 fit(root)
}
function bind(root){
 const pv=root.querySelector('[data-dlk-preview]');
 if(pv){pv.addEventListener('focusin',e=>{const el=e.target.closest?.('[data-dlk-ed]');if(el&&NOKTALI(String(el.innerText||''))){const r=document.createRange();r.selectNodeContents(el);const sel=global.getSelection();sel.removeAllRanges();sel.addRange(r)}});pv.addEventListener('input',e=>{const el=e.target.closest?.('[data-dlk-ed]');if(el)sheetEdit(root,el)});pv.addEventListener('paste',e=>{const el=e.target.closest?.('[data-dlk-ed]');if(!el)return;e.preventDefault();const t=(e.clipboardData||global.clipboardData)?.getData('text')||'';document.execCommand('insertText',false,t)})}
 root.querySelectorAll('[data-dlk-gap]').forEach(b=>b.addEventListener('click',()=>{const st=ensure(),k=b.dataset.dlkGap;st[k]=String(Math.max(0,Math.min(150,gapOf(st,k)+Number(b.dataset.d))));const v=root.querySelector(`[data-dlk-gapv="${k}"]`);if(v)v.textContent=`${st[k]} mm`;updatePreview(root)}))
 root.querySelector('[data-dlk-zoom]')?.addEventListener('click',()=>{zoomFull=!zoomFull;const b=root.querySelector('[data-dlk-zoom]');if(b)b.textContent=zoomFull?'Sayfaya sığdır':'Yakınlaştır';fit(root)})
 root.querySelectorAll('[data-dlk]').forEach(el=>el.addEventListener('input',()=>{const st=ensure();st[el.dataset.dlk]=el.value;if(['metin','unvan'].includes(el.dataset.dlk))st.govdeOzel='';if(el.dataset.dlk==='makam')st.hitapOzel='';if(el.dataset.dlk!=='baslik')updatePreview(root)}));
 root.querySelector('[data-dlk-acilis]')?.addEventListener('change',e=>{ensure().acilis=e.target.checked;ensure().govdeOzel='';updatePreview(root)});
 root.querySelectorAll('[data-dlk-tab]').forEach(b=>b.addEventListener('click',()=>{tab=b.dataset.dlkTab;render(root)}));
 root.querySelectorAll('[data-dlk-cat]').forEach(b=>b.addEventListener('click',()=>{tplCat=Number(b.dataset.dlkCat);render(root)}));
 root.querySelector('[data-dlk-tsearch]')?.addEventListener('input',e=>{tplQuery=e.target.value;const pos=e.target.selectionStart;render(root);const n=root.querySelector('[data-dlk-tsearch]');n?.focus();n?.setSelectionRange?.(pos,pos)});
 root.querySelectorAll('[data-dlk-tpl]').forEach(b=>b.addEventListener('click',()=>{const h=HAZIR[Number(b.dataset.dlkTpl)],s=ensure();if(!h)return;if(String(s.metin||'').trim()&&!confirm('Dilekçe metni bu hazır metinle değiştirilsin mi?'))return;s.metin=h.metin;s.govdeOzel='';if(!String(s.konu||'').trim())s.konu=h.konu;if(!String(s.baslik||'').trim())s.baslik=h.ad;tab='hazirla';render(root);global.toast?.('Hazır metin forma eklendi.')}));
 root.querySelector('[data-dlk-ekvar]')?.addEventListener('change',e=>{const s=ensure();s.ekVar=e.target.value;if(!(s.ekler||[]).length)s.ekler=[''];render(root)});
 root.querySelectorAll('[data-dlk-ek]').forEach(el=>el.addEventListener('input',()=>{ensure().ekler[Number(el.dataset.dlkEk)]=el.value;updatePreview(root)}));
 root.querySelector('[data-dlk-ekadd]')?.addEventListener('click',()=>{const s=ensure();if(s.ekler.length<12)s.ekler.push('');render(root)});
 root.querySelectorAll('[data-dlk-ekrm]').forEach(b=>b.addEventListener('click',()=>{const s=ensure();s.ekler.splice(Number(b.dataset.dlkEkrm),1);if(!s.ekler.length)s.ekler=[''];render(root)}));
 root.querySelector('[data-dlk-save]')?.addEventListener('click',()=>save(root));
 root.querySelector('[data-dlk-print]')?.addEventListener('click',()=>print());
 root.querySelector('[data-dlk-reset]')?.addEventListener('click',()=>{state=blank();render(root)});
 root.querySelector('[data-dlk-search]')?.addEventListener('input',e=>{histQuery=e.target.value;const pos=e.target.selectionStart;render(root);const n=root.querySelector('[data-dlk-search]');n?.focus();n?.setSelectionRange?.(pos,pos)});
 root.querySelectorAll('[data-dlk-open]').forEach(b=>b.addEventListener('click',()=>{const r=rows(T).find(x=>x.id===b.dataset.dlkOpen);if(r)loadRecord(r,root)}));
 root.querySelectorAll('[data-dlk-rprint]').forEach(b=>b.addEventListener('click',()=>{const r=rows(T).find(x=>x.id===b.dataset.dlkRprint);if(r)print(fromRecord(r))}));
 root.querySelectorAll('[data-dlk-del]').forEach(b=>b.addEventListener('click',async()=>{const r=rows(T).find(x=>x.id===b.dataset.dlkDel);if(!r||!confirm(`“${r.baslik||'Dilekçe'}” silinsin mi?`))return;try{await device().remove(T,global.COL.dilekceKayitlari,r.id);if(state?.id===r.id)state=blank();global.toast?.('Dilekçe silindi.');render(root)}catch(e){global.toast?.('Silinemedi: '+(e?.message||e))}}))
}
const DOT='……………………………';
function paper(s,edit){
 const govde=s.govdeOzel!==undefined&&String(s.govdeOzel||'').trim()?String(s.govdeOzel).trim():[s.acilis?acilisCumlesi(s):'',String(s.metin||'').trim()].filter(Boolean).join(' ');
 const ed=k=>edit?` contenteditable="true" spellcheck="false" data-dlk-ed="${k}"`:'';
 const ekler=[];if(s.ekVar==='evet')(s.ekler||[]).forEach((x,i)=>{if(String(x||'').trim())ekler.push({t:x,i})});
 const nk=(v,d,k)=>esc(v)||(edit?'':d);
 return`<article class="dlk-paper"><h1 class="dlk-hitap"${ed('hitap')}>${esc(s.hitapOzel||hitap(s))}</h1>${String(s.konu||'').trim()?`<p class="dlk-konu"><b>Konu:</b> <span${ed('konu')}>${esc(s.konu)}</span></p>`:''}<div class="dlk-body${!govde&&edit?' dlk-dots':''}" style="margin-bottom:${gapOf(s,'bosluk')}mm"${ed('govde')}>${govde?esc(govde):(edit?DOT+DOT:`<span class="dlk-dots">${DOT}${DOT}</span>`)}</div><p class="dlk-kapanis"${ed('kapanis')}>${esc(s.kapanisOzel||KAPANIS)}</p>
 <div class="dlk-foot" style="margin-top:${gapOf(s,'imzaBosluk')}mm"><div class="dlk-adres"><b>Adres:</b><span${ed('adres')}>${esc(s.adres)||DOT}</span><span><b>Tel:</b> <span${ed('tel')}>${esc(s.tel)||'…………………'}</span></span><span><b>T.C.:</b> <span${ed('tc')}>${esc(s.tc)||'…………………'}</span></span></div><div class="dlk-imza"><span>${esc(trDate(s.tarih))||'…/…/……'}</span><b class="dlk-imza-l">İmza</b><span${ed('ad')}>${esc(s.ad)||DOT}</span><span${ed('unvan')}>${esc(s.unvan)}</span></div></div>
 ${ekler.length?`<div class="dlk-ekler" style="margin-top:${gapOf(s,'ekBosluk')}mm"><b>EKLER:</b><ol>${ekler.map(x=>`<li${ed('ek:'+x.i)}>${esc(x.t)}</li>`).join('')}</ol></div>`:''}</article>`
}
function reportBody(data){return`<div class="dlk-print">${paper(data||ensure())}</div>`}
function print(data){
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 global.ReportEngine.printReport('Dilekçe',reportBody(data||ensure()),{fileName:'Dilekçe',yon:'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' '});return true
}
function open(){state=blank();tab='hazirla';histQuery='';tplCat=-1;tplQuery='';const ok=render();prepare().then(()=>{if(document.querySelector('[data-dlk-page]')&&tab==='hazirla'){const a=document.activeElement;if(!a||!a.closest?.('[data-dlk-page]')||a===document.body)render()}});return ok}
global.DilekceModule={open,render,print,reportBody,records,paper,hitap,ben,acilisCumlesi,HAZIR,KATEGORILER,reset:()=>{state=blank();tab='hazirla';histQuery='';tplCat=-1;tplQuery='';return state}};
})(window);

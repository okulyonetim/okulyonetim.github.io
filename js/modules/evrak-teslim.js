/* Koruk Asistan — Öğretmenden İstenecekler · Evrak Teslim İmza Çizelgesi
 * Dönem seçilir, istenecek evraklar işaretlenir, her evrak için kimden isteneceği seçilir; çıktı A4 yatay imza çizelgesidir.
 * Kişisel ayarlar TeacherListBuilder ile aynı yerel-öncelikli koleksiyonda (personelOgretmenListeleri) tutulur.
 * Veri akışı: DeviceData -> IndexedDB/AppStore -> SyncEngine -> Firestore.
 */
(function(global){
'use strict';
if(global.EvrakTeslimPage)return;

const TYPE='personelOgretmenListeleri';
const DONEMLER=[['basi','Sene Başı'],['donem1','1. Dönem Sonu'],['sonu','Sene Sonu']];
const KIMDEN=[['herkes','Herkes'],['rehber','Sınıf rehber öğretmenleri'],['zumre','Zümre başkanları'],['kulup','Kulüp danışman öğretmenler'],['belirli','Belirli gün/hafta görevlileri']];
const GRUPLAR={idari:'Genel (İdari) Evraklar',rehberlik:'Rehberlik Dosyası',kulup:'Kulüp Dosyası',ozel:'Eklediğiniz Maddeler'};
/* Her dönemin evrak listesi ayrıdır. Satır: [grup, ad (çizelge sütunu), yazı metni (tebliğ yazısındaki madde), varsayılan kimden]; sıra, çıktıdaki sütun sırasıdır. */
const BASI=[
 ['idari','Öğretmen Dosyası Kapağı'],['idari','Atatürk Portresi'],['idari','Türk Bayrağı'],['idari','İstiklal Marşı'],['idari','Gençliğe Hitabe'],
 ['idari','Öğretmen Öz Geçmiş (CV / Tanıtım Formu)'],['idari','Yıllık İş Günü / Eğitim-Öğretim İş Takvimi'],['idari','Ders Giriş-Çıkış Saatleri'],
 ['idari','Ünitelendirilmiş Yıllık Plan'],['idari','Maarif Aylık Raporları (Öğrenme Çıktıları)'],['idari','Günlük Planlar'],
 ['idari','Dersine Girilen Sınıfların Güncel Öğrenci Listesi (e-Okul)'],
 ['idari','Şube Öğretmenler Kurulu Toplantı Tutanakları',null,'rehber'],['idari','Zümre Öğretmenler Kurulu Toplantı Tutanakları (1. ve 2. Dönem)',null,'zumre'],
 ['idari','İl / İlçe Zümre Toplantı Tutanakları',null,'zumre'],['idari','Veli Toplantısı Evrakları'],['idari','Sınav Analizleri'],
 ['idari','Kazanım Değerlendirme Ölçekleri'],['idari','Proje / Performans / Ders İçi Katılım Değerlendirme Ölçeği'],['idari','Proje Ödevleri Dağıtım Listesi'],
 ['idari','Gezi İzin Belgesi ve Gezi Planı'],['idari','Sınıf Oturma Planı ve Ödev Çizelgesi'],['idari','Sosyal Kulüp Dosyası (danışman öğretmenler)',null,'kulup'],
 ['idari','Sınıf Rehber Öğretmeni Dosyası',null,'rehber'],['idari','Ders Dışı Egzersiz ve Sosyal Etkinlik Belgeleri'],['idari','Öğrenci Ürün Dosyası Örnekleri'],
 ['idari','Öğrenci Performans Çizelgesi'],['idari','BEP’li Öğrenci Dosyası (varsa)'],['idari','Yazılı Kâğıtları ve Puanlanmış Cevap Anahtarı'],
 ['idari','Ders Kesim Raporu'],['idari','Aday Öğretmen Çalışmaları / Performans Değerlendirme Formları'],
 ['idari','Belirli Gün ve Haftalar Çizelgesi / Program Akışları',null,'belirli'],
 ['rehberlik','Sınıf Öğrenci Listesi'],['rehberlik','Sınıf Oturma Planı'],['rehberlik','Rehberlik Raporları'],['rehberlik','Devamsızlık Çizelgesi / Mektupları'],
 ['rehberlik','Veli İletişim Bilgileri'],['rehberlik','Veli Görüşme Kayıtları'],['rehberlik','Veli Toplantı Tutanakları'],['rehberlik','Veli Formu'],
 ['rehberlik','Öğrenci Tanıma ve Gözlem Formları'],['rehberlik','Rehberlik Servisine Öğrenci Yönlendirme Formu'],['rehberlik','Uygulanan Test-Anket-Formlar (varsa)'],
 ['rehberlik','Sosyal Medya Veli İzin Belgesi'],['rehberlik','Sınıf Kuralları'],['rehberlik','Sınıf Risk Haritası'],['rehberlik','Sınıf Rehber Öğretmeninin Görevleri'],
 ['rehberlik','Sınıf Başkanı Seçimi ve Görevleri'],['rehberlik','Sınıf Nöbetçi Öğrenci Görevleri / Aylık Nöbetçi Öğrenci Listesi'],['rehberlik','Sınıf Kitaplık Listesi'],
 ['rehberlik','Sınıf Rehberlik Programı Kazanımları'],['rehberlik','Yıllık Rehberlik Çalışma Planı'],
 ['kulup','Kulüp Öğrenci Listesi (Eğitici Kulüplere Seçilenler)'],['kulup','Kulüp Tüzüğü / Yönetmeliği'],['kulup','Kulüp Yıllık Çalışma Planı'],
 ['kulup','Kulüp Toplum Hizmeti Çalışma Planı'],['kulup','Kulüp Toplantı Tutanakları / Karar Defteri'],['kulup','Kulüp Aylık Çalışma Raporları'],
 ['kulup','Kulüp Yıl Sonu Faaliyet Raporu'],['kulup','Kulüp Bütçesi Evrakları'],['kulup','Kulüp Görev Dağılım Çizelgesi'],['kulup','Pano Çalışmaları Dosyası']
];
const DONEM1=[
 ["idari","Her dersten iki yazılı notunu e-Okul'a işle","Her dersten iki yazılı sınav notunun e-Okul'a işlenmesi"],
 ["idari","Sınav analizlerini hazırla ve teslim et","Sınav analizlerinin hazırlanarak teslim edilmesi"],
 ["idari","Ders ve etkinliklere katılım puanlarını ver","Ders ve etkinliklere katılım puanlarının verilmesi"],
 ["idari","Kazanım değerlendirme ölçeklerini dosyana koy","Kazanım değerlendirme ölçeklerinin öğretmen dosyasına konulması"],
 ["idari","Puanların e-Okul'daki karşılığını kontrol et","Puanların e-Okul'daki karşılığının kontrol edilmesi"],
 ["rehberlik","Not girişinin özel kurallarını uygula","Not girişine ilişkin özel kurallara uyulması"],
 ["idari","Mazeretli öğrencilerin sınavlarını tamamla","Mazeretli öğrencilerin sınavlarının tamamlanması"],
 ["idari","Maarif aylık raporlarını tamamla ve teslim et","Maarif aylık raporlarının tamamlanarak teslim edilmesi"],
 ["idari","Yıllık planın birinci dönem işlenişini kontrol et","Yıllık planın birinci dönem işlenişinin kontrol edilmesi"],
 ["rehberlik","Karne bilgileri — öğretmen görüşünü doldur","Karne bilgileri öğretmen görüşü bölümünün doldurulması"],
 ["idari","Gelişim düzeyleri ve sosyal-duygusal öğrenme becerilerini gir","Gelişim düzeyleri ile sosyal-duygusal öğrenme becerilerinin girilmesi"],
 ["rehberlik","Davranış notlarını gir","Davranış notlarının girilmesi"],
 ["idari","Sınıf kitaplığını oluştur, okunan kitapları gir","Sınıf kitaplığının oluşturulması ve okunan kitapların girilmesi"],
 ["kulup","Sosyal etkinlik girişlerini tamamla","Sosyal etkinlik girişlerinin tamamlanması"],
 ["idari","Öğretmen puan çizelgesini kontrol et ve imzala","Öğretmen puan çizelgesinin kontrol edilerek imzalanması"],
 ["idari","Ders defterini ve sınıf defterini kapat","Ders defteri ile sınıf defterinin kapatılması"],
 ["idari","Devamsızlık girişlerini kapat","Devamsızlık girişlerinin tamamlanarak kapatılması"],
 ["idari","Nöbet defterini kontrol et","Nöbet defterinin kontrol edilmesi"],
 ["idari","Yazılı kâğıtlarını teslim tutanağıyla teslim et","Yazılı sınav kâğıtlarının teslim tutanağıyla teslim edilmesi"],
 ["rehberlik","Takdir / teşekkür ve onur belgesi durumunu kontrol et","Takdir, teşekkür ve onur belgesi durumlarının kontrol edilmesi"],
 ["idari","Dönem sonu şube öğretmenler kurulu (ŞÖK) toplantısına katıl","Dönem sonu şube öğretmenler kurulu toplantısına katılım sağlanması","rehber"],
 ["idari","Dönem sonu zümre toplantısına katıl","Dönem sonu zümre öğretmenler kurulu toplantısına katılım sağlanması","zumre"],
 ["rehberlik","Dönem sonu veli toplantısını yap","Dönem sonu veli toplantısının yapılması"],
 ["rehberlik","Sınıf rehberlik dönem sonu faaliyet raporunu teslim et","Sınıf rehberlik dönem sonu faaliyet raporunun teslim edilmesi"],
 ["kulup","Kulüp dönem sonu faaliyet ve aylık raporlarını teslim et","Öğrenci kulübü dönem sonu faaliyet raporu ile aylık raporların teslim edilmesi"],
 ["idari","Ders dışı egzersiz çalışmalarının dönem kaydını tamamla","Ders dışı egzersiz çalışmalarına ait dönem kayıtlarının tamamlanması"],
 ["idari","Dönem içinde yapılan gezilerin evrakını dosyala","Dönem içinde yapılan gezilere ait evrakın dosyalanması"],
 ["idari","Kurul, komisyon ve belirli gün-hafta işlerini tamamla","Kurul, komisyon ve belirli gün ve haftalara ilişkin görevlerin tamamlanması","belirli"],
 ["idari","Anasınıfı gelişim / beceri edinme formlarını doldur","Anasınıfı gelişim ve beceri edinme formlarının doldurulması"],
 ["idari","İkinci dönem için oturma planını ve ödev çizelgesini yenile","İkinci dönem için oturma planı ile ödev çizelgesinin yenilenmesi"],
 ["idari","Gerekirse tutanak tut, dilekçe yaz","Gerekli durumlarda tutanak tutulması ve dilekçe yazılması"],
 ["idari","Yarıyıl tatili izin işlemlerini kontrol et","Yarıyıl tatiline ilişkin izin işlemlerinin kontrol edilmesi"],
 ["idari","Öğretmen dosyasını idareye teslim et","Öğretmen dosyasının okul idaresine teslim edilmesi"]
];
const SONU=[
 ["idari","İkinci dönem yazılı ve katılım notlarını tamamla","İkinci dönem yazılı ve katılım notlarının tamamlanması"],
 ["idari","Sınav analizlerini hazırla ve teslim et","Sınav analizlerinin hazırlanarak teslim edilmesi"],
 ["idari","Proje notunu gir","Proje notunun girilmesi"],
 ["idari","Proje ve katılım değerlendirme ölçeklerini idareye teslim et","Proje ve katılım değerlendirme ölçeklerinin idareye teslim edilmesi"],
 ["idari","Maarif aylık raporlarının yıl sonu dosyasını tamamla","Maarif aylık raporlarının yıl sonu dosyasının tamamlanması"],
 ["rehberlik","Karne bilgileri — öğretmen görüşünü doldur","Karne bilgileri öğretmen görüşü bölümünün doldurulması"],
 ["rehberlik","Yıl sonu davranış notlarını gir","Yıl sonu davranış notlarının girilmesi"],
 ["idari","Gelişim düzeyi ile sosyal-duygusal öğrenme becerisi girişlerini tamamla","Gelişim düzeyi ile sosyal-duygusal öğrenme becerisi girişlerinin tamamlanması"],
 ["kulup","Sınıf kitaplığı ve sosyal etkinlik girişlerini yıl sonuna göre kapat","Sınıf kitaplığı ve sosyal etkinlik girişlerinin yıl sonuna göre kapatılması"],
 ["idari","Ders kesim raporunu hazırla","Ders kesim raporunun hazırlanması"],
 ["idari","BEP'li öğrenciler için değerlendirme / ilerleme raporunu hazırla","BEP'li öğrenciler için değerlendirme ve ilerleme raporunun hazırlanması"],
 ["idari","Öğretmen puan çizelgesini kontrol et ve imzala","Öğretmen puan çizelgesinin kontrol edilerek imzalanması"],
 ["idari","Sene sonu şube öğretmenler kurulu (ŞÖK) toplantısına katıl","Sene sonu şube öğretmenler kurulu toplantısına katılım sağlanması","rehber"],
 ["idari","Yıl sonu zümre toplantısına katıl","Yıl sonu zümre öğretmenler kurulu toplantısına katılım sağlanması","zumre"],
 ["rehberlik","Rehberlik yıl sonu faaliyet raporunu teslim et","Rehberlik yıl sonu faaliyet raporunun teslim edilmesi"],
 ["kulup","Kulüp yıl sonu faaliyet raporunu ve aylık raporları teslim et","Öğrenci kulübü yıl sonu faaliyet raporu ile aylık raporların teslim edilmesi"],
 ["idari","Ders dışı egzersiz bitiş raporunu teslim et","Ders dışı egzersiz bitiş raporunun teslim edilmesi"],
 ["idari","Yıl içi gezilerin evrakını dosyala","Yıl içinde yapılan gezilere ait evrakın dosyalanması"],
 ["idari","Belirli gün ve hafta görevlerinin dosyasını tamamla","Belirli gün ve haftalara ilişkin görevlerin dosyasının tamamlanması","belirli"],
 ["idari","Sınıf defterlerini ve nöbet defterini kapat","Sınıf defterleri ile nöbet defterinin kapatılması"],
 ["idari","Yazılı kâğıtlarını teslim tutanağıyla teslim et","Yazılı sınav kâğıtlarının teslim tutanağıyla teslim edilmesi"],
 ["rehberlik","Takdir / teşekkür belgelerini karneyle birlikte ver","Takdir ve teşekkür belgelerinin karneyle birlikte verilmesi"],
 ["rehberlik","Karne işlemlerini tamamla, mühür ve imzayı yaptır","Karne işlemlerinin tamamlanarak mühür ve imzanın yaptırılması"],
 ["idari","Anasınıfı yıl sonu beceri edinim raporlarını hazırla","Anasınıfı yıl sonu beceri edinim raporlarının hazırlanması"],
 ["idari","Yaz tatili izin ve görev işlemlerini kontrol et","Yaz tatiline ilişkin izin ve görev işlemlerinin kontrol edilmesi"],
 ["idari","Öğretmen dosyasını idareye teslim et","Öğretmen dosyasının okul idaresine teslim edilmesi"]
];
/* Sene başında rehberlik evrakı sınıf rehber öğretmenlerinden, dönem ve yıl sonunda herkesten istenir. */
const katalogYap=(donem,onek,rows,rehberVarsayilan)=>rows.map((x,i)=>({id:onek+String(i+1).padStart(2,'0'),donem,grup:x[0],ad:x[1],yazi:x[2]||x[1],kimden:x[3]||(x[0]==='kulup'?'kulup':x[0]==='rehberlik'&&rehberVarsayilan?'rehber':'herkes')}));
const KATALOG=[...katalogYap('basi','b',BASI,true),...katalogYap('donem1','d',DONEM1,false),...katalogYap('sonu','s',SONU,false)];

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const clone=v=>{try{return structuredClone(v)}catch(_){return JSON.parse(JSON.stringify(v))}};
const user=()=>global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
const uid=()=>String(user().uid||'').trim();
const recordId=()=>`evrak_teslim_${uid()}`.replace(/[^\w-]/g,'_');
const upper=s=>String(s||'').replace(/\s+/g,' ').trim().toLocaleUpperCase('tr');
const norm=s=>String(s||'').toLocaleLowerCase('tr');
const teacherName=t=>String(t?.adSoyad||[t?.ad,t?.soyad].filter(Boolean).join(' ')||'').replace(/\s+/g,' ').trim();
const shortAd=(s,n=30)=>s.length>n?s.slice(0,n-1).trimEnd()+'…':s;
const tempId=()=>`o_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
function academicYear(){const d=new Date(),y=d.getFullYear();return d.getMonth()+1>=9?`${y}-${y+1}`:`${y-1}-${y}`}
function school(){const l=arr('okulBilgileri');return l.find(x=>x.id==='ayarlar')||l[0]||global.okulBilgileriAyari||{}}
function schoolName(){const o=school();return String(o.okulAdi||o.ad||'').trim()}
const imzaAd=s=>{const w=String(s||'').trim().split(/\s+/).filter(Boolean);if(!w.length)return'';const son=w.pop().toLocaleUpperCase('tr');return[...w.map(x=>x.charAt(0).toLocaleUpperCase('tr')+x.slice(1).toLocaleLowerCase('tr')),son].join(' ')};
const bugun=()=>new Date().toLocaleDateString('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric'});

let view='cizelge',root=null,mounted=false,unsubs=[],preparedFor='',persistTimer=null,renderQueued=false;
let state=blank();

function blank(){return{donem:'basi',secili:{basi:null,donem1:null,sonu:null},kimden:{},ozel:[],cikarilan:[],eklenen:[]}}
async function prepare(){
  const id=uid(),col=global.COL;
  if(!global.SyncEngine||!col)return false;
  const defs={ogretmenler:col.ogretmenler,siniflar:col.siniflar,kurulKomisyonlar:col.kurulKomisyonlar,sosyalKulupler:col.sosyalKulupler,belirliGunler:col.belirliGunler,okulBilgileri:col.okulBilgileri},types=[];
  Object.entries(defs).forEach(([t,c])=>{if(c){global.SyncEngine.register(t,c);types.push(t)}});
  if(id&&col.ogretmenListeKayit&&preparedFor!==id){preparedFor=id;global.SyncEngine.register(TYPE,col.ogretmenListeKayit,{query:q=>q.where('sahipUid','==',id)});types.push(TYPE)}
  await global.SyncEngine.localHydrate(types);global.SyncEngine.schedule?.(100);return true;
}
function loadState(){
  const d=blank(),rec=global.DeviceData?.list?.(TYPE)?.find?.(x=>x.id===recordId()&&x.sahipUid===uid()),s=rec?.state&&typeof rec.state==='object'?rec.state:{};
  const pick=k=>Array.isArray(s.secili?.[k])?s.secili[k].map(String):null;
  state=rec?{donem:DONEMLER.some(x=>x[0]===s.donem)?s.donem:d.donem,secili:{basi:pick('basi'),donem1:pick('donem1'),sonu:pick('sonu')},kimden:s.kimden&&typeof s.kimden==='object'?clone(s.kimden):{},ozel:Array.isArray(s.ozel)?clone(s.ozel).map(o=>({...o,donem:DONEMLER.some(x=>x[0]===o.donem)?o.donem:'basi'})):[],cikarilan:Array.isArray(s.cikarilan)?s.cikarilan.map(String):[],eklenen:Array.isArray(s.eklenen)?clone(s.eklenen):[]}:d;
}
function persist(){
  const id=uid(),col=global.COL?.ogretmenListeKayit;
  if(!id||!col||!global.DeviceData)return Promise.resolve(false);
  return global.DeviceData.set(TYPE,col,recordId(),{scope:'evrak-teslim-cizelgesi',sahipUid:id,state:clone(state),guncellenme:new Date().toISOString()},{merge:false}).catch(e=>{console.warn('[EvrakTeslim]',e?.message||e);return false});
}
function persistSoon(){clearTimeout(persistTimer);persistTimer=setTimeout(()=>void persist(),220)}

/* ── model ── */
const items=(d=state.donem)=>[...KATALOG.filter(e=>e.donem===d),...state.ozel.filter(o=>o.donem===d).map(o=>({id:o.id,donem:d,grup:'ozel',ad:o.ad,yazi:o.ad,kimden:'herkes'}))];
const kimdenOf=e=>KIMDEN.some(k=>k[0]===state.kimden[e.id])?state.kimden[e.id]:e.kimden;
function selectedIds(d=state.donem){const all=items(d).map(e=>e.id),s=state.secili[d];return s?new Set(s.filter(id=>all.includes(id))):new Set(all)}
function setSelected(set,d=state.donem){state.secili[d]=[...set]}
function teachers(){
  const gone=new Set(state.cikarilan.map(String));
  const mudurId=String(school().mudurId||school().mudirId||''),pool=arr('ogretmenler').filter(t=>t?.id&&t.aktif!==false).map(t=>({id:String(t.id),ad:upper(teacherName(t)),brans:String(t.brans||'').trim(),pool:true,yonetici:String(t.id)===mudurId||norm(t.unvan).includes('müdür')}));
  return[...pool.filter(t=>!gone.has(t.id)),...state.eklenen.map(t=>({id:String(t.id),ad:upper(t.ad),brans:String(t.brans||'').trim(),pool:false,yonetici:false}))];
}
const removedPool=()=>arr('ogretmenler').filter(t=>t?.id&&t.aktif!==false&&state.cikarilan.includes(String(t.id)));
function academicKurullar(){
  const list=arr('kurulKomisyonlar').filter(k=>{const n=norm(k.ad);return n.includes('zümre başkanları')&&!n.includes('bölge')}),y=academicYear(),cur=list.filter(k=>String(k.egitimOgretimYili||'')===y);
  return cur.length?cur:list;
}
function groupSets(){
  const rehber=new Set(arr('siniflar').map(s=>s?.sinifOgretmeniId).filter(Boolean).map(String));
  const zumre=new Set();academicKurullar().forEach(k=>{if(k.baskanId)zumre.add(String(k.baskanId));(k.asilUyeler||[]).forEach(m=>{if(m&&m.tur!=='ogrenci'&&m.id)zumre.add(String(m.id))})});
  const kulup=new Set();arr('sosyalKulupler').forEach(k=>{(Array.isArray(k.ogretmenIdler)?k.ogretmenIdler:[k.ogretmenId,k.danismanOgretmenId]).filter(Boolean).forEach(id=>kulup.add(String(id)))});
  const belirli=new Set();arr('belirliGunler').forEach(k=>{(Array.isArray(k.ogretmenIdler)?k.ogretmenIdler:[k.ogretmenId]).filter(Boolean).forEach(id=>belirli.add(String(id)))});
  return{rehber,zumre,kulup,belirli};
}
/* Liste boşsa kısıtlama uygulanmaz: imza yeri herkese açılır. */
function signs(e,t,sets){const k=kimdenOf(e);if(k==='herkes')return true;const s=sets[k];return!s||!s.size||s.has(t.id)}

/* ── ekran ── */
const checkbox=(attr,on)=>`<input type="checkbox" ${attr} ${on?'checked':''}>`;
function itemRow(e,on){
  const full=e.ad,short=shortAd(full),k=kimdenOf(e);
  return `<div class="ka-evrak-row" data-ev-row="${esc(e.id)}"><label class="ka-evrak-row__check">${checkbox(`data-ev-check="${esc(e.id)}" aria-label="${esc(full)}"`,on)}<span class="ka-evrak-row__text"><strong>${esc(short)}</strong>${short!==full?`<small>${esc(full)}</small>`:''}</span></label><select class="ka-input" data-ev-kimden="${esc(e.id)}" aria-label="${esc(full)} kimden istenecek">${KIMDEN.map(([v,l])=>`<option value="${v}" ${k===v?'selected':''}>${esc(l)}</option>`).join('')}</select></div>`;
}
function itemsHtml(){
  const sel=selectedIds(),list=items();
  /* Liste sırası korunur; grup başlığı, grup değiştiği yerde açılır. */
  const runs=[];list.forEach(e=>{const last=runs[runs.length-1];if(last&&last.grup===e.grup)last.rows.push(e);else runs.push({grup:e.grup,rows:[e]})});
  return runs.map(r=>`<div class="ka-evrak-group"><div class="ka-evrak-group__head">${esc(GRUPLAR[r.grup]||'')}</div>${r.rows.map(e=>itemRow(e,sel.has(e.id))).join('')}</div>`).join('');
}
function noteHtml(){
  const s=groupSets();
  return `<div class="ka-evrak-note"><p><strong>Her evrak herkesten istenmez.</strong> Her satırın sağındaki kutudan o evrakın kimden isteneceğini seçin. Örneğin <b>Zümre başkanları</b> seçilirse çizelgede yalnız zümre başkanlarının karşısına imza yeri açılır, diğerlerinin karşısına <b>———</b> çizgisi basılır; sınıf rehber öğretmenleri için de aynısı geçerlidir.</p><p>Listeler okul verisinden canlı okunur: zümre başkanları <b>Kurul ve Komisyonlar</b>’dan (${s.zumre.size} kişi), sınıf rehber öğretmenleri <b>Sınıflar</b>’dan (${s.rehber.size} kişi), kulüp danışmanları <b>Sosyal Kulüpler</b>’den (${s.kulup.size} kişi), belirli gün/hafta görevlileri <b>Belirli Gün ve Haftalar</b>’dan (${s.belirli.size} kişi). İlgili liste boşsa kısıtlama uygulanmaz, imza yeri herkese açılır.</p></div>`;
}
function teachersHtml(){
  const list=teachers();
  return list.length?list.map(t=>`<span class="ka-evrak-chip"><span>${esc(t.ad)}</span><button type="button" data-ev-remove="${esc(t.id)}" aria-label="${esc(t.ad)} listeden çıkar">×</button></span>`).join(''):'<div class="ka-empty">Listede öğretmen yok. Aşağıdan ekleyin veya havuzdan geri alın.</div>';
}
function pageHtml(){return view==='cizelge'?cizelgeHtml():tebligHtml(view)}
function cizelgeHtml(){
  const sel=selectedIds(),total=items().length,n=teachers().length,gone=removedPool().length;
  return `<section class="ka-page ka-stack ka-evrak" data-evrak-teslim-page>
<header class="ka-page-head"><span class="ka-page-head__icon" aria-hidden="true">📑</span><div><small>İDARECİ ARAÇLARI</small><h2>Evrak Teslim İmza Çizelgesi</h2><p>Hangi dönem için çizelge alacağınızı seçin; istemediğiniz evrakların işaretini kaldırın. Çizelge PDF olarak açılır: üstte evrak adları, solda öğretmen adları, kesişimde imza yeri.</p></div></header>
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>1) Dönem</strong><nav class="ka-tabs" role="tablist" aria-label="Dönem">${DONEMLER.map(([k,l])=>`<button type="button" role="tab" class="ka-tab${state.donem===k?' active':''}" aria-selected="${state.donem===k}" data-ev-donem="${k}">${esc(l)}</button>`).join('')}</nav></div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><strong>2) İstenecek evraklar</strong><span class="ka-badge" data-ev-count>${sel.size} / ${total}</span></div><div class="ka-row"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-ev-all>Hepsini seç</button><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-ev-none>Hiçbiri</button></div>${noteHtml()}<div class="ka-evrak-list" data-ev-items>${itemsHtml()}</div><div class="ka-row ka-evrak-add"><input class="ka-input" data-ev-new-item maxlength="120" placeholder="Listede yoksa kendi maddenizi yazın (örn. Ders kesim raporu)"><button class="ka-btn" type="button" data-ev-add-item>+ Madde ekle</button></div></div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><div class="ka-row ka-row--between"><strong>3) Öğretmenler</strong><span class="ka-badge" data-ev-teacher-count>${n} kişi</span></div><div class="ka-row ka-evrak-add"><input class="ka-input" data-ev-new-teacher maxlength="60" placeholder="Ad Soyad"><button class="ka-btn" type="button" data-ev-add-teacher>+ Ekle</button><button class="ka-btn ka-btn--secondary" type="button" data-ev-restore ${gone?'':'disabled'}>↺ Havuzdan geri al${gone?` (${gone})`:''}</button></div><div class="ka-evrak-chips" data-ev-teachers>${teachersHtml()}</div></div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>4) Sıralama ve çıktı</strong><div class="ka-row"><button class="ka-btn" type="button" data-ev-pdf="ad">Ada göre sırala ve PDF al</button><button class="ka-btn ka-btn--secondary" type="button" data-ev-pdf="brans">Branşa göre sırala ve PDF al</button></div><div class="ka-evrak-note"><p><strong>Branşa göre</strong> seçerseniz çizelgeye ayrıca bir Branş sütunu eklenir ve aynı branştaki öğretmenler alt alta gelir; branşı yazılmamış olanlar en sona düşer. Branş bilgisi öğretmen kayıtlarından okunur.</p></div><div class="ka-evrak-note"><p>Yazdırma penceresinde <strong>Hedef: PDF olarak kaydet</strong> seçin. Sayfa üst-alt bilgisini (tarih, adres, sayfa no) <strong>çıkmaz</strong> yapın; evrak sayısı ne olursa olsun sütunlar tek sayfaya sığacak şekilde küçülür ve öğretmen satırları eşit yükseklikte kalır.</p></div><p class="ka-muted">Değişiklikleriniz bu cihaza otomatik kaydedilir.</p></div></article>
</section>`;
}
function keepScroll(fn){
  let el=root?.parentElement;while(el&&!(el.scrollHeight>el.clientHeight&&/(auto|scroll)/.test(getComputedStyle(el).overflowY)))el=el.parentElement;
  const sc=el||document.scrollingElement,top=sc?sc.scrollTop:0;fn();if(sc)sc.scrollTop=top;
}
function render(){if(!mounted||!root)return;keepScroll(()=>{root.innerHTML=pageHtml()});global.PermissionService?.apply?.(root)}
function renderSoon(){if(renderQueued)return;renderQueued=true;requestAnimationFrame(()=>{renderQueued=false;render()})}
function refreshCount(){const c=root?.querySelector('[data-ev-count]');if(c)c.textContent=`${selectedIds().size} / ${items().length}`}

/* ── çıktı ── */
function reportHtml(sort){
  const sets=groupSets(),sel=selectedIds(),cols=items().filter(e=>sel.has(e.id)),brans=sort==='brans';
  const list=teachers().slice().sort((a,b)=>brans?((a.brans?0:1)-(b.brans?0:1))||a.brans.localeCompare(b.brans,'tr')||a.ad.localeCompare(b.ad,'tr'):a.ad.localeCompare(b.ad,'tr'));
  const usable=281,noW=7,adW=42,brW=brans?28:0,colW=Math.max(2.6,(usable-noW-adW-brW)/Math.max(1,cols.length));
  const fs=Math.min(8,Math.max(5,colW*2.83*0.6)),label=e=>shortAd(e.ad,38),longest=cols.reduce((m,e)=>Math.max(m,label(e).length),8);
  const headH=Math.min(64,Math.max(26,longest*fs*0.56/2.83+5)),rowH=Math.min(11,Math.max(5.5,118/Math.max(1,list.length)));
  const css=`<style>.ev-sig{width:100%;table-layout:fixed;border-collapse:collapse}.ev-sig th,.ev-sig td{border:.25mm solid #222;padding:0;text-align:center;vertical-align:middle;font-size:${fs}pt;overflow:hidden}.ev-sig thead th{background:#f1f1f1;font-weight:700}.ev-sig th.v{height:${headH}mm}.ev-sig th.v span{display:block;writing-mode:vertical-rl;transform:rotate(180deg);white-space:nowrap;margin:0 auto;line-height:1.05}.ev-sig td.ad{text-align:left;padding:0 1.2mm;white-space:nowrap;font-size:${Math.min(8.5,fs+1.5)}pt}.ev-sig td.br{text-align:left;padding:0 1mm;white-space:nowrap}.ev-sig tbody tr{height:${rowH}mm}.ev-sig td.x{color:#555}.ev-note{margin-top:2mm;font-size:7pt;color:#333}</style>`;
  const head=`<tr><th style="width:${noW}mm">S.N</th><th style="width:${adW}mm">Adı Soyadı</th>${brans?`<th style="width:${brW}mm">Branş</th>`:''}${cols.map(e=>`<th class="v" style="width:${colW}mm"><span>${esc(label(e))}</span></th>`).join('')}</tr>`;
  const body=list.map((t,i)=>`<tr><td>${i+1}</td><td class="ad">${esc(t.ad)}</td>${brans?`<td class="br">${esc(t.brans)}</td>`:''}${cols.map(e=>signs(e,t,sets)?'<td></td>':'<td class="x">———</td>').join('')}</tr>`).join('');
  return{css,body:`<table class="ev-sig"><thead>${head}</thead><tbody>${body}</tbody></table><div class="ev-note">Not: ——— çizgisi, ilgili evrakın o öğretmenden istenmediğini gösterir. Teslim alan ve teslim eden imzaları ilgili satır ve sütunun kesişimine atılır.</div>`};
}
async function pdf(sort){
  if(!teachers().length)return global.toast?.('Çizelge için en az bir öğretmen ekleyin.');
  if(!selectedIds().size)return global.toast?.('En az bir evrak seçin.');
  try{
    if(!global.ReportEngine?.printReport)await global.AppLoader.loadScript('js/modules/report-engine.js?v=6');
    const d=DONEMLER.find(x=>x[0]===state.donem)?.[1]||'',r=reportHtml(sort);
    return await global.ReportEngine.printReport(`EVRAK TESLİM İMZA ÇİZELGESİ — ${upper(d)}`,r.body,{fileName:`Evrak_Teslim_Imza_Cizelgesi_${state.donem}`,yon:'yatay',logoGoster:true,baslikGoster:true,tarihGoster:false,ustBaslik:`${academicYear()} EĞİTİM ÖĞRETİM YILI`,okulAdi:schoolName()||undefined,extraHead:r.css});
  }catch(e){global.toast?.(e?.message||'Çizelge oluşturulamadı.')}
}

/* ── tebliğ yazısı ── */
const TEBLIG={
  donem1:{baslik:'Dönem Sonu Evrak Teslimi Tebliği',vurgu:'birinci dönem sonu',sekme:'1. Dönem Sonu',acilis:'Birinci dönem sonunda',dosya:'Donem_Sonu_Evrak_Teslimi_Tebligi',ikon:'📨'},
  sonu:{baslik:'Sene Sonu Evrak Teslimi Tebliği',vurgu:'sene sonu',sekme:'Sene Sonu',acilis:'Eğitim öğretim yılı sonunda',dosya:'Sene_Sonu_Evrak_Teslimi_Tebligi',ikon:'📬'}
};
const GRUP_SIRA=['idari','rehberlik','kulup'],NOKTA='....../....../20......';
const htmlKac=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
/* Yazıdaki maddeler, çizelgedeki dönem sekmesinde işaretli evraklardan gelir; numara gruplar boyunca sürer. */
function tebligVeri(d){
  const sel=selectedIds(d),secili=items(d).filter(e=>sel.has(e.id)),o=school(),il=String(o.il||'').trim(),ilce=String(o.ilce||'').trim();
  const md=arr('ogretmenler').find(x=>String(x.id)===String(o.mudurId||o.mudirId||'')),sinif=t=>/sınıf öğretmen/.test(norm(t.brans))?0:1;
  let no=0;
  return{d,t:TEBLIG[d],toplam:items(d).length,secili:secili.length,yil:academicYear(),
    gruplar:GRUP_SIRA.map(g=>({ad:GRUPLAR[g],rows:secili.filter(e=>(e.grup==='ozel'?'idari':e.grup)===g).map(e=>({no:++no,yazi:e.yazi||e.ad}))})).filter(g=>g.rows.length),
    ogretmenler:teachers().filter(t=>!t.yonetici).sort((a,b)=>sinif(a)-sinif(b)||a.ad.localeCompare(b.ad,'tr')),
    okul:schoolName()||'............................',
    ustMakam:(!ilce||/merkez/i.test(ilce))&&il?`${il} Valiliği`:`${ilce||'............'} Kaymakamlığı`,
    makam:ilce?`${ilce} İlçe Milli Eğitim Müdürlüğü`:'İlçe Milli Eğitim Müdürlüğü',
    mudur:imzaAd(md?teacherName(md):String(o.mudurAdSoyad||o.mudurAdi||''))||'..........................',
    yer:[schoolName(),[ilce,il].filter(Boolean).join(' / ')].filter(Boolean).join(' · ')};
}
const tebligGiris=v=>`${v.yil} eğitim öğretim yılı <b>${v.t.vurgu}</b> itibarıyla, öğretmen dosyalarında bulunması gereken evrakların tamamlanarak okul idaresine teslim edilmesi gerekmektedir.`;
const tebligKapsam=`Bu kapsamda aşağıda belirtilen iş ve işlemlerin tamamlanması ve ilgili evrakların <b>${NOKTA}</b> tarihine kadar okul idaresine teslim edilmesi;`;
const TEBLIG_SUTUN=['S.No','Adı Soyadı','Branşı','Teslim Tarihi','İmzası'];
/* Önizleme ve kâğıt çıktısı aynı işaretlemeyi kullanır; yalnız önizlemede EBYS'nin kendi bastığı alt bilgi gösterilir. */
function tebligKagit(v,onizleme){
  const maddeler=v.gruplar.map(g=>`<p class="ev-l-g">${esc(g.ad)}</p>${g.rows.map(r=>`<p class="ev-l-i">${r.no}. ${esc(r.yazi)}</p>`).join('')}`).join('');
  const tablo=v.ogretmenler.length?`<table class="ev-l-t"><thead><tr>${TEBLIG_SUTUN.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${v.ogretmenler.map((t,i)=>`<tr><td>${i+1}</td><td class="a">${esc(t.ad)}</td><td>${esc(t.brans)}</td><td></td><td></td></tr>`).join('')}</tbody></table>`:'';
  return `<div class="ev-l"><div class="ev-l-head"><span>T.C.</span><span>${esc(upper(v.ustMakam))}</span><span>${esc(v.makam)}</span><b>${esc(v.okul)}</b></div><div class="ev-l-meta"><span>Sayı : E-........-903.07-........</span><span>Konu: ${esc(v.t.baslik)}</span></div><p class="ev-l-p">${tebligGiris(v)}</p><p class="ev-l-p">${tebligKapsam}</p>${maddeler}<p class="ev-l-p">Bilgilerinizi ve gereğini rica ederim.</p>${tablo}<div class="ev-l-sign"><span>${esc(v.mudur)}</span><span>Okul Müdürü</span><span>${bugun()}</span></div>${onizleme?`<div class="ev-l-foot"><span>${esc(v.yer)}</span><span>Bu belge, güvenli elektronik imza ile imzalanmıştır.</span><span>Doğrulama Adresi: https://www.turkiye.gov.tr/meb-ebys</span></div>`:''}</div>`;
}
/* EBYS Editör > Kaynak alanına yapıştırılacak gövde: başlık, sayı, konu, imza ve doğrulama satırını EBYS kendisi basar. */
function tebligKod(v){
  const sp=t=>`<span style="font-family:'Times New Roman'">${t}</span>`,p=(t,st)=>`<p style="${st}">${sp(t)}</p>`,gir='margin:0 0 10pt; text-indent:35.4pt',hucre=(t,al)=>`<td style="border:1px solid #000; padding:3pt 5pt; text-align:${al||'center'}">${sp(t)}</td>`;
  const out=[p(tebligGiris(v),gir),p(tebligKapsam,gir)];
  v.gruplar.forEach(g=>{out.push(p(`<b>${htmlKac(g.ad)}</b>`,'margin:0 0 4pt 35.4pt'));g.rows.forEach(r=>out.push(p(`${r.no}. ${htmlKac(r.yazi)}`,'margin:0 0 4pt 35.4pt; text-align:justify')))});
  out.push(p('Bilgilerinizi ve gereğini rica ederim.','margin:10pt 0; text-indent:35.4pt'));
  if(v.ogretmenler.length)out.push(`<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse; width:100%"><thead><tr>${TEBLIG_SUTUN.map(c=>`<th style="text-align:center">${sp(c)}</th>`).join('')}</tr></thead><tbody>${v.ogretmenler.map((t,i)=>`<tr>${hucre(i+1)}${hucre(htmlKac(t.ad),'left')}${hucre(htmlKac(t.brans))}${hucre('&nbsp;')}${hucre('&nbsp;')}</tr>`).join('')}</tbody></table>`);
  return out.join('\n');
}
function tebligHtml(d){
  const v=tebligVeri(d),bos=!v.secili,tablo=v.ogretmenler.length>0;
  const govde=bos?`<div class="ka-empty">Bu dönem için işaretli evrak yok. <button type="button" class="ka-evrak-link" data-ev-goto="${d}">${esc(v.t.sekme)}</button> sekmesinde en az bir evrak işaretleyin.</div>`:`
<article class="ka-card"><div class="ka-card__body ka-evrak-actions"><div class="ka-evrak-action"><button class="ka-btn" type="button" data-ev-copy>📋 Kodu kopyala</button><strong>Hemen kopyalayın</strong><small>EBYS ▸ Editör ▸ <b>Kaynak</b> düğmesine yapıştırın.</small></div><div class="ka-evrak-action"><button class="ka-btn ka-btn--secondary" type="button" data-ev-print>🖨 EBYS’siz yazdır</button><strong>Kâğıda basın</strong><small>Resmî yazı düzeninde, okul ve müdür adıyla; ıslak imza için.</small></div></div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>👁 Önizleme — EBYS’de böyle görünür</strong><p class="ka-evrak-hint">Başlık, sayı, tarih, imza ve doğrulama satırını EBYS kendisi basar; burada yalnız nasıl duracağını gösteriyoruz. Kopyalanan şey <b>yazının gövdesidir</b>.</p><div class="ka-evrak-paper">${tebligKagit(v,true)}</div></div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>🧩 Yapıştırılacak kod</strong><p class="ka-evrak-hint">${tablo?'Bu şablonda <b>tablo</b> var: ':''}Editör’deki <b>Kaynak</b> düğmesine basın, kodu yapıştırın, sonra <b>Kaynak</b>’tan çıkın.</p><div class="ka-row"><button class="ka-btn" type="button" data-ev-copy>📋 Kodu kopyala</button></div><textarea class="ka-input ka-evrak-code" data-ev-code readonly rows="8" spellcheck="false" aria-label="EBYS’ye yapıştırılacak kod">${esc(tebligKod(v))}</textarea><p class="ka-evrak-hint"><b>Konu</b>, <b>ilgi</b> ve <b>ekler</b> burada YOKTUR: EBYS’de sırasıyla <b>Bilgileri</b>, <b>İlgileri</b> ve <b>Ekleri</b> sekmelerine girilir.</p></div></article>`;
  return `<section class="ka-page ka-stack ka-evrak" data-evrak-teslim-page data-ev-view="${d}">
<header class="ka-page-head"><span class="ka-page-head__icon" aria-hidden="true">${v.t.ikon}</span><div><small>İDARECİ ARAÇLARI</small><h2>${esc(v.t.baslik)}</h2></div></header>
<div class="ka-evrak-note"><p>Yazıdaki madde listesi <button type="button" class="ka-evrak-link" data-ev-goto="${d}">${esc(v.t.sekme)}</button> sekmesinde <b>işaretli ${v.secili} / ${v.toplam}</b> maddeden gelir. Çıkarmak ya da eklemek için orada işaretleyin; yazı kendiliğinden değişir.</p></div>
<p class="ka-evrak-hint">Aşağıdaki kodu <b>kopyalayıp</b> EBYS ▸ Evrak Oluştur ▸ Editör alanına yapıştırın; <b>...</b> olan yerleri kendi bilgilerinizle değiştirin.</p>${govde}
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>✍ Bunlara dikkat edin</strong><p class="ka-evrak-hint">${esc(v.t.acilis)} öğretmenlerden istenecek evrakların tebliğ yazısı. <b>Teslim tarihini</b> kendi takviminize göre değiştirin; listeden okulunuzda karşılığı olmayan maddeyi silin. Adlar <b>öğretmen havuzundan</b> gelir. Yazı astlara gittiği için “arz” değil <b>“rica ederim”</b> denir.</p></div></article>
<div class="ka-evrak-note"><p><b>Konu, ilgi ve ekleri metne yazmayın.</b> Üçü de EBYS’nin kendi sekmelerinde girilir: <b>Konu</b> → Bilgileri, <b>ilgi yazı</b> → İlgileri, <b>ek belgeler</b> → Ekleri. Bu satırları <b>sistem kendisi</b> basar.</p></div>
</section>`;
}
async function kopyala(metin){
  try{await navigator.clipboard.writeText(metin);global.toast?.('Kod kopyalandı. EBYS’te Kaynak düğmesine yapıştırın.');return true}catch(_){}
  const ta=root?.querySelector('[data-ev-code]');
  if(ta){ta.focus();ta.select();try{if(document.execCommand('copy')){global.toast?.('Kod kopyalandı.');return true}}catch(_){}}
  global.toast?.('Kopyalanamadı; kodu kutudan seçip kopyalayın.');return false;
}
async function tebligYazdir(d){
  const v=tebligVeri(d);if(!v.secili)return global.toast?.('Önce çizelge sayfasında en az bir evrak işaretleyin.');
  const css=`<style>.ka-report .ev-l{font-family:"Times New Roman",Times,serif;font-size:12pt;line-height:1.35;color:#000}.ka-report .ev-l-head{display:grid;justify-items:center;text-align:center;margin:0 0 7mm}.ka-report .ev-l-meta{display:grid;margin:0 0 5mm}.ka-report .ev-l-p{margin:0 0 3mm;text-indent:12.5mm;text-align:justify}.ka-report .ev-l-g{margin:3mm 0 1.5mm 12.5mm;font-weight:700;break-after:avoid;page-break-after:avoid}.ka-report .ev-l-i{margin:0 0 1.2mm;text-indent:12.5mm;text-align:justify}.ka-report .ev-l-t{width:100%;border-collapse:collapse;margin:4mm 0}.ka-report .ev-l-t th,.ka-report .ev-l-t td{border:.3mm solid #000;padding:1.4mm 2mm;text-align:center;font-size:11pt;font-weight:400}.ka-report .ev-l-t th{font-weight:700}.ka-report .ev-l-t td.a{text-align:left}.ka-report .ev-l-sign{display:grid;justify-items:end;margin-top:9mm;text-align:right;break-inside:avoid}</style>`;
  try{
    if(!global.ReportEngine?.printReport)await global.AppLoader.loadScript('js/modules/report-engine.js?v=6');
    return await global.ReportEngine.printReport(v.t.baslik,tebligKagit(v,false),{fileName:v.t.dosya,yon:'dikey',logoGoster:false,baslikGoster:false,tarihGoster:false,fontSize:12,okulAdi:v.okul,extraHead:css,akis:true});
  }catch(e){global.toast?.(e?.message||'Yazı oluşturulamadı.')}
}
/* Tebliğ sayfasındaki dönem bağlantısı: çizelge sayfasını o dönem sekmesinde açar. */
async function cizelgeyeGit(d){
  clearTimeout(persistTimer);persistTimer=null;state.donem=d;await persist();
  return global.ShellUI?.routeModule?.('management',{page:'evrak-teslim',title:'Öğretmenden İstenecekler'});
}

/* ── olaylar ── */
function handleClick(e){
  const t=e.target.closest?.('button');if(!t||!root?.contains(t))return;
  const q=a=>t.hasAttribute(a);
  if(q('data-ev-donem')){state.donem=t.dataset.evDonem;persistSoon();render();return}
  if(q('data-ev-all')){setSelected(new Set(items().map(x=>x.id)));persistSoon();render();return}
  if(q('data-ev-none')){setSelected(new Set());persistSoon();render();return}
  if(q('data-ev-add-item')){const inp=root.querySelector('[data-ev-new-item]'),ad=String(inp?.value||'').replace(/\s+/g,' ').trim();if(!ad)return;const id=tempId(),sel=selectedIds();state.ozel.push({id,ad,donem:state.donem});sel.add(id);setSelected(sel);persistSoon();render();return}
  if(q('data-ev-add-teacher')){const inp=root.querySelector('[data-ev-new-teacher]'),ad=String(inp?.value||'').replace(/\s+/g,' ').trim();if(!ad)return;state.eklenen.push({id:tempId(),ad});persistSoon();render();return}
  if(q('data-ev-restore')){state.cikarilan=[];persistSoon();render();return}
  if(q('data-ev-remove')){const id=t.dataset.evRemove;if(state.eklenen.some(x=>String(x.id)===id))state.eklenen=state.eklenen.filter(x=>String(x.id)!==id);else state.cikarilan=[...new Set([...state.cikarilan,id])];persistSoon();render();return}
  if(q('data-ev-pdf')){void pdf(t.dataset.evPdf==='brans'?'brans':'ad')}
  else if(q('data-ev-copy'))void kopyala(tebligKod(tebligVeri(view)));
  else if(q('data-ev-print'))void tebligYazdir(view);
  else if(q('data-ev-goto'))void cizelgeyeGit(t.dataset.evGoto);
}
function handleChange(e){
  const el=e.target;if(!el||!root?.contains(el))return;
  if(el.matches?.('[data-ev-check]')){const sel=selectedIds();el.checked?sel.add(el.dataset.evCheck):sel.delete(el.dataset.evCheck);setSelected(sel);persistSoon();refreshCount();return}
  if(el.matches?.('[data-ev-kimden]')){state.kimden[el.dataset.evKimden]=el.value;persistSoon()}
}
function handleKey(e){
  if(e.key!=='Enter')return;
  const el=e.target;
  if(el.matches?.('[data-ev-new-item]')){e.preventDefault();root.querySelector('[data-ev-add-item]')?.click()}
  else if(el.matches?.('[data-ev-new-teacher]')){e.preventDefault();root.querySelector('[data-ev-add-teacher]')?.click()}
}
function bind(){if(!root)return;root.onclick=handleClick;root.onchange=handleChange;root.onkeydown=handleKey}
function subscribe(){
  unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];
  ['data.ogretmenler','data.siniflar','data.kurulKomisyonlar','data.sosyalKulupler','data.belirliGunler','data.okulBilgileri'].forEach(p=>{const u=global.AppStore?.subscribe?.(p,()=>{if(!root?.contains(document.activeElement)||!/^(INPUT|SELECT)$/.test(document.activeElement?.tagName||''))renderSoon()});if(u)unsubs.push(u)});
}
async function open(target=document.getElementById('v2ModuleRoot'),sayfa='cizelge'){
  if(!target)return false;
  unmount();root=target;mounted=true;view=TEBLIG[sayfa]?sayfa:'cizelge';
  await prepare();loadState();
  bind();subscribe();render();return true;
}
function unmount(){
  if(persistTimer){clearTimeout(persistTimer);persistTimer=null;if(mounted)void persist()}unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[];
  if(root){root.onclick=null;root.onchange=null;root.onkeydown=null}
  root=null;mounted=false;
}
global.addEventListener('koruk:module-ready',e=>{if(mounted&&e.detail?.name&&(!root||!root.querySelector('[data-evrak-teslim-page]')))unmount()});
global.EvrakTeslimPage={open,unmount,render,KATALOG,KIMDEN,reportHtml,tebligVeri,tebligKod,tebligKagit};
})(window);

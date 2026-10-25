/* Koruk Asistan — Yıllık plan ekranları
 * Hub (okul kademesine göre sınıflar) → sınıf sayfası (ders kartları) → ders sayfası (bilgi kartı, üniteler, hafta hafta tablo, Word çıktısı).
 * Plan verisi yillik-plan-core.js ile okunur, Word çıktısı yillik-plan-word.js ile üretilir; pencereler yillik-plan-dialog.js, Excel içe aktarma yillik-plan-excel.js içindedir.
 * academic.js bu modülü create(ctx) ile kurar: ctx = { arr, esc, norm, modal, toast, today, teacherId, yenile, exceljs, dersler }. */
(function(global){
'use strict';
const C=global.YillikPlanCore;
const KADEMELER={ilkokul:{ad:'İLKOKUL',siniflar:[1,2,3,4]},ortaokul:{ad:'ORTAOKUL',siniflar:[5,6,7,8]},lise:{ad:'LİSE',siniflar:[9,10,11,12]}};
const TUM_SINIFLAR=[1,2,3,4,5,6,7,8,9,10,11,12];
const GRUPLAR=[{key:'zorunlu',ad:'Zorunlu dersler',kisa:'Zorunlu'},{key:'secmeli',ad:'Seçmeli dersler',kisa:'Seçmeli'},{key:'iho',ad:'İHO dersleri',kisa:'İHO'}];
const IKONLAR=[[/matematik|geometri/,'➗'],[/fen|fizik|kimya|biyoloji/,'🔬'],[/sosyal|tarih|cografya|inkilap|felsefe|sosyoloji/,'🌍'],[/turkce|edebiyat|dil ve anlatim/,'📖'],[/ingilizce|almanca|fransizca|arapca|yabanci/,'🔤'],
 [/din|ahlak|kuran|siyer|hadis|peygamber/,'🕌'],[/beden|spor|oyun/,'⚽'],[/muzik/,'🎵'],[/gorsel|resim/,'🎨'],[/bilisim|yazilim|teknoloji|robotik|kodlama/,'💻'],[/hayat bilgisi|trafik|cevre/,'🌱'],[/rehberlik|insan haklari|saglik|medya/,'🧭']];
const KOD_RE=/^([A-ZÇĞİÖŞÜ]{1,5}(?:\.\d+[A-Za-z]?)+\.?)\s+/;
const kademeOf=n=>Number(n)<=4?'ilkokul':Number(n)<=8?'ortaokul':'lise';

function create(ctx){
const {arr,esc,toast,today,teacherId}=ctx;
const durum={sayfa:'hub',sinif:0,planId:'',arama:'',filtre:'tumu',tum:false,yil:'',acik:new Set(),bilgi:{},kaydir:false};
let kok=null,bekleyen=false,dialog=null,excel=null,sonKonum='';
const service=()=>global.YillikPlanService;
const yazabilir=()=>service()?._yaziYetkisiVar?.()===true;

/* ---------- Veri ---------- */
const okulHavuzu=()=>arr('yillikPlanBasliklari').slice().sort((a,b)=>Number(a.sira||0)-Number(b.sira||0));
const havuz=()=>katalog.sanalHavuz.length?[...okulHavuzu(),...katalog.sanalHavuz]:okulHavuzu();
const okulPlanlari=()=>arr('yillikPlanTanimlari').filter(p=>p&&p.dersAdi);
/* Hazır katalog: sınıf açılınca data/yillik-plan/{sinif}.json tembel yüklenir; okulda aynı planın kendi kaydı varsa katalog gizlenir. */
const katalog={dizin:null,dizinIstendi:false,siniflar:new Map(),planlar:[],sanalHavuz:[]};
const katalogGorunen=()=>{const var_=new Set(okulPlanlari().map(C.planAnahtari));return katalog.planlar.filter(p=>!var_.has(C.planAnahtari(p)))};
const planlar=()=>[...okulPlanlari(),...katalogGorunen()];
const planYili=p=>p.egitimOgretimYili||C.okulYili();
function yillar(){const s=new Set(planlar().map(planYili));s.add(C.okulYili());return[...s].sort().reverse()}
const yil=()=>durum.yil&&yillar().includes(durum.yil)?durum.yil:C.okulYili();
const planGrubu=p=>GRUPLAR.some(g=>g.key===p.grup)?p.grup:'zorunlu';
const sinifPlanlari=n=>planlar().filter(p=>Number(p.seviye)===Number(n)&&planYili(p)===yil()).sort((a,b)=>String(a.dersAdi).localeCompare(String(b.dersAdi),'tr'));
const bul=id=>planlar().find(p=>p.id===id)||null;
function kademeler(){
 const row=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||null;
 let liste=null;try{liste=global.OkulKademeleri?.liste?.(row)}catch(_){}
 if(!liste){
  const bilinen=['anaokulu','ilkokul','ortaokul','lise'];let keys=Array.isArray(row?.kademeler)?bilinen.filter(k=>row.kademeler.includes(k)):[];
  if(!keys.length)keys=bilinen.filter(k=>String(row?.[`${k}Adi`]||'').trim()||String(row?.[`${k}KurumKodu`]||'').trim());
  if(!keys.length)keys=['ilkokul','ortaokul'];
  liste=keys.map(key=>({key,okulAdi:String(row?.[`${key}Adi`]||'').trim()}));
 }
 return liste.filter(k=>KADEMELER[k.key]);
}
function gorunenKademeler(){
 const okul=new Set(kademeler().map(k=>k.key)),mevcut=planlar().filter(p=>planYili(p)===yil());
 return Object.keys(KADEMELER).filter(k=>durum.tum||okul.has(k)||mevcut.some(p=>kademeOf(p.seviye)===k));
}
const gorunenSiniflar=()=>gorunenKademeler().flatMap(k=>KADEMELER[k].siniflar);
function ikon(ad){const k=C.norm(ad);return(IKONLAR.find(([re])=>re.test(k))||[0,'📘'])[1]}
const sinifAdi=n=>`${n}. Sınıf`;
const planBasligi=p=>`${p.seviye?`${p.seviye}. Sınıf `:''}${p.dersAdi}`;

/* "Planlarım": öğretmenin seçtikleri + ders programındaki derslerin planları */
function secim(){const tid=teacherId();if(!tid)return null;return arr('ogretmenYillikPlanSecimleri').find(x=>String(x.id||'')===String(tid)||String(x.ogretmenId||'')===String(tid))||null}
function secilenPlanlar(){
 const s=secim()||{},ids=[...(Array.isArray(s.planIdler)?s.planIdler:[]),...(Array.isArray(s.planlar)?s.planlar:[]),...(Array.isArray(s.planIds)?s.planIds:[])];
 if(s.planId)ids.push(s.planId);
 return[...new Set(ids.map(x=>String(x||'').trim()).filter(Boolean))].map(bul).filter(Boolean);
}
function programPlanlari(){
 const tid=String(teacherId()||'').trim();if(!tid)return[];
 const anahtarlar=new Set();
 arr('dersProgrami').filter(x=>String(x?.ogretmenId||x?.teacherId||'')===tid).forEach(x=>{
  const sinif=C.sinifSayisi(x?.sinif||x?.sinifAdi||x?.className||x?.sinifId),ders=C.dersAnahtari(x?.ders||x?.dersAdi||x?.lesson||x?.lessonName);
  if(sinif&&ders)anahtarlar.add(`${sinif}|${ders}`);
 });
 return anahtarlar.size?planlar().filter(p=>anahtarlar.has(`${Number(p.seviye)}|${C.dersAnahtari(p.dersAdi)}`)):[];
}
function planlarim(){
 const gor=new Map();
 [...secilenPlanlar(),...programPlanlari()].forEach(p=>{if(planYili(p)===yil()&&!gor.has(p.id))gor.set(p.id,p)});
 return[...gor.values()].sort((a,b)=>Number(a.seviye)-Number(b.seviye)||String(a.dersAdi).localeCompare(String(b.dersAdi),'tr'));
}
const katalogMu=p=>!!p?._ayrisan;
const KATALOG_YOLU='data/yillik-plan/';
async function katalogDosya(ad){
 const r=await fetch(`${KATALOG_YOLU}${ad}.json`,{cache:'no-cache'});
 if(!r.ok)throw new Error(`Katalog alınamadı (${r.status})`);
 return r.json();
}
/* Katalog planı ekranda okul planı gibi okunur: başlıklar okul havuzundaki eşleriyle, yoksa sanal başlıkla bağlanır. */
function katalogPlaniKur(ay){
 const kimlik=new Map(okulHavuzu().map(h=>[C.baslikBilgisi(h.ad).key,h.id])),anahtarId={};
 ay.basliklar.forEach(b=>{
  if(kimlik.has(b.anahtar)){anahtarId[b.anahtar]=kimlik.get(b.anahtar);return}
  anahtarId[b.anahtar]=`katalog_${b.anahtar}`;
  if(!katalog.sanalHavuz.some(h=>h.id===anahtarId[b.anahtar]))katalog.sanalHavuz.push({id:anahtarId[b.anahtar],ad:b.ad,sira:1000+katalog.sanalHavuz.length});
 });
 return{...C.kayitHazirla({...ay,kaynak:'katalog'},anahtarId),id:`katalog:${ay.seviye}:${C.dersAnahtari(ay.dersAdi)}:${ay.egitimOgretimYili}`,kaynak:'katalog',_ayrisan:ay};
}
function katalogDizinYukle(){
 if(katalog.dizinIstendi)return;katalog.dizinIstendi=true;
 katalogDosya('index').then(d=>{katalog.dizin=d?.siniflar||{};kok&&ctx.yenile()}).catch(()=>{katalog.dizin={}});
}
function katalogYukle(n){
 const sn=C.sinifSayisi(n);if(!sn||katalog.siniflar.has(sn))return;
 katalog.siniflar.set(sn,'yukleniyor');
 katalogDosya(String(sn)).then(d=>{
  katalog.siniflar.set(sn,'hazir');
  const yeni=(d?.planlar||[]).map(katalogPlaniKur);
  katalog.planlar=[...katalog.planlar.filter(p=>Number(p.seviye)!==sn),...yeni];
  kok&&ctx.yenile();
 }).catch(()=>katalog.siniflar.set(sn,'yok'));
}
/* Hub kutusundaki ders sayısı: yüklü sınıfta gerçek liste, yüklenmemişte katalog dizini (okulda olanlar çift sayılmaz). */
function sinifAdedi(n,yl){
 const liste=planlar().filter(p=>Number(p.seviye)===n&&planYili(p)===yl).length;
 if(katalog.siniflar.get(n)==='hazir')return liste;
 const var_=new Set(okulPlanlari().map(C.planAnahtari));
 return liste+(katalog.dizin?.[n]||[]).filter(x=>!var_.has(x.anahtar)&&String(x.anahtar).endsWith(`|${yl}`)).length;
}
function dersPlani(dersAdi,sinif){
 const sn=C.sinifSayisi(sinif),k=C.dersAnahtari(dersAdi);if(!sn||!k)return null;
 const secili=new Set(secilenPlanlar().map(p=>p.id));
 return planlar().filter(p=>Number(p.seviye)===sn&&C.dersAnahtari(p.dersAdi)===k)
  .sort((a,b)=>Number(planYili(b)===C.okulYili())-Number(planYili(a)===C.okulYili())||Number(secili.has(b.id))-Number(secili.has(a.id)))[0]||null;
}

/* ---------- Ders sayfası için hesaplananlar ---------- */
function okulGunleri(){
 const secilen=arr('belirliGunler'),katalog=(()=>{try{return global.BelirliGunlerCatalog?.resmiGunler?.()||[]}catch(_){return[]}})();
 return[...secilen,...katalog];
}
function ozetSutunlari(plan,havuzu){
 const tum=C.sutunBilgileri(plan,havuzu),bul2=(...ks)=>{for(const k of ks){const c=tum.find(x=>x.key===k);if(c)return c}return null};
 let unite=bul2('unite_tema'),konu=bul2('icerik_cercevesi'),cikti=bul2('ogrenme_ciktilari','kazanim','kazanim_aciklamasi');
 if(!unite&&konu){unite=konu;konu=null}
 if(!unite&&!cikti&&tum[0])unite=tum[0];
 if(!cikti)cikti=tum.find(c=>c!==unite&&c!==konu&&c.key!=='belirli_gunler')||null;
 const belirli=bul2('belirli_gunler'),kullanilan=new Set([unite,konu,cikti,belirli].filter(Boolean).map(c=>c.id));
 return{unite,konu,cikti,belirli,diger:tum.filter(c=>!kullanilan.has(c.id)),tum};
}
function dersBaglami(plan){
 const havuzu=havuz();
 return{plan,havuzu,ozet:ozetSutunlari(plan,havuzu),gorunum:C.satirGorunumu(plan),simdi:C.buHafta(plan),gunler:okulGunleri(),tid:katalogMu(plan)?'':String(teacherId()||''),yazar:!katalogMu(plan)&&yazabilir()};
}
const metinler=t=>String(t||'').split('\n').map(s=>s.trim()).filter(Boolean);
const paragraflar=t=>metinler(t).map(s=>{const m=KOD_RE.exec(s);return m?`<p><b>${esc(m[1])}</b> ${esc(s.slice(m[0].length))}</p>`:`<p>${esc(s)}</p>`}).join('');
function not(plan,i){
 const tid=String(teacherId()||'');if(!tid)return'';
 const n=arr('yillikPlanNotlari').find(x=>x.id===`${tid}_${plan.id}`||(String(x.ogretmenId||'')===tid&&x.planId===plan.id));
 return String(n?.notlar?.[i]||'');
}

/* ---------- HTML ---------- */
const basMetni=(baslik,alt)=>`<small>${esc(alt)}</small><h2>${esc(baslik)}</h2>`;
function ustBilgi(simge,kucuk,baslik,aciklama,geri){
 return`<header class="ka-page-head ka-yp-head">${geri?'<button class="ka-icon-button ka-yp-back" type="button" data-yp-geri aria-label="Geri">←</button>':''}<span class="ka-page-head__icon" aria-hidden="true">${simge}</span><div>${basMetni(baslik,kucuk)}${aciklama?`<p>${esc(aciklama)}</p>`:''}</div></header>`;
}
function eylemler(){
 if(!yazabilir())return'';
 return`<div class="ka-yp-acts"><button class="ka-btn" type="button" data-yp-word>📄 Word’den içe aktar</button><button class="ka-btn ka-btn--secondary" type="button" data-yp-excel>📊 Excel’den içe aktar</button><button class="ka-btn ka-btn--secondary" type="button" data-yp-menu aria-label="Plan seçenekleri">⋯ Seçenekler</button></div>`;
}
function planKarti(p){
 const hafta=C.dersHaftasi(p),unite=C.uniteler(p,havuz()).length;
 return`<button class="ka-yp-ders" type="button" data-yp-ac="${esc(p.id)}"><span class="ka-yp-ders__icon" aria-hidden="true">${ikon(p.dersAdi)}</span><span class="ka-yp-ders__body"><strong>${esc(p.dersAdi)}</strong><small>${hafta} ders haftası${unite?` · ${unite} ünite/tema`:''}</small>${p.yayin?`<em>${esc(p.yayin)}</em>`:''}</span><span class="ka-yp-ders__go" aria-hidden="true">›</span></button>`;
}
function hubHtml(){
 const yl=yil(),liste=planlarim(),yilSec=yillar();
 const bu=liste.length?`<section class="ka-yp-card ka-yp-mine"><div class="ka-yp-card__bar"><h3>Planlarım</h3>${teacherId()?'<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-yp-secim>＋ Plan ekle / değiştir</button>':''}</div><div class="ka-yp-mine__list">${liste.map(p=>{const i=C.buHafta(p),g=i>=0?C.satirGorunumu(p)[i]:null,o=ozetSutunlari(p,havuz()),tema=g&&o.unite?metinler(g.r.degerler?.[o.unite.id])[0]:'';return`<button class="ka-yp-mine__item" type="button" data-yp-ac="${esc(p.id)}"><span aria-hidden="true">${ikon(p.dersAdi)}</span><b>${esc(planBasligi(p))}</b><small>${tema?`Bu hafta: ${esc(tema)}`:`${C.dersHaftasi(p)} ders haftası`}</small></button>`}).join('')}</div></section>`
  :(teacherId()?'<section class="ka-yp-card ka-yp-mine"><div class="ka-yp-card__bar"><h3>Planlarım</h3><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-yp-secim>＋ Plan ekle</button></div><p class="ka-muted">Derslerinizin planlarını burada toplayın; ders programınızdaki dersler otomatik görünür.</p></section>':'');
 const bolumler=gorunenKademeler().map(k=>`<section class="ka-yp-stage"><h3>${KADEMELER[k].ad}</h3><div class="ka-yp-tiles">${KADEMELER[k].siniflar.map(n=>{const adet=sinifAdedi(n,yl);return`<button class="ka-yp-tile${adet?'':' is-empty'}" type="button" data-yp-sinif="${n}"><b>${sinifAdi(n)}</b><span>${adet?`${adet} ders`:'Plan yok'}</span></button>`}).join('')}</div></section>`).join('');
 const yilSecici=yilSec.length>1?`<label class="ka-yp-year"><span>Eğitim yılı</span><select data-yp-yil>${yilSec.map(y=>`<option value="${esc(y)}"${y===yl?' selected':''}>${esc(y)}</option>`).join('')}</select></label>`:'';
 return`<section class="ka-stack ka-yp" data-yp-root>${ustBilgi('📚','MEB MÜFREDATI',`${yl} Yıllık Planlar`,'Sınıfını seç, dersin planını incele ve MEB biçimli Word olarak indir.',false)}${eylemler()}${bu}${bolumler}<div class="ka-yp-foot">${yilSecici}<label class="ka-check"><input type="checkbox" data-yp-tum${durum.tum?' checked':''}> Tüm sınıfları göster (1–12)</label></div></section>`;
}
function sinifListesiHtml(planListesi){
 const q=C.norm(durum.arama).trim(),f=durum.filtre;
 const uygun=planListesi.filter(p=>(f==='tumu'||planGrubu(p)===f)&&(!q||C.norm(`${p.dersAdi} ${p.yayin||''}`).includes(q)));
 if(!uygun.length)return`<div class="ka-empty">${planListesi.length?'Aramanıza uyan ders bulunamadı.':'Bu sınıf için yıllık plan henüz eklenmemiş.'}</div>`;
 return GRUPLAR.map(g=>{const l=uygun.filter(p=>planGrubu(p)===g.key);return l.length?`<section class="ka-yp-group"><h3>${g.ad}<span>${l.length}</span></h3><div class="ka-yp-dersler">${l.map(planKarti).join('')}</div></section>`:''}).join('');
}
function sinifHtml(){
 const n=durum.sinif,liste=sinifPlanlari(n),sayac=k=>k==='tumu'?liste.length:liste.filter(p=>planGrubu(p)===k).length;
 const chip=(k,ad)=>`<button class="ka-yp-chip${durum.filtre===k?' is-active':''}" type="button" data-yp-filtre="${k}">${ad}<span>${sayac(k)}</span></button>`;
 return`<section class="ka-stack ka-yp" data-yp-root>${ustBilgi('📚',yil(),`${sinifAdi(n)} Yıllık Planları`,`${liste.length} ders`,true)}${eylemler()}<div class="ka-yp-tools"><label class="ka-yp-search"><span aria-hidden="true">🔎</span><input type="search" class="ka-field-bare" data-yp-ara placeholder="Ders ara…" value="${esc(durum.arama)}" autocomplete="off"></label><div class="ka-yp-chips">${chip('tumu','Tümü')}${GRUPLAR.map(g=>chip(g.key,g.kisa)).join('')}</div></div><div class="ka-yp-liste" data-yp-liste>${sinifListesiHtml(liste)}</div><nav class="ka-yp-pills" aria-label="Sınıflar">${gorunenSiniflar().map(s=>`<button class="ka-yp-pill${s===n?' is-active':''}" type="button" data-yp-sinif="${s}">${s}. Sınıf</button>`).join('')}</nav></section>`;
}

/* Ders sayfası: satırlar */
function etiketler(b,g){
 return C.satirGunleri(b.plan,b.havuzu,g,b.gunler).map(t=>`<span class="ka-yp-tag">${esc(t)}</span>`).join('');
}
function satirHtml(b,g){
 const {plan,ozet}=b,acik=durum.acik.has(g.i),simdi=g.i===b.simdi,deger=c=>c?String(g.r.degerler?.[c.id]||'').trim():'';
 const hafta=`<div class="ka-yp-row__week"><b>${esc(g.hafta)}</b>${g.tarih?`<span>${esc(g.tarih)}</span>`:''}${g.saat?`<small>${esc(g.saat)}</small>`:''}${simdi?'<em>Bu hafta</em>':''}</div>`;
 if(g.ozel)return`<article class="ka-yp-row is-ozel${simdi?' is-now':''}" id="ypRow-${g.i}">${hafta}<div class="ka-yp-row__ozel">${esc(g.ozel)}${b.yazar?`<button class="ka-btn ka-btn--ghost ka-btn--sm" type="button" data-yp-satir="${g.i}" aria-label="Satırı düzenle">✎</button>`:''}</div></article>`;
 const etiket=etiketler(b,g),unite=deger(ozet.unite),konu=deger(ozet.konu),cikti=deger(ozet.cikti),notu=not(plan,g.i);
 const ayrinti=ozet.diger.map(c=>({c,v:deger(c)})).filter(x=>x.v);
 const panel=acik?`<div class="ka-yp-row__panel">${ayrinti.map(x=>`<section><h4>${esc(x.c.ad)}</h4>${paragraflar(x.v)}</section>`).join('')}${b.tid?`<section class="ka-yp-note"><h4>Notum</h4><textarea rows="3" data-yp-not="${g.i}" placeholder="Bu hafta için kendi notunuz…">${esc(notu)}</textarea><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-yp-not-kaydet="${g.i}">Notu kaydet</button></section>`:''}${b.yazar?`<div class="ka-yp-row__edit"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-yp-satir="${g.i}">✎ Satırı düzenle</button></div>`:''}</div>`:'';
 const ayrintiVar=!!(ayrinti.length||b.tid||b.yazar);
 return`<article class="ka-yp-row${simdi?' is-now':''}${acik?' is-open':''}" id="ypRow-${g.i}">${hafta}<div class="ka-yp-row__theme">${unite?`<strong>${esc(metinler(unite).join(' · '))}</strong>`:''}${konu?`<div class="ka-yp-row__text">${paragraflar(konu)}</div>`:''}</div><div class="ka-yp-row__out"><div class="ka-yp-row__text">${paragraflar(cikti)||'<p class="ka-muted">—</p>'}</div>${etiket?`<div class="ka-yp-tags">${etiket}</div>`:''}</div>${ayrintiVar?`<button class="ka-yp-row__more" type="button" data-yp-satir-ac="${g.i}" aria-expanded="${acik}">${acik?'Kapat ▴':notu?'Ayrıntı · 📝 ▾':'Ayrıntı ▾'}</button>`:''}${panel}</article>`;
}
function dersHtml(plan){
 const b=dersBaglami(plan),tid=b.tid,takipte=tid&&secilenPlanlar().some(p=>p.id===plan.id);
 const uniteler=C.uniteler(plan,b.havuzu),hafta=C.dersHaftasi(plan);
 const bilgi=bilgiDegerleri(plan);
 const alan=(ad,anahtar,tur='text',yer='')=>`<label class="ka-field"><span class="ka-field__label">${ad}</span><input type="${tur}" data-yp-bilgi="${anahtar}" value="${esc(bilgi[anahtar]||'')}" placeholder="${esc(yer)}" autocomplete="off"></label>`;
 const bilgiKarti=`<section class="ka-yp-card ka-yp-info"><div class="ka-yp-card__bar"><h3>Planda yazacak bilgiler</h3></div><p class="ka-muted">Word dosyasının başlığı ve imza bölümleri bu bilgilerle dolar. Boş bırakılan alanlar noktalı kalır.</p>${alan('Okul adı','okul')}${alan('Adınız soyadınız','ogretmen')}<label class="ka-field"><span class="ka-field__label">Zümre öğretmenleri</span><textarea rows="2" data-yp-bilgi="zumre" placeholder="Her satıra bir ad yazın">${esc(bilgi.zumre||'')}</textarea></label>${alan('Okul müdürü','mudur')}${alan('Onay tarihi','tarih','date')}<div class="ka-yp-info__acts"><button class="ka-btn" type="button" data-yp-indir="dolu">⬇ Bilgilerimle doldur ve indir</button><button class="ka-btn ka-btn--secondary" type="button" data-yp-indir="bos">Boş şablonu indir</button></div></section>`;
 const uniteKarti=uniteler.length?`<section class="ka-yp-card ka-yp-units"><div class="ka-yp-card__bar"><h3>Üniteler/temalar</h3><span class="ka-badge">${uniteler.length}</span></div><ol>${uniteler.map((u,i)=>`<li><span>${i+1}</span>${esc(u)}</li>`).join('')}</ol></section>`:'';
 const gorunum=b.gorunum,satirlar=gorunum.map(g=>satirHtml(b,g)).join('');
 const dipnot=(plan.dipnotlar||[]).filter(d=>d&&d.metin).map(d=>`<details class="ka-yp-note-card"><summary>${esc(d.ad||'Not')}</summary>${paragraflar(d.metin)}</details>`).join('');
 const tablo=`<section class="ka-yp-card ka-yp-table"><div class="ka-yp-table__bar"><h3>Hafta hafta öğrenme çıktıları</h3>${b.simdi>=0?'<button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-yp-buhafta>Bu hafta ↓</button>':''}</div><div class="ka-yp-table__head" aria-hidden="true"><span>Hafta</span><span>Ünite / Tema / Konu</span><span>Öğrenme çıktıları</span></div>${satirlar||'<div class="ka-empty">Bu planda henüz hafta satırı yok.</div>'}${plan.yilSonu?`<div class="ka-yp-end">${esc(plan.yilSonu)}</div>`:''}${b.yazar?'<div class="ka-yp-table__add"><button class="ka-btn ka-btn--secondary ka-btn--sm" type="button" data-yp-satir-ekle>＋ Hafta satırı ekle</button></div>':''}</section>${dipnot?`<section class="ka-yp-notes">${dipnot}</section>`:''}`;
 const rozetler=[hafta?`${hafta} ders haftası`:'',uniteler.length?`${uniteler.length} ünite/tema`:'',plan.yayin||'',(GRUPLAR.find(g=>g.key===planGrubu(plan))||{}).kisa||''].filter(Boolean);
 const katalogKutusu=katalogMu(plan)?`<section class="ka-yp-card ka-yp-catalog"><div><h3>Hazır MEB planı</h3><p class="ka-muted">Bu plan hazır katalogdan geliyor. Okulunuzun planı olarak kopyalarsanız düzenleyebilir, hafta notu ekleyebilir ve Planlarım’a alabilirsiniz.</p></div>${yazabilir()?'<button class="ka-btn" type="button" data-yp-kopyala>📋 Okul planı olarak kopyala</button>':''}</section>`:'';
 const araclar=`<div class="ka-yp-acts">${tid?`<button class="ka-btn ka-btn--secondary" type="button" data-yp-takip="${takipte?'cikar':'ekle'}">${takipte?'✓ Planlarımda':'＋ Planlarıma ekle'}</button>`:''}${b.yazar?'<button class="ka-btn ka-btn--secondary" type="button" data-yp-tanim>✎ Plan bilgilerini düzenle</button>':''}</div>`;
 return`<section class="ka-stack ka-yp" data-yp-root data-yp-plan="${esc(plan.id)}">${ustBilgi(ikon(plan.dersAdi),`${sinifAdi(plan.seviye)} · ${planYili(plan)}`,`${planBasligi(plan)} Yıllık Planı ${planYili(plan)}`,rozetler.join(' · '),true)}${araclar}${katalogKutusu}<div class="ka-yp-top">${bilgiKarti}${uniteKarti}</div>${tablo}</section>`;
}
/* ---------- Word için kişisel bilgiler ---------- */
function ogretmenAdi(id){const o=arr('ogretmenler').find(x=>String(x.id)===String(id));return o?`${o.ad||''} ${o.soyad||''}`.trim():''}
function varsayilanBilgi(plan){
 const okulRow=arr('okulBilgileri').find(x=>x.id==='ayarlar')||arr('okulBilgileri')[0]||{},kademe=kademeler().find(k=>k.key===kademeOf(plan.seviye));
 const kullanici=global.AKTIF_KULLANICI||global.AppStore?.get?.('session.user')||{};
 return{okul:kademe?.okulAdi||global.ReportEngine?.schoolInfo?.().okulAdi||String(okulRow.okulAdi||''),ogretmen:ogretmenAdi(teacherId())||String(kullanici.adSoyad||kullanici.ad||''),mudur:ogretmenAdi(okulRow.mudurId||okulRow.mudirId),zumre:'',tarih:today()};
}
/* Hatırlanan Word bilgileri öğretmenin kendi belgesinde (ogretmenYillikPlanSecimleri.tercihler) tutulur; öğretmen kaydı yoksa yalnız oturumda. */
let oturumTercih=null;
const tercihler=()=>secim()?.tercihler||oturumTercih||{};
function bilgiDegerleri(plan){
 const d=varsayilanBilgi(plan),kayit=tercihler().bilgi||{},k=C.dersAnahtari(plan.dersAdi);
 const out={...d};['okul','ogretmen','mudur','tarih'].forEach(a=>{if(kayit[a])out[a]=kayit[a]});
 if(kayit.zumre&&kayit.zumre[k])out.zumre=kayit.zumre[k];
 return{...out,...durum.bilgi};
}
function bilgiOku(){
 const out={};(kok?.querySelectorAll('[data-yp-bilgi]')||[]).forEach(e=>{out[e.dataset.ypBilgi]=String(e.value||'').trim()});
 return out;
}
/* Yalnızca varsayılandan farklı girilenler hatırlanır; böylece okul adı/müdür değişince eski değer takılı kalmaz. */
function bilgiyiHatirla(plan,b){
 const d=varsayilanBilgi(plan),onceki=tercihler(),kayit={...(onceki.bilgi||{})},k=C.dersAnahtari(plan.dersAdi);
 ['okul','ogretmen','mudur'].forEach(a=>{if(b[a]&&b[a]!==d[a])kayit[a]=b[a];else delete kayit[a]});
 if(b.tarih)kayit.tarih=b.tarih;
 kayit.zumre={...(kayit.zumre||{})};if(b.zumre)kayit.zumre[k]=b.zumre;else delete kayit.zumre[k];
 const yeni={...onceki,bilgi:kayit},tid=teacherId();
 if(!tid){oturumTercih=yeni;return}
 service().tercihKaydet(tid,yeni).catch(()=>{});
}
async function indir(plan,dolu,dugme){
 const eski=dugme?.textContent;if(dugme){dugme.disabled=true;dugme.textContent='Hazırlanıyor…'}
 try{
  const b=bilgiOku();if(dolu)bilgiyiHatirla(plan,b);
  const W=global.YillikPlanWord,blob=await W.olustur(plan,havuz(),b,dolu);
  await W.indir(blob,W.dosyaAdi(plan,dolu));
  toast?.(dolu?'Word dosyası hazırlandı.':'Boş şablon hazırlandı.');
 }catch(e){toast?.(e?.message||'Word dosyası oluşturulamadı.')}
 finally{if(dugme){dugme.disabled=false;dugme.textContent=eski}}
}

/* ---------- Gezinme ---------- */
const aktifPlan=()=>durum.sayfa==='ders'?bul(durum.planId):null;
function git(sayfa,ek={}){Object.assign(durum,{sayfa,acik:new Set(),bilgi:{}},ek);if(sayfa==='sinif')katalogYukle(durum.sinif);ctx.yenile()}
function hub(){Object.assign(durum,{sayfa:'hub',sinif:0,planId:'',arama:'',filtre:'tumu',acik:new Set(),bilgi:{}})}
function ac(id){const p=bul(id);if(!p)return;Object.assign(durum,{sayfa:'ders',planId:id,sinif:Number(p.seviye)||durum.sinif,acik:new Set(),bilgi:{},kaydir:false});ctx.yenile()}
function geri(){
 if(durum.sayfa==='ders'){const p=aktifPlan();Object.assign(durum,{sayfa:'sinif',planId:'',sinif:Number(p?.seviye)||durum.sinif,acik:new Set(),bilgi:{}});ctx.yenile();return true}
 if(durum.sayfa==='sinif'){Object.assign(durum,{sayfa:'hub',sinif:0,arama:'',filtre:'tumu'});ctx.yenile();return true}
 return false;
}
function dersiAc(dersAdi,sinif){
 hub();const p=dersPlani(dersAdi,sinif);
 if(p){Object.assign(durum,{sayfa:'ders',planId:p.id,sinif:Number(p.seviye),kaydir:true,yil:planYili(p)});return true}
 const sn=C.sinifSayisi(sinif);if(sn){Object.assign(durum,{sayfa:'sinif',sinif:sn});katalogYukle(sn)}
 return false;
}

/* ---------- Çizim ve olaylar ---------- */
function render(){
 katalogDizinYukle();
 if(durum.sayfa==='ders'){const p=aktifPlan();if(p)return{count:C.dersHaftasi(p),html:dersHtml(p)};Object.assign(durum,{sayfa:'sinif',planId:''});if(!durum.sinif)durum.sayfa='hub'}
 if(durum.sayfa==='sinif')return{count:sinifPlanlari(durum.sinif).length,html:sinifHtml()};
 return{count:planlar().filter(p=>planYili(p)===yil()).length,html:hubHtml()};
}
function satirYenile(i){
 const p=aktifPlan();if(!p||!kok)return;const b=dersBaglami(p),g=b.gorunum[i],el=kok.querySelector(`#ypRow-${i}`);if(!g||!el)return;
 const t=document.createElement('div');t.innerHTML=satirHtml(b,g);el.replaceWith(t.firstElementChild);
}
function buHaftayaGit(){
 const p=aktifPlan();if(!p||!kok)return false;const i=C.buHafta(p);if(i<0)return false;
 kok.querySelector(`#ypRow-${i}`)?.scrollIntoView({behavior:'smooth',block:'center'});return true;
}
async function notKaydet(i,dugme){
 const p=aktifPlan(),tid=teacherId(),alan=kok?.querySelector(`[data-yp-not="${i}"]`);if(!p||!tid||!alan)return;
 dugme.disabled=true;
 try{await service().notKaydet(tid,p.id,String(i),alan.value.trim());toast?.('Not kaydedildi.')}
 catch(e){toast?.(e?.message==='yetkisiz'?'Bu işlem için yetkiniz yok.':'Not kaydedilemedi.')}
 finally{dugme.disabled=false}
}
async function takip(plan,ekle){
 const tid=teacherId();if(!tid)return toast?.('Profilinize bağlı bir öğretmen kaydı bulunamadı.');
 const ids=new Set(secilenPlanlar().map(p=>p.id));ekle?ids.add(plan.id):ids.delete(plan.id);
 try{await service().secimKaydet(tid,[...ids]);toast?.(ekle?'Planlarıma eklendi.':'Planlarımdan çıkarıldı.')}catch(_){toast?.('Kaydedilemedi.')}
}
function tikla(e){
 const hedef=e.target.closest('[data-yp-ac],[data-yp-sinif],[data-yp-geri],[data-yp-filtre],[data-yp-satir-ac],[data-yp-satir],[data-yp-satir-ekle],[data-yp-indir],[data-yp-buhafta],[data-yp-not-kaydet],[data-yp-takip],[data-yp-tanim],[data-yp-word],[data-yp-excel],[data-yp-menu],[data-yp-secim],[data-yp-kopyala]');
 if(!hedef||!kok?.contains(hedef))return;const d=hedef.dataset,p=aktifPlan();
 if(d.ypAc!==undefined)return ac(d.ypAc);
 if(d.ypSinif!==undefined)return git('sinif',{sinif:Number(d.ypSinif),arama:'',filtre:'tumu'});
 if(d.ypGeri!==undefined)return void geri();
 if(d.ypFiltre!==undefined){durum.filtre=d.ypFiltre;return ctx.yenile()}
 if(d.ypSatirAc!==undefined){const i=Number(d.ypSatirAc);durum.acik.has(i)?durum.acik.delete(i):durum.acik.add(i);return satirYenile(i)}
 if(d.ypIndir&&p)return void indir(p,d.ypIndir==='dolu',hedef);
 if(d.ypBuhafta!==undefined)return void buHaftayaGit();
 if(d.ypNotKaydet!==undefined)return void notKaydet(Number(d.ypNotKaydet),hedef);
 if(d.ypTakip&&p)return void takip(p,d.ypTakip==='ekle');
 if(d.ypSatir!==undefined&&p)return dialog.satir(p.id,Number(d.ypSatir));
 if(d.ypSatirEkle!==undefined&&p)return dialog.satir(p.id,null);
 if(d.ypTanim!==undefined&&p)return dialog.tanim(p.id);
 if(d.ypWord!==undefined)return dialog.wordIceAktar();
 if(d.ypExcel!==undefined)return excel.ac();
 if(d.ypMenu!==undefined)return dialog.menu();
 if(d.ypSecim!==undefined)return dialog.secim();
 if(d.ypKopyala!==undefined&&p)return void dialog.katalogKopyala(p,hedef);
}
function degisti(e){
 const t=e.target;
 if(t.matches?.('[data-yp-tum]')){durum.tum=t.checked;ctx.yenile()}
 else if(t.matches?.('[data-yp-yil]')){durum.yil=t.value;ctx.yenile()}
}
function girdi(e){
 const t=e.target;
 if(t.matches?.('[data-yp-ara]')){
  durum.arama=t.value;const liste=kok.querySelector('[data-yp-liste]');if(liste)liste.innerHTML=sinifListesiHtml(sinifPlanlari(durum.sinif));
 }else if(t.matches?.('[data-yp-bilgi]'))durum.bilgi[t.dataset.ypBilgi]=t.value;
}
function bind(out){
 if(!out)return;kok=out.querySelector('[data-yp-root]')||out;
 if(!out.__ypBagli){
  out.__ypBagli=true;
  out.addEventListener('click',tikla);out.addEventListener('change',degisti);out.addEventListener('input',girdi);
  out.addEventListener('focusout',()=>{if(bekleyen)setTimeout(()=>{if(bekleyen&&!korunacak()){bekleyen=false;ctx.yenile()}},120)});
 }
 const konum=`${durum.sayfa}|${durum.sinif}|${durum.planId}`,degisti2=konum!==sonKonum;sonKonum=konum;
 if(durum.kaydir){durum.kaydir=false;requestAnimationFrame(()=>{if(!buHaftayaGit())basaDon()})}
 else if(degisti2)basaDon();
}
/* Sayfa değişince (hub → sınıf → ders) görünüm en üstten başlar; veri yenilemesinde kaydırma korunur. */
function basaDon(){
 try{(document.scrollingElement||document.documentElement).scrollTop=0;document.getElementById('v2ModuleRoot')?.scrollTo?.(0,0)}catch(_){}
}
/* Kullanıcı bir alana yazarken veri değişikliği ekranı yeniden çizmesin (imleç/odak kaybolmasın). */
function korunacak(){
 const a=document.activeElement;
 if(a&&kok&&kok.contains(a)&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&a.type!=='checkbox'){bekleyen=true;return true}
 return false;
}
function unmount(){kok=null;bekleyen=false}
const api={render,bind,hub,dersiAc,ac,geri,korunacak,unmount,bul,havuz:okulHavuzu,planlar:okulPlanlari,planYili,yil,kademeler,secilenPlanlar,
 get sayfa(){return durum.sayfa},get aktifPlanId(){return durum.planId},satirYenile};
excel=global.YillikPlanExcel.create(ctx);
dialog=global.YillikPlanDialog.create({...ctx,ui:api,yazabilir});
return api;
}
global.YillikPlanUI={create,KADEMELER,GRUPLAR,TUM_SINIFLAR};
})(window);

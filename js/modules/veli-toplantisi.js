/* Koruk Asistan — Veli Toplantısı
 * Sınıfı seçin; veli toplantısı dilekçesi, tutanağı, imza sirküsü ve davet pusulası A4 olarak hazır gelir; tutanak Word (.docx) olarak da indirilir.
 * Gündem maddeleri, görüşme metinleri ve alınan kararlar ekranda düzenlenebilir (ekle / sil / sırala / metni değiştir); değişiklikler sınıf başına
 * hesabın tercih belgesine (KaPrefs) kaydedilir, dilekçe ve tutanak bunları kullanır. Düzenlenmeyen yerde veli-toplantisi-veri.js'teki hazır metin geçerlidir.
 * Öğrenci ve veli adları uygulamadaki öğrenci listesinden (veliler), okul / öğretmen / müdür adı okul ve kadro kayıtlarından alınır.
 * Çıktı merkezi ReportEngine ile yazdırılır / PDF alınır; kâğıt stili css/design-system-base.css (.vtp-*). Word: veli-toplantisi-word.js.
 * Telefon numarası imza sirküsüne yazılmaz (kâğıt tüm velilerin önünden geçer).
 */
(function(global){
'use strict';
if(global.VeliToplantisiModule)return;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
if(!global.SinifBaglam)throw new Error('Sınıf bağlamı yüklenmeden Veli Toplantısı açılamaz.');
const {adBicimi,duzeyOf,egitimYili,okulAdi,okulMuduru,siniflar,sinifBul,ogrencilerOf,sinifOgretmeni}=global.SinifBaglam;
const veri=()=>global.VeliToplantisiVeri||{yil:'',donem:'',duzeyler:{}};
const NOKTA='…………………',AYRAC=' / ',TARIH_BOS=['……','……','20……'].join(AYRAC),SAAT_BOS='………';
const WORD_CORE='js/modules/ogretmen-dosyasi-core.js?v=3',WORD_BELGE='js/modules/veli-toplantisi-word.js?v=1';

/* ── biçimler ── */
const tarihMetni=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));return m?[m[3],m[2],m[1]].join(AYRAC):TARIH_BOS};
const saatMetni=s=>/^\d{1,2}:\d{2}$/.test(String(s||''))?String(s):SAAT_BOS;
/* "5/A" → "5/A sınıfı", "5. Sınıf A" → olduğu gibi. */
const sinifMetni=l=>/sınıf/i.test(l)?l:`${l} sınıfı`;
const sinifBuyuk=l=>(/sınıf/i.test(l)?l:`${l} SINIFI`).toLocaleUpperCase('tr');

/* ── düzenlenebilir içerik ──
 * İçerik = gündem maddeleri (her birinin görüşme metniyle: [{b: başlık, p: [paragraf…]}]) + alınan kararlar.
 * Hazır metin veri dosyasından gelir; öğretmen değiştirince yalnız değiştirdiği parça (g: maddeler, k: kararlar) tam kopya olarak saklanır: {g, k, t}. */
const OGRETMEN_YER='{OGRETMEN}';
const maddeKopya=m=>({b:String(m?.b??''),p:(Array.isArray(m?.p)?m.p:[]).map(x=>String(x??''))});
function ozelTemizle(x){
 if(!x||typeof x!=='object')return null;
 const g=Array.isArray(x.g)?x.g.filter(m=>m&&typeof m==='object').map(maddeKopya):null;
 const k=Array.isArray(x.k)?x.k.map(s=>String(s??'')):null;
 if(!g&&!k)return null;
 const t=Number(x.t);
 return{g,k,t:Number.isFinite(t)?t:0};
}
/* Bir düzeyin etkin içeriği (kopya): özelleştirilmişse onu, değilse hazır metni verir. */
function icerik(duzey){
 const d=veri().duzeyler[duzey]||{},o=S?.ozel;
 return{maddeler:(o?.g||d.gorusme||[]).map(maddeKopya),kararlar:[...(o?.k||d.kararlar||[])].map(String),ozel:!!(o?.g||o?.k)};
}
const doluMaddeler=l=>l.filter(m=>m.b.trim());
const doluKararlar=l=>l.filter(x=>x.trim());

/* ── belge içerikleri: c = bağlam (ctx) ── */
const imzaAdi=c=>adBicimi(c.ogretmen)||NOKTA;
const ogretmenUnvani=c=>veri().duzeyler[c.duzey]?.unvan||'Sınıf Öğretmeni';
const gundemListe=c=>`<ol class="vtp-liste">${doluMaddeler(icerik(c.duzey).maddeler).map(m=>`<li>${esc(m.b.trim())}</li>`).join('')}</ol>`;
const baslikKutusu=(c,baslik)=>`<header class="vtp-kutu"><span class="vtp-kutu__yil">${esc(c.yil)} EĞİTİM-ÖĞRETİM YILI</span><strong class="vtp-kutu__okul">${esc((c.okul||NOKTA).toLocaleUpperCase('tr'))}</strong><strong class="vtp-kutu__sinif">${esc(sinifBuyuk(c.sinif))}</strong><strong class="vtp-kutu__baslik">${esc(baslik)}</strong></header>`;
const imzaBlok=(ad,unvan)=>`<div class="vtp-imza"><span>${esc(ad)}</span><b>${esc(unvan)}</b></div>`;
const mudurBlok=(c,ust)=>`<div class="vtp-imza">${ust?`<b>${esc(ust)}</b>`:''}<span>${TARIH_BOS}</span><span>${esc(adBicimi(c.mudur)||NOKTA)}</span><b>Okul Müdürü</b></div>`;

function dilekce(c){
 return`<article class="vtp-paper vtp-dilekce"><h1 class="vtp-ust">${esc((c.okul||NOKTA).toLocaleUpperCase('tr'))} MÜDÜRLÜĞÜNE</h1>
<p class="vtp-govde">${esc(c.yil)} Eğitim Öğretim Yılı ${esc(veri().donem)} veli toplantısını, aşağıdaki gündem maddelerini görüşmek üzere ${esc(tarihMetni(c.tarih))} tarihinde saat ${esc(saatMetni(c.saat))} itibarıyla ${esc(sinifMetni(c.sinif))} velileriyle yapmak istiyorum.</p>
<p class="vtp-govde">Gereğini bilgilerinize arz ederim.</p>
<h2 class="vtp-baslik">GÜNDEM MADDELERİ</h2>${gundemListe(c)}
<div class="vtp-imzalar vtp-imzalar--alt">${imzaBlok(imzaAdi(c),ogretmenUnvani(c))}${mudurBlok(c,'OLUR')}</div></article>`;
}

/* Tutanak verisi: ekran, yazdırma ve Word aynı modelden üretilir ({OGRETMEN} yer tutucusu unvan + adla açılır, ad boşsa noktalı). */
const ogretmenMetni=c=>`${ogretmenUnvani(c)} ${imzaAdi(c)}`;
const yerAc=(metin,adi)=>String(metin).split(OGRETMEN_YER).join(adi);
function tutanakModeli(c){
 const ic=icerik(c.duzey),adi=ogretmenMetni(c);
 return{yil:c.yil,okul:c.okul||NOKTA,sinif:c.sinif,baslik:`${veri().donem.toLocaleUpperCase('tr')} VELİ TOPLANTI TUTANAĞI`,unvan:ogretmenUnvani(c),ogretmen:imzaAdi(c),
  tarih:tarihMetni(c.tarih),saat:saatMetni(c.saat),mudur:adBicimi(c.mudur)||NOKTA,tarihBos:TARIH_BOS,
  maddeler:doluMaddeler(ic.maddeler).map(m=>({b:m.b.trim(),p:m.p.map(p=>yerAc(p,adi)).filter(p=>p.trim())})),
  gundem:doluMaddeler(ic.maddeler).map(m=>m.b.trim()),kararlar:doluKararlar(ic.kararlar).map(x=>x.trim())};
}
function tutanak(c){
 const m=tutanakModeli(c);
 const gorusme=m.maddeler.map((g,i)=>`<section class="vtp-madde"><h3 class="vtp-alt">${i+1}. ${esc(g.b)}</h3>${g.p.map(p=>`<p>${esc(p)}</p>`).join('')}</section>`).join('');
 return`<article class="vtp-paper vtp-tutanak">${baslikKutusu(c,m.baslik)}
<table class="vtp-bilgi"><tbody><tr><th>SINIF / ŞUBE</th><th>TARİH</th><th>SAAT</th><th>${esc(m.unvan.toLocaleUpperCase('tr'))}</th></tr><tr><td>${esc(c.sinif)}</td><td>${esc(m.tarih)}</td><td>${esc(m.saat)}</td><td>${esc(m.ogretmen)}</td></tr></tbody></table>
<h2 class="vtp-baslik">GÜNDEM MADDELERİ</h2>${gundemListe(c)}
<h2 class="vtp-baslik">GÜNDEM MADDELERİNİN GÖRÜŞÜLMESİ</h2>${gorusme}
<section class="vtp-kararlar">${baslikKutusu(c,m.baslik)}<h2 class="vtp-baslik">ALINAN KARARLAR</h2><ol class="vtp-liste">${m.kararlar.map(x=>`<li>${esc(x)}</li>`).join('')}</ol>
<div class="vtp-imzalar">${imzaBlok(m.ogretmen,m.unvan)}${mudurBlok(c,'UYGUNDUR')}</div></section></article>`;
}

function imzaSirkusu(c){
 const liste=c.ogrenciler.length?c.ogrenciler:Array.from({length:Math.max(1,Number(c.bosSatir)||30)},()=>({}));
 const govde=liste.map((o,i)=>`<tr><td class="vtp-no">${i+1}</td><td>${esc(o.ad||'')}</td><td>${esc(c.veliAdlari?o.veli||'':'')}</td><td>${esc(c.veliAdlari?o.yakinlik||'':'')}</td><td></td></tr>`).join('');
 return`<article class="vtp-paper vtp-sirku">${baslikKutusu(c,'VELİ TOPLANTISI İMZA SİRKÜSÜ')}
<table class="vtp-tablo"><thead><tr><th class="vtp-c-no">No</th><th>Öğrenci Adı</th><th>Veli Adı Soyadı</th><th class="vtp-c-yak">Yakınlık Durumu</th><th class="vtp-c-imza">İmza</th></tr></thead><tbody>${govde}</tbody></table>
<div class="vtp-imzalar">${imzaBlok(imzaAdi(c),ogretmenUnvani(c))}</div></article>`;
}

/* Davet pusulası: her öğrenci için bir kart — okul logosu, okul / yıl başlığı, sınıf-tarih-saat şeridi, davet metni; öğretmen adı sağda alt alta ortalı. */
function pusula(c){
 const logo=global.ReportEngine?.logoUrl?.()||'assets/logo.png';
 const metin=`${c.yil} Eğitim Öğretim Yılı ${veri().donem} ${sinifMetni(c.sinif)} veli toplantımız ${tarihMetni(c.tarih)} tarihinde saat ${saatMetni(c.saat)} itibarıyla yapılacaktır. Çocuğumuzun eğitimi için önemli olan bu toplantıya katılımınızı önemle rica ederiz.`;
 const adlar=c.ogrenciler.length?c.ogrenciler.map(o=>o.ad):Array.from({length:6},()=>'');
 const serit=`<div class="vtp-pbilgi"><span><small>SINIF / ŞUBE</small><b>${esc(c.sinif||NOKTA)}</b></span><span><small>TARİH</small><b>${esc(tarihMetni(c.tarih))}</b></span><span><small>SAAT</small><b>${esc(saatMetni(c.saat))}</b></span></div>`;
 const dilim=a=>`<div class="vtp-pusula"><header class="vtp-pusula__ust"><img class="vtp-logo" src="${esc(logo)}" alt=""><div class="vtp-pusula__baslik"><small>${esc(c.yil)} EĞİTİM-ÖĞRETİM YILI</small><strong>${esc((c.okul||NOKTA).toLocaleUpperCase('tr'))}</strong><b>VELİ TOPLANTISI DAVETİ</b></div></header>${serit}<b class="vtp-pusula__selam">Sayın Velimiz,</b>${a?`<small class="vtp-pusula__ogr">Öğrenci: <b>${esc(a)}</b></small>`:''}<p>${esc(metin)}</p><div class="vtp-imza vtp-imza--sag"><span>${esc(imzaAdi(c))}</span><b>${esc(ogretmenUnvani(c))}</b></div></div>`;
 return`<article class="vtp-paper vtp-pusulalar">${adlar.map(dilim).join('')}</article>`;
}

const BELGELER=[
 {k:'dilekce',ad:'Dilekçe',acik:'Müdürlüğe veli toplantısı dilekçesi ve gündem maddeleri',yap:dilekce},
 {k:'tutanak',ad:'Tutanak',acik:'Gündem, görüşme metinleri ve alınan kararlar; Word olarak da indirilir',yap:tutanak,word:true},
 {k:'imza',ad:'İmza Sirküsü',acik:'Öğrenci ve veli imza listesi',yap:imzaSirkusu},
 {k:'pusula',ad:'Davet Pusulası',acik:'Velilere gönderilecek davet; öğrenci başına bir tane, okul logosuyla',yap:pusula}
];
const belge=(k,c)=>BELGELER.find(b=>b.k===k)?.yap(c)||'';

/* ── uygulama verisi: sınıflar, öğrenciler, kadro ── */
let S=null,unsubs=[],offPrefs=null,pushT=0;
const blank=()=>({sinifId:'',duzey:'',sube:'',tarih:'',saat:'',ogretmen:'',mudur:'',yon:'dikey',veliAdlari:true,bosSatir:30,ozel:null,ozelT:0,edAcik:false,acikMadde:new Set()});
function ensure(){if(!S){S=blank();S.mudur=okulMuduru()}return S}
const duzeyi=()=>{const s=ensure(),c=sinifBul(s.sinifId);return c?duzeyOf(c.ad)||Number(s.duzey)||0:Number(s.duzey)||0};
function ctx(){
 const s=ensure(),c=sinifBul(s.sinifId),duzey=duzeyi();
 const etiket=c?c.ad:duzey?`${duzey}/${s.sube.trim()||'…'}`:'';
 return{yil:egitimYili(),okul:okulAdi(duzey),sinif:etiket,duzey,tarih:s.tarih,saat:s.saat,ogretmen:s.ogretmen,mudur:s.mudur,
  ogrenciler:c?ogrencilerOf(c.id):[],veliAdlari:s.veliAdlari,bosSatir:s.bosSatir};
}
/* Hazır tutanak metni yalnız yazıldığı eğitim yılında kullanılır (2026/70 sayılı Genelge göndermeleri yıla özgüdür); öğretmen kendi metnini yazdıysa sınırlama yoktur. */
function tutanakDurumu(duzey){
 if(!duzey)return'Önce sınıfı seçin.';
 if(veri().yil!==egitimYili()&&!icerik(duzey).ozel)return`Tutanak metinleri ${veri().yil} eğitim-öğretim yılı içindir.`;
 return'';
}
const belgeDurumu=(k,duzey)=>!duzey?'Önce sınıfı seçin.':k==='tutanak'?tutanakDurumu(duzey):'';

/* ── düzenlemelerin saklanması: sınıf + eğitim yılı + dönem başına, yerelde ve hesapta (KaPrefs) ── */
const slug=s=>String(s||'').replace(/ı/g,'i').replace(/İ/g,'I').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^A-Za-z0-9]+/g,'_').replace(/^_+|_+$/g,'');
function ozelAnahtar(){
 const s=ensure(),kimlik=s.sinifId&&s.sinifId!=='__elle'?s.sinifId:`d${duzeyi()}_${s.sube.trim()}`;
 return`veliToplantisi_${slug(egitimYili())}_${slug(veri().donem)}_${slug(kimlik)}`;
}
/* Saklanan değer: {g, k, t}; "hazır metne dön" yalnız {t} bırakır (silme izi), böylece öteki cihazlarda da sıfırlanır. */
function ozelOku(j){let x=null;try{x=JSON.parse(j||'null')}catch(_){}return{o:ozelTemizle(x),t:Number(x?.t)||0}}
function ozelYukle(){const{o,t}=ozelOku(global.KaPrefs?.get?.(ozelAnahtar(),'')),s=ensure();s.ozel=o;s.ozelT=t}
function ozelKaydet(){
 const s=ensure(),o=s.ozel;if(!o)return;
 o.t=s.ozelT=Date.now();
 const anahtar=ozelAnahtar(),j=JSON.stringify(o);
 global.KaPrefs?.set?.(anahtar,j);
 clearTimeout(pushT);pushT=setTimeout(()=>global.KaPrefs?.remoteSet?.({[anahtar]:j}),700);
}
/* Başka cihazdaki daha yeni düzenleme (ya da sıfırlama) gelirse yerelin yerine geçer. */
function uzakGeldi(x){
 if(!document.querySelector('[data-vtp-page]'))return temizle();
 const a=ozelAnahtar(),j=x?.[a];if(!j)return;
 const{o,t}=ozelOku(j),s=ensure();
 if(t>(s.ozelT||0)){s.ozel=o;s.ozelT=t;global.KaPrefs?.set?.(a,j);render()}
}

/* Düzenleme işlemleri (ekran bunları çağırır): yalnız değiştirilen parça özelleştirilmiş sayılır. */
const D={
 maddeler(fn){const s=ensure(),l=icerik(duzeyi()).maddeler;fn(l);s.ozel={g:l,k:s.ozel?.k||null,t:0};ozelKaydet()},
 kararlar(fn){const s=ensure(),l=icerik(duzeyi()).kararlar;fn(l);s.ozel={g:s.ozel?.g||null,k:l,t:0};ozelKaydet()},
 baslik(i,v){this.maddeler(l=>{if(l[i])l[i].b=String(v??'').slice(0,200)})},
 /* Görüşme metni: boş satırla ayrılan paragraflar; yazılan öğretmen adı yer tutucuya geri çevrilir (ad sonradan değişirse metin de değişir). */
 metin(i,v){
  const adi=ogretmenMetni(ctx());
  this.maddeler(l=>{if(l[i])l[i].p=String(v??'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean).map(x=>x.split(adi).join(OGRETMEN_YER))});
 },
 ekle(){let n=0;this.maddeler(l=>{l.push({b:'',p:[]});n=l.length-1});ensure().acikMadde.add(n);return n},
 sil(i){this.maddeler(l=>{l.splice(i,1)});ensure().acikMadde=new Set()},
 tasi(i,yon){
  const j=i+yon,n=icerik(duzeyi()).maddeler.length;
  if(j<0||j>=n)return false;
  this.maddeler(l=>{[l[i],l[j]]=[l[j],l[i]]});
  const a=ensure().acikMadde,ai=a.has(i),aj=a.has(j);a.delete(i);a.delete(j);if(ai)a.add(j);if(aj)a.add(i);
  return true;
 },
 ac(i){const a=ensure().acikMadde;a.has(i)?a.delete(i):a.add(i)},
 karar(i,v){this.kararlar(l=>{if(i<l.length)l[i]=String(v??'').slice(0,600)})},
 kararEkle(){let n=0;this.kararlar(l=>{l.push('');n=l.length-1});return n},
 kararSil(i){this.kararlar(l=>{l.splice(i,1)})},
 /* Hazır metne dönüş: kayıt silinir. */
 sifirla(){const s=ensure(),a=ozelAnahtar(),j=JSON.stringify({t:Date.now()});s.ozel=null;s.ozelT=JSON.parse(j).t;s.acikMadde=new Set();clearTimeout(pushT);global.KaPrefs?.set?.(a,j);global.KaPrefs?.remoteSet?.({[a]:j})}
};

/* ── ekran ── */
const field=(label,html)=>`<label class="ka-field"><span class="ka-field__label">${esc(label)}</span>${html}</label>`;
const input=(key,type='text',ph='')=>`<input class="ka-input" type="${type}" value="${esc(ensure()[key])}" placeholder="${esc(ph)}" data-vtp="${key}" autocomplete="off">`;
function sinifSecici(){
 const s=ensure(),{liste,own}=siniflar(),opt=c=>`<option value="${esc(c.id)}" ${c.id===s.sinifId?'selected':''}>${esc(c.ad)}</option>`;
 const benim=liste.filter(c=>own.has(c.id)),digerleri=liste.filter(c=>!own.has(c.id));
 const gruplu=benim.length&&digerleri.length;
 return`<select class="ka-input" data-vtp="sinifId"><option value="">${liste.length?'Seçiniz':'Kayıtlı sınıf yok'}</option>${gruplu?`<optgroup label="Sınıflarım">${benim.map(opt).join('')}</optgroup><optgroup label="Diğer sınıflar">${digerleri.map(opt).join('')}</optgroup>`:liste.map(opt).join('')}<option value="__elle" ${s.sinifId==='__elle'?'selected':''}>Listede yok, elle yazacağım</option></select>`;
}
function sinifKarti(){
 const s=ensure(),c=sinifBul(s.sinifId),elle=s.sinifId==='__elle',duzeyGerek=elle||(c&&!duzeyOf(c.ad)),n=c?ogrencilerOf(c.id).length:0;
 const duzeySecici=`<select class="ka-input" data-vtp="duzey"><option value="">Seçiniz</option>${[1,2,3,4,5,6,7,8].map(x=>`<option value="${x}" ${Number(s.duzey)===x?'selected':''}>${x}. sınıf</option>`).join('')}</select>`;
 const bilgi=c?(n?`${n} öğrenci uygulamadaki listeden gelecek.`:'Bu sınıfta kayıtlı öğrenci yok; imza sirküsü boş satırlarla hazırlanır.'):elle?'Sınıf düzeyini seçin; imza sirküsü boş satırlarla hazırlanır.':'';
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>Sınıf</strong><div class="ka-grid">${field('Sınıf / şube',sinifSecici())}${duzeyGerek?field('Sınıf düzeyi',duzeySecici):''}${elle?field('Şube (örn. A)',input('sube','text','A')):''}</div>${bilgi?`<small class="ka-muted">${esc(bilgi)}</small>`:''}</div></article>`;
}
function toplantiKarti(){
 const u=ogretmenUnvani({duzey:duzeyi()});
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>Toplantı</strong><div class="ka-grid">${field('Toplantı tarihi',input('tarih','date'))}${field('Saat',input('saat','time'))}${field(u,input('ogretmen','text','Adı Soyadı'))}${field('Okul müdürü',input('mudur','text','Adı Soyadı'))}</div><small class="ka-muted">Boş bıraktığınız tarih ve saat çıktıda noktalı kalır; elle yazabilirsiniz.</small></div></article>`;
}
function belgeSatiri(b,duzey){
 const s=ensure(),neden=belgeDurumu(b.k,duzey),secenek=b.k==='imza'?`<div class="vtp-sec">
  <label class="ka-field"><span class="ka-field__label">Kâğıt yönü</span><select class="ka-input" data-vtp="yon"><option value="dikey" ${s.yon==='dikey'?'selected':''}>Dikey (A4)</option><option value="yatay" ${s.yon==='yatay'?'selected':''}>Yatay (A4)</option></select></label>
  <label class="vtp-onay"><input type="checkbox" data-vtp="veliAdlari" ${s.veliAdlari?'checked':''}><span>Veli adı ve yakınlık önceden yazılsın</span></label>
  ${sinifBul(s.sinifId)&&ogrencilerOf(s.sinifId).length?'':`<label class="ka-field"><span class="ka-field__label">Boş satır sayısı</span><input class="ka-input" type="number" min="1" max="60" value="${esc(s.bosSatir)}" data-vtp="bosSatir"></label>`}</div>`:'';
 const dugmeler=`${b.word?`<button class="ka-btn ka-btn--secondary" type="button" data-vtp-indir="${b.k}" ${neden?'disabled':''}>⬇ Word indir</button>`:''}<button class="ka-btn" type="button" data-vtp-yazdir="${b.k}" ${neden?'disabled':''}>🖨 Yazdır / PDF</button>`;
 return`<li class="vtp-belge" data-vtp-belge="${b.k}"><div class="vtp-belge__ad"><strong>${esc(b.ad)}</strong><small class="ka-muted">${esc(neden||b.acik)}</small></div><div class="vtp-belge__dugmeler">${dugmeler}</div>${secenek}</li>`;
}

const ozetMetni=duzey=>{const ic=icerik(duzey);return`${doluMaddeler(ic.maddeler).length} gündem maddesi · ${doluKararlar(ic.kararlar).length} karar${ic.ozel?' · düzenlendi':''}`};
/* Gündem ve tutanak metni düzenleyici (açılır kart): gündem maddeleri + görüşme metinleri, alınan kararlar. */
function duzenleyici(duzey){
 if(!duzey)return'';
 const s=ensure(),ic=icerik(duzey),adi=ogretmenMetni(ctx());
 const dugme=(eylem,i,ad,etiket,ek='')=>`<button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-vtp-eylem="${eylem}" data-i="${i}" aria-label="${esc(ad)}" ${ek}>${etiket}</button>`;
 const maddeler=ic.maddeler.map((m,i)=>{
  const acik=s.acikMadde.has(i);
  return`<li class="vtp-ed__madde"><div class="vtp-ed__satir"><span class="vtp-ed__no">${i+1}</span><input class="ka-input" type="text" maxlength="200" value="${esc(m.b)}" placeholder="Gündem maddesi" data-vtp-ed="baslik" data-i="${i}" aria-label="${i+1}. gündem maddesi" autocomplete="off"><span class="vtp-ed__dugmeler">${dugme('yukari',i,'Yukarı taşı','↑',i?'':'disabled')}${dugme('asagi',i,'Aşağı taşı','↓',i<ic.maddeler.length-1?'':'disabled')}${dugme('ac',i,acik?'Görüşme metnini kapat':'Görüşme metnini aç',acik?'Metni kapat':'Metni aç',`aria-expanded="${acik}"`)}${dugme('sil',i,'Maddeyi sil','×')}</span></div>${acik?`<textarea class="ka-input vtp-ed__metin" rows="7" data-vtp-ed="metin" data-i="${i}" aria-label="${i+1}. maddenin görüşme metni" placeholder="Bu madde tutanakta nasıl görüşüldü? Paragrafları boş satırla ayırın.">${esc(m.p.map(p=>yerAc(p,adi)).join('\n\n'))}</textarea>`:''}</li>`;
 }).join('');
 const kararlar=ic.kararlar.map((k,i)=>`<li class="vtp-ed__madde"><div class="vtp-ed__satir"><span class="vtp-ed__no">${i+1}</span><textarea class="ka-input vtp-ed__karar" rows="2" maxlength="600" data-vtp-ed="karar" data-i="${i}" aria-label="${i+1}. karar" placeholder="Alınan karar">${esc(k)}</textarea><span class="vtp-ed__dugmeler">${dugme('karar-sil',i,'Kararı sil','×')}</span></div></li>`).join('');
 return`<article class="ka-card"><details class="vtp-ed" data-vtp-ed-ac ${s.edAcik?'open':''}><summary><strong>Gündem ve tutanak metni</strong><small class="ka-muted" data-vtp-ozet>${esc(ozetMetni(duzey))}</small></summary>
<div class="ka-card__body ka-stack"><small class="ka-muted">Gündem maddeleri dilekçeye ve tutanağa, görüşme metinleri ve kararlar tutanağa yazılır. Değişiklikleriniz bu sınıf için hesabınıza kaydedilir; “Hazır metne dön” ile ilk hâline dönebilirsiniz.</small>
<div class="vtp-ed__bolum"><strong>Gündem maddeleri ve görüşme metinleri</strong><ol class="vtp-ed__liste">${maddeler}</ol><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-vtp-eylem="ekle">＋ Gündem maddesi ekle</button></div>
<div class="vtp-ed__bolum"><strong>Alınan kararlar</strong><ol class="vtp-ed__liste">${kararlar}</ol><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-vtp-eylem="karar-ekle">＋ Karar ekle</button></div>
${ic.ozel?'<div><button type="button" class="ka-btn ka-btn--ghost ka-btn--sm" data-vtp-eylem="sifirla">↺ Hazır metne dön</button></div>':''}</div></details></article>`;
}
function render(kok=document.getElementById('v2ModuleRoot')){
 if(!kok)return false;
 const duzey=duzeyi(),y=global.scrollY;
 kok.innerHTML=`<section class="vtp-page" data-vtp-page>
  <header class="vtp-head"><h2>Veli Toplantısı</h2><p class="ka-muted">${esc(veri().donem)} · ${esc(egitimYili())} · Sınıfı seçin; dilekçe, tutanak, imza sirküsü ve davet pusulası hazır gelir.</p></header>
  ${sinifKarti()}${toplantiKarti()}
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Belgeler</strong><ul class="vtp-belgeler">${BELGELER.map(b=>belgeSatiri(b,duzey)).join('')}</ul></div></article>
  ${duzenleyici(duzey)}
 </section>`;
 baglan(kok);
 global.scrollTo?.(0,y);
 return true;
}
/* Alan değişimi; sayfanın yeniden çizilmesi gerekiyorsa (sınıf / düzey değişti) true döner. */
function degistir(k,v){
 const s=ensure();
 if(k==='veliAdlari')s.veliAdlari=v===true||v==='true';
 else if(k==='bosSatir')s.bosSatir=Math.max(1,Math.min(60,Number(v)||30));
 else s[k]=String(v??'');
 if(k==='sinifId'){const c=sinifBul(s.sinifId);if(c)s.ogretmen=sinifOgretmeni(c)}
 if(k==='sinifId'||k==='duzey'){s.acikMadde=new Set();ozelYukle()}
 return k==='sinifId'||k==='duzey';
}
/* Düzenleyici eylemleri; yapıyı değiştirenler sayfayı yeniden çizer. */
function eylem(ad,i,kok){
 const n=Number(i);
 if(ad==='ekle'){const yeni=D.ekle();s_edAc();render(kok);kok?.querySelector?.(`[data-vtp-ed="baslik"][data-i="${yeni}"]`)?.focus?.();return}
 if(ad==='karar-ekle'){const yeni=D.kararEkle();s_edAc();render(kok);kok?.querySelector?.(`[data-vtp-ed="karar"][data-i="${yeni}"]`)?.focus?.();return}
 if(ad==='yukari'){if(!D.tasi(n,-1))return}
 else if(ad==='asagi'){if(!D.tasi(n,1))return}
 else if(ad==='ac')D.ac(n);
 else if(ad==='sil'){if(global.confirm&&!global.confirm('Bu gündem maddesi ve görüşme metni silinsin mi?'))return;D.sil(n)}
 else if(ad==='karar-sil'){D.kararSil(n)}
 else if(ad==='sifirla'){if(global.confirm&&!global.confirm('Gündem, görüşme metinleri ve kararlar hazır metne dönsün mü? Yaptığınız değişiklikler silinir.'))return;D.sifirla()}
 else return;
 s_edAc();render(kok);
}
const s_edAc=()=>{ensure().edAcik=true};
function baglan(kok){
 kok.querySelectorAll('[data-vtp]').forEach(el=>{
  const k=el.dataset.vtp;
  el.addEventListener(el.tagName==='SELECT'||el.type==='checkbox'?'change':'input',()=>{
   if(degistir(k,el.type==='checkbox'?el.checked:el.value))render(kok);
   else if(k==='sube'){ozelYukle();guncelleDugmeler(kok)}
  });
 });
 kok.querySelectorAll('[data-vtp-yazdir]').forEach(b=>b.addEventListener('click',()=>yazdir(b.dataset.vtpYazdir)));
 kok.querySelectorAll('[data-vtp-indir]').forEach(b=>b.addEventListener('click',()=>indirWord(b.dataset.vtpIndir)));
 kok.querySelectorAll('[data-vtp-ed]').forEach(el=>el.addEventListener('input',()=>{
  const i=Number(el.dataset.i),a=el.dataset.vtpEd;
  if(a==='baslik')D.baslik(i,el.value);else if(a==='metin')D.metin(i,el.value);else if(a==='karar')D.karar(i,el.value);
  const ozet=kok.querySelector('[data-vtp-ozet]');if(ozet)ozet.textContent=ozetMetni(duzeyi());
 }));
 kok.querySelectorAll('[data-vtp-eylem]').forEach(b=>b.addEventListener('click',()=>eylem(b.dataset.vtpEylem,b.dataset.i,kok)));
 kok.querySelector('[data-vtp-ed-ac]')?.addEventListener('toggle',e=>{ensure().edAcik=e.target.open});
}
const guncelleDugmeler=kok=>{const d=duzeyi();BELGELER.forEach(b=>{kok.querySelectorAll(`[data-vtp-yazdir="${b.k}"],[data-vtp-indir="${b.k}"]`).forEach(dugme=>{dugme.disabled=!!belgeDurumu(b.k,d)})})};

function yazdir(k){
 const b=BELGELER.find(x=>x.k===k),c=ctx();
 if(!b||belgeDurumu(k,c.duzey))return false;
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 global.ReportEngine.printReport(`Veli Toplantısı ${b.ad}`,b.yap(c),{fileName:`Veli Toplantısı ${b.ad} ${c.sinif}`.replace(/…/g,''),yon:k==='imza'&&ensure().yon==='yatay'?'yatay':'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' ',akis:true,kenarBosluk:10});
 return true;
}
async function betik(src,hazir){
 if(hazir())return;
 if(!global.AppLoader?.loadScript)throw new Error('Word bileşeni yüklenemedi.');
 await global.AppLoader.loadScript(src);
 if(!hazir())throw new Error('Word bileşeni yüklenemedi.');
}
/* Tutanağı Word (.docx) olarak indirir (düzenlenmiş gündem, görüşme metinleri ve kararlarla). */
async function indirWord(k='tutanak'){
 const c=ctx();
 if(k!=='tutanak'||belgeDurumu(k,c.duzey))return false;
 try{
  await betik(WORD_CORE,()=>!!global.OgretmenDosyasiCore);
  await betik(WORD_BELGE,()=>!!global.VeliToplantisiWord);
  await global.VeliToplantisiWord.indir(tutanakModeli(c),global.OgretmenDosyasiCore.dosyaAdi('Veli Toplantisi Tutanagi',c.sinif,'docx'));
  global.toast?.('Dosya indirildi.');
  return true;
 }catch(e){console.warn('[Veli Toplantısı/Word]',e);global.toast?.(String(e?.message||'Dosya indirilemedi.'));return false}
}

function temizle(){offPrefs?.();offPrefs=null;unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
function open(){
 S=blank();S.mudur=okulMuduru();temizle();
 const{own}=siniflar();
 if(own.size===1)S.sinifId=[...own][0];
 S.ogretmen=sinifOgretmeni(sinifBul(S.sinifId));
 ozelYukle();
 const ok=render();
 offPrefs=global.KaPrefs?.remoteListen?.(uzakGeldi)||null;
 global.SinifBaglam.ABONELIK.forEach(p=>{
  const u=global.AppStore?.subscribe?.(p,()=>{const kok=document.querySelector('[data-vtp-page]');if(!kok)return temizle();
   const s=ensure();if(!s.mudur)s.mudur=okulMuduru();if(!s.ogretmen)s.ogretmen=sinifOgretmeni(sinifBul(s.sinifId));render()});
  if(u)unsubs.push(u);
 });
 global.SinifBaglam.hazirla().catch(e=>console.warn('[Veli Toplantısı]',e?.message||e));
 return ok;
}

global.VeliToplantisiModule={open,render,degistir,yazdir,indirWord,belge,ctx,tutanakModeli,icerik,tutanakDurumu,duzenle:D,eylem,reset:()=>{clearTimeout(pushT);S=null;global.SinifBaglam.sifirla();temizle()}};
})(window);

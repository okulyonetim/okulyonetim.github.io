/* Koruk Asistan — Veli Toplantısı
 * Sınıfı seçin; veli toplantısı dilekçesi, tutanağı, imza sirküsü ve davet pusulası A4 olarak hazır gelir.
 * Öğrenci ve veli adları uygulamadaki öğrenci listesinden (veliler), okul / öğretmen / müdür adı okul ve kadro kayıtlarından alınır;
 * metinler veli-toplantisi-veri.js'tedir. Çıktı merkezi ReportEngine ile yazdırılır / PDF alınır; kâğıt stili css/design-system-base.css (.vtp-*).
 * Telefon numarası imza sirküsüne yazılmaz (kâğıt tüm velilerin önünden geçer).
 */
(function(global){
'use strict';
if(global.VeliToplantisiModule)return;

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const user=()=>global.AppStore?.get?.('session.user')||global.AKTIF_KULLANICI||{};
const isManager=()=>user().admin===true||!!global.PermissionService?.isManager?.();
const veri=()=>global.VeliToplantisiVeri||{yil:'',donem:'',duzeyler:{}};
const NOKTA='…………………',AYRAC='\u00a0/\u00a0',TARIH_BOS=['……','……','20……'].join(AYRAC),SAAT_BOS='………';
const egitimYili=(d=new Date())=>{const y=d.getFullYear();return d.getMonth()+1>=9?`${y}-${y+1}`:`${y-1}-${y}`};

/* ── biçimler ── */
const tarihMetni=iso=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso||''));return m?[m[3],m[2],m[1]].join(AYRAC):TARIH_BOS};
const saatMetni=s=>/^\d{1,2}:\d{2}$/.test(String(s||''))?String(s):SAAT_BOS;
/* "ayşe kaya" → "Ayşe KAYA": adlar baş harfi büyük, soyad tamamen büyük. */
function adBicimi(s){
 const w=String(s||'').trim().split(/\s+/).filter(Boolean);
 if(!w.length)return'';
 const son=w.pop().toLocaleUpperCase('tr');
 return[...w.map(x=>x.charAt(0).toLocaleUpperCase('tr')+x.slice(1).toLocaleLowerCase('tr')),son].join(' ');
}
const adSoyad=t=>t?(`${t.ad||''} ${t.soyad||''}`.trim()||t.adSoyad||''):'';
const duzeyOf=ad=>{const n=parseInt(String(ad||'').trim(),10);return n>=1&&n<=8?n:0};
/* "5/A" → "5/A sınıfı", "5. Sınıf A" → olduğu gibi. */
const sinifMetni=l=>/sınıf/i.test(l)?l:`${l} sınıfı`;
const sinifBuyuk=l=>(/sınıf/i.test(l)?l:`${l} SINIFI`).toLocaleUpperCase('tr');

/* ── belge içerikleri: c = bağlam (ctx) ── */
const imzaAdi=c=>adBicimi(c.ogretmen)||NOKTA;
const ogretmenUnvani=c=>veri().duzeyler[c.duzey]?.unvan||'Sınıf Öğretmeni';
const gundemListe=c=>`<ol class="vtp-liste">${(veri().duzeyler[c.duzey]?.gundem||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>`;
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

function tutanak(c){
 const d=veri().duzeyler[c.duzey]||{},adi=`${ogretmenUnvani(c)} ${imzaAdi(c)}`,baslik=`${veri().donem.toLocaleUpperCase('tr')} VELİ TOPLANTI TUTANAĞI`;
 const gorusme=(d.gorusme||[]).map((g,i)=>`<section class="vtp-madde"><h3 class="vtp-alt">${i+1}. ${esc(g.b)}</h3>${g.p.map(p=>`<p>${esc(p).replace(/\{OGRETMEN\}/g,()=>esc(adi))}</p>`).join('')}</section>`).join('');
 return`<article class="vtp-paper vtp-tutanak">${baslikKutusu(c,baslik)}
<table class="vtp-bilgi"><tbody><tr><th>SINIF / ŞUBE</th><th>TARİH</th><th>SAAT</th><th>${esc(ogretmenUnvani(c).toLocaleUpperCase('tr'))}</th></tr><tr><td>${esc(c.sinif)}</td><td>${esc(tarihMetni(c.tarih))}</td><td>${esc(saatMetni(c.saat))}</td><td>${esc(imzaAdi(c))}</td></tr></tbody></table>
<h2 class="vtp-baslik">GÜNDEM MADDELERİ</h2>${gundemListe(c)}
<h2 class="vtp-baslik">GÜNDEM MADDELERİNİN GÖRÜŞÜLMESİ</h2>${gorusme}
<section class="vtp-kararlar">${baslikKutusu(c,baslik)}<h2 class="vtp-baslik">ALINAN KARARLAR</h2><ol class="vtp-liste">${(d.kararlar||[]).map(x=>`<li>${esc(x)}</li>`).join('')}</ol>
<div class="vtp-imzalar">${imzaBlok(imzaAdi(c),ogretmenUnvani(c))}${mudurBlok(c,'UYGUNDUR')}</div></section></article>`;
}

function imzaSirkusu(c){
 const liste=c.ogrenciler.length?c.ogrenciler:Array.from({length:Math.max(1,Number(c.bosSatir)||30)},()=>({}));
 const govde=liste.map((o,i)=>`<tr><td class="vtp-no">${i+1}</td><td>${esc(o.ad||'')}</td><td>${esc(c.veliAdlari?o.veli||'':'')}</td><td>${esc(c.veliAdlari?o.yakinlik||'':'')}</td><td></td></tr>`).join('');
 return`<article class="vtp-paper vtp-sirku">${baslikKutusu(c,'VELİ TOPLANTISI İMZA SİRKÜSÜ')}
<table class="vtp-tablo"><thead><tr><th class="vtp-c-no">No</th><th>Öğrenci Adı</th><th>Veli Adı Soyadı</th><th class="vtp-c-yak">Yakınlık Durumu</th><th class="vtp-c-imza">İmza</th></tr></thead><tbody>${govde}</tbody></table>
<div class="vtp-imzalar">${imzaBlok(imzaAdi(c),ogretmenUnvani(c))}</div></article>`;
}

function pusula(c){
 const metin=`${c.yil} Eğitim Öğretim Yılı ${veri().donem} ${sinifMetni(c.sinif)} veli toplantımız ${tarihMetni(c.tarih)} tarihinde saat ${saatMetni(c.saat)} itibarıyla yapılacaktır. Çocuğumuzun eğitimi için önemli olan bu toplantıya katılımınızı önemle rica ederiz.`;
 const adlar=c.ogrenciler.length?c.ogrenciler.map(o=>o.ad):Array.from({length:6},()=>'');
 const dilim=a=>`<div class="vtp-pusula"><b>Sayın Velimiz,</b>${a?`<small>Öğrenci: ${esc(a)}</small>`:''}<p>${esc(metin)}</p>${imzaBlok(imzaAdi(c),ogretmenUnvani(c))}</div>`;
 return`<article class="vtp-paper vtp-pusulalar"><h1 class="vtp-ust">VELİ TOPLANTISI DAVET PUSULALARI</h1>${adlar.map(dilim).join('')}</article>`;
}

const BELGELER=[
 {k:'dilekce',ad:'Dilekçe',acik:'Müdürlüğe veli toplantısı dilekçesi ve gündem maddeleri',yap:dilekce},
 {k:'tutanak',ad:'Tutanak',acik:'Gündem, görüşme metinleri ve alınan kararlar',yap:tutanak},
 {k:'imza',ad:'İmza Sirküsü',acik:'Öğrenci ve veli imza listesi',yap:imzaSirkusu},
 {k:'pusula',ad:'Davet Pusulası',acik:'Velilere gönderilecek davet; öğrenci başına bir tane',yap:pusula}
];
const belge=(k,c)=>BELGELER.find(b=>b.k===k)?.yap(c)||'';

/* ── uygulama verisi: sınıflar, öğrenciler, kadro ── */
let S=null,unsubs=[],hazirlandi=false;
const blank=()=>({sinifId:'',duzey:'',sube:'',tarih:'',saat:'',ogretmen:'',mudur:'',yon:'dikey',veliAdlari:true,bosSatir:30});
function ensure(){if(!S){S=blank();S.mudur=okulMuduru()}return S}
function teacherId(){const u=user();return String(u.bagliOgretmenId||u.ogretmenId||'')}
const okulKaydi=()=>{const l=rows('okulBilgileri');return l.find(x=>x.id==='ayarlar')||l[0]||global.okulBilgileriAyari||{}};
function okulMuduru(){const o=okulKaydi();return adBicimi(adSoyad(rows('ogretmenler').find(t=>String(t.id)===String(o.mudurId||o.mudirId||'')))||String(o.mudurAdSoyad||o.mudurAdi||''))}
/* Ortak okullarda sınıfın kademesine ait okul adı (1–4 ilkokul, 5–8 ortaokul); tanımlı değilse okul adı. */
function okulAdi(duzey){
 const o=okulKaydi(),genel=String(o.okulAdi||o.ad||global.ReportEngine?.schoolInfo?.().okulAdi||'').trim();
 const kademe=duzey>=5?'ortaokul':duzey>=1?'ilkokul':'';
 return String(kademe&&o[`${kademe}Adi`]||'').trim()||genel;
}
function siniflar(){
 const tid=teacherId();
 const hepsi=rows('siniflar').map(c=>({id:String(c.id),ad:String(c.ad||c.sinifAdi||'').trim(),ogretmenId:String(c.sinifOgretmeniId||c.ogretmenId||'')})).filter(c=>c.ad)
  .sort((a,b)=>a.ad.localeCompare(b.ad,'tr',{numeric:true,sensitivity:'base'}));
 const own=hepsi.filter(c=>tid&&c.ogretmenId===tid);
 return{liste:isManager()||!own.length?hepsi:own,own:new Set(own.map(c=>c.id))};
}
const sinifBul=id=>siniflar().liste.find(c=>c.id===id)||null;
function ogrencilerOf(id){
 return rows('veliler').filter(v=>String(v.sinifId)===String(id))
  .sort((a,b)=>Number(a.ogrenciNo||a.no||0)-Number(b.ogrenciNo||b.no||0)||String(a.ogrenciAdi||'').localeCompare(String(b.ogrenciAdi||''),'tr'))
  .map(v=>({ad:String(v.ogrenciAdi||v.adSoyad||[v.ad,v.soyad].filter(Boolean).join(' ')||'').trim(),veli:String(v.veliAdi||'').trim(),yakinlik:String(v.yakinlik||'').trim()})).filter(o=>o.ad);
}
function sinifOgretmeni(c){
 const t=rows('ogretmenler').find(x=>String(x.id)===String(c?.ogretmenId||'')),me=rows('ogretmenler').find(x=>String(x.id)===teacherId());
 return adBicimi(adSoyad(t)||(isManager()?'':adSoyad(me)||String(user().adSoyad||user().ad||'')));
}
const duzeyi=()=>{const s=ensure(),c=sinifBul(s.sinifId);return c?duzeyOf(c.ad)||Number(s.duzey)||0:Number(s.duzey)||0};
function ctx(){
 const s=ensure(),c=sinifBul(s.sinifId),duzey=duzeyi();
 const etiket=c?c.ad:duzey?`${duzey}/${s.sube.trim()||'…'}`:'';
 return{yil:egitimYili(),okul:okulAdi(duzey),sinif:etiket,duzey,tarih:s.tarih,saat:s.saat,ogretmen:s.ogretmen,mudur:s.mudur,
  ogrenciler:c?ogrencilerOf(c.id):[],veliAdlari:s.veliAdlari,bosSatir:s.bosSatir};
}
/* Tutanak metni yalnız metinlerin yazıldığı eğitim yılında üretilir (2026/70 sayılı Genelge göndermeleri yıla özgüdür). */
function tutanakDurumu(duzey){
 if(!duzey)return'Önce sınıfı seçin.';
 if(veri().yil!==egitimYili())return`Tutanak metinleri ${veri().yil} eğitim-öğretim yılı içindir.`;
 return'';
}
const belgeDurumu=(k,duzey)=>!duzey?'Önce sınıfı seçin.':k==='tutanak'?tutanakDurumu(duzey):'';

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
 return`<li class="vtp-belge" data-vtp-belge="${b.k}"><div class="vtp-belge__ad"><strong>${esc(b.ad)}</strong><small class="ka-muted">${esc(neden||b.acik)}</small></div>${secenek}<button class="ka-btn" type="button" data-vtp-yazdir="${b.k}" ${neden?'disabled':''}>🖨 Yazdır / PDF</button></li>`;
}
function render(kok=document.getElementById('v2ModuleRoot')){
 if(!kok)return false;
 const duzey=duzeyi();
 kok.innerHTML=`<section class="vtp-page" data-vtp-page>
  <header class="vtp-head"><h2>Veli Toplantısı</h2><p class="ka-muted">${esc(veri().donem)} · ${esc(egitimYili())} · Sınıfı seçin; dilekçe, tutanak, imza sirküsü ve davet pusulası hazır gelir.</p></header>
  ${sinifKarti()}${toplantiKarti()}
  <article class="ka-card"><div class="ka-card__body ka-stack"><strong>Belgeler</strong><ul class="vtp-belgeler">${BELGELER.map(b=>belgeSatiri(b,duzey)).join('')}</ul></div></article>
 </section>`;
 baglan(kok);
 return true;
}
/* Alan değişimi; sayfanın yeniden çizilmesi gerekiyorsa (sınıf / düzey değişti) true döner. */
function degistir(k,v){
 const s=ensure();
 if(k==='veliAdlari')s.veliAdlari=v===true||v==='true';
 else if(k==='bosSatir')s.bosSatir=Math.max(1,Math.min(60,Number(v)||30));
 else s[k]=String(v??'');
 if(k==='sinifId'){const c=sinifBul(s.sinifId);if(c)s.ogretmen=sinifOgretmeni(c)}
 return k==='sinifId'||k==='duzey';
}
function baglan(kok){
 kok.querySelectorAll('[data-vtp]').forEach(el=>{
  const k=el.dataset.vtp;
  el.addEventListener(el.tagName==='SELECT'||el.type==='checkbox'?'change':'input',()=>{
   if(degistir(k,el.type==='checkbox'?el.checked:el.value))render(kok);
   else if(k==='sube')guncelleDugmeler(kok);
  });
 });
 kok.querySelectorAll('[data-vtp-yazdir]').forEach(b=>b.addEventListener('click',()=>yazdir(b.dataset.vtpYazdir)));
}
const guncelleDugmeler=kok=>{const d=duzeyi();BELGELER.forEach(b=>{const dugme=kok.querySelector(`[data-vtp-yazdir="${b.k}"]`);if(dugme)dugme.disabled=!!belgeDurumu(b.k,d)})};

function yazdir(k){
 const b=BELGELER.find(x=>x.k===k),c=ctx();
 if(!b||belgeDurumu(k,c.duzey))return false;
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 global.ReportEngine.printReport(`Veli Toplantısı ${b.ad}`,b.yap(c),{fileName:`Veli Toplantısı ${b.ad} ${c.sinif}`.replace(/…/g,''),yon:k==='imza'&&ensure().yon==='yatay'?'yatay':'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' ',akis:true,kenarBosluk:10});
 return true;
}

async function prepare(){
 const SE=global.SyncEngine,col=global.COL;if(!SE||!col||hazirlandi)return;
 hazirlandi=true;
 const tipler=[];
 for(const t of ['siniflar','veliler','ogretmenler','okulBilgileri'])if(col[t]){SE.register(t,col[t]);tipler.push(t)}
 await SE.localHydrate(tipler);SE.schedule?.(100);
}
function temizle(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
function open(){
 S=blank();S.mudur=okulMuduru();temizle();
 const{own}=siniflar();
 if(own.size===1)S.sinifId=[...own][0];
 S.ogretmen=sinifOgretmeni(sinifBul(S.sinifId));
 const ok=render();
 ['data.siniflar','data.veliler','data.ogretmenler','data.okulBilgileri'].forEach(p=>{
  const u=global.AppStore?.subscribe?.(p,()=>{const kok=document.querySelector('[data-vtp-page]');if(!kok)return temizle();
   const s=ensure();if(!s.mudur)s.mudur=okulMuduru();if(!s.ogretmen)s.ogretmen=sinifOgretmeni(sinifBul(s.sinifId));render()});
  if(u)unsubs.push(u);
 });
 prepare().catch(e=>console.warn('[Veli Toplantısı]',e?.message||e));
 return ok;
}

global.VeliToplantisiModule={open,render,degistir,yazdir,belge,ctx,tutanakDurumu,reset:()=>{S=null;hazirlandi=false;temizle()}};
})(window);

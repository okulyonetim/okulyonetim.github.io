/* Koruk Asistan — Ortak Sınavlar
 * Üç sayfa (her biri Sınav ve Not altındaki "Ortak Sınavlar" menüsünde ayrı satır): Görevlendirme Tebliği · Gözetmen Öğretmen Görevleri · Ortak Sınav Evrakı Teslim Tutanağı.
 * Öğretmen ve ders uygulama verisinden açılır listeyle seçilir (ogretmenler, dersListesi); okul, il ve sınıf adları okul kaydından gelir. Tüm alanlar ekranda düzenlenir.
 * Çıktı merkezi ReportEngine ile önizlenir / yazdırılır / PDF alınır (her sayfada 10 mm üst ve alt boşluk); kâğıt ve ekran stili css/design-system-base.css (.osn-*).
 * Mantık ve resmî metinler: ortak-sinav-core.js.
 */
(function(global){
'use strict';
if(global.OrtakSinavModule)return;
const C=global.OrtakSinavCore,B=global.SinifBaglam;
if(!C||!B)throw new Error('Ortak Sınavlar için gerekli bileşenler yüklenmedi.');

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const {rows,isManager,adBicimi,adSoyad,teacherId,okulAdi,okulKaydi,duzeyOf,siniflar}=B;
const EK=['dersListesi'];
const iso=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const KAPSAM_ETIKET={ülke:'Ülke geneli',il:'İl geneli',ilçe:'İlçe geneli',okul:'Okul geneli'};
const CIKTI={yon:'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' ',akis:true,kenarBosluk:10,ozellestirilebilir:false};
const ALTYAZI={
 teblig:'Ortak yazılı sınavda gözetmen olarak görevlendirilen öğretmene verilen tebliğ. Öğretmeni ve dersi listeden seçin; bilgiler hazır gelir.',
 gorevler:'Görevli/gözetmen öğretmenlerin yapacağı iş ve işlemler ile sınav öncesinde sınıfta okunacak kurallar. Maddeleri düzenleyebilirsiniz.',
 tutanak:'Sınav evrakının koordinatörlükten alınması ve teslimi için doldurulan tutanak. Doldurup yazdırın ya da boş çıktı alıp elle doldurun.'
};

let S=null,unsubs=[];

/* ── veri ── */
const ogretmenler=()=>rows('ogretmenler').filter(t=>t&&t.id&&t.aktif!==false).sort((a,b)=>adSoyad(a).localeCompare(adSoyad(b),'tr'));
const ogretmenBul=id=>id?rows('ogretmenler').find(t=>String(t.id)===String(id))||null:null;
const kendiOgretmen=()=>ogretmenBul(teacherId());
const ogretmenAdi=t=>adBicimi(adSoyad(t));
function adAyir(t){const w=ogretmenAdi(t).split(' ').filter(Boolean),soyad=w.length>1?w.pop():'';return{ad:w.join(' '),soyad}}
const dersAdlari=()=>[...new Set(rows('dersListesi').map(d=>String(d?.ad||'').trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'tr'));
const sinifAdlari=()=>siniflar().liste.map(c=>c.ad);
function sinifDuzeyleri(){
 const l=[...new Set(siniflar().liste.map(c=>duzeyOf(c.ad)).filter(n=>n>0))].sort((a,b)=>a-b);
 return(l.length?l:[1,2,3,4,5,6,7,8]).map(n=>`${n}. Sınıf`);
}
const makam=()=>{const il=String(okulKaydi().il||'').trim();return il?`${il.toLocaleUpperCase('tr')} VALİLİĞİ`:''};

/* ── durum ── */
function blank(){
 const ben=kendiOgretmen(),yonetici=isManager();
 return{
  sayfa:'teblig',elle:{},
  teblig:{ustBaslik1:'',ustBaslik2:'İl Millî Eğitim Müdürlüğü',okul:'',belgeTarihi:iso(),ogretmenId:'',ogretmen:'',sinif:'',ders:'',kapsam:'ülke',sinavTarihi:'',tebligEden:'',tebligUnvan:'Tebliğ Eden Mdr Yrd',ek:'Gözetmen Öğretmenin Görevleri'},
  gorevler:{gorevler:[...C.GOREVLER],kurallar:[...C.KURALLAR]},
  tutanak:{okul:'',kapsam:'ülke',ders:'',donem:'',sinavNo:'',sinavAdi:'',sinavYeri:'',tarih:'',saat:'',
   onceKitapcik:'',onceTeslimEden:'',onceTeslimAlan:'',onceDiger:'Gözetmen Öğretmenin Görevleri',onceTarih:'',onceSaat:'',
   olumsuzluk:'',olumsuzlukYok:false,katilan:'',eksiksiz:false,gozetmenId:yonetici||!ben?'':String(ben.id),gozetmenAd:'',gozetmenSoyad:'',
   sonraKitapcik:'',sonraTeslimEden:'',sonraTeslimAlan:'',sonraDiger:'',sonraTarih:'',sonraSaat:''}
 };
}
const ensure=()=>S||(S=blank());
/* Elle değiştirilmeyen boş alanları uygulama verisinden doldurur; değişen bir şey olduysa true. */
function varsayilanlar(){
 const s=ensure(),once=JSON.stringify([s.teblig,s.tutanak]),ben=kendiOgretmen(),benAd=ben?ogretmenAdi(ben):'',yonetici=isManager();
 const yaz=(g,k,v)=>{if(v&&!s.elle[`${g}.${k}`]&&!s[g][k])s[g][k]=v};
 yaz('teblig','ustBaslik1',makam());
 yaz('teblig','okul',okulAdi(0));
 yaz('tutanak','okul',okulAdi(0));
 if(yonetici){yaz('teblig','tebligEden',benAd);yaz('tutanak','onceTeslimEden',benAd);yaz('tutanak','sonraTeslimAlan',benAd)}
 const t=s.tutanak,g=ogretmenBul(t.gozetmenId);
 if(g){const a=adAyir(g);yaz('tutanak','gozetmenAd',a.ad);yaz('tutanak','gozetmenSoyad',a.soyad);yaz('tutanak','onceTeslimAlan',ogretmenAdi(g));yaz('tutanak','sonraTeslimEden',ogretmenAdi(g))}
 return once!==JSON.stringify([s.teblig,s.tutanak]);
}

/* ── ekran ── */
const field=(label,html)=>`<label class="ka-field"><span class="ka-field__label">${esc(label)}</span>${html}</label>`;
const val=(g,k)=>ensure()[g][k];
const input=(g,k,type='text',ph='')=>`<input class="ka-input" type="${type}" value="${esc(val(g,k))}" placeholder="${esc(ph)}" data-osn="${g}.${k}" autocomplete="off">`;
const secenek=(liste,secili,bos)=>`${bos?`<option value="">${esc(bos)}</option>`:''}${liste.map(([v,e])=>`<option value="${esc(v)}"${String(v)===String(secili)?' selected':''}>${esc(e)}</option>`).join('')}`;
/* Listede olmayan geçerli değer (ör. elle yazılmış, başka kayıttan gelen) kaybolmasın diye seçeneklere eklenir. */
const secimListesi=(liste,secili)=>{const l=liste.map(x=>[x,x]);if(secili&&!liste.includes(secili))l.unshift([secili,secili]);return l};
const select=(g,k,liste,bos)=>`<select class="ka-select" data-osn="${g}.${k}">${secenek(secimListesi(liste,val(g,k)),val(g,k),bos)}</select>`;
const kapsamSelect=g=>`<select class="ka-select" data-osn="${g}.kapsam">${secenek(Object.entries(KAPSAM_ETIKET),C.kapsamNormal(val(g,'kapsam')))}</select>`;
const ogretmenSelect=(g,k)=>`<select class="ka-select" data-osn="${g}.${k}"><option value="">— Elle yazacağım —</option>${ogretmenler().map(t=>`<option value="${esc(t.id)}"${String(t.id)===String(val(g,k))?' selected':''}>${esc(ogretmenAdi(t))}${t.brans?` (${esc(t.brans)})`:''}</option>`).join('')}</select>`;
const kart=(baslik,html,not='')=>`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>${esc(baslik)}</strong>${html}${not?`<small class="ka-muted">${esc(not)}</small>`:''}</div></article>`;
const grid=html=>`<div class="ka-grid">${html}</div>`;

function formTeblig(){
 return`${kart('Görevlendirilen öğretmen',grid(`${field('Öğretmen',ogretmenSelect('teblig','ogretmenId'))}${field('Adı soyadı',input('teblig','ogretmen','text','Ad SOYAD'))}`))}
${kart('Sınav',grid(`${field('Sınıf',select('teblig','sinif',sinifDuzeyleri(),'— Seçin —'))}${field('Ders',select('teblig','ders',dersAdlari(),'— Seçin —'))}${field('Sınav kapsamı',kapsamSelect('teblig'))}${field('Sınav tarihi',input('teblig','sinavTarihi','date'))}`))}
${kart('Belge',grid(`${field('Belge tarihi',input('teblig','belgeTarihi','date'))}${field('Tebliğ eden',input('teblig','tebligEden','text','Ad SOYAD'))}${field('Tebliğ eden unvanı',input('teblig','tebligUnvan','text','Tebliğ Eden Mdr Yrd'))}${field('Ek (boş bırakılırsa yazılmaz)',input('teblig','ek','text','Gözetmen Öğretmenin Görevleri'))}`)+grid(`${field('Üst başlık (makam)',input('teblig','ustBaslik1','text','ELAZIĞ VALİLİĞİ'))}${field('Üst başlık (müdürlük)',input('teblig','ustBaslik2','text','İl Millî Eğitim Müdürlüğü'))}${field('Okul adı',input('teblig','okul','text','Okul adı'))}`),'Okul logosu belgenin sol üstüne otomatik konur.')}`;
}
function listeKarti(ad,anahtar,etiket){
 const l=ensure().gorevler[anahtar];
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>${esc(ad)}</strong>
 <div class="osn-maddeler">${l.map((x,i)=>`<div class="osn-madde"><span class="osn-madde-no">${anahtar==='gorevler'?(C.HARFLER[i]||i+1):i+1})</span><textarea class="ka-input" rows="3" data-osn-madde="${anahtar}" data-i="${i}" aria-label="${esc(etiket)} ${i+1}">${esc(x)}</textarea><button type="button" class="ka-btn ka-btn--ghost osn-sil" data-osn-sil="${anahtar}" data-i="${i}" aria-label="Maddeyi sil" title="Maddeyi sil">×</button></div>`).join('')}</div>
 <div class="osn-eylem"><button type="button" class="ka-btn ka-btn--secondary" data-osn-ekle="${anahtar}">＋ Madde ekle</button></div></div></article>`;
}
const formGorevler=()=>`${listeKarti('Görevli/gözetmen öğretmenlerin yapacağı iş ve işlemler','gorevler','Görev')}${listeKarti('Ortak yazılı sınavlarda uyulması gereken kurallar','kurallar','Kural')}
<div class="osn-eylem"><button type="button" class="ka-btn ka-btn--ghost" data-osn-sifirla>Okulun resmî metnine geri dön</button></div>`;
const onay=(g,k,metin)=>`<label class="osn-onay-ekran"><input type="checkbox" data-osn="${g}.${k}"${val(g,k)?' checked':''}><span>${esc(metin)}</span></label>`;
function formTutanak(){
 return`${kart('Sınav',grid(`${field('Kapsam',kapsamSelect('tutanak'))}${field('Ders',select('tutanak','ders',dersAdlari(),'— Seçin —'))}${field('Dönem',select('tutanak','donem',['1','2'],'— Seçin —'))}${field('Kaçıncı sınav',select('tutanak','sinavNo',['1','2','3','4'],'— Seçin —'))}${field('Sınav yeri (sınıf/şube)',`<input class="ka-input" type="text" value="${esc(val('tutanak','sinavYeri'))}" placeholder="7/A" list="osnSiniflar" data-osn="tutanak.sinavYeri" autocomplete="off"><datalist id="osnSiniflar">${sinifAdlari().map(a=>`<option value="${esc(a)}"></option>`).join('')}</datalist>`)}${field('Tarih',input('tutanak','tarih','date'))}${field('Saat',input('tutanak','saat','time'))}`)+field('Sınav adı (boş bırakılırsa yukarıdakilerden yazılır)',input('tutanak','sinavAdi','text','')),'Okul adı belgenin başlığına uygulamadan gelir.')}
${kart('Gözetmen',grid(`${field('Öğretmen',ogretmenSelect('tutanak','gozetmenId'))}${field('Adı',input('tutanak','gozetmenAd','text','Ad'))}${field('Soyadı',input('tutanak','gozetmenSoyad','text','SOYAD'))}`),'Gözetmen seçilince ad, soyad ve evrakı teslim alan / teslim eden alanları doldurulur; değiştirebilirsiniz.')}
${kart('Sınav öncesi: evrak koordinatörlükten alınırken',grid(`${field('Soru kitapçığı (adet)',input('tutanak','onceKitapcik','number'))}${field('Teslim eden (koordinatör)',input('tutanak','onceTeslimEden','text','Ad SOYAD'))}${field('Teslim alan (gözetmen)',input('tutanak','onceTeslimAlan','text','Ad SOYAD'))}${field('Diğer (belirtiniz)',input('tutanak','onceDiger','text',''))}${field('Tarih',input('tutanak','onceTarih','date'))}${field('Saat',input('tutanak','onceSaat','time'))}`))}
${kart('Sınav sırasında',`${field('Gözlenen olumsuzluklar (varsa)',`<textarea class="ka-input" rows="3" data-osn="tutanak.olumsuzluk" placeholder="Boş bırakırsanız çıktıda yazı için boş kutu kalır.">${esc(val('tutanak','olumsuzluk'))}</textarea>`)}${onay('tutanak','olumsuzlukYok','Sınav esnasında sınav ortamını bozan herhangi bir olumsuzluk yaşanmamıştır.')}${grid(`${field('Sınava katılan kişi sayısı',input('tutanak','katilan','number'))}`)}${onay('tutanak','eksiksiz','Soru kitapçıkları eksiksiz alınmıştır.')}`)}
${kart('Sınav sonrası: evrak koordinatörlüğe teslim edilirken',grid(`${field('Soru kitapçığı (adet)',input('tutanak','sonraKitapcik','number'))}${field('Teslim eden (gözetmen)',input('tutanak','sonraTeslimEden','text','Ad SOYAD'))}${field('Teslim alan (koordinatör)',input('tutanak','sonraTeslimAlan','text','Ad SOYAD'))}${field('Diğer (belirtiniz)',input('tutanak','sonraDiger','text',''))}${field('Tarih',input('tutanak','sonraTarih','date'))}${field('Saat',input('tutanak','sonraSaat','time'))}`))}`;
}
const FORMLAR={teblig:formTeblig,gorevler:formGorevler,tutanak:formTutanak};

function render(kok=document.getElementById('v2ModuleRoot')){
 if(!kok)return false;
 const s=ensure(),y=global.scrollY;
 varsayilanlar();
 kok.innerHTML=`<section class="osn-page" data-osn-page="${s.sayfa}">
 <header class="osn-head"><h2>${esc(C.SAYFALAR[s.sayfa].ad)}</h2><p class="ka-muted">${esc(ALTYAZI[s.sayfa])}</p></header>
 ${FORMLAR[s.sayfa]()}
 <div class="osn-eylem osn-eylem--yazdir"><button type="button" class="ka-btn ka-btn--primary" data-osn-yazdir>Önizle / Yazdır / PDF</button></div>
 </section>`;
 baglan(kok);
 global.scrollTo?.(0,y);
 return true;
}

/* ── değişiklikler ── */
function degistir(yol,v){
 const s=ensure(),[g,k]=yol.split('.');
 if(!s[g]||!(k in s[g]))return false;
 s[g][k]=v;s.elle[yol]=true;
 if(yol==='teblig.ogretmenId'){
  const t=ogretmenBul(v);
  s.teblig.ogretmen=t?ogretmenAdi(t):'';delete s.elle['teblig.ogretmen'];
  /* Ders henüz seçilmediyse öğretmenin branşı, listede varsa varsayılan olur. */
  const brans=String(t?.brans||'').trim();
  if(brans&&!s.teblig.ders&&dersAdlari().includes(brans))s.teblig.ders=brans;
  return true;
 }
 if(yol==='tutanak.gozetmenId'){
  const t=ogretmenBul(v),a=t?adAyir(t):{ad:'',soyad:''},tm=s.tutanak;
  tm.gozetmenAd=a.ad;tm.gozetmenSoyad=a.soyad;tm.onceTeslimAlan=t?ogretmenAdi(t):'';tm.sonraTeslimEden=t?ogretmenAdi(t):'';
  ['gozetmenAd','gozetmenSoyad','onceTeslimAlan','sonraTeslimEden'].forEach(x=>delete s.elle[`tutanak.${x}`]);
  return true;
 }
 return false;
}
function baglan(kok){
 kok.querySelectorAll('[data-osn]').forEach(el=>{
  const olay=el.tagName==='SELECT'||el.type==='checkbox'?'change':'input';
  el.addEventListener(olay,()=>{if(degistir(el.dataset.osn,el.type==='checkbox'?el.checked:el.value))render(kok)});
 });
 kok.querySelectorAll('[data-osn-madde]').forEach(el=>el.addEventListener('input',()=>{ensure().gorevler[el.dataset.osnMadde][Number(el.dataset.i)]=el.value}));
 kok.querySelectorAll('[data-osn-sil]').forEach(b=>b.addEventListener('click',()=>{ensure().gorevler[b.dataset.osnSil].splice(Number(b.dataset.i),1);render(kok)}));
 kok.querySelectorAll('[data-osn-ekle]').forEach(b=>b.addEventListener('click',()=>{
  const l=ensure().gorevler[b.dataset.osnEkle];l.push('');render(kok);
  kok.querySelector(`[data-osn-madde="${b.dataset.osnEkle}"][data-i="${l.length-1}"]`)?.focus?.();
 }));
 kok.querySelector('[data-osn-sifirla]')?.addEventListener('click',()=>{
  if(global.confirm&&!global.confirm('Yaptığınız değişiklikler silinip maddeler okulun resmî metnine dönsün mü?'))return;
  ensure().gorevler={gorevler:[...C.GOREVLER],kurallar:[...C.KURALLAR]};render(kok);
 });
 kok.querySelector('[data-osn-yazdir]')?.addEventListener('click',yazdir);
}

/* ── çıktı ── */
function belge(){
 const s=ensure(),ad=String(s.teblig.ogretmen||'').trim();
 if(s.sayfa==='gorevler')return{baslik:C.SAYFALAR.gorevler.ad,govde:C.gorevlerBelgesi(s.gorevler),dosya:'Gozetmen Ogretmen Gorevleri'};
 if(s.sayfa==='tutanak')return{baslik:C.SAYFALAR.tutanak.ad,govde:C.tutanakBelgesi(s.tutanak),dosya:'Ortak Sinav Evraki Teslim Tutanagi'};
 return{baslik:C.SAYFALAR.teblig.ad,govde:C.gorevlendirmeBelgesi(s.teblig),dosya:`Gorevlendirme Tebligi${ad?` ${ad}`:''}`};
}
function yazdir(){
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 const b=belge();
 global.ReportEngine.printReport(b.baslik,b.govde,{...CIKTI,fileName:b.dosya});
 return true;
}

/* ── yaşam döngüsü ── */
function temizle(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
function open(sayfa='teblig'){
 const s=ensure();
 s.sayfa=C.SAYFALAR[sayfa]?sayfa:'teblig';
 temizle();
 const ok=render();
 B.abonelik(EK).forEach(p=>{
  const u=global.AppStore?.subscribe?.(p,()=>{
   const kok=document.querySelector('[data-osn-page]');if(!kok)return temizle();
   /* Veri sonradan geldiyse (senkron) yalnız değişiklik varsa yeniden çiz; yazarken odak kaybolmasın. */
   if(varsayilanlar()&&!kok.contains(document.activeElement))render();
  });
  if(u)unsubs.push(u);
 });
 B.hazirla(EK).catch(e=>console.warn('[Ortak Sınavlar]',e?.message||e));
 return ok;
}

global.OrtakSinavModule={open,render,belge,yazdir,degistir,reset:()=>{S=null;temizle()}};
})(window);

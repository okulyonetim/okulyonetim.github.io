/* Koruk Asistan — Projeler › Maarif'in Kalbinde Oyun
 * Dört sayfa (her biri Projeler menüsünde ayrı satır): Maarif'in Kalbinde Oyun nedir · Ayın Oyunları (20 oyun, nasıl oynanır) · İlkokul yıllık planı · Ortaokul yıllık planı.
 * Planlar Word olarak iner: okul, öğretmen ve müdür adı uygulamadan yazılır (Öğretmen Dosyası'nın hazır formlarıyla aynı şablon ve aynı indirme yolu: OgretmenDosyasi.formKaydet).
 * İçerik: maarif-oyun-veri.js. Ekran stili: css/design-system-base.css (.mok-*).
 */
(function(global){
'use strict';
if(global.MaarifOyunModule)return;
const V=global.MaarifOyunVeri,B=global.SinifBaglam;
if(!V||!B)throw new Error('Maarif’in Kalbinde Oyun için gerekli bileşenler yüklenmedi.');

const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const {rows,adBicimi,adSoyad,teacherId,okulMuduru,okulAdi}=B;
/* Sayfa anahtarı → AppNav sayfa kimliği (menüdeki satır). */
const KIMLIK={nedir:'oyun-nedir',oyunlar:'oyun-aylik',ilkokul:'oyun-ilkokul',ortaokul:'oyun-ortaokul'};
const ALTYAZI='Maarif’in Kalbinde Oyun: ayın oyunları (20 geleneksel oyun), ilkokul ve ortaokul yıllık planları (Word).';
const DUZEY={nedir:0,oyunlar:0,ilkokul:1,ortaokul:5};

let S=null,unsubs=[];

/* ── belge bilgisi: uygulamadan gelir, ekranda değiştirilebilir ── */
function ogretmenAdi(){
 const t=rows('ogretmenler').find(x=>String(x.id)===String(teacherId())),u=B.user();
 return adBicimi(adSoyad(t)||String(u.adSoyad||u.ad||u.displayName||'').trim());
}
const blank=sayfa=>({sayfa,okul:'',ogretmen:'',mudur:'',elle:{},mesgul:new Set()});
const ensure=()=>S||(S=blank('nedir'));
/* Elle değiştirilmeyen alanları veriden doldurur; değişen bir şey olduysa true. */
function varsayilanlar(){
 const s=ensure(),once=JSON.stringify([s.okul,s.ogretmen,s.mudur]);
 if(!s.elle.okul)s.okul=okulAdi(DUZEY[s.sayfa]||0);
 if(!s.elle.ogretmen)s.ogretmen=ogretmenAdi();
 if(!s.elle.mudur)s.mudur=okulMuduru();
 return once!==JSON.stringify([s.okul,s.ogretmen,s.mudur]);
}
/* Plan başına okul adı: ortak okullarda kademeye ait ad; okul adı elle yazıldıysa o. */
const planOkulu=plan=>{const s=ensure();return s.elle.okul?s.okul:okulAdi(V.PLANLAR[plan].duzey)};

/* ── ekran parçaları ── */
const kart=(baslik,icerik,sinif='')=>`<article class="ka-card mok-kart${sinif?` ${sinif}`:''}"><div class="ka-card__body ka-stack">${baslik?`<strong class="mok-kart__baslik">${esc(baslik)}</strong>`:''}${icerik}</div></article>`;
const liste=maddeler=>`<ul class="mok-liste">${maddeler.map(([k,t])=>`<li>${k?`<b>${esc(k)}</b> `:''}${esc(t)}</li>`).join('')}</ul>`;
const tablo=(basliklar,satirlar)=>`<div class="ka-table-wrap mok-tablo"><table class="ka-table"><thead><tr>${basliklar.map(b=>`<th>${esc(b)}</th>`).join('')}</tr></thead><tbody>${satirlar.join('')}</tbody></table></div>`;
const kaynak=()=>`<p class="mok-kaynak">${esc(V.KAYNAK)}</p>`;

function sekmeler(){
 const a=ensure().sayfa;
 return`<nav class="ka-tabs mok-sekmeler" aria-label="Maarif’in Kalbinde Oyun sayfaları">${Object.keys(KIMLIK).map(k=>`<button type="button" class="ka-tab" data-mok-git="${k}"${k===a?' aria-selected="true" aria-current="page"':''}>${esc(V.SAYFALAR[k].kisa)}</button>`).join('')}</nav>`;
}
function bilgiKarti(){
 const s=ensure(),f=(k,ad,ph)=>`<label class="ka-field"><span class="ka-field__label">${esc(ad)}</span><input class="ka-input" type="text" value="${esc(s[k])}" placeholder="${esc(ph)}" data-mok="${k}" autocomplete="off"></label>`;
 return kart('Belgeye yazılacak bilgiler',`<small class="ka-muted">Okul, öğretmen ve müdür adı uygulamadaki kayıtlarınızdan gelir; Word’e bu hâliyle yazılır. Gerekirse buradan değiştirin.</small><div class="ka-grid">${f('okul','Okul adı','Okul adı')}${f('ogretmen','Planı hazırlayan öğretmen','Ad SOYAD')}${f('mudur','Okul müdürü','Ad SOYAD')}</div>`);
}
function belgeSatiri(plan){
 const p=V.PLANLAR[plan],mesgul=ensure().mesgul.has(plan);
 return`<div class="mok-belge"><span class="mok-rozet" aria-hidden="true">WORD</span><div class="mok-belge__metin"><strong>${esc(p.ad)}</strong><small class="ka-muted">${esc(p.not)}</small></div><button type="button" class="ka-btn ka-btn--secondary ka-btn--sm" data-mok-indir="${plan}"${mesgul?' disabled':''}>${mesgul?'Hazırlanıyor…':'İndir'}</button></div>`;
}
const belgeKarti=(baslik,planlar)=>kart(baslik,planlar.map(belgeSatiri).join(''),'mok-belgeler');

/* ── sayfalar ── */
function nedirSayfasi(){
 const N=V.NEDIR;
 return`<p class="mok-giris">${esc(N.giris)}</p><div class="mok-kutu">${esc(N.kutu)}</div>
 ${N.bolumler.map(b=>kart(b.baslik,liste(b.maddeler.map(([k,t])=>[k?`${k}:`:'',t])))).join('')}
 ${bilgiKarti()}${belgeKarti('Bu bölümün belgeleri',['ilkokul','ortaokul'])}${kaynak()}`;
}
function oyunSatiri(o){
 return`<tr><td class="mok-nw">${esc(o.tarih)}<br><small class="ka-muted">${esc(o.sinif)}. sınıf</small></td><td><b>${esc(o.ad)}</b><br><small class="ka-muted">${esc(o.alan)}</small></td><td>${esc(o.gun)}</td></tr>`;
}
function oyunDetay(o){
 return`<details class="mok-oyun"><summary><b>${o.no}. ${esc(o.ad)}</b><small class="ka-muted"> · ${esc(o.tarih)} · ${esc(o.sinif)}. sınıf · ${esc(o.sure)}</small></summary><div class="mok-oyun__govde"><p><b>Araç-gereç:</b> ${esc(o.arac)} · <b>Alan:</b> ${esc(o.alan)}</p><p>${esc(o.nasil)}</p><p class="mok-guvenlik"><b>Güvenlik:</b> ${esc(o.guvenlik)}</p></div></details>`;
}
function oyunlarSayfasi(){
 const Y=V.SAYISMACA,D=V.DEGERLENDIRME;
 return`<p class="mok-giris">${esc(V.YIL)} eğitim-öğretim yılının her ayına iki geleneksel çocuk oyunu: toplam ${V.OYUNLAR.length} oyun. Oyunlar MEB Temel Eğitim Genel Müdürlüğünün “Yüz Yüze 100 Çocuk Oyunu” kitabından ilkokula uygun olanlar arasından seçildi; mevsime, belirli gün ve haftalara ve tatillere göre yerleştirildi.</p>
 <div class="mok-kutu">${esc(V.TAKVIM_NOTU)}</div>
 ${V.DONEMLER.map(d=>kart(`${d.ad} (${d.aralik}) · ${V.oyunlarDonem(d.no).length} oyun`,tablo(['Tarih · Sınıf','Oyun · Alan','Belirli gün / tema'],V.oyunlarDonem(d.no).map(oyunSatiri)))).join('')}
 <h3 class="mok-ara">Oyunlar kısaca nasıl oynanır?</h3>
 <div class="mok-oyunlar">${V.OYUNLAR.map(oyunDetay).join('')}</div>
 ${kart('Sayışmaca tekerlemeleri',`<p>${esc(Y.giris)}</p>${Y.tekerlemeler.map(t=>`<p class="mok-tekerleme">${esc(t)}</p>`).join('')}<small class="ka-muted">${esc(Y.not)}</small>`)}
 ${kart('Oyun sonrası öğretmen değerlendirmesi',`${liste(D.maddeler.map(t=>['',t]))}<small class="ka-muted">${esc(D.not)}</small>`)}
 ${kaynak()}`;
}
function ilkokulSayfasi(){
 const I=V.ILKOKUL;
 return`<h3 class="mok-ara">İlkokul Yıllık Çalışma Planı</h3><p class="mok-giris">${esc(I.giris)}</p>
 ${bilgiKarti()}${belgeKarti('',['ilkokul'])}
 ${kart('Aylara göre özet',tablo(['Ay','Haftalık oyunlardan örnekler','Ayın geleneksel oyunları'],I.ozet.map(([ay,ornek])=>`<tr><td class="mok-nw"><b>${esc(ay)}</b></td><td>${esc(ornek)}</td><td>${esc(V.oyunlarAy(ay).map(o=>o.ad).join(' · '))}</td></tr>`)))}
 ${kart('Belgeyi okulunuza uyarlarken',liste(I.uyarlama))}
 <p class="mok-kaynak">Oyunların kısa anlatımı: <button type="button" class="mok-baglanti" data-mok-git="oyunlar">Ayın Oyunları</button></p>${kaynak()}`;
}
function ortaokulSayfasi(){
 const O=V.ORTAOKUL;
 return`<h3 class="mok-ara">Ortaokul Yıllık Tema ve Oyun Planı</h3><p class="mok-giris">${esc(O.giris)}</p>
 ${bilgiKarti()}${belgeKarti('',['ortaokul'])}
 ${kart('Yıllık tema planı',tablo(['Ay · Tema','Örnek oyun / etkinlik ve amaç','Önerilen geleneksel oyun · belirli gün'],O.tema.map(([ay,tema,ornek,amac,gelenek])=>`<tr><td><b>${esc(ay)}</b><br>${esc(tema)}</td><td>${esc(ornek)}<br><small class="ka-muted">${esc(amac)}</small></td><td>${esc(gelenek)}</td></tr>`)))}
 ${kart('Uygulama esasları',liste(O.esaslar))}
 <p class="mok-kaynak">Oyunların kısa anlatımı: <button type="button" class="mok-baglanti" data-mok-git="oyunlar">Ayın Oyunları</button></p>${kaynak()}`;
}
const SAYFA_HTML={nedir:nedirSayfasi,oyunlar:oyunlarSayfasi,ilkokul:ilkokulSayfasi,ortaokul:ortaokulSayfasi};

function render(kok=document.getElementById('v2ModuleRoot')){
 if(!kok)return false;
 const s=ensure(),y=global.scrollY;
 varsayilanlar();
 kok.innerHTML=`<section class="mok-page" data-mok-page="${s.sayfa}">
 <header class="mok-head"><h2>${esc(V.SAYFALAR[s.sayfa].ad)}</h2><p class="ka-muted">${esc(ALTYAZI)}</p></header>
 ${sekmeler()}
 ${SAYFA_HTML[s.sayfa]()}
 </section>`;
 baglan(kok);
 global.scrollTo?.(0,y);
 return true;
}

/* ── etkileşim ── */
function git(sayfa){
 const t=global.AppNav?.tool?.(KIMLIK[sayfa]);
 if(!t)return global.toast?.('Sayfa açılamadı.');
 Promise.resolve(global.ShellUI?.routeModule?.(t.route,{page:t.page,title:t.label})).catch(()=>global.toast?.('Sayfa açılamadı.'));
}
async function indir(plan){
 const s=ensure(),p=V.PLANLAR[plan];
 if(!p||s.mesgul.has(plan))return false;
 if(!global.OgretmenDosyasi?.formKaydet)await global.AppLoader?.loadScript?.('js/modules/ogretmen-dosyasi.js?v=5');
 if(!global.OgretmenDosyasi?.formKaydet){global.toast?.('Word hazırlama bileşeni yüklenemedi.');return false}
 s.mesgul.add(plan);render();
 try{
  const ok=await global.OgretmenDosyasi.formKaydet(p.form,'docx',{okul:planOkulu(plan),ad:s.ogretmen,mudur:s.mudur});
  if(ok)global.toast?.('Plan indirildi.');
  return ok;
 }catch(e){console.warn('[Maarif’in Kalbinde Oyun]',e);global.toast?.(String(e?.message||'').startsWith('Form dosyası')||String(e?.message||'').includes('Word')?e.message:'Plan indirilemedi.');return false}
 finally{s.mesgul.delete(plan);if(document.querySelector('[data-mok-page]'))render()}
}
function baglan(kok){
 kok.querySelectorAll('[data-mok]').forEach(el=>el.addEventListener('input',()=>{const s=ensure(),k=el.dataset.mok;s[k]=String(el.value??'');s.elle[k]=true}));
 kok.querySelectorAll('[data-mok-git]').forEach(b=>b.addEventListener('click',()=>git(b.dataset.mokGit)));
 kok.querySelectorAll('[data-mok-indir]').forEach(b=>b.addEventListener('click',()=>indir(b.dataset.mokIndir)));
}

function temizle(){unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}
/* sayfa: 'nedir' | 'oyunlar' | 'ilkokul' | 'ortaokul' (bilinmeyen anahtar → nedir) */
function open(sayfa='nedir'){
 const k=V.SAYFALAR[sayfa]?sayfa:'nedir';
 /* Aynı oturumda sayfalar arasında geçerken elle yazılan belge bilgisi korunur. */
 const onceki=S;S=blank(k);if(onceki){S.elle=onceki.elle;['okul','ogretmen','mudur'].forEach(a=>{if(onceki.elle[a])S[a]=onceki[a]})}
 temizle();
 const ok=render();
 B.abonelik().forEach(p=>{
  const u=global.AppStore?.subscribe?.(p,()=>{
   const kok=document.querySelector('[data-mok-page]');if(!kok)return temizle();
   /* Veri sonradan geldiyse (senkron) yalnız değişiklik varsa yeniden çiz; yazarken odak kaybolmasın. */
   if(varsayilanlar()&&!kok.contains(document.activeElement))render();
  });
  if(u)unsubs.push(u);
 });
 B.hazirla().catch(e=>console.warn('[Maarif’in Kalbinde Oyun]',e?.message||e));
 return ok;
}

global.MaarifOyunModule={open,render,indir,git,reset:()=>{S=null;temizle()}};
})(window);

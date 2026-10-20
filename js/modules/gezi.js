/* Koruk Asistan — Gezi Planı
 * İl içi / il dışı gezi planı, gezi onay yazısı ve 3 nüshalık veli izin belgesini hazırlar; A4 olarak yazdırır / PDF alır.
 * Taslak yalnızca bu cihazda (localStorage) tutulur; sunucuya kayıt yapılmaz.
 * Çıktı merkezi ReportEngine ile alınır.
 */
(function(global){
'use strict';
if(global.GeziModule)return;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const rows=t=>{const v=global.AppStore?.data?.(t);return Array.isArray(v)?v:[]};
const KEY='ka-gezi-taslak-v1';
const DOCS=[['plan-ici','🏙️ İl İçi Gezi Planı'],['plan-disi','🚌 İl Dışı Gezi Planı'],['onay-ici','✍️ İl İçi Gezi Onayı'],['onay-disi','📋 İl Dışı Gezi Onayı'],['veli','📝 Veli İzin Belgesi']];
const DOT='……………………';
const ILGI='İlköğretim ve Ortaöğretim Kurumları Sosyal Etkinlikler Yönetmeliği (Değişiklik: 01/09/2018 tarih ve 30522 sayılı Resmî Gazete)';
const AMAC=[
 y=>`${y||'Gezi'} gezisi, öğrencilerin derslerde edindikleri bilgileri yerinde görerek pekiştirmelerini ve gerçek yaşamla ilişkilendirmelerini amaçlamaktadır. Gezi; kültür, sanat ve tarih bilincinin gelişmesine, öğrencilerin birlikte hareket etme ve kurallara uyma alışkanlığı kazanmasına katkı sağlayacaktır.`,
 y=>`${y||'Gezi'} gezisiyle öğrencilerin çevrelerini tanımaları, gözlem yoluyla öğrenmeleri ve sosyal becerilerini geliştirmeleri hedeflenmektedir. Etkinlik, sınıf içi öğrenmeleri destekleyerek öğrencilerin ilgi ve motivasyonunu artıracaktır.`,
 y=>`Gezi ile öğrencilerin ${y||'gezilecek yerin'} tarihî, kültürel ve doğal özelliklerini yerinde incelemeleri amaçlanmaktadır. Grup çalışması sayesinde sorumluluk, iş birliği ve arkadaşlık bağlarının güçlenmesi beklenmektedir.`,
 y=>`${y||'Gezi'} gezisi; öğrencilerin okul dışı öğrenme ortamlarında bilgi ve deneyim kazanmalarını, millî ve manevi değerleri benimsemelerini ve toplumsal yaşam kurallarını uygulayarak öğrenmelerini sağlayacaktır.`
];
const blank=()=>({doc:'plan-ici',ilce:'',okul:String(global.ReportEngine?.schoolInfo?.()?.okulAdi||'').trim(),sayi:'',yaziTarih:today(),teklif:'',mudur:'',olurTarih:today(),makam:'',makamUnvan:'İlçe Milli Eğitim Müdürü',
 gTarih:'',yer:'',saat:'',program:'',amac:'',amacIdx:0,plaka:'',sofor:'',kira:'',belediye:false,subeler:[{sube:'',k:'',e:''}],veli:'',idareci:'',ogretmenler:[''],ilgiOzel:'',govdeOzel:'',kapanisOzel:'',bosluk:'8'});
let state=null,zoomFull=false,resizeBound=false;
function pad(n){return String(n).padStart(2,'0')}
function today(){const d=new Date();return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function trDate(v){if(!v)return'';const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?v:`${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`}
function load(){try{const r=JSON.parse(global.localStorage?.getItem(KEY)||'null');if(r&&typeof r==='object')return{...blank(),...r,subeler:Array.isArray(r.subeler)&&r.subeler.length?r.subeler:[{sube:'',k:'',e:''}],ogretmenler:Array.isArray(r.ogretmenler)&&r.ogretmenler.length?r.ogretmenler:['']}}catch(_){}return blank()}
function persist(){try{global.localStorage?.setItem(KEY,JSON.stringify(ensure()))}catch(_){}}
function ensure(){if(!state)state=load();return state}
const num=v=>{const n=parseInt(v,10);return Number.isFinite(n)&&n>0?n:0};
const ayrik=v=>String(v||'').split(/[,\n]/).map(x=>x.trim()).filter(Boolean);
const toplam=s=>(s.subeler||[]).reduce((a,x)=>a+num(x.k)+num(x.e),0);
const isOnay=s=>s.doc==='onay-ici'||s.doc==='onay-disi',isPlan=s=>s.doc==='plan-ici'||s.doc==='plan-disi',isDisi=s=>/disi$/.test(s.doc);
function amacMetni(s){return AMAC[(s.amacIdx||0)%AMAC.length](String(s.yer||'').trim())}
function tarihYer(s){return`${trDate(s.gTarih)||DOT} tarihinde ${String(s.yer||'').trim()||DOT}`}
function ilgiMetni(s){return s.ilgiOzel||ILGI}
function govdeMetni(s){return s.govdeOzel||`Okulumuz öğrenci velilerinden muvafakat belgesi alınmak suretiyle ${tarihYer(s)} gezisinin aşağıda belirtilen plan dâhilinde yapılması planlanmaktadır.`}
function kapanisMetni(s){return s.kapanisOzel||'Makamınızca da uygun görüldüğü takdirde Olurlarınıza arz ederim.'}
function planTablo(s){
 const sb=(s.subeler||[]).filter(x=>String(x.sube||'').trim()||num(x.k)||num(x.e));
 const ogr=ayrik((s.ogretmenler||[]).join('\n'));
 const prog=String(s.program||'').split('\n').map(x=>x.trim()).filter(Boolean);
 const v=(x,d)=>esc(String(x||'').trim())||d;
 const arac=s.belediye?'Belediye aracı':'';
 return`<table class="gzi-tablo"><tbody>
<tr><th>GEZİ TARİHİ</th><td colspan="3">${v(trDate(s.gTarih),DOT)}</td></tr>
<tr><th>GEZİ YERİ</th><td colspan="3">${v(s.yer,DOT)}</td></tr>
<tr><th>GEZİ ÇIKIŞ / DÖNÜŞ SAATİ</th><td colspan="3">${v(s.saat,DOT)}</td></tr>
<tr><th>GEZİDE GİDİLECEK YERLERİN PLANI</th><td colspan="3">${prog.length?prog.map(esc).join('<br>'):DOT}</td></tr>
<tr><th>GEZİYE GİDECEK ARACIN</th><td colspan="3">${esc(arac)}</td></tr>
<tr><th>a) Plakaları</th><td colspan="3">${v(s.plaka,'')}</td></tr>
<tr><th>b) Şoförlerin Adı Soyadı</th><td colspan="3">${v(s.sofor,'')}</td></tr>
<tr><th>c) Aracın Kira Bedeli</th><td colspan="3">${v(s.kira,'')}</td></tr>
<tr><th rowspan="${Math.max(sb.length,1)+2}">GEZİYE KATILACAK SINIFLAR VE ÖĞRENCİ SAYISI</th><td class="gzi-c"><b>ŞUBE</b></td><td class="gzi-c"><b>K</b></td><td class="gzi-c"><b>E</b></td></tr>
${(sb.length?sb:[{sube:'',k:'',e:''}]).map(x=>`<tr><td class="gzi-c">${esc(x.sube)}</td><td class="gzi-c">${num(x.k)||''}</td><td class="gzi-c">${num(x.e)||''}</td></tr>`).join('')}
<tr><td class="gzi-c"><b>TOPLAM</b></td><td class="gzi-c" colspan="2"><b>${toplam(s)}</b></td></tr>
<tr><th>GEZİYE KATILACAK VELİ SAYISI</th><td colspan="3">${num(s.veli)}</td></tr>
<tr><th>GEZİYE KATILACAK İDARECİ</th><td colspan="3">${v(s.idareci,'')}</td></tr>
<tr><th>GEZİYE KATILACAK ÖĞRETMENLER</th><td colspan="3">${ogr.length?ogr.map((x,i)=>`${i+1}- ${esc(x)}`).join('<br>'):''}</td></tr>
<tr><th>GEZİNİN AMACI</th><td colspan="3">${v(s.amac,'')}</td></tr>
</tbody></table>`
}
function baslikPlan(s){return isDisi(s)?'İL DIŞI OKUL GEZİ PLANI':'OKUL GEZİ PLANI'}
function paperVeli(s){
 const okul=String(s.okul||'').trim()||'……………………………………';
 const bir=`<section class="gzi-veli"><h2 class="gzi-vbaslik">GEZİ VELİ İZİN BELGESİ</h2><p class="gzi-vmakam">${esc(okul.toLocaleUpperCase('tr'))} MÜDÜRLÜĞÜNE</p><p class="gzi-vmetin">Okulunuzun ${DOT} sınıfı ${DOT} numaralı öğrencisi ${DOT}${DOT}’in velisiyim. Öğrencimin <b>${esc(trDate(s.gTarih)||DOT)}</b> tarihinde${s.saat?` <b>${esc(s.saat)}</b> saatleri arasında`:''} <b>${esc(String(s.yer||'').trim()||DOT)}</b> gezisine katılmasına izin veriyorum.</p><p class="gzi-vmetin">Gereğini bilgilerinize arz ederim.</p><div class="gzi-vimza"><span>Tarih: …/…/……</span><span>Veli adı soyadı: ${DOT}</span><span>Telefon: ${DOT}</span><span>İmza: ${DOT}</span></div></section>`;
 return`<article class="gzi-paper gzi-paper--veli">${bir}${bir}${bir}</article>`
}
function paper(s,edit){
 if(s.doc==='veli')return paperVeli(s);
 const ed=k=>edit?` contenteditable="true" spellcheck="false" data-gz-ed="${k}"`:'';
 if(isPlan(s))return`<article class="gzi-paper"><h1 class="gzi-title">${baslikPlan(s)}</h1>${planTablo(s)}</article>`;
 const disi=isDisi(s),okul=String(s.okul||'').trim()||'……………………………',ilce=String(s.ilce||'').trim()||DOT;
 const hitap=disi?String(s.makam||'').trim()||'…………………… İlçe Milli Eğitim Müdürlüğüne':`${okul} Müdürlüğüne`;
 const imza=disi?{ad:s.mudur,unvan:'Okul Müdürü'}:{ad:s.teklif,unvan:'Müdür Yardımcısı'};
 const olur=disi?{ad:'',unvan:String(s.makamUnvan||'').trim()||'İlçe Milli Eğitim Müdürü'}:{ad:s.mudur,unvan:'Okul Müdürü'};
 return`<article class="gzi-paper"><div class="gzi-ust"><b>T.C.</b><b>${esc(ilce.toLocaleUpperCase('tr'))} KAYMAKAMLIĞI</b><b>${esc(okul)} Müdürlüğü</b></div>
<div class="gzi-bilgi"><span>Sayı : ${esc(s.sayi)||'821.04/……'}</span><span>${esc(trDate(s.yaziTarih))}</span></div><div class="gzi-bilgi"><span>Konu : Gezi Onayı</span></div>
<p class="gzi-hitap">${esc(hitap.toLocaleUpperCase('tr'))}</p>
<p class="gzi-yazi"><b>İlgi :</b> <span${ed('ilgi')}>${esc(ilgiMetni(s))}</span></p>
<p class="gzi-yazi gzi-ind"${ed('govde')}>${esc(govdeMetni(s))}</p>
<p class="gzi-yazi gzi-ind"${ed('kapanis')}>${esc(kapanisMetni(s))}</p>
<div class="gzi-imza"><span>${esc(imza.ad)||DOT}</span><b>${esc(imza.unvan)}</b></div>
<div class="gzi-bosluk" style="height:${Math.max(0,Math.min(150,parseFloat(s.bosluk)||0))}mm"></div>
<h2 class="gzi-title">${baslikPlan(s)}</h2>${planTablo(s)}
<p class="gzi-yazi gzi-ek"><b>Ek:</b> Gezi Dosyası.</p>
<div class="gzi-olur"><b class="gzi-olurb">O L U R</b><span>${esc(trDate(s.olurTarih))}</span><span class="gzi-olurimza">${esc(olur.ad)||DOT}</span><b>${esc(olur.unvan)}</b></div></article>`
}
function reportBody(data){return`<div class="gzi-print">${paper(data||ensure())}</div>`}
function print(data){
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 const s=data||ensure();
 global.ReportEngine.printReport(DOCS.find(x=>x[0]===s.doc)?.[1].replace(/^\S+\s/,'')||'Gezi',reportBody(s),{fileName:'Gezi',yon:'dikey',logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' '});return true
}
function field(label,html,cls=''){return`<label class="ka-field ${cls}"><span class="ka-field__label">${esc(label)}</span>${html}</label>`}
function input(key,type='text',ph=''){return`<input class="ka-input" type="${type}" value="${esc(ensure()[key])}" placeholder="${esc(ph)}" data-gz="${key}" autocomplete="off">`}
function tabsHtml(s){return`<div class="ttn-tabs" role="tablist">${DOCS.map(([k,l])=>`<button type="button" role="tab" class="ka-btn ${s.doc===k?'':'ka-btn--secondary'}" aria-selected="${s.doc===k}" data-gz-doc="${k}">${l}</button>`).join('')}</div>`}
function subeHtml(s){return`<div class="gzi-sube"><span class="ka-muted">Şube</span><span class="ka-muted">Kız</span><span class="ka-muted">Erkek</span><span class="ka-muted">Toplam</span><span></span>${s.subeler.map((x,i)=>`<input class="ka-input" value="${esc(x.sube)}" placeholder="6/A" data-gz-sube="${i}" data-k="sube" autocomplete="off"><input class="ka-input" inputmode="numeric" value="${esc(x.k)}" data-gz-sube="${i}" data-k="k" autocomplete="off"><input class="ka-input" inputmode="numeric" value="${esc(x.e)}" data-gz-sube="${i}" data-k="e" autocomplete="off"><b data-gz-st="${i}">${num(x.k)+num(x.e)}</b><button type="button" class="ka-btn ka-btn--secondary ka-btn--icon" data-gz-subesil="${i}" aria-label="Şubeyi kaldır">✕</button>`).join('')}</div><div class="gzi-genel"><b>Genel toplam: <span data-gz-gt>${toplam(s)}</span></b><button type="button" class="ka-btn ka-btn--secondary" data-gz-subeekle>+ Şube ekle</button></div>`}
function ogrHtml(s){return`<datalist id="gzOgr">${rows('ogretmenler').map(t=>`<option value="${esc(t.adSoyad||`${t.ad||''} ${t.soyad||''}`.trim())}">`).join('')}</datalist><div class="ttn-imzalar">${s.ogretmenler.map((x,i)=>`<div class="dlk-ek"><input class="ka-input" list="gzOgr" value="${esc(x)}" placeholder="Öğretmen adı soyadı" data-gz-ogr="${i}" autocomplete="off"><button type="button" class="ka-btn ka-btn--secondary ka-btn--icon" data-gz-ogrsil="${i}" aria-label="Öğretmeni kaldır">✕</button></div>`).join('')}</div><button type="button" class="ka-btn ka-btn--secondary" data-gz-ogrekle>+ Öğretmen ekle</button>`}
function gapCtl(s){return`<div class="ttn-gap"><span>Üst yazı ile plan tablosu arası</span><div><button class="ka-btn ka-btn--secondary" type="button" data-gz-gap data-d="-4" aria-label="Boşluğu azalt">−</button><b data-gz-gapv>${Math.max(0,parseFloat(s.bosluk)||0)} mm</b><button class="ka-btn ka-btn--secondary" type="button" data-gz-gap data-d="4" aria-label="Boşluğu artır">+</button></div></div>`}
function formHtml(s){
 const o=isOnay(s),p=isPlan(s),v=s.doc==='veli';
 const yazi=o?`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>🏛️ Yazı bilgileri</strong><div class="ka-grid">${field('Kaymakamlık (ilçe)',input('ilce','text','Örn: Mamak'))}${field('Okul / kurum adı',input('okul','text','Örn: Atatürk Ortaokulu'))}${field('Sayı',input('sayi','text','Örn: 821.04/1'))}${field('Yazı tarihi',input('yaziTarih','date'))}${isDisi(s)?field('Onay makamı',input('makam','text','Örn: Mamak İlçe Milli Eğitim Müdürlüğüne'))+field('Olur makamı unvanı',input('makamUnvan','text','İlçe Milli Eğitim Müdürü')):field('Teklif eden (müdür yardımcısı)',input('teklif','text','Örn: Ayşe YILMAZ'))}${field('Okul müdürü',input('mudur','text','Örn: Mehmet DEMİR'))}${field('Olur tarihi',input('olurTarih','date'))}</div>${isDisi(s)?'<p class="ka-muted">İl dışı gezilerde onay makamını ve süreci güncel mevzuattan doğrulayın.</p>':''}</div></article>`:'';
 const veliOkul=v?`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>🏫 Okul</strong>${field('Okul / kurum adı',input('okul','text','Örn: Atatürk Ortaokulu'))}</div></article>`:'';
 const gezi=`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>🚌 Gezi bilgileri</strong><div class="ka-grid">${field('Gezi tarihi',input('gTarih','date'))}${field('Gezi yeri',input('yer','text','Örn: Anıtkabir'))}${field('Çıkış / dönüş saati',input('saat','text','08:00 - 14:00'))}</div>${v?'':`<label class="ka-field"><span class="ka-field__label">Gezide gidilecek yerlerin planı</span><textarea class="ka-input" rows="4" data-gz="program" placeholder="08:00 Okuldan hareket&#10;08:45 Anıtkabir giriş&#10;14:00 Okula varış">${esc(s.program)}</textarea><small class="ka-muted">Her satıra bir madde yazın.</small></label><label class="ka-field"><span class="ka-field__label">Gezinin amacı</span><textarea class="ka-input" rows="5" data-gz="amac">${esc(s.amac)}</textarea></label><button type="button" class="ka-btn ka-btn--secondary" data-gz-amac>🔄 Amaç metni öner</button>`}</div></article>`;
 const arac=v?'':`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>🚐 Araç bilgileri</strong><label class="dlk-check"><input type="checkbox" data-gz-bel ${s.belediye?'checked':''}> <span>Belediye aracı ile gidilecek (plan tablosunda belirtilir)</span></label><div class="ka-grid">${field('Plaka / plakalar',input('plaka','text','Birden fazlaysa virgülle ayırın'))}${field('Şoförlerin adı soyadı',input('sofor','text','Birden fazlaysa virgülle ayırın'))}${field('Aracın kira bedeli',input('kira','text','Örn: 5.000 TL'))}</div></div></article>`;
 const kat=v?'':`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>👨‍👩‍👧 Katılacaklar</strong>${subeHtml(s)}${field('Katılacak veli sayısı',input('veli','text','0'))}${field('Katılacak idareci',input('idareci','text','Adı soyadı'))}<strong class="ka-muted">Katılacak öğretmenler</strong>${ogrHtml(s)}</div></article>`;
 return`${yazi}${veliOkul}${gezi}${arac}${kat}<footer class="vgf-actions"><button class="ka-btn ka-btn--secondary" type="button" data-gz-reset>Temizle</button><button class="ka-btn" type="button" data-gz-print>🖨 Yazdır / PDF</button></footer>
<article class="ka-card"><div class="ka-card__body ka-stack"><div class="ttn-prevhead"><strong>Önizleme</strong><button class="ka-btn ka-btn--secondary" type="button" data-gz-zoom>${zoomFull?'Sayfaya sığdır':'Yakınlaştır'}</button></div><p class="ka-muted">Yazdırma önizlemesi gibi tam sayfa görünür.${o?' Yazı alanlarına dokunup metni doğrudan değiştirebilirsiniz.':''}</p>${o?`<div class="ttn-gaps">${gapCtl(s)}</div>`:''}<div class="ttn-preview" data-gz-preview><div class="ttn-sheetwrap"><div class="ttn-sheet ka-report"><div class="gzi-print">${paper(s,true)}</div></div></div></div></div></article>`
}
function render(root=document.getElementById('v2ModuleRoot')){
 if(!root)return false;const s=ensure();
 root.innerHTML=`<section class="vgf-page ttn-page gzi-page" data-gz-page><header class="vgf-head"><div><h2>Gezi Planı</h2><p class="ka-muted">Gezi planını, onay yazısını ve veli izin belgesini hazırlayın; yazdırıp PDF alın. Girdiğiniz bilgiler bu cihazda taslak olarak saklanır.</p></div></header>${tabsHtml(s)}${formHtml(s)}</section>`;
 bind(root);fit(root);if(!resizeBound){resizeBound=true;global.addEventListener('resize',()=>fit(document.querySelector('[data-gz-page]')))}
 return true
}
function fit(root){
 const box=root?.querySelector('[data-gz-preview]'),wrap=box?.querySelector('.ttn-sheetwrap'),sh=wrap?.querySelector('.ttn-sheet');if(!sh)return;
 sh.style.transform='';const w=sh.offsetWidth,k=zoomFull?1:Math.min(1,(box.clientWidth-2)/w);
 sh.style.transform=k<1?`scale(${k})`:'';wrap.style.width=`${w*k}px`;wrap.style.height=`${sh.offsetHeight*k}px`
}
function updatePreview(root){const b=root?.querySelector('[data-gz-preview] .gzi-print');if(b)b.innerHTML=paper(ensure(),true);fit(root);persist()}
function bind(root){
 const s=ensure();
 root.querySelectorAll('[data-gz]').forEach(el=>el.addEventListener('input',()=>{const k=el.dataset.gz;s[k]=el.value;if(['gTarih','yer'].includes(k)){s.govdeOzel='';if(k==='yer'&&!s.amacManuel)s.amac=amacMetni(s)}if(k==='amac')s.amacManuel=true;if(k==='yer'&&!s.amacManuel){const a=root.querySelector('[data-gz="amac"]');if(a)a.value=s.amac}updatePreview(root)}));
 root.querySelectorAll('[data-gz-doc]').forEach(b=>b.addEventListener('click',()=>{s.doc=b.dataset.gzDoc;persist();render(root)}));
 root.querySelector('[data-gz-bel]')?.addEventListener('change',e=>{s.belediye=e.target.checked;updatePreview(root)});
 root.querySelector('[data-gz-amac]')?.addEventListener('click',()=>{s.amacIdx=((s.amacIdx||0)+1)%AMAC.length;s.amac=amacMetni(s);s.amacManuel=false;const a=root.querySelector('[data-gz="amac"]');if(a)a.value=s.amac;updatePreview(root)});
 root.querySelectorAll('[data-gz-sube]').forEach(el=>el.addEventListener('input',()=>{const i=Number(el.dataset.gzSube),x=s.subeler[i];if(!x)return;x[el.dataset.k]=el.value;const t=root.querySelector(`[data-gz-st="${i}"]`);if(t)t.textContent=num(x.k)+num(x.e);const g=root.querySelector('[data-gz-gt]');if(g)g.textContent=toplam(s);updatePreview(root)}));
 root.querySelector('[data-gz-subeekle]')?.addEventListener('click',()=>{s.subeler.push({sube:'',k:'',e:''});persist();render(root)});
 root.querySelectorAll('[data-gz-subesil]').forEach(b=>b.addEventListener('click',()=>{s.subeler.splice(Number(b.dataset.gzSubesil),1);if(!s.subeler.length)s.subeler.push({sube:'',k:'',e:''});persist();render(root)}));
 root.querySelectorAll('[data-gz-ogr]').forEach(el=>el.addEventListener('input',()=>{s.ogretmenler[Number(el.dataset.gzOgr)]=el.value;updatePreview(root)}));
 root.querySelector('[data-gz-ogrekle]')?.addEventListener('click',()=>{s.ogretmenler.push('');persist();render(root)});
 root.querySelectorAll('[data-gz-ogrsil]').forEach(b=>b.addEventListener('click',()=>{s.ogretmenler.splice(Number(b.dataset.gzOgrsil),1);if(!s.ogretmenler.length)s.ogretmenler.push('');persist();render(root)}));
 root.querySelectorAll('[data-gz-gap]').forEach(b=>b.addEventListener('click',()=>{s.bosluk=String(Math.max(0,Math.min(150,(parseFloat(s.bosluk)||0)+Number(b.dataset.d))));const v=root.querySelector('[data-gz-gapv]');if(v)v.textContent=`${s.bosluk} mm`;updatePreview(root)}));
 root.querySelector('[data-gz-zoom]')?.addEventListener('click',()=>{zoomFull=!zoomFull;const b=root.querySelector('[data-gz-zoom]');if(b)b.textContent=zoomFull?'Sayfaya sığdır':'Yakınlaştır';fit(root)});
 root.querySelector('[data-gz-print]')?.addEventListener('click',()=>print());
 root.querySelector('[data-gz-reset]')?.addEventListener('click',()=>{if(!confirm('Tüm girdiler temizlensin mi?'))return;const d=s.doc;state={...blank(),doc:d};persist();render(root)});
 const pv=root.querySelector('[data-gz-preview]');
 if(pv){
  pv.addEventListener('input',e=>{const el=e.target.closest?.('[data-gz-ed]');if(!el)return;const v=String(el.innerText||'').replace(/ /g,' ').replace(/\n+$/,''),k=el.dataset.gzEd;if(k==='ilgi')s.ilgiOzel=v.trim()===ILGI?'':v;else if(k==='govde')s.govdeOzel=v;else if(k==='kapanis')s.kapanisOzel=v;fit(root);persist()});
  pv.addEventListener('paste',e=>{const el=e.target.closest?.('[data-gz-ed]');if(!el)return;e.preventDefault();document.execCommand('insertText',false,(e.clipboardData||global.clipboardData)?.getData('text')||'')})
 }
}
function open(){state=load();return render()}
global.GeziModule={open,render,print,reportBody,paper,planTablo,toplam,amacMetni,DOCS,reset:()=>{state=blank();return state}};
})(window);

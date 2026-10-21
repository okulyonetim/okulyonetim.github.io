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
const DOCS=[['olustur','🧰 Gezi Planı Oluştur'],['plan-ici','🏙️ İl İçi Gezi Planı'],['plan-disi','🚌 İl Dışı Gezi Planı'],['onay-ici','✍️ İl İçi Gezi Onayı'],['onay-disi','📋 İl Dışı Gezi Onayı'],['veli','📝 Veli İzin Belgesi']];
const DOT='……………………';
const ILGI='İlköğretim ve Ortaöğretim Kurumları Sosyal Etkinlikler Yönetmeliği (Değişiklik: 01/09/2018 tarih ve 30522 sayılı Resmî Gazete)';
const AMAC=[
 y=>`${y||'Gezi'} gezisi, öğrencilerin derslerde edindikleri bilgileri yerinde görerek pekiştirmelerini ve gerçek yaşamla ilişkilendirmelerini amaçlamaktadır. Gezi; kültür, sanat ve tarih bilincinin gelişmesine, öğrencilerin birlikte hareket etme ve kurallara uyma alışkanlığı kazanmasına katkı sağlayacaktır.`,
 y=>`${y||'Gezi'} gezisiyle öğrencilerin çevrelerini tanımaları, gözlem yoluyla öğrenmeleri ve sosyal becerilerini geliştirmeleri hedeflenmektedir. Etkinlik, sınıf içi öğrenmeleri destekleyerek öğrencilerin ilgi ve motivasyonunu artıracaktır.`,
 y=>`Gezi ile öğrencilerin ${y||'gezilecek yerin'} tarihî, kültürel ve doğal özelliklerini yerinde incelemeleri amaçlanmaktadır. Grup çalışması sayesinde sorumluluk, iş birliği ve arkadaşlık bağlarının güçlenmesi beklenmektedir.`,
 y=>`${y||'Gezi'} gezisi; öğrencilerin okul dışı öğrenme ortamlarında bilgi ve deneyim kazanmalarını, millî ve manevi değerleri benimsemelerini ve toplumsal yaşam kurallarını uygulayarak öğrenmelerini sağlayacaktır.`
];
const okulB=()=>{const l=rows('okulBilgileri');return l.find(r=>r.id==='ayarlar')||l[0]||global.okulBilgileriAyari||{}};
const makamOto=(il,ilce)=>(!String(ilce||'').trim()||/merkez/i.test(ilce))&&String(il||'').trim()?'valilik':'kaymakamlik';
const blank=()=>({doc:'olustur',secSiniflar:[],makamTur:makamOto(okulB().il,okulB().ilce),gtur:'ici',ogrenciler:[],veliler:'',araclar:[{tur:'Otobüs',plaka:'',model:'',sofor:'',tc:'',src:'',koltuk:'46'}],veliAdet:'3',kafile:'',kafileTel:'',il:String(okulB().il||'').trim(),okulTel:'',acente:'',yetkili:'',acenteAdres:'',acenteTel:'',acenteMail:'',ucret:'',onOdeme:'30',gece:'0',gunduz:'1',sozTarih:'',ilce:String(okulB().ilce||'').trim(),okul:String(global.ReportEngine?.schoolInfo?.()?.okulAdi||'').trim(),sayi:'',yaziTarih:today(),teklif:'',mudur:'',olurTarih:today(),makam:'',makamUnvan:'İlçe Milli Eğitim Müdürü',
 gTarih:'',yer:'',saat:'',program:'',amac:'',amacIdx:0,plaka:'',sofor:'',kira:'',belediye:false,subeler:[{sube:'',k:'',e:''}],veli:'',idareci:'',ogretmenler:[''],ilgiOzel:'',govdeOzel:'',kapanisOzel:'',bosluk:'8'});
let state=null,zoomFull=false,resizeBound=false;
function pad(n){return String(n).padStart(2,'0')}
function today(){const d=new Date();return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`}
function trDate(v){if(!v)return'';const d=new Date(v+'T00:00:00');return Number.isNaN(d.getTime())?v:`${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()}`}
function load(){try{const r=JSON.parse(global.localStorage?.getItem(KEY)||'null');if(r&&typeof r==='object')return{...blank(),...r,secSiniflar:Array.isArray(r.secSiniflar)?r.secSiniflar:[],ogrenciler:Array.isArray(r.ogrenciler)?r.ogrenciler:[],araclar:Array.isArray(r.araclar)&&r.araclar.length?r.araclar:blank().araclar,subeler:Array.isArray(r.subeler)&&r.subeler.length?r.subeler:[{sube:'',k:'',e:''}],ogretmenler:Array.isArray(r.ogretmenler)&&r.ogretmenler.length?r.ogretmenler:['']}}catch(_){}return blank()}
function persist(){try{global.localStorage?.setItem(KEY,JSON.stringify(ensure()))}catch(_){}}
function ensure(){if(!state)state=load();return state}
const NK=v=>String(v||'').trim();
const num=v=>{const n=parseInt(v,10);return Number.isFinite(n)&&n>0?n:0};
const ayrik=v=>String(v||'').split(/[,\n]/).map(x=>x.trim()).filter(Boolean);
const toplam=s=>(s.subeler||[]).reduce((a,x)=>a+num(x.k)+num(x.e),0);
const isOlustur=s=>s.doc==='olustur';
const isOnay=s=>s.doc==='onay-ici'||s.doc==='onay-disi',isPlan=s=>s.doc==='plan-ici'||s.doc==='plan-disi',isDisi=s=>/disi$/.test(s.doc);
const dolu=a=>(a||[]).filter(x=>x&&(String(x.plaka||'').trim()||String(x.sofor||'').trim()));
const plakalar=s=>dolu(s.araclar).map(x=>String(x.plaka||'').trim()).filter(Boolean).join(', ')||s.plaka;
const soforler=s=>dolu(s.araclar).map(x=>String(x.sofor||'').trim()).filter(Boolean).join(', ')||s.sofor;
const veliSayisi=s=>num(s.veli)||ayrik(s.veliler).length;
const dogal=(a,b)=>String(a.ad||'').localeCompare(String(b.ad||''),'tr',{numeric:true});
function recount(s){(s.subeler||[]).forEach(x=>{if(!x.sid)return;const l=(s.ogrenciler||[]).filter(o=>o.sid===x.sid);x.k=String(l.filter(o=>o.g==='Kız').length);x.e=String(l.filter(o=>o.g==='Erkek').length)})}
function syncSecim(s){
 const sec=new Set(s.secSiniflar||[]),cl=rows('siniflar').filter(c=>sec.has(c.id)).sort(dogal);
 const tek=rows('veliler');
 const app=cl.flatMap(c=>tek.filter(v=>v.sinifId===c.id).sort((a,b)=>(parseInt(a.ogrenciNo,10)||0)-(parseInt(b.ogrenciNo,10)||0)).map(v=>({sid:c.id,sinif:c.ad||'',no:String(v.ogrenciNo||''),ad:v.ogrenciAdi||'',tc:'',veli:v.veliAdi||'',tel:v.telefon||v.veliTelefon||'',g:v.cinsiyet||''})));
 s.ogrenciler=[...(s.ogrenciler||[]).filter(x=>!x.sid),...app];
 const elle=(s.subeler||[]).filter(x=>!x.sid&&(NK(x.sube)||num(x.k)||num(x.e)));
 s.subeler=[...cl.map(c=>({sube:c.ad||'',sid:c.id,k:'',e:''})),...elle];if(!s.subeler.length)s.subeler=[{sube:'',k:'',e:''}];
 recount(s)
}
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
<tr><th>a) Plakaları</th><td colspan="3">${v(plakalar(s),'')}</td></tr>
<tr><th>b) Şoförlerin Adı Soyadı</th><td colspan="3">${v(soforler(s),'')}</td></tr>
<tr><th>c) Aracın Kira Bedeli</th><td colspan="3">${v(s.kira,'')}</td></tr>
<tr><th rowspan="${Math.max(sb.length,1)+2}">GEZİYE KATILACAK SINIFLAR VE ÖĞRENCİ SAYISI</th><td class="gzi-c"><b>ŞUBE</b></td><td class="gzi-c"><b>K</b></td><td class="gzi-c"><b>E</b></td></tr>
${(sb.length?sb:[{sube:'',k:'',e:''}]).map(x=>`<tr><td class="gzi-c">${esc(x.sube)}</td><td class="gzi-c">${num(x.k)||''}</td><td class="gzi-c">${num(x.e)||''}</td></tr>`).join('')}
<tr><td class="gzi-c"><b>TOPLAM</b></td><td class="gzi-c" colspan="2"><b>${toplam(s)}</b></td></tr>
<tr><th>GEZİYE KATILACAK VELİ SAYISI</th><td colspan="3">${veliSayisi(s)}</td></tr>
<tr><th>GEZİYE KATILACAK İDARECİ</th><td colspan="3">${v(s.idareci,'')}</td></tr>
<tr><th>GEZİYE KATILACAK ÖĞRETMENLER</th><td colspan="3">${ogr.length?ogr.map((x,i)=>`${i+1}- ${esc(x)}`).join('<br>'):''}</td></tr>
<tr><th>GEZİNİN AMACI</th><td colspan="3">${v(s.amac,'')}</td></tr>
</tbody></table>`
}
function ustMakam(s){const il=NK(s.il),ilce=NK(s.ilce);return(s.makamTur==='valilik'?`${il||DOT} VALİLİĞİ`:`${ilce||DOT} KAYMAKAMLIĞI`).toLocaleUpperCase('tr')}
function baslikPlan(s){return isDisi(s)?'İL DIŞI OKUL GEZİ PLANI':'OKUL GEZİ PLANI'}
function veliBelge(s,o){
 o=o||{};const okul=String(s.okul||'').trim()||'……………………………………';
 return`<section class="gzi-veli"><h2 class="gzi-vbaslik">GEZİ VELİ İZİN BELGESİ</h2><p class="gzi-vmakam">${esc(okul.toLocaleUpperCase('tr'))} MÜDÜRLÜĞÜNE</p><p class="gzi-vmetin">Okulunuzun ${esc(o.sinif)||DOT} sınıfı ${esc(o.no)||DOT} numaralı öğrencisi ${esc(o.ad)||DOT+DOT}’in velisiyim. Öğrencimin <b>${esc(trDate(s.gTarih)||DOT)}</b> tarihinde${s.saat?` <b>${esc(s.saat)}</b> saatleri arasında`:''} <b>${esc(String(s.yer||'').trim()||DOT)}</b> gezisine katılmasına izin veriyorum.</p><p class="gzi-vmetin">Gereğini bilgilerinize arz ederim.</p><div class="gzi-vimza"><span>Tarih: …/…/……</span><span>Veli adı soyadı: ${esc(o.veli)||DOT}</span><span>Telefon: ${esc(o.tel)||DOT}</span><span>İmza: ${DOT}</span></div></section>`}
function paperVeli(s){
 const bir=veliBelge(s);
 return`<article class="gzi-paper gzi-paper--veli">${bir}${bir}${bir}</article>`
}
const sayfa=h=>`<div class="gzi-sayfa">${h}</div>`;
const planAyar=s=>({...s,doc:s.gtur==='disi'?'plan-disi':'plan-ici'});
const baslik=(s,t)=>`<h1 class="gzi-title">${t}</h1><p class="gzi-yazi gzi-orta">${esc(String(s.okul||'').trim()||DOT)} — ${esc(trDate(s.gTarih)||DOT)} tarihli ${esc(String(s.yer||'').trim()||DOT)} gezisi</p>`;
function listeKagit(s){
 const o=s.ogrenciler||[],v=ayrik(s.veliler);
 const th=a=>`<tr>${a.map(x=>`<td class="gzi-c"><b>${x}</b></td>`).join('')}</tr>`;
 const ogr=`<table class="gzi-tablo gzi-liste"><tbody>${th(['S.No','Sınıf','No','Adı Soyadı','T.C. Kimlik No','Veli','Telefon'])}${(o.length?o:[{}]).map((x,i)=>`<tr><td class="gzi-c">${i+1}</td><td class="gzi-c">${esc(x.sinif)}</td><td class="gzi-c">${esc(x.no)}</td><td>${esc(x.ad)}</td><td class="gzi-c">${esc(x.tc)}</td><td>${esc(x.veli)}</td><td>${esc(x.tel)}</td></tr>`).join('')}</tbody></table>`;
 const vel=v.length?`<h2 class="gzi-title">GEZİYE KATILACAK VELİLER</h2><table class="gzi-tablo gzi-liste"><tbody>${th(['S.No','Adı Soyadı'])}${v.map((x,i)=>`<tr><td class="gzi-c">${i+1}</td><td>${esc(x)}</td></tr>`).join('')}</tbody></table>`:'';
 return sayfa(`<article class="gzi-paper">${baslik(s,'GEZİYE KATILACAK ÖĞRENCİ LİSTESİ')}${ogr}${vel}<div class="gzi-imza"><span>${esc(s.mudur)||DOT}</span><b>Okul Müdürü</b></div></article>`)
}
const veliAdet=s=>[2,3,4].includes(num(s.veliAdet))?num(s.veliAdet):3;
function veliKagit(s){
 const o=(s.ogrenciler||[]).length?s.ogrenciler:[{}],n=veliAdet(s),out=[];
 for(let i=0;i<o.length;i+=n){const grup=o.slice(i,i+n);out.push(sayfa(`<article class="gzi-paper gzi-vsayfa gzi-v${n}">${grup.map(x=>veliBelge(s,x)).join('')}</article>`))}
 return out.join('')
}
function surucuKagit(s){
 const a=dolu(s.araclar);
 return(a.length?a:[{}]).map(x=>{const r=(l,d,n)=>`<tr><th>${l}</th><td>${esc(d)||n}</td></tr>`;
  const pm=[NK(x.plaka),NK(x.model)].filter(Boolean).join(' / ');
  return sayfa(`<article class="gzi-paper"><h1 class="gzi-title">EK-10 SÜRÜCÜ/MUAVİN/REHBER VE DİĞER PERSONEL BEYANI</h1><p class="gzi-yazi">Türk Ceza Kanununun 53 üncü maddesinde belirtilen süreler geçmiş ve affa uğramış veya hükmün açıklanmasının geri bırakılmasına karar verilmiş olsa bile;</p><p class="gzi-yazi">1) Devletin güvenliğine karşı suçlar, anayasal düzene ve bu düzenin işleyişine karşı suçlar, zimmet, irtikâp, rüşvet, hırsızlık, dolandırıcılık, sahtecilik, güveni kötüye kullanma, hileli iflas, ihaleye fesat karıştırma, edimin ifasına fesat karıştırma, suçtan kaynaklanan mal varlığı değerlerini aklama veya kaçakçılık suçlarından mahkûm olmamış olmak veya bu suçlardan hakkında devam eden ya da uzlaşmayla neticelenmiş bir kovuşturmam bulunmamaktadır.</p><p class="gzi-yazi">2) Türk Ceza Kanunu’nun 81, 102, 103, 104, 105, 109, 179/3, 188, 190, 191, 226 ve 227 nci maddelerindeki suçlardan mahkûm olmamış olmak veya bu suçlardan hakkında devam eden ya da uzlaşmayla neticelenmiş bir kovuşturmam bulunmamaktadır.</p><p class="gzi-yazi">3) Son beş yıl içerisinde; bilinçli taksirli olarak ölümlü trafik kazalarına karışmamış olmak, alkollü olarak araç kullanma ve hız kurallarını ihlal nedeniyle, sürücü belgeleri birden fazla geri alınmamış olmak ve Kabahatler Kanununun 35 inci maddesinde düzenlenen kabahati işlemeyi alışkanlık hâline getirmediğimi beyan ederim.</p><p class="gzi-yazi">Yukarıda sayılan hususlar kendi iradem ve beyanımdır. Aksi ispat edildiği takdirde hakkımda adli makamlara suç duyurusunun yapılacağını biliyor ve kabul ediyorum.</p><table class="gzi-tablo gzi-beyan"><tbody>${r('ARACIN PLAKASI / MODELİ',pm,'.......... / ......')}${r('SÜRÜCÜNÜN ADI SOYADI',x.sofor,'....................')}${r('SÜRÜCÜNÜN T.C. KİMLİK NO',x.tc,'...........')}${r('SRC BELGE NO',x.src,'............')}</tbody></table><div class="gzi-imza2"><div><span>…./…./20….</span><b>Araç/Firma Sahibi/Yetkilisi</b><span>${esc(s.yetkili)||DOT}</span></div><div><span>…./…./20….</span><b>Sürücü / Personel</b><span>${esc(x.sofor)||DOT}</span></div></div></article>`)}).join('')
}
function saatler(s){const m=String(s.saat||'').split(/\s*[-–]\s*/);return[NK(m[0])||'……',NK(m[1])||'……']}
function sozlesmeKagit(s){
 const b=x=>`<b>${esc(NK(x))||DOT}</b>`,okul=NK(s.okul)||DOT,tr=trDate(s.gTarih)||'…./…./20….',[c,d]=saatler(s);
 const adr=[NK(s.ilce),NK(s.il)].filter(Boolean).join(' / ');
 const mad=(n,h,m)=>`<h2 class="gzi-madde">${h}</h2><p class="gzi-yazi"><b>MADDE ${n}-</b> ${m}</p>`;
 return sayfa(`<article class="gzi-paper"><h1 class="gzi-title">EK-6 EĞİTİM KURUMLARI GEZİLERİ ÇERÇEVE SÖZLEŞMESİ</h1>
${mad(1,'Sözleşmenin tarafları',`Bu sözleşme, ${b(okul)} ile yüklenici acente/firma ${b(s.acente)} arasında aşağıda yazılı şartlar dâhilinde yapılmıştır.`)}
${mad(2,'Taraflara ilişkin bilgiler',`2.1. Eğitim kurumunun adresi : ${b(okul)} ${adr?`(${esc(adr)}) `:''}adresinde olup Tel: ${b(s.okulTel)}<br>2.2. Yüklenici acente/firmanın tebligat adresi : ${b(s.acenteAdres)} olup Tel: ${b(s.acenteTel)} E-Posta: ${b(s.acenteMail)}`)}
${mad(3,'İşin tanımı',`3.1. Sözleşme konusu iş; ${b(okul)} öğretmen, öğrenci ve velilerinden oluşan gezi grubunun ${b(s.yer)}’na düzenleyecekleri geziye ilişkin sözleşmenin konusunu oluşturmaktadır.<br>3.2. Gezinin süresi: Gezi, ${b(tr)} saat: ${b(c)}’da hareket, ${b(tr)} saat: ${b(d)}’da dönüş olmak üzere toplam ${b(s.gece||'0')} gece ${b(s.gunduz||'1')} gündüzdür.<br>3.3. Yol güzergâhı ve gezilecek yerler: Gezi Planında (EK-9) açıklandığı biçimdedir.`)}
${mad(5,'Gezi ücreti ve ödeme şekli',`5.1. Gezi ücreti, sigorta ve vergiler dahil toplam ${b(s.ucret)} TL’dir. Bu iş için sözleşme bedelinin %${b(s.onOdeme||'30')} oranında ön ödeme sözleşmenin imzalanmasını müteakip 3 iş günü içerisinde; kalan ücret ise işin bitimini müteakiben yükleniciye ödenecektir.`)}
${mad(11,'Sözleşmenin ekleri','11.1. Yükleniciye ait İşletme Belgesi, Seyahat Acentesi İşletme Belgesi, D2/B2 Yetki Belgesi, Sürücü Belgesi, SRC ve Psikoteknik Raporu, Adli Sicil Beyanı (EK-10), Araç Tescil ve Sigorta Poliçeleri sözleşmeye eklenmiştir.')}
<div class="gzi-imza2 gzi-imza3"><div><span>${esc(trDate(s.sozTarih))||'…./…./20….'}</span><b>EĞİTİM KURUMU YÖNETİMİ</b><span>${esc(s.mudur)||DOT}</span><span>Okul Müdürü</span></div><div><span>${esc(trDate(s.sozTarih))||'…./…./20….'}</span><b>YÜKLENİCİ ACENTE / FİRMA</b><span>${esc(s.yetkili)||DOT}</span><span>Firma Yetkilisi İmza / Kaşe</span></div></div></article>`)
}
function oturmaKagit(s){
 const kisi=[];
 if(String(s.kafile||'').trim())kisi.push(`${s.kafile.trim()} (Kafile Başkanı)`);
 if(String(s.idareci||'').trim())kisi.push(`${s.idareci.trim()} (İdareci)`);
 ayrik((s.ogretmenler||[]).join('\n')).forEach(x=>kisi.push(`${x} (Öğrt.)`));
 (s.ogrenciler||[]).forEach(x=>kisi.push(`${x.ad||''}${x.sinif?` (${x.sinif})`:''}`));
 ayrik(s.veliler).forEach(x=>kisi.push(`${x} (Veli)`));
 let i=0;const a=dolu(s.araclar).length?dolu(s.araclar):[{tur:'Araç',koltuk:'46'}];
 return a.map((x,n)=>{
  const k=num(x.koltuk)||46,satir=[];
  for(let c=1;c<=k;c+=4){const h=q=>q<=k?`<td><b>${q}</b><br>${esc(kisi[i+q-1]||'')}</td>`:'<td></td>';satir.push(`<tr>${h(c)}${h(c+1)}<td class="gzi-koridor"></td>${h(c+2)}${h(c+3)}</tr>`)}
  i+=k;
  return sayfa(`<article class="gzi-paper">${baslik(s,`${esc(String(x.tur||'Araç').toLocaleUpperCase('tr'))} OTURMA PLANI${a.length>1?` — ${n+1}. ARAÇ`:''}`)}<p class="gzi-yazi gzi-orta">${esc(x.plaka||'')}</p><table class="gzi-tablo gzi-oturma"><tbody>${satir.join('')}</tbody></table></article>`)
 }).join('')
}
const BELGE={plan:s=>sayfa(paper(planAyar(s))),liste:listeKagit,veli:veliKagit,surucu:surucuKagit,sozlesme:sozlesmeKagit,oturma:oturmaKagit};
const BELGELER=[['plan','📋','Gezi Planı','Plan tablosu: tarih, yer, araç, katılımcı sayıları ve amaç.'],['liste','🎓','Öğrenci ve Veli Listesi','Sınıf, no, T.C., veli ve telefon bilgileriyle liste.'],['veli','✍️','Veli İzin Belgesi','Her öğrenci için ayrı sayfa; öğrenci eklenmediyse boş belge.'],['sozlesme','📑','EK-6 Çerçeve Sözleşmesi','Okul ile acente arasındaki gezi sözleşmesi; süre, ücret, ön ödeme ve ekler.'],['surucu','🪪','EK-10 Sürücü / Personel Beyanı','Her araç için ayrı sayfa; adli sicil beyanı ve imza bölümü.'],['oturma','💺','Oturma Planı','Koltuk koltuk yerleşim; kafile başkanı, görevliler, öğrenciler, veliler sırayla.']];
function printBelge(k){
 if(!global.ReportEngine?.printReport){global.toast?.('Rapor motoru hazır değil.');return false}
 const s=ensure(),keys=k==='hepsi'?BELGELER.map(x=>x[0]):[k];
 global.ReportEngine.printReport(k==='hepsi'?'Gezi Dosyası':BELGELER.find(x=>x[0]===k)?.[2]||'Gezi',`<div class="gzi-print">${keys.map(x=>BELGE[x](s)).join('')}</div>`,{fileName:'Gezi',yon:'dikey',kenarBosluk:10,logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' '});return true
}
function ogrenciCoz(txt){
 return String(txt||'').split(/\r?\n/).map(l=>l.trim()).filter(Boolean).map(l=>{const c=(l.includes('\t')?l.split('\t'):l.includes(';')?l.split(';'):l.split(',')).map(x=>x.trim());return{sinif:c[0]||'',no:c[1]||'',ad:c[2]||'',tc:c[3]||'',veli:c[4]||'',tel:c[5]||''}}).filter(x=>x.ad&&!/^(sınıf|sinif)$/i.test(x.sinif))
}
function paper(s,edit){
 if(s.doc==='veli')return paperVeli(s);
 const ed=k=>edit?` contenteditable="true" spellcheck="false" data-gz-ed="${k}"`:'';
 if(isPlan(s))return`<article class="gzi-paper"><h1 class="gzi-title">${baslikPlan(s)}</h1>${planTablo(s)}</article>`;
 const disi=isDisi(s),okul=String(s.okul||'').trim()||'……………………………',ilce=String(s.ilce||'').trim()||DOT;
 const hitap=disi?String(s.makam||'').trim()||'…………………… İlçe Milli Eğitim Müdürlüğüne':`${okul} Müdürlüğüne`;
 const imza=disi?{ad:s.mudur,unvan:'Okul Müdürü'}:{ad:s.teklif,unvan:'Müdür Yardımcısı'};
 const olur=disi?{ad:'',unvan:String(s.makamUnvan||'').trim()||'İlçe Milli Eğitim Müdürü'}:{ad:s.mudur,unvan:'Okul Müdürü'};
 return`<article class="gzi-paper"><div class="gzi-ust"><b>T.C.</b><b>${esc(ustMakam(s))}</b><b>${esc(okul)} Müdürlüğü</b></div>
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
 global.ReportEngine.printReport(DOCS.find(x=>x[0]===s.doc)?.[1].replace(/^\S+\s/,'')||'Gezi',reportBody(s),{fileName:'Gezi',yon:'dikey',kenarBosluk:10,logoGoster:false,tarihGoster:false,baslikGoster:false,okulAdi:' '});return true
}
function field(label,html,cls=''){return`<label class="ka-field ${cls}"><span class="ka-field__label">${esc(label)}</span>${html}</label>`}
function input(key,type='text',ph=''){return`<input class="ka-input" type="${type}" value="${esc(ensure()[key])}" placeholder="${esc(ph)}" data-gz="${key}" autocomplete="off">`}
function tabsHtml(s){return`<div class="ttn-tabs" role="tablist">${DOCS.map(([k,l])=>`<button type="button" role="tab" class="ka-btn ${s.doc===k?'':'ka-btn--secondary'}" aria-selected="${s.doc===k}" data-gz-doc="${k}">${l}</button>`).join('')}</div>`}
function siniflarHtml(s){const c=rows('siniflar').slice().sort(dogal);if(!c.length)return'<p class="ka-muted">Uygulamada kayıtlı sınıf yok; şubeleri elle girebilirsiniz.</p>';const sec=new Set(s.secSiniflar||[]);return`<strong class="ka-muted">Uygulamadaki sınıflardan seçin</strong><div class="ttn-tabs">${c.map(x=>`<button type="button" class="ka-btn ${sec.has(x.id)?'':'ka-btn--secondary'}" aria-pressed="${sec.has(x.id)}" data-gz-sinif="${esc(x.id)}">${esc(x.ad||'Sınıf')}</button>`).join('')}</div><p class="ka-muted">Seçilen sınıfların kız/erkek sayısı ve öğrencileri otomatik gelir.</p>`}
function subeHtml(s){return`${siniflarHtml(s)}<div class="gzi-sube"><span class="ka-muted">Şube</span><span class="ka-muted">Kız</span><span class="ka-muted">Erkek</span><span class="ka-muted">Toplam</span><span></span>${s.subeler.map((x,i)=>`<input class="ka-input" value="${esc(x.sube)}" placeholder="6/A" data-gz-sube="${i}" data-k="sube" autocomplete="off"><input class="ka-input" inputmode="numeric" value="${esc(x.k)}" data-gz-sube="${i}" data-k="k" autocomplete="off"><input class="ka-input" inputmode="numeric" value="${esc(x.e)}" data-gz-sube="${i}" data-k="e" autocomplete="off"><b data-gz-st="${i}">${num(x.k)+num(x.e)}</b><button type="button" class="ka-btn ka-btn--secondary ka-btn--icon" data-gz-subesil="${i}" aria-label="Şubeyi kaldır">✕</button>`).join('')}</div><div class="gzi-genel"><b>Genel toplam: <span data-gz-gt>${toplam(s)}</span></b><button type="button" class="ka-btn ka-btn--secondary" data-gz-subeekle>+ Şube ekle</button></div>`}
function ogrHtml(s){return`<datalist id="gzOgr">${rows('ogretmenler').map(t=>`<option value="${esc(t.adSoyad||`${t.ad||''} ${t.soyad||''}`.trim())}">`).join('')}</datalist><div class="ttn-imzalar">${s.ogretmenler.map((x,i)=>`<div class="dlk-ek"><input class="ka-input" list="gzOgr" value="${esc(x)}" placeholder="Öğretmen adı soyadı" data-gz-ogr="${i}" autocomplete="off"><button type="button" class="ka-btn ka-btn--secondary ka-btn--icon" data-gz-ogrsil="${i}" aria-label="Öğretmeni kaldır">✕</button></div>`).join('')}</div><button type="button" class="ka-btn ka-btn--secondary" data-gz-ogrekle>+ Öğretmen ekle</button>`}
function gapCtl(s){return`<div class="ttn-gap"><span>Üst yazı ile plan tablosu arası</span><div><button class="ka-btn ka-btn--secondary" type="button" data-gz-gap data-d="-4" aria-label="Boşluğu azalt">−</button><b data-gz-gapv>${Math.max(0,parseFloat(s.bosluk)||0)} mm</b><button class="ka-btn ka-btn--secondary" type="button" data-gz-gap data-d="4" aria-label="Boşluğu artır">+</button></div></div>`}
function olusturHtml(s){
 const a=s.araclar.map((x,i)=>`<div class="gzi-arac"><strong>${i+1}. ARAÇ</strong>${[['tur','Araç türü','Otobüs'],['plaka','Plaka','06 ABC 123'],['model','Model','2019'],['sofor','Şoför adı soyadı','Ad Soyad'],['tc','Şoför T.C. kimlik no','11 haneli'],['src','SRC belge no','SRC-2/12345'],['koltuk','Koltuk sayısı','46']].map(([k,l,ph])=>field(l,`<input class="ka-input" value="${esc(x[k])}" placeholder="${ph}" data-gz-arac="${i}" data-k="${k}" autocomplete="off">`)).join('')}${s.araclar.length>1?`<button type="button" class="ka-btn ka-btn--secondary" data-gz-aracsil="${i}">Aracı kaldır</button>`:''}</div>`).join('');
 const og=(s.ogrenciler||[]).map((x,i)=>`<div class="dlk-ek"><span>${i+1}. ${esc(x.sinif)} ${esc(x.no)} — ${esc(x.ad)}${x.veli?` · ${esc(x.veli)}`:''}</span><button type="button" class="ka-btn ka-btn--secondary ka-btn--icon" data-gz-ogrdel="${i}" aria-label="Öğrenciyi kaldır">✕</button></div>`).join('');
 return`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>🏫 Okul bilgileri</strong><div class="ka-grid">${field('Okul / kurum adı',input('okul','text','Örn: Atatürk Ortaokulu'))}${field('Okul müdürü',input('mudur','text','Örn: Mehmet DEMİR'))}</div></div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>📌 Gezi bilgileri</strong><label class="ka-field"><span class="ka-field__label">Gezi türü</span><select class="ka-input" data-gz="gtur"><option value="ici" ${s.gtur==='ici'?'selected':''}>İl içi gezi</option><option value="disi" ${s.gtur==='disi'?'selected':''}>İl dışı gezi</option></select></label><div class="ka-grid">${field('Gezi tarihi',input('gTarih','date'))}${field('Gezinin yeri',input('yer','text','Örn: Anıtkabir'))}${field('Çıkış / dönüş saati',input('saat','text','08:00 - 14:00'))}</div><label class="ka-field"><span class="ka-field__label">Gezide gidilecek yerlerin planı</span><textarea class="ka-input" rows="4" data-gz="program">${esc(s.program)}</textarea><small class="ka-muted">Her satıra bir madde yazın.</small></label><label class="ka-field"><span class="ka-field__label">Gezinin amacı</span><textarea class="ka-input" rows="4" data-gz="amac">${esc(s.amac)}</textarea></label><button type="button" class="ka-btn ka-btn--secondary" data-gz-amac>🔄 Amaç metni öner</button></div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><div class="gzi-genel"><strong>🚐 Araç ve şoför</strong><button type="button" class="ka-btn ka-btn--secondary" data-gz-aracekle>+ Araç</button></div><label class="dlk-check"><input type="checkbox" data-gz-bel ${s.belediye?'checked':''}> <span>Belediye aracı ile gidilecek</span></label>${field('Aracın kira bedeli',input('kira','text','Örn: 5.000 TL'))}${a}</div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>👥 Görevliler</strong><div class="ka-grid">${field('Gezi kafile başkanı',input('kafile','text','Ad Soyad'))}${field('Kafile başkanı telefonu',input('kafileTel','text','05..'))}${field('Katılacak idareci',input('idareci','text','Ad Soyad'))}</div><strong class="ka-muted">Katılacak öğretmen / personel</strong>${ogrHtml(s)}</div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>🤝 Acente ve sözleşme</strong><p class="ka-muted">EK-6 Çerçeve Sözleşmesi ve EK-10 beyanında kullanılır.</p><div class="ka-grid">${field('İl',input('il','text','Örn: Elazığ'))}${field('İlçe',input('ilce','text','Örn: Merkez'))}${field('Okul telefonu',input('okulTel','text','0424 000 00 00'))}${field('Acente / firma adı',input('acente','text','Örn: … Turizm Seyahat Acentesi'))}${field('Firma yetkilisi',input('yetkili','text','Ad Soyad'))}${field('Acente tebligat adresi',input('acenteAdres','text',''))}${field('Acente telefonu',input('acenteTel','text','0312 000 00 00'))}${field('Acente e-posta',input('acenteMail','text','iletisim@acenteadi.com'))}${field('Gece sayısı',input('gece','text','0'))}${field('Gündüz sayısı',input('gunduz','text','1'))}${field('Gezi ücreti (sigorta ve vergiler dahil, TL)',input('ucret','text','Örn: 12.500'))}${field('Ön ödeme oranı (%)',input('onOdeme','text','30'))}${field('Sözleşme tarihi',input('sozTarih','date'))}</div></div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>🎓 Katılacak öğrenciler (${(s.ogrenciler||[]).length})</strong>${siniflarHtml(s)}<label class="ka-field"><span class="ka-field__label">Excel / Google Form’dan yapıştır</span><textarea class="ka-input" rows="4" data-gz-paste placeholder="Sınıf, No, Ad Soyad, T.C., Veli, Telefon — her satıra bir öğrenci"></textarea></label><div class="gzi-genel"><button type="button" class="ka-btn" data-gz-yapistir>Listeye ekle</button>${(s.ogrenciler||[]).length?'<button type="button" class="ka-btn ka-btn--secondary" data-gz-ogrtemiz>Listeyi temizle</button>':''}</div>${og||'<p class="ka-muted">Öğrenci eklenmedi. Öğrenci listesi, oturma planı ve veli izin belgeleri bu listeden üretilir.</p>'}</div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>👨‍👩‍👧 Geziye katılacak veliler (${ayrik(s.veliler).length})</strong><label class="ka-field"><textarea class="ka-input" rows="3" data-gz="veliler" placeholder="Her satıra bir veli adı soyadı">${esc(s.veliler)}</textarea></label></div></article>
<article class="ka-card"><div class="ka-card__body ka-stack"><strong>📄 Belgeler</strong>${field('Sayfa başına veli izin belgesi',`<select class="ka-input" data-gz="veliAdet">${[2,3,4].map(n=>`<option value="${n}" ${veliAdet(s)===n?'selected':''}>${n} belge</option>`).join('')}</select>`)}<p class="ka-muted">Belgeler yukarıdaki bilgilerle doldurulur; yazdırıp PDF alabilirsiniz. Boş alanlar noktalı boşluk olarak basılır. </p>${BELGELER.map(([k,i,t,d])=>`<div class="dlk-ek"><div><strong>${i} ${t}</strong><p class="ka-muted">${d}</p></div><button type="button" class="ka-btn" data-gz-belge="${k}">🖨 Yazdır / PDF</button></div>`).join('')}<button type="button" class="ka-btn ka-btn--secondary" data-gz-belge="hepsi">Tüm belgeleri tek PDF’de al</button></div></article>`
}
function formHtml(s){
 if(isOlustur(s))return olusturHtml(s);
 const o=isOnay(s),p=isPlan(s),v=s.doc==='veli';
 const yazi=o?`<article class="ka-card"><div class="ka-card__body ka-stack"><strong>🏛️ Yazı bilgileri</strong><div class="ka-grid">${field('Üst makam',`<select class="ka-input" data-gz="makamTur"><option value="valilik" ${s.makamTur==='valilik'?'selected':''}>Valilik (merkez ilçe)</option><option value="kaymakamlik" ${s.makamTur!=='valilik'?'selected':''}>Kaymakamlık</option></select>`)}${field('İl',input('il','text','Örn: Elazığ'))}${field('İlçe',input('ilce','text','Örn: Mamak'))}${field('Okul / kurum adı',input('okul','text','Örn: Atatürk Ortaokulu'))}${field('Sayı',input('sayi','text','Örn: 821.04/1'))}${field('Yazı tarihi',input('yaziTarih','date'))}${isDisi(s)?field('Onay makamı',input('makam','text','Örn: Mamak İlçe Milli Eğitim Müdürlüğüne'))+field('Olur makamı unvanı',input('makamUnvan','text','İlçe Milli Eğitim Müdürü')):field('Teklif eden (müdür yardımcısı)',input('teklif','text','Örn: Ayşe YILMAZ'))}${field('Okul müdürü',input('mudur','text','Örn: Mehmet DEMİR'))}${field('Olur tarihi',input('olurTarih','date'))}</div>${isDisi(s)?'<p class="ka-muted">İl dışı gezilerde onay makamını ve süreci güncel mevzuattan doğrulayın.</p>':''}</div></article>`:'';
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
 root.querySelectorAll('[data-gz]').forEach(el=>el.addEventListener('input',()=>{const k=el.dataset.gz;s[k]=el.value;if(k==='makamTur'||k==='il'||k==='ilce')updatePreview(root);if(['gTarih','yer'].includes(k)){s.govdeOzel='';if(k==='yer'&&!s.amacManuel)s.amac=amacMetni(s)}if(k==='amac')s.amacManuel=true;if(k==='yer'&&!s.amacManuel){const a=root.querySelector('[data-gz="amac"]');if(a)a.value=s.amac}updatePreview(root)}));
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
 root.querySelectorAll('[data-gz-sinif]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.gzSinif,a=s.secSiniflar||(s.secSiniflar=[]),i=a.indexOf(id);if(i<0)a.push(id);else a.splice(i,1);syncSecim(s);persist();render(root)}));
 root.querySelectorAll('[data-gz-arac]').forEach(el=>el.addEventListener('input',()=>{const x=s.araclar[Number(el.dataset.gzArac)];if(x){x[el.dataset.k]=el.value;persist()}}));
 root.querySelector('[data-gz-aracekle]')?.addEventListener('click',()=>{s.araclar.push({tur:'Otobüs',plaka:'',model:'',sofor:'',tc:'',src:'',koltuk:'46'});persist();render(root)});
 root.querySelectorAll('[data-gz-aracsil]').forEach(b=>b.addEventListener('click',()=>{s.araclar.splice(Number(b.dataset.gzAracsil),1);persist();render(root)}));
 root.querySelector('[data-gz-yapistir]')?.addEventListener('click',()=>{const t=root.querySelector('[data-gz-paste]'),y=ogrenciCoz(t?.value);if(!y.length){global.toast?.('Eklenecek öğrenci bulunamadı. Satır: Sınıf, No, Ad Soyad…');return}s.ogrenciler=(s.ogrenciler||[]).concat(y);persist();render(root)});
 root.querySelectorAll('[data-gz-ogrdel]').forEach(b=>b.addEventListener('click',()=>{s.ogrenciler.splice(Number(b.dataset.gzOgrdel),1);recount(s);persist();render(root)}));
 root.querySelector('[data-gz-ogrtemiz]')?.addEventListener('click',()=>{if(!confirm('Öğrenci listesi temizlensin mi?'))return;s.ogrenciler=[];s.secSiniflar=[];syncSecim(s);persist();render(root)});
 root.querySelectorAll('[data-gz-belge]').forEach(b=>b.addEventListener('click',()=>printBelge(b.dataset.gzBelge)));
 const pv=root.querySelector('[data-gz-preview]');
 if(pv){
  pv.addEventListener('input',e=>{const el=e.target.closest?.('[data-gz-ed]');if(!el)return;const v=String(el.innerText||'').replace(/ /g,' ').replace(/\n+$/,''),k=el.dataset.gzEd;if(k==='ilgi')s.ilgiOzel=v.trim()===ILGI?'':v;else if(k==='govde')s.govdeOzel=v;else if(k==='kapanis')s.kapanisOzel=v;fit(root);persist()});
  pv.addEventListener('paste',e=>{const el=e.target.closest?.('[data-gz-ed]');if(!el)return;e.preventDefault();document.execCommand('insertText',false,(e.clipboardData||global.clipboardData)?.getData('text')||'')})
 }
}
function open(){state=load();return render()}
global.GeziModule={syncSecim,open,printBelge,BELGE,ogrenciCoz,render,print,reportBody,paper,planTablo,toplam,amacMetni,DOCS,reset:()=>{state=blank();return state}};
})(window);

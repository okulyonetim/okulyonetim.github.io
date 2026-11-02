#!/usr/bin/env node
/* Sosyal kulüp evrak paketini (Word) hazır kulüp kataloğuna çevirir.
 *   node scripts/kulup-katalog.mjs <klasör|dosya…> --id beyazay --ad "Beyazay Kulübü" [--anahtar beyazay,"beyaz ay"] [--yil 2026-2027]
 *        [--okul "KORUK ORTAOKULU"] [--danisman "Sedat KARAGÖZ"] [--mudur "Bilal BAYKAR"] [--cikti data/kulup] [--varlik assets/kulup]
 *
 * Klasörde kulübün şu dosyaları aranır (dosya adındaki sözcüğe göre): iç tüzük · yıllık (çalışma) planı · toplum hizmeti · aylık (faaliyet|çalışma) raporları ·
 * yıl sonu (zorunlu) · dönem sonu (varsa). Üye listesi, toplantı tutanağı ve denetleme kurulu raporu kulübe bağlı olmadığından alınmaz; her kulüp için ortak şablondan yazılır.
 *
 * Kulübe özel dört evrak (tüzük, yıllık plan, toplum hizmeti, aylık raporlar) kulübün KENDİ Word dosyası olarak saklanır (assets/kulup/{id}/): içerik ve görünüm aynen korunur,
 * yalnız kişiye ve okula bağlı yerler {{ALAN}} yapılır (uygulama bunları o kulübün danışmanı ve okuluyla doldurur) ve sayfa üst/alt boşluğu en az 15 mm'ye çıkarılır:
 *   · --okul / --danisman / --mudur ile verilen yazılı değerler (dosya, evrakburada'dan indiren öğretmenin bilgileriyle gelir) → {{OKUL_MUDURLUGU}}, {{DANISMAN}}, {{MUDUR}} …
 *   · "… MÜDÜRLÜĞÜ", yıl satırının altındaki noktalı okul satırı, "Okul Müdürü" üstündeki noktalı satır, "Danışman Öğretmen: ….", "Üye Sayısı: ….", "Kulüp Başkanı: ….", "Sekreter: …." alanları
 *   · tarih ve diğer noktalı yerler elle yazılmak üzere olduğu gibi kalır.
 * Dönem / yıl sonu raporlarının ay özetleri ve hazır değerlendirme metinleri JSON'a alınır (ortak şablon bunlarla doldurulur); ay özeti dosyada boşsa aylık raporun ilk üç maddesinden yazılır.
 * Çıktı: data/kulup/{id}.json + data/kulup/katalog.json (aynı id yeniden çalıştırılırsa yerini alır, diğer kulüplere dokunulmaz) + assets/kulup/{id}/*.docx. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const kok=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const JSZip=require(path.join(kok,'assets/vendor/jszip.min.js'));
const yukle=(dosya,ctx)=>{vm.runInContext(fs.readFileSync(path.join(kok,dosya),'utf8'),ctx)};
const ctx={};ctx.window=ctx;vm.createContext(ctx);
yukle('js/modules/yillik-plan-core.js',ctx);yukle('js/modules/kulup-core.js',ctx);
const C=ctx.YillikPlanCore;          // xmlAgaci + hucreMetni: uygulamadaki Word okuyucunun aynısı
const K=ctx.KulupCore;               // bölümleme (aylık raporlar) uygulamadakiyle aynı koddur

const AYLAR=K.AYLAR;
const norm=s=>String(s||'').toLocaleLowerCase('tr').replace(/\s+/g,' ').trim();
const kacisRe=s=>String(s).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const BUYUK=s=>String(s||'').toLocaleUpperCase('tr');
const BASLIK=s=>String(s||'').split(/\s+/).map(w=>w.charAt(0).toLocaleUpperCase('tr')+w.slice(1).toLocaleLowerCase('tr')).join(' ');

/* ── Word → gövde öğeleri (paragraf / tablo, belge sırasıyla) ── */
const alt=(d,ad)=>d.cocuk.filter(c=>c.ad===ad),ilk=(d,ad)=>d.cocuk.find(c=>c.ad===ad)||null;
function metin(d){
 if(d.ad==='w:t')return d.metin||'';if(d.ad==='w:tab')return' ';if(d.ad==='w:br'||d.ad==='w:cr')return'\n';
 return d.cocuk.map(metin).join('');
}
const sade=s=>String(s||'').replace(/[ \t ]+/g,' ').replace(/ ?\n ?/g,'\n').trim();
const paragrafMetni=p=>sade(metin(p));
const hucreParagraflari=tc=>alt(tc,'w:p').map(paragrafMetni).filter(Boolean);
function tablo(tbl){
 return alt(tbl,'w:tr').map(tr=>{
  const hucreler=[];
  for(const tc of alt(tr,'w:tc')){
   hucreler.push({paragraflar:hucreParagraflari(tc),metin:C.hucreMetni(tc)});
  }
  return hucreler;
 });
}
async function paketOku(dosya){return JSZip.loadAsync(fs.readFileSync(dosya))}
async function govde(dosya){
 const zip=await paketOku(dosya),xml=await zip.file('word/document.xml').async('string');
 const k=C.xmlAgaci(xml),body=ilk(ilk(k,'w:document')||k,'w:body');
 return body.cocuk.filter(c=>c.ad==='w:p'||c.ad==='w:tbl').map(c=>{
  if(c.ad==='w:tbl')return{tur:'tablo',satirlar:tablo(c)};
  const pr=ilk(c,'w:pPr'),liste=!!ilk(pr||{cocuk:[]},'w:numPr');
  const sayfa=c.cocuk.some(r=>r.ad==='w:r'&&r.cocuk.some(x=>x.ad==='w:br'&&x.oz['w:type']==='page'));
  return{tur:'p',liste,sayfa,metin:paragrafMetni(c)};
 });
}

/* ── katalog bilgisi: tema, yıl, dönem / yıl sonu metinleri, aylık raporların ayları ── */
/* "Tema: Bilim (B)" kutusu ya da planın TEMA sütunu → { kod, ad } */
function temaBul(ogeler){
 const hucreler=ogeler.flatMap(o=>o.tur==='tablo'?o.satirlar.flat().flatMap(h=>h.paragraflar):[o.metin]);
 const t=hucreler.find(x=>/^Tema\s*:/i.test(x));
 if(t){const m=/^Tema\s*:\s*(.*?)\s*(?:\(([A-ZÇĞİÖŞÜ]{1,4})\))?\s*$/i.exec(t);if(m&&m[1])return{kod:m[2]||'',ad:m[1]}}
 for(const o of ogeler){
  if(o.tur!=='tablo'||!o.satirlar.length)continue;
  const baslik=o.satirlar[0].map(h=>norm(h.metin)),i=baslik.indexOf('tema'),j=baslik.findIndex(x=>/hedef/.test(x));
  if(i<0||!o.satirlar[1])continue;
  const kod=(o.satirlar.slice(1).flatMap(r=>(r[j]?.paragraflar||[]))||[]).map(x=>/^([A-ZÇĞİÖŞÜ]{1,4})\.\d/.exec(x)?.[1]).find(Boolean)||'';
  return{kod,ad:o.satirlar[1][i].metin.trim()};
 }
 return{kod:'',ad:''};
}
function sonuRaporu(ogeler){
 const tab=ogeler.find(o=>o.tur==='tablo'&&o.satirlar.length>2&&norm(o.satirlar[0][0]?.metin)==='ay');if(!tab)throw new Error('faaliyet tablosu bulunamadı');
 const aylar=tab.satirlar.slice(1).map(r=>({ay:r[0].metin.trim(),calisma:(r[1]?.metin||'').trim()})).filter(r=>r.ay);
 const bolum=ad=>{const i=ogeler.findIndex(o=>o.tur==='p'&&new RegExp(`^[B-D]\\.\\s*${ad}`,'i').test(o.metin));return i<0?'':(ogeler[i+1]?.tur==='p'?ogeler[i+1].metin:'')};
 return{aylar,b:bolum('(Genel Değerlendirme|Değerlendirme|Kazanımlar)'),c:bolum('(Karşılaşılan Güçlükler|Güçlükler)'),d:bolum('(Gelecek Yıl İçin Öneriler|Öneriler)')};
}
/* Aylık raporun maddeleri (madde işaretli paragraflar; işaret sayı listesi ya da yazılı "•") → ay → metin; tablo biçimli raporlarda boş döner. */
const OZET_MADDE=3;   // ay özeti dosyada yoksa: aylık raporun ilk üç maddesi
const MADDE_ISARETI=/^[•·▪‣]\s*/;
function aylikMaddeleri(ogeler,aylar){
 const maddeler=[[]];
 for(const o of ogeler){
  if(o.tur==='p'&&o.sayfa&&!o.metin){maddeler.push([]);continue}
  if(o.tur==='p'&&o.metin&&(o.liste||MADDE_ISARETI.test(o.metin)))maddeler[maddeler.length-1].push(o.metin.replace(MADDE_ISARETI,''));
 }
 const sonuc={};aylar.forEach((a,i)=>{if(maddeler[i]?.length)sonuc[a]=maddeler[i].slice(0,OZET_MADDE).join(' ')});
 return sonuc;
}
/* Belgenin bütün metni (tablo hücreleri dahil) */
const tumMetin=ogeler=>ogeler.flatMap(o=>o.tur==='tablo'?o.satirlar.flat().flatMap(h=>h.paragraflar):[o.metin]).join(' ');

/* ── kişiye / okula bağlı yerleri {{ALAN}} yapma ──
 * Paragraf bazında çalışır: metin <w:t> parçalarının birleşimidir; eşleşen aralık ilk parçaya yazılır (biçim korunur), kalan parçalardan silinir. */
const PARAGRAF=/<w:p[ >][\s\S]*?<\/w:p>/g,PARCA=/(<w:t(?: [^>]*)?>)([^<]*)(<\/w:t>)/g;
function paragrafDegistir(p,re,deger){
 const parcalar=[];let m;
 PARCA.lastIndex=0;
 while((m=PARCA.exec(p)))parcalar.push({bas:m.index,ac:m[1],metin:m[2],kapa:m[3],uzun:m[0].length});
 if(!parcalar.length)return{p,adet:0};
 const tam=parcalar.map(x=>x.metin).join(''),esler=[...tam.matchAll(re)];
 if(!esler.length)return{p,adet:0};
 const yeni=parcalar.map(x=>x.metin),basla=[];let t=0;parcalar.forEach(x=>{basla.push(t);t+=x.metin.length});
 for(const e of esler.reverse()){
  const [al,yazi]=deger(e),ofs=e.index+(al==null?0:e[0].indexOf(al)),son=ofs+(al==null?e[0].length:al.length);
  let yazildi=false;
  parcalar.forEach((x,i)=>{
   const a=basla[i],b=a+x.metin.length;
   if(b<=ofs||a>=son)return;
   const s=Math.max(ofs,a)-a,k=Math.min(son,b)-a,eski=yeni[i];
   yeni[i]=eski.slice(0,s)+(yazildi?'':yazi)+eski.slice(k);yazildi=true;
  });
 }
 let sonuc='',son=0;
 parcalar.forEach((x,i)=>{sonuc+=p.slice(son,x.bas)+x.ac+yeni[i]+x.kapa;son=x.bas+x.uzun});
 return{p:sonuc+p.slice(son),adet:esler.length};
}
const NOKTALI='(?:…+|\\.{4,})';
function kuralKur({okul,danisman,mudur}){
 const kurallar=[];
 const ekle=(ad,re,deger,ek)=>kurallar.push({ad,re,deger,...(ek||{})});
 /* yazılı değerler */
 if(okul){
  const o=kacisRe(okul),baslikli=kacisRe(BASLIK(okul));
  ekle('okul müdürlüğüne',new RegExp(`${o}\\s+MÜDÜRLÜĞÜNE`,'g'),()=>[null,'{{OKUL_MUDURLUGU_YONELME}}']);
  ekle('okul müdürlüğü',new RegExp(`${o}\\s+MÜDÜRLÜĞÜ`,'g'),()=>[null,'{{OKUL_MUDURLUGU}}']);
  ekle('okul adı (büyük)',new RegExp(o,'g'),()=>[null,'{{OKUL_BUYUK}}']);
  ekle('okul adı',new RegExp(baslikli,'g'),()=>[null,'{{OKUL}}']);
 }
 if(danisman)ekle('danışman adı',new RegExp(kacisRe(danisman),'g'),()=>[null,'{{DANISMAN}}']);
 if(mudur)ekle('müdür adı',new RegExp(kacisRe(mudur),'g'),()=>[null,'{{MUDUR}}']);
 /* noktalı alanlar */
 ekle('… müdürlüğüne',new RegExp(`${NOKTALI}\\s*MÜDÜRLÜĞÜNE`,'g'),()=>[null,'{{OKUL_MUDURLUGU_YONELME}}']);
 ekle('… müdürlüğü',new RegExp(`${NOKTALI}\\s*MÜDÜRLÜĞÜ(?!NE)`,'g'),()=>[null,'{{OKUL_MUDURLUGU}}']);
 ekle('Danışman Öğretmen: ….',new RegExp(`Danışman [Öö]ğretmen\\s*:\\s*(${NOKTALI})`,'g'),e=>[e[1],'{{DANISMAN}}']);
 ekle('Üye Sayısı: ….',new RegExp(`Üye Sayısı\\s*:\\s*(${NOKTALI})`,'g'),e=>[e[1],'{{UYE_SAYISI}}']);
 ekle('Kulüp Başkanı: ….',new RegExp(`Kulüp Başkanı\\s*:\\s*(${NOKTALI})`,'g'),e=>[e[1],'{{BASKAN}}']);
 ekle('Sekreter: ….',new RegExp(`(?:^|[\\s\\d.])Sekreter\\s*:\\s*(${NOKTALI})`,'g'),e=>[e[1],'{{SEKRETER}}']);
 ekle('Okul Müdürü üstündeki noktalı satır',/^(?=[\s\S]*Okul Müdürü)[\s\S]*?(…{6,}|\.{8,})/g,e=>[e[1],'{{MUDUR}}']);
 return kurallar;
}
/* Önceki paragrafı bilinen yıl satırı olan, yalnız noktadan oluşan paragraf → okul adı (kapak) */
const KAPAK_OKUL={onceki:/E[ĞG]İTİM[\s-]*ÖĞRETİM\s+YILI/i,ol:new RegExp(`^\\s*(${NOKTALI})\\s*$`)};
function kisisellestir(xml,secenek,sayac){
 const kurallar=kuralKur(secenek);let onceki='';
 const say=(ad,n)=>{if(n)sayac[ad]=(sayac[ad]||0)+n};
 xml=xml.replace(PARAGRAF,p=>{
  let q=p;
  const metni=[...q.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map(x=>x[1]).join('');
  for(const k of kurallar){const r=paragrafDegistir(q,k.re,k.deger);if(r.adet){q=r.p;say(k.ad,r.adet)}}
  if(KAPAK_OKUL.onceki.test(onceki)&&KAPAK_OKUL.ol.test(metni)){
   const r=paragrafDegistir(q,new RegExp(NOKTALI,'g'),()=>[null,'{{OKUL_BUYUK}}']);if(r.adet){q=r.p;say('kapaktaki okul satırı',1)}
  }
  if(metni.trim())onceki=metni;
  return q;
 });
 /* üst / alt boşluk en az 15 mm (851 twip) */
 xml=xml.replace(/<w:pgMar([^>]*?)\/>/g,(m,a)=>{
  let degisti=false;
  const b=a.replace(/w:(top|bottom)="(-?\d+)"/g,(x,y,v)=>{if(Number(v)>=851)return x;degisti=true;return`w:${y}="851"`});
  if(degisti)sayac['üst/alt boşluk 15 mm']=(sayac['üst/alt boşluk 15 mm']||0)+1;
  return`<w:pgMar${b}/>`;
 });
 return xml;
}
const XML_PARCALARI=/^word\/(document|header\d*|footer\d*)\.xml$/;
async function bolumMetinleri(dosya){
 const zip=await paketOku(dosya),xml=await zip.file('word/document.xml').async('string');
 const bas=xml.indexOf('<w:body>')+8,son=xml.lastIndexOf('</w:body>'),g=xml.slice(bas,son),ks=g.lastIndexOf('<w:sectPr');
 return K.bolumle(ks<0?g:g.slice(0,ks)).bolumler.map(b=>b.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim());
}
const ayBul=metni=>{
 const u=BUYUK(metni);let en=null;
 for(const a of AYLAR){const i=u.indexOf(a);if(i>=0&&(!en||i<en.i))en={a,i}}
 return en?.a||'';
};

/* ── giriş ── */
const girdiler=[],secenek={okul:'',danisman:'',mudur:''};let id='',ad='',yil='',anahtar=[],cikti=path.join(kok,'data/kulup'),varlik=path.join(kok,'assets/kulup');
const arg=process.argv.slice(2);
for(let i=0;i<arg.length;i++){
 const a=arg[i];
 if(a==='--id')id=arg[++i];else if(a==='--ad')ad=arg[++i];else if(a==='--yil')yil=arg[++i];
 else if(a==='--okul')secenek.okul=arg[++i];else if(a==='--danisman')secenek.danisman=arg[++i];else if(a==='--mudur')secenek.mudur=arg[++i];
 else if(a==='--anahtar')anahtar=arg[++i].split(',').map(s=>s.trim()).filter(Boolean);
 else if(a==='--cikti')cikti=path.resolve(arg[++i]);else if(a==='--varlik')varlik=path.resolve(arg[++i]);else girdiler.push(path.resolve(a));
}
if(!girdiler.length||!id||!ad){console.error('Kullanım: node scripts/kulup-katalog.mjs <klasör> --id beyazay --ad "Beyazay Kulübü" [--anahtar a,b] [--yil 2026-2027] [--okul "KORUK ORTAOKULU"] [--danisman "Ad SOYAD"] [--mudur "Ad SOYAD"]');process.exit(1)}
const dosyalar=girdiler.flatMap(g=>fs.statSync(g).isDirectory()?fs.readdirSync(g).filter(f=>/\.docx$/i.test(f)&&!f.startsWith('~$')).map(f=>path.join(g,f)):[g]);
const bul=(re,zorunlu=true,ad)=>{const d=dosyalar.find(f=>re.test(path.basename(f).toLocaleLowerCase('tr')));if(!d&&zorunlu)throw new Error(`"${ad}" dosyası bulunamadı (dosya adında ${re} geçmeli)`);return d||null};
const F={
 tuzuk:bul(/tuzuk|tüzük/,true,'iç tüzük'),plan:bul(/yillik.*plan|yıllık.*plan/,true,'yıllık plan'),toplum:bul(/toplum/,true,'toplum hizmeti'),
 aylik:bul(/aylik|aylık/,true,'aylık raporlar'),yil:bul(/yil[-_ ]*sonu|yıl[-_ ]*sonu/,true,'yıl sonu raporu'),donem:bul(/d[oö]nem[-_ ]*sonu/,false)
};
const hedefler={tuzuk:'tuzuk.docx',plan:'yillik-plan.docx',toplum:'toplum-hizmeti.docx',aylik:'aylik-rapor.docx'};

/* kulübün kendi evrakları */
const klasor=path.join(varlik,id);
fs.rmSync(klasor,{recursive:true,force:true});
const ozet=[];
for(const [k,dosya] of Object.entries(hedefler)){
 const sayac={};
 const zip=await paketOku(F[k]);
 for(const adi of Object.keys(zip.files)){if(XML_PARCALARI.test(adi))zip.file(adi,kisisellestir(await zip.file(adi).async('string'),secenek,sayac))}
 fs.mkdirSync(klasor,{recursive:true});
 fs.writeFileSync(path.join(klasor,dosya),await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
 const kalan=[];
 const xml=await zip.file('word/document.xml').async('string'),duz=[...xml.matchAll(/<w:t(?: [^>]*)?>([^<]*)<\/w:t>/g)].map(x=>x[1]).join('|');
 for(const [etiket,dogru] of [['okul',secenek.okul],['danışman',secenek.danisman],['müdür',secenek.mudur]])if(dogru&&norm(duz).includes(norm(dogru)))kalan.push(`${etiket} adı yerinde kaldı`);
 ozet.push(`  ${dosya}: ${Object.entries(sayac).map(([a,n])=>`${a} ×${n}`).join(', ')||'alan yok'}${kalan.length?`  ⚠ ${kalan.join(', ')}`:''}`);
}

/* katalog bilgisi */
const ogePlan=await govde(F.plan),ogeTuzuk=await govde(F.tuzuk),ogeAylik=await govde(F.aylik);
const tema=temaBul(ogePlan);
const yilBul=yil||[ogeTuzuk,ogePlan].map(o=>/(\d{4})\s*-\s*(\d{4})/.exec(tumMetin(o))?.slice(1,3).join('-')).find(Boolean)||'';
const bolumler=await bolumMetinleri(path.join(klasor,hedefler.aylik));
const aylar=bolumler.map(ayBul);
if(aylar.some(a=>!a)||new Set(aylar).size!==aylar.length)throw new Error(`aylık raporların ayları ayırt edilemedi: ${aylar.join(', ')}`);
const donem=F.donem?sonuRaporu(await govde(F.donem)):null,yilSonu=sonuRaporu(await govde(F.yil));
const maddeler=aylikMaddeleri(ogeAylik,aylar);
for(const r of [yilSonu,donem].filter(Boolean))for(const a of r.aylar)if(!a.calisma&&maddeler[a.ay])a.calisma=maddeler[a.ay];

const paket={id,ad,yil:yilBul,tema,aylar,donemSonu:donem,yilSonu};
fs.mkdirSync(cikti,{recursive:true});
fs.writeFileSync(path.join(cikti,`${id}.json`),JSON.stringify(paket)+'\n');

const indexYolu=path.join(cikti,'katalog.json');
let index={kulupler:[]};try{index=JSON.parse(fs.readFileSync(indexYolu,'utf8'))}catch(_){}
const kayit={id,ad,anahtar:anahtar.length?anahtar:[id],yil:paket.yil,tema,sayilar:{aylik:aylar.length}};
index.kulupler=[...index.kulupler.filter(k=>k.id!==id),kayit].sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));
fs.writeFileSync(indexYolu,JSON.stringify(index,null,1)+'\n');
console.log(`${ad}: tema ${tema.ad||'—'}${tema.kod?` (${tema.kod})`:''}, ${aylar.length} aylık rapor (${aylar[0]}…${aylar.at(-1)}), dönem sonu ${donem?`${donem.aylar.length} ay`:'dosyası yok (yıl sonundan)'}, yıl sonu ${yilSonu.aylar.length} ay, yıl ${paket.yil}`);
console.log(ozet.join('\n'));
const bosOzet=yilSonu.aylar.filter(a=>!a.calisma).length;
if(bosOzet)console.log(`⚠ yıl sonu raporunda ${bosOzet} ayın özeti boş`);

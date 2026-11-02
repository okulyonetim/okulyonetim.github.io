#!/usr/bin/env node
/* Sosyal kulüp evrak paketini (Word) hazır kulüp kataloğuna çevirir.
 *   node scripts/kulup-katalog.mjs <klasör> --id siberay --ad "Siberay Kulübü" [--anahtar siberay,siber] [--yil 2026-2027] [--cikti data/kulup]
 * Klasörde kulübün şu dosyaları aranır (dosya adında geçen sözcüğe göre): ic-tuzuk · yillik-plan · toplum-hizmeti · aylik-faaliyet · donem-sonu · yil-sonu.
 * Kulübe bağlı olmayan evraklar (üye listesi, toplantı tutanağı, denetleme kurulu raporu) katalogda tutulmaz; şablondan her kulüp için yazılır.
 * Çıktı: data/kulup/{id}.json + data/kulup/katalog.json (kulüp listesi; aynı id yeniden çalıştırılırsa yerini alır, diğer kulüplere dokunulmaz). */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const kok=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const JSZip=require(path.join(kok,'assets/vendor/jszip.min.js'));
const ctx={};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(kok,'js/modules/yillik-plan-core.js'),'utf8'),ctx);
const C=ctx.YillikPlanCore;          // xmlAgaci + hucreMetni: uygulamadaki Word okuyucunun aynısı

const AYLAR=['EYLÜL','EKİM','KASIM','ARALIK','OCAK','ŞUBAT','MART','NİSAN','MAYIS','HAZİRAN'];
const norm=s=>String(s||'').toLocaleLowerCase('tr').replace(/\s+/g,' ').trim();

/* ── Word → gövde öğeleri (paragraf / tablo, belge sırasıyla) ── */
const alt=(d,ad)=>d.cocuk.filter(c=>c.ad===ad),ilk=(d,ad)=>d.cocuk.find(c=>c.ad===ad)||null;
function metin(d){
 if(d.ad==='w:t')return d.metin||'';if(d.ad==='w:tab')return' ';if(d.ad==='w:br'||d.ad==='w:cr')return'\n';
 return d.cocuk.map(metin).join('');
}
const sade=s=>String(s||'').replace(/[ \t ]+/g,' ').replace(/ ?\n ?/g,'\n').trim();
const paragrafMetni=p=>sade(metin(p));
const hucreParagraflari=tc=>alt(tc,'w:p').map(paragrafMetni).filter(Boolean);
function tablo(tbl){
 return alt(tbl,'w:tr').map(tr=>{
  const hucreler=[];
  for(const tc of alt(tr,'w:tc')){
   const vm2=ilk(ilk(tc,'w:tcPr')||{cocuk:[]},'w:vMerge');
   hucreler.push({paragraflar:hucreParagraflari(tc),metin:C.hucreMetni(tc),devam:!!vm2&&vm2.oz['w:val']!=='restart'});
  }
  return hucreler;
 });
}
async function govde(dosya){
 const zip=await JSZip.loadAsync(fs.readFileSync(dosya)),xml=await zip.file('word/document.xml').async('string');
 const k=C.xmlAgaci(xml),body=ilk(ilk(k,'w:document')||k,'w:body');
 return body.cocuk.filter(c=>c.ad==='w:p'||c.ad==='w:tbl').map(c=>{
  if(c.ad==='w:tbl')return{tur:'tablo',satirlar:tablo(c)};
  const pr=ilk(c,'w:pPr'),stil=ilk(pr||{cocuk:[]},'w:pStyle')?.oz['w:val']||'',liste=!!ilk(pr||{cocuk:[]},'w:numPr');
  const sayfa=c.cocuk.some(r=>r.ad==='w:r'&&r.cocuk.some(x=>x.ad==='w:br'&&x.oz['w:type']==='page'));
  return{tur:'p',stil,liste,sayfa,metin:paragrafMetni(c)};
 });
}

/* ── evrak ayrıştırıcıları ── */
function tuzuk(ogeler){
 const maddeler=[];let baslik='',son=null;
 for(const o of ogeler){
  if(o.tur==='tablo'){
   if(son&&o.satirlar.length>1&&norm(o.satirlar[0][0]?.metin)==='görev')son.gorevler=o.satirlar.slice(1).map(r=>({gorev:r[0].metin,sorumluluk:r[1]?.metin||''})).filter(g=>g.gorev);
   continue;
  }
  if(/^Balk2$|^Heading[23]$/.test(o.stil)&&o.metin){baslik=o.metin;continue}
  const m=/^MADDE\s+(\d+)\s*[–-]\s*([\s\S]*)$/.exec(o.metin);
  if(m){son={no:Number(m[1]),baslik,metin:m[2].trim()};maddeler.push(son);continue}
  if(o.liste&&o.metin&&son){(son.liste||(son.liste=[])).push(o.metin)}
 }
 if(!maddeler.length)throw new Error('iç tüzükte MADDE bulunamadı');
 return maddeler;
}
function temaKutusu(tbl){
 const hucre=tbl.satirlar[0];if(!hucre||hucre.length<2)throw new Error('yıllık plan tema kutusu bulunamadı');
 const sol=hucre[0].paragraflar,sag=hucre[1].paragraflar,al=etiket=>(sol.find(s=>s.startsWith(etiket))||'').slice(etiket.length).trim();
 const tema=al('Tema:'),k=/^(.*?)\s*\(([A-ZÇĞİÖŞÜ]{1,3})\)\s*$/.exec(tema);
 return{
  kod:k?k[2]:'',ad:k?k[1]:tema,hedef:al('Tema Hedefi:'),protokol:al('Protokol Etkinlikleri:'),
  altHedefler:sag.filter(s=>!/^Alt Hedef/i.test(s)).map(s=>{const x=/^([A-ZÇĞİÖŞÜ]{1,3}\.\d+)\s+([\s\S]+)$/.exec(s);return x?{kod:x[1],ad:x[2]}:{kod:'',ad:s}})
 };
}
function yillikPlan(ogeler){
 const tablolar=ogeler.filter(o=>o.tur==='tablo'),kutu=tablolar[0],tab=tablolar.find(t=>t.satirlar.length>5);
 if(!kutu||!tab)throw new Error('yıllık plan tabloları bulunamadı');
 const satirlar=[];let ay='';
 for(const r of tab.satirlar.slice(1)){
  const [a,h,t,amac,faal,gun]=r;if(!h)continue;
  if(!a.devam&&a.metin)ay=a.metin.trim();
  const hp=h.paragraflar,hafta=(hp[0]||'').trim(),tarih=(hp.find(s=>/^\(.*\)$/.test(s))||'').replace(/^\(|\)$/g,'').trim();
  satirlar.push({ay,hafta,tarih,hedef:t.metin.trim(),amac:amac.metin.trim(),faaliyetler:faal.paragraflar,belirliGun:gun?.metin.trim()||''});
 }
 const dipnot=(ogeler.find(o=>o.tur==='p'&&/^Bu plan,/.test(o.metin))||{}).metin||'';
 return{tema:temaKutusu(kutu),satirlar,dipnot};
}
function toplumHizmeti(ogeler){
 const tab=ogeler.find(o=>o.tur==='tablo'&&o.satirlar.length>3);if(!tab)throw new Error('toplum hizmeti tablosu bulunamadı');
 return tab.satirlar.slice(1).map(r=>({donem:r[0].metin,amac:r[1].metin,konu:r[2].metin})).filter(r=>r.donem);
}
function aylikRaporlar(ogeler){
 const raporlar=[];let su=null;
 for(const o of ogeler){
  if(o.tur==='p'){
   const b=/AYLIK FAALİYET RAPORU\s*$/.exec(o.metin);
   if(b){const ay=AYLAR.find(a=>norm(o.metin).includes(norm(a)));su={ay,no:raporlar.length+1,satirlar:[]};raporlar.push(su);continue}
   const n=/^Rapor No:\s*(\d+)/.exec(o.metin);if(n&&su)su.no=Number(n[1]);
   continue;
  }
  if(su&&!su.satirlar.length&&o.satirlar.length>1&&norm(o.satirlar[0][0]?.metin)==='tarih'){
   su.satirlar=o.satirlar.slice(1).map(r=>({tarih:r[0].metin,ozet:r[1].metin,urun:r[2]?.metin||'',belirliGun:r[3]?.metin||''}));
  }
 }
 if(raporlar.some(r=>!r.ay||!r.satirlar.length))throw new Error('aylık rapor ayı/tablosu okunamadı');
 return raporlar;
}
function sonuRaporu(ogeler){
 const tab=ogeler.find(o=>o.tur==='tablo'&&o.satirlar.length>2&&norm(o.satirlar[0][0]?.metin)==='ay');if(!tab)throw new Error('faaliyet tablosu bulunamadı');
 const aylar=tab.satirlar.slice(1).map(r=>({ay:r[0].metin.trim(),calisma:r[1].metin.trim()})).filter(r=>r.ay);
 const bolum=ad=>{const i=ogeler.findIndex(o=>o.tur==='p'&&new RegExp(`^[B-D]\\.\\s*${ad}`,'i').test(o.metin));return i<0?'':(ogeler[i+1]?.tur==='p'?ogeler[i+1].metin:'')};
 return{aylar,b:bolum('(Genel Değerlendirme|Kazanımlar)'),c:bolum('(Karşılaşılan Güçlükler|Güçlükler)'),d:bolum('(Gelecek Yıl İçin Öneriler|Öneriler)')};
}

/* ── giriş ── */
const girdiler=[];let id='',ad='',yil='',anahtar=[],cikti=path.join(kok,'data/kulup');
const arg=process.argv.slice(2);
for(let i=0;i<arg.length;i++){
 if(arg[i]==='--id')id=arg[++i];else if(arg[i]==='--ad')ad=arg[++i];else if(arg[i]==='--yil')yil=arg[++i];
 else if(arg[i]==='--anahtar')anahtar=arg[++i].split(',').map(s=>s.trim()).filter(Boolean);
 else if(arg[i]==='--cikti')cikti=path.resolve(arg[++i]);else girdiler.push(path.resolve(arg[i]));
}
if(!girdiler.length||!id||!ad){console.error('Kullanım: node scripts/kulup-katalog.mjs <klasör> --id siberay --ad "Siberay Kulübü" [--anahtar siberay,siber] [--yil 2026-2027] [--cikti klasör]');process.exit(1)}
const dosyalar=girdiler.flatMap(g=>fs.statSync(g).isDirectory()?fs.readdirSync(g).filter(f=>/\.docx$/i.test(f)&&!f.startsWith('~$')).map(f=>path.join(g,f)):[g]);
const bul=anahtarKelime=>{const d=dosyalar.find(f=>path.basename(f).toLocaleLowerCase('tr').includes(anahtarKelime));if(!d)throw new Error(`"${anahtarKelime}" dosyası bulunamadı`);return d};

const [tz,yp,th,ay,dn,ys]=await Promise.all(['ic-tuzuk','yillik-plan','toplum-hizmeti','aylik-faaliyet','donem-sonu','yil-sonu'].map(k=>govde(bul(k))));
const maddeler=tuzuk(tz),plan=yillikPlan(yp),donem=sonuRaporu(dn),yilSonu=sonuRaporu(ys);
const tanim=maddeler.find(m=>m.no===3)?.metin||'';
const yilBul=yil||(await govde(bul('ic-tuzuk')).then(o=>/(\d{4})\s*-\s*(\d{4})/.exec(o.map(x=>x.metin||'').join(' '))?.slice(1,3).join('-')))||'';

const paket={
 id,ad,yil:yilBul,aciklama:(tanim.split(/(?<=\.)\s/)[0]||'').trim(),
 tema:plan.tema,
 tuzuk:maddeler,
 yillikPlan:{satirlar:plan.satirlar,dipnot:plan.dipnot},
 toplumHizmeti:toplumHizmeti(th),
 aylikRaporlar:aylikRaporlar(ay),
 donemSonu:donem,yilSonu
};
fs.mkdirSync(cikti,{recursive:true});
fs.writeFileSync(path.join(cikti,`${id}.json`),JSON.stringify(paket)+'\n');

const indexYolu=path.join(cikti,'katalog.json');
let index={kulupler:[]};try{index=JSON.parse(fs.readFileSync(indexYolu,'utf8'))}catch(_){}
const kayit={id,ad,anahtar:anahtar.length?anahtar:[id],yil:paket.yil,tema:{kod:plan.tema.kod,ad:plan.tema.ad},aciklama:paket.aciklama,
 sayilar:{madde:maddeler.length,hafta:plan.satirlar.length,toplumHizmeti:paket.toplumHizmeti.length,aylik:paket.aylikRaporlar.length}};
index.kulupler=[...index.kulupler.filter(k=>k.id!==id),kayit].sort((a,b)=>a.ad.localeCompare(b.ad,'tr'));
fs.writeFileSync(indexYolu,JSON.stringify(index,null,1)+'\n');
console.log(`${ad}: ${maddeler.length} madde, ${plan.satirlar.length} plan haftası, ${paket.toplumHizmeti.length} toplum hizmeti, ${paket.aylikRaporlar.length} aylık rapor, ${donem.aylar.length}/${yilSonu.aylar.length} ay özeti · ${(fs.statSync(path.join(cikti,`${id}.json`)).size/1024).toFixed(0)} KB`);

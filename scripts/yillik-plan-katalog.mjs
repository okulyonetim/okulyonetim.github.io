#!/usr/bin/env node
/* MEB biçimli yıllık plan Word dosyalarını (.docx) hazır kataloğa çevirir.
 *   node scripts/yillik-plan-katalog.mjs <klasör|dosya.docx>... [--cikti data/yillik-plan] [--yil 2026-2027] [--yayin "MEB Yayınları"]
 * Çıktı: data/yillik-plan/{sinif}.json (sınıf başına plan listesi) + data/yillik-plan/index.json (hub sayıları için).
 * Aynı sınıf+ders+yıl için yeni dosya eskisinin yerini alır; dosyada olmayan planlara dokunulmaz. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';

const require=createRequire(import.meta.url);
const kok=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..');
const JSZip=require(path.join(kok,'assets/vendor/jszip.min.js'));
const ctx={};ctx.window=ctx;vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(kok,'js/modules/yillik-plan-core.js'),'utf8'),ctx);
const C=ctx.YillikPlanCore;

const girdiler=[];let cikti=path.join(kok,'data/yillik-plan'),yil='',yayin='';
const arg=process.argv.slice(2);
for(let i=0;i<arg.length;i++){
 if(arg[i]==='--cikti')cikti=path.resolve(arg[++i]);
 else if(arg[i]==='--yil')yil=arg[++i];
 else if(arg[i]==='--yayin')yayin=arg[++i];
 else girdiler.push(path.resolve(arg[i]));
}
if(!girdiler.length){console.error('Kullanım: node scripts/yillik-plan-katalog.mjs <klasör|dosya.docx>... [--cikti klasör] [--yil 2026-2027] [--yayin "MEB Yayınları"]');process.exit(1)}

const dosyalar=girdiler.flatMap(g=>fs.statSync(g).isDirectory()?fs.readdirSync(g).filter(f=>/\.docx$/i.test(f)&&!f.startsWith('~$')).sort().map(f=>path.join(g,f)):[g]);

/* Katalogdaki plan: ayrıştırıcı çıktısı olduğu gibi (başlıklar anahtarla); okul havuzuna kopyalarken eşleştirilir. */
async function planOku(dosya){
 const zip=await JSZip.loadAsync(fs.readFileSync(dosya)),xml=await zip.file('word/document.xml')?.async('string');
 if(!xml)throw new Error('word/document.xml bulunamadı');
 const a=C.docxAyristir(xml,yil?{egitimOgretimYili:yil}:{});
 if(!a.dersAdi||!(a.seviye>=1&&a.seviye<=12))throw new Error(`ders/sınıf başlıktan çıkarılamadı (${a.dersAdi||'?'} / ${a.seviye||'?'})`);
 return{dersAdi:a.dersAdi,seviye:a.seviye,egitimOgretimYili:a.egitimOgretimYili||yil||C.okulYili(),grup:a.grup||'zorunlu',yayin:yayin||a.yayin||'',
  basliklar:a.basliklar.map(({anahtar,ad,grup})=>({anahtar,ad,grup:grup||''})),satirlar:a.satirlar,yilSonu:a.yilSonu||'',dipnotlar:a.dipnotlar||[],kaynak:'katalog'};
}

fs.mkdirSync(cikti,{recursive:true});
const sinifDosyasi=n=>path.join(cikti,`${n}.json`);
const oku=n=>{try{return JSON.parse(fs.readFileSync(sinifDosyasi(n),'utf8'))}catch(_){return null}};
const gruplar=new Map(),hatalar=[];
for(const d of dosyalar){
 try{const p=await planOku(d);(gruplar.get(p.seviye)||gruplar.set(p.seviye,[]).get(p.seviye)).push(p);console.log(`✓ ${path.basename(d)} → ${p.seviye}. sınıf ${p.dersAdi} ${p.egitimOgretimYili} (${p.satirlar.length} satır)`)}
 catch(e){hatalar.push(`${path.basename(d)}: ${e.message}`);console.error(`✗ ${path.basename(d)}: ${e.message}`)}
}
for(const [n,yeniler] of gruplar){
 const mevcut=oku(n)?.planlar||[],anahtar=p=>C.planAnahtari(p),yeniAnahtar=new Set(yeniler.map(anahtar));
 const planlar=[...mevcut.filter(p=>!yeniAnahtar.has(anahtar(p))),...yeniler].sort((a,b)=>String(a.dersAdi).localeCompare(String(b.dersAdi),'tr'));
 fs.writeFileSync(sinifDosyasi(n),JSON.stringify({surum:1,sinif:n,planlar})+'\n');
}
/* Hub sayıları için hafif dizin: yalnız ders adı ve plan anahtarı. */
const dizin={surum:1,siniflar:{}};
for(const f of fs.readdirSync(cikti).filter(x=>/^\d+\.json$/.test(x))){
 const n=Number(f.replace('.json','')),k=oku(n);
 if(k?.planlar?.length)dizin.siniflar[n]=k.planlar.map(p=>({ders:p.dersAdi,anahtar:C.planAnahtari(p)}));
}
fs.writeFileSync(path.join(cikti,'index.json'),JSON.stringify(dizin)+'\n');
console.log(`Katalog güncellendi: ${Object.values(dizin.siniflar).reduce((t,l)=>t+l.length,0)} plan, ${Object.keys(dizin.siniflar).length} sınıf.`);
if(hatalar.length)process.exitCode=2;

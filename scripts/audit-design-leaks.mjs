// Tasarım sızıntı denetimi: modüller merkezi temayı ve ortak bileşenleri atlıyor mu?
// Çalıştır: node scripts/audit-design-leaks.mjs  → docs/TASARIM-SIZINTI-RAPORU.md
import fs from 'fs';import path from 'path';
const dirs=['js/modules','js/core'],rows=[];
for(const d of dirs)for(const f of fs.readdirSync(d).filter(x=>x.endsWith('.js'))){
  const t=fs.readFileSync(path.join(d,f),'utf8'),c=r=>(t.match(r)||[]).length;
  rows.push({f:`${d.split('/')[1]}/${f}`,hex:c(/#[0-9a-fA-F]{6}\b/g),style:c(/<style\b/g),inl:c(/style=["'`][^"'`]*(?:color|background|border)/g),fixed:c(/position:\s*fixed/g),own:new Set((t.match(/ka-[a-z0-9]+(?:-[a-z0-9]+)+(?:__[a-z0-9-]+)?/g)||[])).size});
}
for(const r of rows)r.skor=r.hex+r.style*8+r.inl*2+r.fixed*3;
rows.sort((a,b)=>b.skor-a.skor);
const tot=k=>rows.reduce((s,r)=>s+r[k],0),leaky=rows.filter(r=>r.skor>10);
let md=`# Tasarım Sızıntı Raporu\n\nOluşturan: scripts/audit-design-leaks.mjs\n\n**Özet:** ${rows.length} dosyada toplam ${tot('hex')} sabit renk kodu, ${tot('style')} modül içi <style> bloğu, ${tot('inl')} renkli satır içi stil, ${tot('fixed')} kendi sabit-konum (pencere/panel) tanımı. Sızıntısı belirgin dosya: ${leaky.length}.\n\n| Dosya | Sabit renk | <style> | Satır içi renk | position:fixed | Skor |\n|---|---:|---:|---:|---:|---:|\n`;
for(const r of rows.filter(r=>r.skor>0).slice(0,40))md+=`| ${r.f} | ${r.hex} | ${r.style} | ${r.inl} | ${r.fixed} | ${r.skor} |\n`;
md+=`\nSkor = sabit renk + 8×<style> + 2×satır içi renk + 3×position:fixed. Hedef: tüm dosyalarda 0 (rapor çıktı şablonları hariç, Aşama R'de merkezileşir).\n`;
fs.writeFileSync('docs/TASARIM-SIZINTI-RAPORU.md',md);
console.log(md.split('\n').slice(0,8).join('\n'));

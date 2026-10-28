/* Sarı dolgu üzerine beyaz (veya açık) yazı konmaz: dolgu sarıysa yazı koyu "--ka-on-accent" mürekkebidir */
const fs=require('fs'),assert=require('assert');
const css=fs.readFileSync('css/design-system-base.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'');

/* belirteçler: koyu mürekkep, beyaz değil */
const belirtec=ad=>{const m=[...css.matchAll(new RegExp('--'+ad+':\\s*([^;}]+)','g'))].map(x=>x[1].trim());assert(m.length,'--'+ad+' tanımlı olmalı.');return m};
belirtec('t-on-accent').forEach(v=>assert(!/^(#fff(fff)?|white)$/i.test(v),'--t-on-accent beyaz olamaz: '+v));
assert(belirtec('ka-on-accent').every(v=>v==='var(--t-on-accent)'),'--ka-on-accent --t-on-accent’ten türer.');
['ka-on-accent-muted','ka-on-accent-soft','ka-on-accent-border'].forEach(a=>belirtec(a));

/* düz sarı arka planlı hiçbir kural beyaz/açık yazı rengi taşımaz */
const SARI=/^(var\(--ka-primary(-hover)?\)|rgb\(var\(--t-accent-rgb\)\)|#ffc400|#ffd34d|#e5b000|#ffb800|#ffd84d)\s*(!important)?$/i;
const ACIK=/^(#fff(fff)?|white|rgb\(255,\s*255,\s*255\)|var\(--ka-text-inverse\)|var\(--ka-text-on-dark\)|rgb\(var\(--k-white\)\))\s*(!important)?$/i;
const kotu=[];
for(const m of css.matchAll(/([^{};]+)\{([^{}]*)\}/g)){
  const d={};m[2].split(';').forEach(x=>{const i=x.indexOf(':');if(i>0)d[x.slice(0,i).trim().toLowerCase()]=x.slice(i+1).trim()});
  const bg=d.background||d['background-color'];
  if(bg&&SARI.test(bg)&&d.color&&ACIK.test(d.color)){
    /* sbe hücresi: koyu ekranda kendi koyu dolgusu var, sarı değil */
    if(/\.sbe-tcell\.filled/.test(m[1]))continue;
    kotu.push(m[1].replace(/\s+/g,' ').trim().slice(0,120)+' => '+d.color);
  }
}
assert.deepStrictEqual(kotu,[],'Sarı dolgu üzerinde açık yazı rengi:\n'+kotu.join('\n'));

/* koyu temada genel metin kuralı modül mürekkebini izler: sarı öğeler alt öğelerinin yazısını da çevirebilir */
assert(/html\[data-theme="dark"\] #v2ModuleRoot b\{color:var\(--ka-module-text\);\}/.test(css),'Koyu tema genel metin kuralı --ka-module-text kullanmalı.');
console.log('sari-uzeri-yazi: OK');

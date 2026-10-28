/* Not / Ödev çizelgesi tablosu: sabit "Öğrenci" sütunu işaret hücrelerini kapatmamalı (telefon) */
const fs=require('fs'),assert=require('assert');
const css=fs.readFileSync('css/design-system-base.css','utf8');
const kurallar=sel=>{const out=[];const re=/([^{}]+)\{([^{}]*)\}/g;let m;while((m=re.exec(css)))if(m[1].split(',').some(s=>s.trim().replace(/^\/\*[\s\S]*?\*\/\s*/,'')===sel))out.push(m[2]);return out};

/* tablo içeriği kadar geniş olur; sabit px genişlik sabit sütunu ekrana yayar */
const tablo=kurallar('.ka-gradebook-table');
assert(tablo.length&&tablo.every(r=>!/min-width:\d+px/.test(r)),'Tablo sabit px min-width taşımamalı.');
assert(tablo.some(r=>/min-width:max-content/.test(r)),'Tablo min-width:max-content olmalı.');

/* öğrenci hücresi gerçek tablo hücresi kalır (display:grid satır yüksekliğini bozar, hücreleri ayırır) */
const ogr=kurallar('.ka-gradebook-student');
assert(ogr.length&&ogr.every(r=>!/display:\s*(grid|flex|block)/.test(r)),'.ka-gradebook-student display:grid/flex/block almamalı.');
assert(ogr.some(r=>/position:sticky/.test(r)),'Öğrenci sütunu sabit kalır.');

/* telefonda öğrenci sütunu dar, ad sarılır: hücre düğmeleri ekranda kalır */
const tel=css.slice(css.indexOf('@media(max-width:760px){.ka-gradebook-page{padding'));
const telBlok=tel.slice(0,tel.indexOf('\n'));
assert(/\.ka-gradebook-student-head,\.ka-gradebook-student\{min-width:132px\}/.test(telBlok),'Telefonda öğrenci sütunu 132px.');
assert(/\.ka-gradebook-student strong\{[^}]*max-width:9em[^}]*white-space:normal/.test(telBlok),'Telefonda öğrenci adı sarılır.');
console.log('not-cizelgesi-tablo: OK');

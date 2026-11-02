/* Tüm istemci JavaScript dosyaları ayrıştırılabilmeli. Bir dosyanın sözdizimi bozulursa o modül hiç yüklenmez (sayfa boş kalır)
 * ve APK derlemesi (build:client → module-bundles-smoke) ilk adımda durur; en son Öğretmenler / Sınıflar / Öğrenciler sayfalarını boşalttı.
 * Kaynağa yanlışlıkla yazılan gerçek "\n" karakter çiftleri (ters bölü + n) da bu sınıfın tipik nedenidir. */
const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('assert');
function walk(dir,out=[]){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory()){if(e.name==='dist'||e.name==='node_modules')continue;walk(p,out)}else if(e.name.endsWith('.js'))out.push(p)}return out}
const files=walk('js'),broken=[],literalBreaks=[];
for(const f of files){
  const src=fs.readFileSync(f,'utf8');
  try{new vm.Script(src,{filename:f})}catch(e){broken.push(`${f}: ${e.message}`)}
  if(/\}\\n(?:function|const|let|var|async function|class) /.test(src))literalBreaks.push(f);
}
assert.deepStrictEqual(broken,[],'Sözdizimi hatalı dosya: '+broken.join(' | '));
assert.deepStrictEqual(literalBreaks,[],'Satır sonu yerine yazılmış "\\n" karakterleri: '+literalBreaks.join(', '));
assert(files.length>100,'js/ altındaki dosyalar bulunamadı');
console.log(`client-js-syntax: ${files.length} dosya tamam`);

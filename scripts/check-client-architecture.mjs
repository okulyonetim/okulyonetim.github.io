import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const JS_ROOT=path.join(ROOT,'js');
const IGNORE_DIRS=new Set(['node_modules','dist']);

function walk(dir){
  const out=[];
  for(const entry of fs.readdirSync(dir,{withFileTypes:true})){
    if(entry.isDirectory()&&IGNORE_DIRS.has(entry.name))continue;
    const full=path.join(dir,entry.name);
    if(entry.isDirectory())out.push(...walk(full));else out.push(full);
  }
  return out;
}
const rel=f=>path.relative(ROOT,f).replaceAll('\\','/');
const files=walk(JS_ROOT).filter(f=>f.endsWith('.js'));
const debtName=/(?:modern|fix|stability|v\d+|bridge|bootstrap-sync)/i;
const debtFiles=files.filter(f=>debtName.test(path.basename(f)));
const styleInject=[];
const hiddenLoaders=[];
const optical=[];
for(const f of files){
  const src=fs.readFileSync(f,'utf8');
  if(/createElement\(\s*['"]style['"]\s*\)|\.textContent\s*=\s*['"`][^\n]*(?:!important|\{)/.test(src))styleInject.push(rel(f));
  if(/createElement\(\s*['"]script['"]\s*\)/.test(src)&&/\.src\s*=/.test(src)&&!rel(f).endsWith('app-loader.js'))hiddenLoaders.push(rel(f));
  if(/opencv|\bomr\b|optik[\/-]|optik okuyucu/i.test(src)||/optik|omr|opencv/i.test(path.basename(f)))optical.push(rel(f));
}

const report={
  jsFiles:files.length,
  targetSourceModules:'yaklaşık 12-18 mantıksal kaynak/bundle',
  debtNamedFiles:debtFiles.map(rel).sort(),
  jsStyleInjection:styleInject.sort(),
  hiddenScriptLoaders:hiddenLoaders.sort(),
  opticalReferences:optical.sort()
};
console.log(JSON.stringify(report,null,2));

if(optical.some(x=>!x.includes('optik-entegrasyon.js')&&!x.includes('optik-ayarlari.js'))){
  process.exitCode=2;
}

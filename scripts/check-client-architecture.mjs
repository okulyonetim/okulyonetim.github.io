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

/* V2 tasarım tek-kaynak kuralı. */
const v2Path=path.join(ROOT,'app-v2.html');
const v2Html=fs.existsSync(v2Path)?fs.readFileSync(v2Path,'utf8'):'';
const stylesheetLinks=[...v2Html.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);
const v2StyleViolations=stylesheetLinks.filter(href=>href!=='css/design-system.css');
const designPath=path.join(ROOT,'css','design-system.css');
const designSource=fs.existsSync(designPath)?fs.readFileSync(designPath,'utf8'):'';
const requiredThemeTokens=['--ka-app-bg','--ka-header-bg','--ka-header-text','--ka-nav-bg','--ka-nav-active-bg','--ka-button-bg','--ka-button-text','--ka-card-bg','--ka-input-bg','--ka-text','--ka-border','--ka-primary','--ka-report-bg'];
const missingThemeTokens=requiredThemeTokens.filter(token=>!designSource.includes(token));
const requiredShellClasses=['.ka-app-header','.ka-app-nav'];
const missingShellClasses=requiredShellClasses.filter(name=>!designSource.includes(name));

const report={
  jsFiles:files.length,
  targetSourceModules:'yaklaşık 12-18 mantıksal kaynak/bundle',
  debtNamedFiles:debtFiles.map(rel).sort(),
  jsStyleInjection:styleInject.sort(),
  hiddenScriptLoaders:hiddenLoaders.sort(),
  opticalReferences:optical.sort(),
  v2Stylesheets:stylesheetLinks,
  v2StyleViolations,
  missingThemeTokens,
  missingShellClasses
};
console.log(JSON.stringify(report,null,2));

let failed=false;
if(optical.some(x=>!x.includes('optik-entegrasyon.js')&&!x.includes('optik-ayarlari.js'))){failed=true;}
if(stylesheetLinks.length!==1||stylesheetLinks[0]!=='css/design-system.css'){console.error('V2 kabuk yalnız css/design-system.css yüklemeli.');failed=true;}
if(v2StyleViolations.length){console.error('V2 ek stylesheet ihlali:',v2StyleViolations.join(', '));failed=true;}
if(missingThemeTokens.length){console.error('Eksik merkezi tema değişkenleri:',missingThemeTokens.join(', '));failed=true;}
if(missingShellClasses.length){console.error('Eksik merkezi shell componentleri:',missingShellClasses.join(', '));failed=true;}
if(failed)process.exitCode=2;

import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const JS_ROOT=path.join(ROOT,'js');
const IGNORE_DIRS=new Set(['node_modules','dist']);
function walk(dir){const out=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.isDirectory()&&IGNORE_DIRS.has(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...walk(full));else out.push(full)}return out}
const rel=f=>path.relative(ROOT,f).replaceAll('\\','/');
const files=walk(JS_ROOT).filter(f=>f.endsWith('.js'));
const debtName=/(?:modern|fix|stability|v\d+|bridge|bootstrap-sync)/i;
const debtFiles=files.filter(f=>debtName.test(path.basename(f)));
const styleInject=[],hiddenLoaders=[],optical=[];
for(const f of files){const src=fs.readFileSync(f,'utf8');if(/createElement\(\s*['"]style['"]\s*\)|\.textContent\s*=\s*['"`][^\n]*(?:!important|\{)/.test(src))styleInject.push(rel(f));if(/createElement\(\s*['"]script['"]\s*\)/.test(src)&&/\.src\s*=/.test(src)&&!rel(f).endsWith('app-loader.js'))hiddenLoaders.push(rel(f));if(/opencv|\bomr\b|optik[\/-]|optik okuyucu/i.test(src)||/optik|omr|opencv/i.test(path.basename(f)))optical.push(rel(f))}

/* Ana uygulama kabuğu tasarım açısından tek kaynak kullanmalı. */
const shellPath=path.join(ROOT,'index.html');
const shellHtml=fs.existsSync(shellPath)?fs.readFileSync(shellPath,'utf8'):'';
const stylesheetLinks=[...shellHtml.matchAll(/<link\b[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+)["'][^>]*>/gi)].map(m=>m[1]);
const styleViolations=stylesheetLinks.filter(href=>href!=='css/design-system.css');
const inlineStyleTags=(shellHtml.match(/<style\b/gi)||[]).length;
const inlineStyleAttrs=(shellHtml.match(/\sstyle=["']/gi)||[]).length;
const designPath=path.join(ROOT,'css','design-system.css');
const designSource=fs.existsSync(designPath)?fs.readFileSync(designPath,'utf8'):'';
const requiredThemeTokens=['--ka-app-bg','--ka-header-bg','--ka-header-text','--ka-nav-bg','--ka-nav-active-bg','--ka-button-bg','--ka-button-text','--ka-card-bg','--ka-input-bg','--ka-text','--ka-border','--ka-primary','--ka-report-bg'];
const missingThemeTokens=requiredThemeTokens.filter(token=>!designSource.includes(token));
const requiredShellClasses=['.ka-app-header','.ka-app-nav'];
const missingShellClasses=requiredShellClasses.filter(name=>!designSource.includes(name));

const report={jsFiles:files.length,targetSourceModules:'yaklaşık 12-18 mantıksal kaynak/bundle',debtNamedFiles:debtFiles.map(rel).sort(),jsStyleInjection:styleInject.sort(),hiddenScriptLoaders:hiddenLoaders.sort(),opticalReferences:optical.sort(),primaryStylesheets:stylesheetLinks,styleViolations,inlineStyleTags,inlineStyleAttrs,missingThemeTokens,missingShellClasses};
console.log(JSON.stringify(report,null,2));
let failed=false;
if(optical.some(x=>!x.includes('optik-entegrasyon.js')&&!x.includes('optik-ayarlari.js')))failed=true;
if(stylesheetLinks.length!==1||stylesheetLinks[0]!=='css/design-system.css'){console.error('Ana kabuk yalnız css/design-system.css yüklemeli.');failed=true}
if(styleViolations.length){console.error('Ek stylesheet ihlali:',styleViolations.join(', '));failed=true}
if(inlineStyleTags||inlineStyleAttrs){console.error('Ana kabuk inline stil içermemeli.');failed=true}
if(missingThemeTokens.length){console.error('Eksik merkezi tema değişkenleri:',missingThemeTokens.join(', '));failed=true}
if(missingShellClasses.length){console.error('Eksik merkezi shell componentleri:',missingShellClasses.join(', '));failed=true}
if(failed)process.exitCode=2;

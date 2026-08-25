import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const JS_ROOT=path.join(ROOT,'js');
const CSS_ROOT=path.join(ROOT,'css');
const IGNORE_DIRS=new Set(['node_modules','dist']);
function walk(dir){const out=[];if(!fs.existsSync(dir))return out;for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.isDirectory()&&IGNORE_DIRS.has(entry.name))continue;const full=path.join(dir,entry.name);if(entry.isDirectory())out.push(...walk(full));else out.push(full)}return out}
const rel=f=>path.relative(ROOT,f).replaceAll('\\','/');
const files=walk(JS_ROOT).filter(f=>f.endsWith('.js'));
const cssFiles=walk(CSS_ROOT).filter(f=>f.endsWith('.css'));
const legacyCssFiles=cssFiles.filter(f=>rel(f)!=='css/design-system.css');
const debtName=/(?:modern|fix|stability|v\d+|bridge|bootstrap-sync)/i;
const debtFiles=files.filter(f=>debtName.test(path.basename(f)));
const styleInject=[],hiddenLoaders=[],optical=[];
for(const f of files){const src=fs.readFileSync(f,'utf8');if(/createElement\(\s*['"]style['"]\s*\)|\.textContent\s*=\s*['"`][^\n]*(?:!important|\{)/.test(src))styleInject.push(rel(f));if(/createElement\(\s*['"]script['"]\s*\)/.test(src)&&/\.src\s*=/.test(src)&&!rel(f).endsWith('app-loader.js'))hiddenLoaders.push(rel(f));if(/opencv|\bomr\b|optik[\/-]|optik okuyucu/i.test(src)||/optik|omr|opencv/i.test(path.basename(f)))optical.push(rel(f))}

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

const loaderPath=path.join(ROOT,'js','app-loader.js');
const loaderSource=fs.existsSync(loaderPath)?fs.readFileSync(loaderPath,'utf8'):'';
const settingsPath=path.join(ROOT,'js','modules','settings.js');
const settingsSource=fs.existsSync(settingsPath)?fs.readFileSync(settingsPath,'utf8'):'';
const dashboardPath=path.join(ROOT,'js','modules','dashboard.js');
const dashboardSource=fs.existsSync(dashboardPath)?fs.readFileSync(dashboardPath,'utf8'):'';
const firebasePath=path.join(ROOT,'js','firebase-init.js');
const firebaseSource=fs.existsSync(firebasePath)?fs.readFileSync(firebasePath,'utf8'):'';
const reportEnginePath=path.join(ROOT,'js','modules','report-engine.js');
const reportEngineSource=fs.existsSync(reportEnginePath)?fs.readFileSync(reportEnginePath,'utf8'):'';
const rulesPath=path.join(ROOT,'firestore.rules');
const rulesSource=fs.existsSync(rulesPath)?fs.readFileSync(rulesPath,'utf8'):'';

const permissionRequirements=[
  ['PermissionService',loaderSource.includes('window.PermissionService=')],
  ['hidden seviyesi',loaderSource.includes('hidden:0')],['preview seviyesi',loaderSource.includes('preview:1')],['read seviyesi',loaderSource.includes('read:2')],['edit seviyesi',loaderSource.includes('edit:3')],
  ['eski gizle uyumluluğu',loaderSource.includes("'gizle'")],['eski goruntule uyumluluğu',loaderSource.includes("'goruntule'")],['eski duzenle uyumluluğu',loaderSource.includes("'duzenle'")],
  ['legacy alias tablosu',loaderSource.includes('LEGACY_PERMISSION_ALIASES')],['legacy alias çözümleyici',loaderSource.includes('legacySourceLevel')],
  ['tasima aliası',loaderSource.includes("'module.transport':['tasima']")],['sınav aliası',loaderSource.includes("'academic.exams':['sinavIslemleri']")],['nöbet aliası',loaderSource.includes("'management.duty':['nobet']")],
  ['tanımsız rol modülü gizli',loaderSource.includes("Object.keys(role.yetkiler).length?'hidden':'edit'")],
  ['modül tavanı',loaderSource.includes('const ceiling=moduleLevel(module)')],
  ['DOM permission attribute',loaderSource.includes('[data-ka-permission]')],['yazma koruması',loaderSource.includes('[data-ka-write]')],
  ['rol katalog editörü',settingsSource.includes('PermissionService?.catalog')],['rol gizli seçeneği',settingsSource.includes("['hidden','Gizli']")],['rol önizleme seçeneği',settingsSource.includes("['preview','Önizleme']")],['rol salt okunur seçeneği',settingsSource.includes("['read','Salt okunur']")],['rol düzenleme seçeneği',settingsSource.includes("['edit','Düzenleme']")],
  ['rules read/preview/edit uyumluluğu',rulesSource.includes("['goruntule', 'duzenle', 'preview', 'read', 'edit']")],
  ['rules edit uyumluluğu',rulesSource.includes("['duzenle', 'edit']")]
];
const missingPermissionRequirements=permissionRequirements.filter(([,ok])=>!ok).map(([name])=>name);

const configRequirements=[
  ['mevcut navDuzeni koleksiyonu',firebaseSource.includes("navDuzeni:'oy_navDuzeni'")],['AppConfig merkezi API',loaderSource.includes('window.AppConfig=')],['AppConfig DeviceData',loaderSource.includes("DeviceData.set('appConfig',COL.navDuzeni")],
  ['varsayılan açılış modülü',loaderSource.includes('defaultModule')],['navigasyon adı/ikon/sıra',loaderSource.includes('MODULE_DEFAULTS')&&loaderSource.includes('applyNavigation')],['dashboard kart kataloğu',loaderSource.includes('DASHBOARD_DEFAULTS')],
  ['ayarlar uygulama düzeni',settingsSource.includes('Merkezi Uygulama Düzeni')],['ayarlar navigasyon editörü',settingsSource.includes('data-app-module-row')],['ayarlar dashboard editörü',settingsSource.includes('data-dashboard-card-row')],
  ['dashboard AppConfig tüketimi',dashboardSource.includes('AppConfig?.dashboardCards')],['dashboard sabit sıra yerine config',dashboardSource.includes('cards().map')]
];
const missingConfigRequirements=configRequirements.filter(([,ok])=>!ok).map(([name])=>name);

const moduleFiles=files.filter(f=>rel(f).startsWith('js/modules/'));
const nativeApiViolations=[];
for(const f of moduleFiles){const r=rel(f);if(r==='js/modules/report-engine.js')continue;const src=fs.readFileSync(f,'utf8');if(/Capacitor\?*\.|PrintPlugin|Filesystem|Browser\.|StatusBar\.|Keyboard\./.test(src))nativeApiViolations.push(r)}
const safeAreaReady=/env\(safe-area-inset-(?:top|right|bottom|left)/.test(designSource)&&['--ka-safe-top','--ka-safe-right','--ka-safe-bottom','--ka-safe-left'].every(t=>designSource.includes(t));
const platformRequirements=[
  ['dinamik viewport birimi',/\d+(?:\.\d+)?dvh\b/.test(designSource)],
  ['iOS metin ölçekleme koruması',designSource.includes('-webkit-text-size-adjust: 100%')],
  ['dokunmatik hedef en az 44px',designSource.includes('--ka-control-height: 44px')],
  ['iOS safe-area tokenları',safeAreaReady],
  ['native platform capability detection',reportEngineSource.includes('Capacitor?.isNativePlatform?.()')],
  ['native yazdırma için browser fallback',reportEngineSource.includes("global.open(url,'_blank')")&&reportEngineSource.includes('win.print()')],
  ['rapor CSS tek kaynaktan',reportEngineSource.includes("new URL('css/design-system.css'")]
];
const missingPlatformRequirements=platformRequirements.filter(([,ok])=>!ok).map(([name])=>name);
const appNamespaceDefaultDeny=rulesSource.includes("!koleksiyon.matches('^oy_.*')");
const rulesOpticalUnsafe=/oy_optikSablonlari/.test(rulesSource)||!appNamespaceDefaultDeny;

const report={jsFiles:files.length,targetSourceModules:'yaklaşık 12-18 mantıksal kaynak/bundle',cssFiles:cssFiles.length,targetActiveStylesheets:1,legacyCssFiles:legacyCssFiles.map(rel).sort(),debtNamedFiles:debtFiles.map(rel).sort(),jsStyleInjection:styleInject.sort(),hiddenScriptLoaders:hiddenLoaders.sort(),opticalReferences:optical.sort(),appNamespaceDefaultDeny,rulesOpticalUnsafe,primaryStylesheets:stylesheetLinks,styleViolations,inlineStyleTags,inlineStyleAttrs,missingThemeTokens,missingShellClasses,permissionContract:{levels:['hidden','preview','read','edit'],legacyAliases:true,missing:missingPermissionRequirements},appConfigContract:{collection:'oy_navDuzeni',missing:missingConfigRequirements},platformContract:{targets:['android','ios-safari-pwa','web-desktop-mobile'],safeAreaReady,nativeApiViolations:nativeApiViolations.sort(),missing:missingPlatformRequirements}};
console.log(JSON.stringify(report,null,2));
let failed=false;
if(optical.length){console.error('Optik okuyucu uygulama koduna geri dönmemeli:',optical.join(', '));failed=true}
if(rulesOpticalUnsafe){console.error('Firestore oy_ uygulama ad alanı varsayılan kapalı olmalı ve emekli optik koleksiyon adına özel kural kalmamalı.');failed=true}
if(stylesheetLinks.length!==1||stylesheetLinks[0]!=='css/design-system.css'){console.error('Ana kabuk yalnız css/design-system.css yüklemeli.');failed=true}
if(styleViolations.length){console.error('Ek stylesheet ihlali:',styleViolations.join(', '));failed=true}
if(inlineStyleTags||inlineStyleAttrs){console.error('Ana kabuk inline stil içermemeli.');failed=true}
if(missingThemeTokens.length){console.error('Eksik merkezi tema değişkenleri:',missingThemeTokens.join(', '));failed=true}
if(missingShellClasses.length){console.error('Eksik merkezi shell componentleri:',missingShellClasses.join(', '));failed=true}
if(missingPermissionRequirements.length){console.error('Eksik merkezi rol/yetki sözleşmesi:',missingPermissionRequirements.join(', '));failed=true}
if(missingConfigRequirements.length){console.error('Eksik merkezi uygulama düzeni sözleşmesi:',missingConfigRequirements.join(', '));failed=true}
if(missingPlatformRequirements.length){console.error('Eksik cross-platform sözleşmesi:',missingPlatformRequirements.join(', '));failed=true}
if(nativeApiViolations.length){console.error('Native API yalnız platform adaptöründe/ReportEngine içinde kullanılmalı:',nativeApiViolations.join(', '));failed=true}
if(failed)process.exitCode=2;
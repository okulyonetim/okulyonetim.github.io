import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8'),write=(p,v)=>fs.writeFileSync(p,v,'utf8');
function once(src,oldText,newText,label){if(!src.includes(oldText))throw new Error(`${label} contract not found; aborting`);return src.replace(oldText,newText)}

let bridge=read('js/modules/rubric-tools.js');
const inject=`function inject(){
  const host=document.querySelector('[data-tools-module]');const tabs=host?.querySelector('.ka-tabs');if(!tabs)return;
  for(const def of TOOLS){if(tabs.querySelector(\`[data-rubric-tool="\${def.key}"]\`))continue;const b=document.createElement('button');b.type='button';b.className='ka-tab';b.dataset.rubricTool=def.key;b.dataset.kaPermission=def.permission;b.dataset.kaMinLevel='preview';b.textContent=def.label;b.onclick=()=>open(def);tabs.appendChild(b);}
  global.PermissionService?.apply?.(host);
}
`;
bridge=once(bridge,inject,"async function openPage(page){const def=TOOLS.find(x=>x.key===page);if(!def)return false;await open(def);return true}\n",'Rubric tab injection');
bridge=once(bridge,"global.RubricToolsModule={inject,open,keyList:()=>TOOLS.map(x=>x.key),createCategory,deleteCustom,openOtherDocuments,openDiploma};","global.RubricToolsModule={openPage,open,keyList:()=>TOOLS.map(x=>x.key),createCategory,deleteCustom,openOtherDocuments,openDiploma};",'Rubric public API');
bridge=once(bridge,"global.addEventListener('koruk:module-ready',e=>{if(otherDocumentsOpen)cleanupOtherDocuments();if(diplomaOpen)cleanupDiploma();if(e.detail?.name==='tools')requestAnimationFrame(inject);});","global.addEventListener('koruk:module-ready',()=>{if(otherDocumentsOpen)cleanupOtherDocuments();if(diplomaOpen)cleanupDiploma();});",'Rubric module-ready injection');
if(bridge.includes('data-rubric-tool')||bridge.includes('requestAnimationFrame(inject)'))throw new Error('Rubric tab bridge remains');
for(const token of ["const ENGINE='js/modules/rubric-tools-engine.js'","api:'KriterDagitimAraci'","api:'ProjeDegerlendirmeAraci'",'RubricSettingsService','openOtherDocuments','openDiploma'])if(!bridge.includes(token))throw new Error(`Rubric behavior contract lost: ${token}`);
write('js/modules/rubric-tools.js',bridge);

let shell=read('js/core/shell-ui.js');
const old=`  const selector=name==='tools'&&['rubric','project'].includes(page)?\`[data-rubric-tool="\${page}"]\`:'';
  const tab=selector?root.querySelector(selector):null;
  if(tab){tab.click();const tabs=tab.closest('.ka-tabs');if(tabs)tabs.hidden=true}
`;
const direct=`  if(name==='tools'&&['rubric','project'].includes(page)){
    Promise.resolve(global.RubricToolsModule?.openPage?.(page)).catch(e=>{console.error('[Shell/rubric]',e);global.toast?.('Değerlendirme aracı açılamadı.');});
    if(title)setTitle(title);return true;
  }
`;
shell=once(shell,old,direct,'Shell rubric tab selector');
if(shell.includes('data-rubric-tool'))throw new Error('Shell still routes Rubric through injected tabs');
write('js/core/shell-ui.js',shell);
console.log('Rubric/project migrated from injected Tools tabs to direct public routing.');

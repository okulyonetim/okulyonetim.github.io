import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const skipDirs=new Set(['.git','node_modules','dist','www','android']);
const unexpected=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(skipDirs.has(ent.name))continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())walk(p);
    else if(/\.(?:js|mjs|cjs|html)$/.test(ent.name)){
      const rel=path.relative(ROOT,p).replaceAll('\\','/');
      if(rel==='js/modules/tools.js'||rel==='scripts/retire-tools-gradebook-ui.mjs')continue;
      const txt=fs.readFileSync(p,'utf8');
      if(txt.includes('renderGradebooks')||txt.includes('data-tools-tab="gradebooks"'))unexpected.push(rel);
    }
  }
}
walk(ROOT);
if(unexpected.length)throw new Error(`Unexpected Tools gradebook UI consumers: ${[...new Set(unexpected)].join(', ')}`);

const file='js/modules/tools.js';
let src=fs.readFileSync(file,'utf8');
function mustReplace(oldText,newText,label){if(!src.includes(oldText))throw new Error(`${label} not found; aborting.`);src=src.replace(oldText,newText)}

mustReplace("let mounted=false,active='checklists',unsubs=[],attendanceDate=new Date(),openGradebook='';","let mounted=false,active='checklists',unsubs=[],attendanceDate=new Date();",'Tools UI state');
mustReplace('<button class="ka-tab" data-tools-tab="gradebooks">Ödev / Not</button>','', 'gradebooks tab');

const gradeStart=src.indexOf('function gradeTitle(t){');
const renderStart=src.indexOf('function render(){',gradeStart);
if(gradeStart<0||renderStart<0||renderStart<=gradeStart)throw new Error('Gradebook renderer block markers not found; aborting.');
const removedRenderers=src.slice(gradeStart,renderStart);
for(const token of ['function gradeTable(t,k)','function gradeCard(t,k)','function renderGradebooks()'])if(!removedRenderers.includes(token))throw new Error(`Expected gradebook renderer missing: ${token}`);
src=src.slice(0,gradeStart)+src.slice(renderStart);

mustReplace("else if(active==='attendance')renderAttendance();else if(active==='gradebooks')renderGradebooks();else renderChecklists()","else if(active==='attendance')renderAttendance();else renderChecklists()",'gradebooks render branch');

const bindGradeStart=src.indexOf('function bindGradebooks(){');
const bindStart=src.indexOf('function bind(){',bindGradeStart);
if(bindGradeStart<0||bindStart<0||bindStart<=bindGradeStart)throw new Error('Gradebook bind block markers not found; aborting.');
const removedBind=src.slice(bindGradeStart,bindStart);
if(!removedBind.includes('data-grade-cell')||!removedBind.includes('data-grade-open'))throw new Error('Gradebook bind contract incomplete; aborting.');
src=src.slice(0,bindGradeStart)+src.slice(bindStart);

mustReplace("if(active==='attendance')await global.ToolsData?.prepareAttendance?.();if(active==='gradebooks')await global.ToolsData?.prepareGradebooks?.();render()","if(active==='attendance')await global.ToolsData?.prepareAttendance?.();render()",'gradebooks tab preparation');
mustReplace("'data.servisler','data.devamsizlikCizelgesi','data.odevTakip','data.notCizelgesi',","'data.servisler','data.devamsizlikCizelgesi',",'gradebooks generic subscriptions');

for(const token of ['data-tools-tab="gradebooks"','function gradeTitle(t)','function gradeTable(t,k)','function gradeCard(t,k)','function renderGradebooks()','function bindGradebooks()','data-grade-cell','data-grade-open']){
  if(src.includes(token))throw new Error(`Retired Tools gradebook UI token survived: ${token}`);
}
if(!src.includes('prepareGradebooks'))throw new Error('Shared gradebook data preparation was removed unexpectedly.');
if(!src.includes('OdevNotCizelgeleriService'))throw new Error('Shared gradebook service was removed unexpectedly.');
fs.writeFileSync(file,src,'utf8');
console.log(`Retired generic Tools gradebook UI: ${removedRenderers.length+removedBind.length} bytes of duplicate renderer/binding code removed.`);

import fs from 'node:fs';
import path from 'node:path';

const ROOT=process.cwd();
const allowed=new Set([
  'js/core/shell-ui.js',
  'js/modules/tools.js',
  'tests/student-tool-routing-smoke.test.js',
  'scripts/retire-duplicate-student-pages.mjs'
]);
const skipDirs=new Set(['.git','node_modules','dist','www','android']);
const refs=[];
function walk(dir){
  for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
    if(skipDirs.has(ent.name))continue;
    const p=path.join(dir,ent.name);
    if(ent.isDirectory())walk(p);
    else if(/\.(?:js|mjs|cjs|html)$/.test(ent.name)){
      const rel=path.relative(ROOT,p).replaceAll('\\','/');
      const txt=fs.readFileSync(p,'utf8');
      if(txt.includes('StudentPages')&&!allowed.has(rel))refs.push(rel);
    }
  }
}
walk(ROOT);
if(refs.length)throw new Error(`Unexpected StudentPages references outside canonical owners: ${refs.join(', ')}`);

const file='js/modules/tools.js';
let src=fs.readFileSync(file,'utf8');
const start=src.indexOf('function filteredStudents(){');
const end=src.indexOf('async function render(){',start);
if(start<0||end<0||end<=start)throw new Error('Legacy StudentPages list/book block markers not found; aborting.');
const retiredBlock=src.slice(start,end);
for(const token of ['function renderStudentList()','function createBookModal(type)','async function renderBookPage()']){
  if(!retiredBlock.includes(token))throw new Error(`Expected legacy UI token missing: ${token}`);
}
src=src.slice(0,start)+src.slice(end);

const renderStart=src.indexOf('async function render(){');
const openStart=src.indexOf("async function open(page,title=''){",renderStart);
const closeStart=src.indexOf('function close(){',openStart);
if(renderStart<0||openStart<0||closeStart<0)throw new Error('StudentPages lifecycle markers not found; aborting.');
const lifecycle=src.slice(renderStart,closeStart);
if(!lifecycle.includes("currentPage==='student-list'")||!lifecycle.includes("currentPage==='homework'||currentPage==='grades'"))throw new Error('Legacy StudentPages lifecycle contract already changed unexpectedly; aborting.');
const canonical=`async function render(){if(currentPage==='attendance')return renderAttendance();return false}\nasync function open(page,title=''){if(page!=='attendance')throw new Error('unsupported-student-page');currentPage='attendance';currentTitle=title||'';setTitle(currentTitle||'Öğrenci Yoklama');subscribe(['data.siniflar','data.veliler','data.yoklama']);await renderAttendance();return true}\n`;
src=src.slice(0,renderStart)+canonical+src.slice(closeStart);

for(const token of ['renderStudentList','renderBookPage','createBookModal','student-list\'','homework\'','grades\'']){
  if(src.includes(token))throw new Error(`Legacy StudentPages token survived retirement: ${token}`);
}
if(!src.includes("if(page!=='attendance')throw new Error('unsupported-student-page')"))throw new Error('Attendance-only guard not installed.');
fs.writeFileSync(file,src,'utf8');
console.log(`Retired duplicate StudentPages UI block: ${retiredBlock.length} bytes removed.`);

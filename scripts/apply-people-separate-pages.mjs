import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8'),write=(p,v)=>fs.writeFileSync(p,v,'utf8');
function once(src,oldText,newText,label){if(!src.includes(oldText))throw new Error(`${label} contract not found; aborting`);return src.replace(oldText,newText)}

let people=read('js/modules/people.js');
people=once(people,"function tabs(){return `<div class=\"ka-tabs ka-people-tabs\"><button class=\"ka-tab\" data-people-tab=\"teachers\">Öğretmenler</button><button class=\"ka-tab\" data-people-tab=\"classes\">Sınıflar</button><button class=\"ka-tab\" data-people-tab=\"students\">Öğrenciler</button></div>`}\n",'', 'People internal tabs');
people=once(people,"function shell(){return `<section class=\"ka-stack ka-people-page\" data-people-module>${tabs()}<div id=\"peopleContent\"></div></section>`}","function shell(){return `<section class=\"ka-stack ka-people-page\" data-people-module><div id=\"peopleContent\"></div></section>`}",'People shell tabs');
people=once(people,"function render(){if(!mounted)return;document.querySelectorAll('[data-people-tab]').forEach(b=>b.classList.toggle('active',b.dataset.peopleTab===activeTab));const out=", "function render(){if(!mounted)return;const out=",'People render tab state');
people=once(people,"function bind(){document.querySelectorAll('[data-people-tab]').forEach(b=>b.onclick=()=>{activeTab=b.dataset.peopleTab;teacherDetailId='';studentDetailId='';studentResultsMode=false;classDetailId='';classDetailTab='info';query='';render()})}","function bind(){}",'People tab binding');
people=once(people,"requestAnimationFrame(()=>document.querySelector('[data-communication-tab=\"messages\"]')?.click())", "global.CommunicationModule?.openPage?.('messages','Mesajlaşma')",'Teacher message Communication bridge');
people=once(people,"function unmount(){mounted=false;", "function openPage(page,title=''){const allowed=['teachers','classes','students'];if(!allowed.includes(page))return false;activeTab=page;teacherDetailId='';studentDetailId='';studentResultsMode=false;classDetailId='';classDetailTab='info';query='';render();return true}\nfunction unmount(){mounted=false;",'People openPage insertion');
people=once(people,"global.PeopleModule={mount,unmount,render};","global.PeopleModule={mount,unmount,render,openPage};",'People public API');
if(people.includes('data-people-tab'))throw new Error('People tab tokens remain after migration');
if(people.includes('data-communication-tab="messages"'))throw new Error('Old Communication tab bridge remains');
for(const token of ['teacherDetail','studentDetail','studentResults','classDetail','SiniflarService','YoklamaService','BelgeDurumuService','konusmaBaslatOgretmenIle'])if(!people.includes(token))throw new Error(`People behavior contract lost: ${token}`);
write('js/modules/people.js',people);

let shell=read('js/core/shell-ui.js');
const selectorOld="name==='people'?`[data-people-tab=\"${page}\"]`:";
if(!shell.includes(selectorOld))throw new Error('Shell People tab selector not found; aborting');
const anchor="  const selector=name==='people'?";
if(!shell.includes(anchor))throw new Error('Shell People selector anchor not found; aborting');
const direct=`  if(name==='people'&&['teachers','classes','students'].includes(page)){\n    const ok=global.PeopleModule?.openPage?.(page,title);\n    if(ok===false)global.toast?.('Kişiler sayfası açılamadı.');\n    if(title)setTitle(title);return true;\n  }\n`;
shell=shell.replace(anchor,direct+anchor).replace(selectorOld,'');
if(shell.includes('[data-people-tab='))throw new Error('Shell still routes People through tabs');
write('js/core/shell-ui.js',shell);
console.log('People screens migrated from internal tabs to direct page routing.');

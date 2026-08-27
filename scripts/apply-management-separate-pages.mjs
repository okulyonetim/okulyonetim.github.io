import fs from 'node:fs';

const read=p=>fs.readFileSync(p,'utf8'),write=(p,v)=>fs.writeFileSync(p,v,'utf8');
function once(src,oldText,newText,label){if(!src.includes(oldText))throw new Error(`${label} contract not found; aborting`);return src.replace(oldText,newText)}

let management=read('js/modules/management.js');
const tabs='<div class="ka-tabs"><button class="ka-tab" data-management-tab="staff" data-ka-permission="management.personnel">Personel</button><button class="ka-tab" data-management-tab="tasks">Periyodik</button><button class="ka-tab" data-management-tab="leaves">İzinler</button><button class="ka-tab" data-management-tab="duty" data-ka-permission="management.duty">Nöbet</button><button class="ka-tab" data-management-tab="puantaj" data-ka-permission="management.personnel">Puantaj</button><button class="ka-tab" data-management-tab="dilekce" data-ka-permission="management.personnel">Dilekçe</button></div>';
management=once(management,tabs,'','Management internal tabs');
management=once(management,"function render(){if(!mounted)return;document.querySelectorAll('[data-management-tab]').forEach(b=>b.classList.toggle('active',b.dataset.managementTab===active));const searchWrap=","function render(){if(!mounted)return;const searchWrap=",'Management render tab state');
const bindPatterns=[
  /document\.querySelectorAll\('\[data-management-tab\]'\)\.forEach\(b=>b\.addEventListener\('click',\(\)=>\{active=b\.dataset\.managementTab;query='';render\(\)\}\)\);?/g,
  /document\.querySelectorAll\('\[data-management-tab\]'\)\.forEach\(b=>b\.onclick=\(\)=>\{active=b\.dataset\.managementTab;query='';render\(\)\}\);?/g
];
for(const re of bindPatterns)management=management.replace(re,'');
const exportMatch=management.match(/window\.ManagementModule=\{([^}]+)\};/);
if(!exportMatch)throw new Error('ManagementModule export contract not found; aborting');
if(!management.includes("function unmount()"))throw new Error('Management unmount contract not found; aborting');
management=management.replace("function unmount()","function openPage(page,title=''){const allowed=['staff','tasks','leaves','duty','puantaj','dilekce'];if(!allowed.includes(page))return false;active=page;query='';const h=document.querySelector('[data-management-module] > .ka-row h2');if(h&&title)h.textContent=title;render();return true}\nfunction unmount()");
management=management.replace(/window\.ManagementModule=\{([^}]+)\};/,(_m,body)=>`window.ManagementModule={${body.includes('openPage')?body:`${body},openPage`}};`);
if(management.includes('data-management-tab'))throw new Error('Management tab tokens remain after migration');
for(const token of ['exceliUygula','otomatikDagitimUygula','defterDolduToggle','createDutyReport','DUTY_TASKS','data-duty-book'])if(!management.includes(token))throw new Error(`Duty contract lost: ${token}`);
write('js/modules/management.js',management);

let shell=read('js/core/shell-ui.js');
const selectorOld="name==='management'?`[data-management-tab=\"${page}\"]`:";
if(!shell.includes(selectorOld))throw new Error('Shell management tab selector not found; aborting');
const anchor="  const selector=name==='people'?";
if(!shell.includes(anchor))throw new Error('Shell selector anchor not found; aborting');
const direct=`  if(name==='management'&&['staff','tasks','leaves','duty','puantaj','dilekce'].includes(page)){\n    const ok=global.ManagementModule?.openPage?.(page,title);\n    if(ok===false)global.toast?.('Yönetim sayfası açılamadı.');\n    if(title)setTitle(title);return true;\n  }\n`;
shell=shell.replace(anchor,direct+anchor).replace(selectorOld,'');
if(shell.includes('[data-management-tab='))throw new Error('Shell still routes Management through tabs');
write('js/core/shell-ui.js',shell);
console.log('Management screens migrated from internal tabs to direct page routing.');

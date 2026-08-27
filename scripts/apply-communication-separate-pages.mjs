import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,v)=>fs.writeFileSync(p,v,'utf8');
function once(src,oldText,newText,label){if(!src.includes(oldText))throw new Error(`${label} contract not found; aborting`);return src.replace(oldText,newText)}

let communication=read('js/modules/communication.js');
const tabs='<div class="ka-tabs"><button class="ka-tab" data-communication-tab="announcements">Duyurular</button><button class="ka-tab" data-communication-tab="messages">Mesajlar</button><button class="ka-tab" data-communication-tab="polls">Anketler</button><button class="ka-tab" data-communication-tab="news">Haberler</button><button class="ka-tab" data-communication-tab="notes">Notlar</button><button class="ka-tab" data-communication-tab="calendar">Takvim</button></div>';
communication=once(communication,tabs,'','Communication internal tabs');
communication=once(communication,"function render(){if(!mounted)return;document.querySelectorAll('[data-communication-tab]').forEach(b=>b.classList.toggle('active',b.dataset.communicationTab===active));const out=","function render(){if(!mounted)return;const out=",'Communication render tab state');
communication=once(communication,"function bind(){document.querySelectorAll('[data-communication-tab]').forEach(b=>b.onclick=()=>{const next=b.dataset.communicationTab;if(active==='messages'&&next!=='messages')closeMessageConversation(false);active=next;render()});const s=document.getElementById('communicationSearch');if(s)s.oninput=()=>{query=s.value;render()}}","function bind(){const s=document.getElementById('communicationSearch');if(s)s.oninput=()=>{query=s.value;render()}}",'Communication tab binding');
communication=once(communication,"function unmount(){mounted=false;","function openPage(page,title=''){const allowed=['announcements','messages','polls','news','notes','calendar'];if(!allowed.includes(page))return false;if(active==='messages'&&page!=='messages')closeMessageConversation(false);active=page;query='';const h=document.querySelector('[data-communication-module] > .ka-row h2');if(h&&title)h.textContent=title;render();return true}\nfunction unmount(){mounted=false;",'Communication openPage insertion');
communication=once(communication,"window.CommunicationModule={mount,unmount,render,prepareLocal};","window.CommunicationModule={mount,unmount,render,prepareLocal,openPage};",'Communication public API');
if(communication.includes('data-communication-tab'))throw new Error('Communication tab tokens remain after migration');
for(const token of ['konusmaBaslatOgretmenIle','grupOlustur','mesajGonderDosyaIle','okunduIsaretle','bindPolls','bindNews','bindCalendar','bindNotes'])if(!communication.includes(token))throw new Error(`Communication behavior lost: ${token}`);
write('js/modules/communication.js',communication);

let shell=read('js/core/shell-ui.js');
const selectorOld="name==='communication'?`[data-communication-tab=\"${page}\"]`:";
if(!shell.includes(selectorOld))throw new Error('Shell communication tab selector not found; aborting');
const anchor="  const selector=name==='people'?";
if(!shell.includes(anchor))throw new Error('Shell selector anchor not found; aborting');
const direct=`  if(name==='communication'&&['announcements','messages','polls','news','notes','calendar'].includes(page)){\n    const ok=global.CommunicationModule?.openPage?.(page,title);\n    if(ok===false)global.toast?.('İletişim sayfası açılamadı.');\n    if(title)setTitle(title);return true;\n  }\n`;
shell=shell.replace(anchor,direct+anchor).replace(selectorOld,'');
if(shell.includes('[data-communication-tab='))throw new Error('Shell still routes Communication through tabs');
write('js/core/shell-ui.js',shell);
console.log('Communication screens migrated from internal tabs to direct page routing.');

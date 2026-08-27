import fs from 'node:fs';
function once(src,oldText,newText,label){if(!src.includes(oldText))throw new Error(label+' contract not found; aborting');return src.replace(oldText,newText)}

const transportPath='js/modules/transport.js';
let transport=fs.readFileSync(transportPath,'utf8');
const oldShell="function shell(){return `<section class=\"ka-stack\" data-transport-module><div class=\"ka-row ka-row--between\"><div><h2>Taşıma</h2><p class=\"ka-muted\">Servis, oturma planı ve resmî çıktılar cihaz verisiyle çalışır.</p></div><span id=\"transportCount\" class=\"ka-badge\"></span></div><div class=\"ka-tabs\"><button class=\"ka-tab\" data-transport-tab=\"services\" data-ka-permission=\"transport.services\" data-ka-min-level=\"preview\">Servisler</button><button class=\"ka-tab\" data-transport-tab=\"busSeats\" data-ka-permission=\"transport.seating\" data-ka-min-level=\"preview\">Servis Oturma</button><button class=\"ka-tab\" data-transport-tab=\"classSeats\" data-ka-permission=\"transport.classSeating\" data-ka-min-level=\"preview\">Sınıf Oturma</button></div><label class=\"ka-field\"><span class=\"ka-field__label\">Ara</span><input id=\"transportSearch\" type=\"search\" placeholder=\"Servis, plaka, güzergâh veya sınıf ara…\"></label><div id=\"transportContent\" class=\"ka-stack\"></div></section>`}";
const newShell="function shell(){return `<section class=\"ka-stack\" data-transport-module><div class=\"ka-row ka-row--between\"><div><h2>Taşıma</h2><p class=\"ka-muted\">Servis, oturma planı ve resmî çıktılar cihaz verisiyle çalışır.</p></div><span id=\"transportCount\" class=\"ka-badge\"></span></div><label class=\"ka-field\"><span class=\"ka-field__label\">Ara</span><input id=\"transportSearch\" type=\"search\" placeholder=\"Servis, plaka, güzergâh veya sınıf ara…\"></label><div id=\"transportContent\" class=\"ka-stack\"></div></section>`}";
transport=once(transport,oldShell,newShell,'Transport shell tabs');
const oldRender="function render(){if(!mounted)return;document.querySelectorAll('[data-transport-tab]').forEach(b=>b.classList.toggle('active',b.dataset.transportTab===active));const r=active==='busSeats'?busSeats():active==='classSeats'?classSeats():services();";
const newRender="function render(){if(!mounted)return;const r=active==='busSeats'?busSeats():active==='classSeats'?classSeats():services();";
transport=once(transport,oldRender,newRender,'Transport render tab state');
const oldBind="function bind(){document.querySelectorAll('[data-transport-tab]').forEach(b=>b.onclick=()=>{active=b.dataset.transportTab;render()});const s=document.getElementById('transportSearch');if(s)s.oninput=()=>{query=s.value;render()}}";
const newBind="function bind(){const s=document.getElementById('transportSearch');if(s)s.oninput=()=>{query=s.value;render()}}";
transport=once(transport,oldBind,newBind,'Transport tab binding');
const oldExport="function unmount(){mounted=false;closeEditor();document.querySelector('[data-service-modal]')?.remove();document.getElementById('transportReportPicker')?.remove();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}\nwindow.TransportModule={mount,unmount,render,prepareLocal,openBusEditor};";
const newExport="function openPage(page,title=''){const allowed=['services','busSeats','classSeats'];if(!allowed.includes(page))return false;active=page;query='';const h=document.querySelector('[data-transport-module] > .ka-row h2');if(h&&title)h.textContent=title;render();return true}\nfunction unmount(){mounted=false;closeEditor();document.querySelector('[data-service-modal]')?.remove();document.getElementById('transportReportPicker')?.remove();unsubs.forEach(f=>{try{f()}catch(_){}});unsubs=[]}\nwindow.TransportModule={mount,unmount,render,prepareLocal,openBusEditor,openPage};";
transport=once(transport,oldExport,newExport,'Transport openPage API');
if(transport.includes('data-transport-tab'))throw new Error('Transport tab markup remained');
fs.writeFileSync(transportPath,transport,'utf8');

const shellPath='js/core/shell-ui.js';
let shell=fs.readFileSync(shellPath,'utf8');
const oldMenu="{key:'transport',label:'Taşıma',icon:'🚌',tone:'violet',route:'transport',items:[['Taşıma İşlemleri','🚌','transport'],['Harita','🗺️','tools','map']]},";
const newMenu="{key:'transport',label:'Taşıma',icon:'🚌',tone:'violet',route:'transport',items:[['Servisler','🚌','transport','services'],['Servis Oturma','💺','transport','busSeats'],['Sınıf Oturma','🏫','transport','classSeats'],['Harita','🗺️','tools','map']]},";
shell=once(shell,oldMenu,newMenu,'Transport menu items');
const anchor="  if(name==='settings'&&['school','users','statistics','account','sync','roles','app','reminders','storage'].includes(page)){";
if(!shell.includes(anchor))throw new Error('Shell transport route anchor missing');
const transportRoute="  if(name==='transport'&&['services','busSeats','classSeats'].includes(page)){\n    const ok=global.TransportModule?.openPage?.(page,title);\n    if(ok===false)global.toast?.('Taşıma sayfası açılamadı.');\n    if(title)setTitle(title);return true;\n  }\n";
shell=shell.replace(anchor,transportRoute+anchor);
for(const token of ["['Servisler','🚌','transport','services']","['Servis Oturma','💺','transport','busSeats']","['Sınıf Oturma','🏫','transport','classSeats']","name==='transport'&&['services','busSeats','classSeats'].includes(page)"])if(!shell.includes(token))throw new Error('Transport ShellUI contract lost: '+token);
fs.writeFileSync(shellPath,shell,'utf8');
console.log('Transport tabs retired; separate page routing installed.');
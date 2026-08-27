import fs from 'node:fs';
const read=p=>fs.readFileSync(p,'utf8'),write=(p,v)=>fs.writeFileSync(p,v,'utf8');
function once(src,oldText,newText,label){if(!src.includes(oldText))throw new Error(`${label} contract not found; aborting`);return src.replace(oldText,newText)}
function oneRegex(src,re,repl,label){const m=src.match(re);if(!m||m.length<1)throw new Error(`${label} contract not found; aborting`);const next=src.replace(re,repl);if(next===src)throw new Error(`${label} produced no change`);return next}

let settings=read('js/modules/settings.js');
settings=once(settings,"let active='account',mounted=false,unsubs=[];","let active='home',mounted=false,unsubs=[];",'Settings default page');
const shellRe=/function shell\(\)\{const schoolTab=.*?\}\nfunction account\(\)/s;
const shellReplacement=`function shell(){return \`<section class="ka-stack" data-settings-module><div><h2>Ayarlar</h2><p class="ka-muted">Uygulama ve hesap ayarlarını merkezi olarak yönetin.</p></div><div id="settingsContent" class="ka-stack"></div></section>\`}
function settingsHome(){const items=[['account','Hesabım','Profil ve hesap bilgileri'],['sync','Senkronizasyon','Cihaz ve arka plan senkron durumu'],['school','Okul Bilgileri','Okul kimliği ve sosyal bağlantılar'],['users','Kullanıcı İşlemleri','Kullanıcı hesapları ve roller'],['statistics','Kullanıcı İstatistikleri','Kullanım ve depolama istatistikleri'],['roles','Roller','Merkezi rol ve yetki yönetimi'],['app','Uygulama Düzeni','Navigasyon, menü ve dashboard kartları'],['reminders','Hatırlatmalar','Bildirim ve hatırlatma davranışları'],['storage','Depolama','Kullanıcı depolama sınırları']].filter(x=>activeAllowed(x[0]));return \`<div class="ka-grid ka-settings-home">\${items.map(x=>\`<button type="button" class="ka-card ka-list-card" data-settings-open="\${esc(x[0])}" style="text-align:left;color:inherit"><div class="ka-card__body"><strong>\${esc(x[1])}</strong><div class="ka-muted">\${esc(x[2])}</div></div></button>\`).join('')}</div>\`}
function account()`;
settings=oneRegex(settings,shellRe,shellReplacement,'Settings shell tabs');
settings=once(settings,"function render(){if(!mounted)return;if(!activeAllowed(active))active='account';document.querySelectorAll('[data-settings-tab]').forEach(b=>b.classList.toggle('active',b.dataset.settingsTab===active));const out=","function render(){if(!mounted)return;if(!activeAllowed(active))active='home';const out=",'Settings render tab state');
settings=once(settings,"out.innerHTML=active==='sync'?sync():active==='school'?school():active==='users'?users():active==='statistics'?statistics():active==='roles'?roles():active==='storage'?storage():active==='reminders'?reminders():active==='app'?appLayout():account();out.querySelectorAll('[data-role-permissions]')","out.innerHTML=active==='home'?settingsHome():active==='sync'?sync():active==='school'?school():active==='users'?users():active==='statistics'?statistics():active==='roles'?roles():active==='storage'?storage():active==='reminders'?reminders():active==='app'?appLayout():account();out.querySelectorAll('[data-settings-open]').forEach(b=>b.onclick=()=>openPage(b.dataset.settingsOpen,b.textContent.trim()));out.querySelectorAll('[data-role-permissions]')",'Settings home rendering');
settings=once(settings,"function bind(){document.querySelectorAll('[data-settings-tab]').forEach(b=>b.onclick=()=>{active=b.dataset.settingsTab;render()})}","function bind(){}",'Settings tab binding');
settings=once(settings,"function unmount(){mounted=false;","function openPage(page,title=''){const allowed=['home','account','sync','school','users','statistics','roles','app','reminders','storage'];if(!allowed.includes(page)||!activeAllowed(page))return false;active=page;const h=document.querySelector('[data-settings-module] > div:first-child h2');if(h)h.textContent=page==='home'?'Ayarlar':(title||h.textContent);render();return true}\nfunction unmount(){mounted=false;",'Settings openPage insertion');
settings=once(settings,"window.SettingsModule={mount,unmount,render,prepareLocal,openRoleEditor,openUserEditor,saveReminderSettings};","window.SettingsModule={mount,unmount,render,prepareLocal,openPage,openRoleEditor,openUserEditor,saveReminderSettings};",'Settings public API');
if(settings.includes('data-settings-tab'))throw new Error('Settings tab tokens remain after migration');
for(const token of ['appLayout','bindAppEditor','school()','users()','statistics()','roles()','reminders()','storage()','OkulBilgileriService','KullaniciYonetimiService'])if(!settings.includes(token))throw new Error(`Settings behavior lost: ${token}`);
write('js/modules/settings.js',settings);

let shell=read('js/core/shell-ui.js');
const selectorOld="name==='settings'?`[data-settings-tab=\"${page}\"]`:";
if(!shell.includes(selectorOld))throw new Error('Shell settings tab selector not found; aborting');
const anchor="  const selector=name==='people'?";
if(!shell.includes(anchor))throw new Error('Shell selector anchor not found; aborting');
const direct=`  if(name==='settings'&&['school','users','statistics','account','sync','roles','app','reminders','storage'].includes(page)){\n    const ok=global.SettingsModule?.openPage?.(page,title);\n    if(ok===false)global.toast?.('Ayarlar sayfası açılamadı.');\n    if(title)setTitle(title);return true;\n  }\n`;
shell=shell.replace(anchor,direct+anchor).replace(selectorOld,'');
if(shell.includes('[data-settings-tab='))throw new Error('Shell still routes Settings through tabs');
write('js/core/shell-ui.js',shell);
console.log('Settings migrated to landing page plus direct separate-page routing.');

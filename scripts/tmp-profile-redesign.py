from pathlib import Path
import re

BASE='be38d2289792c1a9b91c6aade1ddae197d42877c'

shell_path=Path('js/core/shell-ui.js')
shell=shell_path.read_text(encoding='utf-8')
pattern=re.compile(r"function renderProfile\(\{remember=true\}=\{\}\)\{.*?\nfunction profileDetailHead",re.S)
replacement=r'''function renderProfile({remember=true}={}){
  closeHeaderPopover();closeMenu();setBottomActive('profile');if(remember)rememberView({kind:'profile'});setTitle('Profilim');
  const {u,t,name,role,photo,username}=profileInfo(),root=$('#v2ModuleRoot');if(!root)return;
  const initials=name.split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase('tr'),schedule=profileOwnSchedule(),duties=profileOwnDuties(),exams=profileOwnExams(),tasks=profileOwnTasks(),phone=t?.telefon||u.telefon||'',email=t?.email||t?.eposta||u.email||'',handle=String(username||'').startsWith('@')?username:'';
  const contact=[handle?`<span class="ka-profile-contact__item"><b aria-hidden="true">@</b><span>${esc(handle.slice(1))}</span></span>`:'',phone?`<span class="ka-profile-contact__item"><b aria-hidden="true">☎</b><span>${esc(phone)}</span></span>`:'',email?`<span class="ka-profile-contact__item"><b aria-hidden="true">✉</b><span>${esc(email)}</span></span>`:''].filter(Boolean).join('');
  const stat=(icon,value,label)=>`<article class="ka-profile-stat"><span class="ka-profile-stat__icon" aria-hidden="true">${icon}</span><b>${value}</b><small>${esc(label)}</small></article>`;
  const action=(kind,icon,title,desc,count)=>`<button type="button" class="ka-profile-action" data-profile-view="${kind}"><span class="ka-profile-action__icon" aria-hidden="true">${icon}</span><span class="ka-profile-action__copy"><strong>${esc(title)}</strong><small>${esc(desc)}</small></span><span class="ka-profile-action__count"><b>${count}</b><small>kayıt</small></span><span class="ka-profile-action__chevron" aria-hidden="true">›</span></button>`;
  root.innerHTML=`<section class="ka-profile-page"><article class="ka-profile-hero"><div class="ka-profile-avatar">${photo?`<img src="${esc(photo)}" alt="${esc(name)}">`:esc(initials||'K')}</div><div class="ka-profile-copy"><span class="ka-profile-eyebrow">ÖĞRETMEN PROFİLİ</span><h2>${esc(name)}</h2><p class="ka-profile-role">${esc(role)}</p>${contact?`<div class="ka-profile-contact">${contact}</div>`:''}</div></article><div class="ka-profile-stats" aria-label="Kişisel kayıt özeti">${stat('📅',schedule.length,'Ders')}${stat('🛡️',duties.length,'Nöbet')}${stat('📝',exams.length,'Sınav')}${stat('🗂️',tasks.length,'Görev')}</div><section class="ka-profile-section"><div class="ka-profile-section__head"><span>ÇALIŞMA ALANI</span><h3>Kişisel işlemlerim</h3><p>Yalnız öğretmen kaydınıza bağlı içeriklere hızlıca ulaşın.</p></div><div class="ka-profile-actions">${action('schedule','📅','Ders Programım','Haftalık ders programınız',schedule.length)}${action('duty','🛡️','Nöbetlerim','Size atanmış nöbetler',duties.length)}${action('exams','📝','Sınavlarım','Oluşturduğunuz yazılı sınavlar',exams.length)}${action('tasks','🗂️','Diğer Görevlerim','ŞÖK, zümre ve diğer görevler',tasks.length)}</div></section><button type="button" class="ka-logout-button" data-profile-logout><span aria-hidden="true">↪</span> Oturumu Kapat</button></section>`;
  $$('[data-profile-view]',root).forEach(b=>b.addEventListener('click',()=>renderProfileDetail(b.dataset.profileView)));root.querySelector('[data-profile-logout]')?.addEventListener('click',()=>global.cikisYap?.())
}
function profileDetailHead'''
shell,count=pattern.subn(replacement,shell,count=1)
if count!=1:
    raise SystemExit(f'profile renderer replacement count={count}')
shell_path.write_text(shell,encoding='utf-8')

css_path=Path('css/design-system.css')
css=css_path.read_text(encoding='utf-8')
profile_pattern=re.compile(r"\.ka-profile-page\{.*?\.ka-logout-button\{.*?\}",re.S)
profile_css=r'''.ka-profile-page{--ka-profile-hero-start:#17684f;--ka-profile-hero-end:#0d4a38;--ka-profile-hero-text:#fff;--ka-profile-hero-muted:#e4f4ed;--ka-profile-hero-surface:rgba(255,255,255,.12);--ka-profile-hero-border:rgba(255,255,255,.22);width:100%;max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:14px;padding:4px 6px 22px}.ka-profile-hero{position:relative;display:grid;grid-template-columns:92px minmax(0,1fr);align-items:center;gap:18px;min-height:166px;padding:23px 24px;border:1px solid color-mix(in srgb,var(--ka-profile-hero-start) 78%,#fff);border-radius:26px;overflow:hidden;background:linear-gradient(145deg,var(--ka-profile-hero-start),var(--ka-profile-hero-end));color:var(--ka-profile-hero-text);box-shadow:0 12px 28px rgba(10,66,49,.16)}.ka-profile-hero::before{content:"";position:absolute;right:-52px;top:-72px;width:190px;height:190px;border-radius:50%;background:rgba(255,255,255,.055)}.ka-profile-hero::after{content:"";position:absolute;right:44px;bottom:-78px;width:145px;height:145px;border-radius:50%;background:rgba(255,255,255,.035)}[data-theme="dark"] .ka-profile-page{--ka-profile-hero-start:#174f3d;--ka-profile-hero-end:#0b3026;--ka-profile-hero-muted:#dcefe7;--ka-profile-hero-surface:rgba(255,255,255,.09);--ka-profile-hero-border:rgba(255,255,255,.17)}[data-theme="dark"] .ka-profile-hero{border-color:#2b6b56;box-shadow:0 15px 34px rgba(0,0,0,.34)}.ka-profile-avatar{position:relative;z-index:1;width:92px;height:92px;border-radius:24px;background:rgba(255,255,255,.14);border:3px solid rgba(255,255,255,.86);box-shadow:0 7px 18px rgba(0,0,0,.16);display:grid;place-items:center;overflow:hidden;color:#fff;font-size:27px;font-weight:900}.ka-profile-avatar img{width:100%;height:100%;object-fit:cover;background:#fff}.ka-profile-copy{position:relative;z-index:1;min-width:0}.ka-profile-eyebrow{display:block;color:var(--ka-profile-hero-muted);font-size:9.5px;font-weight:900;letter-spacing:.13em;line-height:1.2}.ka-profile-copy h2{margin-top:5px;color:#fff;font-size:24px;line-height:1.12;letter-spacing:-.025em;overflow-wrap:anywhere}.ka-profile-role{margin-top:5px;color:#fff;font-size:13.5px;font-weight:750;line-height:1.35}.ka-profile-contact{display:flex;flex-wrap:wrap;gap:6px;margin-top:13px}.ka-profile-contact__item{min-width:0;max-width:100%;min-height:28px;padding:4px 8px;border:1px solid var(--ka-profile-hero-border);border-radius:9px;background:var(--ka-profile-hero-surface);color:var(--ka-profile-hero-muted);display:inline-flex;align-items:center;gap:6px;font-size:10.5px;font-weight:700;line-height:1.25}.ka-profile-contact__item>b{flex:0 0 auto;color:#fff;font-size:10px}.ka-profile-contact__item>span{min-width:0;overflow-wrap:anywhere}.ka-profile-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:7px}.ka-profile-stat{min-width:0;min-height:86px;padding:9px 4px;border:1px solid var(--ka-border);border-radius:17px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center}.ka-profile-stat__icon{width:31px;height:31px;border-radius:10px;background:var(--ka-primary-soft);color:var(--ka-primary);display:grid;place-items:center;font-size:16px;line-height:1}.ka-profile-stat>b{margin-top:4px;color:var(--ka-text);font-size:21px;line-height:1;font-variant-numeric:tabular-nums}.ka-profile-stat>small{margin-top:4px;color:var(--ka-text-muted);font-size:9px;font-weight:850;line-height:1;text-transform:uppercase;letter-spacing:.055em;white-space:nowrap}.ka-profile-section{display:grid;gap:10px;padding-top:2px}.ka-profile-section__head{display:grid;gap:3px;padding:0 3px}.ka-profile-section__head>span{color:var(--ka-primary);font-size:9.5px;font-weight:900;letter-spacing:.12em}.ka-profile-section__head h3{color:var(--ka-text);font-size:18px;font-weight:900;letter-spacing:-.015em;text-transform:none}.ka-profile-section__head p{color:var(--ka-text-muted);font-size:11.5px;line-height:1.45}.ka-profile-actions{display:grid;grid-template-columns:1fr;gap:8px}.ka-profile-action{appearance:none;width:100%;min-width:0;min-height:78px;padding:11px 11px;border:1px solid var(--ka-border);border-radius:17px;background:var(--ka-card-bg);color:var(--ka-text);box-shadow:var(--ka-shadow-sm);display:grid;grid-template-columns:42px minmax(0,1fr) auto 16px;align-items:center;gap:9px;text-align:left;cursor:pointer;transition:transform var(--ka-transition-fast),border-color var(--ka-transition-fast),background var(--ka-transition-fast),box-shadow var(--ka-transition-fast)}.ka-profile-action:hover{border-color:var(--ka-border-strong);box-shadow:var(--ka-shadow-md)}.ka-profile-action:active{transform:scale(.985);background:var(--ka-primary-soft)}.ka-profile-action:focus-visible,.ka-logout-button:focus-visible{outline:3px solid var(--ka-focus);outline-offset:2px}.ka-profile-action__icon{width:42px;height:42px;border-radius:13px;background:var(--ka-primary-soft);color:var(--ka-primary);display:grid;place-items:center;font-size:21px}.ka-profile-action__copy{min-width:0;display:flex;flex-direction:column;gap:3px}.ka-profile-action__copy strong{display:block;color:var(--ka-text);font-size:13.5px;font-weight:880;line-height:1.22;overflow-wrap:anywhere}.ka-profile-action__copy small{display:block;color:var(--ka-text-muted);font-size:10.5px;font-weight:650;line-height:1.32;overflow-wrap:anywhere}.ka-profile-action__count{min-width:43px;padding:5px 6px;border-radius:10px;background:var(--ka-muted-bg);display:flex;flex-direction:column;align-items:center;justify-content:center}.ka-profile-action__count b{color:var(--ka-text);font-size:14px;line-height:1;font-variant-numeric:tabular-nums}.ka-profile-action__count small{margin-top:3px;color:var(--ka-text-muted);font-size:7.5px;font-weight:800;line-height:1}.ka-profile-action__chevron{color:var(--ka-text-muted);font-size:22px;font-weight:500;line-height:1}.ka-logout-button{width:100%;max-width:360px;min-height:46px;margin:4px auto 0;padding:9px 18px;border:1px solid var(--ka-danger);border-radius:14px;background:var(--ka-danger);color:#fff;display:inline-flex;align-items:center;justify-content:center;gap:8px;font-weight:850;cursor:pointer;box-shadow:0 5px 14px color-mix(in srgb,var(--ka-danger) 18%,transparent)}
@media(min-width:640px){.ka-profile-actions{grid-template-columns:repeat(2,minmax(0,1fr))}.ka-profile-action{min-height:86px}}
@media(max-width:520px){.ka-profile-page{gap:12px;padding:2px 5px 18px}.ka-profile-hero{grid-template-columns:78px minmax(0,1fr);gap:14px;min-height:154px;padding:19px 16px;border-radius:23px}.ka-profile-avatar{width:78px;height:78px;border-radius:21px}.ka-profile-copy h2{font-size:20px}.ka-profile-role{font-size:12.5px}.ka-profile-contact{display:grid;grid-template-columns:1fr;gap:4px;margin-top:10px}.ka-profile-contact__item{width:fit-content;max-width:100%;min-height:25px;padding:3px 7px;font-size:9.5px}.ka-profile-stats{gap:5px}.ka-profile-stat{min-height:78px;border-radius:15px;padding-inline:2px}.ka-profile-stat__icon{width:28px;height:28px;font-size:14px}.ka-profile-stat>b{font-size:19px}.ka-profile-stat>small{font-size:8px}.ka-profile-section__head h3{font-size:17px}.ka-profile-section__head p{font-size:10.5px}.ka-profile-action{min-height:74px;padding:10px;grid-template-columns:39px minmax(0,1fr) auto 14px;gap:8px}.ka-profile-action__icon{width:39px;height:39px;border-radius:12px;font-size:19px}.ka-profile-action__copy strong{font-size:13px}.ka-profile-action__copy small{font-size:10px}.ka-profile-action__count{min-width:40px}.ka-profile-action__chevron{font-size:20px}}
@media(max-width:360px){.ka-profile-hero{grid-template-columns:68px minmax(0,1fr);gap:11px;padding-inline:13px}.ka-profile-avatar{width:68px;height:68px;border-radius:18px}.ka-profile-copy h2{font-size:18px}.ka-profile-stat{min-height:74px}.ka-profile-stat>small{font-size:7.5px;letter-spacing:.025em}.ka-profile-action{grid-template-columns:37px minmax(0,1fr) auto 12px;gap:7px;padding-inline:9px}.ka-profile-action__icon{width:37px;height:37px}.ka-profile-action__count{min-width:37px;padding-inline:4px}}'''
css,count=profile_pattern.subn(profile_css,css,count=1)
if count!=1:
    raise SystemExit(f'profile css replacement count={count}')
# Remove obsolete narrow-screen absolute-position compensation from the former profile hero.
css=css.replace('.ka-profile-hero{padding-left:104px}','',1)
css_path.write_text(css,encoding='utf-8')

# Cache bust central design system.
index_path=Path('index.html')
index=index_path.read_text(encoding='utf-8')
if index.count('css/design-system.css?v=862')!=1:
    raise SystemExit('index css v862 contract missing')
index=index.replace('css/design-system.css?v=862','css/design-system.css?v=863',1)
index_path.write_text(index,encoding='utf-8')

sw_path=Path('service-worker.js')
sw=sw_path.read_text(encoding='utf-8')
if "const CACHE_ADI='oy-cache-v862'" not in sw or './css/design-system.css?v=862' not in sw:
    raise SystemExit('service worker v862 contract missing')
sw=sw.replace("const CACHE_ADI='oy-cache-v862'","const CACHE_ADI='oy-cache-v863'",1)
sw=sw.replace('./css/design-system.css?v=862','./css/design-system.css?v=863',1)
sw_path.write_text(sw,encoding='utf-8')

trial_path=Path('tests/trial-counter-scroll-stability.test.js')
trial=trial_path.read_text(encoding='utf-8')
trial=trial.replace('css/design-system.css?v=862','css/design-system.css?v=863').replace("const CACHE_ADI='oy-cache-v862'","const CACHE_ADI='oy-cache-v863'")
trial_path.write_text(trial,encoding='utf-8')

classic_path=Path('tests/classic-shell-v2-smoke.test.js')
classic=classic_path.read_text(encoding='utf-8')
classic=classic.replace('<link rel=\\"stylesheet\\" href=\\"css/design-system.css?v=838\\">','<link rel=\\"stylesheet\\" href=\\"css/design-system.css?v=863\\">')
classic_path.write_text(classic,encoding='utf-8')

profile_test=Path('tests/profile-page-redesign.test.js')
profile_test.write_text(r'''const fs=require('fs');
const assert=require('assert');
const ui=fs.readFileSync('js/core/shell-ui.js','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const start=ui.indexOf('function renderProfile({remember=true}={})');
const end=ui.indexOf('\nfunction profileDetailHead',start);
assert(start>=0&&end>start,'Profil renderer bulunmalı.');
const block=ui.slice(start,end);
assert(block.includes('ka-profile-stats')&&!block.includes('ka-home-stats'),'Profil özet kartları dashboard istatistik sınıflarından bağımsız olmalı.');
for(const token of ['ka-profile-contact','ka-profile-actions','ka-profile-action__copy','ka-profile-action__count','ka-profile-action__chevron'])assert(block.includes(token),`Profil yeni düzen bileşeni eksik: ${token}`);
assert(block.includes("phone?`<span class=\"ka-profile-contact__item\"")&&block.includes("email?`<span class=\"ka-profile-contact__item\""),'Telefon ve e-posta tek sıkışık satır yerine ayrı iletişim öğeleri olmalı.');
assert(block.includes("action('schedule'")&&block.includes("action('duty'")&&block.includes("action('exams'")&&block.includes("action('tasks'"),'Dört kişisel çalışma alanı davranışı korunmalı.');
assert(block.includes('data-profile-logout')&&block.includes('global.cikisYap?.()'),'Oturum kapatma davranışı korunmalı.');
for(const token of ['.ka-profile-page{--ka-profile-hero-start:#17684f','.ka-profile-stats{display:grid;grid-template-columns:repeat(4','.ka-profile-action__copy{min-width:0;display:flex;flex-direction:column','.ka-profile-contact__item{','.ka-logout-button{width:100%'])assert(design.includes(token),`Profil merkezi tasarım sözleşmesi eksik: ${token}`);
assert(design.includes('[data-theme="dark"] .ka-profile-page{--ka-profile-hero-start:#174f3d;--ka-profile-hero-end:#0b3026'),'Koyu temada profil hero açık mint primary yerine koyu, yüksek kontrast yüzey kullanmalı.');
assert(design.includes('.ka-profile-copy h2{')&&design.includes('color:#fff')&&design.includes('--ka-profile-hero-muted:#e4f4ed'),'Hero metin kontrastı beyaz/açık sabit paletle korunmalı.');
assert(design.includes('@media(max-width:520px)')&&design.includes('.ka-profile-actions{display:grid;grid-template-columns:1fr;gap:8px}'),'Mobil çalışma kartları sıkışık iki sütun yerine tek sütun olmalı.');
assert(!design.includes('.ka-profile-hero{padding-left:104px}'),'Eski mutlak konum profil telafisi geri dönmemeli.');
assert(index.includes('css/design-system.css?v=863'),'Profil tasarımı güncel merkezi CSS sürümüyle yüklenmeli.');
assert(sw.includes("const CACHE_ADI='oy-cache-v863'")&&sw.includes('./css/design-system.css?v=863'),'Yeni profil tasarımı PWA cache sürümüyle yayınlanmalı.');
console.log('Profil sayfası kontrast + düzen yeniden tasarım sözleşmesi başarılı.');
''',encoding='utf-8')

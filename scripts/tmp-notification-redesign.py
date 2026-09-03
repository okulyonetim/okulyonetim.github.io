from pathlib import Path
import re

BASE='e4959b1a7af5a27b9e1488d3a334153434f101c4'

shell_path=Path('js/core/shell-ui.js')
shell=shell_path.read_text(encoding='utf-8')
pattern=re.compile(r"function openNotifications\(\)\{.*?\nfunction norm",re.S)
replacement='''function notificationTone(r){
  const t=String(r?.type||'').toLocaleLowerCase('tr-TR');
  if(r?.kind==='message')return 'message';
  if(r?.kind==='announcement')return 'announcement';
  if(t.includes('hatırlat'))return 'reminder';
  if(t.includes('deneme'))return 'trial';
  if(t.includes('sınav'))return 'exam';
  if(t.includes('görev'))return 'task';
  return 'default';
}
function openNotifications(){
  const anchor=$('[data-ka-header-notification]');if(!anchor)return;
  const p=popoverBase(anchor,300),rows=notificationRows(),count=rows.reduce((n,r)=>n+Math.max(1,Number(r.count)||1),0),upcomingCount=rows.filter(r=>r.kind==='upcoming').length;
  p.classList.add('ka-notification-popover');
  p.innerHTML=`<div class="ka-notification-popover__head"><span class="ka-notification-popover__mark" aria-hidden="true">${SVG.note}</span><span class="ka-notification-popover__title"><strong>Bildirimler</strong><small>${upcomingCount?`${upcomingCount} yaklaşan etkinlik`:'Yaklaşan etkinlik yok'}</small></span>${count?`<span class="ka-notification-popover__count" aria-label="${count} bildirim">${count>99?'99+':count}</span>`:''}</div><div class="ka-notification-popover__list">${rows.length?rows.map((r,i)=>{const tone=notificationTone(r),meta=r.meta||formatNoticeDate(r.date,r.time),showDate=!r.meta;return `<button type="button" class="ka-notification-row ka-notification-row--${tone}" data-notice-index="${i}"><span class="ka-notification-row__icon" aria-hidden="true">${r.icon}</span><span class="ka-notification-row__copy"><span class="ka-notification-row__top"><strong>${esc(r.title)}</strong>${Number(r.count)>1?`<b class="ka-notification-row__quantity">${Number(r.count)>99?'99+':Number(r.count)}</b>`:''}</span><span class="ka-notification-row__meta"><b>${esc(r.type)}</b>${showDate?`<i aria-hidden="true"></i><span>${esc(meta)}</span>`:`<span>${esc(meta)}</span>`}</span></span><span class="ka-notification-row__chevron" aria-hidden="true">${SVG.chevron}</span></button>`}).join(''):'<div class="ka-notification-empty"><span aria-hidden="true">✓</span><strong>Yeni bildirim yok</strong><small>Yaklaşan etkinlik ve okunmamış bildirim bulunmuyor.</small></div>'}</div>`;
  $$('[data-notice-index]',p).forEach(b=>b.addEventListener('click',()=>{const r=rows[Number(b.dataset.noticeIndex)];if(!r)return;closeHeaderPopover();routeModule(r.module,{bottom:'menu',page:r.page||'',title:r.routeTitle||r.type})}))
}
function norm'''
shell,count=pattern.subn(lambda m:replacement,shell,count=1)
if count!=1: raise SystemExit(f'notification renderer replacement count={count}')
shell_path.write_text(shell,encoding='utf-8')

css_path=Path('css/design-system.css')
css=css_path.read_text(encoding='utf-8')
css_pattern=re.compile(r"\.ka-notification-popover\{.*?(?=\.ka-profile-page\{)",re.S)
notification_css='''.ka-notification-popover{padding:0!important;overflow:hidden!important;display:flex!important;flex-direction:column!important;max-width:300px!important;max-height:min(520px,calc(100dvh - 88px))!important;border-radius:22px!important;background:var(--ka-card-raised-bg)!important;border-color:var(--ka-border)!important;box-shadow:0 18px 48px rgba(16,55,43,.18)!important}.ka-notification-popover__head{flex:0 0 auto;display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:10px;padding:12px 13px;border-bottom:1px solid var(--ka-border);background:var(--ka-card-raised-bg)}.ka-notification-popover__mark{width:38px;height:38px;border-radius:12px;background:var(--ka-primary-soft);color:var(--ka-primary);display:grid;place-items:center}.ka-notification-popover__mark svg{width:20px;height:20px}.ka-notification-popover__title{min-width:0;display:flex;flex-direction:column;gap:2px}.ka-notification-popover__title strong{color:var(--ka-text);font-size:15px;font-weight:900;line-height:1.15;letter-spacing:-.015em}.ka-notification-popover__title small{color:var(--ka-text-muted);font-size:9.5px;font-weight:650;line-height:1.25}.ka-notification-popover__count{min-width:30px;height:30px;padding:0 7px;border-radius:10px;background:var(--ka-primary-soft);color:var(--ka-primary);display:grid;place-items:center;font-size:11px;font-weight:900;font-variant-numeric:tabular-nums}.ka-notification-popover__list{flex:1 1 auto;min-height:0;overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:8px;background:var(--ka-muted-bg);display:flex;flex-direction:column;gap:7px;scrollbar-width:thin}.ka-notification-row{--ka-notice-accent:var(--ka-primary);--ka-notice-soft:var(--ka-primary-soft);appearance:none;width:100%;min-width:0;min-height:66px;padding:9px 8px;border:1px solid var(--ka-border);border-radius:14px;background:var(--ka-card-bg);color:var(--ka-text);box-shadow:0 1px 3px rgba(18,69,52,.035);display:grid;grid-template-columns:40px minmax(0,1fr) 16px;align-items:center;gap:9px;text-align:left;cursor:pointer;transition:transform var(--ka-transition-fast),border-color var(--ka-transition-fast),background var(--ka-transition-fast),box-shadow var(--ka-transition-fast)}.ka-notification-row:hover{border-color:color-mix(in srgb,var(--ka-notice-accent) 38%,var(--ka-border));box-shadow:var(--ka-shadow-sm)}.ka-notification-row:active{transform:scale(.985);background:color-mix(in srgb,var(--ka-notice-soft) 42%,var(--ka-card-bg))}.ka-notification-row:focus-visible{outline:3px solid var(--ka-focus);outline-offset:1px}.ka-notification-row__icon{width:40px;height:40px;border-radius:12px;background:var(--ka-notice-soft);color:var(--ka-notice-accent);display:grid;place-items:center;font-size:20px;line-height:1}.ka-notification-row__copy{min-width:0;display:flex;flex-direction:column;gap:5px}.ka-notification-row__top{min-width:0;display:flex;align-items:flex-start;gap:6px}.ka-notification-row__top>strong{min-width:0;flex:1;color:var(--ka-text);font-size:11.5px;font-weight:850;line-height:1.25;overflow-wrap:anywhere}.ka-notification-row__quantity{flex:0 0 auto;min-width:20px;height:20px;padding:0 5px;border-radius:7px;background:var(--ka-notice-soft);color:var(--ka-notice-accent);display:grid;place-items:center;font-size:8.5px;font-weight:900;font-variant-numeric:tabular-nums}.ka-notification-row__meta{min-width:0;display:flex;align-items:center;flex-wrap:wrap;gap:4px;color:var(--ka-text-muted);font-size:8.7px;font-weight:650;line-height:1.25}.ka-notification-row__meta>b{color:var(--ka-notice-accent);font-size:8.5px;font-weight:850}.ka-notification-row__meta>i{width:3px;height:3px;border-radius:50%;background:var(--ka-border-strong);flex:0 0 3px}.ka-notification-row__meta>span{min-width:0;overflow-wrap:anywhere}.ka-notification-row__chevron{width:16px;height:20px;color:var(--ka-text-muted);display:grid;place-items:center;opacity:.72}.ka-notification-row__chevron svg{width:16px;height:16px}.ka-notification-row--reminder{--ka-notice-accent:#a66100;--ka-notice-soft:#fff2d8}.ka-notification-row--exam{--ka-notice-accent:#1769aa;--ka-notice-soft:#e6f2fb}.ka-notification-row--trial{--ka-notice-accent:#6a54a3;--ka-notice-soft:#eeeafb}.ka-notification-row--task{--ka-notice-accent:#237441;--ka-notice-soft:#e5f4e9}.ka-notification-row--message{--ka-notice-accent:#17684f;--ka-notice-soft:#e4f2ec}.ka-notification-row--announcement{--ka-notice-accent:#a64b3d;--ka-notice-soft:#fae9e6}.ka-notification-empty{min-height:150px;padding:22px 16px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;color:var(--ka-text-muted)}.ka-notification-empty>span{width:46px;height:46px;border-radius:15px;background:var(--ka-primary-soft);color:var(--ka-primary);display:grid;place-items:center;font-size:20px;font-weight:900}.ka-notification-empty>strong{margin-top:10px;color:var(--ka-text);font-size:13px}.ka-notification-empty>small{margin-top:4px;max-width:210px;font-size:9.5px;line-height:1.4}[data-theme="dark"] .ka-notification-popover{box-shadow:0 20px 56px rgba(0,0,0,.48)!important}[data-theme="dark"] .ka-notification-row{box-shadow:none}[data-theme="dark"] .ka-notification-row--reminder{--ka-notice-accent:#f0b85a;--ka-notice-soft:#352911}[data-theme="dark"] .ka-notification-row--exam{--ka-notice-accent:#78b8eb;--ka-notice-soft:#132b3d}[data-theme="dark"] .ka-notification-row--trial{--ka-notice-accent:#b7a4ea;--ka-notice-soft:#29223f}[data-theme="dark"] .ka-notification-row--task{--ka-notice-accent:#77cf91;--ka-notice-soft:#17321f}[data-theme="dark"] .ka-notification-row--message{--ka-notice-accent:#67dbad;--ka-notice-soft:#153528}[data-theme="dark"] .ka-notification-row--announcement{--ka-notice-accent:#e78c7f;--ka-notice-soft:#3a211f}@media(max-width:360px){.ka-notification-popover__head{grid-template-columns:35px minmax(0,1fr) auto;padding:10px}.ka-notification-popover__mark{width:35px;height:35px}.ka-notification-popover__list{padding:7px;gap:6px}.ka-notification-row{min-height:62px;grid-template-columns:37px minmax(0,1fr) 14px;gap:8px;padding:8px 7px}.ka-notification-row__icon{width:37px;height:37px;border-radius:11px;font-size:18px}.ka-notification-row__top>strong{font-size:11px}.ka-notification-row__meta{font-size:8.2px}.ka-notification-row__chevron svg{width:14px;height:14px}}
'''
css,count=css_pattern.subn(lambda m:notification_css,css,count=1)
if count!=1: raise SystemExit(f'notification css replacement count={count}')
css_path.write_text(css,encoding='utf-8')

# Central design-system cache bust.
index_path=Path('index.html')
index=index_path.read_text(encoding='utf-8').replace('css/design-system.css?v=863','css/design-system.css?v=864')
index_path.write_text(index,encoding='utf-8')

sw_path=Path('service-worker.js')
sw=sw_path.read_text(encoding='utf-8').replace("oy-cache-v863","oy-cache-v864").replace('css/design-system.css?v=863','css/design-system.css?v=864')
sw_path.write_text(sw,encoding='utf-8')

for p in Path('tests').glob('*.test.js'):
    text=p.read_text(encoding='utf-8')
    text=text.replace('css/design-system.css?v=863','css/design-system.css?v=864').replace('oy-cache-v863','oy-cache-v864')
    p.write_text(text,encoding='utf-8')

# Dedicated regression contract for the notification tray.
test=Path('tests/notification-popover-redesign.test.js')
test.write_text(r'''const fs=require('fs');
const assert=require('assert');
const ui=fs.readFileSync('js/core/shell-ui.js','utf8');
const design=fs.readFileSync('css/design-system.css','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');
const start=ui.indexOf('function notificationTone(r)');
const end=ui.indexOf('\nfunction norm',start);
assert(start>=0&&end>start,'Bildirim renderer bulunmalı.');
const block=ui.slice(start,end);
assert(block.includes('popoverBase(anchor,300)'),'Bildirim popoverı kompakt 300px sözleşmesini korumalı.');
assert(!block.includes('ka-btn ka-btn--ghost ka-notification-row'),'Bildirim satırı genel yeşil buton sınıflarını kullanmamalı.');
for(const token of ['ka-notification-popover__mark','ka-notification-popover__count','ka-notification-row__top','ka-notification-row__meta','ka-notification-row__quantity','notificationTone(r)'])assert(block.includes(token),`Yeni bildirim bileşeni eksik: ${token}`);
for(const tone of ['reminder','exam','trial','task','message','announcement'])assert(block.includes(`return '${tone}'`),`Bildirim renk tonu eşlemesi eksik: ${tone}`);
for(const token of ['.ka-notification-popover{padding:0!important','.ka-notification-popover__list{flex:1 1 auto','.ka-notification-row{--ka-notice-accent:','.ka-notification-row--reminder{','.ka-notification-row--announcement{','[data-theme="dark"] .ka-notification-row--message{'])assert(design.includes(token),`Merkezi bildirim tasarım sözleşmesi eksik: ${token}`);
assert(design.includes('background:var(--ka-card-bg)')&&design.includes('background:var(--ka-muted-bg)'),'Liste nötr kart yüzeyleri kullanmalı; tüm satır yeşile boyanmamalı.');
assert(index.includes('css/design-system.css?v=864'),'Yeni bildirim tasarımı güncel merkezi CSS sürümüyle yüklenmeli.');
assert(sw.includes("const CACHE_ADI='oy-cache-v864'")&&sw.includes('./css/design-system.css?v=864'),'Bildirim tasarımı yeni PWA cache sürümüyle yayınlanmalı.');
console.log('Bildirim popover kontrast + kart düzeni sözleşmesi başarılı.');
''',encoding='utf-8')

from pathlib import Path
import re

root=Path('.')
dash_path=root/'js/modules/dashboard.js'
css_path=root/'css/design-system.css'
test_path=root/'tests/dashboard-card-routes-smoke.test.js'
sw_path=root/'service-worker.js'

dash=dash_path.read_text(encoding='utf-8')
css=css_path.read_text(encoding='utf-8')
test=test_path.read_text(encoding='utf-8')
sw=sw_path.read_text(encoding='utf-8')

announcement = r'''function announcementDateTime(v){if(!v)return'';try{const d=new Date(v);if(Number.isNaN(d.getTime()))return date(v);return d.toLocaleString('tr-TR',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}catch(_){return date(v)}}
function announcementSection(){if(!cardVisible('announcements'))return'';const d=arr('duyurular').filter(x=>x&&!x.arsivlendi&&x.aktif!==false&&!x.pasif).sort((a,b)=>String(b.tarih||b.eklenmeTarihi||'').localeCompare(String(a.tarih||a.eklenmeTarihi||'')))[0];if(!d)return'';const ok=!!window.DuyurularService?.benOkudumMu?.(d),readers=Object.keys(d.okuyanlar||{}).length,raw=String(d.icerik||d.aciklama||'').replace(/<[^>]*>/g,'').trim(),short=raw.length>180?raw.slice(0,180).trim()+'…':raw;return `<div class="kh-dynamic" data-home-section="announcements"><article class="kh-announcement ${ok?'is-read':'is-unread'}" data-duyuru-id="${esc(d.id||'')}"><div class="kh-announcement-accent"></div><div class="kh-announcement-head"><div class="kh-announcement-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-5v12L3 14v-3Z"/><path d="M11.6 16.5 13 21H7l-1.2-6"/></svg></div><div class="kh-announcement-title-wrap"><div class="kh-announcement-kicker">DUYURU</div><h3>${esc(d.baslik||d.ad||'Duyuru')}</h3><div class="kh-announcement-meta">${esc(d.olusturanAdi||'Yönetim')}${d.tarih?' · '+esc(announcementDateTime(d.tarih)):''}</div></div><span class="kh-announcement-status ${ok?'read':'new'}">${ok?'✓ OKUNDU':'YENİ'}</span></div>${short?`<button type="button" class="kh-announcement-body" data-dash-route="communication" data-dash-page="announcements" data-dash-title="Duyurular">${esc(short)}</button>`:''}<div class="kh-announcement-footer"><label class="kh-read-check ${ok?'checked':''}"><input type="checkbox" data-dash-announcement-read="${esc(d.id||'')}" ${ok?'checked disabled':''}><span class="kh-read-box" aria-hidden="true">✓</span><span>${ok?'Okundu olarak işaretlendi':'Okudum'}</span></label>${isAdmin()?`<button type="button" class="kh-read-count" data-dash-route="communication" data-dash-page="announcements" data-dash-title="Duyurular"><span>👁</span><b>${readers}</b> kişi okudu <span class="arrow">›</span></button>`:''}</div></article></div>`}'''

pattern=r"function announcementSection\(\)\{.*?\}\nfunction pollSection\(\)"
new_dash,n=re.subn(pattern,announcement+'\nfunction pollSection()',dash,count=1,flags=re.S)
if n!=1:
    raise SystemExit('announcementSection replacement failed')
dash=new_dash

bind_anchor="  root.querySelector('[data-dash-quick-note]')?.addEventListener('click',()=>window.ShellUI?.openQuickNote?.())\n"
if bind_anchor not in dash:
    raise SystemExit('bindPresentation anchor missing')
announcement_bind="  root.querySelectorAll('[data-dash-announcement-read]').forEach(box=>{box.addEventListener('click',e=>e.stopPropagation());box.addEventListener('change',async e=>{e.preventDefault();e.stopPropagation();if(!box.checked)return;box.disabled=true;try{await window.DuyurularService?.okunduIsaretle?.(box.dataset.dashAnnouncementRead);window.toast?.('Duyuru okundu olarak işaretlendi.');requestAnimationFrame(render)}catch(err){box.checked=false;window.toast?.(err?.message||'Duyuru güncellenemedi.')}finally{box.disabled=false}})});\n"
dash=dash.replace(bind_anchor,announcement_bind+bind_anchor,1)

dash_path.write_text(dash,encoding='utf-8')

marker='/* LEGACY DASHBOARD ANNOUNCEMENT — CENTRAL THEME */'
if marker not in css:
    css += r'''

/* LEGACY DASHBOARD ANNOUNCEMENT — CENTRAL THEME */
.ka-home .kh-dynamic{display:flex;flex-direction:column;gap:8px}.ka-home .kh-dynamic:empty{display:none}
.ka-home .kh-announcement{position:relative;overflow:hidden;border:1px solid var(--ka-border);border-radius:22px;background:linear-gradient(135deg,color-mix(in srgb,var(--ka-primary-soft) 62%,var(--ka-card-bg)) 0%,var(--ka-card-bg) 48%,color-mix(in srgb,var(--ka-primary-soft) 34%,var(--ka-card-bg)) 100%);box-shadow:var(--ka-shadow-sm);color:var(--ka-text)}
.ka-home .kh-announcement-accent{height:4px;background:linear-gradient(90deg,var(--ka-primary),var(--ka-info),var(--ka-primary))}
.ka-home .kh-announcement-head{display:grid;grid-template-columns:46px minmax(0,1fr) auto;gap:10px;align-items:start;padding:13px 13px 8px}
.ka-home .kh-announcement-icon{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;background:var(--ka-primary-soft);color:var(--ka-primary)}
.ka-home .kh-announcement-icon svg{width:24px;height:24px}.ka-home .kh-announcement-title-wrap{min-width:0}
.ka-home .kh-announcement-kicker{font-size:9px;font-weight:950;letter-spacing:.11em;color:var(--ka-primary);margin-bottom:3px}
.ka-home .kh-announcement h3{margin:0;color:var(--ka-text);font-size:14px;line-height:1.3;font-weight:900}
.ka-home .kh-announcement-meta{margin-top:4px;color:var(--ka-text-muted);font-size:9.5px;font-weight:650}
.ka-home .kh-announcement-status{align-self:start;padding:5px 7px;border-radius:var(--ka-radius-pill);font-size:8.5px;font-weight:950;white-space:nowrap}
.ka-home .kh-announcement-status.new{background:var(--ka-primary-soft);color:var(--ka-primary)}.ka-home .kh-announcement-status.read{background:color-mix(in srgb,var(--ka-success) 14%,transparent);color:var(--ka-success)}
.ka-home .kh-announcement-body{display:block;width:100%;border:0;background:transparent;color:var(--ka-text);padding:5px 13px 12px;text-align:left;font:inherit;font-size:11.5px;line-height:1.5;cursor:pointer}
.ka-home .kh-announcement-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 13px 12px;border-top:1px solid var(--ka-border)}
.ka-home .kh-read-check{display:flex;align-items:center;gap:8px;cursor:pointer;font-size:10.5px;font-weight:850;color:var(--ka-text)}.ka-home .kh-read-check input{position:absolute;opacity:0;pointer-events:none;width:1px;height:1px}
.ka-home .kh-read-box{width:23px;height:23px;border-radius:8px;display:grid;place-items:center;border:1.5px solid var(--ka-border-strong);background:var(--ka-card-bg);color:transparent}.ka-home .kh-read-check.checked .kh-read-box,.ka-home .kh-read-check input:checked+.kh-read-box{border-color:var(--ka-success);background:var(--ka-success);color:var(--ka-text-inverse)}
.ka-home .kh-read-count{border:1px solid var(--ka-border);background:var(--ka-primary-soft);color:var(--ka-primary);border-radius:12px;padding:7px 9px;font:inherit;font-size:9.5px;font-weight:850;cursor:pointer}.ka-home .kh-announcement.is-read{border-color:var(--ka-border);background:linear-gradient(135deg,var(--ka-card-bg),color-mix(in srgb,var(--ka-success) 10%,var(--ka-card-bg)))}
@media(max-width:380px){.ka-home .kh-announcement-head{grid-template-columns:42px minmax(0,1fr)}.ka-home .kh-announcement-icon{width:42px;height:42px}.ka-home .kh-announcement-status{grid-column:2;justify-self:start;margin-top:2px}.ka-home .kh-announcement-footer{align-items:flex-start;flex-direction:column}}
'''
css_path.write_text(css,encoding='utf-8')

if 'LEGACY ANNOUNCEMENT CARD CHECKPOINT' not in test:
    test += r'''

// LEGACY ANNOUNCEMENT CARD CHECKPOINT
assert(dash.includes('class="kh-announcement ${ok?\'is-read\':\'is-unread\'}"'),'Dashboard duyurusu referans kh-announcement DOM sözleşmesini kullanmalı.');
assert(dash.includes("DuyurularService?.benOkudumMu?.(d)")&&dash.includes('data-dash-announcement-read'),'Duyuru kartı mevcut local-first okundu servisini kullanmalı.');
assert(dash.includes("DuyurularService?.okunduIsaretle?.(box.dataset.dashAnnouncementRead)"),'Dashboard Okudum işlemi mevcut DuyurularService üzerinden yazmalı.');
assert(css.includes('LEGACY DASHBOARD ANNOUNCEMENT — CENTRAL THEME')&&css.includes('.ka-home .kh-announcement-head')&&css.includes('.ka-home .kh-read-check'),'Legacy duyuru geometrisi merkezi design-system içinde kalmalı.');
assert(css.includes('background:var(--ka-primary-soft)')&&css.includes('color:var(--ka-primary)')&&css.includes('border:1px solid var(--ka-border)'),'Legacy duyuru renkleri merkezi --ka-* tokenlarından gelmeli.');
assert(!dash.includes('ka-home-announcement__mark'),'Eski duyuru geri taşındığında yeni taklit duyuru satırı aktif renderer içinde kalmamalı.');
'''
test_path.write_text(test,encoding='utf-8')

if "oy-cache-v712" not in sw:
    raise SystemExit('expected service worker cache v712 missing')
sw=sw.replace("oy-cache-v712","oy-cache-v713",1)
sw_path.write_text(sw,encoding='utf-8')

print('legacy announcement migration applied')

from pathlib import Path

# Dashboard: ticker + weekly duty reference layout
p=Path('js/modules/dashboard.js')
s=p.read_text(encoding='utf-8')
old_news="function newsSection(){const list=arr('haberler').filter(x=>x.aktif!==false).sort((a,b)=>String(b.tarih||b.eklenmeTarihi||'').localeCompare(String(a.tarih||a.eklenmeTarihi||''))).slice(0,5);if(!list.length)return'';return section('Kayan Haberler','📰','news',`<div class=\"ka-home-news-strip\">${list.map(x=>`<article><strong>${esc(x.baslik||'Haber')}</strong><span>${esc(String(x.ozet||x.aciklama||x.icerik||'').replace(/<[^>]*>/g,'').slice(0,100))}</span></article>`).join('')}</div>`)}"
new_news="function newsSection(){const list=arr('haberler').filter(x=>x.aktif!==false).sort((a,b)=>String(b.tarih||b.eklenmeTarihi||'').localeCompare(String(a.tarih||a.eklenmeTarihi||''))).slice(0,8);if(!list.length)return'';const items=list.map(x=>esc(x.baslik||'Haber')).join(' • ');return `<section class=\"ka-home-news-ticker\" data-home-section=\"news\"><span class=\"ka-home-news-label\">▤ <b>HABERLER</b></span><div class=\"ka-home-news-viewport\"><div class=\"ka-home-news-track\"><span>${items}</span><span aria-hidden=\"true\">${items}</span></div></div></section>`}"
if old_news not in s: raise SystemExit('newsSection guard not found')
s=s.replace(old_news,new_news)
old_week="function weekDutySection(){const[a,b]=weekRange(),list=arr('nobetAtamalari').filter(x=>{const d=new Date(String(x.tarih||'').slice(0,10)+'T00:00:00');return!Number.isNaN(d.getTime())&&d>=a&&d<=b}).sort((x,y)=>String(x.tarih).localeCompare(String(y.tarih)));if(!list.length)return'';return section('Haftalık Nöbet Programı','🗓️','week-duty',`<div class=\"ka-home-week-duty\">${list.slice(0,12).map(x=>`<article><time>${esc(new Date(x.tarih+'T00:00:00').toLocaleDateString('tr-TR',{weekday:'short',day:'numeric'}))}</time><strong>${esc(teacherLabel(x))}</strong><small>${esc(x.yerAdi||arr('nobetYerleri').find(p=>p.id===x.yerId)?.ad||'')}</small></article>`).join('')}</div>`)}"
new_week="function dutyPlaceVisual(name){const n=normalizeDay(name);if(n.includes('bahce'))return{icon:'🌳',cls:'is-yard'};if(n.includes('bina')||n.includes('okul'))return{icon:'🏫',cls:'is-building'};return{icon:'🛡️',cls:''}}\nfunction weekDutySection(){const[a,b]=weekRange(),places=arr('nobetYerleri'),list=arr('nobetAtamalari').filter(x=>{const d=new Date(String(x.tarih||'').slice(0,10)+'T00:00:00');return!Number.isNaN(d.getTime())&&d>=a&&d<=b}).sort((x,y)=>String(x.tarih).localeCompare(String(y.tarih)));if(!list.length)return'';const today=isoToday(),days=['Pazartesi','Salı','Çarşamba','Perşembe','Cuma'];const rows=days.map(day=>{const entries=list.filter(x=>sameDay(new Date(String(x.tarih).slice(0,10)+'T00:00:00').toLocaleDateString('tr-TR',{weekday:'long'}),day));if(!entries.length)return'';const isToday=entries.some(x=>String(x.tarih||'').slice(0,10)===today);return `<section class=\"ka-week-duty-day${isToday?' is-today':''}\"><div class=\"ka-week-duty-dayhead\"><strong>${esc(day.toLocaleUpperCase('tr'))}</strong>${isToday?'<span>BUGÜN</span>':''}</div><div class=\"ka-week-duty-rows\">${entries.map(x=>{const place=x.yerAdi||places.find(p=>p.id===x.yerId)?.ad||'Nöbet yeri',v=dutyPlaceVisual(place);return `<article><strong>${esc(teacherLabel(x))}</strong><span class=\"ka-week-duty-place ${v.cls}\"><i>${v.icon}</i><b>${esc(place.toLocaleUpperCase('tr'))}</b></span></article>`}).join('')}</div></section>`}).join('');return `<section class=\"ka-home-section ka-week-duty-reference\" data-home-section=\"week-duty\"><div class=\"ka-home-section__head\"><div><span class=\"ka-home-section__icon\">🗓️</span><h3>Haftanın Nöbet Programı</h3></div>${routeButton('Tümü','management','duty','Nöbet Programı','›')}</div><div class=\"ka-home-section__body\">${rows}</div></section>`}"
if old_week not in s: raise SystemExit('weekDutySection guard not found')
s=s.replace(old_week,new_week)
p.write_text(s,encoding='utf-8')

# Shell profile popover reference layout
p=Path('js/core/shell-ui.js')
s=p.read_text(encoding='utf-8')
old="function openProfilePopover(){const anchor=$('[data-ka-header-profile]');if(!anchor)return;const {name,username,photo}=profileInfo(),p=popoverBase(anchor,360),dark=currentTheme()==='dark';p.innerHTML=`<div style=\"padding:10px 10px 12px;border-bottom:1px solid var(--ka-border);display:flex;gap:11px;align-items:center\"><span class=\"ka-avatar\" style=\"width:46px;height:46px;flex-basis:46px\">${photo?`<img src=\"${esc(photo)}\" alt=\"\">`:SVG.profile}</span><div style=\"min-width:0\"><strong style=\"display:block;font-size:16px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\">${esc(name)}</strong><small class=\"ka-muted\">${esc(username)}</small></div></div><div class=\"ka-stack\" style=\"gap:4px;padding-top:8px\"><button class=\"ka-btn ka-btn--ghost\" style=\"justify-content:flex-start\" data-hp-profile>${SVG.profile}<span>Profilim</span></button><button class=\"ka-btn ka-btn--ghost\" style=\"justify-content:flex-start\" data-hp-settings>${SVG.settings}<span>Ayarlar</span></button><button class=\"ka-btn ka-btn--ghost\" style=\"justify-content:flex-start\" data-hp-theme>${dark?SVG.sun:SVG.moon}<span>${dark?'Açık Temaya Geç':'Koyu Temaya Geç'}</span></button><div style=\"height:1px;background:var(--ka-border);margin:4px 0\"></div><button class=\"ka-btn ka-btn--ghost\" style=\"justify-content:flex-start;color:var(--ka-danger)\" data-hp-logout>${SVG.logout}<span>Çıkış Yap</span></button></div>`;p.querySelector('[data-hp-profile]')?.addEventListener('click',renderProfile);p.querySelector('[data-hp-settings]')?.addEventListener('click',()=>routeModule('settings',{bottom:'menu'}));p.querySelector('[data-hp-theme]')?.addEventListener('click',async()=>{await toggleTheme();openProfilePopover()});p.querySelector('[data-hp-logout]')?.addEventListener('click',()=>{if(confirm('Hesabınızdan çıkış yapmak istediğinize emin misiniz?'))global.cikisYap?.()})}"
new="function openProfilePopover(){const anchor=$('[data-ka-header-profile]');if(!anchor)return;const {name,username}=profileInfo(),p=popoverBase(anchor,430),dark=currentTheme()==='dark';p.classList.add('ka-profile-popover');p.innerHTML=`<div class=\"ka-profile-popover__identity\"><strong>${esc(name)}</strong><small>${esc(username)}</small></div><div class=\"ka-profile-popover__menu\"><button type=\"button\" data-hp-profile>${SVG.profile}<span>Profilim</span></button><button type=\"button\" data-hp-settings>${SVG.settings}<span>Ayarlar</span></button><button type=\"button\" data-hp-theme>${dark?SVG.sun:SVG.moon}<span>Temayı Değiştir</span></button></div><div class=\"ka-profile-popover__logout\"><button type=\"button\" data-hp-logout>${SVG.logout}<span>Çıkış Yap</span></button></div>`;p.querySelector('[data-hp-profile]')?.addEventListener('click',renderProfile);p.querySelector('[data-hp-settings]')?.addEventListener('click',()=>routeModule('settings',{bottom:'menu'}));p.querySelector('[data-hp-theme]')?.addEventListener('click',async()=>{await toggleTheme();openProfilePopover()});p.querySelector('[data-hp-logout]')?.addEventListener('click',()=>{if(confirm('Hesabınızdan çıkış yapmak istediğinize emin misiniz?'))global.cikisYap?.()})}"
if old not in s: raise SystemExit('profile popover guard not found')
s=s.replace(old,new)
p.write_text(s,encoding='utf-8')

# Central design system additions
p=Path('css/design-system.css')
c=p.read_text(encoding='utf-8')
marker='/* ===== DASHBOARD REFERENCE SURFACES ===== */'
if marker not in c:
 c += r'''

/* ===== DASHBOARD REFERENCE SURFACES ===== */
.ka-home-news-ticker{width:100%;min-height:58px;display:flex;align-items:center;border:1px solid var(--ka-border);border-radius:20px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm);overflow:hidden;cursor:pointer}
.ka-home-news-label{position:relative;z-index:2;align-self:stretch;flex:0 0 auto;min-width:150px;padding:0 22px;display:flex;align-items:center;gap:10px;border-radius:18px;background:linear-gradient(135deg,#df3f79,#a83de8);color:#fff;font-size:13px;font-weight:850;letter-spacing:.04em;box-shadow:7px 0 14px rgba(112,44,148,.14)}
.ka-home-news-viewport{min-width:0;flex:1;overflow:hidden;mask-image:linear-gradient(90deg,transparent 0,#000 4%,#000 96%,transparent 100%)}
.ka-home-news-track{display:flex;width:max-content;align-items:center;animation:ka-news-ticker 30s linear infinite;will-change:transform}
.ka-home-news-track>span{display:block;padding-left:28px;padding-right:64px;white-space:nowrap;font-size:14px;font-weight:750;color:var(--ka-text)}
.ka-home-news-ticker:active .ka-home-news-track,.ka-home-news-ticker:hover .ka-home-news-track{animation-play-state:paused}
@keyframes ka-news-ticker{from{transform:translateX(0)}to{transform:translateX(-50%)}}
@media(prefers-reduced-motion:reduce){.ka-home-news-track{animation:none;transform:none}}

.ka-week-duty-reference>.ka-home-section__head{display:flex;align-items:center;justify-content:space-between;gap:10px}
.ka-week-duty-reference>.ka-home-section__head .ka-home-link{min-height:40px;padding:7px 15px;border:1px solid var(--ka-border);border-radius:14px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm);font-size:12px}
.ka-week-duty-reference>.ka-home-section__body{padding:0;overflow:hidden}
.ka-week-duty-day{padding:18px 20px 16px;border-bottom:1px solid var(--ka-border);background:var(--ka-card-bg)}
.ka-week-duty-day:last-child{border-bottom:0}.ka-week-duty-day.is-today{background:var(--ka-primary-soft)}
.ka-week-duty-dayhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:13px}.ka-week-duty-dayhead>strong{font-size:13px;letter-spacing:.035em;color:var(--ka-text)}
.ka-week-duty-dayhead>span{padding:6px 12px;border:1px solid color-mix(in srgb,var(--ka-primary) 28%,var(--ka-border));border-radius:999px;color:var(--ka-primary);background:color-mix(in srgb,var(--ka-primary) 5%,var(--ka-card-bg));font-size:10px;font-weight:850}
.ka-week-duty-rows{display:flex;flex-direction:column;gap:10px}.ka-week-duty-rows article{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;align-items:center;min-height:42px}.ka-week-duty-rows article>strong{font-size:14px;font-weight:520;color:var(--ka-text)}
.ka-week-duty-place{display:flex;align-items:center;gap:8px;color:var(--ka-text-muted)}.ka-week-duty-place i{width:35px;height:35px;border-radius:11px;display:grid;place-items:center;background:color-mix(in srgb,var(--ka-success) 9%,var(--ka-card-bg));border:1px solid color-mix(in srgb,var(--ka-success) 20%,var(--ka-border));font-style:normal;font-size:19px}.ka-week-duty-place.is-building i{background:color-mix(in srgb,var(--ka-module-transport-1) 8%,var(--ka-card-bg));border-color:color-mix(in srgb,var(--ka-module-transport-1) 20%,var(--ka-border))}.ka-week-duty-place b{min-width:92px;font-size:11px;font-weight:800;color:var(--ka-text-muted)}

.ka-profile-popover{padding:0!important;border-radius:20px!important;overflow:hidden!important;background:var(--ka-card-raised-bg)!important}
.ka-profile-popover__identity{padding:24px 30px 17px;border-bottom:1px solid var(--ka-border)}.ka-profile-popover__identity strong{display:block;font-size:18px;line-height:1.2;color:var(--ka-text)}.ka-profile-popover__identity small{display:block;margin-top:6px;color:var(--ka-text-muted);font-size:13px}
.ka-profile-popover__menu{padding:16px 18px 13px;display:flex;flex-direction:column;gap:3px}.ka-profile-popover__menu button,.ka-profile-popover__logout button{appearance:none;width:100%;min-height:54px;border:0;border-radius:13px;background:transparent;color:var(--ka-text);display:flex;align-items:center;gap:16px;padding:8px 13px;text-align:left;font-size:16px;font-weight:650;cursor:pointer}.ka-profile-popover__menu button:hover,.ka-profile-popover__menu button:active{background:var(--ka-muted-bg)}.ka-profile-popover__menu svg,.ka-profile-popover__logout svg{width:26px;height:26px;flex:0 0 26px}
.ka-profile-popover__logout{padding:10px 18px 17px;border-top:1px solid var(--ka-border)}.ka-profile-popover__logout button{color:var(--ka-danger)}
@media(max-width:430px){.ka-home-news-ticker{min-height:54px;border-radius:18px}.ka-home-news-label{min-width:132px;padding-inline:17px;font-size:11px}.ka-home-news-track>span{font-size:12px}.ka-week-duty-day{padding:16px 17px}.ka-week-duty-rows article>strong{font-size:13px}.ka-week-duty-place b{min-width:82px;font-size:10px}.ka-profile-popover__identity{padding:21px 26px 15px}.ka-profile-popover__menu,.ka-profile-popover__logout{padding-inline:14px}}
'''
p.write_text(c,encoding='utf-8')

# Regression contracts
p=Path('tests/dashboard-card-routes-smoke.test.js')
t=p.read_text(encoding='utf-8')
append="""
assert(dash.includes('ka-home-news-ticker')&&dash.includes('ka-home-news-track')&&dash.includes('HABERLER'),'Haberler referanstaki tek satır kayan altyazı bandı olmalı.');
assert(dash.includes('ka-week-duty-day')&&dash.includes("['Pazartesi','Salı','Çarşamba','Perşembe','Cuma']")&&dash.includes("isToday?' is-today':''"),'Haftanın nöbet programı gün blokları ve Bugün vurgusunu kullanmalı.');
assert(dash.includes("dutyPlaceVisual")&&dash.includes("icon:'🌳'")&&dash.includes("icon:'🏫'"),'Nöbet programı Bahçe ve Okul Binası yerlerini referans ikonlarıyla göstermeli.');
assert(css.includes('DASHBOARD REFERENCE SURFACES')&&css.includes('.ka-home-news-ticker')&&css.includes('.ka-week-duty-day'),'Referans dashboard yüzeyleri merkezi design-system içinde kalmalı.');
assert(shell.includes("p.classList.add('ka-profile-popover')")&&shell.includes('ka-profile-popover__identity')&&shell.includes('Temayı Değiştir'),'Profil popup referanstaki kimlik ve üç işlem düzenini kullanmalı.');
assert(css.includes('.ka-profile-popover__menu')&&css.includes('.ka-profile-popover__logout'),'Profil popup görünümü merkezi design-system içinde kalmalı.');
// Checkpoint: weekly duty, profile popover and scrolling news match the approved reference.
"""
if 'weekly duty, profile popover and scrolling news match the approved reference' not in t:
 t += '\n'+append
p.write_text(t,encoding='utf-8')
print('reference surfaces migration applied')

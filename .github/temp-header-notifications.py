from pathlib import Path
import re


def replace_once(path, old, new):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{path}: anchor count {count} != 1')
    p.write_text(text.replace(old, new, 1), encoding='utf-8')


def sub_once(path, pattern, replacement):
    p = Path(path)
    text = p.read_text(encoding='utf-8')
    text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise SystemExit(f'{path}: regex anchor count {count} != 1')
    p.write_text(text, encoding='utf-8')


# SchoolLiveStatus must not own the header notification click. ShellUI is the canonical owner.
replace_once(
    'js/modules/school-live-status.js',
    "let timer=null,weatherBusy=false,headerBound=false,lastTick='';",
    "let timer=null,weatherBusy=false,lastTick='';"
)
sub_once(
    'js/modules/school-live-status.js',
    r"function syncHeaderIdentity\(\)\{.*?\}\nfunction weatherInfo",
    "function syncHeaderIdentity(){const btn=document.querySelector('[data-ka-header-profile]');if(btn){const photo=profilePhoto(),name=displayName(),initials=name.split(/\\s+/).slice(0,2).map(x=>x[0]||'').join('').toLocaleUpperCase('tr-TR');btn.innerHTML=photo?`<img src=\"${esc(photo)}\" alt=\"${esc(name)}\">`:esc(initials||'K')}}\nfunction weatherInfo"
)

# Header notifications mirror the upcoming activity sources used on the home page and carry their own route.
notification_rows = r'''function notificationRows(){
  const now=new Date(),today=new Date(now.getFullYear(),now.getMonth(),now.getDate()),limit=new Date(today.getTime()+14*86400000),rows=[],u=user(),me=u.uid||'',tid=u.bagliOgretmenId||u.ogretmenId||'',teacher=isTeacherUser(),within=d=>!!d&&d>=today&&d<=limit;
  const pushUpcoming=(x,{type,icon,module,page='',routeTitle,date,time=''})=>{if(!within(date)||!pageAllowed(module,page))return;rows.push({kind:'upcoming',type,icon,title:x.baslik||x.ad||x.ders||x.sinavAdi||x.konu||x.aciklama||type,date,time,id:x.id,module,page,routeTitle,count:1})};
  for(const x of arr('hatirlaticilar')){if(x?.tamamlandi===true)continue;pushUpcoming(x,{type:'Hatırlatıcı',icon:'⏰',module:'communication',page:'calendar',routeTitle:'Takvim',date:dateOf(x),time:x.saat||''})}
  for(const x of arr('sinavlar')){if(teacher&&tid&&x?.ogretmenId&&x.ogretmenId!==tid)continue;pushUpcoming(x,{type:'Yazılı Sınav',icon:'📝',module:'academic',page:'written',routeTitle:'Yazılı Sınavlar',date:dateOf(x),time:x.saat||''})}
  for(const x of arr('denemeSinavlari')){if(teacher&&tid&&x?.ogretmenId&&x.ogretmenId!==tid)continue;pushUpcoming(x,{type:'Deneme Sınavı',icon:'🧪',module:'academic',page:'trial',routeTitle:'Deneme Sınavları',date:dateOf(x),time:x.saat||''})}
  for(const x of arr('gorevler')){if(x?.tamamlandi===true||['tamamlandi','tamamlandı'].includes(String(x?.durum||'').toLocaleLowerCase('tr-TR')))continue;if(teacher&&tid&&Array.isArray(x?.sorumluOgretmenIdler)&&x.sorumluOgretmenIdler.length&&!x.sorumluOgretmenIdler.includes(tid))continue;const direct=pageAllowed('management','tasks');pushUpcoming(x,{type:'Görev',icon:'✓',module:direct?'management':'communication',page:direct?'tasks':'calendar',routeTitle:direct?'Aylık İşler':'Takvim',date:dateOf(x)})}
  if(me)for(const k of arr('konusmalar')){const unread=Number(k?.okunmayanlar?.[me]||0);if(unread<1)continue;const diger=Object.entries(k.katilimciAdlari||{}).filter(([id])=>id!==me).map(([,ad])=>ad).filter(Boolean).join(', '),title=k.grupMu?(k.grupAdi||'Grup mesajı'):(diger||'Yeni mesaj'),d=dateOf(k.sonMesaj||k)||now;rows.push({kind:'message',type:'Mesaj',icon:'💬',title,date:d,time:'',id:k.id,module:'communication',page:'messages',routeTitle:'Mesajlaşma',count:unread,meta:`${unread} okunmamış mesaj`})}
  if(me)for(const d of arr('duyurular')){if(d?.arsivlendi===true||d?.aktif===false||d?.okuyanlar?.[me])continue;const dt=dateOf(d)||now;rows.push({kind:'announcement',type:'Duyuru',icon:'📣',title:d.baslik||'Yeni duyuru',date:dt,time:'',id:d.id,module:'communication',page:'announcements',routeTitle:'Duyurular',count:1,meta:'Okunmamış duyuru'})}
  const priority=r=>r.kind==='upcoming'?0:r.kind==='message'?1:2;
  return rows.sort((a,b)=>priority(a)-priority(b)||(a.kind==='upcoming'?a.date-b.date:b.date-a.date)).slice(0,30)
}
function formatNoticeDate'''
sub_once(
    'js/core/shell-ui.js',
    r"function notificationRows\(\)\{.*?\}\nfunction formatNoticeDate",
    notification_rows
)
replace_once(
    'js/core/shell-ui.js',
    "function updateNotificationBadge(){const rows=notificationRows(),count=rows.reduce((n,r)=>n+Math.max(1,Number(r.count)||1),0),bell=$('[data-ka-header-notification]'),b=$('[data-ka-notification-count]');if(b){b.textContent=String(Math.min(count,99));b.hidden=count<1}if(bell)bell.hidden=count<1}",
    "function updateNotificationBadge(){const rows=notificationRows(),count=rows.reduce((n,r)=>n+Math.max(1,Number(r.count)||1),0),bell=$('[data-ka-header-notification]'),b=$('[data-ka-notification-count]');if(b){b.textContent=count>99?'99+':String(count);b.hidden=count<1}if(bell)bell.hidden=false}"
)
open_notifications = r'''function openNotifications(){const anchor=$('[data-ka-header-notification]');if(!anchor)return;const p=popoverBase(anchor,400),rows=notificationRows(),count=rows.reduce((n,r)=>n+Math.max(1,Number(r.count)||1),0),upcomingCount=rows.filter(r=>r.kind==='upcoming').length;p.classList.add('ka-notification-popover');p.innerHTML=`<div class="ka-notification-popover__head"><span><strong>Bildirimler</strong><small>${upcomingCount?`${upcomingCount} yaklaşan etkinlik`:'Yaklaşan etkinlik yok'}</small></span>${count?`<span class="ka-badge">${count>99?'99+':count}</span>`:''}</div><div class="ka-notification-popover__list">${rows.length?rows.map((r,i)=>`<button type="button" class="ka-btn ka-btn--ghost ka-notification-row" data-notice-index="${i}"><span class="ka-notification-row__icon">${r.icon}</span><span class="ka-notification-row__copy"><strong>${esc(r.title)}</strong><small>${esc(r.meta||`${r.type} · ${formatNoticeDate(r.date,r.time)}`)}</small></span>${SVG.chevron}</button>`).join(''):'<div class="ka-empty">Yeni bildirim veya yaklaşan etkinlik bulunmuyor.</div>'}</div>`;$$('[data-notice-index]',p).forEach(b=>b.addEventListener('click',()=>{const r=rows[Number(b.dataset.noticeIndex)];if(!r)return;closeHeaderPopover();routeModule(r.module,{bottom:'menu',page:r.page||'',title:r.routeTitle||r.type})}))}
function norm'''
sub_once(
    'js/core/shell-ui.js',
    r"function openNotifications\(\)\{.*?\}\nfunction norm",
    open_notifications
)
replace_once(
    'js/core/shell-ui.js',
    "for(const type of ['hatirlaticilar','konusmalar','duyurular','ogretmenler'])global.AppStore?.subscribe?.('data.'+type,hydrateHeader)",
    "for(const type of ['hatirlaticilar','sinavlar','denemeSinavlari','gorevler','konusmalar','duyurular','ogretmenler'])global.AppStore?.subscribe?.('data.'+type,hydrateHeader)"
)

# Keep badge and both popovers in the central design system; no new CSS layer.
replace_once(
    'css/design-system.css',
    ".ka-header-actions{display:flex;align-items:center;gap:1px}.ka-weather-chip",
    ".ka-header-actions{display:flex;align-items:center;gap:1px}.ka-header-notification{position:relative;overflow:visible}.ka-header-notification [data-ka-notification-count]{position:absolute;top:0;right:0;transform:translate(28%,-22%);min-width:18px;height:18px;padding:0 4px;border:2px solid var(--ka-header-bg);border-radius:999px;background:var(--ka-danger);color:#fff;display:grid;place-items:center;font-size:9px;line-height:1;font-weight:900;pointer-events:none}.ka-weather-chip"
)
# Add reusable notification popover geometry next to the existing profile surface rules.
replace_once(
    'css/design-system.css',
    ".ka-profile-page{display:flex;flex-direction:column;gap:18px;padding:2px 1px 18px}",
    ".ka-notification-popover{padding:0!important;overflow:hidden!important}.ka-notification-popover__head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:12px 14px;border-bottom:1px solid var(--ka-border)}.ka-notification-popover__head>span:first-child{display:flex;flex-direction:column;gap:2px}.ka-notification-popover__head strong{font-size:16px}.ka-notification-popover__head small{color:var(--ka-text-muted);font-size:10px}.ka-notification-popover__list{display:flex;flex-direction:column}.ka-notification-row{width:100%;min-height:66px;border-radius:0!important;justify-content:flex-start!important;text-align:left!important;border-bottom:1px solid var(--ka-border)!important;padding:9px 10px!important}.ka-notification-row:last-child{border-bottom:0!important}.ka-notification-row__icon{width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:var(--ka-primary-soft);display:grid;place-items:center;font-size:18px}.ka-notification-row__copy{min-width:0;flex:1}.ka-notification-row__copy strong{display:block;white-space:normal;font-size:12px}.ka-notification-row__copy small{display:block;margin-top:2px;color:var(--ka-text-muted);font-size:9.5px;white-space:normal}.ka-notification-row>svg{width:17px;height:17px;flex:0 0 17px;color:var(--ka-text-muted)}.ka-profile-page{display:flex;flex-direction:column;gap:18px;padding:2px 1px 18px}"
)

# Strengthen the existing responsive shell contract around the canonical header behavior.
p = Path('tests/web-mobile-engine-separation.test.js')
t = p.read_text(encoding='utf-8')
t = t.replace("const sw=fs.readFileSync('service-worker.js','utf8');", "const sw=fs.readFileSync('service-worker.js','utf8');\nconst shellUi=fs.readFileSync('js/core/shell-ui.js','utf8');\nconst live=fs.readFileSync('js/modules/school-live-status.js','utf8');", 1)
anchor = "assert(design.includes('@media(max-width:390px)')&&design.includes('.ka-school-logo{width:37px;height:37px'),'Dar telefon header ayarı aynı merkezi design system içinde bulunmalı.');"
addition = """\nassert(shell.includes('data-ka-notification-count')&&design.includes('.ka-header-notification{position:relative;overflow:visible}')&&design.includes('[data-ka-notification-count]{position:absolute;top:0;right:0'),'Bildirim rozeti zilin sağ üst köşesinde merkezi design system ile konumlanmalı.');\nassert(shellUi.includes(\"arr('sinavlar')\")&&shellUi.includes(\"arr('denemeSinavlari')\")&&shellUi.includes(\"arr('gorevler')\")&&shellUi.includes(\"arr('hatirlaticilar')\"),'Header bildirim merkezi ana sayfadaki yaklaşan etkinlik kaynaklarını okumalı.');\nassert(shellUi.includes(\"module:'academic',page:'written'\")&&shellUi.includes(\"module:'academic',page:'trial'\")&&shellUi.includes(\"module:direct?'management':'communication'\")&&shellUi.includes('routeModule(r.module'),'Her bildirim kendi ilgili modül/sayfa hedefine gitmeli.');\nassert(shellUi.includes('function openProfilePopover()')&&shellUi.includes('p=popoverBase(anchor'),'Profil fotoğrafı bildirim penceresiyle aynı popover altyapısını kullanmalı.');\nassert(!live.includes(\"bell.addEventListener('click'\")&&!live.includes(\"routeModule?.('communication',{bottom:'menu'})\"),'Canlı durum motoru header zilini ikinci kez bağlayıp İletişim/Duyurular sayfasına yönlendirmemeli.');"""
if t.count(anchor) != 1:
    raise SystemExit('web-mobile shell assertion anchor count != 1')
t = t.replace(anchor, anchor + addition, 1)
p.write_text(t, encoding='utf-8')

print('header notification patch applied')

from pathlib import Path

LIVE=Path('js/modules/school-live-status.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

live=LIVE.read_text()
test=TEST.read_text()

old="function decorate(){const hero=stabilizeHero()||document.querySelector('.ka-home-hero');syncHeaderIdentity();if(!hero)return false;lastHero=hero;const identity=hero.querySelector('.ka-home-hero__top>div'),identityHtml=heroIdentityHtml();if(identity&&identity.innerHTML!==identityHtml)identity.innerHTML=identityHtml;let host=hero.querySelector('[data-ka-live-host]');if(!host){host=document.createElement('div');host.dataset.kaLiveHost='1';const old=hero.querySelector('.ka-home-lesson-focus,.ka-home-hero__quiet');if(old)old.replaceWith(host);else hero.appendChild(host)}const html=liveHtml();if(host.innerHTML!==html)host.innerHTML=html;const weather=host.querySelector('[data-ka-weather-open]');if(weather&&!weather.dataset.bound){weather.dataset.bound='1';weather.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();openWeather()})}return true}"
new="function decorate(){syncHeaderIdentity();updateHeader();return true}"
if old not in live:
    raise SystemExit('legacy live decorate contract not found')
live=live.replace(old,new,1)

old="function tick(){const now=new Date(),key=`${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;if(key===lastTick)return;lastTick=key;const current=status(now);try{global.dispatchEvent(new CustomEvent('koruk:school-live-tick',{detail:current}))}catch(_){}if(document.querySelector('.ka-home-hero'))decorate()}"
new="function tick(){const now=new Date(),key=`${now.getHours()}:${now.getMinutes()}:${now.getSeconds()}`;if(key===lastTick)return;lastTick=key;const current=status(now);try{global.dispatchEvent(new CustomEvent('koruk:school-live-tick',{detail:current}))}catch(_){}}"
if old not in live:
    raise SystemExit('legacy live tick contract not found')
live=live.replace(old,new,1)

old="function start(){if(timer)return;syncHeaderIdentity();hydrateLessonHours().then(decorate);initWeather();tick();timer=setInterval(tick,1000);const root=document.getElementById('v2ModuleRoot');if(root&&!observer){observer=new MutationObserver(()=>{const fresh=document.querySelector('.ka-home-hero');if(!fresh){lastHero=null;return}if(fresh!==lastHero||fresh!==stableHero)decorate()});observer.observe(root,{childList:true,subtree:true})}global.AppStore?.subscribe?.('data.dersSaatleri',()=>requestAnimationFrame(decorate));global.AppStore?.subscribe?.('data.dersProgrami',()=>requestAnimationFrame(decorate));global.AppStore?.subscribe?.('data.ogretmenler',()=>requestAnimationFrame(decorate));global.AppStore?.subscribe?.('session.user',()=>requestAnimationFrame(decorate))}"
new="function start(){if(timer)return;syncHeaderIdentity();hydrateLessonHours().then(()=>{updateHeader();tick()});initWeather();tick();timer=setInterval(tick,1000);global.AppStore?.subscribe?.('data.ogretmenler',()=>requestAnimationFrame(decorate));global.AppStore?.subscribe?.('session.user',()=>requestAnimationFrame(decorate))}"
if old not in live:
    raise SystemExit('legacy live start contract not found')
live=live.replace(old,new,1)

old="function stop(){clearInterval(timer);timer=null;observer?.disconnect();observer=null;lastHero=null;stableHero=null;lastTick='';closeWeather()}"
new="function stop(){clearInterval(timer);timer=null;lastTick='';closeWeather()}"
if old not in live:
    raise SystemExit('legacy live stop contract not found')
live=live.replace(old,new,1)
LIVE.write_text(live)

marker="assert(live.includes(\"new CustomEvent('koruk:school-live-tick'\")&&dashboard.includes(\"window.addEventListener('koruk:school-live-tick',liveTickHandler)\"),'Canlı zil için tek saniyelik zaman motoru SchoolLiveStatus olmalı; dashboard yalnız tick eventini tüketmeli.');"
addition="\nassert(live.includes('function decorate(){syncHeaderIdentity();updateHeader();return true}')&&!live.includes(\"if(document.querySelector('.ka-home-hero'))decorate()\")&&!live.includes('observer=new MutationObserver'),'SchoolLiveStatus eski hero DOM motorunu çalıştırmamalı; yalnız headless durum eventi ve header güncellemesi üretmeli.');"
if addition.strip() not in test:
    if marker not in test:
        raise SystemExit('live-status smoke insertion marker not found')
    test=test.replace(marker,marker+addition,1)
TEST.write_text(test)

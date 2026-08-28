from pathlib import Path

LOADER=Path('js/app-loader.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

loader=LOADER.read_text()
test=TEST.read_text()

loader=loader.replace('   Tek başlangıç sahibi: tema + Firebase + auth + lazy modüller.\n','   Tek başlangıç sahibi: Firebase + auth + lazy modüller. Tema sahibi: ShellUI.\n',1)

old="function updateThemeChrome(){const meta=document.querySelector('meta[name=\"theme-color\"]');if(meta){const c=getComputedStyle(document.documentElement).getPropertyValue('--ka-header-bg').trim();if(c)meta.setAttribute('content',c)}document.querySelectorAll('[data-ka-theme-toggle]').forEach(btn=>{const dark=document.documentElement.getAttribute('data-theme')==='dark';btn.textContent=dark?'☀️':'🌙'})}\nfunction applyTheme(theme,{persist=true}={}){const next=theme==='dark'?'dark':'light';document.documentElement.setAttribute('data-theme',next);if(persist)try{localStorage.setItem('oyTema',next)}catch(_){}AppStore?.set?.('ui.theme',next);requestAnimationFrame(updateThemeChrome);return next}\nfunction toggleTheme(){return applyTheme(document.documentElement.getAttribute('data-theme')==='dark'?'light':'dark')}\nfunction startPlatform(){if(startupDone)return true;startupDone=true;let t='light';try{t=localStorage.getItem('oyTema')==='dark'?'dark':'light'}catch(_){}applyTheme(t,{persist:false});if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}),{once:true});try{if(typeof firebaseyiBaslat!=='function'||!firebaseyiBaslat())return false;authDinleyiciKur?.();return true}catch(e){console.error('[AppLoader]',e);return false}}"
new="function applyTheme(theme,opts={}){return window.ShellUI?.applyTheme?.(theme,opts)??theme}\nfunction toggleTheme(){return window.ShellUI?.toggleTheme?.()}\nfunction startPlatform(){if(startupDone)return true;startupDone=true;if('serviceWorker'in navigator)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(()=>{}),{once:true});try{if(typeof firebaseyiBaslat!=='function'||!firebaseyiBaslat())return false;authDinleyiciKur?.();return true}catch(e){console.error('[AppLoader]',e);return false}}"
if old not in loader:
    raise SystemExit('legacy AppLoader theme block not found')
loader=loader.replace(old,new,1)

old="function bindShell(){startPlatform();document.querySelectorAll('[data-ka-theme-toggle]').forEach(btn=>btn.addEventListener('click',toggleTheme));updateThemeChrome();applyNavigation();"
new="function bindShell(){startPlatform();applyNavigation();"
if old not in loader:
    raise SystemExit('legacy AppLoader theme binding not found')
loader=loader.replace(old,new,1)

marker="assert(!appLoaderSource.includes('setInterval(()=>{if(syncLegacySession()||++n>240)clearInterval(bridge)},50)'),'AppLoader auth oturumunu 50 ms polling ile aramamalı; auth callback görünürlük köprüsü yeterli olmalı.');"
addition="\nassert(!appLoaderSource.includes('oyTema'),'AppLoader eski oyTema deposunu kullanmamalı; tema sahibi ShellUI/ka-theme olmalı.');\nassert(appLoaderSource.includes('return window.ShellUI?.applyTheme?.(theme,opts)??theme')&&appLoaderSource.includes('return window.ShellUI?.toggleTheme?.()'),'AppLoader tema public API uyumluluğunu ShellUI canonical API üzerinden sağlamalı.');\nassert(!appLoaderSource.includes(\"querySelectorAll('[data-ka-theme-toggle]').forEach(btn=>btn.addEventListener('click',toggleTheme))\"),'AppLoader tema butonuna ikinci click listener bağlamamalı.');"
if marker not in test:
    raise SystemExit('auth polling assertion marker not found')
if addition.strip() not in test:
    test=test.replace(marker,marker+addition,1)

LOADER.write_text(loader)
TEST.write_text(test)

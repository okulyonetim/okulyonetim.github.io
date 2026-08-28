from pathlib import Path

AUTH=Path('js/auth.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

auth=AUTH.read_text()
test=TEST.read_text()

old="if(!authSessionActivated){authSessionActivated=true;IstatistikService.girisKaydet();if(typeof KonumGirisService!=='undefined')KonumGirisService.kaydet();if(typeof uygulamaBaslat==='function')uygulamaBaslat();if(typeof window._navVerileriniYukle==='function')window._navVerileriniYukle();try{if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PullToRefreshPlugin)window.Capacitor.Plugins.PullToRefreshPlugin.appHazir()}catch(e){}}"
new="if(!authSessionActivated){authSessionActivated=true;IstatistikService.girisKaydet();if(typeof KonumGirisService!=='undefined')KonumGirisService.kaydet();if(typeof window._navVerileriniYukle==='function')window._navVerileriniYukle();try{if(window.Capacitor&&window.Capacitor.Plugins&&window.Capacitor.Plugins.PullToRefreshPlugin)window.Capacitor.Plugins.PullToRefreshPlugin.appHazir()}catch(e){}}"
if old not in auth:
    raise SystemExit('legacy auth startup call contract not found')
auth=auth.replace(old,new,1)
AUTH.write_text(auth)

marker="assert(authSrc.includes('await authSunucuOturumuGetir(user,cached)'),'Firestore kullanıcı/rol kontrolü local restore sonrasında arka plan tazelemesi olarak sürmeli.');"
addition="\nassert(!authSrc.includes(\"if(typeof uygulamaBaslat==='function')uygulamaBaslat()\"),'Auth eski global dashboard başlangıcını çağırmamalı; tek başlangıç sahibi AppLoader olmalı.');"
if addition.strip() not in test:
    if marker not in test:
        raise SystemExit('auth smoke insertion marker not found')
    test=test.replace(marker,marker+addition,1)
TEST.write_text(test)

from pathlib import Path

AUTH=Path('js/auth.js')
LOADER=Path('js/app-loader.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

auth=AUTH.read_text()
loader=LOADER.read_text()
test=TEST.read_text()

old="  window.AppLoader?.syncLegacySession?.();\n"
if old not in auth:
    raise SystemExit('redundant auth syncLegacySession call not found')
auth=auth.replace(old,'',1)

old="let n=0;const bridge=setInterval(()=>{if(syncLegacySession()||++n>240)clearInterval(bridge)},50);"
if old not in loader:
    raise SystemExit('auth polling bridge not found')
loader=loader.replace(old,'',1)

marker="assert(appLoaderSource.includes(\"sessionBootstrapUid='',sessionBootstrapPromise=null\")&&appLoaderSource.includes('if(sessionBootstrapUid===user.uid&&sessionBootstrapPromise){permissionRefresh();return true}'),'Aynı UID için auth görünürlük ve başlangıç köprüsü tek local bootstrap promise kullanmalı.');"
addition="\nassert(!authSrc.includes(\"window.AppLoader?.syncLegacySession?.();\"),'Auth oturum uygulaması syncAuthVisibility sonrasında ikinci kez session bootstrap çağırmamalı.');\nassert(!appLoaderSource.includes('setInterval(()=>{if(syncLegacySession()||++n>240)clearInterval(bridge)},50)'),'AppLoader auth oturumunu 50 ms polling ile aramamalı; auth callback görünürlük köprüsü yeterli olmalı.');"
if marker not in test:
    raise SystemExit('bootstrap assertion marker not found')
if addition.strip() not in test:
    test=test.replace(marker,marker+addition,1)

AUTH.write_text(auth)
LOADER.write_text(loader)
TEST.write_text(test)

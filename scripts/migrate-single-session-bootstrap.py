from pathlib import Path

# Retry on current main after the previous bot push was superseded by a checkpoint commit.
APP=Path('js/app-loader.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

app=APP.read_text()
test=TEST.read_text()

old="let startupDone=false,initialRequested=false,accountPreparedForUid='';"
new="let startupDone=false,initialRequested=false,accountPreparedForUid='',sessionBootstrapUid='',sessionBootstrapPromise=null;"
if old not in app:
    raise SystemExit('app-loader state contract not found')
app=app.replace(old,new,1)

old="function syncLegacySession(){let user=null,role=null;try{if(typeof AKTIF_KULLANICI!=='undefined')user=AKTIF_KULLANICI}catch(_){}try{if(typeof AKTIF_ROL!=='undefined')role=AKTIF_ROL}catch(_){}if(!user?.uid)return false;window.AKTIF_KULLANICI=user;window.AKTIF_ROL=role||null;AppStore?.set?.('session.user',user);AppStore?.set?.('session.role',role||null);Promise.all([Promise.resolve(AppBootstrap?.start?.()),prepareAccountLocalData(user)]).then(()=>{permissionRefresh();ensureInitialModule()}).catch(e=>console.warn('[Local bootstrap]',e?.message||e));return true}"
new="function syncLegacySession(){let user=null,role=null;try{if(typeof AKTIF_KULLANICI!=='undefined')user=AKTIF_KULLANICI}catch(_){}try{if(typeof AKTIF_ROL!=='undefined')role=AKTIF_ROL}catch(_){}if(!user?.uid)return false;window.AKTIF_KULLANICI=user;window.AKTIF_ROL=role||null;AppStore?.set?.('session.user',user);AppStore?.set?.('session.role',role||null);if(sessionBootstrapUid===user.uid&&sessionBootstrapPromise){permissionRefresh();return true}sessionBootstrapUid=user.uid;sessionBootstrapPromise=Promise.all([Promise.resolve(AppBootstrap?.start?.()),prepareAccountLocalData(user)]).then(()=>{permissionRefresh();return ensureInitialModule()}).catch(e=>{console.warn('[Local bootstrap]',e?.message||e);sessionBootstrapPromise=null;return false});return true}"
if old not in app:
    raise SystemExit('syncLegacySession contract not found')
app=app.replace(old,new,1)
APP.write_text(app)

marker="assert(bootstrapWaitPos>=0&&initialModulePos>bootstrapWaitPos,'Local bootstrap dashboard açılışından önce tamamlanmalı.');"
addition="\nassert(appLoaderSource.includes(\"sessionBootstrapUid='',sessionBootstrapPromise=null\")&&appLoaderSource.includes('if(sessionBootstrapUid===user.uid&&sessionBootstrapPromise){permissionRefresh();return true}'),'Aynı UID için auth görünürlük ve başlangıç köprüsü tek local bootstrap promise kullanmalı.');"
if addition.strip() not in test:
    if marker not in test:
        raise SystemExit('bootstrap smoke insertion marker not found')
    test=test.replace(marker,marker+addition,1)
TEST.write_text(test)

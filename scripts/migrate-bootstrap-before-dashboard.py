from pathlib import Path

APP=Path('js/app-loader.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

app=APP.read_text()
test=TEST.read_text()

old="function syncLegacySession(){let user=null,role=null;try{if(typeof AKTIF_KULLANICI!=='undefined')user=AKTIF_KULLANICI}catch(_){}try{if(typeof AKTIF_ROL!=='undefined')role=AKTIF_ROL}catch(_){}if(!user?.uid)return false;window.AKTIF_KULLANICI=user;window.AKTIF_ROL=role||null;AppStore?.set?.('session.user',user);AppStore?.set?.('session.role',role||null);AppBootstrap?.start?.();prepareAccountLocalData(user).then(()=>{permissionRefresh();ensureInitialModule()});return true}"
new="function syncLegacySession(){let user=null,role=null;try{if(typeof AKTIF_KULLANICI!=='undefined')user=AKTIF_KULLANICI}catch(_){}try{if(typeof AKTIF_ROL!=='undefined')role=AKTIF_ROL}catch(_){}if(!user?.uid)return false;window.AKTIF_KULLANICI=user;window.AKTIF_ROL=role||null;AppStore?.set?.('session.user',user);AppStore?.set?.('session.role',role||null);Promise.all([Promise.resolve(AppBootstrap?.start?.()),prepareAccountLocalData(user)]).then(()=>{permissionRefresh();ensureInitialModule()}).catch(e=>console.warn('[Local bootstrap]',e?.message||e));return true}"
if old not in app: raise SystemExit('syncLegacySession contract not found')
app=app.replace(old,new,1)
APP.write_text(app)

test += '''
const appLoaderSource=fs.readFileSync('js/app-loader.js','utf8');
assert(appLoaderSource.includes('Promise.all([Promise.resolve(AppBootstrap?.start?.()),prepareAccountLocalData(user)])'),'İlk modül core ve hesap IndexedDB hydrate tamamlanmadan açılmamalı.');
const bootstrapWaitPos=appLoaderSource.indexOf('Promise.all([Promise.resolve(AppBootstrap?.start?.()),prepareAccountLocalData(user)])'),initialModulePos=appLoaderSource.indexOf('ensureInitialModule()',bootstrapWaitPos);
assert(bootstrapWaitPos>=0&&initialModulePos>bootstrapWaitPos,'Local bootstrap dashboard açılışından önce tamamlanmalı.');
'''
TEST.write_text(test)

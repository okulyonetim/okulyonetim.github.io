from pathlib import Path

index = Path('index.html')
html = index.read_text(encoding='utf-8')
storage_tag = '  <script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js" defer></script>\n'
if storage_tag not in html:
    raise SystemExit('Firebase Storage preload tag not found')
index.write_text(html.replace(storage_tag, '', 1), encoding='utf-8')

fb = Path('js/firebase-init.js')
src = fb.read_text(encoding='utf-8')
old = '''    auth = firebase.auth();
    storage = firebase.storage();
    firebaseHazir = true;'''
new = '''    auth = firebase.auth();
    storage = null;
    firebaseHazir = true;'''
if old not in src:
    raise SystemExit('firebase startup storage init contract not found')
src = src.replace(old, new, 1)
anchor = 'function yapilandirmaEksikMi(){ return firebaseConfig.apiKey === "BURAYA_API_KEY"; }\n\n'
helper = '''function firebaseStorageHazirla(){
  if(storage) return storage;
  if(typeof firebase.storage !== 'function') throw new Error('firebase-storage-sdk-yok');
  storage = firebase.storage();
  window.storage = storage;
  return storage;
}
window.firebaseStorageHazirla = firebaseStorageHazirla;

'''
if anchor not in src:
    raise SystemExit('firebase helper anchor missing')
src = src.replace(anchor, anchor + helper, 1)
fb.write_text(src, encoding='utf-8')

loader = Path('js/app-loader.js')
app = loader.read_text(encoding='utf-8')
anchor = "function define(name,files){registry.set(name,[...(files||[])])}\n"
cap = "const FIREBASE_STORAGE_SDK='https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js';\n"
if anchor not in app:
    raise SystemExit('loader registry anchor missing')
app = app.replace(anchor, anchor + cap, 1)
old_comm = "define('communication',['js/modules/communication.js','js/modules/assistant.js']);"
new_comm = "define('communication',[FIREBASE_STORAGE_SDK,'js/modules/communication.js','js/modules/assistant.js']);"
old_docs = "define('documents',['js/modules/report-engine.js','js/modules/documents.js']);"
new_docs = "define('documents',[FIREBASE_STORAGE_SDK,'js/modules/report-engine.js','js/modules/documents.js']);"
if old_comm not in app or old_docs not in app:
    raise SystemExit('communication/documents registry contract missing')
app = app.replace(old_comm, new_comm, 1).replace(old_docs, new_docs, 1)
old_load = "await loadMany(registry.get(name));window.dispatchEvent(new CustomEvent('koruk:module-ready'"
new_load = "await loadMany(registry.get(name));if((name==='communication'||name==='documents'))window.firebaseStorageHazirla?.();window.dispatchEvent(new CustomEvent('koruk:module-ready'"
if old_load not in app:
    raise SystemExit('loader load contract missing')
app = app.replace(old_load, new_load, 1)
loader.write_text(app, encoding='utf-8')

test = Path('tests/lazy-firebase-storage-smoke.test.js')
test.write_text('''const fs=require('fs');\nconst assert=require('assert');\nconst html=fs.readFileSync('index.html','utf8');\nconst loader=fs.readFileSync('js/app-loader.js','utf8');\nconst firebase=fs.readFileSync('js/firebase-init.js','utf8');\nconst communication=fs.readFileSync('js/modules/communication.js','utf8');\nconst documents=fs.readFileSync('js/modules/documents.js','utf8');\nassert(!html.includes('firebase-storage-compat.js'),'Firebase Storage SDK ilk HTML açılışında preload edilmemeli.');\nassert(loader.includes("const FIREBASE_STORAGE_SDK='https://www.gstatic.com/firebasejs/10.12.2/firebase-storage-compat.js'"),'Storage SDK merkezi AppLoader capability olarak tanımlanmalı.');\nassert(loader.includes("define('communication',[FIREBASE_STORAGE_SDK,'js/modules/communication.js','js/modules/assistant.js'])"),'Mesajlaşma Storage SDK yüklenmeden açılmamalı.');\nassert(loader.includes("define('documents',[FIREBASE_STORAGE_SDK,'js/modules/report-engine.js','js/modules/documents.js'])"),'Dokümanlar Storage SDK yüklenmeden açılmamalı.');\nassert(loader.includes("window.firebaseStorageHazirla?.()"),'Lazy Storage SDK yüklendikten sonra mevcut Firebase app storage örneği hazırlanmalı.');\nconst startup=firebase.slice(firebase.indexOf('function firebaseyiBaslat(){'));\nassert(!startup.includes('storage = firebase.storage();'),'Firebase başlangıç yolu Storage SDK istememeli.');\nassert(firebase.includes('function firebaseStorageHazirla()')&&firebase.includes("typeof firebase.storage !== 'function'"),'Storage örneği yalnız capability yüklendiğinde hazırlanmalı.');\nassert(communication.includes('storage.ref()')&&documents.includes('storage.ref()'),'Mevcut mesaj/doküman Storage davranışı korunmalı.');\nconsole.log('Lazy Firebase Storage başlangıç smoke testi başarılı.');\n''', encoding='utf-8')

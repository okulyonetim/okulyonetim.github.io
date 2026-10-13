// Profil fotoğrafı: "Rozetli" görünüm + yüklerken gerçek görünüme göre (daire kadraj) kırpma ekranı.
// Rozetli: ince altın halka + dış hare; açılan kartta ve profil sayfasında altında unvan rozeti. Tek kaynak: TEMA MERKEZİ (--ka-avatar-*).
// Kırpma: js/core/photo-cropper.js — sürükle / yakınlaştır / döndür, canlı önizleme, çıkış kare PNG (auth.js tek kayıplı WEBP kodlaması yapar).
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const read=p=>fs.readFileSync(p,'utf8');
const cropSrc=read('js/core/photo-cropper.js'),shell=read('js/core/shell-ui.js'),css=read('css/design-system-base.css'),auth=read('js/auth.js');
const index=read('index.html'),beta=read('beta.html'),sw=read('service-worker.js'),doc=read('docs/TASARIM-SISTEMI.md');
new Function(cropSrc);new Function(shell);

// ── 1) Rozetli görünüm: belirteçler çekirdekte, bileşenler aynı belirteci kullanır ──
const coreStart=css.indexOf('KORUK ASİSTAN — TEMA MERKEZİ'),coreEnd=css.indexOf('@media(max-width:767px){:root{--ka-font-size-md:var(--ka-fs-14)}}');
assert(coreStart>=0&&coreEnd>coreStart,'TEMA MERKEZİ bloğu bulunamadı.');
const core=css.slice(coreStart,coreEnd),rest=css.slice(coreEnd);
for(const v of ['--ka-avatar-ring-w','--ka-avatar-ring','--ka-avatar-halo','--ka-avatar-halo-w','--ka-avatar-halo-w-lg','--ka-avatar-ring-shadow','--ka-avatar-ring-shadow-lg','--ka-avatar-gap','--ka-avatar-chip-bg','--ka-avatar-chip-ink','--ka-avatar-chip-shadow','--ka-avatar-chip-max','--ka-avatar-chip-max-sm','--ka-photo-crop-w','--ka-photo-crop-stage','--ka-photo-crop-dim','--ka-photo-crop-reach'])
  assert(new RegExp('(^|[;{\\s])'+v.replace(/-/g,'\\-')+'\\s*:').test(core),`Rozetli/kırpma belirteci TEMA MERKEZİ içinde tanımlı olmalı: ${v}`);
const rule=sel=>{const i=rest.indexOf(sel);assert(i>=0,`Kural bulunamadı: ${sel}`);return rest.slice(i,rest.indexOf('}',i)+1)};
assert(/box-shadow:var\(--ka-avatar-ring-shadow\)!important/.test(rule('html .ka-app-header .ka-header-actions>.ka-header-profile{')),'Başlık avatarı ortak halka belirtecini kullanmalı.');
assert(/box-shadow:var\(--ka-avatar-ring-shadow\)/.test(rule('html .ka-profile-popover__identity>.ka-avatar{')),'Açılan kart avatarı ortak halka belirtecini kullanmalı.');
assert(/box-shadow:var\(--ka-avatar-ring-shadow\)/.test(rule('html .ka-web-me__avatar{')),'Web yan menüsü avatarı ortak halka belirtecini kullanmalı.');
assert(/box-shadow:var\(--ka-avatar-ring-shadow-lg\)!important/.test(rule('html #v2ModuleRoot .ka-profile-page .ka-profile-avatar{')),'Profil sayfası avatarı büyük halka belirtecini kullanmalı.');
assert(/border-radius:50%!important/.test(rule('html #v2ModuleRoot .ka-profile-page .ka-profile-avatar{')),'Profil sayfası fotoğrafı daire olmalı (görünüm her yerde aynı).');
const chip=rule('html .ka-avatar-chip{');
assert(/background:var\(--ka-avatar-chip-bg\)/.test(chip)&&/color:var\(--ka-avatar-chip-ink\)/.test(chip)&&/text-overflow:ellipsis/.test(chip),'Unvan rozeti belirteçlerle boyanmalı ve uzun unvanı "…" ile kısaltmalı.');
assert(/max-width:var\(--ka-avatar-chip-max\)/.test(chip),'Rozet genişliği belirteçten sınırlanmalı.');
assert(/--ka-avatar-chip-max:var\(--ka-avatar-chip-max-sm\)/.test(rule('html .ka-profile-popover__identity>.ka-avatar{')),'Açılan kartta rozet, küçük avatar sınırını kullanmalı.');
assert(/max-width:calc\(100% \+ var\(--ka-sp-14\)\)/.test(rule('html .ka-profile-avatar-wrap .ka-avatar-chip{')),'Profil sayfasında uzun rozet yandaki yazıya taşmamalı.');
assert(/\.ka-profile-photo-edit\{[^}]*top:-6px/.test(rest),'Kamera düğmesi rozetle çakışmaması için üste alınmalı.');

// Başlık avatarı: fotoğraf düğmeyi tek başına doldurur (iç içe kırpma / yüzde boyut yok) → halka ile fotoğraf arasında koyu boşluk kalmaz
const hdr=rule('html .ka-app-header .ka-header-actions>.ka-header-profile{'),hdrImg=rule('html .ka-app-header .ka-header-profile img{');
assert(/position:relative/.test(hdr)&&/overflow:visible/.test(hdr)&&!/overflow:hidden/.test(hdr),'Başlık avatar düğmesi iç içe kırpma yapmamalı.');
assert(/position:absolute/.test(hdrImg)&&/inset:calc\(var\(--ka-border-w\) \* -\.5\)/.test(hdrImg)&&/border-radius:50%/.test(hdrImg)&&/object-fit:cover/.test(hdrImg),'Başlık fotoğrafı düğmeyi kenar boşluksuz doldurmalı.');
// Her oranda fotoğraf (dikey/yatay/kare) kutuyu tam doldurur → avatar asla oval olmaz (yüzde boyut yerine mutlak yerleşim)
for(const [sel,label] of [['html .ka-profile-popover__identity>.ka-avatar img{','açılan kart'],['html #v2ModuleRoot .ka-profile-page .ka-profile-avatar img{','profil sayfası'],['html .ka-web-me__avatar img{','web yan menüsü'],['html .ka-app-header .ka-header-profile img{','başlık']]){
  const r=rule(sel);assert(/position:absolute/.test(r)&&/width:(100%|calc\(100% \+ var\(--ka-border-w\)\))/.test(r)&&/height:(100%|calc\(100% \+ var\(--ka-border-w\)\))/.test(r)&&/object-fit:cover/.test(r)&&/border-radius:50%/.test(r),`${label} fotoğrafı kutuyu mutlak yerleşimle tam doldurmalı (oval görünmemeli).`);
}
assert(/position:relative/.test(rule('html .ka-web-me__avatar{')),'Web yan menüsü avatarı mutlak yerleşimli fotoğrafın dayanağı olmalı.');
// Yükleme sonrası adres: aynı Storage yoluna yazıldığı için adres değişmez → v= ile eski fotoğraf önbellekten gelmesin
assert(/base=await snapshot\.ref\.getDownloadURL\(\),url=base\+\(base\.includes\('\?'\)\?'&':'\?'\)\+'v='\+Date\.now\(\)/.test(auth),'Fotoğraf adresine sürüm parametresi eklenmeli.');
assert(auth.includes('await user.updateProfile({photoURL:url})'),'Sürümlü adres kalıcı profile yazılmalı.');
assert(/D=mask\.offsetWidth\|\|/.test(cropSrc),'Kadraj çapı yerleşim ölçüsünden alınmalı (dönüşüm/animasyondan etkilenmemeli).');

// ── 2) Kabuk: rozet metni ve işaretlemesi ──
assert(/function profileBadge\(\)\{/.test(shell)&&/u\.unvan\|\|r\.ad\|\|r\.rolAdi/.test(shell),'Rozet metni: unvan, yoksa rol adı.');
assert(/function profileChip\(\)\{const b=profileBadge\(\);return b\?`<b class="ka-avatar-chip">/.test(shell),'Rozet yoksa hiçbir şey çizilmemeli.');
assert(shell.includes('<span class="ka-avatar">${photo?`<img src="${esc(photo)}" alt="">`:SVG.profile}${profileChip()}</span>'),'Açılan kartta avatarın altında rozet olmalı.');
assert(shell.includes('</div>${profileChip()}<button type="button" class="ka-profile-photo-edit"'),'Profil sayfasında avatarın altında rozet olmalı.');
assert(!/profileInfo\(\)\{[^}]*profileBadge/.test(shell),'profileInfo dönüş sözleşmesi değişmemeli.');

// ── 3) Kırpma akışı: dosya seçilince önce kırpma ekranı, sonra mevcut yükleme hattı ──
assert(/async function profilePhotoCrop\(file\)\{/.test(shell),'profilePhotoCrop tanımlı olmalı.');
assert(/photoInput\.addEventListener\('change',\(\)=>\{const file=photoInput\.files\?\.\[0\];photoInput\.value='';if\(file\)profilePhotoCrop\(file\)\}\)/.test(shell),'Dosya seçimi doğrudan yüklemeye değil kırpma ekranına gitmeli.');
assert(/cropper\.open\(file,\{badge:profileBadge\(\)\}\)/.test(shell)&&/if\(cropped\)profilePhotoUpdate\(cropped\)/.test(shell),'Kırpma sonucu (vazgeçilmediyse) mevcut yükleme fonksiyonuna verilmeli.');
assert(/if\(!cropper\)\{profilePhotoUpdate\(file\);return\}/.test(shell),'Kırpma modülü yüklenemezse eski akış çalışmalı.');
assert(auth.includes('async function kendiProfilFotografimiGuncelle(file)')&&auth.includes("canvas.toBlob(resolve,'image/webp',.86)"),'Yükleme hattı (auth.js) değişmemeli.');
assert(/accept="image\/jpeg,image\/png,image\/webp"/.test(shell),'Dosya türleri aynı kalmalı.');

// ── 4) Kırpma modülü: saf geometri ──
const sandbox={window:{},document:{},console};sandbox.globalThis=sandbox;vm.createContext(sandbox);vm.runInContext(cropSrc,sandbox);
const PC=sandbox.window.PhotoCropper||sandbox.PhotoCropper;assert(PC&&typeof PC.open==='function'&&PC.math,'PhotoCropper.open ve math dışa verilmeli.');
const M=PC.math,near=(a,b,m)=>assert(Math.abs(a-b)<1e-9,m||`${a} ≈ ${b}`);
assert.deepStrictEqual({...M.rotated(1200,800,0)},{w:1200,h:800});assert.deepStrictEqual({...M.rotated(1200,800,90)},{w:800,h:1200});assert.deepStrictEqual({...M.rotated(1200,800,270)},{w:800,h:1200});assert.deepStrictEqual({...M.rotated(1200,800,180)},{w:1200,h:800});
// z=1: kısa kenar kadrajı tam kaplar; uzun kenarda (1.5-1)/2=.25 kadraj çapı kadar kaydırma payı vardır
let m=M.maxOffset(1200,800,0,1);near(m.x,.25);near(m.y,0);
m=M.maxOffset(1200,800,90,1);near(m.x,0);near(m.y,.25,'90° döndürülünce pay eksen değiştirir.');
m=M.maxOffset(800,800,0,2);near(m.x,.5);near(m.y,.5);
let v=M.clampView({rot:0,z:1,nx:9,ny:9},1200,800);near(v.nx,.25);near(v.ny,0,'Görüntü kadrajı hiçbir zaman boş bırakmayacak şekilde sınırlanmalı.');
v=M.clampView({rot:0,z:99,nx:-9,ny:-9},800,800);near(v.z,M.ZOOM_MAX,'Yakınlaştırma üst sınırı.');near(v.nx,-(M.ZOOM_MAX-1)/2);
v=M.clampView({rot:0,z:.2,nx:0,ny:0},800,800);near(v.z,1,'Kadrajdan küçülemez.');
near(M.baseScale(1200,800,0,320),.4);near(M.baseScale(1200,800,90,320),.4,'Kare kadraj kısa kenara göre ölçeklenir.');
assert.strictEqual(M.outputSize(1200,800,{rot:0,z:1,nx:0,ny:0}),512,'Büyük kaynak 512 px ile sınırlanır.');
assert.strictEqual(M.outputSize(1200,800,{rot:0,z:1.8,nx:0,ny:0}),444,'Yakınlaştırınca kaynaktan alınan gerçek piksel kadar çıkar (yapay büyütme yok).');
assert.strictEqual(M.outputSize(300,200,{rot:0,z:1,nx:0,ny:0}),200,'Küçük kaynak büyütülmez.');
assert.strictEqual(M.outputSize(100,100,{rot:0,z:4,nx:0,ny:0}),M.OUT_MIN,'Çıkış kenarı alt sınırı.');

// ── 5) Kırpma modülü: sözleşme ──
for(const t of ["'image/jpeg','image/png','image/webp'",'8*1024*1024','JPG, PNG veya WEBP biçiminde bir fotoğraf seçin.','Fotoğraf en fazla 8 MB olabilir.',"'image/png'","'profil.png'",'pointerdown','pointermove','wheel','setPointerCapture','data-pc-rot','data-pc-reset','data-pc-save','data-pc-cancel','Escape',"role=\"dialog\"",'aria-modal="true"','ka-avatar-chip'])
  assert(cropSrc.includes(t),`Kırpma modülü sözleşmesi eksik: ${t}`);
assert(!/firebase|storage|\.put\(|fetch\(|XMLHttpRequest/.test(cropSrc.replace(/\/\*[\s\S]*?\*\//g,'')),'Kırpma modülü ağa/Firebase\'e dokunmamalı; yalnız dosya üretir.');
for(const t of ['.ka-photo-crop{','.ka-photo-crop__stage{','.ka-photo-crop__mask{','.ka-photo-crop__pvav--sm','.ka-photo-crop__pvav--md','.ka-photo-crop__pvav--lg'])assert(rest.includes(t),`Kırpma ekranı stili eksik: ${t}`);
assert(/touch-action:none/.test(rule('.ka-photo-crop__stage{')),'Sahne dokunmatik sürüklemede sayfayı kaydırmamalı.');
assert(/height:var\(--pc-w\)/.test(rule('.ka-photo-crop__stage{')),'Sahne kare boyutu kesin olmalı (ızgara satırı küçülmemeli).');

// ── 6) Dağıtım: script etiketi + PWA önbelleği + sürümler ──
for(const [name,src] of [['index.html',index],['beta.html',beta]]){
  const m=src.match(/js\/core\/photo-cropper\.js\?v=(\d+)" defer/);assert(m,`${name}: photo-cropper.js yüklenmeli.`);
  assert(sw.includes(`'./js/core/photo-cropper.js?v=${m[1]}'`),`${name}: Service Worker aynı sürümle önbelleğe almalı.`);
  assert(src.indexOf('photo-cropper.js')>src.indexOf('shell-ui.js'),`${name}: kırpma modülü shell-ui'dan sonra yüklenmeli.`);
}
const cssV=Number(index.match(/css\/design-system\.css\?v=(\d+)/)[1]),shellV=Number(index.match(/js\/core\/shell-ui\.js\?v=(\d+)/)[1]);
assert(cssV>=1143&&shellV>=1078,'Rozetli/kırpma varlıkları gerekli sürümün gerisine düşmemeli.');
assert(sw.includes(`'./css/design-system.css?v=${cssV}'`)&&sw.includes(`'./js/core/shell-ui.js?v=${shellV}'`),'Service Worker güncel sürümleri önbelleğe almalı.');
assert(Number(sw.match(/const CACHE_ADI='oy-cache-v(\d+)'/)[1])>=1292,'Service Worker cache sürümü bu değişiklikten geri kalmamalı.');
assert(Number(read('css/design-system.css').match(/design-system-base\.css\?v=(\d+)/)[1])>=1281,'Ana stil dosyası sürümü yükseltilmeli.');

// ── 7) Belge ──
assert(doc.includes('Profil fotoğrafı')&&doc.includes('Rozetli')&&doc.includes('photo-cropper.js')&&doc.includes('--ka-avatar-ring-shadow'),'docs/TASARIM-SISTEMI.md Rozetli görünümü ve kırpma ekranını anlatmalı.');
console.log('Profil fotoğrafı Rozetli görünüm + kırpma ekranı sözleşmesi başarılı.');

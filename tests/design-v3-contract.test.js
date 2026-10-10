// V3 tasarım sözleşmesi: üretim izolasyonu, tek kaynak (tokens.css), renk disiplini, tema motoru, saf-görsel katman.
const fs=require('fs'),assert=require('assert');
const rd=p=>fs.readFileSync(p,'utf8');
const index=rd('index.html'),beta=rd('beta.html'),sw=rd('service-worker.js');
// 1) Üretim izolasyonu
assert(!/v3\//.test(index)&&!/scene-skin|theme\.js/.test(index),'index.html V3 dosyalarını yüklememeli (üretim etkilenmez).');
assert(!/css\/v3|js\/v3/.test(sw),'service-worker.js V3 dosyalarını precache etmemeli (beta aşamasında).');
// 2) beta.html = index.html + V3 (mantık script listesi birebir aynı sırada)
const scripts=h=>[...h.matchAll(/<script[^>]+src="([^"]+)"/g)].map(m=>m[1]);
assert.deepStrictEqual(scripts(beta).filter(s=>!s.includes('v3/')),scripts(index),'beta.html mantık script listesi index.html ile birebir aynı olmalı.');
assert(beta.indexOf('css/design-system.css')<beta.indexOf('css/v3/v3.css'),'v3.css design-system.css’den SONRA yüklenmeli.');
assert(/v3\/theme\.js/.test(beta),'beta.html theme.js yüklemeli.');
// 3) Tokenlar: açık/koyu çekirdek + türetilmiş ailelerin hepsi tek dosyada
const tokens=rd('css/v3/tokens.css');
const iL=tokens.indexOf('html.ka-v3,html.ka-v3[data-theme="light"]{'),iD=tokens.indexOf('html.ka-v3[data-theme="dark"]{'),iT=tokens.indexOf('/* ---- 2. TÜRETİLMİŞ');
assert(iL>-1&&iD>iL&&iT>iD,'tokens.css bölüm düzeni bozuk.');
const light=tokens.slice(iL,iD),dark=tokens.slice(iD,iT),derived=tokens.slice(iT);
for(const t of ['--ka-app-bg','--ka-card-bg','--ka-text','--ka-text-muted','--ka-border','--ka-header-bg','--ka-nav-bg','--ka-input-bg','--ka-input-border','--ka-danger','--ka-success','--ka-shadow-md'])
  {assert(light.includes(t+':'),`Açık tema tokenı eksik: ${t}`);assert(dark.includes(t+':'),`Koyu tema tokenı eksik: ${t}`)}
for(const t of ['--ka-primary','--ka-primary-hover','--ka-primary-soft','--ka-button-bg','--ka-module-surface','--ka-module-text','--ka-module-border','--ka-module-accent','--ka-detail-text','--ka-hero-bg','--ka-live-text','--ka-icon-surface','--ka-control-height','--ka-space-4','--ka-radius-pill'])
  assert(tokens.includes(t+':'),`Türetilmiş/ölçek tokenı eksik: ${t}`);
assert(!/--ka-(primary|button-bg|button-text):\s*#/.test(light+dark),'Vurgu tokenları paletten DEĞİL --v3-accent’ten türemeli.');
assert(/--ka-primary:var\(--v3-accent\)/.test(derived),'--ka-primary --v3-accent’e bağlı olmalı.');
// 4) Renk disiplini: sabit renk yalnız tokens.css ve scenes.css içinde
for(const f of ['components','home','report','v3']){
  const css=rd(`css/v3/${f}.css`).replace(/\/\*[\s\S]*?\*\//g,'');
  const bad=css.match(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/g);
  assert(!bad,`css/v3/${f}.css içinde sabit renk var (${bad&&bad[0]}); tokens.css’e taşıyın.`);
}
// 5) Kullanılan değişkenler tanımlı olmalı
const base=rd('css/design-system-base.css');
const defined=new Set([...(base+tokens).matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
for(const f of ['components','home','report','v3']){
  const css=rd(`css/v3/${f}.css`);const local=new Set([...css.matchAll(/(--[\w-]+)\s*:/g)].map(m=>m[1]));
  for(const m of css.matchAll(/var\((--[\w-]+)/g)) assert(defined.has(m[1])||local.has(m[1]),`css/v3/${f}.css tanımsız değişken kullanıyor: ${m[1]}`);
}
// 6) Tema motoru: tek kontrol noktası + güvenli API
const th=rd('js/v3/theme.js');
for(const k of ['KorukTheme','set:set','reset:reset','contrast:contrast','koruk:theme-change','ka-v3','--v3-accent','--v3-density'])assert(th.includes(k),`theme.js eksik: ${k}`);
assert(!/AppStore|firebase|firestore|fetch\(/i.test(th),'theme.js veri katmanına dokunmamalı.');
// 7) Sahne katmanı salt görsel
const js=rd('js/v3/scene-skin.js').replace(/\/\*[\s\S]*?\*\//g,'');
assert(!/AppStore\.(set|setData|setDataMany|hydrate)|firebase|firestore|\.collection\(|SyncEngine|fetch\(/i.test(js),'scene-skin.js veri katmanına yazmamalı/okumamalı.');
assert(/ka-skin/.test(js)&&/setActive/.test(js),'Kapatma anahtarı (ka-skin) ve setActive bulunmalı.');
// 7b) Geri yığını: yalnız ortak pencere sınıfları, geçmişle eşitleme, veri katmanına dokunmaz
const nv=rd('js/v3/nav.js').replace(/\/\*[\s\S]*?\*\//g,'');
assert(/KorukNav/.test(nv)&&/popstate/.test(nv)&&/pushState/.test(nv)&&/Escape/.test(nv),'nav.js geri yığını eksik.');
assert(!/AppStore|firebase|firestore|\.collection\(|fetch\(/i.test(nv),'nav.js veri katmanına dokunmamalı.');
assert(/v3\/nav\.js/.test(beta),'beta.html nav.js yüklemeli.');
assert(/v3\/nav\.js/.test(rd('design-lab.html')),'design-lab.html nav.js yüklemeli.');
// 8) Denetim aracı mevcut
assert(fs.existsSync('scripts/audit-design-leaks.mjs'),'Sızıntı denetim betiği eksik.');
console.log('design-v3-contract: OK');

const assert=require('assert'),fs=require('fs');
global.window=global;
require('../js/modules/hafta-sozleri.js');
const H=global.HaftaSozleri;
const loader=fs.readFileSync('js/app-loader.js','utf8'),dash=fs.readFileSync('js/modules/dashboard.js','utf8'),settings=fs.readFileSync('js/modules/settings.js','utf8');

/* Üç ayrı kart, her biri kendi havuzundan */
assert.deepStrictEqual(H.TURLER.map(t=>t.key),['ayet','hadis','ozluSoz']);
H.TURLER.forEach(t=>{const ids=H.hazir(t.key).map(x=>x.id);assert(ids.length>=12,t.key+' hazır havuzu yeterince geniş olmalı.');assert.strictEqual(new Set(ids).size,ids.length,t.key+' id\'leri benzersiz olmalı.');H.hazir(t.key).forEach(x=>assert(x.metin&&x.kaynak,t.key+' her sözün kaynağı olmalı.'))});

/* Haftalık seçim: aynı hafta aynı söz, sonraki hafta bir sonraki söz; Pazartesi başlar */
const pzt=new Date(2026,9,19),pazar=new Date(2026,9,25),sonraki=new Date(2026,9,26);
assert.strictEqual(H.haftaNo(pzt),H.haftaNo(pazar),'Pazartesi–Pazar aynı hafta olmalı.');
assert.strictEqual(H.haftaNo(sonraki),H.haftaNo(pzt)+1,'Pazartesi yeni hafta başlatmalı.');
assert.strictEqual(H.buHafta('hadis',{},pzt).id,H.buHafta('hadis',{},pazar).id);
assert.notStrictEqual(H.buHafta('hadis',{},pzt).id,H.buHafta('hadis',{},sonraki).id);
const n=H.hazir('ayet').length;let seen=new Set();for(let i=0;i<n;i++)seen.add(H.buHafta('ayet',{},new Date(2026,9,19+7*i)).id);
assert.strictEqual(seen.size,n,'Havuz bitmeden söz tekrar etmemeli.');

/* Havuz: hazır sözler kapatılabilir, yönetici sözü ekleyebilir; bozuk kayıt güvenli okunur */
const cfg={hadis:{kapali:['h01','yok'],ozel:[{metin:'  Kendi   sözümüz ',kaynak:'Okul'},{metin:'',kaynak:'x'}]}};
const pool=H.havuz('hadis',cfg);
assert(!pool.some(x=>x.id==='h01'),'Kapatılan hazır söz havuzda olmamalı.');
assert.strictEqual(pool[pool.length-1].metin,'Kendi sözümüz','Eklenen söz havuzun sonuna normalize edilerek girmeli.');
assert.strictEqual(pool.filter(x=>!x.hazir).length,1,'Boş metinli söz atılmalı.');
assert.strictEqual(H.havuz('ayet',cfg).length,H.hazir('ayet').length,'Bir türün ayarı diğerini etkilememeli.');
['ayet','hadis','ozluSoz'].forEach(k=>{assert.doesNotThrow(()=>H.havuz(k,null));assert.doesNotThrow(()=>H.havuz(k,[1,2]));assert.doesNotThrow(()=>H.havuz(k,{[k]:{kapali:'x',ozel:7}}))});
const bos={ayet:{kapali:H.hazir('ayet').map(x=>x.id)}};
assert.strictEqual(H.buHafta('ayet',bos),null,'Havuz boşsa kart gösterilmemeli.');

/* Sınav: varsayılan yalnız LGS, her sınav ayrı Göster kontrolü */
const ex=loader.match(/const EXAM_DEFAULTS=(\[.*?\]);/s)[1];
assert(/LGS/.test(ex)&&!/YKS/.test(ex),'Varsayılan sınav listesinde YKS olmamalı.');
assert(loader.includes("goster:x?.goster!==false"),'Her sınavın Göster alanı AppConfig\'te olmalı.');
assert(dash.includes("x.goster!==false")&&!/\.slice\(0,3\)/.test(dash.slice(dash.indexOf('function examCountdownSection'),dash.indexOf('function examCountdownSection')+500)),'Ana sayfa yalnız Göster işaretli sınavları sıralamalı.');
assert(settings.includes('data-exam-show')&&settings.includes('data-exam-add')&&settings.includes('data-exam-remove'),'Ayarlar sınav satırı: göster/ekle/kaldır.');

/* Belirli gün: katalog ana sayfaya karışmaz */
assert(!dash.includes('catalogSpecialDays')&&!dash.includes('BelirliGunlerCatalog'),'Ana sayfa yalnız okulun seçtiği belirli günleri göstermeli.');
assert(!loader.includes("define('dashboard',['js/modules/school-live-status.js?v=1071','js/modules/belirli-gunler-catalog"),'Dashboard artık katalog yüklemez.');

/* Ayet · hadis · özlü söz tek kartta, aynı alanda sırayla (alt alta üç kart değil) */
assert(!/\bsayingText\b|\bsayingSource\b|SAYINGS\b|sayingSection\b|weeklySayingSection\b/.test(dash+settings+loader),'Eski tek söz yapısı ve üç ayrı kart kaldırılmalı.');
assert(loader.includes("['sozler','Haftanın ayeti · hadisi · özlü sözü']")&&!/\['(ayet|hadis|ozluSoz|saying)','/.test(loader),'DASHBOARD_CARDS tek söz kartı içermeli.');
assert((loader.match(/'sozler'/g)||[]).length===3,'Her iki rolün varsayılanında ve katalogda tek söz kartı olmalı.');
assert(dash.includes('sozler:weeklySayingsSection')&&!/ayet:\(\)=>|hadis:\(\)=>|ozluSoz:\(\)=>/.test(dash),'CARD_RENDERERS tek söz kartı kullanmalı.');
assert(dash.includes('data-saying-carousel')&&dash.includes('data-saying-slide')&&dash.includes('data-saying-dot'),'Söz kartı slayt ve nokta içermeli.');
assert(/clearInterval\(sayingTimer\);sayingTimer=null/.test(dash)&&dash.includes('startSayingTimer();'),'Otomatik geçiş zamanlayıcısı mount/unmount ile yönetilmeli.');
assert(dash.includes("prefers-reduced-motion"),'Hareket azaltma tercihinde otomatik geçiş durmalı.');
assert(/define\('dashboard',\[[^\]]*hafta-sozleri\.js/.test(loader)&&/define\('settings',\[[^\]]*hafta-sozleri\.js/.test(loader),'Dashboard ve Ayarlar havuz modülünü yüklemeli.');
console.log('ana-sayfa-haftalik-sozler: OK');

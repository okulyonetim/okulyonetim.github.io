const assert=require('assert');const fs=require('fs');const vm=require('vm');
const read=p=>fs.readFileSync(p,'utf8');
const com=read('js/modules/communication.js');
const adapter=read('js/core/platform/widget-adapter.js');
const server=read('functions-free/check-and-notify.js');
const main=read('android/app/src/main/java/com/koruk/okul/MainActivity.java');
const fcm=read('android/app/src/main/java/com/koruk/okul/OkulFirebaseMessagingService.java');
const base=read('css/design-system-base.css');
const ds=read('css/design-system.css');
const sw=read('service-worker.js');
const loader=read('js/app-loader.js');
new Function(com);new Function(adapter);

/* 1) Takvim ekranı: Sil, Saat, Ertele aynı pencere/sayfada, yerinde */
assert(com.includes('name="saat" type="time"'),'Hatırlatıcı penceresinde Saat alanı olmalı.');
assert(com.includes('data-cal-modal-sil')&&com.includes('hatirlaticiSil(id)')&&com.includes('gorevSil(id)'),'Düzenleme penceresinde Sil düğmesi kayıt türüne göre silmeli.');
assert(/data-cal-modal-sil[^`]*`\s*:\s*''/.test(com)||com.includes("${id?'<button class=\"ka-btn ka-btn--danger ka-btn--start\" type=\"button\" data-cal-modal-sil>Sil</button>':''}"),'Sil yalnız mevcut kayıtta görünmeli.');
assert(com.includes('data-cal-snooze')&&com.includes('function acErtele(')&&com.includes('ertelemeSayisi'),'Satırda Ertele düğmesi ve erteleme penceresi olmalı.');
assert(com.includes("bildirimGonderildi:false")&&com.includes('v.bildirimGonderildi=false'),'Tarih/saat değişince ya da ertelenince bildirim yeniden gönderilebilir olmalı.');
assert(!/toISOString\(\)\.slice\(0,10\)/.test(com.slice(com.indexOf('TAKVİM — Hatırlatıcılar'))),'Takvim "bugün"ü UTC değil yerel tarihten hesaplanmalı (00:00-03:00 arası yanlış gün).');
assert(com.includes("o===(item.oncelik||'Orta')"),'Yeni hatırlatıcıda varsayılan öncelik Orta olmalı.');

/* 2) Erteleme hesabı: şimdiden sayılır; yarın/haftaya sabah 08:00 */
const pick=n=>{const i=com.indexOf('function '+n+'(');assert(i>=0,n+' bulunamadı');let d=0,j=com.indexOf('{',i);for(let k=j;k<com.length;k++){if(com[k]==='{')d++;else if(com[k]==='}'&&--d===0)return com.slice(i,k+1)}};
const ctx={};vm.createContext(ctx);
vm.runInContext(['calIso','calSaat','erteleHedefi'].map(pick).join('\n'),ctx);
const now=new Date(2026,10,4,22,5,40);
const t=k=>ctx.erteleHedefi(k,now);
assert.deepStrictEqual({...t('10dk')},{tarih:'2026-11-04',saat:'22:15'});
assert.deepStrictEqual({...t('30dk')},{tarih:'2026-11-04',saat:'22:35'});
assert.deepStrictEqual({...t('1sa')},{tarih:'2026-11-04',saat:'23:05'});
assert.deepStrictEqual({...t('3sa')},{tarih:'2026-11-05',saat:'01:05'},'Gece yarısını aşan erteleme ertesi güne geçmeli.');
assert.deepStrictEqual({...t('yarin')},{tarih:'2026-11-05',saat:'08:00'});
assert.deepStrictEqual({...t('hafta')},{tarih:'2026-11-11',saat:'08:00'});

/* 3) Bildirim: dokunuş / "Ertele" düğmesi → Takvim */
assert(adapter.includes("addEventListener('bildirimAcildi'")&&adapter.includes('KorukBekleyenHatirlatici')&&adapter.includes("'ka:hatirlatici-ac'"),'Bildirimden gelen hatırlatıcı hedefi takvime iletilmeli.');
assert(com.includes('function bekleyenHatirlaticiIsle(')&&com.includes("addEventListener('ka:hatirlatici-ac'")&&com.includes("b.islem==='ertele'"),'Takvim, bildirimden gelen hedefi işleyip Ertele penceresini açmalı.');
assert(main.includes('hatirlaticiId')&&main.includes('bekleyenIslem')&&main.includes('islem:'),'MainActivity hatırlatıcı kimliği ve işlemi uygulamaya iletmeli.');
assert(fcm.includes('CH_TAKVIM')&&fcm.includes('"Ertele"')&&fcm.includes('hatirlaticiId'),'Hatırlatıcı bildirimi kendi kanalında ve "Ertele" düğmesiyle gösterilmeli.');

/* 4) Sunucu: saat, yalnız sahibine gönderim, sabah 08:00 varsayılanı */
assert(server.includes("HATIRLATICI_VARSAYILAN_SAAT = '08:00'")&&server.includes('saat || HATIRLATICI_VARSAYILAN_SAAT'),'Saatsiz hatırlatıcı gece yarısı değil sabah 08:00\'de bildirilmeli.');
assert(server.includes('sahipUid: String(v.sahipUid')&&server.includes('t.uid === item.sahipUid'),'Hatırlatıcı bildirimi yalnız sahibinin cihazlarına gitmeli.');
assert(server.includes('veri.hatirlaticiId = item.docId'),'FCM verisi hatırlatıcı kimliğini taşımalı (Ertele için).');
assert(server.includes("'>=', ileriTarih(bugun, -GERIYE_GUN)"),'Eski kayıtlar limiti doldurup yeni hatırlatıcıları gölgelememeli.');
assert(server.includes('item.hatirlatici && !hedefTokenlar.length')&&/continue;/.test(server),'Alıcı cihaz yoksa hatırlatıcı gönderildi sayılmamalı.');

/* 5) Stil + önbellek */
for(const c of ['.ka-cal-actions{','.ka-snooze__options{','.ka-modal__footer .ka-btn--start{'])assert(base.includes(c),c+' tanımlı olmalı.');
assert(!ds.includes('.ka-snooze__options{')&&!ds.includes('.ka-cal-actions{'),'Bu kurallar yalnız tabanda tanımlı olmalı (çift tanım yok).');
const baseV=Number(ds.match(/design-system-base\.css\?v=(\d+)/)[1]);assert(baseV>=1378,'Taban CSS sürümü artırılmalı.');
const cv=loader.match(/communication\.js\?v=(\d+)/)[1];assert(sw.includes('communication.js?v='+cv),'SW ve app-loader aynı communication sürümünü kullanmalı.');
assert(Number(sw.match(/const CACHE_ADI\s*=\s*'oy-cache-v(\d+)'/)[1])>=1470,'Önbellek sürümü artırılmalı.');
console.log('Takvim hatırlatıcı Sil/Saat/Ertele/bildirim sözleşmesi başarılı.');

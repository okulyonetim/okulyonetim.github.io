/* Firestore'a giden veri temizliği: boş / __x__ alan adları atılır (aksi halde yazma sonsuza dek hata verip kuyrukta takılır);
   kalıcı hata veren işlem kuyruktan kaldırılır. */
const fs=require('fs'),assert=require('assert');
const core=fs.readFileSync('js/core/core.js','utf8');
const m=core.match(/function firestoreSafeValue\(value,seen=new WeakSet\(\)\)\{[\s\S]*?\n/);
assert(m,'firestoreSafeValue bulunamadı');
const safe=new Function(m[0]+';return firestoreSafeValue;')();
const eq=(a,b,msg)=>assert.strictEqual(JSON.stringify(a),JSON.stringify(b),msg);

/* eski BEP formu: boş kimlikli bir girdi `fields[""]` anahtarı üretmişti */
eq(safe({schema:'v1',fields:{'bep-name':'Ali','':'x','bep-no':'12'},hedefler:[{'':1,a:2}]}),{schema:'v1',fields:{'bep-name':'Ali','bep-no':'12'},hedefler:[{a:2}]},'boş alan adı atılır, diğer alanlar yazılır');
eq(safe({__reserved__:1,ok:2,iç:{__x__:3,y:4}}),{ok:2,iç:{y:4}},'__x__ biçimli ayrılmış alan adları atılır');
eq(safe({a:undefined,b:null,c:[undefined,1]}),{b:null,c:[null,1]},'undefined atılır, dizide null olur');
eq(safe({'__a':1,'b__':2,'_':3}),{'__a':1,'b__':2,'_':3},'yalnız tam __x__ biçimi ayrılmıştır');

/* kalıcı hatalar (izin ya da geçersiz veri) 3 denemeden sonra kuyruktan kaldırılır */
assert(/BAD_DATA_ERROR=\/called with invalid data\|invalid-argument/.test(core),'geçersiz veri hatası tanımı');
assert(/\(PERM_ERROR\.test\(op\.lastError\)\|\|BAD_DATA_ERROR\.test\(op\.lastError\)\)&&op\.tries>=MAX_PERM_TRIES/.test(core),'geçersiz veri hatası da kuyruktan kaldırılır');
console.log('firestore-safe-value testi geçti');

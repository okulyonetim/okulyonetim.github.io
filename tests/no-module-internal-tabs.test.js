const fs=require('fs');
const assert=require('assert');
const files=['people','academic','management','communication','transport','documents','tools','settings'].map(x=>`js/modules/${x}.js`);
for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  assert(!/data-(?:people|academic|management|communication|transport|documents|tools|settings)-tab\b/.test(src),`${file}: modül içi ikinci navigasyon data-*-tab ile geri dönmemeli.`);
  assert(!/<div class=["']ka-tabs["']/.test(src),`${file}: top-level ka-tabs navigasyonu geri dönmemeli.`);
}
console.log('Tüm ana modüller tek-sayfa yönlendirme standardında; iç sekme navigasyonu yok.');
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'js/modules/transport.js'),'utf8');

test('transport hydrates and observes duty holiday data locally',()=>{
  assert.match(source,/servisOturma:COL\.servisOturma,sinifOturma:COL\.sinifOturma,resmiTatiller:COL\.resmiTatiller/);
  assert.match(source,/\['data\.servisler','data\.veliler','data\.siniflar','data\.servisOturma','data\.sinifOturma','data\.resmiTatiller'\]/);
});

test('monthly transport report uses the same canonical holiday matcher as duty',()=>{
  const matcher="global.NobetService?.tatilMi?.(list,iso)||list.find(x=>x.tarih===iso)";
  assert.equal(source.split(matcher).length-1,2);
  assert.match(source,/h=!weekend&&holiday\(dateIso\(y,m,d\)\)/);
  assert.match(source,/trp-holiday/);
});

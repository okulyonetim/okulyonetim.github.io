const assert=require('assert');
const fs=require('fs');
const source=fs.readFileSync('js/core/role-permission-catalog.js','utf8');
for(const key of [
  'food.menu',
  'food.menu.create',
  'food.menu.edit',
  'food.menu.delete',
  'food.audit',
  'food.audit.edit'
]){
  assert(source.includes(`'${key}'`),`Yemek permission eksik: ${key}`);
}
assert(source.includes("'food.menu.create':['yemek','yemekMenusu']"),'Yemek ekleme legacy alias eksik.');
assert(source.includes("'food.menu.delete':['yemek','yemekMenusu']"),'Yemek silme legacy alias eksik.');
console.log('food-menu-permissions: OK');

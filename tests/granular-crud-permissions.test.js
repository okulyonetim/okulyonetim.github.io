/* Granular öğrenci/sınıf CRUD permission smoke tests. */
const fs=require('fs');
const bridge=fs.readFileSync('js/core/role-permission-bridge.js','utf8');
const guards=fs.readFileSync('js/core/role-permission-crud-guards.js','utf8');
const catalog=fs.readFileSync('js/core/role-permission-catalog.js','utf8');
for(const key of ['people.students.create','people.students.edit','people.students.delete','people.classes.create','people.classes.edit','people.classes.delete']){
  if(!catalog.includes(`key:'${key}'`)&&!catalog.includes(`key: '${key}'`))throw new Error(`Missing permission: ${key}`);
}
for(const token of ['people.students.create','people.students.edit','people.students.delete','people.classes.create','people.classes.edit','people.classes.delete']){
  if(!guards.includes(token))throw new Error(`CRUD guard missing: ${token}`);
}
if(!bridge.includes('role-permission-crud-guards.js'))throw new Error('CRUD guard bridge missing');
console.log('granular-crud-permissions: OK');
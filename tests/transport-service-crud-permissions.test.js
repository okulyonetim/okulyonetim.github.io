const fs=require('fs');
const catalog=fs.readFileSync('js/core/role-permission-catalog.js','utf8');
const guards=fs.readFileSync('js/core/role-permission-crud-guards.js','utf8');
for(const key of ['transport.services','transport.services.create','transport.services.edit','transport.services.delete','transport.seating','transport.seating.edit']){
  if(!catalog.includes(`'${key}'`))throw new Error(`Missing permission: ${key}`);
}
if(!guards.includes("transport.servisKaydet"))throw new Error('Transport save guard missing');
if(!guards.includes("transport.services.create"))throw new Error('Transport create guard missing');
if(!guards.includes("transport.services.edit"))throw new Error('Transport edit guard missing');
if(!guards.includes("transport.servisSil"))throw new Error('Transport delete guard missing');
if(!guards.includes("transport.services.delete"))throw new Error('Transport delete guard missing');
console.log('transport-service-crud-permissions: OK');

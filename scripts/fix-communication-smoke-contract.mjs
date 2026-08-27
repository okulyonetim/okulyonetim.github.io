import fs from 'node:fs';
const p='tests/module-bundles-smoke.test.js';
let s=fs.readFileSync(p,'utf8');
const old='"duyuruSil(id){try{requireEdit(\'duyurular\')}"';
const next='"async duyuruSil(id,resimler=[]){try{requireEdit(\'duyurular\')}"';
if(!s.includes(old))throw new Error('Eski duyuruSil smoke sözleşmesi bulunamadı');
s=s.replace(old,next);
fs.writeFileSync(p,s);
console.log('Communication smoke sözleşmesi güncel production imzasına taşındı.');

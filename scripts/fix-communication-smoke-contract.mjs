import fs from 'node:fs';
const p='tests/module-bundles-smoke.test.js';
let s=fs.readFileSync(p,'utf8');
const replacements=[
  ['"duyuruSil(id){try{requireEdit(\'duyurular\')}"','"async duyuruSil(id,resimler=[]){try{requireEdit(\'duyurular\')}"','duyuruSil'],
  ["source.communication.includes(\"oyVer(a,ids){const oylar=\")","source.communication.includes(\"oyVer(a,ids){const ben=user(),oylar=\")",'oyVer']
];
for(const [old,next,name] of replacements){if(!s.includes(old))throw new Error(`Eski ${name} smoke sözleşmesi bulunamadı`);s=s.replace(old,next)}
fs.writeFileSync(p,s);
console.log('Communication smoke sözleşmeleri güncel production imzalarına taşındı.');

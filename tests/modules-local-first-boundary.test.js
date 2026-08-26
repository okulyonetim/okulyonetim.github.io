const fs=require('fs');
const path=require('path');
const assert=require('assert');

const ROOT=path.join('js','modules');
const files=[];
function walk(dir){
  for(const name of fs.readdirSync(dir)){
    const p=path.join(dir,name),st=fs.statSync(p);
    if(st.isDirectory())walk(p);
    else if(st.isFile()&&p.endsWith('.js'))files.push(p);
  }
}
walk(ROOT);

const violations=[];
for(const file of files){
  const src=fs.readFileSync(file,'utf8');
  if(/\bdb\s*\.\s*collection\s*\(/.test(src)||/firebase\s*\.\s*firestore\s*\(/.test(src)){
    violations.push(`${file}: doğrudan Firestore erişimi`);
  }
  if(/localStorage\s*\.\s*setItem\s*\(/.test(src)){
    violations.push(`${file}: kalıcı localStorage yazımı`);
  }
}

assert.deepStrictEqual(violations,[],`V2 modül sınırı ihlal edildi:\n${violations.join('\n')}\nUI/modül katmanı AppStore/DeviceData/SyncEngine servis hattını kullanmalı.`);
console.log(`V2 module local-first boundary başarılı (${files.length} modül tarandı).`);

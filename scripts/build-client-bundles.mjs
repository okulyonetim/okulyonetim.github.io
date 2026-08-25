import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT=process.cwd();
const OUT=path.join(ROOT,'dist','js');
const bundles={
  'data.js':['js/core/repositories/nobet.repository.js','js/core/services/nobet.service.js','js/modules/people-data.js','js/modules/settings-data.js','js/modules/academic-data.js','js/modules/management-data.js','js/modules/messaging-data.js','js/modules/communication-data.js','js/modules/transport-data.js','js/modules/documents-data.js'],
  'dashboard.js':['js/modules/dashboard.js'],
  'people.js':['js/modules/people.js'],
  'academic.js':['js/deneme-sinavlari-stability.js','js/modules/academic.js'],
  'management.js':['js/modules/management.js'],
  'communication.js':['js/modules/communication.js'],
  'transport.js':['js/modules/transport.js'],
  'documents.js':['js/modules/documents.js'],
  'settings.js':['js/modules/settings.js']
};
function read(rel){const file=path.join(ROOT,rel);if(!fs.existsSync(file))throw new Error(`Eksik bundle kaynağı: ${rel}`);return fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')}
function hash(text){return crypto.createHash('sha256').update(text).digest('hex').slice(0,12)}
function section(rel,source){return `\n/* ===== SOURCE: ${rel} ===== */\n${source.trim()}\n;\n`}
fs.rmSync(OUT,{recursive:true,force:true});fs.mkdirSync(OUT,{recursive:true});
const manifest={version:9,generatedAt:new Date().toISOString(),bundles:{}};
for(const [name,sources] of Object.entries(bundles)){const body=`/* Koruk Asistan v2 generated bundle: ${name}. Kaynak dosyaları düzenleyin; bu dosyayı elle düzenlemeyin. */\n`+sources.map(rel=>section(rel,read(rel))).join('');fs.writeFileSync(path.join(OUT,name),body,'utf8');manifest.bundles[name]={sources,bytes:Buffer.byteLength(body),sha256:hash(body)}}
fs.writeFileSync(path.join(OUT,'manifest.json'),JSON.stringify(manifest,null,2)+'\n','utf8');
console.log('Koruk v2 bundle çıktıları oluşturuldu:');for(const [name,meta] of Object.entries(manifest.bundles))console.log(`- ${name}: ${meta.sources.length} kaynak, ${meta.bytes} bayt, ${meta.sha256}`);

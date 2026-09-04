import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const testsDir=path.join(root,'tests');
const files=fs.readdirSync(testsDir).filter(name=>name.endsWith('.test.js')).sort();
const client=[];
const emulator=[];
for(const name of files){
  const file=path.join(testsDir,name);
  const source=fs.readFileSync(file,'utf8');
  if(source.includes('@firebase/rules-unit-testing'))emulator.push(name);
  else client.push(name);
}
let failed=0;
for(const name of client){
  const rel=path.join('tests',name);
  const run=spawnSync(process.execPath,[rel],{cwd:root,encoding:'utf8'});
  if(run.status===0){
    process.stdout.write(`✓ ${rel}\n`);
  }else{
    failed++;
    process.stderr.write(`\n✗ ${rel}\n${run.stdout||''}${run.stderr||''}\n`);
  }
}
console.log(`Client regression summary: total=${client.length} passed=${client.length-failed} failed=${failed} emulator-skipped=${emulator.length}`);
if(emulator.length)console.log(`Firebase emulator suite ayrı workflow tarafından çalıştırılır: ${emulator.length} test.`);
if(failed)process.exit(1);

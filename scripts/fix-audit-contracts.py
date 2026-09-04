from pathlib import Path
import re


def add_helper(text):
    marker="require('./helpers/version-contract')"
    if marker in text:
        return text
    lines=text.splitlines()
    for i,line in enumerate(lines):
        if line.startswith('const assert=') or line.startswith('const assert ='):
            lines.insert(i+1,"const {cacheVersion,assetVersion}=require('./helpers/version-contract');")
            return '\n'.join(lines)+'\n'
    raise SystemExit('assert require line not found while adding version helper')


helper=Path('tests/helpers/version-contract.js')
helper.parent.mkdir(parents=True,exist_ok=True)
helper.write_text(r'''const assert=require('assert');

function escapeRegex(value){
  return String(value).replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
}
function cacheVersion(source){
  const match=String(source||'').match(/const CACHE_ADI\s*=\s*['"]oy-cache-v(\d+)['"]/);
  return match?Number(match[1]):0;
}
function assetVersion(source,asset){
  const normalized=String(asset||'').replace(/^\.\//,'');
  const match=String(source||'').match(new RegExp(`(?:\\.\\/)?${escapeRegex(normalized)}\\?v=(\\d+)`));
  return match?Number(match[1]):0;
}
function assertVersionAtLeast(actual,minimum,label){
  assert(Number(actual)>=Number(minimum),`${label}: beklenen >= v${minimum}, bulunan v${actual||0}`);
}
module.exports={cacheVersion,assetVersion,assertVersionAtLeast};
''',encoding='utf-8')

asset_pat=re.compile(r'''(\b[A-Za-z_$][\w$]*)\.includes\((["'])(["']?)(\.?/?[A-Za-z0-9_./-]+\.(?:js|css))\?v=(\d+)\3\2\)''')
cache_pat=re.compile(r'''(\b[A-Za-z_$][\w$]*)\.includes\((["'])(?:const\s+)?CACHE_ADI='oy-cache-v(\d+)';?\2\)''')
cache_simple=re.compile(r'''(\b[A-Za-z_$][\w$]*)\.includes\((["'])oy-cache-v(\d+)\2\)''')
script_src_pat=re.compile(r'''(\b[A-Za-z_$][\w$]*)\.includes\((["'])script\.src='([A-Za-z0-9_./-]+\.(?:js|css))\?v=(\d+)'\2\)''')


def asset_repl(m):
    var,outer,inner,path,version=m.groups()
    path=path[2:] if path.startswith('./') else path
    return f"assetVersion({var},'{path}')>={version}"


changed_files=[]
for p in sorted(Path('tests').glob('*.test.js')):
    text=p.read_text(encoding='utf-8')
    original=text
    text=asset_pat.sub(asset_repl,text)
    text=cache_pat.sub(lambda m:f"cacheVersion({m.group(1)})>={m.group(3)}",text)
    text=cache_simple.sub(lambda m:f"cacheVersion({m.group(1)})>={m.group(3)}",text)
    text=script_src_pat.sub(lambda m:f"assetVersion({m.group(1)},'{m.group(3)[2:] if m.group(3).startswith('./') else m.group(3)}')>={m.group(4)}",text)
    if text!=original:
        text=add_helper(text)
        p.write_text(text,encoding='utf-8')
        changed_files.append(str(p))


def replace_once(path,old,new):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    count=text.count(old)
    if count!=1:
        raise SystemExit(f'{path}: expected one match, found {count}: {old}')
    p.write_text(text.replace(old,new),encoding='utf-8')


replace_once(
 'tests/teacher-access-results-duty.test.js',
 'loader.includes("define(\'settings\',[\'js/modules/settings.js?v=878\'])")',
 "assetVersion(loader,'js/modules/settings.js')>=878"
)
replace_once(
 'tests/transport-seating-classic-parity.test.js',
 'assert(loader.includes("define(\'transport\',[\'js/modules/report-engine.js\',\'js/modules/transport.js?v=892\'])"),\'Transport canonical lazy-loader sözleşmesini korumalı.\');',
 '''const transportBundle=String(loader.match(/define\('transport',\[([^\]]+)\]\)/)?.[1]||'').replace(/\?v=\d+/g,'');
assert(transportBundle.includes("'js/modules/report-engine.js'")&&transportBundle.includes("'js/modules/transport.js'")&&transportBundle.indexOf("'js/modules/report-engine.js'")<transportBundle.indexOf("'js/modules/transport.js'")&&assetVersion(loader,'js/modules/transport.js')>=892,'Transport canonical lazy-loader sırası ve asgari sürümü korunmalı.');'''
)
replace_once(
 'tests/transport-seating-editor-actions.test.js',
 'loader.includes("define(\'transport\',[\'js/modules/report-engine.js\',\'js/modules/transport.js?v=892\'])")',
 "(loader.includes(\"'js/modules/report-engine.js'\")&&assetVersion(loader,'js/modules/transport.js')>=892)"
)
replace_once(
 'tests/classic-shell-v2-smoke.test.js',
 "const transportBundle=optionalLoaderSource.match(/define\\('transport',\\[([^\\]]+)\\]\\)/)?.[1]||'';",
 "const transportBundle=normalizeLoaderBundle(optionalLoaderSource.match(/define\\('transport',\\[([^\\]]+)\\]\\)/)?.[1]||'');"
)
replace_once(
 'tests/report-native-print-routing-smoke.test.js',
 "const transportBundle=loader.match(/define\\('transport',\\[([^\\]]+)\\]\\)/)?.[1]||'';",
 "const transportBundle=String(loader.match(/define\\('transport',\\[([^\\]]+)\\]\\)/)?.[1]||'').replace(/\\?v=\\d+/g,'');"
)

runner=Path('scripts/run-client-tests.mjs')
runner.write_text(r'''import fs from 'node:fs';
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
''',encoding='utf-8')

workflow=Path('.github/workflows/client-architecture.yml')
text=workflow.read_text(encoding='utf-8')
anchor="      - name: Audit client architecture\n        run: node scripts/check-client-architecture.mjs\n"
step="      - name: Run complete client regression suite\n        run: node scripts/run-client-tests.mjs\n"
if step not in text:
    if anchor not in text:
        raise SystemExit('client architecture insertion anchor missing')
    text=text.replace(anchor,step+anchor,1)
    workflow.write_text(text,encoding='utf-8')

print(f'Generic version-contract upgrades: {len(changed_files)} test files')
for f in changed_files:
    print(' -',f)

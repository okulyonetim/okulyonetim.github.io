import assert from 'node:assert/strict';
import {SYSTEM_PROMPT,isOfficialUrl,extractOutputText,collectSources,buildUserInput,normalizeMessages} from '../src/index.js';

assert(SYSTEM_PROMPT.includes('güncel, doğru, ayrıntılı ve kolay anlaşılır'));
assert(SYSTEM_PROMPT.includes('Resmî Gazete'));
assert(SYSTEM_PROMPT.includes('Okul yönetiminde uygulama'));
assert(SYSTEM_PROMPT.includes('hemen “bilmiyorum” deme'));
assert.equal(isOfficialUrl('https://www.meb.gov.tr/a'),true);
assert.equal(isOfficialUrl('https://mevzuat.gov.tr/a'),true);
assert.equal(isOfficialUrl('https://example.com/a'),false);

const mock={output:[
  {type:'web_search_call',action:{sources:[
    {url:'https://www.meb.gov.tr/test',title:'MEB'},
    {url:'https://example.com/blog',title:'Blog'}
  ]}},
  {type:'message',content:[{type:'output_text',text:'Ayrıntılı cevap',annotations:[
    {type:'url_citation',url:'https://www.resmigazete.gov.tr/test',title:'Resmî Gazete'}
  ]}]}
]};
assert.equal(extractOutputText(mock),'Ayrıntılı cevap');
assert.equal(collectSources(mock).length,2);

const built=buildUserInput({messages:[{role:'user',text:'Nöbet görevi nedir?'}],context:'MADDE 1 - ...'});
assert.equal(built.question,'Nöbet görevi nedir?');
assert(built.text.includes('YEREL MEVZUAT ARŞİVİNDEN GETİRİLEN BAĞLAM'));
assert(built.text.includes('güncel resmî kaynaklarda doğrula'));

const history=normalizeMessages([
  {role:'user',text:'İlk soru'},
  {role:'model',text:'İlk cevap'},
  {role:'user',text:'Devam sorusu'}
]);
assert.deepEqual(history.map(x=>x.role),['user','assistant','user']);

console.log('Mevzuat AI Worker resmî kaynak + ayrıntılı cevap sözleşmesi başarılı.');

from pathlib import Path


def replace(path, old, new):
    p=Path(path)
    text=p.read_text(encoding='utf-8')
    if old not in text:
        raise SystemExit(f'pattern not found in {path}: {old[:120]}')
    p.write_text(text.replace(old,new),encoding='utf-8')

academic='js/modules/academic.js'
old="""function ssNum(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function ssPuanTuru(sonuc,sinav){return String(sonuc?.puanTuru||sinav?.puanTuru||'').trim().toUpperCase()}
function ssLgsPuani(sonuc,sinav){return ssNum(sonuc?.lgsPuani??sonuc?.lgsPuan??(ssPuanTuru(sonuc,sinav)==='LGS'?sonuc?.puan:null))}
function ssFmt(v,d=2)=>"""
# The final function token is used only to guard accidental partial matching below.
text=Path(academic).read_text(encoding='utf-8')
needle="""function ssNum(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function ssPuanTuru(sonuc,sinav){return String(sonuc?.puanTuru||sinav?.puanTuru||'').trim().toUpperCase()}
function ssLgsPuani(sonuc,sinav){return ssNum(sonuc?.lgsPuani??sonuc?.lgsPuan??(ssPuanTuru(sonuc,sinav)==='LGS'?sonuc?.puan:null))}
"""
replacement="""function ssNum(v){if(v===null||v===undefined||v==='')return null;const n=Number(v);return Number.isFinite(n)?n:null}
function ssPuanTuru(sonuc,sinav){return String(sonuc?.puanTuru||sinav?.puanTuru||'').trim().toUpperCase()}
const SS_LGS_RULES=Object.freeze({turkce:4.1820,matematik:4.9812,fen:3.8347,inkilap:1.6816,din:1.9259,yabanci:1.6157});
const SS_LGS_BASE=187.8131;
function ssLgsLessonId(raw){const n=String(raw||'').toLocaleLowerCase('tr').normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').replace(/ı/g,'i').replace(/[^a-z0-9]/g,'');const m=n.match(/^answers?(\\d+)$/),i=m?Number(m[1]):0;if(i===1)return'turkce';if(i===2)return'inkilap';if(i===3)return'din';if(i===4)return'yabanci';if(i===5)return'matematik';if(i===6)return'fen';if(n.includes('turk'))return'turkce';if(n==='mat'||n.includes('matematik'))return'matematik';if(n==='fen'||n.includes('fenbil'))return'fen';if(n.includes('inkilap')||n.includes('ataturk'))return'inkilap';if(n==='din'||n.includes('dinkultur'))return'din';if(n.includes('yabanci')||n.includes('ingiliz')||n.includes('foreign'))return'yabanci';return null}
function ssLgsLessonNet(x,sinav){const n=ssNum(x?.net);if(n!=null)return n;const d=ssNum(x?.dogru)||0,y=ssNum(x?.yanlis)||0,k=ssNum(sinav?.yanlisKatsayisi);return k&&k>0?d-y/k:d-y/3}
function ssEstimatedLgs(sonuc,sinav){const ds=sonuc?.dersSonuclari;if(!ds||typeof ds!=='object')return null;const nets={};for(const[name,x]of Object.entries(ds)){const id=ssLgsLessonId(name);if(id)nets[id]=ssLgsLessonNet(x,sinav)}if(Object.keys(SS_LGS_RULES).some(k=>ssNum(nets[k])==null))return null;const score=SS_LGS_BASE+Object.entries(SS_LGS_RULES).reduce((s,[k,c])=>s+nets[k]*c,0);return Math.max(100,Math.min(500,score))}
function ssLgsPuani(sonuc,sinav){const direct=ssNum(sonuc?.lgsPuani??sonuc?.lgsPuan??(ssPuanTuru(sonuc,sinav)==='LGS'?sonuc?.puan:null));return direct!=null?direct:ssEstimatedLgs(sonuc,sinav)}
"""
if needle not in text:
    raise SystemExit('academic LGS resolver block not found')
Path(academic).write_text(text.replace(needle,replacement),encoding='utf-8')

replace('js/app-loader.js',"js/modules/academic.js?v=881","js/modules/academic.js?v=882")
replace('index.html','js/app-loader.js?v=899','js/app-loader.js?v=900')
replace('service-worker.js',"const CACHE_ADI='oy-cache-v928';","const CACHE_ADI='oy-cache-v929';")
replace('service-worker.js','./js/app-loader.js?v=899','./js/app-loader.js?v=900')
replace('service-worker.js','./js/modules/academic.js?v=881','./js/modules/academic.js?v=882')
replace('tests/academic-separate-pages.test.js','js/modules/academic.js?v=881','js/modules/academic.js?v=882')
replace('tests/exam-lgs-result-ranking.test.js',"assert(academic.includes('sonuc?.lgsPuani??sonuc?.lgsPuan')&&academic.includes(\"ssPuanTuru(sonuc,sinav)==='LGS'?sonuc?.puan:null\"),'LGS puanı OMR alias alanlarından ve LGS puan fallbackinden okunmalı.');", "assert(academic.includes('sonuc?.lgsPuani??sonuc?.lgsPuan')&&academic.includes(\"ssPuanTuru(sonuc,sinav)==='LGS'?sonuc?.puan:null\"),'LGS puanı OMR alias alanlarından ve LGS puan fallbackinden okunmalı.');\nassert(academic.includes('const SS_LGS_RULES=Object.freeze({turkce:4.1820,matematik:4.9812,fen:3.8347,inkilap:1.6816,din:1.9259,yabanci:1.6157})'),'Academic rapor Optik Okuyucu ile aynı 2026 referans katsayılarını kullanmalı.');\nassert(academic.includes('const SS_LGS_BASE=187.8131')&&academic.includes('return direct!=null?direct:ssEstimatedLgs(sonuc,sinav)'),'Eski puansız deneme kaydı raporda ders netlerinden LGS fallback hesaplamalı.');\nassert(academic.includes('Math.max(100,Math.min(500,score))'),'Tahmini LGS puanı 100-500 aralığında tutulmalı.');")
replace('tests/exam-lgs-result-ranking.test.js','js/modules/academic.js?v=881','js/modules/academic.js?v=882')
replace('tests/exam-lgs-result-ranking.test.js','js/app-loader.js?v=899','js/app-loader.js?v=900')
replace('tests/exam-lgs-result-ranking.test.js',"const CACHE_ADI='oy-cache-v928';","const CACHE_ADI='oy-cache-v929';")

# Add a numeric fixture test derived from the exact visible report values in the regression case.
fixture=Path('tests/exam-lgs-report-fallback-fixture.test.js')
fixture.write_text("""const assert=require('assert');
const RULES={turkce:4.1820,matematik:4.9812,fen:3.8347,inkilap:1.6816,din:1.9259,yabanci:1.6157};
const BASE=187.8131;
function score(nets){return Math.max(100,Math.min(500,BASE+Object.entries(RULES).reduce((s,[k,c])=>s+nets[k]*c,0)))}
const ayse=score({turkce:15-4/3,inkilap:0-3/3,din:7-3/3,yabanci:8-2/3,matematik:5-4/3,fen:2-2/3});
const berat=score({turkce:2-5/3,inkilap:0-5/3,din:0-1/3,yabanci:1-2/3,matematik:1-3/3,fen:2-2/3});
assert(Math.abs(ayse-290.0667)<0.0002,`Ayşe fallback LGS beklenmeyen değer: ${ayse}`);
assert(Math.abs(berat-191.4139666667)<0.0002,`Berat fallback LGS beklenmeyen değer: ${berat}`);
assert(ayse>berat,'LGS puanı yüksek öğrenci raporda önce gelmeli.');
console.log('Eski deneme kaydı LGS fallback fixture başarılı.');
""",encoding='utf-8')

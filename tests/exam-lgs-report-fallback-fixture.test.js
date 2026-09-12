const assert=require('assert');
const RULES={turkce:4.1820,matematik:4.9812,fen:3.8347,inkilap:1.6816,din:1.9259,yabanci:1.6157};
const BASE=187.8131;
function score(nets){return Math.max(100,Math.min(500,BASE+Object.entries(RULES).reduce((s,[k,c])=>s+nets[k]*c,0)))}
const ayse=score({turkce:15-4/3,inkilap:0-3/3,din:7-3/3,yabanci:8-2/3,matematik:5-4/3,fen:2-2/3});
const berat=score({turkce:2-5/3,inkilap:0-5/3,din:0-1/3,yabanci:1-2/3,matematik:1-3/3,fen:2-2/3});
assert(Math.abs(ayse-290.0667)<0.0002,`Ayşe fallback LGS beklenmeyen değer: ${ayse}`);
assert(Math.abs(berat-191.4139666667)<0.0002,`Berat fallback LGS beklenmeyen değer: ${berat}`);
assert(ayse>berat,'LGS puanı yüksek öğrenci raporda önce gelmeli.');
console.log('Eski deneme kaydı LGS fallback fixture başarılı.');

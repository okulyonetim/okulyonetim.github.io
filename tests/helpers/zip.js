/* Test yardımcısı: bağımlılıksız küçük zip okuyucu/yazıcı (yalnız stored ve deflate). */
const zlib=require('zlib');
function oku(buf){
 let e=buf.length-22;while(e>=0&&buf.readUInt32LE(e)!==0x06054b50)e--;
 if(e<0)throw new Error('Zip bitiş kaydı bulunamadı.');
 const adet=buf.readUInt16LE(e+10);let p=buf.readUInt32LE(e+16);const out={};
 for(let i=0;i<adet;i++){
  const yontem=buf.readUInt16LE(p+10),boyut=buf.readUInt32LE(p+20),ad=buf.toString('utf8',p+46,p+46+buf.readUInt16LE(p+28)),yerel=buf.readUInt32LE(p+42);
  p+=46+buf.readUInt16LE(p+28)+buf.readUInt16LE(p+30)+buf.readUInt16LE(p+32);
  const bas=yerel+30+buf.readUInt16LE(yerel+26)+buf.readUInt16LE(yerel+28),ham=buf.subarray(bas,bas+boyut);
  out[ad]=yontem===8?zlib.inflateRawSync(ham):ham;
 }
 return out;
}
module.exports={oku};

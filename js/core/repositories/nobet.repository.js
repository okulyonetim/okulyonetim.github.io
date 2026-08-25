/* Koruk Asistan — Nöbet Repository (device-first)
 * Nöbet verileri AppStore/IndexedDB'de yaşar; Firestore yalnız Core queue/sync arka planıdır.
 * Excel/rotasyon servis sözleşmesi için batch yardımcıları korunur.
 */
(function(global){
'use strict';
function device(){if(!global.DeviceData)throw new Error('DeviceData hazır değil');return global.DeviceData;}
function arr(type){const v=global.AppStore?.data?.(type);return Array.isArray(v)?v:[];}
function listen(type,cb){return device().listen(type,cb);}
function add(type,col,v){return device().add(type,col,v);}
function update(type,col,id,v){return device().update(type,col,id,v);}
function remove(type,col,id){return device().remove(type,col,id);}
function batch(){return{ops:[],delete(ref){const path=String(ref?.path||'');const p=path.split('/');if(p.length>=2)this.ops.push({kind:'delete-path',collection:p[p.length-2],id:p[p.length-1]});}};}
function pushSet(b,type,collection,data,id){const docId=id||device().newId();b.ops.push({kind:'set',type,collection,id:docId,data});return docId;}
function pushRemove(b,type,collection,id){b.ops.push({kind:'remove',type,collection,id});}
async function commit(b){for(const op of b?.ops||[]){if(op.kind==='set')await device().set(op.type,op.collection,op.id,op.data,{merge:false});else if(op.kind==='remove')await device().remove(op.type,op.collection,op.id);else if(op.kind==='delete-path'){const map={[COL.nobetYerleri]:'nobetYerleri',[COL.nobetAtamalari]:'nobetAtamalari',[COL.nobetciAmirleri]:'nobetciAmirleri',[COL.resmiTatiller]:'resmiTatiller',[COL.nobetRotasyon]:'nobetRotasyon'},type=map[op.collection];if(type)await device().remove(type,op.collection,op.id);}}return true;}
const NobetRepository={
  yerleriDinle(cb){return listen('nobetYerleri',cb);},yerEkle(v){return add('nobetYerleri',COL.nobetYerleri,v);},yerGuncelle(id,v){return update('nobetYerleri',COL.nobetYerleri,id,v);},yerSil(id){return remove('nobetYerleri',COL.nobetYerleri,id);},
  atamalariDinle(cb){return listen('nobetAtamalari',cb);},atamaEkle(v){return add('nobetAtamalari',COL.nobetAtamalari,v);},atamaGuncelle(id,v){return update('nobetAtamalari',COL.nobetAtamalari,id,v);},atamaSil(id){return remove('nobetAtamalari',COL.nobetAtamalari,id);},
  async atamalariOncesiGetir(tarihISO){const rows=arr('nobetAtamalari').filter(a=>String(a.tarih||'')<tarihISO);return{docs:rows.map(r=>({id:r.id,data:()=>r}))};},
  amirleriDinle(cb){return listen('nobetciAmirleri',cb);},amirEkle(v){return add('nobetciAmirleri',COL.nobetciAmirleri,v);},amirGuncelle(id,v){return update('nobetciAmirleri',COL.nobetciAmirleri,id,v);},amirSil(id){return remove('nobetciAmirleri',COL.nobetciAmirleri,id);},
  tatilleriDinle(cb){return listen('resmiTatiller',cb);},tatilEkle(v){return add('resmiTatiller',COL.resmiTatiller,v);},tatilSil(id){return remove('resmiTatiller',COL.resmiTatiller,id);},
  rotasyonDinle(cb){return listen('nobetRotasyon',rows=>cb(rows.find(x=>x.id==='sablon')||null));},rotasyonKaydet(v){return device().set('nobetRotasyon',COL.nobetRotasyon,'sablon',v,{merge:false});},
  yeniBatch(){return batch();},
  batchAtamaSil(b,id){pushRemove(b,'nobetAtamalari',COL.nobetAtamalari,id);},
  batchAtamaYaz(b,v,id){return pushSet(b,'nobetAtamalari',COL.nobetAtamalari,v,id);},
  batchAmirYaz(b,v,id){return pushSet(b,'nobetciAmirleri',COL.nobetciAmirleri,v,id);},
  batchAmirSil(b,id){pushRemove(b,'nobetciAmirleri',COL.nobetciAmirleri,id);},
  batchYeriYaz(b,v,id){return pushSet(b,'nobetYerleri',COL.nobetYerleri,v,id);},
  batchYeriSil(b,id){pushRemove(b,'nobetYerleri',COL.nobetYerleri,id);},
  batchCommit(b){return commit(b);}
};
global.NobetRepository=NobetRepository;
})(window);

const fs=require('fs'),assert=require('assert'),vm=require('vm');
const src=fs.readFileSync('js/modules/payroll-change.js','utf8');

/* Öğretmen kayıtları TC'yi `tcKimlikNo` alanında tutar (people.js / people-directory.js); personel kayıtları `tc` alanında.
 * Maaş Değişikliği formu seçilen kişinin TC'sini her iki kayıt türünden de almalı. */
function yukle(veri){
  const win={AppStore:{data:t=>veri[t]||[]},toast(){},addEventListener(){}};win.window=win;
  vm.runInContext(src,vm.createContext({window:win,console,Date,String,Array,Number,Math,JSON,Object,RegExp,Set,Map,requestAnimationFrame:()=>{},document:{}}));
  return win.PayrollChangeModule;
}
function ekle(M,secim){
  let btn;const root={innerHTML:'',
    querySelector:s=>s.startsWith('[data-payroll-picker')?{value:secim}:null,
    querySelectorAll:s=>{if(s==='[data-payroll-add-person]'){btn={dataset:{payrollAddPerson:'D'}};return[btn]}return[]}};
  M.reset();M.render(root);btn.onclick();
  return{kart:root.innerHTML,rapor:M.reportBody()};
}
const veri={
  ogretmenler:[{id:'t1',ad:'Ayşe',soyad:'Demir',unvan:'Sınıf Öğretmeni',tcKimlikNo:'10000000146'},{id:'t2',ad:'Eski',soyad:'Kayıt',tc:'20000000046'},{id:'t3',ad:'Boş',soyad:'Kimlik'}],
  personel:[{id:'p1',adSoyad:'Veli Yıldız',gorev:'Hizmetli',tc:'30000000046'}]
};

let M=yukle(veri),r=ekle(M,'o_t1');
assert(r.rapor.includes('10000000146'),'Seçilen öğretmenin tcKimlikNo bilgisi rapora gelmeli.');
assert(r.kart.includes('••••••0146'),'Öğretmen kartında TC (maskeli) görünmeli.');

r=ekle(yukle(veri),'o_t2');
assert(r.rapor.includes('20000000046'),'Eski `tc` alanı olan öğretmen kaydı da desteklenmeli.');

r=ekle(yukle(veri),'p_p1');
assert(r.rapor.includes('30000000046'),'Personelin TC bilgisi korunmalı.');

r=ekle(yukle(veri),'o_t3');
assert(r.kart.includes('TC: —'),'TC kaydı olmayan kişide boş gösterilmeli.');
console.log('ok');

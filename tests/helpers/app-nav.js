/* Testler için AppNav'ı tarayıcısız yükler: sahte pencere, cihaz deposu (localStorage) ve oturum kullanıcısı.
 * Menü kataloğunu kaynak metninden ayrıştırmak yerine AppNav.catalog() / defaultLayout() kullanın. */
const fs=require('fs');
const vm=require('vm');

function loadNav({store={},user={uid:'u1',admin:true},data={},extra={},source=null}={}){
  const ls=new Map(Object.entries(store));
  const calls={remote:[],toast:[],events:[]};
  const win={
    console,setTimeout:()=>0,clearTimeout(){},
    localStorage:{getItem:k=>ls.has(k)?ls.get(k):null,setItem:(k,v)=>ls.set(k,String(v)),removeItem:k=>ls.delete(k)},
    AppStore:{get:k=>k==='session.user'?user:undefined,data:t=>data[t]||[],subscribe:()=>()=>{}},
    KaPrefs:{remoteSet:v=>calls.remote.push(v)},
    toast:m=>calls.toast.push(m),
    addEventListener(){},dispatchEvent:e=>{calls.events.push(e);return true},CustomEvent:function(n,o){this.type=n;this.detail=o&&o.detail},
    document:{addEventListener(){},querySelectorAll:()=>[],getElementById:()=>null},
    ...extra
  };
  win.window=win;win.globalThis=win;
  vm.createContext(win);
  vm.runInContext(source??fs.readFileSync('js/core/app-nav.js','utf8'),win,{filename:'app-nav.js'});
  return{N:win.AppNav,ls,win,calls};
}

module.exports={loadNav};

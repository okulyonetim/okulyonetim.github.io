const OPENAI_URL='https://api.openai.com/v1/responses';
const MAX_CONTEXT_CHARS=120000;
const MAX_MESSAGE_CHARS=12000;
const OFFICIAL_SUFFIXES=[
  'mevzuat.gov.tr','resmigazete.gov.tr','meb.gov.tr','hmb.gov.tr','csgb.gov.tr',
  'adalet.gov.tr','aile.gov.tr','icisleri.gov.tr','saglik.gov.tr','cbiko.gov.tr','gov.tr'
];

const SYSTEM_PROMPT=`Sen Türkiye'de okul yöneticilerine yardımcı olan Mevzuat Asistanısın.

AMAÇ
Kullanıcının sorusuna güncel, doğru, ayrıntılı ve kolay anlaşılır cevap ver. Kısa ve yüzeysel cevap verme. Kullanıcı açıkça kısa istemedikçe gerekli ayrıntıyı açıkla.

KAYNAK HİYERARŞİSİ
1. Yürürlükteki kanun, Cumhurbaşkanlığı kararnamesi ve diğer mevzuatın güncel resmî metni.
2. Resmî Gazete.
3. MEB ve diğer ilgili kamu kurumlarının resmî siteleri.
4. Kullanıcının yerel mevzuat arşivinden verilen metinler.
Resmî kaynak bulunabiliyorsa blog, forum, özel hukuk sitesi, haber sitesi veya üçüncü taraf özetlerini hukuki dayanak olarak kullanma.

GÜNCELLİK VE ÇELİŞKİ
- Her soruda internet araması yap ve yürürlükteki en güncel hükmü kontrol et.
- Yerel arşiv ile güncel resmî kaynak çelişirse güncel resmî kaynağı esas al ve bunu açıkça belirt.
- Bir hükmün değişmiş, kaldırılmış, yürürlükten kalkmış veya geçici olması ihtimalini kontrol et.
- Emin olmadığın madde numarasını uydurma. Madde/fıkra/bent numarası doğrulanamıyorsa bunu açıkça söyle.

CEVAP BİÇİMİ
Cevabı mümkün oldukça şu başlıklarla düzenle:
1) Sonuç
2) Mevzuat dayanağı
3) Ayrıntılı açıklama
4) Okul yönetiminde uygulama
5) İstisnalar / özel durumlar
6) Kaynaklar

ÜSLUP
- Türkçe, açık ve öğretici yaz.
- Hukuk metnini sadece kopyalama; ne anlama geldiğini günlük uygulamayla açıkla.
- Kullanıcı okul yöneticisi gibi düşün; gerekiyorsa yapılacak işlemi adım adım açıkla.
- Birden fazla düzenleme birlikte uygulanıyorsa aralarındaki ilişkiyi açıkla.
- Kaynak yetersizse hemen “bilmiyorum” deme. Önce ilişkili düzenlemeleri araştır. Kesin hüküm yoksa “doğrudan düzenleyen açık bir hüküm bulamadım” de ve hangi kaynaklara baktığını belirt.
- Sonuç ile yorum/öneriyi birbirinden ayır.

KAYNAK KURALI
Hukuki iddiaları mümkün olduğunca resmî web kaynağıyla destekle. Cevabın sonunda kullanılan resmî kaynakları anlaşılır şekilde belirt.`;

function corsHeaders(origin,env){
  const allowed=String(env.APP_ORIGIN||'https://okulyonetim.github.io');
  const allowOrigin=origin===allowed||/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin||'')?origin:allowed;
  return{
    'Access-Control-Allow-Origin':allowOrigin,
    'Access-Control-Allow-Methods':'POST,OPTIONS,GET',
    'Access-Control-Allow-Headers':'Content-Type',
    'Access-Control-Max-Age':'86400',
    'Vary':'Origin',
    'Content-Type':'application/json; charset=utf-8'
  };
}
function json(data,status,origin,env){return new Response(JSON.stringify(data),{status,headers:corsHeaders(origin,env)});}
function cleanText(value,max){return String(value??'').replace(/\u0000/g,'').slice(0,max);}
function normalizeMessages(value){
  if(!Array.isArray(value))return[];
  return value.slice(-10).map(m=>({
    role:m?.role==='assistant'||m?.role==='model'?'assistant':'user',
    content:cleanText(m?.text??m?.content,MAX_MESSAGE_CHARS)
  })).filter(m=>m.content.trim());
}
function isOfficialUrl(url){
  try{
    const h=new URL(url).hostname.toLowerCase();
    return OFFICIAL_SUFFIXES.some(s=>h===s||h.endsWith('.'+s));
  }catch{return false;}
}
function extractOutputText(data){
  if(typeof data?.output_text==='string'&&data.output_text.trim())return data.output_text.trim();
  const texts=[];
  for(const item of data?.output||[]){
    if(item?.type!=='message')continue;
    for(const c of item?.content||[]){
      if(typeof c?.text==='string')texts.push(c.text);
    }
  }
  return texts.join('\n').trim();
}
function collectSources(data){
  const out=new Map();
  const add=(url,title='')=>{if(!url||!isOfficialUrl(url))return;out.set(url,{url,title:String(title||'').trim()});};
  for(const item of data?.output||[]){
    if(item?.type==='message'){
      for(const c of item?.content||[]){
        for(const a of c?.annotations||[]){
          const u=a?.url||a?.url_citation?.url;
          const t=a?.title||a?.url_citation?.title;
          add(u,t);
        }
      }
    }
    if(item?.type==='web_search_call'){
      for(const s of item?.action?.sources||[])add(s?.url,s?.title);
    }
  }
  return[...out.values()].slice(0,12);
}
function buildUserInput(body){
  const question=cleanText(body?.messages?.at?.(-1)?.text??body?.messages?.at?.(-1)?.content??body?.question,MAX_MESSAGE_CHARS).trim();
  const context=cleanText(body?.context,MAX_CONTEXT_CHARS).trim();
  const today=new Date().toLocaleDateString('tr-TR',{timeZone:'Europe/Istanbul'});
  return{
    question,
    text:`BUGÜN: ${today}\n\nKULLANICI SORUSU:\n${question}\n\nYEREL MEVZUAT ARŞİVİNDEN GETİRİLEN BAĞLAM:\n${context||'(Yerel bağlam bulunamadı. İnternette resmî kaynaklardan araştır.)'}\n\nGÖREV:\nSoruyu güncel resmî kaynaklarda doğrula. Yerel bağlamı yardımcı kaynak olarak kullan. En güncel yürürlükteki hükmü esas al. Ayrıntılı, anlaşılır ve okul yönetiminde uygulanabilir cevap ver.`
  };
}
async function callOpenAI(env,body){
  if(!env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY tanımlı değil.');
  const built=buildUserInput(body);
  if(!built.question)throw new Error('Soru boş.');
  const prior=normalizeMessages(body?.messages).slice(0,-1);
  const input=[...prior,{role:'user',content:built.text}];
  const payload={
    model:env.OPENAI_MODEL||'chat-latest',
    instructions:SYSTEM_PROMPT,
    input,
    tools:[{type:'web_search_preview',search_context_size:'high'}],
    tool_choice:'required',
    include:['web_search_call.action.sources'],
    max_output_tokens:3200,
    store:false
  };
  const response=await fetch(OPENAI_URL,{
    method:'POST',
    headers:{'Authorization':`Bearer ${env.OPENAI_API_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify(payload)
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok){
    const message=data?.error?.message||`OpenAI isteği başarısız (${response.status})`;
    throw new Error(message);
  }
  const text=extractOutputText(data);
  if(!text)throw new Error('AI boş yanıt döndürdü.');
  const sources=collectSources(data);
  return{
    text,
    sources,
    webVerified:sources.length>0,
    checkedAt:new Date().toISOString(),
    model:data?.model||payload.model,
    responseId:data?.id||null
  };
}

export default{
  async fetch(request,env){
    const origin=request.headers.get('Origin')||'';
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers:corsHeaders(origin,env)});
    if(request.method==='GET')return json({ok:true,service:'okulyonetim-mevzuat-ai',version:'1.0.0',webSearch:true},200,origin,env);
    if(request.method!=='POST')return json({error:'Yalnız POST destekleniyor.'},405,origin,env);
    try{
      const body=await request.json();
      const result=await callOpenAI(env,body);
      return json(result,200,origin,env);
    }catch(error){
      return json({error:error?.message||'Mevzuat asistanı yanıt veremedi.'},500,origin,env);
    }
  }
};

export{SYSTEM_PROMPT,isOfficialUrl,extractOutputText,collectSources,buildUserInput,normalizeMessages};

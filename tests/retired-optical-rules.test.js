const fs=require('fs');
const path=require('path');
const {initializeTestEnvironment,assertFails}=require('@firebase/rules-unit-testing');
const {doc,getDoc,setDoc}=require('firebase/firestore');

const PROJECT_ID='demo-okul-rules';

async function main(){
  const rules=fs.readFileSync(path.join(__dirname,'..','firestore.rules'),'utf8');
  const env=await initializeTestEnvironment({projectId:PROJECT_ID,firestore:{rules}});
  try{
    await env.clearFirestore();
    const userDb=env.authenticatedContext('retiredOpticalUser').firestore();
    const target=doc(userDb,'oy_optikSablonlari','eski-sablon');
    await assertFails(getDoc(target));
    await assertFails(setDoc(target,{ad:'Eski şablon'}));
    console.log('Emekli optik koleksiyonu okuma/yazmaya kapalı: test başarılı.');
  }finally{
    await env.cleanup();
  }
}

main().catch(err=>{console.error(err);process.exitCode=1;});

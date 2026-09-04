const assert=require('assert');

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

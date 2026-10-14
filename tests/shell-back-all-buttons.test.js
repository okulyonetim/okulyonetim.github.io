/* Geri düğmesi regresyonu: web arayüzü üst çubuğu ikinci bir [data-ka-shell-back] düğmesi ekledi (DOM'da
 * telefon geri çubuğundan ÖNCE). syncShellBack yalnız ilkini güncellediği için telefondaki düğme açılışta
 * hidden kaldı ve bütün sayfalarda kayboldu. Durum sayfadaki tüm geri düğmelerine uygulanmalı. */
const fs=require('fs');
const assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const web=fs.readFileSync('js/core/web-shell.js','utf8');
const index=fs.readFileSync('index.html','utf8');
const sw=fs.readFileSync('service-worker.js','utf8');

assert(web.includes('data-ka-shell-back')&&index.indexOf('data-ka-shell-backbar')>0,'Web üst çubuğu ve telefon geri çubuğu aynı [data-ka-shell-back] işaretini kullanıyor (bu test bu durumu korur).');
assert(shell.includes("const bs=[...document.querySelectorAll('[data-ka-shell-back]')]"),'syncShellBack tüm geri düğmelerini toplamalı.');
assert(shell.includes('bs.forEach(b=>{b.hidden=!show;b.setAttribute(\'aria-hidden\',String(!show))})'),'Gizli/görünür durumu her geri düğmesine uygulanmalı.');
assert(!/function syncShellBack\(\)\{const b=document\.querySelector\('\[data-ka-shell-back\]'\)/.test(shell),'syncShellBack yalnız ilk geri düğmesini güncellememeli.');

const v=shell.length&&index.match(/js\/core\/shell-ui\.js\?v=(\d+)/)?.[1];
assert(v&&Number(v)>=1079,'shell-ui.js sürümü artırılmalı (önbellekteki hatalı sürüm eskimeli).');
assert(sw.includes(`'./js/core/shell-ui.js?v=${v}'`),'Service Worker güncel shell-ui.js sürümünü önbelleğe almalı.');
console.log('Geri düğmesi (tüm [data-ka-shell-back]) sözleşmesi başarılı.');

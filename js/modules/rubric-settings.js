/* Koruk Asistan — Rubric Settings compatibility loader
 * Canonical implementation moved intact to rubric-settings-core.js.
 * The catalog layer is loaded after it so the existing çizelge implementation remains authoritative.
 */
(function(global){
'use strict';
const load=global.AppLoader?.loadScript;
if(typeof load!=='function')return;
Promise.resolve(load('js/modules/rubric-settings-core.js?v=1064'))
 .then(()=>load('js/modules/belirli-gunler-catalog.js?v=1'))
 .catch(e=>console.warn('[RubricSettings compatibility load]',e?.message||e));
})(window);

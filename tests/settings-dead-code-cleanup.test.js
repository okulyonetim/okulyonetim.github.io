/* Regresyon: js/modules/settings.js içinde window.KorukTheme'e yapılan
 * referanslar (themeAccentSection, "Tema Rengi" vurgu seçici) hiçbir zaman
 * çalışmıyordu — KorukTheme yalnızca üretimde hiç yüklenmeyen js/v3/theme.js
 * içinde tanımlı. Çökme yoktu (defansif koruma vardı) ama özellik tamamen
 * ölüydü; kaldırıldı. */
const fs=require('fs');
const assert=require('assert');
const settings=fs.readFileSync('js/modules/settings.js','utf8');

new Function(settings);

assert(!settings.includes('KorukTheme'),'settings.js artık hiç yüklenmeyen js/v3/theme.js’e referans vermemeli.');
assert(!settings.includes('themeAccentSection'),'Ölü "Tema Rengi" vurgu seçici bölümü kaldırılmış olmalı.');
console.log('settings-dead-code-cleanup: OK');

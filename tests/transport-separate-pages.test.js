const fs=require('fs');
const assert=require('assert');
const shell=fs.readFileSync('js/core/shell-ui.js','utf8');
const transport=fs.readFileSync('js/modules/transport.js','utf8');
for(const [label,page] of [['Taşıma','services'],['Servis Oturma','busSeats'],['Sınıf Oturma','classSeats']]){
  assert(shell.includes(`['${label}'`)&&shell.includes(`'transport','${page}'`),`${label} ayrı Transport sayfasına yönlenmeli.`);
}
assert(shell.includes("name==='transport'&&['services','busSeats','classSeats'].includes(page)"),'ShellUI Transport alt sayfalarını doğrudan çözmeli.');
assert(transport.includes('function openPage(page,title=')&&transport.includes('window.TransportModule={mount,unmount,render,prepareLocal,openBusEditor,openPage}'),'TransportModule public openPage API sunmalı.');
assert(!transport.includes('data-transport-tab'),'Transport içinde ikinci bir sekme navigasyonu kalmamalı.');
console.log('Transport ayrı-sayfa yönlendirme sözleşmesi başarılı.');

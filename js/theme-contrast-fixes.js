/* Koruk Asistan — açık/koyu tema kontrast güvenlik katmanı */
(function(){
'use strict';
if(document.getElementById('themeContrastFixes'))return;
const s=document.createElement('style');
s.id='themeContrastFixes';
s.textContent=`
:root{
  --contrast-text:var(--ink,#17202a);
  --contrast-muted:var(--ink-muted,#5f6b76);
  --contrast-surface:var(--nm-bg-light,#fff);
  --contrast-surface-alt:var(--nm-bg-dark,#eef2f5);
  --contrast-border:var(--border,#c7d0d8);
}
[data-theme="dark"]{
  --contrast-text:var(--ink,#f2f7f7);
  --contrast-muted:var(--ink-muted,#b7c7c7);
  --contrast-surface:var(--nm-bg-light,#1c2a2e);
  --contrast-surface-alt:var(--nm-bg-dark,#20302f);
  --contrast-border:var(--border,#43545a);
}
body,.card,.modal,.detay-panel,.an-liste,.an-akordeon,.form-group,label,.page-title,.section-title{color:var(--contrast-text)}
small,.muted,.text-muted,.evrak-meta,.form-help,.hint,.subtext,[style*="color:var(--ink-muted)"]{color:var(--contrast-muted)!important}
button,.btn,.btn-ghost,.btn-danger,.btn-sm{color:var(--contrast-text)}
.btn:not(.btn-primary):not(.btn-amber):not(.btn-danger),.btn-ghost{
  background:var(--contrast-surface)!important;
  color:var(--contrast-text)!important;
  border-color:var(--contrast-border)!important;
}
.btn:not(.btn-primary):not(.btn-amber):not(.btn-danger):hover,.btn-ghost:hover,
.btn:not(.btn-primary):not(.btn-amber):not(.btn-danger):focus-visible,.btn-ghost:focus-visible{
  background:var(--contrast-surface-alt)!important;
  color:var(--contrast-text)!important;
}
.btn-primary,.btn-amber{color:#fff!important}
.btn:disabled,button:disabled{opacity:.58!important;color:var(--contrast-muted)!important;cursor:not-allowed}
input,select,textarea{
  color:var(--contrast-text)!important;
  background:var(--contrast-surface-alt)!important;
  border-color:var(--contrast-border)!important;
}
input::placeholder,textarea::placeholder{color:var(--contrast-muted)!important;opacity:1!important}
select option{background:var(--contrast-surface)!important;color:var(--contrast-text)!important}
.table,.table td,.table th,.maarif-tablo,.maarif-tablo td,.maarif-tablo th{color:var(--contrast-text)}
.table thead th,.maarif-tablo thead th{background:var(--contrast-surface-alt);color:var(--contrast-text)!important}
.modal,.card,.detay-panel,.an-akordeon{background:var(--contrast-surface)}
.detay-head,.detay-head *{color:#fff!important}
.detay-head .btn-ghost{background:rgba(255,255,255,.12)!important;color:#fff!important;border-color:rgba(255,255,255,.42)!important}
.status-pill,.badge{font-weight:700}
:focus-visible{outline:2px solid var(--brand,#0b7c7c);outline-offset:2px}
`;
document.head.appendChild(s);
})();

from pathlib import Path
import re

CSS = Path('css/design-system.css')
INDEX = Path('index.html')
SW = Path('service-worker.js')

css = CSS.read_text(encoding='utf-8')

root = r''':root{
  color-scheme:light;
  --ka-primary:#2563eb;--ka-primary-hover:#1d4ed8;--ka-primary-soft:#eaf2ff;--ka-accent:#8b5cf6;
  --ka-app-bg:#f7f9fd;--ka-text:#172033;--ka-text-muted:#6d7890;--ka-text-inverse:#fff;
  --ka-header-bg:#ffffff;--ka-header-text:#172033;--ka-header-muted:#738096;--ka-header-border:#e2e8f3;
  --ka-nav-bg:rgba(255,255,255,.97);--ka-nav-text:#6f7d92;--ka-nav-active-bg:#eef4ff;--ka-nav-active-text:#2563eb;--ka-nav-border:#dfe7f2;--ka-nav-menu-start:#20c997;--ka-nav-menu-end:#16a34a;--ka-nav-menu-icon:#fff;--ka-nav-menu-ring:#ddf8e8;
  --ka-button-bg:linear-gradient(135deg,#2563eb,#3b82f6);--ka-button-hover:linear-gradient(135deg,#1d4ed8,#2563eb);--ka-button-text:#fff;--ka-button-secondary-bg:#fff;--ka-button-secondary-text:#172033;--ka-button-secondary-border:#d9e2ef;
  --ka-card-bg:#ffffff;--ka-card-raised-bg:#ffffff;--ka-muted-bg:#f2f5fa;--ka-input-bg:#ffffff;--ka-input-text:#172033;--ka-input-border:#dbe4f0;--ka-input-focus:#2563eb;
  --ka-border:#dfe7f2;--ka-border-strong:#c0ccdc;--ka-focus:rgba(37,99,235,.20);--ka-overlay:rgba(15,23,42,.50);
  --ka-success:#18b77a;--ka-warning:#ff9f1c;--ka-danger:#f0445e;--ka-info:#18a0fb;
  --ka-hero-bg:radial-gradient(circle at 88% 18%,rgba(255,183,77,.30),transparent 24%),radial-gradient(circle at 72% 6%,rgba(34,211,238,.28),transparent 34%),linear-gradient(135deg,#e9fbff 0%,#eef5ff 55%,#fff7e8 100%);--ka-hero-border:#cfe4ff;--ka-hero-text:#14233a;--ka-hero-muted:#61708a;--ka-hero-kicker:#0284c7;--ka-hero-badge-bg:#fff1c9;--ka-hero-badge-text:#c56a00;--ka-hero-shadow:0 16px 34px rgba(37,99,235,.12);
  --ka-live-bg:#fff;--ka-live-border:#d4e2f3;--ka-live-surface:#f3f7ff;--ka-live-text:#172033;--ka-live-muted:#6d7890;--ka-live-accent:#18a0fb;--ka-live-accent-soft:#e8f5ff;--ka-live-progress-bg:#e1e8f2;--ka-live-progress:linear-gradient(90deg,#22d3ee,#3b82f6,#8b5cf6);--ka-weather-bg:#f8fbff;--ka-weather-icon-bg:#fff4d8;
  --ka-module-people-1:#ec4899;--ka-module-people-2:#db2777;--ka-module-exams-1:#3b82f6;--ka-module-exams-2:#2563eb;--ka-module-programs-1:#fbbf24;--ka-module-programs-2:#f59e0b;--ka-module-communication-1:#fb7185;--ka-module-communication-2:#f43f5e;--ka-module-calendar-1:#22d3ee;--ka-module-calendar-2:#0891b2;--ka-module-transport-1:#fb923c;--ka-module-transport-2:#f97316;--ka-module-documents-1:#8b5cf6;--ka-module-documents-2:#7c3aed;--ka-module-management-1:#34d399;--ka-module-management-2:#10b981;--ka-module-settings-1:#64748b;--ka-module-settings-2:#475569;
  --ka-font:Inter,Manrope,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;--ka-font-mono:"JetBrains Mono",Consolas,monospace;
  --ka-font-size-xs:11px;--ka-font-size-sm:13px;--ka-font-size-md:15px;--ka-font-size-lg:18px;--ka-font-size-xl:22px;--ka-font-size-2xl:28px;--ka-line-height:1.5;
  --ka-space-1:4px;--ka-space-2:8px;--ka-space-3:12px;--ka-space-4:16px;--ka-space-5:20px;--ka-space-6:24px;--ka-space-8:32px;
  --ka-control-height-sm:36px;--ka-control-height:46px;--ka-control-height-lg:52px;--ka-header-height:68px;--ka-bottom-nav-height:76px;--ka-content-max-width:1180px;
  --ka-safe-top:env(safe-area-inset-top,0px);--ka-safe-right:env(safe-area-inset-right,0px);--ka-safe-bottom:env(safe-area-inset-bottom,0px);--ka-safe-left:env(safe-area-inset-left,0px);
  --ka-radius-sm:10px;--ka-radius-md:14px;--ka-radius-lg:20px;--ka-radius-xl:26px;--ka-radius-pill:999px;
  --ka-shadow-sm:0 5px 16px rgba(31,55,92,.07);--ka-shadow-md:0 12px 30px rgba(31,55,92,.11);--ka-shadow-modal:0 28px 70px rgba(15,23,42,.25);
  --ka-transition-fast:140ms cubic-bezier(.2,.8,.2,1);--ka-transition:220ms cubic-bezier(.2,.8,.2,1);
  --ka-report-bg:#fff;--ka-report-text:#000;--ka-report-width:210mm;--ka-report-min-height:297mm;--ka-report-margin:8mm;--ka-report-font:Arial,Helvetica,sans-serif;--ka-report-font-size:9.5pt;--ka-report-heading-size:14pt;--ka-report-border:#222;--ka-report-header-bg:#f0f0f0;--ka-report-cell-padding:5px 7px;
}
[data-theme="dark"]{
  color-scheme:dark;--ka-primary:#38bdf8;--ka-primary-hover:#60a5fa;--ka-primary-soft:#102a43;--ka-accent:#a78bfa;
  --ka-app-bg:#07111f;--ka-text:#f7f9ff;--ka-text-muted:#9aabc1;--ka-text-inverse:#07111f;--ka-header-bg:#081522;--ka-header-text:#f8faff;--ka-header-muted:#9aabc1;--ka-header-border:#1e334b;
  --ka-nav-bg:rgba(7,17,31,.97);--ka-nav-text:#91a0b7;--ka-nav-active-bg:#0d2842;--ka-nav-active-text:#38bdf8;--ka-nav-border:#1e334b;--ka-nav-menu-start:#ff4d6d;--ka-nav-menu-end:#e11d48;--ka-nav-menu-icon:#fff;--ka-nav-menu-ring:#43172a;
  --ka-button-bg:linear-gradient(135deg,#2563eb,#4f46e5);--ka-button-hover:linear-gradient(135deg,#3b82f6,#6366f1);--ka-button-text:#fff;--ka-button-secondary-bg:#0f1d2d;--ka-button-secondary-text:#f7f9ff;--ka-button-secondary-border:#29435f;
  --ka-card-bg:#0d1a2a;--ka-card-raised-bg:#122238;--ka-muted-bg:#101f32;--ka-input-bg:#0d1a2a;--ka-input-text:#f7f9ff;--ka-input-border:#263d59;--ka-input-focus:#38bdf8;
  --ka-border:#203751;--ka-border-strong:#355475;--ka-focus:rgba(56,189,248,.26);--ka-overlay:rgba(1,7,15,.78);--ka-shadow-sm:0 6px 18px rgba(0,0,0,.28);--ka-shadow-md:0 16px 38px rgba(0,0,0,.40);--ka-shadow-modal:0 30px 78px rgba(0,0,0,.58);
  --ka-success:#34d399;--ka-warning:#fbbf24;--ka-danger:#fb7185;--ka-info:#38bdf8;
  --ka-hero-bg:radial-gradient(circle at 86% 16%,rgba(251,146,60,.22),transparent 23%),radial-gradient(circle at 70% 5%,rgba(139,92,246,.25),transparent 35%),linear-gradient(135deg,#0b2442 0%,#121d3b 54%,#25153c 100%);--ka-hero-border:#2c5386;--ka-hero-text:#f8faff;--ka-hero-muted:#a7b7cc;--ka-hero-kicker:#38bdf8;--ka-hero-badge-bg:#2c220b;--ka-hero-badge-text:#fbbf24;--ka-hero-shadow:0 20px 48px rgba(0,0,0,.42);
  --ka-live-bg:#0d1a2a;--ka-live-border:#28455f;--ka-live-surface:#10233a;--ka-live-text:#f8faff;--ka-live-muted:#9aabc1;--ka-live-accent:#38bdf8;--ka-live-accent-soft:#112d49;--ka-live-progress-bg:#24374e;--ka-live-progress:linear-gradient(90deg,#22d3ee,#3b82f6,#a78bfa);--ka-weather-bg:#102034;--ka-weather-icon-bg:#30270d;
  --ka-module-people-1:#be185d;--ka-module-people-2:#831843;--ka-module-exams-1:#1d4ed8;--ka-module-exams-2:#1e3a8a;--ka-module-programs-1:#ca8a04;--ka-module-programs-2:#854d0e;--ka-module-communication-1:#e11d48;--ka-module-communication-2:#881337;--ka-module-calendar-1:#0e7490;--ka-module-calendar-2:#164e63;--ka-module-transport-1:#c2410c;--ka-module-transport-2:#7c2d12;--ka-module-documents-1:#7c3aed;--ka-module-documents-2:#4c1d95;--ka-module-management-1:#15803d;--ka-module-management-2:#14532d;--ka-module-settings-1:#475569;--ka-module-settings-2:#1e293b;
}'''

pattern = r':root\{\n.*?\n\}\n\[data-theme="dark"\]\{\n.*?\n\}'
css, n = re.subn(pattern, root, css, count=1, flags=re.S)
assert n == 1, 'theme token blocks not found'

def replace_rule(selector: str, body: str, count: int = 1):
    global css
    pat = re.escape(selector) + r'\{[^{}]*\}'
    css, hits = re.subn(pat, selector + '{' + body + '}', css, count=count)
    assert hits == count, f'rule not found: {selector} ({hits})'

replace_rule('.btn,.ka-btn,button.ka-btn', 'min-height:var(--ka-control-height);display:inline-flex;align-items:center;justify-content:center;gap:var(--ka-space-2);padding:0 var(--ka-space-4);border:1px solid color-mix(in srgb,var(--ka-primary) 26%,var(--ka-border));border-radius:var(--ka-radius-md);background:var(--ka-button-bg);color:var(--ka-button-text);box-shadow:0 7px 18px color-mix(in srgb,var(--ka-primary) 14%,transparent);font-weight:800;text-decoration:none;cursor:pointer;transition:background var(--ka-transition-fast),border-color var(--ka-transition-fast),box-shadow var(--ka-transition-fast),transform var(--ka-transition-fast)')
replace_rule('.ka-icon-button', 'width:44px;height:44px;border:1px solid var(--ka-border);border-radius:14px;background:color-mix(in srgb,var(--ka-card-bg) 92%,transparent);color:var(--ka-text);box-shadow:var(--ka-shadow-sm);display:inline-grid;place-items:center;cursor:pointer;transition:transform var(--ka-transition-fast),border-color var(--ka-transition-fast),background var(--ka-transition-fast)')
replace_rule('input:not([type="checkbox"]):not([type="radio"]),select,textarea,.ka-input', 'width:100%;min-height:var(--ka-control-height);border:1.5px solid var(--ka-input-border);border-radius:var(--ka-radius-md);background:var(--ka-input-bg);color:var(--ka-input-text);padding:10px 13px;outline:none;box-shadow:0 3px 10px color-mix(in srgb,var(--ka-text) 4%,transparent);transition:border-color var(--ka-transition-fast),box-shadow var(--ka-transition-fast),background var(--ka-transition-fast)')
replace_rule('.card,.ka-card', 'background:var(--ka-card-bg);color:var(--ka-text);border:1px solid var(--ka-border);border-radius:var(--ka-radius-lg);box-shadow:var(--ka-shadow-sm);transition:border-color var(--ka-transition-fast),box-shadow var(--ka-transition-fast),transform var(--ka-transition-fast)')
replace_rule('.ka-app-header', 'position:sticky;top:0;z-index:850;min-height:calc(var(--ka-header-height) + var(--ka-safe-top));display:flex;align-items:flex-end;justify-content:space-between;gap:8px;padding:max(8px,var(--ka-safe-top)) max(9px,var(--ka-safe-right)) 8px max(9px,var(--ka-safe-left));background:color-mix(in srgb,var(--ka-header-bg) 94%,transparent);border-bottom:1px solid var(--ka-header-border);box-shadow:0 6px 20px color-mix(in srgb,var(--ka-text) 7%,transparent);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)')
replace_rule('.ka-bottom-icon', 'width:36px;height:32px;border-radius:12px;display:grid;place-items:center;background:color-mix(in srgb,var(--ka-muted-bg) 82%,var(--ka-card-bg));border:1px solid color-mix(in srgb,var(--ka-border) 82%,transparent);color:inherit;transition:transform var(--ka-transition-fast),background var(--ka-transition-fast),box-shadow var(--ka-transition-fast)')
replace_rule('.ka-bottom-menu-icon', 'width:60px;height:60px;margin-top:-22px;margin-bottom:0;border-radius:20px;background:linear-gradient(145deg,var(--ka-nav-menu-start),var(--ka-nav-menu-end));color:var(--ka-nav-menu-icon);border:4px solid var(--ka-nav-menu-ring);box-shadow:0 12px 28px color-mix(in srgb,var(--ka-nav-menu-end) 36%,transparent),0 0 0 1px color-mix(in srgb,var(--ka-nav-menu-end) 18%,transparent);display:grid;place-items:center;transition:transform var(--ka-transition),box-shadow var(--ka-transition),filter var(--ka-transition)')
replace_rule('.ka-menu-card', 'aspect-ratio:1/.82;min-height:128px;border:1px solid color-mix(in srgb,#fff 18%,transparent);border-radius:22px;color:var(--ka-button-text);padding:14px 9px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;text-align:center;font-weight:850;box-shadow:0 14px 30px color-mix(in srgb,var(--ka-text) 18%,transparent),inset 0 1px 0 rgba(255,255,255,.16);cursor:pointer;transition:transform var(--ka-transition-fast),filter var(--ka-transition-fast),box-shadow var(--ka-transition-fast)')
replace_rule('.ka-menu-card__icon', 'width:54px;height:54px;border-radius:17px;display:grid;place-items:center;background:linear-gradient(145deg,rgba(255,255,255,.30),rgba(255,255,255,.10));border:1px solid rgba(255,255,255,.22);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 8px 18px rgba(0,0,0,.12);font-size:27px;filter:saturate(1.12)')
replace_rule('.ka-header-notification', 'position:relative;overflow:visible;width:48px;height:48px;border-radius:16px;background:color-mix(in srgb,var(--ka-card-bg) 92%,transparent);border-color:color-mix(in srgb,var(--ka-info) 22%,var(--ka-border))')
replace_rule('.ka-header-notification [data-ka-notification-count]', 'position:absolute;top:-2px;right:-2px;transform:translate(28%,-20%);min-width:22px;height:22px;padding:0 5px;border:2px solid var(--ka-header-bg);border-radius:999px;background:linear-gradient(135deg,var(--ka-danger),#ff7a59);color:#fff;display:grid;place-items:center;font-size:10px;line-height:1;font-weight:950;pointer-events:none;box-shadow:0 5px 12px color-mix(in srgb,var(--ka-danger) 34%,transparent);animation:kaBadgePop .36s cubic-bezier(.2,1.5,.4,1)')
replace_rule('.ka-header-profile', 'width:42px;height:42px;min-width:42px;min-height:42px;padding:2px;border-radius:50%;border:2px solid color-mix(in srgb,var(--ka-primary) 62%,var(--ka-border));background:var(--ka-card-bg);color:var(--ka-text);box-shadow:0 6px 16px color-mix(in srgb,var(--ka-primary) 18%,transparent);font-size:11px;font-weight:850;display:grid;place-items:center;cursor:pointer;overflow:hidden')
replace_rule('.ka-modal', 'width:min(680px,100%);max-height:min(88dvh,900px);overflow:auto;background:var(--ka-card-raised-bg);color:var(--ka-text);border:1px solid color-mix(in srgb,var(--ka-primary) 20%,var(--ka-border));border-radius:var(--ka-radius-xl);box-shadow:var(--ka-shadow-modal)')
replace_rule('.ka-home .kh-card', 'overflow:hidden;border:1px solid color-mix(in srgb,var(--ka-primary) 13%,var(--ka-border));border-radius:22px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm)')
replace_rule('.ka-home .kh-quick button', 'min-width:0;min-height:86px;border:1px solid var(--ka-border);border-radius:20px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm);color:var(--ka-text);font:inherit;font-size:9.5px;font-weight:800;padding:9px 3px;cursor:pointer;transition:transform var(--ka-transition-fast),border-color var(--ka-transition-fast),background var(--ka-transition-fast),box-shadow var(--ka-transition-fast)')
replace_rule('.ka-home .kh-quick button svg', 'width:27px;height:27px;display:block;margin:0 auto 8px;color:var(--ka-primary);filter:drop-shadow(0 5px 9px color-mix(in srgb,currentColor 22%,transparent));transition:transform var(--ka-transition-fast)')
replace_rule('.ka-home .kh-social button', 'min-width:0;min-height:84px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:7px;padding:8px 4px;border:1px solid var(--ka-border);border-radius:20px;background:var(--ka-card-bg);box-shadow:var(--ka-shadow-sm);color:var(--ka-text);font:inherit;font-size:9.5px;font-weight:800;text-align:center;cursor:pointer;transition:transform var(--ka-transition-fast),border-color var(--ka-transition-fast),background var(--ka-transition-fast),box-shadow var(--ka-transition-fast)')
replace_rule('.ka-home .kh-social-icon', 'width:36px;height:36px;display:grid;place-items:center;border-radius:13px;background:var(--ka-primary-soft);color:var(--ka-primary);border:1px solid color-mix(in srgb,var(--ka-primary) 18%,var(--ka-border));font-size:25px;line-height:1;overflow:hidden;box-shadow:0 6px 14px color-mix(in srgb,var(--ka-primary) 13%,transparent)')
replace_rule('.ka-home .kh-news-label', 'height:100%;display:flex;align-items:center;gap:6px;padding:0 12px;border:0;background:linear-gradient(135deg,var(--ka-module-communication-1),var(--ka-module-communication-2));color:#fff;font-size:9.5px;font-weight:950;letter-spacing:.05em;z-index:2;cursor:pointer')

# Color quick actions and social cards without changing their DOM or behavior.
quick_repls = {
'.ka-home .kh-quick button:nth-child(1){background:linear-gradient(180deg,var(--ka-card-bg),var(--ka-primary-soft))}':'.ka-home .kh-quick button:nth-child(1){background:linear-gradient(180deg,var(--ka-card-bg),color-mix(in srgb,var(--ka-module-communication-1) 10%,var(--ka-card-bg)));border-color:color-mix(in srgb,var(--ka-module-communication-1) 24%,var(--ka-border))}',
'.ka-home .kh-quick button:nth-child(2){background:linear-gradient(180deg,var(--ka-card-bg),color-mix(in srgb,var(--ka-warning) 8%,var(--ka-card-bg)))}':'.ka-home .kh-quick button:nth-child(2){background:linear-gradient(180deg,var(--ka-card-bg),color-mix(in srgb,var(--ka-warning) 11%,var(--ka-card-bg)));border-color:color-mix(in srgb,var(--ka-warning) 26%,var(--ka-border))}',
'.ka-home .kh-quick button:nth-child(3){background:linear-gradient(180deg,var(--ka-card-bg),color-mix(in srgb,var(--ka-info) 8%,var(--ka-card-bg)))}':'.ka-home .kh-quick button:nth-child(3){background:linear-gradient(180deg,var(--ka-card-bg),color-mix(in srgb,var(--ka-info) 11%,var(--ka-card-bg)));border-color:color-mix(in srgb,var(--ka-info) 26%,var(--ka-border))}',
'.ka-home .kh-quick button:nth-child(4){background:linear-gradient(180deg,var(--ka-card-bg),var(--ka-primary-soft))}':'.ka-home .kh-quick button:nth-child(4){background:linear-gradient(180deg,var(--ka-card-bg),color-mix(in srgb,var(--ka-module-documents-1) 10%,var(--ka-card-bg)));border-color:color-mix(in srgb,var(--ka-module-documents-1) 24%,var(--ka-border))}',
'.ka-home .kh-quick button:nth-child(1) svg{color:var(--ka-primary)}':'.ka-home .kh-quick button:nth-child(1) svg{color:var(--ka-module-communication-1)}',
'.ka-home .kh-quick button:nth-child(4) svg{color:var(--ka-primary)}':'.ka-home .kh-quick button:nth-child(4) svg{color:var(--ka-module-documents-1)}',
}
for old,new in quick_repls.items():
    assert old in css, f'missing quick rule: {old}'
    css = css.replace(old,new,1)

motion = '@keyframes kaBadgePop{0%{transform:translate(28%,-20%) scale(.55);opacity:.25}70%{transform:translate(28%,-20%) scale(1.12);opacity:1}100%{transform:translate(28%,-20%) scale(1);opacity:1}}@media(prefers-reduced-motion:reduce){.ka-header-notification [data-ka-notification-count]{animation:none!important}.ka-menu-card,.ka-menu-card__icon,.ka-bottom-menu-icon,.ka-home .kh-quick button,.ka-home .kh-quick button svg,.ka-home .kh-social button{transition:none!important}}'
anchor = 'button{-webkit-tap-highlight-color:transparent}'
assert anchor in css
css = css.replace(anchor, anchor + motion, 1)

# Make icon-heavy surfaces feel tactile without continuous expensive animation.
css = css.replace('.ka-menu-card:active{transform:scale(.98)}', '.ka-menu-card:hover{filter:saturate(1.08) brightness(1.03);box-shadow:0 17px 34px color-mix(in srgb,var(--ka-text) 22%,transparent)}.ka-menu-card:active{transform:scale(.975)}.ka-menu-card:active .ka-menu-card__icon{transform:scale(.92) rotate(-3deg)}', 1)
css = css.replace('.ka-home .kh-quick button:active{transform:translateY(1px)}', '.ka-home .kh-quick button:hover{border-color:var(--ka-border-strong);box-shadow:var(--ka-shadow-md)}.ka-home .kh-quick button:active{transform:translateY(1px) scale(.97)}.ka-home .kh-quick button:active svg{transform:scale(.9) rotate(-4deg)}', 1)
css = css.replace('.ka-home .kh-social button:active{transform:translateY(1px)}', '.ka-home .kh-social button:hover{border-color:var(--ka-border-strong);box-shadow:var(--ka-shadow-md)}.ka-home .kh-social button:active{transform:translateY(1px) scale(.97)}', 1)

CSS.write_text(css, encoding='utf-8')

index = INDEX.read_text(encoding='utf-8')
index = index.replace('<meta name="theme-color" content="#0b7657" data-ka-theme-color>', '<meta name="theme-color" content="#ffffff" data-ka-theme-color>', 1)
old_theme = "if(m)m.content=t==='dark'?'#0d1713':'#17684f'"
assert old_theme in index
index = index.replace(old_theme, "if(m)m.content=t==='dark'?'#07111f':'#ffffff'", 1)
assert 'css/design-system.css?v=838' in index
index = index.replace('css/design-system.css?v=838', 'css/design-system.css?v=839', 1)
INDEX.write_text(index, encoding='utf-8')

sw = SW.read_text(encoding='utf-8')
assert "const CACHE_ADI='oy-cache-v838';" in sw
sw = sw.replace("const CACHE_ADI='oy-cache-v838';", "const CACHE_ADI='oy-cache-v839';", 1)
sw = sw.replace("'./css/design-system.css?v=838'", "'./css/design-system.css?v=839'", 1)
SW.write_text(sw, encoding='utf-8')

print('Color Pop global theme v839 applied.')

from pathlib import Path

LIVE=Path('js/modules/school-live-status.js')
TEST=Path('tests/classic-shell-v2-smoke.test.js')

live=LIVE.read_text()
test=TEST.read_text()

live=live.replace("let timer=null,observer=null,weatherBusy=false,lastHero=null,stableHero=null,headerBound=false,lastTick='';","let timer=null,weatherBusy=false,headerBound=false,lastTick='';",1)

for block in [
"function fmtClock(sec){if(sec==null)return'—';const s=Math.max(0,Math.floor(Number(sec)||0));return`${pad(Math.floor(s/60))}:${pad(s%60)}`}\n",
"function hhmm(sec){if(sec==null)return'—';return`${pad(Math.floor(sec/3600))}:${pad(Math.floor((sec%3600)/60))}`}\n",
"function greeting(){const h=new Date().getHours();return h<6?'İyi geceler':h<12?'Günaydın':h<18?'İyi günler':h<22?'İyi akşamlar':'İyi geceler'}\n",
"function heroIdentityHtml(){const d=new Date(),date=d.toLocaleDateString('tr-TR',{day:'numeric',month:'long',year:'numeric',weekday:'long'});return `<span>KORUK ASİSTAN</span><h1>${esc(greeting())}, ${esc(displayName().toLocaleUpperCase('tr-TR'))} 👋</h1><small>${esc(date)}</small>`}\n",
"function currentLesson(period){if(!period)return null;const tid=teacherId(),days=['Pazar','Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi'],day=days[new Date().getDay()];const rows=arr('dersProgrami').filter(x=>String(x.gun||'').toLocaleLowerCase('tr')===day.toLocaleLowerCase('tr')&&Number(x.saat??x.dersSaati)===Number(period));return tid?(rows.find(x=>x.ogretmenId===tid)||rows[0]||null):(rows[0]||null)}\n",
"function lessonName(x){return x?.ders||x?.dersAdi||x?.brans||''}\n",
"function className(x){return x?.sinif||x?.sinifAdi||x?.sube||''}\n",
"function flowHtml(st){const segs=st.segments||[];if(!segs.length)return'';const idx=Math.max(0,st.index??0),from=Math.max(0,idx-1),items=segs.slice(from,Math.min(segs.length,from+5));return `<div class=\"ka-live-flow\">${items.map(s=>`<div class=\"ka-live-flow__item ${s===segs[idx]?'active':''}\"><span>${s.type==='lesson'?'▣':s.type==='lunch'?'☕':'◌'}</span><b>${s.label}</b><small>${hhmm(s.start)}–${hhmm(s.end)}</small></div>`).join('')}</div>`}\n",
"function weatherHtml(){const w=weatherInfo();if(!w)return'';const info=WMO[w.code]||['🌡️','Hava Durumu'];return `<button type=\"button\" class=\"ka-live-weather\" data-ka-weather-open aria-label=\"Hava durumu detaylarını aç\"><span class=\"ka-live-weather__icon\">${info[0]}</span><div><strong>${Math.round(Number(w.temp)||0)}°C</strong><p>${info[1]}${w.location?` · ${esc(w.location)}`:''}</p></div><span class=\"ka-grow\"></span><b aria-hidden=\"true\">›</b></button>`}\n",
"function liveHtml(){const st=status(),lesson=currentLesson(st.period||st.nextPeriod),isLive=st.mode==='lesson',title=isLive?`${st.period}. Ders`:st.label,subtitle=isLive?'DERS DEVAM EDİYOR':st.mode==='break'?'SONRAKİ DERSE HAZIRLIK':st.mode==='lunch'?'ÖĞLE ARASI':st.sub||'',progress=Math.max(0,Math.min(1,Number(st.progress)||0));return `<div class=\"ka-home-live\" data-ka-live-status><div class=\"ka-home-live__head\"><span class=\"ka-home-live__round\">${isLive?'▣':st.mode==='break'?'☕':'◷'}</span><div><strong>${esc(title)}</strong><small>${esc(subtitle)}</small>${lesson?`<em>${esc(className(lesson))}${lessonName(lesson)?` · ${esc(lessonName(lesson))}`:''}</em>`:''}</div>${isLive?'<span class=\"ka-home-live__badge\">CANLI</span>':''}</div>${st.start!=null&&st.end!=null?`<div class=\"ka-home-live__times\"><div><small>Başlangıç</small><b>${hhmm(st.start)}</b></div><div><small>${isLive?'Zile kalan':'Kalan süre'}</small><b>${fmtClock(st.remaining)}</b></div><div><small>Bitiş</small><b>${hhmm(st.end)}</b></div></div><div class=\"ka-home-live__progress\"><i style=\"width:${Math.round(progress*100)}%\"></i></div>`:''}${st.mode==='lesson'||st.mode==='break'||st.mode==='lunch'?`<div class=\"ka-home-live__next\"><span>Sonraki</span><b>${st.mode==='lesson'?`${st.period+1}. Ders`:st.nextPeriod?`${st.nextPeriod}. Ders`:'—'}</b></div>`:''}<div class=\"ka-home-live__flow-title\">GÜN İÇİ AKIŞ</div>${flowHtml(st)}</div>${weatherHtml()}`}\n",
"function stabilizeHero(){const fresh=document.querySelector('.ka-home-hero');if(!fresh)return null;if(!stableHero){stableHero=fresh;return fresh}if(fresh!==stableHero){fresh.replaceWith(stableHero);return stableHero}return fresh}\n",
]:
    if block not in live:
        raise SystemExit('dead live helper block not found: '+block[:40])
    live=live.replace(block,'',1)

LIVE.write_text(live)

marker="assert(live.includes('function decorate(){syncHeaderIdentity();updateHeader();return true}')&&!live.includes(\"if(document.querySelector('.ka-home-hero'))decorate()\")&&!live.includes('observer=new MutationObserver'),'SchoolLiveStatus eski hero DOM motorunu çalıştırmamalı; yalnız headless durum eventi ve header güncellemesi üretmeli.');"
addition="\nfor(const retired of ['heroIdentityHtml','currentLesson','flowHtml','weatherHtml','liveHtml','stabilizeHero']) assert(!live.includes(`function ${retired}`),`Emekli live hero helper geri dönmemeli: ${retired}`);\n"
if addition.strip() not in test:
    if marker not in test:
        raise SystemExit('headless smoke marker not found')
    test=test.replace(marker,marker+addition,1)
TEST.write_text(test)

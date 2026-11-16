/* Month 10 local Language build. Source data and assets are independently versioned. */
(() => {
  'use strict';
  const BASE = new URL('.', document.currentScript.src);
  const REVISION = new URL(document.currentScript.src).searchParams.get('v') || 'local';
  const app = document.querySelector('#app');
  const paths = {
    book:'<path d="M12 6c-3-3-7-3-10-2v16c4-1 7-1 10 2 3-3 6-3 10-2V4c-3-1-7-1-10 2Zm0 0v16"/>',
    leaf:'<path d="M20 3C9 2 2 8 5 16c6 7 17 0 15-13Z"/><path d="m3 22 13-13M9 15l-1-5m5 1 5 1"/>',
    arrow:'<path d="M4 12h16m-6-6 6 6-6 6"/>',
    back:'<path d="M20 12H4m6-6-6 6 6 6"/>',
    sound:'<path d="m11 4-6 5H2v6h3l6 5V4Zm5 4a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
    home:'<path d="m2 11 10-9 10 9M5 9v12h5v-7h4v7h5V9"/>',
    chat:'<path d="M21 11a9 9 0 0 1-9 9H3l1-5a9 9 0 1 1 17-4Z"/><path d="M7 9h10M7 13h7"/>',
    cards:'<rect x="5" y="7" width="16" height="15" rx="3"/><path d="M17 4H5a3 3 0 0 0-3 3v10m7-3 3-3 3 3m-3-3v7"/>',
    abc:'<path d="m2 19 5-14 5 14M4 14h6m6-9v14h3a3 3 0 0 0 0-6h-3m0-8h2a4 4 0 0 1 0 8"/>',
    puzzle:'<path d="M9 3H3v6c5-3 5 5 0 3v9h6c-2-5 6-5 4 0h8v-8c-5 2-5-6 0-4V3h-8c2 5-6 5-4 0Z"/>',
    mic:'<rect x="8" y="2" width="8" height="13" rx="4"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
    play:'<path d="m7 3 15 9-15 9V3Z"/>',
    stop:'<rect x="5" y="5" width="14" height="14" rx="2"/>',
    repeat:'<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
    check:'<path d="m5 12 4 4L20 5"/>',
    star:'<path d="m12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1 3-7Z"/>',
    pen:'<path d="m15 3 6 6L8 22H2v-6L15 3Zm-10 11 6 6M13 5l6 6"/>',
    lock:'<rect x="4" y="10" width="16" height="12" rx="3"/><path d="M7 10V7a5 5 0 0 1 10 0v3m-5 5v3"/>',
    sun:'<circle cx="12" cy="12" r="4"/><path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2"/>',
    hand:'<path d="M6 13V6a2 2 0 0 1 4 0v5-8a2 2 0 0 1 4 0v8-6a2 2 0 0 1 4 0v7-3a2 2 0 0 1 4 0v6c0 9-12 12-16 5l-4-6a2 2 0 0 1 3-2l4 4"/>',
    info:'<circle cx="12" cy="12" r="10"/><path d="M12 11v6m0-10h.01"/>'
  };
  const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.book}</svg>`;
  const esc = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const el = (selector, root=document) => root.querySelector(selector);
  const els = (selector, root=document) => [...root.querySelectorAll(selector)];
  const shuffle = a => { const b=[...a]; for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];} return b; };
  let data, assets, canonicalAssets, lesson, route, epoch=0, pageIndex=0, matchIndex=0, matchGeneration=0, selected=null, placed=new Set(), flashIndex=0, quizChoices=[], quizDone=false;
  let memory=[], flips=[], memoryBusy=false, memoryPairs=0, memoryGeneration=0, activeCleanup=()=>{}, currentUtterance=null, speechResolve=null, recorderCleanup=()=>{}, recordingPlaybackStop=()=>{}, recorderPrompt=null, audioURL=null, recordingToken=0, recordingActive=false;
  const visitScroll = new Map();
  let previousRoute=null;
  const levels={A:{name:'Park Ranger',intro:'Explore national parks. Meet the people who protect them.',icon:'leaf'},B:{name:'Cave Explorer',intro:'Look closely, use your senses, and discover a world of wonders.',icon:'sun'},C:{name:'Language & Math',intro:'Make connections with pictures, words, and things to say.',icon:'book'}};
  const displayLevel = level => ({...levels[level],...data?.presentation?.[level]?.level});
  const displayWeekTitle = item => data?.presentation?.[item.level]?.weeks?.[item.week]?.title||item.title;
  function pictureAssetsForLevel(source,level){
    if(level!=='A')return source;
    return new Map([...source].map(([key,asset])=>{const url=new URL(asset.path.replace(/^apps\//,''),BASE);url.searchParams.set('v',asset.sha256?.slice(0,12)||REVISION);return[key,{...asset,path:url.href}];}));
  }
  const staticPicture = path => {const url=new URL(path,BASE);if(route?.level==='A')url.searchParams.set('v',REVISION);return url.href;};
  const img = (key,alt='',extra='') => {
    const asset=assets.get(key);
    return asset?`<img src="${new URL(asset.path.replace(/^apps\//,''),BASE).href}" alt="${esc(alt)}" ${extra}>`:`<span class="missing-picture">Picture pending</span>`;
  };
  // Monthly selector art is separate from source-book pictures used in activities.
  const selectedSelectorArt = (level,key,alt='') => {
    const assetKey=data?.selectorArt?.[level]?.[key],asset=assetKey?assets.get(assetKey):null;
    if(!asset)return '';
    const url=new URL(asset.path.replace(/^apps\//,''),BASE);
    if(asset.sha256)url.searchParams.set('v',asset.sha256.slice(0,12));
    return `<img src="${esc(url.href)}" alt="${esc(asset.alt||alt)}">`;
  };
  const monthlyArt = (key,alt='') => `<img src="${staticPicture(`assets/month10/level-a/icons-v1/${key}.png`)}" alt="${esc(alt)}">`;
  const weekArt = l => selectedSelectorArt(l.level,`week-${l.week}`,displayWeekTitle(l))||(l.level==='A'?monthlyArt(`week-${l.week}`,['Park ranger hat and binoculars','Forest wildlife and river','National parks around the world','Yellowstone hot spring and geyser'][l.week-1]):img(l.cards[0]?.imageKey,l.cards[0]?.label));
  const pageKey = (type='page1') => {
    if(lesson.level==='C'&&type==='page1')return `m10-c-06-p${[5,9,13,17][lesson.week-1]}`;
    const ref=lesson.sourceRefs[0];
    const candidates = lesson.level==='C' ? (lesson.week===1?[5,7]:lesson.week===2?[11,13]:lesson.week===3?[17,19]:[23,24]) : [ref.pdfPages[0],ref.pdfPages[1]];
    return `${ref.bookId}-p${candidates[type==='page2'?1:0]}`;
  };
  const link = (level,week,activity='') => `${new URL(`level-${level.toLowerCase()}/${week?`week-${week}.html`:'index.html'}`,BASE).href}?v=${encodeURIComponent(REVISION)}${activity?`#${activity}`:''}`;
  const origin = fallback => {try{const value=sessionStorage.getItem(`m10-last:${lesson.id}`);if(value==='reading')return 'reading';if(value==='games'){const world=sessionStorage.getItem(`m10-world:${lesson.id}`);return ['wonder-world','phonics-games','puzzle-park'].includes(world)?world:'games';}return fallback;}catch{return fallback;}};
  const cPhonicsOrigin = () => new URLSearchParams(location.search).get('from')==='phonics';
  const cActivityHref = (activity,from=cPhonicsOrigin()?'phonics':'') => {const url=new URL(link(lesson.level,lesson.week,activity));if(from==='phonics')url.searchParams.set('from','phonics');return url.href;};
  const cLiteracyReturn = () => {let page=1;try{page=Number(sessionStorage.getItem(`${lesson.level==='C'?'m10-c-page':'m10-literacy-page'}:${lesson.id}`))||1;}catch{}const target=Math.max(1,Math.min(literacyPageCount(),page));return{href:`#lesson-${target}`,label:`Back to Page ${target}`};};
  function cSectionReturn(){
    if(!lesson)return null;
    const activity=route.activity;
    if(route.level!=='C'){
      if(['cards','practice-cards','song','conversation'].includes(activity))return cLiteracyReturn();
      if(route.level==='A'&&(activity==='memory'||aSourceGameRoutes[activity]))return{href:cActivityHref('wonder-world'),label:'Back to Wonder World'};
      if(route.level==='A'&&aAdventureRoutes[activity]){const world=aAdventureRoutes[activity].world;return{href:cActivityHref(world),label:'Back to '+(world==='wonder-world'?'Wonder World':'Puzzle Park')};}
      if(route.level==='A'&&['wonder-world','phonics-games','puzzle-park'].includes(activity))return activity==='phonics-games'&&cPhonicsOrigin()?{href:cActivityHref('phonics'),label:'Back to Phonics Lesson'}:{href:'#games',label:'Back to Games'};
      if(cPhonicsOrigin()&&activity==='phonics-games')return{href:cActivityHref('phonics',''),label:'Back to Phonics Lesson'};
      if(cPhonicsOrigin()&&['word-practice','match','place','memory'].includes(activity))return{href:cActivityHref('phonics-games','phonics'),label:'Back to Phonics Games'};
      return null;
    }
    if(activity==='c-game-words'||cSourceGameRoutes[activity]){const target=cGameWorldFor(activity);return{href:cActivityHref(target),label:`Back to ${{'wonder-world':'Wonder World','puzzle-park':'Puzzle Park','phonics-games':'Phonics Games'}[target]}`};}
    if(['cards','speech-cards','c-tpr-cards','song','conversation'].includes(activity))return cLiteracyReturn();
    if(['wonder-world','phonics-games','puzzle-park'].includes(activity))return activity==='phonics-games'&&cPhonicsOrigin()?{href:cActivityHref('phonics'),label:'Back to Phonics Lesson'}:{href:'#games',label:'Back to Games'};
    if(['match','place','memory','word-practice'].includes(activity)){
      const target=activity==='word-practice'?(cPhonicsOrigin()?'phonics-games':origin('phonics')):origin('games');
      return{href:cActivityHref(target),label:`Back to ${{'wonder-world':'Wonder World','phonics-games':'Phonics Games','puzzle-park':'Puzzle Park',reading:'Reading',phonics:'Phonics',games:'Games'}[target]||'Games'}`};
    }
    return null;
  }
  const practiceDeck = () => lesson.cards.filter(c=>c.practiceEligible!==false);
  const cGameWeek = () => data?.games?.C?.weeks?.[String(lesson?.week)];
  const cWordRounds = () => data?.wordBuilder?.C?.[String(lesson?.week)]||[];
  const cGameWorldFor = activity => activity==='c-game-compare'?'puzzle-park':activity==='c-game-words'?'phonics-games':'wonder-world';
  const cSourceGameRoutes = {'c-game-wheel':'wheel','c-game-picture':'picture-match','c-game-pick':'pick-right','c-game-compare':'count-compare'};
  const aSourceGameRoutes = {'a-game-wheel':'wheel','a-game-picture':'picture-match','a-game-pick':'pick-right'};
  const aAdventureRoutes = {'a-game-hunt':{kind:'picture-hunt',world:'wonder-world'},'a-game-path':{kind:'path',world:'wonder-world'},'a-game-maze':{kind:'maze',world:'puzzle-park'},'a-game-puzzle':{kind:'picture-puzzle',world:'puzzle-park'}};
  const aGameWeek = () => data?.games?.A?.weeks?.[String(lesson?.week)];
  const aRecordingOptions = () => ({speak:(text,end)=>speak(text,end,{localOnly:true}),mute:()=>mute({keepARowPlayback:true}),onRecordStart:mute,onRecordingChange:active=>{recordingActive=active;document.body.classList.toggle('voice-recording',active);}});
  const aReward = root => window.M10ARewards.coordinator({root,cancelSpeech:mute,isSpeaking:()=>!!currentUtterance,isRecording:()=>recordingActive});
  const isExtraPractice = () => route?.activity?.startsWith('practice-lesson-');
  const literacyOpeningOffset = () => lesson.level==='A'&&lesson.literacyPages?.length?1:0;
  const literacyPageCount = () => !isExtraPractice()&&lesson.literacyPages?.length?lesson.literacyPages.length+literacyOpeningOffset():lesson.level==='C'?5:2+Math.ceil(practiceDeck().length/2)*2;
  const literacyPageHref = page => isExtraPractice()?`#practice-lesson-${page-2}`:`#lesson-${page}`;
  const literacyExit = () => isExtraPractice()?'#extra-practice':'#card-literacy';
  const button = (name,text,attrs='',classes='')=>`<button class="btn ${classes}" ${attrs}>${icon(name)}${text}</button>`;
  const sayButton = text=>button('sound','Listen',`data-say="${esc(text)}"`,'blue');
  const mute = ({keepARowPlayback=false}={}) => {
    recordingPlaybackStop();
    if(!keepARowPlayback)els('.m10-a-row-recording audio').forEach(audio=>{try{audio.pause();}catch{}});
    if('speechSynthesis' in window) speechSynthesis.cancel();
    if(speechResolve){speechResolve(false);speechResolve=null;}
    currentUtterance=null;
    els('.speech-line.active').forEach(e=>e.classList.remove('active'));
  };
  function speak(text,onEnd,options={}){
    if(recordingActive){const s=el('#record-status');if(s)s.textContent='Tap Stop before listening to the example.';onEnd?.(false);return;}
    mute();
    if(!('speechSynthesis' in window)){feedback('Listening is unavailable in this browser. Please read together.','try');onEnd?.(false);return;}
    const version=epoch, u=new SpeechSynthesisUtterance(text);
    u.lang='en-US';u.rate=.82;u.pitch=1;
    const voices=speechSynthesis.getVoices(),localVoice=voices.find(v=>/^en[-_]US$/i.test(v.lang)&&v.localService);
    if(options.localOnly&&!localVoice){onEnd?.(false);return;}
    u.voice=localVoice||voices.find(v=>v.lang==='en-US')||null;
    u.onend=()=>{if(version===epoch&&currentUtterance===u){currentUtterance=null;onEnd?.(true);}};
    u.onerror=()=>{if(version===epoch&&currentUtterance===u){currentUtterance=null;onEnd?.(false);}};
    currentUtterance=u;speechSynthesis.speak(u);
  }
  function speakLines(lines,i=0){
    if(i>=lines.length) return;
    speak(lines[i].text,ok=>{if(ok) speakLines(lines,i+1);});
    el(`[data-line="${i}"]`)?.classList.add('active');
  }
  function feedback(text,cls=''){const e=el('#feedback');if(e){e.textContent=text;e.className=`feedback ${cls}`;}}
  const currentSourceRefs = () => lesson?.level==='C'&&['speech-cards','todays-speech'].includes(route.activity)&&lesson.speechTopics?.length
    ? [{bookId:lesson.speechTopics[0].bookId,pdfPages:[...new Set([...lesson.speechCards.map(card=>card.pdfPage),...lesson.speechTopics.map(topic=>topic.pdfPage)])].sort((a,b)=>a-b)}]
    : lesson?.sourceRefs||[];
  const teacherInfo = () => `<details class="teacher-details"><summary>For teachers · preview & sources</summary><div class="teacher-body"><p><strong>Local Month 10 build.</strong> Book picture crops are study references. ${route.level==='A'?'New Park Ranger week and GP Friends selector artwork is installed for owner review.':route.level==='C'&&data?.selectorArt?.C?'New Level C weekly and GP Friends selector artwork is installed for owner review. Owner approval is pending.':'Fresh monthly selector artwork is pending.'} New activity artwork has its own candidate/review state. Approved recordings and finished dialogue clips are pending. Listen uses the device’s English preview voice; it is not an approved actor recording or phoneme model.</p><p>${lesson?`Level ${lesson.level} · Week ${lesson.week}. ${lesson.weekStatus==='provisional-book-block-sequence'?'A/B weekly grouping is provisional until the complete source set is reviewed.':'C follows the printed source weeks.'}`:'A/B weekly grouping is provisional. C follows the printed source weeks.'}</p>${lesson?`<p><strong>Source pages:</strong> ${currentSourceRefs().map(r=>`${esc(r.bookId)} · PDF ${r.pdfPages.join(', ')}`).join('; ')}</p><p><strong>Pending:</strong> ${lesson.pending.map(esc).join(' · ')}</p>`:''}<p>Recordings stay temporary in this page and are never uploaded. Changing the speaking prompt or leaving the activity clears the recording and releases the microphone. Device speech services may vary by browser. This preview has not been certified on physical phones.</p><p>Normal supplied videos will use Stream; approved images/audio will use R2. No prior-month videos, reports or media libraries are installed here. The numbered Level A activities follow the current Month 10 book activity map. Week 1 includes its actual interview, word map, National parks picture placement and exact key-sentence cards. Each animal-home activity shows its current artwork/interaction state; a local candidate is not owner approval. Word-derived matching/tracing and sentence variations are optional Extra Practice.</p></div></details>`;
  function frame(content){
    const isWeeklySelector=!lesson;
    const isLessonSelector=!!lesson&&(!route.activity||route.activity.startsWith('card-'));
    document.body.className=`m10-level-${route.level.toLowerCase()} ${isWeeklySelector?'consistent-selection consistent-week-selection':isLessonSelector?'consistent-selection week-home':'month10-activity'}`;
    if(lesson?.level==='C'&&['cards','speech-cards','c-tpr-cards','todays-speech'].includes(route.activity))document.body.classList.add('m10-c-speech-route');
    if(lesson?.level==='C'&&['cards','speech-cards','c-tpr-cards'].includes(route.activity))document.body.classList.add('m10-c-flashcards-route');
    if(lesson?.level==='C'&&/^lesson-[1-5]$/.test(route.activity))document.body.classList.add('m10-c-literacy-route');
    document.body.dataset.level=route.level;
    delete document.body.dataset.gameCategory;
    const cWorld=['A','C'].includes(route.level)&&['games','wonder-world','phonics-games','puzzle-park'].includes(route.activity),nativeLauncher=['reading','phonics'].includes(route.activity),cMemory=route.level==='C'&&(route.activity==='memory'||route.activity==='c-game-words'||!!cSourceGameRoutes[route.activity]),aGame=route.level==='A'&&(route.activity==='memory'||!!aSourceGameRoutes[route.activity]||!!aAdventureRoutes[route.activity]);
    if(cWorld&&lesson.level==='A')document.body.classList.add('m10-a-game-list-route');
    const mainClass=isWeeklySelector?'shell weekly-selector-shell':isLessonSelector?'week-home-shell':cWorld?'game-list-shell':nativeLauncher?'m10-native-launcher-host':cMemory?'m10-c-memory-shell':aGame?'m10-a-game-shell':'shell';
    const extraPage=route.activity.match(/^practice-lesson-(\d+)$/);
    const page=extraPage?Number(extraPage[1])+2:Number(route.activity.match(/^lesson-(\d+)$/)?.[1]||0);
    const total=page?(typeof literacyPageCount==='function'?literacyPageCount():6):0;
    const stepper=page?`<a class="gp-navigation__previous" href="${page===(extraPage?3:1)?literacyExit():literacyPageHref(page-1)}" aria-label="Previous page">← <span>Previous</span></a><a class="gp-navigation__next" href="${page===total?literacyExit():literacyPageHref(page+1)}" aria-label="Next page"><span>Next</span> →</a>`:'';
    const context=cSectionReturn(),sectionNav=context?`<a class="gp-navigation__section" href="${esc(context.href)}" aria-label="${esc(context.label)}" title="${esc(context.label)}"><span class="gp-navigation__icon" aria-hidden="true">←</span><span>${esc(context.label)}</span></a>`:'';
    const activity=route.activity,phonicsContext=cPhonicsOrigin()&&['phonics-games','word-practice','match','place','memory','c-game-words'].includes(activity);
    const literacyContext=/^(?:lesson-\d+|page[12]|cards|practice-cards|speech-cards|c-tpr-cards|todays-speech|song|conversation|practice-lesson-\d+)$/.test(activity);
    const gameContext=['games','wonder-world','phonics-games','puzzle-park','memory','match','place','word-practice','c-game-words',...Object.keys(cSourceGameRoutes),...Object.keys(aSourceGameRoutes),...Object.keys(aAdventureRoutes)].includes(activity);
    const weekCard=phonicsContext?'phonics':literacyContext?'literacy':['reading','phonics'].includes(activity)?activity:gameContext?'games':'';
    const weekHref=lesson?link(route.level,lesson.week,weekCard?'card-'+weekCard:''):link(route.level);
    const weekNav=route.level==='C'&&isWeeklySelector?'':`<a class="gp-navigation__week" href="${weekHref}" aria-label="Week Home" title="Week Home"><span class="gp-navigation__icon" aria-hidden="true">📅</span><span>Week Home</span></a>`;
    const logoBar=cWorld||cMemory||aGame?'':`<div class="site-logo-bar"><img src="${new URL('assets/ui/giiip-eis-logo.webp',BASE).href}" width="108" height="108" alt="GIIIP EIS logo"></div>`;
    app.innerHTML=`${logoBar}<nav class="gp-navigation" aria-label="Lesson navigation"><a class="gp-navigation__skip" href="#main">Skip to activity</a><div class="gp-navigation__links"><a class="gp-navigation__main" href="${link(route.level)}" aria-label="Main Home" title="Main Home"><span class="gp-navigation__icon" aria-hidden="true">🏠</span><span>Main Home</span></a>${weekNav}${sectionNav}</div><div class="gp-navigation__stepper">${stepper}</div></nav><main class="${mainClass}" id="main">${content}</main>`;
    els('[data-say]').forEach(b=>b.addEventListener('click',()=>speak(b.dataset.say)));
    el('.gp-navigation__skip')?.addEventListener('click',event=>{event.preventDefault();const main=el('#main');if(main){main.tabIndex=-1;main.focus({preventScroll:true});main.scrollIntoView({block:'start'});}});
  }
  function crumb(category=''){
    return `<p class="month-label center">Month 10 · Level ${route.level}${lesson?` · Week ${lesson.week}`:''}${category?` · ${esc(category[0].toUpperCase()+category.slice(1))}`:''}</p>`;
  }
  function activityTitle(title,desc,back='literacy'){
    if(route.level==='C'&&cSectionReturn())return '';
    return `${crumb(back)}<div class="activity-head"><div><p class="eyebrow">Level ${lesson.level} · Week ${lesson.week}</p><h2>${esc(title)}</h2><p>${esc(desc)}</p></div><a class="btn" href="#${back}">${icon('back')} Back</a></div>`;
  }
  function home(){
    const info=displayLevel(route.level), weeks=data.lessons.filter(l=>l.level===route.level);
    const decorations=route.level==='A'?[monthlyArt('heading-tree'),monthlyArt('heading-landscape')]:route.level==='B'?['🔦','💎']:['📚','✏️'];
    frame(`<p class="month-label center">Month 10 · Level ${route.level} · ${esc(info.name)}</p><div class="gp-eis-link-row"><button class="gp-eis-link" disabled title="Month 10 GP English destination pending">🏫 Go to GP English</button></div><header class="hero center"><div class="hero-row"><span class="weekly-title-icon" aria-hidden="true">${decorations[0]}</span><h1 class="title">Choose a Week</h1><span class="weekly-title-icon" aria-hidden="true">${decorations[1]}</span></div><p class="subtitle">${esc(info.intro)}</p></header><nav class="week-grid" aria-label="Choose a week">${weeks.map((l,i)=>`<a class="week-card ${['orange','red','yellow','green'][i]}" href="${link(l.level,l.week,'card-literacy')}" aria-label="Week ${l.week} — ${esc(displayWeekTitle(l))}"><span class="week-card__inner">${weekArt(l)}<strong>Week ${l.week}</strong><span class="week-card__lesson">${esc(displayWeekTitle(l))}</span></span></a>`).join('')}</nav>`);
    const choices=document.createElement('div');choices.className='selection-choices';const grid=el('.week-grid');grid.before(choices);choices.append(el('.gp-eis-link-row'),el('header.hero'),grid);
  }
  function weekHome(){
    const guide=name=>`<img src="${new URL(`assets/ui/${name}`,BASE).href}" alt="">`;
    const categoryArt=(key,fallback)=>selectedSelectorArt(lesson.level,key)||(lesson.level==='A'?monthlyArt(key):guide(fallback));
    const choices=[['literacy','Literacy','#lesson-1',categoryArt('literacy','literacy-gerry.png')],['reading','Reading','#reading',categoryArt('reading','reading-penny.png')],['phonics','Phonics','#phonics',categoryArt('phonics','category-phonics.png')],['games','Games','#games',categoryArt('games','games-wanda.png')]];
    frame(`<header class="week-heading"><h1>Week ${lesson.week} — ${esc(displayWeekTitle(lesson))}</h1><p>Choose a learning activity.</p></header><div class="carousel-wrap" id="lesson-focus"><button class="carousel-arrow prev" type="button" aria-controls="learning-carousel" aria-label="${lesson.level==='C'?'Previous learning choice':'Previous choice'}">‹</button><nav class="learning-carousel" id="learning-carousel" aria-label="Week ${lesson.week} learning choices">${choices.map(([key,title,href,art],i)=>`<a id="card-${key}" class="learning-card ${key}${i===0?' is-active':''}" href="${href}" data-card="${i}"><h2>${title}</h2>${art}</a>`).join('')}</nav><button class="carousel-arrow next" type="button" aria-controls="learning-carousel" aria-label="${lesson.level==='C'?'Next learning choice':'Next choice'}">›</button></div><div class="carousel-dots" aria-label="${lesson.level==='C'?'Learning choice position':'Carousel position'}">${choices.map(([key,title],i)=>`<button class="carousel-dot${i===0?' is-active':''}" type="button" data-card="${i}" aria-label="Show ${title}"${i===0?' aria-current="true"':''}></button>`).join('')}</div><a class="all-weeks-btn" href="${link(route.level)}">${lesson.level==='C'?'← All Weeks':'⬅️ All Weeks'}</a>`);
    const track=el('.learning-carousel'),cards=els('.learning-card'),dots=els('.carousel-dots button'),previous=el('.carousel-arrow.prev'),next=el('.carousel-arrow.next');
    const storageKey=`m10:lesson-card:${location.pathname}`;
    let active=0,timer=null,restoring=false;
    const remember=()=>{const id=cards[active]?.id;if(!id)return;try{sessionStorage.setItem(storageKey,id);sessionStorage.setItem(`m10-last:${lesson.id}`,id.replace('card-',''));}catch{}const url=new URL(location.href);url.hash=id;url.searchParams.delete('lesson');history.replaceState(history.state,'',url);};
    const sync=index=>{active=Math.max(0,Math.min(cards.length-1,index));cards.forEach((card,i)=>card.classList.toggle('is-active',i===active));dots.forEach((dot,i)=>{dot.classList.toggle('is-active',i===active);i===active?dot.setAttribute('aria-current','true'):dot.removeAttribute('aria-current');});previous.disabled=active===0;next.disabled=active===cards.length-1;};
    const show=(index,instant=false)=>{sync(index);const card=cards[active];const left=track.scrollLeft+card.getBoundingClientRect().left-track.getBoundingClientRect().left-(track.clientWidth-card.offsetWidth)/2;track.scrollTo({left:Math.max(0,left),behavior:instant||matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});};
    const restore=()=>{clearTimeout(timer);restoring=true;const query=new URLSearchParams(location.search).get('lesson');const requested=query?`card-${query}`:location.hash.slice(1);let index=cards.findIndex(c=>c.id===requested);if(index<0){let stored;try{stored=sessionStorage.getItem(storageKey);}catch{}index=cards.findIndex(c=>c.id===stored);}show(index<0?0:index,true);requestAnimationFrame(()=>{restoring=false;});};
    const select=index=>{show(index);remember();};
    previous.onclick=()=>select(active-1);next.onclick=()=>select(active+1);dots.forEach((dot,i)=>dot.onclick=()=>select(i));
    cards.forEach((card,i)=>card.addEventListener('click',()=>{sync(i);remember();}));
    track.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();select(active+(event.key==='ArrowRight'?1:-1));});
    track.addEventListener('scroll',()=>{if(restoring)return;clearTimeout(timer);timer=setTimeout(()=>{const center=track.getBoundingClientRect().left+track.clientWidth/2;const closest=cards.reduce((best,card,i)=>{const distance=Math.abs(card.getBoundingClientRect().left+card.offsetWidth/2-center);return distance<best.distance?{index:i,distance}:best;},{index:active,distance:Infinity});sync(closest.index);remember();},150);},{passive:true});
    const resize=()=>show(active,true);window.addEventListener('resize',resize);window.addEventListener('pageshow',restore);
    activeCleanup=()=>{clearTimeout(timer);window.removeEventListener('resize',resize);window.removeEventListener('pageshow',restore);};
    const version=epoch;document.fonts?.ready.then(()=>{if(version===epoch&&track.isConnected)restore();});restore();
  }
  const tool = (key,ic,title,desc,ready=true)=>ready?`<a class="tool-card" id="tool-${key}" href="#${key}"><span class="tool-icon">${icon(ic)}</span><span><strong>${title}</strong><small>${desc}</small></span></a>`:`<div class="tool-card pending-card" aria-disabled="true"><span class="tool-icon">${icon('lock')}</span><span><strong>${title}</strong><small>${desc}</small></span></div>`;
  function cLessonLauncher(category){
      if(category==='reading'&&lesson.level==='C'&&window.M10CReading){
        const week=data?.cReading?.C?.weeks?.[String(lesson.week)];
        if(week){
          frame(window.M10CReading.markup({week,img}));
          const activity=window.M10CReading.mount({host:el('#main'),week,img,say:(text,end)=>speak(text,end,{localOnly:true}),cancelSpeech:mute});
          activeCleanup=()=>activity();return;
        }
      }
    if(category==='reading'&&['A','B'].includes(lesson.level)&&window.M10ReadingBook){
      const book=data?.readingBooks?.[lesson.level]?.weeks?.[String(lesson.week)];
      const pack=data?.readingScenes?.[lesson.level]?.weeks?.[String(lesson.week)];
      if(book){
        frame(window.M10ReadingBook.markup({book,img}));
          const host=el('#main');let activity=null,sceneEpoch=0,closed=false;
          const pagePack=page=>pack?.pageScenes?.[String(page.pdfPage)]||(pack?.source?.pdfPage===page.pdfPage?pack:null);
          const view=window.M10ReadingBook.bind({host,book,pack:pagePack(book.pages[book.defaultPageIndex]),img,onPageChange:activate});
          function activate(page){
            const stamp=++sceneEpoch;activity?.();activity=null;const selected=pagePack(page);view.setPack?.(selected,false);
            if(selected&&window.M10ReadingScene){
              const ready=ok=>{if(!closed&&stamp===sceneEpoch)view.setReady(ok);};
              activity=window.M10ReadingScene.mount({host,pack:selected,img,say:(text,end)=>speak(text,end,{localOnly:true}),cancelSpeech:mute,onReady:ready});
              activity.ready.then(ready);
            }
          }
          activate(book.pages[book.defaultPageIndex]);
          activeCleanup=()=>{closed=true;sceneEpoch++;view.dispose();activity?.();};return;
      }
    }
    if(window.M10LessonLauncher){
      // Previous question packs remain archived data; the owner changed the
      // primary Reading format to book-scene activities from Month10 onward.
      frame(window.M10LessonLauncher.markup({category,level:lesson.level,week:lesson.week,gamesHref:cActivityHref('phonics-games','phonics'),readingReady:false}));
      return;
    }
    const reading=category==='reading',title=reading?'Reading':'Phonics';
    const action=reading?'<button class="lesson-launch-button" type="button" disabled>Open Reading Activity</button>':`<a class="lesson-launch-button" href="${cActivityHref('phonics-games','phonics')}">🎮 Play Phonics Games</a>`;
    const optional=reading?'<details class="c-optional-practice"><summary>Optional book-picture practice</summary><p>Practise supplied book pictures and sentences. The source-backed story quiz is still pending.</p><a class="primary" href="#place">Book Picture Practice</a></details>':lesson.phonics.words.length?`<details class="c-optional-practice"><summary>Optional book-word practice</summary><p>Whole-word device voice only. Approved phoneme recordings are pending.</p><a class="primary" href="${cActivityHref('word-practice','')}">Picture Word Practice</a></details>`:'';
    frame(`<header class="lesson-launch-heading"><h1>${title}</h1><p>Month 10 · Level C · Week ${lesson.week}</p></header><section class="lesson-launch-card"><div class="reading-video-shell"><div class="lesson-video-pending" role="status"><span aria-hidden="true">▶</span><h2>${title} video coming soon</h2><p>The selected Month 10 video is not available yet.</p></div></div><p class="reading-cover-note">${reading?'The Month 10 story questions, answers and clean scene pictures are pending.':'Listen to the selected phonics lesson when its approved video is ready.'}</p><div class="lesson-launch-actions">${action}</div></section>${optional}`);
  }
  function menu(category){
    if(category==='literacy'){location.hash='lesson-1';return;}
    if(category==='games'){gameWorlds();return;}
    if(['reading','phonics'].includes(category)){cLessonLauncher(category);return;}
    if(category==='reading'){
      frame(`<header class="hero center"><p class="month-label">Month 10 · Level ${lesson.level} · Week ${lesson.week}</p><h1 class="title">Reading</h1><p class="subtitle">Watch, listen, and read together.</p></header><section class="card literacy-video-card">${pendingVideo('Reading time','The selected Month 10 Reading video and its cover are not available yet.')}<div class="reading-activity-card"><p class="note">Practise with the pictures and sentences from your book.</p><a class="primary" href="#place">🧩 Book Picture Activity</a></div></section><p class="m10-source-note">Story-video questions and clean scene artwork remain pending.</p>`);return;
    }
    if(category==='phonics'){
      frame(`<header class="hero center"><p class="month-label">Month 10 · Level ${lesson.level} · Week ${lesson.week}</p><h1 class="title">Phonics</h1><p class="subtitle">Watch, listen, and say the sounds.</p></header><section class="card literacy-video-card">${pendingVideo('Phonics time','The approved Month 10 phonics video will go here when ready.')}${lesson.phonics.words.length?'<div class="phonics-games-action"><a class="primary" href="#word-practice">🔤 Picture Word Practice</a></div><p class="m10-source-note">Whole-word device-voice preview · recorded phonemes pending.</p>':'<p class="m10-source-note">Month 10 phonics sources are still pending for this week.</p>'}</section><div class="phonics-games-action"><a class="primary" href="#phonics-games">🎮 Play Phonics Games</a></div>`);return;
    }
    let tools='',title='',desc='';
    if(category==='literacy'){
      title='Let’s learn together';desc='Little words. Pictures. Things to say.';
      tools=tool('page1','book','Page 1','Book picture & speaking')+tool('page2','leaf','Page 2','Picture words')+tool('cards','cards','Flashcards','Hear a word and a sentence')+tool('sentences','chat','Key Sentences','Listen, repeat & take a turn')+tool('writing','pen','Writing','Trace a word with your finger')+tool('speak','mic','Let’s Speak','Record & hear yourself')+tool('tpr','play','TPR','Clips pending',false)+tool('conversation','chat','Conversation','Video pending',false)+tool('song','sound','Week Song','Song pending',false);
    }else if(category==='reading'){
      title='Read, listen & place';desc='Match the words to their picture. You can listen, too.';
      tools=tool('place','hand','Read & Place','Drag or tap to match')+tool('match','cards','Listen & Find','Choose the matching picture')+tool('reading-video','play','Story video','Video & story activities pending',false);
    }else if(category==='phonics'){
      title='Phonics time';desc=lesson.phonics.words.length?'Listen to whole words and look at their letter teams.':'Your phonics activities are on their way.';
      tools=tool('word-practice','abc','Picture Words','Whole-word preview',!!lesson.phonics.words.length)+tool('phonics-video','play','Phonics video','Approved recordings & video pending',false);
    }else{
      title='Let’s play';desc='Look carefully. Listen. Find a match.';
      tools=tool('match','cards','Picture Match','Listen and choose')+tool('memory','puzzle','Memory Pairs','Find the matching pictures')+tool('place','hand','Sentence Match','Put each sentence by its picture');
    }
    frame(`${activityTitle(title,desc,'')}<div class="tool-grid">${tools}</div>${category==='phonics'&&lesson.phonics.words.length?'<div class="pending-list"><h3>Word practice preview</h3><p>These are whole-word examples from the supplied book. Recorded individual sounds and the finished phonics video are still pending.</p></div>':''}${['literacy','reading'].includes(category)?'<div class="pending-list"><h3>More is on the way</h3><p>We’ll add the selected videos and finished scene artwork as they become available.</p></div>':''}<div class="actions"><a class="btn" href="${link(lesson.level,lesson.week)}">${icon('back')} Week Home</a></div>`);
  }
  function recorderHTML(){return `<section class="recorder"><h3>🎶 Listen, then say it!</h3><p id="record-prompt">Say it. Pause when you’re done, or tap All done!</p><div class="actions">${button('mic','My turn!','id="record" data-record','peach')}${button('stop','All done!','id="record-stop" data-stop disabled')}${button('play','Hear myself','id="record-play" data-no-click-sound disabled')}${button('repeat','Try again!','id="record-clear" data-no-click-sound disabled','small')}</div><p id="record-status" class="record-status" role="status">Tap My turn! to begin.</p></section>`;}
  function setupRecorder(prompt=recorderPrompt){
    const start=el('#record');if(!start)return;
    cleanupAudio();recorderPrompt=prompt;
    const stop=el('#record-stop'), play=el('#record-play'), clear=el('#record-clear'), status=el('#record-status');
    start.disabled=false;start.classList.remove('recording');stop.disabled=true;play.disabled=true;clear.disabled=true;
    const promptNode=el('#record-prompt');if(promptNode)promptNode.textContent=prompt?.text?`${prompt.speaker?`${prompt.speaker}: `:''}${prompt.text}`:'Say it. Pause when you’re done, or tap All done!';
    status.textContent='Tap My turn! to begin.';
    let media=null,stream=null,ctx=null,raf=null,timeout=null,player=null,chunks=[],token=++recordingToken,stopped=false;
    const message=t=>{if(token===recordingToken&&status.isConnected)status.textContent=t;};
    const tracks=()=>{if(token===recordingToken){recordingActive=false;document.body.classList.remove('voice-recording');}stream?.getTracks().forEach(t=>t.stop());stream=null;if(raf)cancelAnimationFrame(raf);raf=null;clearTimeout(timeout);if(ctx){ctx.close().catch(()=>{});ctx=null;}};
    const stopPlayback=()=>{if(player){player.onended=null;player.pause();player=null;}};
    recordingPlaybackStop=stopPlayback;
    const resetURL=()=>{stopPlayback();if(audioURL){URL.revokeObjectURL(audioURL);audioURL=null;}};
    const finish=()=>{if(media?.state==='recording')media.stop();else tracks();};
    const cancel=()=>{stopped=true;if(media?.state==='recording')media.stop();tracks();resetURL();if(recordingPlaybackStop===stopPlayback)recordingPlaybackStop=()=>{};};
    recorderCleanup=cancel;
    clear.onclick=()=>{resetURL();play.disabled=true;clear.disabled=true;message('Cleared. Try saying it again.');};
    stop.onclick=finish;
    play.onclick=()=>{if(!audioURL||recordingActive)return;els('video').forEach(video=>video.pause?.());mute();const take=player=new Audio(audioURL);take.play().then(()=>{if(player===take)message('Listening to your voice…');}).catch(()=>{if(player===take)message('Tap Hear myself again to play.');});take.onended=()=>{if(player===take){player=null;message('Well done. You can try again.');}};};
    start.onclick=async()=>{
      els('video').forEach(video=>video.pause?.());mute();resetURL();play.disabled=true;clear.disabled=true;start.disabled=true;message('Opening the microphone…');
      if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){message('Recording is unavailable here. Please practise aloud together.');start.disabled=false;return;}
      try{
        const s=await navigator.mediaDevices.getUserMedia({audio:true});
        if(token!==recordingToken||stopped||document.hidden){s.getTracks().forEach(t=>t.stop());return;}
        stream=s;chunks=[];media=new MediaRecorder(stream);
        media.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
        media.onstop=()=>{tracks();if(stopped||token!==recordingToken)return;start.disabled=false;start.classList.remove('recording');stop.disabled=true;const blob=new Blob(chunks,{type:media.mimeType});if(blob.size){audioURL=URL.createObjectURL(blob);play.disabled=false;clear.disabled=false;message('Ready! Tap Hear myself.');}else message('No recording was captured. Try again.');};
        media.onerror=()=>{tracks();if(stopped||token!==recordingToken)return;start.disabled=false;start.classList.remove('recording');stop.disabled=true;message('The recording stopped. Please try again.');};
        mute();media.start();recordingActive=true;document.body.classList.add('voice-recording');stop.disabled=false;start.classList.add('recording');message('Recording… Speak until you finish, or tap All done!');
        timeout=setTimeout(finish,60000);
        const AC=window.AudioContext||window.webkitAudioContext;
        if(AC){ctx=new AC();await ctx.resume();if(stopped||token!==recordingToken)return;const analyser=ctx.createAnalyser();analyser.fftSize=1024;ctx.createMediaStreamSource(stream).connect(analyser);const sample=new Float32Array(analyser.fftSize);let heard=false,lastSound=performance.now();
          const monitor=()=>{if(stopped||token!==recordingToken||media?.state!=='recording')return;if(ctx?.state==='running'){analyser.getFloatTimeDomainData(sample);const rms=Math.sqrt(sample.reduce((a,b)=>a+b*b,0)/sample.length);if(rms>.018){heard=true;lastSound=performance.now();}if(heard&&performance.now()-lastSound>1800){finish();return;}}raf=requestAnimationFrame(monitor);};monitor();
        }
      }catch(e){tracks();if(stopped||token!==recordingToken)return;start.disabled=false;stop.disabled=true;message(e.name==='NotAllowedError'?'Microphone access was not allowed. You can practise aloud, or allow it in your browser.':'The microphone is unavailable. You can still practise aloud.');}
    };
  }
  function setRecorderPrompt(prompt){
    if(!el('#record'))return;
    const next={text:String(prompt?.text||''),speaker:String(prompt?.speaker||'')};
    if(recorderPrompt?.text===next.text&&recorderPrompt?.speaker===next.speaker)return;
    setupRecorder(next);
  }
  function mountCVoiceRows(root,rows){
    if(!window.M10CRowRecording){els('.sentence-voice',root).forEach(host=>host.innerHTML='<p>Local recording controls are being prepared.</p>');return()=>{};}
    return window.M10CRowRecording.mount({root,rows,speak:(text,onEnd)=>speak(text,onEnd,{localOnly:true}),mute,onRecordStart:mute,onRecordingChange:active=>{recordingActive=active;document.body.classList.toggle('voice-recording',active);}});
  }
  function pageOne(){
    frame(`${activityTitle('Page 1 · Listen & speak','Look at your book picture. Tap a sentence to hear it.')}<section class="stage"><div class="dialogue-layout"><div><div class="page-figure">${img(pageKey(),'Book picture for this lesson')}</div><p class="caption">From your Month 10 book</p></div><div><div class="speech-lines">${lesson.dialogue.map((d,i)=>`<button class="speech-line" data-line="${i}"><span class="number">${i+1}</span><p>${esc(d.text)}</p>${icon('sound')}</button>`).join('')}</div><div class="actions">${button('sound','Listen to all','id="listen-all"','blue')}${button('stop','Stop listening','id="stop-listen"','small')}</div></div></div>${recorderHTML()}<div class="voice-note">Device voice preview · approved recordings pending</div></section><div class="stage-footer"><a class="btn" href="#literacy">${icon('back')} All activities</a><a class="btn primary" href="#page2">Page 2 ${icon('arrow')}</a></div>`);
    els('[data-line]').forEach(b=>b.onclick=()=>{const i=+b.dataset.line;speak(lesson.dialogue[i].text);b.classList.add('active');});el('#listen-all').onclick=()=>speakLines(lesson.dialogue);el('#stop-listen').onclick=mute;setupRecorder();
  }
  function pageTwo(){
    frame(`${activityTitle('Page 2 · Picture words','Tap a picture. Listen and say the word.')}<section class="stage"><div class="picture-grid">${lesson.cards.map(c=>`<button class="picture-tile" data-say="${esc(c.label)}">${img(c.imageKey,c.label)}<strong>${esc(c.label)}</strong>${icon('sound')}</button>`).join('')}</div></section><div class="stage-footer"><a class="btn" href="#page1">${icon('back')} Page 1</a><a class="btn primary" href="#cards">Flashcards ${icon('arrow')}</a></div>`);
  }
  function cFlashcards(initialSource='literacy'){
    frame('<div id="m10-c-flashcards"></div>');
    activeCleanup=window.M10LevelC.mountFlashcards({lesson,speechDisplayCards:data.speechDisplay?.[lesson.level]?.[lesson.week],root:el('#m10-c-flashcards'),assets,base:BASE,speak:(text,onEnd)=>speak(text,onEnd,{localOnly:true}),mute,initialSource,onSourceChange:source=>{
      route.activity=source==='speech'?'speech-cards':source==='tpr'?'c-tpr-cards':'cards';
      const url=new URL(location.href);url.hash=route.activity;history.replaceState(history.state,'',url);
      const notes=el('.m10-teacher-wrap');if(notes)notes.innerHTML=teacherInfo();
    }});
  }
  function cards(mode='cards'){
    if(mode==='cards'&&lesson.level==='C'){cFlashcards('literacy');return;}
    if(mode==='cards'&&window.M10Flashcards){
      frame(`<header class="hero center"><p class="month-label">Month 10 · Level ${lesson.level} · Week ${lesson.week}</p><h1 class="title">${esc(displayWeekTitle(lesson))}</h1><p class="note">Tap a flashcard to hear its word and sentence.</p>${lesson.level==='C'&&lesson.speechCards?.length?'<div class="actions"><a class="primary" href="#speech-cards">💬 Speech Book</a><a class="primary" href="#todays-speech">Today’s Speech</a></div>':''}</header><div id="m9-flashcards"></div>`);
      const disposeCards=window.M10Flashcards.mount({lesson,assets,base:BASE,speak,mute});
      const disposeTPR=lesson.level==='A'&&window.M10AMedia?window.M10AMedia.mount({root:el('[data-panel="tpr"]'),kind:'tpr',week:lesson.week,base:BASE,returnHref:cLiteracyReturn().href}):()=>{};
      activeCleanup=()=>{disposeTPR();disposeCards();};return;
    }
    const isPhonics=mode==='word-practice',isWriting=mode==='writing';
    const deck=isPhonics?lesson.phonics.words.map(w=>({...w,label:w.word})):lesson.cards;
    const c=deck[flashIndex%deck.length];
    frame(`${activityTitle(isPhonics?'Picture words':isWriting?'Let’s write':'Flashcards',isPhonics?'Listen to the whole word. Find the letter team.':isWriting?'Trace the word. You can draw it, too.':'A picture, a word, and a little sentence.',isPhonics?'phonics':'literacy')}<section class="stage"><div class="stage-top"><span class="counter">${flashIndex+1} of ${deck.length}</span>${button('repeat','Start again','id="restart-cards"','small')}</div><div class="flash-card"><div class="flash-picture">${img(c.imageKey,c.label)}</div><h2>${esc(c.label)}</h2>${!isPhonics?`<p class="sentence">${esc(c.sentence)}</p>`:`<div class="word-parts"><span class="word-part">${esc(c.grapheme)}</span></div>`}<div class="actions">${sayButton(c.label)}${!isPhonics?button('sound','Hear sentence',`data-say="${esc(c.sentence)}"`):''}</div></div>${isWriting?'<div class="trace-colors" aria-label="Choose a pen color"></div><canvas class="trace-pad" id="trace-pad" tabindex="0" aria-label="Word tracing pad. Use your finger or mouse to trace."></canvas><div class="actions">'+button('repeat','Clear drawing','id="clear-drawing"','small')+'</div>':''}<div class="stage-footer">${button('back','Previous','id="prev-card"'+(flashIndex===0?' disabled':''))}<div class="dots">${deck.map((_,i)=>`<span class="dot ${i===flashIndex?'current':''}"></span>`).join('')}</div>${button('arrow',flashIndex===deck.length-1?'Finish':'Next','id="next-card"','primary')}</div></section>`);
    el('#prev-card').onclick=()=>{mute();activeCleanup();flashIndex=Math.max(0,flashIndex-1);cards(mode);};el('#next-card').onclick=()=>{mute();activeCleanup();if(flashIndex===deck.length-1){finish('You explored every word!',mode);return;}flashIndex++;cards(mode);};el('#restart-cards').onclick=()=>{mute();activeCleanup();flashIndex=0;cards(mode);};if(isWriting)setupDrawing(c.label);
  }
  function sentences(speaking=false){
    const d=lesson.dialogue[pageIndex%lesson.dialogue.length];
    frame(`${activityTitle(speaking?'Let’s speak':'Key sentences','Hear the example, then have a turn.')}<section class="stage"><div class="stage-top"><span class="counter">Sentence ${pageIndex+1} of ${lesson.dialogue.length}</span>${button('sound','Listen',`data-say="${esc(d.text)}"`,'blue')}</div><div class="flash-card"><div class="flash-picture">${img(pageKey(),lesson.title)}</div><h2 style="font-size:clamp(25px,3vw,37px)">${esc(d.text)}</h2></div>${recorderHTML()}<div class="stage-footer">${button('back','Previous','id="prev-sentence"'+(pageIndex===0?' disabled':''))}${button('arrow',pageIndex===lesson.dialogue.length-1?'Finish':'Next','id="next-sentence"','primary')}</div></section>`);setupRecorder();
    el('#prev-sentence').onclick=()=>{cleanupAudio();pageIndex=Math.max(0,pageIndex-1);sentences(speaking);};el('#next-sentence').onclick=()=>{cleanupAudio();if(pageIndex===lesson.dialogue.length-1)finish('Wonderful speaking practice!',speaking?'speak':'sentences');else {pageIndex++;sentences(speaking);}};
  }
  function matching(){
    const generation=++matchGeneration;
    const item=lesson.matching[matchIndex],target=lesson.cards.find(c=>c.id===item.cardId);
    quizDone=false;selected=null;
    const count=lesson.level==='C'?3:2;quizChoices=shuffle([target,...shuffle(lesson.cards.filter(c=>c.id!==target.id&&c.practiceEligible!==false)).slice(0,count-1)]);
    frame(`${activityTitle('Listen & find','Hear the sentence. Choose the picture.',origin('games'))}<section class="stage"><div class="progress-track"><span style="width:${matchIndex/lesson.matching.length*100}%"></span></div><div class="stage-top"><span class="counter">${matchIndex+1} of ${lesson.matching.length}</span></div><div class="match-prompt"><h3>${esc(item.sentence)}</h3>${sayButton(item.sentence)}</div><div class="choices ${count===2?'two':''}">${quizChoices.map((c,i)=>`<div class="choice-frame" data-choice-frame="${c.id}"><span class="choice-number">${i+1}</span><button class="choice-select" data-choice="${c.id}" aria-label="Choose ${esc(c.label)}">${img(c.imageKey,c.label)}<strong>${esc(c.label)}</strong></button><button class="choice-hear" data-say="${esc(c.label)}" aria-label="Listen to ${esc(c.label)}">${icon('sound')} Listen</button></div>`).join('')}</div><div id="feedback" class="feedback" role="status" aria-live="polite"></div><div class="stage-footer">${button('repeat','Hear again',`data-say="${esc(item.sentence)}"`)}${button('arrow',matchIndex===lesson.matching.length-1?'Finish':'Next','id="next-match" disabled','primary')}</div></section>`);
    const advance=()=>{if(generation!==matchGeneration)return;matchGeneration++;mute();if(++matchIndex>=lesson.matching.length)finish('You found every picture!','match');else matching();};
    els('[data-choice]').forEach(b=>b.onclick=()=>{if(quizDone)return;const c=quizChoices.find(x=>x.id===b.dataset.choice);selected=c.id;els('[data-choice-frame]').forEach(f=>f.classList.remove('selected','wrong'));const frame=el(`[data-choice-frame="${c.id}"]`);frame.classList.add('selected');if(c.id===target.id){quizDone=true;frame.classList.remove('selected');frame.classList.add('correct');feedback(item.sentence);el('#next-match').disabled=false;const version=epoch;speak(item.sentence,ok=>{if(ok)setTimeout(()=>{if(version===epoch&&generation===matchGeneration)advance();},550);});}else{frame.classList.add('wrong');feedback('Listen again. Try another picture.','try');speak(c.label);}});
    el('#next-match').onclick=advance;
  }
  function placement(){
    const batchStart=pageIndex*4, items=lesson.matching.slice(batchStart,batchStart+4), cards=shuffle(items.map(i=>lesson.cards.find(c=>c.id===i.cardId)));
    selected=null;placed=new Set();
    frame(`${activityTitle('Read & place','Tap a sentence, then its picture. Or drag it there.',origin('reading'))}<section class="stage"><div class="stage-top"><span class="counter">Picture set ${pageIndex+1} of ${Math.ceil(lesson.matching.length/4)}</span>${button('repeat','Try this set again','id="reset-placement"','small')}</div><div class="sentence-bank">${shuffle(items).map((m,i)=>`<button class="sentence-token" draggable="true" data-token="${m.cardId}" aria-pressed="false">${icon('sound')}${esc(m.sentence)}</button>`).join('')}</div><div class="drop-grid">${cards.map(c=>`<button class="drop-target" data-drop="${c.id}" aria-label="Place sentence at ${esc(c.label)}">${img(c.imageKey,c.label)}<span>Tap to place</span></button>`).join('')}</div><div id="feedback" class="feedback" role="status" aria-live="polite"></div><div class="stage-footer">${button('sound','Hear the instruction','data-say="Tap a sentence. Then tap its picture."')}${button('arrow',batchStart+4>=lesson.matching.length?'Finish':'Next set','id="next-placement" disabled','primary')}</div></section>`);
    const choose=id=>{if(placed.has(id))return;selected=id;els('[data-token]').forEach(b=>{b.classList.toggle('selected',b.dataset.token===id);b.setAttribute('aria-pressed',b.dataset.token===id?'true':'false');});speak(items.find(m=>m.cardId===id).sentence);};
    const drop=id=>{if(!selected){feedback('Tap a sentence first.','try');return;}if(placed.has(id))return;if(id!==selected){feedback('Have another look. Try a different picture.','try');speak('Have another look.');return;}const item=items.find(m=>m.cardId===id);placed.add(id);el(`[data-drop="${id}"]`).classList.add('correct');el(`[data-drop="${id}"] span`).textContent=item.sentence;const t=el(`[data-token="${id}"]`);t.classList.remove('selected');t.classList.add('matched');t.setAttribute('aria-pressed','false');t.disabled=true;t.draggable=false;selected=null;feedback(item.sentence);speak(item.sentence);if(placed.size===items.length)el('#next-placement').disabled=false;};
    els('[data-token]').forEach(b=>{b.onclick=()=>choose(b.dataset.token);b.ondragstart=e=>{choose(b.dataset.token);e.dataTransfer.setData('text/plain',b.dataset.token);e.dataTransfer.effectAllowed='move';};b.ondragend=()=>els('.over').forEach(t=>t.classList.remove('over'));});
    els('[data-drop]').forEach(b=>{b.onclick=()=>drop(b.dataset.drop);b.ondragover=e=>{e.preventDefault();b.classList.add('over');};b.ondragleave=()=>b.classList.remove('over');b.ondrop=e=>{e.preventDefault();b.classList.remove('over');drop(b.dataset.drop);};});
    el('#reset-placement').onclick=()=>{mute();placement();};el('#next-placement').onclick=()=>{mute();if(batchStart+4>=lesson.matching.length)finish('Every sentence has a picture!','place');else{pageIndex++;placement();}};
  }
  function memoryGame(){
    if(lesson.level==='A'){aSourceGame('memory');return;}
    if(lesson.level==='C'){
      frame('<div id="m10-c-memory"></div>');
      if(!window.M10CMemory){el('#m10-c-memory').innerHTML='<section class="card"><h1>Memory</h1><p>The native Memory activity is being prepared.</p></section>';return;}
      const root=el('#m10-c-memory'),version=epoch;let rewardCleanup=()=>{},disposed=false;
      const disposeGame=window.M10CMemory.mount({root,cards:cGameWeek()?.memoryCards||practiceDeck(),assets,base:BASE,headingIconKey:data.gameUI?.C?.menuIcons?.memory,speak:(text,onEnd)=>speak(text,onEnd,{localOnly:true}),cancelSpeech:mute,onComplete:()=>{Promise.resolve().then(()=>{if(disposed||version!==epoch||!root.isConnected||document.hidden)return;rewardCleanup();rewardCleanup=window.M10CRewards?.show({title:'You found every pair!',cancelSpeech:mute,returnFocus:document.activeElement})||(()=>{});});}});
      activeCleanup=()=>{disposed=true;rewardCleanup();disposeGame?.();};return;
    }
    const generation=++memoryGeneration;
    const chosen=shuffle(lesson.cards.filter(c=>c.practiceEligible!==false)).slice(0,4),pairCount=chosen.length;memory=shuffle(chosen.flatMap(c=>[{...c},{...c}]));flips=[];memoryPairs=0;memoryBusy=false;
    frame(`${activityTitle('Memory pairs','Turn over two cards. Find the same picture.','games')}<section class="stage"><div class="stage-top"><span class="counter" id="memory-counter">0 of ${pairCount} pairs</span>${button('repeat','Play again','id="restart-memory"','small')}</div><div class="memory-grid">${memory.map((c,i)=>`<button class="memory-card" data-memory="${i}" aria-label="Turn over card ${i+1}">${icon('leaf')}</button>`).join('')}</div><div id="feedback" class="feedback" role="status"></div></section>`);
    els('[data-memory]').forEach(b=>b.onclick=()=>{const i=+b.dataset.memory;if(memoryBusy||flips.includes(i)||b.classList.contains('matched'))return;flips.push(i);b.innerHTML=img(memory[i].imageKey,memory[i].label);b.setAttribute('aria-label',memory[i].label);speak(memory[i].label);if(flips.length===2){const [a,c]=flips;if(memory[a].id===memory[c].id){flips.forEach(n=>el(`[data-memory="${n}"]`).classList.add('matched'));flips=[];memoryPairs++;el('#memory-counter').textContent=`${memoryPairs} of ${pairCount} pairs`;feedback(`A pair! ${memory[i].sentence}`);if(memoryPairs===pairCount){const v=epoch;setTimeout(()=>{if(v===epoch&&generation===memoryGeneration)finish('You remembered every pair!','memory');},1000);}}else{memoryBusy=true;const v=epoch;setTimeout(()=>{if(v!==epoch||generation!==memoryGeneration)return;flips.forEach(n=>{const tile=el(`[data-memory="${n}"]`);tile.innerHTML=icon('leaf');tile.setAttribute('aria-label',`Turn over card ${n+1}`);});flips=[];memoryBusy=false;},1100);}}});el('#restart-memory').onclick=()=>{mute();memoryGame();};
  }
  function setupDrawing(word){
    const canvas=el('#trace-pad'),ctx=canvas.getContext('2d');let color='#26705a',drawing=false,strokes=[],active=[];
    const colors=['#26705a','#357bb7','#db6f46','#9c6aa5','#f2ba3c','#1f2424','#825a3f','#ef96af','#ed663f','#a3bc59'];
    el('.trace-colors').innerHTML=colors.map((c,i)=>`<button class="color-dot ${i===0?'active':''}" style="background:${c}" data-color="${c}" aria-label="${['Green','Blue','Orange','Purple','Yellow','Black','Brown','Pink','Red','Light green'][i]} pen"></button>`).join('');
    els('[data-color]').forEach(b=>b.onclick=()=>{color=b.dataset.color;els('[data-color]').forEach(t=>t.classList.toggle('active',t===b));});
    const paint=()=>{const r=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;canvas.width=r.width*dpr;canvas.height=r.height*dpr;ctx.scale(dpr,dpr);ctx.clearRect(0,0,r.width,r.height);ctx.fillStyle='#d6dfcf';ctx.font=`bold ${Math.min(90,r.width/(word.length*.65))}px Trebuchet MS`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(word,r.width/2,r.height/2);ctx.setLineDash([9,9]);ctx.strokeStyle='#e4dfd0';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(12,r.height*.72);ctx.lineTo(r.width-12,r.height*.72);ctx.stroke();ctx.setLineDash([]);for(const s of strokes){ctx.strokeStyle=s.color;ctx.lineWidth=5;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();s.points.forEach((p,i)=>{i?ctx.lineTo(p.x*r.width,p.y*r.height):ctx.moveTo(p.x*r.width,p.y*r.height);});ctx.stroke();}};
    const point=e=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width,y:(e.clientY-r.top)/r.height};};
    canvas.onpointerdown=e=>{e.preventDefault();drawing=true;canvas.setPointerCapture(e.pointerId);active=[point(e)];strokes.push({color,points:active});paint();};canvas.onpointermove=e=>{if(drawing){active.push(point(e));paint();}};canvas.onpointerup=canvas.onpointercancel=()=>{drawing=false;};el('#clear-drawing').onclick=()=>{strokes=[];paint();};const observer=new ResizeObserver(paint);observer.observe(canvas);activeCleanup=()=>observer.disconnect();paint();
  }
  function finish(title,replay,quiet=false){
    cleanupAudio();activeCleanup();activeCleanup=()=>{};
    try{localStorage.setItem(`m10-practice:${lesson.id}:${replay}`,'visited');}catch{}
    frame(`${crumb()}<section class="stage finish"><div class="finish-icon">${icon('star')}</div><p class="eyebrow">Lovely learning</p><h1>${esc(title)}</h1><p>You listened, looked, and had a go. Well done!</p><div class="actions">${button('repeat','Play again','id="replay"','primary')}<a class="btn" href="${link(lesson.level,lesson.week)}">${icon('home')} Week Home</a></div><p class="voice-note">Practice completed · no assessment score</p></section>`);el('#replay').onclick=()=>{pageIndex=0;flashIndex=0;matchIndex=0;renderActivity(replay);};if(!quiet)speak('Well done! You did it!');
  }
  function cleanupAudio(){mute();recordingActive=false;document.body.classList.remove('voice-recording');recordingToken++;recorderCleanup();recorderCleanup=()=>{};if(audioURL){URL.revokeObjectURL(audioURL);audioURL=null;}}
  function renderActivity(a){
    activeCleanup();activeCleanup=()=>{};
    if(lesson.level==='A'&&aSourceGameRoutes[a]){aSourceGame(a);return;}
    if(lesson.level==='A'&&aAdventureRoutes[a]){aAdventure(a);return;}
    if(lesson.level==='C'&&(a==='c-game-words'||cSourceGameRoutes[a])){cSourceGame(a);return;}
    if(lesson.level==='C'&&['cards','speech-cards','c-tpr-cards'].includes(a)){cFlashcards(a==='speech-cards'?'speech':a==='c-tpr-cards'?'tpr':'literacy');return;}
    if(lesson.level==='C'&&a==='todays-speech'&&lesson.speeches?.length){
      frame(`${crumb('Speech Book')}<div id="m10-c-speech"></div>`);
      activeCleanup=window.M10LevelC.mountTodaysSpeech({lesson,topicImageOverrides:data.speechTopicArt?.[lesson.level]?.[lesson.week],root:el('#m10-c-speech'),assets,base:BASE,mute,mountVoiceRows:mountCVoiceRows});return;
    }
    if(a==='extra-practice'){extraPracticeMenu();return;}
    if(a==='practice-cards'){cards('cards');return;}
    if(lesson.level==='A'&&a==='cards'){cards('cards');return;}
    if(/^practice-lesson-\d+$/.test(a)){literacyPage(Math.max(3,Math.min(literacyPageCount(),Number(a.split('-')[2])+2)),true);return;}
    if(/^lesson-\d+$/.test(a)){literacyPage(Math.max(1,Math.min(literacyPageCount(),Number(a.split('-')[1]))));return;}
    if(['cards','sentences','speak'].includes(a)&&lesson.literacyPages?.some(p=>p.type==='key-sentences')){location.hash=`lesson-${lesson.literacyPages.findIndex(p=>p.type==='key-sentences')+1+literacyOpeningOffset()}`;return;}
    if(a==='writing'&&lesson.literacyPages?.length){location.hash='practice-lesson-2';return;}
    if(a==='place'&&lesson.literacyPages?.some(p=>p.type==='read-place')){location.hash=`lesson-${lesson.literacyPages.findIndex(p=>p.type==='read-place')+1+literacyOpeningOffset()}`;return;}
    if(a==='page1'||a==='page2'){location.hash=a==='page1'?'lesson-1':'lesson-2';return;}
    if(['song','conversation','tpr'].includes(a)){pendingMedia(a);return;}
    if(['wonder-world','puzzle-park','phonics-games'].includes(a)){gameWorld(a);return;}
    if(['cards','writing','word-practice'].includes(a)){if(a==='word-practice'&&!lesson.phonics.words.length)menu('phonics');else cards(a);}
    else if(a==='sentences'||a==='speak')sentences(a==='speak');else if(a==='match')matching();else if(a==='place')placement();else if(a==='memory')memoryGame();else if(['literacy','reading','phonics','games'].includes(a))menu(a);else weekHome();
  }
  function extraPracticeMenu(){
    frame(`<header class="hero center"><h1 class="title">Extra Practice</h1><p class="subtitle">More ways to practise the words from your book.</p></header><div class="tool-grid">${tool('practice-lesson-1','cards','Picture Match','Listen and find a picture')}${tool('practice-lesson-2','pen','Trace & say','Practise word-based sentences')}${tool('practice-cards','cards','Word Flashcards','Hear and practise the picture words')}${tool('memory','puzzle','Memory Pairs','Find matching pictures')}</div><div class="actions"><a class="primary" href="#lesson-1">← Back to the book</a></div>`);
  }
  function literacyHeader(page){
    const extra=isExtraPractice(),first=extra?3:1,count=literacyPageCount(),indices=Array.from({length:count-first+1},(_,i)=>i+first);
    if(lesson.level==='C'&&!extra)return `<header class="c-heading"><p class="month-label">Month 10 · Level C · Week ${lesson.week}</p><h1>${esc(displayWeekTitle(lesson))}</h1></header><nav class="week-tools" aria-label="Literacy tools"><a class="pill-btn orange" href="#song">🎵 Week Song</a><a class="pill-btn blue" href="#cards">🃏 Flashcards</a><a class="pill-btn green" href="#conversation">💬 Conversation</a></nav><nav class="c-tabs" aria-label="Literacy pages">${indices.map(n=>`<a href="${literacyPageHref(n)}" ${page===n?'aria-current="page"':''}>${n}</a>`).join('')}</nav>`;
    return `<header class="literacy-week-heading"><p class="month-label">Month 10 · Level ${lesson.level} · Week ${lesson.week}${extra?' · Extra Practice':''}</p><h1 class="title">${esc(displayWeekTitle(lesson))}</h1><nav class="week-tools" aria-label="Literacy tools"><a class="pill-btn orange" href="#song">🎵 Week Song</a><a class="pill-btn blue" href="#cards">🃏 Flashcards</a><a class="pill-btn green" href="#conversation">💬 Conversation</a>${lesson.level==='C'&&lesson.speechCards?.length?'<a class="pill-btn blue" href="#speech-cards">💬 Speech Book</a><a class="pill-btn green" href="#todays-speech">Today’s Speech</a>':''}</nav></header><nav class="literacy-page-nav" aria-label="Literacy page sequence"><strong class="literacy-page-nav__status">${extra?'Practice':'Page'} ${page-first+1} of ${indices.length}</strong><div class="literacy-page-nav__links">${indices.map((n,i)=>`<a href="${literacyPageHref(n)}" aria-label="${extra?'Practice':'Literacy'} page ${i+1}" ${page===n?'aria-current="page"':''}>${i+1}</a>`).join('')}</div></nav>`;
  }
  const literacyFooter = () => '';
  function pendingVideo(title,detail){return `<section class="m10-media-pending"><div>${icon('play')}<h2>${title}</h2><p>${detail}</p><span class="reserved-tag">Video pending</span></div></section>`;}
  function literacyPage(page,adaptedPractice=false){
    if(!adaptedPractice&&page===1){
      frame(`${literacyHeader(page)}<section class="card literacy-video-card" id="lesson-focus" data-korean-dub="${esc(lesson.id)}" aria-label="Korean dubbed lesson video"><h2>Korean dubbed video</h2><div class="literacy-video-placeholder" role="status"><div><span aria-hidden="true">🎬</span><strong>Video coming soon</strong><p>The Korean-dubbed opening video will appear here when it is ready.</p></div></div></section>`);return;
    }
    if(!adaptedPractice&&lesson.level!=='C'&&page===2){
      const mainInterviewVideos=lesson.level==='A'?(data?.weekActivities?.A?.[lesson.week]?.interviewVideos||[]):(lesson.literacyVideos||[]);
      const pending='<section class="card ees-player-card" id="lesson-focus" aria-label="Sentence videos"><div class="ees-video-shell"><div class="m10-video-empty" role="status"><span aria-hidden="true">🎬</span><h2>Sentence videos coming soon</h2></div></div></section>';
      frame(`${literacyHeader(page)}${mainInterviewVideos.length?'<div id="m10-sentence-videos"></div>':pending}<div class="ees-continue"><a class="primary" href="${literacyPageHref(page+1)}">Next Activity →</a></div>`);
      if(mainInterviewVideos.length&&window.M10LiteracyVideos)activeCleanup=window.M10LiteracyVideos.mount({root:el('#m10-sentence-videos'),items:mainInterviewVideos,base:BASE,assets,showReviewState:false});return;
    }
    if(!adaptedPractice&&lesson.literacyPages?.length&&window.M10BookLiteracy){
      const bookPage=lesson.literacyPages[page-1-literacyOpeningOffset()],speaking=['interview','scene-dialogue','picture-quiz','key-sentences'].includes(bookPage.type);
      const nativeA=lesson.level==='A';
      frame(`${literacyHeader(page)}<div id="m10-book-literacy"></div>${speaking?(nativeA?'<div id="m10-a-book-voice"></div>':recorderHTML()):''}${literacyFooter(page)}`);
      recorderPrompt=null;
      if(speaking&&!nativeA)setupRecorder();
      const version=epoch,bookRoot=el('#m10-book-literacy');
      const reward=nativeA?aReward(bookRoot):null;
      let promptVoice=null,pendingPrompt=null,disposeVoice=()=>{};
      const sourcePrompts=nativeA&&speaking?(bookPage.type==='key-sentences'?(bookPage.cards?.length?bookPage.cards.map(card=>({text:card.label,speaker:card.speaker})):bookPage.lines||[]):bookPage.type==='picture-quiz'?[bookPage.question,bookPage.answer,typeof bookPage.listenPrompt==='string'?{text:bookPage.listenPrompt,speaker:bookPage.answer?.speaker}:bookPage.listenPrompt]:bookPage.lines||[]).filter(prompt=>prompt?.text).filter((prompt,index,all)=>all.findIndex(p=>p.text===prompt.text&&p.speaker===prompt.speaker)===index).map((prompt,index)=>({...prompt,id:`${bookPage.id}-prompt-${index}`})):[];
      const updatePrompt=prompt=>{if(version!==epoch||!bookRoot.isConnected)return;if(!nativeA){setRecorderPrompt(prompt);return;}pendingPrompt=prompt;const selected=sourcePrompts.find(p=>p.text===prompt.text&&p.speaker===prompt.speaker)||sourcePrompts.find(p=>p.text===prompt.text);if(selected&&promptVoice)promptVoice.setPrompt(selected.id);};
      function completion(done){
        if(version!==epoch||!bookRoot.isConnected)return;
        bookRoot.dataset.complete=String(!!done);
        reward?.complete(done);
      }
      completion(false);
      const disposeBook=window.M10BookLiteracy.mount({root:bookRoot,page:bookPage,lesson,assets,base:BASE,speak,mute,completionPolicy:data?.weekActivities?.[lesson.level]?.[lesson.week]?.pagePolicies?.[bookPage.id]||{},interviewVideos:data?.weekActivities?.[lesson.level]?.[lesson.week]?.interviewVideos||[],onMediaStart:()=>{if(version===epoch&&bookRoot.isConnected&&speaking&&!nativeA)setupRecorder(recorderPrompt);},onPromptChange:updatePrompt,onComplete:completion});
      if(nativeA&&speaking&&sourcePrompts.length){
        if(['interview','scene-dialogue'].includes(bookPage.type)){
          const rows=els('[data-book-line]',bookRoot).map((button,index)=>{const cue=document.createElement('div');cue.className='m10-book-line m10-a-book-line-cue';cue.innerHTML=button.innerHTML;cue.dataset.bookLine=String(index);button.replaceWith(cue);const host=document.createElement('section');host.className='m10-a-book-voice-row';cue.after(host);return{id:`${bookPage.id}-line-${index}`,text:bookPage.lines[index].text,element:host};});
          disposeVoice=window.M10ARowRecording.mount({root:bookRoot,rows,...aRecordingOptions(),onListenComplete:(prompt,ok)=>{if(ok)disposeBook.markListened?.(rows.findIndex(row=>row.id===prompt.id),prompt.text);}});el('#m10-a-book-voice').remove();
        }else{
          promptVoice=window.M10ARowRecording.mountPrompt({root:el('#m10-a-book-voice'),prompts:sourcePrompts,...aRecordingOptions(),onListenComplete:(prompt,ok)=>{if(ok&&bookPage.type==='key-sentences')disposeBook.markListened?.(sourcePrompts.findIndex(row=>row.id===prompt.id),prompt.text);}});
          if(bookPage.type==='key-sentences')el('[data-book-key-listen]',bookRoot)?.remove();
          if(pendingPrompt)updatePrompt(pendingPrompt);disposeVoice=promptVoice.dispose;
        }
      }
      activeCleanup=()=>{reward?.dispose();disposeVoice();recordingActive=false;disposeBook();};return;
    }
    if(page===2&&Array.isArray(lesson.literacyVideos)&&lesson.literacyVideos.length&&window.M10LiteracyVideos){
      frame(`${literacyHeader(page)}<div id="m10-sentence-videos"></div>${literacyFooter(page)}`);
      activeCleanup=window.M10LiteracyVideos.mount({root:el('#m10-sentence-videos'),items:lesson.literacyVideos,base:BASE,assets});return;
    }
    if(lesson.level==='C'&&page===2){
      frame(`${literacyHeader(page)}<section class="card placeholder-panel" id="lesson-focus"><h2>🌈 My Sticker Picture</h2><p class="instruction">Drag a sticker into its white space—or tap to place!</p><p class="note">Your Month 10 sticker scene is being prepared from the supplied books.</p><span class="reserved-tag">Clean scene artwork pending</span><div class="actions"><a class="primary" href="#place">🧩 Practise with book pictures</a></div></section>${literacyFooter(page)}`);return;
    }
    if(lesson.level==='C'&&page>=4&&window.M10LevelC){
      frame(`${literacyHeader(page)}<div id="m10-c-page"></div>${literacyFooter(page)}`);
      let disposeReward=()=>{};
      const disposePage=window.M10LevelC.mount({lesson,page,root:el('#m10-c-page'),assets,base:BASE,speak,mute,showNext:()=>{},onComplete:()=>{disposeReward();disposeReward=window.M10CRewards?.show({title:'Great job!',cancelSpeech:mute,returnFocus:document.activeElement})||(()=>{});}});
      activeCleanup=()=>{disposeReward();disposePage();};return;
    }
    if(page<3){
      const heading=page===1?'Let’s watch and listen!':'Let’s watch and say!';
      frame(`${literacyHeader(page)}${pendingVideo(heading,page===1?'The Month 10 opening video will go here when it is supplied.':'The Month 10 sentence videos will go here when they are supplied.')}<p class="m10-source-note">${page===1?'Page 1 · Korean-dubbed opening video':'Page 2 · Sentence video activities'}</p>${literacyFooter(page)}`);return;
    }
    const group=Math.floor((page-3)/2);let targets=practiceDeck().slice(group*2,group*2+2);
    if(lesson.level==='C'&&lesson.writing?.length)targets=lesson.writing.map(w=>{const card=lesson.cards.find(c=>c.label===w.word||c.label.includes(w.word));return {...w,imageKey:card?.imageKey||(w.word==='friend'?'m10-c-05-p5':lesson.cards[0].imageKey),label:w.word};});
    if(page%2===1&&lesson.level!=='C'){
      frame(`${literacyHeader(page)}<section class="card match-activity" id="lesson-focus"><h2>🌈 Find the picture!</h2><p class="instruction">Pick a picture. Win a star! ⭐</p><div class="match-star-track" aria-label="Collect ${targets.length} stars">${targets.map(()=>'<span aria-hidden="true">☆</span>').join('')}</div>${targets.map((c,i)=>{const alternative=shuffle(practiceDeck().filter(x=>x.id!==c.id))[0];return `<section class="match-row m10-match-row" data-literacy-row="${i}"><div class="match-prompt"><h3>${esc(c.label)}</h3><button class="match-listen" data-say="${esc(c.label)}" aria-label="Listen to ${esc(c.label)}">🔊 Listen</button></div><div class="picture-choices">${shuffle([c,alternative]).map((choice,n)=>`<button class="picture-choice" data-row="${i}" data-card="${choice.id}" data-word="${esc(choice.label)}" data-no-click-sound aria-label="Choose picture ${n+1}: ${esc(choice.label)}">${img(choice.imageKey,choice.label)}<span class="answer-mark" aria-hidden="true"></span></button>`).join('')}</div><p class="match-feedback" role="status">Choose the matching picture.</p></section>`;}).join('')}<p class="activity-result" id="literacy-result" role="status"></p><button class="reset-button" id="reset-literacy">🎲 Play again!</button></section>${literacyFooter(page)}`);
      const solved=new Set();
      els('[data-row]').forEach(b=>b.onclick=()=>{
        const i=+b.dataset.row,c=targets[i],row=el(`[data-literacy-row="${i}"]`),choice=practiceDeck().find(card=>card.id===b.dataset.card);
        // Every picture remains a listening choice, including after its row is solved.
        if(solved.has(i)){speak(choice.label);return;}
        const correct=b.dataset.card===c.id;
        els('.picture-choice',row).forEach(x=>{x.classList.remove('is-wrong');if(!x.classList.contains('is-correct'))el('.answer-mark',x).textContent='';});
        speak(choice.label,ok=>{if(ok){window.gpFeedbackSounds?.[correct?'correct':'wrong']?.();if(correct)speak(c.sentence);}});
        if(correct){
          solved.add(i);b.classList.add('is-correct');b.setAttribute('aria-pressed','true');el('.answer-mark',b).textContent='✓';el('.match-feedback',row).textContent=c.sentence;
          els('.match-star-track span')[i].classList.add('is-earned');els('.match-star-track span')[i].textContent='★';
          if(solved.size===targets.length){el('#literacy-result').textContent='Wonderful! You found every picture. ⭐';const next=el('.gp-activity-next');if(next)next.dataset.visible='true';}
        }else{b.classList.add('is-wrong');el('.answer-mark',b).textContent='×';el('.match-feedback',row).textContent='Have another look. Try again!';}
      });
      el('#reset-literacy').onclick=()=>{mute();literacyPage(page);};return;
    }
    const nativeC=lesson.level==='C',nativeA=lesson.level==='A';
    const rowsHTML=window.M10LiteracyTracing.rowsHTML(targets,img);
    const writingBody=nativeC?`<section class="card writing-activity source-pairs" id="lesson-focus"><h2>✏️ Write and Say</h2><div class="sentence-practice">${rowsHTML}</div><button id="writing-done" data-writing-done hidden>I’ve finished practicing</button><p class="activity-result" id="writing-result" role="status" hidden></p></section>`:`<section class="card writing-activity source-pairs" id="lesson-focus"><h2>✏️ Trace & say!</h2><p class="instruction">Trace it. Hear it. Say it! ⭐</p>${rowsHTML}${nativeA?'':recorderHTML()}<p class="note">Follow the letters and have a go! 🌟</p><button class="primary" id="writing-done" data-writing-done>I’ve finished practicing</button><p class="activity-result" id="writing-result" role="status" aria-live="polite"></p></section>`;
    frame(`${literacyHeader(page)}${writingBody}${literacyFooter(page)}`);
    if(!nativeC&&!nativeA)setupRecorder();
    const reward=nativeA?aReward(el('#lesson-focus')):null;
    const traceCleanup=window.M10LiteracyTracing.mount({root:el('#lesson-focus'),lessonId:lesson.id,page,mute,onReward:nativeA?()=>reward.complete(true):undefined,onComplete:complete=>{if(nativeA)reward.complete(complete);const next=el('.gp-activity-next');if(next)next.dataset.visible=complete?'true':'false';}});
    const voiceRows=targets.map((target,index)=>({id:String(index),text:target.sentence}));
    const voiceCleanup=nativeC?mountCVoiceRows(el('#lesson-focus'),voiceRows):nativeA?window.M10ARowRecording.mount({root:el('#lesson-focus'),rows:voiceRows,...aRecordingOptions()}):()=>{};
    activeCleanup=()=>{reward?.dispose();voiceCleanup();recordingActive=false;traceCleanup();};
    if(!nativeC&&!nativeA)els('[data-practice]').forEach(b=>b.onclick=()=>{el('#record-status').textContent=`Your turn: ${targets[+b.dataset.practice].sentence}`;el('#record').scrollIntoView({block:'center',behavior:'smooth'});el('#record').click();});
  }
  function pendingMedia(type){
    if(lesson.level==='A'&&window.M10AMedia){frame('<div id="m10-a-media"></div>');el('#main').className='m10-a-media-host';activeCleanup=window.M10AMedia.mount({root:el('#m10-a-media'),kind:type,week:lesson.week,base:BASE,returnHref:cLiteracyReturn().href});return;}
    const title=type==='song'?'Week Song':type==='conversation'?'Conversation':'TPR';
    frame(`<header class="hero center"><h1 class="title">${title}</h1><p class="subtitle">Level ${lesson.level} · Week ${lesson.week}</p></header>${pendingVideo(title,`The Month 10 ${type==='song'?'song':type==='tpr'?'action clips':'conversation video'} will be added when available.`)}`);
  }
  function aSourceGame(activity){
    frame('<div id="m10-a-source-game"></div>');document.body.dataset.gameCategory='wonder-world';
    const root=el('#m10-a-source-game'),version=epoch;let rewardCleanup=()=>{},disposed=false;
    const disposeGame=window.M10AGames.mount({root,kind:activity==='memory'?'memory':aSourceGameRoutes[activity],week:aGameWeek(),assets,base:BASE,headingIconKey:data.gameUI.A.menuIcons[activity],bonuses:data.gameUI.A.bonuses,speak:(text,end)=>speak(text,end,{localOnly:true}),cancelSpeech:mute,onReward:({returnFocus}={})=>{if(disposed||version!==epoch||document.hidden)return()=>{};rewardCleanup();rewardCleanup=window.M10ARewards.show({cancelSpeech:mute,returnFocus});return rewardCleanup;},onReturn:()=>{location.href=cActivityHref('wonder-world');}});
    activeCleanup=()=>{disposed=true;rewardCleanup();disposeGame();};
  }
  function aAdventure(activity){
    const config=aAdventureRoutes[activity],paths=['path','maze'].includes(config.kind);
    frame('<div id="m10-a-adventure"></div>');document.body.dataset.gameCategory=config.world;
    const root=el('#m10-a-adventure'),version=epoch;let rewardCleanup=()=>{},disposed=false;
    const disposeGame=(paths?window.M10APathGames:window.M10AAdventures).mount({root,kind:config.kind,week:paths?aGameWeek():data.games.A.adventures.weeks[String(lesson.week)],assets,base:BASE,speak:(text,end)=>speak(text,end,{localOnly:true}),cancelSpeech:mute,onReturn:()=>{location.href=cActivityHref(config.world);},onReward:({returnFocus}={})=>{if(disposed||version!==epoch||document.hidden)return()=>{};rewardCleanup();rewardCleanup=window.M10ARewards.show({cancelSpeech:mute,returnFocus});return rewardCleanup;}});
    activeCleanup=()=>{disposed=true;rewardCleanup();disposeGame();};
  }
  function cSourceGame(activity){
    const kind=cSourceGameRoutes[activity],week=cGameWeek(),words=activity==='c-game-words';
    const world=cGameWorldFor(activity);
    frame('<div id="m10-c-source-game"></div>');
    document.body.dataset.gameCategory=world==='phonics-games'?'phonics':world;
    const root=el('#m10-c-source-game');
    if((words&&!cWordRounds().length)||(!words&&!week)){
      root.innerHTML='<section class="card"><h1>More games soon</h1><p>Choose another game for now.</p></section>';return;
    }
    let rewardCleanup=()=>{};
    const celebrate=({title='Great job!',returnFocus}={})=>{rewardCleanup();rewardCleanup=window.M10CRewards?.show({title,returnFocus,cancelSpeech:mute})||(()=>{});return rewardCleanup;};
    const disposeGame=words
      ?window.M10CWordBuilder.mount({root,rounds:cWordRounds(),assets,base:BASE,speak:(text,onEnd)=>speak(text,onEnd,{localOnly:true}),cancelSpeech:mute,onComplete:()=>celebrate({title:'You built every word!'})})
      :window.M10CGames.mount({root,kind,items:week.wheelCards,bonuses:data.gameUI?.C?.bonuses||[],headingIconKey:data.gameUI?.C?.menuIcons?.[activity],rounds:kind==='picture-match'?week.pictureRounds:kind==='pick-right'?week.pickRounds:week.compareRounds,assets,base:BASE,speak:(text,onEnd)=>speak(text,onEnd,{localOnly:true}),mute,onReward:celebrate,onReturn:()=>{location.href=cActivityHref(world);}});
    activeCleanup=()=>{rewardCleanup();disposeGame?.();};
  }
  function gameWorlds(){
    const worlds=[['wonder-world','Wonder World','Pictures, stories and discovery','category-wonder-world.png'],['phonics-games','Phonics','Letters and sounds','category-phonics.png'],['puzzle-park','Puzzle Park','Puzzles, patterns and counting','category-puzzle-park.png']];
    if(['A','C'].includes(lesson.level)){
      frame(`<header class="game-list-header"><h1 class="game-list-title">Choose a game world</h1><p class="game-list-subtitle">Level ${lesson.level} · Month 10 · Week ${lesson.week}</p></header><nav class="category-worlds" aria-label="Game worlds">${worlds.map(([id,title,sub,art])=>`<a class="game-nav-card" data-game-category="${id==='phonics-games'?'phonics':id}" href="${cActivityHref(id,'')}"><img class="category-art" src="${staticPicture('assets/ui/'+art)}" alt=""><span class="game-nav-card__label">${title}</span><span class="category-hint">${sub}</span></a>`).join('')}</nav>`);return;
    }
    frame(`<section class="game-list-shell"><header class="game-list-header"><h1 class="game-list-title">Choose a game world</h1><p class="game-list-subtitle">Level ${lesson.level} · Month 10 · Week ${lesson.week}</p></header><nav class="category-worlds" aria-label="Game worlds">${worlds.map(([id,title,sub,art])=>`<a class="game-nav-card" data-game-category="${id==='phonics-games'?'phonics':id}" href="#${id}"><img class="category-art" src="${staticPicture('assets/ui/'+art)}" alt=""><span class="game-nav-card__label">${title}</span><span class="category-hint">${sub}</span></a>`).join('')}</nav></section>`);
  }
  function gameWorld(world){
    try{sessionStorage.setItem(`m10-world:${lesson.id}`,world);sessionStorage.setItem(`m10-last:${lesson.id}`,world==='phonics-games'&&cPhonicsOrigin()?'phonics':'games');}catch{}
    if(lesson.level==='A'){aGameMenu(world);return;}
    const title={'wonder-world':'Wonder World','phonics-games':'Phonics','puzzle-park':'Puzzle Park'}[world];
    const options=lesson.level==='A'?[]:world==='wonder-world'?[['match','🌈','Picture Match'],['place','🧩','Sentence Match']]:world==='puzzle-park'?[['memory','🃏','Memory Pairs']]:lesson.phonics.words.length?[['word-practice','🔤','Picture Words']]:[];
    if(['A','C'].includes(lesson.level)){
      const art={'wonder-world':'category-wonder-world.png','phonics-games':'category-phonics.png','puzzle-park':'category-puzzle-park.png'}[world];
      const reviewed=(lesson.level==='A'?aGameWeek():cGameWeek())?.menu?.filter(item=>item.world===world);
      const entries=world==='phonics-games'?options.map(([id,ic,name])=>({route:id,title:name,hint:'Listen to the whole word and find its letter team.'})):(reviewed?.length?reviewed:options.map(([id,ic,name])=>({route:id,title:name,hint:'Listen, look, and have a go.'})));
      if(lesson.level==='C'&&world==='phonics-games'&&cWordRounds().length)entries.push({route:'c-game-words',title:'Word Builder',hint:'Tap the letters to build the word!'});
      frame(`<header class="game-list-header"><h1 class="game-list-title"><img class="game-list-title__icon" src="${staticPicture('assets/ui/'+art)}" alt="">${title}</h1><p class="game-list-subtitle">Level ${lesson.level} · Month 10 · Week ${lesson.week}</p></header><nav class="game-card-grid" aria-label="${title} activities">${entries.map(item=>`<a class="game-nav-card" href="${cActivityHref(item.route)}" data-c-game-link="${item.route}">${img(data.gameUI[lesson.level].menuIcons[item.route],'','class="game-nav-card__icon"')}<span class="game-nav-card__label">${esc(item.title)}</span><span class="game-nav-card__hint">${esc(item.hint)}</span></a>`).join('')}</nav>${entries.length?'':'<section class="pending-list"><h2>More games soon</h2><p>Choose Wonder World to play now.</p></section>'}`);
      document.body.dataset.gameCategory=world==='phonics-games'?'phonics':world;
      const key=`m10-${lesson.level.toLowerCase()}-game-focus:${lesson.id}:${world}`;
      els('[data-c-game-link]').forEach(anchor=>anchor.onclick=(event={detail:1})=>{try{sessionStorage.setItem(key,JSON.stringify({world,id:anchor.dataset.cGameLink,top:anchor.getBoundingClientRect().top,y:scrollY,time:Date.now(),keyboard:event.detail===0}));}catch{}});
      try{const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(saved&&saved.world===world&&Date.now()-saved.time<86400000&&previousRoute?.activity===saved.id){const restoreEpoch=epoch,restoreLesson=lesson.id;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(epoch!==restoreEpoch||lesson?.id!==restoreLesson||!['A','C'].includes(route.level)||route.activity!==world)return;const anchor=el(`[data-c-game-link="${saved.id}"]`);if(anchor){window.scrollTo({top:Math.max(0,scrollY+anchor.getBoundingClientRect().top-saved.top),behavior:'instant'});if(saved.keyboard)anchor.focus({preventScroll:true});}else window.scrollTo({top:saved.y,behavior:'instant'});sessionStorage.removeItem(key);}));}else sessionStorage.removeItem(key);}catch{}
      return;
    }
    frame(`<section class="game-list-shell"><h1 class="game-list-title">${title}</h1><p class="game-list-subtitle">Level ${lesson.level} · Month 10 · Week ${lesson.week}</p><div class="game-links">${options.map(([id,ic,name])=>`<a class="game-link" href="#${id}"><span aria-hidden="true">${ic}</span><span>${name}</span></a>`).join('')}</div><section class="pending-list"><h3>More ${title} activities are on the way</h3><p>New Month 10 scenes and source-aligned games will be added as they are ready.</p></section><div class="actions"><a class="primary" href="#games">← All game worlds</a></div></section>`);
    document.body.dataset.gameCategory=world==='phonics-games'?'phonics':world;
  }
  function aGameMenu(world){
    const title={'wonder-world':'Wonder World','phonics-games':'Phonics','puzzle-park':'Puzzle Park'}[world],art={'wonder-world':'category-wonder-world.png','phonics-games':'category-phonics.png','puzzle-park':'category-puzzle-park.png'}[world];
    const entries=(data.gameUI.A.menu||[]).filter(item=>item.world===world),primary=world==='wonder-world'?4:world==='phonics-games'?7:0;
    const card=item=>{const available=item.available&&(item.route==='memory'||!!aSourceGameRoutes[item.route]||!!aAdventureRoutes[item.route]);return`<a class="game-nav-card" ${available?`href="${cActivityHref(item.route)}" data-a-game-link="${item.route}"`:'role="link" aria-disabled="true" tabindex="0"'}>${img(item.iconKey,'','class="game-nav-card__icon"')}<span class="game-nav-card__label">${esc(item.title)}</span><span class="game-nav-card__hint">${esc(available?item.hint:item.available?'Activity coming soon.':item.hint)}</span></a>`;};
    const grid=(items,label)=>`<nav class="game-card-grid" aria-label="${label}">${items.map(card).join('')}</nav>`;
    frame(`<header class="game-list-header"><h1 class="game-list-title"><img class="game-list-title__icon" src="${staticPicture('assets/ui/'+art)}" alt="">${title}</h1><p class="game-list-subtitle">Level A · Month 10 · Week ${lesson.week}</p></header>${primary?grid(entries.slice(0,primary),world==='wonder-world'?'General games':'Phonics games'):''}<section class="broader-adventures"><h2>${world==='puzzle-park'?'Choose an adventure':world==='phonics-games'?'Ready to Play':'More to explore'}</h2>${grid(entries.slice(primary),'More '+title+' games')}</section>`);
    document.body.dataset.gameCategory=world==='phonics-games'?'phonics':world;
    const key=`m10-a-game-focus:${lesson.id}:${world}`;
    els('[data-a-game-link]').forEach(anchor=>anchor.onclick=(event={detail:1})=>{try{sessionStorage.setItem(key,JSON.stringify({world,id:anchor.dataset.aGameLink,top:anchor.getBoundingClientRect().top,y:scrollY,time:Date.now(),keyboard:event.detail===0}));}catch{}});
    try{const saved=JSON.parse(sessionStorage.getItem(key)||'null');if(saved&&saved.world===world&&Date.now()-saved.time<86400000&&previousRoute?.activity===saved.id){const version=epoch,id=lesson.id;requestAnimationFrame(()=>requestAnimationFrame(()=>{if(epoch!==version||lesson?.id!==id||route.activity!==world)return;const anchor=el(`[data-a-game-link="${saved.id}"]`);if(anchor){window.scrollTo({top:Math.max(0,scrollY+anchor.getBoundingClientRect().top-saved.top),behavior:'instant'});if(saved.keyboard)anchor.focus({preventScroll:true});}else window.scrollTo({top:saved.y,behavior:'instant'});sessionStorage.removeItem(key);}));}else sessionStorage.removeItem(key);}catch{}
  }
  function readRoute(){
    const match=location.pathname.match(/level-([abc])\/(?:week-([1-4])\.html|index\.html)?$/i), params=new URLSearchParams(location.search);
    const level=(match?.[1]||params.get('level')||'A').toUpperCase(),week=Number(match?.[2]||params.get('week')||0);
    return {level:levels[level]?level:'A',week:[1,2,3,4].includes(week)?week:0,activity:decodeURIComponent(location.hash.slice(1))};
  }
  function navigate(){
    previousRoute=route?{...route}:null;
    const old=route?`${route.level}${route.week}:${route.activity}`:'';if(old)visitScroll.set(old,window.scrollY);
    epoch++;cleanupAudio();recorderPrompt=null;activeCleanup();activeCleanup=()=>{};route=readRoute();assets=pictureAssetsForLevel(canonicalAssets||assets,route.level);lesson=data.lessons.find(l=>l.level===route.level&&l.week===route.week);pageIndex=flashIndex=matchIndex=0;
    if(lesson?.id==='a4'&&window.M10AWeek4)lesson=window.M10AWeek4.lessonView(lesson,data?.weekActivities?.A?.['4']);
    if(lesson&&/^lesson-\d+$/.test(route.activity))try{sessionStorage.setItem(`${lesson.level==='C'?'m10-c-page':'m10-literacy-page'}:${lesson.id}`,Math.max(1,Math.min(literacyPageCount(),Number(route.activity.slice(7)))));}catch{}
    document.title=`GP English · Month 10 · Level ${route.level}${lesson?` · Week ${lesson.week}`:''}`;
    if(!lesson)home();else renderActivity(route.activity);
    const key=`${route.level}${route.week}:${route.activity}`,saved=visitScroll.get(key);
    requestAnimationFrame(()=>{window.scrollTo(0,saved??0);if(!route.activity&&lesson){let last;try{last=sessionStorage.getItem(`m10-last:${lesson.id}`);}catch{}if(last){const card=el(`#card-${last}`);card?.focus({preventScroll:true});}}});
    if((!lesson||!route.activity||route.activity.startsWith('card-'))&&saved===undefined){
      const version=epoch;let interacted=false;const stop=()=>{interacted=true;};const events=['pointerdown','wheel','touchstart','keydown'];events.forEach(name=>window.addEventListener(name,stop,{once:true,passive:true}));const oldCleanup=activeCleanup;activeCleanup=()=>{events.forEach(name=>window.removeEventListener(name,stop));oldCleanup();};
      document.fonts?.ready.then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{if(version!==epoch||interacted||performance.getEntriesByType('navigation')[0]?.type==='back_forward')return;const target=el('.selection-choices')||el('.carousel-wrap');if(!target)return;const rect=target.getBoundingClientRect(),nav=el('.gp-navigation').getBoundingClientRect(),inset=Math.max(12,nav.height)+12,remaining=innerHeight-inset-24,offset=rect.height<=remaining?inset+(remaining-rect.height)/2:inset;window.scrollTo({top:Math.max(0,scrollY+rect.top-offset),behavior:'instant'});})));}
    if(lesson?.level==='A'&&/^lesson-\d+$/.test(route.activity)&&saved===undefined){
      const version=epoch;let interacted=false;const stop=()=>{interacted=true;},events=['pointerdown','wheel','touchstart','keydown'];events.forEach(name=>window.addEventListener(name,stop,{once:true,passive:true}));const oldCleanup=activeCleanup;activeCleanup=()=>{events.forEach(name=>window.removeEventListener(name,stop));oldCleanup();};
      Promise.resolve(document.fonts?.ready).then(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>{if(version!==epoch||interacted||performance.getEntriesByType('navigation')[0]?.type==='back_forward')return;const target=el('#lesson-focus');if(!target)return;const bounds=target.getBoundingClientRect(),inset=(el('.gp-navigation')?.getBoundingClientRect().height||56)+12,available=innerHeight-inset-20,offset=bounds.height<=available?inset+(available-bounds.height)/2:inset;window.scrollTo({top:Math.max(0,scrollY+bounds.top-offset),behavior:'instant'});})));}
    if(lesson&&['literacy','reading','phonics','games'].includes(route.activity))try{sessionStorage.setItem(`m10-last:${lesson.id}`,route.activity);}catch{}
  }
  window.addEventListener('hashchange',navigate);window.addEventListener('pagehide',()=>{epoch++;cleanupAudio();activeCleanup();});
  el('.skip-link')?.addEventListener('click',event=>{event.preventDefault();const main=el('#main');if(main){main.tabIndex=-1;main.focus({preventScroll:true});main.scrollIntoView({block:'start'});}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){if(route?.level!=='A')epoch++;cleanupAudio();const start=el('#record');if(start){start.disabled=false;start.classList.remove('recording');el('#record-stop').disabled=true;el('#record-play').disabled=true;el('#record-clear').disabled=true;el('#record-status').textContent='Recording cleared when you left the page.';}}else{if(el('#record'))setupRecorder();if(route?.activity==='memory'&&el('.memory-grid')){if(memoryPairs===memory.length/2)finish('You remembered every pair!','memory',true);else if(memoryBusy){flips.forEach(n=>{const tile=el(`[data-memory="${n}"]`);if(tile){tile.innerHTML=icon('leaf');tile.setAttribute('aria-label',`Turn over card ${n+1}`);}});flips=[];memoryBusy=false;}}}});
  Promise.all([fetch(new URL('data/lessons.json',BASE),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Lesson data missing');return r.json();}),fetch(new URL('data/assets.json',BASE),{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Picture data missing');return r.json();})]).then(([d,a])=>{data=d;canonicalAssets=new Map(a.assets.map(x=>[x.key,x]));assets=canonicalAssets;navigate();}).catch(e=>{app.innerHTML=`<main class="error"><h1>Let’s get this ready</h1><p>The local lesson data could not be loaded. Please run the Month 10 local build and open its preview server.</p><p>${esc(e.message)}</p></main>`;});
})();

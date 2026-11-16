/* Level C's native Month 9 Choose the Pictures / My Drawing interfaces.
 * Source: Month9/apps/level-c/literacy/week-1-page-{04,05}.html and level-c.js.
 * Content below is supplied Month 10 picture practice, not missing story comprehension.
 */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shuffle=input=>{const out=[...input];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
  function mount({lesson,page,root,assets,base,speak,showNext=()=>{},onComplete=()=>{}}){
    root=root||document.getElementById('m10-c-page');
    if(!root)throw new Error('Level C page root is missing');
    let disposed=false;
    const $=selector=>root.querySelector(selector),all=selector=>[...root.querySelectorAll(selector)];
    showNext(false);
    const image=(key,label)=>{const asset=assets.get(key);if(!asset)throw new Error('Missing Level C source picture: '+key);return `<img src="${esc(new URL(asset.path.replace(/^apps\//,''),base).href)}" alt="${esc(label)}" draggable="false">`;};
    const fromCard=card=>({id:card.id,label:card.label,imageKey:card.imageKey,feedback:card.sentence,correct:true,bookId:card.bookId,pdfPage:card.pdfPage});
    if(page===4){
      let prompt,targets,distractors;
      if(lesson.week===1){prompt='Which animals go into a den?';targets=lesson.cards.filter(c=>['fox','bear','raccoon','badger'].includes(c.label)).map(fromCard);distractors=[{id:'c2-goat',label:'goat',imageKey:'c2-goat',correct:false,bookId:'m10-c-05',pdfPage:13},{id:'c2-cow',label:'cow',imageKey:'c2-cow',correct:false,bookId:'m10-c-05',pdfPage:13}];}
      else if(lesson.week===2){prompt='Which animals graze on the grass?';targets=lesson.cards.filter(c=>['goat','cow','horse','sheep'].includes(c.label)).map(fromCard);distractors=[{id:'c1-fox',label:'fox',imageKey:'c1-fox',correct:false,bookId:'m10-c-05',pdfPage:7},{id:'c1-bear',label:'bear',imageKey:'c1-bear',correct:false,bookId:'m10-c-05',pdfPage:7}];}
      else if(lesson.week===3){prompt='Which pictures show hats?';targets=lesson.cards.map(fromCard);distractors=[{id:'c4-book',label:'book',imageKey:'c4-book',correct:false,bookId:'m10-c-05',pdfPage:19},{id:'c4-moon',label:'moon',imageKey:'c4-moon',correct:false,bookId:'m10-c-05',pdfPage:19}];}
      else{prompt='Which words have the letters o o?';targets=lesson.cards.filter(c=>['book','moon'].includes(c.label)).map(c=>({...fromCard(c),feedback:`${c.label[0].toUpperCase()+c.label.slice(1)} has the letters o o.`}));distractors=lesson.cards.filter(c=>['coin','soil'].includes(c.label)).map(c=>({...fromCard(c),correct:false}));}
      const options=shuffle([...targets,...distractors]),selected=new Set(),timers=new Set();
      root.dataset.sourceMapping=JSON.stringify({activity:'source-linked-multi-picture-practice',targets:targets.map(({id,bookId,pdfPage})=>({id,bookId,pdfPage})),distractors:distractors.map(({id,bookId,pdfPage})=>({id,bookId,pdfPage})),crossWeekDistractors:lesson.week===1||lesson.week===2,note:'Practice only; not the missing main Reading comprehension curriculum.'});
      root.innerHTML=`<section class="card m10-c-native"><h2>🌈 Choose the Pictures</h2><section class="els-pick"><h3>${esc(prompt)}</h3><p>Tap every right picture to circle it.</p><button class="reset-button" type="button" data-c-listen>🔊 Listen</button><div class="els-choices">${options.map(option=>`<div class="m10-els-choice"><button class="els-picture" type="button" data-c-pick="${esc(option.id)}" aria-label="Circle ${esc(option.label)}" aria-pressed="false">${image(option.imageKey,option.label)}</button><button class="reset-button m10-els-hear" type="button" data-c-hear="${esc(option.id)}" aria-label="Listen to ${esc(option.label)}">🔊 ${esc(option.label)}</button></div>`).join('')}</div><p class="quiz-feedback" role="status" aria-live="polite" data-c-status></p></section></section>`;
      $('[data-c-listen]').onclick=()=>speak(prompt);
      all('[data-c-hear]').forEach(button=>button.onclick=()=>speak(options.find(option=>option.id===button.dataset.cHear).label));
      all('[data-c-pick]').forEach(button=>button.onclick=()=>{
        if(disposed)return;const option=options.find(item=>item.id===button.dataset.cPick);if(selected.has(option.id))return;
        if(option.correct){selected.add(option.id);button.classList.add('is-correct');button.setAttribute('aria-pressed','true');window.gpFeedbackSounds?.correct?.();const done=selected.size===targets.length;$('[data-c-status]').textContent=done?'🌟 You found them all!':`⭐ Yes! ${selected.size} of ${targets.length} found.`;if(done){root.dataset.complete='true';showNext(true);speak(option.feedback,()=>{if(!disposed)onComplete({activity:'choose-pictures'});});}else speak(option.feedback);}
        else{window.gpFeedbackSounds?.wrong?.();button.classList.add('is-wrong');$('[data-c-status]').textContent='Try another picture!';const timer=setTimeout(()=>{timers.delete(timer);if(!disposed)button.classList.remove('is-wrong');},500);timers.add(timer);speak(option.label);}
      });
      return()=>{disposed=true;timers.forEach(clearTimeout);timers.clear();};
    }
    if(page!==5)throw new Error('Native C helper supports pages 4 and 5 only');
    const prompts={1:'Draw a den animal.',2:'Draw an animal grazing on the grass.',3:'Draw a hat you would like to wear.',4:'Draw a picture for one of your phonics words.'};
    const prompt=prompts[lesson.week];
    const colors=[['Black','#171717'],['Brown','#8b572a'],['Red','#ef4545'],['Orange','#f28a24'],['Yellow','#ffd43b'],['Green','#45a94e'],['Blue','#3b8fe6'],['Violet','#7d54c7'],['Pink','#f177ae']];
    root.innerHTML=`<section class="card m10-c-native"><h2>🎨 My Drawing</h2><section class="els-drawing" data-drawing="${lesson.week}"><h3>${esc(prompt)}</h3><button class="reset-button" type="button" data-c-listen>🔊 Listen</button><div class="els-colors" aria-label="Drawing colors">${colors.map(([name,color],i)=>`<button type="button" data-ink="${color}" aria-label="${name} crayon" aria-pressed="${i===0}" style="--ink:${color}">●</button>`).join('')}<button type="button" class="reset-button" data-eraser aria-label="Eraser" aria-pressed="false">⌫ Eraser</button></div><div class="els-brush-sizes" aria-label="Brush and eraser size"><strong>Size</strong><button class="reset-button" type="button" data-brush="14" aria-label="Small size" aria-pressed="false">Small</button><button class="reset-button" type="button" data-brush="30" aria-label="Medium size" aria-pressed="true">Medium</button><button class="reset-button" type="button" data-brush="52" aria-label="Large size" aria-pressed="false">Large</button></div><canvas width="800" height="520" aria-label="Drawing area: ${esc(prompt)}"></canvas><div class="voice-buttons"><button type="button" class="reset-button" data-clear-drawing>↻ Clear drawing</button><button type="button" class="primary" data-finish-drawing>⭐ I’m done!</button></div><p data-drawing-status role="status" aria-live="polite">Draw with your finger or mouse.</p></section></section>`;
    const canvas=$('canvas'),ctx=canvas.getContext('2d'),status=$('[data-drawing-status]'),key=`m10-c-drawing:${lesson.id}`;
    let ink=colors[0][1],brush=30,erasing=false,active=false,previous=null,hasDrawing=false,loading=false;
    const save=()=>{try{localStorage.setItem(key,canvas.toDataURL('image/png'));status.textContent='Your drawing is saved on this device.';}catch{status.textContent='Your drawing is ready. Keep this page open to keep it.';}};
    try{const stored=localStorage.getItem(key);if(stored){loading=true;const picture=new Image();picture.onload=()=>{if(disposed)return;ctx.drawImage(picture,0,0);hasDrawing=true;loading=false;status.textContent='Your drawing is here. Add to it, or tap I’m done!';};picture.onerror=()=>{loading=false;};picture.src=stored;}}catch{}
    $('[data-c-listen]').onclick=()=>speak(prompt);
    all('[data-ink]').forEach(button=>button.onclick=()=>{ink=button.dataset.ink;erasing=false;$('[data-eraser]').setAttribute('aria-pressed','false');all('[data-ink]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));});
    $('[data-eraser]').onclick=()=>{erasing=true;$('[data-eraser]').setAttribute('aria-pressed','true');all('[data-ink]').forEach(button=>button.setAttribute('aria-pressed','false'));};
    all('[data-brush]').forEach(button=>button.onclick=()=>{brush=Number(button.dataset.brush);all('[data-brush]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));});
    const point=event=>{const r=canvas.getBoundingClientRect();return{x:(event.clientX-r.left)*canvas.width/r.width,y:(event.clientY-r.top)*canvas.height/r.height};};
    canvas.onpointerdown=event=>{if(loading||disposed||event.button>0)return;event.preventDefault();active=true;previous=point(event);canvas.setPointerCapture(event.pointerId);ctx.globalCompositeOperation=erasing?'destination-out':'source-over';ctx.fillStyle=ink;ctx.beginPath();ctx.arc(previous.x,previous.y,brush/2,0,Math.PI*2);ctx.fill();if(!erasing)hasDrawing=true;delete root.dataset.complete;showNext(false);};
    canvas.onpointermove=event=>{if(!active||disposed)return;event.preventDefault();const p=point(event);ctx.globalCompositeOperation=erasing?'destination-out':'source-over';ctx.strokeStyle=ink;ctx.lineWidth=brush;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(p.x,p.y);ctx.stroke();previous=p;};
    const stopDrawing=()=>{if(active){active=false;if(!disposed)save();}};
    canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=stopDrawing;
    $('[data-clear-drawing]').onclick=()=>{if(loading)return;active=false;ctx.clearRect(0,0,canvas.width,canvas.height);hasDrawing=false;delete root.dataset.complete;try{localStorage.removeItem(key);}catch{}showNext(false);status.textContent='Ready for a new drawing!';};
    $('[data-finish-drawing]').onclick=()=>{if(disposed)return;if(!hasDrawing){status.textContent='Draw your idea first!';return;}save();root.dataset.complete='true';showNext(true);window.gpFeedbackSounds?.correct?.();speak('Wonderful drawing!',()=>{if(!disposed)onComplete({activity:'my-drawing'});});};
    const visibility=()=>{if(document.hidden)stopDrawing();};document.addEventListener('visibilitychange',visibility);
    return()=>{stopDrawing();disposed=true;document.removeEventListener('visibilitychange',visibility);canvas.onpointerdown=canvas.onpointermove=canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=null;};
  }
  // Speech Book stays separate from Literacy's cards and numbered activities.
  // Controls and frame sizes follow Month9/apps/level-c/literacy/flashcards.
  function speechDisplayDeck(sourceCards){
    const groups=new Map();
    // Owner decision, 2026-11-15: omit these two display cards only. The source
    // records stay canonical; the mole/holes pair below is an approved display
    // combination of two exact sentences, not one claimed printed quotation.
    const excludedIds=new Set(['c1-speech-fewer','c1-speech-more']);
    const combinedSentences={'c1-speech-mole':'I am a mole.','c1-speech-holes':'I dig holes.'};
    const combinedText='I am a mole. I dig holes.';
    sourceCards.forEach(sourceCard=>{
      if(excludedIds.has(sourceCard.id))return;
      const sentenceKey=String(sourceCard.sentence||'').replace(/\s+/g,' ').trim();
      if(!sentenceKey)throw new Error('Speech display cards require an exact source sentence');
      const combined=Object.hasOwn(combinedSentences,sourceCard.id);
      if(combined&&sentenceKey!==combinedSentences[sourceCard.id])throw new Error('Owner-approved mole/holes source text changed');
      const key=combined?'owner-combined:c1-mole-holes':sentenceKey;
      let card=groups.get(key);
      if(!card){card={...sourceCard,sourceCardIds:[],targetAliases:[],sourceTargets:[],sourceRefs:[]};if(combined){card.sentence=combinedText;card.sentenceKind='owner-authorized combination of two source-exact sentences';card.textStatus='owner-authorized-display-combination';card.displayAdaptation={kind:'owner-approved-source-sentence-combination',ownerDecisionDate:'2026-11-15',sourceSentences:Object.values(combinedSentences),notOnePrintedQuotation:true};}groups.set(key,card);}
      card.sourceCardIds.push(sourceCard.id);
      [sourceCard.label,sourceCard.phrase,sourceCard.word].forEach(alias=>{if(alias&&!card.targetAliases.includes(alias))card.targetAliases.push(alias);});
      card.sourceTargets.push({sourceCardId:sourceCard.id,label:sourceCard.label,phrase:sourceCard.phrase,word:sourceCard.word,sentence:sourceCard.sentence});
      card.sourceRefs.push({sourceCardId:sourceCard.id,bookId:sourceCard.bookId,sourceHash:sourceCard.sourceHash,pdfPage:sourceCard.pdfPage,printedPage:sourceCard.printedPage,topicId:sourceCard.topicId,imageKey:sourceCard.imageKey});
    });
    return [...groups.values()];
  }
  function mountFlashcards({lesson,speechDisplayCards,root,assets,base,speak,mute,initialSource='literacy',onSourceChange=()=>{}}){
    if(!root)throw new Error('The native C flashcard root is missing');
    const $=selector=>root.querySelector(selector),all=selector=>[...root.querySelectorAll(selector)];
    const decks={literacy:[...(lesson.cards||[])],speech:speechDisplayCards?[...speechDisplayCards]:speechDisplayDeck(lesson.speechCards||[]),tpr:[]},cards=[];
    let source=initialSource,index=0,flipped=false,disposed=false,voiceToken=0;
    const image=card=>{const asset=assets.get(card.imageKey);if(!asset)throw new Error('Missing Speech Book illustration: '+card.imageKey);const url=new URL(asset.path.replace(/^apps\//,''),base);if(asset.sha256)url.searchParams.set('v',asset.sha256.slice(0,12));return url.href;};
    root.className='m10-c-speech';
    root.dataset.speechSourceCount=String(lesson.speechCards?.length||0);root.dataset.speechDisplayCount=String(decks.speech.length);
    root.innerHTML=`<header class="cfc-header"><h1>🃏 Week ${lesson.week} Flashcards</h1><p>Look, flip, and listen to every card!</p></header>
      <section class="cfc-board" aria-label="Flashcards">
      <div class="cfc-source-tabs" role="tablist" aria-label="Choose a flashcard book">${[['literacy','📘 Literacy'],['speech','💬 Speech Book'],['tpr','🎬 TPR']].map(([key,label])=>`<button class="cfc-source-tab" id="cfc-tab-${key}" type="button" role="tab" aria-selected="false" aria-controls="cfc-deck" data-cfc-source="${key}">${label}</button>`).join('')}</div>
      <p class="cfc-source-note" data-cfc-source-note></p><div id="cfc-deck" role="tabpanel" data-cfc-deck>
      <div class="cfc-status-row"><span class="cfc-counter" data-cfc-count></span><button class="cfc-shuffle" type="button" data-cfc-control data-cfc-shuffle>🔀 Shuffle</button></div>
      <div class="cfc-stage"><div class="cfc-card" role="button" tabindex="0" aria-label="Show the flashcard words" aria-pressed="false" data-cfc-card><div class="cfc-face cfc-front" aria-hidden="false"><img data-cfc-front alt="" draggable="false"><span class="cfc-hint">👆 Tap to see the words</span></div><div class="cfc-face cfc-back" aria-hidden="true"><img data-cfc-back alt="" draggable="false"><div class="cfc-copy"><h2 data-cfc-phrase></h2><p data-cfc-sentence></p></div><span class="cfc-hint">👆 Tap to see the picture</span></div></div><section class="cfc-pending" role="status" data-cfc-pending hidden><h2>TPR</h2><p>The Month 10 action clips are not supplied yet.</p></section></div>
      <div class="cfc-controls" aria-label="Flashcard controls"><button class="cfc-control cfc-orange" type="button" data-cfc-control data-cfc-previous>← Previous</button><button class="cfc-control cfc-blue" type="button" data-cfc-control data-cfc-flip>🔄 Flip</button><button class="cfc-control cfc-green" type="button" data-cfc-control data-cfc-listen>🔊 Listen</button><button class="cfc-control cfc-orange" type="button" data-cfc-control data-cfc-next>Next →</button></div>
      <p class="cfc-help" data-cfc-help role="status" aria-live="polite"></p><div class="cfc-thumbnails" aria-label="Choose a flashcard" data-cfc-thumbnails></div>
      <div class="actions" data-cfc-speech-link><a class="primary" href="#todays-speech">💬 Today’s Speech</a></div></div></section><p class="voice-note">Device voice preview · approved recordings pending</p>`;
    const stop=()=>{voiceToken++;mute();const status=$('[data-cfc-help]');if(status?.textContent==='Listening…')status.textContent='Stopped. Tap Listen to start again.';};
    function flip(value){if(disposed||value&&!cards.length)return;flipped=value;const card=$('[data-cfc-card]');card.classList.toggle('is-flipped',value);card.setAttribute('aria-pressed',String(value));card.setAttribute('aria-label',value?'Show the flashcard picture':'Show the flashcard words');$('.cfc-front').setAttribute('aria-hidden',String(value));$('.cfc-back').setAttribute('aria-hidden',String(!value));$('[data-cfc-flip]').textContent=value?'🖼️ Picture':'🔄 Flip';}
    function thumbnails(){
      $('[data-cfc-thumbnails]').innerHTML=cards.map((card,i)=>`<button class="cfc-thumbnail" type="button" data-cfc-thumb="${i}" aria-label="Show flashcard ${i+1}: ${esc(card.label)}"><img src="${esc(image(card))}" alt="" loading="lazy" decoding="async"></button>`).join('');
      all('[data-cfc-thumb]').forEach(button=>button.onclick=()=>{index=Number(button.dataset.cfcThumb);render();});
    }
    function render(){
      if(disposed)return;stop();flip(false);const empty=!cards.length;
      if(source!=='speech'||empty)['sourceCardIds','targetAliases','sourceTargets','sourceRefs','displayAdaptation','componentSourceRefs','sourceSentences','textStatus','sentenceKind'].forEach(key=>delete root.dataset[key]);
      all('[data-cfc-control]').forEach(button=>button.disabled=empty);$('[data-cfc-card]').hidden=empty;$('[data-cfc-card]').tabIndex=empty?-1:0;$('[data-cfc-pending]').hidden=!empty;$('[data-cfc-speech-link]').hidden=source!=='speech';
      if(empty){delete root.dataset.cardId;$('[data-cfc-count]').textContent='TPR clips pending';$('[data-cfc-help]').textContent='Action cards will be available when the Month 10 clips are supplied.';return;}
      const card=cards[index];
      $('[data-cfc-front]').src=$('[data-cfc-back]').src=image(card);$('[data-cfc-front]').alt=card.label;
      $('[data-cfc-phrase]').textContent=card.phrase||card.label;$('[data-cfc-sentence]').textContent=card.sentence;$('[data-cfc-count]').textContent=`Card ${index+1} of ${cards.length}`;
      root.dataset.cardId=card.id;
      if(source==='speech'){root.dataset.sourceCardIds=JSON.stringify(card.sourceCardIds);root.dataset.targetAliases=JSON.stringify(card.targetAliases);root.dataset.sourceTargets=JSON.stringify(card.sourceTargets);root.dataset.sourceRefs=JSON.stringify(card.sourceRefs);if(card.displayAdaptation)root.dataset.displayAdaptation=JSON.stringify(card.displayAdaptation);else delete root.dataset.displayAdaptation;}
      if(source==='speech'){['componentSourceRefs','sourceSentences'].forEach(key=>{if(card[key])root.dataset[key]=JSON.stringify(card[key]);else delete root.dataset[key];});['textStatus','sentenceKind'].forEach(key=>{if(card[key])root.dataset[key]=card[key];else delete root.dataset[key];});}
      all('[data-cfc-thumb]').forEach((button,i)=>{button.classList.toggle('is-selected',i===index);button.setAttribute('aria-current',String(i===index));});
    }
    function move(offset){if(disposed||!cards.length)return;index=(index+offset+cards.length)%cards.length;render();}
    $('[data-cfc-card]').onclick=()=>flip(!flipped);
    $('[data-cfc-card]').onkeydown=event=>{if(['Enter',' '].includes(event.key)){event.preventDefault();flip(!flipped);}};
    $('[data-cfc-flip]').onclick=()=>flip(!flipped);
    $('[data-cfc-previous]').onclick=()=>move(-1);$('[data-cfc-next]').onclick=()=>move(1);
    $('[data-cfc-listen]').onclick=()=>{if(disposed||!cards.length)return;stop();const token=voiceToken;$('[data-cfc-help]').textContent='Listening…';speak(cards[index].sentence,ok=>{if(!disposed&&token===voiceToken)$('[data-cfc-help]').textContent=ok?'Listen again, or try saying it!':'Could not play the voice. Please try Listen again.';});};
    $('[data-cfc-shuffle]').onclick=()=>{if(disposed||!cards.length)return;const active=cards[index].id;const mixed=shuffle(cards);cards.splice(0,cards.length,...mixed);index=cards.findIndex(card=>card.id===active);thumbnails();render();$('[data-cfc-help]').textContent='The cards have been shuffled!';};
    function selectSource(nextSource,notify=true){
      if(disposed||!Object.hasOwn(decks,nextSource))return;stop();source=nextSource;root.dataset.flashcardSource=source;cards.splice(0,cards.length,...decks[source]);index=0;
      all('[data-cfc-source]').forEach(tab=>{const active=tab.dataset.cfcSource===source;tab.classList.toggle('is-active',active);tab.setAttribute('aria-selected',String(active));tab.tabIndex=active?0:-1;});
      $('[data-cfc-deck]').setAttribute('aria-labelledby','cfc-tab-'+source);$('[data-cfc-source-note]').textContent=`${source==='literacy'?'ELS Book':source==='speech'?'Speech Book':'TPR'} · Week ${lesson.week}`;
      thumbnails();render();if(cards.length)$('[data-cfc-help]').textContent=source==='literacy'?'Flip each card to learn the phrase and key sentence.':'Flip each card to practice the Speech Book sentence.';if(notify)onSourceChange(source);
    }
    const tabs=all('[data-cfc-source]');tabs.forEach((tab,i)=>{tab.onclick=()=>selectSource(tab.dataset.cfcSource);tab.onkeydown=event=>{if(disposed||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const target=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;tabs[target].focus();selectSource(tabs[target].dataset.cfcSource);};});
    const visibility=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',visibility);
    selectSource(initialSource,false);
    return()=>{disposed=true;stop();document.removeEventListener('visibilitychange',visibility);};
  }
  const mountSpeechCards=options=>mountFlashcards({...options,initialSource:'speech'});
  function mountTodaysSpeech({lesson,topicImageOverrides,root,assets,base,mute,mountVoiceRows}){
    if(!root||!lesson.speechTopics?.length)throw new Error('The revised Today’s Speech text is missing');
    const speeches=lesson.speechTopics;
    const speechImage=item=>{const override=topicImageOverrides?.[item.id],asset=assets.get(override||item.imageKey);if(!asset){if(override)throw new Error('Missing owner-selected Speech illustration: '+override);return '';}const url=new URL(asset.path.replace(/^apps\//,''),base);if(asset.sha256)url.searchParams.set('v',asset.sha256.slice(0,12));return `<img class="cspeech-picture" src="${esc(url.href)}" alt="${esc(override?(asset.alt||item.title):(item.imageAlt||item.title))}">`;};
    root.className='m10-c-speech';
    root.innerHTML=`<section class="card cspeech-section"><h2>💬 Today’s Speech</h2><p>Listen, then have a turn!</p>${speeches.map((item,i)=>`<article class="cspeech-piece" data-cspeech-piece="${i}" data-trace-row="speech-${i}"><h3>${esc(item.title)}</h3>${speechImage(item)}<p class="cspeech-text">${esc(item.text)}</p><div class="sentence-voice"></div></article>`).join('')}</section><div class="actions"><a class="primary" href="#speech-cards">🃏 Speech Book Flashcards</a><a class="primary" href="#lesson-1">← Back to lesson</a></div><p class="voice-note">Device voice preview · approved recordings pending</p>`;
    const rows=speeches.map((item,i)=>({id:`speech-${i}`,text:item.text,element:root.querySelector(`[data-cspeech-piece="${i}"]`),stopListening:true}));
    const disposeVoice=mountVoiceRows?mountVoiceRows(root,rows):()=>{};
    return()=>{disposeVoice();mute();};
  }
  window.M10LevelC={mount,mountFlashcards,mountSpeechCards,mountTodaysSpeech};
})();

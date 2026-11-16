/* Book-led A1 activity adapters. Source text/order comes from page definitions;
 * tap/drag/listen controls are web adaptations, not printed task instructions.
 */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount({root,page,lesson,assets,base,speak=()=>{},mute=()=>{},onComplete=()=>{},onPromptChange=()=>{},interviewVideos=[],onMediaStart=()=>{},completionPolicy={}}){
    if(!root||!page)throw new Error('Book Literacy needs a root and page definition');
    if(['animal-home','animal-home-review'].includes(page.type)&&window.M10AnimalHome)return window.M10AnimalHome.mount({root,page,assets,base,speak,mute,onComplete});
    let disposed=false,voice=0,activityVideo=null,videoCleanup=()=>{},videoPlayCleanup=()=>{},markExternalListen=()=>{};
    const handlers=[],pointerCleanups=[],q=selector=>root.querySelector(selector),qa=selector=>[...root.querySelectorAll(selector)];
    const bind=(element,event,handler)=>{if(!element)return;element[event]=(...args)=>{if(!disposed)handler(...args);};handlers.push([element,event]);};
    const image=(key,alt,extra='')=>{
      const asset=assets?.get(key);
      return asset?.path?`<img src="${esc(new URL(asset.path.replace(/^apps\//,''),base).href)}" alt="${esc(alt)}" ${extra}>`:'<span class="m10-book-picture-pending">Picture pending</span>';
    };
    function stop(){voice++;activityVideo?.pause();mute();qa('.is-speaking').forEach(button=>button.classList.remove('is-speaking'));}
    function say(text,button,onFinished){
      if(disposed||document.hidden||!text)return;
      stop();const request=voice;button?.classList.add('is-speaking');
      speak(text,ok=>{if(!disposed&&!document.hidden&&request===voice){button?.classList.remove('is-speaking');onFinished?.(ok===true);}});
    }
    function listenButtons(lines){return lines.map((line,index)=>`<button class="match-listen m10-book-line" type="button" data-book-line="${index}" aria-label="Listen: ${esc(line.text)}"><span class="m10-book-speaker">${esc(line.speaker||'Listen')}</span><span><span aria-hidden="true">🔊 </span>${esc(line.text)}</span></button>`).join('');}
    function bindLines(lines,onVisit=()=>{},afterSuccessfulListen=false){qa('[data-book-line]').forEach(button=>bind(button,'onclick',()=>{const index=+button.dataset.bookLine,line=lines[index];onPromptChange(line);say(line.text,button,afterSuccessfulListen?ok=>{if(ok)onVisit(index);}:undefined);if(!afterSuccessfulListen)onVisit(index);}));}
    const instructions=text=>`<div class="m10-book-instructions"><p class="instruction">${esc(text)}</p><button class="match-listen" type="button" data-book-instruction>🔊 How to play</button></div>`;
    const bindInstruction=text=>bind(q('[data-book-instruction]'),'onclick',()=>say(text,q('[data-book-instruction]')));
    function pointerPlacement(button,id,select,place,targetSelector,targetAttribute,canDrag){
      let drag=null,suppressClickUntil=0;
      const originalClick=button.onclick;
      const targetAt=event=>{const hit=document.elementFromPoint?.(event.clientX,event.clientY);return qa(targetSelector).find(target=>target===hit||target.contains?.(hit));};
      const cancel=()=>{
        const previous=drag;drag=null;button.classList.remove('is-dragging');button.style.transform='';qa(targetSelector).forEach(target=>target.classList.remove('is-over'));
        if(previous){try{button.releasePointerCapture?.(previous.pointerId);}catch{}}
      };
      bind(button,'onclick',event=>{if(event?.detail!==0&&Date.now()<suppressClickUntil)return;originalClick?.(event);});
      bind(button,'onpointerdown',event=>{
        if(event.isPrimary===false||(event.button!==undefined&&event.button!==0)||!canDrag())return;
        cancel();event.preventDefault();drag={pointerId:event.pointerId,x:event.clientX,y:event.clientY,moved:false};button.focus?.({preventScroll:true});button.setPointerCapture?.(event.pointerId);select(id);
      });
      bind(button,'onpointermove',event=>{
        if(!drag||event.pointerId!==drag.pointerId)return;
        const dx=event.clientX-drag.x,dy=event.clientY-drag.y;
        if(!drag.moved&&Math.hypot(dx,dy)<8)return;
        drag.moved=true;event.preventDefault();button.classList.add('is-dragging');button.style.transform=`translate(${dx}px,${dy}px)`;
        const over=targetAt(event);qa(targetSelector).forEach(target=>target.classList.toggle('is-over',target===over));
      });
      bind(button,'onpointerup',event=>{
        if(!drag||event.pointerId!==drag.pointerId)return;
        const target=drag.moved?targetAt(event):null;suppressClickUntil=Date.now()+400;cancel();
        if(target)place(target.getAttribute(targetAttribute),id);
      });
      bind(button,'onpointercancel',cancel);bind(button,'onlostpointercapture',cancel);pointerCleanups.push(cancel);
    }
    const heading=()=>`<h2>${esc(page.title||lesson?.title||'Our book')}</h2>`;
    root.classList.add('m10-book-literacy');root.dataset.bookType=page.type;root.dataset.taskStatus=page.status||'source-content-available';root.dataset.webAdaptation='listening-and-interaction';

    if(page.type==='interview'||page.type==='scene-dialogue'){
      const lines=page.lines||[],visited=new Set(),instruction=page.instruction||(page.type==='interview'?'Tap each speech bubble. Listen, then take a turn with the microphone.':'Tap each speech bubble. Listen, then take a turn speaking.');
      const useInterviewVideos=lesson?.id==='a1'&&page.id==='a1-pdf5'&&interviewVideos.length===5&&window.M10LiteracyVideos;
      root.innerHTML=`<section class="card m10-book-activity" id="lesson-focus">${heading()}${instructions(instruction)}${useInterviewVideos?'<div class="m10-book-interview-videos" data-book-interview-videos></div>':`<div class="m10-book-interview-picture">${image(page.imageKey,page.imageAlt||'A girl holding a microphone interviews a park ranger at a wooded campsite with a tent.')}</div>`}<div class="m10-book-dialogue">${listenButtons(lines)}</div><p class="fc-status" data-book-dialogue-count>0 / ${lines.length}</p>${page.videoPending&&!useInterviewVideos?'<p class="m10-book-media-note">Listening preview · Video pending</p>':''}<button class="reset-button" type="button" data-book-dialogue-reset>↻ Try again</button></section>`;
      if(useInterviewVideos){
        const videoRoot=q('[data-book-interview-videos]');
        videoCleanup=window.M10LiteracyVideos.mount({root:videoRoot,items:interviewVideos,base,assets});
        videoRoot.querySelector('#lesson-focus')?.removeAttribute('id');
        activityVideo=videoRoot.querySelector('video');
        const onPlay=()=>{if(disposed){activityVideo?.pause();return;}voice++;mute();qa('.is-speaking').forEach(button=>button.classList.remove('is-speaking'));onMediaStart();};
        activityVideo?.addEventListener('play',onPlay);
        videoPlayCleanup=()=>activityVideo?.removeEventListener('play',onPlay);
      }
      const markLine=index=>{visited.add(index);q('[data-book-dialogue-count]').textContent=`${visited.size} / ${lines.length}`;q(`[data-book-line="${index}"]`).classList.add('is-visited');onComplete(visited.size===lines.length&&lines.length>0);};
      markExternalListen=(index,text)=>{if(Number.isInteger(index)&&lines[index]?.text===text)markLine(index);};
      bindInstruction(instruction);onPromptChange(lines[0]||{});bindLines(lines,markLine,completionPolicy.successfulListeningRequired===true);bind(q('[data-book-dialogue-reset]'),'onclick',()=>{stop();visited.clear();qa('[data-book-line]').forEach(button=>button.classList.remove('is-visited'));q('[data-book-dialogue-count]').textContent=`0 / ${lines.length}`;onPromptChange(lines[0]||{});onComplete(false);});onComplete(false);
    }else if(page.type==='vocabulary-map'){
      const cards=page.cards||[],normalize=text=>String(text).toLowerCase().replace(/^(a|an) /,'').replace(/[^a-z0-9 ]/g,'').trim();
      const models=(page.lines||[]).filter(line=>normalize(line.text)!==normalize(page.heading||page.title)&&!cards.some(card=>normalize(card.label)===normalize(line.text)));
      if(page.interaction==='listen-find'){
        const promptRequired=completionPolicy.promptListeningRequired===true;
        let turn=0,solved=false,promptHeard=!promptRequired;const found=new Set(),instruction='Tap Listen. Find the picture you hear. Tap its picture. You can listen again.';
        root.innerHTML=`<section class="card m10-book-activity" id="lesson-focus">${heading()}${instructions(instruction)}<div class="m10-book-find-prompt"><button class="match-listen" type="button" data-book-find-listen>🔊 Listen</button><p class="fc-status" data-book-find-count>1 / ${cards.length}</p></div><div class="m10-book-find-choices">${cards.map((card,index)=>`<button class="picture-choice m10-book-word" type="button" data-book-word="${index}" aria-label="${esc(card.label)}">${image(card.imageKey,card.label)}<span class="flashcard-label">${esc(card.label)}</span><span data-book-word-star="${index}" aria-hidden="true"></span></button>`).join('')}</div><p class="activity-result" data-book-find-feedback role="status" aria-live="polite">Tap Listen to hear a word.</p><button class="fc-action" type="button" data-book-find-next hidden>Next picture →</button><div class="m10-book-source-model">${models.map((line,index)=>`<button class="match-listen" type="button" data-book-model="${index}" aria-label="Listen: ${esc(line.text)}">🔊 ${esc(line.text)}</button>`).join('')}</div><button class="reset-button" type="button" data-book-find-reset>↻ Try again</button></section>`;
        const feedback=q('[data-book-find-feedback]');
        function render(){
          const finished=found.size===cards.length,pairStart=Math.floor(turn/2)*2;
          qa('[data-book-word]').forEach(button=>{const index=+button.dataset.bookWord;button.hidden=!finished&&(index<pairStart||index>=pairStart+2);if(promptRequired)button.disabled=!finished&&(!promptHeard||solved);button.classList.remove('is-wrong','is-active');});
          q('[data-book-find-listen]').hidden=finished;q('[data-book-find-next]').hidden=true;
          q('[data-book-find-count]').textContent=finished?`${found.size} / ${cards.length} ★`:`${turn+1} / ${cards.length}`;
        }
        const playPrompt=(text,message)=>{const targetTurn=turn;if(promptRequired){promptHeard=false;qa('[data-book-word]').forEach(button=>button.disabled=true);}feedback.textContent=message;say(text,q('[data-book-find-listen]'),promptRequired?ok=>{if(turn!==targetTurn||solved||found.size===cards.length)return;promptHeard=ok;qa('[data-book-word]').forEach(button=>button.disabled=!ok);feedback.textContent=ok?'Now tap the picture.':'Could not play the word. Tap Listen to try again.';}:undefined);};
        const prompt=()=>{if(found.size===cards.length)return;playPrompt(`Find ${cards[turn].label}.`,'Listen, then tap a picture.');};
        bindInstruction(instruction);bind(q('[data-book-find-listen]'),'onclick',prompt);
        qa('[data-book-word]').forEach(button=>bind(button,'onclick',()=>{
          const index=+button.dataset.bookWord;
          if(found.size===cards.length){say(cards[index].label,button);return;}
          if(button.hidden||solved||promptRequired&&!promptHeard)return;
          qa('[data-book-word]').forEach(choice=>choice.classList.remove('is-wrong'));
          if(index!==turn){button.classList.add('is-wrong');playPrompt(`Try again. Find ${cards[turn].label}.`,'Listen again. Try the other picture.');return;}
          solved=true;found.add(index);if(promptRequired)qa('[data-book-word]').forEach(choice=>choice.disabled=true);button.classList.add('is-visited');q(`[data-book-word-star="${index}"]`).textContent='★';feedback.textContent=cards[index].label;say(cards[index].label,button);
          if(found.size===cards.length){render();feedback.textContent='You found every picture! Tap any picture to listen again.';onComplete(true);}else q('[data-book-find-next]').hidden=false;
        }));
        bind(q('[data-book-find-next]'),'onclick',()=>{if(!solved||found.size===cards.length)return;stop();turn++;solved=false;promptHeard=!promptRequired;render();prompt();});
        bind(q('[data-book-find-reset]'),'onclick',()=>{stop();turn=0;solved=false;promptHeard=!promptRequired;found.clear();qa('[data-book-word]').forEach(button=>button.classList.remove('is-visited'));qa('[data-book-word-star]').forEach(star=>star.textContent='');feedback.textContent='Tap Listen to hear a word.';render();onComplete(false);});
        qa('[data-book-model]').forEach(button=>bind(button,'onclick',()=>say(models[+button.dataset.bookModel].text,button)));
        render();onComplete(false);
      }else{
      root.innerHTML=`<section class="card m10-book-activity" id="lesson-focus">${heading()}<p class="instruction">Tap a picture. Listen to its word.</p><div class="m10-book-vocab-map"><div class="m10-book-map-center"><h3>${esc(page.heading||page.title)}</h3>${models.map((line,index)=>`<p>${esc(line.text)}</p><button class="match-listen" type="button" data-book-model="${index}" aria-label="Listen: ${esc(line.text)}">🔊 Listen</button>`).join('')}</div>${cards.map((card,index)=>`<button class="picture-choice m10-book-word" type="button" data-book-word="${index}" aria-label="Listen: ${esc(card.label)}">${image(card.imageKey,card.label)}<span class="flashcard-label">🔊 ${esc(card.label)}</span></button>`).join('')}</div></section>`;
      qa('[data-book-word]').forEach(button=>bind(button,'onclick',()=>say(cards[+button.dataset.bookWord].label,button)));qa('[data-book-model]').forEach(button=>bind(button,'onclick',()=>say(models[+button.dataset.bookModel].text,button)));onComplete(true);
      }
    }else if(page.type==='read-place'){
      const items=page.placements||[],ids=new Set(items.map(item=>item.id));
      const valid=items.length>0&&ids.size===items.length&&items.every(item=>item.id&&item.label&&item.sentence&&Number.isFinite(item.x)&&Number.isFinite(item.y))&&assets?.get(page.imageKey)?.path;
      if(!valid){
        root.innerHTML=`<section class="card pending-slot" id="lesson-focus">${heading()}<p>The park picture activity is being prepared.</p><span class="reserved-tag">Picture placement pending</span></section>`;onComplete(false);
      }else{
        let selected=null;const placed=new Set(),instruction=page.instruction||'Tap a picture card to hear its sentence. Then tap where it belongs in the picture. You can drag the card, too.';
        root.innerHTML=`<section class="card m10-book-activity" id="lesson-focus"><h2 class="m10-book-scene-heading">${esc(page.heading||page.title)}</h2>${instructions(instruction)}${(page.lines||[]).length?`<div class="m10-book-dialogue">${listenButtons(page.lines)}</div>`:''}<div class="m10-book-placement-bank">${items.map((item,index)=>`<button class="fc-action m10-book-token" type="button" draggable="true" data-book-token="${esc(item.id)}" aria-pressed="false">${item.imageKey?image(item.imageKey,item.cueAlt||item.label,'draggable="false"'):''}<span><span aria-hidden="true">🔊 </span>${esc(item.label)}</span><span class="m10-book-token-mark" data-book-mark="${esc(item.id)}" aria-hidden="true"></span></button>`).join('')}</div><div class="m10-book-scene" data-book-scene>${image(page.imageKey,page.imageAlt||'National park with clean air, trees, some cars, and bins keeping trash off the ground.','draggable="false"')}${items.map((item,index)=>`<button class="m10-book-spot" type="button" data-book-spot="${esc(item.id)}" style="left:${Math.max(6,Math.min(94,item.x))}%;top:${Math.max(9,Math.min(91,item.y))}%" aria-label="Picture place ${index+1}"><span data-book-spot-mark="${esc(item.id)}" aria-hidden="true">${index+1}</span></button>`).join('')}</div><p class="activity-result m10-book-feedback" data-book-feedback role="status" aria-live="polite">Choose a sentence to hear it.</p><p class="m10-book-placement-count" data-book-count aria-live="polite">0 / ${items.length}</p><button class="reset-button" type="button" data-book-reset>↻ Try again</button></section>`;
        bindInstruction(instruction);bindLines(page.lines||[]);
        const token=id=>qa('[data-book-token]').find(button=>button.dataset.bookToken===id),spot=id=>qa('[data-book-spot]').find(button=>button.dataset.bookSpot===id),feedback=q('[data-book-feedback]');
        function select(id){
          if(disposed)return;const item=items.find(item=>item.id===id);if(!item)return;
          say(item.sentence,token(id));
          if(placed.has(id)){feedback.textContent=item.sentence;return;}
          selected=id;qa('[data-book-token]').forEach(button=>{const active=button.dataset.bookToken===id;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
          feedback.textContent='Now tap its place in the picture.';
        }
        function place(targetId,suppliedId){
          if(disposed)return;const target=items.find(item=>item.id===targetId);if(!target)return;
          if(placed.has(targetId)){say(target.sentence,spot(targetId));feedback.textContent=target.sentence;return;}
          const sourceId=suppliedId||selected;
          if(!sourceId){feedback.textContent='Tap a sentence first. Listen, then choose its place.';say('Tap a sentence first.');return;}
          if(!ids.has(sourceId)||placed.has(sourceId))return;
          qa('[data-book-spot]').forEach(button=>button.classList.remove('is-wrong'));
          if(sourceId!==targetId){spot(targetId).classList.add('is-wrong');feedback.textContent='Try another place for that sentence.';window.gpFeedbackSounds?.wrong?.();say('Try another place.');return;}
          placed.add(targetId);selected=null;
          token(targetId).classList.add('is-placed');q(`[data-book-mark="${targetId}"]`).textContent=' ✓';spot(targetId).classList.add('is-correct');q(`[data-book-spot-mark="${targetId}"]`).textContent='✓';spot(targetId).setAttribute('aria-label',`Listen: ${target.sentence}`);
          qa('[data-book-token]').forEach(button=>{button.classList.remove('is-active');button.setAttribute('aria-pressed','false');});
          feedback.textContent=target.sentence;q('[data-book-count]').textContent=`${placed.size} / ${items.length}`;window.gpFeedbackSounds?.correct?.();say(target.sentence,spot(targetId));onComplete(placed.size===items.length);
        }
        qa('[data-book-token]').forEach(button=>{
          const id=button.dataset.bookToken;bind(button,'onclick',()=>select(id));
          bind(button,'ondragstart',event=>{if(placed.has(id)){event.preventDefault();return;}select(id);event.dataTransfer?.setData('text/plain',id);if(event.dataTransfer)event.dataTransfer.effectAllowed='move';});
          bind(button,'ondragend',()=>qa('[data-book-spot]').forEach(target=>target.classList.remove('is-over')));
          pointerPlacement(button,id,select,place,'[data-book-spot]','data-book-spot',()=>!placed.has(id));
        });
        qa('[data-book-spot]').forEach(button=>{
          const id=button.dataset.bookSpot;bind(button,'onclick',()=>place(id));
          bind(button,'ondragover',event=>{event.preventDefault();button.classList.add('is-over');if(event.dataTransfer)event.dataTransfer.dropEffect='move';});
          bind(button,'ondragleave',()=>button.classList.remove('is-over'));
          bind(button,'ondrop',event=>{event.preventDefault();button.classList.remove('is-over');const idFromDrag=event.dataTransfer?.getData('text/plain');if(idFromDrag&&ids.has(idFromDrag))place(id,idFromDrag);});
        });
        bind(q('[data-book-reset]'),'onclick',()=>{stop();selected=null;placed.clear();qa('[data-book-token]').forEach(button=>{button.classList.remove('is-active','is-placed');button.setAttribute('aria-pressed','false');});qa('[data-book-mark]').forEach(mark=>mark.textContent='');qa('[data-book-spot]').forEach((button,index)=>{button.classList.remove('is-correct','is-wrong','is-over');button.setAttribute('aria-label',`Picture place ${index+1}`);q(`[data-book-spot-mark="${button.dataset.bookSpot}"]`).textContent=String(index+1);});feedback.textContent='Choose a sentence to hear it.';q('[data-book-count]').textContent=`0 / ${items.length}`;onComplete(false);});
        onComplete(false);
      }
    }else if(page.type==='picture-quiz'){
      const options=page.options||[],question=page.question||{},answer=page.answer||{};
      const valid=options.length===2&&options.filter(item=>item.correct===true).length===1&&question.text&&answer.text&&assets?.get(page.imageKey)?.path&&options.every(item=>item.id&&item.label&&assets?.get(item.imageKey)?.path)&&new Set(options.map(item=>item.id)).size===options.length;
      let solved=false;
      if(!valid)throw new Error('Picture quiz requires a scene, exact exchange and two pictured choices');
      const listenPrompt=typeof page.listenPrompt==='string'?{text:page.listenPrompt,speaker:answer.speaker}:(page.listenPrompt||question);
      const instruction=page.instruction||'Listen to the question. Choose a picture. Then listen and say the answer.';
      const listeningForAnswer=listenPrompt.text!==question.text;
      root.innerHTML=`<section class="card m10-book-activity" id="lesson-focus">${heading()}${instructions(instruction)}<div class="m10-book-interview-picture">${image(page.imageKey,page.imageAlt||'The book quiz host and child contestant.')}</div><div class="m10-book-quiz-question"><p>${esc(question.text)}</p>${listeningForAnswer?`<button class="match-listen" type="button" data-book-quiz-question-listen aria-label="Listen to the question">🔊 Question</button>`:''}<button class="match-listen" type="button" data-book-quiz-listen aria-label="Listen: ${esc(listenPrompt.text)}">🔊 ${listeningForAnswer?'Answer':'Listen'}</button></div><div class="m10-book-quiz-options">${options.map((option,index)=>`<button class="picture-choice m10-book-quiz-option" type="button" data-book-quiz-choice="${index}" aria-label="${esc(option.label)}" aria-pressed="false"><span class="m10-book-option-number" aria-hidden="true">${index+1}</span>${image(option.imageKey,option.label)}<span class="flashcard-label">${esc(option.label)}</span><span data-book-quiz-star="${index}" aria-hidden="true"></span></button>`).join('')}</div><p class="activity-result m10-book-feedback" role="status" aria-live="polite" data-book-quiz-feedback>Tap ${listeningForAnswer?'Answer':'Listen'} to hear what to find.</p><button class="match-listen m10-book-quiz-answer" type="button" data-book-quiz-answer hidden aria-label="Listen: ${esc(answer.text)}">🔊 ${esc(answer.text)}</button><p class="m10-book-placement-count" data-book-quiz-count>0 / 1</p><button class="reset-button" type="button" data-book-quiz-reset>↻ Try again</button></section>`;
      const ask=()=>{onPromptChange(listenPrompt);say(listenPrompt.text,q('[data-book-quiz-listen]'));};
      bindInstruction(instruction);bind(q('[data-book-quiz-listen]'),'onclick',ask);bind(q('[data-book-quiz-question-listen]'),'onclick',()=>{onPromptChange(question);say(question.text,q('[data-book-quiz-question-listen]'));});
      qa('[data-book-quiz-choice]').forEach(button=>bind(button,'onclick',()=>{
        if(solved){say(options[+button.dataset.bookQuizChoice].label,button);return;}
        qa('[data-book-quiz-choice]').forEach(choice=>choice.classList.remove('is-wrong'));
        const option=options[+button.dataset.bookQuizChoice];
        if(!option.correct){button.classList.add('is-wrong');q('[data-book-quiz-feedback]').textContent='Listen again. Try the other picture.';window.gpFeedbackSounds?.wrong?.();say('Try again. '+listenPrompt.text,q('[data-book-quiz-listen]'));return;}
        solved=true;button.classList.add('is-correct');button.setAttribute('aria-pressed','true');q(`[data-book-quiz-star="${button.dataset.bookQuizChoice}"]`).textContent='★';q('[data-book-quiz-feedback]').textContent=answer.text;q('[data-book-quiz-answer]').hidden=false;q('[data-book-quiz-count]').textContent='1 / 1 ★';onPromptChange(answer);window.gpFeedbackSounds?.correct?.();say(answer.text,button);onComplete(true);
      }));
      bind(q('[data-book-quiz-answer]'),'onclick',()=>{onPromptChange(answer);say(answer.text,q('[data-book-quiz-answer]'));});
      bind(q('[data-book-quiz-reset]'),'onclick',()=>{stop();solved=false;qa('[data-book-quiz-choice]').forEach(button=>{button.classList.remove('is-wrong','is-correct');button.setAttribute('aria-pressed','false');});qa('[data-book-quiz-star]').forEach(star=>star.textContent='');q('[data-book-quiz-answer]').hidden=true;q('[data-book-quiz-feedback]').textContent=`Tap ${listeningForAnswer?'Answer':'Listen'} to hear what to find.`;q('[data-book-quiz-count]').textContent='0 / 1';onPromptChange(question);onComplete(false);});
      onPromptChange(question);onComplete(false);
    }else if(page.type==='scene-stickers'){
      const items=page.stickers||[],ids=new Set(items.map(item=>item.id)),extras=page.explore||[];
      const valid=items.length>0&&ids.size===items.length&&assets?.get(page.imageKey)?.path&&items.every(item=>item.id&&item.label&&assets?.get(item.imageKey)?.path&&Number.isFinite(item.x)&&Number.isFinite(item.y));
      if(!valid)throw new Error('Scene stickers require source-backed pictured pieces and positions');
      const placed=new Set();let selected=null;
      const instruction='Listen to an animal. Tap its sticker, then tap its shape in the picture. You can drag it, too.';
      const word=item=>item.sentence||item.label;
      root.innerHTML=`<section class="card m10-book-activity" id="lesson-focus">${heading()}${instructions(instruction)}<div class="m10-book-sticker-bank">${items.map(item=>`<button class="picture-choice m10-book-sticker-token" type="button" draggable="true" data-book-sticker="${esc(item.id)}" aria-label="Listen and choose: ${esc(item.label)}" aria-pressed="false">${image(item.imageKey,item.label,'draggable="false"')}<span class="flashcard-label">🔊 ${esc(item.label)}</span><span data-book-sticker-star="${esc(item.id)}" aria-hidden="true"></span></button>`).join('')}</div><div class="m10-book-scene m10-book-sticker-scene">${image(page.imageKey,page.imageAlt||'The book animal scene with missing animal shapes.','draggable="false"')}${items.map((item,index)=>`<button class="m10-book-sticker-slot" type="button" data-book-sticker-slot="${esc(item.id)}" style="left:${item.x}%;top:${item.y}%;width:${item.widthPct||22}%;height:${item.heightPct||30}%" aria-label="Animal shape ${index+1}"><span data-book-sticker-art="${esc(item.id)}"></span><span class="m10-book-sticker-badge" data-book-sticker-badge="${esc(item.id)}" aria-hidden="true">${index+1}</span></button>`).join('')}${extras.map((item,index)=>`<button class="m10-book-spot m10-book-explore" type="button" data-book-sticker-explore="${index}" style="left:${item.x}%;top:${item.y}%" aria-label="Listen: ${esc(item.label)}">🔊</button>`).join('')}</div>${(page.lines||[]).length?`<div class="m10-book-dialogue">${listenButtons(page.lines)}</div>`:''}<p class="activity-result m10-book-feedback" role="status" aria-live="polite" data-book-sticker-feedback>Choose an animal sticker.</p><p class="m10-book-placement-count" data-book-sticker-count>0 / ${items.length}</p><button class="reset-button" type="button" data-book-sticker-reset>↻ Try again</button></section>`;
      items.forEach(item=>{q(`[data-book-sticker-art="${item.id}"]`).innerHTML=image(item.imageKey,item.label,'draggable="false"');});
      const token=id=>qa('[data-book-sticker]').find(button=>button.dataset.bookSticker===id),slot=id=>qa('[data-book-sticker-slot]').find(button=>button.dataset.bookStickerSlot===id),feedback=q('[data-book-sticker-feedback]');
      const select=id=>{const item=items.find(item=>item.id===id);if(!item)return;say(word(item),token(id));if(placed.has(id))return;selected=id;qa('[data-book-sticker]').forEach(button=>{const active=button.dataset.bookSticker===id;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});feedback.textContent='Now tap its shape.';};
      const place=(targetId,fromDrag)=>{
        const target=items.find(item=>item.id===targetId),sourceId=fromDrag||selected;if(!target)return;
        if(placed.has(targetId)){say(word(target),slot(targetId));return;}
        if(!sourceId){feedback.textContent='Choose a sticker first.';say('Choose an animal sticker first.');return;}
        if(!ids.has(sourceId)||placed.has(sourceId))return;
        qa('[data-book-sticker-slot]').forEach(button=>button.classList.remove('is-wrong'));
        if(sourceId!==targetId){slot(targetId).classList.add('is-wrong');feedback.textContent='Try another animal shape.';window.gpFeedbackSounds?.wrong?.();say('Try another shape.');return;}
        placed.add(targetId);selected=null;slot(targetId).classList.add('is-correct');q(`[data-book-sticker-art="${targetId}"]`).innerHTML=image(target.imageKey,target.label,'draggable="false"');q(`[data-book-sticker-badge="${targetId}"]`).textContent='✓';slot(targetId).setAttribute('aria-label',`Listen: ${target.label}`);token(targetId).classList.add('is-placed');q(`[data-book-sticker-star="${targetId}"]`).textContent='★';qa('[data-book-sticker]').forEach(button=>{button.classList.remove('is-active');button.setAttribute('aria-pressed','false');});feedback.textContent=word(target);q('[data-book-sticker-count]').textContent=`${placed.size} / ${items.length}`;window.gpFeedbackSounds?.correct?.();say(word(target),slot(targetId));onComplete(placed.size===items.length);
      };
      bindInstruction(instruction);bindLines(page.lines||[]);
      qa('[data-book-sticker]').forEach(button=>{const id=button.dataset.bookSticker;bind(button,'onclick',()=>select(id));bind(button,'ondragstart',event=>{if(placed.has(id)){event.preventDefault();return;}select(id);event.dataTransfer?.setData('text/plain',id);if(event.dataTransfer)event.dataTransfer.effectAllowed='move';});bind(button,'ondragend',()=>qa('[data-book-sticker-slot]').forEach(item=>item.classList.remove('is-over')));pointerPlacement(button,id,select,place,'[data-book-sticker-slot]','data-book-sticker-slot',()=>!placed.has(id));});
      qa('[data-book-sticker-slot]').forEach(button=>{const id=button.dataset.bookStickerSlot;bind(button,'onclick',()=>place(id));bind(button,'ondragover',event=>{event.preventDefault();button.classList.add('is-over');});bind(button,'ondragleave',()=>button.classList.remove('is-over'));bind(button,'ondrop',event=>{event.preventDefault();button.classList.remove('is-over');const dropped=event.dataTransfer?.getData('text/plain');if(dropped&&ids.has(dropped))place(id,dropped);});});
      qa('[data-book-sticker-explore]').forEach(button=>bind(button,'onclick',()=>say(word(extras[+button.dataset.bookStickerExplore]),button)));
      bind(q('[data-book-sticker-reset]'),'onclick',()=>{stop();selected=null;placed.clear();qa('[data-book-sticker]').forEach(button=>{button.classList.remove('is-active','is-placed');button.setAttribute('aria-pressed','false');});qa('[data-book-sticker-star]').forEach(star=>star.textContent='');items.forEach((item,index)=>{slot(item.id).classList.remove('is-correct','is-wrong','is-over');slot(item.id).setAttribute('aria-label',`Animal shape ${index+1}`);q(`[data-book-sticker-art="${item.id}"]`).innerHTML=image(item.imageKey,item.label,'draggable="false"');q(`[data-book-sticker-badge="${item.id}"]`).textContent=String(index+1);});feedback.textContent='Choose an animal sticker.';q('[data-book-sticker-count]').textContent=`0 / ${items.length}`;onComplete(false);});onComplete(false);
    }else if(page.type==='key-sentences'){
      const cards=page.cards?.length?page.cards:(page.lines||[]).map(line=>({label:line.text,speaker:line.speaker,imageKey:page.imageKey})),visited=new Set(),instruction='Look at the speaker. Tap Listen, then say the sentence. Use the arrows to try every card.';let index=0;
      root.innerHTML=`<section class="card m10-book-activity" id="lesson-focus">${heading()}${instructions(instruction)}<p class="m10-book-role" data-book-key-role></p><button class="fc-feature m10-book-key-card" type="button" data-book-key-card><span data-book-key-picture></span><span class="flashcard-label" data-book-key-label></span></button><div class="fc-controls m10-book-key-controls"><button class="fc-action" type="button" data-book-key-prev aria-label="Previous sentence">← Previous</button><button class="fc-action" type="button" data-book-key-listen>🔊 Listen</button><button class="fc-action" type="button" data-book-key-next aria-label="Next sentence">Next →</button></div><p class="fc-status" data-book-key-count aria-live="polite"></p><p class="fc-status" data-book-key-progress>0 / ${cards.length} explored</p><button class="reset-button" type="button" data-book-key-reset>↻ Try again</button></section>`;
      function render(){if(!cards.length){q('[data-book-key-label]').textContent='Key sentence cards pending';return;}const card=cards[index];onPromptChange({text:card.label,speaker:card.speaker});q('[data-book-key-picture]').innerHTML=image(card.imageKey||page.imageKey,card.label);q('[data-book-key-label]').textContent=card.label;q('[data-book-key-role]').textContent=card.speaker||'Listen and say';q('[data-book-key-card]').setAttribute('aria-label',`Listen: ${card.label}`);q('[data-book-key-count]').textContent=`${index+1} / ${cards.length}`;}
      const markKey=playedIndex=>{visited.add(playedIndex);q('[data-book-key-progress]').textContent=`${visited.size} / ${cards.length} explored`;onComplete(visited.size===cards.length);};
      markExternalListen=(playedIndex,text)=>{if(playedIndex===index&&cards[playedIndex]?.label===text)markKey(playedIndex);};
      const listen=()=>{if(!cards.length)return;const playedIndex=index,mark=()=>markKey(playedIndex);say(cards[playedIndex].label,q('[data-book-key-card]'),completionPolicy.successfulListeningRequired===true?ok=>{if(ok)mark();}:undefined);if(completionPolicy.successfulListeningRequired!==true)mark();};
      bindInstruction(instruction);bind(q('[data-book-key-card]'),'onclick',listen);bind(q('[data-book-key-listen]'),'onclick',listen);bind(q('[data-book-key-prev]'),'onclick',()=>{if(!cards.length)return;stop();index=(index-1+cards.length)%cards.length;render();});bind(q('[data-book-key-next]'),'onclick',()=>{if(!cards.length)return;stop();index=(index+1)%cards.length;render();});bind(q('[data-book-key-reset]'),'onclick',()=>{stop();visited.clear();index=0;render();q('[data-book-key-progress]').textContent=`0 / ${cards.length} explored`;onComplete(false);});render();onComplete(false);
    }else if(page.type==='animal-home'||page.type==='animal-home-review'){
      const lines=page.lines?.length?page.lines:[{speaker:'Listen',text:'The national park is my home!'},{speaker:'Listen',text:"It's our home, too!"}];
      root.innerHTML=`<section class="card m10-book-activity" id="lesson-focus">${heading()}<div class="pending-slot m10-book-animal-pending"><span class="pending-icon" aria-hidden="true">🧩</span><h3>${page.type==='animal-home-review'?'Our national park home':'Animal-home stickers'}</h3><p>${page.type==='animal-home-review'?'Listen to the words from our book. The clean review picture is being prepared.':'The clean park scene and animal stickers are being prepared from this book page.'}</p><span class="reserved-tag">${page.type==='animal-home-review'?'Clean review picture pending':'Clean picture and stickers pending'}</span></div><div class="m10-book-dialogue">${listenButtons(lines)}</div></section>`;
      bindLines(lines);root.dataset.taskStatus='pending-clean-art';onComplete(false);
    }else if(page.type==='book-scene-pending'){
      const lines=(page.sourceText||[]).map(text=>({speaker:'Listen',text}));
      root.innerHTML=`<section class="card m10-book-activity" id="lesson-focus">${heading()}<div class="pending-slot m10-book-animal-pending"><span class="pending-icon" aria-hidden="true">📖</span><p>The clean picture and activity for this book page are being prepared.</p><span class="reserved-tag">Book picture activity pending</span></div><div class="m10-book-dialogue">${listenButtons(lines)}</div></section>`;
      bindLines(lines);root.dataset.taskStatus='pending-clean-art-and-interaction';onComplete(false);
    }else{
      root.innerHTML=`<section class="card pending-slot" id="lesson-focus">${heading()}<p>This book activity is being prepared.</p><span class="reserved-tag">Activity pending</span></section>`;onComplete(false);
    }
    const onVisibility=()=>{if(document.hidden){pointerCleanups.forEach(cancel=>cancel());stop();}};document.addEventListener('visibilitychange',onVisibility);
    const dispose=()=>{if(disposed)return;disposed=true;pointerCleanups.forEach(cancel=>cancel());stop();videoPlayCleanup();videoCleanup();handlers.forEach(([element,event])=>element[event]=null);document.removeEventListener('visibilitychange',onVisibility);};
    // Optional native row-control bridge. It never completes a quiz/placement
    // task and accepts only the exact current source line/card after playback.
    dispose.markListened=(index,text)=>{if(!disposed&&!document.hidden)markExternalListen(index,text);};
    return dispose;
  }
  window.M10BookLiteracy={mount};
})();

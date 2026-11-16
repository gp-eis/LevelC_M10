/* Source-based animal speech-bubble placement. The book supplies the scene,
 * speakers and exact lines; tap/drag/listen are recorded web adaptations. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount({root,page,assets,base,speak=()=>{},mute=()=>{},onComplete=()=>{}}){
    if(!root || !page) throw new Error('Animal-home activity needs its root and source page');
    let disposed=false, voice=0, selected=null;
    const listeners=[], placed=new Set(), speakers=page.speakers || [];
    const q=selector=>root.querySelector(selector), qa=selector=>[...root.querySelectorAll(selector)];
    const bind=(element,event,handler)=>{if(!element)return;element[event]=(...args)=>{if(!disposed)handler(...args);};listeners.push([element,event]);};
    function stop(){voice++;mute();qa('.is-speaking').forEach(element=>element.classList.remove('is-speaking'));}
    function say(text,element){
      if(disposed || document.hidden || !text)return;
      stop();const turn=voice;element?.classList.add('is-speaking');
      speak(text,()=>{if(!disposed && voice===turn)element?.classList.remove('is-speaking');});
    }
    const asset=assets?.get(page.imageKey), ids=new Set(speakers.map(speaker=>speaker.id));
    const valid=asset?.path && speakers.length>0 && speakers.length===ids.size && speakers.every(speaker=>speaker.id && speaker.text && Number.isFinite(speaker.x) && Number.isFinite(speaker.y) && speaker.x>=0 && speaker.x<=100 && speaker.y>=0 && speaker.y<=100);
    root.classList.add('m10-animal-home');root.dataset.webAdaptation='source-speech-bubble-tap-or-drag';
    if(!valid){
      root.dataset.taskStatus='pending-clean-art-and-source-speakers';
      root.innerHTML=`<section class="card pending-slot" id="lesson-focus"><h2>${esc(page.title || 'Our park home')}</h2><p>The animal picture activity is being prepared.</p><span class="reserved-tag">Animal picture activity pending</span></section>`;
      onComplete(false);return()=>{if(disposed)return;disposed=true;stop();};
    }
    const instruction='Listen to a speech bubble. Then tap the animal or animal friends who say it. You can drag the bubble, too.';
    const cue=speaker=>`<span class="m10-animal-cue" aria-hidden="true">${Array.from({length:speaker.cueCount===3 || speaker.id==='rabbits'?3:1},()=>'<span></span>').join('')}</span>`;
    root.dataset.taskStatus='interactive-art-and-device-voice-for-review';
    root.innerHTML=`<section class="card m10-animal-activity" id="lesson-focus"><h2>${esc(page.title || 'Our park home')}</h2><div class="m10-animal-instructions"><p class="instruction">Listen. Who says it? Tap or drag the bubble to its speaker.</p><button type="button" class="match-listen" data-animal-instruction aria-label="Listen to the instructions">🔊 How to play</button></div><div class="m10-animal-bubbles">${speakers.map(speaker=>`<button class="m10-animal-bubble fc-action" type="button" draggable="true" data-animal-bubble="${esc(speaker.id)}" aria-pressed="false" aria-label="Listen: ${esc(speaker.text)}">${cue(speaker)}<span><span aria-hidden="true">🔊 </span>${esc(speaker.text)}</span><span data-animal-mark="${esc(speaker.id)}" class="m10-animal-mark" aria-hidden="true"></span></button>`).join('')}</div><div class="m10-animal-scene"><img src="${esc(new URL(asset.path.replace(/^apps\//,''),base).href)}" alt="${esc(page.imageAlt || 'Animals share their national park home. One animal and a group of animal friends are in the complete park scene.')}" draggable="false">${speakers.map((speaker,index)=>`<button class="m10-animal-target" type="button" data-animal-target="${esc(speaker.id)}" style="left:${speaker.x}%;top:${speaker.y}%" aria-label="${esc(speaker.label || `Animal speaker ${index+1}`)}"><span data-animal-target-mark="${esc(speaker.id)}" aria-hidden="true">💬</span></button>`).join('')}</div><p class="activity-result m10-animal-feedback" data-animal-feedback role="status" aria-live="polite">Tap a speech bubble to hear it.</p><p class="m10-animal-count" data-animal-count aria-live="polite">0 / ${speakers.length}</p><button type="button" class="reset-button" data-animal-reset>↻ Try again</button></section>`;
    const bubble=id=>qa('[data-animal-bubble]').find(element=>element.dataset.animalBubble===id);
    const target=id=>qa('[data-animal-target]').find(element=>element.dataset.animalTarget===id);
    const mark=id=>qa('[data-animal-mark]').find(element=>element.dataset.animalMark===id);
    const targetMark=id=>qa('[data-animal-target-mark]').find(element=>element.dataset.animalTargetMark===id);
    const feedback=q('[data-animal-feedback]');
    function select(id){
      const speaker=speakers.find(item=>item.id===id);if(!speaker)return;
      say(speaker.text,bubble(id));
      if(placed.has(id)){feedback.textContent=speaker.text;return;}
      selected=id;
      qa('[data-animal-bubble]').forEach(element=>{const active=element.dataset.animalBubble===id;element.classList.toggle('is-active',active);element.setAttribute('aria-pressed',String(active));});
      feedback.textContent='Who says it? Tap the animal in the picture.';
    }
    function place(id,draggedId){
      const speaker=speakers.find(item=>item.id===id);if(!speaker)return;
      if(placed.has(id)){say(speaker.text,target(id));feedback.textContent=speaker.text;return;}
      const sourceId=draggedId || selected;
      if(!sourceId){feedback.textContent='Tap a speech bubble first.';say('Tap a speech bubble first.');return;}
      if(!ids.has(sourceId) || placed.has(sourceId))return;
      qa('[data-animal-target]').forEach(element=>element.classList.remove('is-wrong'));
      if(sourceId!==id){target(id).classList.add('is-wrong');feedback.textContent='Listen again. Try the other speaker.';say('Listen again. Try the other speaker.');return;}
      placed.add(id);selected=null;
      bubble(id).classList.add('is-placed');mark(id).textContent='✓';
      target(id).classList.add('is-correct');targetMark(id).textContent='★';target(id).setAttribute('aria-label',`Listen: ${speaker.text}`);
      qa('[data-animal-bubble]').forEach(element=>{element.classList.remove('is-active');element.setAttribute('aria-pressed','false');});
      feedback.textContent=speaker.text;q('[data-animal-count]').textContent=`${placed.size} / ${speakers.length}`;
      say(speaker.text,target(id));onComplete(placed.size===speakers.length);
    }
    bind(q('[data-animal-instruction]'),'onclick',()=>say(instruction,q('[data-animal-instruction]')));
    qa('[data-animal-bubble]').forEach(element=>{
      const id=element.dataset.animalBubble;bind(element,'onclick',()=>select(id));
      bind(element,'ondragstart',event=>{if(placed.has(id)){event.preventDefault();return;}select(id);event.dataTransfer?.setData('text/plain',id);if(event.dataTransfer)event.dataTransfer.effectAllowed='move';});
      bind(element,'ondragend',()=>qa('[data-animal-target]').forEach(item=>item.classList.remove('is-over')));
    });
    qa('[data-animal-target]').forEach(element=>{
      const id=element.dataset.animalTarget;bind(element,'onclick',()=>place(id));
      bind(element,'ondragover',event=>{event.preventDefault();element.classList.add('is-over');if(event.dataTransfer)event.dataTransfer.dropEffect='move';});
      bind(element,'ondragleave',()=>element.classList.remove('is-over'));
      bind(element,'ondrop',event=>{event.preventDefault();element.classList.remove('is-over');const sourceId=event.dataTransfer?.getData('text/plain');if(sourceId && ids.has(sourceId))place(id,sourceId);});
    });
    bind(q('[data-animal-reset]'),'onclick',()=>{
      stop();selected=null;placed.clear();
      qa('[data-animal-bubble]').forEach(element=>{element.classList.remove('is-active','is-placed');element.setAttribute('aria-pressed','false');});
      qa('[data-animal-mark]').forEach(element=>element.textContent='');
      qa('[data-animal-target]').forEach((element,index)=>{element.classList.remove('is-correct','is-wrong','is-over');element.setAttribute('aria-label',speakers[index].label || `Animal speaker ${index+1}`);});
      qa('[data-animal-target-mark]').forEach(element=>element.textContent='💬');
      feedback.textContent='Tap a speech bubble to hear it.';q('[data-animal-count]').textContent=`0 / ${speakers.length}`;onComplete(false);
    });
    const onVisibility=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',onVisibility);onComplete(false);
    return()=>{if(disposed)return;disposed=true;stop();listeners.forEach(([element,event])=>element[event]=null);document.removeEventListener('visibilitychange',onVisibility);};
  }
  window.M10AnimalHome={mount};
})();

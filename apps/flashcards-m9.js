/* Current Month 9 Flashcards interface, adapted only to Month 10's supplied data.
 * Interface source: Month9/apps/level-a/literacy/flashcards.{html,js,css} and
 * flashcards-review.css / flashcards-spotlight.css. No Month 9 curriculum/media.
 */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const shuffle = input => {
    const out=[...input];
    for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}
    return out;
  };
  function mount({lesson,assets,base,speak,mute}) {
    const root=document.getElementById('m9-flashcards');
    if(!root)throw new Error('M10 flashcard root is missing');
    const sourceCards=lesson.cards;
    const cards=sourceCards.map(card=>{
      const asset=assets.get(card.imageKey);
      return {...card,image:new URL(asset.path.replace(/^apps\//,''),base).href};
    });
    const $=selector=>root.querySelector(selector), all=selector=>[...root.querySelectorAll(selector)];
    let disposed=false,speechId=0,fastTimer=null,peekTimer=null,ghost=null,gesture=null,suppress=0;
    let current=cards[0],order=[...cards],fastCard=cards[0],spotCard=cards[0],spotX=50,spotY=50,sentenceIndex=0;
    const byId=id=>cards.find(c=>c.id===id),random=()=>cards[Math.floor(Math.random()*cards.length)];
    const image=c=>`<img src="${esc(c.image)}" alt="${esc(c.label)}" draggable="false">`;
    root.innerHTML=`<div class="fc-layout"><nav class="fc-tabs" aria-label="Flashcard activities">
      <button class="fc-tab is-active" type="button" data-tab="lesson" aria-pressed="true">📚 Lesson Flashcards</button>
      <button class="fc-tab" type="button" data-tab="fast" aria-pressed="false">⚡ Fast Game</button>
      <button class="fc-tab" type="button" data-tab="spot" aria-pressed="false">🔦 Spot the Picture</button>
      <button class="fc-tab" type="button" data-tab="sentence" aria-pressed="false">🧩 Complete the Sentence</button>
      <button class="fc-tab" type="button" data-tab="tpr" aria-pressed="false">🎬 TPR</button></nav>
      <section class="fc-workbench card">
      <div class="fc-panel is-active" data-panel="lesson"><button class="fc-feature" type="button" data-feature-card aria-label="Hear this flashcard"></button><p class="fc-model" data-model-sentence></p><div class="fc-controls"><button class="fc-action" type="button" data-prev>← Previous</button><button class="fc-action" type="button" data-listen>🔊 Listen</button><button class="fc-action" type="button" data-next>Next →</button><button class="fc-action" type="button" data-shuffle>🎲 Shuffle</button></div><p class="fc-status" data-card-count></p><div class="fc-thumbs" data-card-list></div></div>
      <div class="fc-panel" data-panel="fast" hidden><h2>Fast Game</h2><div class="fc-fast-stage" data-fast-stage><div class="fc-curtain">?</div></div><div class="fc-controls"><button class="fc-action" type="button" data-fast-peek>Peek (0.3 sec)</button><button class="fc-action" type="button" data-fast-show>Show Full</button><button class="fc-action" type="button" data-fast-new>New Flashcard</button></div></div>
      <div class="fc-panel" data-panel="spot" hidden><h2>Spot the Picture</h2><div class="fc-spot-stage" data-spot-stage tabindex="0" aria-label="Hidden flashcard. Move the spotlight to see it."></div><div class="fc-controls"><button class="fc-action" type="button" data-spot-reveal>Show Full Picture</button><button class="fc-action" type="button" data-spot-new>New Flashcard</button></div></div>
      <div class="fc-panel" data-panel="sentence" hidden><h2>Complete the Sentence</h2><div class="fc-controls" data-sentence-nav><button class="fc-action" type="button" data-sentence-prev>← Previous Sentence</button><span class="fc-status" data-sentence-count aria-live="polite"></span><button class="fc-action" type="button" data-sentence-next>Next Sentence →</button></div><div class="fc-sentence" data-sentence-frame><span class="fc-blank" data-sentence-blank tabindex="0" aria-label="Sentence blank">______</span></div><div class="fc-scatter" data-sentence-choices aria-label="Drag or tap a flashcard into the sentence"></div><p class="fc-status" data-sentence-status aria-live="polite">Drag or tap any card into the blank.</p><div class="fc-controls"><button class="fc-action" type="button" data-sentence-listen>🔊 Listen Sentence</button><button class="fc-action" type="button" data-sentence-new>Try Again</button></div></div>
      <div class="fc-panel" data-panel="tpr" hidden><section class="pending-slot"><h2>TPR</h2><p>The Month 10 action clips are not supplied yet.</p></section></div></section></div><p class="fc-status m10-preview-voice" data-audio-status role="status">Device voice preview · approved recordings pending</p>`;
    function stopSpeech(){speechId++;mute();}
    function say(text,after){const id=speechId;speak(text,ok=>{if(!disposed&&ok&&id===speechId)after?.();});}
    function speakCard(card){stopSpeech();say(card.label,()=>say(card.sentence));}
    function stopTimers(){clearTimeout(fastTimer);clearTimeout(peekTimer);fastTimer=peekTimer=null;}
    function cleanupPointer(){ghost?.remove();ghost=null;gesture=null;$('[data-sentence-blank]')?.classList.remove('is-over');}
    function show(card=current,shouldSpeak=false){
      stopSpeech();current=card;
      $('[data-feature-card]').innerHTML=image(card);
      $('[data-feature-card]').setAttribute('aria-label','Hear '+card.label);
      $('[data-model-sentence]').textContent=card.sentence;
      $('[data-card-count]').textContent=`${order.indexOf(card)+1} / ${order.length}`;
      $('[data-card-list]').innerHTML=order.map(c=>`<button class="fc-thumb${c===card?' is-active':''}" type="button" data-card="${esc(c.id)}" aria-label="Show ${esc(c.label)}">${image(c)}</button>`).join('');
      all('[data-card-list] [data-card]').forEach(button=>button.onclick=()=>show(byId(button.dataset.card),true));
      if(shouldSpeak)speakCard(card);
    }
    $('[data-feature-card]').onclick=()=>speakCard(current);
    $('[data-listen]').onclick=()=>speakCard(current);
    $('[data-prev]').onclick=()=>show(order[(order.indexOf(current)+order.length-1)%order.length],true);
    $('[data-next]').onclick=()=>show(order[(order.indexOf(current)+1)%order.length],true);
    $('[data-shuffle]').onclick=()=>{order=shuffle(cards);show(order[0]);};
    const fast=$('[data-fast-stage]');
    function cover(){if(!disposed)fast.querySelector('.fc-curtain')?.classList.remove('is-hidden');}
    function peek(){stopTimers();fast.querySelector('.fc-curtain')?.classList.add('is-hidden');fastTimer=setTimeout(cover,300);}
    function newFast(){stopTimers();fastCard=random();fast.innerHTML=image(fastCard)+'<div class="fc-curtain">?</div>';peekTimer=setTimeout(peek,250);}
    $('[data-fast-peek]').onclick=peek;
    $('[data-fast-show]').onclick=()=>{stopTimers();fast.querySelector('.fc-curtain')?.classList.add('is-hidden');stopSpeech();say(fastCard.label);};
    $('[data-fast-new]').onclick=newFast;
    const spot=$('[data-spot-stage]');
    function setSpot(){spot.style.setProperty('--spot-x',spotX+'%');spot.style.setProperty('--spot-y',spotY+'%');}
    function newSpot(){spotCard=random();spot.classList.remove('is-revealed');spot.innerHTML=image(spotCard);spotX=spotY=50;setSpot();}
    function reveal(){spot.classList.add('is-revealed');stopSpeech();say(spotCard.label);}
    spot.onpointermove=event=>{const r=spot.getBoundingClientRect();spotX=Math.max(0,Math.min(100,(event.clientX-r.left)/r.width*100));spotY=Math.max(0,Math.min(100,(event.clientY-r.top)/r.height*100));setSpot();};
    spot.onkeydown=event=>{const delta={ArrowLeft:[-8,0],ArrowRight:[8,0],ArrowUp:[0,-8],ArrowDown:[0,8]}[event.key];if(delta){event.preventDefault();spotX=Math.max(0,Math.min(100,spotX+delta[0]));spotY=Math.max(0,Math.min(100,spotY+delta[1]));setSpot();}else if(['Enter',' '].includes(event.key)){event.preventDefault();reveal();}};
    $('[data-spot-reveal]').onclick=reveal;$('[data-spot-new]').onclick=newSpot;
    const sentenceGroups=[];
    const eligible=cards.filter(c=>c.practiceEligible!==false);
    eligible.forEach(card=>{
      const at=card.sentence.toLowerCase().indexOf(card.label.toLowerCase());
      if(at>=0){const before=card.sentence.slice(0,at),after=card.sentence.slice(at+card.label.length);let group=sentenceGroups.find(g=>g.mode==='phrase'&&g.before===before&&g.after===after);if(!group){group={mode:'phrase',before,after,cards:[]};sentenceGroups.push(group);}group.cards.push(card);}
      else sentenceGroups.push({mode:'picture',prompt:card.sentence,correctId:card.id,cards:eligible});
    });
    const scatter=$('[data-sentence-choices]'),sentence=$('[data-sentence-frame]'),blank=$('[data-sentence-blank]'),status=$('[data-sentence-status]');
    function place(card){
      const group=sentenceGroups[sentenceIndex];
      if(!group.cards.includes(card))return;
      if(group.mode==='picture'&&group.correctId!==card.id){status.textContent='Have another look. Try the matching picture.';return;}
      if(group.mode==='picture'){blank.innerHTML=image(card);blank.classList.add('fc-blank--picture');}
      else blank.textContent=card.sentence.slice(group.before.length,card.sentence.length-group.after.length||undefined);
      all('[data-sentence-choices] [data-card]').forEach(button=>button.classList.toggle('is-used',button.dataset.card===card.id));
      status.textContent=card.sentence;window.gpFeedbackSounds?.correct?.();stopSpeech();say(card.sentence);
    }
    function newSentence(){
      cleanupPointer();stopSpeech();const group=sentenceGroups[sentenceIndex];
      if(!group)return;
      blank.classList.remove('fc-blank--picture');blank.textContent=group.mode==='picture'?'Picture':'______';
      if(group.mode==='picture')sentence.replaceChildren(document.createTextNode(group.prompt+' '),blank);
      else sentence.replaceChildren(document.createTextNode(group.before),blank,document.createTextNode(group.after));
      $('[data-sentence-nav]').hidden=sentenceGroups.length<2;
      $('[data-sentence-count]').textContent=`${sentenceIndex+1} / ${sentenceGroups.length}`;
      status.textContent=group.mode==='picture'?'Listen to the sentence. Drag or tap its picture into the box.':'Drag or tap any card into the blank.';
      scatter.innerHTML=shuffle(group.cards).map(c=>`<button class="fc-mini" type="button" data-card="${esc(c.id)}" aria-label="Use ${esc(c.label)}">${image(c)}</button>`).join('');
      scatter.querySelectorAll('button').forEach(button=>{
        button.onclick=()=>{if(performance.now()>=suppress)place(byId(button.dataset.card));};
        button.onpointerdown=event=>{if(!event.isPrimary||event.button!==0)return;cleanupPointer();button.setPointerCapture(event.pointerId);gesture={id:event.pointerId,x:event.clientX,y:event.clientY,button};};
        button.onpointermove=event=>{if(!gesture||gesture.button!==button||gesture.id!==event.pointerId)return;if(!ghost&&Math.hypot(event.clientX-gesture.x,event.clientY-gesture.y)<7)return;event.preventDefault();if(!ghost){ghost=new Image();ghost.src=byId(button.dataset.card).image;ghost.className='fc-drag-ghost';document.body.append(ghost);}ghost.style.left=event.clientX+'px';ghost.style.top=event.clientY+'px';const r=blank.getBoundingClientRect();blank.classList.toggle('is-over',event.clientX>=r.left&&event.clientX<=r.right&&event.clientY>=r.top&&event.clientY<=r.bottom);};
        button.onpointerup=event=>{if(!gesture||gesture.button!==button)return;const moved=!!ghost,r=blank.getBoundingClientRect(),hit=event.clientX>=r.left-12&&event.clientX<=r.right+12&&event.clientY>=r.top-12&&event.clientY<=r.bottom+12;cleanupPointer();if(moved){suppress=performance.now()+400;if(hit)place(byId(button.dataset.card));else status.textContent='Drop in the blank, or tap the picture.';}};
        button.onpointercancel=button.onlostpointercapture=cleanupPointer;
      });
    }
    $('[data-sentence-prev]').onclick=()=>{sentenceIndex=(sentenceIndex+sentenceGroups.length-1)%sentenceGroups.length;newSentence();};
    $('[data-sentence-next]').onclick=()=>{sentenceIndex=(sentenceIndex+1)%sentenceGroups.length;newSentence();};
    $('[data-sentence-new]').onclick=newSentence;
    $('[data-sentence-listen]').onclick=()=>{const group=sentenceGroups[sentenceIndex];if(!group)return;stopSpeech();say(group.mode==='picture'?group.prompt:group.cards[0].sentence);};
    all('[data-tab]').forEach(tab=>tab.onclick=()=>{
      stopTimers();stopSpeech();cleanupPointer();
      all('[data-tab]').forEach(button=>{const active=button===tab;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
      all('[data-panel]').forEach(panel=>{panel.hidden=panel.dataset.panel!==tab.dataset.tab;panel.classList.toggle('is-active',!panel.hidden);});
      if(tab.dataset.tab==='fast')newFast();if(tab.dataset.tab==='spot')newSpot();if(tab.dataset.tab==='sentence')newSentence();
    });
    const onVisibility=()=>{if(document.hidden){stopTimers();stopSpeech();cleanupPointer();cover();}};
    document.addEventListener('visibilitychange',onVisibility);
    show();newSpot();newSentence();
    return ()=>{if(disposed)return;disposed=true;stopTimers();stopSpeech();cleanupPointer();document.removeEventListener('visibilitychange',onVisibility);};
  }
  window.M10Flashcards={mount};
})();

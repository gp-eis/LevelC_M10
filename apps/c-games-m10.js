/* Level C's native Month9 Wheel / Picture Match / Pick the Right One flows.
 * Content is supplied through the separately source-reviewed Month10 game data.
 * This module owns transient controls only; it never mutates lessons or decks. */
(() => {
  'use strict';
  let serial=0;
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe=callback=>{try{return callback?.();}catch{return undefined;}};
  const shuffle=list=>{const out=[...list];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
  function mount({root,kind,items=[],rounds=[],bonuses=[],assets,base,headingIconKey,continuous=false,nativeAB=false,overlayClass='',speak=()=>{},mute=()=>{},onComplete=()=>{},onRoundComplete=()=>{},onReward,onReturn}){
    if(!root||!['wheel','picture-match','pick-right','count-compare'].includes(kind))throw new Error('C game root/kind is missing');
    const assetFor=key=>typeof assets?.get==='function'?assets.get(key):(Array.isArray(assets)?assets:assets?.assets||[]).find(a=>a.key===key);
    const image=key=>{const asset=assetFor(key);if(!asset?.path)throw new Error('Missing C game picture: '+key);const url=new URL(asset.path.replace(/^apps\//,''),base);if(asset.sha256)url.searchParams.set('v',asset.sha256.slice(0,12));return url.href;};
    const picture=(key,alt,extra='')=>key?`<img src="${esc(image(key))}" alt="${esc(alt||assetFor(key)?.alt||'Animal group')}" draggable="false" ${extra}>`:'';
    const heading=(title,fallback)=>`${headingIconKey?`<img src="${esc(image(headingIconKey))}" alt="" draggable="false">`:fallback} ${esc(title)}`;
    const $=selector=>root.querySelector(selector),all=selector=>[...root.querySelectorAll(selector)];
    let disposed=false,epoch=0,voiceToken=0,dialog=null,rewardDispose=()=>{},pendingFocus=null;
    const timers=new Set(),frames=new Set(),oscillators=new Set();let audioContext=null;
    const live=()=>!disposed&&root.isConnected!==false&&!document.hidden;
    const stopVoice=()=>{voiceToken++;safe(mute);};
    function say(text,callback){if(!live())return;stopVoice();const token=voiceToken;safe(()=>speak(text,ok=>{if(live()&&token===voiceToken)callback?.(ok!==false);}));}
    function later(fn,delay){const version=epoch,id=setTimeout(()=>{timers.delete(id);if(live()&&version===epoch)fn();},delay);timers.add(id);return id;}
    function frame(fn){const version=epoch,id=requestAnimationFrame(time=>{frames.delete(id);if(live()&&version===epoch)fn(time);});frames.add(id);return id;}
    function stopEffect(){const context=audioContext;audioContext=null;oscillators.forEach(node=>{safe(()=>node.stop());safe(()=>node.disconnect());});oscillators.clear();if(context)safe(()=>context.close()?.catch?.(()=>{}));}
    function playBonusEffect(kind){
      stopEffect();const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;let context;try{context=new AC();}catch{return;}audioContext=context;const version=epoch;
      const notes=kind==='spin-again'?[[440,0,.1,'triangle',.11],[587,.08,.12,'triangle',.11],[784,.17,.18,'triangle',.11]]:kind==='super-star'?[[523,0,.15,'triangle',.11],[659,.1,.16,'triangle',.11],[784,.2,.16,'triangle',.11],[1047,.31,.28,'triangle',.11]]:[[125,0,.28,'sawtooth',.16],[72,.08,.42,'sine',.18],[392,.34,.12,'square',.06]];
      Promise.resolve(context.state==='suspended'?context.resume():undefined).then(()=>{
        if(!live()||version!==epoch||audioContext!==context){safe(()=>context.close()?.catch?.(()=>{}));return;}
        notes.forEach(([frequency,start,duration,type,volume])=>{const node=context.createOscillator(),gain=context.createGain();oscillators.add(node);node.type=type;node.frequency.setValueAtTime(frequency,context.currentTime+start);gain.gain.setValueAtTime(.001,context.currentTime+start);gain.gain.exponentialRampToValueAtTime(volume,context.currentTime+start+.02);gain.gain.exponentialRampToValueAtTime(.001,context.currentTime+start+duration);node.connect(gain);gain.connect(context.destination);node.onended=()=>{oscillators.delete(node);safe(()=>node.disconnect());if(!oscillators.size&&audioContext===context){audioContext=null;safe(()=>context.close()?.catch?.(()=>{}));}};node.start(context.currentTime+start);node.stop(context.currentTime+start+duration+.03);});
      }).catch(()=>{if(audioContext===context)stopEffect();});
    }
    function cancelWork(){epoch++;timers.forEach(clearTimeout);timers.clear();frames.forEach(cancelAnimationFrame);frames.clear();stopVoice();stopEffect();}
    function closeDialog(restore=true){
      if(!dialog)return;const old=dialog;dialog=null;old.overlay.onclick=old.overlay.onkeydown=null;old.overlay.querySelectorAll('button').forEach(button=>button.onclick=null);old.overlay.remove();
      old.siblings.forEach(({element,inert})=>element.inert=inert);document.body.style.overflow=old.overflow;
      if(restore&&live()){const target=pendingFocus||old.focus;pendingFocus=null;if(target?.isConnected!==false&&!target?.disabled)safe(()=>target?.focus({preventScroll:true}));}
    }
    function openDialog(html,aria,after,escape){
      closeDialog(false);const overlay=document.createElement('section'),id='m10-c-game-dialog-'+(++serial);overlay.classList.add('m10-c-game-overlay');overlay.innerHTML=`<div class="m10-c-game-dialog" role="dialog" aria-modal="true" aria-labelledby="${id}"><h2 id="${id}">${esc(aria)}</h2>${html}</div>`;
      if(overlayClass)overlay.classList.add(...String(overlayClass).split(/\s+/).filter(Boolean));
      const siblings=[...document.body.children].map(element=>({element,inert:element.inert})),overflow=document.body.style.overflow,focus=document.activeElement;
      document.body.append(overlay);siblings.forEach(({element})=>element.inert=true);document.body.style.overflow='hidden';dialog={overlay,siblings,overflow,focus};
      overlay.onkeydown=event=>{if(!live()||dialog?.overlay!==overlay)return;const buttons=[...overlay.querySelectorAll('button')].filter(b=>!b.disabled);if(event.key==='Escape'){event.preventDefault();stopVoice();closeDialog();escape?.();}else if(event.key==='Tab'){event.preventDefault();const index=buttons.indexOf(document.activeElement),next=(index+(event.shiftKey?-1:1)+buttons.length)%buttons.length;buttons[next]?.focus();}};
      after?.(overlay);overlay.querySelector('button')?.focus();return overlay;
    }
    root.classList.add('m10-c-games');root.dataset.cGameKind=kind;
    let onHidden=()=>{},onShown=()=>{};
    if(kind==='wheel'){
      if(!items.length||new Set(items.map(item=>item.id)).size!==items.length)throw new Error('Wheel requires unique reviewed lesson models');
      items.forEach(item=>{if(!item.label||!item.sentence)throw new Error('Wheel model text is missing');image(item.imageKey);});
      if(new Set(bonuses.map(item=>item.bonus)).size!==bonuses.length||bonuses.some(item=>!['spin-again','super-star','boom'].includes(item.bonus)||!item.label||!item.sentence||!item.imageKey&&!item.symbol))throw new Error('Wheel bonuses require the native evergreen UI outcomes');
      bonuses.forEach(item=>{if(item.imageKey)image(item.imageKey);});
      const lessons=shuffle(items),gifts=shuffle(bonuses),gaps=shuffle(lessons.map((_,i)=>i)).slice(0,gifts.length),arranged=lessons.flatMap((item,i)=>gaps.includes(i)?[item,gifts[gaps.indexOf(i)]]:[item]),offset=Math.floor(Math.random()*arranged.length),deck=[...arranged.slice(offset),...arranged.slice(0,offset)],colors=['#7ed957','#b388ff','#ffa62b','#ff8f66','#4fc3f7'],angle=360/deck.length;
      root.dataset.cGameTeachingModels=String(items.length);root.dataset.cGameBonusOutcomes=String(bonuses.length);
      root.innerHTML=`<section class="m10-c-game-page m10-c-wheel-page"><header class="m10-c-game-heading"><h1>${heading('Spin the Wheel','🎡')}</h1><p>Spin fast, press stop, then see what you get!</p></header><div class="m10-c-wheel-wrap"><div class="m10-c-wheel-pointer"></div><div class="m10-c-wheel" data-cg-wheel aria-label="Lesson wheel">${deck.map((item,i)=>{const rad=(i*angle+angle/2)*Math.PI/180;return `<span class="m10-c-wheel-label" style="left:${50+Math.sin(rad)*30}%;top:${50-Math.cos(rad)*30}%;width:${Math.max(16,170/deck.length)}%">${item.imageKey?picture(item.imageKey,item.label):`<span aria-hidden="true">${esc(item.symbol)}</span>`}</span>`;}).join('')}</div></div><p class="m10-c-wheel-result" role="status" data-cg-status></p><div class="m10-c-wheel-actions"><button type="button" class="m10-c-game-pill" data-cg-spin>🎡 SPIN!</button><button type="button" class="m10-c-game-pill is-red" data-cg-stop hidden>🛑 STOP!</button></div></section>`;
      $('[data-cg-wheel]').style.background=`conic-gradient(${deck.map((item,i)=>`${item.color||colors[i%colors.length]} ${i*angle}deg ${(i+1)*angle}deg`).join(',')})`;
      let rotation=0,spinning=false,stopping=false,last=0,current=null;
      const render=()=>{$('[data-cg-wheel]').style.transform=`rotate(${rotation}deg)`;};
      const controls=()=>{root.classList.remove('m10-c-wheel-running');$('[data-cg-spin]').hidden=false;$('[data-cg-spin]').disabled=false;$('[data-cg-stop]').hidden=true;$('[data-cg-stop]').disabled=false;};
      function showCard(item){
        if(!live())return;current=item;root.dataset.cGameModelId=item.id;$('[data-cg-status]').textContent=`🎉 You landed on ${item.label}!`;
        pendingFocus=$('[data-cg-spin]');
        const overlay=openDialog(`<p class="m10-c-flip-hint">👆 Click the card to flip it!</p><button type="button" class="m10-c-wheel-card" data-cg-word-card aria-pressed="false" aria-label="${esc(item.label)} card. Click to flip."><span class="m10-c-wheel-card-inner"><span class="m10-c-wheel-face">${picture(item.imageKey,item.label)}</span><span class="m10-c-wheel-face is-back">${picture(item.imageKey,item.label)}<strong>${esc(item.label)}</strong><span>${esc(item.sentence)}</span></span></span></button><button type="button" class="m10-c-game-pill is-blue" data-cg-wheel-return>🎡 Back to Wheel</button>`,'Your lesson card',host=>{
          host.classList.add('is-wheel-card');const card=host.querySelector('[data-cg-word-card]'),back=host.querySelector('[data-cg-wheel-return]');
          const flip=value=>{card.classList.toggle('is-flipped',value);card.setAttribute('aria-pressed',String(value));};
          card.onclick=()=>{if(!live()||dialog?.overlay!==host)return;const value=card.getAttribute('aria-pressed')!=='true';flip(value);say(value?item.sentence:item.label);};
          back.onclick=()=>{if(!live()||dialog?.overlay!==host)return;stopVoice();pendingFocus=$('[data-cg-spin]');closeDialog();current=null;};
          say(item.label,ok=>{if(ok&&dialog?.overlay===host&&current===item){const followToken=voiceToken;later(()=>{if(voiceToken!==followToken||dialog?.overlay!==host||current!==item)return;flip(true);say(item.sentence);},350);}});
        },()=>{current=null;});
        return overlay;
      }
      function showBonus(item){
        if(!live())return;current=item;delete root.dataset.cGameModelId;root.dataset.cGameBonus=item.bonus;$('[data-cg-status]').textContent=item.sentence;pendingFocus=$('[data-cg-spin]');
        const palette=item.bonus==='boom'?['#ff5ea8','#ffd43b','#7de7ed','#a56bf2']:['#ffd43b','#ff8f3d','#5ed8e8','#ff74b7'];
        const particles=Array.from({length:18},(_,i)=>{const angle=i/18*Math.PI*2,distance=105+i%4*22;return `<i class="m10-c-bonus-particle" aria-hidden="true" style="--x:${Math.cos(angle)*distance}px;--y:${Math.sin(angle)*distance}px;--delay:${i%5*.025}s;--particle:${palette[i%palette.length]}"></i>`;}).join('');
        const leave=()=>{cancelWork();root.classList.remove('m10-c-wheel-boom');current=null;};
        openDialog(`${item.imageKey?picture(item.imageKey,item.label,'class="m10-c-bonus-icon"'):`<span class="m10-c-bonus-icon is-symbol" aria-hidden="true">${esc(item.symbol)}</span>`}<p class="m10-c-bonus-message">${esc(item.sentence)}</p><button type="button" class="m10-c-game-pill is-blue" data-cg-bonus-action>${item.bonus==='spin-again'?'🎡 Spin Again':'🎡 Back to Wheel'}</button>${particles}`,item.label,host=>{
          host.classList.add('is-bonus');host.dataset.bonus=item.bonus;host.querySelector('[data-cg-bonus-action]').onclick=()=>{if(!live()||dialog?.overlay!==host)return;leave();pendingFocus=$('[data-cg-spin]');closeDialog();if(item.bonus==='spin-again')$('[data-cg-spin]').onclick();};
        },leave);
        if(item.bonus==='boom')root.classList.add('m10-c-wheel-boom');playBonusEffect(item.bonus);say(item.sentence);
      }
      function tick(time){if(!spinning||stopping)return;if(!last)last=time;rotation+=540*Math.min(time-last,40)/1000;last=time;render();frame(tick);}
      $('[data-cg-spin]').onclick=()=>{if(!live()||spinning)return;cancelWork();closeDialog(false);current=null;delete root.dataset.cGameModelId;delete root.dataset.cGameBonus;root.classList.remove('m10-c-wheel-boom');spinning=true;stopping=false;last=0;$('[data-cg-status]').textContent='';$('[data-cg-spin]').hidden=true;$('[data-cg-stop]').hidden=false;root.classList.add('m10-c-wheel-running');$('[data-cg-stop]').focus();frame(tick);};
      $('[data-cg-stop]').onclick=()=>{if(!live()||!spinning||stopping)return;cancelWork();stopping=true;$('[data-cg-stop]').disabled=true;const start=rotation,startTime=performance.now(),duration=1800,distance=486;function slow(time){const p=Math.min((time-startTime)/duration,1);rotation=start+distance*(2*p-p*p);render();if(p<1)frame(slow);else{spinning=stopping=false;controls();const normalized=((rotation%360)+360)%360,index=Math.floor(((360-normalized)%360)/angle)%deck.length;deck[index].bonus?showBonus(deck[index]):showCard(deck[index]);}}frame(slow);};
      onHidden=()=>{spinning=stopping=false;current=null;root.classList.remove('m10-c-wheel-boom');controls();};
    }else{
      if(!rounds.length||new Set(rounds.map(round=>round.id)).size!==rounds.length)throw new Error('C choice game requires unique reviewed rounds');
      rounds.forEach(round=>{if(!round.feedbackText||!round.correctChoiceId||!Array.isArray(round.choices)||!round.choices.some(c=>c.id===round.correctChoiceId))throw new Error('C game answer/feedback mapping is missing');if(kind==='picture-match'&&!round.sentence||kind!=='picture-match'&&!round.question)throw new Error('C game prompt is missing');if(round.requiresContextListen&&(!Array.isArray(round.contextText)||!round.contextText.length))throw new Error('Comparison source context is missing');if(new Set(round.choices.map(c=>c.id)).size!==round.choices.length)throw new Error('C game choices must be unique');round.choices.forEach(c=>{if(c.imageKey)image(c.imageKey);});if(round.contextImageKey)image(round.contextImageKey);});
      const pictureMode=kind==='picture-match',title=pictureMode?'Picture Match':kind==='count-compare'?'Count & Compare':'Pick the Right One',tool=pictureMode?'New Round':'New Question';
      root.innerHTML=`<section class="m10-c-game-page"><header class="m10-c-game-heading"><h1>${heading(title,pictureMode?'🧩':kind==='count-compare'?'🔢':'✅')}</h1><p>${pictureMode?'Read the sentence, then pick the picture that matches!':'Listen to the question, then pick the best answer!'}</p></header><div class="m10-c-game-toolbar"><button type="button" class="m10-c-game-pill" data-cg-new>🔄 ${tool}</button><span class="m10-c-game-score" ${nativeAB&&!pictureMode?'hidden':''}>Correct: <span data-cg-score>0</span></span><span class="m10-c-game-progress" data-cg-progress ${continuous?'hidden':''}></span></div><section class="m10-c-game-board ${pictureMode?'is-picture':'is-pick'}" data-cg-board><div data-cg-context></div><div data-cg-choices></div><div data-cg-prompt></div><p class="m10-c-game-live" role="status" aria-live="polite" data-cg-status></p><button type="button" class="m10-c-game-pill is-green" data-cg-continue hidden>✓ Continue</button></section></section>`;
      let deck=[],index=0,score=0,locked=false,correct=false,contextHeard=false,complete=false,started=false,continued=0;
      const current=()=>deck[index];
      function disableChoices(value){all('[data-cg-choice],[data-cg-hear-choice]').forEach(button=>button.disabled=value);}
      function render(){
        if(!live())return;cancelWork();closeDialog(false);const round=current();locked=correct=false;contextHeard=!round.requiresContextListen;delete root.dataset.complete;root.dataset.cGameRoundId=round.id;root.dataset.cGameCorrectChoiceId=round.correctChoiceId;
        $('[data-cg-score]').textContent=String(score);$('[data-cg-progress]').textContent=continuous?'':`Round ${index+1} of ${deck.length}`;$('[data-cg-continue]').hidden=true;$('[data-cg-status]').textContent=round.requiresContextListen?'Listen to all the groups first.':'';
        const context=round.contextText||[];
        $('[data-cg-context]').innerHTML=pictureMode?'':`<section class="m10-c-game-question ${context.length?'has-context':''}">${picture(round.contextImageKey,round.contextImageAlt||'Picture for the question')}<p>${esc(round.question)}</p><button class="m10-c-game-listen" type="button" data-cg-listen aria-label="${context.length?'Listen to all the groups and the question':'Listen to the question'}">🔊</button>${context.length?`<div class="m10-c-game-context">${context.map(line=>`<p>${esc(line)}</p>`).join('')}</div>`:''}</section>`;
        $('[data-cg-prompt]').innerHTML=pictureMode?`<div class="m10-c-game-sentence"><p>${esc(round.sentence)}</p><button class="m10-c-game-listen" type="button" data-cg-listen aria-label="Listen to the sentence">🔊</button></div>`:'';
        $('[data-cg-choices]').className=pictureMode?'m10-c-game-pictures':'m10-c-game-answers';
        $('[data-cg-choices]').innerHTML=shuffle(round.choices).map(choice=>pictureMode?`<button class="m10-c-game-choice" type="button" data-cg-choice="${esc(choice.id)}" aria-label="Choose picture: ${esc(choice.label)}">${picture(choice.imageKey,choice.label)}</button>`:`<div class="m10-c-game-answer-wrap"><button class="m10-c-game-choice is-answer ${choice.imageKey?'':'is-number'}" type="button" data-cg-choice="${esc(choice.id)}">${picture(choice.imageKey,choice.label)}<span>${esc(choice.text||choice.label)}</span></button><button type="button" class="m10-c-game-listen" data-cg-hear-choice="${esc(choice.id)}" aria-label="Listen to answer: ${esc(choice.text||choice.label)}">🔊</button></div>`).join('');
        disableChoices(!contextHeard);
        $('[data-cg-listen]').onclick=()=>{if(!live()||correct)return;const text=pictureMode?round.sentence:[...context,round.question].join(' ');if(round.requiresContextListen){disableChoices(true);$('[data-cg-status]').textContent='Listening to the groups…';}say(text,ok=>{if(current()!==round||correct)return;if(round.requiresContextListen){contextHeard=ok;disableChoices(!ok);$('[data-cg-status]').textContent=ok?'Now choose the answer.':'Could not play the voice. Please try Listen again.';}});};
        all('[data-cg-hear-choice]').forEach(button=>button.onclick=()=>{if(!live()||locked||!contextHeard)return;const choice=round.choices.find(c=>c.id===button.dataset.cgHearChoice);say(choice.text||choice.label);});
        all('[data-cg-choice]').forEach(button=>button.onclick=()=>choose(button,round));
        if(pictureMode)say(round.sentence);
      }
      function review(round,read=true){
        const chosen=round.choices.find(c=>c.id===round.correctChoiceId);pendingFocus=$('[data-cg-continue]');
        if(continuous)pendingFocus=$('[data-cg-new]');
        const visual=nativeAB&&!pictureMode?'':picture(pictureMode?chosen.imageKey:round.contextImageKey,pictureMode?chosen.label:round.contextImageAlt);
        const answer=nativeAB&&!pictureMode?`<p><strong>Answer:</strong> <span data-cg-review-feedback>${esc(round.feedbackText)}</span></p>`:`<p data-cg-review-feedback>${esc(round.feedbackText)}</p>`;
        const overlay=openDialog(`<div class="m10-c-game-review">${visual}${!pictureMode?`<p><strong>Question:</strong> ${esc(round.question)}</p>`:''}${answer}</div><button type="button" class="m10-c-game-pill is-green" data-cg-next>✓ Continue</button>`,'Correct! 🎉',host=>{host.querySelector('[data-cg-next]').onclick=()=>{if(live()&&dialog?.overlay===host&&current()===round)next();};},continuous?()=>next():undefined);
        if(read){if(nativeAB&&!pictureMode)say(round.question,ok=>{if(ok&&dialog?.overlay===overlay&&current()===round)say(round.feedbackText);});else say(round.feedbackText);}
      }
      function choose(button,round){
        if(!live()||locked||!contextHeard||current()!==round||!root.contains(button))return;stopVoice();locked=true;disableChoices(true);
        if(button.dataset.cgChoice!==round.correctChoiceId){safe(()=>window.gpFeedbackSounds?.wrong?.());button.classList.add('is-wrong');$('[data-cg-status]').textContent=nativeAB&&!pictureMode?'Good try. Look at the picture and choose again.':'Good try. Look carefully and choose again.';later(()=>{if(current()!==round||correct)return;button.classList.remove('is-wrong');locked=false;disableChoices(false);},650);return;}
        correct=true;score++;safe(()=>window.gpFeedbackSounds?.correct?.());button.classList.add('is-correct');$('[data-cg-score]').textContent=String(score);$('[data-cg-status]').textContent=nativeAB?'Great job!':round.feedbackText;$('[data-cg-continue]').hidden=!!continuous;review(round);
      }
      function finish(){
        complete=true;root.dataset.complete='true';$('[data-cg-new]').textContent='🔄 Play Again';$('[data-cg-continue]').hidden=true;$('[data-cg-status]').textContent='Great job! You finished every round.';
        safe(()=>onComplete({kind,rounds:deck.length,correct:score}));
        if(!live())return;
        if(typeof onReward==='function'){rewardDispose=safe(()=>onReward({title:'Great job!',returnFocus:$('[data-cg-new]')}))||(()=>{});return;}
        openDialog('<div class="m10-c-game-celebration" aria-hidden="true">🎉🏆🎉</div><p>You finished every round!</p><button type="button" class="m10-c-game-pill is-green" data-cg-replay>🔄 Play Again</button>'+(onReturn?'<button type="button" class="m10-c-game-pill is-blue" data-cg-return>← Back to games</button>':''),'Great job!',host=>{host.querySelector('[data-cg-replay]').onclick=start;const back=host.querySelector('[data-cg-return]');if(back)back.onclick=()=>{if(!live())return;stopVoice();closeDialog(false);onReturn();};});
      }
      function randomRound(){const previous=current()?.id,pool=rounds.filter(round=>round.id!==previous);deck=pool.length?pool:rounds;index=Math.floor(Math.random()*deck.length);}
      function next(){
        if(!live()||!correct||complete)return;const answered=current();cancelWork();closeDialog(false);
        if(continuous){continued++;safe(()=>onRoundComplete({kind,roundId:answered.id,correct:score,continued}));if(!live())return;randomRound();render();if(continued%4===0&&typeof onReward==='function'){safe(rewardDispose);rewardDispose=safe(()=>onReward({title:'Great job!',returnFocus:$('[data-cg-new]'),kind,correct:score,continued}))||(()=>{});}return;}
        index++;if(index===deck.length)finish();else render();
      }
      function start(){if(!live())return;cancelWork();safe(rewardDispose);rewardDispose=()=>{};closeDialog(false);if(continuous){if(!started)score=continued=0;randomRound();started=true;}else{deck=shuffle(rounds);index=score=0;}complete=false;delete root.dataset.complete;$('[data-cg-new]').textContent=`🔄 ${tool}`;render();}
      $('[data-cg-new]').onclick=start;$('[data-cg-continue]').onclick=next;
      onHidden=()=>{if(!correct){locked=false;contextHeard=!current()?.requiresContextListen;disableChoices(!contextHeard);$('[data-cg-status]').textContent=contextHeard?'': 'Listen to all the groups first.';all('.is-wrong').forEach(button=>button.classList.remove('is-wrong'));}};
      if(continuous)onShown=()=>{if(correct&&!dialog)review(current(),false);};
      start();
    }
    const visibility=()=>{if(disposed)return;if(document.hidden){cancelWork();closeDialog(false);safe(rewardDispose);rewardDispose=()=>{};onHidden();}else onShown();};
    const dispose=()=>{if(disposed)return;disposed=true;cancelWork();closeDialog(false);safe(rewardDispose);rewardDispose=()=>{};root.classList.remove('m10-c-wheel-running','m10-c-wheel-boom');document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',dispose);};
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',dispose);
    return dispose;
  }
  window.M10CGames={mount};
})();

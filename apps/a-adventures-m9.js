/* Native Month9 immersive Picture Hunt / four-cutout Picture Puzzle.
 * All art, speech models and hit regions come from the separate reviewed A pack.
 * Region/piece counts describe this interface, never invented book Math facts. */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe=fn=>{try{return fn?.();}catch{return undefined;}};
  const shuffle=list=>{const out=[...list];for(let i=out.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]];}return out;};
  const fitRect=(width,height,nativeWidth,nativeHeight)=>{if(![width,height,nativeWidth,nativeHeight].every(n=>Number.isFinite(n)&&n>0))return{width:0,height:0};const ratio=nativeWidth/nativeHeight,w=Math.min(width,height*ratio);return{width:w,height:w/ratio};};
  function createShell({root,kind,title,world,week,onReturn=()=>{},onRestart=()=>{},onListen=()=>{},onSoundChange=()=>{}}){
    if(!root||!kind||!title)throw new Error('A native adventure shell requires its root, kind and title');
    const priorBodyClass=document.body.classList.contains('m10-a-adventure-route'),priorOverflow=document.body.style.overflow;
    document.body.classList.add('m10-a-adventure-route');document.body.style.overflow='hidden';root.classList.add('m10-a-adventure');root.dataset.aAdventureKind=kind;
    root.innerHTML=`<div class="aadv-top"><button type="button" class="aadv-back" data-aa-back>← <span>Back</span></button><span class="aadv-badge">${world==='puzzle-park'?'Puzzle Park':'Wonder World'}</span><div class="aadv-tools"><button type="button" class="aadv-icon" data-aa-sound aria-label="Mute sounds" aria-pressed="false">♫</button><button type="button" class="aadv-restart" data-aa-restart aria-label="Restart this game">↻ <span>Start again</span></button></div></div><header class="aadv-heading"><h1 tabindex="-1">${esc(title)}</h1><div class="aadv-progress" data-aa-progress aria-live="polite"></div></header><div class="aadv-shell"><div class="aadv-mission"><div><h2 data-aa-prompt></h2><p data-aa-instruction></p></div><button type="button" class="aadv-listen" data-aa-listen aria-label="Hear the mission">♫ <span>Listen</span></button></div><div class="aadv-stage" data-aa-stage></div><div class="aadv-footer"><p data-aa-feedback role="status" aria-live="polite"></p><button type="button" class="aadv-next" data-aa-next hidden>Celebrate! ✦</button></div></div>`;
    const q=selector=>root.querySelector(selector),next=q('[data-aa-next]');let disposed=false,muted=false,completion=null;
    const live=()=>!disposed&&root.isConnected!==false&&!document.hidden;
    q('[data-aa-back]').onclick=()=>{if(live())onReturn(world);};q('[data-aa-restart]').onclick=()=>{if(live())onRestart();};q('[data-aa-listen]').onclick=()=>{if(live())onListen();};
    q('[data-aa-sound]').onclick=()=>{if(!live())return;muted=!muted;const control=q('[data-aa-sound]');control.textContent=muted?'♪̸':'♫';control.setAttribute('aria-label',muted?'Turn sounds on':'Mute sounds');control.setAttribute('aria-pressed',String(muted));onSoundChange(muted);};
    next.onclick=()=>{if(live()&&completion)completion();};
    const shell={root,stage:q('[data-aa-stage]'),prompt:q('[data-aa-prompt]'),instruction:q('[data-aa-instruction]'),get muted(){return muted;},
      feedback(text,kind=''){if(disposed)return;const p=q('[data-aa-feedback]');p.textContent=text;p.className=kind?'is-'+kind:'';},
      progress(text,label=text){if(disposed)return;const p=q('[data-aa-progress]');p.textContent=text;p.setAttribute('aria-label',label);},
      complete(handler){if(disposed)return;completion=typeof handler==='function'?handler:null;next.hidden=!completion;},
      resetCompletion(){this.complete(null);},
      dispose(){if(disposed)return;disposed=true;completion=null;root.querySelectorAll('button').forEach(button=>button.onclick=null);root.classList.remove('m10-a-adventure');delete root.dataset.aAdventureKind;if(!priorBodyClass)document.body.classList.remove('m10-a-adventure-route');document.body.style.overflow=priorOverflow;}
    };
    return shell;
  }
  function mount({root,kind,week,assets,base,speak=()=>{},cancelSpeech=()=>window.speechSynthesis?.cancel(),onReturn=()=>{},onComplete=()=>{},onReward}){
    if(!['picture-hunt','picture-puzzle'].includes(kind)||![1,2,3,4].includes(Number(week?.week)))throw new Error('A reviewed Hunt/Puzzle week is missing');
    const config=kind==='picture-hunt'?week.hunt:week.puzzle,assetFor=key=>typeof assets?.get==='function'?assets.get(key):(Array.isArray(assets)?assets:assets?.assets||[]).find(asset=>asset.key===key);
    const imageKey=config?.sceneImageKey||config?.imageKey,asset=assetFor(imageKey),expectedHash=config?.sceneSha256||config?.imageSha256;
    if(config?.sourceVerified!==true||!asset?.path||expectedHash&&asset.sha256!==expectedHash||!Number.isFinite(config.nativeWidth)||!Number.isFinite(config.nativeHeight)||config.nativeWidth<=0||config.nativeHeight<=0)throw new Error('A adventure scene is unreviewed, missing or changed');
    const items=kind==='picture-hunt'?config.targets:config.pieces;
    if(!Array.isArray(items)||!items.length||kind==='picture-puzzle'&&items.length!==4||new Set(items.map(item=>item.id)).size!==items.length)throw new Error('A adventure source targets are missing or duplicated');
    items.forEach(item=>{
      const rect=[item.x,item.y,item.widthPct,item.heightPct];
      if(item.sourceVerified!==true||!Array.isArray(item.componentSourceRefs)||!item.componentSourceRefs.length||!rect.every(Number.isFinite)||item.widthPct<=0||item.heightPct<=0||item.x-item.widthPct/2<0||item.y-item.heightPct/2<0||item.x+item.widthPct/2>100||item.y+item.heightPct/2>100)throw new Error('A adventure region lacks source provenance or natural-image geometry');
      if(kind==='picture-hunt'&&(!item.label||!item.speech)||kind==='picture-puzzle'&&!['circle','square','triangle','rectangle'].includes(item.shape))throw new Error('A adventure source label or native cutout is missing');
    });
    const imageUrl=new URL(asset.path.replace(/^apps\//,''),base);if(asset.sha256)imageUrl.searchParams.set('v',asset.sha256.slice(0,12));
    const nativeWidth=config.nativeWidth,nativeHeight=config.nativeHeight,ratio=nativeWidth/nativeHeight,url=imageUrl.href;
    let disposed=false,epoch=0,voiceToken=0,renderDispose=()=>{},rewardDispose=()=>{},done=false,selected=null,drag=null,suppressUntil=0;
    const timers=new Set(),ghosts=new Set(),animations=new Set(),found=new Set();
    const priorRatio=root.style.getPropertyValue?.('--aadv-native-ratio')||'';root.style.setProperty('--aadv-native-ratio',String(ratio));
    const live=()=>!disposed&&root.isConnected!==false&&!document.hidden;
    const stopVoice=()=>{voiceToken++;safe(cancelSpeech);};
    function say(text,after){if(!live()||shell.muted||!text)return;stopVoice();const token=voiceToken;safe(()=>speak(text,ok=>{if(live()&&token===voiceToken)after?.(ok!==false);}));}
    function tone(correct){if(live()&&!shell.muted)safe(()=>window.gpFeedbackSounds?.[correct?'correct':'wrong']?.());}
    function later(fn,delay){const stamp=epoch,id=setTimeout(()=>{timers.delete(id);if(live()&&stamp===epoch)fn();},delay);timers.add(id);return id;}
    function releaseDrag(){const old=drag;drag=null;if(old)safe(()=>old.button.releasePointerCapture?.(old.pointer));return old;}
    function clearTransient(){releaseDrag();timers.forEach(clearTimeout);timers.clear();animations.forEach(animation=>safe(()=>animation.cancel()));animations.clear();ghosts.forEach(ghost=>ghost.remove());ghosts.clear();}
    const shell=createShell({root,kind,title:kind==='picture-hunt'?'Picture Hunt':'Picture Puzzle',world:kind==='picture-hunt'?'wonder-world':'puzzle-park',week:week.week,onReturn,onRestart:start,onListen:()=>say(shell.prompt.textContent+'. '+shell.instruction.textContent),onSoundChange:muted=>{if(muted)stopVoice();}});
    const q=selector=>root.querySelector(selector),all=selector=>[...root.querySelectorAll(selector)];
    function crop(item,extra=''){
      const x=(item.x-item.widthPct/2)*nativeWidth/100,y=(item.y-item.heightPct/2)*nativeHeight/100,w=item.widthPct*nativeWidth/100,h=item.heightPct*nativeHeight/100;
      return `<svg viewBox="${x} ${y} ${w} ${h}" preserveAspectRatio="xMidYMid meet" aria-hidden="true" ${extra}><image href="${esc(url)}" x="0" y="0" width="${nativeWidth}" height="${nativeHeight}"/></svg>`;
    }
    function fit(scene,frame){const rect=fitRect(scene.clientWidth,scene.clientHeight,nativeWidth,nativeHeight);if(rect.width){frame.style.width=rect.width+'px';frame.style.height=rect.height+'px';}}
    function observe(scene,frame){let observer=null;const stamp=epoch,resize=()=>{if(!disposed&&stamp===epoch)fit(scene,frame);};if(typeof ResizeObserver==='function'){observer=new ResizeObserver(resize);observer.observe(scene);}window.addEventListener('resize',resize);resize();return()=>{observer?.disconnect();window.removeEventListener('resize',resize);};}
    function celebrate(){if(!live()||!done)return;stopVoice();safe(rewardDispose);rewardDispose=typeof onReward==='function'?(safe(()=>onReward({title:kind==='picture-hunt'?'You found everything!':'The picture is complete!',returnFocus:q('[data-aa-next]'),kind,week:week.week}))||(()=>{})):(()=>{});}
    function finish(message,read=true){
      if(done)return;done=true;root.dataset.complete='true';shell.feedback(message,'good');shell.progress('★',kind==='picture-hunt'?'All source targets found':'Picture completed');shell.complete(celebrate);
      if(read)say(config.completionSpeech||config.speech);
      safe(()=>onComplete({kind,week:week.week,total:items.length,sourceTargetIds:[...found]}));
    }
    function start(){
      if(!live())return;epoch++;stopVoice();clearTransient();safe(rewardDispose);rewardDispose=()=>{};renderDispose();renderDispose=()=>{};found.clear();selected=null;done=false;suppressUntil=0;delete root.dataset.complete;shell.complete(null);
      if(kind==='picture-hunt')renderHunt();else renderPuzzle();
    }
    function renderHunt(){
      const stamp=epoch;shell.prompt.textContent=`Find ${items.length} parts of the picture!`;shell.instruction.textContent=config.instruction||'Tap a little picture to hear it. Then find it in the big picture.';shell.progress(`0 / ${items.length}`,`0 of ${items.length} source targets found`);
      shell.stage.innerHTML=`<div class="aadv-hunt-layout"><div class="aadv-hunt-scene" data-ah-scene><div class="aadv-image-frame" data-ah-frame style="aspect-ratio:${ratio}"><img class="aadv-scene-image" src="${esc(url)}" alt="${esc(asset.alt||config.imageAlt||'This week’s book picture')}" draggable="false">${items.map(item=>`<button type="button" class="aadv-hotspot" data-ah-find="${esc(item.id)}" aria-label="Find ${esc(item.label)}" aria-pressed="false" style="left:${item.x}%;top:${item.y}%;width:${item.widthPct}%;height:${item.heightPct}%"></button>`).join('')}<span class="aadv-wrong-mark" data-ah-wrong aria-hidden="true">×</span></div><p class="aadv-response" data-ah-response role="status" aria-live="polite"></p></div><aside class="aadv-hunt-list" aria-label="Items to find"><h3>Find these <span data-ah-count>0 / ${items.length}</span></h3><div class="aadv-hunt-clues">${items.map(item=>`<button type="button" class="aadv-hunt-clue" data-ah-clue="${esc(item.id)}" aria-label="Hear ${esc(item.label)}"><span data-ah-check="${esc(item.id)}" aria-hidden="true">○</span><span class="aadv-hunt-thumb">${crop(item)}</span><span class="aadv-hunt-label">${esc(item.label)}</span></button>`).join('')}</div></aside></div>`;
      const frame=q('[data-ah-frame]'),scene=q('[data-ah-scene]'),response=q('[data-ah-response]'),wrong=q('[data-ah-wrong]'),disconnect=observe(scene,frame);
      let responseVersion=0;
      function feedback(text,correct){const version=++responseVersion;response.textContent=text;response.className='aadv-response is-visible '+(correct?'is-good':'is-try');later(()=>{if(version===responseVersion)response.classList.remove('is-visible');},1200);}
      function find(id,event){
        if(!live()||stamp!==epoch||done)return;const item=items.find(item=>item.id===id);
        if(!item){tone(false);shell.feedback('Match a picture on your list. Try another place.','try');feedback('× Try another place',false);if(event&&Number.isFinite(event.clientX)){const r=frame.getBoundingClientRect();wrong.style.left=(event.clientX-r.left)+'px';wrong.style.top=(event.clientY-r.top)+'px';wrong.classList.add('is-visible');later(()=>wrong.classList.remove('is-visible'),800);}return;}
        if(found.has(id)){say(item.speech);feedback('✓ Already found!',true);return;}
        found.add(id);const button=q(`[data-ah-find="${id}"]`),clue=q(`[data-ah-clue="${id}"]`);button.classList.add('is-found');button.setAttribute('aria-pressed','true');button.setAttribute('aria-label',item.label+' found');clue.classList.add('is-found');q(`[data-ah-check="${id}"]`).textContent='✓';
        const mark=document.createElement('span');mark.classList.add('aadv-found-mark');mark.setAttribute('aria-hidden','true');mark.textContent='✓';mark.style.left=item.x+'%';mark.style.top=item.y+'%';frame.append(mark);
        q('[data-ah-count]').textContent=`${found.size} / ${items.length}`;shell.progress(`${found.size} / ${items.length}`,`${found.size} of ${items.length} source targets found`);tone(true);feedback('✓ Found! '+item.label,true);shell.feedback(item.speech,'good');
        if(found.size===items.length){finish('You found everything in the picture!',false);say(item.speech,ok=>{if(ok&&done)say(config.completionSpeech);});}else say(item.speech);
      }
      function pointer(event){
        if(event.button>0||event.isPrimary===false||!live()||stamp!==epoch)return;const r=frame.getBoundingClientRect(),x=(event.clientX-r.left)/r.width*100,y=(event.clientY-r.top)/r.height*100;
        const candidates=items.filter(item=>Math.abs(x-item.x)<=item.widthPct/2&&Math.abs(y-item.y)<=item.heightPct/2).sort((a,b)=>Math.hypot(x-a.x,y-a.y)-Math.hypot(x-b.x,y-b.y));find(candidates[0]?.id,event);
      }
      frame.onpointerdown=pointer;
      all('[data-ah-find]').forEach(button=>button.onclick=event=>{if(!event.detail)find(button.dataset.ahFind,event);});
      all('[data-ah-clue]').forEach(button=>button.onclick=()=>{if(live()&&stamp===epoch)say(items.find(item=>item.id===button.dataset.ahClue).speech);});
      const image=frame.querySelector('img');image.onload=()=>fit(scene,frame);image.onerror=()=>{if(live()&&stamp===epoch)shell.feedback('The picture could not load. Tap Start again.','try');};
      shell.feedback('Search the whole picture. Tick off every item on your list!');
      renderDispose=()=>{disconnect();frame.onpointerdown=null;image.onload=image.onerror=null;all('[data-ah-find],[data-ah-clue]').forEach(button=>button.onclick=null);};
    }
    function renderPuzzle(){
      const stamp=epoch,clip=shape=>shape==='circle'?'circle(50%)':shape==='triangle'?'polygon(50% 0,100% 100%,0 100%)':'inset(0)';
      const cutout=item=>`<span class="aadv-cutout" style="--piece-ratio:${ratio*item.widthPct/item.heightPct};aspect-ratio:${ratio*item.widthPct/item.heightPct};clip-path:${clip(item.shape)}">${crop(item)}</span>`;
      shell.prompt.textContent='Put the missing pieces back!';shell.instruction.textContent='Pick up a piece and drag it into the matching space. Or tap a piece, then its space.';shell.progress('4 pieces','Place four interface pieces');
      shell.stage.innerHTML=`<div class="aadv-puzzle-game"><div class="aadv-puzzle-scene" data-ap-scene><div class="aadv-image-frame" data-ap-frame style="aspect-ratio:${ratio}"><img class="aadv-scene-image" src="${esc(url)}" alt="${esc(config.caption||'The book picture')}" draggable="false">${items.map(item=>`<button type="button" class="aadv-puzzle-hole" data-ap-hole="${esc(item.id)}" aria-label="Empty ${esc(item.shape)} space" style="left:${item.x-item.widthPct/2}%;top:${item.y-item.heightPct/2}%;width:${item.widthPct}%;height:${item.heightPct}%;clip-path:${clip(item.shape)}"></button>`).join('')}<span class="aadv-puzzle-reaction" data-ap-reaction role="status"></span></div></div><div class="aadv-puzzle-tray" role="group" aria-label="Missing picture pieces">${shuffle(items).map(item=>`<button type="button" class="aadv-puzzle-piece" data-ap-piece="${esc(item.id)}" aria-label="${esc(item.shape)} picture piece" aria-pressed="false"><span class="aadv-piece-lift">${cutout(item)}</span><span class="aadv-piece-check" data-ap-check="${esc(item.id)}" aria-hidden="true"></span></button>`).join('')}</div><p class="aadv-puzzle-count" data-ap-count aria-live="polite">0 / 4 pieces placed</p></div>`;
      const frame=q('[data-ap-frame]'),scene=q('[data-ap-scene]'),reaction=q('[data-ap-reaction]'),disconnect=observe(scene,frame);
      function choose(id){if(!live()||stamp!==epoch||done||found.has(id))return;const item=items.find(item=>item.id===id);if(!item)return;if(selected!==id)say(item.shape+' piece. Find its matching space in the picture.');selected=id;all('[data-ap-piece]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.apPiece===id)));shell.feedback('Now find the space with the same shape and picture.');}
      function place(id){
        if(!live()||stamp!==epoch||done||found.has(id))return;
        if(!selected){shell.feedback('Choose a loose piece first.');say('Choose a loose piece first.');return;}
        if(id!==selected){tone(false);reaction.textContent='× Try another space';reaction.className='aadv-puzzle-reaction is-visible is-wrong';shell.feedback('That piece fits somewhere else. Try another space!','try');say('Try another space. Match the picture and the edges.');later(()=>reaction.classList.remove('is-visible'),750);return;}
        found.add(id);const piece=q(`[data-ap-piece="${id}"]`);q(`[data-ap-hole="${id}"]`).hidden=true;piece.disabled=true;piece.classList.add('is-placed');piece.setAttribute('aria-pressed','false');q(`[data-ap-check="${id}"]`).textContent='✓';selected=null;q('[data-ap-count]').textContent=`${found.size} / 4 pieces placed`;tone(true);reaction.textContent='✓ Perfect fit!';reaction.className='aadv-puzzle-reaction is-visible';later(()=>reaction.classList.remove('is-visible'),750);
        if(found.size===items.length){q('.aadv-puzzle-game').classList.add('is-complete');finish('The picture is complete! Great puzzle solving.');}else{shell.feedback('It fits! Find another missing piece.','good');say('It fits!');}
      }
      function clearDrag(){const old=releaseDrag();if(old?.ghost){old.ghost.remove();ghosts.delete(old.ghost);}all('.is-lifting,.is-drop-hover').forEach(node=>node.classList.remove('is-lifting','is-drop-hover'));}
      function settleGhost(old,destination){
        const ghost=old.ghost;if(!ghost)return;old.ghost=null;
        const remove=()=>{ghost.remove();ghosts.delete(ghost);};
        if(typeof ghost.animate!=='function'||window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){remove();return;}
        const from=ghost.getBoundingClientRect();let animation;
        animation=ghost.animate([{left:from.left+from.width/2+'px',top:from.top+from.height/2+'px',width:from.width+'px',height:from.height+'px'},{left:destination.left+destination.width/2+'px',top:destination.top+destination.height/2+'px',width:destination.width+'px',height:destination.height+'px'}],{duration:180,easing:'ease-out',fill:'forwards'});
        animations.add(animation);animation.onfinish=animation.oncancel=()=>{animations.delete(animation);remove();};
      }
      function under(event){const hit=document.elementFromPoint?.(event.clientX,event.clientY)?.closest?.('[data-ap-hole]');if(hit&&root.contains(hit)&&!hit.hidden)return hit;return null;}
      all('[data-ap-piece]').forEach(button=>{
        button.onclick=()=>{if(performance.now()>=suppressUntil)choose(button.dataset.apPiece);};
        button.onpointerdown=event=>{if(!live()||stamp!==epoch||done||button.disabled||event.button>0||event.isPrimary===false)return;clearDrag();choose(button.dataset.apPiece);drag={id:button.dataset.apPiece,pointer:event.pointerId,x:event.clientX,y:event.clientY,button,ghost:null};safe(()=>button.setPointerCapture(event.pointerId));};
        button.onpointermove=event=>{
          if(!live()||stamp!==epoch||!drag||event.pointerId!==drag.pointer)return;
          if(!drag.ghost&&Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>5){const item=items.find(item=>item.id===drag.id),r=q(`[data-ap-hole="${drag.id}"]`).getBoundingClientRect(),ghost=document.createElement('div');ghost.classList.add('aadv-puzzle-ghost');ghost.innerHTML=cutout(item);ghost.style.width=r.width+'px';ghost.style.height=r.height+'px';document.body.append(ghost);ghosts.add(ghost);drag.ghost=ghost;button.classList.add('is-lifting');}
          if(drag.ghost){event.preventDefault?.();drag.ghost.style.left=event.clientX+'px';drag.ghost.style.top=event.clientY+'px';all('.is-drop-hover').forEach(node=>node.classList.remove('is-drop-hover'));under(event)?.classList.add('is-drop-hover');}
        };
        button.onpointerup=event=>{
          if(!live()||stamp!==epoch||!drag||event.pointerId!==drag.pointer)return;
          if(drag.ghost){suppressUntil=performance.now()+400;let hole=under(event);if(!hole){const target=q(`[data-ap-hole="${drag.id}"]`),r=target.getBoundingClientRect();if(Math.hypot(event.clientX-r.left-r.width/2,event.clientY-r.top-r.height/2)<24)hole=target;}
            const destination=hole?.dataset.apHole===drag.id?hole.getBoundingClientRect():(button.querySelector('.aadv-cutout')||button).getBoundingClientRect();settleGhost(drag,destination);
            if(hole)place(hole.dataset.apHole);else{shell.feedback('Bring the piece over a blank space and let go.');say('Move the piece over its matching space, then let go.');}
          }
          clearDrag();
        };
        button.onpointercancel=button.onlostpointercapture=event=>{if(drag?.button===button&&drag.pointer===event.pointerId)clearDrag();};
      });
      all('[data-ap-hole]').forEach(button=>button.onclick=()=>place(button.dataset.apHole));
      const image=frame.querySelector('img');image.onload=()=>fit(scene,frame);image.onerror=()=>{if(live()&&stamp===epoch)shell.feedback('The picture could not load. Tap Start again.','try');};
      shell.feedback('Four pieces are missing. Can you complete the picture?');
      renderDispose=()=>{disconnect();clearDrag();image.onload=image.onerror=null;all('[data-ap-piece]').forEach(button=>button.onclick=button.onpointerdown=button.onpointermove=button.onpointerup=button.onpointercancel=button.onlostpointercapture=null);all('[data-ap-hole]').forEach(button=>button.onclick=null);};
    }
    const visibility=()=>{if(document.hidden){stopVoice();clearTransient();safe(rewardDispose);rewardDispose=()=>{};all('.is-lifting,.is-drop-hover').forEach(node=>node.classList.remove('is-lifting','is-drop-hover'));}};
    function dispose(){if(disposed)return;disposed=true;epoch++;stopVoice();clearTransient();safe(rewardDispose);renderDispose();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',dispose);shell.dispose();delete root.dataset.complete;if(priorRatio)root.style.setProperty('--aadv-native-ratio',priorRatio);else root.style.removeProperty?.('--aadv-native-ratio');}
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',dispose);start();return dispose;
  }
  window.M10AAdventures={mount,createShell,fitRect};
})();

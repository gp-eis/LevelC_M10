/* Native Month 9 sentence tracing contract, adapted to source-backed M10 rows.
 * Guide and saved ink share immutable 1000 x traceHeight coordinates.
 */
(() => {
  'use strict';
  const pages=new Map();
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function rowsHTML(targets,img){
    return targets.map((card,index)=>`<section class="trace-row" data-trace-row="${index}" data-trace-sentence="${esc(card.sentence)}"><div class="sentence-picture">${img(card.imageKey,card.label||card.word||'', 'class="sentence-source-picture"')}</div><div class="sentence-practice-controls"><h3>${esc(card.sentence)}</h3><button class="trace-sentence-launch" type="button" aria-label="Trace ${esc(card.sentence)}"><svg class="sentence-trace-guide" viewBox="0 0 1000 240" preserveAspectRatio="xMidYMid meet" aria-hidden="true"><text x="500" y="145">${esc(card.sentence)}</text></svg><img class="sentence-trace-preview" hidden alt="Your tracing of ${esc(card.sentence)}"></button><small>Tap the sentence to trace it.</small><button class="reset-button" type="button" data-clear-trace>↻ Clear</button><div class="sentence-voice"><p class="voice-heading">🎶 Listen, then say it!</p><div class="voice-buttons"><button type="button" data-say="${esc(card.sentence)}" aria-label="Listen to ${esc(card.sentence)}"><span class="voice-icon" aria-hidden="true">🔊</span><span>Listen</span></button><button type="button" data-record data-practice="${index}" aria-label="Record ${esc(card.sentence)}"><span class="voice-icon" aria-hidden="true">🎤</span><span>My turn!</span></button></div></div></div></section>`).join('');
  }
  function mount({root,lessonId,page,mute=()=>{},onComplete=()=>{},onReward=()=>window.showActivityReward?.()}){
    if(!root)throw new Error('Tracing root is missing');
    const rows=[...root.querySelectorAll('[data-trace-sentence]')],done=root.querySelector('[data-writing-done]')||root.querySelector('#writing-done'),result=root.querySelector('.activity-result')||root.querySelector('#writing-result');
    if(!rows.length||!done||!result)throw new Error('Tracing requires sentence rows, Done and result in its root');
    const key=JSON.stringify([lessonId,page,rows.map(row=>row.dataset.traceSentence)]);
    let state=pages.get(key);if(!state){state={rows:new Map(),done:false};pages.set(key,state);}
    const phone=matchMedia('(max-width:600px)'),layouts=new Map();
    let disposed=false,activeClose=null,activeRow=null;
    function allTraced(){return rows.every(row=>row.dataset.traced==='true');}
    function updateCompletion(){onComplete(state.done&&allTraced());}
    function makeLayout(sentence){
      const phrases=[];
      if(phone.matches){sentence.split(' ').forEach(word=>{const last=phrases.length-1;if(last>=0&&phrases[last].length+word.length+1<=11)phrases[last]+=' '+word;else phrases.push(word);});}
      else phrases.push(sentence);
      const lines=phrases.length;
      return {phrases,height:lines>1?190+lines*205:240,fontSizes:phrases.map(()=>lines>1?160:74)};
    }
    function applyLayout(row,layout){
      const launch=row.querySelector('.trace-sentence-launch'),guide=launch.querySelector('svg');
      row.dataset.traceHeight=String(layout.height);launch.style.aspectRatio=`1000/${layout.height}`;guide.setAttribute('viewBox',`0 0 1000 ${layout.height}`);
      guide.replaceChildren(...layout.phrases.map((phrase,index)=>{const text=document.createElementNS('http://www.w3.org/2000/svg','text');text.setAttribute('x','500');text.setAttribute('y',layout.phrases.length>1?String(235+index*205):'145');text.style.fontSize=layout.fontSizes[index]+'px';text.textContent=phrase;return text;}));
      guide.querySelectorAll('text').forEach((text,index)=>{const width=typeof text.getComputedTextLength==='function'?text.getComputedTextLength():0;if(width>900){layout.fontSizes[index]=parseFloat(text.style.fontSize)*900/width;text.style.fontSize=layout.fontSizes[index]+'px';}});
      layouts.set(row,layout);
    }
    function setTraceLayout(row){if(row.dataset.traced==='true'||row===activeRow)return;applyLayout(row,makeLayout(row.dataset.traceSentence));}
    function clearRow(row){
      state.rows.delete(row.dataset.traceRow);state.done=false;
      const launch=row.querySelector('.trace-sentence-launch'),preview=row.querySelector('.sentence-trace-preview');preview.hidden=true;preview.removeAttribute('src');launch.classList.remove('is-traced');delete row.dataset.traced;
      result.textContent='';result.classList.remove('celebrate');delete done.dataset.rewardShown;setTraceLayout(row);updateCompletion();
    }
    function open(row){
      if(disposed)return;activeClose?.(false);mute();setTraceLayout(row);
      const launch=row.querySelector('.trace-sentence-launch'),preview=row.querySelector('.sentence-trace-preview'),layout=layouts.get(row),saved=state.rows.get(row.dataset.traceRow);
      const modal=document.createElement('div');modal.className='word-trace-modal';
      const titleId=`trace-dialog-title-${lessonId}-${page}-${row.dataset.traceRow}`;
      modal.innerHTML=`<section class="word-trace-dialog" role="dialog" aria-modal="true" aria-labelledby="${esc(titleId)}"><button class="word-trace-close" type="button" aria-label="Close tracing">×</button><h2 id="${esc(titleId)}">Trace the sentence</h2><p>Follow the pale letters with your finger or mouse.</p><div class="large-sentence-trace"><canvas width="1000" height="${layout.height}" aria-label="Sentence tracing board"></canvas></div><p class="trace-dialog-status" role="status" aria-live="polite"></p><div class="word-trace-actions"><button class="word-trace-reset" type="button">↻ Clear</button><button class="word-trace-go" type="button">Go! ✓</button></div></section>`;
      modal.querySelector('.large-sentence-trace').prepend(launch.querySelector('svg').cloneNode(true));
      const oldOverflow=document.body.style.overflow,siblings=[...document.body.children].map(element=>({element,inert:element.inert}));
      document.body.append(modal);siblings.forEach(({element})=>element.inert=true);document.body.style.overflow='hidden';
      const canvas=modal.querySelector('canvas'),ctx=canvas.getContext('2d');canvas.width=1000;canvas.height=layout.height;modal.querySelector('.large-sentence-trace').style.aspectRatio=`1000/${layout.height}`;
      let drawing=false,previous=null,distance=0,imageLoading=false,closed=false;
      if(saved){imageLoading=true;const image=new Image();image.onload=()=>{if(closed||disposed)return;ctx.drawImage(image,0,0,canvas.width,canvas.height);distance=1000;imageLoading=false;};image.onerror=()=>{if(closed||disposed)return;imageLoading=false;distance=0;state.rows.delete(row.dataset.traceRow);state.done=false;delete row.dataset.traced;preview.hidden=true;launch.classList.remove('is-traced');updateCompletion();modal.querySelector('.trace-dialog-status').textContent='Please trace the sentence again.';};image.src=saved.ink;}
      const point=event=>{const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height};};
      canvas.onpointerdown=event=>{if(imageLoading||closed||event.button>0)return;event.preventDefault();drawing=true;previous=point(event);canvas.setPointerCapture(event.pointerId);};
      canvas.onpointermove=event=>{if(!drawing||closed)return;event.preventDefault();const next=point(event);ctx.strokeStyle='#258fd8';ctx.lineWidth=canvas.height>240?10:6;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(previous.x,previous.y);ctx.lineTo(next.x,next.y);ctx.stroke();distance+=Math.hypot(next.x-previous.x,next.y-previous.y);previous=next;};
      canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=()=>{drawing=false;previous=null;};
      function close(restoreFocus=true){
        if(closed)return;closed=true;drawing=false;previous=null;canvas.onpointerdown=canvas.onpointermove=canvas.onpointerup=canvas.onpointercancel=canvas.onlostpointercapture=null;
        modal.remove();document.body.style.overflow=oldOverflow;siblings.forEach(({element,inert})=>element.inert=inert);if(activeClose===close){activeClose=null;activeRow=null;}
        if(!disposed&&row.dataset.traced!=='true')setTraceLayout(row);
        if(restoreFocus&&launch.isConnected)launch.focus({preventScroll:true});
      }
      activeClose=close;activeRow=row;
      modal.querySelector('.word-trace-close').onclick=()=>close();
      modal.onclick=event=>{if(event.target===modal)close();};
      modal.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();close();return;}if(event.key!=='Tab')return;const buttons=[...modal.querySelectorAll('button')];if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}};
      modal.querySelector('.word-trace-reset').onclick=()=>{if(imageLoading)return;ctx.clearRect(0,0,canvas.width,canvas.height);distance=0;modal.querySelector('.trace-dialog-status').textContent='';};
      modal.querySelector('.word-trace-go').onclick=()=>{
        if(imageLoading||closed)return;
        if(distance<60){modal.querySelector('.trace-dialog-status').textContent='Trace the sentence before choosing Go!';return;}
        const ink=canvas.toDataURL('image/png');state.rows.set(row.dataset.traceRow,{ink,layout:structuredClone(layout)});state.done=false;preview.src=ink;preview.hidden=false;row.dataset.traced='true';launch.classList.add('is-traced');result.textContent='';result.classList.remove('celebrate');updateCompletion();close();
      };
      modal.querySelector('.word-trace-close').focus();
    }
    rows.forEach(row=>{
      const saved=state.rows.get(row.dataset.traceRow),launch=row.querySelector('.trace-sentence-launch');
      if(saved){row.dataset.traced='true';const preview=row.querySelector('.sentence-trace-preview');preview.src=saved.ink;preview.hidden=false;launch.classList.add('is-traced');applyLayout(row,structuredClone(saved.layout));}else setTraceLayout(row);
      launch.onclick=()=>open(row);row.querySelector('[data-clear-trace]').onclick=()=>clearRow(row);
    });
    done.onclick=()=>{
      const practiced=allTraced();state.done=practiced;result.textContent=practiced?'⭐ Nice practice! Show your writing to your teacher.':`Try tracing ${rows.length===1?'the sentence':rows.length===2?'both sentences':'all the sentences'} first.`;result.classList.toggle('celebrate',practiced);updateCompletion();
      if(practiced){window.gpFeedbackSounds?.correct?.();if(!done.dataset.rewardShown){done.dataset.rewardShown='true';onReward();}}
      else window.gpFeedbackSounds?.wrong?.();
    };
    const resize=()=>rows.forEach(setTraceLayout);phone.addEventListener('change',resize);
    const visibility=()=>{if(document.hidden){mute();activeClose?.(false);}};document.addEventListener('visibilitychange',visibility);
    document.fonts?.ready.then(()=>{if(!disposed&&!activeClose)resize();});
    if(state.done&&allTraced()){result.textContent='⭐ Nice practice! Show your writing to your teacher.';result.classList.add('celebrate');done.dataset.rewardShown='true';}
    updateCompletion();
    return()=>{if(disposed)return;disposed=true;mute();activeClose?.(false);phone.removeEventListener('change',resize);document.removeEventListener('visibilitychange',visibility);rows.forEach(row=>{row.querySelector('.trace-sentence-launch').onclick=null;row.querySelector('[data-clear-trace]').onclick=null;});done.onclick=null;};
  }
  window.M10LiteracyTracing={rowsHTML,mount};
})();

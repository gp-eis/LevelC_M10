/* Month 9 Page 2 player/keyword selector contract with Month 10 media only. */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount({root,items,base,assets,showReviewState=true}){
    if(!root||!Array.isArray(items)||!items.length)throw new Error('Sentence video items are missing');
    const resolve=value=>{
      if(!value)return '';
      const asset=assets?.get(value);
      const path=asset?.path||value;
      return new URL(String(path).replace(/^apps\//,''),base).href;
    };
    const initial=items.find(item=>item.src)||items.find(item=>item.poster)||items[0];
    const hasVideo=!!initial.src;
    let disposed=false,attempt=0,current=initial;
    root.classList.add('m10-literacy-videos');
    root.innerHTML=`<section class="card ees-player-card" id="lesson-focus" aria-label="Month 10 sentence videos"><div class="ees-video-shell">${hasVideo?`<video id="ees-video" class="ees-video" controls playsinline preload="none" aria-label="${esc(initial.caption||initial.label)} video"></video><button id="ees-play" class="ees-center-play" type="button" aria-label="Play ${esc(initial.caption||initial.label)} video">▶</button>`:initial.poster?`<img id="ees-video-poster" class="ees-video m10-video-poster" src="${esc(resolve(initial.poster))}" alt="Prepared picture for ${esc(initial.caption||initial.label)}"><span class="m10-video-pending-badge">Video pending</span>`:'<div class="m10-video-empty"><span aria-hidden="true">🎬</span><p>The Month 10 sentence videos are being prepared.</p></div>'}</div><p id="ees-now-playing" class="ees-now-playing" aria-live="polite">${esc(initial.caption||initial.label)}</p><p class="m10-video-review-state" data-video-review role="status">${hasVideo?'Local video candidate · owner review pending':'Picture prepared · video pending'}</p><p class="m10-video-playback-status" data-video-status role="status" aria-live="polite"></p></section><section class="card ees-choice-card" aria-label="Choose a sentence"><div class="ees-sentence-grid month10-sentences">${items.map((item,index)=>`<button class="ees-sentence ${['','orange','blue','green','purple'][index%5]} ${item===initial?'is-active':''}" type="button" data-word="${esc(item.key)}" aria-pressed="${item===initial}" ${item.src?'':'disabled aria-disabled="true"'}>${esc(item.caption||item.label)}${item.src?'':'<small>Video pending</small>'}</button>`).join('')}</div></section>`;
    const video=root.querySelector('#ees-video'),play=root.querySelector('#ees-play'),caption=root.querySelector('#ees-now-playing'),review=root.querySelector('[data-video-review]'),status=root.querySelector('[data-video-status]'),buttons=[...root.querySelectorAll('[data-word]')];
    if(review)review.hidden=!showReviewState;
    const stateLabel=item=>item.humanApproved===true?'Approved video':'Local video candidate · owner review pending';
    const invalidate=()=>{attempt++;};
    function start(){
      if(disposed||!video||!current.src||document.hidden)return;
      const request=++attempt;play.hidden=true;status.textContent='';
      try{
        Promise.resolve(video.play()).catch(()=>{if(!disposed&&request===attempt){play.hidden=false;status.textContent='Tap Play to watch the video.';}});
      }catch{if(!disposed&&request===attempt){play.hidden=false;status.textContent='Tap Play to watch the video.';}}
    }
    function select(item,autoplay=false){
      if(disposed||!video||!item.src)return;
      invalidate();video.pause();current=item;status.textContent='';
      video.src=resolve(item.src);video.poster=resolve(item.poster);video.setAttribute('aria-label',`${item.caption||item.label} video`);
      play.setAttribute('aria-label',`Play ${item.caption||item.label} video`);play.hidden=false;
      caption.textContent=item.caption||item.label;review.textContent=stateLabel(item);
      buttons.forEach(button=>{const active=button.dataset.word===item.key;button.classList.toggle('is-active',active);button.setAttribute('aria-pressed',String(active));});
      video.load();try{video.currentTime=0;}catch{}
      if(autoplay)start();
    }
    const onPlay=()=>{if(disposed||document.hidden){video?.pause();return;}play.hidden=true;};
    const onPause=()=>{if(!disposed)play.hidden=false;};
    const onEnded=()=>{if(!disposed)play.hidden=false;};
    const onError=()=>{if(!disposed){play.hidden=false;status.textContent='This clip could not be loaded. Please try Play again.';}};
    const onVisibility=()=>{if(document.hidden){invalidate();video?.pause();if(play)play.hidden=false;}};
    buttons.forEach(button=>button.onclick=()=>{const item=items.find(option=>option.key===button.dataset.word);if(item?.src)select(item,true);});
    if(video){video.addEventListener('play',onPlay);video.addEventListener('pause',onPause);video.addEventListener('ended',onEnded);video.addEventListener('error',onError);play.onclick=start;select(initial);}
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{if(disposed)return;disposed=true;invalidate();document.removeEventListener('visibilitychange',onVisibility);buttons.forEach(button=>button.onclick=null);if(video){video.removeEventListener('play',onPlay);video.removeEventListener('pause',onPause);video.removeEventListener('ended',onEnded);video.removeEventListener('error',onError);play.onclick=null;video.pause();video.removeAttribute('src');video.load();}};
  }
  window.M10LiteracyVideos={mount};
})();

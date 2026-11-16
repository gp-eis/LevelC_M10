/* Native Month9 A reward shell. Missing Month10 reward media uses its native
 * static fallback; no old film or synthetic replacement is loaded. */
(() => {
  'use strict';
  let active=null;
  const safe=fn=>{try{return fn?.();}catch{}};
  function show({cancelSpeech=()=>window.speechSynthesis?.cancel(),returnFocus}={}){
    active?.();safe(cancelSpeech);
    const focusBefore=returnFocus||document.activeElement,modal=document.createElement('div');
    modal.className='reward-modal m10-a-reward';
    modal.innerHTML='<section class="reward-dialog" role="dialog" aria-modal="true" aria-label="Great job celebration"><button type="button" class="reward-close" aria-label="Close celebration">×</button><h2>🌟 Great job!</h2><p class="reward-fallback" role="status">⭐ You did it! ⭐</p><button type="button" class="reward-replay">▶ Play again</button><button type="button" class="reward-done">Keep going! ➜</button></section>';
    const siblings=[...document.body.children].map(element=>({element,inert:element.inert})),oldOverflow=document.body.style.overflow;
    let disposed=false;document.body.append(modal);siblings.forEach(({element})=>element.inert=true);document.body.style.overflow='hidden';
    function close(restore=true){if(disposed)return;disposed=true;safe(cancelSpeech);document.removeEventListener('visibilitychange',hidden);window.removeEventListener('pagehide',leave);modal.onclick=modal.onkeydown=null;modal.querySelectorAll('button').forEach(b=>b.onclick=null);modal.remove();siblings.forEach(({element,inert})=>element.inert=inert);document.body.style.overflow=oldOverflow;if(active===dispose)active=null;if(restore&&focusBefore?.isConnected!==false)safe(()=>focusBefore?.focus({preventScroll:true}));}
    const dispose=()=>close(false),hidden=()=>{if(document.hidden)close(false);},leave=()=>close(false);
    modal.querySelector('.reward-close').onclick=()=>close();modal.querySelector('.reward-done').onclick=()=>close();
    modal.querySelector('.reward-replay').onclick=()=>{if(disposed)return;safe(cancelSpeech);modal.querySelector('.reward-fallback').textContent='⭐ You did it! ⭐';};
    modal.onclick=event=>{if(event.target===modal)close();};
    modal.onkeydown=event=>{if(event.key==='Escape'){event.preventDefault();close();return;}if(event.key!=='Tab')return;const buttons=[...modal.querySelectorAll('button')];if(event.shiftKey&&document.activeElement===buttons[0]){event.preventDefault();buttons.at(-1).focus();}else if(!event.shiftKey&&document.activeElement===buttons.at(-1)){event.preventDefault();buttons[0].focus();}};
    document.addEventListener('visibilitychange',hidden);window.addEventListener('pagehide',leave);active=dispose;modal.querySelector('.reward-close').focus();return dispose;
  }
  function coordinator({root,cancelSpeech,isSpeaking=()=>false,isRecording=()=>false,delay=850}){
    let disposed=false,complete=false,shown=false,timer=null,reward=()=>{};
    const cancel=()=>{clearTimeout(timer);timer=null;};
    const valid=()=>!disposed&&root?.isConnected!==false&&!document.hidden&&complete;
    function wait(){cancel();if(!valid())return;if(isSpeaking()||isRecording()){timer=setTimeout(wait,80);return;}timer=setTimeout(()=>{timer=null;if(!valid())return;if(isSpeaking()||isRecording()){wait();return;}shown=true;reward();reward=show({cancelSpeech});},delay);}
    const visibility=()=>{if(document.hidden)cancel();else if(complete&&!shown&&!disposed)wait();};document.addEventListener('visibilitychange',visibility);
    return{complete(done){complete=!!done;if(!complete){shown=false;cancel();reward();reward=()=>{};}else if(!shown&&timer===null)wait();},dispose(){if(disposed)return;disposed=true;cancel();reward();reward=()=>{};document.removeEventListener('visibilitychange',visibility);}};
  }
  window.M10ARewards={show,coordinator};
})();

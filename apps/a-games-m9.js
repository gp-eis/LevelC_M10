/* Native Month9 A/B four-core controls, driven only by reviewed Month10 A data.
 * The shared engines retain their existing C defaults. Adapted A models stay
 * explicitly labelled as adaptations; no source status is rewritten here. */
(() => {
  'use strict';
  const safe=callback=>{try{return callback?.();}catch{return undefined;}};
  const nonempty=value=>typeof value==='string'&&value.trim().length>0;
  const referenced=item=>item?.sourceVerified===true&&Array.isArray(item.componentSourceRefs)&&item.componentSourceRefs.length>0;
  function mount({root,kind,week,assets,base,headingIconKey,bonuses=[],speak=()=>{},cancelSpeech=()=>window.speechSynthesis?.cancel(),onComplete=()=>{},onRoundComplete=()=>{},onReward,onReturn}){
    if(!root||!['memory','wheel','picture-match','pick-right'].includes(kind)||![1,2,3,4].includes(Number(week?.week)))throw new Error('Level A native game root, kind or reviewed week is missing');
    const assetFor=key=>typeof assets?.get==='function'?assets.get(key):(Array.isArray(assets)?assets:assets?.assets||[]).find(asset=>asset.key===key);
    if(!headingIconKey||!assetFor(headingIconKey)?.path)throw new Error('Level A game requires its native evergreen heading icon');
    const validateCards=(cards,label)=>{
      if(!Array.isArray(cards)||cards.length!==4||new Set(cards.map(card=>card.id)).size!==4)throw new Error('Level A '+label+' requires four distinct reviewed targets');
      cards.forEach(card=>{
        const status=['source-exact','source-word-with-adapted-sentence'].includes(card.textStatus);
        if(!referenced(card)||card.practiceEligible!==true||!status||![card.id,card.label,card.sentence,card.imageKey].every(nonempty))throw new Error('Level A game target is not a reviewed source model');
        const asset=assetFor(card.imageKey);
        if(!asset?.path||card.imageSha256&&asset.sha256!==card.imageSha256)throw new Error('Level A reviewed game picture is missing or has changed: '+card.imageKey);
      });
    };
    validateCards(week.memoryCards,'Memory');validateCards(week.wheelCards,'Wheel');
    const models=new Map(week.memoryCards.map(card=>[card.id,card]));
    week.wheelCards.forEach(card=>{const original=models.get(card.id);if(!original||original.sentence!==card.sentence||original.imageKey!==card.imageKey)throw new Error('Level A Wheel and Memory source models disagree');});
    if(kind==='picture-match'||kind==='pick-right'){
      const rounds=kind==='picture-match'?week.pictureRounds:week.pickRounds,count=kind==='picture-match'?3:2;
      if(!Array.isArray(rounds)||rounds.length!==4||new Set(rounds.map(round=>round.correctChoiceId)).size!==4)throw new Error('Level A choice game requires all four reviewed targets');
      rounds.forEach(round=>{
        if(!referenced(round)||!nonempty(round.id)||!nonempty(round.feedbackText)||!Array.isArray(round.choices)||round.choices.length!==count||new Set(round.choices.map(choice=>choice.id)).size!==count||new Set(round.choices.map(choice=>choice.imageKey)).size!==count)throw new Error('Level A native choice mapping is incomplete');
        const target=models.get(round.correctChoiceId),chosen=round.choices.find(choice=>choice.id===round.correctChoiceId);
        if(!target||!chosen||round.feedbackText!==target.sentence||round.answerId&&round.answerId!==round.correctChoiceId)throw new Error('Level A answer feedback does not match its source target');
        if(kind==='picture-match'&&round.sentence!==target.sentence||kind==='pick-right'&&(!nonempty(round.question)||round.contextImageKey!==target.imageKey))throw new Error('Level A game prompt does not identify the source picture');
        round.choices.forEach(choice=>{const model=models.get(choice.id);if(!referenced(choice)||!model||choice.imageKey!==model.imageKey||(choice.text||choice.sentence)!==model.sentence)throw new Error('Level A distractor is not a distinct reviewed source model');});
      });
    }
    if(kind==='wheel'&&(bonuses.length!==3||new Set(bonuses.map(bonus=>bonus.bonus)).size!==3||bonuses.some(bonus=>!['spin-again','super-star','boom'].includes(bonus.bonus)||!bonus.imageKey||!assetFor(bonus.imageKey)?.path)))throw new Error('Level A Wheel requires the three native evergreen bonus pictures');
    if(kind==='memory'&&!window.M10CMemory||kind!=='memory'&&!window.M10CGames)throw new Error('Level A native game engine is not loaded');
    const priorBodyClass=document.body.classList.contains('m10-a-core-route');
    document.body.classList.add('m10-a-core-route');root.classList.add('m10-a-games');root.dataset.aGameKind=kind;root.dataset.aGameWeek=String(week.week);
    let disposed=false,rewardDispose=()=>{},disposeEngine=()=>{};
    const reward=options=>{
      if(disposed||root.isConnected===false||document.hidden||typeof onReward!=='function')return()=>{};
      safe(rewardDispose);rewardDispose=safe(()=>onReward(options))||(()=>{});return()=>{safe(rewardDispose);rewardDispose=()=>{};};
    };
    try{
      if(kind==='memory'){
        disposeEngine=window.M10CMemory.mount({root,cards:week.memoryCards,assets,base,headingIconKey,allowSourceWordAdaptations:true,overlayClass:'m10-a-memory-overlay',speak,cancelSpeech,onComplete:result=>{
          safe(()=>onComplete({kind,...result}));
          // Native Memory first shows its final match/Play Again frame. Opening
          // the optional reward afterwards preserves the original dialog stack.
          Promise.resolve().then(()=>{if(!disposed&&root.dataset.complete==='true')reward({title:'You found every pair!',returnFocus:document.activeElement,kind,...result});});
        }});
      }else{
        disposeEngine=window.M10CGames.mount({root,kind,items:week.wheelCards,rounds:kind==='picture-match'?week.pictureRounds:kind==='pick-right'?week.pickRounds:[],bonuses,assets,base,headingIconKey,continuous:kind!=='wheel',nativeAB:true,overlayClass:'m10-a-game-overlay m10-a-game-'+kind,speak,mute:cancelSpeech,onComplete,onRoundComplete,onReward:typeof onReward==='function'?reward:undefined,onReturn});
      }
      const description=root.querySelector(kind==='memory'?'.m10-c-memory-header p':'.m10-c-game-heading p');
      if(description){const weekLabel=document.createElement('span');weekLabel.textContent=`Week ${week.week} · `;description.prepend(weekLabel);}
    }catch(error){
      root.classList.remove('m10-a-games');if(!priorBodyClass)document.body.classList.remove('m10-a-core-route');delete root.dataset.aGameKind;delete root.dataset.aGameWeek;throw error;
    }
    return()=>{
      if(disposed)return;disposed=true;
      // Unwind the reward before the underlying Memory/review dialog so that
      // each layer restores its own saved inert/background/focus state.
      safe(rewardDispose);rewardDispose=()=>{};safe(disposeEngine);safe(cancelSpeech);
      root.classList.remove('m10-a-games','m10-c-memory','m10-c-games');delete root.dataset.aGameKind;delete root.dataset.aGameWeek;
      if(!priorBodyClass)document.body.classList.remove('m10-a-core-route');
    };
  }
  window.M10AGames={mount};
})();

/* Actual Month9 C Memory controls adapted to supplied Month10 source cards.
 * No prior-month lesson data, media, voice or reward videos are imported. */
(() => {
  'use strict';
  let serial = 0;
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = callback => { try { return callback?.(); } catch (_) { return undefined; } };
  function mount({root, cards, assets, base, headingIconKey, allowSourceWordAdaptations = false, overlayClass = '', speak = () => {}, cancelSpeech = () => window.speechSynthesis?.cancel(), onComplete = () => {}}) {
    if (!root || !Array.isArray(cards)) throw new Error('C Memory requires its root and supplied source cards');
    const ids = new Set();
    const supplied = cards.filter(card => {
      const reviewedAdaptation = allowSourceWordAdaptations && card?.textStatus === 'source-word-with-adapted-sentence' && card.sourceVerified === true && card.practiceEligible === true && Array.isArray(card.componentSourceRefs) && card.componentSourceRefs.length > 0;
      if (!card || card.practiceEligible === false || (card.textStatus && card.textStatus !== 'source-exact' && !reviewedAdaptation) || ids.has(card.id)) return false;
      if (![card.id,card.label,card.sentence,card.imageKey].every(value => typeof value === 'string' && value.trim())) return false;
      ids.add(card.id); return true;
    });
    if (!supplied.length) throw new Error('C Memory has no eligible exact source cards');
    const assetFor = key => typeof assets?.get === 'function' ? assets.get(key) : (Array.isArray(assets) ? assets : assets?.assets || []).find(asset => asset.key === key);
    const image = card => {
      const asset = assetFor(card.imageKey);
      if (!asset?.path) throw new Error('C Memory source picture is missing: ' + card.imageKey);
      const url = new URL(asset.path.replace(/^apps\//,''),base);
      if (asset.sha256) url.searchParams.set('v',asset.sha256.slice(0,12));
      return url.href;
    };
    supplied.forEach(image);
    let disposed = false, epoch = 0, first = null, locked = false, moves = 0, pairs = 0, pictures = [], lastSignature = '', previewing = false, pendingMatch = null, completed = false, dialog = null;
    const timers = new Set();
    const find = selector => root.querySelector(selector);
    const all = selector => [...root.querySelectorAll(selector)];
    const shuffle = list => { const out = [...list]; for (let i=out.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [out[i],out[j]]=[out[j],out[i]]; } return out; };
    const live = () => !disposed && root.isConnected !== false;
    const usable = () => live() && !document.hidden;
    const stopTimers = () => { timers.forEach(clearTimeout); timers.clear(); };
    const stopSpeech = () => safe(cancelSpeech);
    const say = text => { if (usable()) { stopSpeech(); safe(() => speak(text)); } };
    function later(callback, delay) {
      const stamp = epoch;
      const timer = setTimeout(() => { timers.delete(timer); if (usable() && stamp === epoch) callback(); },delay);
      timers.add(timer); return timer;
    }
    root.classList.add('m10-c-memory');
    const headingIcon = headingIconKey ? `<img src="${escape(image({imageKey:headingIconKey}))}" alt="" draggable="false">` : '🃏';
    root.innerHTML = `<section class="m10-c-memory-page"><header class="m10-c-memory-header"><h1>${headingIcon} Memory Game</h1><p>Look carefully, then find the <span data-c-memory-total></span> matching pairs!</p></header><div class="m10-c-memory-actions"><button type="button" class="m10-c-memory-button is-blue" data-c-memory-preview>👀 Look for 3 Seconds</button><button type="button" class="m10-c-memory-button is-orange" data-c-memory-restart>🔄 New Arrangement</button></div><div class="m10-c-memory-board" data-c-memory-board aria-label="Memory card board"></div><div class="m10-c-memory-status" role="status" aria-live="polite"><span>Moves: <span data-c-memory-moves>0</span></span><span>Pairs: <span data-c-memory-pairs>0</span> / <span data-c-memory-pair-total></span></span></div></section>`;
    function closeDialog(restore = false) {
      if (!dialog) return;
      const old = dialog; dialog = null;
      old.overlay.onclick = old.overlay.onkeydown = null;
      old.overlay.querySelectorAll('button').forEach(button => { button.onclick = null; });
      old.overlay.remove();
      old.siblings.forEach(({element,inert}) => { element.inert = inert; });
      document.body.style.overflow = old.oldOverflow;
      if (restore) {
        const target = old.focusBefore?.isConnected !== false && !old.focusBefore?.disabled ? old.focusBefore : find('[data-c-memory-restart]');
        safe(() => target?.focus({preventScroll:true}));
      }
    }
    function openDialog(kind, item, read = true) {
      if (!usable()) return;
      closeDialog(); stopSpeech();
      const overlay = document.createElement('div'), titleId = 'm10-c-memory-dialog-' + (++serial);
      overlay.classList.add('m10-c-memory-overlay');
      if (overlayClass) overlay.classList.add(...String(overlayClass).split(/\s+/).filter(Boolean));
      overlay.innerHTML = kind === 'match'
        ? `<section class="m10-c-memory-match" role="dialog" aria-modal="true" aria-labelledby="${titleId}"><h2 id="${titleId}">Great match!</h2><img src="${escape(image(item))}" alt="${escape(item.label)}"><p data-c-memory-match-sentence>${escape(item.sentence)}</p><button type="button" class="m10-c-memory-button is-green" data-c-memory-continue>✓ Continue</button></section>`
        : `<section class="m10-c-memory-celebration" role="dialog" aria-modal="true" aria-labelledby="${titleId}"><div class="m10-c-memory-celebration-emoji" aria-hidden="true">🎉🏆🎉</div><h2 id="${titleId}">Yay! You found all the pairs!</h2><button type="button" class="m10-c-memory-button is-green" data-c-memory-play-again>🔄 Play Again</button></section>`;
      const siblings = [...document.body.children].map(element => ({element,inert:element.inert}));
      const oldOverflow = document.body.style.overflow, focusBefore = document.activeElement;
      document.body.append(overlay); siblings.forEach(({element}) => { element.inert = true; }); document.body.style.overflow = 'hidden';
      dialog = {overlay,siblings,oldOverflow,focusBefore,kind};
      const action = overlay.querySelector('button');
      const act = () => {
        if (!usable() || dialog?.overlay !== overlay) return;
        closeDialog(true); stopSpeech();
        if (kind === 'complete') { start(); return; }
        pendingMatch = null;
        if (pairs === pictures.length) {
          if (!completed) { completed = true; root.dataset.complete = 'true'; safe(() => onComplete({pairs,moves,pairCount:pictures.length})); }
          if (usable()) openDialog('complete');
        } else { locked = false; find('[data-c-memory-preview]').disabled = false; }
      };
      action.onclick = act;
      overlay.onkeydown = event => {
        if (!usable() || dialog?.overlay !== overlay) return;
        if (event.key === 'Escape') { event.preventDefault(); if (kind === 'match') act(); else closeDialog(true); return; }
        if (event.key === 'Tab') { event.preventDefault(); action.focus(); }
      };
      action.focus();
      if (kind === 'match' && read) say(item.sentence);
    }
    function hideUnmatched() {
      all('[data-c-memory-card]').forEach(button => {
        if (!button.classList.contains('is-matched')) { button.classList.remove('is-flipped','is-previewing'); button.setAttribute('aria-label','Hidden picture card'); }
      });
      first = null;
    }
    function start() {
      if (!usable()) return;
      epoch++; stopTimers(); stopSpeech(); closeDialog();
      pictures = shuffle(supplied).slice(0,4); first = null; locked = false; moves = pairs = 0; previewing = false; pendingMatch = null; completed = false;
      const entries = pictures.flatMap(item => [{item,copy:'a'},{item,copy:'b'}]);
      let deck, signature;
      for (let attempt=0;attempt<8;attempt++) { deck=shuffle(entries); signature=deck.map(entry=>entry.item.id+':'+entry.copy).join(','); if (signature !== lastSignature) break; }
      if (signature === lastSignature && deck.length>1) { deck.push(deck.shift()); signature=deck.map(entry=>entry.item.id+':'+entry.copy).join(','); }
      lastSignature = signature;
      find('[data-c-memory-board]').innerHTML = deck.map(({item,copy}) => `<button type="button" class="m10-c-memory-card" data-c-memory-card="${escape(item.id)}" data-copy="${copy}" aria-label="Hidden picture card"><span class="m10-c-memory-card-picture"><img src="${escape(image(item))}" alt="${escape(item.label)} picture" draggable="false"></span></button>`).join('');
      all('[data-c-memory-card]').forEach(button => { button.onclick = () => flip(button); });
      find('[data-c-memory-total]').textContent = find('[data-c-memory-pair-total]').textContent = String(pictures.length);
      find('[data-c-memory-moves]').textContent = find('[data-c-memory-pairs]').textContent = '0';
      find('[data-c-memory-preview]').disabled = false; find('[data-c-memory-preview]').textContent = '👀 Look for 3 Seconds';
      delete root.dataset.complete;
    }
    function flip(button) {
      if (!usable() || !root.contains(button) || locked || button.disabled || button.classList.contains('is-flipped') || button.classList.contains('is-matched')) return;
      const item = pictures.find(card => card.id === button.dataset.cMemoryCard);
      button.classList.add('is-flipped'); button.setAttribute('aria-label','Revealed ' + item.label); say(item.label);
      if (!first) { first = button; return; }
      moves++; find('[data-c-memory-moves]').textContent = String(moves); locked = true; find('[data-c-memory-preview]').disabled = true;
      const previous = first; first = null;
      if (previous.dataset.cMemoryCard === button.dataset.cMemoryCard) {
        previous.classList.add('is-matched'); button.classList.add('is-matched'); previous.disabled = button.disabled = true;
        pairs++; find('[data-c-memory-pairs]').textContent = String(pairs); pendingMatch = item;
        later(() => { safe(() => window.gpFeedbackSounds?.correct?.()); openDialog('match',item); },450);
      } else {
        later(() => { [previous,button].forEach(card => { card.classList.remove('is-flipped'); card.setAttribute('aria-label','Hidden picture card'); }); locked = false; find('[data-c-memory-preview]').disabled = false; },900);
      }
    }
    find('[data-c-memory-restart]').onclick = () => start();
    find('[data-c-memory-preview]').onclick = () => {
      if (!usable() || locked || find('[data-c-memory-preview]').disabled) return;
      stopSpeech(); hideUnmatched(); locked = previewing = true;
      const control = find('[data-c-memory-preview]'); control.disabled = true; control.textContent = '👀 Look: 3';
      all('[data-c-memory-card]').forEach(button => { if (!button.classList.contains('is-matched')) button.classList.add('is-previewing'); });
      later(() => { control.textContent = '👀 Look: 2'; },1000); later(() => { control.textContent = '👀 Look: 1'; },2000);
      later(() => { hideUnmatched(); previewing = locked = false; control.disabled = false; control.textContent = '👀 Look for 3 Seconds'; },3000);
    };
    function visibility() {
      if (!live()) return;
      if (document.hidden) {
        epoch++; stopTimers(); stopSpeech(); hideUnmatched(); previewing = false;
        locked = !!pendingMatch || completed;
        find('[data-c-memory-preview]').disabled = locked; find('[data-c-memory-preview]').textContent = '👀 Look for 3 Seconds';
      } else if (pendingMatch && !dialog) openDialog('match',pendingMatch,false);
    }
    const pagehide = () => dispose();
    document.addEventListener('visibilitychange',visibility); window.addEventListener('pagehide',pagehide);
    function dispose() {
      if (disposed) return;
      disposed = true; epoch++; stopTimers(); stopSpeech(); closeDialog();
      document.removeEventListener('visibilitychange',visibility); window.removeEventListener('pagehide',pagehide);
      all('button').forEach(button => { button.onclick = null; button.disabled = true; });
    }
    start();
    return dispose;
  }
  window.M10CMemory = {mount};
})();

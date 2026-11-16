/* Month10 C Writing, printed21/PDF24: the three supplied unscrambles.
 * Framing follows Month9 C phonics-game.js; tile ordering is an adapted game.
 * Listening plays whole supplied words/sentences, never isolated phonemes. */
(() => {
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const safe = fn => { try { return fn?.(); } catch (_) { return undefined; } };
  function mount({root, rounds, assets, base, speak = () => {}, cancelSpeech = () => window.speechSynthesis?.cancel(), onComplete = () => {}}) {
    if (!root || !Array.isArray(rounds) || !rounds.length) throw new Error('C Word Builder requires supplied source rounds');
    const ids = new Set();
    const deck = rounds.map(item => {
      if (!item || typeof item.id !== 'string' || ids.has(item.id) || !/^[a-z]+$/.test(item.answer || '') || !Array.isArray(item.letters) || item.letters.some(letter => !/^[a-z]$/.test(letter)) || [...item.answer].sort().join('') !== [...item.letters].sort().join('')) throw new Error('C Word Builder requires unique IDs and the exact answer letter multiset');
      ids.add(item.id);
      const asset = typeof assets?.get === 'function' ? assets.get(item.imageKey) : (Array.isArray(assets) ? assets : assets?.assets || []).find(entry => entry.key === item.imageKey);
      if (!asset?.path) throw new Error('Missing C Word Builder source picture: ' + item.imageKey);
      const url = new URL(asset.path.replace(/^apps\//,''), base);
      if (asset.sha256) url.searchParams.set('v', asset.sha256.slice(0,12));
      return {...item, letters:[...item.letters], imageURL:url.href};
    });
    let disposed = false, epoch = 0, round = 0, score = 0, selected = [], solved = false, completed = false;
    const find = selector => root.querySelector(selector);
    const all = selector => [...root.querySelectorAll(selector)];
    const live = () => !disposed && root.isConnected !== false;
    const usable = stamp => live() && !document.hidden && (stamp === undefined || stamp === epoch);
    const stop = () => safe(cancelSpeech);
    const say = text => { if (usable()) { stop(); safe(() => speak(text)); } };
    const bind = (selector, handler) => { const stamp = epoch; find(selector).onclick = () => { if (usable(stamp)) handler(); }; };
    root.classList.add('m10-c-word-builder');
    function feedback(text, kind = '') { const node = find('[data-cwb-feedback]'); node.textContent = text; node.className = 'cwb-feedback' + (kind ? ' is-' + kind : ''); }
    function update() {
      const item = deck[round], used = new Set(selected);
      all('[data-cwb-slot]').forEach((slot, index) => {
        const letter = selected[index] === undefined ? '' : item.letters[selected[index]];
        slot.textContent = letter || '–';
        slot.setAttribute('aria-label', `Letter ${index + 1}: ${letter || 'empty'}`);
      });
      all('[data-cwb-letter]').forEach(button => { button.disabled = solved || used.has(Number(button.dataset.cwbLetter)); });
      find('[data-cwb-undo]').disabled = solved || !selected.length;
      find('[data-cwb-reset]').disabled = solved || !selected.length;
      find('[data-cwb-check]').disabled = solved;
      find('[data-cwb-next]').hidden = !solved;
      find('[data-cwb-score]').textContent = String(score);
    }
    function render() {
      stop(); epoch++; selected = []; solved = false;
      const item = deck[round];
      root.dataset.sourceMapping = JSON.stringify({activity:'source-unscramble-adapted-letter-tile-game',roundId:item.id,bookId:item.bookId,sourceHash:item.sourceHash,printedPage:item.printedPage,pdfPage:item.pdfPage,originalLetters:item.letters.join(''),answer:item.answer});
      root.innerHTML = `<section class="cwb-page"><header class="cwb-header"><h1>Build the Word</h1><p>Unscramble and write.</p></header><div class="cwb-toolbar"><span class="cwb-score-chip">Word: <b>${round + 1}</b> / ${deck.length}</span><span class="cwb-score-chip">Score: <b data-cwb-score>${score}</b></span><button type="button" class="cwb-button is-orange" data-cwb-new>🔄 New Game</button></div><section class="cwb-board"><div class="cwb-instruction"><h2>Tap the letters to build the word.</h2><button type="button" class="cwb-button is-blue" data-cwb-instruction aria-label="Listen to the instruction">🔊</button></div><button type="button" class="cwb-picture" data-cwb-picture aria-label="Listen to the whole word"><img src="${esc(item.imageURL)}" alt="${esc(item.answer)}" draggable="false"><span aria-hidden="true">🔊</span></button><div class="cwb-answer" role="group" aria-label="Your word">${item.letters.map((_, index) => `<span class="cwb-slot" data-cwb-slot="${index}" aria-label="Letter ${index + 1}: empty">–</span>`).join('')}</div><div class="cwb-letters" role="group" aria-label="Letter tiles">${item.letters.map((letter, index) => `<button type="button" class="cwb-letter" data-cwb-letter="${index}" aria-label="Letter ${letter}, tile ${index + 1}">${letter}</button>`).join('')}</div><div class="cwb-actions"><button type="button" class="cwb-button" data-cwb-undo>↶ Undo</button><button type="button" class="cwb-button is-orange" data-cwb-reset>↻ Reset</button><button type="button" class="cwb-button is-blue" data-cwb-listen>🔊 Listen</button><button type="button" class="cwb-button is-green" data-cwb-check>✓ Check</button></div><p class="cwb-feedback" data-cwb-feedback role="status" aria-live="polite">Tap a letter tile, then the next one. Listen to the whole word if you need a clue.</p><div class="cwb-next-row"><button type="button" class="cwb-button is-green" data-cwb-next hidden>${round === deck.length - 1 ? 'Finish 🏆' : 'Next →'}</button></div></section></section>`;
      const stamp = epoch;
      all('[data-cwb-letter]').forEach(button => { button.onclick = () => {
        const index = Number(button.dataset.cwbLetter);
        if (!usable(stamp) || solved || selected.includes(index) || selected.length >= item.letters.length) return;
        selected.push(index); feedback('Keep building your word.'); update();
      }; });
      bind('[data-cwb-undo]', () => { if (solved || !selected.length) return; selected.pop(); feedback('Choose a letter for the empty space.'); update(); });
      bind('[data-cwb-reset]', () => { if (solved) return; selected = []; feedback('Ready to build the word again.'); update(); });
      bind('[data-cwb-listen]', () => say(item.answer));
      bind('[data-cwb-picture]', () => say(item.answer));
      bind('[data-cwb-instruction]', () => say('Tap the letters to build the word. Then tap Check.'));
      bind('[data-cwb-new]', start);
      bind('[data-cwb-check]', () => {
        if (solved) return;
        if (selected.length !== item.letters.length) { feedback('Add every letter, then tap Check.', 'try'); return; }
        if (selected.map(index => item.letters[index]).join('') !== item.answer) { safe(() => window.gpFeedbackSounds?.wrong?.()); feedback('Good try. Use Undo or Reset, then try again.', 'try'); return; }
        solved = true; score++; safe(() => window.gpFeedbackSounds?.correct?.());
        feedback(`Correct! ${item.answer}.${item.feedbackText && item.feedbackText !== item.answer ? ' ' + item.feedbackText : ''}`, 'good');
        update(); say(item.feedbackText && item.feedbackText !== item.answer ? item.answer + '. ' + item.feedbackText : item.answer);
        safe(() => find('[data-cwb-next]').focus({preventScroll:true}));
      });
      bind('[data-cwb-next]', () => { if (!solved) return; if (round === deck.length - 1) finish(); else { round++; render(); } });
      update();
    }
    function start() { stop(); round = score = 0; completed = false; delete root.dataset.complete; render(); }
    function finish() {
      if (completed) return;
      stop(); epoch++; completed = true; root.dataset.complete = 'true';
      root.innerHTML = `<section class="cwb-board cwb-complete"><span aria-hidden="true">🌟</span><h2>Fantastic Phonics!</h2><p>You built all ${deck.length} words.</p><button type="button" class="cwb-button is-green" data-cwb-again>Play Again</button></section>`;
      bind('[data-cwb-again]', start);
      safe(() => find('[data-cwb-again]').focus({preventScroll:true}));
      safe(() => onComplete({activity:'word-builder',rounds:deck.length,score}));
    }
    const visibility = () => { if (document.hidden) stop(); };
    const leave = () => dispose();
    function dispose() {
      if (disposed) return;
      disposed = true; epoch++; stop();
      all('button').forEach(button => { button.onclick = null; });
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', leave);
    }
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', leave);
    start();
    return dispose;
  }
  window.M10CWordBuilder = {mount};
})();

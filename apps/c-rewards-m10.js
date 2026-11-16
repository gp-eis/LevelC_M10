/* Native C completion controls from Month9/level-c/activity-rewards.js.
 * No previous-month media is loaded. This local fallback keeps the same frame
 * and controls while fresh Month 10 reward media awaits production/review. */
(() => {
  'use strict';
  let active = null, serial = 0;
  const safe = callback => { try { return callback?.(); } catch (_) { return undefined; } };
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function show({title = 'Great job!', onReplay = () => {}, onContinue = () => {}, onClose = () => {}, cancelSpeech = () => window.speechSynthesis?.cancel(), returnFocus} = {}) {
    const focusBefore = returnFocus || active?.returnFocus || document.activeElement;
    active?.dispose();
    let disposed = false, replayCount = 0;
    const modal = document.createElement('div'), headingId = 'm10-c-reward-title-' + (++serial);
    modal.classList.add('m10-c-reward-modal');
    modal.innerHTML = `<section class="m10-c-reward-dialog" role="dialog" aria-modal="true" aria-labelledby="${headingId}"><button type="button" class="m10-c-reward-close" data-c-reward-close aria-label="Close celebration">×</button><h2 id="${headingId}">🌟 ${escape(title)}</h2><div class="m10-c-reward-media" data-c-reward-media role="img" aria-label="Great job celebration picture; fresh Month 10 reward video pending"><span class="m10-c-reward-star" aria-hidden="true">🌟</span><p class="m10-c-reward-praise">You did it!</p><p class="m10-c-reward-pending">Fresh Month 10 reward media is being prepared.</p></div><p class="m10-c-reward-status" data-c-reward-status role="status" aria-live="polite">Local celebration picture · reward video pending</p><div class="m10-c-reward-actions"><button type="button" data-c-reward-replay>▶ Play again</button><button type="button" class="m10-c-reward-done" data-c-reward-continue>Keep going! ➜</button></div></section>`;
    const find = selector => modal.querySelector(selector);
    const siblings = [...document.body.children].map(element => ({element, inert: element.inert}));
    const oldOverflow = document.body.style.overflow;
    document.body.append(modal);
    siblings.forEach(({element}) => { element.inert = true; });
    document.body.style.overflow = 'hidden';
    safe(cancelSpeech);
    function close(reason, notify = true, restore = true) {
      if (disposed) return;
      disposed = true;
      safe(cancelSpeech);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('pagehide', pagehide);
      modal.onclick = modal.onkeydown = null;
      modal.querySelectorAll('button').forEach(button => { button.onclick = null; });
      modal.remove();
      siblings.forEach(({element, inert}) => { element.inert = inert; });
      document.body.style.overflow = oldOverflow;
      if (active?.dispose === dispose) active = null;
      if (restore && focusBefore?.isConnected !== false) safe(() => focusBefore?.focus({preventScroll:true}));
      if (notify) safe(reason === 'continue' ? onContinue : () => onClose(reason));
    }
    function dispose() { close('dispose', false, false); }
    const visibility = () => { if (document.hidden) close('hidden', false, false); };
    const pagehide = () => dispose();
    find('[data-c-reward-close]').onclick = () => close('close');
    find('[data-c-reward-continue]').onclick = () => close('continue');
    find('[data-c-reward-replay]').onclick = () => {
      if (disposed || document.hidden) return;
      safe(cancelSpeech);
      replayCount++;
      const media = find('[data-c-reward-media]');
      media.classList.remove('is-replaying');
      void media.offsetWidth;
      media.classList.add('is-replaying');
      find('[data-c-reward-status]').textContent = `Celebration picture replayed${replayCount > 1 ? ' ' + replayCount + ' times' : ''} · reward video pending`;
      safe(onReplay); // A celebration replay, not a learning-activity reset.
    };
    modal.onclick = event => { if (!disposed && event.target === modal) close('backdrop'); };
    modal.onkeydown = event => {
      if (disposed) return;
      if (event.key === 'Escape') { event.preventDefault(); close('escape'); return; }
      if (event.key !== 'Tab') return;
      const buttons = [...modal.querySelectorAll('button')].filter(button => !button.disabled && !button.hidden);
      const first = buttons[0], last = buttons.at(-1);
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('pagehide', pagehide);
    active = {dispose, returnFocus: focusBefore};
    find('[data-c-reward-close]').focus();
    return dispose;
  }
  window.M10CRewards = {show};
})();

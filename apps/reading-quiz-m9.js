/* Native Month9 Reading Q&A controls and sequencing, with injected Month10
 * source packs. This component loads no previous-month teaching media/data. */
(() => {
  'use strict';
  let mounted = null, serial = 0;
  function mount({host, pack, img, say: speak, cancelSpeech = () => {}, canSpeak = typeof speak === 'function'} = {}) {
    const text = (value, field) => {
      if (typeof value !== 'string' || !value.trim()) throw new TypeError(`Reading needs ${field}.`);
      return value.trim();
    };
    if (!host?.querySelectorAll || typeof img !== 'function') throw new TypeError('Reading needs a host and image renderer.');
    const level = text(pack?.level, 'a level').toUpperCase();
    if (!['A', 'B'].includes(level) || !Array.isArray(pack.questions) || pack.questions.length !== 4) throw new TypeError('Reading requires level A/B and exactly four questions.');
    const ids = new Set();
    const config = pack.questions.map(question => {
      const id = text(question.id, 'a question ID');
      if (ids.has(id)) throw new TypeError('Reading question IDs must be unique.');
      ids.add(id);
      if (!Array.isArray(question.choices) || question.choices.length !== 2) throw new TypeError('A/B Reading needs two picture choices.');
      const choices = question.choices.map(choice => ({id: text(choice.id, 'a choice ID'), label: text(choice.label, 'a choice label'), spoken: text(choice.spoken || choice.label, 'spoken choice text'), imageKey: text(choice.imageKey, 'a choice picture'), alt: choice.imageAlt || choice.label}));
      if (new Set(choices.map(choice => choice.id)).size !== 2 || !choices.some(choice => choice.id === question.correctChoiceId)) throw new TypeError('Reading needs unique choices and a matching correct choice ID.');
      return {id, question: text(question.question, 'a question'), imageKey: text(question.imageKey, 'a story clue'), alt: question.imageAlt || 'Story picture clue', praise: text(question.praise, 'a complete answer sentence'), choices, correct: choices.findIndex(choice => choice.id === question.correctChoiceId)};
    });
    const launchers = [...host.querySelectorAll('[data-reading-quiz-open]')];
    if (!launchers.length) throw new TypeError('Reading needs its native launcher button.');
    const make = (tag, className, content, parent) => {
      const element = document.createElement(tag);
      if (className) element.className = className;
      if (content !== undefined) element.textContent = content;
      if (parent) parent.append(element);
      return element;
    };
    const picture = (key, alt) => {
      const holder = make('div');
      holder.innerHTML = img(key, alt);
      const image = holder.querySelector('img');
      if (!image || !image.getAttribute('src')) throw new TypeError(`Reading picture is unavailable: ${key}.`);
      image.alt = alt; image.decoding = 'async';
      return image;
    };
    // Resolve every picture before enabling the launcher; missing art fails closed.
    const pictures = config.map(question => ({clue: picture(question.imageKey, question.alt), choices: question.choices.map(choice => picture(choice.imageKey, choice.alt))}));
    mounted?.();
    const button = (className, content, parent, label) => {
      const element = make('button', className, content, parent);
      element.type = 'button'; element.setAttribute('data-no-click-sound', '');
      if (label) element.setAttribute('aria-label', label);
      return element;
    };
    const modal = make('dialog', 'm10rq'), titleId = `m10-reading-title-${++serial}`;
    modal.setAttribute('data-m10-reading-quiz', ''); modal.setAttribute('aria-labelledby', titleId); modal.dataset.level = level.toLowerCase();
    const panel = make('section', 'm10rq__dialog', undefined, modal), header = make('header', 'm10rq__head', undefined, panel);
    make('h2', '', '⭐ Reading Q&A', header).id = titleId;
    const closeButton = button('m10rq__close', '✕', header, 'Close reading activity');
    const body = make('div', 'm10rq__body', undefined, panel), game = make('div', 'm10rq__game', undefined, body);
    const progress = make('div', 'm10rq__progress', undefined, game), progressText = make('strong', '', '', progress), dots = make('div', 'm10rq__dots', undefined, progress);
    dots.setAttribute('aria-hidden', 'true');
    const questionBox = make('div', 'm10rq__question', undefined, game), hearQuestion = button('m10rq__speak', '🔊', questionBox, 'Hear the question'), heading = make('h3', '', '', questionBox);
    heading.tabIndex = -1;
    const visualBox = make('div', 'm10rq__visual', undefined, game), choices = make('div', 'm10rq__choices', undefined, game), feedback = make('p', 'm10rq__feedback', '', game);
    feedback.setAttribute('role', 'status'); feedback.setAttribute('aria-live', 'polite');
    const next = button('m10rq__next', 'Next →', game); next.hidden = true;
    const done = make('section', 'm10rq__complete', undefined, body); done.hidden = true;
    make('div', 'emoji', '🏅📖', done).setAttribute('aria-hidden', 'true');
    const doneTitle = make('h3', '', 'Wonderful reading!', done); doneTitle.tabIndex = -1;
    make('p', '', 'You answered all four questions.', done);
    const again = button('m10rq__again', 'Play Again', done);
    document.body.append(modal);
    let index = 0, epoch = 0, round = 0, locked = false, active = false, disposed = false, returnFocus = null, speechJob = null, audioContext = null;
    const timers = new Map(), soundNodes = new Set(), listeners = [];
    const listen = (target, name, handler) => { target.addEventListener(name, handler); listeners.push(() => target.removeEventListener(name, handler)); };
    const current = stamp => !disposed && active && modal.open && !document.hidden && stamp === epoch;
    const safeCancel = () => { try { cancelSpeech(); } catch (_) {} };
    function stopSpeech() {
      const job = speechJob; speechJob = null;
      if (job) { clearTimeout(job.timeout); job.control?.classList.remove('is-speaking'); job.control?.removeAttribute('aria-busy'); job.resolve(false); }
      safeCancel();
    }
    function stopSounds() {
      for (const node of soundNodes) { try { node.stop(); node.disconnect(); } catch (_) {} }
      soundNodes.clear();
    }
    function invalidate() {
      epoch += 1;
      for (const [id, resolve] of timers) { clearTimeout(id); resolve(false); }
      timers.clear(); stopSpeech(); stopSounds();
      return epoch;
    }
    function delay(milliseconds, stamp) {
      return new Promise(resolve => { const id = setTimeout(() => { timers.delete(id); resolve(current(stamp)); }, milliseconds); timers.set(id, resolve); });
    }
    function say(value, control) {
      stopSpeech();
      if (!canSpeak || typeof speak !== 'function' || !current(epoch)) return Promise.resolve(false);
      const stamp = epoch;
      return new Promise(resolve => {
        const job = {resolve, control, timeout: 0}; speechJob = job;
        control?.classList.add('is-speaking'); control?.setAttribute('aria-busy', 'true');
        const finish = result => {
          if (speechJob !== job) return;
          speechJob = null; clearTimeout(job.timeout);
          control?.classList.remove('is-speaking'); control?.removeAttribute('aria-busy');
          resolve(Boolean(result && current(stamp)));
        };
        job.timeout = setTimeout(() => { finish(false); safeCancel(); }, Math.max(8000, String(value).length * 150));
        try { speak(String(value), finish); } catch (_) { finish(false); }
      });
    }
    function tone(right) {
      try {
        const Audio = window.AudioContext || window.webkitAudioContext;
        if (!Audio || !current(epoch)) return;
        audioContext ||= new Audio();
        if (audioContext.state === 'suspended') { Promise.resolve(audioContext.resume()).catch(() => {}); }
        (right ? [523, 659, 784] : [220, 175]).forEach((frequency, number) => {
          const oscillator = audioContext.createOscillator(), gain = audioContext.createGain(), startAt = audioContext.currentTime + number * .09;
          oscillator.type = 'sine'; oscillator.frequency.value = frequency;
          gain.gain.setValueAtTime(.0001, startAt); gain.gain.exponentialRampToValueAtTime(.08, startAt + .02); gain.gain.exponentialRampToValueAtTime(.0001, startAt + .13);
          oscillator.connect(gain); gain.connect(audioContext.destination); soundNodes.add(oscillator);
          oscillator.onended = () => { soundNodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
          oscillator.start(startAt); oscillator.stop(startAt + .15);
        });
      } catch (_) { /* Text and spoken feedback still work without local tones. */ }
    }
    function render(read = true) {
      invalidate(); const renderedRound = ++round;
      locked = false; game.hidden = false; done.hidden = true; next.hidden = true; next.disabled = true; feedback.textContent = '';
      const question = config[index]; progressText.textContent = `Question ${index + 1} of 4`;
      dots.replaceChildren(); config.forEach((_, number) => make('i', `m10rq__dot${number === index ? ' is-on' : ''}${number < index ? ' is-done' : ''}`, undefined, dots));
      heading.textContent = question.question; visualBox.replaceChildren(pictures[index].clue);
      hearQuestion.disabled = !canSpeak; hearQuestion.setAttribute('aria-label', 'Hear the question');
      choices.replaceChildren(); choices.style.setProperty('--choice-count', '2');
      question.choices.forEach((choice, number) => {
        const card = make('div', 'm10rq__choice-card', undefined, choices), answer = button('m10rq__choice', undefined, card, `Choose ${choice.label}`);
        answer.append(pictures[index].choices[number]); make('span', 'm10rq__choice-label', choice.label, answer);
        const hearChoice = button('m10rq__choice-speak', '🔊', card, `Hear ${choice.label}`); hearChoice.disabled = !canSpeak;
        answer.onclick = () => choose(answer, number, renderedRound);
        hearChoice.onclick = () => { if (!locked && current(epoch) && renderedRound === round) { invalidate(); say(choice.spoken, hearChoice); } };
      });
      heading.focus({preventScroll: true}); if (read) say(question.question, hearQuestion);
    }
    async function readCorrectAnswer(stamp) {
      const spoken = await say(config[index].praise, hearQuestion);
      if (!current(stamp)) return;
      next.disabled = false;
      if (spoken && await delay(550, stamp)) advance();
    }
    async function choose(answer, number, renderedRound) {
      if (locked || !current(epoch) || renderedRound !== round) return;
      const question = config[index], choice = question.choices[number], stamp = invalidate();
      if (number !== question.correct) {
        answer.classList.remove('is-wrong'); void answer.offsetWidth; answer.classList.add('is-wrong'); feedback.textContent = 'Try once more!'; tone(false);
        if (await delay(300, stamp)) say(choice.spoken, answer);
        return;
      }
      locked = true; answer.classList.add('is-right'); feedback.textContent = question.praise; next.hidden = false; next.disabled = true;
      hearQuestion.setAttribute('aria-label', 'Hear the answer'); choices.querySelectorAll('button').forEach(control => { control.disabled = true; }); tone(true);
      if (!await delay(350, stamp)) return;
      await say(choice.spoken, answer);
      if (current(stamp)) readCorrectAnswer(stamp);
    }
    function advance() {
      if (!locked || !current(epoch)) return;
      invalidate(); index += 1;
      if (index < 4) { render(); return; }
      game.hidden = true; done.hidden = false; doneTitle.focus({preventScroll: true}); say('Wonderful reading! You answered all four questions.');
    }
    function open(event) {
      if (disposed || document.hidden || modal.open || !host.isConnected) return;
      returnFocus = event?.currentTarget || document.activeElement;
      document.querySelectorAll('video').forEach(video => video.pause());
      invalidate(); index = 0; active = true; modal.showModal(); render();
    }
    function closed() {
      active = false; invalidate();
      if (!disposed && !document.hidden && host.isConnected && returnFocus?.isConnected) returnFocus.focus({preventScroll: true});
    }
    function close() { active = false; invalidate(); if (modal.open) modal.close(); }
    function interrupted() {
      if (!document.hidden) return;
      invalidate();
      if (active && modal.open && locked && index < 4) { next.hidden = false; next.disabled = false; }
    }
    launchers.forEach(launcher => { launcher.disabled = false; launcher.removeAttribute('disabled'); launcher.removeAttribute('aria-disabled'); listen(launcher, 'click', open); });
    listen(closeButton, 'click', close);
    listen(modal, 'cancel', event => { event.preventDefault(); close(); }); listen(modal, 'close', closed);
    listen(hearQuestion, 'click', () => { if (!current(epoch)) return; const stamp = invalidate(); if (locked) { next.disabled = true; readCorrectAnswer(stamp); } else say(config[index].question, hearQuestion); });
    listen(next, 'click', () => { if (!next.disabled) advance(); });
    listen(again, 'click', () => { if (current(epoch)) { index = 0; render(); } });
    listen(document, 'visibilitychange', interrupted); listen(window, 'pagehide', close);
    function dispose() {
      if (disposed) return; disposed = true; active = false; round += 1; invalidate();
      listeners.splice(0).forEach(remove => remove());
      choices.querySelectorAll('button').forEach(control => { control.onclick = null; });
      if (modal.open) modal.close(); modal.remove();
      if (audioContext) { try { Promise.resolve(audioContext.close()).catch(() => {}); } catch (_) {} audioContext = null; }
      launchers.forEach(launcher => { launcher.disabled = true; launcher.setAttribute('aria-disabled', 'true'); });
      if (mounted === dispose) mounted = null;
    }
    mounted = dispose;
    return dispose;
  }
  window.M10ReadingQuiz = {mount};
})();

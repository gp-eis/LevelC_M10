/* Native Level A sentence-voice controls, adapted from actual Month9 A.
 * Temporary local capture only. Each supplied row owns its audio; no curriculum
 * text or browser speech-recognition service is introduced by this component.
 */
(() => {
  'use strict';
  const mounts = new Set();
  let activeSession = null, pendingRequest = null;
  const refresh = () => mounts.forEach(mount => mount.sync());
  const pauseAll = except => mounts.forEach(mount => mount.pause(except));
  const silenceAll = () => mounts.forEach(mount => mount.stopListening());
  const safe = fn => { try { return fn?.(); } catch (_) { return undefined; } };
  const stopTracks = stream => safe(() => stream?.getTracks().forEach(track => track.stop()));
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function attach({root, rows, activeId, speak, mute = () => window.speechSynthesis?.cancel(), onRecordStart = mute, onRecordingChange = () => {},onListenComplete=()=>{}}) {
    if (!root || !Array.isArray(rows)) throw new Error('A row recording requires a root and supplied sentence rows');
    if(!rows.length||rows.some(row=>!row||row.id===undefined||typeof row.text!=='string'||!row.text.trim())||new Set(rows.map(row=>String(row.id))).size!==rows.length)throw new TypeError('A recording rows require unique source-bound ids and exact nonempty texts');
    let selected=activeId===undefined?null:String(activeId);
    if(selected!==null&&!rows.some(row=>String(row.id)===selected))throw new TypeError('Unknown source recording prompt: '+selected);
    let disposed = false, voiceVersion = 0;
    const supported = !!(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);
    const states = rows.map(definition => {
      const element = definition.element || root.querySelector(`[data-trace-row="${String(definition.id).replace(/["\\]/g, '\\$&')}"]`);
      if (!element) throw new Error('Missing A sentence row: ' + definition.id);
      let host = element.querySelector('.sentence-voice');
      if (!host) { host = document.createElement('div'); host.className = 'sentence-voice'; element.append(host); }
      host.classList.add('m10-a-row-recording');
      host.innerHTML = `<p class="voice-heading">🎶 Listen, then say it!</p><div class="voice-buttons"><button type="button" data-speak aria-label="Listen to ${esc(definition.text)}"><span class="voice-icon" aria-hidden="true">🔊</span><span>Listen</span></button><button type="button" data-record aria-label="Record ${esc(definition.text)}"><span class="voice-icon" aria-hidden="true">🎤</span><span>My turn!</span></button><button type="button" data-stop hidden><span class="voice-icon" aria-hidden="true">✋</span><span>All done!</span></button></div><small data-speech-note>Say it. Pause when you’re done, or tap All done!</small><audio data-recording controls hidden aria-label="Your recording of ${esc(definition.text)}"></audio><button type="button" data-delete-recording hidden>Try again</button><p class="voice-status" role="status" aria-live="polite"></p>`;
      return {id:String(definition.id), text:definition.text, element, host, version:0, url:null,
        listen:host.querySelector('[data-speak]'), record:host.querySelector('[data-record]'), stop:host.querySelector('[data-stop]'),
        audio:host.querySelector('[data-recording]'),
        reset:host.querySelector('[data-delete-recording]'), status:host.querySelector('.voice-status')};
    });
    const live = row => !disposed && root.isConnected !== false && row.host.isConnected !== false && root.contains(row.host);
    const isActive = row => selected===null||selected===row.id;
    const usable = row => live(row) && !document.hidden && isActive(row);
    const valid = session => !session.cancelled && !session.finished && live(session.row) && session.row.version === session.version;
    const message = (row, text) => { if (live(row)) row.status.textContent = text; };
    function sync() {
      const busy = !!(activeSession || pendingRequest);
      states.forEach(row => {
        const own = activeSession?.owner === entry && activeSession.row === row;
        row.record.hidden = !!own;
        row.record.disabled = disposed || !supported || busy || !isActive(row);
        row.stop.hidden = !own;
        row.stop.disabled = disposed;
        row.listen.disabled = disposed || typeof speak !== 'function' || busy || !isActive(row);
        row.audio.controls = !disposed && !busy && isActive(row);
        if(selected!==null)row.element.hidden=!isActive(row);
      });
    }
    const entry = {sync, pause:stopPlayback,stopListening};
    mounts.add(entry);
    function stopPlayback(except) {
      states.forEach(row => { if (row !== except) safe(() => row.audio.pause()); });
    }
    function stopListening() {
      voiceVersion++; safe(mute);
      states.forEach(row => { if (row.status.textContent === 'Listening…') message(row, 'Stopped. Tap Listen to start again.'); });
    }
    function clearAudio(row) {
      safe(() => row.audio.pause());
      row.audio.removeAttribute('src'); safe(() => row.audio.load());
      row.audio.hidden = true; row.reset.hidden = true;
      if (row.url) { URL.revokeObjectURL(row.url); row.url = null; }
    }
    function finishState(session) {
      clearTimeout(session.maxTimer);
      if (session.frame) cancelAnimationFrame(session.frame);
      session.frame = null;
      safe(() => session.context?.close()); session.context = null;
      stopTracks(session.stream); session.stream = null;
      if (activeSession === session) activeSession = null;
      if (session.changed) { session.changed = false; safe(() => onRecordingChange(false)); }
      refresh();
    }
    function cancel(session, text) {
      if (!session || session.owner !== entry) return;
      session.cancelled = true;
      if (session.recorder?.state !== 'inactive') safe(() => session.recorder?.stop());
      finishState(session);
      if (text) message(session.row, text);
    }
    function stopCapture(session) {
      if (!session || session.owner !== entry || session.stopping) return;
      if (!session.recorder) { cancel(session, 'Recording cancelled. Try again when you’re ready.'); return; }
      session.stopping = true;
      try { if (session.recorder.state !== 'inactive') session.recorder.stop(); }
      catch (_) { cancel(session, 'Recording stopped. Please try again.'); return; }
      finishState(session);
    }
    function meter(session) {
      const context=session.context;
      if (!context || !window.requestAnimationFrame) return;
      try {
        const analyser = context.createAnalyser(); analyser.fftSize = 2048;
        context.createMediaStreamSource(session.stream).connect(analyser);
        const samples = new Float32Array(analyser.fftSize);
        let heard = false, lastSound = performance.now(),loudSince=null,noiseFloor=.003;
        const startedAt=performance.now();
        const monitor = () => {
          if (!valid(session) || session.stopping || session.recorder?.state !== 'recording') return;
          if (context.state === 'running') {
            analyser.getFloatTimeDomainData(samples);
            const rms = Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
            const now=performance.now(),threshold=Math.max(.008,noiseFloor*2.5);
            if(rms>threshold){if(loudSince===null)loudSince=now;if(heard||now-loudSince>=150){heard=true;lastSound=now;}}
            else{loudSince=null;noiseFloor=Math.min(.025,noiseFloor*.95+rms*.05);}
            if (heard && performance.now() - lastSound >= 3000) { stopCapture(session); return; }
            if(!heard&&now-startedAt>=15000){stopCapture(session);return;}
          }
          session.frame = requestAnimationFrame(monitor);
        };
        Promise.resolve(session.resume).then(() => { if (valid(session) && activeSession===session&&!session.stopping) monitor(); }).catch(() => {});
      } catch (_) { safe(() => session.context?.close()); session.context = null; }
    }
    async function start(row) {
      if (!usable(row)) return;
      if (!supported) { message(row, 'Recording needs a browser with microphone support and an HTTPS connection.'); return; }
      if (activeSession || pendingRequest) { message(row, 'Finish the other microphone request or recording first.'); return; }
      silenceAll(); pauseAll(); safe(onRecordStart);
      const session = {owner:entry, row, version:++row.version, cancelled:false, stopping:false, changed:true, stream:null, recorder:null, chunks:[]};
      activeSession = session;
      safe(() => onRecordingChange(true)); refresh();
      message(row, 'Allow the microphone to record your sentence.');
      let request;
      try {
        // Unlock local metering in the native button gesture, before permission.
        const Context=window.AudioContext||window.webkitAudioContext;
        if(Context&&window.requestAnimationFrame){try{session.context=new Context();session.resume=Promise.resolve(session.context.resume?.());session.resume.catch(()=>{});}catch{safe(()=>session.context?.close());session.context=null;}}
        request = navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}}); pendingRequest = request;
        const stream = await request;
        if (pendingRequest === request) pendingRequest = null;
        if (!valid(session) || document.hidden || activeSession !== session) { stopTracks(stream); finishState(session); return; }
        session.stream = stream;
        const recorder = session.recorder = new window.MediaRecorder(stream);
        recorder.ondataavailable = event => { if (valid(session) && event.data?.size) session.chunks.push(event.data); };
        recorder.onstop = () => {
          finishState(session);
          if (!valid(session)) return;
          session.finished=true;
          const blob = new Blob(session.chunks, {type:recorder.mimeType || session.chunks[0]?.type || 'audio/webm'});
          if (!blob.size) { message(row, 'No recording was captured. Please try again.'); return; }
          clearAudio(row); row.url = URL.createObjectURL(blob); row.audio.src = row.url;
          row.audio.hidden = false; row.reset.hidden = false;
          message(row, '🎧 Your turn is saved! Listen to your voice.');
        };
        recorder.onerror = () => {if(valid(session))cancel(session, 'Recording failed. Please try again.');};
        clearAudio(row); recorder.start();
        session.maxTimer = setTimeout(() => { if (valid(session)) stopCapture(session); }, 60000);
        meter(session);
        message(row, session.context ? '🎤 I’m listening! Take your time. I’ll finish after you stop speaking.' : '🎤 I’m listening! Say it, then tap All done!');
      } catch (error) {
        if (pendingRequest === request) pendingRequest = null;
        const stillValid = valid(session); session.cancelled = true; finishState(session);
        if (stillValid) message(row, error?.name === 'NotAllowedError' ? 'Microphone permission was not granted. Allow it in your browser to record.' : 'Could not access the microphone. Check that it is connected and try again.');
      } finally {
        if (pendingRequest === request) pendingRequest = null;
        refresh();
      }
    }
    states.forEach(row => {
      row.listen.onclick = () => {
        if (!usable(row) || activeSession || pendingRequest || typeof speak !== 'function') return;
        silenceAll(); pauseAll(); const token = voiceVersion;let settled=false;
        message(row, 'Listening…');
        try { speak(row.text, ok => { if (!settled&&usable(row) && token === voiceVersion){settled=true;message(row, ok === true ? 'Now try saying it!' : 'Could not play the sentence. Please try again.');if(ok===true)safe(()=>onListenComplete({id:row.id,text:row.text},true));} }); }
        catch (_) { message(row, 'Could not play the sentence. Please try again.'); }
      };
      row.record.onclick = () => start(row);
      row.stop.onclick = () => { if (usable(row) && activeSession?.row === row) stopCapture(activeSession); };
      row.reset.onclick = () => { if (usable(row)) { clearAudio(row); message(row, 'Ready to record again.'); } };
      row.audio.onplay = () => {
        if (!usable(row) || activeSession || pendingRequest || !row.url) { safe(() => row.audio.pause()); return; }
        silenceAll(); pauseAll(row);
      };
      row.audio.onerror = () => { if (usable(row) && row.url) message(row, 'Could not play your recording. Try recording again.'); };
      if (!supported) message(row, 'Recording needs a browser with microphone support and an HTTPS connection.');
    });
    function leave() {
      stopListening(); stopPlayback();
      if (activeSession?.owner === entry) cancel(activeSession);
      states.forEach(row => { row.version++; clearAudio(row); message(row, 'Recording cleared when you left the page.'); });
      refresh();
    }
    const visibility = () => { if (document.hidden) leave(); };
    document.addEventListener('visibilitychange', visibility);
    const pagehide = () => dispose(); window.addEventListener('pagehide', pagehide);
    function dispose() {
      if (disposed) return;
      leave(); disposed = true;
      document.removeEventListener('visibilitychange', visibility); window.removeEventListener('pagehide', pagehide);
      mounts.delete(entry);
      states.forEach(row => {
        row.listen.onclick = row.record.onclick = row.stop.onclick = row.reset.onclick = null;
        row.audio.onplay = row.audio.onerror = null;
      });
      sync(); refresh();
    }
    function setActive(id){
      if(disposed)return;
      const target=String(id);if(!states.some(row=>row.id===target))throw new TypeError('Unknown source recording prompt: '+target);
      if(selected===target)return;
      silenceAll();stopPlayback();
      if(activeSession?.owner===entry)cancel(activeSession);
      states.forEach(row=>row.version++);selected=target;root.dataset.activePrompt=target;refresh();
    }
    if(selected!==null)root.dataset.activePrompt=selected;
    sync();
    return {dispose,setActive};
  }
  function mount(options){return attach(options).dispose;}
  function mountPrompt({root,prompts,initialId,...options}={}){
    if(!root||!Array.isArray(prompts)||!prompts.length||prompts.some(p=>!p||p.id===undefined||typeof p.text!=='string'||!p.text.trim())||new Set(prompts.map(p=>String(p.id))).size!==prompts.length)throw new TypeError('A prompt recording requires unique source-bound ids and exact texts');
    const initial=String(initialId??prompts[0].id);if(!prompts.some(p=>String(p.id)===initial))throw new TypeError('Unknown source recording prompt: '+initial);
    root.classList.add('m10-a-prompt-recording');
    root.innerHTML=prompts.map(p=>`<section class="m10-a-prompt-row" data-a-recording-prompt="${esc(p.id)}" aria-label="Practice ${esc(p.text)}"><div class="sentence-voice"></div></section>`).join('');
    const elements=[...root.querySelectorAll('[data-a-recording-prompt]')];
    const controller=attach({...options,root,activeId:initial,rows:prompts.map((p,index)=>({id:String(p.id),text:p.text,element:elements[index]}))});
    return {setPrompt:id=>controller.setActive(id),dispose:controller.dispose};
  }
  window.M10ARowRecording = {mount,mountPrompt};
})();

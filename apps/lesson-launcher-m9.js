/* Native Month9 Reading/Phonics launcher UI; Month10 media stays pending.
 * Source: shared/lesson-launchers/{launchers,reading-cover}.css and the actual
 * A/B/C reading/phonics week1–4 launch pages. No prior-month curriculum/media. */
(() => {
  'use strict';
  const esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function markup({category,level,week,gamesHref,readingReady=false}={}){
    if(!['reading','phonics'].includes(category)||!['A','B','C'].includes(level)||!Number.isInteger(week)||week<1||week>4)throw new TypeError('Native launcher requires Reading/Phonics, level A/B/C and week1–4.');
    if(category==='phonics'&&(typeof gamesHref!=='string'||!gamesHref.trim()||(/^\s*[a-z][a-z0-9+.-]*:/i.test(gamesHref)&&!/^\s*https?:/i.test(gamesHref))))throw new TypeError('Phonics launcher requires a safe game-menu link.');
    const reading=category==='reading',title=reading?'Reading':'Phonics';
    if(typeof readingReady!=='boolean'||(readingReady&&(!reading||!['A','B'].includes(level))))throw new TypeError('Ready Reading activities require a reviewed A/B source pack.');
    const note=reading?(readingReady?'Listen, look, and choose the matching picture.':'The Month 10 story questions, answers and clean scene pictures are pending.'):'Practice letters and sounds with the phonics games. Approved Month 10 video and sound recordings are pending.';
    const action=reading?`<button class="lesson-launch-button reading-quiz-open" type="button"${readingReady?' data-reading-quiz-open':''} disabled aria-disabled="true">⭐ Open Reading Activity</button>`:`<a class="lesson-launch-button" href="${esc(gamesHref)}">Phonics Games →</a>`;
    return `<div class="m10-native-launcher" data-launch-category="${category}"><header class="lesson-launch-heading"><h1>Week ${week} ${title}</h1><p>Month 10 · Level ${level} · Week ${week}</p></header><section class="lesson-launch-card" id="lesson-focus"><div class="reading-video-shell"><div class="lesson-video-pending" role="status"><span aria-hidden="true">▶</span><h2>${title} video coming soon</h2><p>The selected Month 10 video is not available yet.</p></div></div><p class="reading-cover-note">${note}</p><div class="lesson-launch-actions">${action}</div></section></div>`;
  }
  window.M10LessonLauncher={markup};
})();

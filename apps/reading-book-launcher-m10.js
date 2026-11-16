/* Month10+ owner-directed Reading: the assigned book page is the entry image. */
(() => {
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validate(book){
    if(!book||!['A','B'].includes(book.level)||!Number.isInteger(book.week)||book.week<1||book.week>4||!Array.isArray(book.pages)||book.pages.length!==2)throw new TypeError('Reading book needs its assigned A/B week and two pages.');
    if(!book.pages.every(p=>Number.isInteger(p.pdfPage)&&p.printedPage===p.pdfPage-3&&p.imageKey&&p.alt)||new Set(book.pages.map(p=>p.pdfPage)).size!==2)throw new TypeError('Reading book pages need distinct verified source pictures.');
    if(!Number.isInteger(book.defaultPageIndex)||book.defaultPageIndex<0||book.defaultPageIndex>1)throw new TypeError('Reading book needs its starting page.');
  }
  function markup({book,img}={}){
    validate(book);if(typeof img!=='function')throw new TypeError('Reading book needs a picture renderer.');
    const page=book.pages[book.defaultPageIndex];
    return `<div class="m10-native-launcher m10-book-launcher" data-launch-category="reading"><header class="lesson-launch-heading"><h1>Week ${book.week} Reading</h1><p>Month 10 · Level ${book.level} · Week ${book.week}</p></header><section class="lesson-launch-card m10-book-card" id="lesson-focus"><nav class="m10-book-pages" aria-label="Book pages">${book.pages.map((p,i)=>`<button type="button" class="m10-book-page" data-book-page="${i}" aria-pressed="${i===book.defaultPageIndex}">Page ${p.printedPage}</button>`).join('')}</nav><div class="m10-book-picture" data-reading-book-picture>${img(page.imageKey,page.alt)}</div><p class="reading-cover-note" data-reading-book-note>Explore the picture in your book.</p><div class="lesson-launch-actions"><button type="button" class="lesson-launch-button reading-scene-open" data-reading-scene-open data-source-page-active="false" disabled aria-disabled="true">⭐ Open Reading Activity</button></div></section></div>`;
  }
  function bind({host,book,pack,img,ready=false,onPageChange}={}){
    validate(book);if(!host?.querySelectorAll||typeof img!=='function')throw new TypeError('Reading book needs its host and pictures.');
    let current=book.defaultPageIndex,disposed=false,prepared=!!ready;
    const pages=[...host.querySelectorAll('[data-book-page]')],picture=host.querySelector('[data-reading-book-picture]'),note=host.querySelector('[data-reading-book-note]'),open=host.querySelector('[data-reading-scene-open]');
    if(pages.length!==2||!picture||!note||!open)throw new TypeError('Reading book markup is incomplete.');
    function sync(){
      if(disposed)return;
      const active=!!pack&&prepared&&book.pages[current].pdfPage===pack.source?.pdfPage;
      open.disabled=!active;open.setAttribute('aria-disabled',String(!active));open.dataset.sourcePageActive=String(active);
      note.textContent=active?'Place the pictures, color the picture, and listen and find.':pack&&book.pages[current].pdfPage===pack.source?.pdfPage?'The picture activities are getting ready.':'Activities for this picture are coming soon.';
      pages.forEach((button,index)=>button.setAttribute('aria-pressed',String(index===current)));
    }
    pages.forEach((button,index)=>{button.onclick=()=>{if(disposed||index===current)return;current=index;picture.innerHTML=img(book.pages[index].imageKey,book.pages[index].alt);sync();if(typeof onPageChange==='function')onPageChange(book.pages[index]);};});
    sync();
    return {setReady(value){if(!disposed){prepared=!!value;sync();}},setPack(value,ready=false){if(!disposed){pack=value;prepared=!!ready;sync();}},dispose(){if(disposed)return;disposed=true;pages.forEach(button=>button.onclick=null);}};
  }
  window.M10ReadingBook={markup,bind};
})();

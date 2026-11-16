/* A4 local-book practice view. Canonical lesson and source records stay unchanged. */
(() => {
  'use strict';
  const ids=['a4-canyon','a4-waterfall','a4-lake','a4-hot-spring'];
  function lessonView(lesson,configuration){
    if(lesson?.id!=='a4'||lesson.level!=='A'||lesson.week!==4||!configuration)return lesson;
    const overrides=configuration.practiceOverrides?.cardOverrides,matching=configuration.practiceOverrides?.matching;
    if(!overrides||Object.keys(overrides).join()!=='a4-lake'||!Array.isArray(matching)||matching.length!==4)return lesson;
    const correction=overrides['a4-lake'],allowed=['imageKey','practiceEligible','imageStatus','note'];
    if(!correction||Object.keys(correction).some(key=>!allowed.includes(key))||correction.imageKey!=='a4-clear-lake-v1'||correction.practiceEligible!==true)return lesson;
    if(!Array.isArray(lesson.cards)||lesson.cards.map(c=>c.id).join()!==ids.join())return lesson;
    if(matching.some((item,index)=>item.cardId!==ids[index]||item.sentence!==lesson.cards[index].sentence||item.bookId!==lesson.cards[index].bookId||item.pdfPage!==lesson.cards[index].pdfPage||item.textStatus!==lesson.cards[index].textStatus))return lesson;
    return {...lesson,cards:lesson.cards.map(card=>({...card,...(overrides[card.id]||{})})),matching:matching.map(item=>({...item}))};
  }
  window.M10AWeek4={lessonView};
})();


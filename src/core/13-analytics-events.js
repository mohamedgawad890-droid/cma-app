// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 28 — ANALYTICS EVENTS (GA4)
// ═══════════════════════════════════════════════════════════════════════════
// Loads AFTER every other src/core file (see numeric prefix). It wraps a few
// existing global functions so analytics can observe them WITHOUT editing the
// original code paths. Each wrapper:
//   • calls the original first and returns its result untouched,
//   • reports to GA4 inside try/catch — an analytics failure can never break
//     the app,
//   • is skipped entirely if the target function does not exist.
// To remove analytics events: delete this one file. Nothing else depends on it.
//
// Events (all carry only ids/counts — never names, emails, or answers):
//   screen_view      {screen_name}                     tab changed
//   lesson_open      {lesson_id, section_id}           lesson reader opened
//   lesson_complete  {lesson_id, section_id}           "Mark as Complete" (first time only)
//   quiz_finish      {quiz_type, lesson_id, section_id, questions, correct, score_pct}
// Defined in 01-boot-config.js: track(name, params), _ga.

(function(){
  'use strict';
  if(typeof track!=='function')return;   // 01-boot-config.js not loaded — do nothing

  function safe(fn){ try{ fn(); }catch(_){} }
  function sectionOf(lessonId){ return Number(String(lessonId||'').split('-')[0])||0; }

  // ── 1) Screen views: one event per tab change (render() runs many times) ──
  if(typeof render==='function'){
    const _render=render;
    let _lastScreen=null;
    render=function(){
      const out=_render.apply(this,arguments);
      safe(function(){
        const tab=(typeof STATE!=='undefined'&&STATE.tab)?String(STATE.tab):'';
        if(tab&&tab!=='loading'&&tab!==_lastScreen){
          _lastScreen=tab;
          track('screen_view',{screen_name:tab});
        }
      });
      return out;
    };
  }

  // ── 2) Lesson opened (studyGo is the single entry to the lesson reader) ──
  if(typeof studyGo==='function'){
    const _studyGo=studyGo;
    studyGo=function(sectId,lessonId){
      const out=_studyGo.apply(this,arguments);
      safe(function(){
        if(lessonId)track('lesson_open',{lesson_id:String(lessonId),section_id:sectionOf(lessonId)});
      });
      return out;
    };
  }

  // ── 3) Lesson completed — only the FIRST completion of each lesson ──
  if(typeof markDone==='function'&&typeof _getDoneSet==='function'){
    const _markDone=markDone;
    markDone=function(lid){
      let wasDone=true;
      safe(function(){ wasDone=_getDoneSet().has(lid); });
      const out=_markDone.apply(this,arguments);
      safe(function(){
        if(!wasDone)track('lesson_complete',{lesson_id:String(lid),section_id:sectionOf(lid)});
      });
      return out;
    };
  }

  // ── 4) Lesson-quiz / wrong-answer-retry finished ──
  if(typeof _finalizeQuiz==='function'){
    const _finalize=_finalizeQuiz;
    _finalizeQuiz=function(){
      const out=_finalize.apply(this,arguments);
      safe(function(){
        const qs=STATE.quizState;
        if(!qs||!Array.isArray(qs.questions)||!Array.isArray(qs.answers))return;
        const total=qs.questions.length;
        const right=qs.answers.filter(function(a){return a&&a.correct;}).length;
        track('quiz_finish',{
          quiz_type:qs.isRetry?'wrong_answers_retry':'lesson_quiz',
          lesson_id:qs.lessonId?String(qs.lessonId):'mixed',
          section_id:qs.lessonId?sectionOf(qs.lessonId):(Number(qs.sId)||0),
          questions:total,
          correct:right,
          score_pct:total?Math.round(right/total*100):0
        });
      });
      return out;
    };
  }
})();

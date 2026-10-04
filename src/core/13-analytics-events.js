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
//   exam_start       {exam_id, attempt_number}                       instructor group exam started/resumed
//   exam_submit      {exam_id, exam_title, section_id, attempt_number, score, total, score_pct, passed, auto_submitted, time_min}
//   practice_finish  {sections, total, auto_submitted, time_min}     student custom practice test (no score: private)
//   mock_exam_start  {}                                              full mock exam started
//   mock_exam_finish {mcq_pct, cbq_pct, weighted_pct, passed}
//   cbq_check        {section_key, case_id, correct, total, score_pct}
//   quiz_mode_finish {quiz_type, section_id, questions, correct, score_pct}   Practice > MCQ Quiz (section / full mix / streak-grace review)
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
  // ── 5) Group exam started (also fires on resume) ──
  if(typeof startExam==='function'){
    const _startExam=startExam;
    startExam=async function(examId){
      const before=STATE.examSession;
      const out=await _startExam.apply(this,arguments);
      safe(function(){
        const s=STATE.examSession;
        if(s&&s!==before&&!s.submitted&&!s.isPractice){
          track('exam_start',{exam_id:String(examId),attempt_number:Number(s.attemptNumber)||1});
        }
      });
      return out;
    };
  }

  // ── 6) Exam / custom practice test submitted (graded exam OR student practice) ──
  if(typeof submitExam==='function'){
    const _submitExam=submitExam;
    submitExam=async function(){
      const sess=STATE.examSession;
      const wasSubmitted=!!(sess&&sess.submitted);
      const out=await _submitExam.apply(this,arguments);
      safe(function(){
        const s=STATE.examSession;
        if(!s||!s.submitted||wasSubmitted||!s.results||s.results._tracked)return;
        s.results._tracked=true;
        const r=s.results;
        const base={
          score:Number(r.score)||0,
          total:Number(r.total)||0,
          score_pct:Number(r.percentage)||0,
          passed:r.passed?1:0,
          auto_submitted:r.autoSubmitted?1:0,
          time_min:r.timeMs?Math.round(r.timeMs/60000):0
        };
        if(s.isPractice){
          // Privacy: custom practice results are private to the student, so no score
          // or pass/fail is sent here — only that a test was completed.
          track('practice_finish',{
            sections:Array.isArray(s.exam&&s.exam.sectionIds)?s.exam.sectionIds.length:0,
            total:base.total,
            auto_submitted:base.auto_submitted,
            time_min:base.time_min
          });
        }else{
          track('exam_submit',Object.assign({
            exam_id:String(s.examId||''),
            exam_title:String((s.exam&&s.exam.title)||'').slice(0,80),
            section_id:Number(s.exam&&s.exam.sectionId)||0,
            attempt_number:Number(s.attemptNumber)||1
          },base));
        }
      });
      return out;
    };
  }

  // ── 7) Full mock exam: start + finish ──
  if(typeof startMockExam==='function'){
    const _startMock=startMockExam;
    startMockExam=async function(){
      const out=await _startMock.apply(this,arguments);
      safe(function(){
        if(STATE.mockExam&&STATE.mockExam.status==='mcq')track('mock_exam_start',{});
      });
      return out;
    };
  }
  if(typeof mockSubmitCBQ==='function'){
    const _mockSubmitCBQ=mockSubmitCBQ;
    mockSubmitCBQ=function(){
      const wasStatus=STATE.mockExam&&STATE.mockExam.status;
      const out=_mockSubmitCBQ.apply(this,arguments);
      safe(function(){
        const me=STATE.mockExam;
        if(!me||me.status!=='results'||wasStatus==='results'||!me.results)return;
        const r=me.results;
        const mcqPct=Math.round(r.mcqCorrect/r.mcqTotal*100);
        const cbqPct=r.cbqTotal?Math.round(r.cbqCorrect/r.cbqTotal*100):0;
        const weighted=Math.round(mcqPct*0.75+(r.cbqTotal?cbqPct:mcqPct)*0.25);
        track('mock_exam_finish',{
          mcq_pct:mcqPct,
          cbq_pct:r.cbqTotal?cbqPct:-1,   // -1 = CBQ phase not attempted
          weighted_pct:weighted,
          passed:weighted>=70?1:0
        });
      });
      return out;
    };
  }

  // ── 8) CBQ practice: a case was graded ──
  if(typeof cbqCheck==='function'){
    const _cbqCheck=cbqCheck;
    cbqCheck=function(){
      const out=_cbqCheck.apply(this,arguments);
      safe(function(){
        const key=CBQ_TAB_KEYS[CBQ_S.secIdx];
        const cbq=CBQ_DATA[key][CBQ_S.cbqIdx];
        const sc=CBQ_S.scores[cbq.id];
        if(!sc)return;
        track('cbq_check',{
          section_key:String(key),
          case_id:String(cbq.id),
          correct:sc.s,
          total:sc.t,
          score_pct:sc.t?Math.round(sc.s/sc.t*100):0
        });
      });
      return out;
    };
  }
  // ── 9) Practice > MCQ Quiz (Quiz Mode) finished ──
  if(typeof finishQuizMode==='function'){
    const _finishQuizMode=finishQuizMode;
    finishQuizMode=async function(){
      const before=!!(STATE.quizMode&&STATE.quizMode.done);
      const out=await _finishQuizMode.apply(this,arguments);
      safe(function(){
        const qm=STATE.quizMode;
        if(!qm||!qm.done||before||!Array.isArray(qm.answers)||!Array.isArray(qm.questions))return;
        const total=qm.questions.length;
        const right=qm.answers.filter(function(a){return a&&a.correct;}).length;
        track('quiz_mode_finish',{
          quiz_type:qm.isGrace?'streak_grace':(qm.sectionId?'section_quiz':'full_mix'),
          section_id:Number(qm.sectionId)||0,   // 0 = all sections
          questions:total,
          correct:right,
          score_pct:total?Math.round(right/total*100):0
        });
      });
      return out;
    };
  }
})();

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 5 — LECTURE FEEDBACK (student submits rating + comment per lecture)
// ═══════════════════════════════════════════════════════════════════════════
// Data model:  lecture-feedback/{docId} = {
//   lectureId, groupCode, userId, studentName, rating(1-5), comment, submittedAt
// }
// Rules (added to firestore.rules):
//   read: instructor OR (owner of doc via userId)
//   create: any signed-in user, doc.userId must equal auth.uid
//   update/delete: instructor only
// Instructor controls open/close via live/{groupCode}.feedbackOpen (independent
// from checkinOpen). Feedback surface appears in the student check-in overlay
// AND as a floating card on any tab while a lecture's feedback window is open
// AND the student has already checked in for that lecture.

// LocalStorage key for lecture feedback the student has already submitted
function loadFeedbackSubmitted(){try{return JSON.parse(localStorage.getItem('cma-lec-feedback-v1')||'[]');}catch{return[];}}
function saveFeedbackSubmitted(arr){try{localStorage.setItem('cma-lec-feedback-v1',JSON.stringify(arr));}catch{}}
function hasSubmittedFeedback(lectureId){return loadFeedbackSubmitted().includes(lectureId);}

// Public: show the feedback modal for a specific lecture pointer.
function showFeedbackModal(p,groupCode){
  if(document.getElementById('feedback-overlay'))return;
  const ov=document.createElement('div');
  ov.id='feedback-overlay';
  ov.setAttribute('style','position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .15s ease');
  ov.innerHTML=
    '<div style="background:#fff;border-radius:18px;width:100%;max-width:400px;padding:22px 20px;box-shadow:0 24px 64px rgba(0,0,0,.25)">'+
      '<div style="font-size:32px;text-align:center;margin-bottom:6px">\u2B50</div>'+
      '<div style="font-size:17px;font-weight:600;color:var(--ink);text-align:center;line-height:1.3;margin-bottom:4px">Rate this lecture</div>'+
      '<div style="font-size:12px;color:#888;text-align:center;margin-bottom:14px">'+esc(p.title||'Lecture')+' \u00B7 '+esc(groupCode)+'</div>'+
      '<div id="fb-stars" style="display:flex;justify-content:center;gap:8px;margin-bottom:16px">'+
        [1,2,3,4,5].map(i=>'<button type="button" data-star="'+i+'" style="background:none;border:none;cursor:pointer;padding:4px;font-size:34px;color:var(--border);line-height:1;font-family:inherit">\u2605</button>').join('')+
      '</div>'+
      '<textarea id="fb-comment" placeholder="Optional comment (max 500 chars)\u2026" maxlength="500" style="width:100%;padding:10px 12px;border-radius:10px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink);box-sizing:border-box;resize:vertical;min-height:70px;margin-bottom:12px"></textarea>'+
      '<div style="display:flex;gap:8px">'+
        '<button id="fb-cancel" style="flex:1;padding:11px;border-radius:10px;border:.5px solid var(--border-4);background:#fff;color:#555;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">Later</button>'+
        '<button id="fb-submit" disabled style="flex:2;padding:11px;border-radius:10px;border:none;background:rgba(12,68,124,.35);color:#fff;font-size:14px;font-weight:600;cursor:not-allowed;font-family:inherit">Submit</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(ov);
  let _r=0;
  const stars=ov.querySelectorAll('#fb-stars button');
  const submitBtn=document.getElementById('fb-submit');
  stars.forEach((s,i)=>{
    s.onclick=()=>{
      _r=i+1;
      stars.forEach((x,j)=>{x.style.color=j<=i?'#F5B041':'var(--border)';});
      submitBtn.disabled=false;
      submitBtn.style.background='var(--brand)';
      submitBtn.style.cursor='pointer';
    };
  });
  document.getElementById('fb-cancel').onclick=()=>{markFeedbackDismissed(p&&p.lectureId);ov.remove();};
  submitBtn.onclick=()=>{
    if(!_r){showToast('Pick a rating first.','warning');return;}
    const comment=(document.getElementById('fb-comment').value||'').trim().slice(0,500);
    submitLectureFeedback(p.lectureId,groupCode,p.title||'Lecture',_r,comment);
  };
}

async function submitLectureFeedback(lectureId,groupCode,title,rating,comment){
  const submitBtn=document.getElementById('fb-submit');
  if(submitBtn){submitBtn.disabled=true;submitBtn.textContent='\u23F3 Sending\u2026';}
  try{
    const st=loadStudent()||{};
    await db.collection('lecture-feedback').add({
      lectureId,groupCode,title,
      userId:STATE.user.uid,
      studentName:st.name||STATE.user.displayName||'Student',
      studentId:st.studentId||'',
      rating,comment,
      submittedAt:new Date().toISOString()
    });
    const done=loadFeedbackSubmitted();if(!done.includes(lectureId)){done.push(lectureId);saveFeedbackSubmitted(done);}
    const el=document.getElementById('feedback-overlay');if(el)el.remove();
    showToast('\u2B50 Thanks for the feedback!','success',2200);
  }catch(e){
    console.warn('[Feedback] submit failed:',e);
    if(submitBtn){submitBtn.disabled=false;submitBtn.textContent='Submit';}
    showToast('Submit failed \u2014 try again.','error');
  }
}

// Poller-adjacent: whenever we see a live pointer with feedbackOpen=true and
// the student has already checked in and not yet submitted feedback, surface a
// floating card that opens the feedback modal.
// Batch 8 (feedback-popup): lecture IDs the student dismissed via "Later" this
// session. In-memory only, so the popup re-appears next app open if feedback is
// still open and the student still hasn't submitted.
var _feedbackDismissedSession = {};
function markFeedbackDismissed(lectureId){ if(lectureId) _feedbackDismissedSession[lectureId] = 1; }

// Batch 11: one-shot lazy fetch of the student's group's recent lectures, so
// maybeShowFeedbackPrompt can check each one's COMPUTED 7-day feedback window
// (checkinClosedAt) — the live/{groupCode} pointer alone isn't enough since
// its lectureId goes null the moment check-in closes.
// NOTE: needs a Firestore rule allowing students to read `lectures` scoped to
// their own groupCode (previously instructor-only) — add manually via console.
async function loadRecentLecturesForFeedback(){
  if(STATE.studentRecentLecturesLoaded||isInstructor()||!STATE.user)return;
  const st=loadStudent();
  if(!st||!st.groupCode)return;
  STATE.studentRecentLecturesLoaded=true;
  try{
    const g=st.groupCode.toUpperCase();
    const snap=await db.collection('lectures').where('groupCode','==',g).orderBy('createdAt','desc').limit(10).get();
    STATE.studentRecentLectures=snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){console.warn('[loadRecentLecturesForFeedback] failed (may need a Firestore rule):',e);}
}
function maybeShowFeedbackPrompt(){
  if(!STATE.user)return;
  loadRecentLecturesForFeedback();   // fire-and-forget, one-shot per session
  const groups=Object.keys(STATE.dashLive||{});
  for(const g of groups){
    const p=STATE.dashLive[g];
    if(!p||!p.lectureId)continue;
    if(!p.feedbackOpen)continue;
    if(!hasCheckedIn(p.lectureId))continue;      // only prompt those who attended
    if(hasSubmittedFeedback(p.lectureId))continue; // already done
    if(_feedbackDismissedSession[p.lectureId])continue; // Batch 8: dismissed this session
    if(document.getElementById('feedback-overlay'))continue;
    STATE._feedbackPromptFor={lectureId:p.lectureId,title:p.title,groupCode:g};
    return;
  }
  // Batch 11: computed 7-day windows from recently-closed lectures (covers
  // the case where the live/{groupCode} pointer has since moved to a newer
  // lecture, or was never manually toggled at all).
  for(const lec of (STATE.studentRecentLectures||[])){
    if(!isFeedbackOpen(lec))continue;
    if(!hasCheckedIn(lec.id))continue;
    if(hasSubmittedFeedback(lec.id))continue;
    if(_feedbackDismissedSession[lec.id])continue;
    if(document.getElementById('feedback-overlay'))continue;
    STATE._feedbackPromptFor={lectureId:lec.id,title:lec.title,groupCode:lec.groupCode};
    return;
  }
  STATE._feedbackPromptFor=null;
}



// ═════════════════════════════════════════════════════════════════════
// PHASE 3a-i — GROUP EXAMS (instructor authoring surface)
// Data model:
//   exams/{id} : { title, groupCode, questionSource:'auto', sectionId,
//                  count, durationMinutes, opensAt, closesAt,
//                  status:'scheduled'|'closed', createdAt, createdBy }
// Ownership : instructor writes; any signed-in student reads (rules already live).
// Question set is NOT stored on the exam doc — Phase 3a-ii will deterministically
//   draw `count` questions from s{sectionId}.json seeded on (examId + student.uid)
//   so refresh-cheat is impossible while sets vary across students.
// ═════════════════════════════════════════════════════════════════════

// Effective status derived from timestamps + stored status.
function examWindowStatus(x){
  if(x.status==='closed')return 'closed';
  const now=Date.now();
  const opens=x.opensAt?Date.parse(x.opensAt):0;
  const closes=x.closesAt?Date.parse(x.closesAt):0;
  if(closes&&now>closes)return 'closed';
  if(opens&&now<opens)return 'scheduled';
  return 'active';
}



// Batch 11: largest-remainder split of `total` into `n` integer buckets that
// sum back to `total` exactly (e.g. 40/3 -> [14,13,13], not 13.33 each).
function _largestRemainderSplit(total,n){
  if(n<=0)return[];
  const base=Math.floor(total/n);
  const rem=total-base*n;
  const arr=new Array(n).fill(base);
  for(let i=0;i<rem;i++)arr[i]++;
  return arr;
}
// Batch 11: shared section- and unit-balanced pool builder, used by both
// saveExam (creation) and reshuffleExam (re-roll) so distribution logic
// never drifts between the two. sectionIds: array of section ids.
// unitsBySection: {sectionId:[unitIds]} (empty/missing = whole section).
// Returns {ok:true,questionIds:[...]} or {ok:false,message}.
async function buildDistributedExamPool(sectionIds,unitsBySection,count){
  await Promise.all(sectionIds.map(sid=>ensureQuizzes(sid)));
  const secPools={};   // sid -> {unitId -> [qid,...]}
  sectionIds.forEach(sid=>{
    const sec=S.find(s=>s.id===sid);
    if(!sec)return;
    const filterUnits=Array.isArray(unitsBySection[sid])&&unitsBySection[sid].length?unitsBySection[sid].map(String):null;
    const byUnit={};
    sec.lessons.forEach(l=>{
      if(filterUnits&&!filterUnits.includes(String(l.id)))return;
      if(l.quizzes&&l.quizzes.length){
        l.quizzes.forEach((q,i)=>{
          if(isOutOfScopeQ(l,q))return;   // never freeze Part-2 content into a graded exam
          const qid=l.id+':'+(q.id||i);
          (byUnit[l.id]=byUnit[l.id]||[]).push(qid);
        });
      }
    });
    secPools[sid]=byUnit;
  });
  const secQuotas={};
  _largestRemainderSplit(count,sectionIds.length).forEach((q,i)=>{secQuotas[sectionIds[i]]=q;});
  const picked=[];
  const leftoverPool=[];   // surplus questions (available but past their unit's quota) — backfill source
  let totalShortfall=0;
  sectionIds.forEach(sid=>{
    const byUnit=secPools[sid]||{};
    const unitIds=Object.keys(byUnit);
    const quota=secQuotas[sid]||0;
    const unitQuotas={};
    _largestRemainderSplit(quota,unitIds.length).forEach((q,i)=>{unitQuotas[unitIds[i]]=q;});
    let filled=0;
    unitIds.forEach(uid=>{
      const pool=byUnit[uid].slice();
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      const take=Math.min(unitQuotas[uid]||0,pool.length);
      picked.push(...pool.slice(0,take));
      filled+=take;
      leftoverPool.push(...pool.slice(take));   // unused surplus from this unit
    });
    if(filled<quota)totalShortfall+=(quota-filled);
  });
  // Redistribute shortfall from whatever surplus exists elsewhere in the exam.
  if(totalShortfall>0&&leftoverPool.length){
    for(let i=leftoverPool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[leftoverPool[i],leftoverPool[j]]=[leftoverPool[j],leftoverPool[i]];}
    while(totalShortfall>0&&leftoverPool.length){picked.push(leftoverPool.pop());totalShortfall--;}
  }
  if(picked.length<count){
    return {ok:false,message:'Only '+picked.length+' in-scope questions available across your selection (need '+count+'). Reduce Question count or select more units/sections.'};
  }
  const finalShuffled=picked.slice();
  for(let i=finalShuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[finalShuffled[i],finalShuffled[j]]=[finalShuffled[j],finalShuffled[i]];}
  return {ok:true,questionIds:finalShuffled.slice(0,count)};
}







// ═════════════════════════════════════════════════════════════════════
// BATCH 2 — GROUP-SCOPED DASHBOARD ARCHITECTURE
//
// The previous loadDashboardP1() fetched EVERY doc from EVERY dashboard
// collection on every open — fine at 50 students, unsustainable at 320.
//
// New split:
//   loadDashGroupsList()          — unscoped, cheap. Groups + full student
//                                    roster (for chip counts). ~50 reads
//                                    total, cached across group switches.
//   loadDashScopedData(groupCode) — per-group scoped. Lectures, teaching-log,
//                                    exams, live pointer filtered to one
//                                    group. Re-fires on group switch.
//   loadLectureAttendance(id)     — on-demand per-lecture attendance. Only
//                                    fires when instructor taps a specific
//                                    lecture's attendance list.
//
// Cost profile at target scale (8 groups × 40 students × 15 lectures):
//   BEFORE Batch 2: ~4,800 reads/dashboard-open   (unusable at 6 months)
//   AFTER  Batch 2:   ~120 reads/dashboard-open   (98% reduction)
// ═════════════════════════════════════════════════════════════════════








// ==== INSTRUCTOR DASHBOARD — PHASE 2a (Lectures + live pointer) ====
// Data model:
//   lectures/{id}    : {title, groupCode, date, status:'scheduled'|'ended', createdAt, createdBy}
//   live/{GROUPCODE} : {lectureId, title, openedAt}  (open)  |  {lectureId:null}  (closed)
// "One live per group" is STRUCTURAL — the live doc key IS the group code.
// A lecture is "live" iff  STATE.dashLive[groupCode].lectureId === lecture.id.




// Batch 11: feedback window is COMPUTED from checkinClosedAt, same pattern as
// _liveWindowOpen() for check-in — no write needed at the exact close moment,
// and multiple lectures can have independently-running windows.
function isFeedbackOpen(lec){
  if(!lec||!lec.checkinClosedAt)return false;
  const elapsed=Date.now()-Date.parse(lec.checkinClosedAt);
  return elapsed>=0 && elapsed<7*24*60*60*1000;
}



// ─── RENDER DASHBOARD: EXAMS ─────────────────────────────────────────
// ══ Batch 6: Exam Preview — instructor read-only view of frozen questions ══
// Uses the existing frozen questions snapshot on each exam doc (Batch 1).
// Rules: instructor-only access via existing signed-in read on /exams.











// Instructor-only Dashboard tab appended to the student nav.
function getNavTabs(){
  return isInstructor() ? [...TABS,{id:'dashboard',label:'Dashboard',icon:'\u{1F6E1}\uFE0F'}] : TABS;
}





// ==== PORTED STUDENT-LAYER FEATURES (from FMAA) ====

// --- fontsize+dailygoal ---
function loadFontSize(){try{return localStorage.getItem('cma-fontsize-v1')||'md';}catch{return 'md';}}
function saveFontSize(v){try{localStorage.setItem('cma-fontsize-v1',v);}catch{}STATE.fontSize=v;applyFontSize();}
function applyFontSize(){const c=document.getElementById('content-area');if(!c)return;const map={sm:'.9',md:'1',lg:'1.15'};c.style.zoom=map[STATE.fontSize]||'1';}
function loadDailyGoal(){try{const v=parseInt(localStorage.getItem('cma-goal-v1'));return v>0?v:30;}catch{return 30;}}
function saveDailyGoal(mins){const v=Math.max(5,Math.min(240,parseInt(mins)||30));try{localStorage.setItem('cma-goal-v1',String(v));}catch{}STATE.dailyGoalMinutes=v;if(STATE.user)db.collection('students').doc(STATE.user.uid).set({dailyGoalMinutes:v},{merge:true}).catch(()=>{});}
function todayStudyMinutes(){const st=loadStudyTime();const today=new Date().toDateString();return st.todayDate===today?(st.todayMinutes||0):0;}

// --- buildAllNotes ---
function buildAllNotes(){const out=[];S.forEach(sec=>{sec.lessons.forEach(l=>{const t=loadLessonNote(l.id);if(t&&t.trim())out.push({lessonId:l.id,lessonTitle:l.title,sec,text:t.trim()});});});return out;}

// --- flashcards ---
async function buildAllFlashcards(){await Promise.all([1,2,3,4,5,6].map(i=>ensureLessons(i)));const cards=[];S.forEach(sec=>{sec.lessons.forEach(l=>{(l.blocks||[]).forEach((b,i)=>{if(b.t==='def'&&b.term){cards.push({id:`${l.id}:def:${i}`,type:'def',front:b.term,back:b.v||'',sec,lessonId:l.id,lessonTitle:l.title});}else if(b.t==='f'&&b.l){cards.push({id:`${l.id}:f:${i}`,type:'f',front:b.l,back:(b.v||'').replace(/\n/g,'\n'),sec,lessonId:l.id,lessonTitle:l.title});}});});});return cards;}
function loadFlashReviewSet(){try{const d=localStorage.getItem('cma-flash-review-v1');return d?JSON.parse(d):[];}catch{return[];}}
function saveFlashReviewSet(arr){try{localStorage.setItem('cma-flash-review-v1',JSON.stringify(arr));}catch{}}
function toggleFlashReview(cardId){const rs=loadFlashReviewSet();const i=rs.indexOf(cardId);if(i>=0)rs.splice(i,1);else rs.push(cardId);saveFlashReviewSet(rs);}
async function ensureFlashcards(){if(STATE.flashcards&&STATE.flashcards.length)return;STATE.flashcards=await buildAllFlashcards();}
function filteredFlashcards(){const all=STATE.flashcards||[];const f=STATE.flashcardsFilter;const mode=STATE.flashcardsMode;let out=all;if(f!=='all'){const sid=parseInt(f);out=out.filter(c=>c.sec&&c.sec.id===sid);}if(mode==='review'){const rs=new Set(loadFlashReviewSet());out=out.filter(c=>rs.has(c.id));}return out;}
function flashNext(){const list=filteredFlashcards();if(!list.length)return;STATE.flashcardsIdx=(STATE.flashcardsIdx+1)%list.length;STATE.flashcardsFlipped=false;render();}
function flashPrev(){const list=filteredFlashcards();if(!list.length)return;STATE.flashcardsIdx=(STATE.flashcardsIdx-1+list.length)%list.length;STATE.flashcardsFlipped=false;render();}
function flashFlip(){STATE.flashcardsFlipped=!STATE.flashcardsFlipped;render();}
function flashSetFilter(v){STATE.flashcardsFilter=v;STATE.flashcardsIdx=0;STATE.flashcardsFlipped=false;render();}
function flashSetMode(v){STATE.flashcardsMode=v;STATE.flashcardsIdx=0;STATE.flashcardsFlipped=false;render();}
function flashMarkReview(cardId){toggleFlashReview(cardId);showToast('Marked for review','info',1500);render();}
function flashMarkKnow(cardId){const rs=loadFlashReviewSet();const i=rs.indexOf(cardId);if(i>=0){rs.splice(i,1);saveFlashReviewSet(rs);}flashNext();}

// --- qotd+helpers ---
function _hashCode(s){let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}return Math.abs(h);}
function _todayKey(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function loadQotdState(){try{const d=localStorage.getItem('cma-qotd-v1');return d?JSON.parse(d):{};}catch{return{};}}
function saveQotdState(v){try{localStorage.setItem('cma-qotd-v1',JSON.stringify(v));}catch{}}
async function ensureQotd(){const st=loadStudent();if(!st||!st.groupCode||!STATE.user)return;const dateKey=_todayKey();const stored=loadQotdState();const key=st.groupCode+'|'+dateKey;const already=stored[key];if(STATE.qotdState.dateKey===dateKey&&STATE.qotdState.question)return;
  try{const snap=await db.collection('teaching-log').where('groupCode','==',st.groupCode.toUpperCase()).get();const entries=snap.docs.map(d=>d.data());const taughtSet=new Set();entries.forEach(e=>(e.unitIds||[]).forEach(u=>taughtSet.add(u)));if(!taughtSet.size){STATE.qotdState={dateKey,question:null,taughtUnitCount:0,answered:false,selected:null};return;}
    const secIds=[...new Set([...taughtSet].map(u=>parseInt(u.split('-')[0])).filter(n=>n>0))];await Promise.all(secIds.map(i=>ensureQuizzes(i)));const pool=[];S.forEach(sec=>{sec.lessons.forEach(l=>{if(l.outOfScope)return;if(taughtSet.has(l.id)&&l.quizzes&&l.quizzes.length)l.quizzes.forEach(q=>{if(isOutOfScopeQ(l,q))return;pool.push({...q,secId:sec.id,secTitle:sec.title,secBar:sec.bar,lessonTitle:l.title});});});});if(!pool.length){STATE.qotdState={dateKey,question:null,taughtUnitCount:taughtSet.size,answered:false,selected:null};return;}
    const seed=_hashCode(st.groupCode+'|'+dateKey);const q=shuffleQuestionOptions(pool[seed%pool.length]);STATE.qotdState={dateKey,question:q,taughtUnitCount:taughtSet.size,answered:!!(already&&already.answered),selected:already?already.selected:null};if(STATE.tab==='intro')render();
  }catch(e){console.warn('QoD load failed:',e);}
}
function qotdAnswer(i){const st=loadStudent();if(!st||!st.groupCode)return;const q=STATE.qotdState.question;if(!q||STATE.qotdState.answered)return;STATE.qotdState.selected=i;STATE.qotdState.answered=true;const dateKey=_todayKey();const key=st.groupCode+'|'+dateKey;const stored=loadQotdState();stored[key]={answered:true,selected:i,correct:i===q.a};saveQotdState(stored);const p=STATE.progress;saveProg({...p,mcqTotal:(p.mcqTotal||0)+1,mcqRight:(p.mcqRight||0)+(i===q.a?1:0)});updateStreak();render();}

// ─── LESSON PREV/NEXT ────────────────────────────────────────────────────

// --- shuffle ---
// ═════════════════════════════════════════════════════════════════════
// PHASE 3a-ii — GROUP EXAMS (student taking surface)
//
// State machine:
//   Home strip (renderExamsStrip) → student clicks Start (or Retake) →
//   startExam() creates exam-results/{examId_uid_aN} doc — one per attempt,
//   N = attempt number — with submitted:false, seeds the deterministic
//   question set, saves the session locally, opens the full-screen runner.
//   Runner persists to localStorage on every answer so a refresh survives.
//   Timer computes remaining from stored deadlineAt. Submit grades locally,
//   writes the final result to that same attempt doc, clears local.
//
// Determinism: seededShuffle(pool, examId+uid[+attemptN]) picks questions; a
//   second stream from the same seed reshuffles each question's options.
//   Same student gets the same exam on a given attempt; refresh cannot
//   change it. Attempt 2+ gets a distinct seed so retake order differs
//   (Batch 20) while the underlying frozen question SET stays identical.
//
// Retakes (Batch 20): capped at exam.maxAttempts (instructor-set at
//   creation, default 3). Full attempt history is preserved — nothing is
//   overwritten — and the instructor's Results tab shows every attempt.
// Deadline: min(startedAt + durationMinutes, exam.closesAt) — hard stop.
// ═════════════════════════════════════════════════════════════════════

// ── Deterministic PRNG (mulberry32) + seeded shuffle utilities ───────
function _hashStr(s){
  let h=0x811c9dc5;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}
  return h>>>0;
}
function _mulberry32(seed){
  let a=seed>>>0;
  return function(){
    a=(a+0x6D2B79F5)>>>0;
    let t=a;
    t=Math.imul(t^t>>>15,t|1);
    t^=t+Math.imul(t^t>>>7,t|61);
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
function seededShuffle(arr,seedStr){
  const rand=_mulberry32(_hashStr(seedStr));
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function seededShuffleOptions(q,rand){
  const idx=q.o.map((_,i)=>i);
  for(let i=idx.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [idx[i],idx[j]]=[idx[j],idx[i]];
  }
  const newOpts=idx.map(i=>q.o[i]);
  const newA=idx.indexOf(q.a);
  const newWW={};
  if(q.wrongWhy){for(const[k,v]of Object.entries(q.wrongWhy)){const nk=idx.indexOf(Number(k));if(nk>=0)newWW[nk]=v;}}
  return{...q,o:newOpts,a:newA,wrongWhy:Object.keys(newWW).length?newWW:q.wrongWhy};
}

// ── Local session persistence (survives refresh) ─────────────────────
// Batch 20: key now includes attempt number so a retake's in-progress local
// cache can never collide with (or resume into) a prior attempt's leftovers.
function _examLocalKey(examId,attemptNumber){return 'cma-exam-session-v1:'+examId+(attemptNumber>1?':a'+attemptNumber:'');}
function _examSaveLocal(sess){
  if(!sess||!sess.examId)return;
  try{
    localStorage.setItem(_examLocalKey(sess.examId,sess.attemptNumber||1),JSON.stringify({
      examId:sess.examId,attemptNumber:sess.attemptNumber||1,docId:sess.docId,
      answers:sess.answers,currentIdx:sess.currentIdx,
      startedAt:sess.startedAt,deadlineAt:sess.deadlineAt,submitted:sess.submitted,
      flagged:sess.flagged||{}   // Batch 11: mark-for-review, survives reload/resume
    }));
  }catch{}
}
function _examLoadLocal(examId,attemptNumber){
  try{const d=localStorage.getItem(_examLocalKey(examId,attemptNumber||1));return d?JSON.parse(d):null;}catch{return null;}
}
function _examClearLocal(examId,attemptNumber){try{localStorage.removeItem(_examLocalKey(examId,attemptNumber||1));}catch{}}

// ── Load student's group exams (lazy, cached in STATE) ────────────────
// Batch 20: an exam can now have MULTIPLE exam-results docs for the same
// student (one per attempt, doc id `${examId}_${uid}_a${attemptNumber}`),
// so this fetches every attempt doc for the student on each exam (compound
// equality query — examId==X AND userId==Y — needs no manual Firestore
// index) and derives a summary: attemptsUsed, the latest submitted attempt
// (for the Home strip score), and any in-progress attempt to resume.
async function loadStudentExams(){
  if(STATE.studentExamsLoaded)return;
  const st=loadStudent();
  if(!st||!st.groupCode){STATE.studentExamsLoaded=true;STATE.studentExams=[];return;}
  try{
    const g=st.groupCode.toUpperCase();
    const snap=await db.collection('exams').where('groupCode','==',g).get();
    STATE.studentExams=snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(a.opensAt||'')>(b.opensAt||'')?1:-1);
    STATE.studentExamsLoaded=true;
    if(STATE.studentExams.length&&STATE.user){
      const results={};
      await Promise.all(STATE.studentExams.map(async ex=>{
        try{
          const asnap=await db.collection('exam-results')
            .where('examId','==',ex.id).where('userId','==',STATE.user.uid).get();
          const attempts=asnap.docs.map(d=>({_docId:d.id,...d.data()}))
            .sort((a,b)=>(a.attemptNumber||1)-(b.attemptNumber||1));
          if(!attempts.length)return;
          const submitted=attempts.filter(a=>a.submitted);
          const inProgress=attempts.find(a=>!a.submitted)||null;
          const latestSubmitted=submitted.length?submitted[submitted.length-1]:null;
          results[ex.id]={
            attemptsUsed:attempts.length,
            attempts,inProgress,
            ...(latestSubmitted||{})   // spread last submitted attempt's fields for existing card/strip code
          };
        }catch{}
      }));
      STATE.studentExamResults=results;
    }
    if(STATE.tab==='intro')render();
  }catch(e){
    console.warn('[Student Exams] load failed:',e);
    STATE.studentExamsLoaded=true;STATE.studentExams=[];
  }
}

// ── Build the deterministic question set for this student ──────────────
// Batch 5: if exam has a frozen `questionIds` array, look up those questions
// from the section pool by qid (format: `${lessonId}:${qid||index}`). Every
// student sees the SAME set; only ORDER and OPTION ORDER are shuffled per-uid.
// Legacy exams (created before Batch 5) fall through to the pool-random path.
async function buildExamQuestions(exam,uid,attemptNumber){
  // Batch 11: multi-section aware. Legacy single-section exams (sectionId
  // only, no sectionIds array) still work unchanged via the fallback.
  const sectionIds=Array.isArray(exam.sectionIds)&&exam.sectionIds.length?exam.sectionIds:[exam.sectionId];
  const unitsBySection=exam.unitsBySection||(exam.unitIds?{[exam.sectionId]:exam.unitIds}:{});
  await Promise.all(sectionIds.map(sid=>ensureQuizzes(sid)));
  // Build a full pool with qid keys so we can resolve frozen sets and honor unit filter
  const poolAll=[];
  sectionIds.forEach(sid=>{
    const sec=S.find(s=>s.id===sid);
    if(!sec)return;
    const unitIds=Array.isArray(unitsBySection[sid])?unitsBySection[sid].map(String).filter(Boolean):[];
    const lessonMatch=(lid)=>!unitIds.length||unitIds.includes(String(lid));
    sec.lessons.forEach(l=>{
      if(!lessonMatch(l.id))return;
      if(l.quizzes&&l.quizzes.length)l.quizzes.forEach((q,i)=>{
        if(isOutOfScopeQ(l,q))return;   // Batch 12: close the exam-builder leak — legacy no-questionIds
                                         // exams and the missing-id filler top-up below both drew from
                                         // this pool unfiltered, risking Part-2 content in a graded exam.
        const qid=l.id+':'+(q.id||i);
        poolAll.push({...q,_qid:qid,_lid:l.id,_ltitle:l.title});
      });
    });
  });
  if(!poolAll.length)return[];
  // Batch 20: attempt 1 keeps the original seed (unchanged for backward
  // compatibility with reviews of exams submitted before retakes existed).
  // Attempt 2+ gets a distinct seed so the question ORDER (and option order,
  // via seededShuffleOptions below) differs on each retake — same frozen
  // question SET, per the retake spec (shuffled order, not a different pool).
  const seed=exam.id+':'+uid+((attemptNumber&&attemptNumber>1)?':a'+attemptNumber:'');
  const rand=_mulberry32(_hashStr(seed));
  let picked;
  if(Array.isArray(exam.questionIds)&&exam.questionIds.length){
    // Batch 5 path — resolve frozen set in order, then per-uid shuffle
    const map=new Map(poolAll.map(q=>[q._qid,q]));
    picked=exam.questionIds.map(qid=>map.get(qid)).filter(Boolean);
    // If some frozen IDs are missing (e.g. content rebuild), top up from pool
    if(picked.length<exam.count){
      const have=new Set(picked.map(q=>q._qid));
      const filler=poolAll.filter(q=>!have.has(q._qid));
      // fill up to exam.count
      while(picked.length<exam.count&&filler.length){
        const j=Math.floor(rand()*filler.length);
        picked.push(filler.splice(j,1)[0]);
      }
    }
  }else{
    // Legacy path — deterministic pool shuffle & slice (backward compat)
    picked=poolAll.slice();
  }
  // Shuffle picked order per-uid
  const shuffled=picked.slice();
  for(let i=shuffled.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
  }
  const finalPicked=shuffled.slice(0,Math.min(exam.count,shuffled.length));
  return finalPicked.map(q=>seededShuffleOptions(q,rand));
}

// ── Start / Resume / Answer / Submit ───────────────────────────────────
async function startExam(examId){
  const exam=STATE.studentExams.find(e=>e.id===examId);
  if(!exam)return;
  const status=examWindowStatus(exam);
  if(status!=='active'){showToast('This exam is not currently open.','warning');return;}
  const existing=(STATE.studentExamResults||{})[examId];
  const maxAttempts=exam.maxAttempts||3;   // Batch 20: instructor-configurable, defaults to 3
  const attemptsUsed=existing?(existing.attemptsUsed||0):0;
  const inProgress=existing&&existing.inProgress;   // an unsubmitted attempt to resume

  if(!inProgress&&attemptsUsed>=maxAttempts){
    showToast('You\u2019ve used all '+maxAttempts+' attempt'+(maxAttempts===1?'':'s')+' for this exam.','warning');
    return;
  }

  const resumeMode=!!inProgress;
  const attemptNumber=resumeMode?(inProgress.attemptNumber||1):attemptsUsed+1;
  const isRetake=!resumeMode&&attemptsUsed>0;
  const modalTitle=resumeMode?'Resume '+exam.title+'?':(isRetake?'Retake '+exam.title+'?':'Start '+exam.title+'?');
  // Batch 8: the modal body is set via textContent, so inline <b>/<br> HTML
  // showed up as literal text. Move the structured details into the list param
  // (which renders as bullets) and keep body as a single plain line.
  const modalBody=resumeMode
    ?'⏱️ Time remaining is calculated from when you first started. Any answers you saved earlier are restored.'
    :'⚠️ Timer starts immediately. The exam auto-submits at the deadline.';
  const modalList=resumeMode?null:[
    '⏱️ Duration: '+exam.durationMinutes+' minutes',
    '📊 Questions: '+exam.count+(isRetake?' (same questions, new shuffled order)':''),
    '🔁 Attempt '+attemptNumber+' of '+maxAttempts
  ];
  const ok=await showModal({
    icon:'\u{1F4DD}',title:modalTitle,body:modalBody,list:modalList,
    type:'primary',confirmText:resumeMode?'Resume':(isRetake?'Retake Now':'Start Now'),cancelText:'Not Yet'
  });
  if(!ok)return;

  let startedAt,deadlineAt,answers,currentIdx,flagged,docId;
  if(resumeMode){
    docId=inProgress._docId;
    startedAt=inProgress.startedAt;
    deadlineAt=inProgress.deadlineAt;
    const local=_examLoadLocal(examId,attemptNumber);
    answers=(local&&local.answers)||{};
    currentIdx=(local&&local.currentIdx)||0;
    flagged=(local&&local.flagged)||{};   // Batch 11: restore flags on resume
  }else{
    startedAt=new Date().toISOString();
    const byDur=Date.now()+exam.durationMinutes*60000;
    const byClose=exam.closesAt?Date.parse(exam.closesAt):byDur;
    deadlineAt=new Date(Math.min(byDur,byClose)).toISOString();
    answers={};currentIdx=0;flagged={};
    // Batch 20: doc id now includes the attempt number so each attempt is
    // its own document (full history preserved) instead of overwriting the
    // single prior doc that the old `${examId}_${uid}` id produced.
    docId=examId+'_'+STATE.user.uid+'_a'+attemptNumber;
    try{
      await db.collection('exam-results').doc(docId).set({
        examId,userId:STATE.user.uid,groupCode:exam.groupCode,sectionId:exam.sectionId,
        attemptNumber,startedAt,deadlineAt,answers:{},submitted:false
      });
    }catch(e){showToast('Could not start exam: '+e.message,'error');return;}
  }

  const questions=await buildExamQuestions(exam,STATE.user.uid,attemptNumber);
  if(!questions.length){showToast('No questions available for this section yet.','error');return;}

  STATE.examSession={
    examId,docId,attemptNumber,maxAttempts,exam,questions,answers,currentIdx,flagged,
    startedAt,deadlineAt,submitting:false,submitted:false,results:null,navOpen:false
  };
  _examSaveLocal(STATE.examSession);
  STATE.tab='exam';render();
  _examStartTimer();
}

let _examTimerInterval=null;
function _examStartTimer(){
  _examStopTimer();
  _examTimerInterval=setInterval(()=>{
    if(STATE.tab!=='exam'||!STATE.examSession||STATE.examSession.submitted){_examStopTimer();return;}
    const remaining=Date.parse(STATE.examSession.deadlineAt)-Date.now();
    const el=document.getElementById('exam-timer');
    if(el){
      const s=Math.max(0,Math.floor(remaining/1000));
      const mm=String(Math.floor(s/60)).padStart(2,'0');
      const ss=String(s%60).padStart(2,'0');
      el.textContent=mm+':'+ss;
      el.style.color=remaining<60000?'var(--err)':remaining<300000?'#D2691E':'var(--ink)';
    }
    if(remaining<=0){_examStopTimer();submitExam(true);}
  },1000);
}
function _examStopTimer(){if(_examTimerInterval){clearInterval(_examTimerInterval);_examTimerInterval=null;}}

function examAnswer(qIdx,optIdx){
  if(!STATE.examSession||STATE.examSession.submitted)return;
  STATE.examSession.answers[qIdx]=optIdx;
  _examSaveLocal(STATE.examSession);
  _examRenderRunner();
}
// Batch 11: personal navigation aid only — never sent to Firestore, cleared
// with the rest of local exam state on submit (_examClearLocal).
function examToggleFlag(qIdx){
  if(!STATE.examSession||STATE.examSession.submitted)return;
  STATE.examSession.flagged=STATE.examSession.flagged||{};
  if(STATE.examSession.flagged[qIdx])delete STATE.examSession.flagged[qIdx];
  else STATE.examSession.flagged[qIdx]=true;
  _examSaveLocal(STATE.examSession);
  _examRenderRunner();
}
function examGoTo(idx){
  if(!STATE.examSession||STATE.examSession.submitted)return;
  const max=STATE.examSession.questions.length-1;
  STATE.examSession.currentIdx=Math.max(0,Math.min(max,idx));
  STATE.examSession.navOpen=false;
  _examSaveLocal(STATE.examSession);
  _examRenderRunner();
}
function examNavToggle(){
  if(!STATE.examSession)return;
  STATE.examSession.navOpen=!STATE.examSession.navOpen;
  _examRenderRunner();
}

async function submitExam(auto){
  const sess=STATE.examSession;
  if(!sess||sess.submitted||sess.submitting)return;
  if(!auto){
    const answered=Object.keys(sess.answers).length;
    const total=sess.questions.length;
    const ok=await showModal({
      icon:answered<total?'\u26A0\uFE0F':'\u2705',
      title:'Submit Exam?',
      body:answered<total
        ?'You have answered <b>'+answered+' of '+total+'</b> questions. Unanswered questions will be marked wrong. This action cannot be undone.'
        :'You have answered all '+total+' questions. Submit for grading?',
      type:answered<total?'danger':'primary',
      confirmText:'Submit',cancelText:'Keep Going'
    });
    if(!ok)return;
  }
  sess.submitting=true;_examStopTimer();
  let score=0;
  let unanswered=0;
  const answersOut=[];
  // Batch 11: per-lesson miss tally -> surfaces the weakest unit on the result screen.
  const missByLesson={};
  sess.questions.forEach((q,i)=>{
    const picked=sess.answers[i];
    const correct=picked===q.a;
    if(correct)score++;
    else{
      const lid=q._lid||'';
      if(!missByLesson[lid])missByLesson[lid]={count:0,title:q._ltitle||lid};
      missByLesson[lid].count++;
    }
    if(picked==null)unanswered++;
    answersOut.push({picked:picked==null?null:picked,correct});
  });
  const total=sess.questions.length;
  const percentage=total?Math.round(score/total*100):0;
  const submittedAt=new Date().toISOString();
  // Batch 11: actual time consumed + simple per-question average (overall
  // average only — per-question timestamps aren't captured in the exam
  // runner the way Quiz Mode's questionTimes[] are).
  const timeMs=Math.max(0,Date.parse(submittedAt)-Date.parse(sess.startedAt||submittedAt));
  const avgMsPerQ=total?Math.round(timeMs/total):0;
  // Batch 11: per-section correct/total — trivial for today's single-section
  // exams, becomes meaningful once multi-section exams ship.
  const bySection={};
  sess.questions.forEach((q,i)=>{
    const sid=(q._lid||'').split('-')[0]||'?';
    if(!bySection[sid])bySection[sid]={correct:0,total:0};
    bySection[sid].total++;
    if(answersOut[i].correct)bySection[sid].correct++;
  });
  const weakestLesson=Object.values(missByLesson).sort((a,b)=>b.count-a.count)[0]||null;
  try{
    const st=loadStudent()||{};
    const questionSnapshot=sess.questions.map(q=>({q:q.q,o:q.o,a:q.a,e:q.e||'',wrongWhy:q.wrongWhy||null,_lid:q._lid||'',_ltitle:q._ltitle||''}));

    if(sess.isPractice){
      // Batch 20 (item 9): custom practice tests are personal-only — written
      // to a separate collection with no groupCode/sectionId (an exam-results
      // doc implies a shared, instructor-visible assignment; this isn't one).
      const docRef=await db.collection('custom-practice-results').add({
        examId:sess.examId,userId:STATE.user.uid,title:(sess.exam&&sess.exam.title)||'Custom Practice Test',
        startedAt:sess.startedAt,deadlineAt:sess.deadlineAt,
        answers:answersOut,questionSnapshot,score,total,percentage,
        submitted:true,submittedAt,autoSubmitted:!!auto
      });
      sess.docId=docRef.id;
      sess.submitted=true;
      sess.results={
        score,total,percentage,autoSubmitted:!!auto,submittedAt,
        unanswered,timeMs,avgMsPerQ,bySection,weakestLesson,
        passed:percentage>=EXAM_PASS_THRESHOLD
      };
      sess.submitting=false;
      _examClearLocal(sess.examId,1);
      STATE.practiceHistory=[{_docId:docRef.id,examId:sess.examId,userId:STATE.user.uid,
        title:(sess.exam&&sess.exam.title)||'Custom Practice Test',
        score,total,percentage,submitted:true,submittedAt,autoSubmitted:!!auto,
        startedAt:sess.startedAt,questionSnapshot},...(STATE.practiceHistory||[])];
      render();
      if(auto)showToast('\u23F0 Time up — practice test auto-submitted.','warning',4000);
      else showToast('\u2705 Practice test submitted.','success');
      return;
    }

    const docId=sess.docId||(sess.examId+'_'+STATE.user.uid+'_a'+(sess.attemptNumber||1));
    const attemptNumber=sess.attemptNumber||1;
    await db.collection('exam-results').doc(docId).set({
      examId:sess.examId,userId:STATE.user.uid,studentName:st.name||STATE.user.displayName||'Student',
      groupCode:sess.exam.groupCode,sectionId:sess.exam.sectionId,attemptNumber,
      startedAt:sess.startedAt,deadlineAt:sess.deadlineAt,
      answers:answersOut,questionSnapshot,score,total,percentage,
      submitted:true,submittedAt,autoSubmitted:!!auto
    },{merge:true});
    sess.submitted=true;
    sess.results={
      score,total,percentage,autoSubmitted:!!auto,submittedAt,
      unanswered,timeMs,avgMsPerQ,bySection,weakestLesson,
      passed:percentage>=EXAM_PASS_THRESHOLD
    };
    sess.submitting=false;
    _examClearLocal(sess.examId,attemptNumber);
    // Batch 20: keep the attempts/attemptsUsed shape loadStudentExams builds
    // — this attempt is now submitted, so it's no longer "in progress", and
    // it becomes the latest submitted attempt shown on the Home strip card.
    STATE.studentExamResults=STATE.studentExamResults||{};
    const prior=STATE.studentExamResults[sess.examId]||{attemptsUsed:0,attempts:[]};
    const thisAttempt={_docId:docId,examId:sess.examId,userId:STATE.user.uid,attemptNumber,
      score,total,percentage,submitted:true,submittedAt,autoSubmitted:!!auto,
      startedAt:sess.startedAt,deadlineAt:sess.deadlineAt};
    const attempts=(prior.attempts||[]).filter(a=>a.attemptNumber!==attemptNumber).concat([thisAttempt])
      .sort((a,b)=>(a.attemptNumber||1)-(b.attemptNumber||1));
    STATE.studentExamResults[sess.examId]={
      attemptsUsed:attempts.length,attempts,inProgress:null,
      ...thisAttempt
    };
    render();
    if(auto)showToast('\u23F0 Time up — exam auto-submitted.','warning',4000);
    else showToast('\u2705 Exam submitted.','success');
  }catch(e){
    sess.submitting=false;
    showToast('Submission failed. Your answers are saved — please try again.','error',4000);
    _examStartTimer();
  }
}

function exitExam(){
  if(STATE.examSession&&!STATE.examSession.submitted){
    showToast('Submit the exam first.','warning');return;
  }
  const returnTab=STATE.examSession&&STATE.examSession.instructorReturnTab;
  _examStopTimer();
  STATE.examSession=null;
  if(returnTab){
    STATE.tab=returnTab;
    render();
    return;
  }
  STATE.studentExamsLoaded=false;
  STATE.tab='intro';
  loadStudentExams();
  render();
}

// ═════ RENDERERS ══════════════════════════════════════════════════════

// Home strip — shown atop renderIntro when the student's group has exams.
function renderExamsStrip(){
  const st=loadStudent();
  if(!STATE.user||isInstructor()||!st||!st.groupCode)return '';
  if(!STATE.studentExamsLoaded){
    loadStudentExams();
    // Batch 2 ride-along: subtle skeleton while we check for exams.
    // Prevents the "empty gap → sudden pop-in" flicker on Home load.
    return '<div style="margin-bottom:14px"><div class="gs-skeleton-card" style="border-radius:12px"><div class="gs-skeleton-line short"></div><div class="gs-skeleton-line long"></div><div class="gs-skeleton-line medium"></div></div></div>';
  }
  const exams=STATE.studentExams||[];
  if(!exams.length)return '';
  const results=STATE.studentExamResults||{};

  const fmtDT=(iso)=>{if(!iso)return '';try{return new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch{return iso;}};
  const fmtCountdown=(iso)=>{
    if(!iso)return '';
    const ms=Date.parse(iso)-Date.now();
    if(ms<=0)return 'now';
    const mins=Math.floor(ms/60000);
    if(mins<60)return 'in '+mins+' min';
    const hrs=Math.floor(mins/60);
    if(hrs<24)return 'in '+hrs+'h '+(mins%60)+'m';
    const days=Math.floor(hrs/24);
    return 'in '+days+' day'+(days===1?'':'s');
  };

  const active=exams.filter(e=>examWindowStatus(e)==='active'&&!(results[e.id]&&results[e.id].submitted));
  const scheduled=exams.filter(e=>examWindowStatus(e)==='scheduled');
  const completed=exams.filter(e=>results[e.id]&&results[e.id].submitted).slice(0,2);
  const cards=[...active,...scheduled,...completed].slice(0,3);
  if(!cards.length)return '';

  const cardHTML=(ex)=>{
    const st=examWindowStatus(ex);
    const res=results[ex.id];
    const submitted=res&&res.submitted;
    let banner,body,btn;
    if(submitted){
      banner={bg:'linear-gradient(135deg,var(--ok-strong-2),var(--ok))',label:'\u2705 COMPLETED'};
      // Batch 11: show when the exam was taken (was missing entirely).
      const takenDate=res.submittedAt?fmtDT(res.submittedAt):'';
      // Batch 20: attempt count + Retake (or Resume, if a retake is mid-way).
      const maxAttempts=ex.maxAttempts||3;
      const attemptsUsed=res.attemptsUsed||1;
      body='Score: <b>'+res.score+'/'+res.total+'</b> \u00B7 '+res.percentage+'%'+(takenDate?' \u00B7 '+takenDate:'')
        +' \u00B7 Attempt '+(res.attemptNumber||attemptsUsed)+' of '+maxAttempts;
      const reviewBtn='<button onclick="openExamReview(\''+ex.id+'\')" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;margin-right:6px">Review \u2192</button>';
      let secondBtn='';
      if(res.inProgress){
        secondBtn='<button onclick="startExam(\''+ex.id+'\')" style="background:#fff;color:var(--ok-strong-2);border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Resume Attempt '+(res.inProgress.attemptNumber||attemptsUsed)+' \u2192</button>';
      }else if(attemptsUsed<maxAttempts&&st==='active'){
        secondBtn='<button onclick="startExam(\''+ex.id+'\')" style="background:#fff;color:var(--ok-strong-2);border:none;border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F501} Retake \u2192</button>';
      }
      btn=reviewBtn+secondBtn;
    }else if(st==='active'){
      const inProgress=_examLoadLocal(ex.id,1);
      banner={bg:'linear-gradient(135deg,var(--brand),var(--brand-2))',label:inProgress?'\u25B6\uFE0F RESUME':'\u{1F7E2} ACTIVE'};
      body='<b>'+ex.count+'</b> Qs \u00B7 <b>'+ex.durationMinutes+'</b> min \u00B7 closes '+fmtCountdown(ex.closesAt);
      btn='<button onclick="startExam(\''+ex.id+'\')" style="background:#fff;color:var(--brand);border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+(inProgress?'Resume \u2192':'Start Exam \u2192')+'</button>';
    }else if(st==='scheduled'){
      banner={bg:'linear-gradient(135deg,#7A5A00,#B57E00)',label:'\u23F3 SCHEDULED'};
      body='Opens '+fmtCountdown(ex.opensAt)+' \u00B7 '+fmtDT(ex.opensAt);
      btn='<span style="font-size:11px;color:rgba(255,255,255,.75)">'+ex.count+' Qs \u00B7 '+ex.durationMinutes+' min</span>';
    }else{
      return '';
    }
    return '<div style="background:'+banner.bg+';border-radius:12px;padding:14px 16px;color:#fff;margin-bottom:10px;box-shadow:0 2px 6px rgba(0,0,0,.08)">'
      +'<div style="font-size:10px;font-weight:700;letter-spacing:.6px;opacity:.9;margin-bottom:4px">'+banner.label+'</div>'
      +'<div style="font-size:15px;font-weight:600;line-height:1.3;margin-bottom:4px">'+esc(ex.title)+'</div>'
      +'<div style="font-size:12px;opacity:.9;margin-bottom:10px">'+body+'</div>'
      +'<div>'+btn+'</div>'
      +'</div>';
  };
  const inner=cards.map(cardHTML).filter(Boolean).join('');
  if(!inner)return '';
  return '<div style="margin-bottom:14px">'+inner+'</div>';
}

// Full-screen runner + result. Dispatcher case: 'exam'
function renderExam(){
  if(!STATE.examSession)return renderIntro();
  if(STATE.examSession.reviewMode)return renderExamReview();
  if(STATE.examSession.submitted)return renderExamResult();
  return renderExamRunner();
}

function renderExamRunner(){
  const sess=STATE.examSession;
  const q=sess.questions[sess.currentIdx];
  if(!q)return '<div style="padding:30px;text-align:center;color:#888">No question.</div>';
  const total=sess.questions.length;
  const picked=sess.answers[sess.currentIdx];
  const isFlagged=!!(sess.flagged&&sess.flagged[sess.currentIdx]);   // Batch 11
  const answeredCount=Object.keys(sess.answers).length;
  const remaining=Math.max(0,Date.parse(sess.deadlineAt)-Date.now());
  const s=Math.floor(remaining/1000);
  const timerText=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
  const timerColor=remaining<60000?'var(--err)':remaining<300000?'#D2691E':'var(--ink)';

  const opts=q.o.map((opt,i)=>{
    const selected=picked===i;
    const bg=selected?'var(--ok-tint)':'var(--surface-3)';
    const border=selected?'1px solid var(--ok)':'.5px solid var(--border)';
    const circBg=selected?'#c0dd97':'var(--border-2)';
    const circC=selected?'var(--ok-strong)':'#666';
    return '<div class="q-opt" onclick="examAnswer('+sess.currentIdx+','+i+')" style="background:'+bg+';border:'+border+';cursor:pointer">'
      +'<div class="q-circle" style="background:'+circBg+';color:'+circC+';border:.5px solid #bbb">'+String.fromCharCode(65+i)+'</div>'
      +'<div class="q-text" style="color:var(--ink)">'+esc(normalizeCase(opt))+'</div>'
      +'</div>';
  }).join('');

  const navGrid=sess.navOpen
    ?'<div style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200" onclick="examNavToggle()">'
     +'<div onclick="event.stopPropagation()" style="position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:16px 16px 0 0;padding:16px;max-height:75vh;overflow-y:auto">'
     +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
     +'<div style="font-size:14px;font-weight:600">Questions ('+answeredCount+'/'+total+')</div>'
     +'<button onclick="examNavToggle()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888">\u00D7</button>'
     +'</div>'
     +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:8px">'
     +sess.questions.map((_,i)=>{
        const ans=sess.answers[i]!==undefined;
        const cur=i===sess.currentIdx;
        const flag=!!(sess.flagged&&sess.flagged[i]);   // Batch 11: mark-for-review overlay
        return '<button onclick="examGoTo('+i+')" style="position:relative;padding:9px 0;border-radius:8px;border:'+(cur?'2px solid var(--brand)':(flag?'1.5px solid #D2691E':'.5px solid var(--border-4)'))+';background:'+(ans?'var(--ok-tint)':'#fff')+';color:'+(ans?'var(--ok-strong)':'#666')+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+(flag?'<span style="position:absolute;top:-5px;right:-4px;font-size:11px">\u{1F6A9}</span>':'')+(i+1)+'</button>';
      }).join('')
     +'</div>'
     +'<button onclick="examNavToggle();submitExam(false)" style="margin-top:14px;width:100%;padding:12px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Submit Exam</button>'
     +'</div></div>'
    :'';

  const prevBtn=sess.currentIdx>0
    ?'<button onclick="examGoTo('+(sess.currentIdx-1)+')" style="flex:0 0 auto;padding:11px 16px;border-radius:10px;border:.5px solid var(--border-4);background:#fff;color:#333;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">\u2039 Prev</button>'
    :'<div style="flex:0 0 auto;width:1px"></div>';
  const isLast=sess.currentIdx>=total-1;
  const nextBtn=isLast
    ?'<button onclick="submitExam(false)" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--ok-strong-2);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Submit Exam \u2B07</button>'
    :'<button onclick="examGoTo('+(sess.currentIdx+1)+')" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Next \u203A</button>';
  const barW=Math.round((sess.currentIdx+1)/total*100);

  return '<div id="exam-runner" style="display:flex;flex-direction:column;height:100%">'
    +'<div style="background:#fff;border-bottom:.5px solid var(--border);padding:10px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0">'
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.4px">'+esc(sess.exam.title)+'</div>'
    +'<div style="font-size:13px;font-weight:600;color:var(--ink)">Question '+(sess.currentIdx+1)+' of '+total+' \u00B7 <span style="color:var(--ok-strong-2)">'+answeredCount+' answered</span></div>'
    +'</div>'
    +'<button onclick="examToggleFlag('+sess.currentIdx+')" title="Mark for review" style="padding:6px 10px;border-radius:8px;border:.5px solid '+(isFlagged?'#D2691E':'var(--border-4)')+';background:'+(isFlagged?'#FDF0E6':'var(--surface)')+';font-size:14px;cursor:pointer;font-family:inherit">'+(isFlagged?'\u{1F6A9}':'\u{1F3F3}\uFE0F')+'</button>'
    +'<button onclick="examNavToggle()" style="padding:6px 10px;border-radius:8px;border:.5px solid var(--border-4);background:var(--surface);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u2630 Nav</button>'
    +'<div style="background:var(--surface);border:.5px solid var(--border-4);border-radius:8px;padding:6px 10px;font-family:\'Courier New\',monospace;font-size:14px;font-weight:700;color:'+timerColor+'" id="exam-timer">'+timerText+'</div>'
    +'</div>'
    +'<div style="height:4px;background:var(--surface-4);flex-shrink:0"><div style="height:100%;width:'+barW+'%;background:var(--brand);transition:width .3s"></div></div>'
    +'<div class="scroll-area pad" style="padding-top:16px">'
    +'<div class="card" style="margin-bottom:12px">'
    +'<p style="font-size:15px;font-weight:500;line-height:1.55;margin-bottom:18px">'+stemHTML(q.q)+'</p>'
    +dataTableHTML(q)
    +askHTML(q)
    +opts
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:14px">'+prevBtn+nextBtn+'</div>'
    +'<div style="height:20px"></div>'
    +'</div>'
    +navGrid
    +'</div>';
}

// Batch 11: mm:ss for <1h, Xh Ym for >=1h.
function _fmtDuration(ms){
  const totalSec=Math.max(0,Math.round((ms||0)/1000));
  const h=Math.floor(totalSec/3600),m=Math.floor((totalSec%3600)/60),s=totalSec%60;
  if(h>0)return h+'h '+m+'m';
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function renderExamResult(){
  const sess=STATE.examSession;
  const r=sess.results;
  if(!r)return '';
  const emoji=r.percentage>=80?'\u{1F3C6}':r.percentage>=60?'\u{1F44D}':'\u{1F4DA}';
  const label=r.percentage>=80?'Excellent!':r.percentage>=60?'Good work!':'Keep studying!';
  // Batch 11: explicit pass/fail line, independent of the tiered emoji/label above.
  const passed=r.passed!=null?r.passed:(r.percentage>=EXAM_PASS_THRESHOLD);
  const passBadge='<div style="display:inline-block;margin-top:6px;padding:5px 14px;border-radius:14px;font-size:12px;font-weight:700;background:'+(passed?'var(--ok-tint-2)':'var(--err-tint)')+';color:'+(passed?'var(--ok-2)':'var(--err-2)')+'">'+(passed?'\u2705 Passed':'\u274C Not Passed \u2014 need '+EXAM_PASS_THRESHOLD+'%')+'</div>';
  // Batch 11: time / average / unanswered / section breakdown / weakest unit.
  const statRow=(label,val)=>'<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:.5px solid var(--border)"><span style="color:#888">'+label+'</span><span style="font-weight:600;color:var(--ink)">'+val+'</span></div>';
  let statsHTML=''
    +statRow('Time taken',_fmtDuration(r.timeMs))
    +statRow('Avg. per question',_fmtDuration(r.avgMsPerQ))
    +statRow('Unanswered',(r.unanswered||0)+' of '+r.total);
  if(r.bySection){
    const sids=Object.keys(r.bySection);
    if(sids.length){
      const parts=sids.map(sid=>{
        const sec=S.find(s=>String(s.id)===String(sid));
        const b=r.bySection[sid];
        return (sec?sec.title:'Sec.'+sid)+': '+b.correct+'/'+b.total;
      });
      statsHTML+=statRow('By section',parts.join(' \u00B7 '));
    }
  }
  const weakBlock=(r.weakestLesson&&r.weakestLesson.count>0)
    ?'<div class="card" style="text-align:left;margin-bottom:14px;background:var(--warn-tint)">'
     +'<div style="font-size:12px;font-weight:600;color:var(--warn-strong);margin-bottom:4px">\u{1F4CC} Focus next on</div>'
     +'<div style="font-size:13px;color:#333">'+esc(r.weakestLesson.title)+' \u2014 '+r.weakestLesson.count+' missed here</div>'
     +'</div>':'';
  return '<div class="scroll-area" style="padding:36px 16px 20px;text-align:center">'
    +'<div style="font-size:56px">'+emoji+'</div>'
    +'<div style="font-size:20px;font-weight:500;margin-top:8px">'+label+'</div>'
    +'<div style="font-size:12px;color:#aaa;margin:4px 0 4px">'+esc(sess.exam.title)+(r.autoSubmitted?' \u00B7 auto-submitted at deadline':'')+'</div>'
    +passBadge
    +'<div style="font-size:52px;font-weight:500;color:'+(r.percentage>=60?'var(--ok-strong-2)':'var(--err)')+';margin:10px 0 2px">'+r.percentage+'%</div>'
    +'<div style="font-size:15px;color:#666;margin-bottom:20px">'+r.score+' out of '+r.total+' correct</div>'
    +'<div class="card" style="text-align:left;margin-bottom:14px">'+statsHTML+'</div>'
    +weakBlock
    +'<div class="card" style="text-align:left;margin-bottom:14px">'
    +'<div style="font-size:13px;font-weight:600;color:#333;margin-bottom:6px">Result recorded \u2705</div>'
    +'<div style="font-size:12px;color:#666;line-height:1.6">Your instructor can now see this result on their dashboard. Tap <b>Review Answers</b> to see the correct answers and explanations.</div>'
    +'</div>'
    +'<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">'
    +'<button class="btn btn-outline" onclick="exitExam()" style="flex:0 1 auto">Back to Home</button>'
    +'<button class="btn" onclick="openExamReview(\''+sess.examId+'\')" style="background:var(--brand);color:#fff;flex:0 1 auto">Review Answers \u2192</button>'
    +'</div>'
    +'<div style="height:20px"></div>'
    +'</div>';
}

function _examRenderRunner(){
  if(STATE.tab!=='exam'||!STATE.examSession||STATE.examSession.submitted){render();return;}
  const area=document.getElementById('content-area');
  if(!area){render();return;}
  area.innerHTML=renderExamRunner();
}

// ═════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════
// PHASE 3a-iii-A — GROUP EXAMS (per-question review, student side)
//
// Adds:
//   • questionSnapshot written to exam-results on submit — full question
//     objects (as the student saw them, options already shuffled) so review
//     is bulletproof against future edits to s{N}.json.
//   • openExamReview(examId) — entry point from result screen or Home strip.
//     Just-submitted exams reuse the in-memory session (zero Firestore reads);
//     older exams fetch the exam-results doc and populate STATE.examSession
//     in reviewMode.
//   • renderExamReview — per-question walkthrough with verdict banner,
//     correct answer highlighted, student's wrong pick marked (if any),
//     explanation from expFor() / q.e, lesson attribution.
//   • Fallback for pre-3a-iii-A submissions without a snapshot: regenerate
//     the deterministic set (same seed still produces same questions if
//     s{N}.json hasn't changed).
// ═════════════════════════════════════════════════════════════════════

async function openExamReview(examId){
  // Case 1: we just submitted this exam and the in-memory session is intact.
  if(STATE.examSession&&STATE.examSession.examId===examId&&STATE.examSession.submitted&&Array.isArray(STATE.examSession.questions)&&STATE.examSession.questions.length){
    STATE.examSession.reviewMode=true;
    STATE.examSession.reviewIdx=0;
    STATE.examSession.navOpen=false;
    STATE.tab='exam';render();return;
  }
  // Case 2: reopening a previously submitted exam — fetch from Firestore.
  const exam=(STATE.studentExams||[]).find(e=>e.id===examId);
  if(!exam){showToast('Exam not found.','error');return;}
  showToast('Loading review\u2026','info',1500);
  try{
    // Batch 20: resolve the LATEST attempt's specific doc id. Prefer the
    // cache loadStudentExams already built (has _docId per attempt); fall
    // back to a fresh query if the cache is missing (e.g. deep link).
    let docId=null,attemptNumber=1;
    const cached=(STATE.studentExamResults||{})[examId];
    if(cached&&cached._docId){docId=cached._docId;attemptNumber=cached.attemptNumber||1;}
    else{
      const asnap=await db.collection('exam-results')
        .where('examId','==',examId).where('userId','==',STATE.user.uid).get();
      const submittedAttempts=asnap.docs.map(d=>({_docId:d.id,...d.data()})).filter(a=>a.submitted)
        .sort((a,b)=>(a.attemptNumber||1)-(b.attemptNumber||1));
      if(!submittedAttempts.length){showToast('No result found.','error');return;}
      const last=submittedAttempts[submittedAttempts.length-1];
      docId=last._docId;attemptNumber=last.attemptNumber||1;
    }
    const doc=await db.collection('exam-results').doc(docId).get();
    if(!doc.exists){showToast('No result found.','error');return;}
    const data=doc.data();
    let questions=data.questionSnapshot;
    if(!questions||!Array.isArray(questions)||!questions.length){
      // Fallback: regenerate deterministically. Same seed will yield the same
      // set as long as s{N}.json hasn't changed since submission.
      questions=await buildExamQuestions(exam,STATE.user.uid,attemptNumber);
      if(!questions.length){showToast('Cannot rebuild review data.','error');return;}
      // Watchlist #5 — backfill the snapshot so future reviews use stored
      // data (independent of s{N}.json). Fire-and-forget; silent on failure.
      try{
        const backfill=questions.map(q=>({q:q.q,o:q.o,a:q.a,e:q.e||'',wrongWhy:q.wrongWhy||null,_lid:q._lid||'',_ltitle:q._ltitle||''}));
        db.collection('exam-results').doc(docId).update({questionSnapshot:backfill}).catch(()=>{});
      }catch{}
    }
    // Firestore stores answers as an array of {picked, correct}. Runner uses
    // an indexed object {qIdx: optIdx}. Convert here.
    const answers={};
    if(Array.isArray(data.answers)){
      data.answers.forEach((a,i)=>{if(a&&a.picked!=null)answers[i]=a.picked;});
    }
    STATE.examSession={
      examId,docId,attemptNumber,exam,questions,answers,currentIdx:0,reviewIdx:0,
      startedAt:data.startedAt,deadlineAt:data.deadlineAt,
      submitting:false,submitted:true,reviewMode:true,
      results:{
        score:data.score||0,
        total:data.total||questions.length,
        percentage:data.percentage||0,
        autoSubmitted:!!data.autoSubmitted,
        submittedAt:data.submittedAt||''
      },
      navOpen:false
    };
    STATE.tab='exam';render();
  }catch(e){showToast('Could not load review: '+e.message,'error');}
}

function examReviewGoTo(idx){
  if(!STATE.examSession)return;
  const max=STATE.examSession.questions.length-1;
  STATE.examSession.reviewIdx=Math.max(0,Math.min(max,idx));
  STATE.examSession.navOpen=false;
  _examRenderReview();
}
function examReviewNavToggle(){
  if(!STATE.examSession)return;
  STATE.examSession.navOpen=!STATE.examSession.navOpen;
  _examRenderReview();
}
function _examRenderReview(){
  if(STATE.tab!=='exam'||!STATE.examSession||!STATE.examSession.reviewMode){render();return;}
  const area=document.getElementById('content-area');
  if(!area){render();return;}
  area.innerHTML=renderExamReview();
}

function renderExamReview(){
  const sess=STATE.examSession;
  if(!sess||!Array.isArray(sess.questions)||!sess.questions.length)return renderIntro();
  const idx=sess.reviewIdx||0;
  const q=sess.questions[idx];
  const total=sess.questions.length;
  const picked=sess.answers[idx];
  const correct=picked===q.a;
  const skipped=picked==null;
  const correctCount=sess.questions.reduce((n,q2,i)=>n+(sess.answers[i]===q2.a?1:0),0);

  // Options: correct answer green, student's wrong pick red, others neutral.
  const opts=q.o.map((opt,i)=>{
    let bg='var(--surface-3)',border='.5px solid var(--border)',textC='var(--ink)',circBg='var(--border-2)',circC='#666',circTxt=String.fromCharCode(65+i);
    if(i===q.a){bg='var(--ok-tint)';border='1px solid var(--ok)';textC='var(--ok-strong)';circBg='#c0dd97';circC='var(--ok-strong)';circTxt='\u2713';}
    else if(i===picked){bg='var(--err-tint)';border='1px solid var(--err)';textC='var(--err-strong)';circBg='#f7c1c1';circC='var(--err-strong)';circTxt='\u2717';}
    else{textC='#888';}
    return '<div class="q-opt" style="background:'+bg+';border:'+border+';cursor:default">'
      +'<div class="q-circle" style="background:'+circBg+';color:'+circC+';border:.5px solid #bbb">'+circTxt+'</div>'
      +'<div class="q-text" style="color:'+textC+'">'+esc(normalizeCase(opt))+'</div>'
      +'</div>';
  }).join('');

  const verdictBar=skipped
    ?'<div style="background:var(--accent-purple-tint);border:1px solid #D2B4DE;color:#6C3483;padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px">\u25CB Not answered</div>'
    :correct
      ?'<div style="background:var(--ok-tint);border:1px solid var(--ok);color:var(--ok-strong);padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px">\u2705 Correct</div>'
      :'<div style="background:var(--err-tint);border:1px solid var(--err);color:var(--err-2);padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px">\u274C Incorrect</div>';

  // Prefer per-option wrongWhy via expFor() for wrong picks; else use q.e.
  let explanationText='';
  if(!correct&&!skipped&&typeof expFor==='function'){
    try{explanationText=expFor(q,picked)||q.e||'';}catch{explanationText=q.e||'';}
  }else{
    explanationText=q.e||'';
  }
  const explanation=explanationText
    ?'<div style="margin-top:14px;padding:13px 14px;border-radius:10px;background:var(--surface);border:.5px solid var(--border)">'
     +'<div style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Explanation</div>'
     +'<div style="font-size:13px;color:#333;line-height:1.6">'+expInner(q,(!correct&&!skipped)?picked:q.a)+'</div>'
     +'</div>'
    :'';

  const attribution=q._ltitle
    ?'<div style="font-size:11px;color:#888;margin-top:10px;font-style:italic">From: '+esc(q._ltitle)+'</div>'
    :'';

  const navGrid=sess.navOpen
    ?'<div style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200" onclick="examReviewNavToggle()">'
     +'<div onclick="event.stopPropagation()" style="position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:16px 16px 0 0;padding:16px;max-height:75vh;overflow-y:auto">'
     +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
     +'<div style="font-size:14px;font-weight:600">Review Questions</div>'
     +'<button onclick="examReviewNavToggle()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888">\u00D7</button>'
     +'</div>'
     +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:8px">'
     +sess.questions.map((q2,i)=>{
        const p=sess.answers[i];
        const c=p===q2.a;
        const sk=p==null;
        const bg=sk?'var(--accent-purple-tint)':c?'var(--ok-tint)':'var(--err-tint)';
        const col=sk?'#6C3483':c?'var(--ok-strong)':'var(--err-2)';
        const cur=i===idx;
        return '<button onclick="examReviewGoTo('+i+')" style="padding:9px 0;border-radius:8px;border:'+(cur?'2px solid var(--brand)':'.5px solid var(--border-4)')+';background:'+bg+';color:'+col+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+(i+1)+'</button>';
      }).join('')
     +'</div>'
     +'<div style="display:flex;gap:10px;margin-top:14px;font-size:11px;color:#888">'
     +'<div><span style="display:inline-block;width:10px;height:10px;background:var(--ok-tint);border-radius:2px;vertical-align:middle;margin-right:4px"></span>Correct</div>'
     +'<div><span style="display:inline-block;width:10px;height:10px;background:var(--err-tint);border-radius:2px;vertical-align:middle;margin-right:4px"></span>Wrong</div>'
     +'<div><span style="display:inline-block;width:10px;height:10px;background:var(--accent-purple-tint);border-radius:2px;vertical-align:middle;margin-right:4px"></span>Skipped</div>'
     +'</div>'
     +'</div></div>'
    :'';

  const prevBtn=idx>0
    ?'<button onclick="examReviewGoTo('+(idx-1)+')" style="flex:0 0 auto;padding:11px 16px;border-radius:10px;border:.5px solid var(--border-4);background:#fff;color:#333;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">\u2039 Prev</button>'
    :'<div style="flex:0 0 auto;width:1px"></div>';
  const isLast=idx>=total-1;
  const nextBtn=isLast
    ?'<button onclick="exitExam()" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Done \u2713</button>'
    :'<button onclick="examReviewGoTo('+(idx+1)+')" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Next \u203A</button>';
  const barW=Math.round((idx+1)/total*100);

  const r=sess.results||{};
  const scoreBadge=r.score!=null
    ?'<div style="background:'+((r.percentage||0)>=60?'var(--ok-tint)':'var(--err-tint)')+';color:'+((r.percentage||0)>=60?'var(--ok-strong)':'var(--err-2)')+';border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;font-family:\'Courier New\',monospace">'+r.score+'/'+r.total+' \u00B7 '+(r.percentage||0)+'%</div>'
    :'';

  return '<div style="display:flex;flex-direction:column;height:100%">'
    +'<div style="background:#fff;border-bottom:.5px solid var(--border);padding:10px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0">'
    +'<button onclick="exitExam()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--brand);padding:0 6px" title="Back">\u2039</button>'
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.4px">'+(sess.reviewStudent?'\u{1F464} '+esc(sess.reviewStudent.name||'Student')+' \u00B7 ':'Review \u00B7 ')+esc(sess.exam.title)+'</div>'
    +'<div style="font-size:13px;font-weight:600;color:var(--ink)">Q'+(idx+1)+' of '+total+' \u00B7 <span style="color:var(--ok-strong-2)">'+correctCount+' correct</span></div>'
    +'</div>'
    +scoreBadge
    +'<button onclick="examReviewNavToggle()" style="padding:6px 10px;border-radius:8px;border:.5px solid var(--border-4);background:var(--surface);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u2630 Nav</button>'
    +'</div>'
    +'<div style="height:4px;background:var(--surface-4);flex-shrink:0"><div style="height:100%;width:'+barW+'%;background:var(--brand);transition:width .3s"></div></div>'
    +'<div class="scroll-area pad" style="padding-top:14px">'
    +verdictBar
    +'<div class="card" style="margin-bottom:12px">'
    +'<p style="font-size:15px;font-weight:500;line-height:1.55;margin-bottom:16px">'+stemHTML(q.q)+'</p>'
    +(typeof dataTableHTML==='function'?dataTableHTML(q):'')
    +askHTML(q)
    +opts
    +explanation
    +attribution
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:14px">'+prevBtn+nextBtn+'</div>'
    +'<div style="height:20px"></div>'
    +'</div>'
    +navGrid
    +'</div>';
}

// ═════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════
// PHASE 3a-iii-B — GROUP EXAMS (instructor results view + CSV export)
//
// Flow:
//   Dashboard → Exams tab → per-card "📊 Results" → openExamResults()
//   fetches all exam-results docs for this examId (single query) and
//   caches them in STATE.dashExamResults[examId]. renderDashExamResults
//   shows aggregate stats (attempts, submitted, avg %, pass rate) and a
//   sortable student list. Click any student's "Review" → drill down
//   into renderExamReview with their session loaded; exitExam returns
//   here via instructorReturnTab='dashboard'.
//
// Cost:
//   ONE query per Results click (not per page load). Full docs are fetched
//   (~50KB × N students) so drill-down is instant afterwards from cache.
//   For ≤100 students per exam this is fine; beyond that we'd want a
//   summary-doc pattern (see Batch 3 / Watchlist #4).
// ═════════════════════════════════════════════════════════════════════




// ═══════════════════════════════════════════════════════════════════════════
// BATCH 20 (item 9) — STUDENT CUSTOM PRACTICE TEST BUILDER
//
// A student-built, single-player analogue of the instructor's Exam Creator:
// pick section(s), then unit(s) within each, choose your own question count
// and duration, and get a timed test. Deliberately reuses the SAME proven
// pool-building logic as instructor exams (buildDistributedExamPool) and the
// SAME exam-runner UI (STATE.examSession / renderExam / submitExam) — a
// practice test is just an ephemeral, single-student "exam" that is never
// written to the `exams` collection (nothing to share with anyone else) and
// whose result is written to `custom-practice-results` instead of
// `exam-results`, keeping it fully separate from instructor Results/At Risk
// aggregates (see submitExam()'s isPractice branch, and firestore.rules).
// ═══════════════════════════════════════════════════════════════════════════

function togglePracticeSection(sidStr){
  const sid=parseInt(sidStr);
  const d=STATE.practiceDraft;
  d.sectionIds=d.sectionIds||[];
  const i=d.sectionIds.findIndex(x=>parseInt(x)===sid);
  if(i>=0){
    d.sectionIds.splice(i,1);
    if(d.unitsBySection)delete d.unitsBySection[sid];
  }else{
    d.sectionIds.push(sid);
  }
  render();
}
function togglePracticeUnit(sectionId,uid){
  const d=STATE.practiceDraft;
  d.unitsBySection=d.unitsBySection||{};
  const arr=d.unitsBySection[sectionId]||[];
  const i=arr.indexOf(uid);
  if(i>=0)arr.splice(i,1);else arr.push(uid);
  d.unitsBySection[sectionId]=arr.slice();
  render();
}
function clearPracticeUnits(sectionId){
  const d=STATE.practiceDraft;
  d.unitsBySection=d.unitsBySection||{};
  d.unitsBySection[sectionId]=[];
  render();
}
// Mirrors renderExamUnitPicker's markup exactly, wired to the student's own
// draft + toggle functions above (kept separate rather than parameterizing
// the instructor version, so instructor exam creation is never at risk of
// a regression from student-side changes).
function renderPracticeUnitPicker(d,sectionId){
  const secId=parseInt(sectionId);
  const sec=S.find(s=>s.id===secId);
  if(!sec)return '';
  d.unitsBySection=d.unitsBySection||{};
  const selected=new Set((d.unitsBySection[secId]||[]).map(String));
  const chips=sec.lessons.map((l,idx)=>{
    const on=selected.has(String(l.id));
    const badge=l.outOfScope==='part2'?' \u26A0\uFE0F Part 2':(l.outOfScope?' \u26A0\uFE0F \u2192 Sec.3':'');
    return `<button type="button" onclick="togglePracticeUnit(${secId},'${l.id}')" style="padding:6px 10px;border-radius:14px;border:1px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':(l.outOfScope?'#fff7ed':'#fff')};color:${on?'#fff':(l.outOfScope?'#b45309':'#555')};font-size:11px;font-weight:${on?'600':'500'};cursor:pointer;font-family:inherit;white-space:nowrap">U${idx+1}: ${esc(l.title.length>28?l.title.slice(0,26)+'\u2026':l.title)}${badge}</button>`;
  }).join('');
  const allCount=sec.lessons.length;
  const sel=selected.size;
  const label=sel===0?`All units (${allCount})`:`${sel} of ${allCount} units`;
  return `<div style="margin-bottom:10px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <label style="font-size:11px;color:#888">Sec ${secId} \u2014 ${esc(sec.title)} units <span style="font-weight:600;color:var(--brand)">${label}</span></label>
      <button type="button" onclick="clearPracticeUnits(${secId})" style="background:none;border:none;color:var(--brand);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Clear \u2192 all</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--surface);border:.5px solid var(--border);border-radius:8px;max-height:150px;overflow-y:auto">${chips}</div>
    <div style="font-size:11px;color:#888;margin-top:4px">Leave empty to include the whole section.</div>
  </div>`;
}

function renderCustomPractice(){
  const d=STATE.practiceDraft;
  const selectedSections=new Set((d.sectionIds||[]).map(String));
  const sectionChips=S.map(s=>{
    const on=selectedSections.has(String(s.id));
    return `<button type="button" onclick="togglePracticeSection('${s.id}')" style="padding:7px 12px;border-radius:14px;border:1px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':'#fff'};color:${on?'#fff':'#555'};font-size:12px;font-weight:${on?'600':'500'};cursor:pointer;font-family:inherit;white-space:nowrap">Sec ${s.id} \u2014 ${esc(s.title)}</button>`;
  }).join('');
  const unitPickers=(d.sectionIds||[]).map(sid=>renderPracticeUnitPicker(d,sid)).join('');

  if(!STATE.practiceHistoryLoaded)loadPracticeHistory();
  const history=STATE.practiceHistory||[];
  const historyHTML=history.length?`<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-top:16px">
      <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">\u{1F4C8} Your Recent Custom Tests</div>
      ${history.slice(0,10).map(r=>{
        const pct=r.percentage||0;
        const col=pct>=EXAM_PASS_THRESHOLD?'var(--ok-strong-2)':'var(--err)';
        const bg=pct>=EXAM_PASS_THRESHOLD?'var(--ok-tint)':'var(--err-tint)';
        const dt=r.submittedAt?new Date(r.submittedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}):'';
        return `<div onclick="openPracticeReview('${r._docId}')" style="display:flex;align-items:center;gap:10px;padding:9px 0;border-bottom:.5px solid var(--bg);cursor:pointer">
          <div style="background:${bg};color:${col};border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;min-width:44px;text-align:center">${pct}%</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:12px;font-weight:500;color:var(--ink)">${esc(r.title||'Custom Practice Test')}</div>
            <div style="font-size:11px;color:#888;margin-top:1px">${r.score||0}/${r.total||0} \u00B7 ${dt}</div>
          </div>
          <div style="font-size:11px;font-weight:600;color:var(--brand)">Review \u203A</div>
        </div>`;
      }).join('')}
    </div>`:'';

  return`${renderSubNav(SUB_PRACTICE,'custom-practice')}<div class="sh"><h2>\u{1F6E0}\uFE0F Custom Practice Test</h2><p>Pick your own scope, question count, and time limit</p></div>
  <div class="scroll-area pad" style="padding-top:14px">
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Section(s) * \u2014 pick one or more; questions split evenly across your picks</label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--surface);border:.5px solid var(--border);border-radius:8px">${sectionChips}</div>
      </div>
      ${unitPickers}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Questions (3\u201350) *</label>
          <input type="number" min="3" max="50" value="${esc(String(d.count||20))}"
                 oninput="STATE.practiceDraft.count=this.value"
                 style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Duration (min) *</label>
          <input type="number" min="3" max="240" value="${esc(String(d.durationMinutes||30))}"
                 oninput="STATE.practiceDraft.durationMinutes=this.value"
                 style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
        </div>
      </div>
      <button onclick="startCustomPractice()"
              style="width:100%;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">
        \u{1F680} Generate Practice Test
      </button>
    </div>
    ${historyHTML}
    <div style="height:20px"></div>
  </div>`;
}

async function startCustomPractice(){
  const d=STATE.practiceDraft;
  const sectionIds=Array.isArray(d.sectionIds)?d.sectionIds.map(Number).filter(Boolean):[];
  if(!sectionIds.length){showToast('Choose at least one section.','warning');return;}
  const count=parseInt(d.count);
  if(!count||count<3||count>50){showToast('Question count must be 3\u201350.','warning');return;}
  const dur=parseInt(d.durationMinutes);
  if(!dur||dur<3||dur>240){showToast('Duration must be 3\u2013240 minutes.','warning');return;}

  const unitsBySection=d.unitsBySection||{};
  const result=await buildDistributedExamPool(sectionIds,unitsBySection,count);
  if(!result.ok){showToast(result.message,'warning');return;}

  // Ephemeral, personal-only pseudo-exam — never written to the `exams`
  // collection (nothing here is shared with any other student or the
  // instructor). Reuses buildExamQuestions exactly as a real exam would.
  const practiceId='practice_'+Date.now();
  const pseudoExam={
    id:practiceId,title:'Custom Practice \u2014 '+sectionIds.map(id=>'Sec '+id).join('+'),
    sectionIds,unitsBySection,questionIds:result.questionIds,
    count,durationMinutes:dur
  };
  const questions=await buildExamQuestions(pseudoExam,STATE.user.uid,1);
  if(!questions.length){showToast('No questions available for this selection.','error');return;}

  const startedAt=new Date().toISOString();
  const deadlineAt=new Date(Date.now()+dur*60000).toISOString();
  STATE.examSession={
    examId:practiceId,exam:pseudoExam,questions,answers:{},currentIdx:0,flagged:{},
    startedAt,deadlineAt,submitting:false,submitted:false,results:null,navOpen:false,
    isPractice:true,instructorReturnTab:'custom-practice'   // exitExam() already honors this field generically
  };
  _examSaveLocal(STATE.examSession);
  STATE.tab='exam';render();
  _examStartTimer();
}

// Loads the student's own custom-practice history (single-field equality
// query on userId — no compound filter, no index needed).
async function loadPracticeHistory(){
  if(STATE.practiceHistoryLoaded||!STATE.user)return;
  STATE.practiceHistoryLoaded=true;   // set first — avoid duplicate concurrent loads
  try{
    const snap=await db.collection('custom-practice-results')
      .where('userId','==',STATE.user.uid).get();
    STATE.practiceHistory=snap.docs.map(d=>({_docId:d.id,...d.data()}))
      .filter(r=>r.submitted)
      .sort((a,b)=>(b.submittedAt||'').localeCompare(a.submittedAt||''));
    if(STATE.tab==='custom-practice')render();
  }catch(e){
    console.warn('[Practice History] load failed:',e);
  }
}

async function openPracticeReview(docId){
  const cached=(STATE.practiceHistory||[]).find(r=>r._docId===docId);
  showToast('Loading review\u2026','info',1200);
  try{
    const doc=cached?null:await db.collection('custom-practice-results').doc(docId).get();
    const data=cached||(doc&&doc.exists?doc.data():null);
    if(!data){showToast('No result found.','error');return;}
    const questions=data.questionSnapshot;
    if(!questions||!Array.isArray(questions)||!questions.length){
      showToast('Review data unavailable for this test.','error');return;
    }
    const answers={};
    if(Array.isArray(data.answers)){
      data.answers.forEach((a,i)=>{if(a&&a.picked!=null)answers[i]=a.picked;});
    }
    STATE.examSession={
      examId:data.examId||docId,docId,exam:{title:data.title||'Custom Practice Test'},
      questions,answers,currentIdx:0,reviewIdx:0,
      startedAt:data.startedAt,deadlineAt:data.deadlineAt,
      submitting:false,submitted:true,reviewMode:true,isPractice:true,
      instructorReturnTab:'custom-practice',
      results:{
        score:data.score||0,total:data.total||questions.length,
        percentage:data.percentage||0,autoSubmitted:!!data.autoSubmitted,
        submittedAt:data.submittedAt||''
      },
      navOpen:false
    };
    STATE.tab='exam';render();
  }catch(e){showToast('Could not load review: '+e.message,'error');}
}



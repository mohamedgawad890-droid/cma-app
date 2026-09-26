// ═══════════════════════════════════════════════════════════════════════════
// BATCH 5 — DASHBOARD EXPANSION (Students / Attendance / Results / Progress /
//   Leader / Plan) + Weekly Plan surface for students
// ═══════════════════════════════════════════════════════════════════════════

// ── UI helpers ──────────────────────────────────────────────────────────────



// ═══════════════════════════════════════════════════════════════════════════
//  STUDENTS TAB — all-groups roster with filter + search
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashStudentsFilter='';        // '' = All groups
STATE.dashStudentsSearch='';
STATE.dashStudentDetailUid=null;    // when set, opens profile view
STATE.dashStudentAttendanceUid=null;   // Batch 6: opens attendance history
STATE.dashStudentAttendanceRows=null;  // Batch 6: cached attendance rows
STATE.dashStudentAttendanceLoading=false;


// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 11 — APPROVALS TAB (group join/switch requests)
// ═══════════════════════════════════════════════════════════════════════════
// Data model: group-requests/{id} = {uid,studentName,studentEmail,studentMobile,
//   groupCode,status:'pending'|'approved'|'rejected',requestedAt,resolvedAt,resolvedBy}
// Rules (add manually via Firebase Console — no firestore.rules file in project):
//   create: any signed-in user, doc.uid must equal auth.uid
//   read/update/delete: instructor only
STATE.dashApprovals={loaded:false,loading:false,rows:[]};





// Batch 6 · Item G — Student Detail live re-fetch + full profile + G.5 notes.





// ══ Batch 6: Student attendance history — chronological per-student timeline ══
// Query: attendance where userId==X. Cross-references STATE.dashLectures to
// determine present/absent for each lecture in the student's group.
// No composite index needed — single-field query.






// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 11 — FEEDBACK MATRIX (one row per student, one column per lecture)
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashFeedbackByGroup={};   // {groupCode: {loaded,loading,rows:[lecture-feedback docs]}}




// Batch 7: end renderDashAttendance




// ═══════════════════════════════════════════════════════════════════════════
//  RESULTS TAB — all exam results for the group, expandable per exam
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashResultsExpanded={};

// Batch 11: Per-exam / Matrix view toggle, same pattern as Attendance tab.
STATE.dashResultsView=null;




// ═══════════════════════════════════════════════════════════════════════════
//  PROGRESS TAB — per-student progress across the group
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashProgressByGroup={}; // {groupCode: {loaded, loading, rows}}



// ═══════════════════════════════════════════════════════════════════════════
//  LEADER TAB — group leaderboard
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashLeaderByGroup={}; // {groupCode: {loaded, loading, rows}}



// ═══════════════════════════════════════════════════════════════════════════
//  PLAN TAB — weekly plan CRUD (one active per group; publish auto-archives)
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashPlanByGroup={};   // {groupCode: {loaded, loading, active, history}}
STATE.dashPlanDraft={weekLabel:'',sectionId:'',unitIds:[],note:''};






// ═══════════════════════════════════════════════════════════════════════════
//  STUDENT-SIDE — Weekly Plan surface at the top of Study tab
// ═══════════════════════════════════════════════════════════════════════════
STATE.studentActivePlan=null;
STATE.studentPlanLoaded=false;

async function ensureStudentPlan(){
  if(STATE.studentPlanLoaded)return;
  STATE.studentPlanLoaded=true;
  const st=loadStudent();
  const g=st&&st.groupCode?st.groupCode.toUpperCase():'';
  if(!g||!db||!STATE.user)return;
  try{
    const snap=await db.collection('weekly-plans').where('groupCode','==',g).where('active','==',true).limit(1).get();
    if(!snap.empty){STATE.studentActivePlan={id:snap.docs[0].id,...snap.docs[0].data()};if(STATE.tab==='study')render();}
  }catch(e){console.warn('[ensureStudentPlan]',e);}
}

function renderStudentActivePlanBanner(){
  const p=STATE.studentActivePlan;
  if(!p)return '';
  const sec=S.find(s=>s.id===Number(p.sectionId));
  const _ut=unitTitles(p.sectionId,p.unitIds,{max:2}); // Batch 8
  const units=(p.unitIds||[]).length?(_ut?esc(_ut):(p.unitIds.length+' unit'+(p.unitIds.length===1?'':'s'))):'All units';
  return `<div style="background:linear-gradient(135deg,#7D3C98,var(--accent-purple-strong));border-radius:14px;padding:14px 16px;margin:0 0 14px;color:#fff">
    <div style="font-size:10px;font-weight:700;letter-spacing:1px;opacity:.85;margin-bottom:4px">\u{1F5D3}\uFE0F WEEKLY PLAN</div>
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;line-height:1.3">${esc(p.weekLabel||'This Week')}</div>
    <div style="font-size:11px;opacity:.85;margin-bottom:${p.note?'8px':'0'}">${sec?esc(sec.emoji+' '+sec.title):'Section '+p.sectionId} \u00B7 ${units}</div>
    ${p.note?`<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:8px 11px;font-size:12px;line-height:1.5;white-space:pre-wrap">${esc(p.note)}</div>`:''}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  LECTURE SCHEDULE — Plan vs Actual (Batch 22, item 5)
//  One doc per group at lecture-schedule/{groupCode}: {groupCode, rows:[...], updatedAt, updatedBy}.
//  Each row is {id, lectureNumber, plannedDate, sectionId, unitIds, note}.
//  The "Actual" side is never stored here — it's joined at render time against
//  STATE.dashTeachingLog (already loaded per group by loadDashScopedData) by
//  matching lectureNumber, so teaching-log stays the single source of truth
//  for what was actually taught.
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashScheduleByGroup={};   // {groupCode: {loaded, loading, rows}}
STATE.dashScheduleDraft={lectureNumber:'',plannedDate:'',sectionId:'',unitIds:[],note:''};
STATE.dashScheduleEditingId=null;









// ═══════════════════════════════════════════════════════════════════════════
//  STUDENT-SIDE — read-only Plan/Actual table, shown on the Study tab
// ═══════════════════════════════════════════════════════════════════════════
STATE.studentSchedule=null;
STATE.studentScheduleLoaded=false;

async function ensureStudentSchedule(){
  if(STATE.studentScheduleLoaded)return;
  STATE.studentScheduleLoaded=true;
  const st=loadStudent();
  const g=st&&st.groupCode?st.groupCode.toUpperCase():'';
  if(!g||!db||!STATE.user)return;
  try{
    const doc=await db.collection('lecture-schedule').doc(g).get();
    if(doc.exists){
      const rows=(doc.data().rows||[]).slice().sort((a,b)=>Number(a.lectureNumber)-Number(b.lectureNumber));
      STATE.studentSchedule=rows;
      if(STATE.tab==='study')render();
    }
  }catch(e){console.warn('[ensureStudentSchedule]',e);}
}

function renderStudentScheduleSection(){
  const rows=STATE.studentSchedule;
  if(!rows||!rows.length)return '';
  const items=rows.map(r=>{
    const rsec=S.find(s=>s.id===Number(r.sectionId));
    const _ut=unitTitles(r.sectionId,r.unitIds,{max:2});
    const units=(r.unitIds||[]).length?(_ut?esc(_ut):(r.unitIds.length+' units')):'\u2014';
    // Students don't have dashTeachingLog loaded (that's an instructor-only
    // fetch), so status here is inferred from whether the planned date has
    // passed rather than joined against actual teaching-log entries.
    const passed=r.plannedDate&&new Date(r.plannedDate)<new Date(new Date().toDateString());
    const statusHtml=passed
      ?`<span style="font-size:11px;color:var(--ok-strong)">\u2713 Should be covered</span>`
      :`<span style="font-size:11px;color:#aaa">Upcoming</span>`;
    return `<div style="border-bottom:.5px solid var(--border);padding:10px 0">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div style="font-size:13px;font-weight:600;color:var(--ink)">L${r.lectureNumber} \u00B7 ${r.plannedDate?esc(new Date(r.plannedDate).toLocaleDateString('en-GB',{day:'numeric',month:'short'})):'\u2014'}</div>
        ${statusHtml}
      </div>
      <div style="font-size:12px;color:#666;margin-top:2px">${rsec?esc(rsec.emoji+' '+rsec.title):'Section '+r.sectionId} \u00B7 ${units}</div>
      ${r.note?`<div style="font-size:12px;color:#555;margin-top:6px;background:var(--surface);border-radius:6px;padding:6px 9px;white-space:pre-wrap">${esc(r.note)}</div>`:''}
    </div>`;
  }).join('');
  return `<div style="background:#fff;border:.5px solid var(--border);border-radius:14px;padding:14px 16px;margin:0 0 14px">
    <div style="font-size:13px;font-weight:700;color:var(--ink);margin-bottom:6px">\U0001F4C5 Lecture Schedule</div>
    <div>${items}</div>
  </div>`;
}






// ═════════════════════════════════════════════════════════════════════


function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function shuffleQuestionOptions(q){
  // Create index array [0,1,2,3], shuffle it, remap options and correct answer
  const idx=[0,1,2,3].slice(0,q.o.length);
  for(let i=idx.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
  const newOpts=idx.map(i=>q.o[i]);
  const newA=idx.indexOf(q.a);
  const newWrongWhy={};
  if(q.wrongWhy){for(const[k,v]of Object.entries(q.wrongWhy)){const newK=idx.indexOf(Number(k));if(newK>=0)newWrongWhy[newK]=v;}}
  return{...q,o:newOpts,a:newA,wrongWhy:Object.keys(newWrongWhy).length?newWrongWhy:q.wrongWhy};
}

// --- studentId ---
function genStudentId(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=chars[Math.floor(Math.random()*chars.length)];return s;}
// --- renderNotes ---
function renderNotes(){
  const notes=buildAllNotes();
  const bySec={};notes.forEach(n=>{const sid=n.sec.id;if(!bySec[sid])bySec[sid]={sec:n.sec,items:[]};bySec[sid].items.push(n);});
  const groups=Object.values(bySec).sort((a,b)=>a.sec.id-b.sec.id);
  const body=notes.length===0
    ?`<div style="text-align:center;padding:40px 20px;color:#aaa"><div style="font-size:36px;margin-bottom:10px">📝</div><div style="font-size:14px">No notes yet.</div><div style="font-size:12px;margin-top:6px;color:#bbb">Open any lesson, scroll down, and write in the Notes box.</div></div>`
    :groups.map(g=>`<div style="margin-bottom:18px"><div class="notes-item-sec" style="color:${g.sec.text}">${g.sec.emoji} ${esc(g.sec.title)}</div>${g.items.map(n=>`<div class="notes-item"><div class="notes-item-title">${esc(n.lessonTitle)}</div><div class="notes-item-body">${esc(n.text)}</div><button onclick="studyGo(${g.sec.id},'${n.lessonId}')" style="margin-top:8px;padding:6px 12px;border-radius:8px;border:.5px solid var(--brand)40;background:#EBF5FB;color:var(--brand);font-size:11px;font-weight:500;cursor:pointer;font-family:inherit">Open lesson →</button></div>`).join('')}</div>`).join('');
  return `${renderSubNav(SUB_REFERENCE,'my-notes')}<div class="sh"><h2>My Notes</h2><p>${notes.length} note${notes.length===1?'':'s'} across your lessons</p></div>
  <div class="scroll-area pad" style="padding-top:14px">${body}<div style="height:20px"></div></div>`;
}

// ─── RENDER FLASHCARDS ───────────────────────────────────────────────────

// --- renderFlashcards ---
function renderFlashcards(){
  const all=STATE.flashcards||[];
  if(!all.length)return `${renderSubNav(SUB_PRACTICE,'flashcards')}<div class="sh"><h2>Flashcards</h2><p>Loading cards…</p></div><div class="scroll-area" style="display:flex;align-items:center;justify-content:center;height:60%;color:#aaa"><div style="text-align:center"><div style="font-size:32px;margin-bottom:10px">⏳</div><div>Building cards…</div></div></div>`;
  const list=filteredFlashcards();
  const idx=Math.min(STATE.flashcardsIdx,Math.max(0,list.length-1));
  const card=list[idx];
  const rs=new Set(loadFlashReviewSet());
  const filterBtns=[['all','All']].concat(S.map(s=>[String(s.id),s.emoji+' '+String(s.id)])).map(([v,l])=>{const on=STATE.flashcardsFilter===v;return `<button onclick="flashSetFilter('${v}')" style="padding:5px 10px;border-radius:14px;font-size:11px;cursor:pointer;font-family:inherit;border:.5px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':'var(--surface-3)'};color:${on?'#fff':'#555'};font-weight:${on?'600':'400'};white-space:nowrap">${l}</button>`;}).join('');
  const modeBtns=[['study','Study'],['review','Review only ('+rs.size+')']].map(([v,l])=>{const on=STATE.flashcardsMode===v;return `<button onclick="flashSetMode('${v}')" style="flex:1;padding:6px 10px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;border:.5px solid ${on?'#7D3C98':'var(--border-4)'};background:${on?'var(--accent-purple-tint)':'#fff'};color:${on?'var(--accent-purple-strong)':'#555'};font-weight:${on?'600':'400'}">${l}</button>`;}).join('');
  if(!card)return `${renderSubNav(SUB_PRACTICE,'flashcards')}<div class="sh"><h2>Flashcards</h2><p>${all.length} cards total</p></div><div class="scroll-area pad" style="padding-top:14px"><div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;scrollbar-width:none">${filterBtns}</div><div style="display:flex;gap:6px;margin-bottom:14px">${modeBtns}</div><div style="text-align:center;padding:40px 20px;color:#aaa"><div style="font-size:32px;margin-bottom:10px">✅</div><div style="font-size:14px">${STATE.flashcardsMode==='review'?'No cards marked for review!':'No cards match this filter.'}</div></div></div>`;
  const typeBadge=card.type==='def'?'<span class="flash-type-badge" style="background:#EBF3FA;color:var(--brand)">📖 DEFINITION</span>':'<span class="flash-type-badge" style="background:#F4EFFB;color:var(--accent-purple-strong)">📐 FORMULA</span>';
  const flipped=STATE.flashcardsFlipped;
  const isReview=rs.has(card.id);
  const cardBody=flipped
    ?`${typeBadge}<div class="flash-back">${esc(card.back).replace(/\n/g,'<br>')}</div>`
    :`${typeBadge}<div class="flash-front">${esc(card.front)}</div><div style="margin-top:16px;font-size:11px;color:#aaa">Tap to flip</div>`;
  return `${renderSubNav(SUB_PRACTICE,'flashcards')}<div class="sh"><h2>Flashcards</h2><p>${list.length} card${list.length===1?'':'s'} · card ${idx+1} of ${list.length}</p></div>
  <div class="scroll-area pad" style="padding-top:14px">
    <div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;scrollbar-width:none;-webkit-overflow-scrolling:touch">${filterBtns}</div>
    <div style="display:flex;gap:6px;margin-bottom:14px">${modeBtns}</div>
    <div class="flash-card" onclick="flashFlip()">${cardBody}</div>
    <div style="font-size:11px;color:#888;text-align:center;margin-top:10px">${esc(card.sec.title)} · ${esc(card.lessonTitle)}${isReview?' · <span style="color:var(--err-2)">📌 Marked</span>':''}</div>
    <div class="flash-nav">
      <button class="flash-btn flash-btn-review" onclick="flashMarkReview('${card.id}')">${isReview?'✓ Unmark':'📌 Review'}</button>
      <button class="flash-btn flash-btn-skip" onclick="flashPrev()">‹ Prev</button>
      <button class="flash-btn flash-btn-know" onclick="flashMarkKnow('${card.id}')">Know · Next →</button>
    </div>
    <div style="height:20px"></div>
  </div>`;
}






// ── LAZY LESSON LOADER ───────────────────────────────────────────────────────
// Blocks are loaded on-demand from ./lessons/lesson-sN.json files.
// This reduces the initial HTML parse cost by ~508KB.
const LESSON_CACHE={};

async function ensureLessons(sectionId){
  const sid=String(sectionId);
  if(LESSON_CACHE[sid])return;
  try{
    const res=await fetch('./lessons/lesson-s'+sid+'.json');
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    const sec=S.find(s=>String(s.id)===sid);
    if(sec){sec.lessons.forEach(l=>{if(data[l.id])l.blocks=data[l.id];});}
    LESSON_CACHE[sid]=true;
  }catch(e){console.error('Failed to load lessons for section '+sid,e);}
}

// Background pre-warm: silently load all sections 4s after app start
async function prewarmLessons(){
  try{await Promise.all([1,2,3,4,5,6].map(i=>ensureLessons(i)));}catch(e){}
}
setTimeout(prewarmLessons,4000);
// ── Ported prefs bootstrap ──
try{STATE.fontSize=loadFontSize();STATE.dailyGoalMinutes=loadDailyGoal();}catch(e){}


// ── LAZY QUIZ LOADER ─────────────────────────────────────────────────────────
const QUIZ_CACHE={};
async function ensureQuizzes(sectionId){
  const sid=String(sectionId);
  if(QUIZ_CACHE[sid])return;
  try{
    const res=await fetch('./questions/s'+sid+'.json');
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    const sec=S.find(s=>String(s.id)===sid);
    if(sec){sec.lessons.forEach(l=>{if(data[l.id])l.quizzes=data[l.id];});}
    QUIZ_CACHE[sid]=true;
  }catch(e){console.error('Failed to load quizzes for section '+sid,e);}
}
// ─────────────────────────────────────────────────────────────────────────────
// ─── DATA INTEGRITY VALIDATOR ─────────────────────────────────────────────────
// Scans all loaded quiz questions for known authoring errors.
// Runs automatically 4s after app load. Call anytime via: validateQuizData()
// ─────────────────────────────────────────────────────────────────────────────
function validateQuizData(silent=false){
  const CONTEXT_PATTERNS=[
    /using the (data|information) above/i,
    /using the above (data|information)/i,
    /from the above/i,
    /previous question/i,
    /as (shown|stated|given) above/i,
    /refer(ring)? to (the )?above/i,
    /data above/i,
    /above data/i
  ];
  const issues=[];
  let totalChecked=0;
  S.forEach(sec=>{
    sec.lessons.forEach(lesson=>{
      if(!lesson.quizzes||!lesson.quizzes.length)return;
      lesson.quizzes.forEach((q,idx)=>{
        totalChecked++;
        // Check 1: Context-dependent question
        if(CONTEXT_PATTERNS.some(p=>p.test(q.q))){
          issues.push({type:'CONTEXT-DEPENDENT',severity:'HIGH',
            location:`Section ${sec.id} › ${lesson.title} › Q-index ${idx}`,
            detail:`Question references external data: "${q.q.slice(0,80)}..."`,
            fix:'Embed all required data directly in the question text.'});}
        // Check 2: Answer index out of bounds
        if(typeof q.a!=='number'||q.a<0||q.a>=(q.o||[]).length){
          issues.push({type:'INVALID ANSWER INDEX',severity:'CRITICAL',
            location:`Section ${sec.id} › ${lesson.title} › Q-index ${idx}`,
            detail:`"a": ${q.a} is out of range. Options length: ${(q.o||[]).length}`,
            fix:'Correct the "a" field to a valid index (0 to options.length - 1).'});}
        // Check 3: Missing explanation
        if(!q.e||q.e.trim().length<10){
          issues.push({type:'MISSING EXPLANATION',severity:'MEDIUM',
            location:`Section ${sec.id} › ${lesson.title} › Q-index ${idx}`,
            detail:`Explanation is empty or too short: "${(q.e||'').slice(0,40)}"`,
            fix:'Add a meaningful explanation to the "e" field.'});}
        // Check 4: Insufficient options
        if(!q.o||q.o.length<2){
          issues.push({type:'INSUFFICIENT OPTIONS',severity:'HIGH',
            location:`Section ${sec.id} › ${lesson.title} › Q-index ${idx}`,
            detail:`Only ${(q.o||[]).length} option(s) found. Minimum is 2.`,
            fix:'Add more answer options to the "o" array.'});}
        // Check 5: Duplicate options
        if(q.o&&q.o.length!==new Set(q.o.map(o=>o.trim().toLowerCase())).size){
          issues.push({type:'DUPLICATE OPTIONS',severity:'MEDIUM',
            location:`Section ${sec.id} › ${lesson.title} › Q-index ${idx}`,
            detail:`Duplicate answer options in: "${q.q.slice(0,60)}..."`,
            fix:'Ensure all answer options are unique.'});}
      });
    });
  });
  if(silent)return issues;
  const crit=issues.filter(i=>i.severity==='CRITICAL').length;
  const high=issues.filter(i=>i.severity==='HIGH').length;
  const med=issues.filter(i=>i.severity==='MEDIUM').length;
  if(issues.length===0){
    console.log('%c✅ Quiz Data Integrity: PASSED — '+totalChecked+' questions scanned, 0 issues.','color:var(--ok-strong);font-weight:bold;background:var(--ok-tint);padding:3px 8px;border-radius:4px');
    return issues;}
  console.group('%c⚠️ Quiz Data Integrity: '+issues.length+' issue(s) in '+totalChecked+' questions','color:var(--err-strong);font-weight:bold;background:var(--err-tint);padding:3px 8px;border-radius:4px');
  console.log('  🔴 CRITICAL: '+crit+'   🟠 HIGH: '+high+'   🟡 MEDIUM: '+med);
  issues.forEach((issue,i)=>{
    const c=issue.severity==='CRITICAL'?'var(--err-strong)':issue.severity==='HIGH'?'var(--warn-strong)':'#555';
    console.group('%c'+(i+1)+'. ['+issue.severity+'] '+issue.type,'color:'+c+';font-weight:bold');
    console.log('📍 Location:',issue.location);
    console.log('📋 Detail  :',issue.detail);
    console.log('🔧 Fix     :',issue.fix);
    console.groupEnd();
  });
  console.groupEnd();
  return issues;
}
// Auto-run validator after all quizzes load — non-blocking, never breaks the app
async function runValidatorAfterLoad(){
  try{await Promise.all([1,2,3,4,5,6].map(i=>ensureQuizzes(i)));validateQuizData();}
  catch(e){/* silent fail */}
}
setTimeout(runValidatorAfterLoad,4000);
// ─────────────────────────────────────────────────────────────────────────────

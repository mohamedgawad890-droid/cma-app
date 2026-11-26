// ═════════════════════════════════════════════════════════════════════════════
// GROUP EXAM — PART 2 (CBQ), 50% MCQ GATE, LOCKED ANSWERS, ESTIMATED /500
// An exam with includeCbq:true is two parts:
//   Part 1 = the normal MCQ runner.  Part 2 = frozen CBQ cases (exam.cbqIds) with
//   its own timer, open only when MCQ correct >= 50%. Part 2 is stored under the
//   `cbq` field of the same exam-results doc (see firestore.rules).
// Answers stay hidden until Part 2 is submitted or the exam closes. NOTE: this is
// an interface lock — the question bank itself is a public file.
// ═════════════════════════════════════════════════════════════════════════════
const EXAM_CBQ_PASS_POINTS=360;   // practice pass mark on the estimated 500 scale
const EXAM_CBQ_DEFAULT_COUNT=2;
const EXAM_CBQ_DEFAULT_MINUTES=60;
const CBQ_LETTER_SECTION={A:1,B:2,C:3,D:4,E:5,F:6};

// ── pure helpers ────────────────────────────────────────────────────────────
function examCbqUnlocked(score,total){return total>0&&score*2>=total;}
function examEstimate500(mcqScore,mcqTotal,cbqScore,cbqTotal){
  const mcq=mcqTotal?mcqScore/mcqTotal*375:0;
  const cbq=cbqTotal?cbqScore/cbqTotal*125:0;
  return Math.round((mcq+cbq)*10)/10;
}
// One summary for every screen. attempt = an exam-results doc (or the same shape).
// state: 'locked' (below 50%) | 'pending' (Part 2 open to take) | 'running' |
//        'done' | 'missed' (exam closed before Part 2 was finished)
function examCbqSummary(exam,attempt){
  const c=(attempt&&attempt.cbq)||null;
  const closed=examWindowStatus(exam)==='closed';
  if(!examCbqUnlocked(attempt.score,attempt.total))return {state:'locked',points:null,passed:false,label:'Not passed: CBQ not unlocked'};
  if(c&&c.submitted){
    const points=examEstimate500(attempt.score,attempt.total,c.score,c.total);
    const passed=points>=EXAM_CBQ_PASS_POINTS;
    return {state:'done',points,passed,cbqPct:c.percentage,label:points+'/500 · '+(passed?'Passed':'Not passed')};
  }
  const running=!!(c&&c.deadlineAt&&Date.parse(c.deadlineAt)>Date.now());
  if(running)return {state:'running',points:null,passed:false,label:'Part 2 in progress'};
  // time ran out but not yet saved: still resumable (it submits what was saved)
  if(c)return {state:'running',points:null,passed:false,label:'Part 2 time ended, not submitted'};
  if(closed)return {state:'missed',points:null,passed:false,label:'Part 2 not taken'};
  return {state:'pending',points:null,passed:false,label:'Part 2 not started'};
}
function examAnswersLocked(exam,attempt){
  if(!exam||!exam.includeCbq||!attempt)return false;
  if(examWindowStatus(exam)==='closed')return false;
  return !(attempt.cbq&&attempt.cbq.submitted);
}
function examAllCbqCases(){
  if(typeof CBQ_DATA==='undefined')return [];
  return CBQ_SEC_KEYS.reduce((out,k)=>out.concat((CBQ_DATA[k]||[]).map(c=>Object.assign({sk:k,sectionId:CBQ_LETTER_SECTION[k]},c))),[]);
}
// App pick: rotate through the exam's sections so cases are spread out.
function pickExamCbqIds(cases,sectionIds,n){
  const groups=_shuffleInPlace(sectionIds.slice()).map(sid=>_shuffleInPlace(cases.filter(c=>c.sectionId===Number(sid)).map(c=>c.id)));
  const out=[];
  while(out.length<n&&groups.some(g=>g.length)){
    groups.forEach(g=>{if(out.length<n&&g.length)out.push(g.pop());});
  }
  return out;
}
function examCbqCasesFor(exam){
  const byId=new Map(examAllCbqCases().map(c=>[c.id,c]));
  return (exam.cbqIds||[]).map(id=>byId.get(id)).filter(Boolean);
}
// All-or-nothing per sub-question, same rules as the Mock Exam.
function examCbqGradeOne(q,a){
  if(a===undefined||a===null||a==='')return false;
  if(q.type==='calc'){const n=parseFloat(String(a).replace(/,/g,''));return !isNaN(n)&&Math.abs(n-q.exact)<=(q.tol||1);}
  if(q.type==='select')return parseInt(a)===q.ans;
  if(q.type==='blank')return q.blanks.every(b=>a[b.id]===b.ans);
  if(q.type==='drag')return q.items.every(it=>a[it]===q.correct[it]);
  return false;
}
function examCbqGrade(cases,answers){
  let score=0,total=0;
  const caseScores=cases.map(c=>{
    const mine=(answers&&answers[c.id])||{};
    let s=0;
    c.questions.forEach(q=>{if(examCbqGradeOne(q,mine[q.id]))s++;});
    score+=s;total+=c.questions.length;
    return {id:c.id,s,t:c.questions.length};
  });
  return {score,total,percentage:total?Math.round(score/total*100):0,caseScores};
}
function _examCbqParse(c){try{return c&&c.aj?JSON.parse(c.aj):{};}catch(e){return {};}}

// ── persistence ─────────────────────────────────────────────────────────────
let _examCbqTimer=null,_examCbqSaveTimer=null,_examCbqHooked=false;
function _examCbqKey(docId){return 'cma-exam-cbq-v1:'+docId;}
function _examCbqActive(){const s=STATE.examSession;return !!(s&&s.part2&&!s.part2.submitted&&!s.part2.review);}
function _examCbqSaveLocal(){
  if(!_examCbqActive())return;
  const s=STATE.examSession;
  try{localStorage.setItem(_examCbqKey(s.docId),JSON.stringify({a:s.part2.answers,i:s.part2.idx,t:Date.now()}));}catch(e){}
}
function _examCbqDoc(p){
  return {startedAt:p.startedAt,deadlineAt:p.deadlineAt,aj:JSON.stringify(p.answers),savedAt:Date.now(),submitted:false};
}
async function _examCbqFlush(){
  if(_examCbqSaveTimer){clearTimeout(_examCbqSaveTimer);_examCbqSaveTimer=null;}
  if(!_examCbqActive()||STATE.examSession.part2.submitting||!STATE.examSession.part2.dirty)return;
  const s=STATE.examSession,p=s.part2;
  p.dirty=false;
  try{await db.collection('exam-results').doc(s.docId).update({cbq:_examCbqDoc(p)});}
  catch(e){p.dirty=true;}   // offline: the local copy is intact
}
function _examCbqMark(){
  if(!_examCbqActive())return;
  STATE.examSession.part2.dirty=true;
  _examCbqSaveLocal();
  if(!_examCbqSaveTimer)_examCbqSaveTimer=setTimeout(_examCbqFlush,60000);
}
function _examCbqHook(){
  if(_examCbqHooked)return;
  _examCbqHooked=true;
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')_examCbqFlush();});
  window.addEventListener('pagehide',_examCbqFlush);
  window.addEventListener('online',_examCbqFlush);
}

// ── start / resume ──────────────────────────────────────────────────────────
async function _examCbqFetchAttempt(docId){
  const d=await db.collection('exam-results').doc(docId).get();
  return d.exists?Object.assign({_docId:docId},d.data()):null;
}
function _examCbqLatest(examId){
  const r=(STATE.studentExamResults||{})[examId];
  return r&&r._docId?r:null;
}
let _examCbqStarting=false;
async function startExamCbq(examId){
  if(_examCbqStarting)return;
  _examCbqStarting=true;
  try{await _startExamCbq(examId);}
  finally{_examCbqStarting=false;}
}
async function _startExamCbq(examId){
  const exam=(STATE.studentExams||[]).find(e=>e.id===examId)
    ||(STATE.examSession&&STATE.examSession.examId===examId?STATE.examSession.exam:null);
  if(!exam)return;
  const known=_examCbqLatest(examId);
  const docId=known?known._docId:(STATE.examSession&&STATE.examSession.examId===examId?STATE.examSession.docId:null);
  if(!docId){showToast('Result not found. Refresh and try again.','error');return;}
  let attempt,cases;
  try{
    attempt=await _examCbqFetchAttempt(docId);
    await ensureCBQData();
    cases=examCbqCasesFor(exam);
  }catch(e){showToast('Could not load Part 2. Check your connection and try again.','error',4000);return;}
  if(!attempt||!attempt.submitted){showToast('Submit Part 1 first.','warning');return;}
  if(!examCbqUnlocked(attempt.score,attempt.total)){showToast('Part 2 needs at least 50% on Part 1.','warning');return;}
  if(attempt.cbq&&attempt.cbq.submitted){showToast('Part 2 was already submitted.','warning');return;}
  if(!cases.length||cases.length!==(exam.cbqIds||[]).length){showToast('The case studies could not be loaded. Refresh the app and try again.','error',4000);return;}
  let cbq=attempt.cbq||null;
  if(!cbq){
    if(examWindowStatus(exam)!=='active'){showToast('The exam has closed. Part 2 can no longer be started.','warning',4000);return;}
    const minutes=exam.cbqDurationMinutes||EXAM_CBQ_DEFAULT_MINUTES;
    const full=Date.now()+minutes*60000;
    const deadline=Math.min(full,exam.closesAt?Date.parse(exam.closesAt):full);
    const left=Math.max(1,Math.round((deadline-Date.now())/60000));
    const ok=await showModal({icon:'\u{1F4DD}',title:'Start Part 2 (Case Studies)?',
      body:'⚠️ Timer starts immediately. Part 2 auto-submits at the deadline.',
      list:['\u{1F4C4} Case studies: '+cases.length,'⏱️ Time available: '+left+' minutes'+(left<minutes?' (the exam closes before the full '+minutes+')':'')],
      type:'primary',confirmText:'Start Part 2',cancelText:'Not Yet'});
    if(!ok)return;
    const startedAt=new Date().toISOString();
    const deadlineAt=new Date(Math.min(Date.now()+minutes*60000,exam.closesAt?Date.parse(exam.closesAt):Infinity)).toISOString();
    cbq={startedAt,deadlineAt,aj:'{}',savedAt:Date.now(),submitted:false};
    try{await db.collection('exam-results').doc(docId).update({cbq});}
    catch(e){showToast('Could not start Part 2: '+e.message,'error',5000);return;}
  }
  let answers=_examCbqParse(cbq),idx=0;
  try{
    const local=JSON.parse(localStorage.getItem(_examCbqKey(docId))||'null');
    if(local&&local.a&&(local.t||0)>(cbq.savedAt||0)){answers=local.a;}
    if(local)idx=Math.max(0,Math.min(cases.length-1,local.i||0));
  }catch(e){}
  _examStopTimer();
  STATE.examSession={
    examId,docId,exam,questions:[],answers:{},attemptNumber:attempt.attemptNumber||1,
    submitted:true,reviewMode:false,mcq:{score:attempt.score,total:attempt.total,percentage:attempt.percentage},
    startedAt:attempt.startedAt,
    part2:{cases,answers,idx,startedAt:cbq.startedAt,deadlineAt:cbq.deadlineAt,submitted:false,submitting:false,review:false,dirty:false}
  };
  _examCbqHook();
  STATE.tab='exam';render();
  _examCbqStartTimer();
}
function _examCbqStopTimer(){if(_examCbqTimer){clearInterval(_examCbqTimer);_examCbqTimer=null;}}
function _examCbqStartTimer(){
  _examCbqStopTimer();
  const tick=()=>{
    if(!_examCbqActive()){_examCbqStopTimer();return;}
    const p=STATE.examSession.part2;
    const remaining=Date.parse(p.deadlineAt)-Date.now();
    const el=document.getElementById('exam-cbq-timer');
    if(el){el.textContent=_examCbqClock(remaining);el.style.color=remaining<60000?'var(--err)':remaining<300000?'#D2691E':'var(--ink)';}
    if(remaining<=0&&!p.submitting&&Date.now()>=(p.retryAt||0))submitExamCbq(true);
    else if(remaining>0&&STATE.tab!=='exam'){_examCbqFlush();_examCbqStopTimer();}
  };
  _examCbqTimer=setInterval(tick,1000);
  tick();
}
function _examCbqClock(ms){
  const s=Math.max(0,Math.floor(ms/1000));
  return String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
}

// ── answering ───────────────────────────────────────────────────────────────
// Handlers take indexes only, so case text never has to be quoted inside HTML.
function _examCbqRef(qi){
  const p=STATE.examSession.part2,c=p.cases[p.idx];
  const q=c.questions[qi];
  const mine=p.answers[c.id]||(p.answers[c.id]={});
  return {p,q,mine};
}
function examCbqSelect(qi,opt){
  if(!_examCbqActive())return;
  const {q,mine}=_examCbqRef(qi);
  mine[q.id]=opt;
  document.querySelectorAll('[data-xcbq="'+qi+'"]').forEach((el,j)=>el.classList.toggle('selected',j===opt));
  _examCbqMark();
}
function examCbqCalc(qi,val){
  if(!_examCbqActive())return;
  const {q,mine}=_examCbqRef(qi);
  mine[q.id]=val;_examCbqMark();
}
function examCbqBlank(qi,bi,val){
  if(!_examCbqActive())return;
  const {q,mine}=_examCbqRef(qi);
  const o=mine[q.id]||(mine[q.id]={});
  if(val)o[q.blanks[bi].id]=val;else delete o[q.blanks[bi].id];
  _examCbqMark();
}
function examCbqPlace(qi,ii,zi){
  if(!_examCbqActive())return;
  const {q,mine}=_examCbqRef(qi);
  const o=mine[q.id]||(mine[q.id]={});
  if(zi==='')delete o[q.items[ii]];else o[q.items[ii]]=q.zones[Number(zi)];
  _examCbqMark();
}
function examCbqGoCase(i){
  const s=STATE.examSession;
  if(!s||!s.part2)return;
  s.part2.idx=Math.max(0,Math.min(s.part2.cases.length-1,i));
  _examCbqSaveLocal();
  render();
  const el=document.getElementById('exam-cbq-scroll');if(el)el.scrollTop=0;
}

// ── submit ──────────────────────────────────────────────────────────────────
async function submitExamCbq(auto){
  if(!_examCbqActive()||STATE.examSession.part2.submitting)return;
  const s=STATE.examSession,p=s.part2;
  if(!auto){
    const ok=await showModal({icon:'\u{1F4DD}',title:'Submit Part 2?',body:'This ends the exam. You cannot change your answers afterwards.',type:'primary',confirmText:'Submit',cancelText:'Keep Working'});
    if(!ok||!_examCbqActive()||STATE.examSession!==s||p.submitting)return;
  }
  p.submitting=true;
  if(_examCbqSaveTimer){clearTimeout(_examCbqSaveTimer);_examCbqSaveTimer=null;}
  const g=examCbqGrade(p.cases,p.answers);
  const doc={startedAt:p.startedAt,deadlineAt:p.deadlineAt,aj:JSON.stringify(p.answers),savedAt:Date.now(),
    submitted:true,submittedAt:new Date().toISOString(),autoSubmitted:!!auto,
    score:g.score,total:g.total,percentage:g.percentage,caseScores:g.caseScores};
  try{
    await db.collection('exam-results').doc(s.docId).update({cbq:doc});
  }catch(e){
    p.submitting=false;p.retryAt=Date.now()+15000;
    showToast('Submission failed. Your answers are saved. Keep this page open or try again.','error',5000);
    return;
  }
  p.submitted=true;p.submitting=false;p.result=doc;
  _examCbqStopTimer();
  try{localStorage.removeItem(_examCbqKey(s.docId));}catch(e){}
  const r=(STATE.studentExamResults||{})[s.examId];
  if(r&&r._docId===s.docId){r.cbq=doc;(r.attempts||[]).forEach(a=>{if(a._docId===s.docId)a.cbq=doc;});}
  render();
  showToast(auto?'⏰ Time up. Part 2 auto-submitted.':'✅ Exam completed.',auto?'warning':'success',4000);
}

// ── screens ─────────────────────────────────────────────────────────────────
function renderExamCbqCase(c,answers,review){
  const types={calc:'CALCULATION',select:'SELECT FROM LIST',drag:'MATCH EACH ITEM',blank:'FILL IN BLANK'};
  const mine=answers[c.id]||{};
  const dis=review?' disabled':'';
  const cls=ok=>review?(ok?' correct':' wrong'):'';
  const qs=c.questions.map((q,qi)=>{
    const a=mine[q.id];
    let body='',title=q.text;
    if(q.type==='calc'){
      body='<div class="calc-wrap"><span class="calc-prefix">'+(q.pre===undefined?'$':q.pre||'$')+'</span><input type="number" inputmode="decimal" step="any" placeholder="0" class="calc-input'+cls(examCbqGradeOne(q,a))+'" value="'+esc(a==null?'':String(a))+'" oninput="examCbqCalc('+qi+',this.value)"'+dis+'><span style="font-size:14px;color:#888">'+(q.suf||'')+'</span></div>'
        +(review?'<div style="font-size:12px;margin-top:6px">Correct answer: <b>'+esc(String(q.exact))+'</b></div>':'');
    }else if(q.type==='select'){
      body='<div class="select-opts">'+q.opts.map((o,i)=>{
        let k=a===i?' selected':'';
        if(review)k=i===q.ans?' correct':(a===i?' wrong':'');
        return '<div class="select-opt'+k+'" data-xcbq="'+qi+'"'+(review?'':' onclick="examCbqSelect('+qi+','+i+')"')+'>'+o+'</div>';
      }).join('')+'</div>';
    }else if(q.type==='blank'){
      let txt=q.text;
      q.blanks.forEach((b,bi)=>{
        const v=(a||{})[b.id]||'';
        txt=txt.replace('['+b.id+']','<select class="blank-sel'+cls(v===b.ans)+'" onchange="examCbqBlank('+qi+','+bi+',this.value)"'+dis+'><option value="">—select—</option>'+b.opts.map(o=>'<option value="'+esc(o)+'"'+(v===o?' selected':'')+'>'+o+'</option>').join('')+'</select>');
      });
      title='Complete the sentence:';
      body='<div class="blank-sentence">'+txt+'</div>'
        +(review?'<div style="font-size:12px;margin-top:6px">Correct: <b>'+q.blanks.map(b=>b.ans).join(' · ')+'</b></div>':'');
    }else if(q.type==='drag'){
      // Dropdowns instead of drag-and-drop: they work on phones and iPads.
      body=q.items.map((it,ii)=>{
        const v=(a||{})[it]||'';
        return '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:6px 0;border-bottom:.5px solid var(--border)"><span style="flex:1 1 180px;font-size:13px">'+it+'</span>'
          +'<select class="blank-sel'+cls(v===q.correct[it])+'" onchange="examCbqPlace('+qi+','+ii+',this.value)"'+dis+'><option value="">—select—</option>'+q.zones.map((z,zi)=>'<option value="'+zi+'"'+(v===z?' selected':'')+'>'+z+'</option>').join('')+'</select>'
          +(review&&v!==q.correct[it]?'<span style="font-size:12px;flex-basis:100%">Correct: <b>'+q.correct[it]+'</b></span>':'')+'</div>';
      }).join('');
    }
    const ok=review&&examCbqGradeOne(q,a);
    const fb=review?'<div class="q-fb show '+(ok?'ok':'no')+'">'+(ok?'✅ Correct! ':'❌ Incorrect. ')+(q.fb||'')+'</div>':'';
    return '<div class="q-block"><div class="q-header"><div class="q-num">'+(qi+1)+'</div><div style="flex:1"><div style="margin-bottom:5px"><span class="q-type-badge">'+types[q.type]+'</span></div><div class="q-text">'+title+'</div>'
      +(q.hint&&review?'<div style="font-size:12px;color:#888;margin-top:4px;font-style:italic">\u{1F4A1} '+q.hint+'</div>':'')
      +'</div></div><div class="q-body">'+body+fb+'</div></div>';
  }).join('');
  const exhibit=c.exhibit?'<div class="exhibit-wrap" style="overflow-x:auto"><table class="exhibit-tbl"><tr>'+c.exhibit.headers.map(h=>'<th>'+h+'</th>').join('')+'</tr>'+c.exhibit.rows.map(r=>'<tr>'+r.map((v,i)=>'<td class="'+(i>0?'num':'')+'">'+v+'</td>').join('')+'</tr>').join('')+'</table></div>':'';
  return '<div class="case-box"><div class="case-label">\u{1F4C4} CASE STUDY · '+esc(c.title||'')+'</div><div class="case-text">'+String(c['case']||'').replace(/\n/g,'<br>')+'</div>'+exhibit+'</div>'+qs;
}
function renderExamCbqRunner(){
  const s=STATE.examSession,p=s.part2,c=p.cases[p.idx],review=p.review;
  const tabs=p.cases.map((_,i)=>'<button onclick="examCbqGoCase('+i+')" style="padding:7px 14px;border-radius:14px;border:1px solid '+(i===p.idx?'var(--brand)':'var(--border-4)')+';background:'+(i===p.idx?'var(--brand)':'var(--surface)')+';color:'+(i===p.idx?'#fff':'var(--ink)')+';font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Case '+(i+1)+'</button>').join('');
  const last=p.idx>=p.cases.length-1;
  const mainBtn=!last
    ?'<button class="btn" onclick="examCbqGoCase('+(p.idx+1)+')" style="flex:1;background:var(--brand);color:#fff">Next case ›</button>'
    :(review?'<button class="btn" onclick="exitExam()" style="flex:1;background:var(--brand);color:#fff">Done</button>'
            :'<button class="btn" onclick="submitExamCbq(false)" style="flex:1;background:var(--ok-strong-2);color:#fff">Submit Part 2</button>');
  return '<div style="display:flex;flex-direction:column;height:100%">'
    +'<div style="background:var(--surface-3);border-bottom:.5px solid var(--border);padding:10px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0">'
    +'<div style="flex:1;min-width:0"><div style="font-size:11px;color:#888;text-transform:uppercase">'+esc(s.exam.title)+'</div><div style="font-size:13px;font-weight:600;color:var(--ink)">'+(review?(s.reviewStudent?esc(s.reviewStudent.name||'Student')+' · ':'')+'Part 2 review':'Part 2 · Case Studies')+'</div></div>'
    +(review?'<button onclick="exitExam()" style="padding:6px 12px;border-radius:8px;border:.5px solid var(--border-4);background:var(--surface);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Close</button>'
            :'<div id="exam-cbq-timer" style="background:var(--surface);border:.5px solid var(--border-4);border-radius:8px;padding:6px 10px;font-family:\'Courier New\',monospace;font-size:14px;font-weight:700">'+_examCbqClock(Date.parse(p.deadlineAt)-Date.now())+'</div>')
    +'</div>'
    +'<div style="display:flex;gap:6px;padding:8px 14px;flex-shrink:0;overflow-x:auto">'+tabs+'</div>'
    +'<div class="scroll-area" id="exam-cbq-scroll" style="padding-bottom:20px">'
    +renderExamCbqCase(c,p.answers,review)
    +'<div style="display:flex;gap:8px;padding:12px 16px">'+(p.idx>0?'<button class="btn btn-outline" onclick="examCbqGoCase('+(p.idx-1)+')" style="flex:0 0 auto">‹ Previous</button>':'')+mainBtn+'</div>'
    +'</div></div>';
}
// Shown after Part 1, and again after Part 2, for includeCbq exams only.
function renderExamCbqStatus(){
  const s=STATE.examSession;
  const mcq=s.mcq||s.results;
  const cbq=s.part2&&s.part2.submitted?s.part2.result:null;
  const sum=examCbqSummary(s.exam,{score:mcq.score,total:mcq.total,cbq});
  const row=(l,v)=>'<div style="display:flex;justify-content:space-between;gap:10px;padding:7px 0;border-bottom:.5px solid var(--border)"><span style="color:#888">'+l+'</span><span style="font-weight:600;color:var(--ink);text-align:right">'+v+'</span></div>';
  const locked=examAnswersLocked(s.exam,{score:mcq.score,total:mcq.total,cbq});
  let head,note,buttons='<button class="btn btn-outline" onclick="exitExam()">Back to Home</button>';
  if(sum.state==='done'){
    head=sum.passed?'✅ Passed (estimate)':'❌ Not passed (estimate)';
    note='Practice pass mark: '+EXAM_CBQ_PASS_POINTS+'/500. Estimated, not an official IMA score.';
  }else if(sum.state==='locked'){
    head='❌ '+sum.label;
    note='You need at least 50% on Part 1 to open the case studies.'+(locked?' Answers will be available after the exam closes.':'');
  }else if(sum.state==='missed'){
    head='⏳ Part 2 not taken';note='The exam has closed.';
  }else{
    head='\u{1F513} Part 2 unlocked';
    note='You scored 50% or more. Answers stay hidden until you finish Part 2. Start it before the exam closes.';
    buttons+='<button class="btn" onclick="startExamCbq(\''+s.examId+'\')" style="background:var(--brand);color:#fff">'+(sum.state==='running'?'Resume':'Start')+' Part 2 →</button>';
  }
  if(!locked)buttons+='<button class="btn" onclick="openExamReview(\''+s.examId+'\')" style="background:var(--brand);color:#fff">Review MCQ answers</button>';
  if(cbq)buttons+='<button class="btn" onclick="openExamCbqReview(\''+s.examId+'\')" style="background:var(--brand);color:#fff">Review case studies</button>';
  return '<div class="scroll-area" style="padding:36px 16px 20px;text-align:center">'
    +'<div style="font-size:12px;color:#888">'+esc(s.exam.title)+'</div>'
    +'<div style="font-size:20px;font-weight:600;margin:8px 0 16px;color:var(--ink)">'+head+'</div>'
    +'<div class="card" style="text-align:left;margin-bottom:14px">'
    +row('Part 1 (MCQ)',mcq.score+'/'+mcq.total+' · '+mcq.percentage+'%')
    +(cbq?row('Part 2 (CBQ)',cbq.score+'/'+cbq.total+' · '+cbq.percentage+'%'):'')
    +(sum.points!=null?row('Estimated score',sum.points+' / 500'):'')
    +'</div>'
    +'<div style="font-size:12px;color:#888;line-height:1.6;margin-bottom:16px">'+note+'</div>'
    +'<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">'+buttons+'</div>'
    +'</div>';
}

// Reopen the status screen later (from the Home card).
async function openExamCbqStatus(examId){
  const exam=(STATE.studentExams||[]).find(e=>e.id===examId);
  const known=_examCbqLatest(examId);
  if(!exam||!known){showToast('Result not found. Refresh and try again.','error');return;}
  try{
    const a=await _examCbqFetchAttempt(known._docId);
    if(!a||!a.submitted){showToast('No result found.','error');return;}
    _examStopTimer();
    STATE.examSession={examId,docId:known._docId,exam,questions:[],answers:{},submitted:true,reviewMode:false,
      mcq:{score:a.score,total:a.total,percentage:a.percentage},
      part2:a.cbq&&a.cbq.submitted?{submitted:true,review:false,result:a.cbq,cases:[],answers:_examCbqParse(a.cbq),idx:0}:null};
    STATE.tab='exam';render();
  }catch(e){showToast('Could not load the result: '+e.message,'error');}
}
// Student: own result. Instructor: pass the result doc and student.
async function openExamCbqReview(examId,attemptDoc,student){
  const exam=(STATE.studentExams||[]).find(e=>e.id===examId)||(STATE.dashExams||[]).find(e=>e.id===examId)
    ||(STATE.examSession&&STATE.examSession.exam);
  if(!exam)return;
  try{
    let a=attemptDoc;
    if(!a){
      const docId=(STATE.examSession&&STATE.examSession.examId===examId&&STATE.examSession.docId)||(_examCbqLatest(examId)||{})._docId;
      a=docId?await _examCbqFetchAttempt(docId):null;
    }
    if(!a||!a.cbq||!a.cbq.submitted){showToast('Part 2 has not been submitted.','warning');return;}
    await ensureCBQData();
    const cases=examCbqCasesFor(exam);
    if(!cases.length){showToast('The case studies could not be loaded.','error');return;}
    _examStopTimer();
    STATE.examSession={examId,docId:a._docId,exam,questions:[],answers:{},submitted:true,reviewMode:false,
      mcq:{score:a.score,total:a.total,percentage:a.percentage},reviewStudent:student||null,
      instructorReturnTab:student?'dashboard':undefined,
      part2:{cases,answers:_examCbqParse(a.cbq),idx:0,submitted:true,review:true,result:a.cbq}};
    STATE.tab='exam';render();
  }catch(e){showToast('Could not load the review: '+e.message,'error');}
}

// CMA Prep — instructor dashboard source (Batch 24). Joined in filename order
// into dist/dashboard.min.js, loaded only for the instructor. Functions only.

function setResultsView(v){
  STATE.dashResultsView=v;
  try{ localStorage.setItem('cma-results-view', v); }catch{}
  render();
}

function _primeResultsView(){
  if(STATE.dashResultsView) return;
  try{ STATE.dashResultsView = localStorage.getItem('cma-results-view') || 'list'; }
  catch{ STATE.dashResultsView = 'list'; }
}

function renderDashResults(){
  const exams=(STATE.dashExams||[]).slice();
  if(!exams.length){
    return `<div class="dx-01">${renderDashTabEmpty('Results',STATE.dashSelectedGroup,{icon:'\u{1F4CA}',body:'No exams yet for this group. Create one from the Exams tab.'})}</div>`;
  }
  _primeResultsView();
  const activeView=STATE.dashResultsView||'list';
  const viewToggle=`<div class="att-view-toggle">
    <button class="att-view-btn${activeView==='list'?' active':''}" onclick="setResultsView('list')">\u{1F4CB} Per-Exam View</button>
    <button class="att-view-btn${activeView==='matrix'?' active':''}" onclick="setResultsView('matrix')">\u{1F4CA} Matrix View</button>
  </div>`;
  if(activeView==='matrix'){
    const g=STATE.dashSelectedGroup;
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===String(g).toUpperCase());
    return `<div class="dx-01">
      ${viewToggle}
      <div class="dx-19">Group has <b>${students.length}</b> student${students.length===1?'':'s'} \u00B7 ${exams.length} exam${exams.length===1?'':'s'}</div>
      ${renderDashResultsMatrix(g,exams,students)}
      <div class="dx-04"></div>
    </div>`;
  }
  const closed=exams.filter(x=>examWindowStatus(x)==='closed');
  const active=exams.filter(x=>examWindowStatus(x)==='active');
  const scheduled=exams.filter(x=>examWindowStatus(x)==='scheduled');
  const order=[...closed,...active,...scheduled];
  const rows=order.map(x=>renderResultsCard(x)).join('');
  return `<div class="dx-01">
    ${viewToggle}
    <div style="font-size:12px;color:var(--muted);margin:10px 0">Tap any exam to expand per-student breakdown.</div>
    ${rows}
    <div class="dx-04"></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 11 — RESULTS MATRIX (one row per student, one column per exam)
// ═══════════════════════════════════════════════════════════════════════════
function renderDashResultsMatrix(groupCode,exams,students){
  let missing=0;
  exams.forEach(x=>{
    const cache=STATE.dashExamResults[x.id];
    if(!cache||!cache.loaded){
      missing++;
      loadExamResults(x.id).then(()=>{if(STATE.tab==='dashboard'&&STATE.dashTab==='results')render();}).catch(()=>{});
    }
  });
  if(missing>0){
    return `<div class="dx-08"><div class="dx-34">\u23F3</div><div class="dx-06">Loading results for ${missing} exam${missing===1?'':'s'}\u2026</div></div>`;
  }
  const examsSorted=exams.slice().sort((a,b)=>(a.opensAt||'').localeCompare(b.opensAt||''));
  const studentsSorted=students.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  if(!studentsSorted.length){
    return `<div class="dx-08"><div class="dx-35">\u{1F464}</div><div class="dx-06">No students in group ${esc(groupCode)}.</div></div>`;
  }
  // res[userId][examId] = percentage
  const res={};
  examsSorted.forEach(x=>{
    const cache=STATE.dashExamResults[x.id];
    (cache&&cache.results||[]).forEach(r=>{
      if(!r.userId||!r.submitted)return;
      if(!res[r.userId])res[r.userId]={};
      res[r.userId][x.id]=r.percentage||0;
    });
  });
  const rowSummary={};
  studentsSorted.forEach(s=>{
    let sum=0,n=0;
    examsSorted.forEach(x=>{
      const p=(res[s.uid]||{})[x.id];
      if(p!=null){sum+=p;n++;}
    });
    rowSummary[s.uid]={avg:n?Math.round(sum/n):0,n,total:examsSorted.length};
  });
  const colSummary={};
  examsSorted.forEach(x=>{
    let sum=0,n=0;
    studentsSorted.forEach(s=>{
      const p=(res[s.uid]||{})[x.id];
      if(p!=null){sum+=p;n++;}
    });
    colSummary[x.id]={avg:n?Math.round(sum/n):0,n,rate:studentsSorted.length?Math.round(n/studentsSorted.length*100):0};
  });
  const pctColor=(p)=>p>=80?'var(--ok-2)':(p>=60?'var(--warn-strong)':'var(--err-2)');
  const pctBg=(p)=>p>=80?'var(--ok-tint-2)':(p>=60?'var(--warn-tint)':'var(--err-tint)');
  const cellFor=(s,x)=>{
    const p=(res[s.uid]||{})[x.id];
    if(p==null)return `<div title="Not taken" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted-2);font-size:12px">\u2013</div>`;
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${pctBg(p)};color:${pctColor(p)};font-weight:700;font-size:11px">${p}%</div>`;
  };
  const headerCells=examsSorted.map(x=>`<th style="min-width:64px;max-width:64px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);line-height:1.2;position:sticky;top:0;z-index:2" title="${esc(x.title||'')}">${esc((x.title||'').length>10?(x.title||'').slice(0,9)+'\u2026':(x.title||''))}</th>`).join('');
  const headerRow=`<thead><tr>
    <th class="dx-36">Student</th>
    ${headerCells}
    <th style="min-width:80px;max-width:80px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);position:sticky;top:0;z-index:2">Avg</th>
  </tr></thead>`;
  const bodyRows=studentsSorted.map(s=>{
    const cells=examsSorted.map(x=>`<td style="min-width:64px;max-width:64px;height:34px;padding:0;border:1px solid var(--border);background:var(--card)">${cellFor(s,x)}</td>`).join('');
    const sum=rowSummary[s.uid];
    return `<tr>
      <td onclick="STATE.dashStudentDetailUid='${esc(s.uid)}';render()" class="dx-37" title="${esc(s.name||'')}">${esc(s.name||'Unnamed')}</td>
      ${cells}
      <td style="min-width:80px;max-width:80px;padding:4px;border:1px solid var(--border);background:var(--card);text-align:center"><div style="font-size:12px;font-weight:700;color:${sum.n?pctColor(sum.avg):'var(--muted-2)'}">${sum.n?sum.avg+'%':'\u2014'}</div><div class="dx-09">${sum.n}/${sum.total}</div></td>
    </tr>`;
  }).join('');
  const footerCells=examsSorted.map(x=>{
    const c=colSummary[x.id];
    return `<td style="min-width:64px;max-width:64px;padding:4px;border:1px solid var(--border);background:var(--surface-3);text-align:center"><div style="font-size:11px;font-weight:700;color:${c.n?pctColor(c.avg):'var(--muted-2)'}">${c.n?c.avg+'%':'\u2014'}</div><div class="dx-09">${c.rate}%</div></td>`;
  }).join('');
  const footerRow=`<tfoot><tr>
    <td class="dx-38">Exam avg</td>
    ${footerCells}
    <td class="dx-39"></td>
  </tr></tfoot>`;
  return `<div>
    <div class="dx-44">
      <button onclick="exportResultsMatrixCSV('${esc(groupCode)}')" class="dx-40">\u{1F4E5} Export CSV</button>
    </div>
    <div class="dx-41">
      <table class="dx-42">
        ${headerRow}
        <tbody>${bodyRows}</tbody>
        ${footerRow}
      </table>
    </div>
    <div class="dx-43">Tap a student name to open their profile. Color bands: green \u226580%, amber \u226560%, red below.</div>
  </div>`;
}

function exportResultsMatrixCSV(groupCode){
  try{
    const exams=(STATE.dashExams||[]).slice().sort((a,b)=>(a.opensAt||'').localeCompare(b.opensAt||''));
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===String(groupCode).toUpperCase())
      .slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const res={};
    exams.forEach(x=>{
      const cache=STATE.dashExamResults[x.id];
      (cache&&cache.results||[]).forEach(r=>{
        if(!r.userId||!r.submitted)return;
        if(!res[r.userId])res[r.userId]={};
        res[r.userId][x.id]=r.percentage||0;
      });
    });
    const csvEsc=(s)=>{ s=String(s==null?'':s); return /[,"\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
    const headers=['Student','Mobile','Email'].concat(exams.map(x=>x.title||'')).concat(['Avg %','Exams Taken','Total Exams']);
    const rows=[headers.map(csvEsc).join(',')];
    students.forEach(s=>{
      let sum=0,n=0;
      const cells=exams.map(x=>{
        const p=(res[s.uid]||{})[x.id];
        if(p!=null){sum+=p;n++;return p;}
        return '';
      });
      const avg=n?Math.round(sum/n):'';
      const row=[s.name||'',s.mobile||'',s.email||''].concat(cells).concat([avg,n,exams.length]);
      rows.push(row.map(csvEsc).join(','));
    });
    const csv='\uFEFF'+rows.join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const stamp=new Date().toISOString().slice(0,10);
    a.href=url; a.download=`results-${groupCode}-${stamp}.csv`;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 100);
    showToast('CSV downloaded','success',1500);
  }catch(e){ showToast('Export failed: '+e.message,'error'); }
}

function renderResultsCard(exam){

  const expanded=!!STATE.dashResultsExpanded[exam.id];
  const cache=STATE.dashExamResults[exam.id];
  const status=examWindowStatus(exam);
  const badgeStyle={active:'background:var(--ok-tint-2);color:var(--ok-2)',scheduled:'background:var(--warn-tint-2);color:var(--warn-strong)',closed:'background:var(--surface-4);color:var(--muted)'};
  const badgeLabel={active:'\u{1F7E2} ACTIVE',scheduled:'\u23F3 SCHEDULED',closed:'\u26AB CLOSED'};
  if(expanded&&(!cache||!cache.loaded)){
    loadExamResults(exam.id).then(()=>{if(STATE.tab==='dashboard'&&STATE.dashTab==='results')render();}).catch(()=>{});
  }
  const stats=(cache&&cache.stats)?cache.stats:null;
  const summary=stats?`<div style="font-size:12px;color:var(--ink-2);margin-top:4px;line-height:1.6">Submitted: <b>${stats.submitted}</b> \u00B7 Avg <b>${stats.avgPct}%</b> \u00B7 Pass rate <b>${stats.passRate}%</b> \u00B7 High <b>${stats.highest}%</b>, Low <b>${stats.lowest}%</b></div>`:'<div style="font-size:12px;color:var(--muted);margin-top:4px">Tap to load results.</div>';
  const arrow=expanded?'\u25BE':'\u25B8';
  let bodyRows='';
  if(expanded){
    if(!cache||cache.loading){bodyRows='<div style="text-align:center;padding:20px;color:var(--muted)">Loading\u2026</div>';}
    else if(!cache.results||!cache.results.length){bodyRows='<div style="text-align:center;padding:20px;color:var(--muted);font-size:13px">No students have started this exam.</div>';}
    else{
      const sorted=cache.results.slice().sort((a,b)=>(b.percentage||0)-(a.percentage||0));
      bodyRows=sorted.map(r=>{
        const pct=r.percentage||0;
        const color=pct>=80?'var(--ok-2)':pct>=60?'var(--warn-strong)':'var(--err-2)';
        const bg=pct>=80?'var(--ok-tint-2)':pct>=60?'var(--warn-tint)':'var(--err-tint)';
        const submittedFlag=r.submitted?'\u2705':'\u23F3 in progress';
        const attemptBadge=(r.attemptNumber&&r.attemptNumber>1)?' \u00B7 Attempt '+r.attemptNumber:'';
        return `<div onclick="openInstructorReview('${exam.id}','${esc(r._docId||'')}')" style="background:var(--card);border:.5px solid var(--border);border-radius:10px;padding:10px 12px;margin-top:6px;display:flex;align-items:center;gap:10px;cursor:pointer">
          <div style="min-width:0;flex:1"><div style="font-size:13px;font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.studentName||'Student')}</div>
          <div class="dx-07">${submittedFlag} \u00B7 ${r.score||0}/${r.total||0}${attemptBadge}</div></div>
          <div style="background:${bg};color:${color};padding:5px 12px;border-radius:14px;font-size:13px;font-weight:700;flex-shrink:0">${pct}%</div>
          ${r.submitted?'<div style="flex-shrink:0;font-size:11px;font-weight:600;color:var(--brand);white-space:nowrap;padding-left:2px">Review \u203A</div>':''}
        </div>`;
      }).join('');
    }
  }
  return `<div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:10px">
    <div onclick="toggleResultsExpand('${exam.id}')" style="cursor:pointer">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        <span style="font-size:16px;color:var(--muted)">${arrow}</span>
        <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;${badgeStyle[status]}">${badgeLabel[status]}</span>
      </div>
      <div class="dx-31">${esc(exam.title)}</div>
      ${summary}
    </div>
    ${bodyRows?'<div style="padding-top:10px;margin-top:8px;border-top:.5px solid var(--border)">'+bodyRows+'</div>':''}
  </div>`;
}

function toggleResultsExpand(examId){
  STATE.dashResultsExpanded[examId]=!STATE.dashResultsExpanded[examId];
  render();
}

function renderDashProgress(){
  const g=STATE.dashSelectedGroup;
  const cache=STATE.dashProgressByGroup[g];
  if(!cache||!cache.loaded){
    if(!cache||!cache.loading){loadDashProgress(g);}
    return `<div class="dx-01">${renderDashSkeleton()}</div>`;
  }
  const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===g.toUpperCase());
  if(!students.length){return `<div class="dx-01">${renderDashTabEmpty('Progress',g,{icon:'\u{1F4C8}',body:'No students in this group yet.'})}</div>`;}
  const rows=cache.rows.slice().sort((a,b)=>(b.acc||0)-(a.acc||0)).map(r=>{
    const pct=r.acc||0;
    const color=pct>=80?'var(--ok-2)':pct>=60?'var(--warn-strong)':'var(--err-2)';
    return `<div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
        <div style="font-size:13px;font-weight:600;color:var(--ink);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name||'Student')}</div>
        <div style="font-size:12px;font-weight:700;color:${color};flex-shrink:0">${pct}%</div>
      </div>
      <div style="font-size:11px;color:var(--muted);line-height:1.6">
        Lessons: <b>${r.lessons||0}</b> \u00B7 MCQs: <b>${r.mcqRight||0}/${r.mcqTotal||0}</b>${r.lastSeen?' \u00B7 Last seen <b>'+esc(r.lastSeen)+'</b>':''}
      </div>
    </div>`;
  }).join('')||`<div style="text-align:center;padding:30px 20px;color:var(--muted);font-size:13px">No progress records yet for this group.</div>`;
  return `<div class="dx-01">
    <div style="font-size:12px;color:var(--muted);margin-bottom:12px">${cache.rows.length} of ${students.length} students have progress data</div>
    ${rows}
    <div class="dx-04"></div>
  </div>`;
}

async function loadDashProgress(g){
  STATE.dashProgressByGroup[g]={loading:true,loaded:false,rows:[]};
  render();
  try{
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===g.toUpperCase());
    // "Last seen" comes from student-analytics, which the student app already updates when it is used.
    const seenByUid=Object.create(null);
    try{
      const an=await db.collection('student-analytics').where('groupCode','==',g.toUpperCase()).get();
      an.forEach(d=>{const x=d.data()||{};seenByUid[d.id]=x.updatedAt||'';});
    }catch(e){console.warn('[loadDashProgress] last-seen unavailable',e);}
    const knownLessons=new Set();S.forEach(sec=>sec.lessons.forEach(l=>knownLessons.add(String(l.id))));
    // Fetch progress docs one-by-one (allow-owner-or-instructor rule requires doc-by-doc reads)
    const rows=await Promise.all(students.map(async s=>{
      try{
        const doc=await db.collection('progress').doc(s.uid).get();
        if(!doc.exists)return null;
        const p=doc.data()||{};
        const mcqRight=p.mcqRight||0,mcqTotal=p.mcqTotal||0;
        const acc=mcqTotal>0?Math.round((mcqRight/mcqTotal)*100):0;
        // Saved shape is {done:[lessonId,…]}. Count current lessons only, once each.
        const lessonsDone=new Set((p.done||[]).map(String).filter(id=>knownLessons.has(id))).size;
        return {uid:s.uid,name:s.name||'Student',acc,mcqRight,mcqTotal,lessons:lessonsDone,lastSeen:dashFmtSeen(seenByUid[s.uid])};
      }catch(e){return null;}
    }));
    STATE.dashProgressByGroup[g]={loading:false,loaded:true,rows:rows.filter(Boolean)};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='progress')render();
  }catch(e){
    console.warn('[loadDashProgress]',e);
    STATE.dashProgressByGroup[g]={loading:false,loaded:true,rows:[],error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='progress')render();
  }
}

function renderDashLeader(){
  const g=STATE.dashSelectedGroup;
  const cache=STATE.dashLeaderByGroup[g];
  if(!cache||!cache.loaded){
    if(!cache||!cache.loading){loadDashLeader(g);}
    return `<div class="dx-01">${renderDashSkeleton()}</div>`;
  }
  const rows=cache.rows;
  if(!rows.length){return `<div class="dx-01">${renderDashTabEmpty('Leader',g,{icon:'\u{1F3C5}',body:'No leaderboard entries for this group yet. Students need to complete quizzes for a ranking to appear.'})}</div>`;}
  const medals=['\u{1F947}','\u{1F948}','\u{1F949}'];
  const items=rows.map((r,i)=>{
    const medal=i<3?medals[i]:('#'+(i+1));
    const pct=r.accuracy||0;
    return `<div style="background:var(--card);border:.5px solid ${i<3?'#F5B04140':'var(--border)'};border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
      <div style="font-size:${i<3?'22px':'14px'};font-weight:700;color:var(--brand);min-width:34px;text-align:center">${medal}</div>
      <div style="min-width:0;flex:1">
        <div style="font-size:14px;font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name||'Student')}</div>
        <div class="dx-07">${r.lessons||0} lessons \u00B7 ${r.mcqRight||0}/${r.mcqTotal||0} MCQs</div>
      </div>
      <div style="background:var(--brand-tint);color:var(--brand);padding:5px 12px;border-radius:14px;font-size:13px;font-weight:700;flex-shrink:0">${pct}%</div>
    </div>`;
  }).join('');
  return `<div class="dx-01">
    <div style="font-size:12px;color:var(--muted);margin-bottom:10px">Top ${rows.length} of ${g} \u2014 by accuracy</div>
    ${items}
    <div class="dx-04"></div>
  </div>`;
}

async function loadDashLeader(g){
  STATE.dashLeaderByGroup[g]={loading:true,loaded:false,rows:[]};
  render();
  try{
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===g.toUpperCase());
    // Batch 23 (B23-09): batched `documentId in [...]` queries (10 ids per
    // query — the safe limit for SDK 9.23) instead of one get() per student.
    // Same rows, same null-on-missing semantics, ~10× fewer round trips.
    const uids=students.map(s=>s.uid).filter(Boolean);
    const lbByUid=Object.create(null);
    const idField=firebase.firestore.FieldPath.documentId();
    const chunks=[];
    for(let i=0;i<uids.length;i+=10)chunks.push(uids.slice(i,i+10));
    await Promise.all(chunks.map(async ch=>{
      try{
        const snap=await db.collection('leaderboard').where(idField,'in',ch).get();
        snap.forEach(d=>{lbByUid[d.id]=d.data()||{};});
      }catch(e){console.warn('[loadDashLeader] chunk failed',e);}
    }));
    const rows=students.map(s=>{
      const p=lbByUid[s.uid];
      if(!p)return null;
      return {uid:s.uid,name:p.name||s.name||'Student',accuracy:p.accuracy||0,lessons:p.lessons||0,mcqRight:p.mcqRight||0,mcqTotal:p.mcqTotal||0};
    });
    const filtered=rows.filter(Boolean).sort((a,b)=>{
      if((b.accuracy||0)!==(a.accuracy||0))return (b.accuracy||0)-(a.accuracy||0);
      return (b.mcqRight||0)-(a.mcqRight||0);
    }).slice(0,50);
    STATE.dashLeaderByGroup[g]={loading:false,loaded:true,rows:filtered};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='leader')render();
  }catch(e){
    console.warn('[loadDashLeader]',e);
    STATE.dashLeaderByGroup[g]={loading:false,loaded:true,rows:[],error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='leader')render();
  }
}


function setResultsSort(mode){
  STATE.dashResultsSort=mode;
  render();
}

// Drill down into a specific student's attempt. Reuses renderExamReview
// by populating STATE.examSession with the student's data + reviewMode:true.
async function openInstructorReview(examId,docId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const cache=STATE.dashExamResults[examId];
  if(!cache||!cache.results.length){showToast('Results not loaded.','error');return;}
  const result=cache.results.find(r=>r._docId===docId);
  if(!result){showToast('Student result not found.','error');return;}
  const exam=STATE.dashExams.find(e=>e.id===examId);
  const uid=result.userId;
  const student=(STATE.dashStudents||[]).find(s=>s.uid===uid)||{name:'(unknown)'};

  let questions=result.questionSnapshot;
  if(!questions||!Array.isArray(questions)||!questions.length){
    // No snapshot — try deterministic rebuild (instructor can't backfill though).
    try{questions=await buildExamQuestions(exam,uid,result.attemptNumber||1);}
    catch(e){showToast('Cannot rebuild questions for this student.','error');return;}
    if(!questions.length){showToast('Cannot rebuild questions for this student.','error');return;}
  }
  const answers={};
  if(Array.isArray(result.answers)){
    result.answers.forEach((a,i)=>{if(a&&a.picked!=null)answers[i]=a.picked;});
  }
  STATE.examSession={
    examId,docId,attemptNumber:result.attemptNumber||1,exam,questions,answers,currentIdx:0,reviewIdx:0,
    startedAt:result.startedAt,deadlineAt:result.deadlineAt,
    submitting:false,submitted:true,reviewMode:true,
    reviewStudent:student,
    instructorReturnTab:'dashboard',
    results:{
      score:result.score||0,
      total:result.total||questions.length,
      percentage:result.percentage||0,
      autoSubmitted:!!result.autoSubmitted,
      submittedAt:result.submittedAt||''
    },
    navOpen:false
  };
  STATE.tab='exam';render();
}

// CSV export — one line per student. BOM prefix for Excel compat with UTF-8.
function exportResultsCSV(examId){
  const cache=STATE.dashExamResults[examId];
  if(!cache||!cache.results||!cache.results.length){
    showToast('No results to export.','warning');return;
  }
  const exam=STATE.dashExams.find(e=>e.id===examId);
  const students=STATE.dashStudents||[];
  const header=['Student Name','Student ID','Group','Attempt','Score','Total','Percentage','Time Taken (min)','Started At','Submitted At','Auto-Submitted','Status'];
  const twoPart=!!(exam&&exam.includeCbq);
  if(twoPart)header.push('CBQ Score','CBQ Total','CBQ Percentage','Estimated /500 (not official)','Two-Part Result');
  const rows=[header];
  cache.results.forEach(r=>{
    const st=students.find(s=>s.uid===r.userId)||{};
    const timeMin=(r.startedAt&&r.submittedAt)
      ?Math.round((Date.parse(r.submittedAt)-Date.parse(r.startedAt))/60000)
      :'';
    rows.push([
      st.name||'(unknown)',
      st.studentId||'',
      r.groupCode||'',
      r.attemptNumber||1,
      r.score!=null?r.score:'',
      r.total!=null?r.total:'',
      r.percentage!=null?r.percentage:'',
      timeMin,
      r.startedAt||'',
      r.submittedAt||'',
      r.autoSubmitted?'Yes':'No',
      r.submitted?'Submitted':'In Progress'
    ]);
    if(twoPart){
      const sum=r.submitted?examCbqSummary(exam,r):null;
      const c=r.cbq&&r.cbq.submitted?r.cbq:null;
      rows[rows.length-1].push(c?c.score:'',c?c.total:'',c?c.percentage:'',sum&&sum.points!=null?sum.points:'',sum?sum.label:'');
    }
  });
  const csv=rows.map(row=>row.map(cell=>{
    const s=String(cell==null?'':cell);
    return(s.includes(',')||s.includes('"')||s.includes('\n'))?'"'+s.replace(/"/g,'""')+'"':s;
  }).join(',')).join('\r\n');
  const filename='exam-'+((exam&&exam.title)?exam.title.replace(/[^a-zA-Z0-9]/g,'_').slice(0,40):examId)+'-results.csv';
  try{
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast('CSV exported ✅','success');
  }catch(e){showToast('Export failed: '+e.message,'error');}
}

// ─── RENDER: INSTRUCTOR EXAM RESULTS ───────────────────────────────────
function renderDashExamResults(){
  const examId=STATE.dashExamViewingId;
  const exam=STATE.dashExams.find(e=>e.id===examId);
  const cache=STATE.dashExamResults[examId];
  const students=STATE.dashStudents||[];
  const groupStudents=exam?students.filter(s=>s.groupCode===exam.groupCode):[];

  const header='<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--card);border-bottom:.5px solid var(--border);position:sticky;top:0;z-index:5">'
    +'<button onclick="closeExamResults()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--brand);padding:0 6px" title="Back">\u2039</button>'
    +'<div class="dx-16">'
    +'<div style="font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.4px">Results</div>'
    +'<div style="font-size:14px;font-weight:600;color:var(--ink);line-height:1.3">'+esc((exam&&exam.title)||'Exam')+'</div>'
    +'</div>'
    +(cache&&cache.loaded&&cache.results.length?('<button onclick="exportResultsCSV(\''+examId+'\')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--brand-2)40;background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u2B07 CSV</button>'):'')
    +'</div>';

  if(!cache||cache.loading){
    return header+'<div style="text-align:center;padding:60px 20px;color:var(--muted-2)"><div style="font-size:30px;margin-bottom:10px">\u23F3</div><div style="font-size:14px">Loading results\u2026</div></div>';
  }
  if(cache.error){
    return header+'<div style="text-align:center;padding:50px 20px"><div style="font-size:30px;margin-bottom:10px">\u26A0\uFE0F</div><div style="font-size:14px;color:var(--ink-2);margin-bottom:14px">Couldn\'t load results.</div><button onclick="delete STATE.dashExamResults[\''+examId+'\'];loadExamResults(\''+examId+'\')" style="padding:9px 18px;border-radius:8px;border:.5px solid var(--border-4);background:var(--card);font-size:13px;cursor:pointer;font-family:inherit">Retry</button></div>';
  }

  const stats=cache.stats||{};
  const enrolled=groupStudents.length;
  const takenPct=enrolled?Math.round(stats.submitted/enrolled*100):0;

  const statsCard='<div style="padding:14px 14px 6px">'
    +'<div style="background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:12px;padding:14px 16px;color:#fff;margin-bottom:12px">'
    +'<div style="font-size:11px;font-weight:600;letter-spacing:.5px;opacity:.9;margin-bottom:8px">OVERVIEW</div>'
    +'<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px">'
    +'<div><div class="dx-12">Submitted</div><div class="dx-20">'+(stats.submitted||0)+(enrolled?' / '+enrolled+' ('+takenPct+'%)':'')+'</div></div>'
    +'<div><div class="dx-12">Average</div><div class="dx-20">'+(stats.avgPct||0)+'%</div></div>'
    +'<div><div class="dx-12">Pass Rate ('+(exam&&exam.includeCbq?'est. \u2265'+EXAM_CBQ_PASS_POINTS+'/500':'\u2265'+EXAM_PASS_THRESHOLD+'%')+')</div><div class="dx-20">'+(stats.passRate||0)+'% <span class="dx-12">('+(stats.passCount||0)+' passed)</span></div></div>'
    +'<div><div class="dx-12">Median</div><div class="dx-20">'+(stats.medianPct||0)+'%</div></div>'
    +'</div>'
    +(stats.submitted>0?('<div style="display:flex;gap:14px;font-size:11px;opacity:.85;padding-top:8px;border-top:1px solid rgba(255,255,255,.2)"><div>Highest: <b>'+stats.highest+'%</b></div><div>Lowest: <b>'+stats.lowest+'%</b></div>'+(stats.pending>0?'<div>In progress: <b>'+stats.pending+'</b></div>':'')+'</div>'):'')
    +'</div>'
    +'</div>';

  if(!cache.results.length){
    return header+statsCard+'<div style="text-align:center;padding:30px 14px;color:var(--muted-2);font-size:13px">No submissions yet. Students in group <b>'+esc((exam&&exam.groupCode)||'')+'</b> will appear here as they take the exam.</div>';
  }

  // Sort controls
  const sortMode=STATE.dashResultsSort||'score-desc';
  const sortBtn=(id,label)=>'<button onclick="setResultsSort(\''+id+'\')" style="padding:6px 10px;border-radius:6px;border:.5px solid '+(sortMode===id?'var(--brand)':'var(--border-4)')+';background:'+(sortMode===id?'var(--brand-tint)':'#fff')+';color:'+(sortMode===id?'var(--brand)':'var(--muted)')+';font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">'+label+'</button>';
  const sortBar='<div style="display:flex;gap:6px;padding:0 14px 12px;flex-wrap:wrap">'
    +'<span style="font-size:11px;color:var(--muted);align-self:center;margin-right:4px">Sort:</span>'
    +sortBtn('score-desc','Score \u2193')
    +sortBtn('score-asc','Score \u2191')
    +sortBtn('name-asc','Name A\u2013Z')
    +sortBtn('submitted-desc','Newest')
    +sortBtn('time-asc','Fastest')
    +'</div>';

  // Sort results
  const withStudent=cache.results.map(r=>{
    const st=students.find(s=>s.uid===r.userId)||{};
    const timeMin=(r.startedAt&&r.submittedAt)?Math.round((Date.parse(r.submittedAt)-Date.parse(r.startedAt))/60000):null;
    return{...r,_stName:st.name||'(unknown)',_stId:st.studentId||'',_timeMin:timeMin};
  });
  const sorted=withStudent.slice().sort((a,b)=>{
    if(sortMode==='score-desc')return(b.percentage||0)-(a.percentage||0);
    if(sortMode==='score-asc')return(a.percentage||0)-(b.percentage||0);
    if(sortMode==='name-asc')return a._stName.localeCompare(b._stName);
    if(sortMode==='submitted-desc')return(b.submittedAt||'').localeCompare(a.submittedAt||'');
    if(sortMode==='time-asc')return(a._timeMin==null?1e9:a._timeMin)-(b._timeMin==null?1e9:b._timeMin);
    return 0;
  });

  const fmtDT=(iso)=>{if(!iso)return '—';try{return new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch{return iso;}};

  const row=(r)=>{
    const pct=r.percentage||0;
    const passed=pct>=60;
    const pctColor=passed?'var(--ok-strong-2)':'var(--err)';
    const pctBg=passed?'var(--ok-tint)':'var(--err-tint)';
    const statusPill=r.submitted
      ?(r.autoSubmitted?'<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;background:var(--warn-tint-2);color:var(--warn-strong)">AUTO</span>':'')
      :'<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;background:var(--surface-4);color:var(--muted)">IN PROGRESS</span>';
    // Batch 20: a student can now have multiple attempt rows for this exam —
    // badge the attempt number (only shown from attempt 2 on, to keep the
    // common single-attempt case visually unchanged).
    const attemptPill=(r.attemptNumber&&r.attemptNumber>1)
      ?'<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;background:var(--brand-tint);color:var(--brand)">ATTEMPT '+r.attemptNumber+'</span>'
      :'';
    return '<div style="background:var(--card);border:.5px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:8px;display:flex;align-items:center;gap:10px">'
      +'<div class="dx-16">'
      +'<div style="font-size:13px;font-weight:600;color:var(--ink);line-height:1.3;display:flex;align-items:center;gap:6px">'+esc(r._stName)+' '+statusPill+' '+attemptPill+'</div>'
      +'<div class="dx-18">'+(r._stId?esc(r._stId)+' \u00B7 ':'')+fmtDT(r.submittedAt)+(r._timeMin!=null?' \u00B7 '+r._timeMin+' min':'')+'</div>'
      +examCbqResultLine(exam,r,examId)
      +'</div>'
      +(r.submitted?('<div style="background:'+pctBg+';color:'+pctColor+';border-radius:8px;padding:5px 10px;font-family:\'Courier New\',monospace;font-size:13px;font-weight:700;min-width:64px;text-align:center">'+(r.score||0)+'/'+(r.total||0)+'<br><span style="font-size:11px">'+pct+'%</span></div>'):'')
      +(r.submitted?('<button onclick="openInstructorReview(\''+examId+'\',\''+r._docId+'\')" style="padding:7px 10px;border-radius:8px;border:.5px solid var(--brand-2)40;background:var(--brand-tint);color:var(--brand);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Review \u203A</button>'):'')
      +'</div>';
  };

  const list='<div style="padding:0 14px">'
    +sorted.map(row).join('')
    +'<div class="dx-15"></div>'
    +'</div>';

  return header+statsCard+sortBar+list;
}

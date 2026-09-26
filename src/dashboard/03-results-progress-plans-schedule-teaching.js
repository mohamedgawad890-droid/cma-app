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
    return `<div style="padding:14px">${renderDashTabEmpty('Results',STATE.dashSelectedGroup,{icon:'\u{1F4CA}',body:'No exams yet for this group. Create one from the Exams tab.'})}</div>`;
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
    return `<div style="padding:14px">
      ${viewToggle}
      <div style="font-size:12px;color:var(--muted-2);margin-bottom:12px">Group has <b>${students.length}</b> student${students.length===1?'':'s'} \u00B7 ${exams.length} exam${exams.length===1?'':'s'}</div>
      ${renderDashResultsMatrix(g,exams,students)}
      <div style="height:30px"></div>
    </div>`;
  }
  const closed=exams.filter(x=>examWindowStatus(x)==='closed');
  const active=exams.filter(x=>examWindowStatus(x)==='active');
  const scheduled=exams.filter(x=>examWindowStatus(x)==='scheduled');
  const order=[...closed,...active,...scheduled];
  const rows=order.map(x=>renderResultsCard(x)).join('');
  return `<div style="padding:14px">
    ${viewToggle}
    <div style="font-size:12px;color:#888;margin:10px 0">Tap any exam to expand per-student breakdown.</div>
    ${rows}
    <div style="height:30px"></div>
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
    return `<div style="text-align:center;padding:34px 20px;color:var(--muted-2)"><div style="font-size:26px;margin-bottom:8px">\u23F3</div><div style="font-size:13px">Loading results for ${missing} exam${missing===1?'':'s'}\u2026</div></div>`;
  }
  const examsSorted=exams.slice().sort((a,b)=>(a.opensAt||'').localeCompare(b.opensAt||''));
  const studentsSorted=students.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  if(!studentsSorted.length){
    return `<div style="text-align:center;padding:34px 20px;color:var(--muted-2)"><div style="font-size:36px;margin-bottom:8px">\u{1F464}</div><div style="font-size:13px">No students in group ${esc(groupCode)}.</div></div>`;
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
  const pctBg=(p)=>p>=80?'var(--ok-tint-2)':(p>=60?'#FEF5E7':'var(--err-tint)');
  const cellFor=(s,x)=>{
    const p=(res[s.uid]||{})[x.id];
    if(p==null)return `<div title="Not taken" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted-2);font-size:12px">\u2013</div>`;
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${pctBg(p)};color:${pctColor(p)};font-weight:700;font-size:11px">${p}%</div>`;
  };
  const headerCells=examsSorted.map(x=>`<th style="min-width:64px;max-width:64px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);line-height:1.2;position:sticky;top:0;z-index:2" title="${esc(x.title||'')}">${esc((x.title||'').length>10?(x.title||'').slice(0,9)+'\u2026':(x.title||''))}</th>`).join('');
  const headerRow=`<thead><tr>
    <th style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:11px;color:var(--ink-2);text-align:left;position:sticky;left:0;top:0;z-index:3">Student</th>
    ${headerCells}
    <th style="min-width:80px;max-width:80px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);position:sticky;top:0;z-index:2">Avg</th>
  </tr></thead>`;
  const bodyRows=studentsSorted.map(s=>{
    const cells=examsSorted.map(x=>`<td style="min-width:64px;max-width:64px;height:34px;padding:0;border:1px solid var(--border);background:var(--card)">${cellFor(s,x)}</td>`).join('');
    const sum=rowSummary[s.uid];
    return `<tr>
      <td onclick="STATE.dashStudentDetailUid='${esc(s.uid)}';render()" style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--card);border:1px solid var(--border);font-size:12px;color:var(--ink);text-align:left;position:sticky;left:0;z-index:1;cursor:pointer;font-weight:500;white-space:normal;word-break:break-word;line-height:1.3" title="${esc(s.name||'')}">${esc(s.name||'Unnamed')}</td>
      ${cells}
      <td style="min-width:80px;max-width:80px;padding:4px;border:1px solid var(--border);background:var(--card);text-align:center"><div style="font-size:12px;font-weight:700;color:${sum.n?pctColor(sum.avg):'var(--muted-2)'}">${sum.n?sum.avg+'%':'\u2014'}</div><div style="font-size:9px;color:var(--muted-2);margin-top:1px">${sum.n}/${sum.total}</div></td>
    </tr>`;
  }).join('');
  const footerCells=examsSorted.map(x=>{
    const c=colSummary[x.id];
    return `<td style="min-width:64px;max-width:64px;padding:4px;border:1px solid var(--border);background:var(--surface-3);text-align:center"><div style="font-size:11px;font-weight:700;color:${c.n?pctColor(c.avg):'var(--muted-2)'}">${c.n?c.avg+'%':'\u2014'}</div><div style="font-size:9px;color:var(--muted-2);margin-top:1px">${c.rate}%</div></td>`;
  }).join('');
  const footerRow=`<tfoot><tr>
    <td style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);font-size:11px;font-weight:600;color:var(--ink-2);text-align:left;position:sticky;left:0;z-index:1">Exam avg</td>
    ${footerCells}
    <td style="background:var(--surface-3);border:1px solid var(--border)"></td>
  </tr></tfoot>`;
  return `<div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      <button onclick="exportResultsMatrixCSV('${esc(groupCode)}')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--border);background:var(--card);color:var(--ink);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F4E5} Export CSV</button>
    </div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;max-height:70vh;border-radius:10px;border:1px solid var(--border);background:var(--card)">
      <table style="border-collapse:collapse;font-family:inherit;width:auto">
        ${headerRow}
        <tbody>${bodyRows}</tbody>
        ${footerRow}
      </table>
    </div>
    <div style="font-size:11px;color:var(--muted-2);margin-top:8px;line-height:1.4">Tap a student name to open their profile. Color bands: green \u226580%, amber \u226560%, red below.</div>
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
  const badgeStyle={active:'background:var(--ok-tint-2);color:var(--ok-2)',scheduled:'background:var(--warn-tint-2);color:#9A7D0A',closed:'background:#EAECEE;color:#566573'};
  const badgeLabel={active:'\u{1F7E2} ACTIVE',scheduled:'\u23F3 SCHEDULED',closed:'\u26AB CLOSED'};
  if(expanded&&(!cache||!cache.loaded)){
    loadExamResults(exam.id).then(()=>{if(STATE.tab==='dashboard'&&STATE.dashTab==='results')render();}).catch(()=>{});
  }
  const stats=(cache&&cache.stats)?cache.stats:null;
  const summary=stats?`<div style="font-size:12px;color:#555;margin-top:4px;line-height:1.6">Submitted: <b>${stats.submitted}</b> \u00B7 Avg <b>${stats.avgPct}%</b> \u00B7 Pass rate <b>${stats.passRate}%</b> \u00B7 High <b>${stats.highest}%</b>, Low <b>${stats.lowest}%</b></div>`:'<div style="font-size:12px;color:#888;margin-top:4px">Tap to load results.</div>';
  const arrow=expanded?'\u25BE':'\u25B8';
  let bodyRows='';
  if(expanded){
    if(!cache||cache.loading){bodyRows='<div style="text-align:center;padding:20px;color:#888">Loading\u2026</div>';}
    else if(!cache.results||!cache.results.length){bodyRows='<div style="text-align:center;padding:20px;color:#888;font-size:13px">No students have started this exam.</div>';}
    else{
      const sorted=cache.results.slice().sort((a,b)=>(b.percentage||0)-(a.percentage||0));
      bodyRows=sorted.map(r=>{
        const pct=r.percentage||0;
        const color=pct>=80?'var(--ok-2)':pct>=60?'#7D6608':'var(--err-2)';
        const bg=pct>=80?'var(--ok-tint-2)':pct>=60?'#FEF5E7':'var(--err-tint)';
        const submittedFlag=r.submitted?'\u2705':'\u23F3 in progress';
        const attemptBadge=(r.attemptNumber&&r.attemptNumber>1)?' \u00B7 Attempt '+r.attemptNumber:'';
        return `<div onclick="openInstructorReview('${exam.id}','${esc(r._docId||'')}')" style="background:#fff;border:.5px solid var(--border);border-radius:10px;padding:10px 12px;margin-top:6px;display:flex;align-items:center;gap:10px;cursor:pointer">
          <div style="min-width:0;flex:1"><div style="font-size:13px;font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.studentName||'Student')}</div>
          <div style="font-size:11px;color:#888;margin-top:2px">${submittedFlag} \u00B7 ${r.score||0}/${r.total||0}${attemptBadge}</div></div>
          <div style="background:${bg};color:${color};padding:5px 12px;border-radius:14px;font-size:13px;font-weight:700;flex-shrink:0">${pct}%</div>
          ${r.submitted?'<div style="flex-shrink:0;font-size:11px;font-weight:600;color:var(--brand);white-space:nowrap;padding-left:2px">Review \u203A</div>':''}
        </div>`;
      }).join('');
    }
  }
  return `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:10px">
    <div onclick="toggleResultsExpand('${exam.id}')" style="cursor:pointer">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        <span style="font-size:16px;color:#888">${arrow}</span>
        <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;${badgeStyle[status]}">${badgeLabel[status]}</span>
      </div>
      <div style="font-size:14px;font-weight:600;color:var(--ink)">${esc(exam.title)}</div>
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
    return `<div style="padding:14px">${renderDashSkeleton()}</div>`;
  }
  const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===g.toUpperCase());
  if(!students.length){return `<div style="padding:14px">${renderDashTabEmpty('Progress',g,{icon:'\u{1F4C8}',body:'No students in this group yet.'})}</div>`;}
  const rows=cache.rows.slice().sort((a,b)=>(b.acc||0)-(a.acc||0)).map(r=>{
    const pct=r.acc||0;
    const color=pct>=80?'var(--ok-2)':pct>=60?'#7D6608':'var(--err-2)';
    return `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
        <div style="font-size:13px;font-weight:600;color:var(--ink);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name||'Student')}</div>
        <div style="font-size:12px;font-weight:700;color:${color};flex-shrink:0">${pct}%</div>
      </div>
      <div style="font-size:11px;color:#888;line-height:1.6">
        Lessons: <b>${r.lessons||0}</b> \u00B7 MCQs: <b>${r.mcqRight||0}/${r.mcqTotal||0}</b>${r.lastSeen?' \u00B7 Last seen <b>'+esc(r.lastSeen)+'</b>':''}
      </div>
    </div>`;
  }).join('')||`<div style="text-align:center;padding:30px 20px;color:#888;font-size:13px">No progress records yet for this group.</div>`;
  return `<div style="padding:14px">
    <div style="font-size:12px;color:#888;margin-bottom:12px">${cache.rows.length} of ${students.length} students have progress data</div>
    ${rows}
    <div style="height:30px"></div>
  </div>`;
}

async function loadDashProgress(g){
  STATE.dashProgressByGroup[g]={loading:true,loaded:false,rows:[]};
  render();
  try{
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===g.toUpperCase());
    // Fetch progress docs one-by-one (allow-owner-or-instructor rule requires doc-by-doc reads)
    const rows=await Promise.all(students.map(async s=>{
      try{
        const doc=await db.collection('progress').doc(s.uid).get();
        if(!doc.exists)return null;
        const p=doc.data()||{};
        const mcqRight=p.mcqRight||0,mcqTotal=p.mcqTotal||0;
        const acc=mcqTotal>0?Math.round((mcqRight/mcqTotal)*100):0;
        const lessonsDone=p.lessonsDone?Object.keys(p.lessonsDone).length:0;
        return {uid:s.uid,name:s.name||'Student',acc,mcqRight,mcqTotal,lessons:lessonsDone,lastSeen:p.lastSeen||''};
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
    return `<div style="padding:14px">${renderDashSkeleton()}</div>`;
  }
  const rows=cache.rows;
  if(!rows.length){return `<div style="padding:14px">${renderDashTabEmpty('Leader',g,{icon:'\u{1F3C5}',body:'No leaderboard entries for this group yet. Students need to complete quizzes for a ranking to appear.'})}</div>`;}
  const medals=['\u{1F947}','\u{1F948}','\u{1F949}'];
  const items=rows.map((r,i)=>{
    const medal=i<3?medals[i]:('#'+(i+1));
    const pct=r.accuracy||0;
    return `<div style="background:#fff;border:.5px solid ${i<3?'#F5B04140':'var(--border)'};border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
      <div style="font-size:${i<3?'22px':'14px'};font-weight:700;color:var(--brand);min-width:34px;text-align:center">${medal}</div>
      <div style="min-width:0;flex:1">
        <div style="font-size:14px;font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name||'Student')}</div>
        <div style="font-size:11px;color:#888;margin-top:2px">${r.lessons||0} lessons \u00B7 ${r.mcqRight||0}/${r.mcqTotal||0} MCQs</div>
      </div>
      <div style="background:var(--brand-tint);color:var(--brand);padding:5px 12px;border-radius:14px;font-size:13px;font-weight:700;flex-shrink:0">${pct}%</div>
    </div>`;
  }).join('');
  return `<div style="padding:14px">
    <div style="font-size:12px;color:#888;margin-bottom:10px">Top ${rows.length} of ${g} \u2014 by accuracy</div>
    ${items}
    <div style="height:30px"></div>
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

function renderDashPlan(){
  const g=STATE.dashSelectedGroup;
  const cache=STATE.dashPlanByGroup[g];
  if(!cache||!cache.loaded){
    if(!cache||!cache.loading)loadDashPlan(g);
    return `<div style="padding:14px">${renderDashSkeleton()}</div>`;
  }
  const active=cache.active;
  const history=cache.history||[];
  const d=STATE.dashPlanDraft;
  const secOpts=S.map(s=>`<option value="${s.id}" ${String(d.sectionId)===String(s.id)?'selected':''}>Sec ${s.id} \u2014 ${esc(s.title)}</option>`).join('');
  const secId=d.sectionId?parseInt(d.sectionId):0;
  const sec=secId?S.find(s=>s.id===secId):null;
  const selected=new Set((d.unitIds||[]).map(String));
  const unitChips=sec?sec.lessons.map((l,idx)=>{
    const on=selected.has(String(l.id));
    return `<button type="button" onclick="togglePlanUnit('${l.id}')" style="padding:6px 10px;border-radius:14px;border:1px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':'#fff'};color:${on?'#fff':'#555'};font-size:11px;font-weight:${on?'600':'500'};cursor:pointer;font-family:inherit;white-space:nowrap">U${idx+1}: ${esc(l.title.length>28?l.title.slice(0,26)+'\u2026':l.title)}</button>`;
  }).join(''):'<div style="font-size:11px;color:#aaa;padding:8px">Pick a section to select units.</div>';
  const activeCard=active?`
    <div style="background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:14px;padding:16px;margin-bottom:14px;color:#fff">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;opacity:.85;margin-bottom:6px">\u{1F5D3}\uFE0F CURRENT ACTIVE PLAN</div>
      <div style="font-size:16px;font-weight:600;margin-bottom:4px">${esc(active.weekLabel||'This Week')}</div>
      <div style="font-size:12px;opacity:.85;margin-bottom:8px">Section ${active.sectionId} \u00B7 ${(active.unitIds||[]).length||'All'} units</div>
      ${active.note?`<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:9px 12px;font-size:12px;line-height:1.5;margin-bottom:10px">${esc(active.note)}</div>`:''}
      <button onclick="archivePlan('${active.id}')" style="padding:7px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.12);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F5C4}\uFE0F Archive</button>
    </div>`:'';
  const historyList=history.length?`<div style="font-size:12px;font-weight:500;color:#888;letter-spacing:.5px;margin:14px 0 8px">HISTORY (${history.length})</div>${history.map(h=>{
    const dt=h.publishedAt?new Date(h.publishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';
    return `<div style="background:var(--surface);border:.5px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:6px;font-size:12px;color:#555">
      <div style="font-weight:600;color:var(--ink)">${esc(h.weekLabel||'Week')}</div>
      <div style="font-size:11px;color:#888;margin-top:2px">Sec ${h.sectionId} \u00B7 ${(h.unitIds||[]).length||'All'} units \u00B7 ${esc(dt)}</div>
    </div>`;
  }).join('')}`:'';
  return `<div style="padding:14px">
    ${activeCard}
    <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">\u2795 ${active?'Publish New Plan':'Create Weekly Plan'}</div>
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px">
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Week label *</label>
        <input type="text" value="${esc(d.weekLabel||'')}"
          oninput="STATE.dashPlanDraft.weekLabel=this.value"
          placeholder="e.g. Week 5 \u2014 Cost Behavior"
          style="width:100%;padding:9px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface);box-sizing:border-box">
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Section *</label>
        <select onchange="onPlanSectionChange(this.value)"
          style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;background:#fff;color:var(--ink);box-sizing:border-box">
          <option value="">Select...</option>${secOpts}
        </select>
      </div>
      <div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <label style="font-size:11px;color:#888">Units <span style="font-weight:600;color:var(--brand)">${d.unitIds&&d.unitIds.length?d.unitIds.length+' selected':'All'}</span></label>
          <button type="button" onclick="STATE.dashPlanDraft.unitIds=[];render()" style="background:none;border:none;color:var(--brand);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Clear</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--surface);border:.5px solid var(--border);border-radius:8px;max-height:150px;overflow-y:auto">${unitChips}</div>
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Note (optional)</label>
        <textarea rows="3" oninput="STATE.dashPlanDraft.note=this.value" placeholder="e.g. Focus on cost drivers this week. Solve chapters 2 & 3 MCQs before Friday."
          style="width:100%;padding:9px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface);box-sizing:border-box;resize:vertical">${esc(d.note||'')}</textarea>
      </div>
      <button onclick="publishPlan()" style="width:100%;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">
        \u{1F4E4} ${active?'Publish (archives current)':'Publish Plan'}
      </button>
    </div>
    ${historyList}
    <div style="height:30px"></div>
  </div>`;
}

function onPlanSectionChange(v){
  STATE.dashPlanDraft.sectionId=v;
  STATE.dashPlanDraft.unitIds=[];
  render();
}

function togglePlanUnit(uid){
  const arr=STATE.dashPlanDraft.unitIds||[];
  const i=arr.indexOf(uid);
  if(i>=0)arr.splice(i,1);else arr.push(uid);
  STATE.dashPlanDraft.unitIds=arr.slice();
  render();
}

async function loadDashPlan(g){
  STATE.dashPlanByGroup[g]={loading:true,loaded:false,active:null,history:[]};
  render();
  try{
    const snap=await db.collection('weekly-plans').where('groupCode','==',g).get();
    const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
    const active=rows.filter(r=>r.active).sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''))[0]||null;
    const history=rows.filter(r=>!r.active).sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''));
    STATE.dashPlanByGroup[g]={loading:false,loaded:true,active,history};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='plan')render();
  }catch(e){
    console.warn('[loadDashPlan]',e);
    STATE.dashPlanByGroup[g]={loading:false,loaded:true,active:null,history:[],error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='plan')render();
  }
}

async function publishPlan(){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const g=STATE.dashSelectedGroup;
  const d=STATE.dashPlanDraft;
  if(!g){showToast('Pick a group first.','warning');return;}
  if(!d.weekLabel||!d.weekLabel.trim()){showToast('Add a week label.','warning');return;}
  if(!d.sectionId){showToast('Pick a section.','warning');return;}
  try{
    const cache=STATE.dashPlanByGroup[g]||{active:null};
    // Atomic: archive previous active + create new active
    const batch=db.batch();
    if(cache.active&&cache.active.id){
      batch.update(db.collection('weekly-plans').doc(cache.active.id),{active:false,archivedAt:new Date().toISOString()});
    }
    const newRef=db.collection('weekly-plans').doc();
    batch.set(newRef,{
      groupCode:g,
      weekLabel:d.weekLabel.trim(),
      sectionId:parseInt(d.sectionId),
      unitIds:(d.unitIds||[]).map(String).filter(Boolean),
      note:(d.note||'').trim().slice(0,1000),
      active:true,
      publishedAt:new Date().toISOString(),
      publishedBy:STATE.user.uid
    });
    await batch.commit();
    showToast('Plan published \u2705','success');
    STATE.dashPlanDraft={weekLabel:'',sectionId:'',unitIds:[],note:''};
    STATE.dashPlanByGroup[g]={loading:false,loaded:false,active:null,history:[]};
    loadDashPlan(g);
  }catch(e){console.warn('[publishPlan]',e);showToast('Error: '+e.message,'error');}
}

async function archivePlan(planId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const ok=await showModal({icon:'\u{1F5C4}\uFE0F',title:'Archive Plan?',body:'Students will no longer see this plan at the top of their Study tab.',type:'warning',confirmText:'Archive',cancelText:'Cancel'});
  if(!ok)return;
  try{
    await db.collection('weekly-plans').doc(planId).update({active:false,archivedAt:new Date().toISOString()});
    const g=STATE.dashSelectedGroup;
    if(g){STATE.dashPlanByGroup[g]={loading:false,loaded:false,active:null,history:[]};loadDashPlan(g);}
    showToast('Plan archived.','info');
  }catch(e){console.warn('[archivePlan]',e);showToast('Error: '+e.message,'error');}
}

async function loadDashSchedule(g){
  STATE.dashScheduleByGroup[g]={loading:true,loaded:false,rows:[]};
  render();
  try{
    const doc=await db.collection('lecture-schedule').doc(g).get();
    const rows=doc.exists?(doc.data().rows||[]):[];
    rows.sort((a,b)=>Number(a.lectureNumber)-Number(b.lectureNumber));
    STATE.dashScheduleByGroup[g]={loading:false,loaded:true,rows};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='schedule')render();
  }catch(e){
    console.warn('[loadDashSchedule]',e);
    STATE.dashScheduleByGroup[g]={loading:false,loaded:true,rows:[],error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='schedule')render();
  }
}

async function _writeSchedule(g,rows){
  await db.collection('lecture-schedule').doc(g).set({
    groupCode:g,
    rows,
    updatedAt:new Date().toISOString(),
    updatedBy:STATE.user.uid
  });
}

function onScheduleSectionChange(v){
  STATE.dashScheduleDraft.sectionId=v;
  STATE.dashScheduleDraft.unitIds=[];
  render();
}

function toggleScheduleUnit(uid){
  const arr=STATE.dashScheduleDraft.unitIds||[];
  const i=arr.indexOf(uid);
  if(i>=0)arr.splice(i,1);else arr.push(uid);
  STATE.dashScheduleDraft.unitIds=arr.slice();
  render();
}

function editScheduleRow(id){
  const g=STATE.dashSelectedGroup;
  const cache=STATE.dashScheduleByGroup[g];
  if(!cache)return;
  const row=cache.rows.find(r=>r.id===id);
  if(!row)return;
  STATE.dashScheduleEditingId=id;
  STATE.dashScheduleDraft={
    lectureNumber:String(row.lectureNumber),
    plannedDate:row.plannedDate||'',
    sectionId:String(row.sectionId||''),
    unitIds:(row.unitIds||[]).slice(),
    note:row.note||''
  };
  render();
}

function cancelScheduleEdit(){
  STATE.dashScheduleEditingId=null;
  STATE.dashScheduleDraft={lectureNumber:'',plannedDate:'',sectionId:'',unitIds:[],note:''};
  render();
}

async function saveScheduleRow(){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const g=STATE.dashSelectedGroup;
  if(!g){showToast('Pick a group first.','warning');return;}
  const d=STATE.dashScheduleDraft;
  const lectureNumber=parseInt(d.lectureNumber);
  if(!lectureNumber||lectureNumber<1){showToast('Enter a valid lecture #.','warning');return;}
  if(!d.plannedDate){showToast('Pick a planned date.','warning');return;}
  if(!d.sectionId){showToast('Pick a section.','warning');return;}
  try{
    const cache=STATE.dashScheduleByGroup[g]||{rows:[]};
    let rows=(cache.rows||[]).slice();
    const editingId=STATE.dashScheduleEditingId;
    const dupe=rows.find(r=>Number(r.lectureNumber)===lectureNumber&&r.id!==editingId);
    if(dupe){showToast('Lecture #'+lectureNumber+' already exists in the schedule.','warning');return;}
    const rowData={
      id:editingId||('r'+Date.now()),
      lectureNumber,
      plannedDate:d.plannedDate,
      sectionId:parseInt(d.sectionId),
      unitIds:(d.unitIds||[]).map(String).filter(Boolean),
      note:(d.note||'').trim().slice(0,500)
    };
    if(editingId){
      rows=rows.map(r=>r.id===editingId?rowData:r);
    }else{
      rows.push(rowData);
    }
    rows.sort((a,b)=>Number(a.lectureNumber)-Number(b.lectureNumber));
    await _writeSchedule(g,rows);
    STATE.dashScheduleByGroup[g]={loading:false,loaded:true,rows};
    STATE.dashScheduleEditingId=null;
    STATE.dashScheduleDraft={lectureNumber:'',plannedDate:'',sectionId:'',unitIds:[],note:''};
    showToast(editingId?'Schedule row updated \u2705':'Schedule row added \u2705','success');
    render();
  }catch(e){console.warn('[saveScheduleRow]',e);showToast('Error: '+e.message,'error');}
}

async function deleteScheduleRow(id){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const ok=await showModal({icon:'\u{1F5D1}\uFE0F',title:'Delete Row?',body:'This removes the row from the published schedule.',type:'danger',confirmText:'Delete',cancelText:'Cancel'});
  if(!ok)return;
  const g=STATE.dashSelectedGroup;
  const cache=STATE.dashScheduleByGroup[g];
  if(!cache)return;
  try{
    const rows=cache.rows.filter(r=>r.id!==id);
    await _writeSchedule(g,rows);
    STATE.dashScheduleByGroup[g]={loading:false,loaded:true,rows};
    showToast('Row deleted.','info');
    render();
  }catch(e){console.warn('[deleteScheduleRow]',e);showToast('Error: '+e.message,'error');}
}

// Finds the teaching-log entry (already loaded per group) matching a planned
// lecture number, so the Actual column reflects what really happened.
function _actualForLecture(lectureNumber){
  return (STATE.dashTeachingLog||[]).find(t=>Number(t.lectureNumber)===Number(lectureNumber))||null;
}

function renderDashSchedule(){
  const g=STATE.dashSelectedGroup;
  const cache=STATE.dashScheduleByGroup[g];
  if(!cache||!cache.loaded){
    if(!cache||!cache.loading)loadDashSchedule(g);
    return `<div style="padding:14px">${renderDashSkeleton()}</div>`;
  }
  const rows=cache.rows||[];
  const d=STATE.dashScheduleDraft;
  const editing=STATE.dashScheduleEditingId;
  const secOpts=S.map(s=>`<option value="${s.id}" ${String(d.sectionId)===String(s.id)?'selected':''}>Sec ${s.id} \u2014 ${esc(s.title)}</option>`).join('');
  const secId=d.sectionId?parseInt(d.sectionId):0;
  const sec=secId?S.find(s=>s.id===secId):null;
  const selected=new Set((d.unitIds||[]).map(String));
  const unitChips=sec?sec.lessons.map(l=>{
    const on=selected.has(String(l.id));
    return `<button type="button" onclick="toggleScheduleUnit('${l.id}')" style="padding:6px 10px;border-radius:14px;border:1px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':'#fff'};color:${on?'#fff':'#555'};font-size:11px;font-weight:${on?'600':'500'};cursor:pointer;font-family:inherit;white-space:nowrap">${esc(l.title.length>26?l.title.slice(0,24)+'\u2026':l.title)}</button>`;
  }).join(''):'<div style="font-size:11px;color:#aaa;padding:8px">Pick a section to select units.</div>';

  const rowsHtml=rows.length?rows.map(r=>{
    const rsec=S.find(s=>s.id===Number(r.sectionId));
    const _ut=unitTitles(r.sectionId,r.unitIds,{max:2});
    const units=(r.unitIds||[]).length?(_ut?esc(_ut):(r.unitIds.length+' units')):'\u2014';
    const actual=_actualForLecture(r.lectureNumber);
    const actualHtml=actual
      ?`<div style="font-size:11px;color:var(--ok-strong)">\u2713 Taught ${esc(actual.date||'')}${actual.unitIds&&actual.unitIds.length?' \u00B7 '+esc(unitTitles(r.sectionId,actual.unitIds,{max:2})||actual.unitIds.length+' units'):''}</div>`
      :`<div style="font-size:11px;color:#aaa">Not yet taught</div>`;
    return `<div style="background:#fff;border:.5px solid var(--border);border-radius:10px;padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px">
        <div style="flex:1">
          <div style="font-size:13px;font-weight:600;color:var(--ink)">L${r.lectureNumber} \u00B7 ${r.plannedDate?esc(new Date(r.plannedDate).toLocaleDateString('en-GB',{day:'numeric',month:'short'})):'\u2014'}</div>
          <div style="font-size:12px;color:#666;margin-top:2px">${rsec?esc(rsec.emoji+' '+rsec.title):'Section '+r.sectionId} \u00B7 ${units}</div>
          ${r.note?`<div style="font-size:12px;color:#555;margin-top:6px;background:var(--surface);border-radius:6px;padding:6px 9px;white-space:pre-wrap">${esc(r.note)}</div>`:''}
          <div style="margin-top:6px">${actualHtml}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button onclick="editScheduleRow('${r.id}')" style="background:none;border:none;cursor:pointer;font-size:16px;padding:4px" title="Edit">\u270F\uFE0F</button>
          <button onclick="deleteScheduleRow('${r.id}')" style="background:none;border:none;cursor:pointer;font-size:16px;padding:4px" title="Delete">\U0001F5D1\uFE0F</button>
        </div>
      </div>
    </div>`;
  }).join(''):'<div style="text-align:center;padding:30px 12px;color:#aaa;font-size:13px">No schedule rows yet. Add the first lecture below.</div>';

  return `<div style="padding:14px">
    <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">\U0001F4C5 Schedule (${rows.length} lectures)</div>
    ${rowsHtml}
    <div style="font-size:13px;font-weight:600;color:var(--ink);margin:18px 0 10px">${editing?'\u2795 Edit Row':'\u2795 Add Lecture'}</div>
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px">
      <div style="display:flex;gap:10px;margin-bottom:10px">
        <div style="flex:1">
          <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Lecture # *</label>
          <input type="number" min="1" value="${esc(String(d.lectureNumber||''))}" oninput="STATE.dashScheduleDraft.lectureNumber=this.value"
            style="width:100%;padding:9px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface);box-sizing:border-box">
        </div>
        <div style="flex:1">
          <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Planned Date *</label>
          <input type="date" value="${esc(d.plannedDate||'')}" oninput="STATE.dashScheduleDraft.plannedDate=this.value"
            style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
        </div>
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Section *</label>
        <select onchange="onScheduleSectionChange(this.value)"
          style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;background:#fff;color:var(--ink);box-sizing:border-box">
          <option value="">Select...</option>${secOpts}
        </select>
      </div>
      <div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <label style="font-size:11px;color:#888">Units <span style="font-weight:600;color:var(--brand)">${d.unitIds&&d.unitIds.length?d.unitIds.length+' selected':'None'}</span></label>
          <button type="button" onclick="STATE.dashScheduleDraft.unitIds=[];render()" style="background:none;border:none;color:var(--brand);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Clear</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--surface);border:.5px solid var(--border);border-radius:8px;max-height:150px;overflow-y:auto">${unitChips}</div>
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Note (optional)</label>
        <textarea rows="2" oninput="STATE.dashScheduleDraft.note=this.value" placeholder="e.g. Bring calculator. Review ABC costing before class."
          style="width:100%;padding:9px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface);box-sizing:border-box;resize:vertical">${esc(d.note||'')}</textarea>
      </div>
      <div style="display:flex;gap:8px">
        ${editing?`<button onclick="cancelScheduleEdit()" style="flex:1;padding:11px;border-radius:10px;border:.5px solid var(--border-4);background:#fff;color:#555;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>`:''}
        <button onclick="saveScheduleRow()" style="flex:2;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">${editing?'Save Changes':'Add to Schedule'}</button>
      </div>
    </div>
    <div style="height:30px"></div>
  </div>`;
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

  const header='<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border-bottom:.5px solid var(--border);position:sticky;top:0;z-index:5">'
    +'<button onclick="closeExamResults()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--brand);padding:0 6px" title="Back">\u2039</button>'
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.4px">Results</div>'
    +'<div style="font-size:14px;font-weight:600;color:var(--ink);line-height:1.3">'+esc((exam&&exam.title)||'Exam')+'</div>'
    +'</div>'
    +(cache&&cache.loaded&&cache.results.length?('<button onclick="exportResultsCSV(\''+examId+'\')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--brand-2)40;background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u2B07 CSV</button>'):'')
    +'</div>';

  if(!cache||cache.loading){
    return header+'<div style="text-align:center;padding:60px 20px;color:#aaa"><div style="font-size:30px;margin-bottom:10px">\u23F3</div><div style="font-size:14px">Loading results\u2026</div></div>';
  }
  if(cache.error){
    return header+'<div style="text-align:center;padding:50px 20px"><div style="font-size:30px;margin-bottom:10px">\u26A0\uFE0F</div><div style="font-size:14px;color:#555;margin-bottom:14px">Couldn\'t load results.</div><button onclick="delete STATE.dashExamResults[\''+examId+'\'];loadExamResults(\''+examId+'\')" style="padding:9px 18px;border-radius:8px;border:.5px solid var(--border-4);background:#fff;font-size:13px;cursor:pointer;font-family:inherit">Retry</button></div>';
  }

  const stats=cache.stats||{};
  const enrolled=groupStudents.length;
  const takenPct=enrolled?Math.round(stats.submitted/enrolled*100):0;

  const statsCard='<div style="padding:14px 14px 6px">'
    +'<div style="background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:12px;padding:14px 16px;color:#fff;margin-bottom:12px">'
    +'<div style="font-size:11px;font-weight:600;letter-spacing:.5px;opacity:.9;margin-bottom:8px">OVERVIEW</div>'
    +'<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px">'
    +'<div><div style="font-size:11px;opacity:.75">Submitted</div><div style="font-size:20px;font-weight:600">'+(stats.submitted||0)+(enrolled?' / '+enrolled+' ('+takenPct+'%)':'')+'</div></div>'
    +'<div><div style="font-size:11px;opacity:.75">Average</div><div style="font-size:20px;font-weight:600">'+(stats.avgPct||0)+'%</div></div>'
    +'<div><div style="font-size:11px;opacity:.75">Pass Rate (\u226560%)</div><div style="font-size:20px;font-weight:600">'+(stats.passRate||0)+'% <span style="font-size:11px;opacity:.75">('+(stats.passCount||0)+' passed)</span></div></div>'
    +'<div><div style="font-size:11px;opacity:.75">Median</div><div style="font-size:20px;font-weight:600">'+(stats.medianPct||0)+'%</div></div>'
    +'</div>'
    +(stats.submitted>0?('<div style="display:flex;gap:14px;font-size:11px;opacity:.85;padding-top:8px;border-top:1px solid rgba(255,255,255,.2)"><div>Highest: <b>'+stats.highest+'%</b></div><div>Lowest: <b>'+stats.lowest+'%</b></div>'+(stats.pending>0?'<div>In progress: <b>'+stats.pending+'</b></div>':'')+'</div>'):'')
    +'</div>'
    +'</div>';

  if(!cache.results.length){
    return header+statsCard+'<div style="text-align:center;padding:30px 14px;color:#aaa;font-size:13px">No submissions yet. Students in group <b>'+esc((exam&&exam.groupCode)||'')+'</b> will appear here as they take the exam.</div>';
  }

  // Sort controls
  const sortMode=STATE.dashResultsSort||'score-desc';
  const sortBtn=(id,label)=>'<button onclick="setResultsSort(\''+id+'\')" style="padding:6px 10px;border-radius:6px;border:.5px solid '+(sortMode===id?'var(--brand)':'var(--border-4)')+';background:'+(sortMode===id?'var(--brand-tint)':'#fff')+';color:'+(sortMode===id?'var(--brand)':'#666')+';font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">'+label+'</button>';
  const sortBar='<div style="display:flex;gap:6px;padding:0 14px 12px;flex-wrap:wrap">'
    +'<span style="font-size:11px;color:#888;align-self:center;margin-right:4px">Sort:</span>'
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
      ?(r.autoSubmitted?'<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;background:var(--warn-tint-2);color:#9A7D0A">AUTO</span>':'')
      :'<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;background:#EAECEE;color:#566573">IN PROGRESS</span>';
    // Batch 20: a student can now have multiple attempt rows for this exam —
    // badge the attempt number (only shown from attempt 2 on, to keep the
    // common single-attempt case visually unchanged).
    const attemptPill=(r.attemptNumber&&r.attemptNumber>1)
      ?'<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;background:var(--brand-tint);color:var(--brand)">ATTEMPT '+r.attemptNumber+'</span>'
      :'';
    return '<div style="background:#fff;border:.5px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:8px;display:flex;align-items:center;gap:10px">'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-size:13px;font-weight:600;color:var(--ink);line-height:1.3;display:flex;align-items:center;gap:6px">'+esc(r._stName)+' '+statusPill+' '+attemptPill+'</div>'
      +'<div style="font-size:10px;color:#888;margin-top:2px">'+(r._stId?esc(r._stId)+' \u00B7 ':'')+fmtDT(r.submittedAt)+(r._timeMin!=null?' \u00B7 '+r._timeMin+' min':'')+'</div>'
      +'</div>'
      +(r.submitted?('<div style="background:'+pctBg+';color:'+pctColor+';border-radius:8px;padding:5px 10px;font-family:\'Courier New\',monospace;font-size:13px;font-weight:700;min-width:64px;text-align:center">'+(r.score||0)+'/'+(r.total||0)+'<br><span style="font-size:11px">'+pct+'%</span></div>'):'')
      +(r.submitted?('<button onclick="openInstructorReview(\''+examId+'\',\''+r._docId+'\')" style="padding:7px 10px;border-radius:8px;border:.5px solid var(--brand-2)40;background:var(--brand-tint);color:var(--brand);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Review \u203A</button>'):'')
      +'</div>';
  };

  const list='<div style="padding:0 14px">'
    +sorted.map(row).join('')
    +'<div style="height:40px"></div>'
    +'</div>';

  return header+statsCard+sortBar+list;
}

// ─── RENDER DASHBOARD: ACTUAL TEACHING ───────────────────────────────────
function renderDashActualTeaching(){
  const entries=STATE.dashTeachingLog||[];
  const d=STATE.dashTeachingDraft;
  const selectedGroup=STATE.dashSelectedGroup;
  // Batch 2: auto-prefill the draft group so entries always attach to the
  // currently-viewed group. Removes the group picker entirely (redundant).
  if(selectedGroup&&!d.groupCode)d.groupCode=selectedGroup;
  const allLessons=[];S.forEach(sec=>sec.lessons.forEach(l=>allLessons.push({sec,lesson:l})));
  const lessonPicker=S.map(sec=>{const items=sec.lessons.map(l=>{const on=d.unitIds.includes(l.id);return `<button onclick="toggleTeachingUnit('${l.id}')" style="padding:5px 9px;border-radius:8px;font-size:11px;cursor:pointer;font-family:inherit;border:.5px solid ${on?sec.text:'var(--border-4)'};background:${on?sec.bg:'var(--surface-3)'};color:${on?sec.strong:'#555'};font-weight:${on?'600':'400'};margin:2px">${l.id}. ${esc(l.title.slice(0,42))}${l.title.length>42?'…':''}</button>`;}).join('');return `<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;color:${sec.strong};margin-bottom:6px">${sec.emoji} Section ${sec.id}</div><div>${items}</div></div>`;}).join('');
  const createForm=`<div style="padding:14px">
    <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">\u2795 Log a Lecture for <span style="font-family:'Courier New',monospace;color:var(--brand)">${esc(selectedGroup)}</span></div>
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Link a created lecture (optional)</label>
        <select onchange="onTeachingLecturePick(this.value)" style="width:100%;padding:8px;border-radius:8px;border:.5px solid var(--border-4);font-size:12px;font-family:inherit;background:#fff;color:var(--ink);box-sizing:border-box">
          <option value="">— none: enter manually below —</option>
          ${(STATE.dashLectures||[]).map(l=>`<option value="${esc(l.id)}" ${d.lectureId===l.id?'selected':''}>${esc(l.title||'Untitled')}${l.date?' \u00B7 '+esc(l.date):''}</option>`).join('')}
        </select>
        ${d.lectureTitle?`<div style="font-size:10px;color:var(--brand);margin-top:4px">\u{1F517} Linked: ${esc(d.lectureTitle)} — date auto-filled; pick the units taught below.</div>`:''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Lecture # *</label><input id="tl-lecno" type="number" min="1" value="${esc(String(d.lectureNumber||''))}" oninput="STATE.dashTeachingDraft.lectureNumber=this.value;this.classList.remove('field-error')" placeholder="1" style="width:100%;padding:8px;border-radius:8px;border:.5px solid var(--border-4);font-size:12px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box"></div>
        <div><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Date *</label><input id="tl-date" type="date" value="${esc(d.date||'')}" oninput="STATE.dashTeachingDraft.date=this.value;this.classList.remove('field-error')" style="width:100%;padding:8px;border-radius:8px;border:.5px solid var(--border-4);font-size:12px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box"></div>
      </div>
      <div style="margin-bottom:10px"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Units taught * (${d.unitIds.length} selected)</label><div id="tl-units" style="border:.5px solid var(--border);border-radius:8px;padding:10px;max-height:280px;overflow-y:auto;background:var(--surface)">${lessonPicker}</div></div>
      <div style="margin-bottom:10px"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Notes (optional)</label><textarea oninput="STATE.dashTeachingDraft.notes=this.value" placeholder="What did you cover in this lecture? Any highlights or student questions?" style="width:100%;padding:8px;border-radius:8px;border:.5px solid var(--border-4);font-size:12px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box;resize:vertical;min-height:60px">${esc(d.notes||'')}</textarea></div>
      <button onclick="saveTeachingEntry()" style="width:100%;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F4BE} Save Entry</button>
    </div>`;
  if(entries.length===0){
    return `${createForm}${renderDashTabEmpty('Teaching entries',selectedGroup,{icon:'\u{1F4D3}',body:'No teaching entries yet for this group. Log your first lecture using the form above.'})}</div>`;
  }
  const rows=entries.map(e=>{const dt=e.date?new Date(e.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';const titles=(e.unitIds||[]).map(uid=>{const found=allLessons.find(x=>x.lesson.id===uid);return found?`${uid}. ${found.lesson.title}`:uid;});return `<div class="teach-entry"><div class="teach-badges"><span class="teach-badge" style="background:#D6EAF8;color:var(--brand)">Lecture ${e.lectureNumber}</span><span class="teach-badge" style="background:var(--surface-3);color:#555">${dt}</span>${e.lectureTitle?'<span class="teach-badge" style="background:#EBF5FB;color:var(--brand)">\u{1F517} '+esc(e.lectureTitle)+'</span>':''}</div><div style="font-size:11px;color:#888;margin-bottom:8px">${titles.length} unit${titles.length===1?'':'s'} taught</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${titles.map(t=>`<span style="font-size:10px;background:#EBF5FB;color:var(--brand);padding:2px 7px;border-radius:8px">${esc(t)}</span>`).join('')}</div>${e.notes?`<div style="font-size:12px;color:#444;background:var(--surface);border-radius:8px;padding:8px 10px;margin-bottom:8px;line-height:1.5">${esc(e.notes)}</div>`:''}<button onclick="deleteTeachingEntry('${e.id}')" style="padding:5px 10px;border-radius:6px;border:.5px solid var(--err)40;background:var(--err-tint);color:var(--err-2);font-size:11px;cursor:pointer;font-family:inherit">\u{1F5D1}\uFE0F Delete</button></div>`;}).join('');
  return `${createForm}
    <div style="font-size:12px;font-weight:500;color:#888;letter-spacing:.5px;margin-bottom:8px">RECENT ENTRIES (${entries.length})</div>
    ${rows}
  </div>`;
}

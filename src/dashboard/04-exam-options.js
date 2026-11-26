// Instructor exam options: source filter, Numerical %, and the optional CBQ part.

function readExamOptions(d,sectionIds){
  const sourceFilter=['app','outside'].includes(d.sourceFilter)?d.sourceFilter:'all';
  let numericalPct=null;
  if(d.numericalPct!==''&&d.numericalPct!=null){
    numericalPct=Number(d.numericalPct);
    if(!Number.isInteger(numericalPct)||numericalPct<0||numericalPct>100)return {ok:false,message:'Numerical % must be a whole number from 0 to 100, or empty.'};
  }
  if(!d.includeCbq)return {ok:true,sourceFilter,numericalPct,includeCbq:false};
  const cbqCount=Number(d.cbqCount==null?EXAM_CBQ_DEFAULT_COUNT:d.cbqCount);
  const cbqMinutes=Number(d.cbqMinutes==null?EXAM_CBQ_DEFAULT_MINUTES:d.cbqMinutes);
  if(!Number.isInteger(cbqCount)||cbqCount<1||cbqCount>4)return {ok:false,message:'Number of case studies must be 1 to 4.'};
  if(!Number.isInteger(cbqMinutes)||cbqMinutes<10||cbqMinutes>180)return {ok:false,message:'Part 2 duration must be 10 to 180 minutes.'};
  const choose=d.cbqMode==='choose';
  // keep only chosen cases that still belong to a selected section
  const chosen=choose?(d.cbqIds||[]).filter(id=>sectionIds.includes(CBQ_LETTER_SECTION[String(id).charAt(0)])):[];
  if(choose&&chosen.length!==cbqCount)return {ok:false,message:'Choose exactly '+cbqCount+' case stud'+(cbqCount===1?'y':'ies')+' from the selected sections ('+chosen.length+' chosen).'};
  return {ok:true,sourceFilter,numericalPct,includeCbq:true,cbqCount,cbqMinutes,cbqMode:choose?'choose':'auto',chosen};
}
// Freezes the case list so every student gets the same Part 2.
async function buildExamCbqFields(options,sectionIds){
  if(!options.includeCbq)return {ok:true,fields:{includeCbq:false}};
  try{await ensureCBQData();}catch(e){return {ok:false,message:'Could not load the case studies. Check your connection.'};}
  const ids=options.cbqMode==='choose'?options.chosen:pickExamCbqIds(examAllCbqCases(),sectionIds,options.cbqCount);
  if(ids.length!==options.cbqCount)return {ok:false,message:'Only '+ids.length+' case studies are available for these sections.'};
  return {ok:true,fields:{includeCbq:true,cbqIds:ids,cbqDurationMinutes:options.cbqMinutes}};
}
function toggleExamCbq(on){
  const d=STATE.dashExamDraft;
  d.includeCbq=!!on;
  // Recommended two-part defaults (all still editable).
  if(on){d.count=100;d.durationMinutes=180;d.maxAttempts=1;if(d.cbqCount==null)d.cbqCount=EXAM_CBQ_DEFAULT_COUNT;if(d.cbqMinutes==null)d.cbqMinutes=EXAM_CBQ_DEFAULT_MINUTES;}
  render();
}
function setExamCbqMode(mode){STATE.dashExamDraft.cbqMode=mode;render();}
function toggleExamCbqCase(id){
  const d=STATE.dashExamDraft;
  const ids=(d.cbqIds||[]).slice();
  const i=ids.indexOf(id);
  if(i>=0)ids.splice(i,1);else ids.push(id);
  d.cbqIds=ids;render();
}
function renderExamCbqChooser(d){
  if(d.cbqMode!=='choose')return '';
  if(typeof CBQ_DATA==='undefined'){
    ensureCBQData().then(()=>render()).catch(()=>showToast('Could not load the case studies.','error'));
    return '<div style="font-size:12px;color:var(--muted)">Loading case studies…</div>';
  }
  const secs=(d.sectionIds||[]).map(Number);
  if(!secs.length)return '<div style="font-size:12px;color:var(--muted)">Select a section first.</div>';
  const chosen=d.cbqIds||[];
  const list=examAllCbqCases().filter(c=>secs.includes(c.sectionId));
  const picked=list.filter(c=>chosen.includes(c.id)).length;
  return '<div style="font-size:12px;color:var(--muted);margin:4px 0">Chosen: <b>'+picked+'</b></div>'
    +'<div style="max-height:240px;overflow-y:auto;border:.5px solid var(--border);border-radius:8px;padding:6px 10px;background:var(--surface)">'
    +list.map(c=>'<label style="display:flex;gap:8px;align-items:flex-start;padding:5px 0;font-size:12px;color:var(--ink);cursor:pointer"><input type="checkbox" '+(chosen.includes(c.id)?'checked':'')+' onchange="toggleExamCbqCase(\''+c.id+'\')"><span><b>Sec '+c.sectionId+'</b> · '+esc(c.title||c.id)+'</span></label>').join('')
    +'</div>';
}
function renderExamOptions(d){
  const src=d.sourceFilter||'all';
  const opt=(v,l,cur)=>'<option value="'+v+'" '+(cur===v?'selected':'')+'>'+l+'</option>';
  const cbq=!d.includeCbq?'':
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:8px 0">'
    +'<div><label class="dx-02">Case studies (1–4)</label><input type="number" min="1" max="4" value="'+esc(String(d.cbqCount==null?EXAM_CBQ_DEFAULT_COUNT:d.cbqCount))+'" oninput="STATE.dashExamDraft.cbqCount=this.value" class="dx-05"></div>'
    +'<div><label class="dx-02">Part 2 duration (min)</label><input type="number" min="10" max="180" value="'+esc(String(d.cbqMinutes==null?EXAM_CBQ_DEFAULT_MINUTES:d.cbqMinutes))+'" oninput="STATE.dashExamDraft.cbqMinutes=this.value" class="dx-05"></div>'
    +'</div>'
    +'<label class="dx-02">Which case studies?</label>'
    +'<select onchange="setExamCbqMode(this.value)" class="dx-05">'+opt('auto','App picks from the selected sections',d.cbqMode||'auto')+opt('choose','I will choose',d.cbqMode||'auto')+'</select>'
    +renderExamCbqChooser(d)
    +'<div style="font-size:11px;color:var(--muted);line-height:1.6;margin-top:6px">Part 2 opens at 50% or more on the MCQs. Answers stay hidden until Part 2 is submitted or the exam closes. With more than 1 attempt, a student can see answers and then retake. The window must fit both parts, and students need to start early enough to finish both.</div>';
  return '<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">'
    +'<div><label class="dx-02">Question source</label><select onchange="STATE.dashExamDraft.sourceFilter=this.value" class="dx-05">'+opt('all','All sources',src)+opt('app','App-written only',src)+opt('outside','Outside sources only',src)+'</select></div>'
    +'<div><label class="dx-02">Numerical % <span style="font-weight:400">(empty = any)</span></label><input type="number" min="0" max="100" value="'+esc(String(d.numericalPct==null?'':d.numericalPct))+'" oninput="STATE.dashExamDraft.numericalPct=this.value" class="dx-05" placeholder="e.g. 40"></div>'
    +'</div>'
    +'<div class="dx-03"><label style="display:flex;gap:8px;align-items:center;font-size:13px;font-weight:600;color:var(--ink);cursor:pointer"><input type="checkbox" '+(d.includeCbq?'checked':'')+' onchange="toggleExamCbq(this.checked)"> Include CBQ (Part 2)</label>'+cbq+'</div>';
}
function examOptionsLine(x){
  const parts=[];
  if(x.sourceFilter==='app')parts.push('App-written questions only');
  if(x.sourceFilter==='outside')parts.push('Outside-source questions only');
  if(x.numericalCount!=null)parts.push('Numerical: <b>'+Number(x.numericalCount)+'</b> of '+Number(x.count)+(x.numericalPct!=null?' (target '+Number(x.numericalPct)+'%)':''));
  if(x.includeCbq)parts.push('Part 2: <b>'+(x.cbqIds||[]).length+'</b> case studies · <b>'+Number(x.cbqDurationMinutes)+'</b> min');
  return parts.length?parts.join(' · ')+'<br>':'';
}
function renderExamCbqPreview(ex){
  if(!ex.includeCbq)return '';
  if(typeof CBQ_DATA==='undefined'){
    ensureCBQData().then(()=>{if(STATE.dashExamPreviewId===ex.id)render();}).catch(()=>{});
    return '<div style="font-size:12px;color:var(--muted)">Loading case studies…</div>';
  }
  return '<div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px"><div style="font-size:13px;font-weight:700;color:var(--brand);margin-bottom:6px">Part 2 case studies</div>'
    +examCbqCasesFor(ex).map((c,i)=>'<div style="font-size:13px;color:var(--ink);padding:4px 0">'+(i+1)+'. '+esc(c.title||c.id)+' ('+c.questions.length+' questions)</div>').join('')+'</div>';
}
function examCbqResultLine(exam,r,examId){
  if(!exam||!exam.includeCbq||!r.submitted)return '';
  const sum=examCbqSummary(exam,r);
  const done=!!(r.cbq&&r.cbq.submitted);
  return '<div style="font-size:11px;color:var(--ink);margin-top:3px">'+(done?'CBQ '+Number(r.cbq.score)+'/'+Number(r.cbq.total)+' ('+Number(r.cbq.percentage)+'%) · Est. ':'')+esc(sum.label)
    +(done?' <button onclick="openInstructorCbqReview(\''+examId+'\',\''+r._docId+'\')" style="margin-left:6px;padding:3px 8px;border-radius:6px;border:.5px solid var(--border-4);background:var(--brand-tint);color:var(--brand);font-size:10px;font-weight:600;cursor:pointer;font-family:inherit">Review CBQ</button>':'')+'</div>';
}
function openInstructorCbqReview(examId,docId){
  const cache=STATE.dashExamResults[examId];
  const r=cache&&cache.results.find(x=>x._docId===docId);
  if(!r){showToast('Student result not found.','error');return;}
  const student=(STATE.dashStudents||[]).find(s=>s.uid===r.userId)||{name:r.studentName||'Student'};
  openExamCbqReview(examId,r,student);
}

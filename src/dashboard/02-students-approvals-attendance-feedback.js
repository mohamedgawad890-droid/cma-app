// CMA Prep — instructor dashboard source (Batch 24). Joined in filename order
// into dist/dashboard.min.js, loaded only for the instructor. Functions only.

// Unit picker used by the Exam create form. Empty selection = whole section.
// Batch 11: unit picker is now PER-SECTION — each selected section gets its
// own chip group, stored at unitsBySection[sectionId] (empty = whole section).
function renderExamUnitPicker(d,sectionId){
  const secId=parseInt(sectionId);
  const sec=S.find(s=>s.id===secId);
  if(!sec)return '';
  d.unitsBySection=d.unitsBySection||{};
  const selected=new Set((d.unitsBySection[secId]||[]).map(String));
  const chips=sec.lessons.map((l,idx)=>{
    const on=selected.has(String(l.id));
    // Batch 10: flag out-of-scope units so instructors see why a unit
    // (e.g. 4-14 Variances) is excluded from auto-built exam pools.
    const badge=l.outOfScope==='part2'?' \u26A0\uFE0F Part 2':(l.outOfScope?' \u26A0\uFE0F \u2192 Sec.3':'');
    return `<button type="button" onclick="toggleExamUnit(${secId},'${l.id}')" style="padding:6px 10px;border-radius:14px;border:1px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':(l.outOfScope?'#fff7ed':'#fff')};color:${on?'#fff':(l.outOfScope?'#b45309':'#555')};font-size:11px;font-weight:${on?'600':'500'};cursor:pointer;font-family:inherit;white-space:nowrap">U${idx+1}: ${esc(l.title.length>28?l.title.slice(0,26)+'\u2026':l.title)}${badge}</button>`;
  }).join('');
  const allCount=sec.lessons.length;
  const sel=selected.size;
  const label=sel===0?`All units (${allCount})`:`${sel} of ${allCount} units`;
  return `<div style="margin-bottom:10px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <label style="font-size:11px;color:#888">Sec ${secId} \u2014 ${esc(sec.title)} units <span style="font-weight:600;color:var(--brand)">${label}</span></label>
      <button type="button" onclick="clearExamUnits(${secId})" style="background:none;border:none;color:var(--brand);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Clear \u2192 all</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--surface);border:.5px solid var(--border);border-radius:8px;max-height:150px;overflow-y:auto">${chips}</div>
    <div style="font-size:11px;color:#888;margin-top:4px">Leave empty to include the whole section.</div>
  </div>`;
}

function toggleExamSection(sidStr){
  const sid=parseInt(sidStr);
  const d=STATE.dashExamDraft;
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

function toggleExamUnit(sectionId,uid){
  const d=STATE.dashExamDraft;
  d.unitsBySection=d.unitsBySection||{};
  const arr=d.unitsBySection[sectionId]||[];
  const i=arr.indexOf(uid);
  if(i>=0)arr.splice(i,1);else arr.push(uid);
  d.unitsBySection[sectionId]=arr.slice();
  render();
}

function clearExamUnits(sectionId){
  const d=STATE.dashExamDraft;
  d.unitsBySection=d.unitsBySection||{};
  d.unitsBySection[sectionId]=[];
  render();
}

// ── Ticket #9 exam re-shuffle (only while status === 'scheduled') ──────────
async function reshuffleExam(examId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const ex=(STATE.dashExams||[]).find(e=>e.id===examId);
  if(!ex){showToast('Exam not found.','error');return;}
  if(examWindowStatus(ex)!=='scheduled'){showToast('Only scheduled exams can be re-shuffled.','warning');return;}
  const ok=await showModal({icon:'\u{1F504}',title:'Re-shuffle Questions?',body:'This picks a fresh random set of '+ex.count+' questions from the same sections/units, keeping the same even split. Students haven\u2019t started yet, so this is safe.',type:'info',confirmText:'Re-shuffle',cancelText:'Cancel'});
  if(!ok)return;
  try{
    // Batch 11: same distribution logic as saveExam — legacy single-section
    // exams (no sectionIds array) fall back to their one sectionId/unitIds.
    const sectionIds=Array.isArray(ex.sectionIds)&&ex.sectionIds.length?ex.sectionIds:[ex.sectionId];
    const unitsBySection=ex.unitsBySection||(ex.unitIds?{[ex.sectionId]:ex.unitIds}:{});
    const result=await buildDistributedExamPool(sectionIds,unitsBySection,ex.count);
    if(!result.ok){showToast(result.message,'warning');return;}
    await db.collection('exams').doc(examId).update({questionIds:result.questionIds,reshuffledAt:new Date().toISOString()});
    showToast('Questions re-shuffled \u2705','success');
    await refreshDashScoped();
  }catch(e){console.warn('[reshuffleExam]',e);showToast('Error: '+e.message,'error');}
}

function renderDashStudents(){
  if(STATE.dashStudentDetailUid)return renderDashStudentDetail();
  const all=STATE.dashStudents||[];
  const groups=(STATE.dashGroups||[]).slice().sort((a,b)=>(a.code||'').localeCompare(b.code||''));
  const f=(STATE.dashStudentsFilter||'').toUpperCase();
  const q=(STATE.dashStudentsSearch||'').trim().toLowerCase();
  let list=all.slice();
  if(f)list=list.filter(s=>(s.groupCode||'').toUpperCase()===f);
  if(q)list=list.filter(s=>{
    const hay=((s.name||'')+' '+(s.email||'')+' '+(s.mobile||'')+' '+(s.groupCode||'')).toLowerCase();
    return hay.includes(q);
  });
  list.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const filterBtn=(v,l)=>{
    const on=(STATE.dashStudentsFilter||'')===v;
    return `<button onclick="STATE.dashStudentsFilter='${esc(v)}';render()" style="padding:6px 12px;border-radius:16px;border:1px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':'#fff'};color:${on?'#fff':'#555'};font-size:12px;font-weight:${on?'600':'500'};cursor:pointer;font-family:inherit;white-space:nowrap">${esc(l)}</button>`;
  };
  const filterChips='<div style="display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none">'+
    filterBtn('','All ('+all.length+')')+
    groups.map(g=>{const n=all.filter(s=>(s.groupCode||'').toUpperCase()===g.code.toUpperCase()).length;return filterBtn(g.code,g.code+' ('+n+')');}).join('')+
    '</div>';
  if(!all.length){
    return `<div style="padding:14px">
      <div class="gs-empty">
        <div class="gs-empty-icon">\u{1F464}</div>
        <div class="gs-empty-title">No students yet</div>
        <div class="gs-empty-body">Once students register with a group code, they\u2019ll appear here.</div>
      </div></div>`;
  }
  const rows=list.map(s=>{
    const initials=(s.name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
    const avatar=s.photo?`<img src="${esc(s.photo)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">`:`<div style="width:44px;height:44px;border-radius:50%;background:var(--brand-tint);color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0">${esc(initials)}</div>`;
    return `<div onclick="STATE.dashStudentDetailUid='${esc(s.uid)}';render()" style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer">
      ${avatar}
      <div style="min-width:0;flex:1">
        <div style="font-size:14px;font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name||'Unnamed')}</div>
        <div style="font-size:11px;color:#888;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.groupCode||'\u2014 no group')} \u00B7 ${esc(s.email||s.mobile||'\u2014')}</div>
      </div>
      <span style="color:#bbb;font-size:20px">\u203A</span>
    </div>`;
  }).join('')||`<div style="text-align:center;padding:34px 20px;color:#888;font-size:13px">No students match your search.</div>`;
  return `<div style="padding:14px">
    <input type="text" placeholder="\u{1F50D} Search by name, email, mobile\u2026" value="${esc(STATE.dashStudentsSearch||'')}"
      oninput="STATE.dashStudentsSearch=this.value;render()"
      style="width:100%;padding:10px 12px;border-radius:10px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:var(--surface);box-sizing:border-box;margin-bottom:10px">
    ${filterChips}
    <div style="font-size:12px;font-weight:500;color:#888;letter-spacing:.5px;margin:6px 0 8px">STUDENTS (${list.length})</div>
    ${rows}
    <div style="height:30px"></div>
  </div>`;
}

async function loadDashApprovals(){
  if(STATE.dashApprovals.loading)return;
  STATE.dashApprovals={loading:true,loaded:false,rows:STATE.dashApprovals.rows||[]};
  try{
    const snap=await db.collection('group-requests').where('status','==','pending').get();
    const rows=snap.docs.map(d=>({_docId:d.id,...d.data()}))
      .sort((a,b)=>(a.requestedAt||'').localeCompare(b.requestedAt||''));
    STATE.dashApprovals={loading:false,loaded:true,rows};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='approvals')render();
  }catch(e){
    console.warn('[loadDashApprovals] failed:',e);
    STATE.dashApprovals={loading:false,loaded:true,rows:[],error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='approvals')render();
  }
}

function renderDashApprovals(){
  const rows=(STATE.dashApprovals&&STATE.dashApprovals.rows)||[];
  if(!rows.length){
    return `<div style="padding:14px"><div class="gs-empty">
      <div class="gs-empty-icon">\u2705</div>
      <div class="gs-empty-title">No pending requests</div>
      <div class="gs-empty-body">When a student enters a new or different group code on their profile, their request to join shows up here for you to approve or reject.</div>
    </div></div>`;
  }
  const fmtDT=(iso)=>{if(!iso)return '';try{return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch{return iso;}};
  const cards=rows.map(r=>`<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:10px">
    <div style="font-size:14px;font-weight:600;color:var(--ink)">${esc(r.studentName||'Unnamed')}</div>
    <div style="font-size:11px;color:#888;margin-top:2px">${esc(r.studentEmail||r.studentMobile||'')}</div>
    <div style="font-size:12px;color:#555;margin-top:6px">Requesting group <b style="font-family:'Courier New',monospace">${esc(r.groupCode)}</b> \u00B7 ${fmtDT(r.requestedAt)}</div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button onclick="approveGroupRequest('${esc(r._docId)}')" style="flex:1;padding:9px;border-radius:8px;border:none;background:var(--ok-strong-2);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">\u2705 Approve</button>
      <button onclick="rejectGroupRequest('${esc(r._docId)}')" style="flex:1;padding:9px;border-radius:8px;border:.5px solid var(--err);background:var(--err-tint);color:var(--err-2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">\u2716 Reject</button>
    </div>
  </div>`).join('');
  return `<div style="padding:14px">
    <div style="font-size:12px;color:#888;margin-bottom:10px">${rows.length} pending request${rows.length===1?'':'s'}.</div>
    ${cards}
    <div style="height:30px"></div>
  </div>`;
}

async function approveGroupRequest(requestId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const req=(STATE.dashApprovals.rows||[]).find(r=>r._docId===requestId);
  if(!req)return;
  try{
    await db.collection('students').doc(req.uid).set({groupCode:req.groupCode,pendingGroupCode:''},{merge:true});
    await db.collection('group-requests').doc(requestId).update({status:'approved',resolvedAt:new Date().toISOString(),resolvedBy:STATE.user.uid});
    STATE.dashApprovals.rows=(STATE.dashApprovals.rows||[]).filter(r=>r._docId!==requestId);
    // Keep the roster's cached copy in sync so Students tab reflects it immediately.
    const idx=(STATE.dashStudents||[]).findIndex(s=>s.uid===req.uid);
    if(idx>=0){STATE.dashStudents[idx].groupCode=req.groupCode;STATE.dashStudents[idx].pendingGroupCode='';}
    showToast('\u2705 Approved — '+(req.studentName||'Student')+' is now in '+req.groupCode,'success');
    render();
  }catch(e){console.warn('[approveGroupRequest]',e);showToast('Error: '+e.message,'error');}
}

async function rejectGroupRequest(requestId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const req=(STATE.dashApprovals.rows||[]).find(r=>r._docId===requestId);
  if(!req)return;
  const ok=await showModal({icon:'\u2716',title:'Reject Request?',body:'This declines '+(req.studentName||'this student')+'\u2019s request to join '+req.groupCode+'. They\u2019ll see it was declined and can contact you or try a different code.',type:'warning',confirmText:'Reject',cancelText:'Cancel'});
  if(!ok)return;
  try{
    await db.collection('students').doc(req.uid).set({pendingGroupCode:''},{merge:true});
    // Kept as a record (status:'rejected'), not deleted — audit trail.
    await db.collection('group-requests').doc(requestId).update({status:'rejected',resolvedAt:new Date().toISOString(),resolvedBy:STATE.user.uid});
    STATE.dashApprovals.rows=(STATE.dashApprovals.rows||[]).filter(r=>r._docId!==requestId);
    const idx=(STATE.dashStudents||[]).findIndex(s=>s.uid===req.uid);
    if(idx>=0){STATE.dashStudents[idx].pendingGroupCode='';}
    showToast('Request rejected.','info');
    render();
  }catch(e){console.warn('[rejectGroupRequest]',e);showToast('Error: '+e.message,'error');}
}

// Fix: dashboard roster caches on first open (dashGroupsLoaded=true), so any
// profile fields the student completes AFTER cache-warm never appear here.
// We now re-fetch students/{uid} on detail open (one read per open — cheap)
// and merge over the cached row so the second open is instant.
// Batch 11: instructor-initiated removal from a group (confirm modal, then
// clears groupCode — student falls back to self-study until they re-join
// via a fresh request, which goes through approval again like any other).
async function removeStudentFromGroup(uid){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const s=(STATE.dashStudents||[]).find(x=>x.uid===uid);
  if(!s)return;
  const ok=await showModal({icon:'\u{1F6AA}',title:'Remove from Group?',body:'This removes '+(s.name||'this student')+' from group '+esc(s.groupCode)+'. They\u2019ll need a new request (approved by you) to rejoin any group.',type:'danger',confirmText:'Remove',cancelText:'Cancel'});
  if(!ok)return;
  try{
    await db.collection('students').doc(uid).set({groupCode:'',pendingGroupCode:''},{merge:true});
    s.groupCode='';s.pendingGroupCode='';
    showToast('Removed from group.','success');
    render();
  }catch(e){console.warn('[removeStudentFromGroup]',e);showToast('Error: '+e.message,'error');}
}

async function loadStudentDetailFresh(uid){

  if(!uid||!db) return;
  STATE.dashStudentDetailLoading=true;
  try{
    const [sdoc,ndoc]=await Promise.all([
      db.collection('students').doc(uid).get(),
      db.collection('instructor-notes').doc(uid).get()
    ]);
    if(sdoc.exists){
      const fresh=sdoc.data();
      const idx=(STATE.dashStudents||[]).findIndex(x=>x.uid===uid);
      if(idx>=0){
        STATE.dashStudents[idx]={...STATE.dashStudents[idx],...fresh,uid};
      }
    }
    STATE.dashInstructorNotes=STATE.dashInstructorNotes||{};
    STATE.dashInstructorNotes[uid]=ndoc.exists?(ndoc.data().text||''):'';
  }catch(e){ console.warn('[loadStudentDetailFresh] failed',e); }
  finally{
    STATE.dashStudentDetailLoading=false;
    STATE.dashStudentDetailLoadedFor=uid;
    if(STATE.dashStudentDetailUid===uid) render();
  }
}

async function saveInstructorNote(uid){
  const ta=document.getElementById('inst-note-'+uid);
  if(!ta) return;
  const text=String(ta.value||'').slice(0,4000);
  try{
    await db.collection('instructor-notes').doc(uid).set({text,updatedAt:new Date().toISOString(),by:STATE.user.uid});
    STATE.dashInstructorNotes=STATE.dashInstructorNotes||{};
    STATE.dashInstructorNotes[uid]=text;
    showToast('Note saved \u2713','success',1500);
  }catch(e){ showToast('Save failed: '+e.message,'error'); }
}

function renderDashStudentDetail(){
  // Batch 6: intercept for attendance history sub-view
  if(STATE.dashStudentAttendanceUid)return renderDashStudentAttendanceHistory();
  const uid=STATE.dashStudentDetailUid;
  const s=(STATE.dashStudents||[]).find(x=>x.uid===uid);
  if(!s){STATE.dashStudentDetailUid=null;return renderDashStudents();}
  // Trigger live re-fetch once per detail open. Guarded by _LoadedFor so a
  // re-render (typing in the note box) doesn't re-hit the network.
  if(STATE.dashStudentDetailLoadedFor!==uid && !STATE.dashStudentDetailLoading){
    setTimeout(()=>loadStudentDetailFresh(uid),0);
  }
  const initials=(s.name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
  const avatar=s.photo?`<img src="${esc(s.photo)}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid var(--brand-tint)">`:`<div style="width:96px;height:96px;border-radius:50%;background:var(--brand-tint);color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;border:3px solid var(--brand-tint)">${esc(initials)}</div>`;
  const field=(l,v)=>{if(v===undefined||v===null||v==='')return '';return `<div style="font-size:11px;color:var(--muted-2);margin-bottom:2px">${esc(l)}</div><div style="font-size:14px;color:var(--ink);font-weight:500;margin-bottom:12px;word-break:break-word">${esc(v)}</div>`;};
  const examdate=s.examdate?(function(){try{const d=new Date(s.examdate+'-01');return d.toLocaleDateString('en-GB',{month:'long',year:'numeric'});}catch{return s.examdate;}})():'';
  const registered=s.registeredAt?(function(){try{return new Date(s.registeredAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}catch{return '';}})():'';
  // ── Section-empty detection: hide a card completely when EVERY field is empty
  const contactVals=[s.email,s.mobile,s.country,s.city];
  const eduVals=[s.university,s.faculty,s.gradyear,s.title,s.company,s.experience];
  const cmaVals=[s.level,s.goal,examdate,s.preferredLang,s.attemptType,s.timezone];
  const anyContact=contactVals.some(v=>v);
  const anyEdu=eduVals.some(v=>v);
  const anyCma=cmaVals.some(v=>v);
  const loading=STATE.dashStudentDetailLoading && STATE.dashStudentDetailLoadedFor!==uid;
  const loadingBadge=loading?`<div style="font-size:11px;color:var(--muted-2);text-align:center;margin-bottom:10px">\u21BB Loading latest\u2026</div>`:'';
  const noteText=(STATE.dashInstructorNotes&&STATE.dashInstructorNotes[uid])||'';
  return `<div style="padding:14px">
    <button onclick="STATE.dashStudentDetailUid=null;STATE.dashStudentDetailLoadedFor=null;render()" style="background:none;border:none;color:var(--brand);font-size:14px;cursor:pointer;font-family:inherit;padding:0 0 12px;font-weight:500">\u2039 Back to students</button>
    <div style="background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:16px;padding:22px;text-align:center;color:#fff;margin-bottom:16px">
      <div style="display:flex;justify-content:center;margin-bottom:12px">${avatar}</div>
      <div style="font-size:18px;font-weight:600;margin-bottom:4px">${esc(s.name||'Unnamed')}</div>
      <div style="font-size:12px;opacity:.85">${esc(s.groupCode||'\u2014 no group')}${s.country?' \u00B7 '+esc(s.country):''}</div>
    </div>
    ${loadingBadge}
    ${anyContact?`<div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--brand);margin-bottom:10px;letter-spacing:.5px">CONTACT</div>
      ${field('Email',s.email)}
      ${field('Mobile',s.mobile)}
      ${field('Country',s.country)}
      ${field('City',s.city)}
    </div>`:''}
    ${anyEdu?`<div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--brand);margin-bottom:10px;letter-spacing:.5px">EDUCATION & CAREER</div>
      ${field('University',s.university)}
      ${field('Faculty',s.faculty)}
      ${field('Graduation Year',s.gradyear)}
      ${field('Job Title',s.title)}
      ${field('Company',s.company)}
      ${field('Years of Experience',s.experience)}
    </div>`:''}
    ${anyCma?`<div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--brand);margin-bottom:10px;letter-spacing:.5px">CMA STUDY PROFILE</div>
      ${field('Accounting/Finance Level',s.level)}
      ${field('CMA Goal',s.goal)}
      ${field('Target Exam Date',examdate)}
      ${field('Preferred Language',s.preferredLang)}
      ${field('Attempt Type',s.attemptType)}
      ${field('Timezone',s.timezone)}
    </div>`:''}
    ${(!anyContact&&!anyEdu&&!anyCma&&!loading)?`<div style="background:var(--warn-tint);border:1px solid var(--warn);border-radius:12px;padding:14px;margin-bottom:12px;font-size:13px;color:var(--warn-strong);line-height:1.5">\u26A0\uFE0F This student hasn't completed their profile yet. Only the basic account info is available.</div>`:''}
    <!-- Batch 6 · G.5 — private instructor notes (visible only to instructor per rules) -->
    <div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--accent-purple-strong);letter-spacing:.5px">\u{1F512} PRIVATE NOTES · INSTRUCTOR ONLY</div>
      </div>
      <textarea id="inst-note-${esc(uid)}" placeholder="Coaching notes about this student — not visible to them. E.g. 'Needs extra help with Section 4', 'Prefers video over reading'\u2026" style="width:100%;min-height:88px;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:var(--accent-purple-tint);color:var(--ink);resize:vertical;line-height:1.5;box-sizing:border-box">${esc(noteText)}</textarea>
      <button onclick="saveInstructorNote('${esc(uid)}')" style="margin-top:8px;padding:8px 16px;border-radius:8px;border:none;background:var(--accent-purple-strong);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Save note</button>
    </div>
    <button onclick="openStudentAttendanceHistory('${esc(s.uid)}')" style="width:100%;padding:12px;border-radius:10px;border:.5px solid var(--brand-2);background:var(--brand-tint);color:var(--brand);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:12px">\u{1F4C5} View attendance history</button>
    ${s.groupCode?`<button onclick="removeStudentFromGroup('${esc(s.uid)}')" style="width:100%;padding:12px;border-radius:10px;border:.5px solid var(--err);background:var(--err-tint);color:var(--err-2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:12px">\u{1F6AA} Remove from group</button>`:''}
    ${registered?`<div style="text-align:center;font-size:11px;color:var(--muted-2);margin-bottom:8px">Registered ${esc(registered)}</div>`:''}
    <div style="height:30px"></div>
  </div>`;
}

function openStudentAttendanceHistory(uid){
  STATE.dashStudentAttendanceUid=uid;
  STATE.dashStudentAttendanceLoading=true;
  STATE.dashStudentAttendanceRows=null;
  render();
  loadStudentAttendanceHistory(uid).then(rows=>{
    STATE.dashStudentAttendanceRows=rows;
    STATE.dashStudentAttendanceLoading=false;
    if(STATE.tab==='dashboard'&&STATE.dashStudentAttendanceUid===uid)render();
  }).catch(e=>{
    console.warn('[AttendanceHistory] load failed',e);
    STATE.dashStudentAttendanceRows=[];
    STATE.dashStudentAttendanceLoading=false;
    if(STATE.tab==='dashboard'&&STATE.dashStudentAttendanceUid===uid)render();
  });
}

function closeStudentAttendanceHistory(){
  STATE.dashStudentAttendanceUid=null;
  STATE.dashStudentAttendanceRows=null;
  STATE.dashStudentAttendanceLoading=false;
  render();
}

async function loadStudentAttendanceHistory(uid){
  const snap=await db.collection('attendance').where('userId','==',uid).get();
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}

function renderDashStudentAttendanceHistory(){
  const uid=STATE.dashStudentAttendanceUid;
  const s=(STATE.dashStudents||[]).find(x=>x.uid===uid);
  if(!s){STATE.dashStudentAttendanceUid=null;return renderDashStudents();}
  const loading=STATE.dashStudentAttendanceLoading;
  const rows=STATE.dashStudentAttendanceRows||[];
  const groupLectures=(STATE.dashLectures||[]).filter(l=>(l.groupCode||'').toUpperCase()===(s.groupCode||'').toUpperCase());
  const lecturesSorted=groupLectures.slice().sort((a,b)=>{
    const da=a.date||a.createdAt||'';
    const db2=b.date||b.createdAt||'';
    return db2.localeCompare(da);
  });
  const attMap={};
  rows.forEach(r=>{if(r.lectureId)attMap[r.lectureId]=r;});
  const present=Object.keys(attMap).filter(lid=>groupLectures.find(l=>l.id===lid)).length;
  const total=groupLectures.length;
  const attRate=total?Math.round((present/total)*100):0;
  const rateColor=attRate>=80?'var(--ok-2)':(attRate>=50?'var(--warn)':'var(--err-2)');

  const fmtDate=(iso)=>{
    if(!iso)return '—';
    try{
      return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    }catch{return iso;}
  };

  const rowsHTML=lecturesSorted.length?lecturesSorted.map(l=>{
    const att=attMap[l.id];
    const isPresent=!!att;
    const mode=att?(att.mode||'—'):'';
    const modeIcon=mode==='online'?'🌐':(mode==='offline'?'🏫':'');
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:#fff;border:.5px solid var(--border);border-radius:10px;margin-bottom:6px">
      <div style="width:38px;height:38px;border-radius:50%;background:${isPresent?'var(--ok-tint-2)':'var(--err-tint)'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${isPresent?'✅':'❌'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--ink);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.title||'(untitled)')}</div>
        <div style="font-size:11px;color:#888;margin-top:2px">${fmtDate(l.date||l.createdAt)}${mode?' · '+modeIcon+' '+esc(mode):''}</div>
      </div>
      <div style="font-size:11px;font-weight:600;color:${isPresent?'var(--ok-2)':'var(--err-2)'};flex-shrink:0">${isPresent?'Present':'Absent'}</div>
    </div>`;
  }).join(''):`<div style="text-align:center;padding:32px 20px;color:#888">
    <div style="font-size:36px;margin-bottom:10px">📅</div>
    <div style="font-size:13px">No lectures found for this group yet.</div>
  </div>`;

  const loadingHTML=loading?`<div style="text-align:center;padding:20px;color:#888"><div style="font-size:24px;margin-bottom:6px">⏳</div><div style="font-size:12px">Loading attendance history…</div></div>`:'';

  return `<div style="padding:14px">
    <button onclick="closeStudentAttendanceHistory()" style="background:none;border:none;color:var(--brand);font-size:14px;cursor:pointer;font-family:inherit;padding:0 0 12px;font-weight:500">‹ Back to student</button>
    <div style="background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:14px;padding:18px;color:#fff;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;opacity:.85;margin-bottom:4px">ATTENDANCE HISTORY</div>
      <div style="font-size:17px;font-weight:600;line-height:1.35;margin-bottom:2px">${esc(s.name||'Unnamed')}</div>
      <div style="font-size:12px;opacity:.85">${esc(s.groupCode||'—')} · ${total} lecture${total===1?'':'s'} in this group</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:#fff;border:.5px solid var(--border);border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:var(--ok-2)">${present}</div><div style="font-size:10px;color:#888;margin-top:2px">PRESENT</div></div>
      <div style="background:#fff;border:.5px solid var(--border);border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:var(--err-2)">${total-present}</div><div style="font-size:10px;color:#888;margin-top:2px">ABSENT</div></div>
      <div style="background:#fff;border:.5px solid var(--border);border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:${rateColor}">${attRate}%</div><div style="font-size:10px;color:#888;margin-top:2px">RATE</div></div>
    </div>
    ${loadingHTML}
    ${rowsHTML}
    <div style="height:40px"></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Batch 6 · Item F — ATTENDANCE MATRIX VIEW
//  Rows = students, Columns = lectures (chronological). Cell shows mode
//  (online / offline / absent). Sticky left column + top row. Row & column
//  summaries. Uses the same STATE.dashAttendanceByLecture cache as the list
//  view — zero new Firestore reads.
// ═══════════════════════════════════════════════════════════════════════════
function setAttendanceView(v){
  STATE.dashAttendanceView=v;
  try{ localStorage.setItem('cma-attendance-view', v); }catch{}
  render();
}

// Batch 7: prime attendance view from localStorage on dashboard boot.
function _primeAttendanceView(){
  if(STATE.dashAttendanceView) return;
  try{ STATE.dashAttendanceView = localStorage.getItem('cma-attendance-view') || 'list'; }
  catch{ STATE.dashAttendanceView = 'list'; }
}

function renderDashAttendanceMatrix(groupCode, lectures, students){
  const lecturesSorted=lectures.slice().sort((a,b)=>{
    const da=a.date||a.createdAt||''; const dbb=b.date||b.createdAt||'';
    return String(da).localeCompare(String(dbb));
  });
  let missing=0;
  lecturesSorted.forEach(l=>{
    if(!STATE.dashAttendanceByLecture[l.id]){
      missing++;
      loadLectureAttendance(l.id).then(()=>{if(STATE.tab==='dashboard'&&STATE.dashTab==='attendance')render();}).catch(()=>{});
    }
  });
  if(missing>0){
    return `<div style="text-align:center;padding:34px 20px;color:var(--muted-2)"><div style="font-size:26px;margin-bottom:8px">\u23F3</div><div style="font-size:13px">Loading attendance for ${missing} lecture${missing===1?'':'s'}\u2026</div></div>`;
  }
  const att={};
  lecturesSorted.forEach(l=>{
    (STATE.dashAttendanceByLecture[l.id]||[]).forEach(a=>{
      if(!a.userId) return;
      if(!att[a.userId]) att[a.userId]={};
      att[a.userId][l.id]=a.mode||'present';
    });
  });
  const studentsSorted=students.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  if(!studentsSorted.length){
    return `<div style="text-align:center;padding:34px 20px;color:var(--muted-2)"><div style="font-size:36px;margin-bottom:8px">\u{1F464}</div><div style="font-size:13px">No students in group ${esc(groupCode)}.</div></div>`;
  }
  const rowSummary={}, colSummary={};
  studentsSorted.forEach(s=>{
    let attended=0;
    lecturesSorted.forEach(l=>{
      if(att[s.uid] && att[s.uid][l.id]) attended++;
    });
    rowSummary[s.uid]={attended,total:lecturesSorted.length,pct:lecturesSorted.length?Math.round(attended/lecturesSorted.length*100):0};
  });
  lecturesSorted.forEach(l=>{
    const rows=(STATE.dashAttendanceByLecture[l.id]||[]);
    const on=rows.filter(a=>a.mode==='online').length;
    const off=rows.filter(a=>a.mode==='offline').length;
    const attended=rows.length;
    const totalStu=studentsSorted.length;
    colSummary[l.id]={on,off,attended,absent:Math.max(0,totalStu-attended),pct:totalStu?Math.round(attended/totalStu*100):0};
  });
  const fmtDate=(iso)=>{ if(!iso) return '\u2014'; try{ return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}); }catch{return '\u2014';}};
  const cellFor=(s,l)=>{
    const mode=(att[s.uid]||{})[l.id];
    if(mode==='online')   return `<div title="Online" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--ok-tint-2);color:var(--ok-2);font-weight:700;font-size:11px">O</div>`;
    if(mode==='offline')  return `<div title="In-person" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--warn-tint);color:var(--warn-strong);font-weight:700;font-size:11px">F</div>`;
    if(mode)              return `<div title="Present" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--brand-tint);color:var(--brand);font-weight:700;font-size:11px">\u2713</div>`;
    return `<div title="Absent" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--err-tint);color:var(--err-2);font-weight:700;font-size:11px">\u2013</div>`;
  };
  const headerCells=lecturesSorted.map(l=>{
    const dt=fmtDate(l.date||l.createdAt);
    return `<th style="min-width:56px;max-width:56px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);line-height:1.2;position:sticky;top:0;z-index:2" title="${esc(l.title||'')} - ${esc(dt)}">${esc(dt)}</th>`;
  }).join('');
  const headerRow=`<thead><tr>
    <th style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:11px;color:var(--ink-2);text-align:left;position:sticky;left:0;top:0;z-index:3">Student</th>
    ${headerCells}
    <th style="min-width:70px;max-width:70px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);position:sticky;top:0;z-index:2">Rate</th>
  </tr></thead>`;
  const bodyRows=studentsSorted.map(s=>{
    const cells=lecturesSorted.map(l=>{
      return `<td style="min-width:56px;max-width:56px;height:34px;padding:0;border:1px solid var(--border);background:var(--card)">${cellFor(s,l)}</td>`;
    }).join('');
    const sum=rowSummary[s.uid];
    const rateColor=sum.pct>=80?'var(--ok-2)':(sum.pct>=50?'var(--warn-strong)':'var(--err-2)');
    return `<tr>
      <td onclick="STATE.dashStudentDetailUid='${esc(s.uid)}';render()" style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--card);border:1px solid var(--border);font-size:12px;color:var(--ink);text-align:left;position:sticky;left:0;z-index:1;cursor:pointer;font-weight:500;white-space:normal;word-break:break-word;line-height:1.3" title="${esc(s.name||'')}">${esc(s.name||'Unnamed')}</td>
      ${cells}
      <td style="min-width:70px;max-width:70px;padding:4px;border:1px solid var(--border);background:var(--card);text-align:center"><div style="font-size:12px;font-weight:700;color:${rateColor}">${sum.pct}%</div><div style="font-size:9px;color:var(--muted-2);margin-top:1px">${sum.attended}/${sum.total}</div></td>
    </tr>`;
  }).join('');
  const footerCells=lecturesSorted.map(l=>{
    const c=colSummary[l.id];
    const col=c.pct>=80?'var(--ok-2)':(c.pct>=50?'var(--warn-strong)':'var(--err-2)');
    return `<td style="min-width:56px;max-width:56px;padding:4px;border:1px solid var(--border);background:var(--surface-3);text-align:center"><div style="font-size:11px;font-weight:700;color:${col}">${c.pct}%</div><div style="font-size:9px;color:var(--muted-2);margin-top:1px">${c.attended}/${studentsSorted.length}</div></td>`;
  }).join('');
  const footerRow=`<tfoot><tr>
    <td style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);font-size:11px;font-weight:600;color:var(--ink-2);text-align:left;position:sticky;left:0;z-index:1">Lecture rate</td>
    ${footerCells}
    <td style="background:var(--surface-3);border:1px solid var(--border)"></td>
  </tr></tfoot>`;
  return `<div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--muted)">
        <span><span style="display:inline-block;width:14px;height:14px;background:var(--ok-tint-2);color:var(--ok-2);text-align:center;line-height:14px;font-weight:700;font-size:10px;border-radius:3px;vertical-align:middle">O</span> Online</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:var(--warn-tint);color:var(--warn-strong);text-align:center;line-height:14px;font-weight:700;font-size:10px;border-radius:3px;vertical-align:middle">F</span> In-person</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:var(--err-tint);color:var(--err-2);text-align:center;line-height:14px;font-weight:700;font-size:10px;border-radius:3px;vertical-align:middle">\u2013</span> Absent</span>
      </div>
      <button onclick="exportAttendanceMatrixCSV('${esc(groupCode)}')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--border);background:var(--card);color:var(--ink);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F4E5} Export CSV</button>
    </div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;max-height:70vh;border-radius:10px;border:1px solid var(--border);background:var(--card)">
      <table style="border-collapse:collapse;font-family:inherit;width:auto">
        ${headerRow}
        <tbody>${bodyRows}</tbody>
        ${footerRow}
      </table>
    </div>
    <div style="font-size:11px;color:var(--muted-2);margin-top:8px;line-height:1.4">Tap a student name to open their profile. Cells show mode: <b>O</b>nline, o<b>F</b>fline (in-person), or absent.</div>
  </div>`;
}

function exportAttendanceMatrixCSV(groupCode){
  try{
    const lectures=(STATE.dashLectures||[]).slice().sort((a,b)=>{
      const da=a.date||a.createdAt||''; const dbb=b.date||b.createdAt||'';
      return String(da).localeCompare(String(dbb));
    });
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===String(groupCode).toUpperCase())
      .slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const att={};
    lectures.forEach(l=>{
      (STATE.dashAttendanceByLecture[l.id]||[]).forEach(a=>{
        if(!a.userId) return;
        if(!att[a.userId]) att[a.userId]={};
        att[a.userId][l.id]=a.mode||'present';
      });
    });
    const csvEsc=(s)=>{ s=String(s==null?'':s); return /[,"\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
    const fmtDate=(iso)=>{ try{ return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }catch{return '';} };
    const headers=['Student','Mobile','Email'].concat(lectures.map(l=>fmtDate(l.date||l.createdAt)+' - '+(l.title||''))).concat(['Attended','Total','Rate %']);
    const rows=[headers.map(csvEsc).join(',')];
    students.forEach(s=>{
      let attended=0;
      const cells=lectures.map(l=>{
        const mode=(att[s.uid]||{})[l.id];
        if(mode) attended++;
        return mode||'absent';
      });
      const pct=lectures.length?Math.round(attended/lectures.length*100):0;
      const row=[s.name||'',s.mobile||'',s.email||''].concat(cells).concat([attended,lectures.length,pct]);
      rows.push(row.map(csvEsc).join(','));
    });
    const csv='\uFEFF'+rows.join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const stamp=new Date().toISOString().slice(0,10);
    a.href=url; a.download=`attendance-${groupCode}-${stamp}.csv`;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 100);
    showToast('CSV downloaded','success',1500);
  }catch(e){ showToast('Export failed: '+e.message,'error'); }
}

async function loadGroupFeedback(groupCode){
  const cache=STATE.dashFeedbackByGroup[groupCode];
  if(cache&&(cache.loaded||cache.loading))return;
  STATE.dashFeedbackByGroup[groupCode]={loading:true,loaded:false,rows:[]};
  try{
    const snap=await db.collection('lecture-feedback').where('groupCode','==',groupCode).get();
    STATE.dashFeedbackByGroup[groupCode]={loading:false,loaded:true,rows:snap.docs.map(d=>d.data())};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='attendance')render();
  }catch(e){
    console.warn('[loadGroupFeedback] failed:',e);
    STATE.dashFeedbackByGroup[groupCode]={loading:false,loaded:true,rows:[],error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='attendance')render();
  }
}

function renderDashFeedbackMatrix(groupCode,lectures,students){
  const cache=STATE.dashFeedbackByGroup[groupCode];
  if(!cache||!cache.loaded){
    loadGroupFeedback(groupCode);
    return `<div style="text-align:center;padding:34px 20px;color:var(--muted-2)"><div style="font-size:26px;margin-bottom:8px">\u23F3</div><div style="font-size:13px">Loading feedback\u2026</div></div>`;
  }
  const lecturesSorted=lectures.slice().sort((a,b)=>{
    const da=a.date||a.createdAt||''; const dbb=b.date||b.createdAt||'';
    return String(da).localeCompare(String(dbb));
  });
  const studentsSorted=students.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  if(!studentsSorted.length){
    return `<div style="text-align:center;padding:34px 20px;color:var(--muted-2)"><div style="font-size:36px;margin-bottom:8px">\u{1F464}</div><div style="font-size:13px">No students in group ${esc(groupCode)}.</div></div>`;
  }
  // fb[userId][lectureId] = {rating,comment}
  const fb={};
  (cache.rows||[]).forEach(r=>{
    if(!r.userId)return;
    if(!fb[r.userId])fb[r.userId]={};
    fb[r.userId][r.lectureId]={rating:r.rating||0,comment:r.comment||''};
  });
  const rowSummary={}, colSummary={};
  studentsSorted.forEach(s=>{
    let sum=0,n=0;
    lecturesSorted.forEach(l=>{
      const r=(fb[s.uid]||{})[l.id];
      if(r){sum+=r.rating;n++;}
    });
    rowSummary[s.uid]={avg:n?Math.round(sum/n*10)/10:0,n,total:lecturesSorted.length};
  });
  lecturesSorted.forEach(l=>{
    let sum=0,n=0;
    studentsSorted.forEach(s=>{
      const r=(fb[s.uid]||{})[l.id];
      if(r){sum+=r.rating;n++;}
    });
    colSummary[l.id]={avg:n?Math.round(sum/n*10)/10:0,n,rate:studentsSorted.length?Math.round(n/studentsSorted.length*100):0};
  });
  const fmtDate=(iso)=>{ if(!iso) return '\u2014'; try{ return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}); }catch{return '\u2014';}};
  const cellFor=(s,l)=>{
    const r=(fb[s.uid]||{})[l.id];
    if(!r)return `<div title="No feedback" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted-2);font-size:12px">\u2013</div>`;
    const tip=r.comment?esc(r.comment):'No comment';
    return `<div title="${tip}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--warn-tint);color:var(--warn-strong);font-weight:700;font-size:11px">${r.rating}\u2605</div>`;
  };
  const headerCells=lecturesSorted.map(l=>{
    const dt=fmtDate(l.date||l.createdAt);
    return `<th style="min-width:56px;max-width:56px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);line-height:1.2;position:sticky;top:0;z-index:2" title="${esc(l.title||'')} - ${esc(dt)}">${esc(dt)}</th>`;
  }).join('');
  const headerRow=`<thead><tr>
    <th style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:11px;color:var(--ink-2);text-align:left;position:sticky;left:0;top:0;z-index:3">Student</th>
    ${headerCells}
    <th style="min-width:70px;max-width:70px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);position:sticky;top:0;z-index:2">Avg</th>
  </tr></thead>`;
  const bodyRows=studentsSorted.map(s=>{
    const cells=lecturesSorted.map(l=>`<td style="min-width:56px;max-width:56px;height:34px;padding:0;border:1px solid var(--border);background:var(--card)">${cellFor(s,l)}</td>`).join('');
    const sum=rowSummary[s.uid];
    const rateColor=sum.avg>=4?'var(--ok-2)':(sum.avg>=3?'var(--warn-strong)':'var(--err-2)');
    return `<tr>
      <td onclick="STATE.dashStudentDetailUid='${esc(s.uid)}';render()" style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--card);border:1px solid var(--border);font-size:12px;color:var(--ink);text-align:left;position:sticky;left:0;z-index:1;cursor:pointer;font-weight:500;white-space:normal;word-break:break-word;line-height:1.3" title="${esc(s.name||'')}">${esc(s.name||'Unnamed')}</td>
      ${cells}
      <td style="min-width:70px;max-width:70px;padding:4px;border:1px solid var(--border);background:var(--card);text-align:center"><div style="font-size:12px;font-weight:700;color:${sum.n?rateColor:'var(--muted-2)'}">${sum.n?sum.avg+'\u2605':'\u2014'}</div><div style="font-size:9px;color:var(--muted-2);margin-top:1px">${sum.n}/${sum.total}</div></td>
    </tr>`;
  }).join('');
  const footerCells=lecturesSorted.map(l=>{
    const c=colSummary[l.id];
    const col=c.avg>=4?'var(--ok-2)':(c.avg>=3?'var(--warn-strong)':'var(--err-2)');
    return `<td style="min-width:56px;max-width:56px;padding:4px;border:1px solid var(--border);background:var(--surface-3);text-align:center"><div style="font-size:11px;font-weight:700;color:${c.n?col:'var(--muted-2)'}">${c.n?c.avg+'\u2605':'\u2014'}</div><div style="font-size:9px;color:var(--muted-2);margin-top:1px">${c.rate}%</div></td>`;
  }).join('');
  const footerRow=`<tfoot><tr>
    <td style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);font-size:11px;font-weight:600;color:var(--ink-2);text-align:left;position:sticky;left:0;z-index:1">Lecture avg</td>
    ${footerCells}
    <td style="background:var(--surface-3);border:1px solid var(--border)"></td>
  </tr></tfoot>`;
  return `<div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      <button onclick="exportFeedbackMatrixCSV('${esc(groupCode)}')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--border);background:var(--card);color:var(--ink);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F4E5} Export CSV</button>
    </div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;max-height:70vh;border-radius:10px;border:1px solid var(--border);background:var(--card)">
      <table style="border-collapse:collapse;font-family:inherit;width:auto">
        ${headerRow}
        <tbody>${bodyRows}</tbody>
        ${footerRow}
      </table>
    </div>
    <div style="font-size:11px;color:var(--muted-2);margin-top:8px;line-height:1.4">Tap a student name to open their profile. Hover a cell to see the comment, if any.</div>
  </div>`;
}

function exportFeedbackMatrixCSV(groupCode){
  try{
    const cache=STATE.dashFeedbackByGroup[groupCode];
    const lectures=(STATE.dashLectures||[]).slice().sort((a,b)=>{
      const da=a.date||a.createdAt||''; const dbb=b.date||b.createdAt||'';
      return String(da).localeCompare(String(dbb));
    });
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===String(groupCode).toUpperCase())
      .slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const fb={};
    (cache&&cache.rows||[]).forEach(r=>{
      if(!r.userId)return;
      if(!fb[r.userId])fb[r.userId]={};
      fb[r.userId][r.lectureId]={rating:r.rating||0,comment:r.comment||''};
    });
    const csvEsc=(s)=>{ s=String(s==null?'':s); return /[,"\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
    const fmtDate=(iso)=>{ try{ return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }catch{return '';} };
    const headers=['Student','Mobile','Email'].concat(lectures.map(l=>fmtDate(l.date||l.createdAt)+' - '+(l.title||''))).concat(['Avg Rating','Responses','Total']);
    const rows=[headers.map(csvEsc).join(',')];
    students.forEach(s=>{
      let sum=0,n=0;
      const cells=lectures.map(l=>{
        const r=(fb[s.uid]||{})[l.id];
        if(r){sum+=r.rating;n++;return r.rating;}
        return '';
      });
      const avg=n?Math.round(sum/n*10)/10:'';
      const row=[s.name||'',s.mobile||'',s.email||''].concat(cells).concat([avg,n,lectures.length]);
      rows.push(row.map(csvEsc).join(','));
    });
    const csv='\uFEFF'+rows.join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const stamp=new Date().toISOString().slice(0,10);
    a.href=url; a.download=`feedback-${groupCode}-${stamp}.csv`;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 100);
    showToast('CSV downloaded','success',1500);
  }catch(e){ showToast('Export failed: '+e.message,'error'); }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ATTENDANCE TAB — per-lecture summary with online/offline/absent counts
// ═══════════════════════════════════════════════════════════════════════════
function renderDashAttendance(){

  const g=STATE.dashSelectedGroup;
  const lectures=(STATE.dashLectures||[]).slice();
  const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===g.toUpperCase());
  const total=students.length;
  // Batch 7: ensure view mode is primed (may be null on first dashboard open)
  _primeAttendanceView();
  const activeView=STATE.dashAttendanceView||'list';
  // Batch 7/11: segmented toggle — List / Attendance Matrix / Feedback Matrix
  const viewToggle=`<div class="att-view-toggle">
    <button class="att-view-btn${activeView==='list'?' active':''}" onclick="setAttendanceView('list')">\u{1F4CB} List View</button>
    <button class="att-view-btn${activeView==='matrix'?' active':''}" onclick="setAttendanceView('matrix')">\u{1F4CA} Attendance Matrix</button>
    <button class="att-view-btn${activeView==='feedback'?' active':''}" onclick="setAttendanceView('feedback')">\u2B50 Feedback Matrix</button>
  </div>`;
  if(!lectures.length){
    return `<div style="padding:14px">${viewToggle}${renderDashTabEmpty('Attendance',g,{icon:'\u2705',body:'No lectures yet for this group. Create a lecture first, then attendance summaries will appear here.'})}</div>`;
  }
  // Batch 7: Matrix view — render heatmap + CSV export button
  if(activeView==='matrix'){
    const csvBtn=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      <button onclick="exportAttendanceMatrixCSV('${g}')" style="padding:8px 14px;border-radius:8px;border:.5px solid var(--brand-2)40;background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u2B07 Export CSV</button>
    </div>`;
    return `<div style="padding:14px">
      ${viewToggle}
      <div style="font-size:12px;color:var(--muted-2);margin-bottom:12px">Group has <b>${total}</b> student${total===1?'':'s'} \u00B7 ${lectures.length} lecture${lectures.length===1?'':'s'}</div>
      ${csvBtn}
      ${renderDashAttendanceMatrix(g,lectures,students)}
      <div style="height:30px"></div>
    </div>`;
  }
  // Batch 11: Feedback Matrix view — one row per student, one column per lecture.
  if(activeView==='feedback'){
    return `<div style="padding:14px">
      ${viewToggle}
      <div style="font-size:12px;color:var(--muted-2);margin-bottom:12px">Group has <b>${total}</b> student${total===1?'':'s'} \u00B7 ${lectures.length} lecture${lectures.length===1?'':'s'}</div>
      ${renderDashFeedbackMatrix(g,lectures,students)}
      <div style="height:30px"></div>
    </div>`;
  }
  const rows=lectures.map(l=>{
    const cached=STATE.dashAttendanceByLecture[l.id];
    if(!cached){
      // Lazy load — trigger fetch and render skeleton row
      loadLectureAttendance(l.id).then(()=>{if(STATE.tab==='dashboard'&&STATE.dashTab==='attendance')render();}).catch(()=>{});
      const dt=l.date?new Date(l.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';
      return `<div class="gs-skeleton-card"><div class="gs-skeleton-line long"></div><div class="gs-skeleton-line medium"></div><div class="gs-skeleton-line short"></div></div>`;
    }
    const on=cached.filter(a=>a.mode==='online').length;
    const off=cached.filter(a=>a.mode==='offline').length;
    const unk=cached.length-on-off;
    const absent=Math.max(0,total-cached.length);
    const dt=l.date?new Date(l.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
    return `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
        <div style="min-width:0"><div style="font-size:14px;font-weight:600;color:var(--ink)">${esc(l.title)}</div>
          <div style="font-size:11px;color:#888;margin-top:2px">${esc(dt)}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px">
        <div style="background:#EBF3FA;border-radius:8px;padding:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--brand)">${cached.length}</div><div style="font-size:9px;font-weight:600;color:var(--brand);letter-spacing:.5px;text-transform:uppercase">Total</div></div>
        <div style="background:#E8F5E9;border-radius:8px;padding:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--ok-2)">${on}</div><div style="font-size:9px;font-weight:600;color:var(--ok-2);letter-spacing:.5px;text-transform:uppercase">Online</div></div>
        <div style="background:#FEF5E7;border-radius:8px;padding:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:#7D6608">${off}</div><div style="font-size:9px;font-weight:600;color:#7D6608;letter-spacing:.5px;text-transform:uppercase">In-person</div></div>
        <div style="background:var(--err-tint);border-radius:8px;padding:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--err-2)">${absent}</div><div style="font-size:9px;font-weight:600;color:var(--err-2);letter-spacing:.5px;text-transform:uppercase">Absent</div></div>
      </div>
      ${unk?`<div style="font-size:11px;color:#888;margin-top:4px">${unk} legacy record${unk===1?'':'s'} with no mode.</div>`:''}
      <div style="display:flex;gap:6px;margin-top:10px">
        <button onclick="openAttendanceList('${l.id}')" style="flex:1;padding:8px;border-radius:8px;border:.5px solid var(--brand-2)40;background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F465} View details</button>
        <button onclick="openLectureFeedback('${l.id}')" style="flex:1;padding:8px;border-radius:8px;border:.5px solid #7D3C9840;background:var(--accent-purple-tint);color:var(--accent-purple-strong);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u2B50 Feedback</button>
        ${_lectureFeedbackToggleBtn(l)}
      </div>
    </div>`;
  }).join('');
  return `<div style="padding:14px">
    ${viewToggle}
    <div style="font-size:12px;color:var(--muted-2);margin-bottom:12px">Group has <b>${total}</b> student${total===1?'':'s'} \u00B7 attendance auto-refreshes when you open a lecture</div>
    ${rows}
    <div style="height:30px"></div>
  </div>`;
}

// Feedback open/close toggle button per lecture (in Attendance tab)
function _lectureFeedbackToggleBtn(lec){
  const p=STATE.dashLive[lec.groupCode];
  const isPointer=p&&p.lectureId===lec.id;
  // Batch 11: default state is now COMPUTED (isFeedbackOpen — 7 days from
  // checkinClosedAt). The button still lets the instructor override early
  // (force-close during the auto window, or force-open before it) via the
  // existing live/{groupCode}.feedbackOpen flag while this lecture is current.
  const auto=isFeedbackOpen(lec);
  const manualOverride=isPointer&&p.feedbackOpen!=null?p.feedbackOpen:null;
  const on=manualOverride!=null?manualOverride:auto;
  return `<button onclick="toggleLectureFeedback('${lec.id}','${lec.groupCode}')" style="padding:8px 10px;border-radius:8px;border:.5px solid ${on?'#C0392B40':'#1E844940'};background:${on?'var(--err-tint)':'var(--ok-tint-2)'};color:${on?'var(--err-2)':'var(--ok-2)'};font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;flex:1">${on?'\u{1F6D1} Close Feedback':'\u25B6 Open Feedback'}</button>`;
}

async function toggleLectureFeedback(lectureId,groupCode){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const lec=(STATE.dashLectures||[]).find(l=>l.id===lectureId);
  if(!lec)return;
  const p=STATE.dashLive[groupCode]||{};
  const wasOn=p.lectureId===lectureId&&!!p.feedbackOpen;
  try{
    // Point live doc at this lecture (if not already) and flip feedbackOpen.
    const _now=new Date();
    const nextPointer={
      lectureId,
      title:lec.title,
      openedAt:p.openedAt||_now.toISOString(),
      autoCloseAt:p.autoCloseAt||new Date(_now.getTime()+LIVE_AUTOCLOSE_MS).toISOString(),
      // Preserve checkinOpen semantics via existing lectureId pointer
      feedbackOpen:!wasOn
    };
    await db.collection('live').doc(groupCode).set(nextPointer,{merge:true});
    STATE.dashLive[groupCode]=nextPointer;
    showToast(wasOn?'Feedback closed for '+lec.title:'Feedback open for '+lec.title,'success');
    render();
  }catch(e){console.warn('[feedback toggle]',e);showToast('Error: '+e.message,'error');}
}

// Load & display feedback for a lecture (instructor view)
async function openLectureFeedback(lectureId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const lec=(STATE.dashLectures||[]).find(l=>l.id===lectureId);
  try{
    const snap=await db.collection('lecture-feedback').where('lectureId','==',lectureId).get();
    const rows=snap.docs.map(d=>d.data()).sort((a,b)=>(b.submittedAt||'').localeCompare(a.submittedAt||''));
    if(!rows.length){showModal({icon:'\u2B50',title:(lec?lec.title:'Lecture')+' \u2014 Feedback',body:'No feedback submitted yet.',type:'info',confirmText:'Close'});return;}
    const avg=Math.round((rows.reduce((s,r)=>s+(r.rating||0),0)/rows.length)*10)/10;
    const list=rows.map(r=>{
      const stars='\u2605'.repeat(r.rating||0)+'\u2606'.repeat(5-(r.rating||0));
      const dt=r.submittedAt?new Date(r.submittedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
      const c=r.comment?' \u2014 "'+r.comment+'"':'';
      return esc(r.studentName||'Student')+'  '+stars+c+(dt?'  ('+dt+')':'');
    });
    showModal({icon:'\u2B50',title:(lec?lec.title:'Lecture')+' \u2014 '+rows.length+' feedback (avg '+avg+'\u2B50)',list,type:'info',confirmText:'Close'});
  }catch(e){console.warn('[openLectureFeedback]',e);showToast('Error: '+e.message,'error');}
}

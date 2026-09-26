// CMA Prep — instructor dashboard source (Batch 24). Joined in filename order
// into dist/dashboard.min.js, loaded only for the instructor. Functions only.

// ── Instructor side: attendance list for a lecture ──────────────────────────
// ── Batch 2: async lazy attendance load ──────────────────────────────
// Fetches attendance for a single lecture on demand. Cache-aware — once
// loaded, subsequent taps on the same lecture are instant (no fetch).
// After fetch completes, calls render() so the button text on the lecture
// card updates from "View check-ins" to "N checked in".
async function openAttendanceList(lectureId){
  const lec=(STATE.dashLectures||[]).find(l=>l.id===lectureId);
  // Fire the fetch; if cached, returns immediately.
  const cached=STATE.dashAttendanceByLecture[lectureId];
  const rows=cached||await loadLectureAttendance(lectureId);
  // If this was a fresh fetch, re-render so the lecture-card count updates.
  if(!cached)render();
  const sorted=rows.slice().sort((a,b)=>(a.checkedInAt||'')<(b.checkedInAt||'')?1:-1);
  if(!sorted.length){
    showModal({icon:'\u{1F465}',title:(lec?lec.title:'Lecture'),body:'No check-ins yet for this lecture.',type:'info',confirmText:'Close'});
    return;
  }
  const list=sorted.map(a=>{
    const t=a.checkedInAt?new Date(a.checkedInAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'';
    const sid=a.studentId?' \u00B7 '+a.studentId:'';
    // Batch 5: mode badge — falls back to \u2014 for legacy records without mode.
    const modeIcon=a.mode==='online'?'\u{1F4BB} Online':(a.mode==='offline'?'\u{1F3EB} In-person':'\u2014');
    return esc(a.studentName||'Student')+sid+'  '+modeIcon+(t?'  ('+t+')':'');
  });
  // Batch 5: quick counts in title.
  const _on=sorted.filter(a=>a.mode==='online').length;
  const _off=sorted.filter(a=>a.mode==='offline').length;
  const _unk=sorted.length-_on-_off;
  const _titleSuffix=' \u2014 '+sorted.length+' checked in ('+_on+' online, '+_off+' in-person'+(_unk?', '+_unk+' \u2014':'')+')';
  showModal({icon:'\u{1F465}',title:(lec?lec.title:'Lecture')+_titleSuffix,list,type:'info',confirmText:'Close'});
}

// Batch 2: refresh the currently-selected group's data after any write
// (create/close/delete of exam, lecture, teaching-log entry). Cache-busts
// dashLoadedForGroup so loadDashScopedData actually re-fetches instead of
// returning the memoized snapshot.
async function refreshDashScoped(){
  const g=STATE.dashSelectedGroup;
  if(!g)return;
  STATE.dashLoadedForGroup=null;
  await loadDashScopedData(g);
}

// Legacy shim — kept because saveExam / closeExamNow / deleteExam still
// call it. Redirects to the scoped refresh so we don't fetch every exam
// in the database on each write.
async function loadDashExams(){
  await refreshDashScoped();
}

async function saveExam(){

  const d=STATE.dashExamDraft;
  // Batch 22 (B22-01): same live-group fix as createLecture() -- read the
  // group from dashSelectedGroup at submit time, not the draft's cached
  // groupCode, which can go stale if the instructor switches groups after
  // opening this form.
  const g=STATE.dashSelectedGroup;
  if(!d.title||!d.title.trim()){showToast('Enter an exam title.','warning');return;}
  if(!g){showToast('Choose a group.','warning');return;}
  const sectionIds=Array.isArray(d.sectionIds)?d.sectionIds.map(Number).filter(Boolean):[];
  if(!sectionIds.length){showToast('Choose at least one section.','warning');return;}
  const count=parseInt(d.count);
  if(!count||count<3||count>50){showToast('Question count must be 3–50.','warning');return;}
  const dur=parseInt(d.durationMinutes);
  if(!dur||dur<3||dur>240){showToast('Duration must be 3–240 minutes.','warning');return;}
  // Batch 20: retake cap, instructor-configurable per exam. Defaults to 3
  // total attempts (1 original + 2 retakes) if left blank.
  const maxAttempts=parseInt(d.maxAttempts)||3;
  if(maxAttempts<1||maxAttempts>10){showToast('Max attempts must be 1–10.','warning');return;}
  if(!d.opensAt||!d.closesAt){showToast('Set both opens and closes times.','warning');return;}
  const opensISO=new Date(d.opensAt).toISOString();
  const closesISO=new Date(d.closesAt).toISOString();
  if(new Date(closesISO)<=new Date(opensISO)){showToast('Closes must be after opens.','warning');return;}
  if(new Date(closesISO)<=new Date()){showToast('Closes time is in the past.','warning');return;}
  try{
    // Batch 11: even split across sections, then even split across each
    // section's selected units (largest-remainder rounding), shared with
    // reshuffleExam() via buildDistributedExamPool().
    const unitsBySection=d.unitsBySection||{};
    const result=await buildDistributedExamPool(sectionIds,unitsBySection,count);
    if(!result.ok){showToast(result.message,'warning');return;}
    await db.collection('exams').add({
      title:d.title.trim(),
      groupCode:g.toUpperCase(),
      questionSource:'auto',
      sectionIds,                              // Batch 11: multi-section
      unitsBySection,                          // Batch 11: {sectionId:[unitIds]}
      sectionId:sectionIds[0],                 // legacy single-section field, kept for old display code / old exam readers
      unitIds:unitsBySection[sectionIds[0]]||[],
      questionIds:result.questionIds,          // frozen set — same for all students
      count,durationMinutes:dur,maxAttempts,   // Batch 20: retake cap
      opensAt:opensISO,closesAt:closesISO,
      status:'scheduled',
      createdAt:new Date().toISOString(),
      createdBy:STATE.user.uid
    });
    showToast('Exam created \u2705','success');
    // Batch 2: preserve group prefill so back-to-back exams for the same
    // group don't require re-selection
    STATE.dashExamDraft={title:'',groupCode:STATE.dashSelectedGroup,sectionIds:[],unitsBySection:{},count:20,durationMinutes:30,opensAt:'',closesAt:'',maxAttempts:3};
    await loadDashExams();
  }catch(e){
    showToast('Error: '+e.message,'error');
  }
}

async function closeExamNow(id){
  const ok=await showModal({
    icon:'\u{1F6D1}',title:'Close Exam Now?',
    body:'Students will no longer be able to start this exam. Any in-progress attempts can still submit.',
    type:'danger',confirmText:'Close',cancelText:'Cancel'
  });
  if(!ok)return;
  try{
    await db.collection('exams').doc(id).update({
      status:'closed',
      closedAt:new Date().toISOString()
    });
    STATE.dashExamsLoaded=false;
    await loadDashExams();
  }catch(e){showToast('Error closing exam.','error');}
}

async function deleteExam(id){
  const ok=await showModal({
    icon:'\u{1F5D1}\uFE0F',title:'Delete Exam?',
    body:'This removes the exam. Any student results already submitted are preserved.',
    type:'danger',confirmText:'Delete',cancelText:'Cancel'
  });
  if(!ok)return;
  try{
    await db.collection('exams').doc(id).delete();
    STATE.dashExamsLoaded=false;
    await loadDashExams();
  }catch(e){showToast('Error deleting exam.','error');}
}

// ==== PHASE 1 DASHBOARD HANDLERS (ported from FMAA, remapped) ====
// Legacy shim — teaching-log is now scoped by group in loadDashScopedData.
function toggleTeachingUnit(uid){const u=STATE.dashTeachingDraft.unitIds;const i=u.indexOf(uid);if(i>=0)u.splice(i,1);else u.push(uid);render();}

// Batch 8 (teaching-log-lecture-picker): link an Actual-Teaching entry to a
// lecture already created in the Lectures tab. Selecting one auto-fills the
// date and links lectureId/lectureTitle; units stay a manual pick because
// lectures don't carry units. Clearing the select unlinks (leaves other fields).
function onTeachingLecturePick(id){
  const d=STATE.dashTeachingDraft;
  if(!id){ d.lectureId=''; d.lectureTitle=''; render(); return; }
  const lec=(STATE.dashLectures||[]).find(l=>l.id===id);
  if(!lec){ render(); return; }
  d.lectureId=lec.id;
  d.lectureTitle=lec.title||'';
  if(lec.date) d.date=lec.date;
  if(!d.lectureNumber){ d.lectureNumber=String(((STATE.dashTeachingLog||[]).length)+1); }
  render();
}

function _tlFlagField(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  el.classList.add('field-error');
  setTimeout(()=>{el.classList.remove('field-error');},2500);
}

async function saveTeachingEntry(){
  const d=STATE.dashTeachingDraft;
  // Batch 22 (B22-01): same live-group fix as createLecture()/saveExam() --
  // read the group from dashSelectedGroup at submit time, not the draft's
  // cached groupCode, which can go stale if the instructor switches groups
  // after opening this form.
  const g=STATE.dashSelectedGroup;
  // S4-E: check required fields in order; on the first empty one show a
  // specific message and scroll+highlight that field instead of a generic toast.
  if(!g){showToast('No group selected.','warning');return;}
  if(!d.lectureNumber){showToast('Enter a lecture #.','warning');_tlFlagField('tl-lecno');return;}
  if(!d.date){showToast('Pick a date.','warning');_tlFlagField('tl-date');return;}
  if(!d.unitIds.length){showToast('Select at least one unit.','warning');_tlFlagField('tl-units');return;}
  try{
    await db.collection('teaching-log').add({groupCode:g.trim().toUpperCase(),lectureNumber:Number(d.lectureNumber),date:d.date,unitIds:d.unitIds.slice(),notes:d.notes.trim(),lectureId:d.lectureId||'',lectureTitle:d.lectureTitle||'',createdAt:new Date().toISOString(),createdBy:STATE.user.uid});
    showToast('Teaching entry saved \u2705','success');
    // Reset draft but preserve group prefill for the next entry
    STATE.dashTeachingDraft={groupCode:STATE.dashSelectedGroup,lectureNumber:'',date:'',unitIds:[],notes:'',lectureId:'',lectureTitle:''};
    await refreshDashScoped();
  }catch(e){showToast('Error: '+e.message,'error');}
}

async function deleteTeachingEntry(id){
  const ok=await showModal({icon:'\u{1F5D1}\uFE0F',title:'Delete Entry?',body:'This removes the teaching record. Questions of the Day may change for that group.',type:'danger',confirmText:'Delete',cancelText:'Cancel'});
  if(!ok)return;
  try{await db.collection('teaching-log').doc(id).delete();await refreshDashScoped();}catch(e){showToast('Error deleting.','error');}
}

async function saveGroup(){
  const inp=document.getElementById('new-group-input');
  if(!inp)return;
  const code=inp.value.toUpperCase().replace(/[^A-Z0-9\x2D]/g,'').trim();
  if(!code){showToast('Enter a group code.','warning');return;}
  if(STATE.dashGroups.some(g=>g.code===code)){showToast('Group already exists.','warning');return;}
  try{
    const ref=await db.collection('groups').add({code,createdAt:new Date().toISOString()});
    STATE.dashGroups.push({id:ref.id,code,createdAt:new Date().toISOString()});
    inp.value='';
    render();
    showToast('Group '+code+' added.','success');
  }catch(e){
    showToast('Error saving group.','error');
  }
}

async function deleteGroup(id,code){
  const ok=await showModal({icon:'\u{1F5D1}\uFE0F',title:'Delete Group?',body:'Remove group '+code+'? Students already assigned to this group will keep their code but it will no longer be accepted for new registrations.',type:'danger',confirmText:'Delete',cancelText:'Cancel'});
  if(!ok)return;
  try{
    await db.collection('groups').doc(id).delete();
    STATE.dashGroups=STATE.dashGroups.filter(g=>g.id!==id);
    render();
    showToast('Group '+code+' deleted.','success');
  }catch(e){
    showToast('Error deleting group.','error');
  }
}

function renderDashGroups(){
  const groups=STATE.dashGroups||[];
  const students=STATE.dashStudents||[];
  const rows=groups.map(g=>{
    const count=students.filter(s=>s.groupCode===g.code).length;
    const created=g.createdAt?new Date(g.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px;border-bottom:.5px solid var(--bg)">`+
      `<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">`+
      `<span style="font-size:14px;font-weight:600;color:var(--brand);font-family:'Courier New',monospace;letter-spacing:.5px">${esc(g.code)}</span>`+
      `<span style="font-size:11px;background:#EBF5FB;color:var(--brand);padding:2px 8px;border-radius:10px">${count} student${count!==1?'s':''}</span>`+
      `${created?`<span style="font-size:11px;color:#aaa">${created}</span>`:''}`+
      `</div>`+
      `<button onclick="deleteGroup('${g.id}','${esc(g.code)}')" style="padding:5px 10px;border-radius:6px;border:.5px solid var(--err)40;background:var(--err-tint);color:var(--err-2);font-size:11px;cursor:pointer;font-family:inherit;flex-shrink:0">\u{1F5D1}\uFE0F</button>`+
      `</div>`;
  }).join('');
  return `<div style="padding:14px">`+
    `<div style="font-size:13px;color:#555;line-height:1.6;margin-bottom:14px">Only codes listed here will be accepted when students enter a group code on their profile.</div>`+
    `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;margin-bottom:16px;overflow:hidden">`+
    `<div style="padding:10px 14px;background:#F4F6F7;border-bottom:.5px solid var(--border);font-size:11px;font-weight:600;color:#555;letter-spacing:.5px">ACTIVE GROUPS (${groups.length})</div>`+
    (groups.length?rows:`<div style="padding:20px;text-align:center;font-size:13px;color:#aaa">No groups yet — add one below.</div>`)+
    `</div>`+
    `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px">`+
    `<div style="font-size:12px;font-weight:600;color:#555;letter-spacing:.5px;margin-bottom:10px">ADD NEW GROUP</div>`+
    `<div style="display:flex;gap:8px;align-items:center">`+
    `<input id="new-group-input" type="text" placeholder="e.g. FC-JUN26" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9\x2D]/g,'')" maxlength="20" style="flex:1;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:'Courier New',monospace;outline:none;color:var(--ink);background:var(--surface);text-transform:uppercase" onkeydown="if(event.key==='Enter')saveGroup()">`+
    `<button onclick="saveGroup()" style="padding:10px 18px;border-radius:8px;border:none;background:var(--brand);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0">+ Add</button>`+
    `</div>`+
    `<div style="font-size:11px;color:#888;margin-top:6px">Letters, numbers and hyphens only. Max 20 characters.</div>`+
    `</div></div>`;
}

// ── Persistence: remember the last-selected group forever ─────────────
function loadDashGroup(){try{return localStorage.getItem('cma-dash-group-v1')||'';}catch{return '';}}

function saveDashGroup(code){try{localStorage.setItem('cma-dash-group-v1',code||'');}catch{}}

// ── Groups + roster (unscoped, always fresh, called on first dashboard open) ──
async function loadDashGroupsList(){
  if(STATE.dashGroupsLoaded)return;
  try{
    const [gsnap,ssnap]=await Promise.all([
      db.collection('groups').get(),
      db.collection('students').get()
    ]);
    STATE.dashGroups=gsnap.docs.map(d=>({id:d.id,...d.data()}));
    STATE.dashStudents=ssnap.docs.map(d=>{const x=d.data();return {uid:d.id,groupCode:x.groupCode||'',name:x.name||'',...x};});
    STATE.dashGroupsLoaded=true;
  }catch(e){
    console.warn('[Dashboard groups] load failed:',e);
    STATE.dashError=true;
  }
}

// ── Scoped fetches — fires on dashboard open AND on group switch ──────
async function loadDashScopedData(groupCode){
  if(!groupCode){
    // No group selected — nothing to scope. Empty state will render.
    STATE.dashLectures=[];STATE.dashTeachingLog=[];STATE.dashExams=[];STATE.dashLive={};
    STATE.dashLoadedForGroup='';STATE.dashLoaded=true;STATE.dashLoading=false;
    render();return;
  }
  if(STATE.dashLoadedForGroup===groupCode&&STATE.dashLoaded)return;   // already cached
  STATE.dashLoading=true;STATE.dashError=false;
  // Instant-swap UX (Decision 2A): clear stale data so old group's numbers
  // never appear under the new group's header — skeleton renders instead.
  STATE.dashLectures=[];STATE.dashTeachingLog=[];STATE.dashExams=[];STATE.dashLive={};
  STATE.dashAttendanceByLecture={};   // group switch invalidates per-lecture cache
  render();
  try{
    const [lsnap,tsnap,exsnap,livedoc]=await Promise.all([
      db.collection('lectures').where('groupCode','==',groupCode).get(),
      db.collection('teaching-log').where('groupCode','==',groupCode).get(),
      db.collection('exams').where('groupCode','==',groupCode).get(),
      db.collection('live').doc(groupCode).get()
    ]);
    STATE.dashLectures=lsnap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(b.date||'')>(a.date||'')?1:(b.createdAt||'')>(a.createdAt||'')?1:-1);
    STATE.dashTeachingLog=tsnap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(b.date||'')>(a.date||'')?1:-1);
    STATE.dashExams=exsnap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(b.opensAt||'')>(a.opensAt||'')?1:-1);
    STATE.dashLive={};
    if(livedoc.exists)STATE.dashLive[groupCode]=livedoc.data();
    STATE.dashTeachingLogLoaded=true;STATE.dashExamsLoaded=true;
    STATE.dashLoadedForGroup=groupCode;STATE.dashLoaded=true;
  }catch(e){
    console.warn('[Dashboard scoped] load failed:',e);
    STATE.dashError=true;
  }
  STATE.dashLoading=false;render();
}

// ── Main entry point — called by renderDashboard on every open ────────
async function loadDashboardP1(){
  if(STATE.dashLoading)return;
  STATE.dashLoading=true;
  await loadDashGroupsList();
  // Auto-select logic (Decision 1C — persistent memory):
  //   1. If a group is already selected in STATE, honor it.
  //   2. Else, restore from localStorage if the stored code still exists.
  //   3. Else, if only one group exists, auto-select it.
  //   4. Else, leave empty — the empty state prompts a choice.
  if(!STATE.dashSelectedGroup){
    const stored=loadDashGroup();
    const exists=code=>STATE.dashGroups.some(g=>g.code===code);
    if(stored&&exists(stored))STATE.dashSelectedGroup=stored;
    else if(STATE.dashGroups.length===1)STATE.dashSelectedGroup=STATE.dashGroups[0].code;
  }
  STATE.dashLoading=false;
  if(STATE.dashSelectedGroup){
    await loadDashScopedData(STATE.dashSelectedGroup);
  }else{
    STATE.dashLoaded=true;render();
  }
}

// ── User handler: chip tap. Persist + swap + fetch. ───────────────────
function selectDashGroup(code){
  if(!code||code===STATE.dashSelectedGroup)return;
  STATE.dashSelectedGroup=code;
  saveDashGroup(code);
  STATE.dashLoadedForGroup=null;    // invalidate cache
  STATE.dashLoaded=false;
  STATE.dashExamViewingId=null;     // close any open exam-results drill-down
  STATE.dashExamPreviewId=null;     // Batch 6: close any open exam preview
  STATE.dashStudentAttendanceUid=null; // Batch 6: close any open attendance history
  loadDashScopedData(code);
}

// ── On-demand per-lecture attendance ──────────────────────────────────
async function loadLectureAttendance(lectureId){
  if(!lectureId)return[];
  const cache=STATE.dashAttendanceByLecture[lectureId];
  if(cache)return cache;
  try{
    const snap=await db.collection('attendance').where('lectureId','==',lectureId).get();
    const list=snap.docs.map(d=>({id:d.id,...d.data()}));
    // LRU-style bounded cache (30 lectures max in memory)
    const keys=Object.keys(STATE.dashAttendanceByLecture);
    if(keys.length>=30)delete STATE.dashAttendanceByLecture[keys[0]];
    STATE.dashAttendanceByLecture[lectureId]=list;
    return list;
  }catch(e){
    console.warn('[Attendance] load failed for lecture',lectureId,e);
    return [];
  }
}

async function createLecture(){
  const d=STATE.dashLectureDraft;
  // Batch 22 (B22-01): group is always read live from dashSelectedGroup at
  // submit time -- never trust the draft's cached groupCode, which goes
  // stale if the instructor switches the group chip after opening this
  // form. This was silently creating lectures under the wrong group.
  const g=STATE.dashSelectedGroup;
  if(!d.title||!d.title.trim()){showToast('Enter a lecture title.','warning');return;}
  if(!g){showToast('Pick a group first (chip strip above).','warning');return;}
  try{
    const entry={
      title:d.title.trim(),
      groupCode:g.toUpperCase(),
      date:d.date||new Date().toISOString().slice(0,10),
      status:'scheduled',
      createdAt:new Date().toISOString(),
      createdBy:STATE.user.uid
    };
    const ref=await db.collection('lectures').add(entry);
    STATE.dashLectures.unshift({id:ref.id,...entry});
    // Preserve selected-group prefill for the next lecture
    STATE.dashLectureDraft={title:'',groupCode:STATE.dashSelectedGroup,date:''};
    render();
    showToast('Lecture created.','success');
    // Batch 11: auto-open check-in immediately on creation — no separate
    // manual click needed. Reuses openLecture()'s existing "one live per
    // group" takeover-confirmation flow, so nothing about that UX changes.
    await openLecture(ref.id);
  }catch(e){console.warn('[Lecture] create failed:',e);showToast('Error creating lecture.','error');}
}

async function deleteLecture(id){
  const lec=(STATE.dashLectures||[]).find(l=>l.id===id);
  const ok=await showModal({icon:'\u{1F5D1}\uFE0F',title:'Delete Lecture?',body:'This permanently removes the lecture'+(lec?' "'+lec.title+'"':'')+'. If it is currently live, check-in will be closed.',type:'danger',confirmText:'Delete',cancelText:'Cancel'});
  if(!ok)return;
  try{
    // If this lecture is the live one for its group, clear the pointer first.
    if(lec&&STATE.dashLive[lec.groupCode]&&STATE.dashLive[lec.groupCode].lectureId===id){
      await db.collection('live').doc(lec.groupCode).set({lectureId:null});
      STATE.dashLive[lec.groupCode]={lectureId:null};
    }
    await db.collection('lectures').doc(id).delete();
    STATE.dashLectures=STATE.dashLectures.filter(l=>l.id!==id);
    // Batch 2: clear the attendance cache for this lecture — records may
    // still exist but the lecture is gone, so no reason to hold the entries
    delete STATE.dashAttendanceByLecture[id];
    render();
    showToast('Lecture deleted.','success');
  }catch(e){console.warn('[Lecture] delete failed:',e);showToast('Error deleting lecture.','error');}
}

async function openLecture(id){
  const lec=(STATE.dashLectures||[]).find(l=>l.id===id);
  if(!lec)return;
  const g=lec.groupCode;
  const currentLive=STATE.dashLive[g];
  // One-live-per-group: if another lecture is live for this group, confirm takeover.
  if(currentLive&&currentLive.lectureId&&currentLive.lectureId!==id){
    const prev=(STATE.dashLectures||[]).find(l=>l.id===currentLive.lectureId);
    const ok=await showModal({icon:'\u{1F534}',title:'Group Already Live',body:'Group '+g+' already has a live lecture'+(prev?' ("'+prev.title+'")':'')+'. Opening this one will close that one. Continue?',type:'warning',confirmText:'Open This Lecture',cancelText:'Cancel'});
    if(!ok)return;
    // mark the previous lecture ended
    if(prev){try{await db.collection('lectures').doc(prev.id).update({status:'ended'});prev.status='ended';}catch(e){}}
  }
  try{
    const _openedAt=new Date();
    const pointer={lectureId:id,title:lec.title,openedAt:_openedAt.toISOString(),autoCloseAt:new Date(_openedAt.getTime()+LIVE_AUTOCLOSE_MS).toISOString()};
    await db.collection('live').doc(g).set(pointer);
    STATE.dashLive[g]=pointer;
    // Re-open a previously-ended lecture returns it to scheduled while live.
    if(lec.status==='ended'){try{await db.collection('lectures').doc(id).update({status:'scheduled'});lec.status='scheduled';}catch(e){}}
    render();
    showToast('\u{1F534} '+lec.title+' is now LIVE for '+g,'success');
  }catch(e){console.warn('[Lecture] open failed:',e);showToast('Error opening lecture.','error');}
}

async function closeLecture(id){
  const lec=(STATE.dashLectures||[]).find(l=>l.id===id);
  if(!lec)return;
  const g=lec.groupCode;
  try{
    await db.collection('live').doc(g).set({lectureId:null});
    STATE.dashLive[g]={lectureId:null};
    // Batch 11: checkinClosedAt lives on the LECTURE doc (not the shared
    // live/{groupCode} pointer) so its 7-day feedback window survives even
    // after a newer lecture's check-in overwrites the group's live pointer.
    const checkinClosedAt=new Date().toISOString();
    await db.collection('lectures').doc(id).update({status:'ended',checkinClosedAt});
    lec.status='ended';
    lec.checkinClosedAt=checkinClosedAt;
    render();
    showToast('Lecture closed. Feedback is now open for 7 days.','info');
  }catch(e){console.warn('[Lecture] close failed:',e);showToast('Error closing lecture.','error');}
}

// Batch 11: lazy backfill for the AUTO-close case (8h lapse). There's no cron,
// so whichever client renders the lecture list first and notices the check-in
// window has lapsed (autoEnded) but checkinClosedAt was never written, writes
// it now — using the SCHEDULED autoCloseAt time (not "now"), so the 7-day
// feedback window starts from when the check-in should have closed.
function _maybeBackfillCheckinClosedAt(lec,ptr){
  if(!lec||lec.checkinClosedAt||!ptr||!ptr.autoCloseAt)return;
  if(ptr.lectureId!==lec.id)return;
  if(Date.now()<=Date.parse(ptr.autoCloseAt))return;   // still within window
  const checkinClosedAt=ptr.autoCloseAt;
  lec.checkinClosedAt=checkinClosedAt;   // optimistic, avoids repeat writes this session
  db.collection('lectures').doc(lec.id).update({status:'ended',checkinClosedAt}).catch(()=>{});
}

function isLectureLive(lec){
  const p=STATE.dashLive[lec.groupCode];
  return !!(p&&p.lectureId===lec.id&&_liveWindowOpen(p));
}

function renderDashLectures(){
  const lectures=STATE.dashLectures||[];
  const selectedGroup=STATE.dashSelectedGroup;
  const d=STATE.dashLectureDraft;
  // Batch 2: auto-prefill the draft group from the selected group so the
  // instructor never types the wrong code by mistake. Draft still overridable.
  if(selectedGroup&&!d.groupCode)d.groupCode=selectedGroup;
  const createCard=`
    <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">\u2795 Create a Lecture for <span style="font-family:'Courier New',monospace;color:var(--brand)">${esc(selectedGroup)}</span></div>
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="margin-bottom:10px"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Title *</label>
        <input id="lec-title" type="text" value="${esc(d.title||'')}" oninput="STATE.dashLectureDraft.title=this.value" placeholder="e.g. Section A \u2014 Cost Behavior" style="width:100%;padding:9px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface);box-sizing:border-box"></div>
      <div style="margin-bottom:12px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Date</label>
        <input id="lec-date" type="date" value="${esc(d.date||'')}" oninput="STATE.dashLectureDraft.date=this.value" style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
      </div>
      <button onclick="createLecture()" style="width:100%;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Create Lecture</button>
    </div>`;
  // Lecture rows — friendly empty state if none for this group
  if(lectures.length===0){
    return `<div style="padding:14px">${createCard}${renderDashTabEmpty('Lectures',selectedGroup,{icon:'\u{1F3AC}',body:'This group has no lectures yet. Use the form above to create one.'})}</div>`;
  }
  const rows=lectures.map(l=>{
    const live=isLectureLive(l);
    const dt=l.date?new Date(l.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
    const _ptr=STATE.dashLive[l.groupCode];
    const autoEnded=!live&&_ptr&&_ptr.lectureId===l.id;  // pointed here but window passed
    if(autoEnded)_maybeBackfillCheckinClosedAt(l,_ptr);   // Batch 11: lazy-detect auto-close
    const badge=live
      ?`<span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;background:var(--err-tint);color:#C0392B">\u{1F534} LIVE</span>`
      :(autoEnded
        ?`<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;background:#EAECEE;color:#566573">Ended (auto)</span>`
        :(l.status==='ended'
          ?`<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;background:#EAECEE;color:#566573">Ended</span>`
          :`<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;background:var(--warn-tint-2);color:#9A7D0A">Scheduled</span>`));
    // Batch 2: attendance count comes from lazy cache. If not yet fetched,
    // show a neutral "View check-ins" prompt instead of a stale zero.
    const cached=STATE.dashAttendanceByLecture[l.id];
    const attBtn=cached
      ?`<button onclick="openAttendanceList('${l.id}')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--brand)30;background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F465} ${cached.length} checked in</button>`
      :`<button onclick="openAttendanceList('${l.id}')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--border-4);background:var(--surface);color:#555;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F465} View check-ins</button>`;
    const action=live
      ?`<button onclick="closeLecture('${l.id}')" style="padding:7px 14px;border-radius:8px;border:none;background:#C0392B;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u25A0 Close check-in</button>`
      :`<button onclick="openLecture('${l.id}')" style="padding:7px 14px;border-radius:8px;border:none;background:#1E8449;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u25B6 Open check-in</button>`;
    return `<div style="background:#fff;border:.5px solid ${live?'#C0392B40':'var(--border)'};border-radius:12px;padding:13px 14px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
        <div style="min-width:0"><div style="font-size:14px;font-weight:600;color:var(--ink);line-height:1.3">${esc(l.title)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;align-items:center">
            ${dt?`<span style="font-size:11px;color:#888">${dt}</span>`:''}${badge}</div></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${action}
        ${attBtn}
        <button onclick="deleteLecture('${l.id}')" style="padding:7px 10px;border-radius:8px;border:.5px solid var(--err)40;background:var(--err-tint);color:var(--err-2);font-size:12px;cursor:pointer;font-family:inherit">\u{1F5D1}\uFE0F</button>
      </div>
    </div>`;
  }).join('');
  return `<div style="padding:14px">${createCard}
    <div style="font-size:12px;font-weight:500;color:#888;letter-spacing:.5px;margin-bottom:8px">LECTURES (${lectures.length})</div>
    ${rows}</div>`;
}

function openExamPreview(examId){
  STATE.dashExamPreviewId=examId;
  render();
}

function closeExamPreview(){
  STATE.dashExamPreviewId=null;
  render();
}

// Batch 6 · Item H helper — resolve frozen questionIds into full question
// objects using the section quiz JSON that ensureQuizzes() has already cached.
// qid format from saveExam(): "<lessonId>:<qid_or_index>".
// Returns null if the section isn't cached yet (caller triggers ensureQuizzes).
function _hydrateExamQuestions(ex){
  try{
    // Batch 11: multi-section aware — legacy single-section exams (no
    // sectionIds array) fall back to their one sectionId as before.
    const secIds=Array.isArray(ex.sectionIds)&&ex.sectionIds.length?ex.sectionIds:[ex.sectionId];
    const secs=secIds.map(sid=>S.find(s=>s.id===parseInt(sid))).filter(Boolean);
    if(!secs.length) return [];
    const hasCache=secs.some(sec=>sec.lessons.some(l=>Array.isArray(l.quizzes)&&l.quizzes.length));
    if(!hasCache) return null;
    const byLesson={};
    secs.forEach(sec=>{ sec.lessons.forEach(l=>{ byLesson[l.id]=l; }); });
    const out=[];
    (ex.questionIds||[]).forEach(qid=>{
      const [lid,tail]=String(qid).split(':');
      const l=byLesson[lid]; if(!l||!Array.isArray(l.quizzes)) return;
      let q=l.quizzes.find(x=>String(x.id)===String(tail));
      if(!q){
        const idx=parseInt(tail);
        if(Number.isFinite(idx) && l.quizzes[idx]) q=l.quizzes[idx];
      }
      if(q) out.push(q);
    });
    return out;
  }catch(e){ console.warn('[_hydrateExamQuestions] failed', e); return []; }
}

function renderDashExamPreview(){
  const examId=STATE.dashExamPreviewId;
  const ex=(STATE.dashExams||[]).find(e=>e.id===examId);
  if(!ex){STATE.dashExamPreviewId=null;return renderDashExams();}
  // Batch 6 · Item H — hydrate frozen questionIds into full question objects.
  // Fix: previous code read ex.questions which the exam doc never had; the
  // freeze writes ex.questionIds. Hydration is client-side (no extra reads)
  // because section quiz JSON is already cached after ensureQuizzes().
  let qs=ex.questions||[];
  // Batch 11: multi-section aware.
  const _previewSecIds=Array.isArray(ex.sectionIds)&&ex.sectionIds.length?ex.sectionIds:[ex.sectionId];
  if((!qs || !qs.length) && Array.isArray(ex.questionIds) && ex.questionIds.length){
    qs=_hydrateExamQuestions(ex);
    if(qs===null){
      Promise.all(_previewSecIds.map(sid=>ensureQuizzes(parseInt(sid)))).then(()=>{ if(STATE.dashExamPreviewId===examId) render(); }).catch(()=>{});
      qs=[];
    }
  }
  const sectionsSummary=_previewSecIds.map(sid=>{
    const s=sect(sid);
    const u=unitTitles(sid,(ex.unitsBySection&&ex.unitsBySection[sid])||ex.unitIds,{max:6});
    return 'Sec '+sid+(s?' — '+esc(s.title):'')+(u?' (Units: '+esc(u)+')':' (Full section)');
  }).join(' + ');
  const letters=['A','B','C','D','E'];

  const questionsHTML=qs.length?qs.map((q,i)=>{
    const opts=(q.o||q.options||q.opts||[]);
    const correctIdx=(typeof q.a==='number'?q.a:(typeof q.correct==='number'?q.correct:(typeof q.ans==='number'?q.ans:0)));
    const unit=q.unit||q.unitId||q._lid||'';
    const src=q.source||q.src||'';
    const wrongWhy=(q.wrongWhy!=null?q.wrongWhy:(q.wrong_why!=null?q.wrong_why:''));
    const optsHTML=opts.map((o,j)=>{
      const isCorrect=j===correctIdx;
      return `<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 12px;margin-bottom:5px;border-radius:8px;background:${isCorrect?'var(--ok-tint-2)':'var(--surface)'};border:1px solid ${isCorrect?'#1E8449':'var(--border)'}">
        <div style="width:22px;height:22px;border-radius:50%;background:${isCorrect?'#1E8449':'#fff'};color:${isCorrect?'#fff':'#666'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;border:1px solid ${isCorrect?'#1E8449':'var(--border-4)'}">${letters[j]||(j+1)}</div>
        <div style="font-size:13px;color:var(--ink);line-height:1.5;flex:1">${esc(o||'')}${isCorrect?' <span style="color:var(--ok-2);font-weight:600;font-size:11px">✓ correct</span>':''}</div>
      </div>`;
    }).join('');
    const expl=q.e||q.explanation||q.exp||'';
    const explHTML=expl?`<div style="background:var(--brand-tint-2);border-left:3px solid var(--brand-2);border-radius:6px;padding:8px 10px;margin-top:8px;font-size:12px;color:var(--brand);line-height:1.5"><b>Explanation:</b> ${esc(expl)}</div>`:'';
    // Batch 8: wrongWhy is a per-option array in the canonical quiz shape. Render
    // one line per wrong option; fall back to a single string for legacy data.
    let wrongHTML='';
    if(Array.isArray(wrongWhy)){
      const _wl=wrongWhy.map((w,j)=>(w&&j!==correctIdx)?`<div style="margin-top:3px"><b>${letters[j]||(j+1)}.</b> ${esc(w)}</div>`:'').filter(Boolean).join('');
      if(_wl)wrongHTML=`<div style="background:var(--err-tint);border-left:3px solid var(--err);border-radius:6px;padding:8px 10px;margin-top:8px;font-size:12px;color:#7d1f1f;line-height:1.5"><b>Why wrong options fail:</b>${_wl}</div>`;
    }else if(wrongWhy){
      wrongHTML=`<div style="background:var(--err-tint);border-left:3px solid var(--err);border-radius:6px;padding:8px 10px;margin-top:8px;font-size:12px;color:#7d1f1f;line-height:1.5"><b>Why wrong options fail:</b> ${esc(wrongWhy)}</div>`;
    }
    const meta=[unit?'Unit '+esc(unit):'',src?'Source: '+esc(src):''].filter(Boolean).join(' · ');
    return `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px;page-break-inside:avoid">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--brand);letter-spacing:.5px">Q ${i+1} of ${qs.length}</div>
        ${meta?`<div style="font-size:10px;color:#888">${meta}</div>`:''}
      </div>
      <div style="font-size:14px;color:var(--ink);line-height:1.55;margin-bottom:12px;font-weight:500">${esc(q.text||q.q||q.question||'(no text)')}</div>
      ${optsHTML}
      ${explHTML}
      ${wrongHTML}
    </div>`;
  }).join(''):`<div style="text-align:center;padding:40px 20px;color:var(--muted-2)">
    <div style="font-size:36px;margin-bottom:10px">${(ex.questionIds&&ex.questionIds.length)?'\u23F3':'\uD83D\uDCC4'}</div>
    <div style="font-size:14px;margin-bottom:6px;color:var(--ink)">${(ex.questionIds&&ex.questionIds.length)?'Loading questions\u2026':'No questions frozen for this exam'}</div>
    <div style="font-size:12px;color:var(--muted-3);line-height:1.5">${(ex.questionIds&&ex.questionIds.length)?'One moment while we fetch the section content.':'This can happen if the section content changed after the exam was scheduled. Try Re-shuffle to rebuild the question set.'}</div>
  </div>`;

  return `<div style="padding:14px" id="exam-preview-root">
    <button onclick="closeExamPreview()" style="background:none;border:none;color:var(--brand);font-size:14px;cursor:pointer;font-family:inherit;padding:0 0 12px;font-weight:500">‹ Back to exams</button>
    <div style="background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:14px;padding:18px;color:#fff;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;opacity:.85;margin-bottom:4px">EXAM PREVIEW · INSTRUCTOR VIEW</div>
      <div style="font-size:17px;font-weight:600;line-height:1.35;margin-bottom:8px">${esc(ex.title||'Untitled exam')}</div>
      <div style="font-size:12px;opacity:.85;line-height:1.6">${sectionsSummary}<br><b>${(ex.questionIds&&ex.questionIds.length)||qs.length||ex.count||0}</b> question${((ex.questionIds&&ex.questionIds.length)||qs.length||ex.count||0)===1?'':'s'} · <b>${ex.durationMinutes||0}</b> min · Group <b>${esc(ex.groupCode||'—')}</b></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button onclick="window.print()" style="flex:1;padding:10px;border-radius:10px;border:.5px solid var(--border-4);background:var(--surface-3);color:#333;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">🖨️ Print / Save as PDF</button>
    </div>
    <div style="background:var(--warn-tint-2);border:1px solid #F5CBA7;border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:#7D6608;line-height:1.5">
      ⚠️ This is the <b>frozen snapshot</b> shown to students. Correct answers are highlighted for your review — do not share this view with students.
    </div>
    ${questionsHTML}
    <div style="height:40px"></div>
  </div>`;
}

function renderDashExams(){
  if(STATE.dashExamPreviewId)return renderDashExamPreview();
  if(STATE.dashExamViewingId)return renderDashExamResults();
  const d=STATE.dashExamDraft;
  const selectedGroup=STATE.dashSelectedGroup;
  const exams=STATE.dashExams||[];

  // Batch 2: auto-prefill draft group so exams save to the currently-viewed
  // group by default. Instructor doesn't have to pick manually every time.
  if(selectedGroup&&!d.groupCode)d.groupCode=selectedGroup;

  // Batch 11: Section is now a multi-select — pick 1+ sections (e.g. Cost +
  // Budget). Question count splits evenly across selected sections, then
  // each section's share splits evenly across its selected units.
  const selectedSections=new Set((d.sectionIds||[]).map(String));
  const sectionChips=S.map(s=>{
    const on=selectedSections.has(String(s.id));
    return `<button type="button" onclick="toggleExamSection('${s.id}')" style="padding:7px 12px;border-radius:14px;border:1px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':'#fff'};color:${on?'#fff':'#555'};font-size:12px;font-weight:${on?'600':'500'};cursor:pointer;font-family:inherit;white-space:nowrap">Sec ${s.id} \u2014 ${esc(s.title)}</button>`;
  }).join('');
  const unitPickers=(d.sectionIds||[]).map(sid=>renderExamUnitPicker(d,sid)).join('');

  const createCard=`
    <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">\u2795 Create an Exam for <span style="font-family:'Courier New',monospace;color:var(--brand)">${esc(selectedGroup)}</span></div>
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Title *</label>
        <input id="ex-title" type="text" value="${esc(d.title||'')}"
               oninput="STATE.dashExamDraft.title=this.value"
               placeholder="e.g. Section 1 Mid-Term Practice"
               style="width:100%;padding:9px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface);box-sizing:border-box">
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Section(s) * <span style="font-weight:400">— pick one or more; questions split evenly across your picks</span></label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--surface);border:.5px solid var(--border);border-radius:8px">${sectionChips}</div>
      </div>
      ${unitPickers}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Questions (3\u201350) *</label>
          <input type="number" min="3" max="50" value="${esc(String(d.count||20))}"
                 oninput="STATE.dashExamDraft.count=this.value"
                 style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Duration (min) *</label>
          <input type="number" min="3" max="240" value="${esc(String(d.durationMinutes||30))}"
                 oninput="STATE.dashExamDraft.durationMinutes=this.value"
                 style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
        </div>
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Max Attempts (1\u201310) <span style="font-weight:400">\u2014 students can retake up to this many times, in shuffled order</span></label>
        <input type="number" min="1" max="10" value="${esc(String(d.maxAttempts==null?3:d.maxAttempts))}"
               oninput="STATE.dashExamDraft.maxAttempts=this.value"
               style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Opens at *</label>
          <input type="datetime-local" value="${esc(d.opensAt||'')}"
                 oninput="STATE.dashExamDraft.opensAt=this.value"
                 style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Closes at *</label>
          <input type="datetime-local" value="${esc(d.closesAt||'')}"
                 oninput="STATE.dashExamDraft.closesAt=this.value"
                 style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
        </div>
      </div>
      <button onclick="saveExam()"
              style="width:100%;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">
        \u{1F4BE} Create Exam
      </button>
    </div>`;

  const buckets={active:[],scheduled:[],closed:[]};
  exams.forEach(x=>{buckets[examWindowStatus(x)].push(x);});

  const fmtDT=(iso)=>{
    if(!iso)return '—';
    try{
      return new Date(iso).toLocaleString('en-GB',
        {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    }catch{return iso;}
  };

  const badgeStyle={
    active:   'background:var(--ok-tint-2);color:var(--ok-2)',
    scheduled:'background:var(--warn-tint-2);color:#9A7D0A',
    closed:   'background:#EAECEE;color:#566573'
  };
  const badgeLabel={active:'🟢 ACTIVE',scheduled:'⏳ SCHEDULED',closed:'⚫ CLOSED'};

  const examCard=(x)=>{
    const status=examWindowStatus(x);
    // Batch 11: multi-section exams show every selected section + its units;
    // legacy single-section exams (no sectionIds array) show as before.
    const xSectionIds=Array.isArray(x.sectionIds)&&x.sectionIds.length?x.sectionIds:[x.sectionId];
    const sectionsLine=xSectionIds.map(sid=>{
      const s=sect(sid);
      const u=unitTitles(sid,(x.unitsBySection&&x.unitsBySection[sid])||x.unitIds,{max:3});
      return 'Sec '+sid+(s?' — '+esc(s.title):'')+(u?' (Units: '+esc(u)+')':'');
    }).join('<br>');
    const canClose=status!=='closed';
    return `<div style="background:#fff;border:.5px solid ${status==='active'?'#1E844940':'var(--border)'};border-radius:12px;padding:13px 14px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;letter-spacing:.4px;${badgeStyle[status]}">${badgeLabel[status]}</span>
      </div>
      <div style="font-size:14px;font-weight:600;color:var(--ink);line-height:1.35;margin-bottom:6px">${esc(x.title)}</div>
      <div style="font-size:11px;color:#666;line-height:1.7;margin-bottom:10px">
        ${sectionsLine}<br>
        <b>${x.count}</b> questions · <b>${x.durationMinutes}</b> min<br>
        Opens <b>${fmtDT(x.opensAt)}</b> · Closes <b>${fmtDT(x.closesAt)}</b>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button onclick="openExamPreview('${x.id}')" style="flex:1 1 28%;padding:7px 10px;border-radius:8px;border:.5px solid #1E844940;background:var(--ok-tint-2);color:var(--ok-2);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">👁️ Preview</button>
        <button onclick="openExamResults('${x.id}')" style="flex:1 1 28%;padding:7px 10px;border-radius:8px;border:.5px solid var(--brand-2)40;background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">📊 Results</button>
        ${status==='scheduled'?`<button onclick="reshuffleExam('${x.id}')" style="flex:1 1 28%;padding:7px 10px;border-radius:8px;border:.5px solid #7D3C9840;background:var(--accent-purple-tint);color:var(--accent-purple-strong);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">🔄 Re-shuffle</button>`:''}
        ${canClose?`<button onclick="closeExamNow('${x.id}')" style="flex:1 1 28%;padding:7px 10px;border-radius:8px;border:.5px solid #D2691E40;background:#FEF5E7;color:#7D6608;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">🛑 Close</button>`:''}
        <button onclick="deleteExam('${x.id}')" style="flex:1 1 28%;padding:7px 10px;border-radius:8px;border:.5px solid var(--err)40;background:var(--err-tint);color:var(--err-2);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">🗑️ Delete</button>
      </div>
    </div>`;
  };

  const bucketHTML=(label,arr)=>arr.length
    ? `<div style="font-size:12px;font-weight:500;color:#888;letter-spacing:.5px;margin:14px 0 8px">${label} (${arr.length})</div>${arr.map(examCard).join('')}`
    : '';

  const emptyState=exams.length===0
    ? renderDashTabEmpty('Exams',STATE.dashSelectedGroup,{icon:'\u{1F4DD}',body:'This group has no exams yet. Use the form above to create one for a specific section.'})
    : '';

  return `<div style="padding:14px">
    ${createCard}
    ${emptyState}
    ${bucketHTML('🟢 ACTIVE',buckets.active)}
    ${bucketHTML('⏳ SCHEDULED',buckets.scheduled)}
    ${bucketHTML('⚫ CLOSED',buckets.closed)}
    <div style="height:40px"></div>
  </div>`;
}

// ── Batch 2: chip strip renderer ──────────────────────────────────────
// Renders the horizontal group selector above the dashboard sub-nav.
// Each chip shows the group code + a student count derived from the roster.
// Special "+ New" chip at the end routes to the Groups tab (create flow).
function renderGroupChipStrip(){
  const groups=(STATE.dashGroups||[]).slice().sort((a,b)=>(a.code||'').localeCompare(b.code||''));
  const students=STATE.dashStudents||[];
  const countFor=code=>students.filter(s=>(s.groupCode||'').toUpperCase()===code.toUpperCase()).length;
  const active=STATE.dashSelectedGroup;
  const chips=groups.map(g=>{
    const isActive=g.code===active;
    const n=countFor(g.code);
    return `<button class="gs-chip${isActive?' active':''}" onclick="selectDashGroup('${esc(g.code)}')" title="${esc(g.code)} — ${n} student${n===1?'':'s'}">`
      +`<span>${esc(g.code)}</span>`
      +`<span class="gs-chip-count">\u00B7 ${n}</span>`
      +`</button>`;
  }).join('');
  const newChip=`<button class="gs-chip gs-chip-new" onclick="STATE.dashTab='groups';render();setTimeout(()=>{const i=document.getElementById('new-group-input');if(i)i.focus();},50)" title="Add a new group">\u002B New</button>`;
  return `<div class="gs-strip" role="tablist" aria-label="Select group">${chips}${newChip}</div>`;
}

// ── Batch 2: skeleton (Decision 2A — instant-swap loading UX) ─────────
function renderDashSkeleton(){
  const line=(cls)=>`<div class="gs-skeleton-line ${cls}"></div>`;
  const card=`<div class="gs-skeleton-card">${line('short')}${line('long')}${line('medium')}</div>`;
  return `<div style="padding:14px">${card}${card}${card}</div>`;
}

// ── Batch 2: empty states (Decision 3B — friendly + CTA) ──────────────
// Called when no group is selected on a scoped tab.
function renderDashPickGroupEmpty(tabLabel){
  const hasGroups=(STATE.dashGroups||[]).length>0;
  if(!hasGroups){
    return `<div class="gs-empty">
      <div class="gs-empty-icon">\u{1F465}</div>
      <div class="gs-empty-title">No groups yet</div>
      <div class="gs-empty-body">Create your first group to start managing ${esc(tabLabel)}, students, and exams.</div>
      <button class="gs-empty-cta" onclick="STATE.dashTab='groups';render();setTimeout(()=>{const i=document.getElementById('new-group-input');if(i)i.focus();},50)">\u002B Create your first group</button>
    </div>`;
  }
  return `<div class="gs-empty">
    <div class="gs-empty-icon">\u{1F446}</div>
    <div class="gs-empty-title">Pick a group to view its ${esc(tabLabel)}</div>
    <div class="gs-empty-body">Tap a group chip above to see its ${esc(tabLabel.toLowerCase())} and related activity.</div>
  </div>`;
}

// ── Batch 2: per-tab "no items" empty state for a selected group ──────
function renderDashTabEmpty(tabLabel,groupCode,cta){
  return `<div class="gs-empty">
    <div class="gs-empty-icon">${cta.icon||'\u{1F4CB}'}</div>
    <div class="gs-empty-title">No ${esc(tabLabel.toLowerCase())} yet for ${esc(groupCode)}</div>
    <div class="gs-empty-body">${esc(cta.body||('Create your first '+tabLabel.toLowerCase()+' below.'))}</div>
    ${cta.button?`<button class="gs-empty-cta" onclick="${cta.onclick||''}">${esc(cta.button)}</button>`:''}
  </div>`;
}

function renderDashboard(){
  if(!isInstructor())return renderIntro();
  if(!STATE.dashLoaded&&!STATE.dashLoading&&!STATE.dashGroupsLoaded)loadDashboardP1();
  const _pendingApprovalsCount=(STATE.dashApprovals&&STATE.dashApprovals.rows||[]).filter(r=>r.status==='pending').length;
  const SUB_DASH=[
    {id:'groups',      icon:'\u{1F465}', label:'Groups'},
    {id:'students',    icon:'\u{1F464}', label:'Students'},
    {id:'approvals',   icon:'\u2705', label:'Approvals'+(_pendingApprovalsCount?' \u00B7 '+_pendingApprovalsCount:'')},
    {id:'lectures',    icon:'\u{1F3AC}', label:'Lectures'},
    {id:'attendance',  icon:'\u{2705}', label:'Attendance'},
    {id:'exams',       icon:'\u{1F4DD}', label:'Exams'},
    {id:'results',     icon:'\u{1F4CA}', label:'Results'},
    {id:'progress',    icon:'\u{1F4C8}', label:'Progress'},
    {id:'leader',      icon:'\u{1F3C5}', label:'Leader'},
    {id:'plan',        icon:'\u{1F5D3}\uFE0F', label:'Plan'},
    {id:'teaching-log',icon:'\u{1F4D3}', label:'Actual Teaching'},
    {id:'schedule',    icon:'\u{1F4C5}', label:'Schedule'},
    {id:'at-risk',     icon:'\u{1F6A8}', label:'At Risk'},
    {id:'errors',      icon:'\u{1F41E}', label:'Errors'}   // Batch 24 (B24-08)
  ];
  const _validTabs=['groups','students','approvals','lectures','attendance','exams','results','progress','leader','plan','teaching-log','schedule','at-risk','errors'];
  const tab=_validTabs.includes(STATE.dashTab)?STATE.dashTab:'groups';
  const subnav=`<div class="sub-nav">${SUB_DASH.map(it=>
    `<button class="sub-nav-btn${tab===it.id?' active':''}" onclick="STATE.dashTab='${it.id}';render()">${it.icon} ${it.label}</button>`
  ).join('')}</div>`;

  // ── Group chip strip: shown once we have the groups list ──
  const chipStrip=STATE.dashGroupsLoaded?renderGroupChipStrip():'';

  // ── Body dispatch ──
  const scopedTabs={lectures:'Lectures',exams:'Exams','teaching-log':'Actual Teaching','at-risk':'At-Risk students',students:'Students',attendance:'Attendance',results:'Results',progress:'Progress',leader:'Leader',plan:'Weekly Plan',schedule:'Schedule'};
  let body;
  if(STATE.dashError){
    body=`<div style="text-align:center;padding:50px 20px"><div style="font-size:34px;margin-bottom:10px">\u26A0\uFE0F</div><div style="font-size:14px;color:#555;margin-bottom:14px">Couldn't load dashboard data.</div><button onclick="STATE.dashError=false;STATE.dashGroupsLoaded=false;STATE.dashLoaded=false;loadDashboardP1()" style="padding:9px 18px;border-radius:8px;border:.5px solid var(--border-4);background:#fff;font-size:13px;cursor:pointer;font-family:inherit">Retry</button></div>`;
  }else if(tab==='groups'){
    // Groups tab: unscoped, always renders (roster management surface).
    body=STATE.dashGroupsLoaded?renderDashGroups():renderDashSkeleton();
  }else if(tab==='students'){
    // Batch 5 Students tab: unscoped (roster is already loaded with groups).
    body=STATE.dashGroupsLoaded?renderDashStudents():renderDashSkeleton();
  }else if(tab==='approvals'){
    // Batch 11: unscoped — pending join/switch requests span all groups.
    if(!STATE.dashApprovals||!STATE.dashApprovals.loaded){
      loadDashApprovals();
      body=renderDashSkeleton();
    }else{
      body=renderDashApprovals();
    }
  }else if(tab==='errors'){
    // Batch 24 (B24-08): unscoped — app errors reported by all students' devices.
    body=renderDashErrors();
  }else if(!STATE.dashSelectedGroup){
    // Scoped tab but no group picked → empty state
    body=renderDashPickGroupEmpty(scopedTabs[tab]||'items');
  }else if(STATE.dashLoading||STATE.dashLoadedForGroup!==STATE.dashSelectedGroup){
    // Scoped tab, group picked, but data still loading (or stale from prior group)
    body=renderDashSkeleton();
  }else if(tab==='teaching-log'){
    body=renderDashActualTeaching();
  }else if(tab==='lectures'){
    body=renderDashLectures();
  }else if(tab==='attendance'){
    body=renderDashAttendance();
  }else if(tab==='exams'){
    body=renderDashExams();
  }else if(tab==='results'){
    body=renderDashResults();
  }else if(tab==='progress'){
    body=renderDashProgress();
  }else if(tab==='leader'){
    body=renderDashLeader();
  }else if(tab==='plan'){
    body=renderDashPlan();
  }else if(tab==='schedule'){
    body=renderDashSchedule();
  }else if(tab==='at-risk'){
    body=renderDashAtRisk();
  }else{
    body=renderDashGroups();
  }
  return `${subnav}${chipStrip}<div class="sh"><h2>Instructor Dashboard</h2><p>${STATE.dashSelectedGroup?'Viewing: <b>'+esc(STATE.dashSelectedGroup)+'</b> \u00B7 ':''}Groups \u00B7 lectures \u00B7 exams \u00B7 teaching log</p></div><div class="scroll-area">${body}</div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 4 — PILLAR 4: At Risk instructor view
// ═══════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 24 (B24-08) — ERRORS TAB (client-errors, newest 100, grouped)
// ═══════════════════════════════════════════════════════════════════════════
async function loadDashErrors(){
  STATE.dashErrors={loading:true,loaded:false,rows:[]};
  try{
    const snap=await db.collection('client-errors').orderBy('createdAt','desc').limit(100).get();
    const rows=[];snap.forEach(d=>rows.push(Object.assign({_id:d.id},d.data())));
    STATE.dashErrors={loading:false,loaded:true,rows};
  }catch(e){
    STATE.dashErrors={loading:false,loaded:true,rows:[],error:e.message};
  }
  if(STATE.tab==='dashboard'&&STATE.dashTab==='errors')render();
}

async function clearDashErrors(){
  const rows=(STATE.dashErrors&&STATE.dashErrors.rows)||[];
  if(!rows.length)return;
  const ok=await showModal({icon:'\u{1F5D1}\uFE0F',title:'Clear error log?',body:'Deletes the '+rows.length+' reports shown. New errors will still be recorded.',type:'warning',confirmText:'Clear',cancelText:'Cancel'});
  if(!ok)return;
  try{
    for(let i=0;i<rows.length;i+=400){
      const b=db.batch();rows.slice(i,i+400).forEach(r=>b.delete(db.collection('client-errors').doc(r._id)));await b.commit();
    }
    showToast('Error log cleared.','success');
  }catch(e){showToast('Couldn\u2019t clear: '+e.message,'error');}
  loadDashErrors();
}

function renderDashErrors(){
  const st=STATE.dashErrors;
  if(!st||(!st.loaded&&!st.loading)){loadDashErrors();return renderDashSkeleton();}
  if(st.loading)return renderDashSkeleton();
  if(st.error)return '<div class="card" style="margin:12px">Couldn\u2019t load errors: '+esc(st.error)+'</div>';
  const groups={};
  st.rows.forEach(r=>{
    const k=(r.kind||'')+'|'+(r.msg||'');
    if(!groups[k])groups[k]={kind:r.kind,msg:r.msg,count:0,users:{},last:r,builds:{}};
    const g=groups[k];g.count++;g.users[r.userId]=1;g.builds[r.build||'?']=1;
  });
  const list=Object.values(groups).sort((a,b)=>b.count-a.count);
  const head='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 12px 8px">'
    +'<div style="font-size:13px;color:var(--muted)">'+st.rows.length+' recent reports \u00B7 '+list.length+' distinct</div>'
    +'<div style="display:flex;gap:6px"><button class="sub-nav-btn" onclick="loadDashErrors()">\u21BB Refresh</button>'
    +(st.rows.length?'<button class="sub-nav-btn" onclick="clearDashErrors()">\u{1F5D1}\uFE0F Clear</button>':'')+'</div></div>';
  if(!list.length)return head+'<div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:14px">\u2705 No errors reported.</div>';
  return head+list.map(g=>{
    const r=g.last;
    const when=r.at?new Date(r.at).toLocaleString():'';
    return '<div class="card" style="margin:0 12px 10px">'
      +'<div style="display:flex;justify-content:space-between;gap:8px;align-items:flex-start">'
      +'<div style="font-size:13px;font-weight:600;color:var(--ink);word-break:break-word">'+esc(g.msg||'(no message)')+'</div>'
      +'<div style="flex-shrink:0;font-size:12px;font-weight:600;color:var(--err)">\u00D7'+g.count+'</div></div>'
      +'<div style="font-size:11px;color:var(--muted);margin-top:4px">'+esc(g.kind||'')+' \u00B7 '+Object.keys(g.users).length+' student(s) \u00B7 build '+esc(Object.keys(g.builds).join(', '))+' \u00B7 last: '+esc(when)+(r.tab?' \u00B7 screen: '+esc(r.tab):'')+'</div>'
      +(r.src?'<div style="font-size:11px;color:var(--muted);margin-top:2px;word-break:break-all">'+esc(r.src)+'</div>':'')
      +(r.stack?'<details style="margin-top:6px"><summary style="font-size:11px;cursor:pointer;color:var(--brand)">Stack</summary><pre style="font-size:10px;white-space:pre-wrap;word-break:break-word;margin:6px 0 0;color:var(--muted)">'+esc(r.stack)+'</pre></details>':'')
      +'</div>';
  }).join('');
}

async function loadDashAtRisk(groupCode){
  if(!isInstructor()||!db||!groupCode)return;
  STATE.dashAtRiskLoading=true;
  try{
    const snap=await db.collection('student-analytics').where('groupCode','==',groupCode.toUpperCase()).get();
    const rows=snap.docs.map(d=>d.data());
    STATE.dashAtRisk=rows;
    STATE.dashAtRiskLoadedFor=groupCode;
  }catch(e){
    console.warn('at-risk load failed',e);STATE.dashAtRisk=[];STATE.dashAtRiskLoadedFor=groupCode;
  }
  STATE.dashAtRiskLoading=false;render();
}

function _atRiskReason(r){
  if((r.daysSinceActive||0)>=7)return{tag:'Silent '+r.daysSinceActive+' days',sev:'high'};
  const last7=r.last7DaysMinutes||0,prev7=r.previous7DaysMinutes||0;
  if(prev7>=60 && last7<prev7*0.5)return{tag:'Study time down '+Math.round((1-last7/prev7)*100)+'%',sev:'med'};
  if((r.streakCount||0)===0 && (r.streakWas||0)>=7)return{tag:'Streak broke ('+r.streakWas+'\u2192 0)',sev:'med'};
  return null;
}

function waLink(r){
  const phone=(r.phoneNumber||'').replace(/[^0-9]/g,'');
  if(!phone)return '';
  const ar=(r.language||'ar')==='ar';
  const days=r.daysSinceActive||0;
  const msg=ar
    ? `\u0623\u0647\u0644\u064B\u0627 ${r.displayName||''}\u060C\n\u0634\u0641\u062A \u0625\u0646\u0643 \u0645\u0634 \u062F\u0627\u062E\u0644 \u0639\u0644\u0649 \u062A\u0637\u0628\u064A\u0642 CMA \u0645\u0646 ${days} \u0623\u064A\u0627\u0645.\n\u0643\u0644\u0647 \u062A\u0645\u0627\u0645\u061F \u0644\u0648 \u0645\u062D\u062A\u0627\u062C \u0645\u0633\u0627\u0639\u062F\u0629 \u0641\u064A \u0623\u064A \u0645\u0648\u0636\u0648\u0639\u060C \u0642\u0648\u0644\u0651\u064A.\n\n\u2014 \u062F. \u0645\u062D\u0645\u062F`
    : `Hey ${r.displayName||''},\nNoticed you haven't been active on the CMA app for ${days} days.\nEverything okay? If you need help with any topic, let me know.\n\n\u2014 Dr. Mohamed`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}

function renderDashAtRisk(){
  const g=STATE.dashSelectedGroup;
  if(STATE.dashAtRiskLoadedFor!==g && !STATE.dashAtRiskLoading){loadDashAtRisk(g);}
  if(STATE.dashAtRiskLoading||STATE.dashAtRiskLoadedFor!==g){return renderDashSkeleton();}
  const rows=(STATE.dashAtRisk||[]).map(r=>({r,reason:_atRiskReason(r)})).filter(x=>x.reason);
  rows.sort((a,b)=>(b.r.daysSinceActive||0)-(a.r.daysSinceActive||0));
  if(!rows.length){
    return `<div style="text-align:center;padding:48px 20px">
      <div style="font-size:40px;margin-bottom:12px">\u{1F389}</div>
      <div style="font-size:15px;font-weight:600;color:#333;margin-bottom:6px">No one at risk right now</div>
      <div style="font-size:13px;color:#888;line-height:1.5;max-width:280px;margin:0 auto">Everyone in <b>${esc(g)}</b> has been active recently. Check back after a few days of new data.</div>
    </div>`;
  }
  const sevColor={high:'var(--err)',med:'var(--warn)'};
  const cards=rows.map(({r,reason})=>{
    const wa=waLink(r);
    const initial=(r.displayName||'?').charAt(0).toUpperCase();
    const noPhone=!(r.phoneNumber||'').replace(/[^0-9]/g,'');
    return `<div style="background:#fff;border:.5px solid #eee;border-left:3px solid ${sevColor[reason.sev]||'var(--warn)'};border-radius:10px;padding:13px 14px;margin-bottom:10px;display:flex;align-items:center;gap:12px">
      <div style="width:40px;height:40px;border-radius:50%;background:var(--brand-tint);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:var(--brand);flex-shrink:0">${initial}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.displayName||'Unknown')}</div>
        <div style="font-size:12px;color:${sevColor[reason.sev]||'#888'};margin-top:2px">${esc(reason.tag)}</div>
        ${noPhone?'<div style="font-size:11px;color:#c00;margin-top:2px">\u26A0\uFE0F no phone on file</div>':''}
      </div>
      ${wa?`<a href="${wa}" target="_blank" rel="noopener" style="flex-shrink:0;width:40px;height:40px;border-radius:10px;background:#25D366;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:20px" title="Message on WhatsApp">\u{1F4AC}</a>`:''}
    </div>`;
  }).join('');
  return `<div style="padding-top:4px">
    <div style="font-size:12px;color:#888;margin-bottom:12px">${rows.length} student${rows.length>1?'s':''} in <b>${esc(g)}</b> may need a nudge \u00B7 sorted by days silent</div>
    ${cards}
  </div>`;
}

async function openExamResults(examId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  STATE.dashExamViewingId=examId;
  STATE.dashTab='exams';
  render();
  // Fire the load — renderDashExamResults will re-render when the cache fills.
  loadExamResults(examId);
}

async function loadExamResults(examId){
  const cache=STATE.dashExamResults[examId];
  if(cache&&cache.loaded&&!cache.loading)return;   // already have it
  STATE.dashExamResults[examId]={loading:true,loaded:false,results:[]};
  try{
    const snap=await db.collection('exam-results').where('examId','==',examId).get();
    // Batch 11: cross-reference userId against the already-loaded roster so rows
    // show the student's real name instead of falling back to "Student" —
    // exam-results docs never stored studentName at submit time, and this
    // works retroactively for old results with no Firestore migration needed.
    const rosterByUid={};
    (STATE.dashStudents||[]).forEach(s=>{rosterByUid[s.uid]=s.name||'';});
    const results=snap.docs.map(d=>{
      const data=d.data();
      return {_docId:d.id,...data,studentName:data.studentName||rosterByUid[data.userId]||'Student'};
    });
    // Batch 20: multiple attempt docs can now exist per student. Aggregate
    // stats (avg/median/pass rate/submitted count) use ONE representative
    // score per student — their BEST attempt — so a student who retakes
    // doesn't get counted multiple times and skew the class average. The
    // `results` array above is left untouched (every attempt, for the table).
    const bestByStudent={};
    results.filter(r=>r.submitted).forEach(r=>{
      const cur=bestByStudent[r.userId];
      if(!cur||(r.percentage||0)>(cur.percentage||0))bestByStudent[r.userId]=r;
    });
    const submitted=Object.values(bestByStudent);
    // Students with an in-progress attempt and NO submitted attempt at all
    // yet — still "pending" from the enrollment/completion point of view.
    const pendingStudents=new Set(
      results.filter(r=>!r.submitted&&!bestByStudent[r.userId]).map(r=>r.userId)
    );
    const scores=submitted.map(r=>r.percentage||0);
    const avg=scores.length?Math.round(scores.reduce((s,v)=>s+v,0)/scores.length):0;
    const passCount=submitted.filter(r=>(r.percentage||0)>=EXAM_PASS_THRESHOLD).length; // Batch 11: was hardcoded 60
    const passRate=submitted.length?Math.round(passCount/submitted.length*100):0;
    const sorted=[...scores].sort((a,b)=>a-b);
    const median=sorted.length?(sorted.length%2?sorted[(sorted.length-1)/2]:Math.round((sorted[sorted.length/2-1]+sorted[sorted.length/2])/2)):0;
    STATE.dashExamResults[examId]={
      loading:false,loaded:true,results,
      stats:{
        total:results.length,          // total attempt docs (all attempts, all students)
        submitted:submitted.length,    // unique students with >=1 submitted attempt
        pending:pendingStudents.size,  // unique students mid-attempt, none submitted yet
        attemptsTotal:results.length,
        avgPct:avg,
        medianPct:median,
        passCount,passRate,
        highest:scores.length?Math.max(...scores):0,
        lowest:scores.length?Math.min(...scores):0
      }
    };
    if(STATE.tab==='dashboard'&&STATE.dashExamViewingId===examId)render();
  }catch(e){
    console.warn('[Exam Results] load failed:',e);
    STATE.dashExamResults[examId]={loading:false,loaded:true,results:[],stats:null,error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashExamViewingId===examId)render();
  }
}

function closeExamResults(){
  STATE.dashExamViewingId=null;
  render();
}

// ═══════════════════════════════════════════════════════════════════════════
//  DASHBOARD → TEACHING → GROUP SCHEDULE
// ═══════════════════════════════════════════════════════════════════════════
// Replaces the old Plan, Schedule and Actual Teaching pages. Writes one doc per
// group, group-space/{GROUPCODE} (shape documented in src/core/24-my-group.js).
// "Done" lectures' actual units feed Question of the Day and the daily quiz.
STATE.dashGsByGroup={};
STATE.dashGsDraft=null;     // the open add/edit form
STATE.dashGsBusy=false;

function gschBlank(rows){
  const max=(rows||[]).reduce((m,r)=>Math.max(m,Number(r.lectureNumber)||0),0);
  return {id:'',lectureNumber:String(max+1),date:'',time:'',sectionId:'',plannedUnitIds:[],status:'planned',actualUnitIds:[],note:''};
}
async function loadDashGroupSchedule(g){
  const code=mgNormalizeCode(g);
  STATE.dashGsByGroup[code]={loading:true};
  try{
    const snap=await db.collection('group-space').doc(code).get();
    const x=snap.exists?snap.data():{};
    STATE.dashGsByGroup[code]={loaded:true,rows:x.rows||[],note:x.note||'',noteDraft:x.note||'',exists:snap.exists};
  }catch(e){
    console.warn('[group-schedule] load failed',e);
    STATE.dashGsByGroup[code]={error:(e&&e.code)||'error'};
  }
  render();
}
function gschReload(){ delete STATE.dashGsByGroup[mgNormalizeCode(STATE.dashSelectedGroup)]; STATE.dashGsDraft=null; render(); }

// Every save re-reads the doc inside a transaction, so an edit made on another
// device is never overwritten by an old copy on this one.
async function gschCommit(code,change,doneMessage){
  if(STATE.dashGsBusy)return false;
  STATE.dashGsBusy=true;
  try{
    const ref=db.collection('group-space').doc(code);
    const next=await db.runTransaction(async tx=>{
      const snap=await tx.get(ref);
      const x=snap.exists?snap.data():{};
      const out=change({rows:(x.rows||[]).slice(),note:x.note||''});
      const doc={groupCode:code,rows:out.rows,note:out.note,updatedAt:new Date().toISOString(),updatedBy:STATE.user.uid};
      tx.set(ref,doc);
      return doc;
    });
    const prev=STATE.dashGsByGroup[code]||{};
    const noteWasEdited=prev.noteDraft!==undefined&&prev.noteDraft!==prev.note&&prev.noteDraft!==next.note;
    STATE.dashGsByGroup[code]={loaded:true,rows:next.rows,note:next.note,noteDraft:noteWasEdited?prev.noteDraft:next.note,exists:true};
    delete _mg.byCode[code];          // My Group preview re-reads
    STATE.dashOverview=null;
    STATE.dashGsBusy=false;
    showToast(doneMessage,'success');
    return true;
  }catch(e){
    console.warn('[group-schedule] save failed',e);
    STATE.dashGsBusy=false;
    showToast(e&&e.code==='permission-denied'?'Not saved: publish the new Firestore rules first.':'Not saved. Check your connection and try again.','error',6000);
    return false;
  }
}

function gschSet(field,value){ if(STATE.dashGsDraft)STATE.dashGsDraft[field]=value; }
function gschSetSection(v){ STATE.dashGsDraft.sectionId=v; render(); }
function gschSetStatus(v){
  const d=STATE.dashGsDraft;d.status=v;
  // Marking a lecture Done starts from the plan; adjust it to what was really covered.
  if(v==='done'&&!d.actualUnitIds.length)d.actualUnitIds=d.plannedUnitIds.slice();
  render();
}
function gschToggleUnit(field,uid){
  const a=STATE.dashGsDraft[field];const i=a.indexOf(uid);
  if(i>=0)a.splice(i,1);else a.push(uid);
  render();
}
function gschEdit(id,status){
  const cache=STATE.dashGsByGroup[mgNormalizeCode(STATE.dashSelectedGroup)];
  const r=cache&&cache.rows.find(x=>x.id===id);if(!r)return;
  STATE.dashGsDraft=Object.assign(gschBlank([]),r,{plannedUnitIds:(r.plannedUnitIds||[]).slice(),actualUnitIds:(r.actualUnitIds||[]).slice(),
    lectureNumber:String(r.lectureNumber||''),sectionId:String(r.sectionId||''),group:mgNormalizeCode(STATE.dashSelectedGroup)});
  if(status)gschSetStatus(status);else render();
  dashScrollTop();
}
function gschCancel(){ STATE.dashGsDraft=null; render(); }

async function gschSave(){
  const code=mgNormalizeCode(STATE.dashSelectedGroup);const d=STATE.dashGsDraft;
  if(!code||!d||d.group!==code)return;
  if(!(Number(d.lectureNumber)>0)){showToast('Enter a lecture number.','warning');return;}
  if(!d.date){showToast('Pick a date.','warning');return;}
  if(!d.sectionId&&!d.plannedUnitIds.length){showToast('Pick a section or at least one planned unit.','warning');return;}
  if(d.status==='done'&&!d.actualUnitIds.length){showToast('Select the units you actually covered.','warning');return;}
  const first=mgUnitInfo(d.plannedUnitIds[0]||d.actualUnitIds[0]||'');
  const row={id:d.id||('l'+Date.now().toString(36)+Math.random().toString(36).slice(2,6)),
    lectureNumber:Number(d.lectureNumber),date:d.date,time:d.time||'',
    sectionId:first?first.sec.id:Number(d.sectionId),
    plannedUnitIds:d.plannedUnitIds.slice(),status:d.status,
    actualUnitIds:d.status==='done'?d.actualUnitIds.slice():[],
    note:String(d.note||'').trim().slice(0,500)};
  const ok=await gschCommit(code,cur=>{
    const i=cur.rows.findIndex(x=>x.id===row.id);
    if(i>=0)cur.rows[i]=row;else cur.rows.push(row);
    return cur;
  },'Lecture saved.');
  if(ok){STATE.dashGsDraft=null;render();}
}
async function gschDelete(id){
  const code=mgNormalizeCode(STATE.dashSelectedGroup);
  const ok=await showModal({icon:'🗑️',type:'danger',title:'Delete this lecture?',body:'It will disappear from the students’ My Group page.',confirmText:'Delete',cancelText:'Cancel'});
  if(!ok)return;
  if(await gschCommit(code,cur=>{cur.rows=cur.rows.filter(x=>x.id!==id);return cur;},'Lecture deleted.')){STATE.dashGsDraft=null;render();}
}
async function gschSaveNote(){
  const code=mgNormalizeCode(STATE.dashSelectedGroup);
  const note=String((STATE.dashGsByGroup[code]||{}).noteDraft||'').trim().slice(0,1000);
  if(await gschCommit(code,cur=>{cur.note=note;return cur;},'Note saved.'))render();
}
function gschNoteInput(v){ const c=STATE.dashGsByGroup[mgNormalizeCode(STATE.dashSelectedGroup)];if(c)c.noteDraft=v; }

// One-time copy of the old Schedule and Actual Teaching data. The old data stays
// untouched. Old teaching notes are NOT copied, because students never saw them.
function gschRowsFromOld(scheduleRows,logEntries){
  const rows=(scheduleRows||[]).map(r=>({id:'old-'+r.id,lectureNumber:Number(r.lectureNumber)||0,date:String(r.plannedDate||'').slice(0,10),time:'',
    sectionId:Number(r.sectionId)||0,plannedUnitIds:(r.unitIds||[]).map(String),status:'planned',actualUnitIds:[],note:r.note||''}));
  (logEntries||[]).slice().sort((a,b)=>String(a.date||'').localeCompare(String(b.date||''))).forEach((t,i)=>{
    const units=(t.unitIds||[]).map(String);
    let row=rows.find(r=>r.lectureNumber===Number(t.lectureNumber));
    if(!row){
      const info=mgUnitInfo(units[0]||'');
      row={id:'log-'+(t.id||i),lectureNumber:Number(t.lectureNumber)||0,date:String(t.date||'').slice(0,10),time:'',sectionId:info?info.sec.id:0,plannedUnitIds:units.slice(),status:'planned',actualUnitIds:[],note:''};
      rows.push(row);
    }
    row.status='done';
    row.actualUnitIds=[...new Set(row.actualUnitIds.concat(units))];
    if(t.date)row.date=String(t.date).slice(0,10);
  });
  return rows;
}
async function gschImportOld(){
  const code=mgNormalizeCode(STATE.dashSelectedGroup);
  let rows;
  try{
    const [sch,log]=await Promise.all([
      db.collection('lecture-schedule').doc(code).get(),
      db.collection('teaching-log').where('groupCode','==',code).get()
    ]);
    rows=gschRowsFromOld(sch.exists?sch.data().rows:[],log.docs.map(d=>({id:d.id,...d.data()})));
  }catch(e){console.warn('[group-schedule] import failed',e);showToast('Couldn’t read the old data.','error');return;}
  if(!rows.length){showToast('No old schedule or teaching entries for this group.','warning',4000);return;}
  const ok=await showModal({icon:'📥',type:'info',title:'Import '+rows.length+' lectures?',body:'Students in '+code+' will see them on My Group. Old teaching notes are not copied. Times are empty, so add them afterwards.',confirmText:'Import',cancelText:'Cancel'});
  if(!ok)return;
  if(await gschCommit(code,cur=>{if(!cur.rows.length)cur.rows=rows;return cur;},'Old lectures imported.'))render();
}

function gschChips(field,sectionId,selected){
  const sec=sect(Number(sectionId));
  if(!sec)return '<div style="font-size:11px;color:var(--muted-2)">Pick a section above to choose its units.</div>';
  return '<div class="gsch-units">'+sec.lessons.map((l,i)=>`<button type="button" class="gsch-chip${selected.includes(l.id)?' on':''}" onclick="gschToggleUnit('${field}','${l.id}')">${i+1}. ${esc(l.title)}</button>`).join('')+'</div>';
}
function gschSelectedText(ids){
  const names=ids.map(mgUnitInfo).filter(Boolean).map(x=>x.lesson.id+' '+x.lesson.title);
  return names.length?'<div class="dx-07">Selected: '+esc(names.join(' · '))+'</div>':'';
}
function gschFormHTML(d){
  const input='class="dx-05"';
  const secOpts=S.map(s=>`<option value="${s.id}" ${String(d.sectionId)===String(s.id)?'selected':''}>Sec ${s.id} — ${esc(s.title)}</option>`).join('');
  return `<div class="card" style="margin-bottom:12px">
    <div class="dx-10">${d.id?'✏️ Edit lecture':'➕ Add a lecture'}</div>
    <div class="gsch-grid">
      <div><label class="dx-02">Lecture # *</label><input ${input} type="number" min="1" value="${esc(d.lectureNumber)}" oninput="gschSet('lectureNumber',this.value)"></div>
      <div><label class="dx-02">Date *${d.date?' · '+esc(mgDayName(d.date)):''}</label><input ${input} type="date" value="${esc(d.date)}" onchange="gschSet('date',this.value);render()"></div>
      <div><label class="dx-02">Time (Cairo)</label><input ${input} type="time" value="${esc(d.time)}" oninput="gschSet('time',this.value)"></div>
      <div><label class="dx-02">Status</label><select ${input} onchange="gschSetStatus(this.value)">
        <option value="planned" ${d.status==='planned'?'selected':''}>Planned</option><option value="done" ${d.status==='done'?'selected':''}>Done</option><option value="postponed" ${d.status==='postponed'?'selected':''}>Postponed</option></select></div>
    </div>
    <div class="dx-03"><label class="dx-02">Section (switch it to pick units from more than one section)</label><select ${input} onchange="gschSetSection(this.value)"><option value="">— choose —</option>${secOpts}</select></div>
    <div class="dx-03"><label class="dx-02">Planned units (${d.plannedUnitIds.length})</label>${gschChips('plannedUnitIds',d.sectionId,d.plannedUnitIds)}${gschSelectedText(d.plannedUnitIds)}</div>
    ${d.status==='done'?`<div class="dx-03"><label class="dx-02">Actual units covered * (${d.actualUnitIds.length}) — these feed Question of the Day</label>${gschChips('actualUnitIds',d.sectionId,d.actualUnitIds)}${gschSelectedText(d.actualUnitIds)}</div>`:''}
    <div class="dx-03"><label class="dx-02">Note (students can see it)</label><textarea ${input} rows="2" maxlength="500" dir="auto" oninput="gschSet('note',this.value)">${esc(d.note)}</textarea></div>
    <div class="gsch-actions"><button class="dx-14" style="flex:1" onclick="gschSave()">💾 Save lecture</button>${d.id?'<button class="sub-nav-btn" onclick="gschCancel()">Cancel</button>':''}</div>
  </div>`;
}
function gschRowHTML(r){
  const today=mgTodayCairo();
  const ids=r.status==='done'?r.actualUnitIds:r.plannedUnitIds;
  const names=(ids||[]).map(mgUnitInfo).filter(Boolean).map(x=>x.lesson.id+' '+x.lesson.title);
  const sec=sect(Number(r.sectionId));
  const label={done:'✓ Done',postponed:'Postponed',planned:r.date&&r.date<today?'Needs update':'Planned'}[r.status]||r.status;
  return `<div class="card" style="margin-bottom:8px">
    <div style="display:flex;justify-content:space-between;gap:8px"><b style="font-size:13px">L${esc(String(r.lectureNumber))} · ${r.date?esc(mgDayName(r.date)+', '+mgDateText(r.date)):'No date'}${r.time?' · '+esc(mgTimeText(r.time)):''}</b><span class="dx-11">${esc(label)}</span></div>
    <div class="dx-07">${names.length?esc(names.join(' · ')):(sec?esc(sec.title):'—')}</div>
    ${r.note?`<div class="dx-07" dir="auto">📝 ${esc(r.note)}</div>`:''}
    <div class="gsch-actions">
      ${r.status!=='done'?`<button class="sub-nav-btn" onclick="gschEdit('${esc(r.id)}','done')">✓ Mark done</button>`:''}
      ${r.status==='planned'?`<button class="sub-nav-btn" onclick="gschEdit('${esc(r.id)}','postponed')">⏸ Postpone</button>`:''}
      <button class="sub-nav-btn" onclick="gschEdit('${esc(r.id)}')">✏️ Edit</button>
      <button class="sub-nav-btn" onclick="gschDelete('${esc(r.id)}')">🗑️ Delete</button>
    </div>
  </div>`;
}
function renderDashGroupSchedule(){
  const code=mgNormalizeCode(STATE.dashSelectedGroup);
  const cache=STATE.dashGsByGroup[code];
  if(!cache){loadDashGroupSchedule(code);return `<div class="dx-01">${renderDashSkeleton()}</div>`;}
  if(cache.loading)return `<div class="dx-01">${renderDashSkeleton()}</div>`;
  if(cache.error)return `<div class="dx-01"><div class="dash-warn">Couldn’t load the schedule${cache.error==='permission-denied'?'. Publish the new Firestore rules, then retry':''}.</div><button class="sub-nav-btn" onclick="gschReload()">↻ Retry</button></div>`;
  // A form opened for another group is never carried across.
  if(!STATE.dashGsDraft||STATE.dashGsDraft.group!==code||(!STATE.dashGsDraft.id&&!STATE.dashGsDraft.date&&!STATE.dashGsDraft.plannedUnitIds.length&&!STATE.dashGsDraft.sectionId&&!STATE.dashGsDraft.note)){
    STATE.dashGsDraft=Object.assign(gschBlank(cache.rows),{group:code});
  }
  const rows=mgSortRows(cache.rows);
  return `<div class="dx-01">
    ${gschFormHTML(STATE.dashGsDraft)}
    <div class="card" style="margin-bottom:12px"><label class="dx-02">Roadmap note for ${esc(code)} (optional, shown above the study roadmap)</label>
      <textarea class="dx-05" rows="2" maxlength="1000" dir="auto" oninput="gschNoteInput(this.value)">${esc(cache.noteDraft)}</textarea>
      <div class="gsch-actions"><button class="sub-nav-btn" onclick="gschSaveNote()">💾 Save note</button></div></div>
    ${rows.length?`<div class="dx-10">Lectures (${rows.length})</div>${rows.map(gschRowHTML).join('')}`
      :`<div class="card" style="text-align:center"><div class="dx-07" style="margin-bottom:8px">No lectures yet for ${esc(code)}. Add one above, or copy your old Schedule and Actual Teaching entries.</div><button class="sub-nav-btn" onclick="gschImportOld()">📥 Import old lectures</button></div>`}
    <div class="dx-04"></div>
  </div>`;
}

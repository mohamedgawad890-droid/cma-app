// ─── CASE STUDY TAB (Batch 35) ────────────────────────────────────────────────
// One fictional company (Delta Oak Furniture Co.) used across Cost (Section 4),
// Budget (Section 2) and Variance (Section 3). 40 units, one per taught unit.
//
// WHO SEES IT: the instructor, and students with an APPROVED group code
// (students/{uid}.groupCode is only ever set by the instructor's Approvals action).
//
// WHERE THE CONTENT LIVES: Firestore, NOT the public repo.
//   case-study/_index   { company:{name,blurb}, sections:[{id,title,units:[{id,title,ref}]}], version }
//   case-study/{unitId} { id,sec,title,ref,scenario,data[],tasks[],solution[],takeaway{en,ar},lesson }
// Firestore rules allow read only to the instructor and to students whose own
// students/{uid} doc has a non-empty groupCode; only the instructor can write.
// So hiding the tab is a convenience — the rule is the real protection.
//
// Firestore reads per student session: 1 (index) + 1 per unit opened. Everything is
// cached in memory for the session. Students who are offline see a retry message.
//
// The instructor loads the content with the "Upload content file" button on this tab
// (file: case-study-content.json, kept OUT of the repo).
const _cs = { idx:null, idxP:null, docs:{}, sel:null, shown:{}, err:null, uploading:false };

function caseStudyAllowed(){
  if(!STATE.user) return false;
  if(isInstructor()) return true;
  const st = loadStudent();
  return !!(st && st.groupCode && String(st.groupCode).trim());
}

function _csDone(){ try{ return JSON.parse(localStorage.getItem('cma-case-v1')||'{}')||{}; }catch(_){ return {}; } }
function _csMarkDone(id){ try{ const d=_csDone(); d[id]=1; localStorage.setItem('cma-case-v1',JSON.stringify(d)); }catch(_){} }

function _csLoadIndex(){
  if(_cs.idxP) return _cs.idxP;
  _cs.idxP = db.collection('case-study').doc('_index').get().then(function(s){
    _cs.idx = s.exists ? s.data() : { missing:true };
    _cs.err = null;
    return _cs.idx;
  }).catch(function(e){
    _cs.idxP = null; _cs.err = (e && e.code) || 'error';
    return null;
  });
  return _cs.idxP;
}
function _csLoadUnit(id){
  if(_cs.docs[id] && _cs.docs[id].data) return Promise.resolve(_cs.docs[id].data);
  if(_cs.docs[id] && _cs.docs[id].p) return _cs.docs[id].p;
  const p = db.collection('case-study').doc(id).get().then(function(s){
    _cs.docs[id] = { data: s.exists ? s.data() : { missing:true } };
    return _cs.docs[id].data;
  }).catch(function(e){
    delete _cs.docs[id]; _cs.err = (e && e.code) || 'error'; return null;
  });
  _cs.docs[id] = { p:p };
  return p;
}

function _csAllUnits(){
  const out = [];
  if(_cs.idx && Array.isArray(_cs.idx.sections)) _cs.idx.sections.forEach(function(s){
    (s.units||[]).forEach(function(u){ out.push({ id:u.id, sec:s.id }); });
  });
  return out;
}

// ── Block renderer (all text escaped) ────────────────────────────────────────
function _csBlock(b){
  if(!b || !b.t) return '';
  switch(b.t){
    case 'h': return '<div style="font-size:14px;font-weight:600;color:var(--ink);margin:14px 0 6px">'+esc(b.v)+'</div>';
    case 'p': return '<div style="font-size:14px;line-height:1.65;color:#444;margin:8px 0">'+esc(b.v)+'</div>';
    case 'tip': return '<div style="background:var(--warn-tint);border-left:3px solid var(--warn);border-radius:8px;padding:10px 12px;margin:10px 0;font-size:13px;line-height:1.55;color:var(--warn-strong)">💡 '+esc(b.v)+'</div>';
    case 'f': return '<div style="background:var(--brand-tint);border-radius:8px;padding:9px 12px;margin:10px 0;font-size:13px;color:var(--brand)"><b>'+esc(b.l)+':</b> '+esc(b.v)+'</div>';
    case 'steps': return '<ol style="margin:8px 0 8px 20px;padding:0;font-size:14px;line-height:1.65;color:#444">'+(b.items||[]).map(function(x){return '<li style="margin-bottom:6px">'+esc(x)+'</li>';}).join('')+'</ol>';
    case 'tbl': {
      const rows = b.r || [];
      return (b.cap?'<div style="font-size:12px;color:#888;margin:10px 0 -6px">'+esc(b.cap)+'</div>':'')+
        '<div class="tbl-wrap"><table class="tbl"><thead><tr>'+(b.h||[]).map(function(h){return '<th style="background:var(--brand-tint);color:var(--brand);font-size:13px">'+esc(h)+'</th>';}).join('')+'</tr></thead><tbody>'+
        rows.map(function(row,ri){
          const last = b.total && ri===rows.length-1;
          return '<tr>'+row.map(function(c){return '<td style="font-size:13px;'+(last?'font-weight:600;color:var(--ink)':'')+'">'+esc(c)+'</td>';}).join('')+'</tr>';
        }).join('')+'</tbody></table></div>';
    }
  }
  return '';
}

function _csSecMeta(id){
  const s = (typeof S!=='undefined' && S.find) ? S.find(function(x){return x.id===id;}) : null;
  return s || { emoji:'📊', title:'', text:'var(--brand)' };
}

// ── Screens ──────────────────────────────────────────────────────────────────
function renderCaseStudy(){
  const head = function(sub){ return '<div class="sh"><h2>💼 Case Study</h2><p>'+esc(sub)+'</p></div>'; };
  if(!caseStudyAllowed()){
    return head('Delta Oak Furniture Co.')+'<div class="scroll-area pad" style="padding-top:20px"><div class="card" style="text-align:center;padding:28px 18px"><div style="font-size:34px;margin-bottom:8px">🔒</div><div style="font-size:14px;color:#555;line-height:1.6">The Case Study is available to students in an instructor group. Enter your group code in your Profile and wait for approval.</div></div></div>';
  }
  if(!_cs.idx){
    if(!_cs.idxP) _csLoadIndex().then(function(){ if(STATE.tab==='case-study') render(); });
    const msg = _cs.err
      ? (_cs.err==='permission-denied' ? 'Your group access is not active yet. Ask your instructor to approve your group code.' : 'Could not load the case study. Check your connection and try again.')
      : 'Loading…';
    return head('Delta Oak Furniture Co.')+'<div class="scroll-area pad" style="padding-top:20px"><div class="card" style="text-align:center;padding:28px 18px;font-size:14px;color:#666">'+esc(msg)+(_cs.err?'<br><button onclick="_cs.err=null;_cs.idxP=null;render()" style="margin-top:12px;padding:8px 16px;border-radius:8px;border:.5px solid var(--brand);background:#fff;color:var(--brand);font-size:13px;cursor:pointer;font-family:inherit">Retry</button>':'')+'</div></div>';
  }
  if(_cs.idx.missing){
    return head('Delta Oak Furniture Co.')+'<div class="scroll-area pad" style="padding-top:20px">'+
      (isInstructor()?_csUploadPanel():'<div class="card" style="text-align:center;padding:28px 18px;font-size:14px;color:#666">The case study is being prepared. Please check back soon.</div>')+'</div>';
  }
  if(_cs.sel) return renderCaseUnit();
  return renderCaseList(head);
}

function renderCaseList(head){
  const done = _csDone();
  const co = _cs.idx.company || {};
  const secs = (_cs.idx.sections||[]).map(function(sec){
    const m = _csSecMeta(sec.id);
    return '<div style="margin-bottom:18px"><div style="font-size:13px;font-weight:600;color:'+(m.text||'var(--brand)')+';margin-bottom:8px">'+(m.emoji||'')+' '+esc(sec.title)+' <span style="font-weight:400;color:#999">· '+(sec.units||[]).length+' units</span></div>'+
      (sec.units||[]).map(function(u,i){
        return '<button onclick="caseOpen(\''+esc(u.id)+'\')" style="display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:#fff;border:.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px;cursor:pointer;font-family:inherit">'+
          '<span style="font-size:11px;font-weight:600;color:var(--brand);background:var(--brand-tint);border-radius:6px;padding:3px 7px;flex-shrink:0">'+esc(u.id)+'</span>'+
          '<span style="flex:1;font-size:14px;color:var(--ink)">'+esc(u.title)+'</span>'+
          (done[u.id]?'<span style="color:var(--ok);font-size:14px">✓</span>':'<span style="color:#bbb">›</span>')+'</button>';
      }).join('')+'</div>';
  }).join('');
  return head(co.name||'Delta Oak Furniture Co.')+
    '<div class="scroll-area pad" style="padding-top:14px">'+
    '<div class="card" style="font-size:13px;line-height:1.6;color:#555">'+esc(co.blurb||'')+'</div>'+
    '<div style="font-size:12px;color:#888;margin:0 2px 14px">Teaching order: Cost → Budget → Variance. Try each task first, then tap <b>Show solution</b>.</div>'+
    secs+(isInstructor()?_csUploadPanel():'')+'<div style="height:24px"></div></div>';
}

function renderCaseUnit(){
  const id = _cs.sel;
  const ent = _cs.docs[id];
  const back = '<button onclick="caseBack()" style="border:none;background:none;color:var(--brand);font-size:13px;cursor:pointer;font-family:inherit;padding:0">‹ All case units</button>';
  if(!ent || !ent.data){
    if(!ent) _csLoadUnit(id).then(function(){ if(STATE.tab==='case-study') render(); });
    return '<div class="sh">'+back+'</div><div class="scroll-area pad" style="padding-top:20px"><div class="card" style="text-align:center;padding:28px;font-size:14px;color:#666">'+(_cs.err?'Could not load this unit. Check your connection.<br><button onclick="_cs.err=null;delete _cs.docs[\''+esc(id)+'\'];render()" style="margin-top:12px;padding:8px 16px;border-radius:8px;border:.5px solid var(--brand);background:#fff;color:var(--brand);font-size:13px;cursor:pointer;font-family:inherit">Retry</button>':'Loading…')+'</div></div>';
  }
  const u = ent.data;
  if(u.missing) return '<div class="sh">'+back+'</div><div class="scroll-area pad" style="padding-top:20px"><div class="card" style="text-align:center;padding:28px;font-size:14px;color:#666">This unit is not available yet.</div></div>';
  const m = _csSecMeta(u.sec);
  const all = _csAllUnits(); const ix = all.findIndex(function(x){return x.id===id;});
  const prev = ix>0?all[ix-1]:null, next = ix>=0&&ix<all.length-1?all[ix+1]:null;
  const shown = !!_cs.shown[id];
  const tasks = (u.tasks||[]).map(function(t,i){ return '<li style="margin-bottom:6px">'+esc(t)+'</li>'; }).join('');
  const sol = shown
    ? '<div class="card" style="border-color:var(--ok);margin-top:12px"><div style="font-size:12px;font-weight:600;color:var(--ok-strong);margin-bottom:4px">SOLUTION</div>'+(u.solution||[]).map(_csBlock).join('')+'</div>'
    : '<button onclick="caseToggle(\''+esc(id)+'\')" style="width:100%;margin-top:12px;padding:13px;border-radius:12px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Show solution</button>';
  const tk = u.takeaway || {};
  const navBtn = function(x,label,arrow){
    return x?'<button onclick="caseOpen(\''+esc(x.id)+'\')" style="flex:1;padding:11px 8px;border-radius:10px;border:.5px solid var(--border-4);background:var(--surface-3);color:#555;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">'+arrow(label,x.id)+'</button>':'<span style="flex:1"></span>';
  };
  return '<div class="sh">'+back+'<h2 style="margin-top:6px">'+esc(u.title||'')+'</h2><p>'+(m.emoji||'')+' '+esc(m.title||'')+' · Unit '+esc(u.id)+' · IMA '+esc(u.ref||'')+'</p></div>'+
    '<div class="scroll-area pad" style="padding-top:14px">'+
    '<div class="card"><div style="font-size:12px;font-weight:600;color:var(--brand);margin-bottom:4px">THE SITUATION</div><div style="font-size:14px;line-height:1.65;color:#444">'+esc(u.scenario||'')+'</div></div>'+
    (u.data&&u.data.length?'<div class="card">'+(u.data||[]).map(_csBlock).join('')+'</div>':'')+
    '<div class="card"><div style="font-size:12px;font-weight:600;color:var(--brand);margin-bottom:4px">YOUR TASK</div><ol style="margin:6px 0 0 20px;padding:0;font-size:14px;line-height:1.6;color:#444">'+tasks+'</ol></div>'+
    sol+
    (shown?'<div class="card" style="background:var(--brand-tint);border-color:transparent;margin-top:12px"><div style="font-size:12px;font-weight:600;color:var(--brand);margin-bottom:6px">KEY TAKEAWAY</div><div style="font-size:14px;line-height:1.6;color:var(--ink)">'+esc(tk.en||'')+'</div><div dir="rtl" lang="ar" style="font-size:15px;line-height:1.9;color:var(--ink);margin-top:8px;text-align:right">'+esc(tk.ar||'')+'</div></div>':'')+
    '<div style="display:flex;gap:8px;margin:14px 0 8px">'+
      '<button onclick="studyGo('+Number(u.sec)+',\''+esc(u.lesson||u.id)+'\')" style="flex:1;padding:11px 8px;border-radius:10px;border:.5px solid var(--brand);background:#fff;color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">📚 Open lesson '+esc(u.lesson||u.id)+'</button></div>'+
    '<div style="display:flex;gap:8px;margin-bottom:24px">'+
      navBtn(prev,'',function(l,i){return '‹ '+i;})+navBtn(next,'',function(l,i){return i+' ›';})+'</div>'+
    '</div>';
}

// ── Actions ──────────────────────────────────────────────────────────────────
function caseOpen(id){
  if(!caseStudyAllowed()) return;
  _cs.sel = id; STATE.tab = 'case-study'; render();
  const sc = document.querySelector('#content-area .scroll-area'); if(sc) sc.scrollTop = 0;
}
function caseBack(){ _cs.sel = null; render(); }
function caseToggle(id){
  _cs.shown[id] = true; _csMarkDone(id); render();
  setTimeout(function(){ const el = document.querySelector('#content-area .scroll-area'); if(el) el.scrollTop = Math.max(0, el.scrollTop); }, 0);
}

// ── Instructor: upload the content file into Firestore ─────────────────────────
function _csUploadPanel(){
  return '<div class="card" style="margin-top:6px"><div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:4px">🛠️ Instructor: content upload</div>'+
    '<div style="font-size:12px;color:#888;line-height:1.5;margin-bottom:10px">Choose <b>case-study-content.json</b> to publish or replace the case study for your groups. Students read it from Firestore; the file itself is never stored in the public repo.</div>'+
    '<input id="cs-file" type="file" accept=".json,application/json" style="font-size:13px;margin-bottom:10px;max-width:100%">'+
    '<button onclick="caseUpload()" '+(_cs.uploading?'disabled ':'')+'style="width:100%;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;'+(_cs.uploading?'opacity:.6':'')+'">'+(_cs.uploading?'Uploading…':'Upload content file')+'</button></div>';
}

async function caseUpload(){
  if(!isInstructor()) return;
  const inp = document.getElementById('cs-file');
  const file = inp && inp.files && inp.files[0];
  if(!file){ showToast('Choose case-study-content.json first','info',2500); return; }
  let data;
  try{ data = JSON.parse(await file.text()); }catch(e){ showToast('That file is not valid JSON','error',3500); return; }
  // Shape checks — refuse anything unexpected so a wrong file can never wipe the case study.
  const idx = data && data.index, docs = data && data.docs;
  const ids = docs && typeof docs==='object' ? Object.keys(docs) : [];
  if(!idx || !Array.isArray(idx.sections) || !ids.length || ids.length>80 || ids.some(function(k){return !/^[0-9]-[0-9]{1,2}$/.test(k) || docs[k].id!==k;})){
    showToast('File does not look like the case-study content','error',4000); return;
  }
  const listed = []; idx.sections.forEach(function(s){ (s.units||[]).forEach(function(u){ listed.push(u.id); }); });
  if(listed.some(function(i){return ids.indexOf(i)===-1;})){ showToast('Index lists a unit that is missing from the file','error',4000); return; }
  _cs.uploading = true; render();
  try{
    const batch = db.batch();
    batch.set(db.collection('case-study').doc('_index'), Object.assign({}, idx, { version: Date.now() }));
    ids.forEach(function(k){ batch.set(db.collection('case-study').doc(k), docs[k]); });
    await batch.commit();
    _cs.idx = null; _cs.idxP = null; _cs.docs = {}; _cs.sel = null;
    showToast('Case study published ('+ids.length+' units)','success',3500);
  }catch(e){
    console.error('[case-study] upload failed', e);
    showToast('Upload failed: '+((e&&e.code)||'error'),'error',5000);
  }
  _cs.uploading = false; render();
}

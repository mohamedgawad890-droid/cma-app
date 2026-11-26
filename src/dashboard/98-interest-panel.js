// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 36 — DASHBOARD "INTEREST" TAB (exam-prep group interest list)
// ═══════════════════════════════════════════════════════════════════════════
// Lists the students who registered interest in the May/June 2027 exam-prep group
// (collection `group-interest`, instructor-only read — see firestore.rules).
// The tab is registered in 00-dash-shell.js.

async function loadDashInterest(){
  STATE.dashInterest={loading:true,loaded:false,rows:[]};
  try{
    const snap=await db.collection('group-interest').orderBy('createdAt','desc').limit(1000).get();
    const rows=[];snap.forEach(d=>rows.push(Object.assign({_id:d.id},d.data())));
    STATE.dashInterest={loading:false,loaded:true,rows};
    STATE.dashInterestN=rows.length;
  }catch(e){
    STATE.dashInterest={loading:false,loaded:true,rows:[],error:e.message};
  }
  if(STATE.tab==='dashboard')render();
}
function _interestCsvCell(v){
  let s=String(v==null?'':v).replace(/\r?\n/g,' ');
  if(/^[=+\-@]/.test(s))s="'"+s;            // keep spreadsheets from treating text as a formula
  return '"'+s.replace(/"/g,'""')+'"';
}
function interestCopyCsv(){
  if(!STATE.dashGroupsLoaded){showToast('Student groups are still loading. Try again in a moment.','info');return;}
  const rows=((STATE.dashInterest&&STATE.dashInterest.rows)||[]);
  if(!rows.length){showToast('Nothing to copy yet.','info');return;}
  const lines=[['Name','Group','Email','WhatsApp','Note','Registered'].map(_interestCsvCell).join(',')];
  rows.forEach(r=>{
    const when=(r.createdAt&&r.createdAt.toDate)?r.createdAt.toDate().toISOString().slice(0,10):'';
    lines.push([r.name,dashGroupInfo(r._id).text,r.email,r.whatsapp,r.note,when].map(_interestCsvCell).join(','));
  });
  const text=lines.join('\n');
  const done=ok=>showToast(ok?rows.length+' rows copied — paste into Sheets/Excel':'Couldn’t copy. Try again.',ok?'success':'error');
  const legacy=()=>{try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');document.body.removeChild(ta);done(!!ok);}catch(_){done(false);}};
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>done(true),legacy);
    else legacy();
  }catch(_){legacy();}
}
async function interestDelete(id){
  const ok=await showModal({icon:'\u{1F5D1}️',title:'Remove this student from the list?',body:'It can’t be recovered.',type:'warning',confirmText:'Remove',cancelText:'Cancel'});
  if(!ok)return;
  try{
    await db.collection('group-interest').doc(id).delete();
    const st=STATE.dashInterest;
    if(st)st.rows=st.rows.filter(r=>r._id!==id);
    STATE.dashInterestN=st?st.rows.length:0;
    render();
  }catch(e){showToast('Couldn’t remove: '+e.message,'error');}
}

function renderDashInterest(){
  const st=STATE.dashInterest;
  if(!st||(!st.loaded&&!st.loading)){loadDashInterest();return renderDashSkeleton();}
  if(st.loading)return renderDashSkeleton();
  if(st.error)return '<div class="card" style="margin:12px">Couldn’t load the list: '+esc(st.error)+'</div>';

  const rows=st.rows;
  const head='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 12px 8px;flex-wrap:wrap">'
    +'<div style="font-size:13px;color:var(--muted)">'+rows.length+' registered · May/June 2027 window</div>'
    +'<div style="display:flex;gap:6px"><button class="sub-nav-btn" onclick="loadDashInterest()">↻ Refresh</button>'
    +(rows.length?'<button class="sub-nav-btn" onclick="interestCopyCsv()">\u{1F4CB} Copy as CSV</button>':'')+'</div></div>';
  if(!rows.length)return head+'<div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:14px">No one has registered yet.</div>';

  const body=rows.map(r=>{
    const when=(r.createdAt&&r.createdAt.toDate)?r.createdAt.toDate().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
    const wa=String(r.whatsapp||'');
    const stu=(STATE.dashStudents||[]).find(x=>x.uid===r._id);
    const targets=dashWaTargets(wa,stu&&stu.country);
    const links=targets.map(t=>'<a class="dt-wa" href="https://wa.me/'+t.num+'" target="_blank" rel="noopener">WhatsApp'+(t.label?' '+t.label:'')+'</a>').join(' ');
    return '<tr>'
      +'<td class="dt-main"><span dir="auto">'+esc(r.name||'Student')+'</span></td>'
      +'<td data-label="Group">'+dashGroupBadge(r._id)+'</td>'
      +'<td data-label="WhatsApp"><span dir="ltr">'+esc(wa)+'</span> '+(links||(wa?'<span class="dt-hint">add country code</span>':''))+'</td>'
      +'<td data-label="Email" dir="ltr">'+esc(r.email||'\u2014')+'</td>'
      +'<td data-label="Note" class="dt-note" dir="auto">'+esc(r.note||'\u2014')+'</td>'
      +'<td data-label="Registered">'+esc(when)+'</td>'
      +'<td class="dt-actions"><button class="sub-nav-btn" onclick="interestDelete(\''+esc(r._id)+'\')">\u{1F5D1}\uFE0F Remove</button></td>'
      +'</tr>';
  }).join('');
  return head+'<div class="dt-wrap"><table class="dtable"><thead><tr><th>Name</th><th>Group</th><th>WhatsApp</th><th>Email</th><th>Note</th><th>Registered</th><th></th></tr></thead><tbody>'+body+'</tbody></table></div>';
}

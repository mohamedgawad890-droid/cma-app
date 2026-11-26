// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 36 — DASHBOARD "INTEREST" TAB (exam-prep group interest list)
// ═══════════════════════════════════════════════════════════════════════════
// Lists the students who registered interest in the May/June 2027 exam-prep group
// (collection `group-interest`, instructor-only read — see firestore.rules).
// The tab is registered in 00-dash-shell.js.
// Follow-up status and payments live in `interest-followup/{uid}`, which only the
// instructor can read or write. (Students can read their own `group-interest` doc.)
const INTEREST_PRICE=5000, INTEREST_DEPOSIT=1000, INTEREST_BALANCE_DUE='2027-02-01';
const INTEREST_STATUSES=[['new','New'],['contacted','Contacted'],['deposit','Deposit paid'],['paid','Fully paid']];
const INTEREST_AMOUNT={new:0,contacted:0,deposit:INTEREST_DEPOSIT,paid:INTEREST_PRICE};
function interestFollow(id){
  const f=((STATE.dashInterest&&STATE.dashInterest.follow)||{})[id];
  const status=f&&INTEREST_AMOUNT[f.status]!==undefined?f.status:'new';
  const paid=f&&typeof f.paid==='number'?f.paid:INTEREST_AMOUNT[status];
  return {status,paid,balance:status==='deposit'?Math.max(0,INTEREST_PRICE-paid):0};
}
function interestStatusLabel(s){return (INTEREST_STATUSES.find(x=>x[0]===s)||['','New'])[1];}
function interestMoney(n){return Number(n||0).toLocaleString('en-US')+' EGP';}
function interestSetFilter(f){STATE.dashInterestFilter=f;render();}
async function interestSetStatus(id,status){
  const st=STATE.dashInterest;
  if(!st||st.followError||INTEREST_AMOUNT[status]===undefined){render();return;}
  const old=interestFollow(id);
  if(old.status===status)return;
  const amount=INTEREST_AMOUNT[status];
  const row=st.rows.find(r=>r._id===id)||{};
  if(old.paid>0||amount>0){
    const ok=await showModal({icon:'\u{1F4B5}',title:'Change payment status?',body:(row.name||'Student')+': '+interestStatusLabel(old.status)+' \u2192 '+interestStatusLabel(status)+'. Recorded amount: '+interestMoney(old.paid)+' \u2192 '+interestMoney(amount)+'.',type:'warning',confirmText:'Save',cancelText:'Cancel'});
    if(!ok){render();return;}
  }
  try{
    const data={status,paid:amount,updatedAt:new Date().toISOString(),by:STATE.user.uid};
    await db.collection('interest-followup').doc(id).set(data);
    st.follow[id]=data;
    showToast('Saved.','success');
  }catch(e){showToast('Couldn\u2019t save: '+e.message,'error');}
  render();
}
function renderInterestSummary(rows){
  const f=rows.map(r=>interestFollow(r._id));
  const count=s=>f.filter(x=>x.status===s).length;
  const reserved=count('deposit')+count('paid');
  const collected=f.reduce((t,x)=>t+x.paid,0);
  const outstanding=f.reduce((t,x)=>t+x.balance,0);
  const overdue=dashToday()>INTEREST_BALANCE_DUE&&outstanding>0;
  const card=(v,l,h)=>'<div class="dash-stat static"><b>'+v+'</b><span>'+l+'</span><small>'+h+'</small></div>';
  const active=STATE.dashInterestFilter||'all';
  const chip=(v,l,n)=>'<button class="sub-nav-btn'+(active===v?' active':'')+'" onclick="interestSetFilter(\''+v+'\')">'+l+' ('+n+')</button>';
  return '<div class="dash-grid money">'
    +card(reserved,'Reserved seats','Deposit or full payment')
    +card(interestMoney(reserved*INTEREST_DEPOSIT),'Deposits received',interestMoney(INTEREST_DEPOSIT)+' per reserved seat')
    +card(interestMoney(collected),'Total collected','Deposits and balances')
    +card(interestMoney(outstanding),'Balance outstanding',overdue?'Overdue since 1 Feb 2027':'Due by 1 Feb 2027')
    +'</div><div class="dt-filters" style="padding:6px 14px 0">'+chip('all','All',rows.length)+INTEREST_STATUSES.map(x=>chip(x[0],x[1],count(x[0]))).join('')+'</div>';
}

async function loadDashInterest(){
  STATE.dashInterest={loading:true,loaded:false,rows:[]};
  try{
    const snap=await db.collection('group-interest').orderBy('createdAt','desc').limit(1000).get();
    const rows=[];snap.forEach(d=>rows.push(Object.assign({_id:d.id},d.data())));
    const follow={};let followError='';
    try{const fs=await db.collection('interest-followup').get();fs.forEach(d=>{follow[d.id]=d.data();});}
    catch(e){followError=e.message||'unavailable';}
    STATE.dashInterest={loading:false,loaded:true,rows,follow,followError};
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
function interestCsvFollow(id){
  if(STATE.dashInterest.followError)return ['Unavailable','',''];
  const f=interestFollow(id);return [interestStatusLabel(f.status),f.paid,f.balance];
}
function interestCopyCsv(){
  if(!STATE.dashGroupsLoaded){showToast('Student groups are still loading. Try again in a moment.','info');return;}
  const rows=((STATE.dashInterest&&STATE.dashInterest.rows)||[]);
  if(!rows.length){showToast('Nothing to copy yet.','info');return;}
  const lines=[['Name','Group','Email','WhatsApp','Note','Registered','Status','Paid EGP','Balance EGP'].map(_interestCsvCell).join(',')];
  rows.forEach(r=>{
    const when=(r.createdAt&&r.createdAt.toDate)?r.createdAt.toDate().toISOString().slice(0,10):'';
    lines.push([r.name,dashGroupInfo(r._id).text,r.email,r.whatsapp,r.note,when,...interestCsvFollow(r._id)].map(_interestCsvCell).join(','));
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
  if(!STATE.dashInterest||STATE.dashInterest.followError){showToast('Payment records are unavailable, so removing is turned off.','error');return;}
  if(interestFollow(id).paid>0){showToast('This student has a recorded payment. Change the status first.','error',5000);return;}
  const ok=await showModal({icon:'\u{1F5D1}️',title:'Remove this student from the list?',body:'It can’t be recovered.',type:'warning',confirmText:'Remove',cancelText:'Cancel'});
  if(!ok)return;
  try{
    await db.collection('group-interest').doc(id).delete();
    if(STATE.dashInterest.follow[id]){
      try{await db.collection('interest-followup').doc(id).delete();delete STATE.dashInterest.follow[id];}catch(e){console.warn('[interest-followup] delete failed',e);}
    }
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
    +'<div class="dx-23">'+rows.length+' registered · May/June 2027 window</div>'
    +'<div class="dx-24"><button class="sub-nav-btn" onclick="loadDashInterest()">↻ Refresh</button>'
    +(rows.length?'<button class="sub-nav-btn" onclick="interestCopyCsv()">\u{1F4CB} Copy as CSV</button>':'')+'</div></div>';
  if(!rows.length)return head+'<div class="dx-25">No one has registered yet.</div>';

  const filter=STATE.dashInterestFilter||'all';
  const shown=st.followError||filter==='all'?rows:rows.filter(r=>interestFollow(r._id).status===filter);
  const summary=st.followError
    ?'<div class="dash-warn">Payment follow-up is unavailable. Publish the new Firestore rules, then press Refresh.<br><small dir="ltr">'+esc(st.followError)+'</small></div>'
    :renderInterestSummary(rows);
  const body=shown.map(r=>{
    const when=(r.createdAt&&r.createdAt.toDate)?r.createdAt.toDate().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
    const wa=String(r.whatsapp||'');
    const stu=(STATE.dashStudents||[]).find(x=>x.uid===r._id);
    const targets=dashWaTargets(wa,stu&&stu.country);
    const links=targets.map(t=>'<a class="dt-wa" href="https://wa.me/'+t.num+'" target="_blank" rel="noopener">WhatsApp'+(t.label?' '+t.label:'')+'</a>').join(' ');
    return '<tr>'
      +'<td class="dt-main"><span dir="auto">'+esc(r.name||'Student')+'</span></td>'
      +'<td data-label="Group">'+dashGroupBadge(r._id)+'</td>'
      +'<td data-label="Status">'+(st.followError?'\u2014':'<select class="dt-status s-'+interestFollow(r._id).status+'" onchange="interestSetStatus(\''+esc(r._id)+'\',this.value)">'+INTEREST_STATUSES.map(x=>'<option value="'+x[0]+'"'+(interestFollow(r._id).status===x[0]?' selected':'')+'>'+x[1]+'</option>').join('')+'</select>')+'</td>'
      +'<td data-label="WhatsApp"><span dir="ltr">'+esc(wa)+'</span> '+(links||(wa?'<span class="dt-hint">add country code</span>':''))+'</td>'
      +'<td data-label="Email" dir="ltr">'+esc(r.email||'\u2014')+'</td>'
      +'<td data-label="Note" class="dt-note" dir="auto">'+esc(r.note||'\u2014')+'</td>'
      +'<td data-label="Registered">'+esc(when)+'</td>'
      +'<td class="dt-actions"><button class="sub-nav-btn" onclick="interestDelete(\''+esc(r._id)+'\')">\u{1F5D1}\uFE0F Remove</button></td>'
      +'</tr>';
  }).join('');
  if(!shown.length)return head+summary+'<div class="dt-empty">No one has this status.</div>';
  return head+summary+'<div class="dt-wrap"><table class="dtable"><thead><tr><th>Name</th><th>Group</th><th>Status</th><th>WhatsApp</th><th>Email</th><th>Note</th><th>Registered</th><th></th></tr></thead><tbody>'+body+'</tbody></table></div>';
}

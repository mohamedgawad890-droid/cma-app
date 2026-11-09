// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 36 — DASHBOARD "INTEREST" TAB (exam-prep group interest list)
// ═══════════════════════════════════════════════════════════════════════════
// Lists the students who registered interest in the May/June 2027 exam-prep group
// (collection `group-interest`, instructor-only read — see firestore.rules).
// Same wrapper pattern as 99-feedback-panel.js: the original renderDashboard() runs
// first, this adds an "Interest" button to the sub-nav and swaps the body when the
// tab is selected. If the markup is not found, the original HTML is returned as is.
// To remove the tab: delete this one file.

async function loadDashInterest(){
  STATE.dashInterest={loading:true,loaded:false,rows:[]};
  try{
    const snap=await db.collection('group-interest').orderBy('createdAt','desc').limit(1000).get();
    const rows=[];snap.forEach(d=>rows.push(Object.assign({_id:d.id},d.data())));
    STATE.dashInterest={loading:false,loaded:true,rows};
  }catch(e){
    STATE.dashInterest={loading:false,loaded:true,rows:[],error:e.message};
  }
  if(STATE.tab==='dashboard')render();
}
// One light count query per session so the button can show how many registered.
function _interestEnsureCount(){
  if(STATE._intCountDone||STATE._intCounting||typeof db==='undefined')return;
  STATE._intCounting=true;
  db.collection('group-interest').get().then(snap=>{
    STATE.dashInterestN=snap.size;STATE._intCounting=false;STATE._intCountDone=true;
    if(STATE.tab==='dashboard')render();
  }).catch(()=>{STATE._intCounting=false;STATE._intCountDone=true;});
}

function _interestCsvCell(v){
  let s=String(v==null?'':v).replace(/\r?\n/g,' ');
  if(/^[=+\-@]/.test(s))s="'"+s;            // keep spreadsheets from treating text as a formula
  return '"'+s.replace(/"/g,'""')+'"';
}
function interestCopyCsv(){
  const rows=((STATE.dashInterest&&STATE.dashInterest.rows)||[]);
  if(!rows.length){showToast('Nothing to copy yet.','info');return;}
  const lines=[['Name','Email','WhatsApp','Note','Registered'].map(_interestCsvCell).join(',')];
  rows.forEach(r=>{
    const when=(r.createdAt&&r.createdAt.toDate)?r.createdAt.toDate().toISOString().slice(0,10):'';
    lines.push([r.name,r.email,r.whatsapp,r.note,when].map(_interestCsvCell).join(','));
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

  return head+rows.map(r=>{
    const when=(r.createdAt&&r.createdAt.toDate)?r.createdAt.toDate().toLocaleDateString():'';
    const wa=String(r.whatsapp||'');
    const digits=wa.replace(/\D/g,'');
    const intl=/^(\+|00)/.test(wa.trim());                 // wa.me needs the country code
    const waLink=intl&&digits?'https://wa.me/'+(wa.trim().startsWith('00')?digits.slice(2):digits):'';
    return '<div class="card" style="margin:0 12px 10px">'
      +'<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:4px">'
      +'<div style="font-size:14px;font-weight:600;color:var(--ink)">'+esc(r.name||'Student')+'</div>'
      +'<span style="font-size:11px;color:var(--muted)">'+esc(when)+'</span></div>'
      +'<div style="font-size:13px;color:var(--ink)" dir="ltr">'+esc(wa)
      +(waLink?' · <a href="'+esc(waLink)+'" target="_blank" rel="noopener" style="color:var(--brand-2)">WhatsApp</a>':'')+'</div>'
      +(r.email?'<div style="font-size:12px;color:var(--muted);margin-top:2px" dir="ltr">'+esc(r.email)+'</div>':'')
      +(r.note?'<div dir="auto" style="font-size:13px;line-height:1.6;color:var(--ink);margin-top:6px;white-space:pre-wrap;word-break:break-word">'+esc(r.note)+'</div>':'')
      +'<div style="margin-top:8px"><button class="sub-nav-btn" onclick="interestDelete(\''+esc(r._id)+'\')">\u{1F5D1}️ Remove</button></div>'
      +'</div>';
  }).join('');
}

(function(){
  'use strict';
  if(typeof renderDashboard!=='function')return;
  const _renderDashboard=renderDashboard;
  renderDashboard=function(){
    const html=_renderDashboard.apply(this,arguments);
    try{
      if(typeof html!=='string')return html;
      const i0=html.indexOf('<div class="sub-nav">');
      if(i0<0)return html;
      const i1=html.indexOf('</div>',i0);
      if(i1<0)return html;

      _interestEnsureCount();
      const isInt=STATE.dashTab==='interest';
      const n=STATE.dashInterestN||0;
      const btn='<button class="sub-nav-btn'+(isInt?' active':'')+'" onclick="STATE.dashTab=\'interest\';render()">\u{1F465} Interest'+(n?' · '+n:'')+'</button>';

      let nav=html.slice(i0,i1);
      if(isInt)nav=nav.replace(/sub-nav-btn active/g,'sub-nav-btn');
      let out=html.slice(0,i0)+nav+btn+html.slice(i1);

      if(isInt){
        const k=out.lastIndexOf('<div class="scroll-area">');
        if(k>=0)out=out.slice(0,k)+'<div class="scroll-area">'+renderDashInterest()+'</div>';
      }
      return out;
    }catch(_){
      return html;
    }
  };
})();

// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 29 — DASHBOARD "INBOX" TAB (student feedback & requests)
// ═══════════════════════════════════════════════════════════════════════════
// Shows what students send from the share/feedback popup (collection
// `app-feedback`, instructor-only read — see firestore.rules).
//
// Loads LAST in the dashboard bundle (99- prefix). It wraps renderDashboard()
// instead of editing it: the original runs first, then this adds an "Inbox"
// button to the sub-nav and, when that tab is selected, swaps the body.
// If the dashboard markup ever changes and the sub-nav is not found, the wrapper
// returns the original HTML untouched — the rest of the dashboard is unaffected.
// To remove the tab: delete this one file.

// ── Data ───────────────────────────────────────────────────────────────────
async function loadDashInbox(){
  STATE.dashInbox={loading:true,loaded:false,rows:[],filter:(STATE.dashInbox&&STATE.dashInbox.filter)||'all'};
  try{
    const snap=await db.collection('app-feedback').orderBy('createdAt','desc').limit(100).get();
    const rows=[];snap.forEach(d=>rows.push(Object.assign({_id:d.id},d.data())));
    STATE.dashInbox={loading:false,loaded:true,rows,filter:STATE.dashInbox.filter};
    STATE.dashInboxNew=rows.filter(r=>r.status==='new').length;
  }catch(e){
    STATE.dashInbox={loading:false,loaded:true,rows:[],error:e.message,filter:STATE.dashInbox.filter};
  }
  if(STATE.tab==='dashboard')render();
}
// One light query per session so the tab button can show an unread count.
function _inboxEnsureCount(){
  if(STATE._inboxCountDone||STATE._inboxCounting||typeof db==='undefined')return;
  STATE._inboxCounting=true;
  db.collection('app-feedback').where('status','==','new').limit(50).get().then(snap=>{
    STATE.dashInboxNew=snap.size;
    STATE._inboxCounting=false;STATE._inboxCountDone=true;
    if(STATE.tab==='dashboard')render();
  }).catch(()=>{STATE._inboxCounting=false;STATE._inboxCountDone=true;});
}
function inboxSetFilter(f){
  if(STATE.dashInbox)STATE.dashInbox.filter=f;
  render();
}
async function inboxMarkRead(id){
  try{
    await db.collection('app-feedback').doc(id).update({status:'read'});
    const row=((STATE.dashInbox&&STATE.dashInbox.rows)||[]).find(r=>r._id===id);
    if(row)row.status='read';
    STATE.dashInboxNew=((STATE.dashInbox&&STATE.dashInbox.rows)||[]).filter(r=>r.status==='new').length;
    render();
  }catch(e){showToast('Couldn\u2019t update: '+e.message,'error');}
}
async function inboxMarkAllRead(){
  const rows=((STATE.dashInbox&&STATE.dashInbox.rows)||[]).filter(r=>r.status==='new');
  if(!rows.length)return;
  try{
    for(let i=0;i<rows.length;i+=400){
      const b=db.batch();rows.slice(i,i+400).forEach(r=>b.update(db.collection('app-feedback').doc(r._id),{status:'read'}));await b.commit();
    }
    rows.forEach(r=>{r.status='read';});
    STATE.dashInboxNew=0;
    showToast('All marked as read.','success');
    render();
  }catch(e){showToast('Couldn\u2019t update: '+e.message,'error');}
}
async function inboxDelete(id){
  const ok=await showModal({icon:'\u{1F5D1}\uFE0F',title:'Delete this message?',body:'It can\u2019t be recovered.',type:'warning',confirmText:'Delete',cancelText:'Cancel'});
  if(!ok)return;
  try{
    await db.collection('app-feedback').doc(id).delete();
    const st=STATE.dashInbox;
    if(st)st.rows=st.rows.filter(r=>r._id!==id);
    STATE.dashInboxNew=((st&&st.rows)||[]).filter(r=>r.status==='new').length;
    render();
  }catch(e){showToast('Couldn\u2019t delete: '+e.message,'error');}
}

// ── View ───────────────────────────────────────────────────────────────────
function renderDashInbox(){
  const st=STATE.dashInbox;
  if(!st||(!st.loaded&&!st.loading)){loadDashInbox();return renderDashSkeleton();}
  if(st.loading)return renderDashSkeleton();
  if(st.error)return '<div class="card" style="margin:12px">Couldn\u2019t load messages: '+esc(st.error)+'</div>';

  const f=st.filter||'all';
  const FILTERS=[['all','All'],['new','New'],['request','Requests'],['problem','Problems'],['note','Notes']];
  const rows=st.rows.filter(r=>f==='all'?true:(f==='new'?r.status==='new':r.type===f));
  const newCount=st.rows.filter(r=>r.status==='new').length;

  const head='<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin:12px 12px 8px;flex-wrap:wrap">'
    +'<div style="font-size:13px;color:var(--muted)">'+st.rows.length+' messages \u00B7 '+newCount+' new</div>'
    +'<div style="display:flex;gap:6px"><button class="sub-nav-btn" onclick="loadDashInbox()">\u21BB Refresh</button>'
    +(newCount?'<button class="sub-nav-btn" onclick="inboxMarkAllRead()">\u2713 Mark all read</button>':'')+'</div></div>'
    +'<div style="display:flex;gap:6px;margin:0 12px 10px;flex-wrap:wrap">'
    +FILTERS.map(x=>'<button class="sub-nav-btn'+(f===x[0]?' active':'')+'" onclick="inboxSetFilter(\''+x[0]+'\')">'+x[1]+'</button>').join('')
    +'</div>';

  if(!rows.length)return head+'<div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:14px">No messages here yet.</div>';

  const TYPE={note:{l:'Note',bg:'var(--brand-tint,#e6f1fb)',c:'var(--brand,#0C447C)'},request:{l:'Request',bg:'var(--ok-tint,#eaf3de)',c:'var(--ok-strong,#27500A)'},problem:{l:'Problem',bg:'var(--err-tint,#fcebeb)',c:'var(--err-strong,#791F1F)'}};
  return head+rows.map(r=>{
    const t=TYPE[r.type]||TYPE.note;
    const when=(r.createdAt&&r.createdAt.toDate)?r.createdAt.toDate().toLocaleString():'';
    const who=(r.name||'Student')+(r.userId?' \u00B7 '+String(r.userId).slice(-6):'');
    const isNew=r.status==='new';
    return '<div class="card" style="margin:0 12px 10px;'+(isNew?'border-inline-start:3px solid var(--brand,#0C447C)':'')+'">'
      +'<div style="display:flex;justify-content:space-between;gap:8px;align-items:center;margin-bottom:6px">'
      +'<span style="font-size:11px;font-weight:600;padding:3px 10px;border-radius:999px;background:'+t.bg+';color:'+t.c+'">'+t.l+(isNew?' \u00B7 new':'')+'</span>'
      +'<span style="font-size:11px;color:var(--muted)">'+esc(when)+'</span></div>'
      +'<div dir="auto" style="font-size:14px;line-height:1.7;color:var(--ink);white-space:pre-wrap;word-break:break-word">'+esc(r.message||'')+'</div>'
      +'<div style="font-size:11px;color:var(--muted);margin-top:6px">'+esc(who)+(r.tab?' \u00B7 screen: '+esc(r.tab):'')+(r.build?' \u00B7 build '+esc(r.build):'')+'</div>'
      +'<div style="display:flex;gap:6px;margin-top:8px">'
      +(isNew?'<button class="sub-nav-btn" onclick="inboxMarkRead(\''+esc(r._id)+'\')">\u2713 Mark read</button>':'')
      +'<button class="sub-nav-btn" onclick="inboxDelete(\''+esc(r._id)+'\')">\u{1F5D1}\uFE0F Delete</button></div>'
      +'</div>';
  }).join('');
}

// ── Wire into the dashboard (wrapper; original always runs first) ──────────
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

      _inboxEnsureCount();
      const isInbox=STATE.dashTab==='inbox';
      const n=STATE.dashInboxNew||0;
      const btn='<button class="sub-nav-btn'+(isInbox?' active':'')+'" onclick="STATE.dashTab=\'inbox\';render()">\u{1F4AC} Inbox'+(n?' \u00B7 '+n:'')+'</button>';

      let nav=html.slice(i0,i1);
      if(isInbox)nav=nav.replace(/sub-nav-btn active/g,'sub-nav-btn');
      let out=html.slice(0,i0)+nav+btn+html.slice(i1);

      if(isInbox){
        const k=out.lastIndexOf('<div class="scroll-area">');
        if(k>=0)out=out.slice(0,k)+'<div class="scroll-area">'+renderDashInbox()+'</div>';
      }
      return out;
    }catch(_){
      return html;
    }
  };
})();

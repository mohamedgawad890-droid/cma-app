// ═══════════════════════════════════════════════════════════════════════════
//  INSTRUCTOR DASHBOARD SHELL — navigation, header, Overview, shared helpers
// ═══════════════════════════════════════════════════════════════════════════
// One list defines every dashboard page. `group:true` pages work on the selected
// group, so only they show the group selector and the "Viewing" label.
const DASH_AREAS=[
  {id:'overview',label:'Overview',icon:'\u{1F3E0}',tabs:[{id:'overview',label:'Overview',render:()=>renderDashOverview(),roster:true}]},
  {id:'students',label:'Students',icon:'\u{1F464}',tabs:[
    {id:'students',label:'Students',render:()=>renderDashStudents(),roster:true},{id:'approvals',label:'Approvals',render:()=>renderDashApprovalsPage()},
    {id:'at-risk',label:'At Risk',group:true,render:()=>renderDashAtRisk()},{id:'progress',label:'Progress',group:true,render:()=>renderDashProgress()},{id:'leader',label:'Leader',group:true,render:()=>renderDashLeader()}]},
  {id:'teaching',label:'Teaching',icon:'\u{1F3AC}',tabs:[
    {id:'lectures',label:'Lectures',group:true,render:()=>renderDashLectures()},{id:'attendance',label:'Attendance',group:true,render:()=>renderDashAttendance()},{id:'plan',label:'Plan',group:true,render:()=>renderDashPlan()},
    {id:'schedule',label:'Schedule',group:true,render:()=>renderDashSchedule()},{id:'teaching-log',label:'Actual Teaching',group:true,render:()=>renderDashActualTeaching()}]},
  {id:'exams',label:'Exams',icon:'\u{1F4DD}',tabs:[{id:'exams',label:'Exams',group:true,render:()=>renderDashExams()},{id:'results',label:'Results',group:true,render:()=>renderDashResults()}]},
  {id:'admin',label:'Admin',icon:'\u2699\uFE0F',tabs:[
    {id:'groups',label:'Groups',render:()=>renderDashGroups(),roster:true},{id:'interest',label:'Interest',render:()=>renderDashInterest()},{id:'inbox',label:'Inbox',render:()=>renderDashInbox()},{id:'errors',label:'Errors',render:()=>renderDashErrors()}]}
];
const DASH_EMPTY_LABEL={'plan':'Weekly Plan','at-risk':'At-Risk students'};
STATE.dashStudentsPage=0;
STATE.dashOverview=null;

function dashFindTab(id){
  for(const area of DASH_AREAS){const tab=area.tabs.find(t=>t.id===id);if(tab)return {area,tab};}
  return {area:DASH_AREAS[0],tab:DASH_AREAS[0].tabs[0]};
}
function dashScrollTop(){const el=document.querySelector('#content-area .scroll-area');if(el)el.scrollTop=0;}
function dashGo(tabId,groupCode){
  STATE.dashTab=tabId;
  if(groupCode&&groupCode!==STATE.dashSelectedGroup)selectDashGroup(groupCode);
  render();dashScrollTop();
}

// ── Shared helpers ──────────────────────────────────────────────────────────
// A student's CURRENT group, matched by account id (never by name or e-mail).
function dashGroupInfo(uid){
  if(!STATE.dashGroupsLoaded)return {kind:'none',text:STATE.dashError?'Group unavailable':'Loading\u2026'};
  const s=(STATE.dashStudents||[]).find(x=>x.uid===uid);
  const code=String((s&&s.groupCode)||'').trim();
  if(code)return {kind:'group',text:code};
  const pending=String((s&&s.pendingGroupCode)||'').trim();
  if(pending)return {kind:'pending',text:'Pending: '+pending};
  return {kind:'none',text:'No group'};
}
function dashGroupBadge(uid){
  const i=dashGroupInfo(uid);
  return '<span class="gbadge'+(i.kind==='group'?'':' '+i.kind)+'">'+esc(i.text)+'</span>';
}
// Phone → wa.me number(s) with country code. Returns [] when the country can't be told safely.
// 05XXXXXXXX is used in both KSA and UAE: the profile country decides, otherwise offer both.
function dashWaTargets(phone,country){
  const raw=String(phone||'').trim()
    .replace(/[\u0660-\u0669]/g,c=>String(c.charCodeAt(0)-0x0660))
    .replace(/[\u06F0-\u06F9]/g,c=>String(c.charCodeAt(0)-0x06F0));
  let d=raw.replace(/\D/g,'');
  if(!d)return [];
  let intl=raw.startsWith('+');
  if(!intl&&d.startsWith('00')){d=d.slice(2);intl=true;}
  const one=num=>[{num,label:''}];
  d=d.replace(/^(20|966|971)0(?=\d{9,10}$)/,'$1');           // +20 010… → 2010…
  if(intl)return d.length>=8&&d.length<=15&&d[0]!=='0'?one(d):[];
  if(/^01[0125]\d{8}$/.test(d))return one('20'+d.slice(1));  // Egypt mobile
  if(/^1[0125]\d{8}$/.test(d))return one('20'+d);            // Egypt mobile, leading 0 dropped
  if(/^201[0125]\d{8}$/.test(d)||/^9665\d{8}$/.test(d)||/^9715\d{8}$/.test(d))return one(d);
  if(/^05\d{8}$/.test(d)){
    const local=d.slice(1);
    if(country==='Saudi Arabia')return one('966'+local);
    if(country==='UAE')return one('971'+local);
    return [{num:'966'+local,label:'KSA'},{num:'971'+local,label:'UAE'}];
  }
  return [];
}
function dashFmtSeen(iso){
  if(!iso)return '';
  const t=new Date(iso);
  return isNaN(t)?'':t.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});
}
function dashToday(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}

// ── Student list cache ──────────────────────────────────────────────────────
// Reading every student costs one Firestore read each, so the list is kept on this
// device for a few hours. Only the fields the lists need are stored, it belongs to the
// signed-in instructor, and logout() removes it. A profile is re-read when opened.
const DASH_ROSTER_KEY='cma-dash-roster-v1';
const DASH_ROSTER_TTL=6*3600000;
const DASH_ROSTER_FIELDS=['uid','name','email','mobile','groupCode','pendingGroupCode','country','photo'];
async function dashFetchRoster(){
  const snap=await db.collection('students').get();
  return snap.docs.map(d=>{const x=d.data();return {...x,uid:d.id,groupCode:x.groupCode||'',name:x.name||''};});
}
function dashReadRosterCache(){
  try{
    const c=JSON.parse(localStorage.getItem(DASH_ROSTER_KEY)||'null');
    if(!c||!STATE.user||c.owner!==STATE.user.uid||!Array.isArray(c.students)||!c.students.length)return null;
    const age=Date.now()-c.at;
    return age>=0&&age<DASH_ROSTER_TTL?c:null;
  }catch(_){return null;}
}
function dashSaveRoster(){
  try{
    const slim=(STATE.dashStudents||[]).map(s=>{
      const o={};
      DASH_ROSTER_FIELDS.forEach(k=>{const v=s[k];if(v&&!(k==='photo'&&String(v).startsWith('data:')))o[k]=v;});
      return o;
    });
    localStorage.setItem(DASH_ROSTER_KEY,JSON.stringify({owner:STATE.user.uid,at:STATE.dashRosterAt||Date.now(),students:slim}));
  }catch(_){try{localStorage.removeItem(DASH_ROSTER_KEY);}catch(__){}}
}
async function dashRefreshRoster(silent){
  if(STATE.dashRosterLoading)return;
  STATE.dashRosterLoading=true;if(!silent)render();
  try{
    STATE.dashStudents=await dashFetchRoster();
    STATE.dashRosterAt=Date.now();STATE.dashRosterFromCache=false;
    STATE.dashProgressByGroup={};STATE.dashLeaderByGroup={};STATE.dashOverview=null;
    dashSaveRoster();
    if(!silent)showToast('Student list updated.','success');
  }catch(e){console.warn('[dashRefreshRoster]',e);if(!silent)showToast('Couldn\u2019t update the student list.','error');}
  STATE.dashRosterLoading=false;
  if(STATE.tab==='dashboard')render();
}
// If requests, messages or sign-ups show something the cached list doesn't know about,
// read the list again (at most once per app session).
function dashReconcileRoster(){
  if(!STATE.dashGroupsLoaded||!STATE.dashRosterFromCache||STATE._rosterReconciled)return;
  const byUid=new Map((STATE.dashStudents||[]).map(s=>[s.uid,s]));
  const pendingStale=((STATE.dashApprovals&&STATE.dashApprovals.rows)||[]).some(r=>{
    const s=byUid.get(r.uid);return r.status==='pending'&&(!s||(s.pendingGroupCode||'')!==(r.groupCode||''));
  });
  // Only records NEWER than the list count: an old record from an account with no student
  // profile would otherwise force a full re-read every time the dashboard opens.
  const records=[...((STATE.dashInterest&&STATE.dashInterest.rows)||[]).map(r=>[r._id,r.createdAt]),...((STATE.dashInbox&&STATE.dashInbox.rows)||[]).map(r=>[r.userId,r.createdAt])];
  const unknownNew=records.some(([id,at])=>id&&!byUid.has(id)&&at&&at.toDate&&at.toDate().getTime()>STATE.dashRosterAt);
  if(pendingStale||unknownNew){STATE._rosterReconciled=true;dashRefreshRoster(true);}
}
function renderDashRosterBar(){
  if(!STATE.dashGroupsLoaded||!STATE.dashRosterAt)return '';
  const when=new Date(STATE.dashRosterAt).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'});
  return `<div class="dash-roster"><span>Student list as of ${when}</span><button class="sub-nav-btn" ${STATE.dashRosterLoading?'disabled':''} onclick="dashRefreshRoster()">${STATE.dashRosterLoading?'Updating\u2026':'\u21BB Refresh students'}</button></div>`;
}

// ── Counts shown on the navigation ──────────────────────────────────────────
function dashPendingCount(){return ((STATE.dashApprovals&&STATE.dashApprovals.rows)||[]).filter(r=>r.status==='pending').length;}
function dashEnsureCounts(){
  if(!STATE.dashApprovals.loaded&&!STATE.dashApprovals.loading)loadDashApprovals();
  _inboxEnsureCount();
  if(!STATE.dashInterest)loadDashInterest();
  dashReconcileRoster();
}
function dashTabBadge(id){
  if(id==='approvals')return dashPendingCount();
  if(id==='inbox')return STATE.dashInboxNew||0;
  if(id==='interest')return STATE.dashInterestN||0;
  return 0;
}
function renderDashNav(current){
  const attention={students:dashPendingCount(),admin:STATE.dashInboxNew||0};
  const areas=DASH_AREAS.map(a=>`<button class="sub-nav-btn${a.id===current.area.id?' active':''}" onclick="dashGo('${a.id===current.area.id?current.tab.id:a.tabs[0].id}')">${a.icon} ${a.label}${attention[a.id]?' \u00B7 '+attention[a.id]:''}</button>`).join('');
  const subs=current.area.tabs.length>1?`<div class="sub-nav dash-subs">${current.area.tabs.map(t=>{
    const n=dashTabBadge(t.id);
    return `<button class="sub-nav-btn${t.id===current.tab.id?' active':''}" onclick="dashGo('${t.id}')">${t.label}${n?' \u00B7 '+n:''}</button>`;
  }).join('')}</div>`:'';
  return `<div class="sub-nav dash-areas">${areas}</div>${subs}`;
}

// On narrow screens the tab rows scroll sideways; keep the selected tab in view after a redraw.
function dashRevealActiveTabs(){
  document.querySelectorAll('.dash-areas,.dash-subs').forEach(row=>{
    const b=row.querySelector('.sub-nav-btn.active');if(!b)return;
    const r=row.getBoundingClientRect(),x=b.getBoundingClientRect();
    if(x.left<r.left||x.right>r.right)row.scrollLeft+=(x.left-r.left)-(r.width-x.width)/2;
  });
}

function renderDashApprovalsPage(){return STATE.dashApprovals.loaded?renderDashApprovals():renderDashSkeleton();}

// ── Overview ────────────────────────────────────────────────────────────────
// Per group: at-risk count (same rule as the At Risk page) and the next dated
// lecture from the Schedule or the Lectures list.
async function loadDashOverview(){
  STATE.dashOverview={loading:true,loaded:false,groups:[]};
  const today=dashToday();
  const codes=(STATE.dashGroups||[]).map(g=>g.code).filter(Boolean).sort();
  const groups=await Promise.all(codes.map(async code=>{
    const out={code,atRisk:null,next:null,failed:false};
    try{
      const [an,sch,lec]=await Promise.all([
        db.collection('student-analytics').where('groupCode','==',code.toUpperCase()).get(),
        db.collection('lecture-schedule').doc(code).get(),
        db.collection('lectures').where('groupCode','==',code).get()
      ]);
      out.atRisk=an.docs.filter(d=>_atRiskReason(atRiskCurrent(d.data()))).length;
      const dated=[];
      ((sch.exists&&sch.data().rows)||[]).forEach(r=>{
        if(r.plannedDate)dated.push({date:String(r.plannedDate).slice(0,10),title:'Lecture '+r.lectureNumber,tab:'schedule'});
      });
      lec.docs.forEach(d=>{const x=d.data();if(x.date&&x.status!=='ended')dated.push({date:String(x.date).slice(0,10),title:x.title||'Lecture',tab:'lectures'});});
      out.next=dated.filter(x=>x.date>=today).sort((a,b)=>a.date.localeCompare(b.date))[0]||null;
    }catch(e){console.warn('[dashOverview]',code,e);out.failed=true;}
    return out;
  }));
  STATE.dashOverview={loading:false,loaded:true,groups};
  if(STATE.tab==='dashboard'&&STATE.dashTab==='overview')render();
}
function refreshDashOverview(){
  STATE._inboxCountDone=false;
  STATE.dashApprovals={loaded:false,loading:false,rows:[]};
  STATE.dashInterest=null;STATE.dashOverview=null;
  render();
}
function renderDashOverview(){
  if(!STATE.dashOverview)loadDashOverview();
  const ov=STATE.dashOverview;
  const ap=STATE.dashApprovals, it=STATE.dashInterest;
  const weekAgo=Date.now()-7*86400000;
  const newInterest=(it&&it.loaded&&!it.error)?it.rows.filter(r=>r.createdAt&&r.createdAt.toDate&&r.createdAt.toDate().getTime()>=weekAgo).length:null;
  const card=(value,label,hint,tab)=>`<button class="dash-stat" onclick="dashGo('${tab}')"><b>${value}</b><span>${label}</span><small>${hint}</small></button>`;
  const unread=STATE._inboxCountDone?((STATE.dashInboxNew||0)>=50?'50+':(STATE.dashInboxNew||0)):'\u2026';
  const cards=card(ap.loaded?(ap.error?'!':dashPendingCount()):'\u2026','Pending approvals',ap.error?'Couldn\u2019t load':'Join and switch requests','approvals')
    +card(unread,'Unread messages','Student feedback and requests','inbox')
    +card(newInterest===null?(it&&it.error?'!':'\u2026'):newInterest,'New interest sign-ups',it&&it.loaded&&!it.error?'Last 7 days \u00B7 '+it.rows.length+' total':'Last 7 days','interest');
  let perGroup='<div class="dash-sec">'+renderDashSkeleton()+'</div>';
  if(ov&&ov.loaded){
    const risk=ov.groups.map(g=>`<button class="dash-row" onclick="dashGo('at-risk','${esc(g.code)}')"><span><b>${esc(g.code)}</b></span><span>${g.failed?'Couldn\u2019t load':g.atRisk+' at risk'} \u203A</span></button>`).join('');
    const next=ov.groups.map(g=>`<button class="dash-row" onclick="dashGo('${g.next?g.next.tab:'schedule'}','${esc(g.code)}')"><span><b>${esc(g.code)}</b><small dir="auto">${g.failed?'Couldn\u2019t load':(g.next?esc(g.next.title):'No upcoming dated lecture')}</small></span><span>${g.next?esc(dashFmtSeen(g.next.date)):''} \u203A</span></button>`).join('');
    perGroup=ov.groups.length
      ?`<div class="dash-sec"><h3>Next lecture</h3>${next}</div><div class="dash-sec"><h3>At-risk students</h3>${risk}</div>`
      :'<div class="dash-sec">'+renderDashPickGroupEmpty('overview')+'</div>';
  }
  return `<div class="dash-grid">${cards}</div>${perGroup}<div style="padding:6px 14px 24px"><button class="sub-nav-btn" onclick="refreshDashOverview()">\u21BB Refresh</button></div>`;
}

// ── Page renderer ───────────────────────────────────────────────────────────
function renderDashboard(){
  if(!isInstructor())return renderIntro();
  if(!STATE.dashLoaded&&!STATE.dashLoading&&!STATE.dashGroupsLoaded)loadDashboardP1();
  dashEnsureCounts();
  const current=dashFindTab(STATE.dashTab);
  const tab=current.tab.id;
  const isGroupPage=!!current.tab.group;
  let body;
  if(STATE.dashError){
    body=`<div style="text-align:center;padding:50px 20px"><div style="font-size:34px;margin-bottom:10px">\u26A0\uFE0F</div><div style="font-size:14px;color:var(--muted);margin-bottom:14px">Couldn't load dashboard data.</div><button class="sub-nav-btn" onclick="STATE.dashError=false;STATE.dashGroupsLoaded=false;STATE.dashLoaded=false;loadDashboardP1()">Retry</button></div>`;
  }else if(!isGroupPage){
    // Pages marked roster:true wait for the student list; the others render at once.
    body=(current.tab.roster&&!STATE.dashGroupsLoaded)?renderDashSkeleton():current.tab.render();
    if(current.tab.roster||tab==='interest'||tab==='inbox')body=renderDashRosterBar()+body;
  }else if(!STATE.dashSelectedGroup){
    body=renderDashPickGroupEmpty(DASH_EMPTY_LABEL[tab]||current.tab.label);
  }else if(STATE.dashLoading||STATE.dashLoadedForGroup!==STATE.dashSelectedGroup){
    body=renderDashSkeleton();
  }else{
    body=current.tab.render();
  }
  const viewing=isGroupPage&&STATE.dashSelectedGroup?`<p>Viewing: <b>${esc(STATE.dashSelectedGroup)}</b></p>`:'';
  const chips=isGroupPage&&STATE.dashGroupsLoaded?renderGroupChipStrip():'';
  setTimeout(dashRevealActiveTabs,0);
  return `<div class="sh dash-head"><h2>Instructor Dashboard</h2>${viewing}</div>${renderDashNav(current)}${chips}<div class="scroll-area">${body}</div>`;
}

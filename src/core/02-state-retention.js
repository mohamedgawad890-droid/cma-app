// ─── STATE ────────────────────────────────────────────────────────────────────
function loadProg(){try{const d=localStorage.getItem('cma-html-v2');return d?JSON.parse(d):{done:[],lessonScores:{},mcqTotal:0,mcqRight:0};}catch{return{done:[],lessonScores:{},mcqTotal:0,mcqRight:0};}}

// Item 1: _doneSet caches STATE.progress.done as a Set for O(1) lookups.
// lessonDone() is called hundreds of times per render across all lessons (103 currently).
// Array.includes() = O(n) per call → Set.has() = O(1) per call.
// Invalidated in saveProg() and whenever Firestore overwrites STATE.progress.
let _doneSet = null;
function _invalidateDoneSet(){ _doneSet = null; }
function _getDoneSet(){ if(!_doneSet) _doneSet = new Set(STATE.progress.done); return _doneSet; }

// ── Progress saving: local is instant, cloud is debounced ──────────
// Local storage is written on every call (free, offline-safe). The cloud
// write is batched to at most once per window, then forced on app close.
// Worst case (missed cloud write) is recovered by mergeProgress() at login.
let _progCloudTimer = null;
let _progCloudDirty = false;

function _flushProgToCloud(){
  if(!_progCloudDirty || !STATE.user || !db) return;
  _progCloudDirty = false;
  if(_progCloudTimer){ clearTimeout(_progCloudTimer); _progCloudTimer = null; }
  db.collection('progress').doc(STATE.user.uid).set(STATE.progress)
    .catch(e=>{ _progCloudDirty = true; console.warn('progress sync failed', e); });
}

function _scheduleProgCloudSync(){
  _progCloudDirty = true;
  if(_progCloudTimer) return;            // a flush is already on its way
  _progCloudTimer = setTimeout(()=>{ _progCloudTimer = null; _flushProgToCloud(); }, 4000);
}

function saveProg(p){
  STATE.progress = p;
  _invalidateDoneSet();
  try{ localStorage.setItem('cma-html-v2', JSON.stringify(p)); }catch{}
  if(STATE.user) _scheduleProgCloudSync();
  render();
}

// Force any pending progress to the cloud the moment the app is closed,
// backgrounded, or the tab is hidden — so nothing waits in the queue.
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') _flushProgToCloud(); else { try{pollLiveLecture();}catch(e){} } });
window.addEventListener('pagehide', _flushProgToCloud);

// FIX 4: Non-destructive merge of two progress objects (used at login to converge
// cloud + local instead of letting either side blindly overwrite the other).
function mergeProgress(a,b){
  a=a||{}; b=b||{};
  const done=Array.from(new Set([...(a.done||[]),...(b.done||[])]));
  const ls={...(a.lessonScores||{})};
  const bls=b.lessonScores||{};
  for(const k in bls){
    const cur=ls[k], inc=bls[k];
    if(!cur){ ls[k]=inc; continue; }
    const accCur=cur.total?cur.correct/cur.total:0;
    const accInc=inc.total?inc.correct/inc.total:0;
    // keep the better attempt: higher accuracy, tie-break on more questions answered
    ls[k]=(accInc>accCur||(accInc===accCur&&(inc.total||0)>(cur.total||0)))?inc:cur;
  }
  return {
    done,
    lessonScores:ls,
    mcqTotal:Math.max(a.mcqTotal||0,b.mcqTotal||0),
    mcqRight:Math.max(a.mcqRight||0,b.mcqRight||0)
  };
}


function loadLessonNote(lid){try{return localStorage.getItem('cma-note-'+lid)||'';}catch{return '';}}
let _noteDebounce={};
function saveLessonNote(lid,val){
  try{localStorage.setItem('cma-note-'+lid,val);}catch{}
  clearTimeout(_noteDebounce[lid]);
  _noteDebounce[lid]=setTimeout(()=>{
    if(STATE.user&&db){
      db.collection('notes').doc(STATE.user.uid).collection('lessons').doc(lid)
        .set({text:val,updatedAt:firebase.firestore.FieldValue.serverTimestamp()})
        .catch(()=>{});
    }
  },1500);
}
async function syncNoteFromCloud(lid){
  if(!STATE.user||!db)return;
  try{
    const doc=await db.collection('notes').doc(STATE.user.uid).collection('lessons').doc(lid).get();
    if(doc.exists){
      const cloud=doc.data().text||'';
      try{localStorage.setItem('cma-note-'+lid,cloud);}catch{}
      const el=document.getElementById('lesson-notes-'+lid);
      if(el&&el.value!==cloud)el.value=cloud;
    }
  }catch{}
}


function loadStreak(){
  try{
    const d=localStorage.getItem('cma-streak-v1');
    const s=d?JSON.parse(d):{count:0,lastDate:''};
    // Batch 4 migration: backfill new fields on legacy {count,lastDate} docs.
    if(s.freezeTokens===undefined)s.freezeTokens=0;
    if(s.lastFreezeEarned===undefined)s.lastFreezeEarned='';
    if(s.graceLastUsed===undefined)s.graceLastUsed='';
    return s;
  }catch{return{count:0,lastDate:'',freezeTokens:0,lastFreezeEarned:'',graceLastUsed:''};}
}
function saveStreak(s){try{localStorage.setItem('cma-streak-v1',JSON.stringify(s));}catch{}}

// Batch 4 — helper: days between two toDateString() values (integer, >=0).
function _daysBetween(aStr,bStr){
  if(!aStr||!bStr)return Infinity;
  const a=new Date(aStr),b=new Date(bStr);
  if(isNaN(a)||isNaN(b))return Infinity;
  return Math.round((b-a)/86400000);
}

// Batch 4 — award a Freeze token every 14 consecutive active days (max 2).
function _maybeEarnFreeze(s,today){
  if(s.freezeTokens>=2)return s;
  if(!s.lastFreezeEarned){ // first-ever: seed the clock, don't grant yet
    if(s.count>0)s.lastFreezeEarned=today;
    return s;
  }
  if(_daysBetween(s.lastFreezeEarned,today)>=14 && s.count>=14){
    s.freezeTokens=Math.min(2,s.freezeTokens+1);
    s.lastFreezeEarned=today;
  }
  return s;
}

// Batch 4 — core streak update with Freeze + Grace recovery.
// Returns one of: 'same' | 'incremented' | 'froze' | 'grace-needed' | 'reset'.
// The caller (app boot) inspects the return to fire a toast or the Grace modal.
function updateStreak(){
  const today=new Date().toDateString();
  const yesterday=new Date(Date.now()-86400000).toDateString();
  const twoDaysAgo=new Date(Date.now()-2*86400000).toDateString();
  let s=loadStreak();

  if(s.lastDate===today){ // already counted today
    s=_maybeEarnFreeze(s,today);saveStreak(s);return'same';
  }
  if(s.lastDate===yesterday){ // normal continuation
    s.count=s.count+1;s.lastDate=today;s=_maybeEarnFreeze(s,today);saveStreak(s);return'incremented';
  }
  if(s.lastDate===twoDaysAgo && s.freezeTokens>0){ // one missed day → auto-Freeze
    s.freezeTokens=s.freezeTokens-1;s.count=s.count+1;s.lastDate=today;
    s=_maybeEarnFreeze(s,today);saveStreak(s);return'froze';
  }
  if(s.lastDate===twoDaysAgo && s.count>0){ // one missed day, no Freeze → maybe Grace
    const graceCd=_daysBetween(s.graceLastUsed,today);
    if(graceCd>=14){ // Grace available — defer the decision to the modal
      return'grace-needed';
    }
  }
  // 2+ days missed, or Grace on cooldown → silent reset (no shame modal).
  // Seed the Freeze clock here so a fresh streak starts earning from day 1.
  s.count=1;s.lastDate=today;s.lastFreezeEarned=today;saveStreak(s);return'reset';
}

// Batch 4 — called when the student accepts the Grace mini-review.
// Preserves the streak and stamps the cooldown.
function grantStreakGrace(){
  const today=new Date().toDateString();
  const s=loadStreak();
  s.count=s.count+1;s.lastDate=today;s.graceLastUsed=today;
  saveStreak(s);
}
// Batch 4 — called when the student declines Grace → clean reset.
function declineStreakGrace(){
  const today=new Date().toDateString();
  const s=loadStreak();
  s.count=1;s.lastDate=today;saveStreak(s);
}

// Batch 4 — Grace modal + 5-question mini-review pulled from wrong-answer pool
// (falls back to random taught MCQs). Shown once on boot when updateStreak
// returns 'grace-needed'. Uses the existing quizMode engine to run the set.
async function showGraceModal(){
  const s=loadStreak();
  const ok=await showModal({
    icon:'\u{1F525}',
    title:'You missed a day',
    body:'No big deal \u2014 keep your '+s.count+'-day streak with a quick 5-minute review?',
    type:'warning',
    confirmText:'Yes, quick review',
    cancelText:'Reset streak',
    dismissable:false
  });
  if(!ok){declineStreakGrace();render();return;}
  // Build a 5-question set: prefer wrong answers, fall back to taught MCQs.
  try{
    const set=await buildGraceMiniSet();
    if(!set.length){ // nothing to serve → grant grace anyway, don't punish
      grantStreakGrace();showToast('Streak saved \u2014 keep it going!','success',3000);render();return;
    }
    STATE._graceActive=true;
    STATE.quizMode={active:true,sectionId:null,idx:0,questions:set,answers:[],selected:null,done:false,isGrace:true,questionTimes:[],quizStartTime:Date.now(),qTimerStart:Date.now(),qTimerElapsed:null};
    STATE.tab='quiz-mode';render();
  }catch(e){
    console.warn('Grace set failed:',e);
    grantStreakGrace();showToast('Streak saved!','success',2500);render();
  }
}

// Batch 4 — assemble up to 5 questions for the Grace review.
async function buildGraceMiniSet(){
  const out=[];
  // 1) Wrong answers first (highest learning value).
  try{
    const wrong=(typeof buildWrongAnswers==='function')?buildWrongAnswers():[];
    wrong.slice(0,5).forEach(w=>{if(w&&w.q)out.push(shuffleQuestionOptions({...w.q,secId:w.secId,secTitle:w.secTitle,lessonTitle:w.lessonTitle}));});
  }catch(e){}
  if(out.length>=5)return out.slice(0,5);
  // 2) Fall back to random taught MCQs.
  try{
    const st=loadStudent();
    if(st&&st.groupCode){
      const snap=await db.collection('teaching-log').where('groupCode','==',st.groupCode.toUpperCase()).get();
      const taught=new Set();snap.docs.forEach(d=>(d.data().unitIds||[]).forEach(u=>taught.add(u)));
      const secIds=[...new Set([...taught].map(u=>parseInt(u.split('-')[0])).filter(n=>n>0))];
      await Promise.all(secIds.map(i=>ensureQuizzes(i)));
      const pool=[];
      S.forEach(sec=>sec.lessons.forEach(l=>{if(taught.has(l.id)&&l.quizzes)l.quizzes.forEach(q=>{if(isOutOfScopeQ(l,q))return;pool.push({...q,secId:sec.id,secTitle:sec.title,lessonTitle:l.title});});}));
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      pool.slice(0,5-out.length).forEach(q=>out.push(shuffleQuestionOptions(q)));
    }
  }catch(e){}
  return out.slice(0,5);
}

// ── Mock Exam History ────────────────────────────────────────────────────────
// Keeps last 5 mock exam results so students can track score improvement.
function loadMockResults(){try{const d=localStorage.getItem('cma-mock-v1');return d?JSON.parse(d):[];}catch{return[];}}
function saveMockResult(result){
  try{
    const history=loadMockResults();
    history.unshift(result); // newest first
    localStorage.setItem('cma-mock-v1',JSON.stringify(history.slice(0,5)));
  }catch{}
}

// ── Study Time Tracking ──────────────────────────────────────────────────────
// Records how long students spend reading lessons and taking quizzes.
// Persists to localStorage. Displayed on the Progress screen.
let _studyTimerStart=null;
let _studyTimerScreen=null; // which screen is being timed

function loadStudyTime(){
  try{const d=localStorage.getItem('cma-studytime-v1');return d?JSON.parse(d):{totalMinutes:0,todayDate:'',todayMinutes:0};}
  catch{return{totalMinutes:0,todayDate:'',todayMinutes:0};}
}
function saveStudyTime(d){
  try{localStorage.setItem('cma-studytime-v1',JSON.stringify(d));}catch{}
}
function startStudyTimer(screen){
  // Only start if not already timing the same screen
  if(_studyTimerScreen===screen)return;
  endStudyTimer(); // flush any existing session first
  _studyTimerStart=Date.now();
  _studyTimerScreen=screen;
}
function endStudyTimer(){
  if(!_studyTimerStart)return;
  const elapsed=Math.round((Date.now()-_studyTimerStart)/60000); // minutes
  _studyTimerStart=null;
  _studyTimerScreen=null;
  if(elapsed<1)return; // ignore sessions under 1 minute
  try{recordStudyMinutes(elapsed);}catch(e){} // Batch 4: feed trend history
  const st=loadStudyTime();
  const today=new Date().toDateString();
  const todayMin=st.todayDate===today?st.todayMinutes:0;
  saveStudyTime({
    totalMinutes:(st.totalMinutes||0)+elapsed,
    todayDate:today,
    todayMinutes:todayMin+elapsed
  });
  // Batch 4: push a rolling engagement summary to Firestore (debounced).
  try{syncStudentAnalytics();}catch(e){}
}
function fmtStudyTime(mins){
  if(!mins||mins<1)return'0 min';
  if(mins<60)return`${mins} min`;
  const h=Math.floor(mins/60),m=mins%60;
  return m>0?`${h}h ${m}m`:`${h}h`;
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 4 — DAILY STUDY-MINUTES HISTORY (feeds analytics trend)
// ═══════════════════════════════════════════════════════════════════════════
// Keeps a rolling per-day minutes map so we can compute last-7 vs prev-7 trend.
// { "Mon Jul 06 2026": 24, ... } — pruned to last 30 days on write.
function loadStudyHistory(){try{const d=localStorage.getItem('cma-studyhist-v1');return d?JSON.parse(d):{};}catch{return{};}}
function saveStudyHistory(h){try{localStorage.setItem('cma-studyhist-v1',JSON.stringify(h));}catch{}}
function recordStudyMinutes(mins){
  if(!mins||mins<1)return;
  const h=loadStudyHistory();
  const today=new Date().toDateString();
  h[today]=(h[today]||0)+mins;
  // prune >30 days
  const cutoff=Date.now()-31*86400000;
  Object.keys(h).forEach(k=>{const t=new Date(k).getTime();if(isNaN(t)||t<cutoff)delete h[k];});
  saveStudyHistory(h);
}
function sumMinutesWindow(daysAgoStart,daysAgoEnd){
  // inclusive window [daysAgoEnd .. daysAgoStart] in days-ago terms
  const h=loadStudyHistory();let sum=0;
  for(let d=daysAgoEnd;d<=daysAgoStart;d++){
    const key=new Date(Date.now()-d*86400000).toDateString();
    sum+=(h[key]||0);
  }
  return sum;
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 4 — PILLAR 4: student-analytics sync (debounced, one write / 15 min)
// ═══════════════════════════════════════════════════════════════════════════
let _lastAnalyticsSync=0;
function syncStudentAnalytics(force){
  if(!STATE.user||!db)return;
  const now=Date.now();
  if(!force && now-_lastAnalyticsSync < 15*60*1000)return; // 15-min debounce
  const st=loadStudent();if(!st)return;
  const streak=loadStreak();
  const last7=sumMinutesWindow(6,0);
  const prev7=sumMinutesWindow(13,7);
  const lastActive=streak.lastDate||new Date().toDateString();
  const daysSince=_daysBetween(lastActive,new Date().toDateString());
  const p=STATE.progress||{};
  const doc={
    userId:STATE.user.uid,
    groupCode:(st.groupCode||'').toUpperCase(),
    displayName:st.name||'',
    phoneNumber:st.mobile||'',
    language:st.language||'ar',
    lastActiveDate:lastActive,
    daysSinceActive:isFinite(daysSince)?daysSince:999,
    streakCount:streak.count||0,
    streakWas:Math.max(streak.count||0,(STATE._streakWas||0)),
    last7DaysMinutes:last7,
    previous7DaysMinutes:prev7,
    mcqsLast7Days:0, // reserved — needs per-day mcq history (future)
    updatedAt:new Date().toISOString()
  };
  _lastAnalyticsSync=now;
  db.collection('student-analytics').doc(STATE.user.uid).set(doc,{merge:true}).catch(()=>{});
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 4 — PILLAR 3: weekly email digest (client-scheduled, Apps Script send)
// ═══════════════════════════════════════════════════════════════════════════
function _isoWeekStart(){ // Sunday of the current week, yyyy-mm-dd
  const d=new Date();const day=d.getDay();const sunday=new Date(d.getTime()-day*86400000);
  return sunday.getFullYear()+'-'+String(sunday.getMonth()+1).padStart(2,'0')+'-'+String(sunday.getDate()).padStart(2,'0');
}
async function maybeSendDigest(){
  if(!STATE.user||!db)return;
  const st=loadStudent();
  if(!st||!st.email)return;
  const prefs=st.notifPrefs||{};
  if(!prefs.emailDigestOptedIn)return;
  const weekStart=_isoWeekStart();
  if(prefs.lastDigestSent===weekStart)return; // already sent this week
  const payload=buildDigestPayload(st);
  // Batch 24 (B24-04): the Apps Script verifies this token and sends ONLY to the
  // token's own email — the payload email is no longer trusted.
  try{payload.idToken=await STATE.user.getIdToken();}catch(e){return;}
  const ok=await postDigest(payload);
  if(ok){
    const next={...(st.notifPrefs||{}),lastDigestSent:weekStart};
    saveStudent({...st,notifPrefs:next});
  }
}
function buildDigestPayload(st){
  const streak=loadStreak();
  const last7=sumMinutesWindow(6,0);
  const daysSince=_daysBetween(streak.lastDate||'',new Date().toDateString());
  const p=STATE.progress||{};
  const acc=(p.mcqTotal>0)?Math.round((p.mcqRight/p.mcqTotal)*100):0;
  // Weakest section by per-section accuracy in lessonScores (best-effort).
  let weakest='';
  try{
    // Batch 4.1: capture the KEY of the lowest score, not just the value.
    const scores=p.lessonScores||{};let worst=101;
    Object.keys(scores).forEach(k=>{const v=scores[k];if(typeof v==='number'&&v<worst){worst=v;weakest=k;}});
    // Batch 24 (B24-04): send the lesson TITLE — the email was showing a raw id like "4-11".
    if(weakest){S.forEach(sec=>(sec.lessons||[]).forEach(l=>{if(l.id===weakest)weakest=l.title;}));}
  }catch(e){}
  const variant = (daysSince>=7 || last7===0) ? 'missed_you'
                : (last7<60 ? 'returning' : 'engaged');
  // Batch 4.1: honest payload — dropped hardcoded 0s (mcqsThisWeek, accuracyDelta),
  // renamed accuracyThisWeek → accuracyOverall (it IS lifetime, not weekly),
  // added minutesLast7Days (real data), and secret for endpoint auth.
  return{
    secret:DIGEST_SECRET,
    email:st.email,name:st.name||'',language:st.language||'ar',variant,
    streakCount:streak.count||0,
    accuracyOverall:acc,
    minutesLast7Days:last7,
    weakestSection:weakest, recommendedTopics:[],
    silentDays:isFinite(daysSince)?daysSince:0
  };
}
async function postDigest(payload){
  try{
    await fetch(EMAIL_DIGEST_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    return true; // no-cors is opaque; assume success, weekly guard prevents dupes
  }catch(e){console.warn('digest send failed',e);return false;}
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 4 — PILLAR 2: notifications (in-app card + browser notif + iOS coach)
// ═══════════════════════════════════════════════════════════════════════════
function _isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;}
function _isStandalone(){return window.navigator.standalone===true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);}

function getNotifPrefs(){const st=loadStudent();return (st&&st.notifPrefs)||{};}
function setNotifPrefs(patch){
  const st=loadStudent();if(!st)return;
  const next={...(st.notifPrefs||{}),...patch};
  saveStudent({...st,notifPrefs:next});
}

// Pick a variant that wasn't shown on the last 2 days.
function pickNotifVariant(){
  const prefs=getNotifPrefs();
  const hist=prefs.variantHistory||[];
  const avail=NOTIFICATION_VARIANTS.filter(v=>!hist.slice(-2).includes(v.id));
  const pool=avail.length?avail:NOTIFICATION_VARIANTS;
  return pool[Math.floor(Math.random()*pool.length)];
}

// Called on boot. Shows the in-app engagement card if past preferred time today.
function maybeShowEngagementCard(){
  const prefs=getNotifPrefs();
  if(!prefs.desired||!prefs.dailyTime)return;
  const today=new Date().toDateString();
  if(prefs.lastEngagementFired===today)return;
  const [hh,mm]=(prefs.dailyTime||'19:00').split(':').map(Number);
  const now=new Date();
  const target=new Date();target.setHours(hh||19,mm||0,0,0);
  if(now<target)return; // not time yet today
  const v=pickNotifVariant();
  STATE._engagementCard=v;
  const hist=(prefs.variantHistory||[]).concat(v.id).slice(-3);
  setNotifPrefs({lastEngagementFired:today,variantHistory:hist});
  // Also fire a real browser notification if permitted (best-effort).
  try{
    if('Notification' in window && Notification.permission==='granted'){
      const n=new Notification('CMA Prep',{body:v.body,icon:'./icon-192.png',tag:'cma-daily'});
      n.onclick=()=>{window.focus();navTo(v.link);n.close();};
    }
  }catch(e){}
  render();
}
function dismissEngagementCard(){STATE._engagementCard=null;render();}
function tapEngagementCard(){const v=STATE._engagementCard;STATE._engagementCard=null;if(v)navTo(v.link);else render();}

// Request permission flow, with iOS install coaching when needed.
async function requestNotifPermission(){
  setNotifPrefs({desired:true});
  if(_isIOS() && !_isStandalone()){
    setNotifPrefs({pendingIOSInstall:true});
    showIOSInstallModal();
    return;
  }
  try{
    const perm=await Notification.requestPermission();
    setNotifPrefs({permissionGranted:perm==='granted',pendingIOSInstall:false});
    showToast(perm==='granted'?'Daily reminders on \u2705':'You can enable reminders later in your profile.',perm==='granted'?'success':'info',3000);
  }catch(e){showToast('Notifications not supported on this browser.','info',3000);}
  render();
}
function showIOSInstallModal(){
  showModal({
    icon:'\u{1F4F2}',
    title:'One step for iPhone reminders',
    body:'To get daily nudges on iPhone, add CMA Prep to your Home Screen first:\n\n1) Tap the Share button (the square with an arrow)\n2) Scroll down and tap \u201CAdd to Home Screen\u201D\n3) Open CMA Prep from your Home Screen \u2014 we\u2019ll ask again there.',
    type:'info',confirmText:'Got it'
  });
}
// On boot: if iOS user finished installing, complete the deferred permission ask.
function maybeCompleteIOSNotif(){
  const prefs=getNotifPrefs();
  if(prefs.pendingIOSInstall && _isStandalone() && 'Notification' in window){
    Notification.requestPermission().then(perm=>{
      setNotifPrefs({permissionGranted:perm==='granted',pendingIOSInstall:false});
      if(perm==='granted')showToast('Daily reminders on \u2705','success',3000);
    }).catch(()=>{});
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 4 — boot orchestration. Called once after auth + student load.
// ═══════════════════════════════════════════════════════════════════════════
function runRetentionBoot(){
  try{
    // Streak: evaluate today, react to the result.
    const st=loadStreak();STATE._streakWas=Math.max(STATE._streakWas||0,st.count||0);
    const r=updateStreak();
    if(r==='froze'){showToast('\u2744\uFE0F Used a Streak Freeze to protect your streak','success',4000);}
    else if(r==='grace-needed'){setTimeout(()=>{showGraceModal();},600);}
    // Batch 4.1: seed the study-time history BEFORE the first analytics sync,
    // so last7DaysMinutes / previous7DaysMinutes are honest on the initial write.
    recordStudyMinutes(0); // ensure history key exists
    // Analytics: initial sync (forced, ignores debounce).
    syncStudentAnalytics(true);
    // Notifications: iOS completion + engagement card.
    maybeCompleteIOSNotif();
    maybeShowEngagementCard();
    // Email digest: weekly check.
    maybeSendDigest();
  }catch(e){console.warn('retention boot error',e);}
}


// ── PWA Install Prompt ──────────────────────────────────────────────────────
function updateInstallBanner(){
  const b=document.getElementById('install-banner');
  if(!b)return;
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(isStandalone){b.classList.remove('show');return;}
  // Dismiss expires after 3 days (not forever)
  const dismissedAt=parseInt(localStorage.getItem('cma-install-dismissed-at')||'0');
  const threeDays=3*24*60*60*1000;
  const dismissed=dismissedAt&&(Date.now()-dismissedAt<threeDays);
  if(!dismissed){b.classList.add('show');}
  else{b.classList.remove('show');}
}
function dismissInstallBanner(){
  localStorage.setItem('cma-install-dismissed-at',String(Date.now()));
  const b=document.getElementById('install-banner');
  if(b)b.classList.remove('show');
}
let deferredInstallPrompt = window.__installPrompt || null;
window.__onInstallReady = () => { deferredInstallPrompt = window.__installPrompt; updateInstallBanner(); render(); };
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  window.__installPrompt = null;
  const b=document.getElementById('install-banner');
  if(b)b.classList.remove('show');
  render();
});
function openInstallModal(){
  const isSafari=/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS=/ipad|iphone|ipod/i.test(navigator.userAgent);
  const overlay=document.getElementById('install-modal-overlay');
  if(!overlay)return;
  overlay.classList.add('show');
  // Auto-select iOS tab if on Safari/iOS
  if(isSafari||isIOS) switchInstallTab('ios');
  else switchInstallTab('android');
}
function closeInstallModal(){
  const overlay=document.getElementById('install-modal-overlay');
  if(overlay)overlay.classList.remove('show');
}
function switchInstallTab(os){
  document.getElementById('tab-android').classList.toggle('active',os==='android');
  document.getElementById('tab-ios').classList.toggle('active',os==='ios');
  document.getElementById('install-steps-android').style.display=os==='android'?'':'none';
  document.getElementById('install-steps-ios').style.display=os==='ios'?'':'none';
}
function triggerInstall(){
  const prompt=deferredInstallPrompt||window.__installPrompt;
  if(prompt){
    closeInstallModal();
    prompt.prompt();
    prompt.userChoice.then(()=>{deferredInstallPrompt=null;window.__installPrompt=null;render();});
  }
}
function installApp(){
  const prompt=deferredInstallPrompt||window.__installPrompt;
  if(prompt){
    prompt.prompt();
    prompt.userChoice.then(()=>{deferredInstallPrompt=null;window.__installPrompt=null;render();});
    return;
  }
  // No native prompt available — show guide modal
  openInstallModal();
}


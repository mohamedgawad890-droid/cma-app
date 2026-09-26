// ─── RENDER ───────────────────────────────────────────────────────────────────
// ── Primary Navigation (5 tabs) ──────────────────────────────────────────────
const TABS=[
  {id:'intro',           label:'About',    icon:'👤'},
  {id:'study',           label:'Study',    icon:'📚'},
  {id:'quiz-mode-select',label:'Practice', icon:'🎯'},
  {id:'progress',        label:'Progress', icon:'📊'},
  {id:'formula-bank',    label:'Tools',    icon:'🧰'},
  {id:'search',          label:'Search',   icon:'🔍'},
  {id:'community',       label:'Community',icon:'🌐'}
];

// Maps every screen → its primary nav tab
function activeNavTab(){
  const t=STATE.tab;
  if(t==='study'||t==='quiz-session'||t==='quiz-results'||t==='quiz-review'||t==='lessons')return'study';
  if(t==='quiz-mode-select'||t==='quiz-mode'||t==='cbq'||t==='mock-exam'||t==='custom-practice'||t==='flashcards'||t==='wrong-answers')return'quiz-mode-select';
  if(t==='progress'||t==='tracker'||t==='leaderboard')return'progress';
  if(t==='formula-bank'||t==='dictionary'||t==='my-notes')return'formula-bank';
  if(t==='search')return'search';
  if(t==='community'||t==='question-detail')return'community';
  if(t==='dashboard')return'dashboard';
  if(t==='intro'||t==='register'||t==='feedback')return'intro';
  return t;
}

// ── Sub-Navigation Renderer ───────────────────────────────────────────────────
// items: [{id, label, icon}]  |  activeId: current STATE.tab
function renderSubNav(items, activeId){
  return`<div class="sub-nav">${
    items.map(it=>`<button class="sub-nav-btn${activeId===it.id?' active':''}" onclick="navTo('${it.id}')">${it.icon} ${it.label}</button>`).join('')
  }</div>`;
}

// Sub-nav item definitions for each group
const SUB_PRACTICE=[
  {id:'quiz-mode-select', icon:'🎯', label:'MCQ Quiz'},
  {id:'cbq',              icon:'📝', label:'CBQ'},
  {id:'mock-exam',        icon:'🏆', label:'Mock Exam'},
  {id:'custom-practice',  icon:'🛠️', label:'Custom Test'},
  {id:'flashcards',       icon:'🃏', label:'Flashcards'},
  {id:'wrong-answers',    icon:'❌', label:'Wrong Answers'}
];
const SUB_PROGRESS=[
  {id:'progress',      icon:'📊', label:'Overview'},
  {id:'tracker',       icon:'📌', label:'Tracker'},
  {id:'leaderboard',   icon:'🏅', label:'Top Students'}
];
const SUB_REFERENCE=[
  {id:'formula-bank', icon:'📐', label:'Formula'},
  {id:'dictionary',   icon:'📖', label:'Dictionary'},
  {id:'my-notes',     icon:'📝', label:'My Notes'}
];
const SUB_ME=[
  {id:'intro',     icon:'🏠', label:'Home'},
  {id:'register',  icon:'🎓', label:'Profile'},
  {id:'feedback',  icon:'⭐', label:'Feedback'}
];
// ── Batch 19: Collapsible desktop sidebar (icon rail) ────────────────────
// Desktop (>=900px) only — the CSS class is inert on mobile. State persists in
// localStorage so the choice survives reloads. Toggling flips a class on #app
// and never rebuilds the nav DOM (render() only rebuilds nav when the active
// group changes — see render._lastNavActive), so the button just re-syncs its
// own glyph/title.
function loadSidebarState(){try{return localStorage.getItem('cma-sidebar-v1')==='rail'?'rail':'open';}catch{return 'open';}}
function saveSidebarState(s){try{localStorage.setItem('cma-sidebar-v1',s);}catch(_){}}
function applySidebarState(){
  const app=document.getElementById('app');if(!app)return;
  const rail=loadSidebarState()==='rail';
  app.classList.toggle('sidebar-rail',rail);
  const btn=document.getElementById('sidebar-toggle');
  if(btn){btn.innerHTML=rail?'&raquo;':'&laquo;';btn.title=rail?'Expand sidebar (Ctrl+B)':'Collapse sidebar (Ctrl+B)';}
}
function toggleSidebar(){
  saveSidebarState(loadSidebarState()==='rail'?'open':'rail');
  applySidebarState();
}
function render(){
  const content=document.getElementById('content-area');const nav=document.getElementById('bottom-nav');if(!content||!nav)return;

  // ── FIX 4: Save scroll position before re-render, restore if same tab ──
  // Without this, every render() call (answering quiz, syncing notes, etc.)
  // scrolls the user back to the top of the page — a jarring UX regression.
  const _prevTab=render._lastTab;
  const _scrollArea=content.querySelector('.scroll-area');
  const _savedScroll=_scrollArea?_scrollArea.scrollTop:0;

  let html='';
  // Batch 6 · Item B — render error boundary. Any renderer that throws now
  // yields a graceful recovery card instead of a blank screen.
  try{
    switch(STATE.tab){
      case'loading':html=renderLoading();break;case'onboarding':html=renderOnboarding();break;case'login':html=renderLogin();break;case'intro':html=renderIntro();break;case'register':html=renderRegister();break;case'progress':html=renderProgress();break;case'wrong-answers':html=renderWrongAnswers();break;case'study':html=renderStudy();break;case'quiz-session':html=renderQuizSession();break;case'quiz-results':html=renderQuizResults();break;case'quiz-review':html=renderQuizReview();break;case'search':html=renderSearch();break;case'quiz-mode':html=renderQuizMode();break;case'quiz-mode-select':html=renderQuizModeSelect();break;case'leaderboard':html=renderLeaderboard();break;case'tracker':html=renderTracker();break;case'feedback':html=renderFeedback();break;case'community':html=renderCommunity();break;case'question-detail':html=renderQuestionDetail();break;case'formula-bank':html=renderFormulaBank();break;case'dictionary':html=renderDictionary();break;case'flashcards':html=renderFlashcards();break;case'my-notes':html=renderNotes();break;case'dashboard':html=renderDashboardLazy();break;case'cbq':html=renderCBQ();break;case'mock-exam':html=renderMockExamScreen();break;case'custom-practice':html=renderCustomPractice();break;case'exam':html=renderExam();break;default:html=renderIntro();
    }
  }catch(err){
    console.error('[render] Renderer threw for tab='+STATE.tab, err);
    const _safeTab=esc(String(STATE.tab||'unknown'));
    const _msg=esc(String((err&&err.message)||err||'Unknown error'));
    html='<div class="scroll-area"><div class="pad" style="padding-top:40px"><div style="max-width:420px;margin:0 auto;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px 20px;text-align:center"><div style="font-size:40px;margin-bottom:10px">\u26A0\uFE0F</div><div style="font-size:16px;font-weight:600;color:var(--ink);margin-bottom:6px">Something went wrong</div><div style="font-size:13px;color:var(--muted);line-height:1.55;margin-bottom:14px">A screen failed to render. Your data is safe. Try reloading the app.</div><div style="background:var(--surface-3);border-radius:8px;padding:8px 10px;margin-bottom:14px;font-family:monospace;font-size:11px;color:var(--muted);text-align:left;word-break:break-word">Tab: '+_safeTab+'<br>'+_msg+'</div><div style="display:flex;gap:8px"><button onclick="location.reload()" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Reload</button><button onclick="STATE.tab=\'intro\';render();" style="flex:1;padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--ink);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Go Home</button></div></div></div></div>';
  }
  content.innerHTML=html;
  window.__uiReady=true; // Batch 24 (B24-03): UI is up — errors now toast instead of the boot-failure screen

  // Batch 5: weekly plan banner — floats above content on Study tab.
  if(STATE.tab==='study' && STATE.studentActivePlan){
    try{
      const _bannerHTML=renderStudentActivePlanBanner();
      if(_bannerHTML){
        const _wrap=document.createElement('div');
        _wrap.style.cssText='margin:10px 12px 0;flex-shrink:0';
        _wrap.innerHTML=_bannerHTML;
        content.insertBefore(_wrap,content.firstChild);
      }
    }catch(e){}
  }

  // Batch 22 (item 5): lecture schedule (plan vs actual) — floats above
  // content on Study tab, same insertion pattern as the weekly plan banner.
  if(STATE.tab==='study' && STATE.studentSchedule && STATE.studentSchedule.length){
    try{
      const _schedHTML=renderStudentScheduleSection();
      if(_schedHTML){
        const _wrap2=document.createElement('div');
        _wrap2.style.cssText='margin:10px 12px 0;flex-shrink:0';
        _wrap2.innerHTML=_schedHTML;
        content.insertBefore(_wrap2,content.firstChild);
      }
    }catch(e){}
  }

  // Batch 5: lecture feedback prompt — appears when instructor opens feedback
  // AND student attended AND hasn't submitted yet. Non-blocking floating card.
  try{ maybeShowFeedbackPrompt(); }catch(e){}
  // Batch 8 (feedback-popup): auto-open the rating modal instead of a passive
  // banner. "Later" suppresses it for the session (see markFeedbackDismissed);
  // it re-appears next app open. Deferred slightly so it lands after the screen
  // settles, matching the login-style popup feel. Guards prevent duplicate opens.
  if(STATE._feedbackPromptFor && !['loading','login','onboarding','quiz-session','exam','cbq','mock-exam'].includes(STATE.tab)){
    const fp=STATE._feedbackPromptFor;
    if(fp && fp.lectureId && !_feedbackDismissedSession[fp.lectureId] && !document.getElementById('feedback-overlay')){
      setTimeout(()=>{
        try{
          const cur=STATE._feedbackPromptFor;
          if(cur && cur.lectureId===fp.lectureId
             && !_feedbackDismissedSession[fp.lectureId]
             && !document.getElementById('feedback-overlay')
             && !['loading','login','onboarding','quiz-session','exam','cbq','mock-exam'].includes(STATE.tab)){
            showFeedbackModal({lectureId:fp.lectureId,title:fp.title},fp.groupCode);
          }
        }catch(e){}
      }, 350);
    }
  }

  // Batch 4: engagement card — floats above content on normal student screens.
  if(STATE._engagementCard && !['loading','login','onboarding','quiz-session','exam','cbq','mock-exam'].includes(STATE.tab)){
    const v=STATE._engagementCard;
    const card=document.createElement('div');
    card.style.cssText='margin:10px 12px 0;background:linear-gradient(135deg,var(--brand),var(--brand-3));border-radius:12px;padding:12px 14px;color:#fff;display:flex;align-items:center;gap:11px;box-shadow:0 3px 12px rgba(12,68,124,.25);cursor:pointer;flex-shrink:0';
    card.innerHTML='<span style="font-size:20px;flex-shrink:0">\u{1F514}</span><span style="flex:1;font-size:13px;line-height:1.4">'+esc(v.body)+'</span><span data-x="1" style="flex-shrink:0;font-size:18px;opacity:.7;padding:0 4px">\u00D7</span>';
    card.onclick=(e)=>{ if(e.target&&e.target.getAttribute('data-x')){dismissEngagementCard();} else {tapEngagementCard();} };
    content.insertBefore(card,content.firstChild);
  }

  // Restore scroll if we're re-rendering the same tab (not navigating to a new screen)
  if(STATE.tab===_prevTab&&_savedScroll>0){
    const newScrollArea=content.querySelector('.scroll-area');
    if(newScrollArea)newScrollArea.scrollTop=_savedScroll;
  }
  render._lastTab=STATE.tab;
  if(STATE.tab==='cbq'){content.style.overflow='hidden';setTimeout(()=>cbqInit(),0);}
  if(STATE.tab==='mock-exam'){content.style.overflow='hidden';if(STATE.mockExam.status==='mcq')setTimeout(()=>renderMockMCQContent(),0);if(STATE.mockExam.status==='cbq')setTimeout(()=>mockSetupMockDrag(),0);}
  if(STATE.tab==='study'&&STATE.lessonId){setTimeout(()=>syncNoteFromCloud(STATE.lessonId),0);}
  try{applyFontSize();}catch(e){}
  // Batch 24 (B24-14): was an endless render loop whenever the card list came back
  // empty (e.g. offline with question files not cached): render → load → render…
  // Now one attempt at a time, retried at most every 30 s.
  if(STATE.tab==='flashcards'&&(!STATE.flashcards||!STATE.flashcards.length)&&!STATE._flashLoading&&Date.now()-(STATE._flashTriedAt||0)>30000){
    STATE._flashLoading=true;STATE._flashTriedAt=Date.now();
    ensureFlashcards().then(()=>{STATE._flashLoading=false;if(STATE.tab==='flashcards'&&STATE.flashcards&&STATE.flashcards.length)render();}).catch(()=>{STATE._flashLoading=false;});
  }
  if(STATE.tab==='intro'&&STATE.user){setTimeout(()=>{try{ensureQotd();}catch(e){}try{ensureStudentPlan();}catch(e){}},0);}
  if(STATE.tab==='study'&&STATE.user){setTimeout(()=>{try{ensureStudentPlan();}catch(e){}try{ensureStudentSchedule();}catch(e){}},0);}
  if(STATE.tab==='search'){setTimeout(()=>{const inp=document.getElementById('search-input');if(inp){inp.focus();if(STATE.searchQ)updateSearchResults();}},50);}
  if(STATE.tab==='dictionary'){if(!STATE.dictLoaded)setTimeout(ensureDictionary,0);setTimeout(()=>{const i=document.getElementById('dict-input');if(i)i.focus();},50);}
  content.style.display='flex';content.style.flexDirection='column';content.style.overflow=STATE.tab==='cbq'||STATE.tab==='mock-exam'?'hidden':'auto';
  const _mb=document.getElementById('mobile-brand');
  if(STATE.tab==='loading'||STATE.tab==='login'||STATE.tab==='onboarding'){nav.style.display='none';if(_mb)_mb.style.display='none';}
  else{nav.style.display='flex';if(_mb)_mb.style.display='';
    const active=activeNavTab();
    // #7: Only rebuild nav DOM when active group changes — avoids layout thrash
    if(active!==render._lastNavActive){
      render._lastNavActive=active;
      const brandHeader=`<div class="desktop-brand" style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div style="display:flex;align-items:center;gap:10px;min-width:0"><img src="./gawad-avatar.webp" alt="Mohamed Abdelgawad" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--brand-tint)"><div style="min-width:0"><div style="font-size:13px;font-weight:600;color:var(--brand);letter-spacing:.5px">CMA Part One Prep</div><div style="font-size:10px;color:#888;margin-top:1px">With Gawad</div></div></div>${!window.matchMedia("(display-mode: standalone)").matches?'<button onclick="installApp()" title="Install App" style="display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:8px;border:1px solid #d0d8e8;background:var(--brand-tint);color:var(--brand);cursor:pointer;font-size:12px;font-weight:500;font-family:inherit;flex-shrink:0"><span style="font-size:14px">⬇</span><span>Install App</span></button>':''}</div>`;
      nav.innerHTML=brandHeader+getNavTabs().map(t=>`<button class="nav-btn${t.id===active?' active':''}" onclick="navTo('${t.id}')" title="${t.label}"><span class="nav-icon">${t.icon}</span><span class="nav-label">${t.label}</span></button>`).join('')
        +'<button class="sidebar-toggle" id="sidebar-toggle" onclick="toggleSidebar()">&laquo;</button>'; // Batch 19
      applySidebarState(); // Batch 19: nav DOM was just rebuilt — re-sync class + button glyph
    }}
  // Start live per-question timer when on a quiz screen with unanswered question
  if(STATE.tab==='quiz-session'&&STATE.quizState&&STATE.quizState.selected===null){
    setTimeout(()=>startQTimer(()=>STATE.quizState.qTimerStart),20);
  } else if(STATE.tab==='quiz-mode'&&STATE.quizMode&&!STATE.quizMode.done&&STATE.quizMode.selected===null){
    setTimeout(()=>startQTimer(()=>STATE.quizMode.qTimerStart),20);
  } else {
    stopQTimer();
  }
}
function loadStudent(){try{const d=localStorage.getItem('cma-student-v1');return d?JSON.parse(d):null;}catch{return null;}}
function saveStudent(d){
  try{localStorage.setItem('cma-student-v1',JSON.stringify(d));}catch{}
  if(STATE.user){db.collection('students').doc(STATE.user.uid).set(d).catch(()=>{});}
}
function loadFeedback(){try{const d=localStorage.getItem('cma-feedback-v1');return d?JSON.parse(d):{rating:0,comments:'',improvements:''};}catch{return{rating:0,comments:'',improvements:''};}}

// Batch 4 — notification + email digest opt-in card (used in Profile/onboarding).
function renderNotifOptInCard(){
  const prefs=getNotifPrefs();
  const on=!!prefs.desired;
  const time=prefs.dailyTime||'19:00';
  const emailOn=!!prefs.emailDigestOptedIn;
  const granted=prefs.permissionGranted;
  return `
  <div class="info-title" style="font-size:14px;margin-bottom:10px">\u{1F514} Study Reminders <span style="font-size:11px;color:#888;font-weight:400">\u00B7 optional</span></div>
  <div class="card" style="margin-bottom:14px">
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:2px">Daily study nudge</div>
        <div style="font-size:12px;color:#888;line-height:1.5">A friendly reminder to keep your streak alive.${granted?' <span style=\"color:var(--ok)\">\u2713 enabled</span>':''}</div>
      </div>
      <button onclick="requestNotifPermission()" style="padding:8px 14px;border-radius:8px;border:.5px solid var(--brand-2);background:${on?'var(--brand-tint)':'#fff'};color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0">${on?'On':'Enable'}</button>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <label style="font-size:12px;color:#666;flex-shrink:0">Reminder time</label>
      <input type="time" value="${time}" onchange="setNotifPrefs({dailyTime:this.value});showToast('Reminder time saved','success',1800)" style="padding:8px 10px;border-radius:8px;border:.5px solid var(--border-3);font-size:13px;font-family:inherit;background:#fff">
    </div>
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding-top:12px;border-top:.5px solid #eee">
      <input type="checkbox" ${emailOn?'checked':''} onchange="setNotifPrefs({emailDigestOptedIn:this.checked});showToast(this.checked?'Weekly email on':'Weekly email off','info',1800)" style="width:18px;height:18px;flex-shrink:0;accent-color:var(--brand)">
      <span style="font-size:13px;color:#333;line-height:1.4">Send me a weekly progress email on Sundays</span>
    </label>
  </div>`;
}

function renderRegister(){
  const st=loadStudent();
  const COUNTRIES=['Egypt','Saudi Arabia','UAE','Kuwait','Qatar','Bahrain','Oman','Jordan','Lebanon','Iraq','Syria','Palestine','Yemen','Libya','Tunisia','Algeria','Morocco','Sudan','Somalia','Djibouti','Comoros','Mauritania'];
  const TITLES=['Student','Accountant','Senior Accountant','Financial Analyst','Senior Financial Analyst','Cost Accountant','Internal Auditor','Finance Manager','CFO','Controller','Consultant','Other'];
  const LEVELS=['Complete Beginner','Some Accounting Background','Finance Professional','CPA/ACCA Holder','Other'];
  const GOALS=['Pass CMA Part 1 Only','Pass Both Parts','Career Change','Promotion/Salary Increase','Personal Development'];

  const isComplete=!!(st&&st.name&&st.mobile);
  // Profile nudge — gentle, not a blocker
  const warningBanner=!isComplete?`<div class="profile-nudge"><span style="font-size:22px;flex-shrink:0">👋</span><div class="profile-nudge-text"><strong style="display:block;margin-bottom:2px">Complete your profile</strong>Unlock the leaderboard, community posting, and let Mohamed personalise your experience.</div><button class="profile-nudge-btn" onclick="document.getElementById('f-name')?.scrollIntoView({behavior:'smooth'})">Complete →</button></div>`:'';

  const profileSection = st && isComplete ? `
    <div style="background:linear-gradient(135deg,var(--brand),var(--brand-3));border-radius:12px;padding:16px;margin-bottom:16px;color:#fff;display:flex;align-items:center;gap:12px">
      <div style="width:52px;height:52px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,255,255,.5)">${safePhotoURL(st.photo)?`<img src="${safePhotoURL(st.photo)}" style="width:100%;height:100%;object-fit:cover">`:`<div style="width:100%;height:100%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:22px">${st.name?st.name.charAt(0).toUpperCase():'?'}</div>`}</div>
      <div style="min-width:0">
        <div style="font-size:16px;font-weight:500">${esc(st.name||'')}</div>
        <div style="font-size:12px;opacity:.85;margin-top:2px">${esc(st.title||'')}${st.company?` · ${esc(st.company)}`:''}</div>
        <div style="font-size:11px;opacity:.7;margin-top:2px">${esc(st.country||'')}${st.university?` · ${esc(st.university)}`:''}</div>
      </div>
    </div>` : `
    <div style="background:var(--brand-tint);border-radius:12px;padding:14px 16px;margin-bottom:16px;text-align:center">
      <div style="font-size:18px;margin-bottom:6px">👋</div>
      <div style="font-size:14px;font-weight:500;color:var(--brand);margin-bottom:4px">Welcome! Please complete your profile</div>
      <div style="font-size:12px;color:var(--brand-2)">This helps Mohamed track your progress and personalize your learning experience.</div>
    </div>`;

  const fval=(k)=>st?esc(st[k]||''):'';
  const fsel=(k,v)=>st&&st[k]===v?'selected':'';

  // Batch 6: profile completeness progress bar (LinkedIn-style)
  const _progFields=['name','mobile','email','country','city','university','title','company','level','goal','examdate','timezone','preferredLang','attemptType'];
  const _progFilled=_progFields.filter(k=>st&&String(st[k]||'').trim()).length;
  const _progPct=Math.round((_progFilled/_progFields.length)*100);
  const _progColor=_progPct>=80?'var(--ok-2)':(_progPct>=50?'var(--brand)':'var(--warn)');
  const progressBar=`<div class="profile-progress" style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-size:13px;font-weight:600;color:var(--ink)">Profile completeness</div><div style="font-size:13px;font-weight:700;color:${_progColor}">${_progPct}%</div></div><div style="height:8px;background:var(--surface-4);border-radius:4px;overflow:hidden"><div style="height:100%;width:${_progPct}%;background:${_progColor};border-radius:4px;transition:width .4s ease"></div></div><div style="font-size:11px;color:#888;margin-top:6px">${_progFilled} of ${_progFields.length} fields filled${_progPct<100?' · the more we know, the better we can personalize your prep':' · nicely done!'}</div></div>`;

  return`${renderSubNav(SUB_ME,'register')}<div class="sh"><h2>Student Profile</h2><p>${isComplete?'Your profile is complete — welcome! Tap any field to update.':'Complete your profile to get started'}</p></div>
  <div class="scroll-area pad" style="padding-top:14px">
    ${warningBanner}
    ${profileSection}
    ${progressBar}

    ${renderNotifOptInCard()}

    <div class="info-title" style="font-size:14px;margin-bottom:10px">👤 Personal Information <span style="font-size:11px;color:var(--err-2);font-weight:400">· name &amp; mobile required</span></div>
    <div class="card" style="margin-bottom:14px">
      <div style="margin-bottom:16px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:8px">Profile Photo <span style="color:#aaa">(optional)</span></label>
        <div style="display:flex;align-items:center;gap:14px">
          <div id="photo-preview" onclick="document.getElementById('f-photo').click()" style="width:80px;height:80px;border-radius:50%;border:2px dashed var(--border-4);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;overflow:hidden;background:var(--surface-3)">
            ${st&&safePhotoURL(st.photo)?`<img src="${safePhotoURL(st.photo)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span style="font-size:24px">📷</span><span style="font-size:10px;color:#aaa;margin-top:3px">Tap to add</span>`}
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:4px">Upload your photo</div>
            <div style="font-size:12px;color:#888;line-height:1.5;margin-bottom:8px">A clear face photo helps personalize your profile. Optional — JPG or PNG, max 2MB.</div>
            <button onclick="document.getElementById('f-photo').click()" style="padding:7px 14px;border-radius:8px;border:.5px solid var(--brand-2);background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">
              ${st&&st.photo?'Change Photo':'Choose Photo'}
            </button>
          </div>
        </div>
        <input type="file" id="f-photo" accept="image/*" style="display:none" onchange="handlePhoto(this)">
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Full Name *</label>
        <input id="f-name" type="text" value="${fval('name')}" placeholder="Your full name" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Mobile (WhatsApp) *</label>
          <input id="f-mobile" type="tel" value="${fval('mobile')}" placeholder="+20..." style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
        </div>
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Country</label>
          <select id="f-country" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
            <option value="">Select...</option>
            ${COUNTRIES.map(c=>`<option value="${c}" ${fsel('country',c)}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Email</label>
        <input id="f-email" type="email" value="${(st&&st.email)?esc(st.email):(STATE.user&&STATE.user.email?esc(STATE.user.email):'')}" placeholder="your@email.com" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
      </div>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">🎓 Education & Career <span style="font-size:11px;color:#888;font-weight:400">· optional</span></div>
    <div class="card" style="margin-bottom:14px">
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">University / Institution</label>
        <input id="f-university" type="text" value="${fval('university')}" placeholder="e.g. Cairo University" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Faculty / Major</label>
          <input id="f-faculty" type="text" value="${fval('faculty')}" placeholder="e.g. Commerce" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
        </div>
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Graduation Year</label>
          <input id="f-gradyear" type="number" value="${fval('gradyear')}" placeholder="e.g. 2020" min="1990" max="2030" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
        </div>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Current Job Title</label>
        <select id="f-title" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
          <option value="">Select your title...</option>
          ${TITLES.map(t=>`<option value="${t}" ${fsel('title',t)}>${t}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Company / Organization</label>
          <input id="f-company" type="text" value="${fval('company')}" placeholder="Company name" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
        </div>
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Years of Experience</label>
          <input id="f-experience" type="number" value="${fval('experience')}" placeholder="e.g. 5" min="0" max="40" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
        </div>
      </div>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">👥 Group Code <span style="font-size:11px;color:#aaa;font-weight:400">· if you're in a class</span></div><div class="card" style="margin-bottom:14px"><label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Your instructor's group code</label><input id="f-groupcode" type="text" value="${fval('groupCode')}" placeholder="" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9\x2D]/g,'')" maxlength="20" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:'Courier New',monospace;letter-spacing:.5px;outline:none;color:var(--ink);background:var(--surface);text-transform:uppercase">${(st&&st.pendingGroupCode&&st.pendingGroupCode!==(st.groupCode||''))?`<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--warn-tint);color:var(--warn-strong);font-size:12px;font-weight:600">⏳ Pending instructor approval for ${esc(st.pendingGroupCode)}</div>`:''}<div style="font-size:11px;color:#888;margin-top:6px;line-height:1.5">Enter the code your instructor gave you to unlock your group's <b>Question of the Day</b>. Leave blank if you're studying on your own.</div></div><div class="info-title" style="font-size:14px;margin-bottom:10px">📊 CMA Study Profile <span style="font-size:11px;color:#aaa;font-weight:400">· optional</span></div>
    <div class="card" style="margin-bottom:14px">
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Your current accounting/finance level</label>
        <select id="f-level" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
          <option value="">Select level...</option>
          ${LEVELS.map(l=>`<option value="${l}" ${fsel('level',l)}>${l}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Your CMA goal</label>
        <select id="f-goal" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
          <option value="">Select goal...</option>
          ${GOALS.map(g=>`<option value="${g}" ${fsel('goal',g)}>${g}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Target exam window</label>
        <select id="f-examdate" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
          ${(()=>{const current=fval('examdate');const normalized=_normalizeExamWindow(current);const windows=_getExamWindows();return '<option value="">— Select target window —</option>'+windows.map(w=>`<option value="${w.value}" ${normalized===w.value?'selected':''}>${w.label}</option>`).join('');})()}
        </select>
        <div style="font-size:11px;color:#888;margin-top:6px;line-height:1.5">CMA testing windows: <b>Jan/Feb</b>, <b>May/Jun</b>, <b>Sep/Oct</b>. Pick the window that matches your planned test date.</div>
      </div>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">🌍 Location & Preferences <span style="font-size:11px;color:#aaa;font-weight:400">· optional</span></div>
    <div class="card" style="margin-bottom:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">City</label>
          <input id="f-city" type="text" value="${fval('city')}" placeholder="e.g. Cairo, Dubai" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
        </div>
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Timezone</label>
          <select id="f-timezone" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
            <option value="">Auto-detect</option>
            <option value="Africa/Cairo" ${fsel('timezone','Africa/Cairo')}>Cairo (GMT+2)</option>
            <option value="Asia/Riyadh" ${fsel('timezone','Asia/Riyadh')}>Riyadh (GMT+3)</option>
            <option value="Asia/Dubai" ${fsel('timezone','Asia/Dubai')}>Dubai (GMT+4)</option>
            <option value="Asia/Kuwait" ${fsel('timezone','Asia/Kuwait')}>Kuwait (GMT+3)</option>
            <option value="Asia/Qatar" ${fsel('timezone','Asia/Qatar')}>Qatar (GMT+3)</option>
            <option value="Asia/Bahrain" ${fsel('timezone','Asia/Bahrain')}>Bahrain (GMT+3)</option>
            <option value="Asia/Muscat" ${fsel('timezone','Asia/Muscat')}>Muscat (GMT+4)</option>
            <option value="Africa/Casablanca" ${fsel('timezone','Africa/Casablanca')}>Casablanca (GMT+1)</option>
            <option value="Africa/Tunis" ${fsel('timezone','Africa/Tunis')}>Tunis (GMT+1)</option>
            <option value="Europe/London" ${fsel('timezone','Europe/London')}>London (GMT+0)</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Preferred Language</label>
          <select id="f-preferredLang" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
            <option value="">Auto (browser)</option>
            <option value="ar" ${fsel('preferredLang','ar')}>العربية · Arabic</option>
            <option value="en" ${fsel('preferredLang','en')}>English</option>
            <option value="mixed" ${fsel('preferredLang','mixed')}>Mixed (AR+EN)</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Exam Attempt</label>
          <select id="f-attemptType" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
            <option value="">Select...</option>
            <option value="first" ${fsel('attemptType','first')}>First attempt</option>
            <option value="retake" ${fsel('attemptType','retake')}>Retake</option>
            <option value="review" ${fsel('attemptType','review')}>Review / Refresher</option>
          </select>
        </div>
      </div>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">⚙️ App Preferences</div><div class="card" style="margin-bottom:14px"><div style="margin-bottom:12px"><label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Font size</label><div style="display:flex;gap:6px">${['sm','md','lg'].map(v=>{const on=STATE.fontSize===v;const lbl={sm:'Small',md:'Medium',lg:'Large'}[v];return `<button onclick="saveFontSize('${v}');render()" style="flex:1;padding:10px;border-radius:8px;border:.5px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand-tint)':'var(--surface)'};color:${on?'var(--brand)':'#555'};font-size:${v==='sm'?'12px':v==='md'?'13px':'15px'};font-weight:${on?'600':'400'};cursor:pointer;font-family:inherit">${lbl}</button>`;}).join('')}</div><div style="font-size:11px;color:#888;margin-top:4px">Applied instantly across the app.</div></div><div><label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Daily study goal (minutes)</label><div style="display:flex;gap:8px;align-items:center"><input id="f-dailygoal" type="number" min="5" max="240" step="5" value="${STATE.dailyGoalMinutes||30}" style="flex:1;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)"><button onclick="saveDailyGoal(document.getElementById('f-dailygoal').value);showToast('Goal saved ✓','success',1500)" style="padding:10px 16px;border-radius:8px;border:none;background:var(--brand);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Save</button></div><div style="font-size:11px;color:#888;margin-top:4px">Tracked on the Home screen goal ring.</div></div></div><div style="background:var(--surface-3);border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:12px;color:#888;text-align:center;line-height:1.5">
      Only <b>Name</b> and <b>Mobile</b> are required. All other fields are optional — but the more you fill in, the more we can personalize your experience.
    </div>
    <button onclick="submitProfile()" class="btn submit-profile-btn" style="background:var(--brand);color:#fff;font-size:15px;margin-bottom:8px">
      ${isComplete?'Update My Profile ✓':'Complete Profile & Unlock the App →'}
    </button>
    <div style="height:20px"></div>
  </div>`;
}

let _currentRating = loadFeedback().rating || 0;
function handlePhoto(input){
  const file=input.files[0];
  if(!file)return;
  if(file.size>2*1024*1024){showToast('Photo is too large. Please choose an image under 2MB.','error');input.value='';return;}
  const reader=new FileReader();
  reader.onload=function(e){
    const b64=e.target.result;
    const preview=document.getElementById('photo-preview');
    if(preview){preview.innerHTML=`<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;}
    window._pendingPhoto=b64;
  };
  reader.readAsDataURL(file);
}

async function sendToSheet(data){
  try{
    await fetch('https://script.google.com/macros/s/AKfycbwwfDLTcBC70-zpLM0bySnOZN7XzReVVLXbE-_nJr_jFmIoRNRnBa2hw1P93iCI_tMscg/exec',{
      method:'POST',
      mode:'no-cors',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
  }catch(e){console.log('Sheet sync error:',e);}
}

// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 7 — CMA Exam Window Helpers
// ═══════════════════════════════════════════════════════════════════════════
// The IMA offers only three CMA testing windows per year: Jan/Feb, May/Jun,
// Sep/Oct. Storage stays 'YYYY-MM' (last month of window: -02, -06, -10) so
// existing countdown code (renderIntro, renderStudy) works unchanged.
function _getExamWindows(){
  const years=[2026,2027,2028];
  const out=[];
  years.forEach(y=>{
    out.push({value:`${y}-02`, label:`Jan/Feb ${y}`});
    out.push({value:`${y}-06`, label:`May/Jun ${y}`});
    out.push({value:`${y}-10`, label:`Sep/Oct ${y}`});
  });
  return out;
}
// Migrate legacy invalid months → snap forward to next valid window.
// Accepts 'YYYY-MM'. Returns valid 'YYYY-MM' or '' if input empty/invalid shape.
function _normalizeExamWindow(v){
  if(!v||typeof v!=='string')return '';
  const m=v.match(/^(\d{4})-(\d{2})$/);
  if(!m)return '';
  const year=parseInt(m[1],10);
  const month=parseInt(m[2],10);
  // Valid target months: 2 (Jan/Feb), 6 (May/Jun), 10 (Sep/Oct)
  if(month===2||month===6||month===10)return v;
  // Snap forward to next valid window in the same year, else next year
  let ny=year, nm;
  if(month===1)nm=2;
  else if(month>=3&&month<=5)nm=6;
  else if(month>=7&&month<=9)nm=10;
  else if(month===11||month===12){ ny=year+1; nm=2; }
  else return '';
  return `${ny}-${String(nm).padStart(2,'0')}`;
}

async function submitProfile(){
  const get=(id)=>document.getElementById(id)?.value?.trim()||'';
  const name=get('f-name'),mobile=get('f-mobile'),country=get('f-country');
  const email=get('f-email')||(STATE.user&&STATE.user.email)||'';
  const university=get('f-university'),faculty=get('f-faculty'),gradyear=get('f-gradyear');
  const title=get('f-title'),company=get('f-company'),experience=get('f-experience');
  const level=get('f-level'),goal=get('f-goal');
  // Batch 7: normalize exam date to valid CMA testing window
  const examdate=_normalizeExamWindow(get('f-examdate'));
  const groupCode=(get('f-groupcode')||'').toUpperCase();
  // Batch 6: new profile fields
  const city=get('f-city');
  const timezone=get('f-timezone');
  const preferredLang=get('f-preferredLang');
  const attemptType=get('f-attemptType');
  const missing=[];
  if(!name)missing.push('Full Name');if(!mobile)missing.push('Mobile (WhatsApp)');
  const existingPhoto=loadStudent()?.photo||'';
  const pendingB64=window._pendingPhoto||'';
  if(missing.length>0){
    showModal({icon:'📋',title:'Missing Required Fields',body:'Please complete the following to continue:',list:missing,type:'warning',confirmText:'OK'});return;
  }
  // ── Batch 11: Group join-approval workflow ────────────────────────────
  // A valid code no longer writes `groupCode` directly. It's only applied
  // immediately if it matches the student's ALREADY-APPROVED group
  // (grandfathered / unchanged — re-saving the profile shouldn't re-trigger
  // approval). Any NEW code or a SWITCH to a different code goes through
  // instructor approval via a `group-requests` doc + `pendingGroupCode`.
  // Empty code = leaving / self-study — allowed directly, no approval needed.
  const _priorStudent=loadStudent();
  const currentGroupCode=(_priorStudent&&_priorStudent.groupCode||'').toUpperCase();
  const currentPending=(_priorStudent&&_priorStudent.pendingGroupCode||'').toUpperCase();
  let groupCodeToSave=currentGroupCode;
  let pendingGroupCodeToSave=_priorStudent&&_priorStudent.pendingGroupCode||'';
  let justRequestedCode='';
  if(groupCode){
    if(groupCode===currentGroupCode){
      groupCodeToSave=groupCode;   // unchanged / grandfathered — no approval needed
      pendingGroupCodeToSave='';
    }else{
      try{
        const snap=await db.collection('groups').where('code','==',groupCode).limit(1).get();
        if(snap.empty){
          showModal({
            icon:'⚠️',
            title:'Group Code Not Found',
            body:`The group code "${groupCode}" doesn't match any active group. Please check with your instructor for the correct code, or leave it blank if you're studying on your own.`,
            type:'warning',
            confirmText:'OK'
          });
          return;
        }
        // New join, or switching from a different already-approved group —
        // both go through approval. Avoid duplicate request docs if a
        // request for this exact code is already pending.
        if(groupCode!==currentPending){
          await db.collection('group-requests').add({
            uid:STATE.user.uid,
            studentName:name,studentEmail:email,studentMobile:mobile,
            groupCode,status:'pending',
            requestedAt:new Date().toISOString(),resolvedAt:null,resolvedBy:null
          });
        }
        pendingGroupCodeToSave=groupCode;
        justRequestedCode=groupCode;
        // groupCodeToSave stays at currentGroupCode — real membership only
        // changes on instructor approval.
      }catch(err){
        // Network / permission failure — don't block the rest of the save.
        console.warn('[submitProfile] group code validation skipped (network error):', err);
      }
    }
  }else{
    groupCodeToSave='';
    pendingGroupCodeToSave='';
  }
  let photoUrl=existingPhoto;
  if(pendingB64&&pendingB64.startsWith('data:')){
    try{
      const fd=new FormData();fd.append('file',pendingB64);fd.append('upload_preset',CLD_PRESET);
      const res=await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`,{method:'POST',body:fd});
      const cldData=await res.json();
      if(cldData.secure_url){photoUrl=cldData.secure_url;}else{photoUrl=pendingB64;}
    }catch(err){photoUrl=pendingB64;}
    window._pendingPhoto=null;
  }
  saveStudent({name,mobile,email,country,city,university,faculty,gradyear,title,company,experience,level,goal,examdate,groupCode:groupCodeToSave,pendingGroupCode:pendingGroupCodeToSave,timezone,preferredLang,attemptType,photo:photoUrl,registeredAt:loadStudent()?.registeredAt||new Date().toISOString()});
  STATE.showProfileWarning=false;
  try{STATE.qotdState={dateKey:'',question:null,selected:null,answered:false,taughtUnitCount:0};ensureQotd();}catch(e){}

  // Send to Google Sheets
  const fb2=loadFeedback();
  sendToSheet({
    name,mobile,email,country,city,university,faculty,gradyear,
    title,company,experience,level,goal,examdate,
    timezone,preferredLang,attemptType,
    photo:photoUrl||'No Photo'
  });

  render();
  setTimeout(()=>{
    const el=document.getElementById('content-area');
    if(el)el.scrollTop=0;
  },50);
  // Batch 11: let the student know a join/switch request is pending.
  const _pendingNote=justRequestedCode?`<br><br>⏳ Your request to join group <b>${esc(justRequestedCode)}</b> is pending your instructor's approval. You'll get full access to that group once approved.`:'';
  showModal({icon:'🎓',title:'Welcome Aboard!',body:"Great to have you here. I've received your info and I'm ready to help you pass the CMA. Let's get to work! — Gawad"+_pendingNote,type:'success',confirmText:'Let\'s Go 🚀'});
}

async function navTo(tab){
  // End any active study session when navigating away
  if(tab!=='study'&&tab!=='quiz-session') endStudyTimer();
  if(STATE.mockExam&&(STATE.mockExam.status==='mcq'||STATE.mockExam.status==='cbq')&&tab!=='mock-exam'){
    const _leaveOk=await showModal({icon:'⚠️',title:'Leave Exam?',body:'Your timer will stop and all progress will be lost.',type:'warning',confirmText:'Leave Exam',cancelText:'Stay'});
    if(!_leaveOk)return;
    mockClearTimers();STATE.mockExam.status='idle';
  }
  // Auth guard — only login/onboarding are accessible without sign-in
  if(!STATE.user&&tab!=='login'&&tab!=='loading'&&tab!=='onboarding'){
    STATE.tab='login';render();return;
  }
  STATE.showProfileWarning=false;
  if(tab==='lessons'&&tab!==STATE.tab){STATE.sectId=null;STATE.lessonId=null;}
  if(tab==='community'){STATE.communityLoaded=false;}
  STATE.tab=tab;render();
}
// ─── AUTH STATE LISTENER ──────────────────────────────────────────────────────
// ── PWA: Register Service Worker + Auto-Update ────────────────────────────────
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{

    // Batch 4: handle deep-link intents posted by the SW notificationclick.
    navigator.serviceWorker.addEventListener('message', ev=>{
      if(ev.data && ev.data.type==='DEEP_LINK' && ev.data.target){
        try{navTo(ev.data.target);}catch(e){}
      }
    });

    navigator.serviceWorker.register('./sw.js',{scope:'./'})
      .then(reg=>{
        console.log('[SW] Registered, scope:', reg.scope);

        // ── Helper: tell the waiting SW to take over, then reload ──────────
        function activateWaitingAndReload(worker){
          worker.postMessage({type:'SKIP_WAITING'});
        }

        // ── When controller changes (new SW activated) → reload the page ───
        let reloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if(reloading) return;
          reloading = true;
          console.log('[SW] New version activated — reloading…');
          window.location.reload();
        });

        // ── If a new SW is already waiting right now (e.g. revisit) ────────
        if(reg.waiting){
          activateWaitingAndReload(reg.waiting);
          return;
        }

        // ── Watch for a new SW that installs while the page is open ────────
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if(!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if(newWorker.state === 'installed' && navigator.serviceWorker.controller){
              console.log('[SW] Update ready — activating…');
              activateWaitingAndReload(newWorker);
            }
          });
        });

        // ── Poll for updates on every page load, and every 5 minutes ───────
        // Batch 24 (B24-15): a failed check (weak/lost mobile signal) rejected
        // an unhandled promise, which the Errors tab logged as a crash. The
        // browser simply retries on the next check, so failures are ignored.
        const _swCheck=()=>{ if(navigator.onLine===false)return; reg.update().catch(()=>{}); };
        _swCheck();
        setInterval(_swCheck, 5 * 60 * 1000);
      })
      .catch(err => console.warn('[SW] Registration failed:', err));

    // Show install banner on mobile if not already installed/dismissed
    updateInstallBanner();
  });
}



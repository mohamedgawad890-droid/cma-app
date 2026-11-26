// ═══════════════════════════════════════════════════════════════════════════
//  MY GROUP TAB — lecture schedule, study roadmap and exam guides per group
// ═══════════════════════════════════════════════════════════════════════════
// WHO SEES IT: students with an APPROVED group code (their own group only) and the
// instructor (can preview any group). The Firestore rule on group-space is the real
// protection; hiding the tab is only a convenience.
//
// DATA: group-space/{GROUPCODE} = { groupCode, note, rows:[row], updatedAt, updatedBy }
//   row = { id, lectureNumber, date:'YYYY-MM-DD', time:'HH:MM' (Cairo),
//           sectionId, plannedUnitIds:[], status:'planned'|'done'|'postponed',
//           actualUnitIds:[], note }
// The instructor edits it on Dashboard → Teaching → Group Schedule.
const MG_TZ='Africa/Cairo';
const MG_TTL=5*60000;                       // re-read at most every 5 minutes (Spark plan)
const MG_CACHE_KEY='cma-mygroup-v1';        // last copy, shown when offline
const _mg={byCode:{},preview:''};

function myGroupAllowed(){ return caseStudyAllowed(); } // same audience: instructor or approved member
function myGroupCodeLocal(){
  const st=loadStudent();
  return String((st&&st.groupCode)||'').trim().toUpperCase();
}
function mgNormalizeCode(c){ return String(c||'').trim().toUpperCase(); }

// ── Dates and times ─────────────────────────────────────────────────────────
function mgTodayCairo(){
  return new Intl.DateTimeFormat('en-CA',{timeZone:MG_TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
}
function mgDayName(date,locale){
  const d=new Date(date+'T12:00:00Z');
  return isNaN(d)?'':d.toLocaleDateString(locale||'en-GB',{weekday:'long',timeZone:'UTC'});
}
function mgDateText(date){
  const d=new Date(date+'T12:00:00Z');
  return isNaN(d)?'':d.toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'});
}
function mgTimeText(time){
  const m=/^(\d{1,2}):(\d{2})$/.exec(time||'');
  if(!m)return '';
  const h=+m[1];
  return ((h%12)||12)+':'+m[2]+' '+(h<12?'AM':'PM');
}
// Minutes that a time zone is ahead of UTC at a given instant.
function mgZoneOffset(ms,timeZone){
  const p={};
  new Intl.DateTimeFormat('en-US',{timeZone,hourCycle:'h23',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit'})
    .formatToParts(new Date(ms)).forEach(x=>{p[x.type]=x.value;});
  return Math.round((Date.UTC(+p.year,+p.month-1,+p.day,+p.hour%24,+p.minute)-Math.floor(ms/60000)*60000)/60000);
}
// The real instant of a Cairo wall-clock date and time (handles Egypt summer time).
function mgCairoInstant(date,time){
  const wall=Date.parse(date+'T'+time+':00Z');
  if(isNaN(wall))return null;
  let ms=wall-mgZoneOffset(wall,MG_TZ)*60000;
  ms=wall-mgZoneOffset(ms,MG_TZ)*60000;
  return new Date(ms);
}
// "Your time: …" only when the student's clock differs from Cairo. localZone is for tests.
function mgLocalTimeText(date,time,localZone){
  try{
    if(!time)return '';
    const at=mgCairoInstant(date,time);if(!at)return '';
    const zone=localZone||Intl.DateTimeFormat().resolvedOptions().timeZone;
    if(mgZoneOffset(at.getTime(),zone)===mgZoneOffset(at.getTime(),MG_TZ))return '';
    return at.toLocaleString('en-GB',{timeZone:zone,weekday:'short',day:'numeric',month:'short',hour:'numeric',minute:'2-digit',hour12:true});
  }catch(_){return '';}
}
function mgWhenHTML(r){
  if(!r.date)return '<span class="mg-when">التاريخ لم يتحدد بعد</span>';
  const local=mgLocalTimeText(r.date,r.time);
  return `<span class="mg-when" dir="ltr">${esc(mgDayName(r.date))} · ${esc(mgDateText(r.date))}${r.time?' · '+esc(mgTimeText(r.time))+' <small>Cairo time</small>':''}</span>`
    +(local?`<span class="mg-local">بتوقيتك: <bdi dir="ltr">${esc(local)}</bdi></span>`:'');
}

// ── Units ───────────────────────────────────────────────────────────────────
function mgUnitInfo(uid){
  for(const sec of S){
    const i=sec.lessons.findIndex(l=>l.id===uid);
    if(i>=0)return {sec,lesson:sec.lessons[i],n:i+1};
  }
  return null;
}
// Section heading(s) plus unit buttons; falls back to the chosen section when no unit is picked.
function mgUnitsHTML(unitIds,sectionId){
  const infos=(unitIds||[]).map(mgUnitInfo).filter(Boolean);
  if(!infos.length){
    const sec=sect(Number(sectionId));
    return sec?`<div class="mg-sec" dir="ltr">${sec.emoji} ${esc(sec.title)}</div>`:'';
  }
  const groups=[];
  infos.forEach(x=>{let g=groups.find(y=>y.sec===x.sec);if(!g){g={sec:x.sec,items:[]};groups.push(g);}g.items.push(x);});
  return groups.map(g=>`<div class="mg-sec" dir="ltr">${g.sec.emoji} ${esc(g.sec.title)}</div><div class="mg-units" dir="ltr">`
    +g.items.map(x=>`<button type="button" class="mg-unit" onclick="mgOpenUnit(${g.sec.id},'${x.lesson.id}')">${x.n}. ${esc(x.lesson.title)}</button>`).join('')
    +'</div>').join('');
}
function mgOpenUnit(secId,lessonId){ STATE.tab='study'; STATE.sectId=secId; STATE.lessonId=null; render(); studyGo(secId,lessonId); }

// Units already taught to a group: old teaching-log entries plus "Done" lectures in
// the new schedule. Used by Question of the Day and the daily quiz.
async function fetchTaughtUnits(groupCode){
  const code=mgNormalizeCode(groupCode);
  const taught=new Set();
  if(!code)return taught;
  const [log,space]=await Promise.allSettled([
    db.collection('teaching-log').where('groupCode','==',code).get(),
    db.collection('group-space').doc(code).get()
  ]);
  if(log.status==='fulfilled')log.value.docs.forEach(d=>(d.data().unitIds||[]).forEach(u=>taught.add(u)));
  if(space.status==='fulfilled'&&space.value.exists){
    (space.value.data().rows||[]).forEach(r=>{if(r.status==='done')(r.actualUnitIds||[]).forEach(u=>taught.add(u));});
  }
  if(log.status==='rejected'&&space.status==='rejected')throw log.reason;
  return taught;
}

// ── Loading ─────────────────────────────────────────────────────────────────
function mgReadCache(code){
  try{const c=JSON.parse(localStorage.getItem(MG_CACHE_KEY)||'null');return c&&STATE.user&&c.uid===STATE.user.uid&&c.code===code?c.data:null;}catch(_){return null;}
}
function mgWriteCache(code,data){
  try{
    if(!data){localStorage.removeItem(MG_CACHE_KEY);return;}
    localStorage.setItem(MG_CACHE_KEY,JSON.stringify({uid:STATE.user.uid,code,data:{rows:data.rows||[],note:data.note||''}}));
  }catch(_){}
}
async function mgLoad(code){
  const entry=_mg.byCode[code]||(_mg.byCode[code]={data:null,at:0});
  if(entry.loading)return;
  entry.loading=true;entry.error='';
  try{
    const snap=await db.collection('group-space').doc(code).get();
    entry.data=snap.exists?{rows:snap.data().rows||[],note:snap.data().note||''}:{rows:[],note:''};
    entry.stale=false;
    if(!isInstructor())mgWriteCache(code,entry.data);
  }catch(e){
    console.warn('[my-group] load failed',e);
    if(e&&e.code==='permission-denied'){entry.data=null;mgWriteCache(code,null);entry.error='denied';}
    else{
      const cached=mgReadCache(code);
      if(cached){entry.data=cached;entry.stale=true;}
      entry.error='offline';
    }
  }
  entry.at=Date.now();entry.loading=false;
  if(STATE.tab==='my-group')render();
}
function mgReload(code){ if(_mg.byCode[code])_mg.byCode[code].at=0; render(); }
function mgPreviewGroup(code){ _mg.preview=code; render(); }

// ── Schedule ────────────────────────────────────────────────────────────────
function mgSortRows(rows){
  return (rows||[]).slice().sort((a,b)=>(a.date||'9999').localeCompare(b.date||'9999')||(a.time||'').localeCompare(b.time||'')||Number(a.lectureNumber)-Number(b.lectureNumber));
}
function mgNextRow(rows,today){
  return mgSortRows(rows).find(r=>r.status==='planned'&&r.date&&r.date>=today)||null;
}
function mgStatusBadge(r,today){
  if(r.status==='done')return '<span class="mg-badge done">✓ تمت</span>';
  if(r.status==='postponed')return '<span class="mg-badge post">مؤجلة</span>';
  if(r.date&&r.date<today)return '<span class="mg-badge wait">في انتظار التحديث</span>';
  return '<span class="mg-badge plan">مخططة</span>';
}
function mgRowHTML(r,today){
  const done=r.status==='done';
  const planned=(r.plannedUnitIds||[]).slice().sort().join();
  const actual=(r.actualUnitIds||[]).slice().sort().join();
  const changed=done&&actual&&planned&&actual!==planned;
  return `<div class="card mg-row">
    <div class="mg-row-head"><b>محاضرة ${esc(String(r.lectureNumber||''))}</b>${mgStatusBadge(r,today)}</div>
    ${mgWhenHTML(r)}
    ${done&&actual?`<div class="mg-label">ما تم شرحه</div>${mgUnitsHTML(r.actualUnitIds,r.sectionId)}`:`<div class="mg-label">المخطط شرحه</div>${mgUnitsHTML(r.plannedUnitIds,r.sectionId)}`}
    ${changed?`<details class="mg-planned"><summary>الخطة الأصلية</summary>${mgUnitsHTML(r.plannedUnitIds,r.sectionId)}</details>`:''}
    ${r.note?`<div class="mg-note" dir="auto">${esc(r.note)}</div>`:''}
  </div>`;
}
function mgScheduleHTML(data){
  const today=mgTodayCairo();
  const rows=mgSortRows(data.rows);
  if(!rows.length)return '<div class="card mg-empty">لسه مفيش محاضرات في الجدول. هتظهر هنا أول ما المدرب يضيفها.</div>';
  const next=mgNextRow(rows,today);
  const upcoming=rows.filter(r=>r!==next&&r.status!=='done'&&(!r.date||r.date>=today));
  const past=rows.filter(r=>r!==next&&!upcoming.includes(r)).reverse();
  return (next?`<div class="mg-next"><div class="mg-next-label">المحاضرة القادمة${next.date===today?' · النهاردة':''}</div>
      <div class="mg-next-title">محاضرة ${esc(String(next.lectureNumber||''))}</div>${mgWhenHTML(next)}
      ${mgUnitsHTML(next.plannedUnitIds,next.sectionId)}${next.note?`<div class="mg-note" dir="auto">${esc(next.note)}</div>`:''}</div>`
    :'<div class="card mg-empty">مفيش محاضرة قادمة محددة حالياً.</div>')
    +(upcoming.length?'<div class="mg-title">المحاضرات الجاية</div>'+upcoming.map(r=>mgRowHTML(r,today)).join(''):'')
    +(past.length?`<details class="mg-past"><summary>المحاضرات السابقة (${past.length})</summary>${past.map(r=>mgRowHTML(r,today)).join('')}</details>`:'');
}

// ── Study roadmap and guides (the same for every group) ─────────────────────
const MG_ROADMAP=[
  {t:'ذاكر الـ Unit',do:'اقرأ الدرس كامل، وافتح كل Topic، وحل الـ Worked Examples بإيدك. دوس على أي مصطلح تحته خط عشان تشوف معناه.',
    next:'لما تقدر تشرح الفكرة الأساسية بكلامك من غير ما تبص.',btn:'افتح الدروس',go:'study'},
  {t:'راجع ملخص الدرس بالعربي',do:'في آخر كل درس. ركّز على الـ Traps والفروق بين المفاهيم المتشابهة.',
    next:'لما تعرف الـ Traps وليه بتلخبط.',btn:'افتح الدروس',go:'study'},
  {t:'حل الـ Unit Quiz',do:'حل من غير ما ترجع للدرس. اقرأ شرح كل سؤال، حتى اللي جاوبته صح.',
    next:'لما تجيب 70% أو أكتر. لو أقل، ارجع للـ Topics اللي غلطت فيها.',btn:'اختار الـ Unit',go:'study'},
  {t:'أعد حل الأخطاء (Wrong Answers)',do:'ارجع لأخطائك بعد يوم، وبعدها بعد كام يوم. اكتب سبب كل غلطة: مفهوم ولا حساب ولا قراءة سؤال.',
    next:'لما تحلها صح وتعرف تشرح ليه باقي الاختيارات غلط.',btn:'افتح Wrong Answers',go:'wrong-answers'},
  {t:'تدرّب على الـ Section كله',do:'بعد ما تخلص كل Units الـ Section، حل أسئلة مختلطة منه بوقت.',
    next:'لما تجيب 72% أو أكتر بشكل ثابت.',btn:'افتح Practice',go:'quiz-mode-select'},
  {t:'Mock Exam',do:'ابدأ بالـ Half Mock وبعدين الـ Full Mock، في ظروف امتحان حقيقية: من غير موبايل ولا وقفات.',
    next:'لما تجيب 72% أو أكتر وتخلص في الوقت.',btn:'افتح Mock Exam',go:'mock-exam'},
  {t:'عالج نقاط الضعف',do:'من صفحة Progress شوف الـ Weak Topics، وارجع للدرس ثم حل أسئلتها تاني.',
    next:'لما كل Weak Topic توصل 70% أو أكتر.',btn:'افتح Progress',go:'progress'}
];
const MG_GUIDES=[
  {t:'إزاي تحل سؤال MCQ',items:[
    'اقرأ المطلوب (آخر جملة) الأول، وبعدين ارجع للمعطيات.',
    'حدد الموضوع والقانون قبل ما تبدأ تحسب.',
    'خد بالك من كلمات زي EXCEPT و NOT و most likely و best.',
    'فيه معطيات زيادة مقصودة؛ استخدم اللي يخص المطلوب بس.',
    'حاول توصل لإجابة قبل ما تبص على الاختيارات، وبعدين استبعد الغلط.',
    'مفيش خصم على الإجابة الغلط، فماتسيبش أي سؤال فاضي.']},
  {t:'إدارة وقت الامتحان (Part 1)',items:[
    'الجزء الأول: 100 MCQ في 3 ساعات، يعني حوالي 1.8 دقيقة للسؤال.',
    'الجزء التاني: 2 CBQ في ساعة، يعني حوالي 30 دقيقة لكل واحد. لازم تجيب 50% على الأقل في الـ MCQ عشان يتفتح.',
    'علامات متابعة تقريبية: سؤال 33 بعد ساعة، وسؤال 66 بعد ساعتين.',
    'لو السؤال هياخد أكتر من 3 دقايق: اختار إجابة مبدئية، اعمله Flag، وكمّل.',
    'سيب آخر 10–15 دقيقة للأسئلة اللي عليها Flag.']}
];
function mgGo(tab){ if(tab==='study'){STATE.sectId=null;STATE.lessonId=null;} navTo(tab); }
function mgRoadmapHTML(note){
  return `<div class="mg-title">خريطة المذاكرة</div>
    ${note?`<div class="mg-group-note"><b>ملاحظة المدرب لمجموعتك</b><div dir="auto">${esc(note)}</div></div>`:''}
    <div class="mg-help">امشي بالترتيب مع كل Unit (خطوات 1–4)، وبعدين كمّل على مستوى الـ Section والامتحان. دوس على أي خطوة للتفاصيل.</div>
    <div class="mg-map">${MG_ROADMAP.map((s,i)=>`<details class="mg-step"${i===0?' open':''}>
      <summary><span class="mg-step-n">${i+1}</span><span>${s.t}</span></summary>
      <div class="mg-step-body"><p><b>تعمل إيه:</b> ${s.do}</p><p><b>تنقل للي بعدها:</b> ${s.next}</p>
      <button type="button" class="mg-go" onclick="mgGo('${s.go}')">${s.btn}</button></div></details>`).join('')}</div>
    ${MG_GUIDES.map(g=>`<details class="card mg-guide"><summary>${g.t}</summary><ul>${g.items.map(x=>`<li>${x}</li>`).join('')}</ul></details>`).join('')}`;
}

// ── Screen ──────────────────────────────────────────────────────────────────
function renderMyGroup(){
  if(!myGroupAllowed())return '<div class="scroll-area pad"><div class="card mg-empty" dir="rtl" style="margin-top:16px">الصفحة دي للطلبة المقبولين في مجموعة.</div></div>';
  let code=myGroupCodeLocal(),picker='';
  if(isInstructor()){
    if(!STATE.dashGroupsLoaded&&!_mg.groupsAsked){
      _mg.groupsAsked=true;
      db.collection('groups').get().then(s=>{_mg.groups=s.docs.map(d=>mgNormalizeCode(d.data().code)).filter(Boolean).sort();if(STATE.tab==='my-group')render();}).catch(()=>{_mg.groupsAsked=false;});
    }
    const codes=((STATE.dashGroups&&STATE.dashGroups.length)?STATE.dashGroups.map(g=>mgNormalizeCode(g.code)):(_mg.groups||[])).filter(Boolean).sort();
    code=_mg.preview||mgNormalizeCode(STATE.dashSelectedGroup)||codes[0]||'';
    picker='<div class="mg-picker" dir="ltr"><span>Preview group:</span>'+codes.map(c=>`<button type="button" class="sub-nav-btn${c===code?' active':''}" onclick="mgPreviewGroup('${esc(c)}')">${esc(c)}</button>`).join('')+'</div>';
  }
  const head=`<div class="sh"><h2>👥 My Group</h2><p dir="ltr">${esc(code||'—')}</p></div>`;
  if(!code)return head+`<div class="scroll-area pad">${picker}<div class="card mg-empty">Create a group first.</div></div>`;
  const entry=_mg.byCode[code];
  if(!entry||(!entry.loading&&Date.now()-entry.at>MG_TTL))setTimeout(()=>mgLoad(code),0);
  let body;
  if(!entry||(!entry.data&&!entry.error))body='<div class="card mg-empty">جاري تحميل جدول مجموعتك…</div>';
  else if(entry.error==='denied')body='<div class="card mg-empty">مش قادرين نعرض محتوى المجموعة. تأكد إن طلب انضمامك اتقبل، واقفل التطبيق وافتحه تاني.</div>';
  else if(!entry.data)body=`<div class="card mg-empty">مشكلة في الاتصال. <button type="button" class="mg-go" onclick="mgReload('${esc(code)}')">حاول تاني</button></div>`;
  else body=(entry.stale?`<div class="mg-help">بتشوف آخر نسخة محفوظة. <button type="button" class="mg-link" onclick="mgReload('${esc(code)}')">تحديث</button></div>`:'')+mgScheduleHTML(entry.data);
  return head+`<div class="scroll-area pad" style="padding-top:12px">${picker}<div class="mg" dir="rtl" lang="ar">${body}${mgRoadmapHTML(entry&&entry.data?entry.data.note:'')}</div><div style="height:20px"></div></div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 41 — Home exam-window picker, section-finish prompt, progress share card
// ═══════════════════════════════════════════════════════════════════════════
// All three features wrap existing functions (same pattern as 18-session-resume.js) and
// run inside try/catch, so a failure here can never break Home or lesson completion.
// To remove a feature: delete its block below.

// ── 1) Exam window: pick it on Home (no trip to the registration form) ──────────
// Stored exactly like the registration form does: student.examdate = 'YYYY-MM'
// (02 = Jan/Feb, 06 = May/Jun, 10 = Sep/Oct). "No date yet" only hides the prompt (this device).
var B41_NODATE_KEY = 'cma-nodate-v1';
function _b41NoDate(){ try{ return localStorage.getItem(B41_NODATE_KEY) === '1'; }catch(_){ return false; } }

function _b41Windows(){
  var now = new Date(), out = [];
  _getExamWindows().forEach(function(w){
    var p = w.value.split('-'), y = +p[0], m = +p[1];
    if(new Date(y, m, 0, 23, 59, 59) >= now) out.push(w);     // window's last day not passed yet
  });
  return out.slice(0, 4);
}
function _b41PickChips(selected){
  var h = '<div class="exam-pick">';
  _b41Windows().forEach(function(w){
    h += '<button type="button" class="' + (w.value === selected ? 'sel' : '') + '" onclick="homePickExamWindow(\'' + w.value + '\')">' + w.label + '</button>';
  });
  h += '<button type="button" class="ghost" onclick="homePickExamWindow(\'\')">No date yet</button></div>';
  return h;
}
function homePickExamWindow(v){
  try{
    if(!v){
      try{ localStorage.setItem(B41_NODATE_KEY, '1'); }catch(_){}
      try{ track('home_examdate_pick', { window: 'none' }); }catch(_){}
      STATE.homePickExam = false; render(); return;
    }
    var st = loadStudent();
    if(!st || !st.name){ homeSetExamDate(); return; }          // not registered yet → registration form
    saveStudent(Object.assign({}, st, { examdate: _normalizeExamWindow(v) || v }));
    try{ localStorage.removeItem(B41_NODATE_KEY); }catch(_){}
    try{ track('home_examdate_pick', { window: v }); }catch(_){}
    STATE.homePickExam = false;
    render();
    try{ showToast('Exam window saved. Your study plan is updated.', 'success'); }catch(_){}
  }catch(e){ try{ showToast('Could not save the exam window. Try again.', 'error'); }catch(_){} }
}
function homeTogglePickExam(){ STATE.homePickExam = !STATE.homePickExam; render(); }

// The Home "Set your exam date" tile now opens the picker instead of the long form.
var _b41OrigSetDate = homeSetExamDate;
homeSetExamDate = function(){
  var st = loadStudent();
  if(st && st.name){ STATE.homePickExam = true; render(); return; }
  return _b41OrigSetDate.apply(this, arguments);
};

function _b41ExamCardHTML(){
  try{
    if(!STATE.user || isInstructor()) return '';
    var st = loadStudent();
    if(!st || !st.name) return '';                       // unregistered students use the registration flow
    var cur = _normalizeExamWindow(st.examdate || '');
    if(cur && !STATE.homePickExam) return '';            // date set and not editing
    if(!cur && _b41NoDate() && !STATE.homePickExam) return '';
    return '<div class="card" style="margin-bottom:12px">'
      + '<div style="font-size:14px;font-weight:600;color:var(--ink)">📅 When do you plan to sit the exam?</div>'
      + '<div style="font-size:12px;color:#666;margin-top:3px;line-height:1.5">Pick your testing window for a countdown and a study plan that fits it.</div>'
      + '<div dir="rtl" lang="ar" style="font-size:12px;color:#666;margin-top:2px">اختر موعد الامتحان المتوقع لخطة مذاكرة مناسبة</div>'
      + _b41PickChips(cur) + '</div>';
  }catch(_){ return ''; }
}
// Study-plan card gets a small "Change" link.
(function(){
  var _sp = studyPlanHTML;
  studyPlanHTML = function(){
    var h = _sp.apply(this, arguments);
    if(!h) return h;
    var i = h.lastIndexOf('</div>');
    if(i < 0) return h;
    return h.slice(0, i) + '<div style="margin-top:6px"><span onclick="homeTogglePickExam()" role="button" style="font-size:12px;color:var(--brand-2);cursor:pointer">Change exam window</span></div>' + h.slice(i);
  };
  var _rs = renderStartLearningCard;
  renderStartLearningCard = function(){ return _rs.apply(this, arguments) + _b41ExamCardHTML(); };
})();

// ── 2) Finishing a section: offer the section quiz, then the next section ───────
function _b41SecAllDone(secId){
  var sec = sect(secId);
  return !!(sec && sec.lessons.length && sec.lessons.every(function(l){ return lessonDone(l.id); }));
}
function _b41NextSection(secId){
  var i = S.findIndex(function(s){ return s.id === secId; });
  return (i >= 0 && i < S.length - 1) ? S[i + 1] : null;
}
async function _b41SectionFinish(secId){
  var sec = sect(secId), next = _b41NextSection(secId);
  if(!sec) return;
  try{ track('section_complete', { section_id: String(secId) }); }catch(_){}
  var ok = await showModal({
    icon: '🎉', type: 'success', dismissable: false,
    title: 'Section complete: ' + sec.title,
    body: 'You finished all ' + sec.lessons.length + ' lessons. Test yourself with the section quiz' + (next ? ', or move on to the next section.' : '.'),
    confirmText: 'Section quiz',
    cancelText: next ? 'Next section' : 'Not now'
  });
  if(ok){ try{ track('section_finish_quiz', { section_id: String(secId) }); }catch(_){} startQuizMode(secId); }
  else if(next){ try{ track('section_finish_next', { section_id: String(secId) }); }catch(_){} STATE.tab = 'study'; studyGo(next.id, null); }
}
var _b41OrigMarkDone = markDone;
markDone = function(lid){
  var secId = parseInt(String(lid).split('-')[0], 10), was = false;
  try{ was = _b41SecAllDone(secId); }catch(_){}
  _b41OrigMarkDone.apply(this, arguments);
  try{
    if(!was && !isInstructor() && _b41SecAllDone(secId)) setTimeout(function(){ _b41SectionFinish(secId); }, 700);
  }catch(_){}
};

// ── 3) Progress share card: one tap → image (lessons done, streak) ──────────────
function _b41ProgressStats(){
  var st = loadStudent() || {};
  var done = (STATE.progress && STATE.progress.done) ? STATE.progress.done.length : 0;
  return { name: String(st.name || '').trim(), done: done, total: TOTAL_LESSONS, streak: getStudyStreak(),
           pct: Math.round(done / Math.max(1, TOTAL_LESSONS) * 100) };
}
function _b41DrawCard(s){
  var W = 1080, H = 1080, c = document.createElement('canvas'); c.width = W; c.height = H;
  var x = c.getContext('2d');
  var g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#0C447C'); g.addColorStop(1, '#185FA5');
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  x.fillStyle = '#c9a227'; x.fillRect(0, 0, W, 14);
  x.textAlign = 'center'; x.fillStyle = '#fff';
  x.font = '600 44px system-ui, Arial, sans-serif'; x.fillText('CMA Part 1 — My progress', W / 2, 150);
  if(s.name){ x.font = '400 38px system-ui, Arial, sans-serif'; x.fillStyle = 'rgba(255,255,255,.85)'; x.fillText(s.name, W / 2, 215); }
  x.fillStyle = '#c9a227'; x.font = '700 250px system-ui, Arial, sans-serif'; x.fillText(s.pct + '%', W / 2, 520);
  x.fillStyle = '#fff'; x.font = '500 46px system-ui, Arial, sans-serif';
  x.fillText(s.done + ' of ' + s.total + ' lessons completed', W / 2, 600);
  var bx = 140, bw = W - 280, by = 650, bh = 36;
  x.fillStyle = 'rgba(255,255,255,.25)'; x.beginPath(); x.roundRect ? x.roundRect(bx, by, bw, bh, 18) : x.rect(bx, by, bw, bh); x.fill();
  x.fillStyle = '#c9a227'; x.beginPath(); var fw = Math.max(bh, bw * s.pct / 100);
  x.roundRect ? x.roundRect(bx, by, fw, bh, 18) : x.rect(bx, by, fw, bh); x.fill();
  x.fillStyle = '#fff'; x.font = '600 56px system-ui, Arial, sans-serif';
  x.fillText('🔥 ' + s.streak + '-day study streak', W / 2, 810);
  x.font = '400 34px system-ui, Arial, sans-serif'; x.fillStyle = 'rgba(255,255,255,.85)';
  x.fillText('Studying with CMA Prep — free CMA Part 1 app', W / 2, 960);
  x.fillText('mohamedgawad890-droid.github.io/cma-app', W / 2, 1010);
  return c;
}
async function shareProgressCard(){
  try{
    var s = _b41ProgressStats(), c = _b41DrawCard(s);
    var blob = await new Promise(function(r){ c.toBlob(r, 'image/png'); });
    if(!blob){ showToast('Could not create the image on this device.', 'error'); return; }
    var file = new File([blob], 'cma-progress.png', { type: 'image/png' });
    var text = 'I have completed ' + s.done + ' of ' + s.total + ' lessons (' + s.pct + '%) of CMA Part 1 with CMA Prep. https://mohamedgawad890-droid.github.io/cma-app/';
    if(navigator.canShare && navigator.canShare({ files: [file] })){
      try{ await navigator.share({ files: [file], text: text }); try{ track('progress_share', { how: 'share' }); }catch(_){} return; }
      catch(e){ if(e && e.name === 'AbortError') return; }
    }
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cma-progress.png';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 4000);
    try{ track('progress_share', { how: 'download' }); }catch(_){}
    showToast('Image saved — share it from your gallery or downloads.', 'success');
  }catch(e){ try{ showToast('Could not create the image. Try again.', 'error'); }catch(_){} }
}
function progressShareCardHTML(){
  try{
    if(!STATE.user || isInstructor()) return '';
    var s = _b41ProgressStats();
    if(!s.done) return '';                                  // nothing to show off yet
    return '<div class="card" style="margin-bottom:12px;display:flex;align-items:center;gap:12px">'
      + '<div style="flex:1"><div style="font-size:14px;font-weight:600;color:var(--ink)">📤 Share your progress</div>'
      + '<div style="font-size:12px;color:#666;margin-top:2px">' + s.done + ' of ' + s.total + ' lessons · ' + s.streak + '-day streak</div></div>'
      + '<button class="btn" onclick="shareProgressCard()" style="width:auto;padding:9px 16px;background:var(--brand);color:#fff;font-size:13px">Share image</button></div>';
  }catch(_){ return ''; }
}
(function(){
  var _rp2 = renderProgress;
  renderProgress = function(){
    var h = _rp2.apply(this, arguments);
    var marker = '<button class="btn" onclick="STATE.tab=\'wrong-answers\';render()"';
    var i = h.indexOf(marker);
    if(i < 0) return h;
    return h.slice(0, i) + progressShareCardHTML() + h.slice(i);
  };
})();

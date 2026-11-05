// ─── BATCH 34: RESUMABLE SESSIONS, READINESS, STUDY PLAN, SPACED REVIEW, BOOKMARKS ───────────
//
// 1) RESUMABLE SESSIONS (Quiz Mode full/section, CBQ practice, Mock Exam, Custom Practice)
//    The unit quiz got this in Batch 31. Every other practice surface used to live only in
//    memory, so any tap on the sidebar (or a reload) threw the whole session away. Now each
//    surface autosaves a draft in THIS device's localStorage and offers "Resume" on its own page.
//    * Quiz Mode / CBQ: leaving by any route keeps the draft; Submit and Restart are always visible.
//    * Mock Exam / Custom Practice: leaving PAUSES the exam (the clock stops) and saves it.
//    * Drafts are per student per device, expire after 14 days of inactivity, and are deleted
//      when the student submits. Nothing is written to Firestore (free-tier quota unaffected).
//
// 2) Exam readiness (Progress page), weak-topic practice, Home study plan.
// 3) Spaced review: missed questions and flashcards come back after 1, 3, 7 and 14 days.
// 4) Bookmarks: a star on every unit-quiz and Quiz Mode question.
// 5) Forgot-password: resend countdown + Spam hint.   6) Dark mode.   7) Formula Bank PDF.

const SD_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// ── Generic per-student draft store ─────────────────────────────────────────
function _sdKey(name){
  const u = STATE.user && STATE.user.uid;
  return u ? 'cma-sess-v1:' + u + ':' + name : null;
}
function sdRead(name){
  const key = _sdKey(name);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || (Date.now() - (d.at || 0)) > SD_MAX_AGE_MS) { localStorage.removeItem(key); return null; }
    return d;
  } catch (_) { return null; }
}
function sdWrite(name, obj){
  const key = _sdKey(name);
  if (!key) return false;
  try { localStorage.setItem(key, JSON.stringify(Object.assign({ v: 1, at: Date.now() }, obj))); return true; }
  catch (_) { return false; }                       // storage full / private mode: the quiz still works, it just cannot be resumed
}
function sdClear(name){
  const key = _sdKey(name);
  if (key) { try { localStorage.removeItem(key); } catch (_) {} }
}
function _sdAgo(at){
  const m = Math.max(0, Math.round((Date.now() - (at || 0)) / 60000));
  if (m < 2) return 'just now';
  if (m < 60) return m + ' min ago';
  const h = Math.round(m / 60);
  if (h < 36) return h + ' h ago';
  return Math.round(h / 24) + ' days ago';
}
// Inserts html right after the opening tag of the first scrolling content area.
function _sdInsertInScroll(html, card){
  if (!card) return html;
  const m = /<div class="scroll-area pad"[^>]*>/.exec(html);
  if (!m) return html;
  const at = m.index + m[0].length;
  return html.slice(0, at) + card + html.slice(at);
}
function _sdCardHTML(icon, title, sub, resumeCall, discardCall){
  return '<div class="card sd-card" style="margin-bottom:12px;border:1px solid var(--warn);background:var(--warn-tint)">'
    + '<div style="font-size:13px;font-weight:600;color:var(--warn-strong);margin-bottom:3px">' + icon + ' ' + esc(title) + '</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">' + esc(sub) + '</div>'
    + '<div style="display:flex;gap:8px"><button class="btn" onclick="' + resumeCall + '" style="flex:1;background:var(--brand);color:#fff;font-size:13px">Resume</button>'
    + '<button class="btn btn-outline" onclick="' + discardCall + '" style="flex:0 0 auto;font-size:13px">Discard</button></div></div>';
}

// ═════════════════════════════════════════════════════════════════════════════
// QUIZ MODE (full CMA quiz, section quiz, weak-topic / spaced-review / bookmark sets)
// ═════════════════════════════════════════════════════════════════════════════
function _qmDecor(q, qi, sec, l){
  return Object.assign({}, q, { _qi: qi, lessonId: l.id, sectionId: sec.id, lessonTitle: l.title, sectionTitle: sec.title,
    secEmoji: sec.emoji, secBar: sec.bar, secBg: sec.bg, secText: sec.text, secStrong: sec.strong });
}
function _qmName(qm){
  return 'qm:' + (qm && qm.scope ? qm.scope : (qm && qm.sectionId ? String(qm.sectionId) : 'all'));
}
function _qmTitle(scope){
  if (scope === 'all') return 'Full CMA Quiz';
  if (scope === 'weak') return 'Weak-topics practice';
  if (scope === 'sr') return 'Spaced review';
  if (scope === 'bm') return 'Bookmarked questions';
  const sec = S.find(function(s){ return String(s.id) === String(scope); });
  return sec ? sec.title + ' Quiz' : 'Quiz';
}
function qmSave(){
  try {
    const qm = STATE.quizMode;
    if (!qm || !qm.active || qm.done || qm.isGrace) return;
    const name = _qmName(qm);
    const n = qm.questions.length;
    let answered = 0;
    for (let i = 0; i < n; i++) if (qm.answers[i]) answered++;
    if (!answered) { sdClear(name); return; }
    const items = qm.questions.map(function(q){ return { l: q.lessonId, i: q._qi, k: q.id || null, p: q._perm || null }; });
    if (items.some(function(it){ return it.i == null; })) return;           // cannot be rebuilt reliably
    const ans = [], qt = [];
    for (let i = 0; i < n; i++) { ans.push(qm.answers[i] ? qm.answers[i].selected : null); qt.push(qm.questionTimes[i] || 0); }
    sdWrite(name, { scope: qm.scope || (qm.sectionId ? String(qm.sectionId) : 'all'), sectionId: qm.sectionId || null, title: qm.title || null,
      idx: qm.idx, active: Date.now() - (qm.quizStartTime || Date.now()), items: items, ans: ans, qt: qt });
  } catch (_) {}
}
async function qmRestore(d){
  try {
    const secIds = Array.from(new Set(d.items.map(function(it){ return parseInt(String(it.l).split('-')[0], 10); }).filter(function(x){ return x > 0; })));
    await Promise.all(secIds.map(function(id){ return ensureQuizzes(id); }));
    const questions = [];
    for (let j = 0; j < d.items.length; j++) {
      const it = d.items[j];
      const f = _qdFindLesson(it.l);
      if (!f || !f.lesson.quizzes) return null;
      const base = f.lesson.quizzes[it.i];
      if (!base || (it.k != null && base.id !== it.k)) return null;       // the bank changed since the draft was saved
      let q = _qmDecor(base, it.i, f.sec, f.lesson);
      if (it.p) {
        if (!_qoValidPerm(it.p, base.o) || typeof base.a !== 'number') return null;
        q = _qoApply(q, it.p);
      }
      questions.push(q);
    }
    const n = questions.length, answers = [], times = [];
    for (let i = 0; i < n; i++) {
      times[i] = (d.qt && d.qt[i]) || 0;
      const sel = d.ans ? d.ans[i] : null;
      if (sel != null) answers[i] = { selected: sel, correct: sel === questions[i].a };
    }
    const idx = Math.min(Math.max(d.idx | 0, 0), n - 1);
    const cur = answers[idx], now = Date.now();
    return { active: true, sectionId: d.sectionId || null, scope: d.scope, title: d.title || null, idx: idx, questions: questions, answers: answers,
      selected: cur ? cur.selected : null, done: false, questionTimes: times,
      quizStartTime: now - (d.active || 0), qTimerStart: now, qTimerElapsed: cur ? (times[idx] || 0) : null };
  } catch (_) { return null; }
}
function qmStartSet(questions, scope, title){
  STATE.quizMode = { active: true, sectionId: null, scope: scope, title: title, idx: 0, questions: questions, answers: [], selected: null, done: false,
    questionTimes: [], quizStartTime: Date.now(), qTimerStart: Date.now(), qTimerElapsed: null };
  STATE.tab = 'quiz-mode';
  render();
}
async function qmResume(scope){
  const d = sdRead('qm:' + scope);
  if (!d) { showToast('That saved quiz is no longer available.', 'info'); render(); return; }
  STATE.tab = 'loading'; render();
  const st = await qmRestore(d);
  if (!st) {
    sdClear('qm:' + scope);
    showToast('The question bank changed, so that saved quiz could not be restored. Start a new one.', 'warning', 4500);
    STATE.tab = 'quiz-mode-select'; render(); return;
  }
  STATE.quizMode = st; STATE.tab = 'quiz-mode';
  showToast('Resuming · ' + st.answers.filter(Boolean).length + '/' + st.questions.length + ' answered', 'info', 3000);
  render();
}
function qmDiscard(scope){ sdClear('qm:' + scope); render(); }
async function qmRestart(){
  const qm = STATE.quizMode;
  if (!qm) return;
  const ok = await showModal({ icon: '↺', type: 'warning', title: 'Restart this quiz?',
    body: 'Your answers so far will be discarded and you will get a new set of questions.', confirmText: 'Restart', cancelText: 'Keep going' });
  if (!ok) return;
  sdClear(_qmName(qm));
  if (qm.scope === 'weak') return startWeakPractice();
  if (qm.scope === 'sr') return srStartReview();
  if (qm.scope === 'bm') return bmStartPractice();
  return startQuizMode(qm.sectionId || null, true);
}
(function(){
  const _sel = selectQuizModeAnswer;
  selectQuizModeAnswer = function(i){ _sel(i); qmSave(); };
  const _goto = quizModeGoto;
  quizModeGoto = function(i){ _goto(i); qmSave(); };
  const _start = startQuizMode;
  startQuizMode = async function(sectionId, force){
    const name = 'qm:' + (sectionId ? String(sectionId) : 'all');
    if (!force && sdRead(name)) {
      const ok = await showModal({ icon: '⏸', type: 'warning', title: 'Replace your saved quiz?',
        body: 'You have a paused quiz. Starting a new one will discard it. (Use Resume on the Quiz Mode page to continue the saved one.)',
        confirmText: 'Start new', cancelText: 'Keep it' });
      if (!ok) return;
    }
    sdClear(name);
    await _start(sectionId);
    if (STATE.quizMode && STATE.quizMode.active && !STATE.quizMode.done) STATE.quizMode.scope = sectionId ? String(sectionId) : 'all';
  };
  const _fin = finishQuizMode;
  finishQuizMode = async function(){
    const before = STATE.quizMode;
    await _fin();
    const qm = STATE.quizMode;
    if (qm && qm.done && qm === before) {
      sdClear(_qmName(qm));
      try { qm.questions.forEach(function(q, i){ const a = qm.answers[i]; if (a && !a.skipped && q.lessonId != null && q._qi != null) srRecordQ(q.lessonId, q._qi, q.id, !!a.correct); }); } catch (_) {}
    }
  };
  const _rqs = renderQuizModeSelect;
  renderQuizModeSelect = function(){
    let h = _rqs.apply(this, arguments);
    let cards = '';
    ['all', 1, 2, 3, 4, 5, 6, 'weak', 'sr', 'bm'].forEach(function(sc){
      const d = sdRead('qm:' + sc);
      if (!d || !d.items) return;
      const n = d.items.length, a = (d.ans || []).filter(function(x){ return x != null; }).length;
      cards += _sdCardHTML('⏸', 'Paused: ' + _qmTitle(String(sc)), a + '/' + n + ' answered · ' + _sdAgo(d.at),
        "qmResume('" + sc + "')", "qmDiscard('" + sc + "')");
    });
    cards += srDueCardHTML() + bmCardHTML();
    return _sdInsertInScroll(h, cards);
  };
})();

// ═════════════════════════════════════════════════════════════════════════════
// MOCK EXAM — autosave, pause on leave, resume
// (the exam itself lives in 11-cbq-mock-exam.js; it calls these hooks)
// ═════════════════════════════════════════════════════════════════════════════
function mockDraftSaveBase(){
  const m = STATE.mockExam;
  if (!m) return;
  sdWrite('mockq', { mcqQ: m.mcqQ, cbqCases: m.cbqCases });             // the fixed question set is written once
}
function mockDraftSave(){
  const m = STATE.mockExam;
  if (!m || (m.status !== 'mcq' && m.status !== 'cbq')) return;
  sdWrite('mock', { half: !!m.half, status: m.status, mcqA: m.mcqA, mcqFlagged: m.mcqFlagged, mcqCurr: m.mcqCurr, mcqTime: m.mcqTime,
    cbqA: m.cbqA, cbqScores: m.cbqScores, cbqCurr: m.cbqCurr, cbqTime: m.cbqTime });
}
function mockDraftClear(){ sdClear('mock'); sdClear('mockq'); }
function mockPause(){
  const m = STATE.mockExam;
  if (!m || (m.status !== 'mcq' && m.status !== 'cbq')) return false;
  mockDraftSave();
  mockClearTimers();
  STATE.mockExam = mockFreshState();
  showToast('Mock exam paused — the clock is stopped. Resume it from the Mock Exam page.', 'info', 4500);
  return true;
}
function mockResumeCardHTML(){
  const d = sdRead('mock'), q = sdRead('mockq');
  if (!d || !q || !q.mcqQ || !q.mcqQ.length) return '';
  const n = q.mcqQ.length, a = Object.keys(d.mcqA || {}).length;
  const phase = d.status === 'cbq' ? 'CBQ phase' : 'MCQ phase · ' + a + '/' + n + ' answered';
  const left = mockFmtTime(Math.max(0, d.status === 'cbq' ? d.cbqTime : d.mcqTime));
  return _sdCardHTML('⏸', 'Paused ' + (d.half ? 'half ' : '') + 'mock exam', phase + ' · ' + left + ' left · ' + _sdAgo(d.at), 'mockResumeDraft()', 'mockDiscardDraft()');
}
function mockHalfButtonHTML(loading){
  return '<button onclick="startMockExam(true)" ' + (loading ? 'disabled' : '') + ' style="width:100%;margin-top:10px;padding:13px;border-radius:12px;border:1.5px solid var(--brand);background:transparent;color:var(--brand);font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">⏱ Half Mock — 50 MCQs (90 min) + 1 CBQ (30 min)</button>'
    + '<div style="font-size:11px;color:#888;text-align:center;margin-top:6px">Same section weighting, exactly half the length — a shorter way to practise under time pressure.</div>';
}
function mockResumeDraft(){
  const d = sdRead('mock'), q = sdRead('mockq');
  if (!d || !q || !q.mcqQ) { showToast('That paused exam is no longer available.', 'info'); mockDraftClear(); render(); return; }
  mockClearTimers();
  STATE.mockExam = { status: d.status, half: !!d.half, mcqQ: q.mcqQ, mcqA: d.mcqA || {}, mcqFlagged: d.mcqFlagged || [],
    mcqCurr: Math.min(Math.max(d.mcqCurr | 0, 0), q.mcqQ.length - 1), mcqTime: d.mcqTime, mcqInterval: null,
    cbqCases: q.cbqCases || [], cbqA: d.cbqA || {}, cbqScores: d.cbqScores || {}, cbqCurr: d.cbqCurr | 0, cbqTime: d.cbqTime, cbqInterval: null,
    results: null, navOpen: false };
  STATE.tab = 'mock-exam';
  render();
  if (d.status === 'cbq') setTimeout(mockCbqApply, 40);
  showToast('Exam resumed — the clock is running again.', 'info', 3000);
}
async function mockDiscardDraft(){
  const ok = await showModal({ icon: '⚠️', type: 'warning', title: 'Discard paused exam?', body: 'Your answers and remaining time will be deleted.', confirmText: 'Discard', cancelText: 'Keep it' });
  if (!ok) return;
  mockDraftClear(); render();
}
// Re-applies saved CBQ answers to the freshly rendered case boxes.
function mockCbqApply(){
  const m = STATE.mockExam;
  if (!m || m.status !== 'cbq') return;
  Object.keys(m.cbqA || {}).forEach(function(ci){
    const cbq = m.cbqCases[ci]; if (!cbq) return;
    const ans = m.cbqA[ci] || {};
    cbq.questions.forEach(function(q){
      const a = ans[q.id];
      if (a == null) return;
      if (q.type === 'select') { const el = document.getElementById('mso_' + ci + '_' + q.id + '_' + a); if (el) el.classList.add('selected'); }
      else if (q.type === 'calc') { const el = document.getElementById('minp_' + ci + '_' + q.id); if (el) el.value = a; }
      else if (q.type === 'blank') { q.blanks.forEach(function(b){ const el = document.getElementById('mbl_' + ci + '_' + q.id + '_' + b.id); if (el && a[b.id] != null) el.value = a[b.id]; }); }
      else if (q.type === 'drag') {
        Object.keys(a).forEach(function(it){
          const chip = document.getElementById('mchip_' + ci + '_' + q.id + '_' + it.replace(/\W/g, '_'));
          const z = q.zones.find(function(zz){ return zz === a[it]; });
          const zone = z ? document.getElementById('mzone_' + ci + '_' + q.id + '_' + z.replace(/\W/g, '_')) : null;
          if (chip && zone) zone.appendChild(chip);
        });
      }
    });
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// CUSTOM PRACTICE TEST (runs on the exam runner as a personal pseudo-exam)
// ═════════════════════════════════════════════════════════════════════════════
function cpDraftSave(){
  try {
    const s = STATE.examSession;
    if (!s || !s.isPractice || s.submitted || !s.exam) return;
    sdWrite('cp', { exam: s.exam, answers: s.answers || {}, currentIdx: s.currentIdx | 0, flagged: s.flagged || {},
      remainMs: Math.max(0, Date.parse(s.deadlineAt) - Date.now()) });
  } catch (_) {}
}
function cpPause(){
  cpDraftSave();
  try { _examStopTimer(); } catch (_) {}
  STATE.examSession = null;
  showToast('Practice test paused — the clock is stopped. Resume it from Custom Test.', 'info', 4500);
}
async function cpResume(){
  const d = sdRead('cp');
  if (!d || !d.exam) { showToast('That paused test is no longer available.', 'info'); render(); return; }
  STATE.tab = 'loading'; render();
  try {
    const questions = await buildExamQuestions(d.exam, STATE.user.uid, 1);
    if (!questions || !questions.length) throw new Error('empty');
    const totalMs = (d.exam.durationMinutes || 0) * 60000;
    STATE.examSession = { examId: d.exam.id, exam: d.exam, questions: questions, answers: d.answers || {},
      currentIdx: Math.min(Math.max(d.currentIdx | 0, 0), questions.length - 1), flagged: d.flagged || {},
      startedAt: new Date(Date.now() - Math.max(0, totalMs - d.remainMs)).toISOString(),
      deadlineAt: new Date(Date.now() + d.remainMs).toISOString(),
      submitting: false, submitted: false, results: null, navOpen: false, isPractice: true, instructorReturnTab: 'custom-practice' };
    _examSaveLocal(STATE.examSession);
    STATE.tab = 'exam'; render(); _examStartTimer();
    showToast('Test resumed — the clock is running again.', 'info', 3000);
  } catch (e) {
    sdClear('cp');
    showToast('Could not restore that test. Start a new one.', 'warning', 4000);
    STATE.tab = 'custom-practice'; render();
  }
}
function cpDiscard(){ sdClear('cp'); render(); }
(function(){
  const _a = examAnswer;    examAnswer = function(q, o){ _a(q, o); cpDraftSave(); };
  const _g = examGoTo;      examGoTo = function(i){ _g(i); cpDraftSave(); };
  const _f = examToggleFlag; examToggleFlag = function(i){ _f(i); cpDraftSave(); };
  const _s = submitExam;
  submitExam = async function(auto){
    const s = STATE.examSession;
    const r = await _s(auto);
    if (s && s.isPractice && STATE.examSession === s && s.submitted) sdClear('cp');
    return r;
  };
  const _rcp = renderCustomPractice;
  renderCustomPractice = function(){
    const h = _rcp.apply(this, arguments);
    const d = sdRead('cp');
    if (!d || !d.exam) return h;
    const n = (d.exam.questionIds || []).length || d.exam.count || 0;
    const a = Object.keys(d.answers || {}).length;
    return _sdInsertInScroll(h, _sdCardHTML('⏸', 'Paused: ' + (d.exam.title || 'Custom practice'),
      a + '/' + n + ' answered · ' + mockFmtTime(Math.round((d.remainMs || 0) / 1000)) + ' left · ' + _sdAgo(d.at), 'cpResume()', 'cpDiscard()'));
  };
})();

// Starting a NEW mock exam / custom test while a paused one exists asks before replacing it.
(function(){
  const _sme = startMockExam;
  startMockExam = async function(half){
    if (sdRead('mock')) {
      const ok = await showModal({ icon: '\u23F8', type: 'warning', title: 'Replace your paused exam?',
        body: 'You have a paused mock exam. Starting a new one will discard it. (Use Resume above to continue the paused one.)', confirmText: 'Start new', cancelText: 'Keep it' });
      if (!ok) return;
      mockDraftClear();
    }
    return _sme(half);
  };
  const _scp = startCustomPractice;
  startCustomPractice = async function(){
    if (sdRead('cp')) {
      const ok = await showModal({ icon: '\u23F8', type: 'warning', title: 'Replace your paused test?',
        body: 'You have a paused practice test. Starting a new one will discard it. (Use Resume above to continue the paused one.)', confirmText: 'Start new', cancelText: 'Keep it' });
      if (!ok) return;
      sdClear('cp');
    }
    return _scp();
  };
})();

// Called by navTo(): leaving a running exam pauses it instead of discarding it.
function sessionLeaveHook(tab){
  if (tab !== 'mock-exam') mockPause();
  const s = STATE.examSession;
  if (tab !== 'exam' && STATE.tab === 'exam' && s && s.isPractice && !s.submitted) cpPause();
}

// ═════════════════════════════════════════════════════════════════════════════
// CBQ PRACTICE — autosave the case in progress; "Resume" on the case list
// ═════════════════════════════════════════════════════════════════════════════
let _cbqDraftTimer = null;
function cbqDraftSave(){
  try {
    if (STATE.tab !== 'cbq' || CBQ_S.view !== 'detail' || CBQ_S.checked) return;
    const has = Object.keys(CBQ_S.answers || {}).some(function(k){ const v = CBQ_S.answers[k]; return v !== '' && v != null && !(typeof v === 'object' && !Object.keys(v).length); });
    if (!has) { sdClear('cbq'); return; }
    sdWrite('cbq', { sec: CBQ_S.secIdx, idx: CBQ_S.cbqIdx, answers: CBQ_S.answers });
  } catch (_) {}
}
function _cbqDraftSoon(){
  if (STATE.tab !== 'cbq') return;
  clearTimeout(_cbqDraftTimer);
  _cbqDraftTimer = setTimeout(cbqDraftSave, 250);
}
['input', 'change', 'click', 'drop'].forEach(function(ev){ document.addEventListener(ev, _cbqDraftSoon, true); });
function cbqApplyAnswers(){
  try {
    const cbq = CBQ_DATA[CBQ_TAB_KEYS[CBQ_S.secIdx]][CBQ_S.cbqIdx];
    cbq.questions.forEach(function(q){
      const a = CBQ_S.answers[q.id];
      if (a == null) return;
      if (q.type === 'select') { const el = document.getElementById('so_' + q.id + '_' + a); if (el) el.classList.add('selected'); }
      else if (q.type === 'calc') { const el = document.getElementById('inp_' + q.id); if (el) el.value = a; }
      else if (q.type === 'blank') { q.blanks.forEach(function(b){ const el = document.getElementById('bl_' + q.id + '_' + b.id); if (el && a[b.id] != null) el.value = a[b.id]; }); }
      else if (q.type === 'drag') {
        Object.keys(a).forEach(function(it){
          const chip = document.getElementById('chip_' + q.id + '_' + it.replace(/\W/g, '_'));
          const z = q.zones.find(function(zz){ return zz === a[it]; });
          const zone = z ? document.getElementById('zone_' + q.id + '_' + z.replace(/\W/g, '_')) : null;
          if (chip && zone) zone.appendChild(chip);
        });
      }
    });
  } catch (_) {}
}
function cbqResume(){
  const d = sdRead('cbq');
  if (!d || typeof CBQ_DATA === 'undefined') return;
  const cases = CBQ_DATA[CBQ_TAB_KEYS[d.sec]];
  if (!cases || !cases[d.idx]) { sdClear('cbq'); showToast('That saved case is no longer available.', 'info'); return; }
  cbqSetSection(d.sec);
  cbqOpen(d.idx);
  CBQ_S.answers = d.answers || {};
  cbqApplyAnswers();
  showToast('Case restored — your answers are back.', 'info', 2800);
}
function cbqDiscardDraft(){ sdClear('cbq'); cbqRenderList(); }
(function(){
  const _chk = cbqCheck;
  cbqCheck = function(){ _chk(); sdClear('cbq'); };       // checked = finished with this case
  const _list = cbqRenderList;
  cbqRenderList = function(){
    _list();
    try {
      const d = sdRead('cbq');
      const lv = document.getElementById('listView');
      if (!d || !lv || typeof CBQ_DATA === 'undefined') return;
      const c = (CBQ_DATA[CBQ_TAB_KEYS[d.sec]] || [])[d.idx];
      if (!c) return;
      lv.insertAdjacentHTML('afterbegin', '<div style="padding:12px 16px 0">' + _sdCardHTML('⏸', 'Paused: CBQ ' + c.num + ' — ' + c.title,
        'Your answers are saved · ' + _sdAgo(d.at), 'cbqResume()', 'cbqDiscardDraft()') + '</div>');
    } catch (_) {}
  };
})();

// ═════════════════════════════════════════════════════════════════════════════
// SPACED REVIEW (Leitner boxes, on this device) — missed questions and flashcards
// ═════════════════════════════════════════════════════════════════════════════
const SR_STEPS = [1, 3, 7, 14];          // days until the next review after box 0..3; box 4 = learned
function _srDay(){ return Math.floor((Date.now() - new Date().getTimezoneOffset() * 60000) / 86400000); }
function _srKey(){ const u = STATE.user && STATE.user.uid; return u ? 'cma-sr-v1:' + u : null; }
function srLoad(){
  const k = _srKey();
  if (!k) return { q: {}, f: {} };
  try { const d = JSON.parse(localStorage.getItem(k) || 'null'); if (d && d.q && d.f) return d; } catch (_) {}
  return { q: {}, f: {} };
}
function srSave(s){ const k = _srKey(); if (k) { try { localStorage.setItem(k, JSON.stringify(s)); } catch (_) {} } }
function srRecordQ(lessonId, qi, qid, correct){
  if (lessonId == null || qi == null) return;
  const s = srLoad(), key = lessonId + '#' + qi, e = s.q[key];
  if (!correct) s.q[key] = { l: lessonId, i: qi, k: qid || null, b: 0, d: _srDay() + SR_STEPS[0] };
  else if (e) { e.b++; if (e.b >= 4) delete s.q[key]; else e.d = _srDay() + SR_STEPS[e.b]; }
  else return;
  srSave(s);
}
function srRecordF(cardId, known){
  const s = srLoad(), e = s.f[cardId];
  if (!known) s.f[cardId] = { b: 0, d: _srDay() + SR_STEPS[0] };
  else if (e) { e.b++; if (e.b >= 4) delete s.f[cardId]; else e.d = _srDay() + SR_STEPS[e.b]; }
  else s.f[cardId] = { b: 1, d: _srDay() + SR_STEPS[1] };
  srSave(s);
}
function srDueList(){
  const s = srLoad(), today = _srDay();
  return Object.keys(s.q).map(function(k){ return s.q[k]; }).filter(function(e){ return e.d <= today; }).sort(function(a, b){ return a.d - b.d; });
}
function srDueFlashSet(){
  const s = srLoad(), today = _srDay(), out = new Set();
  Object.keys(s.f).forEach(function(id){ if (s.f[id].d <= today) out.add(id); });
  return out;
}
function srDueCardHTML(){
  const n = srDueList().length;
  if (!n) return '';
  return '<div class="card" style="margin-bottom:12px;border:1px solid var(--brand-2);background:var(--brand-tint)">'
    + '<div style="font-size:13px;font-weight:600;color:var(--brand);margin-bottom:3px">🔁 Spaced review · ' + n + ' due today</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">Questions you missed come back after 1, 3, 7 and 14 days so they stick.</div>'
    + '<button class="btn" onclick="srStartReview()" style="background:var(--brand);color:#fff;font-size:13px">Review now (' + Math.min(n, 20) + ' questions)</button></div>';
}
async function srStartReview(){
  const due = srDueList();
  if (!due.length) { showToast('Nothing is due for review today.', 'info'); return; }
  const take = due.slice(0, 30);
  STATE.tab = 'loading'; render();
  const secIds = Array.from(new Set(take.map(function(e){ return parseInt(String(e.l).split('-')[0], 10); }).filter(function(x){ return x > 0; })));
  await Promise.all(secIds.map(function(id){ return ensureQuizzes(id); }));
  const qs = [], stale = [];
  take.forEach(function(e){
    const f = _qdFindLesson(e.l);
    const q = f && f.lesson.quizzes ? f.lesson.quizzes[e.i] : null;
    if (!q || (e.k && q.id !== e.k)) { stale.push(e.l + '#' + e.i); return; }
    if (qs.length < 20) qs.push(_qmDecor(q, e.i, f.sec, f.lesson));
  });
  if (stale.length) { const s = srLoad(); stale.forEach(function(k){ delete s.q[k]; }); srSave(s); }
  if (!qs.length) { showToast('Those questions are no longer in the bank.', 'info'); STATE.tab = 'quiz-mode-select'; render(); return; }
  qmStartSet(qs.map(practiceShuffleQ), 'sr', 'Spaced review');
}
(function(){
  // Every submitted unit quiz / retry feeds the spaced-review queue.
  const _fq = _finalizeQuiz;
  _finalizeQuiz = function(){
    try {
      const qs = STATE.quizState;
      if (qs && qs.questions) qs.questions.forEach(function(q, i){
        const a = qs.answers[i];
        if (!a) return;
        const l = qs.isRetry ? q._lessonId : qs.lessonId, qi = q._qi != null ? q._qi : q._ansIdx;
        srRecordQ(l, qi, q.id, !!a.correct);
      });
    } catch (_) {}
    return _fq.apply(this, arguments);
  };
  const _know = flashMarkKnow;
  flashMarkKnow = function(id){ try { srRecordF(id, true); } catch (_) {} return _know(id); };
  const _rev = flashMarkReview;
  flashMarkReview = function(id){
    const r = _rev(id);
    try { if (loadFlashReviewSet().indexOf(id) >= 0) srRecordF(id, false); } catch (_) {}
    return r;
  };
  const _rwa = renderWrongAnswers;
  renderWrongAnswers = function(){
    const h = _rwa.apply(this, arguments);
    const extra = srDueCardHTML() + bmCardHTML();
    if (!extra) return h;
    const m = /<div class="scroll-area pad"/.exec(h);
    return m ? h.slice(0, m.index) + '<div style="padding:12px 16px 0;flex-shrink:0">' + extra + '</div>' + h.slice(m.index) : h;
  };
})();

// ═════════════════════════════════════════════════════════════════════════════
// BOOKMARKS — star a question, practise the starred ones later
// ═════════════════════════════════════════════════════════════════════════════
function _bmKey(){ const u = STATE.user && STATE.user.uid; return u ? 'cma-bm-v1:' + u : null; }
function bmLoad(){ const k = _bmKey(); if (!k) return {}; try { return JSON.parse(localStorage.getItem(k) || '{}') || {}; } catch (_) { return {}; } }
function bmSaveAll(o){ const k = _bmKey(); if (k) { try { localStorage.setItem(k, JSON.stringify(o)); } catch (_) {} } }
function bmCurrent(){
  if (STATE.tab === 'quiz-session' && STATE.quizState && !STATE.quizState.done) {
    const qs = STATE.quizState, q = qs.questions[qs.idx];
    if (!q) return null;
    const l = qs.isRetry ? q._lessonId : qs.lessonId, i = q._qi != null ? q._qi : q._ansIdx;
    return (l == null || i == null) ? null : { l: l, i: i, k: q.id || null };
  }
  if (STATE.tab === 'quiz-mode' && STATE.quizMode && !STATE.quizMode.done) {
    const qm = STATE.quizMode, q = qm.questions[qm.idx];
    return (q && q.lessonId != null && q._qi != null) ? { l: q.lessonId, i: q._qi, k: q.id || null } : null;
  }
  return null;
}
function bmStarHTML(){
  const c = bmCurrent();
  const on = !!(c && bmLoad()[c.l + '#' + c.i]);
  return '<button type="button" class="bm-btn" id="bm-star" onclick="bmToggleCurrent()" title="Bookmark this question" aria-pressed="' + on + '" style="color:' + (on ? 'var(--warn)' : '#999') + '">' + (on ? '★' : '☆') + '</button>';
}
function bmToggleCurrent(){
  const c = bmCurrent();
  if (!c) return;
  const all = bmLoad(), key = c.l + '#' + c.i;
  let on;
  if (all[key]) { delete all[key]; on = false; } else { all[key] = { l: c.l, i: c.i, k: c.k, at: Date.now() }; on = true; }
  bmSaveAll(all);
  const b = document.getElementById('bm-star');
  if (b) { b.textContent = on ? '★' : '☆'; b.style.color = on ? 'var(--warn)' : '#999'; b.setAttribute('aria-pressed', String(on)); }
  showToast(on ? 'Bookmarked — find it under Quiz Mode and Wrong Answers.' : 'Bookmark removed.', 'info', 1800);
}
function bmCardHTML(){
  const n = Object.keys(bmLoad()).length;
  if (!n) return '';
  return '<div class="card" style="margin-bottom:12px;border:1px solid var(--warn)"><div style="font-size:13px;font-weight:600;color:var(--warn-strong);margin-bottom:3px">★ Bookmarked · ' + n + ' question' + (n === 1 ? '' : 's') + '</div>'
    + '<div style="font-size:12px;color:var(--muted);margin-bottom:10px">The questions you starred, in one quiz.</div>'
    + '<button class="btn btn-outline" onclick="bmStartPractice()" style="font-size:13px">Practise bookmarks</button></div>';
}
async function bmStartPractice(){
  const all = bmLoad(), items = Object.keys(all).map(function(k){ return all[k]; }).sort(function(a, b){ return (a.at || 0) - (b.at || 0); });
  if (!items.length) { showToast('No bookmarked questions yet — tap the star on a question.', 'info'); return; }
  STATE.tab = 'loading'; render();
  const secIds = Array.from(new Set(items.map(function(e){ return parseInt(String(e.l).split('-')[0], 10); }).filter(function(x){ return x > 0; })));
  await Promise.all(secIds.map(function(id){ return ensureQuizzes(id); }));
  const qs = [], stale = [];
  items.forEach(function(e){
    const f = _qdFindLesson(e.l);
    const q = f && f.lesson.quizzes ? f.lesson.quizzes[e.i] : null;
    if (!q || (e.k && q.id !== e.k)) { stale.push(e.l + '#' + e.i); return; }
    qs.push(_qmDecor(q, e.i, f.sec, f.lesson));
  });
  if (stale.length) { stale.forEach(function(k){ delete all[k]; }); bmSaveAll(all); }
  if (!qs.length) { showToast('Those questions are no longer in the bank.', 'info'); STATE.tab = 'quiz-mode-select'; render(); return; }
  for (let i = qs.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = qs[i]; qs[i] = qs[j]; qs[j] = t; }
  qmStartSet(qs.slice(0, 50).map(practiceShuffleQ), 'bm', 'Bookmarked questions');
}
(function(){
  const _rqs = renderQuizSession;
  renderQuizSession = function(){
    return _rqs.apply(this, arguments).replace('<div class="card" id="qs-question-card">', '<div class="card bm-host" id="qs-question-card">' + bmStarHTML());
  };
  const _rqm = renderQuizMode;
  renderQuizMode = function(){
    return _rqm.apply(this, arguments).replace('<div class="card" id="qm-question-card">', '<div class="card bm-host" id="qm-question-card">' + bmStarHTML());
  };
})();

// ═════════════════════════════════════════════════════════════════════════════
// EXAM READINESS + WEAK-TOPIC PRACTICE (Progress page)
// ═════════════════════════════════════════════════════════════════════════════
// Ready % of a section = quiz accuracy on the units tried  x  share of the section's units tried.
// A section shows 0% until the student has actually practised it, and 100% needs every unit at 100%.
function readinessData(){
  const sc = (STATE.progress && STATE.progress.lessonScores) || {};
  const secs = S.map(function(sec){
    const lessons = sec.lessons.filter(function(l){ return !l.outOfScope; });
    let att = 0, c = 0, t = 0;
    const weak = [];
    lessons.forEach(function(l){
      const e = sc[l.id];
      if (e && e.total > 0) {
        att++; c += e.correct; t += e.total;
        const p = Math.round(e.correct / e.total * 100);
        if (p < 70) weak.push({ id: l.id, title: l.title, pct: p, secId: sec.id });
      }
    });
    const acc = t ? c / t : 0, cov = lessons.length ? att / lessons.length : 0;
    return { sec: sec, total: lessons.length, att: att, acc: Math.round(acc * 100), cov: Math.round(cov * 100), ready: Math.round(acc * cov * 100), weak: weak };
  });
  const wsum = S.reduce(function(a, s){ return a + s.weight; }, 0) || 100;
  const overall = Math.round(secs.reduce(function(a, x){ return a + x.ready * x.sec.weight; }, 0) / wsum);
  const weak = [].concat.apply([], secs.map(function(x){ return x.weak; })).sort(function(a, b){ return a.pct - b.pct; });
  const attempted = secs.reduce(function(a, x){ return a + x.att; }, 0);
  return { secs: secs, overall: overall, weak: weak, attempted: attempted };
}
function readinessCardHTML(){
  const rd = readinessData();
  const col = function(p){ return p >= 70 ? 'var(--ok)' : p >= 40 ? 'var(--warn)' : 'var(--err)'; };
  if (!rd.attempted) {
    return '<div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">'
      + '<div style="font-size:14px;font-weight:600;color:var(--ink);margin-bottom:4px">🎯 Exam readiness</div>'
      + '<div style="font-size:12px;color:var(--muted);line-height:1.5">Finish a unit quiz to see how ready you are for each section.</div></div>';
  }
  const label = rd.overall >= 75 ? 'Exam-ready range' : rd.overall >= 50 ? 'Getting there' : 'Keep building';
  const rows = rd.secs.map(function(x){
    return '<div style="margin-bottom:9px"><div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px"><span style="color:var(--ink)">' + x.sec.emoji + ' ' + esc(x.sec.title) + '</span>'
      + '<span style="font-weight:600;color:' + col(x.ready) + '">' + x.ready + '%</span></div>'
      + '<div style="height:5px;background:var(--bg);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + x.ready + '%;background:' + col(x.ready) + '"></div></div>'
      + '<div style="font-size:10px;color:#888;margin-top:2px">Accuracy ' + x.acc + '% · ' + x.att + '/' + x.total + ' units practised</div></div>';
  }).join('');
  const weakList = rd.weak.slice(0, 5).map(function(w){
    return '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-top:.5px solid var(--bg)"><div style="flex:1;min-width:0;font-size:12px;color:var(--ink)">' + esc(w.title)
      + ' <span style="color:var(--err);font-weight:600">' + w.pct + '%</span></div>'
      + '<button onclick="startQuiz(\'' + w.id + '\',true)" style="padding:5px 10px;border-radius:8px;border:.5px solid var(--border-4);background:var(--surface);font-size:11px;cursor:pointer;font-family:inherit;color:var(--ink)">Practise</button></div>';
  }).join('');
  return '<div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">'
    + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px"><div style="width:62px;height:62px;border-radius:50%;border:5px solid ' + col(rd.overall) + ';display:flex;align-items:center;justify-content:center;font-size:18px;font-weight:700;color:' + col(rd.overall) + ';flex-shrink:0">' + rd.overall + '%</div>'
    + '<div><div style="font-size:14px;font-weight:600;color:var(--ink)">🎯 Exam readiness</div><div style="font-size:12px;color:var(--muted)">' + label + ' · weighted by exam share</div>'
    + '<div style="font-size:10px;color:#888;margin-top:2px">An estimate from your unit quizzes: accuracy × units practised.</div></div></div>'
    + rows
    + (rd.weak.length
      ? '<div style="font-size:12px;font-weight:600;color:var(--ink);margin:10px 0 2px">Weak topics (below 70%)</div>' + weakList
        + '<button class="btn" onclick="startWeakPractice()" style="background:var(--brand);color:#fff;font-size:13px;margin-top:10px">🎯 Practise my weak topics</button>'
      : '<div style="font-size:12px;color:var(--ok-strong);margin-top:6px">No weak topics right now — keep going.</div>')
    + '</div>';
}
async function startWeakPractice(){
  const rd = readinessData(), picks = rd.weak.slice(0, 4);
  if (!picks.length) { showToast('No weak topics yet — finish a few unit quizzes first.', 'info'); return; }
  STATE.tab = 'loading'; render();
  await Promise.all(Array.from(new Set(picks.map(function(w){ return w.secId; }))).map(function(id){ return ensureQuizzes(id); }));
  const pool = [];
  picks.forEach(function(w){
    const f = _qdFindLesson(w.id);
    if (!f || !f.lesson.quizzes) return;
    f.lesson.quizzes.forEach(function(q, qi){ if (!isOutOfScopeQ(f.lesson, q)) pool.push(_qmDecor(q, qi, f.sec, f.lesson)); });
  });
  for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
  if (!pool.length) { STATE.tab = 'progress'; render(); showToast('No questions available for those topics.', 'info'); return; }
  qmStartSet(pool.slice(0, 20).map(practiceShuffleQ), 'weak', 'Weak-topics practice');
}
(function(){
  const _rp = renderProgress;
  renderProgress = function(){
    const h = _rp.apply(this, arguments);
    const marker = '<button class="btn" onclick="STATE.tab=\'wrong-answers\';render()"';
    const i = h.indexOf(marker);
    if (i < 0) return h;
    return h.slice(0, i) + readinessCardHTML() + h.slice(i);
  };
})();

// ═════════════════════════════════════════════════════════════════════════════
// STUDY PLAN (Home) — a daily lesson target worked out from the exam date
// ═════════════════════════════════════════════════════════════════════════════
function studyPlanHTML(){
  try {
    const st = loadStudent();
    if (!st || !st.examdate) return '';
    const d = new Date(st.examdate + '-01'), today = new Date();
    const days = Math.ceil((d - today) / 86400000);
    if (!(days > 0)) return '';
    const left = Math.max(0, TOTAL_LESSONS - STATE.progress.done.length);
    if (!left) return '<div class="card" style="margin-bottom:12px"><div style="font-size:13px;font-weight:600;color:var(--ok-strong)">📅 Study plan</div><div style="font-size:12px;color:var(--muted);margin-top:3px">You have finished every lesson — spend the remaining ' + days + ' days on practice, mock exams and weak topics.</div></div>';
    const reserve = days > 28 ? 14 : 0;                    // keep the last two weeks for revision and mocks
    const planDays = Math.max(1, days - reserve);
    const perDay = left / planDays, perWeek = Math.ceil(perDay * 7);
    const tone = perDay > 1.5 ? 'var(--err)' : perDay > 0.8 ? 'var(--warn)' : 'var(--ok)';
    const perDayTxt = perDay >= 1 ? Math.ceil(perDay * 10) / 10 + ' lessons a day' : perWeek + ' lessons a week';
    return '<div class="card" style="margin-bottom:12px;border-left:4px solid ' + tone + '">'
      + '<div style="font-size:13px;font-weight:600;color:var(--ink)">📅 Your study plan</div>'
      + '<div style="font-size:13px;color:var(--ink);margin-top:4px"><b>' + left + '</b> lessons left · <b>' + days + '</b> days to your exam</div>'
      + '<div style="font-size:15px;font-weight:600;color:' + tone + ';margin-top:4px">Aim for ' + perDayTxt + '</div>'
      + '<div style="font-size:11px;color:#888;margin-top:3px">' + (reserve ? 'Finishes ' + reserve + ' days before the exam, so the last two weeks are free for mocks and revision.' : 'Your exam is close — focus on practice questions and your weak topics.') + '</div></div>';
  } catch (_) { return ''; }
}
(function(){
  const _rs = renderStartLearningCard;
  renderStartLearningCard = function(){ return _rs.apply(this, arguments) + studyPlanHTML(); };
})();

// ═════════════════════════════════════════════════════════════════════════════
// FORGOT PASSWORD — resend countdown + Spam hint
// ═════════════════════════════════════════════════════════════════════════════
let _pwResetAt = 0, _pwTimer = null;
function _pwLeft(){ return _pwResetAt ? Math.max(0, 60 - Math.floor((Date.now() - _pwResetAt) / 1000)) : 0; }
function pwResetLinkHTML(){
  const left = _pwLeft();
  if (left > 0) return '<span id="pw-reset-link" style="font-size:13px;color:#888">Resend reset email in ' + left + 's</span>';
  return '<span id="pw-reset-link" onclick="sendPasswordReset()" style="font-size:13px;color:var(--brand-2);cursor:pointer">' + (_pwResetAt ? 'Resend reset email' : 'Forgot your password?') + '</span>';
}
function _pwTick(){
  const el = document.getElementById('pw-reset-link');
  const left = _pwLeft();
  if (!el) { if (left <= 0) { clearInterval(_pwTimer); _pwTimer = null; } return; }
  if (left > 0) el.textContent = 'Resend reset email in ' + left + 's';
  else { el.outerHTML = pwResetLinkHTML(); clearInterval(_pwTimer); _pwTimer = null; }
}
sendPasswordReset = async function(){
  const el = document.getElementById('auth-email');
  const email = el && el.value ? el.value.trim() : '';
  if (!email) { showToast('Please enter your email address first.', 'warning'); return; }
  if (_pwLeft() > 0) { showToast('Please wait ' + _pwLeft() + 's before sending another email.', 'info'); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    _pwResetAt = Date.now();
    const link = document.getElementById('pw-reset-link');
    if (link) link.outerHTML = pwResetLinkHTML();
    clearInterval(_pwTimer); _pwTimer = setInterval(_pwTick, 1000);
    showModal({ icon: '📧', title: 'Reset email sent',
      body: 'We sent a password reset link to ' + email + '. It can take a minute to arrive. If you do not see it, check your Spam or Junk folder and mark it "Not spam". You can send it again after 60 seconds.',
      type: 'success', confirmText: 'OK' });
  } catch (e) { showToast((e && e.message) || 'Could not send the reset email. Check the email address.', 'error'); }
};

// ═════════════════════════════════════════════════════════════════════════════
// DARK MODE — Light / Dark / Auto (follows the device). Applied before first paint of the app.
// ═════════════════════════════════════════════════════════════════════════════
function themeGet(){ try { return localStorage.getItem('cma-theme-v1') || 'auto'; } catch (_) { return 'auto'; } }
function themeResolved(){
  const t = themeGet();
  if (t === 'dark' || t === 'light') return t;
  return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
}
function themeApply(){
  const r = themeResolved();
  document.documentElement.setAttribute('data-theme', r);
  let m = document.querySelector('meta[name="theme-color"]');
  if (m) m.setAttribute('content', r === 'dark' ? '#121214' : '#0C447C');
}
function themeSet(v){ try { localStorage.setItem('cma-theme-v1', v); } catch (_) {} themeApply(); render(); }
function themePickerHTML(){
  const cur = themeGet();
  return '<div style="margin-bottom:12px"><label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Appearance</label><div style="display:flex;gap:6px">'
    + [['auto', 'Auto'], ['light', 'Light'], ['dark', 'Dark']].map(function(p){
      const on = cur === p[0];
      return '<button onclick="themeSet(\'' + p[0] + '\')" style="flex:1;padding:10px;border-radius:8px;border:.5px solid ' + (on ? 'var(--brand)' : 'var(--border-4)') + ';background:' + (on ? 'var(--brand-tint)' : 'var(--surface)') + ';color:' + (on ? 'var(--brand)' : 'var(--ink)') + ';font-size:13px;font-weight:' + (on ? '600' : '400') + ';cursor:pointer;font-family:inherit">' + p[1] + '</button>';
    }).join('') + '</div></div>';
}
themeApply();
try { if (window.matchMedia) window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function(){ if (themeGet() === 'auto') themeApply(); }); } catch (_) {}
// Printing is always on white paper.
window.addEventListener('beforeprint', function(){ document.documentElement.setAttribute('data-theme', 'light'); });
window.addEventListener('afterprint', function(){ themeApply(); });

// ═════════════════════════════════════════════════════════════════════════════
// FORMULA BANK — category filter + Download PDF (browser print dialog -> "Save as PDF")
// ═════════════════════════════════════════════════════════════════════════════
function formulaPrint(){
  const prev = document.title;
  document.title = 'CMA Prep — Formula Bank';
  const restore = function(){ document.title = prev; window.removeEventListener('afterprint', restore); };
  window.addEventListener('afterprint', restore);
  showToast('Choose "Save as PDF" as the printer in the dialog that opens.', 'info', 3500);
  setTimeout(function(){ window.print(); }, 350);
}
function formulaSetCat(v){ STATE.formulaCat = v; render(); }
(function(){
  const _rf = renderFormulaBank;
  renderFormulaBank = function(){
    let h = _rf.apply(this, arguments);
    const cat = STATE.formulaCat || 'all';
    // category blocks: wrap each so it never splits across a printed page, and hide the unselected ones
    const titles = [];
    h = h.replace(/<div style="margin-bottom:14px">(\s*<div style="font-size:13px;font-weight:500;color:[^"]*">([^<]+)<\/div>)/g, function(all, inner, title){
      titles.push(title);
      const hide = (cat !== 'all' && cat !== title) ? ';display:none' : '';
      return '<div class="formula-cat" style="margin-bottom:14px' + hide + '">' + inner;
    });
    if (!titles.length) return h;
    const chips = ['all'].concat(titles).map(function(t){
      const on = cat === t;
      return '<button onclick="formulaSetCat(' + JSON.stringify(t).replace(/"/g, '&quot;') + ')" style="padding:6px 12px;border-radius:14px;border:1px solid ' + (on ? 'var(--brand)' : 'var(--border-4)') + ';background:' + (on ? 'var(--brand-tint)' : 'var(--surface)') + ';color:' + (on ? 'var(--brand)' : 'var(--ink)') + ';font-size:12px;font-weight:' + (on ? '600' : '400') + ';cursor:pointer;font-family:inherit;white-space:nowrap">' + (t === 'all' ? 'All sections' : esc(t)) + '</button>';
    }).join('');
    const bar = '<div class="no-print" style="display:flex;gap:6px;overflow-x:auto;padding:4px 0 10px;align-items:center"><button onclick="formulaPrint()" style="padding:6px 12px;border-radius:14px;border:none;background:var(--brand);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;white-space:nowrap">🖨 Download PDF</button>' + chips + '</div>'
      + '<div class="print-only" style="display:none;margin-bottom:12px;border-bottom:2px solid #c9a227;padding-bottom:6px"><div style="font-size:20px;font-weight:700;color:#0C447C">CMA Part 1 — Formula Bank</div><div style="font-size:11px;color:#666">CMA Prep · Dr. Mohamed Abdelgawad · ' + new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) + '</div></div>';
    return _sdInsertInScroll(h, bar);
  };
})();

// ─── RESUMABLE QUIZZES + PRACTICE OPTION SHUFFLE (Batch 31) ───────────────────
//
// 1) RESUMABLE UNIT QUIZZES (and the Wrong Answers retry quiz)
//    Every answer / jump saves a small draft in this browser's localStorage. Leaving
//    the quiz by ANY route (the back arrow, the sidebar, closing the app) just keeps
//    the draft; tapping the quiz icon on the unit again resumes the same questions,
//    in the same order, with the same answers, on the question the student left.
//    The score is written only when the student submits (unchanged behaviour), and
//    the draft is then deleted. Drafts are per student per device and expire after 14
//    days. Nothing is written to Firestore, so the free-tier quota is not affected.
//
// 2) OPTION SHUFFLE FOR PRACTICE SURFACES
//    The bank's correct answer sits in position B or C far more often than chance
//    (S6: C for 64% of questions), so students could guess by position. Exams already
//    shuffle options per student; the unit quiz, Quiz Mode and the Mock Exam did not.
//    practiceShuffleQ() shuffles a question's options on the fly (the bank data is NOT
//    changed, so past exam reviews and saved results keep working). It leaves a
//    question alone when position matters: "All of the above", "Both A and B",
//    "I and II only", True/False, or numbers already listed in order.
//    Each shuffled copy carries _perm (new position -> original option index) and
//    _aOrig (the original correct index) so saved answers always use the bank's own
//    numbering.

const QD_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

// ── Option shuffle ────────────────────────────────────────────────────────────
const _QO_POS_RE    = /\b(?:all|both|neither|none) of the (?:above|these|answers|choices|following|statements)\b|\bnone of these\b|\ball of these\b|\bany of the above\b/i;
const _QO_LETTER_RE = /\b[Bb]oth [A-E]\b|\b[A-E] (?:and|or|&) [A-E]\b|\b[A-E], [A-E]\b/;       // letters are case-sensitive on purpose
const _QO_ROMAN_RE  = /^\s*(?:neither|both|all|none)?\s*(?:I{1,3}|IV|V)(?:\s*(?:,|and|&)\s*(?:I{1,3}|IV|V))*\s*(?:only)?\.?\s*$/i;
const _QO_NUM_RE    = /^[\s(\-–$€£]*\d[\d.,]*\)?\s*%?\s*(?:million|thousand|billion|[MKmk]|per [a-z]+|units?|hours?|days?|years?|months?|times)?\.?\s*$/i;
const _QO_TF_RE     = /^(?:true|false|yes|no)\.?$/i;

function _qoNum(s){
  const t = String(s);
  const first = t.search(/\d/);
  const pre = first > 0 ? t.slice(0, first) : '';
  let v = parseFloat(t.replace(/[^\d.]/g, ''));
  if (/[(\-–]/.test(pre)) v = -Math.abs(v);
  return v;
}
// True when the order of the options carries meaning and must not be shuffled.
function _qoLocked(o){
  const opts = o.map(function(x){ return String(x == null ? '' : x); });
  if (opts.some(function(x){ return _QO_POS_RE.test(x) || _QO_LETTER_RE.test(x); })) return true;
  if (opts.filter(function(x){ return _QO_ROMAN_RE.test(x); }).length >= 2) return true;
  if (opts.every(function(x){ return _QO_TF_RE.test(x.trim()); })) return true;
  if (opts.every(function(x){ return _QO_NUM_RE.test(x); })) {                 // numbers: keep if already in order
    const v = opts.map(_qoNum);
    const asc  = v.every(function(n, i){ return i === 0 || n >= v[i - 1]; });
    const desc = v.every(function(n, i){ return i === 0 || n <= v[i - 1]; });
    if (asc || desc) return true;
  }
  return false;
}
function _qoValidPerm(perm, o){
  if (!Array.isArray(perm) || !Array.isArray(o) || perm.length !== o.length) return false;
  const seen = {};
  for (let i = 0; i < perm.length; i++) {
    const p = perm[i];
    if (typeof p !== 'number' || p < 0 || p >= o.length || seen[p]) return false;
    seen[p] = 1;
  }
  return true;
}
// Applies a permutation (perm[newPos] = originalIndex) to a question copy.
function _qoApply(q, perm){
  const o = perm.map(function(i){ return q.o[i]; });
  const a = perm.indexOf(q.a);
  let ww = q.wrongWhy;
  if (Array.isArray(ww)) {
    ww = perm.map(function(i){ return ww[i] === undefined ? null : ww[i]; });
  } else if (ww && typeof ww === 'object') {
    const n = {};
    Object.keys(ww).forEach(function(k){ const nk = perm.indexOf(Number(k)); if (nk >= 0) n[nk] = ww[k]; });
    if (Object.keys(n).length) ww = n;
  }
  return Object.assign({}, q, { o: o, a: a, wrongWhy: ww, _perm: perm.slice(), _aOrig: q.a });
}
function practiceShuffleQ(q){
  try {
    if (!q || !Array.isArray(q.o) || q.o.length < 2 || typeof q.a !== 'number' || q.a < 0 || q.a >= q.o.length) return q;
    if (q._perm) return q;                                  // already shuffled
    if (_qoLocked(q.o)) return q;
    const perm = q.o.map(function(_, i){ return i; });
    for (let i = perm.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = perm[i]; perm[i] = perm[j]; perm[j] = t;
    }
    return _qoApply(q, perm);
  } catch (_) { return q; }
}
// Display position -> the bank's own option index (what gets saved).
function qCanonIdx(q, i){ return (q && q._perm && i != null && q._perm[i] != null) ? q._perm[i] : i; }
function qCanonAnswer(q){ return (q && q._aOrig != null) ? q._aOrig : q.a; }

// ── Drafts ────────────────────────────────────────────────────────────────────
function _qdFindLesson(id){
  for (const sec of S) { for (const l of sec.lessons) { if (l.id === id) return { lesson: l, sec: sec }; } }
  return null;
}
function _qdKey(kind, lessonId){
  const u = STATE.user && STATE.user.uid;
  if (!u) return null;
  return 'cma-quiz-draft-v1:' + u + ':' + (kind === 'retry' ? 'retry' : lessonId);
}
function qdRead(kind, lessonId){
  const key = _qdKey(kind, lessonId);
  if (!key) return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1 || !Array.isArray(d.items) || !d.items.length || (Date.now() - (d.at || 0)) > QD_MAX_AGE_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return d;
  } catch (_) { return null; }
}
function qdClear(kind, lessonId){
  const key = _qdKey(kind, lessonId);
  if (key) { try { localStorage.removeItem(key); } catch (_) {} }
}
function qdPeek(lessonId){
  const d = qdRead('unit', lessonId);
  if (!d) return null;
  return { answered: (d.ans || []).filter(function(x){ return x != null; }).length, total: d.items.length };
}
// " · ⏸ In progress 7/20" for the unit list rows ('' when there is no draft).
function qdNote(lessonId){
  const p = qdPeek(lessonId);
  return p ? ' · ⏸ In progress ' + p.answered + '/' + p.total : '';
}
function qdSave(){
  try {
    const qs = STATE.quizState;
    if (!qs || qs.done) return;
    const kind = qs.isRetry ? 'retry' : 'unit';
    const key = _qdKey(kind, qs.lessonId);
    if (!key) return;
    const n = qs.questions.length;
    let answered = 0;
    for (let i = 0; i < n; i++) if (qs.answers[i]) answered++;
    if (!answered) { localStorage.removeItem(key); return; }
    const items = qs.questions.map(function(q){
      const it = { i: (q._qi != null ? q._qi : q._ansIdx), p: q._perm || null, k: q.id || null };
      if (qs.isRetry) it.l = q._lessonId;
      return it;
    });
    const ans = [], qt = [];
    for (let i = 0; i < n; i++) {
      ans.push(qs.answers[i] ? qs.answers[i].selected : null);
      qt.push(qs.questionTimes[i] || 0);
    }
    localStorage.setItem(key, JSON.stringify({
      v: 1, kind: kind, lessonId: qs.lessonId || null, sId: qs.sId, at: Date.now(), idx: qs.idx,
      active: Date.now() - (qs.quizStartTime || Date.now()),     // time actually spent, so away-time is not counted
      items: items, ans: ans, qt: qt
    }));
  } catch (_) {}
}
// Rebuilds a quizState from a draft, or returns null when the draft no longer matches
// the question bank (a question was removed/changed): the caller then starts a new quiz.
function qdRestore(d, kind){
  try {
    const questions = [];
    for (let j = 0; j < d.items.length; j++) {
      const it = d.items[j];
      const lid = kind === 'retry' ? it.l : d.lessonId;
      const f = _qdFindLesson(lid);
      if (!f || !f.lesson.quizzes) return null;
      const base = f.lesson.quizzes[it.i];
      if (!base) return null;
      if (it.k != null && base.id !== it.k) return null;
      let q = Object.assign({}, base, { _qi: it.i });
      if (it.p) {
        if (!_qoValidPerm(it.p, base.o) || typeof base.a !== 'number') return null;
        q = _qoApply(q, it.p);
      }
      if (kind === 'retry') { q._secId = f.sec.id; q._lessonId = lid; q._ansIdx = it.i; }
      questions.push(q);
    }
    const n = questions.length;
    const answers = [], times = [];
    for (let i = 0; i < n; i++) {
      times[i] = (d.qt && d.qt[i]) || 0;
      const s = d.ans ? d.ans[i] : null;
      if (s != null) answers[i] = { selected: s, correct: s === questions[i].a };
    }
    const idx = Math.min(Math.max(d.idx | 0, 0), n - 1);
    const cur = answers[idx];
    const now = Date.now();
    return {
      lessonId: kind === 'retry' ? null : d.lessonId,
      sId: kind === 'retry' ? questions[0]._secId : d.sId,
      questions: questions, idx: idx,
      selected: cur ? cur.selected : null,
      answers: answers, questionTimes: times,
      quizStartTime: now - (d.active || 0), qTimerStart: now,
      qTimerElapsed: cur ? (times[idx] || 0) : null,
      isRetry: kind === 'retry', resumed: true
    };
  } catch (_) { return null; }
}

// ── Pause / restart (called from the quiz screen) ─────────────────────────────
function quizPause(){
  const qs = STATE.quizState;
  const retry = !!(qs && qs.isRetry);
  let answered = 0;
  if (qs && !qs.done) {
    for (let i = 0; i < qs.questions.length; i++) if (qs.answers[i]) answered++;
    qdSave();
    try { endStudyTimer(); } catch (_) {}
  }
  STATE.tab = retry ? 'wrong-answers' : 'study';
  STATE.quizState = null;
  if (answered) showToast('Quiz paused — your ' + answered + ' answer' + (answered > 1 ? 's are' : ' is') + ' saved. Tap the quiz icon to continue.', 'info', 4000);
  render();
}
async function quizRestart(){
  const qs = STATE.quizState;
  if (!qs) return;
  const ok = await showModal({ icon: '↺', type: 'warning',
    title: 'Restart this quiz?',
    body: 'Your answers so far will be discarded and you will get a new set of questions.',
    confirmText: 'Restart', cancelText: 'Keep going' });
  if (!ok) return;
  if (qs.isRetry) { qdClear('retry'); STATE.quizState = null; await startWrongAnswersRetry(true); }
  else { const lid = qs.lessonId; qdClear('unit', lid); STATE.quizState = null; await startQuiz(lid, true); }
}

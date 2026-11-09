// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 36 — EXAM-PREP GROUP INTEREST LIST (May/June 2027 window)
// ═══════════════════════════════════════════════════════════════════════════
// A card on the student Home screen invites students to register interest in a
// paid exam-prep group (solving questions and exams together). It collects a
// WhatsApp number (required) and an optional note. Interest only — no price, no
// commitment. Data goes to Firestore `group-interest/{uid}` (one doc per student,
// editable by its owner, readable by the instructor — see firestore.rules) and is
// shown in the dashboard "Interest" tab (src/dashboard/98-interest-panel.js).
//
// Student states:  unknown (loading, show nothing) → none (invitation card)
//                  → done (small "You're on the list · Edit" line).
// "Not now" hides the card for 30 days. Everything runs inside try/catch: a failure
// here can never break the Home screen. To remove the feature: delete this file, the
// two dashboard/rules pieces, and the single ${renderGroupInterestCard()} call in
// src/core/06-auth-intro.js.
// GA4 events: interest_card_click {}, interest_submit {window, edit}.

var GI_WINDOW   = 'may-jun-2027';
var GI_WINDOW_L = 'May / June 2027';
var GI_LS_KEY   = 'cma-gi-v1';          // {done:bool, hideUntil:ms}
var GI_SNOOZE_D = 30;
var _gi = { state: 'unknown', data: null, loading: false, open: false, sending: false };

function _giSafe(fn){ try{ return fn(); }catch(_){ return undefined; } }
function _giLS(){ var s = _giSafe(function(){ return JSON.parse(localStorage.getItem(GI_LS_KEY) || '{}'); }); return (s && typeof s === 'object') ? s : {}; }
function _giSetLS(patch){ _giSafe(function(){ localStorage.setItem(GI_LS_KEY, JSON.stringify(Object.assign(_giLS(), patch))); }); }
function _giUserOk(){ return !!(typeof STATE !== 'undefined' && STATE.user && !(typeof isInstructor === 'function' && isInstructor())); }

// One read per session (skipped when this device already knows the student is registered).
function _giLoad(){
  if(_gi.loading || _gi.state !== 'unknown' || !_giUserOk() || typeof db === 'undefined') return;
  if(_giLS().done){ _gi.state = 'done'; return; }
  _gi.loading = true;
  db.collection('group-interest').doc(STATE.user.uid).get().then(function(s){
    _gi.loading = false;
    if(s.exists){ _gi.data = s.data(); _gi.state = 'done'; _giSetLS({ done: true }); }
    else { _gi.state = 'none'; }
    if(STATE.tab === 'intro') render();
  }).catch(function(){ _gi.loading = false; _gi.state = 'error'; });   // offline / rule not published → show nothing
}

// Called from renderIntro(). Returns HTML (or '').
function renderGroupInterestCard(){
  try{
    if(!_giUserOk()) return '';
    if(_gi.state === 'unknown'){ _giLoad(); if(_gi.state === 'unknown') return ''; }
    if(_gi.state === 'error') return '';
    if(_gi.state === 'done'){
      return '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;background:var(--ok-tint,#eaf3de);border-radius:12px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:var(--ok-strong,#27500A)">'
        + '<span>✅ You’re on the exam-prep group list (' + GI_WINDOW_L + ')</span>'
        + '<button onclick="openGroupInterest()" style="border:none;background:transparent;color:var(--ok-strong,#27500A);font-size:13px;font-weight:600;text-decoration:underline;cursor:pointer;font-family:inherit">Edit</button></div>';
    }
    var hide = _giLS().hideUntil;
    if(hide && Date.now() < hide) return '';
    return '<div style="background:linear-gradient(135deg,#c9a227,#a8861a);border-radius:14px;padding:16px;margin-bottom:14px;color:#fff;position:relative">'
      + '<button aria-label="Not now" onclick="giSnooze()" style="position:absolute;top:8px;right:10px;border:none;background:transparent;color:#fff;opacity:.8;font-size:18px;cursor:pointer;line-height:1">×</button>'
      + '<div style="font-size:11px;opacity:.9;margin-bottom:4px">👥 CMA exam-prep group · ' + GI_WINDOW_L + ' window</div>'
      + '<div style="font-size:16px;font-weight:600;margin-bottom:4px">Planning to sit the exam in May/June 2027?</div>'
      + '<div style="font-size:13px;opacity:.95;line-height:1.5">Register your interest in a group where we solve questions and exams together. No commitment — details and price will be shared later.</div>'
      + '<div dir="rtl" lang="ar" style="font-size:13px;opacity:.95;line-height:1.7;margin-top:6px">مهتم تمتحن مايو/يونيو 2027؟ سجّل اهتمامك بجروب حل أسئلة وامتحانات مع المدرّس — بدون أي التزام</div>'
      + '<button onclick="openGroupInterest(1)" style="margin-top:10px;background:#fff;color:#7a5f00;font-weight:600;font-size:13px;padding:8px 18px;border:none;border-radius:999px;cursor:pointer;font-family:inherit">Register interest ›</button>'
      + '</div>';
  }catch(_){ return ''; }
}

function giSnooze(){
  _giSetLS({ hideUntil: Date.now() + GI_SNOOZE_D * 86400000 });
  if(STATE.tab === 'intro') render();
}

function _giEl(id){ return document.getElementById(id); }
function _giMsg(t, ok){ var m = _giEl('gi-msg'); if(m){ m.textContent = t || ''; m.style.color = ok ? '#27500A' : '#A32D2D'; } }

function openGroupInterest(fromCard){
  if(!_giUserOk() || _gi.open) return;
  _giSafe(function(){ if(fromCard && typeof track === 'function') track('interest_card_click', {}); });
  _gi.open = true;
  var d = _gi.data || {};
  var u = STATE.user || {};
  var name = (d.name || u.displayName || '');
  var email = (d.email || u.email || '');
  var ov = document.createElement('div');
  ov.id = 'gi-ov';
  ov.style.cssText = 'position:fixed;inset:0;z-index:10060;background:rgba(8,28,50,.55);display:flex;align-items:center;justify-content:center;padding:14px;overflow:auto';
  var inp = 'width:100%;box-sizing:border-box;font-size:14px;padding:9px 10px;border:.5px solid #c8ccd2;border-radius:10px;font-family:inherit;background:#fff;color:#222;margin:4px 0 10px';
  ov.innerHTML =
    '<div style="background:#fff;border-radius:16px;width:100%;max-width:420px;max-height:94vh;overflow:auto;box-shadow:0 12px 40px rgba(0,0,0,.25)">'
    + '<div style="background:#0C447C;color:#fff;padding:14px 18px"><div style="font-size:16px;font-weight:600">Exam-prep group · ' + GI_WINDOW_L + '</div>'
    + '<div dir="rtl" lang="ar" style="font-size:12px;opacity:.85;margin-top:2px">تسجيل اهتمام بجروب التحضير للامتحان</div></div>'
    + '<div style="padding:14px 18px 6px">'
    + '<div style="font-size:12px;color:#666;line-height:1.6;margin-bottom:10px">Interest only — no payment and no commitment. I will contact you on WhatsApp with details when the group opens.</div>'
    + '<label style="font-size:12px;color:#555">Name</label><input id="gi-name" maxlength="80" value="' + esc(name) + '" style="' + inp + '">'
    + '<label style="font-size:12px;color:#555">Email</label><input id="gi-email" maxlength="120" value="' + esc(email) + '" style="' + inp + '">'
    + '<label style="font-size:12px;color:#555">WhatsApp number (with country code) *</label><input id="gi-wa" type="tel" inputmode="tel" maxlength="20" placeholder="+20 10 1234 5678" value="' + esc(d.whatsapp || '') + '" style="' + inp + 'direction:ltr">'
    + '<label style="font-size:12px;color:#555">Note (optional)</label><textarea id="gi-note" rows="2" maxlength="300" placeholder="e.g. which parts you need most, best time for sessions" style="' + inp + 'resize:none">' + esc(d.note || '') + '</textarea>'
    + '<div id="gi-msg" style="font-size:13px;min-height:18px"></div></div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end;padding:6px 18px 16px">'
    + '<button onclick="closeGroupInterest()" style="padding:9px 16px;border:.5px solid #c8ccd2;border-radius:10px;background:#fff;color:#555;font-size:14px;cursor:pointer;font-family:inherit">Cancel</button>'
    + '<button id="gi-send" onclick="submitGroupInterest()" style="padding:9px 22px;border:none;border-radius:10px;background:#0C447C;color:#fff;font-size:14px;cursor:pointer;font-family:inherit">' + (_gi.state === 'done' ? 'Save' : 'Register') + '</button>'
    + '</div></div>';
  document.body.appendChild(ov);
}
function closeGroupInterest(){
  var ov = _giEl('gi-ov');
  if(ov && ov.parentNode) ov.parentNode.removeChild(ov);
  _gi.open = false; _gi.sending = false;
}

function submitGroupInterest(){
  if(_gi.sending) return;
  if(!_giUserOk() || typeof db === 'undefined' || typeof firebase === 'undefined'){ _giMsg('Please sign in and try again.'); return; }
  var name  = (_giEl('gi-name').value || '').trim().slice(0, 80);
  var email = (_giEl('gi-email').value || '').trim().slice(0, 120);
  var wa    = (_giEl('gi-wa').value || '').trim();
  var note  = (_giEl('gi-note').value || '').trim().slice(0, 300);
  if(!name){ _giMsg('Please enter your name.'); return; }
  if(!/^\+?[0-9 ()-]{7,20}$/.test(wa) || wa.replace(/\D/g, '').length < 7){ _giMsg('Enter a valid WhatsApp number, e.g. +20 10 1234 5678'); return; }
  _gi.sending = true;
  var btn = _giEl('gi-send'); if(btn) btn.textContent = '...';
  var uid = STATE.user.uid, ref = db.collection('group-interest').doc(uid);
  var ts = firebase.firestore.FieldValue.serverTimestamp();
  var isEdit = (_gi.state === 'done');
  // `done` can come from this device's cache without the doc being loaded: read it first when editing blind.
  var job = (isEdit && !_gi.data) ? ref.get().then(function(s){ return s.exists; }) : Promise.resolve(isEdit);
  job.then(function(exists){
    if(exists){
      return ref.update({ name: name, email: email, whatsapp: wa, note: note, updatedAt: ts });
    }
    return ref.set({ userId: uid, name: name, email: email, whatsapp: wa, note: note, window: GI_WINDOW, createdAt: ts, updatedAt: ts });
  }).then(function(){
    _giSafe(function(){ if(typeof track === 'function') track('interest_submit', { window: GI_WINDOW, edit: isEdit ? 1 : 0 }); });
    _gi.data = { name: name, email: email, whatsapp: wa, note: note };
    _gi.state = 'done'; _giSetLS({ done: true });
    closeGroupInterest();
    _giSafe(function(){ if(typeof showToast === 'function') showToast('Thank you! You’re on the list.', 'success'); });
    if(STATE.tab === 'intro') render();
  }).catch(function(e){
    _gi.sending = false;
    if(btn) btn.textContent = (_gi.state === 'done' ? 'Save' : 'Register');
    _giMsg('Could not save. Check your internet and try again.');
    _giSafe(function(){ console.warn('[group-interest] save failed', e); });
  });
}

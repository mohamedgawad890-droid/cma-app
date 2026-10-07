// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 29 — SHARE & FEEDBACK POPUP
// ═══════════════════════════════════════════════════════════════════════════
// Asks students to share the app on LinkedIn / Facebook (and mention the
// instructor) and gives them a box to send feedback or requests.
//
// Loads AFTER 13-analytics-events.js (numeric prefix). Like 13, it wraps a few
// existing global functions instead of editing them, every wrapper calls the
// original first and returns its result untouched, and everything runs inside
// try/catch — a failure here can never break the app.
// To remove the feature: delete this one file (and the Inbox panel file in
// src/dashboard). Nothing else depends on it.
//
// WHEN IT APPEARS (all conditions must hold):
//   • signed-in student (never the instructor account)
//   • right after a lesson is marked complete (≥ MIN_LESSONS done) or a lesson
//     quiz / wrong-answer retry is finished with ≥ MIN_QUIZ_PCT %
//   • not during an exam / quiz / mock exam / CBQ, and no other modal is open
//   • not "Don't show again", and the snooze period has passed
//     (30 days after close, 90 days after a share click)
//   • at most once per app session
//
// FIRESTORE: writes to `app-feedback` (see firestore.rules). Fields:
//   userId, name, type (note|request|problem), message, status ('new'),
//   tab, build, createdAt (server time).
// GA4 events (ids/counts only, never message text):
//   share_popup_view {source}, share_click {channel, source},
//   feedback_sent {type, source}
// Manual open (e.g. from a future Settings button): openSharePopup('manual')

(function(){
  'use strict';

  // ── Configuration ────────────────────────────────────────────────────────
  var APP_URL      = 'https://mohamedgawad890-droid.github.io/cma-app/';
  var LINKEDIN_URL = 'https://www.linkedin.com/in/mohamed-abdelgawad890';
  var FACEBOOK_URL = 'https://www.facebook.com/profile.php?id=61550958763803';
  var CONTACT_MAIL = 'Mohamed.gawad890@gmail.com';

  var POST_TEXT = [
    '\u0628\u0630\u0627\u0643\u0631 CMA Part 1 \u0639\u0644\u0649 \u062A\u0637\u0628\u064A\u0642 \u0645\u062C\u0627\u0646\u064A \u0645\u0646 \u062A\u0642\u062F\u064A\u0645 Mohamed Abdelgawad: \u062F\u0631\u0648\u0633 \u0648\u0623\u0633\u0626\u0644\u0629 \u0648CBQ \u0648\u0627\u0645\u062A\u062D\u0627\u0646\u0627\u062A \u062A\u062C\u0631\u064A\u0628\u064A\u0629 \u0628\u0627\u0644\u0639\u0631\u0628\u064A \u0648\u0627\u0644\u0625\u0646\u062C\u0644\u064A\u0632\u064A.',
    'Free bilingual CMA Part 1 prep by Mohamed Abdelgawad.',
    '',
    'App: ' + APP_URL,
    'LinkedIn: ' + LINKEDIN_URL,
    'Facebook: ' + FACEBOOK_URL,
    '',
    '#CMA #CMAPart1 #IMA'
  ].join('\n');

  var LS_KEY          = 'cma-share-v1';      // {next:ms, never:bool, shown:n, shares:n}
  var LS_FB_DAY       = 'cma-share-fb-day';  // {d:'YYYY-MM-DD', n:count}
  var SNOOZE_DAYS     = 30;
  var AFTER_SHARE_DAYS= 90;
  var MIN_LESSONS     = 3;
  var MIN_QUIZ_PCT    = 70;
  var MIN_QUIZ_QS     = 5;
  var FB_DAILY_CAP    = 5;
  var FB_MAX_CHARS    = 1000;
  var SHOW_DELAY_MS   = 1400;
  var DAY_MS          = 86400000;
  var BLOCKED_TABS    = ['loading','login','register','onboarding','exam','quiz-session','quiz-mode','quiz-mode-select','mock-exam','cbq','custom-practice','dashboard'];

  var _shownThisSession = false;
  var _open = false;
  var _sending = false;
  var _type = 'note';

  function safe(fn){ try{ return fn(); }catch(_){ return undefined; } }

  // ── Persistence ──────────────────────────────────────────────────────────
  function readState(){
    var s = safe(function(){ return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); });
    return (s && typeof s === 'object') ? s : {};
  }
  function writeState(patch){
    safe(function(){
      var s = Object.assign(readState(), patch);
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    });
  }
  function snooze(days){ writeState({ next: Date.now() + days * DAY_MS }); }

  function todayKey(){ return new Date().toISOString().slice(0, 10); }
  function fbSentToday(){
    var s = safe(function(){ return JSON.parse(localStorage.getItem(LS_FB_DAY) || '{}'); }) || {};
    return s.d === todayKey() ? (s.n || 0) : 0;
  }
  function fbCount(){
    safe(function(){ localStorage.setItem(LS_FB_DAY, JSON.stringify({ d: todayKey(), n: fbSentToday() + 1 })); });
  }

  // ── Eligibility ──────────────────────────────────────────────────────────
  function userOk(){
    if(typeof STATE === 'undefined' || !STATE.user) return false;
    if(typeof isInstructor === 'function' && isInstructor()) return false;
    return true;
  }
  function eligible(manual){
    if(!userOk()) return false;
    if(_open) return false;
    if(manual) return true;
    if(_shownThisSession) return false;
    var st = readState();
    if(st.never) return false;
    if(st.next && Date.now() < st.next) return false;
    var tab = String(STATE.tab || '');
    if(BLOCKED_TABS.indexOf(tab) >= 0) return false;
    if(STATE.examSession && !STATE.examSession.submitted) return false;
    var mo = document.getElementById('modal-overlay');
    if(mo && mo.style.display === 'flex') return false;
    return true;
  }
  function schedule(source, extraCheck){
    safe(function(){
      if(!userOk()) return;
      setTimeout(function(){
        safe(function(){
          if(extraCheck && !extraCheck()) return;
          if(eligible(false)) openSharePopup(source);
        });
      }, SHOW_DELAY_MS);
    });
  }

  // ── Styles (injected once, scoped with the sp- prefix) ───────────────────
  function ensureStyles(){
    if(document.getElementById('sp-style')) return;
    var css = [
      '#sp-ov{position:fixed;inset:0;z-index:10050;background:rgba(8,28,50,.55);display:flex;align-items:center;justify-content:center;padding:14px;overflow:auto}',
      '#sp-box{background:#fff;border-radius:16px;width:100%;max-width:440px;max-height:94vh;overflow:auto;box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:inherit}',
      '.sp-head{background:#0C447C;color:#fff;padding:16px 18px;display:flex;align-items:center;gap:12px}',
      '.sp-ico{width:40px;height:40px;border-radius:50%;background:#c9a227;color:#0C447C;display:flex;align-items:center;justify-content:center;font-size:20px;flex-shrink:0}',
      '.sp-ttl{flex:1;text-align:right;direction:rtl}',
      '.sp-ttl b{display:block;font-size:16px;font-weight:600;line-height:1.4}',
      '.sp-ttl span{display:block;font-size:12px;opacity:.8;direction:ltr;text-align:right}',
      '.sp-body{padding:14px 18px 6px}',
      '.sp-p{direction:rtl;text-align:right;font-size:14px;line-height:1.7;margin:0 0 12px;color:#222}',
      '.sp-post{background:#f5f6f8;border-radius:10px;padding:10px 12px;margin-bottom:10px}',
      '.sp-post small{display:block;font-size:12px;color:#666;margin-bottom:6px}',
      '.sp-post div{direction:rtl;text-align:right;font-size:12.5px;line-height:1.7;color:#222;white-space:pre-wrap;word-break:break-word}',
      '.sp-row{display:flex;gap:8px;margin-bottom:6px;flex-wrap:wrap}',
      '.sp-btn{flex:1;min-width:92px;display:flex;align-items:center;justify-content:center;gap:6px;padding:10px 6px;font-size:13px;border-radius:10px;border:.5px solid #c8ccd2;background:#fff;color:#222;cursor:pointer;font-family:inherit}',
      '.sp-btn:active{transform:scale(.98)}',
      '.sp-hint{direction:rtl;text-align:right;font-size:12px;color:#666;margin:0 0 12px;line-height:1.6}',
      '.sp-sec{border-top:.5px solid #e2e5e9;padding-top:12px}',
      '.sp-sec h4{direction:rtl;text-align:right;font-size:14px;font-weight:600;margin:0 0 8px;color:#222}',
      '.sp-chips{direction:rtl;display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px}',
      '.sp-chip{font-size:12px;padding:5px 12px;border-radius:999px;border:.5px solid #c8ccd2;background:#fff;color:#555;cursor:pointer;font-family:inherit}',
      '.sp-chip.on{background:#0C447C;border-color:#0C447C;color:#fff}',
      '#sp-fb{width:100%;box-sizing:border-box;resize:none;direction:rtl;text-align:right;font-size:14px;padding:9px 10px;border:.5px solid #c8ccd2;border-radius:10px;font-family:inherit;background:#fff;color:#222}',
      '#sp-msg{font-size:13px;min-height:20px;margin:2px 0;direction:rtl;text-align:right}',
      '.sp-foot1{display:flex;align-items:center;justify-content:space-between;gap:8px}',
      '.sp-mail{font-size:12px;color:#666;text-decoration:underline}',
      '#sp-send{background:#0C447C;color:#fff;border:none;border-radius:10px;padding:9px 20px;font-size:14px;cursor:pointer;font-family:inherit}',
      '.sp-foot2{display:flex;justify-content:space-between;padding:10px 18px 14px;font-size:12px;color:#666}',
      '.sp-foot2 span{cursor:pointer;padding:4px 0}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'sp-style';
    st.textContent = css;
    document.head.appendChild(st);
  }

  // ── Helpers ──────────────────────────────────────────────────────────────
  function el(id){ return document.getElementById(id); }
  function toast(msg, type){ safe(function(){ if(typeof showToast === 'function') showToast(msg, type || 'info'); }); }
  function ga(name, params){ safe(function(){ if(typeof track === 'function') track(name, params || {}); }); }
  function setMsg(text, kind){
    var m = el('sp-msg'); if(!m) return;
    m.textContent = text || '';
    m.style.color = kind === 'ok' ? '#27500A' : '#A32D2D';
  }

  function copyText(text){
    return new Promise(function(resolve){
      function legacy(){
        try{
          var ta = document.createElement('textarea');
          ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          resolve(!!ok);
        }catch(_){ resolve(false); }
      }
      try{
        if(navigator.clipboard && navigator.clipboard.writeText){
          navigator.clipboard.writeText(text).then(function(){ resolve(true); }, legacy);
        }else legacy();
      }catch(_){ legacy(); }
    });
  }

  // ── Actions ──────────────────────────────────────────────────────────────
  var _source = 'auto';

  function doCopy(){
    ga('share_click', { channel: 'copy', source: _source });
    copyText(POST_TEXT).then(function(ok){
      toast(ok ? 'Post text copied' : 'Couldn\u2019t copy. Select the text and copy it manually', ok ? 'success' : 'error');
    });
  }
  function doShare(channel){
    var url = channel === 'linkedin'
      ? 'https://www.linkedin.com/sharing/share-offsite/?url=' + encodeURIComponent(APP_URL)
      : 'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(APP_URL);
    ga('share_click', { channel: channel, source: _source });
    snooze(AFTER_SHARE_DAYS);
    copyText(POST_TEXT).then(function(ok){
      if(ok) toast('Post text copied. Paste it in your post', 'success');
    });
    safe(function(){ window.open(url, '_blank', 'noopener'); });
  }
  function doNative(){
    ga('share_click', { channel: 'native', source: _source });
    snooze(AFTER_SHARE_DAYS);
    safe(function(){
      navigator.share({ title: 'CMA Prep', text: POST_TEXT }).catch(function(){});
    });
  }

  function closePopup(mode){
    var ov = el('sp-ov');
    if(ov && ov.parentNode) ov.parentNode.removeChild(ov);
    safe(function(){ document.body.style.overflow = _prevOverflow; });
    _open = false;
    if(mode === 'never') writeState({ never: true });
    else if(mode !== 'shared') snooze(SNOOZE_DAYS);
  }

  function sendFeedback(){
    if(_sending) return;
    var ta = el('sp-fb');
    var msg = ta ? ta.value.trim() : '';
    if(msg.length < 3){ setMsg('\u0627\u0643\u062A\u0628 \u0631\u0633\u0627\u0644\u062A\u0643 \u0627\u0644\u0623\u0648\u0644'); return; }
    if(msg.length > FB_MAX_CHARS){ setMsg('\u0627\u0644\u0631\u0633\u0627\u0644\u0629 \u0637\u0648\u064A\u0644\u0629 \u2014 \u0627\u0644\u062D\u062F \u0627\u0644\u0623\u0642\u0635\u0649 ' + FB_MAX_CHARS + ' \u062D\u0631\u0641'); return; }
    if(fbSentToday() >= FB_DAILY_CAP){ setMsg('\u0648\u0635\u0644\u062A \u0644\u0644\u062D\u062F \u0627\u0644\u064A\u0648\u0645\u064A \u0644\u0644\u0631\u0633\u0627\u0626\u0644. \u062C\u0631\u0651\u0628 \u0628\u0643\u0631\u0629'); return; }
    if(!userOk() || typeof db === 'undefined' || typeof firebase === 'undefined'){ setMsg('\u0645\u0642\u062F\u0631\u0646\u0627\u0634 \u0646\u0628\u0639\u062A \u0627\u0644\u0631\u0633\u0627\u0644\u0629. \u0633\u062C\u0651\u0644 \u062F\u062E\u0648\u0644 \u0648\u062C\u0631\u0651\u0628 \u062A\u0627\u0646\u064A'); return; }
    _sending = true;
    var btn = el('sp-send'); var oldLabel = btn ? btn.textContent : '';
    if(btn) btn.textContent = '...';
    setMsg('');
    var doc = {
      userId: STATE.user.uid,
      name: String(STATE.user.displayName || '').slice(0, 80),
      type: _type,
      message: msg,
      status: 'new',
      tab: String(STATE.tab || '').slice(0, 40),
      build: (typeof APP_BUILD !== 'undefined') ? String(APP_BUILD).slice(0, 20) : '',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    db.collection('app-feedback').add(doc).then(function(){
      _sending = false;
      fbCount();
      ga('feedback_sent', { type: _type, source: _source });
      if(ta) ta.value = '';
      if(btn) btn.textContent = oldLabel;
      setMsg('\u0634\u0643\u0631\u0627\u064B\u060C \u0631\u0633\u0627\u0644\u062A\u0643 \u0648\u0635\u0644\u062A', 'ok');
    }).catch(function(e){
      _sending = false;
      if(btn) btn.textContent = oldLabel;
      setMsg('\u0645\u0642\u062F\u0631\u0646\u0627\u0634 \u0646\u0628\u0639\u062A \u0627\u0644\u0631\u0633\u0627\u0644\u0629. \u0627\u062A\u0623\u0643\u062F \u0645\u0646 \u0627\u0644\u0646\u062A \u0648\u062C\u0631\u0651\u0628 \u062A\u0627\u0646\u064A');
      safe(function(){ console.warn('[share-popup] feedback failed', e); });
    });
  }

  // ── Popup ────────────────────────────────────────────────────────────────
  var _prevOverflow = '';

  function openSharePopup(source){
    try{
      if(!eligible(source === 'manual')) return;
      ensureStyles();
      _source = source || 'auto';
      _type = 'note';
      _open = true;
      _shownThisSession = true;
      writeState({ shown: (readState().shown || 0) + 1 });
      ga('share_popup_view', { source: _source });

      var canNative = !!(navigator.share);
      var html = [
        '<div id="sp-box">',
          '<div class="sp-head"><div class="sp-ico">\u2197</div>',
            '<div class="sp-ttl"><b>\u0633\u0627\u0639\u062F \u0632\u0645\u0644\u0627\u0621\u0643 \u064A\u0648\u0635\u0644\u0648\u0627 \u0644\u0644\u062A\u0637\u0628\u064A\u0642</b><span>Help another CMA student find this app</span></div></div>',
          '<div class="sp-body">',
            '<p class="sp-p">\u0627\u0644\u062A\u0637\u0628\u064A\u0642 \u0645\u062C\u0627\u0646\u064A \u0648\u0645\u062A\u0627\u062D \u0644\u0644\u062C\u0645\u064A\u0639. \u0644\u0648 \u0627\u0633\u062A\u0641\u062F\u062A \u0645\u0646\u0647\u060C \u0634\u0627\u0631\u0643 \u0627\u0644\u0631\u0627\u0628\u0637 \u0639\u0644\u0649 LinkedIn \u0623\u0648 Facebook \u0648\u0627\u0630\u0643\u0631\u0646\u064A \u0641\u064A \u0627\u0644\u0628\u0648\u0633\u062A\u060C \u0648\u062F\u0647 \u0647\u064A\u0633\u0627\u0639\u062F \u0637\u0644\u0627\u0628 \u062A\u0627\u0646\u064A\u0646 \u064A\u0644\u0627\u0642\u0648\u0647.</p>',
            '<div class="sp-post"><small>Ready-to-post text</small><div id="sp-post"></div></div>',
            '<div class="sp-row">',
              '<button class="sp-btn" id="sp-copy">Copy post text</button>',
              '<button class="sp-btn" id="sp-li">LinkedIn</button>',
              '<button class="sp-btn" id="sp-fbk">Facebook</button>',
              canNative ? '<button class="sp-btn" id="sp-nat">Share</button>' : '',
            '</div>',
            '<p class="sp-hint">\u0627\u0646\u0633\u062E \u0627\u0644\u0646\u0635\u060C \u0627\u0641\u062A\u062D LinkedIn \u0623\u0648 Facebook\u060C \u0648\u0627\u0644\u0635\u0642\u0647. \u0627\u0643\u062A\u0628 @ \u0642\u0628\u0644 \u0627\u0633\u0645\u064A \u0648\u0627\u062E\u062A\u0627\u0631\u0647 \u0645\u0646 \u0627\u0644\u0642\u0627\u0626\u0645\u0629 \u0639\u0634\u0627\u0646 \u064A\u0648\u0635\u0644\u0646\u064A \u0627\u0644\u0625\u0634\u0639\u0627\u0631.</p>',
            '<div class="sp-sec">',
              '<h4>\u0639\u0646\u062F\u0643 \u0645\u0644\u0627\u062D\u0638\u0629 \u0623\u0648 \u0637\u0644\u0628\u061F</h4>',
              '<div class="sp-chips">',
                '<button class="sp-chip on" data-t="note">\u0645\u0644\u0627\u062D\u0638\u0629</button>',
                '<button class="sp-chip" data-t="request">\u0637\u0644\u0628 \u0645\u064A\u0632\u0629</button>',
                '<button class="sp-chip" data-t="problem">\u0645\u0634\u0643\u0644\u0629</button>',
              '</div>',
              '<textarea id="sp-fb" rows="3" maxlength="' + FB_MAX_CHARS + '" placeholder="\u0627\u0643\u062A\u0628 \u0631\u0633\u0627\u0644\u062A\u0643 \u0647\u0646\u0627"></textarea>',
              '<div id="sp-msg"></div>',
              '<div class="sp-foot1"><a class="sp-mail" id="sp-mail" href="#">Or email ' + CONTACT_MAIL + '</a>',
                '<button id="sp-send">\u0625\u0631\u0633\u0627\u0644</button></div>',
            '</div>',
          '</div>',
          '<div class="sp-foot2"><span id="sp-never">Don\u2019t show again</span><span id="sp-later">Maybe later</span></div>',
        '</div>'
      ].join('');

      var ov = document.createElement('div');
      ov.id = 'sp-ov';
      ov.innerHTML = html;
      document.body.appendChild(ov);
      _prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      el('sp-post').textContent = POST_TEXT;
      el('sp-mail').setAttribute('href', 'mailto:' + CONTACT_MAIL + '?subject=' + encodeURIComponent('CMA Prep feedback'));

      el('sp-copy').addEventListener('click', doCopy);
      el('sp-li').addEventListener('click', function(){ doShare('linkedin'); });
      el('sp-fbk').addEventListener('click', function(){ doShare('facebook'); });
      if(canNative) el('sp-nat').addEventListener('click', doNative);
      el('sp-send').addEventListener('click', sendFeedback);
      el('sp-fb').addEventListener('input', function(){ setMsg(''); });
      el('sp-never').addEventListener('click', function(){ closePopup('never'); });
      el('sp-later').addEventListener('click', function(){ closePopup('later'); });
      ov.addEventListener('click', function(e){ if(e.target === ov) closePopup('later'); });
      var chips = ov.querySelectorAll('.sp-chip');
      Array.prototype.forEach.call(chips, function(c){
        c.addEventListener('click', function(){
          Array.prototype.forEach.call(chips, function(x){ x.classList.remove('on'); });
          c.classList.add('on');
          _type = c.getAttribute('data-t') || 'note';
        });
      });
    }catch(err){
      _open = false;
      safe(function(){ console.warn('[share-popup] open failed', err); });
    }
  }
  window.openSharePopup = openSharePopup;

  // ── Triggers (wrappers; originals always run first) ──────────────────────
  // 1) Lesson marked complete (first completion only, ≥ MIN_LESSONS done)
  if(typeof markDone === 'function'){
    var _markDone = markDone;
    markDone = function(lid){
      var wasDone = true;
      safe(function(){ wasDone = _getDoneSet().has(lid); });
      var out = _markDone.apply(this, arguments);
      safe(function(){
        if(!wasDone){
          schedule('lesson_complete', function(){
            return (STATE.progress && STATE.progress.done && STATE.progress.done.length >= MIN_LESSONS);
          });
        }
      });
      return out;
    };
  }
  // 2) Lesson quiz / wrong-answer retry finished with a good score
  if(typeof _finalizeQuiz === 'function'){
    var _finalize = _finalizeQuiz;
    _finalizeQuiz = function(){
      var out = _finalize.apply(this, arguments);
      safe(function(){
        var qs = STATE.quizState;
        if(!qs || !Array.isArray(qs.questions) || !Array.isArray(qs.answers)) return;
        var total = qs.questions.length;
        var right = qs.answers.filter(function(a){ return a && a.correct; }).length;
        if(total >= MIN_QUIZ_QS && Math.round(right / total * 100) >= MIN_QUIZ_PCT){
          schedule('quiz_finish');
        }
      });
      return out;
    };
  }
})();

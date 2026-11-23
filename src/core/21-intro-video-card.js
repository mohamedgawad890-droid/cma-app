// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 39 / 41 — VIDEO CARDS ON THE STUDENT HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════
// Cards under the "Start your first lesson / Continue" card show Gawad's videos:
//   1) "intro" — who he is, why the app exists, what it contains
//   2) "cert"  — the CMA certification guide (exam, cost, dates, study plan)  [Batch 41]
// Each is a thumbnail only: the YouTube player is created when the student taps play,
// so Home stays fast and uses no mobile data until the student chooses to watch.
// The player box is capped (see .vid-wrap in app.css) so the whole video fits on screen.
//
// States (per device, localStorage `cma-intro-v1`):
//   • intro keeps the original keys {dismissed, watched}; "cert" uses {dismissed_cert, watched_cert}
//   • new student                   → full cards (thumbnail + play button + "x")
//   • dismissed / watched / started → one slim line per video (tap to open the card again)
// Never shown to the instructor. Everything runs inside try/catch: a failure here can
// never break the Home screen. To add a video: add one entry to IV_VIDEOS.
// GA4 events: intro_video_play, intro_video_dismiss (param `video` = intro | cert).

var IV_LS_KEY = 'cma-intro-v1';
var IV_VIDEOS = [
  { k: 'intro', id: 'bpyeQFv3xI4',
    label: '🎬 Start here', title: 'Welcome to CMA Prep — watch this first',
    ar: 'شاهد هذا الفيديو أولاً لتعرف كيف تستخدم التطبيق',
    slim: '▶ Watch the intro video' },
  { k: 'cert', id: 'A4Yszo_bHUU',
    label: '🎓 The certification', title: 'The CMA Certification Guide',
    ar: 'شهادة CMA بالتفصيل: الامتحان والتكلفة والمواعيد وخطة المذاكرة',
    slim: '▶ Watch the CMA certification guide' }
];
var IV_ID = IV_VIDEOS[0].id;   // kept for any older reference
var _iv = { expanded: {} };

function _ivSafe(fn){ try{ return fn(); }catch(_){ return undefined; } }
function _ivLS(){
  var s = _ivSafe(function(){ return JSON.parse(localStorage.getItem(IV_LS_KEY) || '{}'); });
  return (s && typeof s === 'object') ? s : {};
}
function _ivSetLS(patch){
  _ivSafe(function(){ localStorage.setItem(IV_LS_KEY, JSON.stringify(Object.assign(_ivLS(), patch))); });
}
function _ivUserOk(){
  return !!(typeof STATE !== 'undefined' && STATE.user && !(typeof isInstructor === 'function' && isInstructor()));
}
function _ivFind(k){
  for(var i = 0; i < IV_VIDEOS.length; i++){ if(IV_VIDEOS[i].k === (k || 'intro')) return IV_VIDEOS[i]; }
  return IV_VIDEOS[0];
}
function _ivSfx(v){ return v.k === 'intro' ? '' : '_' + v.k; }

function _ivFullCard(v){
  return '<div id="iv-card-' + v.k + '" style="background:var(--surface-3);border:.5px solid var(--border-4);border-radius:14px;padding:12px;margin-bottom:14px;position:relative">'
    + '<button aria-label="Hide video" onclick="ivDismiss(\'' + v.k + '\')" style="position:absolute;top:6px;right:10px;border:none;background:transparent;color:var(--ink);opacity:.6;font-size:20px;cursor:pointer;line-height:1;z-index:2">×</button>'
    + '<div style="font-size:11px;color:#666;margin-bottom:2px">' + v.label + '</div>'
    + '<div style="font-size:15px;font-weight:600;color:var(--ink);margin-bottom:2px;padding-right:22px">' + v.title + '</div>'
    + '<div dir="rtl" lang="ar" style="font-size:12px;color:#666;margin-bottom:10px;line-height:1.6">' + v.ar + '</div>'
    + '<div class="vid-wrap">'
      + '<div id="iv-box-' + v.k + '" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;background:linear-gradient(135deg,#0C447C,#185FA5)">'
        + '<img src="https://i.ytimg.com/vi/' + v.id + '/hqdefault.jpg" alt="" loading="lazy" decoding="async" onerror="this.style.display=\'none\'" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover">'
        + '<button aria-label="Play video" onclick="ivPlay(\'' + v.k + '\')" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;background:rgba(0,0,0,.28);cursor:pointer;display:flex;align-items:center;justify-content:center">'
          + '<span style="width:58px;height:58px;border-radius:50%;background:#fff;color:#0C447C;font-size:24px;display:flex;align-items:center;justify-content:center;padding-left:4px;box-shadow:0 2px 10px rgba(0,0,0,.3)">▶</span>'
        + '</button>'
      + '</div>'
    + '</div>'
    + '</div>';
}
function _ivSlimLink(v){
  return '<button onclick="ivExpand(\'' + v.k + '\')" style="border:none;background:transparent;color:var(--brand-2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;padding:4px 0">' + v.slim + '</button>';
}

function renderIntroVideoCard(){
  try{
    if(!_ivUserOk()) return '';
    var ls = _ivLS();
    var started = _ivSafe(function(){ return STATE.progress && STATE.progress.done && STATE.progress.done.length > 0; });
    var full = '', slim = '';
    IV_VIDEOS.forEach(function(v){
      var s = _ivSfx(v);
      var collapsed = (ls['dismissed' + s] || ls['watched' + s] || started) && !_iv.expanded[v.k];
      if(collapsed) slim += _ivSlimLink(v); else full += _ivFullCard(v);
    });
    if(slim) slim = '<div style="display:flex;flex-wrap:wrap;align-items:center;gap:4px 18px;margin-bottom:14px;font-size:13px">' + slim + '</div>';
    return full + slim;
  }catch(_){ return ''; }
}

// Tap play: build the iframe in place (no full re-render, so the video never disappears).
function ivPlay(k){
  var v = _ivFind(k), s = _ivSfx(v), patch = {};
  _ivSafe(function(){ track('intro_video_play', { video: v.k }); });
  patch['watched' + s] = true; _ivSetLS(patch);
  var box = document.getElementById('iv-box-' + v.k);
  if(!box) return;
  box.innerHTML = '<iframe src="https://www.youtube.com/embed/' + v.id + '?rel=0&modestbranding=1&playsinline=1&autoplay=1" title="' + v.title.replace(/"/g, '') + '" '
    + 'style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen '
    + 'allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"></iframe>';
}

function ivDismiss(k){
  var v = _ivFind(k), s = _ivSfx(v), patch = {};
  _ivSafe(function(){ track('intro_video_dismiss', { video: v.k }); });
  patch['dismissed' + s] = true; _ivSetLS(patch);
  _iv.expanded[v.k] = false;
  if(STATE.tab === 'intro') render();
}

function ivExpand(k){
  _iv.expanded[_ivFind(k).k] = true;
  if(STATE.tab === 'intro') render();
}

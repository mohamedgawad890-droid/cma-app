// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 39 — INTRO VIDEO CARD ON THE STUDENT HOME SCREEN
// ═══════════════════════════════════════════════════════════════════════════
// A card under the "Start your first lesson / Continue" card shows Gawad's intro
// video (who he is, why the app exists, what it contains). It is a thumbnail only:
// the YouTube player is created when the student taps play, so Home stays fast and
// uses no mobile data until the student chooses to watch.
//
// States (per device, localStorage `cma-intro-v1` = {dismissed, watched}):
//   • new student            → full card (thumbnail + play button + "x")
//   • dismissed or watched   → one slim line "Watch the intro video" (tap to open the card again)
// Never shown to the instructor. Everything runs inside try/catch: a failure here can
// never break the Home screen. To remove the feature: delete this file and the single
// ${renderIntroVideoCard()} call in src/core/06-auth-intro.js.
// GA4 events: intro_video_play, intro_video_dismiss.

var IV_ID     = 'bpyeQFv3xI4';
var IV_LS_KEY = 'cma-intro-v1';
var _iv = { expanded: false };

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

function renderIntroVideoCard(){
  try{
    if(!_ivUserOk()) return '';
    var ls = _ivLS();
    var collapsed = (ls.dismissed || ls.watched) && !_iv.expanded;
    if(collapsed){
      return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:14px;font-size:13px">'
        + '<button onclick="ivExpand()" style="border:none;background:transparent;color:var(--brand-2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;padding:4px 0">▶ Watch the intro video</button>'
        + '</div>';
    }
    return '<div id="iv-card" style="background:var(--surface-3);border:.5px solid var(--border-4);border-radius:14px;padding:12px;margin-bottom:14px;position:relative">'
      + '<button aria-label="Hide intro video" onclick="ivDismiss()" style="position:absolute;top:6px;right:10px;border:none;background:transparent;color:var(--ink);opacity:.6;font-size:20px;cursor:pointer;line-height:1;z-index:2">×</button>'
      + '<div style="font-size:11px;color:#666;margin-bottom:2px">🎬 Start here</div>'
      + '<div style="font-size:15px;font-weight:600;color:var(--ink);margin-bottom:2px;padding-right:22px">Welcome to CMA Prep — watch this first</div>'
      + '<div dir="rtl" lang="ar" style="font-size:12px;color:#666;margin-bottom:10px;line-height:1.6">شاهد هذا الفيديو أولاً لتعرف كيف تستخدم التطبيق</div>'
      + '<div id="iv-box" style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;background:linear-gradient(135deg,#0C447C,#185FA5)">'
        + '<img src="https://i.ytimg.com/vi/' + IV_ID + '/hqdefault.jpg" alt="" loading="lazy" decoding="async" onerror="this.style.display=\'none\'" style="position:absolute;top:0;left:0;width:100%;height:100%;object-fit:cover">'
        + '<button aria-label="Play intro video" onclick="ivPlay()" style="position:absolute;top:0;left:0;width:100%;height:100%;border:none;background:rgba(0,0,0,.28);cursor:pointer;display:flex;align-items:center;justify-content:center">'
          + '<span style="width:58px;height:58px;border-radius:50%;background:#fff;color:#0C447C;font-size:24px;display:flex;align-items:center;justify-content:center;padding-left:4px;box-shadow:0 2px 10px rgba(0,0,0,.3)">▶</span>'
        + '</button>'
      + '</div>'
      + '</div>';
  }catch(_){ return ''; }
}

// Tap play: build the iframe in place (no full re-render, so the video never disappears).
function ivPlay(){
  _ivSafe(function(){ track('intro_video_play', {}); });
  _ivSetLS({ watched: true });
  var box = document.getElementById('iv-box');
  if(!box) return;
  box.innerHTML = '<iframe src="https://www.youtube.com/embed/' + IV_ID + '?rel=0&modestbranding=1&playsinline=1&autoplay=1" title="CMA Prep intro" '
    + 'style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen '
    + 'allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"></iframe>';
}

function ivDismiss(){
  _ivSafe(function(){ track('intro_video_dismiss', {}); });
  _ivSetLS({ dismissed: true });
  _iv.expanded = false;
  if(STATE.tab === 'intro') render();
}

function ivExpand(){
  _iv.expanded = true;
  if(STATE.tab === 'intro') render();
}

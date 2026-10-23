// ─── PAID VIDEOS (Batch 30) ───────────────────────────────────────────────────
// Paid / free video lessons stored in Firestore (NOT in the public repo/JSON).
//
// Data model (all created by hand in Firebase Console for now):
//   videos/_index            { free:true, freeLessons:['1-1','1-2'], paidLessons:['1-3','1-4',...] }
//                            (free:true so every signed-in student can read the catalog)
//   videos/{lessonId}        { free:true|false, items:[{l:'Part 1', id:'YOUTUBE_ID'}, ...] }
//   entitlements/{uid}       { paid:true, locked:false }   (instructor writes only)
//
// SAFETY: with PAID_VIDEOS_ENABLED=false, students see EXACTLY what they see today
// (the "Video lesson coming soon" card) and NO extra Firestore reads happen.
// The instructor always sees the paid-video experience, so it can be tested live
// before the flag is switched on for students.
//
// Firestore reads per student session: entitlements (1) + videos/_index (1),
// then 1 per video-lesson opened. Everything is cached in memory for the session.
const PAID_VIDEOS_ENABLED = false;               // ← flip to true to launch for students
const PAID_CONTACT_EMAIL  = 'Mohamed.gawad890@gmail.com';

// Batch 31: 2-device limit for PAID students. Each browser/app install gets a random id
// kept in localStorage; the first PAID_MAX_DEVICES ids are saved (add-only) in
// entitlements/{uid}.devices. A third device is refused the paid videos until the
// instructor clears the `devices` list in the Firebase Console. Free videos and
// the instructor are never affected. This is a deterrent enforced by the app (Firestore
// cannot tell which device is asking); the rule only guarantees add-only, max 2.
const PAID_MAX_DEVICES = 2;
const _pv = { ent:null, entP:null, idx:null, idxP:null, docs:{}, wm:null, devBlocked:false };

function _pvDeviceId(){
  try{
    let id = localStorage.getItem('cma-device-v1');
    if(!id || !/^[a-z]+_[a-z0-9]{8,24}$/.test(id)){
      const kind = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent || '') ? 'mob' : 'pc';
      let r = '';
      try{
        const a = new Uint8Array(8); crypto.getRandomValues(a);
        a.forEach(function(b){ r += (b % 36).toString(36); });
      }catch(_){ r = Math.random().toString(36).slice(2, 10); }
      id = kind + '_' + r + Date.now().toString(36).slice(-4);
      localStorage.setItem('cma-device-v1', id);
    }
    return id;
  }catch(_){ return null; }     // storage blocked → cannot identify the device → do not block
}
function _pvDeviceList(d){
  return Array.isArray(d && d.devices) ? d.devices.filter(function(x){ return typeof x === 'string'; }) : [];
}
// Resolves true = this device may watch paid videos, false = limit reached.
// Any technical failure (offline, rule not yet published) fails OPEN, so a paying
// student is never locked out by a glitch.
function _pvCheckDevice(d){
  const id = _pvDeviceId();
  if(!id) return Promise.resolve(true);
  const list = _pvDeviceList(d);
  if(list.indexOf(id) !== -1) return Promise.resolve(true);
  if(list.length >= PAID_MAX_DEVICES) return Promise.resolve(false);
  const ref = db.collection('entitlements').doc(_pvUid());
  return ref.update({ devices: firebase.firestore.FieldValue.arrayUnion(id) })
    .then(function(){ return true; })
    .catch(function(e){
      // Two devices may have registered at the same moment: re-read and decide.
      return ref.get().then(function(s){
        const l2 = _pvDeviceList(s.exists ? s.data() : {});
        if(l2.indexOf(id) !== -1) return true;
        if(l2.length >= PAID_MAX_DEVICES) return false;
        console.warn('[paid-videos] device registration failed', e && e.code);
        return true;
      }).catch(function(){ return true; });
    });
}

function _pvActive(){
  return !!(STATE.user && (PAID_VIDEOS_ENABLED || isInstructor()));
}
function _pvUid(){ return STATE.user && STATE.user.uid; }

// Does this student have paid access? Instructor always does. No entitlement doc = free.
function _pvEntitled(){
  if(isInstructor()) return Promise.resolve(true);
  if(_pv.entP) return _pv.entP;
  _pv.entP = db.collection('entitlements').doc(_pvUid()).get().then(function(s){
    const d = s.exists ? s.data() : {};
    const paid = (d.paid === true && d.locked !== true);
    if(!paid){ _pv.ent = false; return false; }
    return _pvCheckDevice(d).then(function(ok){
      _pv.devBlocked = !ok;
      _pv.ent = ok;
      return ok;
    });
  }).catch(function(){ _pv.entP = null; return false; });
  return _pv.entP;
}
// Public catalog: which lessons have free / paid videos.
function _pvIndex(){
  if(_pv.idxP) return _pv.idxP;
  _pv.idxP = db.collection('videos').doc('_index').get().then(function(s){
    const d = s.exists ? s.data() : {};
    _pv.idx = {
      free: Array.isArray(d.freeLessons) ? d.freeLessons : [],
      paid: Array.isArray(d.paidLessons) ? d.paidLessons : []
    };
    return _pv.idx;
  }).catch(function(){ _pv.idxP = null; return {free:[],paid:[]}; });
  return _pv.idxP;
}
function _pvLoadDoc(lessonId){
  if(_pv.docs[lessonId]) return _pv.docs[lessonId];
  _pv.docs[lessonId] = db.collection('videos').doc(lessonId).get().then(function(s){
    return s.exists ? s.data() : null;
  }).catch(function(){ delete _pv.docs[lessonId]; return null; });
  return _pv.docs[lessonId];
}

// Called from the lesson reader. Returns HTML synchronously; fills itself later.
function paidVideoSlot(lessonId, fallbackHTML, hasInlineVideo){
  if(hasInlineVideo) return '';            // a legacy inline video block already shows
  if(!_pvActive()) return fallbackHTML;    // students today: unchanged
  const slotId = 'pv-slot-' + lessonId;
  setTimeout(function(){ _pvFill(lessonId, fallbackHTML); }, 0);
  return '<div id="' + slotId + '">' + fallbackHTML + '</div>';
}

async function _pvFill(lessonId, fallbackHTML){
  const slot = document.getElementById('pv-slot-' + lessonId);
  if(!slot) return;
  try{
    const idx = await _pvIndex();
    const isFree = idx.free.indexOf(lessonId) !== -1;
    const isPaid = idx.paid.indexOf(lessonId) !== -1;
    if(!isFree && !isPaid){ return; }                 // no video yet → keep "coming soon"
    if(isFree){
      const d = await _pvLoadDoc(lessonId);
      _pvRender(slot, lessonId, d, false);
      return;
    }
    const ok = await _pvEntitled();
    if(!ok){
      if(_pv.devBlocked) _pvRenderDeviceLimit(slot, lessonId);
      else _pvRenderLocked(slot, lessonId);
      return;
    }
    const d = await _pvLoadDoc(lessonId);
    _pvRender(slot, lessonId, d, true);
  }catch(_){ /* leave the fallback card in place */ }
}

function _pvRenderLocked(slot, lessonId){
  const mail = 'mailto:' + PAID_CONTACT_EMAIL + '?subject=' +
    encodeURIComponent('CMA Prep — video access') + '&body=' +
    encodeURIComponent('Hello, I would like access to the video lessons.\nLesson: ' + lessonId);
  slot.innerHTML =
    '<div style="margin:14px 0 4px;background:var(--surface-3);border:.5px solid var(--border-4);border-radius:12px;padding:16px;text-align:center">' +
      '<div style="font-size:26px;margin-bottom:6px">🔒</div>' +
      '<div style="font-size:14px;font-weight:600;color:var(--ink)">Video lessons are for enrolled students</div>' +
      '<div dir="rtl" lang="ar" style="font-size:13px;color:#666;margin-top:4px;line-height:1.7">فيديوهات الشرح متاحة للمشتركين فقط — تواصل مع المدرّس للاشتراك</div>' +
      '<a href="' + mail + '" style="display:inline-block;margin-top:10px;padding:9px 18px;border-radius:9px;background:var(--brand);color:#fff;font-size:13px;font-weight:500;text-decoration:none">Contact the instructor</a>' +
    '</div>';
}

function _pvRenderDeviceLimit(slot, lessonId){
  const mail = 'mailto:' + PAID_CONTACT_EMAIL + '?subject=' +
    encodeURIComponent('CMA Prep — new device request') + '&body=' +
    encodeURIComponent('Hello, I need to switch the device on my account.\nLesson: ' + lessonId);
  slot.innerHTML =
    '<div style="margin:14px 0 4px;background:var(--surface-3);border:.5px solid var(--border-4);border-radius:12px;padding:16px;text-align:center">' +
      '<div style="font-size:26px;margin-bottom:6px">📱</div>' +
      '<div style="font-size:14px;font-weight:600;color:var(--ink)">Your account is already active on ' + PAID_MAX_DEVICES + ' devices</div>' +
      '<div style="font-size:13px;color:#666;margin-top:4px;line-height:1.6">Videos play on up to ' + PAID_MAX_DEVICES + ' devices (for example one phone and one laptop). Contact the instructor to switch a device.</div>' +
      '<div dir="rtl" lang="ar" style="font-size:13px;color:#666;margin-top:6px;line-height:1.7">حسابك مفعّل بالفعل على جهازين — تواصل مع المدرّس لتغيير الجهاز</div>' +
      '<a href="' + mail + '" style="display:inline-block;margin-top:10px;padding:9px 18px;border-radius:9px;background:var(--brand);color:#fff;font-size:13px;font-weight:500;text-decoration:none">Contact the instructor</a>' +
    '</div>';
}

function _pvRender(slot, lessonId, doc, withWatermark){
  const items = doc && Array.isArray(doc.items) ? doc.items.filter(function(x){return x && /^[A-Za-z0-9_-]{6,20}$/.test(String(x.id||''));}) : [];
  if(!items.length) return;                         // doc missing/empty → keep "coming soon"
  const cards = items.map(function(it, i){
    const label = it.l ? String(it.l) : (items.length > 1 ? 'Part ' + (i+1) : 'Video lesson');
    return '<div id="pv-' + lessonId + '-' + i + '" style="margin:14px 0 4px">' +
      '<div class="formula-lbl" style="color:var(--brand-2);margin-bottom:8px">🎬 ' + esc(label) + '</div>' +
      '<button type="button" onclick="paidVideoPlay(\'' + lessonId + '\',' + i + ')" style="position:relative;width:100%;padding-bottom:56.25%;height:0;border:0;border-radius:10px;background:linear-gradient(135deg,var(--brand),var(--brand-3));cursor:pointer;overflow:hidden">' +
        '<span style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#fff;gap:6px">' +
          '<span style="font-size:42px;line-height:1">▶</span><span style="font-size:13px;opacity:.9">Tap to play</span>' +
        '</span></button></div>';
  }).join('');
  slot.innerHTML = cards;
  slot._pvItems = items;
  slot._pvWm = !!withWatermark;
}

// Click-to-play: the iframe is created only now (nothing loads before the tap).
function paidVideoPlay(lessonId, i){
  const slot = document.getElementById('pv-slot-' + lessonId);
  const box = document.getElementById('pv-' + lessonId + '-' + i);
  if(!slot || !box || !slot._pvItems) return;
  const it = slot._pvItems[i];
  if(!it) return;
  const wrap = document.createElement('div');
  wrap.style.cssText = 'position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;background:#000';
  const f = document.createElement('iframe');
  f.src = 'https://www.youtube-nocookie.com/embed/' + it.id + '?rel=0&modestbranding=1&playsinline=1';
  f.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;border:0';
  f.setAttribute('allowfullscreen', '');
  f.setAttribute('allow', 'accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture');
  wrap.appendChild(f);
  if(slot._pvWm && !isInstructor()) wrap.appendChild(_pvWatermark(wrap));
  const old = box.querySelector('button');
  if(old) box.replaceChild(wrap, old);
  if(typeof track === 'function') track('video_play', { lesson_id: String(lessonId), part: i + 1 });
}

// Moving semi-transparent watermark with the student's identity (leak deterrent,
// not DRM: it can be removed with DevTools, but it identifies the source of a leak).
function _pvWatermark(wrap){
  const u = STATE.user || {};
  const text = String(u.email || u.displayName || u.uid || '').slice(0, 40);
  const w = document.createElement('div');
  w.textContent = text;
  w.style.cssText = 'position:absolute;pointer-events:none;z-index:2;color:#fff;font-size:12px;font-weight:600;' +
    'opacity:.28;text-shadow:0 0 3px #000;white-space:nowrap;transition:top 1.2s ease,left 1.2s ease;top:8%;left:6%';
  function move(){
    if(!document.body.contains(w)){ clearInterval(t); return; }
    w.style.top = (6 + Math.random() * 78) + '%';
    w.style.left = (4 + Math.random() * 52) + '%';
  }
  const t = setInterval(move, 7000);
  return w;
}

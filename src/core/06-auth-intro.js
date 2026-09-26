// ─── AUTH SCREENS ─────────────────────────────────────────────────────────────
function renderLoading(){
  // Skeleton that mirrors the Study screen — feels like content is about to appear
  // rather than a blank wait. Uses the shimmer animation already in app.css.
  const shimmer=(w,h,delay='0s',r='8px')=>
    `<div style="height:${h};width:${w};background:var(--surface-4);border-radius:${r};animation:shimmer 1.3s ease-in-out infinite ${delay};flex-shrink:0"></div>`;
  const sectionRow=()=>`
    <div style="display:flex;align-items:center;gap:12px;padding:12px 16px;border-bottom:.5px solid var(--surface-3)">
      ${shimmer('38px','38px','0s','9px')}
      <div style="flex:1;display:flex;flex-direction:column;gap:6px">
        ${shimmer('55%','13px')}
        ${shimmer('35%','10px','.05s')}
      </div>
      ${shimmer('16px','16px','0s','4px')}
    </div>`;
  return`
    <!-- Skeleton nav -->
    <div style="height:44px;background:#fff;border-bottom:.5px solid var(--border);display:flex;align-items:center;padding:0 16px;gap:12px;flex-shrink:0">
      <img src="${PHOTO_B64}" style="width:28px;height:28px;border-radius:50%;object-fit:cover;opacity:.9">
      <div style="flex:1;display:flex;flex-direction:column;gap:4px">
        ${shimmer('120px','12px')}
        ${shimmer('80px','9px','.05s')}
      </div>
    </div>
    <!-- Skeleton hero card -->
    <div style="margin:14px 16px 10px;background:linear-gradient(135deg,#d8e8f5,#c8ddf0);border-radius:12px;padding:16px;overflow:hidden;position:relative">
      <div style="display:flex;justify-content:space-between;margin-bottom:10px">
        ${shimmer('45%','14px','0s','6px')}
        ${shimmer('18%','14px','.05s','6px')}
      </div>
      ${shimmer('100%','8px','.1s','4px')}
      ${shimmer('70%','10px','.15s','4px')}
    </div>
    <!-- Skeleton section label -->
    <div style="padding:4px 16px 8px">${shimmer('120px','11px','0s','4px')}</div>
    <!-- Skeleton section cards -->
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;margin:0 16px;overflow:hidden">
      ${[0,.08,.16,.24,.3].map(d=>`
        <div style="display:flex;align-items:center;gap:12px;padding:14px 16px;border-bottom:.5px solid var(--surface-3)">
          ${shimmer('38px','38px',d+'s','9px')}
          <div style="flex:1;display:flex;flex-direction:column;gap:7px">
            ${shimmer(['60%','50%','70%','55%','45%'][Math.floor(d*20)]||'58%','13px',d+'s')}
            ${shimmer('30%','10px',(d+.05)+'s')}
          </div>
        </div>`).join('')}
    </div>
    <style>@keyframes shimmer{0%,100%{opacity:.6}50%{opacity:1}}</style>`;
}

function renderOnboarding(){
  return`<div style="overflow-y:auto;flex:1;background:#fff">

    <!-- HERO -->
    <div style="background:linear-gradient(135deg,var(--brand) 0%,var(--brand-2) 60%,var(--brand-3) 100%);padding:40px 24px 32px;text-align:center;color:#fff">
      <div style="font-size:11px;font-weight:500;letter-spacing:3px;opacity:.7;margin-bottom:16px">CMA PART 1 PREP</div>
      <img src="${PHOTO_B64}" style="width:88px;height:88px;border-radius:50%;object-fit:cover;border:3px solid rgba(255,255,255,.8);margin-bottom:14px;display:block;margin-left:auto;margin-right:auto">
      <div style="font-size:22px;font-weight:500;margin-bottom:4px">Gawad's CMA Prep</div>
      <div style="font-size:14px;opacity:.85;margin-bottom:20px">Your complete CMA Part 1 study companion</div>
      <div style="display:flex;justify-content:center;gap:10px;flex-wrap:wrap">
        <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:5px 14px;font-size:12px">${TOTAL_LESSONS} Lessons</div>
        <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:5px 14px;font-size:12px">2,602 MCQs</div>
        <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:5px 14px;font-size:12px">6 Sections</div>
        <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:5px 14px;font-size:12px">Free Access</div>
      </div>
    </div>

    <div style="padding:24px 20px">

      <!-- INTRO VIDEO -->
      <div style="margin-bottom:24px">
        <div style="font-size:17px;font-weight:500;color:var(--ink);margin-bottom:10px">🎬 Watch this first</div>
        <div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:12px;background:#000;box-shadow:0 4px 16px rgba(0,0,0,.12)">
          <iframe src="https://www.youtube.com/embed/LWHyZxV5als?rel=0&modestbranding=1" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen loading="lazy" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"></iframe>
        </div>
      </div>

      <!-- WHAT IS THIS APP -->
      <div style="margin-bottom:24px">
        <div style="font-size:17px;font-weight:500;color:var(--ink);margin-bottom:10px">📱 What is this app?</div>
        <div style="font-size:14px;color:#555;line-height:1.7">
          This is your personal CMA Part 1 study app — built by <strong style="color:var(--brand)">Gawad</strong>, a CFO and CMA instructor with 20 years of experience. It covers everything you need to pass the exam: structured lessons, practice quizzes, progress tracking, and more.
        </div>
      </div>

      <!-- FEATURES -->
      <div style="margin-bottom:24px">
        <div style="font-size:17px;font-weight:500;color:var(--ink);margin-bottom:12px">✨ What's inside?</div>
        <div style="display:flex;flex-direction:column;gap:10px">
          ${[
            ['📚','Study',`6 sections · ${TOTAL_LESSONS} lessons covering all CMA Part 1 topics with detailed, structured content`],
            ['❓','Quizzes','2,602 MCQs — exam-style questions with full explanations after each answer'],
            ['📊','Progress','Track your completed lessons and quiz scores across all sections'],
            ['📌','Tracker','Mark lessons as Good or Bad to know what to review'],
            ['🌐','Community','Ask questions and get answers from fellow CMA candidates'],
            ['⭐','Feedback','Share your experience and help improve the course'],
          ].map(([icon,title,desc])=>`
          <div style="display:flex;gap:12px;align-items:flex-start;background:var(--surface-2);border-radius:12px;padding:12px 14px">
            <span style="font-size:22px;flex-shrink:0">${icon}</span>
            <div>
              <div style="font-size:14px;font-weight:500;color:var(--ink);margin-bottom:2px">${title}</div>
              <div style="font-size:13px;color:#666;line-height:1.5">${desc}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>

      <!-- HOW TO REGISTER -->
      <div style="margin-bottom:24px">
        <div style="font-size:17px;font-weight:500;color:var(--ink);margin-bottom:12px">🚀 How to get started?</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          ${[
            ['1','Tap "Get Started" below'],
            ['2','Choose "New Student" and enter your email + password'],
            ['3','Complete your profile (name, mobile, country, exam date)'],
            ['4','Start studying — lessons, quizzes, and tools are all unlocked!'],
            ['5','Already have an account? Just tap "Login"'],
          ].map(([n,txt])=>`
          <div style="display:flex;gap:12px;align-items:center">
            <div style="width:26px;height:26px;border-radius:50%;background:var(--brand);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;flex-shrink:0">${n}</div>
            <div style="font-size:14px;color:#555">${txt}</div>
          </div>`).join('')}
        </div>
      </div>

      <!-- ANY BROWSER -->
      <div style="background:var(--brand-tint);border-radius:12px;padding:14px 16px;margin-bottom:24px;display:flex;gap:10px;align-items:flex-start">
        <span style="font-size:22px;flex-shrink:0">💻</span>
        <div>
          <div style="font-size:14px;font-weight:500;color:var(--brand);margin-bottom:3px">Works on any device</div>
          <div style="font-size:13px;color:var(--brand-2);line-height:1.55">Open <strong>mohamedgawad890-droid.github.io/cma-app</strong> on any browser — Chrome, Safari, Firefox — on your phone, tablet, or computer. Sign in with your email and password and your progress syncs automatically.</div>
        </div>
      </div>

      <!-- CTA BUTTONS -->
      <button onclick="localStorage.setItem('cma-visited','1');STATE.authScreen='register';STATE.tab='login';render()" class="btn" style="background:var(--brand);color:#fff;font-size:16px;margin-bottom:10px">
        Get Started — Create Account →
      </button>
      <button onclick="localStorage.setItem('cma-visited','1');STATE.authScreen='login';STATE.tab='login';render()" class="btn btn-outline" style="font-size:15px;margin-bottom:8px">
        I already have an account
      </button>

      <div style="height:20px"></div>
    </div>
  </div>`;
}

function renderLogin(){
  const isReg=STATE.authScreen==='register';
  return`<div style="overflow-y:auto;flex:1;padding:28px 20px 20px">
    <div style="text-align:center;margin-bottom:24px">
      <div style="font-size:13px;font-weight:500;color:var(--brand-2);letter-spacing:2px;margin-bottom:10px">CMA</div>
      <img src="${PHOTO_B64}" style="width:80px;height:80px;border-radius:50%;object-fit:cover;margin:0 auto 12px;display:block;border:3px solid var(--brand-tint)">
      <div style="font-size:14px;font-weight:500;color:var(--ink);margin-top:4px">By Mohamed Abdelgawad</div>
    </div>

    <div style="display:flex;background:var(--surface-3);border-radius:10px;padding:3px;margin-bottom:18px">
      <button onclick="STATE.authScreen='login';STATE.authError='';render()" style="flex:1;padding:9px;border-radius:8px;border:none;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit;background:${!isReg?'#fff':'transparent'};color:${!isReg?'var(--brand)':'#888'}">Login</button>
      <button onclick="STATE.authScreen='register';STATE.authError='';render()" style="flex:1;padding:9px;border-radius:8px;border:none;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit;background:${isReg?'#fff':'transparent'};color:${isReg?'var(--brand)':'#888'}">New Student</button>
    </div>

    ${STATE.authError?`<div style="background:var(--err-tint);border:1px solid var(--err);border-radius:8px;padding:10px 14px;margin-bottom:14px;font-size:13px;color:var(--err-strong)">${esc(STATE.authError)}</div>`:''}

    <div class="card" style="margin-bottom:14px">
      ${isReg?`<div style="margin-bottom:12px"><label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Full Name</label><input id="auth-name" type="text" placeholder="Your full name" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink)"></div>`:''}
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Email</label>
        <input id="auth-email" type="email" placeholder="your@email.com" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink)">
      </div>
      <div style="${isReg?'margin-bottom:12px':''}">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Password</label>
        <input id="auth-pass" type="password" placeholder="Enter your password" onkeydown="if(event.key==='Enter')doAuth()" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink)">
      </div>
      ${isReg?`<div><label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Confirm Password</label><input id="auth-pass2" type="password" placeholder="Repeat your password" onkeydown="if(event.key==='Enter')doAuth()" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink)"></div>`:''}
    </div>

    <button onclick="doAuth()" class="btn" style="background:var(--brand);color:#fff;font-size:15px;margin-bottom:14px" ${STATE.authLoading?'disabled':''}>
      ${STATE.authLoading?'⏳ Please wait...':(isReg?'Create Account →':'Login →')}
    </button>

    ${!isReg?`<div style="text-align:center;margin-bottom:12px"><span onclick="sendPasswordReset()" style="font-size:13px;color:var(--brand-2);cursor:pointer">Forgot your password?</span></div>`:''}

    <div style="text-align:center;font-size:13px;color:#888">
      ${isReg?`Already have an account? <span onclick="STATE.authScreen='login';STATE.authError='';render()" style="color:var(--brand-2);cursor:pointer;font-weight:500">Login here</span>`:`New student? <span onclick="STATE.authScreen='register';STATE.authError='';render()" style="color:var(--brand-2);cursor:pointer;font-weight:500">Create account</span>`}
    </div>
    <div style="height:20px"></div>
  </div>`;
}

// ─── INTRO SCREEN ─────────────────────────────────────────────────────────────
function renderIntro(){
  return`${renderSubNav(SUB_ME,'intro')}<div class="scroll-area">
    <!-- PROFILE HERO -->
    <div class="profile-hero">
      <img src="${PHOTO_B64}" class="profile-img" alt="Mohamed Abdelgawad">
      <div class="profile-name">Mohamed Abdelgawad</div>
      <div class="profile-title">CFO | Finance Educator | CMA Instructor</div>
      <div class="profile-creds">
        <span class="cred-badge">CMA</span>
        <span class="cred-badge">DBA</span>
        <span class="cred-badge">MBA</span>
        <span class="cred-badge">TOT</span>
        <span class="cred-badge">20 Years Experience</span>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:16px">
        <a href="mailto:Mohamed.Gawad890@gmail.com" style="display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:10px 18px;text-decoration:none;color:#fff;min-width:80px">
          <span style="font-size:22px">✉️</span>
          <span style="font-size:11px;font-weight:500">Email</span>
        </a>
      </div>
      <div style="display:flex;gap:10px;justify-content:center;margin-top:10px;flex-wrap:wrap">
        <a href="https://www.facebook.com/profile.php?id=61550958763803" target="_blank" style="display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:10px 18px;text-decoration:none;color:#fff;min-width:80px">
          <span style="font-size:22px">📘</span>
          <span style="font-size:11px;font-weight:500">Facebook</span>
        </a>
        <a href="https://www.facebook.com/share/1BSdcgufdL/?mibextid=wwXIfr" target="_blank" style="display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:10px 18px;text-decoration:none;color:#fff;min-width:80px">
          <span style="font-size:22px">👥</span>
          <span style="font-size:11px;font-weight:500">FB Group</span>
        </a>
        <a href="https://www.linkedin.com/in/mohamed-abdelgawad890" target="_blank" style="display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:10px 18px;text-decoration:none;color:#fff;min-width:80px">
          <span style="font-size:22px">💼</span>
          <span style="font-size:11px;font-weight:500">LinkedIn</span>
        </a>
        <a href="https://www.instagram.com/mohamed_abdelgawad_cma/" target="_blank" style="display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:10px 18px;text-decoration:none;color:#fff;min-width:80px">
          <span style="font-size:22px">📸</span>
          <span style="font-size:11px;font-weight:500">Instagram</span>
        </a>
        <a href="https://www.tiktok.com/@mohamed.abdelgawa" target="_blank" style="display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:10px 18px;text-decoration:none;color:#fff;min-width:80px">
          <span style="font-size:22px">🎵</span>
          <span style="font-size:11px;font-weight:500">TikTok</span>
        </a>
        <a href="https://www.youtube.com/@mohamedabdelgawad5691" target="_blank" style="display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:10px 18px;text-decoration:none;color:#fff;min-width:80px">
          <span style="font-size:22px">▶️</span>
          <span style="font-size:11px;font-weight:500">YouTube</span>
        </a>
      </div>
    </div>

    <div class="pad" style="padding-top:16px">

      ${renderExamsStrip()}

      <!-- WELCOME -->
      <div class="info-section">
        <div class="welcome-box">
          <p>Welcome to CMA Prep! 🎓 Great to meet you! I'm your CMA instructor. I've helped candidates from fresh graduates to seasoned CFOs — and I know exactly what it takes to pass the CMA exam. Let's get you there together!</p>
        </div>
        ${(()=>{const st=loadStudent();if(!st||!st.examdate)return'';const d=new Date(st.examdate+'-01');const today=new Date();const diff=Math.ceil((d-today)/(1000*60*60*24));if(diff<=0)return'';const streak=getStudyStreak();return`<div style="display:flex;gap:8px;margin-bottom:4px">
          <div style="flex:1;background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">📅</span>
            <div><div style="font-size:11px;color:rgba(255,255,255,.75)">Exam countdown</div><div style="font-size:18px;font-weight:500;color:#fff">${diff} days</div></div>
          </div>
          <div style="flex:1;background:linear-gradient(135deg,var(--ok-strong-2),var(--ok));border-radius:12px;padding:12px 14px;display:flex;align-items:center;gap:10px">
            <span style="font-size:24px">🔥</span>
            <div><div style="font-size:11px;color:rgba(255,255,255,.75)">Study streak</div><div style="font-size:18px;font-weight:500;color:#fff">${streak} day${streak===1?'':'s'}</div></div>
          </div>
        </div>`;})()}
        <div style="background:var(--surface-3);border-radius:10px;padding:14px 16px;font-size:13px;color:#555;line-height:1.6">
          <strong style="color:var(--ink)">About me:</strong> I'm currently CFO, with 20 years of experience in Accounting, Inventory Management, Cost Accounting, Financial Planning & Controlling, Forecasting & Budgeting, Data Analysis.</div>
      </div>

      <!-- DAILY GOAL RING (ported) -->
    ${(()=>{const todayMins=todayStudyMinutes();const goal=STATE.dailyGoalMinutes||30;const pctGoal=Math.min(100,Math.round(todayMins/goal*100));const circ=2*Math.PI*26;const off=circ-(pctGoal/100)*circ;const col=pctGoal>=100?'#1E8449':pctGoal>=60?'var(--warn)':'#1A5276';return `<div class="goal-ring-wrap"><div class="goal-ring"><svg width="64" height="64"><circle cx="32" cy="32" r="26" stroke="var(--bg)" stroke-width="7" fill="none"/><circle cx="32" cy="32" r="26" stroke="${col}" stroke-width="7" fill="none" stroke-dasharray="${circ}" stroke-dashoffset="${off}" stroke-linecap="round" style="transition:stroke-dashoffset .5s"/></svg><div class="goal-ring-val">${pctGoal}%</div></div><div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;color:var(--ink)">Today's study goal</div><div style="font-size:12px;color:#888;margin-top:2px">${todayMins} / ${goal} min · ${pctGoal>=100?'Goal reached! 🎉':(goal-todayMins)+' min to go'}</div></div></div>`;})()}
      <!-- QUESTION OF THE DAY (ported; no-ops until instructor logs a lecture) -->
      ${(()=>{const qs=STATE.qotdState;if(!qs||!qs.question)return '';const q=qs.question;const sel=qs.selected;const answered=qs.answered;const labels=['A','B','C','D'];const optsHTML=q.o.map((opt,i)=>{let cls='qod-opt';if(answered){if(i===q.a)cls+=' correct';else if(i===sel)cls+=' wrong';}return `<div class="${cls}" ${answered?'':`onclick="qotdAnswer(${i})"`}><div class="qod-opt-letter">${labels[i]}</div><div style="flex:1">${esc(opt)}</div></div>`;}).join('');const explanation=answered?`<div class="qod-exp"><strong>${sel===q.a?'✅ Correct!':'❌ Correct answer: '+labels[q.a]}</strong><div style="margin-top:4px">${expInner(q,sel)}</div></div>`:'';return `<div class="qod-card"><div class="qod-lbl">🎯 QUESTION OF THE DAY</div><div class="qod-meta">${esc(q.secTitle||'')} · ${esc(q.lessonTitle||'')}</div><div class="qod-title">${stemHTML(q.q)}</div>${optsHTML}${explanation}</div>`;})()}

      <!-- WHAT IS IMA -->
      <div class="info-section">
        <div class="info-title">🏛️ What is IMA?</div>
        <div class="card" style="margin-bottom:0">
          <p class="lp">The <strong>Institute of Management Accountants (IMA)</strong> is one of the largest and most respected associations for finance and accounting professionals worldwide.</p>
          <div class="tbl-wrap"><table class="tbl">
            <tr><td style="font-weight:500;color:var(--ink);width:40%">Founded</td><td>1919</td></tr>
            <tr><td style="font-weight:500;color:var(--ink)">Members</td><td>140,000+ in 150+ countries</td></tr>
            <tr><td style="font-weight:500;color:var(--ink)">Headquarters</td><td>Montvale, New Jersey, USA</td></tr>
            <tr><td style="font-weight:500;color:var(--ink)">Mission</td><td>Advance the profession of management accounting globally</td></tr>
            <tr><td style="font-weight:500;color:var(--ink)">Website</td><td>imanet.org</td></tr>
          </table></div>
        </div>
      </div>

      <!-- WHAT IS CMA -->
      <div class="info-section">
        <div class="info-title">🎯 What is the CMA?</div>
        <div class="card" style="margin-bottom:10px">
          <p class="lp">The <strong>Certified Management Accountant (CMA)</strong> is the global gold standard credential for management accounting and financial management. It demonstrates mastery of financial planning, analysis, control, and decision support.</p>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">
            <div style="background:var(--brand-tint);border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:11px;color:var(--brand-2);margin-bottom:4px">Recognition</div>
              <div style="font-size:13px;font-weight:500;color:var(--brand)">Global</div>
            </div>
            <div style="background:var(--ok-tint);border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:11px;color:var(--ok-strong-2);margin-bottom:4px">Issued by</div>
              <div style="font-size:13px;font-weight:500;color:var(--ok-strong)">IMA</div>
            </div>
            <div style="background:#EEEDFE;border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:11px;color:#534AB7;margin-bottom:4px">Exam Parts</div>
              <div style="font-size:13px;font-weight:500;color:#3C3489">2 Parts</div>
            </div>
            <div style="background:var(--warn-tint);border-radius:8px;padding:10px;text-align:center">
              <div style="font-size:11px;color:#BA7517;margin-bottom:4px">Salary Boost</div>
              <div style="font-size:13px;font-weight:500;color:var(--warn-strong)">+21%</div>
            </div>
          </div>
        </div>
        <div class="tip"><div class="tip-lbl">WHY CMA?</div><div class="tip-txt">Per IMA's Global Salary Survey, CMAs earn roughly 21% more in median total compensation than non-certified peers globally — and notably more in some regions (around 39% in the Middle East/Africa). The credential is recognized in 100+ countries and opens doors to CFO, Controller, and VP Finance roles.</div></div>
      </div>

      <!-- CMA PARTS -->
      <div class="info-section">
        <div class="info-title">📚 CMA Exam — Part 1 & Part 2</div>

        <!-- Part 1 -->
        <div class="part-card" style="margin-bottom:10px">
          <div class="part-header" style="background:var(--brand)">
            <div>
              <div style="font-size:13px;font-weight:500;color:#fff">Part 1</div>
              <div style="font-size:11px;color:rgba(255,255,255,.75);margin-top:1px">Financial Planning, Performance & Analytics</div>
            </div>
            <span style="background:rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:500;padding:4px 10px;border-radius:20px">6 Topics</span>
          </div>
          <div class="part-topics" style="background:var(--brand-tint)">
            ${[["External Financial Reporting","15%"],["Planning, Budgeting & Forecasting","20%"],["Performance Management","20%"],["Cost Management","15%"],["Internal Controls","15%"],["Technology & Analytics","15%"]].map(([t,w])=>`
            <div class="part-topic">
              <span style="color:var(--brand)">${t}</span>
              <span style="font-weight:500;color:var(--brand-2);background:rgba(55,138,221,.15);padding:2px 8px;border-radius:10px;font-size:11px">${w}</span>
            </div>`).join('')}
          </div>
        </div>

        <!-- Part 2 -->
        <div class="part-card">
          <div class="part-header" style="background:var(--ok-strong)">
            <div>
              <div style="font-size:13px;font-weight:500;color:#fff">Part 2</div>
              <div style="font-size:11px;color:rgba(255,255,255,.75);margin-top:1px">Strategic Financial Management</div>
            </div>
            <span style="background:rgba(255,255,255,.2);color:#fff;font-size:11px;font-weight:500;padding:4px 10px;border-radius:20px">6 Topics</span>
          </div>
          <div class="part-topics" style="background:var(--ok-tint)">
            ${[["Financial Statement Analysis","20%"],["Corporate Finance","20%"],["Decision Analysis","25%"],["Risk Management","10%"],["Investment Decisions","10%"],["Professional Ethics","15%"]].map(([t,w])=>`
            <div class="part-topic">
              <span style="color:var(--ok-strong)">${t}</span>
              <span style="font-weight:500;color:var(--ok-strong-2);background:rgba(99,153,34,.15);padding:2px 8px;border-radius:10px;font-size:11px">${w}</span>
            </div>`).join('')}
          </div>
        </div>
      </div>

      <!-- EXAM STRUCTURE -->
      <div class="info-section">
        <div class="info-title">📝 Exam Structure & Scoring</div>
        <div class="card" style="margin-bottom:10px">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
            <div style="background:var(--brand-tint);border-radius:10px;padding:12px;text-align:center">
              <div style="font-size:11px;color:var(--brand-2);margin-bottom:4px">MCQ Section</div>
              <div style="font-size:20px;font-weight:500;color:var(--brand)">100</div>
              <div style="font-size:11px;color:var(--brand-2)">questions · 3 hours</div>
              <div style="font-size:11px;color:var(--brand-2);margin-top:3px;font-weight:500">75% of score</div>
            </div>
            <div style="background:#EEEDFE;border-radius:10px;padding:12px;text-align:center">
              <div style="font-size:11px;color:#534AB7;margin-bottom:4px">CBQ Section</div>
              <div style="font-size:20px;font-weight:500;color:#3C3489">2</div>
              <div style="font-size:11px;color:#534AB7">case-based · 1 hour</div>
              <div style="font-size:11px;color:#534AB7;margin-top:3px;font-weight:500">25% of score</div>
            </div>
          </div>
          <div style="background:var(--surface-3);border-radius:8px;padding:12px 14px">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px">
              <span style="color:#555">Total Exam Duration</span><span style="font-weight:500">4 hours</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px">
              <span style="color:#555">Score Scale</span><span style="font-weight:500">0 – 500 points</span>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:13px">
              <span style="color:#555">Minimum Pass Score</span><span style="font-weight:500;color:var(--ok-strong-2)">360 out of 500 (scaled)</span>
            </div>
          </div>
        </div>
        <div class="tip"><div class="tip-lbl">IMPORTANT</div><div class="tip-txt">You must answer at least 50% of the MCQs correctly to reach the CBQ (case-based) section. Once you move on from the MCQs you can't return to them, though any unused MCQ time carries forward. The score is scaled (0–500), so a raw percentage correct doesn't map directly to the 360 pass mark.</div></div>
      </div>

      <!-- EXAM WINDOWS -->
      <div class="info-section">
        <div class="info-title">📅 Exam Windows Each Year</div>
        <div style="margin-bottom:10px">
          ${[["January – February","Window 1","Register by Feb 15"],["May – June","Window 2","Register by Jun 15"],["September – October","Window 3","Register by Oct 15"]].map(([months,win,note],i)=>`
          <div class="window-card">
            <div style="width:36px;height:36px;border-radius:50%;background:var(--brand-2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;flex-shrink:0">${i+1}</div>
            <div>
              <div style="font-size:14px;font-weight:500;color:var(--brand)">${months}</div>
              <div style="font-size:12px;color:#555;margin-top:2px">${win} · ${note}</div>
            </div>
          </div>`).join('')}
        </div>
        <div style="background:var(--surface-3);border-radius:8px;padding:10px 14px;margin-bottom:10px;font-size:12px;color:#555;line-height:1.6"><strong style="color:var(--ink)">Key deadlines:</strong> You can take Part 1 and Part 2 in any order — even both in one window. You have <strong>3 years</strong> from entering the program to pass both parts, and <strong>7 years</strong> from passing to complete the education &amp; experience requirements for certification.</div>
        <div class="tip"><div class="tip-lbl">MY ADVICE</div><div class="tip-txt">Register for your exam window BEFORE you finish studying. Having a real deadline changes your focus completely. Aim to sit Part 1 in your 5th month of study.</div></div>
      </div>

      <!-- COST BREAKDOWN -->
      <div class="info-section">
        <div class="info-title">💵 Certificate Cost Breakdown</div>
        <div class="card" style="margin-bottom:0;padding:14px 16px">
          <div style="font-size:11px;font-weight:600;color:#888;margin-bottom:12px;letter-spacing:.5px">ALL FIGURES IN USD</div>
          <div style="overflow-x:auto">
            <table style="width:100%;border-collapse:collapse;font-size:13px">
              <thead>
                <tr style="border-bottom:1px solid var(--border)">
                  <th style="text-align:left;padding:7px 4px;font-size:11px;color:#888;font-weight:600">Item</th>
                  <th style="text-align:right;padding:7px 6px;font-size:11px;color:var(--ok-strong-2);font-weight:600">Student</th>
                  <th style="text-align:right;padding:7px 6px;font-size:11px;color:var(--brand);font-weight:600">Professional</th>
                  <th style="text-align:right;padding:7px 6px;font-size:11px;color:var(--accent-purple);font-weight:600">Academic</th>
                </tr>
              </thead>
              <tbody>
                <tr style="border-bottom:.5px solid var(--bg)">
                  <td style="text-align:left;padding:8px 4px;color:#555">CMA Candidate Package <sup>*</sup></td>
                  <td style="text-align:right;padding:8px 6px;font-weight:500;color:var(--ok-strong-2)">274</td>
                  <td style="text-align:right;padding:8px 6px;font-weight:500">595</td>
                  <td style="text-align:right;padding:8px 6px;font-weight:500;color:var(--accent-purple)">385</td>
                </tr>
                <tr style="border-bottom:.5px solid var(--bg)">
                  <td style="text-align:left;padding:8px 4px;color:#555">Exam Fee — Part 1</td>
                  <td style="text-align:right;padding:8px 6px;font-weight:500;color:var(--ok-strong-2)">407</td>
                  <td style="text-align:right;padding:8px 6px;font-weight:500">545</td>
                  <td style="text-align:right;padding:8px 6px;font-weight:500;color:var(--accent-purple)">407</td>
                </tr>
                <tr style="border-bottom:.5px solid var(--bg)">
                  <td style="text-align:left;padding:8px 4px;color:#555">Exam Fee — Part 2</td>
                  <td style="text-align:right;padding:8px 6px;font-weight:500;color:var(--ok-strong-2)">407</td>
                  <td style="text-align:right;padding:8px 6px;font-weight:500">545</td>
                  <td style="text-align:right;padding:8px 6px;font-weight:500;color:var(--accent-purple)">407</td>
                </tr>
                <tr style="background:var(--brand-tint)">
                  <td style="text-align:left;padding:9px 4px;font-weight:600;color:var(--brand)">Total to Get Certified <sup>†</sup></td>
                  <td style="text-align:right;padding:9px 6px;font-weight:700;color:var(--ok-strong)">1,088</td>
                  <td style="text-align:right;padding:9px 6px;font-weight:700;color:var(--brand)">1,685</td>
                  <td style="text-align:right;padding:9px 6px;font-weight:700;color:#4A1F70">1,199</td>
                </tr>
                <tr>
                  <td style="text-align:left;padding:9px 4px 2px;color:#888;font-size:12px">IMA Membership renewal <span style="color:#aaa">(per year)</span></td>
                  <td style="text-align:right;padding:9px 6px 2px;color:#888;font-size:12px">150</td>
                  <td style="text-align:right;padding:9px 6px 2px;color:#888;font-size:12px">150</td>
                  <td style="text-align:right;padding:9px 6px 2px;color:#888;font-size:12px">150</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div style="font-size:11px;color:#999;margin-top:12px;line-height:1.55;border-top:.5px solid var(--bg);padding-top:10px">
            <span style="color:#666">*</span> Package includes the CMA Entrance Fee (3-year expiration) + one year of IMA Annual Membership.<br>
            <span style="color:#666">†</span> Total = Package + Part 1 + Part 2. The annual membership renewal is a recurring yearly cost after year one, shown separately above.
          </div>
        </div>
      </div>

      <!-- STUDY PLAN -->
      <div class="info-section">
        <div class="info-title">📖 CMA Part 1 — Study Plan</div>
        <div class="card" style="margin-bottom:10px">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
            <div style="text-align:center;background:var(--surface-3);border-radius:8px;padding:10px">
              <div style="font-size:20px;font-weight:500;color:var(--brand-2)">7</div>
              <div style="font-size:11px;color:#888">Months</div>
            </div>
            <div style="text-align:center;background:var(--surface-3);border-radius:8px;padding:10px">
              <div style="font-size:20px;font-weight:500;color:var(--brand-2)">10</div>
              <div style="font-size:11px;color:#888">Hrs/Week</div>
            </div>
            <div style="text-align:center;background:var(--surface-3);border-radius:8px;padding:10px">
              <div style="font-size:20px;font-weight:500;color:var(--brand-2)">280</div>
              <div style="font-size:11px;color:#888">Total Hrs</div>
            </div>
          </div>
          ${[["Month 1 & 2","Cost Management (15%)","Cost Classification, High-Low Method, Absorption vs. Variable Costing, Activity-Based Costing (ABC)"],
             ["Month 3","Planning, Budgeting & Forecasting (20%)","Master Budget, Variance Analysis, Flexible Budgets, Forecasting Techniques"],
             ["Month 4","Performance Management (20%)","CVP Analysis, Standard Costing, ROI, Residual Income, EVA, Balanced Scorecard"],
             ["Month 5 & 6","External Financial Reporting (15%)","Financial Statements, ASC 606 Revenue Recognition, Inventory Methods, Leases & Bonds"],
             ["Month 7","Internal Controls + Technology & Analytics (30%)","COSO Framework, Segregation of Duties, ERP Systems, Data Analytics, IT Controls"]].map(([month,topic,details],i)=>`
          <div style="display:flex;gap:12px;margin-bottom:12px;padding-bottom:12px;border-bottom:${i<4?'.5px solid var(--border)':'none'}">
            <div style="width:28px;height:28px;border-radius:50%;background:var(--brand-2);color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;flex-shrink:0;margin-top:1px">${i+1}</div>
            <div>
              <div style="font-size:13px;font-weight:500;color:var(--ink)">${month}: ${topic}</div>
              <div style="font-size:12px;color:#888;margin-top:3px;line-height:1.5">${details}</div>
            </div>
          </div>`).join('')}
        </div>
      </div>

      <!-- ACTION PLAN -->
      <div class="info-section">
        <div class="info-title">🚀 My Action Plan Recommendation</div>
        <div class="card" style="margin-bottom:0">
          ${[
            ["Register with IMA","Go to imanet.org, create an account, pay IMA membership fee, and register for the CMA program. This unlocks your 3-year exam window. Watch the step-by-step video guide: <a href=\'https://www.youtube.com/watch?v=oIjCp1jx3jY\' target=\'_blank\' style=\'color:var(--brand-2);font-weight:500\'>YouTube Guide →</a>"],
            ["Choose your study materials","Get a structured review course with a full MCQ bank. Do NOT study without a structured MCQ bank."],
            ["Follow the 7-month plan","Study 10 hours/week. Break it into daily 1.5 hour sessions. Consistency beats intensity every time — small daily progress compounds into exam success."],
            ["MCQs are your best friend","Do at least 20 MCQs per study session. Review every wrong answer. Understand WHY wrong answers are wrong."],
            ["Use this app daily","Read lessons here, take quizzes, track your progress, and use the Formula Bank for quick reference. Consistency beats intensity — study a little every day."],
            ["Schedule your exam by Month 5","Having a real exam date changes everything psychologically. Book it before you feel 100% ready — the deadline will push you."],
            ["CBQ practice in Month 5","Practice case-based questions (CBQs) under timed conditions in the Practice tab. CBQs are 25% of your score — don't ignore them."],
            ["Pass and celebrate! 🎉","You've got this. I've seen all types of candidates succeed with the right plan and commitment."]
          ].map(([title,desc],i)=>`
          <div class="action-step">
            <div class="action-num">${i+1}</div>
            <div class="action-content">
              <h4>${title}</h4>
              <p>${desc}</p>
            </div>
          </div>`).join('')}
        </div>
      </div>

      <!-- AFTER YOU PASS -->
      <div class="info-section">
        <div class="info-title">🏅 After You Pass: Getting Certified</div>
        <p class="info-p" style="margin-bottom:14px">Passing both exam parts is a huge milestone — but it isn't the certificate yet. To award the official CMA, IMA also needs to verify your education and experience. Here's the path from "passed" to "certified."</p>
        <div class="card" style="margin-bottom:0">
          ${[
            ["Keep your IMA membership active","You must remain an active IMA member to be certified and to keep the credential afterward."],
            ["Submit your education verification","Send proof of a bachelor's degree from an accredited university (or an IMA-approved professional certification). This must reach ICMA within 7 years of passing the exam."],
            ["Submit the experience verification form","Document two continuous years of professional experience in management accounting or financial management, using the work-experience form on the IMA website. This can be completed before or within 7 years of passing."],
            ["Get certified","Once IMA approves your application and verifies your education and experience, you're awarded the official CMA designation and receive your certificate and the right to use the CMA mark."],
            ["Maintain your CMA","Every year, complete 30 hours of Continuing Professional Education (CPE) — including at least 2 hours of ethics — keep your IMA membership active, and follow IMA's ethics standards."]
          ].map(([title,desc],i)=>`
          <div class="action-step">
            <div class="action-num">${i+1}</div>
            <div class="action-content">
              <h4>${title}</h4>
              <p>${desc}</p>
            </div>
          </div>`).join('')}
        </div>
        <div class="tip"><div class="tip-lbl">TIP</div><div class="tip-txt">You don't have to wait until after the exam — the education and experience requirements can be met before or after you pass, as long as they're verified within the 7-year window.</div></div>
      </div>

      <!-- INSTALL GUIDE -->
      <div class="info-section">
        <div class="info-title">📲 How to Install This App</div>
        <p class="info-p" style="margin-bottom:14px">Install the app for <strong>offline access</strong>, faster loading, and a native app experience — no browser bar, no distractions.</p>

        <!-- Android -->
        <div class="card" style="margin-bottom:10px;padding:0;overflow:hidden">
          <div style="background:#e8f5e9;padding:11px 14px;display:flex;align-items:center;gap:10px;border-bottom:.5px solid #c8e6c9">
            <span style="font-size:20px">🤖</span>
            <div>
              <div style="font-size:13px;font-weight:500;color:#1b5e20">Android — Chrome</div>
              <div style="font-size:11px;color:#388e3c;margin-top:1px">Any Android phone or tablet</div>
            </div>
          </div>
          <div style="padding:12px 14px;display:flex;flex-direction:column;gap:10px">
            ${[
              ['1','Look for the install banner','A blue banner appears at the top of the app saying "Install CMA Prep" — tap <strong>Install</strong>.'],
              ['2','Or tap the 3-dot menu ⋮','Open Chrome menu (top-right) → tap <strong>Add to Home screen</strong> or <strong>Install app</strong>.'],
              ['3','Confirm in the popup','Tap <strong>Install</strong> in the dialog that appears. The app icon will be added to your home screen. ✅']
            ].map(([n,title,desc])=>`
            <div style="display:flex;gap:10px;align-items:flex-start">
              <div style="width:24px;height:24px;border-radius:50%;background:#34a853;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">${n}</div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500;color:var(--ink)">${title}</div>
                <div style="font-size:12px;color:#666;margin-top:2px;line-height:1.55">${desc}</div>
              </div>
            </div>`).join('')}
          </div>
        </div>

        <!-- iOS -->
        <div class="card" style="margin-bottom:10px;padding:0;overflow:hidden">
          <div style="background:#e3f0ff;padding:11px 14px;display:flex;align-items:center;gap:10px;border-bottom:.5px solid #bbd7f7">
            <span style="font-size:20px">🍎</span>
            <div>
              <div style="font-size:13px;font-weight:500;color:#0d3c78">iPhone / iPad — Safari</div>
              <div style="font-size:11px;color:#1565c0;margin-top:1px">Must use Safari — Chrome on iOS doesn't support install</div>
            </div>
          </div>
          <div style="padding:12px 14px;display:flex;flex-direction:column;gap:10px">
            ${[
              ['1','Open the app in Safari','Copy the URL and open it in Safari — not Chrome or Firefox.'],
              ['2','Tap the Share button','Tap the <strong>Share icon</strong> (box with arrow) at the bottom of the Safari toolbar.'],
              ['3','Tap "Add to Home Screen"','Scroll down in the share sheet and tap <strong>Add to Home Screen</strong>.'],
              ['4','Tap "Add" to confirm','The app name is pre-filled — just tap <strong>Add</strong> in the top-right corner. ✅']
            ].map(([n,title,desc])=>`
            <div style="display:flex;gap:10px;align-items:flex-start">
              <div style="width:24px;height:24px;border-radius:50%;background:#007aff;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">${n}</div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500;color:var(--ink)">${title}</div>
                <div style="font-size:12px;color:#666;margin-top:2px;line-height:1.55">${desc}</div>
              </div>
            </div>`).join('')}
          </div>
          <div style="background:#fff8e1;padding:10px 14px;border-top:.5px solid #ffe082;display:flex;gap:8px;align-items:flex-start">
            <span style="font-size:14px;flex-shrink:0">⚠️</span>
            <div style="font-size:11px;color:#e65100;line-height:1.5">On iPhone, <strong>Chrome does not support PWA installation</strong>. You must open the link in <strong>Safari</strong> for the "Add to Home Screen" option to create a real app.</div>
          </div>
        </div>

        <!-- Desktop -->
        <div class="card" style="margin-bottom:0;padding:0;overflow:hidden">
          <div style="background:#f3e8ff;padding:11px 14px;display:flex;align-items:center;gap:10px;border-bottom:.5px solid #d8b4fe">
            <span style="font-size:20px">💻</span>
            <div>
              <div style="font-size:13px;font-weight:500;color:#3b0764">Laptop / Desktop — Chrome or Edge</div>
              <div style="font-size:11px;color:#7c3aed;margin-top:1px">Windows, Mac, Linux</div>
            </div>
          </div>
          <div style="padding:12px 14px;display:flex;flex-direction:column;gap:10px">
            ${[
              ['1','Look for the install icon in the address bar','A small monitor icon <strong>⊕</strong> or <strong>🖥</strong> appears on the right side of the address bar — click it.'],
              ['2','Click "Install" in the popup','A small dialog will appear — click <strong>Install</strong> to confirm. The app opens in its own window.'],
              ['3','Or install from the browser menu','Click <strong>⋮</strong> (Chrome) or <strong>···</strong> (Edge) → look for <strong>"Install CMA Part 1 Prep…"</strong> in the menu.']
            ].map(([n,title,desc])=>`
            <div style="display:flex;gap:10px;align-items:flex-start">
              <div style="width:24px;height:24px;border-radius:50%;background:#8b5cf6;color:#fff;font-size:11px;font-weight:700;display:flex;align-items:center;justify-content:center;flex-shrink:0;margin-top:1px">${n}</div>
              <div style="flex:1">
                <div style="font-size:13px;font-weight:500;color:var(--ink)">${title}</div>
                <div style="font-size:12px;color:#666;margin-top:2px;line-height:1.55">${desc}</div>
              </div>
            </div>`).join('')}
          </div>
          <div style="background:#f0fdf4;padding:10px 14px;border-top:.5px solid #bbf7d0;display:flex;gap:8px;align-items:flex-start">
            <span style="font-size:14px;flex-shrink:0">💡</span>
            <div style="font-size:11px;color:#14532d;line-height:1.5">After installing, the app opens in a standalone window — no browser toolbar, no tabs. Works offline and loads instantly.</div>
          </div>
        </div>
      </div>

      <!-- START BUTTON -->
      <button class="btn btn-primary" onclick="navTo('study')" style="margin-top:6px;background:var(--brand);font-size:15px">
        Start Studying Now →
      </button>
      <button onclick="logout()" style="width:100%;margin-top:10px;padding:12px;border-radius:10px;border:.5px solid var(--border);background:transparent;color:#aaa;font-size:13px;cursor:pointer;font-family:inherit">
        Logout
      </button>
      <div style="height:24px"></div>

    </div>
  </div>`;
}


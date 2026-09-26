// CMA Prep — main application script (extracted Batch 4.5)
// Previously inline in index.html. Behavior is IDENTICAL — this is a
// physical extraction, not a refactor. Every function stays in global
// scope, every call site is unchanged.
//
// Load order (guaranteed by <script defer> in index.html):
//   1. Firebase compat scripts (sync, in <head>)
//   2. cbq-data.js (defer, in <head>)
//   3. app.js (defer, end of body) ← this file
//
// Section boundary comment (search for CBQ) marks the former split
// between the main app section and the accessibility enhancer IIFE.
// ═══════════════════════════════════════════════════════════════════════


const PHOTO_B64 = './instructor.webp';

// ─── FIREBASE & CLOUDINARY ───────────────────────────────────────────────────
// ── FIX 2: Instructor identity uses UID (immutable), not email (can change).
// ACTION REQUIRED: Replace the value below with your real Firebase UID.
// Find it in Firebase Console → Authentication → Users → copy the User UID column.
const INSTRUCTOR_UID = 'NI1nS2qCYehDnlwFHA5A01bxV8V2';
// Batch 24 (B24-08): build label attached to remote error reports.
const APP_BUILD='b24';
const _errLog={sent:0,seen:{}}; // declared before window.onerror so boot errors can be queued
window.onerror=function(msg,src,line,col,err){
  try{ console.error('[App error]', msg, (src||'')+':'+line+':'+col, err); }catch(_){}
  // Batch 24 (B24-08): remote error log (rate-limited, deduped — see logClientError).
  try{ logClientError('error', msg, err&&err.stack, (src||'')+':'+line+':'+col); }catch(_){}

  // If the UI is already up, surface a gentle, dismissible notice and KEEP RUNNING —
  // a single non-fatal error should never blank the whole app.
  // Batch 24 (B24-03): was `typeof showToast==='function'`, which is ALWAYS true
  // (function declarations are hoisted), so a fatal boot error showed "the app is
  // still running" over a blank screen. render() sets __uiReady after first paint.
  if(window.__uiReady && typeof showToast==='function'){
    try{ showToast('Something went wrong, but the app is still running. Reload if anything looks off.','error',6000); }catch(_){}
    return true;
  }

  // Error during early boot, before the UI exists: app can't run, so show a friendly
  // recovery screen with a Reload action — no raw error text reflected into the DOM.
  try{
    document.body.innerHTML=
      '<div style="padding:40px 22px;font-family:system-ui,-apple-system,sans-serif;text-align:center;color:#444">'
      +'<div style="font-size:42px;margin-bottom:14px">⚠️</div>'
      +'<div style="font-size:17px;font-weight:600;margin-bottom:6px">Couldn\'t start the app</div>'
      +'<div style="font-size:14px;color:#888;margin-bottom:20px">Please check your connection and try again.</div>'
      +'<button onclick="location.reload()" style="padding:11px 24px;border:none;border-radius:10px;background:var(--brand);color:#fff;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">Reload</button>'
      +'</div>';
  }catch(_){}
  return true;
};

// Batch 24 (B24-08): unhandled promise rejections are logged too (same caps).
window.addEventListener('unhandledrejection',function(ev){
  try{ const r=ev&&ev.reason; logClientError('promise', (r&&r.message)||String(r), r&&r.stack, ''); }catch(_){}
});

firebase.initializeApp({
  apiKey:"AIzaSyCAF48hvYUxBdWY-xHFQZMUNKglV0gRhhE",
  authDomain:"cma-study-app.firebaseapp.com",
  projectId:"cma-study-app",
  storageBucket:"cma-study-app.firebasestorage.app",
  messagingSenderId:"722553543693",
  appId:"1:722553543693:web:75abdb4cbf49f888e2c944"
});
const auth=firebase.auth();
const db=firebase.firestore();
// ─── BATCH 24 (B24-08): REMOTE ERROR LOG ──────────────────────────────────────
// Writes to Firestore `client-errors` (instructor-only read, see rules). Caps:
// max 5 reports per page session, each distinct message once. If Firebase or
// the user isn't available yet (e.g. a boot failure), the report is queued in
// localStorage (max 10) and sent after the next successful sign-in.
function _errRecord(kind,msg,stack,src){
  let tab='';try{tab=String(STATE.tab||'');}catch(_){}
  return {
    kind:String(kind||'error').slice(0,20),
    msg:String(msg==null?'':msg).slice(0,500),
    stack:String(stack==null?'':stack).slice(0,3000),
    src:String(src==null?'':src).slice(0,300),
    tab:tab.slice(0,40),
    ua:String(navigator.userAgent||'').slice(0,300),
    build:APP_BUILD,
    at:new Date().toISOString()
  };
}
function _errCanSend(){
  try{return typeof firebase!=='undefined'&&firebase.apps&&firebase.apps.length&&!!firebase.auth().currentUser;}catch(_){return false;}
}
function _errSend(rec){
  const u=firebase.auth().currentUser;
  return firebase.firestore().collection('client-errors').add(Object.assign({},rec,{
    userId:u.uid,createdAt:firebase.firestore.FieldValue.serverTimestamp()
  }));
}
function logClientError(kind,msg,stack,src){
  try{
    const key=String(kind)+'|'+String(msg).slice(0,160);
    if(_errLog.seen[key]||_errLog.sent>=5)return;
    _errLog.seen[key]=1;_errLog.sent++;
    const rec=_errRecord(kind,msg,stack,src);
    if(_errCanSend()){_errSend(rec).catch(()=>{});return;}
    const q=JSON.parse(localStorage.getItem('cma-err-queue-v1')||'[]');
    q.push(rec);localStorage.setItem('cma-err-queue-v1',JSON.stringify(q.slice(-10)));
  }catch(_){}
}
function flushQueuedClientErrors(){
  try{
    if(!_errCanSend())return;
    const q=JSON.parse(localStorage.getItem('cma-err-queue-v1')||'[]');
    if(!q.length)return;
    localStorage.removeItem('cma-err-queue-v1');
    q.forEach(rec=>{_errSend(rec).catch(()=>{});});
  }catch(_){}
}

// ─── BATCH 24 (B24-12): LAZY BUNDLES ───────────────────────────────────────────
// dist/dashboard.min.js (instructor-only code) and dist/cbq-data.min.js (CBQ
// cases) are no longer downloaded and parsed at start-up by every student.
// RULE: core code must never call a dashboard function directly — go through
// renderDashboardLazy()/ensureDashboardBundle(). The CI build enforces this.
const _lazyScripts={};
function loadScriptOnce(src){
  if(!_lazyScripts[src]){
    _lazyScripts[src]=new Promise((resolve,reject)=>{
      const s=document.createElement('script');
      s.src=src;s.async=true;
      s.onload=()=>resolve();
      s.onerror=()=>{delete _lazyScripts[src];s.remove();reject(new Error('Failed to load '+src));};
      document.head.appendChild(s);
    });
  }
  return _lazyScripts[src];
}
function ensureDashboardBundle(){
  return typeof renderDashboard==='function'?Promise.resolve():loadScriptOnce('./dist/dashboard.min.js');
}
function ensureCBQData(){
  return typeof CBQ_DATA!=='undefined'?Promise.resolve():loadScriptOnce('./dist/cbq-data.min.js');
}
function renderDashboardLazy(){
  if(!isInstructor())return renderIntro();
  if(typeof renderDashboard==='function')return renderDashboard();
  if(STATE._dashBundleFailed){
    STATE._dashBundleFailed=false;
    return '<div class="scroll-area"><div style="text-align:center;padding:60px 20px"><div style="font-size:34px;margin-bottom:10px">\u26A0\uFE0F</div><div style="font-size:14px;color:#555;margin-bottom:14px">Couldn\u2019t load the dashboard. Check your connection.</div><button onclick="render()" style="padding:10px 22px;border:none;border-radius:10px;background:var(--brand);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Try again</button></div></div>';
  }
  ensureDashboardBundle()
    .then(()=>{if(STATE.tab==='dashboard')render();})
    .catch(()=>{STATE._dashBundleFailed=true;if(STATE.tab==='dashboard')render();});
  return '<div class="scroll-area"><div style="text-align:center;padding:60px 20px;color:#888;font-size:14px">Loading dashboard\u2026</div></div>';
}

const CLD_CLOUD='dvr6ygjhe';
const CLD_PRESET='cma_students';

// ─── BATCH 4: RETENTION CONFIG ───────────────────────────────────────────────
// Apps Script webhook that sends the weekly email digest. Deployed separately.
const EMAIL_DIGEST_URL='https://script.google.com/macros/s/AKfycbyNL4KbrnRPHOjmM9IKI4_-lXP6jrJmdbh9o1hypTB1ytklyt4LG3lwCblZlHj9itoT/exec';
// Batch 4.1: shared secret prevents anonymous flooding of the Apps Script quota.
// The Apps Script side must be updated to reject payloads where secret !== this value.
// (Inert until the Apps Script is updated — old requests still succeed.)
const DIGEST_SECRET='cma-digest-v1-8f3a2c9d1e';
// Rotating notification copy — never references new lessons (content-slow phase).
const NOTIFICATION_VARIANTS=[
  {id:'qod',   body:'\u2753 Question of the Day is ready \u2014 30s to keep your streak.', link:'intro'},
  {id:'wrong', body:'\u{1F4DD} You have wrong answers waiting for a quick review.',        link:'wrong-answers'},
  {id:'comm',  body:'\u{1F4AC} New questions in the community since yesterday.',            link:'community'},
  {id:'streak',body:'\u{1F525} Keep your streak alive with a 5-minute session.',           link:'intro'},
  {id:'mock',  body:'\u{1F4CA} Ready for today\u2019s mock exam warm-up?',                  link:'mock-exam'}
];


// ─── DATA ────────────────────────────────────────────────────────────────────

const S=[
  {id:1,title:"External Financial Reporting",weight:15,emoji:"📋",bar:"var(--brand-2)",bg:"var(--brand-tint)",text:"#1A5A9E",strong:"var(--brand)",
    lessons:[
      {id:"1-1",imaRef:"A.1",title:"IFRS vs US GAAP — Key Differences",dur:"25 min",blocks:[],quizzes:[]},
      {id:"1-2",imaRef:"A.1",title:"Users of Financial Information",dur:"20 min",blocks:[],quizzes:[]},
      {id:"1-3",imaRef:"A.1",title:"The Four Financial Statements & Their Interrelation",dur:"25 min",blocks:[],quizzes:[]},
      {id:"1-4",imaRef:"A.1",title:"Elements of Financial Statements",dur:"20 min",blocks:[],quizzes:[]},
      {id:"1-5",imaRef:"A.1",title:"Recognition, Measurement & Valuation of FS Items",dur:"25 min",blocks:[],quizzes:[]},
      {id:"1-6",imaRef:"A.1",title:"The Balance Sheet — Structure & Components",dur:"30 min",blocks:[],quizzes:[]},
      {id:"1-7",imaRef:"A.1",title:"Comprehensive Income & the Income Statement",dur:"30 min",blocks:[],quizzes:[]},
      {id:"1-8",imaRef:"A.1",title:"Statement of Comprehensive Income",dur:"20 min",blocks:[],quizzes:[]},
      {id:"1-9",imaRef:"A.1",title:"Statement of Owners' Equity & Notes to FS",dur:"25 min",blocks:[],quizzes:[]},
      {id:"1-10",imaRef:"A.1",title:"Statement of Cash Flows — Introduction",dur:"30 min",blocks:[],quizzes:[]},
      {id:"1-11",imaRef:"A.1",title:"Operating Activities — the Indirect Method",dur:"30 min",blocks:[],quizzes:[]},
      {id:"1-12",imaRef:"A.1",title:"Investing & Financing Activities, SCF Disclosures",dur:"25 min",blocks:[],quizzes:[]},
      {id:"1-13",imaRef:"A.1",title:"Integrated Reporting",dur:"25 min",blocks:[],quizzes:[]},
      {id:"1-14",imaRef:"A.2",title:"Accounts Receivable",dur:"35 min",blocks:[],quizzes:[]},
      {id:"1-15",imaRef:"A.2",title:"Inventory & Inventory Tracking Methods",dur:"35 min",blocks:[],quizzes:[]},
      {id:"1-16",imaRef:"A.2",title:"Inventory Count, Errors & Valuation",dur:"30 min",blocks:[],quizzes:[]},
      {id:"1-17",imaRef:"A.2",title:"Investments Overview & Debt Securities",dur:"35 min",blocks:[],quizzes:[]},
      {id:"1-18",imaRef:"A.2",title:"Equity Investments",dur:"35 min",blocks:[],quizzes:[]},
      {id:"1-19",imaRef:"A.2",title:"Business Combinations & Consolidations",dur:"35 min",blocks:[],quizzes:[]},
      {id:"1-20",imaRef:"A.2",title:"Recording Fixed Assets",dur:"25 min",blocks:[],quizzes:[]},
      {id:"1-21",imaRef:"A.2",title:"Depreciation of Fixed Assets & Impairment",dur:"35 min",blocks:[],quizzes:[]},
      {id:"1-22",imaRef:"A.2",title:"Intangible Assets",dur:"30 min",blocks:[],quizzes:[]},
      {id:"1-23",imaRef:"A.2",title:"Reclassification of Short-Term Liabilities",dur:"20 min",blocks:[],quizzes:[]},
      {id:"1-24",imaRef:"A.2",title:"Warranties",dur:"25 min",blocks:[],quizzes:[]},
      {id:"1-25",imaRef:"A.2",title:"Accounting for Income Taxes",dur:"40 min",blocks:[],quizzes:[]},
      {id:"1-26",imaRef:"A.2",title:"Leases",dur:"30 min",blocks:[],quizzes:[]},
      {id:"1-27",imaRef:"A.2",title:"Owners' Equity & Retained Earnings",dur:"30 min",blocks:[],quizzes:[]},
      {id:"1-28",imaRef:"A.2",title:"Common Stock",dur:"25 min",blocks:[],quizzes:[]},
      {id:"1-29",imaRef:"A.2",title:"Preferred Stock",dur:"25 min",blocks:[],quizzes:[]},
      {id:"1-30",imaRef:"A.2",title:"Treasury Stock & Classification of Shares",dur:"25 min",blocks:[],quizzes:[]},
      {id:"1-31",imaRef:"A.2",title:"Revenue Recognition (ASC 606)",dur:"35 min",blocks:[],quizzes:[]},
      {id:"1-32",imaRef:"A.2",title:"Bonds Payable & Long-Term Debt",dur:"30 min",blocks:[],quizzes:[]},
      {id:"1-33",imaRef:"A.2",title:"Earnings Per Share (EPS)",dur:"25 min",blocks:[],quizzes:[]}
    ]},
  {id:2,title:"Planning, Budgeting & Forecasting",weight:20,emoji:"📊",bar:"var(--ok)",bg:"var(--ok-tint)",text:"#4A7A1A",strong:"var(--ok-strong)",
    lessons:[
      {id:"2-1",imaRef:"B.1",title:"The Strategic Planning Foundation",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-2",imaRef:"B.1",title:"Scanning the Business Environment",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-3",imaRef:"B.1",title:"From Strategy to Execution",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-4",imaRef:"B.1",title:"Supplementary Strategic Tools",dur:"20 min",blocks:[],quizzes:[]},
      {id:"2-5",imaRef:"B.2",title:"Budgeting Fundamentals",dur:"30 min",blocks:[],quizzes:[]},
      {id:"2-6",imaRef:"B.2",title:"Building Standard Costs",dur:"30 min",blocks:[],quizzes:[]},
      {id:"2-7",imaRef:"B.3",title:"Quantitative Forecasting Methods",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-8",imaRef:"B.3",title:"The Learning Curve Effect",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-9",imaRef:"B.3",title:"Probability & Expected Value",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-10",imaRef:"B.4",title:"Comparing Budget Systems",dur:"30 min",blocks:[],quizzes:[]},
      {id:"2-11",imaRef:"B.4",title:"Building the Master Budget",dur:"30 min",blocks:[],quizzes:[]},
      {id:"2-12",imaRef:"B.4",title:"Financial & Cash Budgeting",dur:"30 min",blocks:[],quizzes:[]},
      {id:"2-14",imaRef:"B.5",title:"Budget Calculation Drills",dur:"30 min",blocks:[],quizzes:[]},
      {id:"2-15",imaRef:"B.6",title:"Executive-Level Financial Planning",dur:"25 min",blocks:[],quizzes:[]}
    ]},
  {id:3,title:"Performance Management",weight:20,emoji:"🎯",bar:"var(--accent-purple)",bg:"#F3E8FF",text:"#6A2E8F",strong:"#4A1F70",
    lessons:[
      {id:"3-1",imaRef:"C.1",title:"Variance Analysis Foundations",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-2",imaRef:"C.1",title:"Materials Cost Variances",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-3",imaRef:"C.1",title:"Labor Cost Variances",dur:"25 min",blocks:[],quizzes:[]},
      {id:"3-4",imaRef:"C.1",title:"Mix & Yield Variances",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-5",imaRef:"C.1",title:"Manufacturing Overhead Variances",dur:"35 min",blocks:[],quizzes:[]},
      {id:"3-6",imaRef:"C.1",title:"Revenue & Sales Variances",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-7",imaRef:"C.1",title:"Market Size & Share Variances",dur:"25 min",blocks:[],quizzes:[]},
      {id:"3-8",imaRef:"C.2",title:"Responsibility Centers",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-9",imaRef:"C.2",title:"Contribution Income Statement for Evaluation",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-10",imaRef:"C.2",title:"Transfer Pricing",dur:"35 min",blocks:[],quizzes:[]},
      {id:"3-11",imaRef:"C.3",title:"Performance Measures, ROI, and RI",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-12",imaRef:"C.3",title:"Multiple Performance Measures",dur:"35 min",blocks:[],quizzes:[]}
    ]},
  {id:4,title:"Cost Management",weight:15,emoji:"💰",bar:"var(--warn)",bg:"var(--warn-tint)",text:"#BA7517",strong:"var(--warn-strong)",
    lessons:[
      {id:"4-1",imaRef:"D.1",title:"Understanding Cost Behavior & Classification",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-2",imaRef:"D.1",title:"Comparing Costing Approaches: Standard, Normal & Actual",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-3",imaRef:"D.2",title:"Tracking Manufacturing Cost Flow",dur:"25 min",blocks:[],quizzes:[]},
      {id:"4-4",imaRef:"D.1",title:"Allocating Joint Production Costs",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-5",imaRef:"D.1",title:"Accounting for Byproducts",dur:"25 min",blocks:[],quizzes:[]},
      {id:"4-6",imaRef:"D.2",title:"Process Costing Essentials",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-8",imaRef:"D.2",title:"Job Costing & Product Life-Cycle Economics",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-9",imaRef:"D.3",title:"Manufacturing Overhead: Pools, Rates & Allocation",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-10",imaRef:"D.3",title:"Recording & Closing Overhead Accounts",dur:"25 min",blocks:[],quizzes:[]},
      {id:"4-11",imaRef:"D.3",title:"Activity-Based Costing in Practice",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-12",imaRef:"D.2",title:"Variable vs. Absorption Costing: Income Effects",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-13",imaRef:"D.3",title:"Allocating Shared Service Department Costs",dur:"35 min",blocks:[],quizzes:[]},
      {id:"4-15",imaRef:"D.1",title:"Cost Estimation Techniques",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-16",imaRef:"D.4",title:"Operations, Supply Chain & Quality Management",dur:"90 min",blocks:[],quizzes:[]}
    ]},
  {id:5,title:"Internal Controls",weight:15,emoji:"🔒",bar:"var(--err)",bg:"var(--err-tint)",text:"var(--err-2)",strong:"var(--err-strong)",
    lessons:[
      {id:"5-1",imaRef:"E.1",title:"COSO Framework & Internal Control Fundamentals",dur:"25 min",blocks:[],quizzes:[]},
      {id:"5-2",imaRef:"E.1",title:"Risk Assessment & Enterprise Risk Management",dur:"25 min",blocks:[],quizzes:[]},
      {id:"5-3",imaRef:"E.1",title:"Control Activities & Preventive Controls",dur:"25 min",blocks:[],quizzes:[]},
      {id:"5-4",imaRef:"E.3",title:"Information Systems Controls & IT Governance",dur:"30 min",blocks:[],quizzes:[]},
      {id:"5-5",imaRef:"E.1",title:"Sarbanes-Oxley (SOX) & Regulatory Compliance",dur:"25 min",blocks:[],quizzes:[]},
      {id:"5-6",imaRef:"E.2",title:"Internal Audit Function",dur:"25 min",blocks:[],quizzes:[]},
      {id:"5-7",imaRef:"E.2",title:"Fraud Prevention & Detection",dur:"30 min",blocks:[],quizzes:[]},
      {id:"5-8",imaRef:"E.1",title:"Corporate Governance",dur:"25 min",blocks:[],quizzes:[]},
      {id:"5-9",imaRef:"E.1",title:"Compliance & Ethics Programs",dur:"25 min",blocks:[],quizzes:[]},
      {id:"5-10",imaRef:"E.1",title:"Monitoring, Auditing & Evaluating Controls",dur:"25 min",blocks:[],quizzes:[]},
      {id:"5-11",imaRef:"E.3",title:"Business Continuity Planning & Disaster Recovery",dur:"25 min",blocks:[],quizzes:[]}
    ]},
  {id:6,title:"Technology & Analytics",weight:15,emoji:"💻",bar:"#0A8A8A",bg:"#E0F7F7",text:"#0A6E6E",strong:"#075252",
    lessons:[
      {id:"6-0",imaRef:"F.1",title:"AIS Transaction Cycles",dur:"30 min",blocks:[],quizzes:[]},
      {id:"6-1",imaRef:"F.1",title:"Data Analytics & Business Intelligence Fundamentals",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-2",imaRef:"F.2",title:"Data Governance & Data Quality",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-3",imaRef:"F.1",title:"Enterprise Resource Planning (ERP) Systems",dur:"30 min",blocks:[],quizzes:[]},
      {id:"6-4",imaRef:"F.3",title:"Business Intelligence & Reporting Tools",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-5",imaRef:"F.3",title:"Data Analytics Tools & Techniques",dur:"30 min",blocks:[],quizzes:[]},
      {id:"6-6",imaRef:"F.4",title:"Cybersecurity Fundamentals",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-7",imaRef:"F.4",title:"Cloud Computing",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-8",imaRef:"F.4",title:"Blockchain & Distributed Ledger Technology",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-9",imaRef:"F.3",title:"Artificial Intelligence & Machine Learning in Finance",dur:"30 min",blocks:[],quizzes:[]},
      {id:"6-10",imaRef:"F.4",title:"Robotic Process Automation (RPA)",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-11",imaRef:"F.1",title:"IT Infrastructure & Disaster Recovery",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-12",imaRef:"F.1",title:"System Development Life Cycle (SDLC)",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-13",imaRef:"F.4",title:"Digital Finance Transformation",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-14",imaRef:"F.4",title:"Cybersecurity Risk Management",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-15",imaRef:"F.2",title:"Data Privacy & Regulatory Compliance",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-16",imaRef:"F.4",title:"Emerging Technologies in Finance",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-17",imaRef:"F.4",title:"IT Audit & Assurance",dur:"25 min",blocks:[],quizzes:[]},
      {id:"6-18",imaRef:"F.4",title:"Technology Strategy & IT Governance",dur:"25 min",blocks:[],quizzes:[]}
    ]}
];
const TOTAL_LESSONS=S.reduce((acc,s)=>acc+s.lessons.length,0);



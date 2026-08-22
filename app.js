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
window.onerror=function(msg,src,line,col,err){
  // Full detail goes to the console (and is where remote logging would hook in later).
  try{ console.error('[App error]', msg, (src||'')+':'+line+':'+col, err); }catch(_){}

  // If the UI is already up, surface a gentle, dismissible notice and KEEP RUNNING —
  // a single non-fatal error should never blank the whole app.
  if(typeof showToast==='function'){
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
      {id:"2-1",imaRef:"B.1",title:"Strategic Planning: Overview, Mission & Goals",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-2",imaRef:"B.1",title:"Analyzing External & Internal Environments",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-3",imaRef:"B.1",title:"Formulating & Implementing Strategies",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-4",imaRef:"B.1",title:"Other Planning Tools",dur:"20 min",blocks:[],quizzes:[]},
      {id:"2-5",imaRef:"B.2",title:"Budgeting Concepts",dur:"30 min",blocks:[],quizzes:[]},
      {id:"2-6",imaRef:"B.2",title:"Establishing Standards",dur:"30 min",blocks:[],quizzes:[]},
      {id:"2-7",imaRef:"B.3",title:"Forecasting Techniques & Regression Analysis",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-8",imaRef:"B.3",title:"Learning Curves",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-9",imaRef:"B.3",title:"Probability",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-10",imaRef:"B.4",title:"Budget Methodologies",dur:"30 min",blocks:[],quizzes:[]},
      {id:"2-11",imaRef:"B.4",title:"Annual Profit Plan & Supporting Schedules",dur:"30 min",blocks:[],quizzes:[]},
      {id:"2-12",imaRef:"B.4",title:"Preparing the Budget",dur:"30 min",blocks:[],quizzes:[]},
      {id:"2-13",imaRef:"B.5",title:"Ongoing Budgetary Reporting",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-14",imaRef:"B.5",title:"Answering Budgeting Calculation Questions",dur:"30 min",blocks:[],quizzes:[]},
      {id:"2-15",imaRef:"B.6",title:"Top-Level Planning and Analysis",dur:"25 min",blocks:[],quizzes:[]},
      {id:"2-16",imaRef:"B.6",title:"Capital Budgeting Techniques",dur:"35 min",blocks:[],quizzes:[]}
    ]},
  {id:3,title:"Performance Management",weight:20,emoji:"🎯",bar:"var(--accent-purple)",bg:"#F3E8FF",text:"#6A2E8F",strong:"#4A1F70",
    lessons:[
      {id:"3-1",imaRef:"C.1",title:"Introduction to Cost and Variance Measures",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-2",imaRef:"C.1",title:"Direct Material Variances",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-3",imaRef:"C.1",title:"Direct Labor Variances",dur:"25 min",blocks:[],quizzes:[]},
      {id:"3-4",imaRef:"C.1",title:"Multiple Input or Multiple Class Variances",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-5",imaRef:"C.1",title:"Overhead Variances",dur:"35 min",blocks:[],quizzes:[]},
      {id:"3-6",imaRef:"C.1",title:"Sales Variances",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-7",imaRef:"C.1",title:"Market Variances",dur:"25 min",blocks:[],quizzes:[]},
      {id:"3-8",imaRef:"C.2",title:"Responsibility Centers",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-9",imaRef:"C.2",title:"Contribution Income Statement for Evaluation",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-10",imaRef:"C.2",title:"Transfer Pricing",dur:"35 min",blocks:[],quizzes:[]},
      {id:"3-11",imaRef:"C.3",title:"Performance Measures, ROI, and RI",dur:"30 min",blocks:[],quizzes:[]},
      {id:"3-12",imaRef:"C.3",title:"Multiple Performance Measures",dur:"35 min",blocks:[],quizzes:[]},
      {id:"3-13",imaRef:"C.3",title:"Financial Statement Analysis",dur:"35 min",blocks:[],quizzes:[]}
    ]},
  {id:4,title:"Cost Management",weight:15,emoji:"💰",bar:"var(--warn)",bg:"var(--warn-tint)",text:"#BA7517",strong:"var(--warn-strong)",
    lessons:[
      {id:"4-1",imaRef:"D.1",title:"Measurement Concepts & Classification of Costs",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-2",imaRef:"D.1",title:"Costing Methods: Standard, Normal & Actual Costing",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-3",imaRef:"D.2",title:"Cost of Goods Sold and Manufactured (COGM)",dur:"25 min",blocks:[],quizzes:[]},
      {id:"4-4",imaRef:"D.2",title:"Joint Product Costing",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-5",imaRef:"D.2",title:"Byproduct Costing",dur:"25 min",blocks:[],quizzes:[]},
      {id:"4-6",imaRef:"D.2",title:"Costing Systems: Process Costing",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-8",imaRef:"D.2",title:"Job-Order and Life-Cycle Costing",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-9",imaRef:"D.3",title:"Overhead Costs and Allocation",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-10",imaRef:"D.3",title:"Accounting for Overhead",dur:"25 min",blocks:[],quizzes:[]},
      {id:"4-11",imaRef:"D.3",title:"Activity-Based Costing (ABC)",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-12",imaRef:"D.2",title:"Variable and Absorption Costing",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-13",imaRef:"D.3",title:"Shared Service Cost Allocation",dur:"35 min",blocks:[],quizzes:[]},
      {id:"4-14",imaRef:"D.3",title:"Standard Cost Variances: DM, DL & Overhead",dur:"35 min",blocks:[],quizzes:[],outOfScope:"section3"},
      {id:"4-15",imaRef:"D.4",title:"Estimating Fixed and Variable Costs",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-16",imaRef:"D.4",title:"Supply Chain & Lean Resource Management",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-17",imaRef:"D.4",title:"Just-In-Time Systems and MRP, MRPII, ERP",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-18",imaRef:"D.4",title:"Capacity Level and Management Decisions",dur:"30 min",blocks:[],quizzes:[]},
      {id:"4-19",imaRef:"D.5",title:"Business Process Improvement & the Value Chain",dur:"25 min",blocks:[],quizzes:[]},
      {id:"4-20",imaRef:"D.5",title:"Process Analysis",dur:"25 min",blocks:[],quizzes:[]},
      {id:"4-21",imaRef:"D.5",title:"Quality Management and Costs of Quality",dur:"25 min",blocks:[],quizzes:[]}
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


// ─── STATE ────────────────────────────────────────────────────────────────────
function loadProg(){try{const d=localStorage.getItem('cma-html-v2');return d?JSON.parse(d):{done:[],lessonScores:{},mcqTotal:0,mcqRight:0};}catch{return{done:[],lessonScores:{},mcqTotal:0,mcqRight:0};}}

// Item 1: _doneSet caches STATE.progress.done as a Set for O(1) lookups.
// lessonDone() is called hundreds of times per render across 113 lessons.
// Array.includes() = O(n) per call → Set.has() = O(1) per call.
// Invalidated in saveProg() and whenever Firestore overwrites STATE.progress.
let _doneSet = null;
function _invalidateDoneSet(){ _doneSet = null; }
function _getDoneSet(){ if(!_doneSet) _doneSet = new Set(STATE.progress.done); return _doneSet; }

// ── Progress saving: local is instant, cloud is debounced ──────────
// Local storage is written on every call (free, offline-safe). The cloud
// write is batched to at most once per window, then forced on app close.
// Worst case (missed cloud write) is recovered by mergeProgress() at login.
let _progCloudTimer = null;
let _progCloudDirty = false;

function _flushProgToCloud(){
  if(!_progCloudDirty || !STATE.user || !db) return;
  _progCloudDirty = false;
  if(_progCloudTimer){ clearTimeout(_progCloudTimer); _progCloudTimer = null; }
  db.collection('progress').doc(STATE.user.uid).set(STATE.progress)
    .catch(e=>{ _progCloudDirty = true; console.warn('progress sync failed', e); });
}

function _scheduleProgCloudSync(){
  _progCloudDirty = true;
  if(_progCloudTimer) return;            // a flush is already on its way
  _progCloudTimer = setTimeout(()=>{ _progCloudTimer = null; _flushProgToCloud(); }, 4000);
}

function saveProg(p){
  STATE.progress = p;
  _invalidateDoneSet();
  try{ localStorage.setItem('cma-html-v2', JSON.stringify(p)); }catch{}
  if(STATE.user) _scheduleProgCloudSync();
  render();
}

// Force any pending progress to the cloud the moment the app is closed,
// backgrounded, or the tab is hidden — so nothing waits in the queue.
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') _flushProgToCloud(); else { try{pollLiveLecture();}catch(e){} } });
window.addEventListener('pagehide', _flushProgToCloud);

// FIX 4: Non-destructive merge of two progress objects (used at login to converge
// cloud + local instead of letting either side blindly overwrite the other).
function mergeProgress(a,b){
  a=a||{}; b=b||{};
  const done=Array.from(new Set([...(a.done||[]),...(b.done||[])]));
  const ls={...(a.lessonScores||{})};
  const bls=b.lessonScores||{};
  for(const k in bls){
    const cur=ls[k], inc=bls[k];
    if(!cur){ ls[k]=inc; continue; }
    const accCur=cur.total?cur.correct/cur.total:0;
    const accInc=inc.total?inc.correct/inc.total:0;
    // keep the better attempt: higher accuracy, tie-break on more questions answered
    ls[k]=(accInc>accCur||(accInc===accCur&&(inc.total||0)>(cur.total||0)))?inc:cur;
  }
  return {
    done,
    lessonScores:ls,
    mcqTotal:Math.max(a.mcqTotal||0,b.mcqTotal||0),
    mcqRight:Math.max(a.mcqRight||0,b.mcqRight||0)
  };
}


function loadLessonNote(lid){try{return localStorage.getItem('cma-note-'+lid)||'';}catch{return '';}}
let _noteDebounce={};
function saveLessonNote(lid,val){
  try{localStorage.setItem('cma-note-'+lid,val);}catch{}
  clearTimeout(_noteDebounce[lid]);
  _noteDebounce[lid]=setTimeout(()=>{
    if(STATE.user&&db){
      db.collection('notes').doc(STATE.user.uid).collection('lessons').doc(lid)
        .set({text:val,updatedAt:firebase.firestore.FieldValue.serverTimestamp()})
        .catch(()=>{});
    }
  },1500);
}
async function syncNoteFromCloud(lid){
  if(!STATE.user||!db)return;
  try{
    const doc=await db.collection('notes').doc(STATE.user.uid).collection('lessons').doc(lid).get();
    if(doc.exists){
      const cloud=doc.data().text||'';
      try{localStorage.setItem('cma-note-'+lid,cloud);}catch{}
      const el=document.getElementById('lesson-notes-'+lid);
      if(el&&el.value!==cloud)el.value=cloud;
    }
  }catch{}
}


function loadStreak(){
  try{
    const d=localStorage.getItem('cma-streak-v1');
    const s=d?JSON.parse(d):{count:0,lastDate:''};
    // Batch 4 migration: backfill new fields on legacy {count,lastDate} docs.
    if(s.freezeTokens===undefined)s.freezeTokens=0;
    if(s.lastFreezeEarned===undefined)s.lastFreezeEarned='';
    if(s.graceLastUsed===undefined)s.graceLastUsed='';
    return s;
  }catch{return{count:0,lastDate:'',freezeTokens:0,lastFreezeEarned:'',graceLastUsed:''};}
}
function saveStreak(s){try{localStorage.setItem('cma-streak-v1',JSON.stringify(s));}catch{}}

// Batch 4 — helper: days between two toDateString() values (integer, >=0).
function _daysBetween(aStr,bStr){
  if(!aStr||!bStr)return Infinity;
  const a=new Date(aStr),b=new Date(bStr);
  if(isNaN(a)||isNaN(b))return Infinity;
  return Math.round((b-a)/86400000);
}

// Batch 4 — award a Freeze token every 14 consecutive active days (max 2).
function _maybeEarnFreeze(s,today){
  if(s.freezeTokens>=2)return s;
  if(!s.lastFreezeEarned){ // first-ever: seed the clock, don't grant yet
    if(s.count>0)s.lastFreezeEarned=today;
    return s;
  }
  if(_daysBetween(s.lastFreezeEarned,today)>=14 && s.count>=14){
    s.freezeTokens=Math.min(2,s.freezeTokens+1);
    s.lastFreezeEarned=today;
  }
  return s;
}

// Batch 4 — core streak update with Freeze + Grace recovery.
// Returns one of: 'same' | 'incremented' | 'froze' | 'grace-needed' | 'reset'.
// The caller (app boot) inspects the return to fire a toast or the Grace modal.
function updateStreak(){
  const today=new Date().toDateString();
  const yesterday=new Date(Date.now()-86400000).toDateString();
  const twoDaysAgo=new Date(Date.now()-2*86400000).toDateString();
  let s=loadStreak();

  if(s.lastDate===today){ // already counted today
    s=_maybeEarnFreeze(s,today);saveStreak(s);return'same';
  }
  if(s.lastDate===yesterday){ // normal continuation
    s.count=s.count+1;s.lastDate=today;s=_maybeEarnFreeze(s,today);saveStreak(s);return'incremented';
  }
  if(s.lastDate===twoDaysAgo && s.freezeTokens>0){ // one missed day → auto-Freeze
    s.freezeTokens=s.freezeTokens-1;s.count=s.count+1;s.lastDate=today;
    s=_maybeEarnFreeze(s,today);saveStreak(s);return'froze';
  }
  if(s.lastDate===twoDaysAgo && s.count>0){ // one missed day, no Freeze → maybe Grace
    const graceCd=_daysBetween(s.graceLastUsed,today);
    if(graceCd>=14){ // Grace available — defer the decision to the modal
      return'grace-needed';
    }
  }
  // 2+ days missed, or Grace on cooldown → silent reset (no shame modal).
  // Seed the Freeze clock here so a fresh streak starts earning from day 1.
  s.count=1;s.lastDate=today;s.lastFreezeEarned=today;saveStreak(s);return'reset';
}

// Batch 4 — called when the student accepts the Grace mini-review.
// Preserves the streak and stamps the cooldown.
function grantStreakGrace(){
  const today=new Date().toDateString();
  const s=loadStreak();
  s.count=s.count+1;s.lastDate=today;s.graceLastUsed=today;
  saveStreak(s);
}
// Batch 4 — called when the student declines Grace → clean reset.
function declineStreakGrace(){
  const today=new Date().toDateString();
  const s=loadStreak();
  s.count=1;s.lastDate=today;saveStreak(s);
}

// Batch 4 — Grace modal + 5-question mini-review pulled from wrong-answer pool
// (falls back to random taught MCQs). Shown once on boot when updateStreak
// returns 'grace-needed'. Uses the existing quizMode engine to run the set.
async function showGraceModal(){
  const s=loadStreak();
  const ok=await showModal({
    icon:'\u{1F525}',
    title:'You missed a day',
    body:'No big deal \u2014 keep your '+s.count+'-day streak with a quick 5-minute review?',
    type:'warning',
    confirmText:'Yes, quick review',
    cancelText:'Reset streak',
    dismissable:false
  });
  if(!ok){declineStreakGrace();render();return;}
  // Build a 5-question set: prefer wrong answers, fall back to taught MCQs.
  try{
    const set=await buildGraceMiniSet();
    if(!set.length){ // nothing to serve → grant grace anyway, don't punish
      grantStreakGrace();showToast('Streak saved \u2014 keep it going!','success',3000);render();return;
    }
    STATE._graceActive=true;
    STATE.quizMode={active:true,sectionId:null,idx:0,questions:set,answers:[],selected:null,done:false,isGrace:true,questionTimes:[],quizStartTime:Date.now(),qTimerStart:Date.now(),qTimerElapsed:null};
    STATE.tab='quiz-mode';render();
  }catch(e){
    console.warn('Grace set failed:',e);
    grantStreakGrace();showToast('Streak saved!','success',2500);render();
  }
}

// Batch 4 — assemble up to 5 questions for the Grace review.
async function buildGraceMiniSet(){
  const out=[];
  // 1) Wrong answers first (highest learning value).
  try{
    const wrong=(typeof buildWrongAnswers==='function')?buildWrongAnswers():[];
    wrong.slice(0,5).forEach(w=>{if(w&&w.q)out.push(shuffleQuestionOptions({...w.q,secId:w.secId,secTitle:w.secTitle,lessonTitle:w.lessonTitle}));});
  }catch(e){}
  if(out.length>=5)return out.slice(0,5);
  // 2) Fall back to random taught MCQs.
  try{
    const st=loadStudent();
    if(st&&st.groupCode){
      const snap=await db.collection('teaching-log').where('groupCode','==',st.groupCode.toUpperCase()).get();
      const taught=new Set();snap.docs.forEach(d=>(d.data().unitIds||[]).forEach(u=>taught.add(u)));
      const secIds=[...new Set([...taught].map(u=>parseInt(u.split('-')[0])).filter(n=>n>0))];
      await Promise.all(secIds.map(i=>ensureQuizzes(i)));
      const pool=[];
      S.forEach(sec=>sec.lessons.forEach(l=>{if(taught.has(l.id)&&l.quizzes)l.quizzes.forEach(q=>pool.push({...q,secId:sec.id,secTitle:sec.title,lessonTitle:l.title}));}));
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      pool.slice(0,5-out.length).forEach(q=>out.push(shuffleQuestionOptions(q)));
    }
  }catch(e){}
  return out.slice(0,5);
}

// ── Mock Exam History ────────────────────────────────────────────────────────
// Keeps last 5 mock exam results so students can track score improvement.
function loadMockResults(){try{const d=localStorage.getItem('cma-mock-v1');return d?JSON.parse(d):[];}catch{return[];}}
function saveMockResult(result){
  try{
    const history=loadMockResults();
    history.unshift(result); // newest first
    localStorage.setItem('cma-mock-v1',JSON.stringify(history.slice(0,5)));
  }catch{}
}

// ── Study Time Tracking ──────────────────────────────────────────────────────
// Records how long students spend reading lessons and taking quizzes.
// Persists to localStorage. Displayed on the Progress screen.
let _studyTimerStart=null;
let _studyTimerScreen=null; // which screen is being timed

function loadStudyTime(){
  try{const d=localStorage.getItem('cma-studytime-v1');return d?JSON.parse(d):{totalMinutes:0,todayDate:'',todayMinutes:0};}
  catch{return{totalMinutes:0,todayDate:'',todayMinutes:0};}
}
function saveStudyTime(d){
  try{localStorage.setItem('cma-studytime-v1',JSON.stringify(d));}catch{}
}
function startStudyTimer(screen){
  // Only start if not already timing the same screen
  if(_studyTimerScreen===screen)return;
  endStudyTimer(); // flush any existing session first
  _studyTimerStart=Date.now();
  _studyTimerScreen=screen;
}
function endStudyTimer(){
  if(!_studyTimerStart)return;
  const elapsed=Math.round((Date.now()-_studyTimerStart)/60000); // minutes
  _studyTimerStart=null;
  _studyTimerScreen=null;
  if(elapsed<1)return; // ignore sessions under 1 minute
  try{recordStudyMinutes(elapsed);}catch(e){} // Batch 4: feed trend history
  const st=loadStudyTime();
  const today=new Date().toDateString();
  const todayMin=st.todayDate===today?st.todayMinutes:0;
  saveStudyTime({
    totalMinutes:(st.totalMinutes||0)+elapsed,
    todayDate:today,
    todayMinutes:todayMin+elapsed
  });
  // Batch 4: push a rolling engagement summary to Firestore (debounced).
  try{syncStudentAnalytics();}catch(e){}
}
function fmtStudyTime(mins){
  if(!mins||mins<1)return'0 min';
  if(mins<60)return`${mins} min`;
  const h=Math.floor(mins/60),m=mins%60;
  return m>0?`${h}h ${m}m`:`${h}h`;
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 4 — DAILY STUDY-MINUTES HISTORY (feeds analytics trend)
// ═══════════════════════════════════════════════════════════════════════════
// Keeps a rolling per-day minutes map so we can compute last-7 vs prev-7 trend.
// { "Mon Jul 06 2026": 24, ... } — pruned to last 30 days on write.
function loadStudyHistory(){try{const d=localStorage.getItem('cma-studyhist-v1');return d?JSON.parse(d):{};}catch{return{};}}
function saveStudyHistory(h){try{localStorage.setItem('cma-studyhist-v1',JSON.stringify(h));}catch{}}
function recordStudyMinutes(mins){
  if(!mins||mins<1)return;
  const h=loadStudyHistory();
  const today=new Date().toDateString();
  h[today]=(h[today]||0)+mins;
  // prune >30 days
  const cutoff=Date.now()-31*86400000;
  Object.keys(h).forEach(k=>{const t=new Date(k).getTime();if(isNaN(t)||t<cutoff)delete h[k];});
  saveStudyHistory(h);
}
function sumMinutesWindow(daysAgoStart,daysAgoEnd){
  // inclusive window [daysAgoEnd .. daysAgoStart] in days-ago terms
  const h=loadStudyHistory();let sum=0;
  for(let d=daysAgoEnd;d<=daysAgoStart;d++){
    const key=new Date(Date.now()-d*86400000).toDateString();
    sum+=(h[key]||0);
  }
  return sum;
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 4 — PILLAR 4: student-analytics sync (debounced, one write / 15 min)
// ═══════════════════════════════════════════════════════════════════════════
let _lastAnalyticsSync=0;
function syncStudentAnalytics(force){
  if(!STATE.user||!db)return;
  const now=Date.now();
  if(!force && now-_lastAnalyticsSync < 15*60*1000)return; // 15-min debounce
  const st=loadStudent();if(!st)return;
  const streak=loadStreak();
  const last7=sumMinutesWindow(6,0);
  const prev7=sumMinutesWindow(13,7);
  const lastActive=streak.lastDate||new Date().toDateString();
  const daysSince=_daysBetween(lastActive,new Date().toDateString());
  const p=STATE.progress||{};
  const doc={
    userId:STATE.user.uid,
    groupCode:(st.groupCode||'').toUpperCase(),
    displayName:st.name||'',
    phoneNumber:st.mobile||'',
    language:st.language||'ar',
    lastActiveDate:lastActive,
    daysSinceActive:isFinite(daysSince)?daysSince:999,
    streakCount:streak.count||0,
    streakWas:Math.max(streak.count||0,(STATE._streakWas||0)),
    last7DaysMinutes:last7,
    previous7DaysMinutes:prev7,
    mcqsLast7Days:0, // reserved — needs per-day mcq history (future)
    updatedAt:new Date().toISOString()
  };
  _lastAnalyticsSync=now;
  db.collection('student-analytics').doc(STATE.user.uid).set(doc,{merge:true}).catch(()=>{});
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 4 — PILLAR 3: weekly email digest (client-scheduled, Apps Script send)
// ═══════════════════════════════════════════════════════════════════════════
function _isoWeekStart(){ // Sunday of the current week, yyyy-mm-dd
  const d=new Date();const day=d.getDay();const sunday=new Date(d.getTime()-day*86400000);
  return sunday.getFullYear()+'-'+String(sunday.getMonth()+1).padStart(2,'0')+'-'+String(sunday.getDate()).padStart(2,'0');
}
async function maybeSendDigest(){
  if(!STATE.user||!db)return;
  const st=loadStudent();
  if(!st||!st.email)return;
  const prefs=st.notifPrefs||{};
  if(!prefs.emailDigestOptedIn)return;
  const weekStart=_isoWeekStart();
  if(prefs.lastDigestSent===weekStart)return; // already sent this week
  const payload=buildDigestPayload(st);
  const ok=await postDigest(payload);
  if(ok){
    const next={...(st.notifPrefs||{}),lastDigestSent:weekStart};
    saveStudent({...st,notifPrefs:next});
  }
}
function buildDigestPayload(st){
  const streak=loadStreak();
  const last7=sumMinutesWindow(6,0);
  const daysSince=_daysBetween(streak.lastDate||'',new Date().toDateString());
  const p=STATE.progress||{};
  const acc=(p.mcqTotal>0)?Math.round((p.mcqRight/p.mcqTotal)*100):0;
  // Weakest section by per-section accuracy in lessonScores (best-effort).
  let weakest='';
  try{
    // Batch 4.1: capture the KEY of the lowest score, not just the value.
    const scores=p.lessonScores||{};let worst=101;
    Object.keys(scores).forEach(k=>{const v=scores[k];if(typeof v==='number'&&v<worst){worst=v;weakest=k;}});
  }catch(e){}
  const variant = (daysSince>=7 || last7===0) ? 'missed_you'
                : (last7<60 ? 'returning' : 'engaged');
  // Batch 4.1: honest payload — dropped hardcoded 0s (mcqsThisWeek, accuracyDelta),
  // renamed accuracyThisWeek → accuracyOverall (it IS lifetime, not weekly),
  // added minutesLast7Days (real data), and secret for endpoint auth.
  return{
    secret:DIGEST_SECRET,
    email:st.email,name:st.name||'',language:st.language||'ar',variant,
    streakCount:streak.count||0,
    accuracyOverall:acc,
    minutesLast7Days:last7,
    weakestSection:weakest, recommendedTopics:[],
    silentDays:isFinite(daysSince)?daysSince:0
  };
}
async function postDigest(payload){
  try{
    await fetch(EMAIL_DIGEST_URL,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    return true; // no-cors is opaque; assume success, weekly guard prevents dupes
  }catch(e){console.warn('digest send failed',e);return false;}
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 4 — PILLAR 2: notifications (in-app card + browser notif + iOS coach)
// ═══════════════════════════════════════════════════════════════════════════
function _isIOS(){return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;}
function _isStandalone(){return window.navigator.standalone===true || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);}

function getNotifPrefs(){const st=loadStudent();return (st&&st.notifPrefs)||{};}
function setNotifPrefs(patch){
  const st=loadStudent();if(!st)return;
  const next={...(st.notifPrefs||{}),...patch};
  saveStudent({...st,notifPrefs:next});
}

// Pick a variant that wasn't shown on the last 2 days.
function pickNotifVariant(){
  const prefs=getNotifPrefs();
  const hist=prefs.variantHistory||[];
  const avail=NOTIFICATION_VARIANTS.filter(v=>!hist.slice(-2).includes(v.id));
  const pool=avail.length?avail:NOTIFICATION_VARIANTS;
  return pool[Math.floor(Math.random()*pool.length)];
}

// Called on boot. Shows the in-app engagement card if past preferred time today.
function maybeShowEngagementCard(){
  const prefs=getNotifPrefs();
  if(!prefs.desired||!prefs.dailyTime)return;
  const today=new Date().toDateString();
  if(prefs.lastEngagementFired===today)return;
  const [hh,mm]=(prefs.dailyTime||'19:00').split(':').map(Number);
  const now=new Date();
  const target=new Date();target.setHours(hh||19,mm||0,0,0);
  if(now<target)return; // not time yet today
  const v=pickNotifVariant();
  STATE._engagementCard=v;
  const hist=(prefs.variantHistory||[]).concat(v.id).slice(-3);
  setNotifPrefs({lastEngagementFired:today,variantHistory:hist});
  // Also fire a real browser notification if permitted (best-effort).
  try{
    if('Notification' in window && Notification.permission==='granted'){
      const n=new Notification('CMA Prep',{body:v.body,icon:'./icon-192.png',tag:'cma-daily'});
      n.onclick=()=>{window.focus();navTo(v.link);n.close();};
    }
  }catch(e){}
  render();
}
function dismissEngagementCard(){STATE._engagementCard=null;render();}
function tapEngagementCard(){const v=STATE._engagementCard;STATE._engagementCard=null;if(v)navTo(v.link);else render();}

// Request permission flow, with iOS install coaching when needed.
async function requestNotifPermission(){
  setNotifPrefs({desired:true});
  if(_isIOS() && !_isStandalone()){
    setNotifPrefs({pendingIOSInstall:true});
    showIOSInstallModal();
    return;
  }
  try{
    const perm=await Notification.requestPermission();
    setNotifPrefs({permissionGranted:perm==='granted',pendingIOSInstall:false});
    showToast(perm==='granted'?'Daily reminders on \u2705':'You can enable reminders later in your profile.',perm==='granted'?'success':'info',3000);
  }catch(e){showToast('Notifications not supported on this browser.','info',3000);}
  render();
}
function showIOSInstallModal(){
  showModal({
    icon:'\u{1F4F2}',
    title:'One step for iPhone reminders',
    body:'To get daily nudges on iPhone, add CMA Prep to your Home Screen first:\n\n1) Tap the Share button (the square with an arrow)\n2) Scroll down and tap \u201CAdd to Home Screen\u201D\n3) Open CMA Prep from your Home Screen \u2014 we\u2019ll ask again there.',
    type:'info',confirmText:'Got it'
  });
}
// On boot: if iOS user finished installing, complete the deferred permission ask.
function maybeCompleteIOSNotif(){
  const prefs=getNotifPrefs();
  if(prefs.pendingIOSInstall && _isStandalone() && 'Notification' in window){
    Notification.requestPermission().then(perm=>{
      setNotifPrefs({permissionGranted:perm==='granted',pendingIOSInstall:false});
      if(perm==='granted')showToast('Daily reminders on \u2705','success',3000);
    }).catch(()=>{});
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 4 — boot orchestration. Called once after auth + student load.
// ═══════════════════════════════════════════════════════════════════════════
function runRetentionBoot(){
  try{
    // Streak: evaluate today, react to the result.
    const st=loadStreak();STATE._streakWas=Math.max(STATE._streakWas||0,st.count||0);
    const r=updateStreak();
    if(r==='froze'){showToast('\u2744\uFE0F Used a Streak Freeze to protect your streak','success',4000);}
    else if(r==='grace-needed'){setTimeout(()=>{showGraceModal();},600);}
    // Batch 4.1: seed the study-time history BEFORE the first analytics sync,
    // so last7DaysMinutes / previous7DaysMinutes are honest on the initial write.
    recordStudyMinutes(0); // ensure history key exists
    // Analytics: initial sync (forced, ignores debounce).
    syncStudentAnalytics(true);
    // Notifications: iOS completion + engagement card.
    maybeCompleteIOSNotif();
    maybeShowEngagementCard();
    // Email digest: weekly check.
    maybeSendDigest();
  }catch(e){console.warn('retention boot error',e);}
}


// ── PWA Install Prompt ──────────────────────────────────────────────────────
function updateInstallBanner(){
  const b=document.getElementById('install-banner');
  if(!b)return;
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(isStandalone){b.classList.remove('show');return;}
  // Dismiss expires after 3 days (not forever)
  const dismissedAt=parseInt(localStorage.getItem('cma-install-dismissed-at')||'0');
  const threeDays=3*24*60*60*1000;
  const dismissed=dismissedAt&&(Date.now()-dismissedAt<threeDays);
  if(!dismissed){b.classList.add('show');}
  else{b.classList.remove('show');}
}
function dismissInstallBanner(){
  localStorage.setItem('cma-install-dismissed-at',String(Date.now()));
  const b=document.getElementById('install-banner');
  if(b)b.classList.remove('show');
}
let deferredInstallPrompt = window.__installPrompt || null;
window.__onInstallReady = () => { deferredInstallPrompt = window.__installPrompt; updateInstallBanner(); render(); };
window.addEventListener('appinstalled', () => {
  deferredInstallPrompt = null;
  window.__installPrompt = null;
  const b=document.getElementById('install-banner');
  if(b)b.classList.remove('show');
  render();
});
function openInstallModal(){
  const isSafari=/^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isIOS=/ipad|iphone|ipod/i.test(navigator.userAgent);
  const overlay=document.getElementById('install-modal-overlay');
  if(!overlay)return;
  overlay.classList.add('show');
  // Auto-select iOS tab if on Safari/iOS
  if(isSafari||isIOS) switchInstallTab('ios');
  else switchInstallTab('android');
}
function closeInstallModal(){
  const overlay=document.getElementById('install-modal-overlay');
  if(overlay)overlay.classList.remove('show');
}
function switchInstallTab(os){
  document.getElementById('tab-android').classList.toggle('active',os==='android');
  document.getElementById('tab-ios').classList.toggle('active',os==='ios');
  document.getElementById('install-steps-android').style.display=os==='android'?'':'none';
  document.getElementById('install-steps-ios').style.display=os==='ios'?'':'none';
}
function triggerInstall(){
  const prompt=deferredInstallPrompt||window.__installPrompt;
  if(prompt){
    closeInstallModal();
    prompt.prompt();
    prompt.userChoice.then(()=>{deferredInstallPrompt=null;window.__installPrompt=null;render();});
  }
}
function installApp(){
  const prompt=deferredInstallPrompt||window.__installPrompt;
  if(prompt){
    prompt.prompt();
    prompt.userChoice.then(()=>{deferredInstallPrompt=null;window.__installPrompt=null;render();});
    return;
  }
  // No native prompt available — show guide modal
  openInstallModal();
}

// ══════════════════════════════════════════════════════════════════
// ── MODAL & TOAST SYSTEM ──────────────────────────────────────────
// Replaces all native confirm() / alert() calls with on-brand UI.
// ══════════════════════════════════════════════════════════════════
let _modalResolve = null;
let _modalCanDismiss = true;

/**
 * showModal(opts) → Promise<boolean>
 * opts: { icon, title, body, list[], type, confirmText, cancelText, dismissable }
 * type: 'info' | 'success' | 'warning' | 'danger'
 * Returns true if confirmed, false if cancelled/dismissed.
 */
function showModal({ icon, title, body, list, type = 'info', confirmText = 'OK', cancelText = null, dismissable = true } = {}) {
  return new Promise(resolve => {
    _modalResolve = resolve;
    _modalCanDismiss = dismissable;

    const colorMap = {
      danger:  { bg: 'var(--err)', hover: '#c73b3a', light: 'var(--err-tint)', defaultIcon: '🗑️' },
      warning: { bg: 'var(--warn)', hover: '#d08820', light: 'var(--warn-tint)', defaultIcon: '⚠️' },
      success: { bg: 'var(--ok)', hover: '#527d1c', light: 'var(--ok-tint)', defaultIcon: '✅' },
      info:    { bg: 'var(--brand-2)', hover: 'var(--brand)', light: 'var(--brand-tint)', defaultIcon: 'ℹ️'  }
    };
    const c = colorMap[type] || colorMap.info;

    // Icon
    const iconEl = document.getElementById('modal-icon');
    iconEl.textContent = icon !== undefined ? icon : c.defaultIcon;
    iconEl.style.display = (icon === '' && !c.defaultIcon) ? 'none' : 'block';

    // Title & body
    document.getElementById('modal-title').textContent = title || '';
    document.getElementById('modal-body').textContent = body || '';
    document.getElementById('modal-body').style.display = body ? 'block' : 'none';

    // Optional bullet list (validation errors)
    const listEl = document.getElementById('modal-list');
    if (list && list.length) {
      listEl.style.display = 'block';
      listEl.innerHTML = list.map(item =>
        `<div style="display:flex;gap:7px;align-items:flex-start"><span style="color:${c.bg};flex-shrink:0;margin-top:1px">•</span><span>${esc(item)}</span></div>`
      ).join('');
    } else {
      listEl.style.display = 'none';
    }

    // Buttons
    const btns = document.getElementById('modal-btns');
    const confirmBtn = `<button onclick="_modalResolve(true);closeModal()" style="flex:1;padding:12px 8px;border-radius:10px;border:none;background:${c.bg};color:#fff;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit;transition:opacity .15s" onmouseover="this.style.opacity='.88'" onmouseout="this.style.opacity='1'">${esc(confirmText)}</button>`;
    const cancelBtn  = `<button onclick="_modalResolve(false);closeModal()" style="flex:1;padding:12px 8px;border-radius:10px;border:.5px solid var(--border-3);background:#fff;cursor:pointer;font-size:14px;font-weight:500;font-family:inherit;color:#444;transition:background .15s" onmouseover="this.style.background='var(--surface-3)'" onmouseout="this.style.background='#fff'">${esc(cancelText)}</button>`;

    btns.innerHTML = cancelText
      ? cancelBtn + confirmBtn   // Cancel on left, confirm on right
      : confirmBtn;              // Single OK button

    document.getElementById('modal-overlay').style.display = 'flex';
  });
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  if (overlay) overlay.style.display = 'none';
  _modalResolve = null;
}

/**
 * showToast(message, type, duration)
 * type: 'success' | 'error' | 'warning' | 'info'
 * Quick dismissable notification — auto-removed after `duration` ms.
 */
function showToast(message, type = 'info', duration = 3600) {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const styles = {
    success: { bg: 'var(--ok-tint)', border: 'var(--ok)', text: 'var(--ok-strong)', icon: '✓' },
    error:   { bg: 'var(--err-tint)', border: 'var(--err)', text: 'var(--err-strong)', icon: '✕' },
    warning: { bg: 'var(--warn-tint)', border: 'var(--warn)', text: '#633806', icon: '⚠' },
    info:    { bg: 'var(--brand-tint)', border: 'var(--brand-2)', text: 'var(--brand)', icon: 'i'  }
  };
  const s = styles[type] || styles.info;

  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.style.cssText = [
    `background:${s.bg}`,
    `border:.5px solid ${s.border}`,
    `border-left:3px solid ${s.border}`,
    'border-radius:10px',
    'padding:11px 16px',
    `font-size:13px;color:${s.text}`,
    'line-height:1.5',
    'pointer-events:auto',
    'display:flex;gap:10px;align-items:flex-start',
    'box-shadow:0 4px 20px rgba(0,0,0,.1)',
    'max-width:380px;width:100%'
  ].join(';');

  toast.innerHTML = `<span style="font-size:14px;font-weight:700;flex-shrink:0;width:16px;text-align:center">${s.icon}</span><span style="flex:1">${esc(message)}</span><span onclick="this.parentElement.remove()" style="flex-shrink:0;cursor:pointer;opacity:.5;font-size:16px;line-height:1;padding-left:4px">×</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('removing');
    setTimeout(() => toast.remove(), 250);
  }, duration);
}

// ══════════════════════════════════════════════════════════════════

// FIX 3: Renamed 'scores' → 'lessonScores' to match loadProg(), saveProg(), renderProgress(),
// renderWrongAnswers(), and markDone(). The old 'scores' key was never read, causing quiz
// scores to silently disappear after login. Also fixes the Firestore write rejection
// (rules now permit 'lessonScores' — see firestore.rules Fix 3).
const STATE={tab:'loading',searchQ:'',dictQ:'',dictData:[],dictLoaded:false,leaderboardData:[],leaderboardLoaded:false,quizMode:{active:false,sectionId:null,idx:0,questions:[],answers:[],selected:null},user:null,authScreen:'login',authError:'',authLoading:false,communityFilter:'all',questionDetail:null,showAskForm:false,communityQuestions:[],communityLastDoc:null,communityHasMore:false,communityLoading:false,communityLoaded:false,questionReplies:[],draftTitle:'',draftBody:'',draftSection:'General',draftReply:'',trackerOpenSects:[],sectId:null,lessonId:null,quizState:null,showProfileWarning:false,progress:{done:[],lessonScores:{},mcqTotal:0,mcqRight:0},
    showReset:false,
    flashcards:[],flashcardsIdx:0,flashcardsFlipped:false,flashcardsFilter:'all',flashcardsMode:'study',
    qotdState:{dateKey:'',question:null,selected:null,answered:false,taughtUnitCount:0},
    dailyGoalMinutes:30,fontSize:'md',
    dashTab:'groups',dashGroups:[],dashGroupsLoaded:false,dashStudents:[],dashSlideIdx:0,
    dashTeachingLog:[],dashTeachingLogLoaded:false,
    dashTeachingDraft:{groupCode:'',lectureNumber:'',date:'',unitIds:[],notes:'',lectureId:'',lectureTitle:''},
    dashLoaded:false,dashLoading:false,dashError:false,
    dashLectures:[],dashLive:{},dashLectureDraft:{title:'',groupCode:'',date:''},dashAttendance:[],
    dashExams:[],dashExamsLoaded:false,
    dashExamDraft:{title:'',groupCode:'',sectionIds:[],unitsBySection:{},count:20,durationMinutes:30,opensAt:'',closesAt:''},
    studentExams:[],studentExamsLoaded:false,studentExamResults:{},examSession:null,
    dashExamResults:{},dashExamViewingId:null,dashResultsSort:'score-desc',dashExamPreviewId:null,dashInstructorNotes:{},dashStudentDetailLoadedFor:null,dashStudentDetailLoading:false,dashAttendanceView:null,
    // ── Batch 2: group-scoped dashboard state ──────────────────────────
    // dashSelectedGroup: which group's data is currently displayed on
    //   Lectures / Exams / Actual-Teaching tabs. Groups tab ignores it.
    //   Persisted to localStorage — remembered forever across sessions.
    // dashLoadedForGroup: which group is currently in cache (guards against
    //   showing stale data during a group switch — see loadDashScopedData).
    // dashAttendanceByLecture: on-demand per-lecture attendance cache
    //   ({lectureId: [records]}). Cleared on group switch.
    dashSelectedGroup:'',dashLoadedForGroup:null,dashAttendanceByLecture:{},
    // ── Batch 4: retention state ──
    dashAtRisk:[],dashAtRiskLoadedFor:null,dashAtRiskLoading:false,
    _engagementCard:null,_feedbackPromptFor:null,_graceActive:false,_streakWas:0};

// ─── ARABIC TERM TOOLTIPS ──────────────────────────────────────────────────
// Batch 7: Dictionary entry may be either:
//   'Term': 'الترجمة'                              — legacy shape (string)
//   'Term': { ar: '…', en?: '…', lessonId?: '…' }  — enriched shape
// highlightTerms() and _termData() handle both shapes transparently.
const TERM_DICT={
  // ── Section A — Financial Accounting & Reporting ────────────────────
  'Other Comprehensive Income':'الدخل الشامل الآخر',
  'Comprehensive Income':'الدخل الشامل',
  'Net Realizable Value':'صافي القيمة القابلة للتحقق',
  'Deferred Tax Liability':'التزام ضريبي مؤجل',
  'Deferred Tax Asset':'أصل ضريبي مؤجل',
  'Revenue Recognition':'الاعتراف بالإيراد',
  'Performance Obligation':'التزام الأداء',
  'Transaction Price':'سعر المعاملة',
  'Cash Flow Statement':'قائمة التدفقات النقدية',
  'Financing Activities':'الأنشطة التمويلية',
  'Investing Activities':'الأنشطة الاستثمارية',
  'Operating Activities':'الأنشطة التشغيلية',
  'Contingent Liability':'الالتزام الطارئ',
  'Non-current Liability':'التزام غير متداول',
  'Non-current Asset':'أصل غير متداول',
  'Intangible Asset':'أصل غير ملموس',
  'Tangible Asset':'أصل ملموس',
  'Current Liability':'التزام متداول',
  'Current Asset':'أصل متداول',
  'Prior Period Adjustment':'تعديل الفترة السابقة',
  'Earnings Per Share':'ربحية السهم',
  'Operating Lease':'إيجار تشغيلي',
  'Finance Lease':'إيجار تمويلي',
  'Stockholders Equity':'حقوق المساهمين',
  'Accounts Receivable':'الذمم المدينة',
  'Accounts Payable':'الذمم الدائنة',
  'Preferred Stock':'الأسهم الممتازة',
  'Treasury Stock':'أسهم الخزينة',
  'Bonds Payable':'السندات المستحقة الدفع',
  'Notes Payable':'أوراق الدفع',
  'Common Stock':'الأسهم العادية',
  'Retained Earnings':'الأرباح المحتجزة',
  'Faithful Representation':'التمثيل الصادق',
  'Impairment Loss':'خسارة انخفاض القيمة',
  'Going Concern':'مبدأ الاستمرارية',
  'Accrual Basis':'أساس الاستحقاق',
  'Fair Value':'القيمة العادلة',
  'Book Value':'القيمة الدفترية',
  'Goodwill':'الشهرة التجارية',
  'Dividends':'الأرباح الموزعة',
  'Materiality':'الأهمية النسبية',
  'Comparability':'قابلية المقارنة',
  'Consistency':'الاتساق',
  'Depreciation':'الاستهلاك',
  'Amortization':'الإطفاء',
  'Warranty':'الضمان',
  'Accrual':'الاستحقاق',
  'Inventory':'المخزون',
  'Impairment':'انخفاض القيمة',
  'Timeliness':'التوقيت المناسب',
  'Relevance':'الملاءمة',
  'Balance Sheet':'قائمة المركز المالي',
  'Income Statement':'قائمة الدخل',
  'Statement of Cash Flows':'قائمة التدفقات النقدية',
  'Statement of Owners Equity':'قائمة حقوق الملكية',
  'Equity Method':'طريقة حقوق الملكية',
  'Cost Method':'طريقة التكلفة',
  'Held-to-Maturity':'مقتناة لتاريخ الاستحقاق',
  'Available-for-Sale':'متاحة للبيع',
  'Trading Securities':'أوراق مالية للمتاجرة',
  'Consolidation':'التوحيد',
  'Business Combination':'اندماج الأعمال',
  'Non-controlling Interest':'حصة غير مسيطرة',
  'FIFO':'الوارد أولاً صادر أولاً',
  'LIFO':'الوارد أخيراً صادر أولاً',
  'IFRS':'المعايير الدولية للتقارير المالية',
  'GAAP':'مبادئ المحاسبة المقبولة عمومًا',
  'FASB':'مجلس معايير المحاسبة المالية',
  'IASB':'مجلس معايير المحاسبة الدولية',
  'SEC':'هيئة الأوراق المالية والبورصات',
  'PCAOB':'مجلس الإشراف على محاسبة الشركات العامة',
  'EPS':'ربحية السهم',
  'OCI':'الدخل الشامل الآخر',
  'AFS':'متاحة للبيع',
  'HTM':'مقتناة لتاريخ الاستحقاق',
  'NOL':'خسارة تشغيلية صافية',
  'DTA':'أصل ضريبي مؤجل',
  'DTL':'التزام ضريبي مؤجل',

  // ── Section B — Planning, Budgeting & Forecasting ───────────────────
  'Net Present Value':'صافي القيمة الحالية',
  'Internal Rate of Return':'معدل العائد الداخلي',
  'Time Value of Money':'القيمة الزمنية للنقود',
  'Discounted Cash Flow':'التدفقات النقدية المخصومة',
  'Unfavorable Variance':'انحراف غير ملائم',
  'Favorable Variance':'انحراف ملائم',
  'Variance Analysis':'تحليل الانحرافات',
  'Opportunity Cost':'تكلفة الفرصة البديلة',
  'Production Budget':'موازنة الإنتاج',
  'Capital Budget':'الموازنة الرأسمالية',
  'Flexible Budget':'الموازنة المرنة',
  'Static Budget':'الموازنة الثابتة',
  'Master Budget':'الموازنة الرئيسية',
  'Sales Budget':'موازنة المبيعات',
  'Cash Budget':'الموازنة النقدية',
  'Payback Period':'فترة الاسترداد',
  'Relevant Cost':'التكلفة الملاءمة',
  'Working Capital':'رأس المال العامل',
  'Discount Rate':'معدل الخصم',
  'Sunk Cost':'التكلفة الغارقة',
  'Zero-Based Budgeting':'الموازنة الصفرية',
  'Incremental Budgeting':'الموازنة التزايدية',
  'Continuous Budget':'الموازنة المستمرة',
  'Rolling Budget':'الموازنة المتحركة',
  'Regression Analysis':'تحليل الانحدار',
  'Learning Curve':'منحنى التعلم',
  'Sensitivity Analysis':'تحليل الحساسية',
  'Scenario Analysis':'تحليل السيناريو',
  'SWOT Analysis':'تحليل نقاط القوة والضعف',
  'PESTLE Analysis':'تحليل بيستل',
  'Porters Five Forces':'قوى بورتر الخمس',
  'Value Chain':'سلسلة القيمة',
  'Strategic Planning':'التخطيط الاستراتيجي',
  'NPV':'صافي القيمة الحالية',
  'IRR':'معدل العائد الداخلي',
  'DCF':'التدفقات النقدية المخصومة',
  'WACC':'المتوسط المرجح لتكلفة رأس المال',
  'CAPM':'نموذج تسعير الأصول الرأسمالية',
  'FCF':'التدفق النقدي الحر',

  // ── Section C — Performance Management ──────────────────────────────
  'Key Performance Indicator':'مؤشر الأداء الرئيسي',
  'Economic Value Added':'القيمة الاقتصادية المضافة',
  'Return on Investment':'العائد على الاستثمار',
  'Return on Equity':'العائد على حقوق الملكية',
  'Return on Assets':'العائد على الأصول',
  'Balanced Scorecard':'بطاقة الأداء المتوازن',
  'Responsibility Center':'مركز المسؤولية',
  'Investment Center':'مركز الاستثمار',
  'Residual Income':'الدخل المتبقي',
  'Transfer Price':'سعر التحويل',
  'Transfer Pricing':'تسعير التحويلات',
  'Benchmarking':'المقارنة المرجعية',
  'Cost Center':'مركز التكلفة',
  'Profit Center':'مركز الربح',
  'Revenue Center':'مركز الإيرادات',
  'DuPont Analysis':'تحليل ديبونت',
  'Asset Turnover':'معدل دوران الأصول',
  'Profit Margin':'هامش الربح',
  'Contribution Income Statement':'قائمة الدخل بهامش المساهمة',
  'Market Variance':'انحراف السوق',
  'Sales Volume Variance':'انحراف حجم المبيعات',
  'Sales Price Variance':'انحراف سعر البيع',
  'Sales Mix Variance':'انحراف مزيج المبيعات',
  'Financial Statement Analysis':'تحليل القوائم المالية',
  'ROI':'العائد على الاستثمار',
  'ROE':'العائد على حقوق الملكية',
  'ROA':'العائد على الأصول',
  'ROIC':'العائد على رأس المال المستثمر',
  'EVA':'القيمة الاقتصادية المضافة',
  'RI':'الدخل المتبقي',
  'BSC':'بطاقة الأداء المتوازن',
  'KPI':'مؤشر الأداء الرئيسي',
  'NOPAT':'صافي الربح التشغيلي بعد الضريبة',
  'EBIT':'الأرباح قبل الفوائد والضرائب',
  'EBITDA':'الأرباح قبل الفوائد والضرائب والاستهلاك والإطفاء',
  'DSO':'متوسط فترة تحصيل الذمم',
  'DPO':'متوسط فترة سداد الموردين',
  'CCC':'دورة التحويل النقدي',

  // ── Section D — Cost Management ─────────────────────────────────────
  'Activity-Based Costing':'محاسبة التكاليف على أساس الأنشطة',
  'Absorption Costing':'التكاليف الكاملة (الاستيعابية)',
  'Variable Costing':'التكاليف المتغيرة',
  'Full Costing':'التكاليف الكاملة',
  'Job Order Costing':'محاسبة تكاليف الأوامر',
  'Process Costing':'محاسبة تكاليف المراحل',
  'Standard Cost':'التكلفة المعيارية',
  'Standard Costing':'المحاسبة على أساس التكلفة المعيارية',
  'Actual Costing':'المحاسبة على أساس التكلفة الفعلية',
  'Normal Costing':'المحاسبة على أساس التكلفة العادية',
  'Contribution Margin':'هامش المساهمة',
  'Contribution Margin Ratio':'نسبة هامش المساهمة',
  'Equivalent Units':'الوحدات المكافئة',
  'Break-Even Point':'نقطة التعادل',
  'Weighted Average':'المتوسط المرجح',
  'Direct Material':'المواد المباشرة',
  'Direct Labor':'العمالة المباشرة',
  'Variable Cost':'التكلفة المتغيرة',
  'Fixed Cost':'التكلفة الثابتة',
  'Mixed Cost':'التكلفة المختلطة',
  'Joint Cost':'التكاليف المشتركة',
  'Byproduct':'المنتج العرضي',
  'Overhead':'التكاليف غير المباشرة',
  'Manufacturing Overhead':'التكاليف الصناعية غير المباشرة',
  'Fixed Manufacturing Overhead':'التكاليف الصناعية الثابتة',
  'Variable Manufacturing Overhead':'التكاليف الصناعية المتغيرة',
  'Fixed MOH':'التكاليف الصناعية الثابتة',
  'Variable MOH':'التكاليف الصناعية المتغيرة',
  'Cost of Goods Sold':'تكلفة البضاعة المباعة',
  'Cost of Goods Manufactured':'تكلفة البضاعة المصنعة',
  'CVP Analysis':'تحليل التكلفة-الحجم-الربح',
  'Cost-Volume-Profit':'التكلفة-الحجم-الربح',
  'Margin of Safety':'هامش الأمان',
  'Operating Leverage':'الرافعة التشغيلية',
  'DM Variance':'انحراف المواد المباشرة',
  'DL Variance':'انحراف العمالة المباشرة',
  'Overhead Variance':'انحراف التكاليف غير المباشرة',
  'Price Variance':'انحراف السعر',
  'Quantity Variance':'انحراف الكمية',
  'Rate Variance':'انحراف المعدل',
  'Efficiency Variance':'انحراف الكفاءة',
  'Spending Variance':'انحراف الإنفاق',
  'Volume Variance':'انحراف الحجم',
  'Just-In-Time':'الإنتاج في الوقت المحدد',
  'Lean Manufacturing':'التصنيع الرشيق',
  'Kaizen':'كايزن (التحسين المستمر)',
  'Six Sigma':'ستة سيجما',
  'Kanban':'كانبان',
  'Total Quality Management':'إدارة الجودة الشاملة',
  'Supply Chain':'سلسلة التوريد',
  'Value-Added':'ذو قيمة مضافة',
  'Non-Value-Added':'بدون قيمة مضافة',
  'Life-Cycle Costing':'محاسبة تكاليف دورة الحياة',
  'Target Costing':'المحاسبة على التكلفة المستهدفة',
  'ABC':'محاسبة التكاليف على أساس الأنشطة',
  'COGS':'تكلفة البضاعة المباعة',
  'COGM':'تكلفة البضاعة المصنعة',
  'CVP':'التكلفة-الحجم-الربح',
  'MOH':'التكاليف الصناعية غير المباشرة',
  'DM':'المواد المباشرة',
  'DL':'العمالة المباشرة',
  'OH':'التكاليف غير المباشرة',
  'JIT':'الإنتاج في الوقت المحدد',
  'MRP':'تخطيط احتياجات المواد',
  'ERP':'تخطيط موارد المؤسسة',
  'TQM':'إدارة الجودة الشاملة',
  'EOQ':'الكمية الاقتصادية للطلب',
  'VOH':'التكاليف الصناعية المتغيرة',

  // ── Section E — Internal Controls ───────────────────────────────────
  'Segregation of Duties':'الفصل بين المهام',
  'Control Environment':'بيئة الرقابة',
  'Internal Control':'الرقابة الداخلية',
  'Risk Assessment':'تقييم المخاطر',
  'Internal Audit':'التدقيق الداخلي',
  'External Audit':'التدقيق الخارجي',
  'Inherent Risk':'المخاطر الكامنة',
  'Detection Risk':'مخاطر الاكتشاف',
  'Control Risk':'مخاطر الرقابة',
  'Fraud':'الاحتيال',
  'Audit':'التدقيق',
  'Sarbanes-Oxley':'قانون ساربينز-أوكسلي',
  'Corporate Governance':'حوكمة الشركات',
  'Enterprise Risk Management':'إدارة مخاطر المؤسسة',
  'Preventive Control':'الرقابة الوقائية',
  'Detective Control':'الرقابة الكاشفة',
  'Corrective Control':'الرقابة التصحيحية',
  'Compliance':'الالتزام',
  'Business Continuity':'استمرارية الأعمال',
  'Disaster Recovery':'التعافي من الكوارث',
  'COSO':'إطار كوسو للرقابة الداخلية',
  'SOX':'قانون ساربينز-أوكسلي',
  'ERM':'إدارة مخاطر المؤسسة',
  'ICFR':'الرقابة الداخلية على التقارير المالية',

  // ── Section F — Technology & Analytics ──────────────────────────────
  'Artificial Intelligence':'الذكاء الاصطناعي',
  'Business Intelligence':'ذكاء الأعمال',
  'Machine Learning':'التعلم الآلي',
  'Cloud Computing':'الحوسبة السحابية',
  'Data Analytics':'تحليل البيانات',
  'Data Mining':'استخراج البيانات',
  'Data Governance':'حوكمة البيانات',
  'Data Quality':'جودة البيانات',
  'Data Warehouse':'مستودع البيانات',
  'Data Lake':'بحيرة البيانات',
  'Cybersecurity':'الأمن السيبراني',
  'Blockchain':'سلسلة الكتل',
  'Big Data':'البيانات الضخمة',
  'Robotic Process Automation':'الأتمتة الآلية للعمليات',
  'Enterprise Resource Planning':'تخطيط موارد المؤسسة',
  'System Development Life Cycle':'دورة حياة تطوير النظم',
  'Distributed Ledger':'السجل الموزع',
  'Encryption':'التشفير',
  'Data Privacy':'خصوصية البيانات',
  'Descriptive Analytics':'التحليلات الوصفية',
  'Diagnostic Analytics':'التحليلات التشخيصية',
  'Predictive Analytics':'التحليلات التنبؤية',
  'Prescriptive Analytics':'التحليلات الإرشادية',
  'AI':'الذكاء الاصطناعي',
  'ML':'التعلم الآلي',
  'BI':'ذكاء الأعمال',
  'RPA':'الأتمتة الآلية للعمليات',
  'SDLC':'دورة حياة تطوير النظم',
  'IoT':'إنترنت الأشياء',
  'ETL':'الاستخراج والتحويل والتحميل',
  'SQL':'لغة الاستعلام المهيكلة',
  'API':'واجهة برمجة التطبيقات',
};

// ── Case-normalization for lookup (Batch 7) ──────────────────────────
// Terms are matched case-insensitively but a case-preserving display is kept.
// _termIndex maps lowercased term → canonical key for O(1) lookup.
const _termIndex=(function(){
  const m=Object.create(null);
  Object.keys(TERM_DICT).forEach(k=>{ m[k.toLowerCase()]=k; });
  return m;
})();

// Fetch normalized data for a term. Returns {ar, en?, lessonId?} or null.
function _termData(termKey){
  const val=TERM_DICT[termKey];
  if(!val)return null;
  if(typeof val==='string')return {ar:val};
  return {ar:val.ar||'', en:val.en||'', lessonId:val.lessonId||''};
}

function escRx(s){return s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');}
// Sorted term keys — cached because it's called on every render pass.
let _sortedTerms=null;
function _getSortedTerms(){
  if(_sortedTerms)return _sortedTerms;
  _sortedTerms=Object.keys(TERM_DICT).sort((a,b)=>b.length-a.length);
  return _sortedTerms;
}
function highlightTerms(text){
  let out=esc(text);
  const terms=_getSortedTerms();
  for(const term of terms){
    // Case-insensitive match; case-preserving replacement (keeps original text).
    // Boundary: alphanumeric-safe (?<![A-Za-z0-9_]) ... (?![A-Za-z0-9_]) so
    // abbreviations like MOH inside "Fixed MOH" match, but "MOHawk" does not.
    // Fallback for engines without lookbehind (older Safari): use \b.
    let re;
    try{
      re=new RegExp('(?<![A-Za-z0-9_])('+escRx(term)+')(?![A-Za-z0-9_])(?![^<]*>)','gi');
    }catch{
      re=new RegExp('\\b('+escRx(term)+')\\b(?![^<]*>)','gi');
    }
    out=out.replace(re,(match)=>`<span class="ar-term" data-term="${esc(term)}" onclick="toggleTip(event,this)">${match}</span>`);
  }
  return out;
}

// ── Floating popover for term tooltips (Batch 7) ─────────────────────
// Replaces the old inline-pill design. One popover element is reused —
// created lazily on first click, positioned relative to the clicked term,
// dismissed on click-outside / ESC / scroll.
let _tipEl=null;
let _tipAnchor=null;
function _ensureTipEl(){
  if(_tipEl)return _tipEl;
  _tipEl=document.createElement('div');
  _tipEl.className='ar-tip-pop';
  _tipEl.setAttribute('role','tooltip');
  _tipEl.style.display='none';
  document.body.appendChild(_tipEl);
  // Global dismiss handlers — attached once.
  document.addEventListener('click',(e)=>{
    if(!_tipEl||_tipEl.style.display==='none')return;
    if(_tipEl.contains(e.target))return;
    if(e.target.closest && e.target.closest('.ar-term'))return;
    _hideTip();
  },true);
  document.addEventListener('keydown',(e)=>{ if(e.key==='Escape')_hideTip(); });
  window.addEventListener('resize',_hideTip);
  window.addEventListener('scroll',_hideTip,true);
  return _tipEl;
}
function _hideTip(){
  if(!_tipEl)return;
  _tipEl.style.display='none';
  _tipEl.classList.remove('show');
  _tipAnchor=null;
}
function _positionTip(anchor){
  const tip=_tipEl;if(!tip||!anchor)return;
  // Make visible off-screen first to measure natural size
  tip.style.left='-9999px';
  tip.style.top='0px';
  tip.style.display='block';
  const anchorRect=anchor.getBoundingClientRect();
  const tipRect=tip.getBoundingClientRect();
  const vw=window.innerWidth, vh=window.innerHeight;
  const margin=8;
  // Prefer above; fall back to below if not enough room
  let top=anchorRect.top - tipRect.height - 10;
  let arrow='bottom'; // arrow points down (tip above anchor)
  if(top < margin){
    top=anchorRect.bottom + 10;
    arrow='top';
  }
  // Center horizontally over anchor, clamp to viewport
  let left=anchorRect.left + (anchorRect.width/2) - (tipRect.width/2);
  if(left < margin) left=margin;
  if(left + tipRect.width > vw - margin) left=vw - margin - tipRect.width;
  tip.style.top=(top + window.scrollY)+'px';
  tip.style.left=(left + window.scrollX)+'px';
  tip.setAttribute('data-arrow',arrow);
  tip.classList.add('show');
}
function toggleTip(ev,el){
  if(ev){ ev.stopPropagation(); }
  const anchor=el||(ev&&ev.currentTarget);
  if(!anchor)return;
  const termKey=anchor.getAttribute('data-term');
  const data=_termData(termKey);
  if(!data){ _hideTip(); return; }
  const tip=_ensureTipEl();
  // If clicking the same anchor already shown, dismiss (toggle behavior)
  if(_tipAnchor===anchor && tip.style.display!=='none'){
    _hideTip();
    return;
  }
  _tipAnchor=anchor;
  // Build content — Arabic primary, optional English secondary, optional lesson link
  const enBlock=data.en?`<div class="ar-tip-en">${esc(data.en)}</div>`:'';
  const linkBlock=data.lessonId?`<a class="ar-tip-link" href="javascript:void(0)" onclick="_hideTip();navTo('study');studyGo(null,'${esc(data.lessonId)}')">See lesson →</a>`:'';
  tip.innerHTML=
    `<div class="ar-tip-arrow"></div>`+
    `<div class="ar-tip-term">${esc(termKey)}</div>`+
    `<div class="ar-tip-ar">${esc(data.ar)}</div>`+
    enBlock+linkBlock;
  try{ _positionTip(anchor); }
  catch(err){
    console.warn('[tooltip] positioning failed, falling back:',err);
    // Graceful fallback — show inline near anchor
    tip.style.position='absolute';
    tip.style.top=(anchor.offsetTop+anchor.offsetHeight+6)+'px';
    tip.style.left=anchor.offsetLeft+'px';
    tip.classList.add('show');
  }
}
// ─── HELPERS ─────────────────────────────────────────────────────────────────
function sect(id){return S.find(s=>s.id===id);}

// Batch 8 (shared): map a section's selected unit (lesson) IDs to display
// titles. Used by exam cards, exam preview header, and the student weekly-plan
// banner so all three show unit names instead of just a count. Titles are read
// synchronously from S (section metadata is always loaded). Returns '' when
// nothing resolves; the caller decides the "All units"/"Full section" fallback.
function unitTitles(sectionId, unitIds, opts){
  opts = opts || {};
  var max = opts.max || 3;
  var sec = sect(Number(sectionId));
  if(!sec || !Array.isArray(sec.lessons)) return '';
  var ids = (unitIds||[]).map(String);
  if(!ids.length) return '';
  var titles = [];
  sec.lessons.forEach(function(l){
    if(ids.indexOf(String(l.id)) >= 0) titles.push(l.id + '. ' + l.title);
  });
  if(!titles.length) return '';
  if(titles.length <= max) return titles.join(' \u00B7 ');
  return titles.slice(0, max).join(' \u00B7 ') + ' +' + (titles.length - max) + ' more';
}

// ─── QUIZ BREADCRUMB (item 1) ────────────────────────────────────────────────
// Builds the "Section N: Title \u00B7 Unit M \u00B7 Topic" line shown atop each
// question. Unit number is the part after '-' in a lessonId (e.g. '4-1' -> 1).
// Any missing piece is silently dropped; returns '' if nothing resolvable.
function quizBreadcrumb(sectionId, lessonId, topic, concept){
  var bits=[];
  var sec=sect(Number(sectionId));
  if(sec) bits.push('Section '+sec.id+': '+sec.title);
  if(lessonId){ var u=String(lessonId).split('-')[1]; if(u) bits.push('Unit '+u); }
  // concept (per-question) wins; unit-name topic is the fallback when untagged
  var label=concept||topic;
  if(label) bits.push(label);
  return bits.join(' \u00B7 ');
}

// ─── QUIZ DOT STRIP (item 2) ─────────────────────────────────────────────────
// Tappable progress dots above the question. Colour encodes per-question state:
// green=right, red=wrong, grey=skipped/unseen, brand ring=current. Bounded to a
// scrollable band so 50-100 dots (quiz-mode) never dominate the screen.
function dotStripHTML(questions, curIdx, answers, jumpFn){
  var dots=questions.map(function(q,i){
    var a=answers[i];
    var bg='var(--surface-2)',bd='.5px solid var(--border)',col='var(--muted-2)';
    if(a){ if(a.correct){bg='var(--ok-tint)';bd='.5px solid var(--ok)';col='var(--ok-strong)';}
           else {bg='var(--err-tint)';bd='.5px solid var(--err)';col='var(--err-2)';} }
    var ring=(i===curIdx)?'box-shadow:0 0 0 2px var(--brand);':'';
    return '<button onclick="'+jumpFn+'('+i+')" title="Question '+(i+1)+'" style="'+ring+'width:26px;height:26px;flex:0 0 auto;border-radius:50%;border:'+bd+';background:'+bg+';color:'+col+';font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;padding:0">'+(i+1)+'</button>';
  }).join('');
  return '<div style="display:flex;flex-wrap:wrap;gap:6px;padding:10px 12px;max-height:76px;overflow-y:auto;background:var(--surface-3);border-bottom:1px solid var(--border);flex-shrink:0">'+dots+'</div>';
}

// ─── PER-QUESTION LIVE TIMER ──────────────────────────────────────────────────
window._qTimerInterval=null;
function startQTimer(getStartFn){
  if(window._qTimerInterval)clearInterval(window._qTimerInterval);
  window._qTimerInterval=setInterval(()=>{
    const el=document.getElementById('q-timer-val');
    if(!el){clearInterval(window._qTimerInterval);return;}
    const elapsed=Date.now()-getStartFn();
    const s=Math.floor(elapsed/1000);
    const m=Math.floor(s/60);
    el.textContent=m>0?`${m}m ${s%60<10?'0':''}${s%60}s`:`${s}s`;
    // Color the badge live
    const badge=document.getElementById('q-timer');
    if(badge){
      if(elapsed<60000){badge.style.background='var(--ok-tint)';badge.style.color='var(--ok-strong)';}
      else if(elapsed<120000){badge.style.background='var(--warn-tint)';badge.style.color='var(--warn-strong)';}
      else{badge.style.background='var(--err-tint)';badge.style.color='var(--err-strong)';}
    }
  },500);
}
function stopQTimer(){if(window._qTimerInterval){clearInterval(window._qTimerInterval);window._qTimerInterval=null;}}
function getPct(){return Math.round(STATE.progress.done.length/TOTAL_LESSONS*100);}
function getAcc(){const{mcqTotal,mcqRight}=STATE.progress;return mcqTotal>0?Math.round(mcqRight/mcqTotal*100):0;}
function lessonDone(lid){ return _getDoneSet().has(lid); }
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
// Enriched quiz support — picks the most specific explanation for the chosen answer.
// Falls back to q.e for the correct pick or for questions without per-choice notes.
function expFor(q,chosen){if(chosen!==null&&chosen!==q.a&&q.wrongWhy&&q.wrongWhy[chosen])return q.wrongWhy[chosen];return q.e;}
// Batch 7 (B7-04): dual explanation. On a WRONG pick, show BOTH the correct
// answer's explanation (q.e, prominent, first) AND why the chosen option was
// wrong (wrongWhy[chosen], secondary). Correct-first aids retention. Returns
// pre-escaped HTML — call sites must NOT wrap it in esc().
//   correct pick / no per-choice note  -> just q.e (unchanged behavior)
//   wrong + wrongWhy + q.e             -> both blocks
//   wrong + wrongWhy but no q.e        -> just wrongWhy (graceful fallback)
function expInner(q,chosen){
  const eHtml=esc(q.e||'');
  const wrong=(chosen!==null&&chosen!==q.a&&q.wrongWhy&&q.wrongWhy[chosen])?esc(q.wrongWhy[chosen]):'';
  if(!wrong)return eHtml;
  if(!eHtml)return wrong;
  return '<div><span style="font-weight:600">\u2713 Correct answer:</span> '+eHtml+'</div>'
       + '<div style="margin-top:9px;padding-top:9px;border-top:.5px solid var(--border);opacity:.9"><span style="font-weight:600">Your answer:</span> '+wrong+'</div>';
}
// Enriched quiz support — renders a 2-column data table for calculation questions.
// Returns '' when the question has no .data, so existing questions are unaffected.
function dataTableHTML(q){
  if(!q.data||!q.data.length)return'';
  // S4-C: the extractor fused row label + middle columns into cell 0 with
  // padding spaces, leaving only the last column in cell 1. Rendering as a
  // rigid 2-col HTML table crushed that. Instead we lay the rows out in a
  // monospace block that preserves the source padding and left-pads every
  // non-final column to a common width, so columns line up and wide tables
  // scroll horizontally instead of wrapping. Legacy 2-value rows still work.
  const rows=q.data.map(r=>Array.isArray(r)?r.map(c=>String(c==null?'':c)):[String(r==null?'':r)]);
  const nCols=Math.max(1,...rows.map(r=>r.length));
  const widths=[];
  for(let c=0;c<nCols-1;c++){
    widths[c]=Math.max(0,...rows.map(r=>(r[c]||'').replace(/\s+$/,'').length));
  }
  const lines=rows.map(r=>{
    let out='';
    for(let c=0;c<nCols;c++){
      const cell=(r[c]||'').replace(/\s+$/,'');
      out+=(c<nCols-1)?cell.padEnd(widths[c]+2):cell;
    }
    return esc(out);
  }).join('\n');
  return`<pre class="q-data">${lines}</pre>`;
}

// Batch 11: optional "ask" sentence, rendered AFTER the data table and right
// before the answer choices (standard exam format: scenario -> data -> ask ->
// choices). Only questions with a populated `ask` field render this — every
// other question is completely unaffected (renders exactly as before, ask
// stays embedded in the stem). Content authoring to populate `ask` per
// question is a separate, careful manual pass (see batch notes) — automated
// splitting was tested and rejected due to leaked table-header contamination
// in a meaningful share of stems.
function askHTML(q){
  if(!q||!q.ask)return'';
  return `<p style="font-size:15px;font-weight:600;line-height:1.55;margin:14px 0 16px">${stemHTML(q.ask)}</p>`;
}


// S4-D: render a question stem one sentence per line for readability on
// data-heavy stems. Escapes, then splits on sentence-final punctuation
// followed by whitespace + a capital/number/$, skipping known abbreviations
// so 'Farber Co. has…' / 'at $12/hr.' / 'No. 5' don't mis-split. Returns the
// plain escaped string unchanged when there is only one sentence (no-op for
// conceptual one-liners). Used on full-stem reading surfaces only.
var _STEM_ABBR=/^(?:Co|Corp|Inc|Ltd|Bros|Mr|Mrs|Ms|Dr|St|No|Nos|vs|etc|approx|est|avg|dept|mfg|Fig|Eq|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|hr|hrs|yr|yrs|min|sec)$/i;
// Batch 11: generic sentence-boundary split (the original stemHTML body,
// extracted so it can also be reused on the setup text before a Roman-numeral
// list — see stemHTML() below).
function _stemSplitPlain(raw){
  const parts=[]; let start=0; const re=/[.?!]\s+(?=[A-Z0-9$])/g; let m;
  while((m=re.exec(raw))){
    const end=m.index+1;
    const chunk=raw.slice(start,end);
    const lw=(chunk.match(/([A-Za-z]+)\.$/)||[])[1]||'';
    if(_STEM_ABBR.test(lw)) continue; // abbreviation → keep sentence going
    parts.push(chunk.trim());
    start=re.lastIndex;
  }
  parts.push(raw.slice(start).trim());
  return parts.filter(Boolean);
}
// Roman-numeral sub-list marker, e.g. "I. ", "II. ", ... "X. " followed by a
// capital letter (the start of that list item's text).
const _STEM_ROMAN_RE=/\b(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+[A-Z]/g;
function stemHTML(text){
  const raw=String(text==null?'':text);
  // Batch 11: "which of the following... I. ... II. ... III. ..." style stems.
  // The generic splitter above has no notion of Roman-numeral list markers,
  // so it attaches each numeral to the END of the wrong line instead of the
  // START of its own item. Detect >=2 markers and split BEFORE each one so
  // "I. Fixed direct manufacturing costs" stays together as one clean line.
  const romanMatches=raw.match(_STEM_ROMAN_RE)||[];
  if(romanMatches.length>=2){
    const firstIdx=raw.search(_STEM_ROMAN_RE);
    const prefix=raw.slice(0,firstIdx).trim();
    const listPart=raw.slice(firstIdx);
    const listLines=listPart.split(/(?=\b(?:I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s+[A-Z])/).map(s=>s.trim()).filter(Boolean);
    const prefixLines=prefix?_stemSplitPlain(prefix):[];
    const all=[...prefixLines,...listLines];
    if(all.length<=1) return esc(raw);
    return all.map(s=>`<span class="stem-line">${esc(s)}</span>`).join('');
  }
  const clean=_stemSplitPlain(raw);
  if(clean.length<=1) return esc(raw);
  return clean.map(s=>`<span class="stem-line">${esc(s)}</span>`).join('');
}
function safePhotoURL(u){
  if(typeof u!=='string') return '';
  return (/^https:\/\/res\.cloudinary\.com\//.test(u) || /^data:image\//.test(u)) ? u : '';
}
function normalizeCase(t){const K=new Set(['GAAP','IFRS','LIFO','FIFO','WACC','ROI','NPV','IRR','CMA','US','USA','FASB','IASB','SEC','PCAOB','EPS','DM','DL','OH','SHA','AH','AP','SP','VOH','ABC','JIT','CVP','COGS','PPE','FCF','EVA','BSC','KPI','ERP','MRP','CRM','AI','ML','BI','SQL','ETL','API','AFS','HTM','OCI','FV','NOL','DTA','DTL','GDP','CPI','IPO','ETF','LBO','DCF','CAPM','IT','HR','ASC','ASU','COD','FICA','RD','EBIT','EBITDA','COSO','SOX','IRS','CEO','CFO','COO','CPA','CIA','ICFR']);return String(t).replace(/([A-Z][A-Z]+)/g,(m)=>K.has(m)?m:m.charAt(0)+m.slice(1).toLowerCase());}
function getStudyStreak(){return loadStreak().count||0;}

// ─── RENDER LESSON BLOCK ──────────────────────────────────────────────────────
// ─── LESSON ACCORDION (Session B item 5 — Section 4 pilot) ────────────────
// Groups a lesson's content blocks by 'h' (topic-header) boundary and
// renders each topic as a collapsible section. The FIRST header in a lesson
// is treated as the lesson's own title echo (not a listed topic) and stays
// non-collapsible, matching the numbering rule from item 4 (topic numbers
// start after the intro header). Falls back to the flat renderBlock map for
// any section other than 4, or for a lesson with 0-1 headers (nothing to
// collapse) — zero behavior change outside the pilot.
function renderLessonBody(lesson,sec){
  const blocks=lesson.blocks||[];
  if(sec.id!==4) return blocks.map(b=>renderBlock(b,sec)).join('');
  const hIdx=[];
  blocks.forEach((b,i)=>{if(b&&b.t==='h')hIdx.push(i);});
  if(hIdx.length<=1) return blocks.map(b=>renderBlock(b,sec)).join('');
  const introHTML=blocks.slice(0,hIdx[1]).map(b=>renderBlock(b,sec)).join('');
  let topicsHTML='';
  for(let t=1;t<hIdx.length;t++){
    const start=hIdx[t];
    const end=(t+1<hIdx.length)?hIdx[t+1]:blocks.length;
    const headerBlock=blocks[start];
    const bodyHTML=blocks.slice(start+1,end).map(b=>renderBlock(b,sec)).join('');
    const topicId=lesson.id+'-t'+t;
    topicsHTML+=`<div class="lesson-topic" id="topic-wrap-${topicId}">
      <button type="button" class="lesson-topic-toggle" onclick="toggleLessonTopic('${topicId}')" id="topic-btn-${topicId}">
        <span class="lesson-topic-title">${esc(headerBlock.v)}</span>
        <span class="lesson-topic-chevron" id="topic-chevron-${topicId}">›</span>
      </button>
      <div class="lesson-topic-body" id="topic-body-${topicId}" style="display:none">${bodyHTML}</div>
    </div>`;
  }
  const expandAllBtn=`<div style="display:flex;justify-content:flex-end;margin-bottom:8px">
    <button type="button" class="lesson-expand-all" onclick="toggleAllLessonTopics('${lesson.id}')" id="expand-all-${lesson.id}">Expand all</button>
  </div>`;
  return introHTML+expandAllBtn+`<div id="topics-container-${lesson.id}">`+topicsHTML+`</div>`;
}
function toggleLessonTopic(topicId){
  const body=document.getElementById('topic-body-'+topicId);
  const chevron=document.getElementById('topic-chevron-'+topicId);
  if(!body)return;
  const isOpen=body.style.display!=='none';
  body.style.display=isOpen?'none':'block';
  if(chevron)chevron.style.transform=isOpen?'rotate(0deg)':'rotate(90deg)';
}
function toggleAllLessonTopics(lessonId){
  const container=document.getElementById('topics-container-'+lessonId);
  const btn=document.getElementById('expand-all-'+lessonId);
  if(!container)return;
  const bodies=container.querySelectorAll('.lesson-topic-body');
  const chevrons=container.querySelectorAll('.lesson-topic-chevron');
  const anyClosed=Array.from(bodies).some(b=>b.style.display==='none');
  bodies.forEach(b=>{b.style.display=anyClosed?'block':'none';});
  chevrons.forEach(c=>{c.style.transform=anyClosed?'rotate(90deg)':'rotate(0deg)';});
  if(btn)btn.textContent=anyClosed?'Collapse all':'Expand all';
}
function renderBlock(block,sec){
  const bg=sec.bg,tx=sec.text,st=sec.strong;
  switch(block.t){
    case'h':return`<div class="lh">${esc(block.v)}</div>`;
    case'p':return`<div class="lp">${highlightTerms(block.v)}</div>`;
    case'f':return`<div class="formula" style="background:${bg};border:1px solid ${tx}30"><div class="formula-lbl" style="color:${tx}">${esc(block.l)}</div><div class="formula-txt" style="color:${st}">${esc(block.v)}</div></div>`;
    case'tip':return`<div class="tip"><div class="tip-lbl">EXAM TIP</div><div class="tip-txt">${highlightTerms(block.v)}</div></div>`;
    case'b':return`<ul class="blist">${block.v.map(i=>`<li><span style="color:${tx};font-weight:500;flex-shrink:0">•</span><span>${highlightTerms(i)}</span></li>`).join('')}</ul>`;
    case's':return`<ol class="slist">${block.v.map((i,j)=>`<li><span class="snum" style="background:${bg};color:${st};border:1px solid ${tx}40">${j+1}</span><span>${highlightTerms(i)}</span></li>`).join('')}</ol>`;
    case'tbl':return`<div class="tbl-wrap"><table class="tbl"><thead><tr>${block.h.map(h=>`<th style="background:${bg};color:${st}">${esc(h)}</th>`).join('')}</tr></thead><tbody>${block.r.map(row=>`<tr>${row.map(c=>`<td>${highlightTerms(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    case'video':{
      const vid=block.v;
      const lbl=block.l?`<div class="formula-lbl" style="color:${tx};margin-bottom:8px">${esc(block.l)}</div>`:'';
      return`<div style="margin:14px 0">${lbl}<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;border-radius:10px;background:#000"><iframe src="https://www.youtube.com/embed/${vid}?rel=0&modestbranding=1" style="position:absolute;top:0;left:0;width:100%;height:100%;border:0" allowfullscreen loading="lazy" allow="accelerometer;autoplay;clipboard-write;encrypted-media;gyroscope;picture-in-picture"></iframe></div></div>`;
    }
    // ── Batch 6: pedagogical block types ─────────────────────────────────
    case'def':{
      const term=block.term||block.l||'';
      // Batch 7: apply highlightTerms to the title as well, so titles like
      // "Absorption Costing" are tappable, not just body mentions.
      return`<div class="def-block"><div class="def-lbl" style="color:${tx}">DEFINITION</div><div class="def-term" style="color:${st}">${highlightTerms(term)}</div><div class="def-body">${highlightTerms(block.v||'')}</div></div>`;
    }
    case'case':{
      const insight=block.insight?`<div class="case-insight"><b>💡 Insight:</b> ${highlightTerms(block.insight)}</div>`:'';
      // S4-A: scenario variant {company, scenario, question, insight} — no facts/solution.
      // Detected by presence of `scenario`/`company`; the classic worked-case shape
      // (co/facts/sol) still renders through the branch below unchanged.
      if(block.scenario||block.company){
        const co2=esc(block.company||block.co||'Company');
        const scen=highlightTerms(block.scenario||'');
        const qn=esc(block.question||block.q||'');
        return`<div class="case-block"><div class="case-lbl">📋 CASE STUDY</div><div class="case-co">${co2}</div><div class="case-section-lbl">Scenario</div><div style="font-size:13px;line-height:1.6;color:var(--ink);margin-bottom:4px">${scen}</div>${qn?`<div class="case-section-lbl">Question</div><div class="case-question" style="border-left-color:${tx}">${qn}</div>`:''}${insight}</div>`;
      }
      const co=esc(block.co||'Company');
      const facts=(block.facts||[]).map(f=>`<li><span style="color:${tx};font-weight:500;flex-shrink:0">•</span><span>${highlightTerms(f)}</span></li>`).join('');
      const sol=(block.sol||[]).map((s,i)=>`<li><span class="snum" style="background:${bg};color:${st};border:1px solid ${tx}40">${i+1}</span><span>${highlightTerms(s)}</span></li>`).join('');
      return`<div class="case-block"><div class="case-lbl">📋 CASE STUDY</div><div class="case-co">${co}</div><div class="case-section-lbl">Facts</div><ul class="blist" style="margin-bottom:6px">${facts}</ul><div class="case-section-lbl">Question</div><div class="case-question" style="border-left-color:${tx}">${esc(block.q||'')}</div><div class="case-section-lbl">Solution</div><ol class="slist">${sol}</ol>${insight}</div>`;
    }
    case'ex':{
      const _exTitle=block.l||block.title;const lbl=_exTitle?`<div class="ex-lbl">✏️ QUICK EXAMPLE</div><div class="ex-title">${esc(_exTitle)}</div>`:'';
      return`<div class="ex-block">${lbl}<div class="ex-body">${highlightTerms(block.v||'')}</div></div>`;
    }
    default:return'';
  }
}


// ─── STUDY SCREEN (merged Home + Lessons + Quiz) ─────────────────────────────
// ── STUDY SCREEN — TARGETED UPDATE FUNCTIONS ─────────────────────────────────
// ST-2: These replace render() calls within the study screen,
// updating only content-area innerHTML instead of full page rebuild.

// studyGo(sectId, lessonId) — fast within-study navigation
// Skips nav rebuild, timer checks, and all other tab side-effects.
function studyGo(sectId, lessonId){
  // End timer if leaving a lesson
  if(STATE.lessonId&&!lessonId) endStudyTimer();
  // Start timer when entering a lesson
  if(lessonId) startStudyTimer('lesson-'+lessonId);
  STATE.sectId = sectId;
  STATE.lessonId = lessonId;
  const content = document.getElementById('content-area');
  if(!content || STATE.tab !== 'study'){render();return;}
  content.innerHTML = renderStudy();
  content.style.display = 'flex';
  content.style.flexDirection = 'column';
  content.style.overflow = 'auto';
  // Sync note if entering a lesson
  if(lessonId){setTimeout(()=>syncNoteFromCloud(lessonId),0);}
}

// toggleSection(secId) — accordion expand/collapse with surgical DOM update.
// Only touches the #sec-lessons-{id} div — zero full rebuilds.
function toggleSection(secId){
  const wasOpen = STATE.sectId === secId;
  STATE.sectId = wasOpen ? null : secId;

  const listEl = document.getElementById('sec-lessons-'+secId);
  const iconEl = document.getElementById('sec-icon-'+secId);

  // Fallback to full update if DOM anchors not found (e.g. first render)
  if(!listEl){studyGo(STATE.sectId, null);return;}

  if(wasOpen){
    // Collapse
    listEl.innerHTML = '';
    listEl.style.display = 'none';
    if(iconEl) iconEl.style.transform = 'rotate(0deg)';
  } else {
    // Expand — inject lesson list HTML
    const sec = S.find(s=>s.id===secId);
    if(!sec){render();return;}
    const prog = STATE.progress;
    const html = sec.lessons.map((l,i)=>{
      const done = lessonDone(l.id);
      const lsc  = (prog.lessonScores||{})[l.id];
      const qpct = lsc ? Math.round(lsc.correct/lsc.total*100) : null;
      return`<div style="background:${done?sec.bg:'var(--surface-2)'};margin-bottom:8px;border-radius:10px;border:.5px solid ${done?sec.text+'30':'var(--border)'}">
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px">
          <div style="width:28px;height:28px;border-radius:50%;background:${done?sec.bar:'var(--border-2)'};display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;flex-shrink:0;font-weight:600">${done?'✓':i+1}</div>
          <div style="flex:1;min-width:0">
            <div class="ellipsis" style="font-size:13px;font-weight:500;color:${done?sec.strong:'var(--ink)'}">${i+1}. ${esc(l.title)}</div>
            <div style="font-size:11px;color:#888;margin-top:2px">${l.dur}${lsc?` · ${qpct>=70?'✅':'🔴'} ${lsc.correct}/${lsc.total} (${qpct}%)`+' ':' · Quiz not attempted'}</div>
          </div>
          <div style="display:flex;gap:6px;flex-shrink:0">
            <button onclick="event.stopPropagation();studyGo(${sec.id},'${l.id}')" title="Study Lesson" style="width:36px;height:36px;border-radius:9px;border:.5px solid ${sec.text}30;background:${done?sec.bar:'#fff'};color:${done?'#fff':sec.strong};font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">📖</button>
            <button onclick="event.stopPropagation();doLessonQuiz('${l.id}')" title="${lsc?'Retake Quiz':'Start Quiz'}" style="width:36px;height:36px;border-radius:9px;border:.5px solid ${lsc?(qpct>=70?'var(--ok)40':'var(--err)40'):'var(--brand-2)40'};background:${lsc?(qpct>=70?'var(--ok-tint)':'var(--err-tint)'):'var(--brand-tint)'};color:${lsc?(qpct>=70?'var(--ok-strong)':'var(--err-2)'):'var(--brand-2)'};font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">🎯</button>
          </div>
        </div>
      </div>`;
    }).join('');
    listEl.innerHTML = `<div style="margin-top:10px;border-top:.5px solid ${sec.text}20;padding-top:10px">
      <div style="font-size:11px;font-weight:500;color:${sec.text};margin-bottom:8px;letter-spacing:.5px">LESSONS & QUIZZES</div>
      ${html}
    </div>`;
    listEl.style.display = 'block';
    if(iconEl) iconEl.style.transform = 'rotate(90deg)';
  }
}

function renderStudy(){
  const{progress}=STATE;
  // ── Lesson reader ──────────────────────────────────────────────────────────
  if(STATE.lessonId!==null){
    let sec=sect(STATE.sectId);
    if(!sec){sec=S.find(s=>s.lessons.some(l=>l.id===STATE.lessonId));}
    if(!sec||!sec.lessons.find(l=>l.id===STATE.lessonId)){STATE.lessonId=null;render();return '';}
    STATE.sectId=sec.id;
    const lesson=sec.lessons.find(l=>l.id===STATE.lessonId);
    // Lazy-load blocks if not yet fetched
    if(!lesson.blocks||lesson.blocks.length===0){
      if(!LESSON_CACHE[String(sec.id)]){
        ensureLessons(sec.id).then(()=>render());
        return`<div class="bh"><button class="bh-back" onclick="studyGo(STATE.sectId,null)">‹</button>
          <div><div style="font-size:11px;font-weight:500;color:${sec.text}">${sec.emoji} ${esc(sec.title)}</div>
          <div style="font-size:14px;font-weight:500">${esc(lesson.title)}</div></div></div>
          <div class="scroll-area pad" style="padding-top:20px">
            <div style="background:var(--bg);border-radius:10px;height:22px;margin-bottom:12px;animation:shimmer 1.2s ease-in-out infinite"></div>
            <div style="background:var(--bg);border-radius:10px;height:16px;width:80%;margin-bottom:8px;animation:shimmer 1.2s ease-in-out infinite .1s"></div>
            <div style="background:var(--bg);border-radius:10px;height:16px;width:92%;margin-bottom:8px;animation:shimmer 1.2s ease-in-out infinite .2s"></div>
            <div style="background:var(--bg);border-radius:10px;height:16px;width:70%;margin-bottom:24px;animation:shimmer 1.2s ease-in-out infinite .3s"></div>
            <div style="text-align:center;font-size:13px;color:#aaa;margin-top:8px">Loading lesson content…</div>
          </div>`;
      }
    }
    const lessonIdx=sec.lessons.findIndex(l=>l.id===STATE.lessonId);const done=lessonDone(lesson.id);
    const hasVideo=lesson.blocks&&lesson.blocks.some(b=>b.t==='video');
    const videoPlaceholder=hasVideo?'':`<div style="margin:14px 0 4px;background:var(--surface-3);border:.5px dashed #c0c0b8;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px"><div style="width:36px;height:36px;background:var(--brand-tint);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px">🎬</div><div><div style="font-size:13px;font-weight:500;color:#555">Video lesson coming soon</div><div style="font-size:11px;color:#999;margin-top:2px">Gawad will record this lesson shortly</div></div></div>`;
    return`<div class="bh"><button class="bh-back" onclick="studyGo(STATE.sectId,null)">‹</button>
      <div style="min-width:0"><div style="font-size:11px;font-weight:500;color:${sec.text}">${sec.emoji} ${esc(sec.title)}</div>
      <div class="ellipsis" style="font-size:15px;font-weight:500;margin-top:1px">${lessonIdx+1}. ${esc(lesson.title)}</div></div></div>
    <div class="scroll-area pad"><div class="card" style="margin-top:14px;padding:4px 16px 16px">${renderLessonBody(lesson,sec)}${videoPlaceholder}</div>
    <button class="btn" data-markdone="${lesson.id}" onclick="markDone('${lesson.id}')" style="margin-top:14px;background:${done?'var(--ok-tint)':sec.bar};color:${done?'var(--ok-strong)':'#fff'}">${done?'✓ Completed — Back':'Mark as Complete ✓'}</button>
    ${(()=>{const nx=getNextLesson(sec.id,lesson.id);if(!nx)return'';return`<button class="btn btn-outline" onclick="studyGo(${nx.sec.id},'${nx.lesson.id}')" style="margin-top:8px;border-color:var(--brand-2)20;color:var(--brand-2)">Next: ${esc(nx.lesson.title)} →</button>`;})()}
    <div style="margin-top:12px">
      <div style="font-size:12px;font-weight:500;color:#888;margin-bottom:6px">📝 My Notes</div>
      <textarea id="lesson-notes-${lesson.id}" placeholder="Write your notes here... (saved automatically)" oninput="saveLessonNote('${lesson.id}',this.value)" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink);resize:vertical;line-height:1.5;box-sizing:border-box;min-height:120px" rows="7">${loadLessonNote(lesson.id)}</textarea>
    </div>
    <div style="height:20px"></div></div>`;
  }
  const doneCount=progress.done.length;
  const pct=getPct();
  const sectCards=S.map(sec=>{
    const lessonsDone=sec.lessons.filter(l=>lessonDone(l.id)).length;
    const sp=Math.round(lessonsDone/sec.lessons.length*100);
    const secQuizDone=sec.lessons.filter(l=>progress.lessonScores?.[l.id]).length;
    const isOpen=STATE.sectId===sec.id;
    const lessonList=isOpen?`
      <div style="margin-top:10px;border-top:.5px solid ${sec.text}20;padding-top:10px">
        <div style="font-size:11px;font-weight:500;color:${sec.text};margin-bottom:8px;letter-spacing:.5px">LESSONS & QUIZZES</div>
        ${sec.lessons.map((l,i)=>{const done=lessonDone(l.id);const lsc=(progress.lessonScores||{})[l.id];const qpct=lsc?Math.round(lsc.correct/lsc.total*100):null;return`
          <div style="background:${done?sec.bg:'var(--surface-2)'};margin-bottom:8px;border-radius:10px;border:.5px solid ${done?sec.text+'30':'var(--border)'}">
            <div style="display:flex;align-items:center;gap:10px;padding:10px 12px">
              <div style="width:28px;height:28px;border-radius:50%;background:${done?sec.bar:'var(--border-2)'};display:flex;align-items:center;justify-content:center;font-size:12px;color:#fff;flex-shrink:0;font-weight:600">${done?'✓':i+1}</div>
              <div style="flex:1;min-width:0">
                <div class="ellipsis" style="font-size:13px;font-weight:500;color:${done?sec.strong:'var(--ink)'}">${i+1}. ${esc(l.title)}</div>
                <div style="font-size:11px;color:#888;margin-top:2px">${l.dur}${lsc?` · ${qpct>=70?'✅':'🔴'} ${lsc.correct}/${lsc.total} (${qpct}%)`:' · Quiz not attempted'}</div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0">
                <button onclick="event.stopPropagation();studyGo(${sec.id},'${l.id}')" title="Study Lesson" style="width:36px;height:36px;border-radius:9px;border:.5px solid ${sec.text}30;background:${done?sec.bar:'#fff'};color:${done?'#fff':sec.strong};font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">📖</button>
                <button onclick="event.stopPropagation();doLessonQuiz('${l.id}')" title="${lsc?'Retake Quiz':'Start Quiz'}" style="width:36px;height:36px;border-radius:9px;border:.5px solid ${lsc?(qpct>=70?'var(--ok)40':'var(--err)40'):'var(--brand-2)40'};background:${lsc?(qpct>=70?'var(--ok-tint)':'var(--err-tint)'):'var(--brand-tint)'};color:${lsc?(qpct>=70?'var(--ok-strong)':'var(--err-2)'):'var(--brand-2)'};font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">🎯</button>
              </div>
            </div>
          </div>`}).join('')}

      </div>`:'' ;
    return`<div id="sec-card-${sec.id}" class="card" style="cursor:pointer;border-color:${isOpen?sec.text+'60':'var(--border)'};border-width:${isOpen?'1px':'.5px'}" onclick="toggleSection(${sec.id})">
      <div style="display:flex;align-items:center;gap:10px">
        <div class="sect-icon" style="background:${sec.bg}">${sec.emoji}</div>
        <div style="flex:1;min-width:0">
          <div class="ellipsis" style="font-size:14px;font-weight:500;color:var(--ink)">${esc(sec.title)}</div>
          <div style="font-size:11px;color:#888;margin-top:2px">${sec.weight}% of exam · ${lessonsDone}/${sec.lessons.length} lessons · ${secQuizDone}/${sec.lessons.length} quizzes done</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0">
          <span class="badge" style="background:${sec.bg};color:${sec.strong}">${sp}%</span>
          <span id="sec-icon-${sec.id}" style="font-size:16px;color:#bbb;transition:transform .2s;transform:rotate(${isOpen?'90deg':'0deg'})">›</span>
        </div>
      </div>
      <div style="height:4px;background:var(--bg);border-radius:2px;margin-top:10px;overflow:hidden">
        <div style="height:100%;width:${sp}%;background:${sec.bar};border-radius:2px"></div>
      </div>
      <div id="sec-lessons-${sec.id}" style="${isOpen?'':'display:none'}">${lessonList}</div>
    </div>`;
  }).join('');

  return`<div style="padding:0 16px;overflow-y:auto;flex:1">
    <div style="padding:16px 0 4px">
      <div style="background:linear-gradient(135deg,var(--brand),var(--brand-3));border-radius:14px;padding:16px 18px;margin-bottom:14px">
        <h1 style="font-size:20px;font-weight:500;color:#fff;margin-bottom:2px">CMA Part 1</h1>
        <p style="font-size:12px;color:rgba(255,255,255,.75);margin-bottom:12px">Financial Planning, Performance & Analytics</p>
        ${(()=>{const st=loadStudent();if(st&&st.examdate){const d=new Date(st.examdate+'-01');const today=new Date();const diff=Math.ceil((d-today)/(1000*60*60*24));return diff>0?`<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:7px 12px;margin-bottom:10px;display:flex;align-items:center;gap:8px"><span style="font-size:14px">📅</span><span style="font-size:12px;color:#fff;font-weight:500">${diff} days to your exam — keep going!</span></div>`:'';}return '';})()}
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:6px">
          <span style="color:rgba(255,255,255,.85)">Overall Progress</span><span style="color:#fff;font-weight:500">${pct}%</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,.25);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:#fff;border-radius:3px;transition:width .5s"></div>
        </div>
        <div style="font-size:11px;color:rgba(255,255,255,.65);margin-top:6px">${doneCount} of ${TOTAL_LESSONS} lessons completed</div>
      </div>
    </div>

    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <div style="font-size:12px;font-weight:500;color:#888;letter-spacing:.5px">ALL SECTIONS</div>
    </div>
    ${sectCards}
    <div style="height:20px"></div>
  </div>`;
}

// ─── FEEDBACK SCREEN ──────────────────────────────────────────────────────────
function loadFeedbackFull(){try{const d=localStorage.getItem('cma-feedback-full-v1');return d?JSON.parse(d):{r1:0,r2:0,r3:0,r4:0,recommend:'',source:'',hardSection:'',contentWish:[],comments:'',improvements:''};}catch{return{r1:0,r2:0,r3:0,r4:0,recommend:'',source:'',hardSection:'',contentWish:[],comments:'',improvements:''};}}
function saveFeedbackFull(d){try{localStorage.setItem('cma-feedback-full-v1',JSON.stringify(d));}catch{}
  if(STATE.user){db.collection('feedback').doc(STATE.user.uid).set(d).catch(()=>{});}}

function setStarRating(field,n){
  const fb=loadFeedbackFull();fb[field]=n;saveFeedbackFull(fb);
  [1,2,3,4,5].forEach(i=>{const el=document.getElementById(`star-${field}-${i}`);if(el){el.textContent=i<=n?'⭐':'☆';el.style.opacity=i<=n?'1':'0.3';}});
}
function toggleWish(val){
  const fb=loadFeedbackFull();
  if(!fb.contentWish)fb.contentWish=[];
  const idx=fb.contentWish.indexOf(val);
  if(idx>-1)fb.contentWish.splice(idx,1);else fb.contentWish.push(val);
  saveFeedbackFull(fb);
  const el=document.getElementById(`wish-${val.replace(/\s/g,'-')}`);
  if(el){el.style.background=fb.contentWish.includes(val)?'var(--brand-2)':'var(--surface-3)';el.style.color=fb.contentWish.includes(val)?'#fff':'#555';el.style.border=fb.contentWish.includes(val)?'1px solid var(--brand-2)':'.5px solid var(--border-4)';}
}
function submitFeedback(){
  const fb=loadFeedbackFull();
  const get=id=>document.getElementById(id)?.value?.trim()||'';
  const rec=document.querySelector('input[name="recommend"]:checked')?.value||'';
  fb.recommend=rec;fb.source=get('fb-source');fb.hardSection=get('fb-hard');
  fb.comments=get('fb-comments');fb.improvements=get('fb-improvements');
  const missing=[];
  if(!fb.r1||!fb.r2||!fb.r3||!fb.r4)missing.push('All star ratings');
  if(!fb.recommend)missing.push('Recommendation');
  if(!fb.source)missing.push('How you found the course');
  if(!fb.hardSection)missing.push('Hardest section');
  if(!fb.contentWish||fb.contentWish.length===0)missing.push('Content wishlist (select at least one)');
  if(!fb.comments)missing.push('Comments');
  if(!fb.improvements)missing.push('Areas of improvement');
  if(missing.length>0){showModal({icon:'📋',title:'Almost There!',body:'Please complete the following before submitting:',list:missing,type:'warning',confirmText:'Got it'});return;}
  saveFeedbackFull(fb);
  const st=loadStudent();
  sendToSheet({name:st?.name||'',mobile:st?.mobile||'',email:st?.email||'',country:st?.country||'',university:st?.university||'',faculty:st?.faculty||'',gradyear:st?.gradyear||'',title:st?.title||'',company:st?.company||'',experience:st?.experience||'',level:st?.level||'',goal:st?.goal||'',examdate:st?.examdate||'',rating_explanation:fb.r1,rating_difficulty:fb.r2,rating_clarity:fb.r3,rating_ux:fb.r4,recommend:fb.recommend,source:fb.source,hardSection:fb.hardSection,contentWish:(fb.contentWish||[]).join(', '),comments:fb.comments,improvements:fb.improvements,photo:st?.photo||''});
  showToast('Thank you for your feedback! 🎉','success');render();
}

function renderFeedback(){
  const fb=loadFeedbackFull();
  const RATINGS=[{key:'r1',label:'Quality of explanation'},
    {key:'r2',label:'Difficulty of quiz questions'},
    {key:'r3',label:'Clarity of content'},
    {key:'r4',label:'Ease of use'}];
  const WISHES=['Video explanations','More MCQs','Full practice exams','Formula sheets','Arabic content','Case studies','Mock exam timer','Downloadable PDF notes'];
  const SECTIONS=['External Financial Reporting','Planning, Budgeting & Forecasting','Performance Management','Cost Management','Internal Controls','Technology & Analytics'];
  const SOURCES=['Friend referral','LinkedIn','WhatsApp group','Google search','Facebook','YouTube','Other'];

  const starRows=RATINGS.map(r=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:.5px solid var(--bg)">
      <span style="font-size:13px;color:#555;flex:1">${r.label}</span>
      <div style="display:flex;gap:4px">
        ${[1,2,3,4,5].map(i=>`<span id="star-${r.key}-${i}" onclick="setStarRating('${r.key}',${i})" style="font-size:22px;cursor:pointer;opacity:${(fb[r.key]||0)>=i?1:0.3}">${(fb[r.key]||0)>=i?'⭐':'☆'}</span>`).join('')}
      </div>
    </div>`).join('');

  const wishBtns=WISHES.map(w=>{
    const active=(fb.contentWish||[]).includes(w);
    return`<button id="wish-${w.replace(/\s/g,'-')}" onclick="toggleWish('${w}')" style="padding:8px 12px;border-radius:20px;font-size:12px;cursor:pointer;font-family:inherit;font-weight:500;background:${active?'var(--brand-2)':'var(--surface-3)'};color:${active?'#fff':'#555'};border:${active?'1px solid var(--brand-2)':'.5px solid var(--border-4)'}">${w}</button>`;
  }).join('');

  const isSubmitted=fb.comments&&fb.recommend&&fb.source&&fb.hardSection&&fb.r1&&fb.r2&&fb.r3&&fb.r4;

  return`${renderSubNav(SUB_ME,'feedback')}<div class="sh"><h2>Feedback & Suggestions</h2><p>Your feedback helps improve the course for everyone</p></div>
  <div class="scroll-area pad" style="padding-top:14px">

    ${isSubmitted?`<div style="background:var(--ok-tint);border:1px solid var(--ok);border-radius:12px;padding:12px 16px;margin-bottom:14px;display:flex;gap:10px;align-items:center">
      <span style="font-size:20px">✅</span>
      <div><div style="font-size:13px;font-weight:500;color:var(--ok-strong)">Feedback submitted — thank you!</div>
      <div style="font-size:12px;color:var(--ok-strong-2);margin-top:2px">You can update your feedback anytime below.</div></div>
    </div>`:''}

    <div class="info-title" style="font-size:14px;margin-bottom:10px">⭐ Rate the Course <span style="font-size:11px;color:var(--err-2);font-weight:400">· required</span></div>
    <div class="card" style="margin-bottom:14px">${starRows}</div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">👍 Would you recommend this course? <span style="font-size:11px;color:var(--err-2);font-weight:400">· required</span></div>
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;flex-direction:column;gap:8px">
        ${[['yes100','Yes, 100%!','var(--ok-tint)','var(--ok-strong)','var(--ok)'],['yes','Yes, most likely','var(--surface-3)','var(--ink)','var(--border-4)'],['maybe','Maybe','var(--warn-tint)','var(--warn-strong)','var(--warn)'],['no','Not yet','var(--err-tint)','var(--err-strong)','var(--err)']].map(([val,lbl,bg,tc,bc])=>`
        <label style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${fb.recommend===val?bg:'var(--surface-2)'};border:.5px solid ${fb.recommend===val?bc:'var(--border)'};cursor:pointer">
          <input type="radio" name="recommend" value="${val}" ${fb.recommend===val?'checked':''} style="flex-shrink:0" onchange="const f=loadFeedbackFull();f.recommend='${val}';saveFeedbackFull(f);render()">
          <span style="font-size:13px;color:${fb.recommend===val?tc:'#555'};font-weight:${fb.recommend===val?'500':'400'}">${lbl}</span>
        </label>`).join('')}
      </div>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">🔍 How did you find this course? <span style="font-size:11px;color:var(--err-2);font-weight:400">· required</span></div>
    <div class="card" style="margin-bottom:14px">
      <select id="fb-source" onchange="const f=loadFeedbackFull();f.source=this.value;saveFeedbackFull(f)" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink)">
        <option value="">Select...</option>
        ${SOURCES.map(s=>`<option value="${s}" ${fb.source===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">😓 Hardest section for you? <span style="font-size:11px;color:var(--err-2);font-weight:400">· required</span></div>
    <div class="card" style="margin-bottom:14px">
      <select id="fb-hard" onchange="const f=loadFeedbackFull();f.hardSection=this.value;saveFeedbackFull(f)" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink)">
        <option value="">Select section...</option>
        ${SECTIONS.map(s=>`<option value="${s}" ${fb.hardSection===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">🎯 What content would you like added? <span style="font-size:11px;color:var(--err-2);font-weight:400">· select at least one</span></div>
    <div class="card" style="margin-bottom:14px">
      <div style="display:flex;flex-wrap:wrap;gap:8px">${wishBtns}</div>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">💬 Comments & Overall Feedback <span style="font-size:11px;color:var(--err-2);font-weight:400">· required</span></div>
    <div class="card" style="margin-bottom:14px">
      <textarea id="fb-comments" rows="4" placeholder="Share your thoughts about the course, content, instructor, and your learning experience..." style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink);resize:none;line-height:1.5">${fb.comments||''}</textarea>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">🔧 Areas of Improvement <span style="font-size:11px;color:var(--err-2);font-weight:400">· required</span></div>
    <div class="card" style="margin-bottom:14px">
      <textarea id="fb-improvements" rows="4" placeholder="What can be added or improved? More examples? Different teaching style? Better explanations for specific topics?" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink);resize:none;line-height:1.5">${fb.improvements||''}</textarea>
    </div>

    <button onclick="submitFeedback()" class="btn" style="background:var(--brand);color:#fff;font-size:15px;margin-bottom:8px">
      ${isSubmitted?'Update Feedback ✓':'Submit Feedback →'}
    </button>
    <div style="height:20px"></div>
  </div>`;
}


// ─── COMMUNITY ────────────────────────────────────────────────────────────────

function isInstructor(){return STATE.user&&STATE.user.uid===INSTRUCTOR_UID;}

function timeAgo(ts){
  if(!ts)return'';
  const diff=Date.now()-new Date(ts).getTime();
  const mins=Math.floor(diff/60000);
  if(mins<1)return'Just now';
  if(mins<60)return`${mins}m ago`;
  const hrs=Math.floor(mins/60);
  if(hrs<24)return`${hrs}h ago`;
  const days=Math.floor(hrs/24);
  if(days<7)return`${days}d ago`;
  return new Date(ts).toLocaleDateString();
}

// Pagination fix: removed orderBy('createdAt') from Firestore query — it requires a
// composite index that doesn't exist. Instead we fetch with .limit() only (no index needed)
// and sort client-side by createdAt string, which works correctly for ISO date strings.
// Community questions — paginated, no orderBy (avoids composite index requirement).
// Sorted client-side. "Load More" fetches a larger page.
const COMMUNITY_PAGE = 20;

async function loadQuestions(append=false){
  if(STATE.communityLoading)return;
  STATE.communityLoading=true;
  if(!append){
    STATE.communityQuestions=[];
    STATE.communityLastDoc=null;
    STATE.communityHasMore=false;
  }
  // Cursor-based pagination: order on the server, page with startAfter(lastDoc).
  // createdAt is an ISO-8601 string, which sorts chronologically under orderBy.
  try{
    let q=db.collection('questions');
    if(STATE.communityFilter!=='all') q=q.where('section','==',STATE.communityFilter);
    q=q.orderBy('createdAt','desc');
    if(append && STATE.communityLastDoc) q=q.startAfter(STATE.communityLastDoc);
    q=q.limit(COMMUNITY_PAGE+1);
    const snap=await q.get();
    const docs=snap.docs;
    STATE.communityHasMore=docs.length>COMMUNITY_PAGE;
    const pageDocs=docs.slice(0,COMMUNITY_PAGE);          // drop the +1 lookahead
    if(pageDocs.length) STATE.communityLastDoc=pageDocs[pageDocs.length-1]; // cursor = real DocumentSnapshot
    const mapped=pageDocs.map(d=>({id:d.id,...d.data()}));
    STATE.communityQuestions = append ? STATE.communityQuestions.concat(mapped) : mapped;
  }catch(e){
    console.error('Community load error:',e);
    showToast('Could not load questions. Check your connection.','error');
  }
  STATE.communityLoading=false;
  STATE.communityLoaded=true;
  render();
}

async function loadMoreQuestions(){
  await loadQuestions(true);
}

async function loadReplies(qId){
  try{
    const snap=await db.collection('questions').doc(qId).collection('replies').orderBy('createdAt','asc').get();
    STATE.questionReplies=snap.docs.map(d=>({id:d.id,...d.data()}));
    render();
  }catch(e){console.log('Load replies error:',e);}
}

async function postQuestion(){
  const title=STATE.draftTitle.trim();
  const body=STATE.draftBody.trim();
  const section=STATE.draftSection||'General';
  if(!title||!body){showToast('Please enter both a title and description for your question.','warning');return;}
  const st=loadStudent();
  const btn=document.getElementById('post-q-btn');
  if(btn){btn.disabled=true;btn.textContent='Posting...';}
  try{
    const photoUrl=st?.photo&&st.photo.startsWith('http')?st.photo:'';
    await db.collection('questions').add({
      title,body,section,
      authorId:STATE.user.uid,
      authorName:st?.name||STATE.user.displayName||'Student',
      authorPhoto:photoUrl,
      createdAt:new Date().toISOString(),
      replyCount:0,upvotes:[],
    });
    STATE.showAskForm=false;
    STATE.draftTitle='';STATE.draftBody='';STATE.draftSection='General';
    await loadQuestions();
  }catch(e){showToast('Error posting question: '+e.message,'error');if(btn){btn.disabled=false;btn.textContent='Post Question';}}
}

async function postReply(qId){
  const body=STATE.draftReply.trim();
  if(!body){showToast('Please write your reply first.','warning');return;}
  const st=loadStudent();
  const btn=document.getElementById('post-reply-btn');
  if(btn){btn.disabled=true;btn.textContent='Posting...';}
  try{
    const rPhotoUrl=st?.photo&&st.photo.startsWith('http')?st.photo:'';
    await db.collection('questions').doc(qId).collection('replies').add({
      body,
      authorId:STATE.user.uid,
      authorName:st?.name||STATE.user.displayName||'Student',
      authorPhoto:rPhotoUrl,
      createdAt:new Date().toISOString(),
      isBestAnswer:false,
      upvotes:[],
    });
    await db.collection('questions').doc(qId).update({replyCount:firebase.firestore.FieldValue.increment(1)});
    STATE.draftReply='';
    await loadReplies(qId);
    // Update reply count in question list
    const qIdx=STATE.communityQuestions.findIndex(q=>q.id===qId);
    if(qIdx>-1)STATE.communityQuestions[qIdx].replyCount=(STATE.communityQuestions[qIdx].replyCount||0)+1;
  }catch(e){showToast('Error posting reply.','error');if(btn){btn.disabled=false;btn.textContent='Post Reply';}}
}

async function upvoteQuestion(qId,e){
  e.stopPropagation();
  const uid=STATE.user.uid;
  const q=STATE.communityQuestions.find(q=>q.id===qId);
  if(!q)return;
  const upvotes=q.upvotes||[];
  const newUpvotes=upvotes.includes(uid)?upvotes.filter(u=>u!==uid):[...upvotes,uid];
  try{
    await db.collection('questions').doc(qId).update({upvotes:newUpvotes});
    q.upvotes=newUpvotes;render();
  }catch(e){console.log('Upvote error:',e);}
}

async function upvoteReply(qId,rId){
  const uid=STATE.user.uid;
  const r=STATE.questionReplies.find(r=>r.id===rId);
  if(!r)return;
  const upvotes=r.upvotes||[];
  const newUpvotes=upvotes.includes(uid)?upvotes.filter(u=>u!==uid):[...upvotes,uid];
  try{
    await db.collection('questions').doc(qId).collection('replies').doc(rId).update({upvotes:newUpvotes});
    r.upvotes=newUpvotes;render();
  }catch(e){console.log('Upvote reply error:',e);}
}

async function setBestAnswer(qId,rId){
  try{
    const batch=db.batch();
    STATE.questionReplies.forEach(r=>{
      batch.update(db.collection('questions').doc(qId).collection('replies').doc(r.id),{isBestAnswer:r.id===rId});
    });
    await batch.commit();
    STATE.questionReplies.forEach(r=>r.isBestAnswer=r.id===rId);
    render();
  }catch(e){showToast('Error setting best answer.','error');}
}

async function deleteQuestion(qId,e){
  e.stopPropagation();
  const _delQ=await showModal({icon:'🗑️',title:'Delete Question?',body:'This will permanently remove the question and all its replies.',type:'danger',confirmText:'Delete',cancelText:'Cancel'});
  if(!_delQ)return;
  try{
    const replies=await db.collection('questions').doc(qId).collection('replies').get();
    const batch=db.batch();
    replies.docs.forEach(d=>batch.delete(d.ref));
    batch.delete(db.collection('questions').doc(qId));
    await batch.commit();
    STATE.communityQuestions=STATE.communityQuestions.filter(q=>q.id!==qId);
    render();
  }catch(e){showToast('Error deleting question.','error');}
}

async function deleteReply(qId,rId){
  const _delR=await showModal({icon:'🗑️',title:'Delete Reply?',body:'This reply will be permanently removed.',type:'danger',confirmText:'Delete',cancelText:'Cancel'});
  if(!_delR)return;
  try{
    await db.collection('questions').doc(qId).collection('replies').doc(rId).delete();
    await db.collection('questions').doc(qId).update({replyCount:firebase.firestore.FieldValue.increment(-1)});
    STATE.questionReplies=STATE.questionReplies.filter(r=>r.id!==rId);
    const qIdx=STATE.communityQuestions.findIndex(q=>q.id===qId);
    if(qIdx>-1)STATE.communityQuestions[qIdx].replyCount=Math.max(0,(STATE.communityQuestions[qIdx].replyCount||1)-1);
    render();
  }catch(e){showToast('Error deleting reply.','error');}
}

function openQuestion(q){
  STATE.questionDetail=q;STATE.tab='question-detail';
  STATE.questionReplies=[];
  render();
  loadReplies(q.id);
}
function openQuestionById(id){
  const q=STATE.communityQuestions.find(x=>x.id===id);
  if(q)openQuestion(q);
}

function renderCommunity(){
  const SECTS=['All','External Financial Reporting','Planning, Budgeting & Forecasting','Performance Management','Cost Management','Internal Controls','Technology & Analytics'];
  const filterBtns=SECTS.map((s,i)=>{
    const val=i===0?'all':s;
    const active=STATE.communityFilter===val;
    return`<button onclick="STATE.communityFilter='${val}';loadQuestions()" style="padding:6px 12px;border-radius:20px;font-size:12px;cursor:pointer;font-family:inherit;white-space:nowrap;font-weight:${active?'500':'400'};background:${active?'var(--brand)':'var(--surface-3)'};color:${active?'#fff':'#555'};border:${active?'1px solid var(--brand)':'.5px solid var(--border-4)'}">${i===0?'All':s.split(' ')[0]+'...'}</button>`;
  }).join('');

  const questions=STATE.communityQuestions;
  const qCards=questions.length===0
    ?`<div style="text-align:center;padding:40px 20px;color:#aaa">
        <div style="font-size:40px;margin-bottom:12px">💬</div>
        <div style="font-size:15px;font-weight:500;margin-bottom:6px">No questions yet</div>
        <div style="font-size:13px">Be the first to ask a question!</div>
      </div>`
    :questions.map(q=>{
      const upvoted=(q.upvotes||[]).includes(STATE.user?.uid);
      const isOwner=STATE.user?.uid===q.authorId;
      return`<div onclick="openQuestionById('${q.id}')" class="card" style="cursor:pointer;margin-bottom:10px">
        <div style="display:flex;align-items:flex-start;gap:10px">
          <div style="width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--brand-tint);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;color:var(--brand)">
           ${safePhotoURL(q.authorPhoto)?`<img src="${safePhotoURL(q.authorPhoto)}" style="width:100%;height:100%;object-fit:cover">`:q.authorName?.charAt(0)||'?'}
          </div>
          <div style="flex:1;min-width:0">
            <div style="font-size:14px;font-weight:500;color:var(--ink);line-height:1.4;margin-bottom:4px">${esc(q.title)}</div>
            <div style="font-size:12px;color:#888;margin-bottom:8px">${esc(q.authorName)} · ${timeAgo(q.createdAt)}</div>
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:11px;padding:2px 8px;border-radius:10px;background:var(--brand-tint);color:var(--brand-2);font-weight:500">${esc(q.section||'General')}</span>
              <span style="font-size:12px;color:#888">💬 ${q.replyCount||0} replies</span>
              <span onclick="upvoteQuestion('${q.id}',event)" style="font-size:12px;color:${upvoted?'var(--brand-2)':'#888'};cursor:pointer;font-weight:${upvoted?'500':'400'}">⬆️ ${(q.upvotes||[]).length}</span>
              ${(isOwner||isInstructor())?`<span onclick="deleteQuestion('${q.id}',event)" style="font-size:12px;color:var(--err);cursor:pointer;margin-left:auto">🗑️ Delete</span>`:''}
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

  const askForm=STATE.showAskForm?`
    <div class="card" style="margin-bottom:14px;border-color:var(--brand-2);border-width:1px">
      <div style="font-size:14px;font-weight:500;color:var(--brand);margin-bottom:12px">✏️ Ask a Question</div>
      <div style="margin-bottom:10px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Question Title *</label>
        <input id="q-title" type="text" value="${esc(STATE.draftTitle)}" oninput="STATE.draftTitle=this.value" placeholder="e.g. How do I calculate Break-Even Point?" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink)">
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Description *</label>
        <textarea id="q-body" rows="3" oninput="STATE.draftBody=this.value" placeholder="Explain your question in detail..." style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink);resize:none;line-height:1.5">${esc(STATE.draftBody)}</textarea>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Related Section</label>
        <select id="q-section" onchange="STATE.draftSection=this.value" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink)">
          <option value="General" ${STATE.draftSection==='General'?'selected':''}>General</option>
          ${['External Financial Reporting','Planning, Budgeting & Forecasting','Performance Management','Cost Management','Internal Controls','Technology & Analytics'].map(s=>`<option value="${s}" ${STATE.draftSection===s?'selected':''}>${s}</option>`).join('')}
        </select>
      </div>
      <div style="display:flex;gap:8px">
        <button onclick="STATE.showAskForm=false;render()" class="btn btn-outline" style="flex:1;padding:11px">Cancel</button>
        <button id="post-q-btn" onclick="postQuestion()" class="btn" style="flex:2;padding:11px;background:var(--brand);color:#fff">Post Question</button>
      </div>
    </div>`:
    `<button onclick="STATE.showAskForm=true;render()" class="btn" style="background:var(--brand);color:#fff;margin-bottom:14px">
      ✏️ Ask a Question
    </button>`;

  // Trigger initial load — guard against double-calling using communityLoading state
  if(!STATE.communityLoaded&&!STATE.communityLoading&&!STATE.showAskForm){
    setTimeout(()=>loadQuestions(),0);
  }

  return`<div class="sh" style="padding-bottom:10px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <div><h2 style="font-size:18px;font-weight:500">Community Q&A</h2>
      <p style="font-size:12px;color:#888;margin-top:2px">Ask questions · Help each other · Learn together</p></div>
    </div>
  </div>
  <div style="padding:10px 16px;border-bottom:.5px solid var(--border);overflow-x:auto;display:flex;gap:6px;flex-shrink:0;scrollbar-width:none">${filterBtns}</div>
  <div class="scroll-area pad" style="padding-top:14px">
    ${askForm}
    <div style="font-size:12px;font-weight:500;color:#888;margin-bottom:10px;letter-spacing:.5px">${questions.length} QUESTION${questions.length!==1?'S':''}</div>
    ${STATE.communityLoading&&questions.length===0
      ?`<div style="text-align:center;padding:40px 20px;color:#aaa"><div style="font-size:28px;margin-bottom:8px">⏳</div><div style="font-size:13px">Loading questions...</div></div>`
      :qCards
    }
    ${STATE.communityHasMore
      ?`<button onclick="loadMoreQuestions()" class="btn btn-outline" style="margin-top:4px;margin-bottom:6px">
          ${STATE.communityLoading?'Loading...':'Load More Questions'}
        </button>`
      :''
    }
    <div style="height:20px"></div>
  </div>`;
}

function renderQuestionDetail(){
  const q=STATE.questionDetail;
  if(!q)return'';
  const replies=STATE.questionReplies;
  const bestAnswer=replies.find(r=>r.isBestAnswer);
  const otherReplies=replies.filter(r=>!r.isBestAnswer);

  const replyCard=(r)=>{
    const upvoted=(r.upvotes||[]).includes(STATE.user?.uid);
    const isOwner=STATE.user?.uid===r.authorId;
    return`<div style="background:${r.isBestAnswer?'var(--ok-tint)':'var(--surface-2)'};border:${r.isBestAnswer?'1px solid var(--ok)':'.5px solid var(--border)'};border-radius:10px;padding:12px 14px;margin-bottom:10px">
      ${r.isBestAnswer?`<div style="font-size:11px;font-weight:500;color:var(--ok-strong);margin-bottom:8px">✅ BEST ANSWER</div>`:''}
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <div style="width:28px;height:28px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--brand-tint);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:500;color:var(--brand)">
          ${safePhotoURL(r.authorPhoto)?`<img src="${safePhotoURL(r.authorPhoto)}" style="width:100%;height:100%;object-fit:cover">`:r.authorName?.charAt(0)||'?'}
        </div>
        <div>
          <div style="font-size:13px;font-weight:500;color:var(--ink)">${esc(r.authorName||'Student')}</div>
          <div style="font-size:11px;color:#888">${timeAgo(r.createdAt)}</div>
        </div>
        ${(isOwner||isInstructor())?`<button onclick="deleteReply('${q.id}','${r.id}')" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:13px;color:var(--err);font-family:inherit">🗑️</button>`:''}
      </div>
      <div style="font-size:14px;color:#333;line-height:1.6;white-space:pre-wrap;margin-bottom:10px">${esc(r.body)}</div>
      <div style="display:flex;align-items:center;gap:10px">
        <button onclick="upvoteReply('${q.id}','${r.id}')" style="background:none;border:none;cursor:pointer;font-size:12px;color:${upvoted?'var(--brand-2)':'#888'};font-family:inherit;font-weight:${upvoted?'500':'400'}">⬆️ ${(r.upvotes||[]).length} helpful</button>
        ${isInstructor()&&!r.isBestAnswer?`<button onclick="setBestAnswer('${q.id}','${r.id}')" style="background:none;border:none;cursor:pointer;font-size:12px;color:var(--ok-strong-2);font-family:inherit;font-weight:500">✅ Mark as Best Answer</button>`:''}
      </div>
    </div>`;
  };

  return`<div class="bh">
    <button class="bh-back" onclick="STATE.tab='community';STATE.questionDetail=null;render()">‹</button>
    <div style="min-width:0">
      <div style="font-size:11px;color:var(--brand-2);font-weight:500">${esc(q.section||'General')}</div>
      <div class="ellipsis" style="font-size:14px;font-weight:500">${esc(q.title)}</div>
    </div>
  </div>
  <div class="scroll-area pad" style="padding-top:14px">
    <!-- Question -->
    <div class="card" style="margin-bottom:16px;border-color:var(--brand-2)30">
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
        <div style="width:36px;height:36px;border-radius:50%;overflow:hidden;flex-shrink:0;background:var(--brand-tint);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:500;color:var(--brand)">
          ${safePhotoURL(q.authorPhoto)?`<img src="${safePhotoURL(q.authorPhoto)}" style="width:100%;height:100%;object-fit:cover">`:q.authorName?.charAt(0)||'?'}
        </div>
        <div>
          <div style="font-size:13px;font-weight:500">${esc(q.authorName||'Student')}</div>
          <div style="font-size:11px;color:#888">${timeAgo(q.createdAt)}</div>
        </div>
      </div>
      <div style="font-size:15px;font-weight:500;color:var(--ink);line-height:1.5;margin-bottom:8px">${esc(q.title)}</div>
      <div style="font-size:14px;color:#555;line-height:1.65;white-space:pre-wrap">${esc(q.body)}</div>
    </div>

    <!-- Best Answer first -->
    ${bestAnswer?`<div style="font-size:12px;font-weight:500;color:var(--ok-strong);margin-bottom:8px;letter-spacing:.5px">✅ BEST ANSWER</div>${replyCard(bestAnswer)}`:''}

    <!-- Other Replies -->
    ${otherReplies.length>0?`<div style="font-size:12px;font-weight:500;color:#888;margin-bottom:8px;letter-spacing:.5px">${otherReplies.length} REPL${otherReplies.length!==1?'IES':'Y'}</div>${otherReplies.map(replyCard).join('')}`:''}
    ${replies.length===0?`<div style="text-align:center;padding:20px;color:#aaa;font-size:13px">No replies yet — be the first to help!</div>`:''}

    <!-- Reply form -->
    <div style="background:var(--surface-2);border:.5px solid var(--border);border-radius:10px;padding:14px;margin-top:6px">
      <div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:8px">Write a Reply</div>
      <textarea id="reply-body" rows="3" oninput="STATE.draftReply=this.value" placeholder="Share your answer or thoughts..." style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:#fff;color:var(--ink);resize:none;line-height:1.5;margin-bottom:10px">${esc(STATE.draftReply)}</textarea>
      <button id="post-reply-btn" onclick="postReply('${q.id}')" class="btn" style="background:var(--brand);color:#fff;padding:11px">Post Reply</button>
    </div>
    <div style="height:20px"></div>
  </div>`;
}



// ─── TRACKER ──────────────────────────────────────────────────────────────────
function loadTracker(){try{const d=localStorage.getItem('cma-tracker-v1');return d?JSON.parse(d):{};} catch{return{};}}
function saveTracker(d){
  try{localStorage.setItem('cma-tracker-v1',JSON.stringify(d));}catch{}
  if(STATE.user){db.collection('tracker').doc(STATE.user.uid).set(d).catch(()=>{});}
}

function setTrackerValue(lessonId,val){
  const t=loadTracker();
  if(t[lessonId]===val){delete t[lessonId];}else{t[lessonId]=val;}
  saveTracker(t);
  render();
}

// Batch 6 · Item E — leaderboard anti-spoof caps (client side).
// Firestore rules now enforce hard ceilings (lessons<=TOTAL_LESSONS,
// mcqTotal<=50000). This client-side clamp keeps writes inside those bounds
// so a data-corruption bug can't produce a rejected write and lock the LB.
// Server-side scoring via Cloud Function is still the correct long-term fix
// (Batch 3-A) — this hardening is the interim.
async function syncLeaderboard(){
  if(!STATE.user||!db)return;
  const{progress}=STATE;const st=loadStudent();
  if(!st||!st.name)return;
  const _clamp=(n,lo,hi)=>Math.max(lo,Math.min(hi,Number(n)||0));
  const _lessons=_clamp(progress.done.length,0,TOTAL_LESSONS);
  const _mcqTotal=_clamp(progress.mcqTotal||0,0,50000);
  const _mcqRight=_clamp(progress.mcqRight||0,0,_mcqTotal);
  const _acc=_clamp(getAcc(),0,100);
  const score={
    name:String(st.name).slice(0,60),
    country:String(st.country||'').slice(0,40),
    lessons:_lessons,
    accuracy:_acc,
    mcqTotal:_mcqTotal,
    mcqRight:_mcqRight,
    verified:false,           // reserved: server-scored entries will set true
    updatedAt:new Date().toISOString()
  };
  try{await db.collection('leaderboard').doc(STATE.user.uid).set(score);}catch(e){console.log('LB sync error',e);}
}

function renderLeaderboard(){
  const lb=STATE.leaderboardData||[];
  const st=loadStudent();
  const myUid=STATE.user?.uid;
  const myRank=lb.findIndex(e=>e.uid===myUid)+1;
  
  if(!STATE.leaderboardLoaded){
    STATE.leaderboardLoaded=true;
    // Sync own score then fetch
    syncLeaderboard().then(()=>{
      if(!db)return;
      db.collection('leaderboard').orderBy('lessons','desc').limit(50).get().then(snap=>{
        STATE.leaderboardData=snap.docs.map(d=>({uid:d.id,...d.data()}));
        render();
      }).catch(e=>console.log('LB fetch error',e));
    });
    return`${renderSubNav(SUB_PROGRESS,'leaderboard')}<div class="sh"><h2>Leaderboard</h2><p>Top CMA students</p></div>
    <div class="scroll-area" style="display:flex;align-items:center;justify-content:center;height:60%">
      <div style="text-align:center;color:#aaa"><div style="font-size:36px;margin-bottom:10px">⏳</div><div>Loading leaderboard...</div></div>
    </div>`;
  }
  
  return`${renderSubNav(SUB_PROGRESS,'leaderboard')}<div class="sh"><h2>Leaderboard</h2><p>Top ${lb.length} CMA students</p></div>
  <div class="scroll-area pad" style="padding-top:14px">
    ${myRank>0?`<div style="background:var(--warn-tint);border:1px solid var(--warn)30;border-radius:10px;padding:10px 14px;margin-bottom:14px;display:flex;align-items:center;gap:10px">
      <span style="font-size:20px">🎯</span>
      <div><div style="font-size:13px;font-weight:500;color:var(--warn-strong)">Your Rank: #${myRank}</div><div style="font-size:11px;color:#BA7517">${lb.find(e=>e.uid===myUid)?.lessons||0} lessons · ${getAcc()}% accuracy</div></div>
    </div>`:''}
    ${lb.map((entry,i)=>{
      const isMe=entry.uid===myUid;
      const medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':`${i+1}`;
      return`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:.5px solid var(--bg);${isMe?'background:var(--warn-tint);border-radius:8px;padding:10px 10px;margin:-2px -2px;':''} ">
        <div style="font-size:${i<3?'20':'14'}px;font-weight:500;min-width:28px;text-align:center">${medal}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;color:var(--ink)${isMe?';color:var(--warn-strong)':''}">${esc(entry.name||'Student')}${isMe?' (You)':''}</div>
          <div style="font-size:11px;color:#888">${entry.country||''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:13px;font-weight:500;color:var(--brand)">${entry.lessons||0} lessons</div>
          <div style="font-size:11px;color:#888">${entry.accuracy||0}% accuracy</div>
        </div>
      </div>`;
    }).join('')}
    <div style="text-align:center;margin-top:14px">
      <button class="btn btn-outline" onclick="STATE.leaderboardLoaded=false;STATE.leaderboardData=[];render()" style="font-size:12px">🔄 Refresh</button>
    </div>
    <div style="height:20px"></div>
  </div>`;
}

function buildQuizModeQuestions(sectionId){
  const allQ=[];
  const sections=sectionId?S.filter(s=>s.id===sectionId):S;
  sections.forEach(sec=>{
    sec.lessons.forEach(l=>{
      l.quizzes.forEach(q=>{
        if(isOutOfScopeQ(l,q))return;   // Batch 10: exclude Part-2 content from Quiz Mode
        allQ.push({...q,lessonId:l.id,sectionId:sec.id,lessonTitle:l.title,sectionTitle:sec.title,secEmoji:sec.emoji,secBar:sec.bar,secBg:sec.bg,secText:sec.text,secStrong:sec.strong});
      });
    });
  });
  // Shuffle
  for(let i=allQ.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[allQ[i],allQ[j]]=[allQ[j],allQ[i]];}
  return allQ.slice(0,sectionId?Math.min(allQ.length,50):Math.min(allQ.length,100));
}

async function startQuizMode(sectionId){
  STATE.tab='loading';render();
  if(sectionId){await ensureQuizzes(sectionId);}
  else{await Promise.all([1,2,3,4,5,6].map(i=>ensureQuizzes(i)));}
  const questions=buildQuizModeQuestions(sectionId);
  if(!questions.length){showToast('No questions available for this section yet.','info');return;}
  STATE.quizMode={active:true,sectionId,idx:0,questions,answers:[],selected:null,done:false,questionTimes:[],quizStartTime:Date.now(),qTimerStart:Date.now(),qTimerElapsed:null};
  STATE.tab='quiz-mode';render();
}

function selectQuizModeAnswer(i){
  const qm=STATE.quizMode; if(!qm) return;
  if(qm.answers[qm.idx]) return;              // already answered -> read-only
  stopQTimer();
  const elapsed=Date.now()-qm.qTimerStart;
  qm.questionTimes[qm.idx]=elapsed; qm.qTimerElapsed=elapsed;
  const q=qm.questions[qm.idx];
  qm.answers[qm.idx]={selected:i,correct:i===q.a};
  qm.selected=i;
  render();
}

function quizModeGoto(i){
  const qm=STATE.quizMode; if(!qm) return;
  const n=qm.questions.length; if(i<0)i=0; if(i>=n)i=n-1;
  qm.idx=i;
  const a=qm.answers[i];
  qm.selected=a?a.selected:null;
  if(a){ qm.qTimerElapsed=qm.questionTimes[i]||0; } else { qm.qTimerStart=Date.now(); qm.qTimerElapsed=null; }
  render();
}
function quizModeNav(dir){ const qm=STATE.quizMode; if(qm) quizModeGoto(qm.idx+dir); }
function quizModeJump(i){ quizModeGoto(i); }
function nextQuizModeQuestion(){ quizModeNav(1); }   // back-compat alias

async function finishQuizMode(){
  const qm=STATE.quizMode; if(!qm) return;
  const n=qm.questions.length;
  let unanswered=0; for(let i=0;i<n;i++) if(!qm.answers[i]) unanswered++;
  if(unanswered>0){
    const ok=await showModal({icon:'\u23ED\uFE0F',type:'warning',
      title:unanswered+' question'+(unanswered>1?'s':'')+' unanswered',
      body:"They'll be marked incorrect. Finish anyway, or go back and answer them?",
      confirmText:'Finish anyway', cancelText:'Keep going'});
    if(!ok){ let f=-1; for(let i=0;i<n;i++){ if(!qm.answers[i]){f=i;break;} } if(f>=0) quizModeGoto(f); return; }
  }
  const finalAnswers=[], finalTimes=[];
  for(let i=0;i<n;i++){
    finalAnswers[i]=qm.answers[i]?qm.answers[i]:{selected:null,correct:false,skipped:true};
    finalTimes[i]=qm.questionTimes[i]||0;
  }
  qm.answers=finalAnswers; qm.questionTimes=finalTimes;
  qm.done=true; qm.selected=null; qm.quizEndTime=Date.now();
  if(qm.isGrace){try{grantStreakGrace();STATE._graceActive=false;showToast('\u{1F525} Streak saved \u2014 nice recovery!','success',3500);}catch(e){}}
  render();
}

function renderQuizMode(){
  const qm=STATE.quizMode;
  
  // ── Results screen ──────────────────────────────────────
  if(qm.done){
    const correct=qm.answers.filter(a=>a.correct).length;
    const pct=Math.round(correct/qm.questions.length*100);
    const emoji=pct>=80?'🏆':pct>=60?'👍':'📚';
    const label=pct>=80?'Excellent!':pct>=60?'Good work!':'Keep studying!';
    const breakdown=qm.questions.map((q,i)=>`
      <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;padding-bottom:10px;border-bottom:.5px solid var(--bg)">
        <span style="font-size:15px;flex-shrink:0">${qm.answers[i]?.skipped?'⏭️':(qm.answers[i]?.correct?'✅':'❌')}</span>
        <div>
          <div style="font-size:12px;color:#666;margin-bottom:2px">${esc(q.secEmoji+' '+q.sectionTitle+' — '+q.lessonTitle)}</div>
          <div style="font-size:13px;color:#333;line-height:1.4">${esc(q.q)}</div>
          ${!qm.answers[i]?.correct?`<div style="font-size:12px;color:var(--ok-strong-2);margin-top:3px">✓ ${esc(q.o[q.a])}</div>`:''}
        </div>
      </div>`).join('');
    const qmTimeHTML=totalTimeHTML(qm.quizStartTime,qm.quizEndTime,qm.questionTimes);
    return`<div class="scroll-area" style="padding:30px 16px 20px;text-align:center">
      <div style="font-size:52px">${emoji}</div>
      <div style="font-size:20px;font-weight:500;margin-top:10px">${label}</div>
      <div style="font-size:46px;font-weight:500;color:var(--brand-2);margin:6px 0 2px">${pct}%</div>
      <div style="font-size:14px;color:#888;margin-bottom:16px">${correct} of ${qm.questions.length} correct</div>
      <div style="font-size:12px;color:#aaa;margin-bottom:16px">${qm.sectionId?S.find(s=>s.id===qm.sectionId)?.title+' Quiz':'Full CMA Quiz'}</div>
      ${qmTimeHTML}
      <div style="display:flex;gap:10px;margin-bottom:14px">
        <button class="btn btn-outline" onclick="STATE.tab='quiz-mode-select';render()" style="flex:1">← Back</button>
        <button class="btn" onclick="startQuizMode(${qm.sectionId})" style="flex:1;background:var(--brand);color:#fff">Retake</button>
      </div>
      <div class="card" style="text-align:left;margin-bottom:14px">
        <div style="font-size:13px;font-weight:500;color:#555;margin-bottom:12px">Question Review</div>
        ${breakdown}
      </div>
      <div style="height:20px"></div>
    </div>`;
  }

  // ── Quiz session ────────────────────────────────────────
  const q=qm.questions[qm.idx];const sel=qm.selected;
  const barW=Math.round(qm.idx/qm.questions.length*100);
  const opts=q.o.map((opt,i)=>{
    let bg='var(--surface-3)',border='.5px solid var(--border)',textC='var(--ink)',circBg='var(--border-2)',circC='#666',circBorder='.5px solid #bbb',circTxt=String.fromCharCode(65+i);
    if(sel!==null){if(i===q.a){bg='var(--ok-tint)';border='1px solid var(--ok)';textC='var(--ok-strong)';circBg='#c0dd97';circC='var(--ok-strong)';circBorder='1px solid var(--ok)';circTxt='✓';}
    else if(i===sel&&sel!==q.a){bg='var(--err-tint)';border='1px solid var(--err)';textC='var(--err-strong)';circBg='#f7c1c1';circC='var(--err-strong)';circBorder='1px solid var(--err)';circTxt='✗';}
    else{textC='#888';}}
    return`<div class="q-opt" onclick="selectQuizModeAnswer(${i})" style="background:${bg};border:${border};${sel===null?'cursor:pointer':'cursor:default'}"><div class="q-circle" style="background:${circBg};color:${circC};border:${circBorder}">${circTxt}</div><div class="q-text" style="color:${textC}">${esc(normalizeCase(opt))}</div></div>`;
  }).join('');
  const explanation=sel!==null?`<div style="margin-top:14px;padding:13px 14px;border-radius:10px;background:${sel===q.a?'var(--ok-tint)':'var(--err-tint)'};border:1px solid ${sel===q.a?'var(--ok)':'var(--err)'}"><div style="font-size:12px;font-weight:500;color:${sel===q.a?'var(--ok-strong)':'var(--err-strong)'};margin-bottom:5px">${sel===q.a?'Correct! Well done.':'Not quite — here is why:'}</div><div style="font-size:13px;color:${sel===q.a?'var(--ok-strong-2)':'var(--err-2)'};line-height:1.55">${expInner(q,sel)}</div></div>`:''  ;
  const _qmAnswered=sel!==null;
  const _qmLast=qm.idx+1>=qm.questions.length;
  const _qmBack=`<button class="btn btn-outline" onclick="quizModeNav(-1)" style="flex:0 0 auto;min-width:92px;${qm.idx===0?'opacity:.4;pointer-events:none':''}">← Back</button>`;
  const _qmRight=_qmLast
    ?`<button class="btn btn-primary" onclick="finishQuizMode()" style="flex:1;background:var(--brand)">Finish ✓</button>`
    :(_qmAnswered
      ?`<button class="btn btn-primary" onclick="quizModeNav(1)" style="flex:1;background:var(--brand)">Next →</button>`
      :`<button class="btn btn-outline" onclick="quizModeNav(1)" style="flex:1">Skip →</button>`);
  const qmNavRow=`<div style="display:flex;gap:10px">${_qmBack}${_qmRight}</div>`;
  const qmDots=dotStripHTML(qm.questions, qm.idx, qm.answers, 'quizModeJump');
  const qmTimerBadge=timerBadgeHTML(qm.qTimerElapsed,sel!==null);
  return`<div class="bh"><button class="bh-back" onclick="STATE.tab='quiz-mode-select';render()">‹</button>
    <div style="flex:1">
      <div style="font-size:11px;font-weight:500;color:var(--brand-2)">${esc(quizBreadcrumb(q.sectionId,q.lessonId,q.topic,q.concept)||(q.secEmoji+' '+q.lessonTitle))}</div>
      <div style="font-size:14px;font-weight:500">Question ${qm.idx+1} of ${qm.questions.length}</div>
    </div>
    ${qmTimerBadge}
  </div>
  <div style="height:5px;background:var(--surface-4);flex-shrink:0"><div style="height:100%;width:${barW}%;background:var(--brand);transition:width .4s;border-radius:0 3px 3px 0"></div></div>
  ${qmDots}
  <div class="scroll-area pad" style="padding-top:16px">
    <div class="card" id="qm-question-card"><p style="font-size:15px;font-weight:500;line-height:1.55;margin-bottom:18px">${stemHTML(q.q)}</p>${dataTableHTML(q)}${askHTML(q)}${opts}${explanation}</div>
    <div style="margin-top:12px" id="qm-next-wrap">${qmNavRow}</div>
    <div style="height:20px"></div>
  </div>`;
}

// ── Quiz Mode Selection Screen ─────────────────────────────────────────────
function renderQuizModeSelect(){
  return`${renderSubNav(SUB_PRACTICE,'quiz-mode-select')}<div class="sh"><h2>Quiz Mode</h2><p>Practice MCQs by section or mixed exam</p></div>
  <div class="scroll-area pad" style="padding-top:14px">
    <div class="card" style="margin-bottom:14px">
      <div style="font-size:14px;font-weight:500;color:var(--ink);margin-bottom:4px">🎯 Full CMA Mix</div>
      <div style="font-size:12px;color:#888;margin-bottom:12px">50 random questions from ALL sections — exam simulation</div>
      <button onclick="startQuizMode(null)" class="btn" style="background:var(--brand);color:#fff;font-size:14px">Start Full CMA Quiz (100 MCQs)</button>
    </div>
    <div style="font-size:12px;font-weight:500;color:#888;letter-spacing:.5px;margin-bottom:10px">BY SECTION</div>
    ${S.map(sec=>{
      return`<div class="card" style="margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
          <div class="sect-icon" style="background:${sec.bg}">${sec.emoji}</div>
          <div>
            <div style="font-size:13px;font-weight:500;color:var(--ink)">${esc(sec.title)}</div>
            <div style="font-size:11px;color:#888">${sec.lessons.length} lessons · ${sec.weight}% of exam</div>
          </div>
        </div>
        <button onclick="startQuizMode(${sec.id})" class="btn" style="background:${sec.bar};color:#fff;font-size:13px">Start Quiz (up to 50 MCQs)</button>
      </div>`;
    }).join('')}
    <div style="height:20px"></div>
  </div>`;
}

// ── FIX 5: Single search engine — was duplicated in renderSearch() AND
// updateSearchResults(). Any change to scoring had to be made twice.
// Now both call searchLessons(query) for consistent, maintainable results.
function searchLessons(q){
  const results=[];
  if(!q||q.length<2)return results;
  const ql=q.toLowerCase().trim();
  S.forEach(sec=>{sec.lessons.forEach(l=>{
    let score=0;
    if(l.title.toLowerCase().includes(ql))score+=3;
    const blockText=l.blocks.map(b=>{
      if(b.v&&typeof b.v==='string')return b.v;
      if(Array.isArray(b.v))return b.v.join(' ');
      if(b.h)return b.h;
      return'';
    }).join(' ').toLowerCase();
    if(blockText.includes(ql))score+=1;
    l.quizzes.forEach(qz=>{if(qz.q&&qz.q.toLowerCase().includes(ql))score+=2;});
    if(score>0)results.push({sec,lesson:l,score});
  });});
  return results.sort((a,b)=>b.score-a.score);
}

function updateSearchResults(){
  STATE.searchQ=document.getElementById('search-input')?.value||'';
  const q=STATE.searchQ.trim();
  const container=document.getElementById('search-results');
  if(!container)return;
  const results=searchLessons(q);
  if(q.length<2){
    container.innerHTML='<div style="text-align:center;padding:40px 20px;color:#aaa"><div style="font-size:36px;margin-bottom:10px">🔍</div><div style="font-size:14px">Type at least 2 characters to search</div></div>';
  }else if(results.length===0){
    container.innerHTML=`<div style="text-align:center;padding:40px 20px;color:#aaa"><div style="font-size:36px;margin-bottom:10px">😕</div><div style="font-size:14px">No results for "<b>${esc(STATE.searchQ)}</b>"</div></div>`;
  }else{
    container.innerHTML=`<div style="font-size:12px;color:#888;margin-bottom:10px">${results.length} result${results.length>1?'s':''} for "<b>${esc(STATE.searchQ)}</b>"</div>`+
    results.slice(0,20).map(r=>{const done=lessonDone(r.lesson.id);return`<div onclick="STATE.tab='study';studyGo(${r.sec.id},'${r.lesson.id}')" style="background:${done?r.sec.bg:'var(--surface-2)'};border:.5px solid ${done?r.sec.text+'40':'var(--border)'};border-radius:10px;padding:10px 12px;margin-bottom:8px;cursor:pointer"><div style="font-size:10px;font-weight:500;color:${r.sec.text};margin-bottom:3px">${r.sec.emoji} ${esc(r.sec.title)}</div><div style="font-size:13px;font-weight:500;color:var(--ink)">${esc(r.lesson.title)}</div><div style="font-size:11px;color:#888;margin-top:2px">${r.lesson.dur} · ${done?'✓ Completed':'Not started'}</div></div>`;}).join('');
  }
  const clearBtn=document.getElementById('search-clear');
  if(clearBtn)clearBtn.style.display=q.length>=2?'block':'none';
}

function renderSearch(){
  const results=searchLessons(STATE.searchQ||'');
  const q=(STATE.searchQ||'').trim();
  return`<div class="sh"><h2>Search</h2><p>Search lessons, topics & quiz questions</p></div>
  <div class="scroll-area pad" style="padding-top:12px">
    <div style="position:relative;margin-bottom:14px">
      <input id="search-input" type="text" placeholder="Search topics, lessons, formulas..." value="${esc(STATE.searchQ||'')}"
        oninput="STATE.searchQ=this.value;updateSearchResults()" autofocus
        class="search-box"
        style="width:100%;padding:12px 14px 12px 40px;border-radius:10px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink);box-sizing:border-box">
      <span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:16px;pointer-events:none">🔍</span>
      <span id="search-clear" onclick="document.getElementById('search-input').value='';STATE.searchQ='';updateSearchResults()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:18px;cursor:pointer;color:#aaa;line-height:1;display:${q.length>=2?'block':'none'}">×</span>
    </div>
    <div id="search-results" style="min-height:200px">${
      q.length<2
        ?'<div style="text-align:center;padding:40px 20px;color:#aaa"><div style="font-size:36px;margin-bottom:10px">🔍</div><div style="font-size:14px">Type at least 2 characters to search</div></div>'
        :results.length===0
          ?`<div style="text-align:center;padding:40px 20px;color:#aaa"><div style="font-size:36px;margin-bottom:10px">😕</div><div style="font-size:14px">No results for "<b>${esc(STATE.searchQ)}</b>"</div></div>`
          :`<div style="font-size:12px;color:#888;margin-bottom:10px">${results.length} result${results.length>1?'s':''} for "<b>${esc(STATE.searchQ)}</b>"</div>`+
            results.slice(0,20).map(r=>{const done=lessonDone(r.lesson.id);return`<div onclick="STATE.tab='study';studyGo(${r.sec.id},'${r.lesson.id}')" style="background:${done?r.sec.bg:'var(--surface-2)'};border:.5px solid ${done?r.sec.text+'40':'var(--border)'};border-radius:10px;padding:10px 12px;margin-bottom:8px;cursor:pointer"><div style="font-size:10px;font-weight:500;color:${r.sec.text};margin-bottom:3px">${r.sec.emoji} ${esc(r.sec.title)}</div><div style="font-size:13px;font-weight:500;color:var(--ink)">${esc(r.lesson.title)}</div><div style="font-size:11px;color:#888;margin-top:2px">${r.lesson.dur} · ${done?'✓ Completed':'Not started'}</div></div>`;}).join('')
    }</div>
    <div style="height:20px"></div>
  </div>`;
}

/* ── BILINGUAL DICTIONARY FEATURE ─────────────────────────────────── */
async function ensureDictionary(){
  if(STATE.dictLoaded) return;
  try{
    const res = await fetch('./dictionary/terms.json');
    if(!res.ok) throw new Error('HTTP '+res.status);
    const data = await res.json();
    STATE.dictData = Array.isArray(data)
      ? data.slice().sort((a,b)=>String(a.en).localeCompare(String(b.en)))
      : [];
  }catch(e){
    console.error('Failed to load dictionary', e);
    STATE.dictData = [];
  }
  STATE.dictLoaded = true;
  if(STATE.tab==='dictionary') render();
}
function dictNormEn(s){ return String(s||'').toLowerCase().trim(); }
function dictNormAr(s){
  return String(s||'')
    .replace(/[\u064B-\u0652\u0670\u0640]/g,'')
    .replace(/[\u0622\u0623\u0625]/g,'\u0627')
    .replace(/\u0649/g,'\u064A')
    .replace(/\u0629/g,'\u0647')
    .trim();
}
function dictFilter(data, q){
  q = String(q||'').trim();
  if(!q) return data;
  const qEn = dictNormEn(q);
  const qAr = dictNormAr(q);
  return data.filter(e=>{
    const en = [e.en, e.abbr, e.enDef].filter(Boolean).map(dictNormEn).join(' ');
    const ar = [e.ar, e.arDef].filter(Boolean).map(dictNormAr).join(' ');
    return (qEn && en.includes(qEn)) || (qAr && ar.includes(qAr));
  });
}
function dictCardHTML(e){
  return `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:13px 14px;margin-bottom:10px">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
      <div style="font-size:15px;font-weight:600;color:var(--brand);line-height:1.35">
        ${esc(e.en)}${e.abbr?` <span style="font-size:10px;font-weight:600;color:var(--brand-2);background:var(--brand-tint);padding:1px 6px;border-radius:6px;vertical-align:middle">${esc(e.abbr)}</span>`:''}
      </div>
      <div dir="rtl" style="font-size:15px;font-weight:600;color:var(--brand-2);text-align:right;line-height:1.5;flex-shrink:0">${esc(e.ar)}</div>
    </div>
    ${e.cat?`<div style="font-size:10px;color:#888;margin-top:4px">${esc(e.cat)}</div>`:''}
    ${e.enDef?`<div style="font-size:13px;color:#444;line-height:1.6;margin-top:8px">${esc(e.enDef)}</div>`:''}
    ${e.arDef?`<div dir="rtl" style="font-size:13px;color:#444;line-height:1.75;margin-top:6px;text-align:right">${esc(e.arDef)}</div>`:''}
  </div>`;
}
function updateDictResults(){
  STATE.dictQ = document.getElementById('dict-input')?.value || '';
  const container = document.getElementById('dict-results');
  if(!container) return;
  const all = STATE.dictData || [];
  const q = STATE.dictQ.trim();
  const results = dictFilter(all, q);
  if(!STATE.dictLoaded){
    container.innerHTML = '<div style="text-align:center;padding:40px 20px;color:#aaa"><div style="font-size:36px;margin-bottom:10px">\u{1F4D6}</div><div style="font-size:14px">Loading dictionary…</div></div>';
  }else if(results.length===0){
    container.innerHTML = `<div style="text-align:center;padding:40px 20px;color:#aaa"><div style="font-size:36px;margin-bottom:10px">\u{1F615}</div><div style="font-size:14px">No terms found for "<b>${esc(STATE.dictQ)}</b>"</div><div style="font-size:13px;margin-top:4px" dir="rtl">لا توجد نتائج</div></div>`;
  }else{
    const count = q ? `${results.length} term${results.length>1?'s':''} for "<b>${esc(STATE.dictQ)}</b>"` : `${results.length} terms`;
    container.innerHTML = `<div style="font-size:12px;color:#888;margin-bottom:10px">${count}</div>` + results.map(dictCardHTML).join('');
  }
  const clearBtn = document.getElementById('dict-clear');
  if(clearBtn) clearBtn.style.display = q.length>=1?'block':'none';
}
function renderDictionary(){
  const q = (STATE.dictQ||'').trim();
  const initial = !STATE.dictLoaded
    ? '<div style="text-align:center;padding:40px 20px;color:#aaa"><div style="font-size:36px;margin-bottom:10px">\u{1F4D6}</div><div style="font-size:14px">Loading dictionary…</div></div>'
    : (()=>{ const r=dictFilter(STATE.dictData||[], q); return `<div style="font-size:12px;color:#888;margin-bottom:10px">${r.length} terms</div>`+r.map(dictCardHTML).join(''); })();
  return `<div class="sh"><h2>Dictionary</h2><p>Accounting &amp; finance terms · English / العربية</p></div>
  ${renderSubNav(SUB_REFERENCE,'dictionary')}
  <div class="scroll-area pad" style="padding-top:12px">
    <div style="position:relative;margin-bottom:14px">
      <input id="dict-input" type="text" placeholder="Search a term…  ابحث عن مصطلح" value="${esc(STATE.dictQ||'')}"
        oninput="STATE.dictQ=this.value;updateDictResults()"
        style="width:100%;padding:12px 14px 12px 40px;border-radius:10px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink);box-sizing:border-box">
      <span style="position:absolute;left:13px;top:50%;transform:translateY(-50%);font-size:16px;pointer-events:none">\u{1F50D}</span>
      <span id="dict-clear" onclick="document.getElementById('dict-input').value='';STATE.dictQ='';updateDictResults()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);font-size:18px;cursor:pointer;color:#aaa;line-height:1;display:${q.length>=1?'block':'none'}">×</span>
    </div>
    <div id="dict-results" style="min-height:200px">${initial}</div>
    <div style="height:20px"></div>
  </div>`;
}

function renderTracker(){
  const tracker=loadTracker();
  const allLessons=S.flatMap(s=>s.lessons);
  const goodCount=allLessons.filter(l=>tracker[l.id]==='good').length;
  const badCount=allLessons.filter(l=>tracker[l.id]==='bad').length;
  const notRated=allLessons.length-goodCount-badCount;

  const sectCards=S.map(sec=>{
    const isOpen=STATE.trackerOpenSects?.includes(sec.id);
    const secGood=sec.lessons.filter(l=>tracker[l.id]==='good').length;
    const secBad=sec.lessons.filter(l=>tracker[l.id]==='bad').length;
    const lessonRows=isOpen?sec.lessons.map(l=>{
      const val=tracker[l.id]||'';
      return`<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:.5px solid ${sec.text}15">
        <span style="flex:1;font-size:13px;color:#333">${esc(l.title)}</span>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button onclick="setTrackerValue('${l.id}','good')" style="padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;border:1px solid ${val==='good'?'var(--ok)':'var(--border-4)'};background:${val==='good'?'var(--ok-tint)':'transparent'};color:${val==='good'?'var(--ok-strong)':'#888'}">👍 Good</button>
          <button onclick="setTrackerValue('${l.id}','bad')" style="padding:5px 12px;border-radius:6px;font-size:12px;font-weight:500;cursor:pointer;font-family:inherit;border:1px solid ${val==='bad'?'var(--err)':'var(--border-4)'};background:${val==='bad'?'var(--err-tint)':'transparent'};color:${val==='bad'?'var(--err-strong)':'#888'}">👎 Bad</button>
        </div>
      </div>`;
    }).join(''):'';

    return`<div class="card" style="padding:0;overflow:hidden;margin-bottom:10px">
      <div onclick="STATE.trackerOpenSects=STATE.trackerOpenSects||[];const idx=STATE.trackerOpenSects.indexOf(${sec.id});if(idx>-1)STATE.trackerOpenSects.splice(idx,1);else STATE.trackerOpenSects.push(${sec.id});render()" 
        style="display:flex;align-items:center;gap:10px;padding:13px 14px;cursor:pointer;background:${sec.bg}">
        <span style="font-size:18px">${sec.emoji}</span>
        <div style="flex:1;min-width:0">
          <div class="ellipsis" style="font-size:13px;font-weight:500;color:${sec.strong}">${esc(sec.title)}</div>
          <div style="font-size:11px;color:${sec.text};margin-top:2px">
            ${secGood>0?`👍 ${secGood} good `:''}${secBad>0?`👎 ${secBad} bad`:''}${secGood===0&&secBad===0?'Not rated yet':''}
          </div>
        </div>
        <span style="font-size:18px;color:${sec.text};transition:transform .2s;transform:rotate(${isOpen?'90':'0'}deg)">›</span>
      </div>
      ${isOpen?`<div style="background:#fff">${lessonRows}</div>`:''}
    </div>`;
  }).join('');

  return`${renderSubNav(SUB_PROGRESS,'tracker')}<div class="sh">
    <h2>Topic Tracker</h2>
    <p style="font-size:12px;color:#888;margin-top:2px">Rate each topic to track your strengths and weaknesses</p>
  </div>
  <div style="display:flex;gap:10px;padding:12px 16px;border-bottom:.5px solid var(--border);flex-shrink:0">
    <div style="flex:1;background:var(--ok-tint);border-radius:10px;padding:10px;text-align:center">
      <div style="font-size:20px;font-weight:500;color:var(--ok-strong)">${goodCount}</div>
      <div style="font-size:11px;color:var(--ok-strong-2)">👍 Good</div>
    </div>
    <div style="flex:1;background:var(--err-tint);border-radius:10px;padding:10px;text-align:center">
      <div style="font-size:20px;font-weight:500;color:var(--err-strong)">${badCount}</div>
      <div style="font-size:11px;color:var(--err-2)">👎 Need Work</div>
    </div>
    <div style="flex:1;background:var(--surface-3);border-radius:10px;padding:10px;text-align:center">
      <div style="font-size:20px;font-weight:500;color:#555">${notRated}</div>
      <div style="font-size:11px;color:#888">⬜ Not Rated</div>
    </div>
  </div>
  <div class="scroll-area pad" style="padding-top:14px">
    <div style="font-size:12px;color:#888;margin-bottom:12px">Tap a section to expand · Select Good or Bad for each topic</div>
    ${sectCards}
    <div style="height:20px"></div>
  </div>`;
}


async function sendPasswordReset(){
  const email=document.getElementById('auth-email')?.value?.trim();
  if(!email){showToast('Please enter your email address first.','warning');return;}
  try{
    await auth.sendPasswordResetEmail(email);
    showModal({icon:'📧',title:'Email Sent!',body:'Password reset link sent to '+email+'. Please check your inbox and spam folder.',type:'success',confirmText:'OK'});
  }catch(e){showToast(e.message||'Could not send reset email. Check your email address.','error');}
}

async function doAuth(){
  const isReg=STATE.authScreen==='register';
  const email=(document.getElementById('auth-email')?.value||'').trim();
  const pass=document.getElementById('auth-pass')?.value||'';
  const pass2=document.getElementById('auth-pass2')?.value||'';
  const name=(document.getElementById('auth-name')?.value||'').trim();
  STATE.authError='';
  if(!email||!pass){STATE.authError='Please enter email and password.';render();return;}
  if(isReg&&pass!==pass2){STATE.authError='Passwords do not match.';render();return;}
  if(isReg&&!name){STATE.authError='Please enter your full name.';render();return;}
  STATE.authLoading=true;render();
  try{
    if(isReg){
      const cred=await auth.createUserWithEmailAndPassword(email,pass);
      await cred.user.updateProfile({displayName:name});
    }else{
      await auth.signInWithEmailAndPassword(email,pass);
    }
  }catch(e){
    STATE.authLoading=false;
    STATE.authError=e.message.replace('Firebase: ','').replace(/ \(auth\/.*?\)/,'');
    render();
  }
}
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
        <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:5px 14px;font-size:12px">113 Lessons</div>
        <div style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.3);border-radius:20px;padding:5px 14px;font-size:12px">2,295 MCQs</div>
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
            ['📚','Study','6 sections · 112 lessons covering all CMA Part 1 topics with detailed, structured content'],
            ['❓','Quizzes','2,295 MCQs — exam-style questions with full explanations after each answer'],
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
        <a href="tel:+201019641390" style="display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:10px 18px;text-decoration:none;color:#fff;min-width:80px">
          <span style="font-size:22px">📞</span>
          <span style="font-size:11px;font-weight:500">Call</span>
        </a>
        <a href="https://wa.me/201019641390" target="_blank" style="display:flex;flex-direction:column;align-items:center;gap:5px;background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.35);border-radius:12px;padding:10px 18px;text-decoration:none;color:#fff;min-width:80px">
          <span style="font-size:22px">💬</span>
          <span style="font-size:11px;font-weight:500">WhatsApp</span>
        </a>
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

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

function renderLessons(){
  const{sectId,lessonId,progress}=STATE;
  if(lessonId!==null){
    const sec=sect(sectId);const lesson=sec.lessons.find(l=>l.id===lessonId);const lessonIdx=sec.lessons.findIndex(l=>l.id===lessonId);const done=lessonDone(lesson.id);
    const hasVideo2=lesson.blocks&&lesson.blocks.some(b=>b.t==='video');
    const videoPlaceholder2=hasVideo2?'':`<div style="margin:14px 0 4px;background:var(--surface-3);border:.5px dashed #c0c0b8;border-radius:10px;padding:12px 14px;display:flex;align-items:center;gap:12px"><div style="width:36px;height:36px;background:var(--brand-tint);border-radius:8px;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:18px">🎬</div><div><div style="font-size:13px;font-weight:500;color:#555">Video lesson coming soon</div><div style="font-size:11px;color:#999;margin-top:2px">Gawad will record this lesson shortly</div></div></div>`;
    return`<div class="bh"><button class="bh-back" onclick="STATE.lessonId=null;render()">‹</button><div style="min-width:0"><div style="font-size:11px;font-weight:500;color:${sec.text}">${sec.emoji} ${esc(sec.title)}</div><div class="ellipsis" style="font-size:15px;font-weight:500;margin-top:1px">${lessonIdx+1}. ${esc(lesson.title)}</div></div></div>
    <div class="scroll-area pad"><div class="card" style="margin-top:14px;padding:4px 16px 16px">${renderLessonBody(lesson,sec)}${videoPlaceholder2}</div>
    <button class="btn" onclick="markDone('${lesson.id}')" style="margin-top:14px;background:${done?'var(--ok-tint)':sec.bar};color:${done?'var(--ok-strong)':'#fff'}">${done?'✓ Completed — Back to lessons':'Mark as Complete ✓'}</button><div style="height:20px"></div></div>`;
  }
  if(sectId!==null){
    const sec=sect(sectId);
    const items=sec.lessons.map((l,i)=>{const done=lessonDone(l.id);return`<div class="card" onclick="STATE.tab='study';studyGo(STATE.sectId,'${l.id}')" style="cursor:pointer;border-color:${done?sec.text+'45':'var(--border)'}"><div class="row"><div style="width:32px;height:32px;border-radius:50%;background:${done?sec.bg:'var(--bg)'};display:flex;align-items:center;justify-content:center;font-size:14px;color:${done?sec.strong:'#999'};border:1px solid ${done?sec.text+'40':'var(--border)'};flex-shrink:0;font-weight:500">${done?'✓':i+1}</div><div style="flex:1;min-width:0"><div class="ellipsis" style="font-size:14px;font-weight:500">${i+1}. ${esc(l.title)}</div><div style="font-size:12px;color:#888;margin-top:2px">${l.dur} · ${done?'Completed':'Not started'}</div></div><span style="color:#bbb;font-size:18px">›</span></div></div>`;}).join('');
    return`<div class="bh"><button class="bh-back" onclick="STATE.sectId=null;render()">‹</button><div><div style="font-size:16px;font-weight:500">${sec.emoji} ${esc(sec.title)}</div><div style="font-size:12px;color:#888;margin-top:1px">${sec.lessons.length} lessons · ${sec.weight}% of exam</div></div></div>
    <div class="scroll-area pad" style="padding-top:14px">${items}<div style="height:20px"></div></div>`;
  }
  const doneCount=STATE.progress.done.length;
  const items=S.map(sec=>{const done=sec.lessons.filter(l=>lessonDone(l.id)).length;return`<div class="card" onclick="STATE.tab='study';studyGo(${sec.id},null)" style="cursor:pointer"><div class="row"><div class="sect-icon" style="background:${sec.bg}">${sec.emoji}</div><div style="flex:1;min-width:0"><div class="ellipsis" style="font-size:14px;font-weight:500">${esc(sec.title)}</div><div style="font-size:12px;color:#888;margin-top:2px">${done}/${sec.lessons.length} done · ${sec.weight}% of exam</div></div><span style="color:#bbb;font-size:18px">›</span></div></div>`;}).join('');
  return`<div class="sh"><h2>All Lessons</h2><p>${doneCount} of ${TOTAL_LESSONS} completed</p></div><div class="scroll-area pad" style="padding-top:14px">${items}<div style="height:20px"></div></div>`;
}

// ─── QUIZ LIST ────────────────────────────────────────────────────────────────
function renderQuizList(){
  const items=S.map(sec=>{const sc=null;const scColor=sc?(sc.correct/sc.total>=0.8?'var(--ok-strong-2)':sc.correct/sc.total>=0.6?'#BA7517':'var(--err-2)'):'#888';
  return`<div class="card"><div class="row" style="margin-bottom:12px"><div class="sect-icon" style="background:${sec.bg}">${sec.emoji}</div><div style="flex:1;min-width:0"><div class="ellipsis" style="font-size:13px;font-weight:500">${esc(sec.title)}</div>${sc?`<div style="font-size:11px;margin-top:2px;color:${scColor}">Last: ${sc.correct}/${sc.total} (${Math.round(sc.correct/sc.total*100)}%)</div>`:`<div style="font-size:11px;color:#888;margin-top:2px">Not attempted yet</div>`}</div></div>
  <button class="btn-sm" onclick="startQuiz(${sec.id})" style="background:${sec.bg};color:${sec.strong};border:1px solid ${sec.text}50">${sc?'Retake Quiz':'Start Quiz'} — 5 MCQs</button></div>`;}).join('');
  return`<div class="sh"><h2>Practice Quizzes</h2><p>5 MCQs per section · Detailed explanations included</p></div><div class="scroll-area pad" style="padding-top:14px">${items}<div style="height:20px"></div></div>`;
}

// ─── QUIZ SESSION ─────────────────────────────────────────────────────────────

// ─── TIMER HELPERS ────────────────────────────────────────────────────────────
function fmtTime(ms){if(!ms||ms<0)ms=0;const s=Math.floor(ms/1000);const m=Math.floor(s/60);return m>0?`${m}m ${s%60<10?'0':''}${s%60}s`:`${s}s`;}
function timerColor(ms){if(ms<60000)return{bg:'var(--ok-tint)',color:'var(--ok-strong)',dot:'🟢'};if(ms<120000)return{bg:'var(--warn-tint)',color:'var(--warn-strong)',dot:'🟡'};return{bg:'var(--err-tint)',color:'var(--err-strong)',dot:'🔴'};}
function timerBadgeHTML(elapsed,answered){
  if(!answered){return`<span id="q-timer" style="display:inline-flex;align-items:center;gap:5px;background:var(--bg);border-radius:6px;padding:3px 10px;font-size:12px;font-weight:500;color:#555">⏱ <span id="q-timer-val">0s</span></span>`;}
  const tc=timerColor(elapsed);
  return`<span style="display:inline-flex;align-items:center;gap:5px;background:${tc.bg};border-radius:6px;padding:3px 10px;font-size:12px;font-weight:500;color:${tc.color}">${tc.dot} ${fmtTime(elapsed)}</span>`;
}
function totalTimeHTML(startTime,endTime,questionTimes){
  if(!startTime||!endTime)return'';
  const total=endTime-startTime;
  const avg=questionTimes&&questionTimes.length?Math.round(questionTimes.reduce((a,b)=>a+b,0)/questionTimes.length):0;
  const cmaTarget=108000;// 1.8 min CMA benchmark
  const tc=timerColor(avg);
  const totalFmt=fmtTime(total);
  const avgFmt=fmtTime(avg);
  const diff=avg-cmaTarget;
  const benchFmt=diff<=0?`<span style="color:var(--ok-strong);font-weight:500">${fmtTime(Math.abs(diff))} faster than CMA target ✓</span>`:`<span style="color:var(--err-strong);font-weight:500">${fmtTime(diff)} slower than CMA target</span>`;
  return`<div style="background:var(--surface-3);border-radius:12px;padding:14px 16px;margin-bottom:16px;text-align:left">
    <div style="font-size:12px;font-weight:500;color:#888;margin-bottom:10px;letter-spacing:.5px">⏱ TIME ANALYSIS</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
      <div style="background:#fff;border-radius:8px;padding:10px 12px;border:.5px solid var(--border)">
        <div style="font-size:10px;color:#888;margin-bottom:2px">Total Time</div>
        <div style="font-size:18px;font-weight:500;color:var(--ink)">${totalFmt}</div>
      </div>
      <div style="background:${tc.bg};border-radius:8px;padding:10px 12px;border:.5px solid ${tc.color}30">
        <div style="font-size:10px;color:#888;margin-bottom:2px">Avg / Question</div>
        <div style="font-size:18px;font-weight:500;color:${tc.color}">${tc.dot} ${avgFmt}</div>
      </div>
    </div>
    <div style="font-size:12px;color:#555">CMA target: 1.8 min/question — ${benchFmt}</div>
  </div>`;
}
function renderQuizSession(){
  const qs=STATE.quizState;if(!qs)return'';
  const sec=sect(qs.sId);const lessonTitle=S.flatMap(s=>s.lessons).find(l=>l.id===qs.lessonId)?.title||'';const q=qs.questions[qs.idx];const sel=qs.selected;
  const barW=Math.round(qs.idx/qs.questions.length*100);
  const opts=q.o.map((opt,i)=>{
    let bg='var(--surface-3)',border='.5px solid var(--border)',textC='var(--ink)',circBg='var(--border-2)',circC='#666',circBorder='.5px solid #bbb',circTxt=String.fromCharCode(65+i);
    if(sel!==null){if(i===q.a){bg='var(--ok-tint)';border='1px solid var(--ok)';textC='var(--ok-strong)';circBg='#c0dd97';circC='var(--ok-strong)';circBorder='1px solid var(--ok)';circTxt='✓';}else if(i===sel&&sel!==q.a){bg='var(--err-tint)';border='1px solid var(--err)';textC='var(--err-strong)';circBg='#f7c1c1';circC='var(--err-strong)';circBorder='1px solid var(--err)';circTxt='✗';}else{textC='#888';}}
    const cursor=sel===null?'cursor:pointer':'cursor:default';
    return`<div class="q-opt" onclick="selectAnswer(${i})" style="background:${bg};border:${border};${cursor}"><div class="q-circle" style="background:${circBg};color:${circC};border:${circBorder}">${circTxt}</div><div class="q-text" style="color:${textC}">${esc(normalizeCase(opt))}</div></div>`;
  }).join('');
  const explanation=sel!==null?`<div style="margin-top:14px;padding:13px 14px;border-radius:10px;background:${sel===q.a?'var(--ok-tint)':'var(--err-tint)'};border:1px solid ${sel===q.a?'var(--ok)':'var(--err)'}"><div style="font-size:12px;font-weight:500;color:${sel===q.a?'var(--ok-strong)':'var(--err-strong)'};margin-bottom:5px">${sel===q.a?'Correct! Well done.':'Not quite — here is why:'}</div><div style="font-size:13px;color:${sel===q.a?'var(--ok-strong-2)':'var(--err-2)'};line-height:1.55">${expInner(q,sel)}</div></div>`:'';
  const _answered=sel!==null;
  const _isLast=qs.idx+1>=qs.questions.length;
  const _accent=qs.isRetry?'var(--err)':sec.bar;
  const _backBtn=`<button class="btn btn-outline" onclick="quizNav(-1)" style="flex:0 0 auto;min-width:92px;${qs.idx===0?'opacity:.4;pointer-events:none':''}">← Back</button>`;
  const _rightBtn=_isLast
    ?`<button class="btn btn-primary" onclick="finishQuiz()" style="flex:1;background:${_accent}">Finish ✓</button>`
    :(_answered
      ?`<button class="btn btn-primary" onclick="quizNav(1)" style="flex:1;background:${_accent}">Next →</button>`
      :`<button class="btn btn-outline" onclick="quizNav(1)" style="flex:1">Skip →</button>`);
  const navRow=`<div style="display:flex;gap:10px">${_backBtn}${_rightBtn}</div>`;
  const quizDots=dotStripHTML(qs.questions, qs.idx, qs.answers, 'quizJump');
  const timerBadge=timerBadgeHTML(qs.qTimerElapsed,sel!==null);
  const headerTitle=qs.isRetry?'Wrong Answer Retry':lessonTitle;
  const headerSub=qs.isRetry?`Question ${qs.idx+1} of ${qs.questions.length} · Mixed sections`:`Question ${qs.idx+1} of ${qs.questions.length}`;
  const _crumb=quizBreadcrumb(qs.isRetry?q._secId:qs.sId, qs.isRetry?q._lessonId:qs.lessonId, q.topic, q.concept);
  return`<div class="bh"><button class="bh-back" onclick="STATE.tab=${qs.isRetry?`'wrong-answers'`:`'study'`};STATE.quizState=null;render()">‹</button><div style="flex:1"><div style="font-size:11px;font-weight:500;color:${sec.text}">${esc(_crumb||headerTitle)}</div><div style="font-size:14px;font-weight:500">${headerSub}</div></div>${timerBadge}</div>
  <div style="height:5px;background:var(--surface-4);flex-shrink:0"><div style="height:100%;width:${barW}%;background:${qs.isRetry?'var(--err)':sec.bar};transition:width .4s;border-radius:0 3px 3px 0"></div></div>
  ${quizDots}<div class="scroll-area pad" style="padding-top:16px"><div class="card" id="qs-question-card"><p style="font-size:15px;font-weight:500;line-height:1.55;margin-bottom:18px">${stemHTML(q.q)}</p>${dataTableHTML(q)}${askHTML(q)}${opts}${explanation}</div><div style="margin-top:12px" id="qs-next-wrap">${navRow}</div><div style="height:20px"></div></div>`;
}

// ─── QUIZ RESULTS ─────────────────────────────────────────────────────────────
function renderQuizResults(){
  const qs=STATE.quizState;if(!qs)return'';
  const sec=sect(qs.sId);const correct=qs.answers.filter(a=>a.correct).length;const pctQ=Math.round(correct/qs.questions.length*100);
  const lessonTitle=qs.isRetry?'Wrong Answer Retry':S.flatMap(s=>s.lessons).find(l=>l.id===qs.lessonId)?.title||'';
  const gradeEmoji=pctQ>=80?'🏆':pctQ>=60?'👍':'📚';const gradeLabel=pctQ>=80?'Excellent!':pctQ>=60?'Good work!':'Keep studying!';
  const breakdown=qs.questions.map((q,i)=>`<div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:10px;padding-bottom:${i<qs.questions.length-1?'10px':'0'};border-bottom:${i<qs.questions.length-1?'.5px solid var(--border)':'none'}"><span style="font-size:15px;flex-shrink:0">${qs.answers[i]?.skipped?'⏭️':(qs.answers[i]?.correct?'✅':'❌')}</span><div><div style="font-size:13px;color:#333;line-height:1.4">Q${i+1}: ${esc(q.q)}</div>${!qs.answers[i]?.correct?`<div style="font-size:12px;color:var(--ok-strong-2);margin-top:3px">Correct: ${esc(q.o[q.a])}</div>`:''}</div></div>`).join('');
  const timeHTML=totalTimeHTML(qs.quizStartTime,qs.quizEndTime,qs.questionTimes);
  // Batch 7: Review Answers button — paginated review of every question
  const reviewBtn=`<button class="btn" onclick="startQuizReview()" style="background:var(--brand);color:#fff;margin-bottom:10px">📖 Review Answers</button>`;
  const actionBtns=qs.isRetry
    ?`${reviewBtn}<div style="display:flex;gap:10px;margin-bottom:12px">
        <button class="btn btn-outline" onclick="STATE.tab='wrong-answers';STATE.quizState=null;render()">← Wrong Answers</button>
        <button class="btn" onclick="startWrongAnswersRetry()" style="background:var(--err);color:#fff">↺ Retry Again</button>
      </div>`
    :`${reviewBtn}<div style="display:flex;gap:10px;margin-bottom:12px">
        <button class="btn btn-outline" onclick="STATE.tab='study';STATE.quizState=null;render()">Back to Study</button>
        <button class="btn" onclick="startQuiz('${qs.lessonId}')" style="background:${sec.bar};color:#fff">Retake Quiz</button>
      </div>
      `;
  return`<div class="scroll-area" style="padding:30px 16px 20px;text-align:center">
    <div style="font-size:52px">${gradeEmoji}</div>
    <div style="font-size:20px;font-weight:500;margin-top:10px">${gradeLabel}</div>
    <div style="font-size:46px;font-weight:500;color:${qs.isRetry?'var(--err)':sec.text};margin:6px 0 2px">${pctQ}%</div>
    <div style="font-size:14px;color:#888;margin-bottom:4px">${correct} out of ${qs.questions.length} correct</div>
    ${qs.isRetry?`<div style="font-size:12px;color:#aaa;margin-bottom:16px">Wrong Answer Retry</div>`:`<div style="font-size:12px;color:#aaa;margin-bottom:16px">${esc(lessonTitle)}</div>`}
    ${timeHTML}
    <div class="card" style="text-align:left;margin-bottom:14px"><div style="font-size:13px;font-weight:500;color:#555;margin-bottom:12px">Question Review</div>${breakdown}</div>
    ${actionBtns}
    <div style="height:20px"></div>
  </div>`;
}


// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 7 — QUIZ REVIEW MODE
// ═══════════════════════════════════════════════════════════════════════════
// Paginated per-question review after a lesson quiz. Same visual pattern as
// exam review: verdict bar → question → color-coded options → explanation.
// Uses STATE.quizState (already populated by the quiz session).
function startQuizReview(){
  const qs=STATE.quizState;
  if(!qs||!qs.questions||!qs.questions.length){showToast('No quiz data to review.','warning',2000);return;}
  qs.reviewIdx=0;
  qs.reviewNavOpen=false;
  STATE.tab='quiz-review';
  render();
}
function quizReviewGoTo(idx){
  const qs=STATE.quizState;if(!qs||!qs.questions)return;
  qs.reviewIdx=Math.max(0,Math.min(qs.questions.length-1,idx));
  qs.reviewNavOpen=false;
  render();
}
function quizReviewNavToggle(){
  const qs=STATE.quizState;if(!qs)return;
  qs.reviewNavOpen=!qs.reviewNavOpen;
  render();
}
function exitQuizReview(){
  STATE.tab='quiz-results';
  render();
}
function renderQuizReview(){
  const qs=STATE.quizState;
  if(!qs||!Array.isArray(qs.questions)||!qs.questions.length){STATE.tab='study';return renderStudy();}
  const idx=qs.reviewIdx||0;
  const q=qs.questions[idx];
  const total=qs.questions.length;
  const ansObj=qs.answers[idx]||{};
  // Normalize picked index — quizState.answers is [{correct, chosen, ...}] or similar
  const picked=(typeof ansObj.chosen==='number')?ansObj.chosen:(typeof ansObj.selected==='number'?ansObj.selected:null);
  const correct=picked===q.a;
  const skipped=picked==null;
  const correctCount=qs.answers.filter(a=>a&&a.correct).length;
  const sec=sect(qs.sId)||{bar:'var(--brand)',text:'var(--brand)',strong:'var(--brand)'};
  const lessonTitle=qs.isRetry?'Wrong Answer Retry':S.flatMap(s=>s.lessons).find(l=>l.id===qs.lessonId)?.title||'';

  // Options: correct = green, student's wrong pick = red, others = neutral
  const opts=q.o.map((opt,i)=>{
    let bg='var(--surface-3)',border='.5px solid var(--border)',textC='var(--ink)',circBg='var(--border-2)',circC='#666',circTxt=String.fromCharCode(65+i);
    if(i===q.a){bg='var(--ok-tint)';border='1px solid var(--ok)';textC='var(--ok-strong)';circBg='#c0dd97';circC='var(--ok-strong)';circTxt='\u2713';}
    else if(i===picked){bg='var(--err-tint)';border='1px solid var(--err)';textC='var(--err-strong)';circBg='#f7c1c1';circC='var(--err-strong)';circTxt='\u2717';}
    else{textC='#888';}
    return '<div class="q-opt" style="background:'+bg+';border:'+border+';cursor:default">'
      +'<div class="q-circle" style="background:'+circBg+';color:'+circC+';border:.5px solid #bbb">'+circTxt+'</div>'
      +'<div class="q-text" style="color:'+textC+'">'+esc(normalizeCase(opt))+'</div>'
      +'</div>';
  }).join('');

  const verdictBar=skipped
    ?'<div style="background:var(--accent-purple-tint);border:1px solid #D2B4DE;color:#6C3483;padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px">\u25CB Not answered</div>'
    :correct
      ?'<div style="background:var(--ok-tint);border:1px solid var(--ok);color:var(--ok-strong);padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px">\u2705 Correct</div>'
      :'<div style="background:var(--err-tint);border:1px solid var(--err);color:var(--err-2);padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px">\u274C Incorrect</div>';

  // Explanation: use expFor() so wrong picks get the specific wrongWhy[i]
  let explanationText='';
  if(!correct&&!skipped&&typeof expFor==='function'){
    try{explanationText=expFor(q,picked)||q.e||'';}catch{explanationText=q.e||'';}
  }else{
    explanationText=q.e||'';
  }
  const explanation=explanationText
    ?'<div style="margin-top:14px;padding:13px 14px;border-radius:10px;background:var(--surface);border:.5px solid var(--border)">'
     +'<div style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Explanation</div>'
     +'<div style="font-size:13px;color:#333;line-height:1.6">'+expInner(q,(!correct&&!skipped)?picked:q.a)+'</div>'
     +'</div>'
    :'';

  const navGrid=qs.reviewNavOpen
    ?'<div style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200" onclick="quizReviewNavToggle()">'
     +'<div onclick="event.stopPropagation()" style="position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:16px 16px 0 0;padding:16px;max-height:75vh;overflow-y:auto">'
     +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
     +'<div style="font-size:14px;font-weight:600">Review Questions</div>'
     +'<button onclick="quizReviewNavToggle()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888">\u00D7</button>'
     +'</div>'
     +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:8px">'
     +qs.questions.map((q2,i)=>{
        const a=qs.answers[i]||{};
        const p=(typeof a.chosen==='number')?a.chosen:(typeof a.selected==='number'?a.selected:null);
        const c=p===q2.a;
        const sk=p==null;
        const bg=sk?'var(--accent-purple-tint)':c?'var(--ok-tint)':'var(--err-tint)';
        const col=sk?'#6C3483':c?'var(--ok-strong)':'var(--err-2)';
        const cur=i===idx;
        return '<button onclick="quizReviewGoTo('+i+')" style="padding:9px 0;border-radius:8px;border:'+(cur?'2px solid var(--brand)':'.5px solid var(--border-4)')+';background:'+bg+';color:'+col+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+(i+1)+'</button>';
      }).join('')
     +'</div>'
     +'<div style="display:flex;gap:10px;margin-top:14px;font-size:11px;color:#888">'
     +'<div><span style="display:inline-block;width:10px;height:10px;background:var(--ok-tint);border-radius:2px;vertical-align:middle;margin-right:4px"></span>Correct</div>'
     +'<div><span style="display:inline-block;width:10px;height:10px;background:var(--err-tint);border-radius:2px;vertical-align:middle;margin-right:4px"></span>Wrong</div>'
     +'<div><span style="display:inline-block;width:10px;height:10px;background:var(--accent-purple-tint);border-radius:2px;vertical-align:middle;margin-right:4px"></span>Skipped</div>'
     +'</div>'
     +'</div></div>'
    :'';

  const prevBtn=idx>0
    ?'<button onclick="quizReviewGoTo('+(idx-1)+')" style="flex:0 0 auto;padding:11px 16px;border-radius:10px;border:.5px solid var(--border-4);background:#fff;color:#333;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">\u2039 Prev</button>'
    :'<div style="flex:0 0 auto;width:1px"></div>';
  const isLast=idx>=total-1;
  const nextBtn=isLast
    ?'<button onclick="exitQuizReview()" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Back to Results \u2713</button>'
    :'<button onclick="quizReviewGoTo('+(idx+1)+')" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Next \u203A</button>';
  const barW=Math.round((idx+1)/total*100);

  return '<div style="display:flex;flex-direction:column;height:100%">'
    +'<div style="background:#fff;border-bottom:.5px solid var(--border);padding:10px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0">'
    +'<button onclick="exitQuizReview()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--brand);padding:0 6px" title="Back">\u2039</button>'
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.4px">Review \u00B7 '+esc(lessonTitle)+'</div>'
    +'<div style="font-size:13px;font-weight:600;color:var(--ink)">Q'+(idx+1)+' of '+total+' \u00B7 <span style="color:var(--ok-strong-2)">'+correctCount+' correct</span></div>'
    +'</div>'
    +'<button onclick="quizReviewNavToggle()" style="padding:6px 10px;border-radius:8px;border:.5px solid var(--border-4);background:var(--surface);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u2630 Nav</button>'
    +'</div>'
    +'<div style="height:4px;background:var(--surface-4);flex-shrink:0"><div style="height:100%;width:'+barW+'%;background:var(--brand);transition:width .3s"></div></div>'
    +'<div class="scroll-area pad" style="padding-top:14px">'
    +verdictBar
    +'<div class="card" style="margin-bottom:12px">'
    +'<p style="font-size:15px;font-weight:500;line-height:1.55;margin-bottom:16px">'+stemHTML(q.q)+'</p>'
    +(typeof dataTableHTML==='function'?dataTableHTML(q):'')
    +askHTML(q)
    +opts
    +explanation
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:14px">'+prevBtn+nextBtn+'</div>'
    +'<div style="height:20px"></div>'
    +'</div>'
    +navGrid
    +'</div>';
}

function renderFormulaBank(){
  const cats=[
    {title:'Performance Management',color:'var(--accent-purple)',bg:'#F3E8FF',formulas:[
      ['ROI','Operating Income ÷ Assets Employed'],
      ['Residual Income (RI)','Operating Income − (Assets × Required Rate of Return)'],
      ['EVA','NOPAT − (WACC × Invested Capital)'],
      ['DuPont ROI','Profit Margin × Asset Turnover'],
      ['Asset Turnover','Sales ÷ Total Assets'],
      ['Profit Margin','Net Income ÷ Sales'],
      ['DM Price Variance','(AP − SP) × AQ'],
      ['DM Quantity Variance','(AQ − SQ) × SP'],
      ['DL Rate Variance','(AR − SR) × AH'],
      ['DL Efficiency Variance','(AH − SH) × SR'],
      ['VOH Spending Variance','(Actual VOH Rate − Standard VOH Rate) × AH'],
      ['VOH Efficiency Variance','(AH − SH Allowed) × Standard VOH Rate'],
      ['FOH Spending Variance','Actual FOH − Budgeted FOH'],
      ['FOH Volume Variance','Budgeted FOH − Applied FOH'],
      ['Selling Price Variance','(AP − SP) × Actual Units Sold'],
      ['Sales Volume Variance','(Actual Units − Budgeted Units) × Budgeted Price'],
      ['Flexible Budget Variance','Actual Results − Flexible Budget'],
      ['Min Transfer Price','Outlay Cost + Opportunity Cost (CM foregone)'],
    ]},
    {title:'Cost Management',color:'var(--warn-strong)',bg:'var(--warn-tint)',formulas:[
      ['Predetermined OH Rate','Budgeted OH ÷ Budgeted Activity'],
      ['Applied OH','POHR × Actual Activity'],
      ['COGM','DM Used + DL + OH Applied + Begin WIP − End WIP'],
      ['COGS','COGM + Begin FG − End FG'],
      ['Variable Cost per Unit (High-Low)','(Cost High − Cost Low) ÷ (Activity High − Activity Low)'],
      ['Fixed Cost (High-Low)','Total Cost − (Variable Rate × Activity)'],
      ['Y (Regression)','a + bX  (a = fixed, b = variable rate, X = activity)'],
    ]},
    {title:'Planning & Budgeting',color:'var(--brand-2)',bg:'var(--brand-tint)',formulas:[
      ['Static Budget Variance','Actual − Static Budget'],
      ['Flexible Budget Variance','Actual − Flexible Budget (at actual volume)'],
      ['Sales Volume Variance','Flexible Budget − Static Budget'],
      ['Cash Collections','Beginning AR + Credit Sales − Ending AR'],
      ['Purchases Budget','COGS + Ending Inventory − Beginning Inventory'],
      ['Budgeted Cash Payments','Purchases + Beginning AP − Ending AP'],
    ]},
    {title:'Financial Reporting',color:'var(--brand)',bg:'var(--brand-tint)',formulas:[
      ['Accounting Equation','Assets = Liabilities + Equity'],
      ['Working Capital','Current Assets − Current Liabilities'],
      ['Current Ratio','Current Assets ÷ Current Liabilities'],
      ['Quick Ratio','(Cash + ST Investments + Net AR) ÷ Current Liabilities'],
      ['Debt-to-Equity','Total Liabilities ÷ Total Equity'],
      ['Interest Coverage','EBIT ÷ Interest Expense'],
      ['Inventory Turnover','COGS ÷ Average Inventory'],
      ['Days in Inventory','365 ÷ Inventory Turnover'],
      ['AR Turnover','Net Credit Sales ÷ Average AR'],
      ['Days Sales Outstanding','365 ÷ AR Turnover'],
      ['AP Turnover','COGS ÷ Average AP'],
      ['Days Payable Outstanding','365 ÷ AP Turnover'],
      ['Cash Conversion Cycle','DIO + DSO − DPO'],
      ['Asset Turnover','Net Sales ÷ Average Total Assets'],
      ['Return on Assets (ROA)','Net Income ÷ Average Total Assets'],
      ['Return on Equity (ROE)','Net Income ÷ Average Stockholders Equity'],
      ['Gross Profit Margin','Gross Profit ÷ Net Sales'],
      ['Net Profit Margin','Net Income ÷ Net Sales'],
      ['EPS (Basic)','(Net Income − Preferred Dividends) ÷ Weighted Avg Common Shares'],
      ['P/E Ratio','Market Price per Share ÷ EPS'],
      ['Book Value per Share','Total Equity ÷ Shares Outstanding'],
      ['Equity Method — Investor Income','Ownership % × Investee Net Income'],
    ]},
    {title:'Internal Controls',color:'var(--err-2)',bg:'var(--err-tint)',formulas:[
      ['Audit Risk Model','Audit Risk = Inherent Risk × Control Risk × Detection Risk'],
      ['Residual Risk','Inherent Risk − Effect of Controls'],
      ['Cyber Risk','Likelihood × Impact'],
    ]},
    {title:'Technology & Analytics',color:'#0A6E6E',bg:'#E0F7F7',formulas:[
      ['Regression (Cost Estimation)','Y = a + bX  (a = fixed cost, b = variable rate, X = activity)'],
      ['R² (Coefficient of Determination)','% of variation in Y explained by X (0 to 1)'],
      ['RTO','Maximum acceptable time to restore a system after failure'],
      ['RPO','Maximum acceptable data loss measured in time'],
    ]},
  ];
  const items=cats.map(cat=>`
    <div style="margin-bottom:14px">
      <div style="font-size:13px;font-weight:500;color:${cat.color};background:${cat.bg};padding:8px 12px;border-radius:10px 10px 0 0;letter-spacing:.3px">${cat.title}</div>
      <div style="border:.5px solid var(--border);border-top:none;border-radius:0 0 10px 10px;overflow:hidden">
        ${cat.formulas.map(([name,formula],i)=>`
        <div style="display:flex;gap:10px;padding:9px 12px;border-bottom:${i<cat.formulas.length-1?'.5px solid var(--bg)':'none'};background:${i%2===0?'#fff':'var(--surface)'}">
          <div style="font-size:15px;font-weight:500;color:var(--ink);width:40%;flex-shrink:0;line-height:1.4">${esc(name)}</div>
          <div style="font-family:'Courier New',monospace;font-size:15px;color:var(--brand-2);line-height:1.4;flex:1">${esc(formula)}</div>
        </div>`).join('')}
      </div>
    </div>`).join('');
  return`<div class="sh"><h2>📐 Formula Bank</h2><p>Quick reference — all CMA Part 1 sections</p></div>
  ${renderSubNav(SUB_REFERENCE,'formula-bank')}
  <div class="scroll-area pad" style="padding-top:4px">${items}<div style="height:20px"></div></div>`;
}

// Item 3: Wrong Answers retry quiz.
// Collects all incorrectly-answered questions from lessonScores, shuffles them,
// and launches them in the existing quiz-session screen with isRetry=true.
// Does NOT overwrite lessonScores on completion — only updates aggregate mcqTotal/mcqRight.
async function startWrongAnswersRetry(){
  const scores=STATE.progress.lessonScores||{};
  const wrongQs=[];
  for(const sec of S){
    for(const l of sec.lessons){
      const sc=scores[l.id];
      if(sc&&sc.answers){
        sc.answers.forEach((ans,idx)=>{
          const q=l.quizzes[idx];
          // Store _ansIdx so we can update the exact record when answered correctly
          if(q&&ans!==q.a) wrongQs.push({...q,_secId:sec.id,_lessonId:l.id,_ansIdx:idx});
        });
      }
    }
  }
  if(wrongQs.length===0){showToast('No wrong answers to retry!','info');return;}
  // Ensure quiz data is loaded for all sections that have wrong answers
  const secIds=[...new Set(wrongQs.map(q=>q._secId))];
  await Promise.all(secIds.map(id=>ensureQuizzes(id)));
  // Shuffle
  for(let i=wrongQs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[wrongQs[i],wrongQs[j]]=[wrongQs[j],wrongQs[i]];}
  STATE.quizState={
    lessonId:null,
    sId:wrongQs[0]._secId,  // use first question's section for color only
    questions:wrongQs,
    idx:0,selected:null,answers:[],
    questionTimes:[],quizStartTime:Date.now(),qTimerStart:Date.now(),qTimerElapsed:null,
    isRetry:true
  };
  STATE.tab='quiz-session';
  render();
}

function renderWrongAnswers(){
  // Collect all wrong answers from lessonScores
  const scores=STATE.progress.lessonScores||{};
  const wrongItems=[];
  for(const sec of S){
    for(const l of sec.lessons){
      const sc=scores[l.id];
      if(sc&&sc.answers){
        sc.answers.forEach((ans,idx)=>{
          const q=l.quizzes[idx];
          if(q&&ans!==q.a) wrongItems.push({sec,lesson:l,q,chosen:ans,correct:q.a});
        });
      }
    }
  }
  const total=wrongItems.length;
  if(total===0){
    return`${renderSubNav(SUB_PRACTICE,'wrong-answers')}<div class="bh"><button class="bh-back" onclick="STATE.tab='quiz-mode-select';render()">‹</button><div style="font-size:15px;font-weight:500">Wrong Answers</div></div>
    <div class="scroll-area pad" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding-top:60px;text-align:center">
      <div style="font-size:48px;margin-bottom:16px">🎉</div>
      <div style="font-size:17px;font-weight:500;color:var(--ink);margin-bottom:8px">No wrong answers yet!</div>
      <div style="font-size:14px;color:#888;line-height:1.6">Take some quizzes and your incorrect answers will appear here for review.</div>
    </div>`;
  }
  const items=wrongItems.map((item,i)=>{
    const pct=Math.round((item.chosen===item.correct?1:0));
    return`<div class="card" style="margin-bottom:10px;border-left:3px solid var(--err)">
      <div style="font-size:10px;font-weight:500;color:${item.sec.text};margin-bottom:6px">${item.sec.emoji} ${esc(item.sec.title)} · ${esc(item.lesson.title)}</div>
      <div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:10px;line-height:1.5">${esc(item.q.q)}</div>
      ${item.q.o.map((opt,j)=>`
        <div style="padding:8px 12px;border-radius:8px;margin-bottom:6px;font-size:13px;line-height:1.4;border:.5px solid ${j===item.q.a?'var(--ok)':j===item.chosen?'var(--err)':'var(--border)'};background:${j===item.q.a?'var(--ok-tint)':j===item.chosen?'var(--err-tint)':'var(--surface-2)'};color:${j===item.q.a?'var(--ok-strong)':j===item.chosen?'var(--err-strong)':'#555'}">
          ${j===item.q.a?'✓ ':''}${j===item.chosen?'✗ ':''}${esc(opt)}
        </div>`).join('')}
      <div style="background:var(--warn-tint);border-left:3px solid var(--warn);border-radius:0 8px 8px 0;padding:10px 12px;margin-top:8px">
        <div style="font-size:10px;font-weight:500;color:var(--warn-strong);letter-spacing:.8px;margin-bottom:4px">EXPLANATION</div>
        <div style="font-size:12px;color:#633806;line-height:1.55">${esc(item.q.e)}</div>
      </div>
    </div>`;
  }).join('');
  return`${renderSubNav(SUB_PRACTICE,'wrong-answers')}<div class="bh"><button class="bh-back" onclick="STATE.tab='quiz-mode-select';render()">‹</button>
    <div style="min-width:0"><div style="font-size:15px;font-weight:500">Wrong Answers</div>
    <div style="font-size:11px;color:#888">${total} question${total===1?'':'s'} to review</div></div>
    <button onclick="startWrongAnswersRetry()" style="padding:8px 14px;border-radius:8px;border:none;background:var(--err);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0">↺ Retry All</button></div>
  <div class="scroll-area pad" style="padding-top:14px">${items}<div style="height:20px"></div></div>`;
}

function renderProgress(){
  const{progress}=STATE;const pct=getPct();
  const st=loadStudyTime();
  const streak=loadStreak();
  const today=new Date().toDateString();
  const todayMin=st.todayDate===today?st.todayMinutes:0;
  const statRow=`
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
      <div style="background:var(--brand-tint);border-radius:10px;padding:12px 8px;text-align:center">
        <div style="font-size:18px;font-weight:500;color:var(--brand)">${fmtStudyTime(st.totalMinutes||0)}</div>
        <div style="font-size:10px;color:var(--brand-2);margin-top:3px">⏱ Total Study</div>
      </div>
      <div style="background:var(--ok-tint);border-radius:10px;padding:12px 8px;text-align:center">
        <div style="font-size:18px;font-weight:500;color:var(--ok-strong)">${fmtStudyTime(todayMin)}</div>
        <div style="font-size:10px;color:var(--ok-strong-2);margin-top:3px">📅 Today</div>
      </div>
      <div style="background:var(--warn-tint);border-radius:10px;padding:12px 8px;text-align:center">
        <div style="font-size:18px;font-weight:500;color:var(--warn-strong)">${streak.count||0}🔥</div>
        <div style="font-size:10px;color:#BA7517;margin-top:3px">Streak</div>
      </div>
    </div>`;
  // Item 3: Quiz accuracy per section — surfaces weak areas even when lessons are "done"
  const cards=S.map((sec,i)=>{
    const done=sec.lessons.filter(l=>lessonDone(l.id)).length;
    const lp=Math.round(done/sec.lessons.length*100);
    // Aggregate quiz accuracy across all attempted lessons in this section
    let qCorrect=0,qTotal=0;
    sec.lessons.forEach(l=>{const sc=progress.lessonScores?.[l.id];if(sc){qCorrect+=sc.correct;qTotal+=sc.total;}});
    const qPct=qTotal>0?Math.round(qCorrect/qTotal*100):null;
    const qCol=qPct===null?'#aaa':qPct>=70?'var(--ok)':qPct>=50?'var(--warn)':'var(--err)';
    const qBg=qPct===null?'var(--surface-3)':qPct>=70?'var(--ok-tint)':qPct>=50?'var(--warn-tint)':'var(--err-tint)';
    const qLabel=qPct===null?'No quizzes yet':`Quiz: ${qPct}% (${qCorrect}/${qTotal})`;
    return`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:${i<S.length-1?'.5px solid var(--bg)':'none'}">
      <div style="width:30px;height:30px;border-radius:8px;background:${sec.bg};display:flex;align-items:center;justify-content:center;font-size:15px;flex-shrink:0">${sec.emoji}</div>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <span class="ellipsis" style="font-size:12px;font-weight:500;color:var(--ink);max-width:160px">${esc(sec.title)}</span>
          <span style="font-size:11px;font-weight:500;color:${sec.strong};flex-shrink:0;margin-left:4px">${lp}% · ${done}/${sec.lessons.length}</span>
        </div>
        <div style="height:4px;background:var(--bg);border-radius:2px;overflow:hidden;margin-bottom:5px">
          <div style="height:100%;width:${lp}%;background:${sec.bar};border-radius:2px;transition:width .5s"></div>
        </div>
        <span style="font-size:10px;font-weight:500;padding:2px 7px;border-radius:8px;background:${qBg};color:${qCol}">${qLabel}</span>
      </div>
    </div>`;}).join('');
  const resetHTML=STATE.showReset?`<div style="background:var(--err-tint);border:1px solid var(--err);border-radius:10px;padding:14px 16px;margin-top:16px"><div style="font-size:13px;color:var(--err-strong);margin-bottom:12px;font-weight:500">This will delete all your progress. Are you sure?</div><div style="display:flex;gap:8px"><button class="btn btn-outline" onclick="STATE.showReset=false;render()" style="border-color:var(--err-2);color:var(--err-2)">Cancel</button><button class="btn btn-danger" onclick="resetAll()">Yes, Reset</button></div></div>`:`<button class="btn btn-outline" onclick="STATE.showReset=true;render()" style="margin-top:16px;color:#aaa">Reset All Progress</button>`;
  return`${renderSubNav(SUB_PROGRESS,'progress')}<div style="overflow-y:auto;flex:1;padding:0 16px">
    <div style="padding:14px 0 10px">
      <div style="background:linear-gradient(135deg,var(--brand),var(--brand-3));border-radius:12px;padding:14px 16px;margin-bottom:12px">
        <h1 style="font-size:18px;font-weight:500;color:#fff;margin-bottom:10px">CMA Part 1 Progress</h1>
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:5px">
          <span style="color:rgba(255,255,255,.85)">Overall</span><span style="color:#fff;font-weight:500">${pct}% · ${progress.done.length}/${TOTAL_LESSONS} lessons</span>
        </div>
        <div style="height:6px;background:rgba(255,255,255,.25);border-radius:3px;overflow:hidden">
          <div style="height:100%;width:${pct}%;background:#fff;border-radius:3px;transition:width .6s"></div>
        </div>
      </div>
      ${statRow}
    </div>
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:0 14px;margin-bottom:12px">
      ${cards}
    </div>
    <button class="btn" onclick="STATE.tab='wrong-answers';render()" style="background:var(--err);color:#fff;margin-bottom:8px">📋 Review Wrong Answers</button>
    ${resetHTML}<div style="height:16px"></div></div>`;
}


// ─── ACTIONS ──────────────────────────────────────────────────────────────────
function goLesson(sId){STATE.tab='study';studyGo(sId,null);}
function markDone(lid){
  if(!_getDoneSet().has(lid)){
    saveProg({...STATE.progress,done:[...STATE.progress.done,lid]});
    setTimeout(syncLeaderboard,500);
    updateStreak();
  }
  // Targeted: flip button appearance instantly before navigating back
  const btn=document.querySelector('[data-markdone="'+lid+'"]');
  if(btn){btn.textContent='✓ Saved!';btn.style.background='var(--ok-tint)';btn.style.color='var(--ok-strong)';}
  setTimeout(()=>studyGo(STATE.sectId,null),180);
}
function getNextLesson(sectId,lessonId){const sec=sect(sectId);if(!sec)return null;const idx=sec.lessons.findIndex(l=>l.id===lessonId);if(idx===-1||idx>=sec.lessons.length-1){const sIdx=S.findIndex(s=>s.id===sectId);if(sIdx===-1||sIdx>=S.length-1)return null;return{sec:S[sIdx+1],lesson:S[sIdx+1].lessons[0]};}return{sec,lesson:sec.lessons[idx+1]};}
function doLessonQuiz(lid){startQuiz(lid);}
async function startQuiz(lessonId){
  startStudyTimer('quiz-'+lessonId);
  const secId=lessonId.split('-')[0];
  if(!QUIZ_CACHE[secId]){STATE.tab='loading';render();await ensureQuizzes(secId);}
  let foundLesson=null,foundSect=null;
  for(const sec of S){for(const l of sec.lessons){if(l.id===lessonId){foundLesson=l;foundSect=sec;break;}}}
  if(!foundLesson){console.log('Lesson not found:',lessonId);return;}
  // Shuffle and pick 20 random questions
  const allQ=[...foundLesson.quizzes];
  for(let i=allQ.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[allQ[i],allQ[j]]=[allQ[j],allQ[i]];}
  const questions=allQ.slice(0,Math.min(20,allQ.length));
  STATE.quizState={lessonId,sId:foundSect.id,questions,idx:0,selected:null,answers:[],questionTimes:[],quizStartTime:Date.now(),qTimerStart:Date.now(),qTimerElapsed:null};
  STATE.tab='quiz-session';render();
}
// Change 4: Targeted DOM update — selectAnswer no longer calls render().
// Before: tapping an option rebuilt the ENTIRE page (blink, scroll reset, timer restart).
// After: only the options list, explanation box, and Next button are updated in place.
// Same pattern already used in selectQuizModeAnswer (quiz mode screen).
function selectAnswer(i){
  const qs=STATE.quizState; if(!qs) return;
  if(qs.answers[qs.idx]) return;              // already answered -> read-only
  stopQTimer();
  const elapsed=Date.now()-qs.qTimerStart;
  qs.questionTimes[qs.idx]=elapsed;
  qs.qTimerElapsed=elapsed;
  const q=qs.questions[qs.idx];
  qs.answers[qs.idx]={selected:i,correct:i===q.a};
  qs.selected=i;
  render();
}

function quizGoto(i){
  const qs=STATE.quizState; if(!qs) return;
  const n=qs.questions.length; if(i<0)i=0; if(i>=n)i=n-1;
  qs.idx=i;
  const a=qs.answers[i];
  qs.selected=a?a.selected:null;
  if(a){ qs.qTimerElapsed=qs.questionTimes[i]||0; } else { qs.qTimerStart=Date.now(); qs.qTimerElapsed=null; }
  render();
}
function quizNav(dir){ const qs=STATE.quizState; if(qs) quizGoto(qs.idx+dir); }
function quizJump(i){ quizGoto(i); }
function nextQuestion(){ quizNav(1); }   // back-compat alias

async function finishQuiz(){
  const qs=STATE.quizState; if(!qs) return;
  const n=qs.questions.length;
  let unanswered=0; for(let i=0;i<n;i++) if(!qs.answers[i]) unanswered++;
  if(unanswered>0){
    const ok=await showModal({icon:'\u23ED\uFE0F',type:'warning',
      title:unanswered+' question'+(unanswered>1?'s':'')+' unanswered',
      body:"They'll be marked incorrect. Finish anyway, or go back and answer them?",
      confirmText:'Finish anyway', cancelText:'Keep going'});
    if(!ok){ let f=-1; for(let i=0;i<n;i++){ if(!qs.answers[i]){f=i;break;} } if(f>=0) quizGoto(f); return; }
  }
  _finalizeQuiz();
}

function _finalizeQuiz(){
  const qs=STATE.quizState; const n=qs.questions.length;
  const finalAnswers=[], finalTimes=[];
  for(let i=0;i<n;i++){
    finalAnswers[i]=qs.answers[i]?qs.answers[i]:{selected:null,correct:false,skipped:true};
    finalTimes[i]=qs.questionTimes[i]||0;
  }
  const rightCount=finalAnswers.filter(a=>a.correct).length;
  const p=STATE.progress;
  endStudyTimer();
  if(qs.isRetry){
    const ls={...(p.lessonScores||{})};
    qs.questions.forEach((q,i)=>{
      if(finalAnswers[i]&&finalAnswers[i].correct && q._lessonId!=null && q._ansIdx!=null){
        const entry=ls[q._lessonId];
        if(entry&&entry.answers){
          const updatedAnswers=[...entry.answers];
          updatedAnswers[q._ansIdx]=q.a;
          const newCorrect=updatedAnswers.filter((a,idx)=>{
            const qz=S.flatMap(s=>s.lessons).find(l=>l.id===q._lessonId)?.quizzes?.[idx];
            return qz&&a===qz.a;
          }).length;
          ls[q._lessonId]={...entry,answers:updatedAnswers,correct:newCorrect};
        }
      }
    });
    saveProg({...p,lessonScores:ls,mcqTotal:p.mcqTotal+n,mcqRight:p.mcqRight+rightCount});
  } else {
    const ls=p.lessonScores||{};const ansArr=finalAnswers.map(a=>a.selected);
    saveProg({...p,lessonScores:{...ls,[qs.lessonId]:{correct:rightCount,total:n,answers:ansArr}},mcqTotal:p.mcqTotal+n,mcqRight:p.mcqRight+rightCount});
  }
  STATE.quizState={...qs,answers:finalAnswers,questionTimes:finalTimes,done:true,quizEndTime:Date.now()};
  updateStreak();STATE.tab='quiz-results';render();
}

function resetAll(){saveProg({done:[],lessonScores:{},mcqTotal:0,mcqRight:0});STATE.showReset=false;render();}

// ==== PHASE 2b — LIVE CHECK-IN (student poller + hard-lock modal + attendance) ====
// Isolation contract: the poller and modal live OUTSIDE render(). They append/remove
// their own DOM node on <body> and never touch #content-area or the render loop.
// Any error fails silent — this subsystem can never block the app.
const LIVE_POLL_MS = 25000;                    // continuous poll cadence
const LIVE_AUTOCLOSE_MS = 8*60*60*1000;        // Batch 11: 3h -> 8h — a forgotten-open lecture self-expires
// Batch 11: centralized exam pass/fail line, shared by student result screen and instructor Results tab.
const EXAM_PASS_THRESHOLD = 72;
let _liveTimer = null;
let _liveShownFor = null;                      // lectureId whose modal is currently up

function loadCheckedIn(){try{return JSON.parse(localStorage.getItem('cma-checkedin-v1')||'[]');}catch{return[];}}
function saveCheckedIn(arr){try{localStorage.setItem('cma-checkedin-v1',JSON.stringify(arr.slice(-80)));}catch{}}
function hasCheckedIn(lectureId){return loadCheckedIn().includes(lectureId);}

function _liveWindowOpen(p){
  if(!p||!p.lectureId)return false;
  const openedMs=p.openedAt?Date.parse(p.openedAt):0;
  const autoClose=p.autoCloseAt?Date.parse(p.autoCloseAt):(openedMs+LIVE_AUTOCLOSE_MS);
  return Date.now()<=autoClose;                // past the bound → treated as closed
}

async function pollLiveLecture(){
  try{
    if(!STATE.user||isInstructor())return;     // instructor never checks in
    const st=loadStudent();
    if(!st||!st.groupCode)return;              // student not in a group
    const g=st.groupCode.toUpperCase();
    const doc=await db.collection('live').doc(g).get();
    if(!doc.exists){STATE.dashLive[g]={lectureId:null};return;}
    const p=doc.data();
    // Batch 5: stash for feedback prompt detection.
    STATE.dashLive[g]=p;
    if(!_liveWindowOpen(p))return;             // closed or past 3h bound
    if(hasCheckedIn(p.lectureId))return;       // already checked in for this lecture
    if(_liveShownFor===p.lectureId)return;     // modal already showing
    showCheckInModal(p,g);
  }catch(e){/* fail silent — never block the app */}
}

// ── Watchlist #1: onSnapshot replaces the 25s poller ──────────────────
// Cost profile:
//   BEFORE: 1 read / 25s / student → ~3,456 reads/day/student → 115k/day
//           at 200 active students × 4h. Blew past the 50k Spark tier.
//   AFTER:  1 initial read + 1 event per doc change. If the instructor opens
//           / closes 5 lectures/day → 5 events/student → ~1,000 reads/day
//           at 200 students. ~99% cost reduction.
// Legacy pollLiveLecture + _liveTimer left in place (dead code) so any
// external caller/debugger reference doesn't crash.
let _liveUnsubscribe = null;
function startLivePolling(){
  if(_liveUnsubscribe)return;                  // already listening
  if(!STATE.user||isInstructor())return;       // instructor never checks in
  const st=loadStudent();
  if(!st||!st.groupCode)return;                // student not in a group
  const g=st.groupCode.toUpperCase();
  try{
    _liveUnsubscribe=db.collection('live').doc(g).onSnapshot(doc=>{
      if(!doc.exists)return;
      const p=doc.data();
      if(!_liveWindowOpen(p))return;
      if(hasCheckedIn(p.lectureId))return;
      if(_liveShownFor===p.lectureId)return;
      if(document.visibilityState!=='visible')return;  // don't pop when tab is backgrounded
      showCheckInModal(p,g);
    },err=>{
      console.warn('[live] listener failed, falling back to manual poll:',err);
      // Failed subscription → keep _liveUnsubscribe null so the next
      // startLivePolling call can retry. Silent failure by design.
    });
  }catch(e){console.warn('[live] subscribe error:',e);}
}
function stopLivePolling(){
  if(_liveUnsubscribe){try{_liveUnsubscribe();}catch{}; _liveUnsubscribe=null;}
  if(_liveTimer){clearInterval(_liveTimer);_liveTimer=null;}  // clear any lingering legacy timer
  _liveShownFor=null;
  const el=document.getElementById('checkin-overlay');if(el)el.remove();
}

function showCheckInModal(p,groupCode){
  if(document.getElementById('checkin-overlay'))return;
  _liveShownFor=p.lectureId;
  const ov=document.createElement('div');
  ov.id='checkin-overlay';
  ov.setAttribute('style','position:fixed;inset:0;z-index:20000;background:linear-gradient(160deg,var(--brand),var(--brand-2));display:flex;flex-direction:column;align-items:center;justify-content:center;padding:28px;text-align:center;animation:fadeIn .2s ease;overflow-y:auto');
  ov.innerHTML=
    '<div style="font-size:60px;margin-bottom:16px">\u{1F534}</div>'+
    '<div style="font-size:13px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,.75);margin-bottom:8px">LIVE LECTURE \u00B7 '+esc(groupCode)+'</div>'+
    '<div style="font-size:22px;font-weight:700;color:#fff;line-height:1.35;margin-bottom:10px;max-width:340px">'+esc(p.title||'Lecture')+'</div>'+
    '<div style="font-size:14px;color:rgba(255,255,255,.8);line-height:1.6;margin-bottom:20px;max-width:320px">Your instructor has started a live session. Choose how you\u2019re attending, then check in.</div>'+
    '<div style="font-size:11px;font-weight:700;letter-spacing:1px;color:rgba(255,255,255,.65);margin-bottom:10px">HOW ARE YOU ATTENDING?</div>'+
    '<div id="checkin-mode-group" style="display:flex;gap:10px;margin-bottom:22px;max-width:320px;width:100%">'+
      '<button type="button" data-mode="online" class="checkin-mode-btn" style="flex:1;padding:14px 10px;border-radius:12px;border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:22px">\u{1F4BB}</span><span>Online</span></button>'+
      '<button type="button" data-mode="offline" class="checkin-mode-btn" style="flex:1;padding:14px 10px;border-radius:12px;border:2px solid rgba(255,255,255,.35);background:rgba(255,255,255,.08);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:4px"><span style="font-size:22px">\u{1F3EB}</span><span>In-person</span></button>'+
    '</div>'+
    '<button id="checkin-btn" disabled style="width:100%;max-width:320px;padding:16px;border-radius:14px;border:none;background:rgba(255,255,255,.35);color:var(--brand);font-size:17px;font-weight:700;cursor:not-allowed;font-family:inherit;box-shadow:0 8px 24px rgba(0,0,0,.25);transition:background .15s,cursor .15s">Pick a mode to check in</button>'+
    '<div style="font-size:11px;color:rgba(255,255,255,.55);margin-top:16px;max-width:300px;line-height:1.5">This confirms you\u2019re attending this session.</div>';
  document.body.appendChild(ov);
  // Wire mode buttons
  let _picked=null;
  const modeBtns=ov.querySelectorAll('.checkin-mode-btn');
  const cbtn=document.getElementById('checkin-btn');
  modeBtns.forEach(mb=>{
    mb.onclick=()=>{
      _picked=mb.getAttribute('data-mode');
      modeBtns.forEach(x=>{
        const on=x===mb;
        x.style.background=on?'#fff':'rgba(255,255,255,.08)';
        x.style.color=on?'var(--brand)':'#fff';
        x.style.borderColor=on?'#fff':'rgba(255,255,255,.35)';
      });
      cbtn.disabled=false;
      cbtn.style.background='#fff';
      cbtn.style.cursor='pointer';
      cbtn.textContent='\u2705 Check in';
    };
  });
  if(cbtn)cbtn.onclick=()=>{
    if(!_picked){showToast('Please pick a mode first.','warning');return;}
    submitCheckIn(p.lectureId,groupCode,p.title||'Lecture',_picked);
  };
}

async function submitCheckIn(lectureId,groupCode,title,mode){
  const btn=document.getElementById('checkin-btn');
  if(btn){btn.disabled=true;btn.textContent='\u23F3 Checking in\u2026';}
  try{
    const st=loadStudent()||{};
    // Batch 5: mode is now required at the UI layer; guard defensively.
    if(mode!=='online'&&mode!=='offline')mode='offline';
    await db.collection('attendance').add({
      lectureId,groupCode,title,
      mode,                                    // Batch 5: 'online' | 'offline'
      userId:STATE.user.uid,                   // MUST match rule: create if userId==request.auth.uid
      studentName:st.name||STATE.user.displayName||'Student',
      studentId:st.studentId||'',
      checkedInAt:new Date().toISOString()
    });
    const done=loadCheckedIn();done.push(lectureId);saveCheckedIn(done);
    const el=document.getElementById('checkin-overlay');if(el)el.remove();
    _liveShownFor=null;
    showToast('\u2705 You\u2019re checked in!','success',2200);
  }catch(e){
    console.warn('[CheckIn] failed:',e);
    if(btn){btn.disabled=false;btn.textContent='\u2705 Check in';}
    showToast('Check-in failed \u2014 tap again.','error');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 5 — LECTURE FEEDBACK (student submits rating + comment per lecture)
// ═══════════════════════════════════════════════════════════════════════════
// Data model:  lecture-feedback/{docId} = {
//   lectureId, groupCode, userId, studentName, rating(1-5), comment, submittedAt
// }
// Rules (added to firestore.rules):
//   read: instructor OR (owner of doc via userId)
//   create: any signed-in user, doc.userId must equal auth.uid
//   update/delete: instructor only
// Instructor controls open/close via live/{groupCode}.feedbackOpen (independent
// from checkinOpen). Feedback surface appears in the student check-in overlay
// AND as a floating card on any tab while a lecture's feedback window is open
// AND the student has already checked in for that lecture.

// LocalStorage key for lecture feedback the student has already submitted
function loadFeedbackSubmitted(){try{return JSON.parse(localStorage.getItem('cma-lec-feedback-v1')||'[]');}catch{return[];}}
function saveFeedbackSubmitted(arr){try{localStorage.setItem('cma-lec-feedback-v1',JSON.stringify(arr));}catch{}}
function hasSubmittedFeedback(lectureId){return loadFeedbackSubmitted().includes(lectureId);}

// Public: show the feedback modal for a specific lecture pointer.
function showFeedbackModal(p,groupCode){
  if(document.getElementById('feedback-overlay'))return;
  const ov=document.createElement('div');
  ov.id='feedback-overlay';
  ov.setAttribute('style','position:fixed;inset:0;z-index:20000;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn .15s ease');
  ov.innerHTML=
    '<div style="background:#fff;border-radius:18px;width:100%;max-width:400px;padding:22px 20px;box-shadow:0 24px 64px rgba(0,0,0,.25)">'+
      '<div style="font-size:32px;text-align:center;margin-bottom:6px">\u2B50</div>'+
      '<div style="font-size:17px;font-weight:600;color:var(--ink);text-align:center;line-height:1.3;margin-bottom:4px">Rate this lecture</div>'+
      '<div style="font-size:12px;color:#888;text-align:center;margin-bottom:14px">'+esc(p.title||'Lecture')+' \u00B7 '+esc(groupCode)+'</div>'+
      '<div id="fb-stars" style="display:flex;justify-content:center;gap:8px;margin-bottom:16px">'+
        [1,2,3,4,5].map(i=>'<button type="button" data-star="'+i+'" style="background:none;border:none;cursor:pointer;padding:4px;font-size:34px;color:var(--border);line-height:1;font-family:inherit">\u2605</button>').join('')+
      '</div>'+
      '<textarea id="fb-comment" placeholder="Optional comment (max 500 chars)\u2026" maxlength="500" style="width:100%;padding:10px 12px;border-radius:10px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink);box-sizing:border-box;resize:vertical;min-height:70px;margin-bottom:12px"></textarea>'+
      '<div style="display:flex;gap:8px">'+
        '<button id="fb-cancel" style="flex:1;padding:11px;border-radius:10px;border:.5px solid var(--border-4);background:#fff;color:#555;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">Later</button>'+
        '<button id="fb-submit" disabled style="flex:2;padding:11px;border-radius:10px;border:none;background:rgba(12,68,124,.35);color:#fff;font-size:14px;font-weight:600;cursor:not-allowed;font-family:inherit">Submit</button>'+
      '</div>'+
    '</div>';
  document.body.appendChild(ov);
  let _r=0;
  const stars=ov.querySelectorAll('#fb-stars button');
  const submitBtn=document.getElementById('fb-submit');
  stars.forEach((s,i)=>{
    s.onclick=()=>{
      _r=i+1;
      stars.forEach((x,j)=>{x.style.color=j<=i?'#F5B041':'var(--border)';});
      submitBtn.disabled=false;
      submitBtn.style.background='var(--brand)';
      submitBtn.style.cursor='pointer';
    };
  });
  document.getElementById('fb-cancel').onclick=()=>{markFeedbackDismissed(p&&p.lectureId);ov.remove();};
  submitBtn.onclick=()=>{
    if(!_r){showToast('Pick a rating first.','warning');return;}
    const comment=(document.getElementById('fb-comment').value||'').trim().slice(0,500);
    submitLectureFeedback(p.lectureId,groupCode,p.title||'Lecture',_r,comment);
  };
}

async function submitLectureFeedback(lectureId,groupCode,title,rating,comment){
  const submitBtn=document.getElementById('fb-submit');
  if(submitBtn){submitBtn.disabled=true;submitBtn.textContent='\u23F3 Sending\u2026';}
  try{
    const st=loadStudent()||{};
    await db.collection('lecture-feedback').add({
      lectureId,groupCode,title,
      userId:STATE.user.uid,
      studentName:st.name||STATE.user.displayName||'Student',
      studentId:st.studentId||'',
      rating,comment,
      submittedAt:new Date().toISOString()
    });
    const done=loadFeedbackSubmitted();if(!done.includes(lectureId)){done.push(lectureId);saveFeedbackSubmitted(done);}
    const el=document.getElementById('feedback-overlay');if(el)el.remove();
    showToast('\u2B50 Thanks for the feedback!','success',2200);
  }catch(e){
    console.warn('[Feedback] submit failed:',e);
    if(submitBtn){submitBtn.disabled=false;submitBtn.textContent='Submit';}
    showToast('Submit failed \u2014 try again.','error');
  }
}

// Poller-adjacent: whenever we see a live pointer with feedbackOpen=true and
// the student has already checked in and not yet submitted feedback, surface a
// floating card that opens the feedback modal.
// Batch 8 (feedback-popup): lecture IDs the student dismissed via "Later" this
// session. In-memory only, so the popup re-appears next app open if feedback is
// still open and the student still hasn't submitted.
var _feedbackDismissedSession = {};
function markFeedbackDismissed(lectureId){ if(lectureId) _feedbackDismissedSession[lectureId] = 1; }

// Batch 11: one-shot lazy fetch of the student's group's recent lectures, so
// maybeShowFeedbackPrompt can check each one's COMPUTED 7-day feedback window
// (checkinClosedAt) — the live/{groupCode} pointer alone isn't enough since
// its lectureId goes null the moment check-in closes.
// NOTE: needs a Firestore rule allowing students to read `lectures` scoped to
// their own groupCode (previously instructor-only) — add manually via console.
async function loadRecentLecturesForFeedback(){
  if(STATE.studentRecentLecturesLoaded||isInstructor()||!STATE.user)return;
  const st=loadStudent();
  if(!st||!st.groupCode)return;
  STATE.studentRecentLecturesLoaded=true;
  try{
    const g=st.groupCode.toUpperCase();
    const snap=await db.collection('lectures').where('groupCode','==',g).orderBy('createdAt','desc').limit(10).get();
    STATE.studentRecentLectures=snap.docs.map(d=>({id:d.id,...d.data()}));
  }catch(e){console.warn('[loadRecentLecturesForFeedback] failed (may need a Firestore rule):',e);}
}
function maybeShowFeedbackPrompt(){
  if(!STATE.user)return;
  loadRecentLecturesForFeedback();   // fire-and-forget, one-shot per session
  const groups=Object.keys(STATE.dashLive||{});
  for(const g of groups){
    const p=STATE.dashLive[g];
    if(!p||!p.lectureId)continue;
    if(!p.feedbackOpen)continue;
    if(!hasCheckedIn(p.lectureId))continue;      // only prompt those who attended
    if(hasSubmittedFeedback(p.lectureId))continue; // already done
    if(_feedbackDismissedSession[p.lectureId])continue; // Batch 8: dismissed this session
    if(document.getElementById('feedback-overlay'))continue;
    STATE._feedbackPromptFor={lectureId:p.lectureId,title:p.title,groupCode:g};
    return;
  }
  // Batch 11: computed 7-day windows from recently-closed lectures (covers
  // the case where the live/{groupCode} pointer has since moved to a newer
  // lecture, or was never manually toggled at all).
  for(const lec of (STATE.studentRecentLectures||[])){
    if(!isFeedbackOpen(lec))continue;
    if(!hasCheckedIn(lec.id))continue;
    if(hasSubmittedFeedback(lec.id))continue;
    if(_feedbackDismissedSession[lec.id])continue;
    if(document.getElementById('feedback-overlay'))continue;
    STATE._feedbackPromptFor={lectureId:lec.id,title:lec.title,groupCode:lec.groupCode};
    return;
  }
  STATE._feedbackPromptFor=null;
}

// ── Instructor side: attendance list for a lecture ──────────────────────────
// ── Batch 2: async lazy attendance load ──────────────────────────────
// Fetches attendance for a single lecture on demand. Cache-aware — once
// loaded, subsequent taps on the same lecture are instant (no fetch).
// After fetch completes, calls render() so the button text on the lecture
// card updates from "View check-ins" to "N checked in".
async function openAttendanceList(lectureId){
  const lec=(STATE.dashLectures||[]).find(l=>l.id===lectureId);
  // Fire the fetch; if cached, returns immediately.
  const cached=STATE.dashAttendanceByLecture[lectureId];
  const rows=cached||await loadLectureAttendance(lectureId);
  // If this was a fresh fetch, re-render so the lecture-card count updates.
  if(!cached)render();
  const sorted=rows.slice().sort((a,b)=>(a.checkedInAt||'')<(b.checkedInAt||'')?1:-1);
  if(!sorted.length){
    showModal({icon:'\u{1F465}',title:(lec?lec.title:'Lecture'),body:'No check-ins yet for this lecture.',type:'info',confirmText:'Close'});
    return;
  }
  const list=sorted.map(a=>{
    const t=a.checkedInAt?new Date(a.checkedInAt).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}):'';
    const sid=a.studentId?' \u00B7 '+a.studentId:'';
    // Batch 5: mode badge — falls back to \u2014 for legacy records without mode.
    const modeIcon=a.mode==='online'?'\u{1F4BB} Online':(a.mode==='offline'?'\u{1F3EB} In-person':'\u2014');
    return esc(a.studentName||'Student')+sid+'  '+modeIcon+(t?'  ('+t+')':'');
  });
  // Batch 5: quick counts in title.
  const _on=sorted.filter(a=>a.mode==='online').length;
  const _off=sorted.filter(a=>a.mode==='offline').length;
  const _unk=sorted.length-_on-_off;
  const _titleSuffix=' \u2014 '+sorted.length+' checked in ('+_on+' online, '+_off+' in-person'+(_unk?', '+_unk+' \u2014':'')+')';
  showModal({icon:'\u{1F465}',title:(lec?lec.title:'Lecture')+_titleSuffix,list,type:'info',confirmText:'Close'});
}


// ═════════════════════════════════════════════════════════════════════
// PHASE 3a-i — GROUP EXAMS (instructor authoring surface)
// Data model:
//   exams/{id} : { title, groupCode, questionSource:'auto', sectionId,
//                  count, durationMinutes, opensAt, closesAt,
//                  status:'scheduled'|'closed', createdAt, createdBy }
// Ownership : instructor writes; any signed-in student reads (rules already live).
// Question set is NOT stored on the exam doc — Phase 3a-ii will deterministically
//   draw `count` questions from s{sectionId}.json seeded on (examId + student.uid)
//   so refresh-cheat is impossible while sets vary across students.
// ═════════════════════════════════════════════════════════════════════

// Effective status derived from timestamps + stored status.
function examWindowStatus(x){
  if(x.status==='closed')return 'closed';
  const now=Date.now();
  const opens=x.opensAt?Date.parse(x.opensAt):0;
  const closes=x.closesAt?Date.parse(x.closesAt):0;
  if(closes&&now>closes)return 'closed';
  if(opens&&now<opens)return 'scheduled';
  return 'active';
}

// Batch 2: refresh the currently-selected group's data after any write
// (create/close/delete of exam, lecture, teaching-log entry). Cache-busts
// dashLoadedForGroup so loadDashScopedData actually re-fetches instead of
// returning the memoized snapshot.
async function refreshDashScoped(){
  const g=STATE.dashSelectedGroup;
  if(!g)return;
  STATE.dashLoadedForGroup=null;
  await loadDashScopedData(g);
}

// Legacy shim — kept because saveExam / closeExamNow / deleteExam still
// call it. Redirects to the scoped refresh so we don't fetch every exam
// in the database on each write.
async function loadDashExams(){
  await refreshDashScoped();
}

// Batch 11: largest-remainder split of `total` into `n` integer buckets that
// sum back to `total` exactly (e.g. 40/3 -> [14,13,13], not 13.33 each).
function _largestRemainderSplit(total,n){
  if(n<=0)return[];
  const base=Math.floor(total/n);
  const rem=total-base*n;
  const arr=new Array(n).fill(base);
  for(let i=0;i<rem;i++)arr[i]++;
  return arr;
}
// Batch 11: shared section- and unit-balanced pool builder, used by both
// saveExam (creation) and reshuffleExam (re-roll) so distribution logic
// never drifts between the two. sectionIds: array of section ids.
// unitsBySection: {sectionId:[unitIds]} (empty/missing = whole section).
// Returns {ok:true,questionIds:[...]} or {ok:false,message}.
async function buildDistributedExamPool(sectionIds,unitsBySection,count){
  await Promise.all(sectionIds.map(sid=>ensureQuizzes(sid)));
  const secPools={};   // sid -> {unitId -> [qid,...]}
  sectionIds.forEach(sid=>{
    const sec=S.find(s=>s.id===sid);
    if(!sec)return;
    const filterUnits=Array.isArray(unitsBySection[sid])&&unitsBySection[sid].length?unitsBySection[sid].map(String):null;
    const byUnit={};
    sec.lessons.forEach(l=>{
      if(filterUnits&&!filterUnits.includes(String(l.id)))return;
      if(l.quizzes&&l.quizzes.length){
        l.quizzes.forEach((q,i)=>{
          if(isOutOfScopeQ(l,q))return;   // never freeze Part-2 content into a graded exam
          const qid=l.id+':'+(q.id||i);
          (byUnit[l.id]=byUnit[l.id]||[]).push(qid);
        });
      }
    });
    secPools[sid]=byUnit;
  });
  const secQuotas={};
  _largestRemainderSplit(count,sectionIds.length).forEach((q,i)=>{secQuotas[sectionIds[i]]=q;});
  const picked=[];
  const leftoverPool=[];   // surplus questions (available but past their unit's quota) — backfill source
  let totalShortfall=0;
  sectionIds.forEach(sid=>{
    const byUnit=secPools[sid]||{};
    const unitIds=Object.keys(byUnit);
    const quota=secQuotas[sid]||0;
    const unitQuotas={};
    _largestRemainderSplit(quota,unitIds.length).forEach((q,i)=>{unitQuotas[unitIds[i]]=q;});
    let filled=0;
    unitIds.forEach(uid=>{
      const pool=byUnit[uid].slice();
      for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
      const take=Math.min(unitQuotas[uid]||0,pool.length);
      picked.push(...pool.slice(0,take));
      filled+=take;
      leftoverPool.push(...pool.slice(take));   // unused surplus from this unit
    });
    if(filled<quota)totalShortfall+=(quota-filled);
  });
  // Redistribute shortfall from whatever surplus exists elsewhere in the exam.
  if(totalShortfall>0&&leftoverPool.length){
    for(let i=leftoverPool.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[leftoverPool[i],leftoverPool[j]]=[leftoverPool[j],leftoverPool[i]];}
    while(totalShortfall>0&&leftoverPool.length){picked.push(leftoverPool.pop());totalShortfall--;}
  }
  if(picked.length<count){
    return {ok:false,message:'Only '+picked.length+' in-scope questions available across your selection (need '+count+'). Reduce Question count or select more units/sections.'};
  }
  const finalShuffled=picked.slice();
  for(let i=finalShuffled.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[finalShuffled[i],finalShuffled[j]]=[finalShuffled[j],finalShuffled[i]];}
  return {ok:true,questionIds:finalShuffled.slice(0,count)};
}

async function saveExam(){

  const d=STATE.dashExamDraft;
  if(!d.title||!d.title.trim()){showToast('Enter an exam title.','warning');return;}
  if(!d.groupCode){showToast('Choose a group.','warning');return;}
  const sectionIds=Array.isArray(d.sectionIds)?d.sectionIds.map(Number).filter(Boolean):[];
  if(!sectionIds.length){showToast('Choose at least one section.','warning');return;}
  const count=parseInt(d.count);
  if(!count||count<3||count>50){showToast('Question count must be 3–50.','warning');return;}
  const dur=parseInt(d.durationMinutes);
  if(!dur||dur<3||dur>240){showToast('Duration must be 3–240 minutes.','warning');return;}
  if(!d.opensAt||!d.closesAt){showToast('Set both opens and closes times.','warning');return;}
  const opensISO=new Date(d.opensAt).toISOString();
  const closesISO=new Date(d.closesAt).toISOString();
  if(new Date(closesISO)<=new Date(opensISO)){showToast('Closes must be after opens.','warning');return;}
  if(new Date(closesISO)<=new Date()){showToast('Closes time is in the past.','warning');return;}
  try{
    // Batch 11: even split across sections, then even split across each
    // section's selected units (largest-remainder rounding), shared with
    // reshuffleExam() via buildDistributedExamPool().
    const unitsBySection=d.unitsBySection||{};
    const result=await buildDistributedExamPool(sectionIds,unitsBySection,count);
    if(!result.ok){showToast(result.message,'warning');return;}
    await db.collection('exams').add({
      title:d.title.trim(),
      groupCode:d.groupCode.toUpperCase(),
      questionSource:'auto',
      sectionIds,                              // Batch 11: multi-section
      unitsBySection,                          // Batch 11: {sectionId:[unitIds]}
      sectionId:sectionIds[0],                 // legacy single-section field, kept for old display code / old exam readers
      unitIds:unitsBySection[sectionIds[0]]||[],
      questionIds:result.questionIds,          // frozen set — same for all students
      count,durationMinutes:dur,
      opensAt:opensISO,closesAt:closesISO,
      status:'scheduled',
      createdAt:new Date().toISOString(),
      createdBy:STATE.user.uid
    });
    showToast('Exam created \u2705','success');
    // Batch 2: preserve group prefill so back-to-back exams for the same
    // group don't require re-selection
    STATE.dashExamDraft={title:'',groupCode:STATE.dashSelectedGroup,sectionIds:[],unitsBySection:{},count:20,durationMinutes:30,opensAt:'',closesAt:''};
    await loadDashExams();
  }catch(e){
    showToast('Error: '+e.message,'error');
  }
}

async function closeExamNow(id){
  const ok=await showModal({
    icon:'\u{1F6D1}',title:'Close Exam Now?',
    body:'Students will no longer be able to start this exam. Any in-progress attempts can still submit.',
    type:'danger',confirmText:'Close',cancelText:'Cancel'
  });
  if(!ok)return;
  try{
    await db.collection('exams').doc(id).update({
      status:'closed',
      closedAt:new Date().toISOString()
    });
    STATE.dashExamsLoaded=false;
    await loadDashExams();
  }catch(e){showToast('Error closing exam.','error');}
}

async function deleteExam(id){
  const ok=await showModal({
    icon:'\u{1F5D1}\uFE0F',title:'Delete Exam?',
    body:'This removes the exam. Any student results already submitted are preserved.',
    type:'danger',confirmText:'Delete',cancelText:'Cancel'
  });
  if(!ok)return;
  try{
    await db.collection('exams').doc(id).delete();
    STATE.dashExamsLoaded=false;
    await loadDashExams();
  }catch(e){showToast('Error deleting exam.','error');}
}


// ==== PHASE 1 DASHBOARD HANDLERS (ported from FMAA, remapped) ====
// Legacy shim — teaching-log is now scoped by group in loadDashScopedData.
async function loadTeachingLog(){await refreshDashScoped();}
function toggleTeachingUnit(uid){const u=STATE.dashTeachingDraft.unitIds;const i=u.indexOf(uid);if(i>=0)u.splice(i,1);else u.push(uid);render();}

// Batch 8 (teaching-log-lecture-picker): link an Actual-Teaching entry to a
// lecture already created in the Lectures tab. Selecting one auto-fills the
// date and links lectureId/lectureTitle; units stay a manual pick because
// lectures don't carry units. Clearing the select unlinks (leaves other fields).
function onTeachingLecturePick(id){
  const d=STATE.dashTeachingDraft;
  if(!id){ d.lectureId=''; d.lectureTitle=''; render(); return; }
  const lec=(STATE.dashLectures||[]).find(l=>l.id===id);
  if(!lec){ render(); return; }
  d.lectureId=lec.id;
  d.lectureTitle=lec.title||'';
  if(lec.date) d.date=lec.date;
  if(!d.lectureNumber){ d.lectureNumber=String(((STATE.dashTeachingLog||[]).length)+1); }
  render();
}
function _tlFlagField(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  el.classList.add('field-error');
  setTimeout(()=>{el.classList.remove('field-error');},2500);
}
async function saveTeachingEntry(){
  const d=STATE.dashTeachingDraft;
  // Batch 2: draft group is auto-prefilled from dashSelectedGroup, but we
  // still validate defensively in case someone tabs directly to this action.
  if(!d.groupCode)d.groupCode=STATE.dashSelectedGroup;
  // S4-E: check required fields in order; on the first empty one show a
  // specific message and scroll+highlight that field instead of a generic toast.
  if(!d.groupCode){showToast('No group selected.','warning');return;}
  if(!d.lectureNumber){showToast('Enter a lecture #.','warning');_tlFlagField('tl-lecno');return;}
  if(!d.date){showToast('Pick a date.','warning');_tlFlagField('tl-date');return;}
  if(!d.unitIds.length){showToast('Select at least one unit.','warning');_tlFlagField('tl-units');return;}
  try{
    await db.collection('teaching-log').add({groupCode:d.groupCode.trim().toUpperCase(),lectureNumber:Number(d.lectureNumber),date:d.date,unitIds:d.unitIds.slice(),notes:d.notes.trim(),lectureId:d.lectureId||'',lectureTitle:d.lectureTitle||'',createdAt:new Date().toISOString(),createdBy:STATE.user.uid});
    showToast('Teaching entry saved \u2705','success');
    // Reset draft but preserve group prefill for the next entry
    STATE.dashTeachingDraft={groupCode:STATE.dashSelectedGroup,lectureNumber:'',date:'',unitIds:[],notes:'',lectureId:'',lectureTitle:''};
    await refreshDashScoped();
  }catch(e){showToast('Error: '+e.message,'error');}
}
async function deleteTeachingEntry(id){
  const ok=await showModal({icon:'\u{1F5D1}\uFE0F',title:'Delete Entry?',body:'This removes the teaching record. Questions of the Day may change for that group.',type:'danger',confirmText:'Delete',cancelText:'Cancel'});
  if(!ok)return;
  try{await db.collection('teaching-log').doc(id).delete();await refreshDashScoped();}catch(e){showToast('Error deleting.','error');}
}
async function saveGroup(){
  const inp=document.getElementById('new-group-input');
  if(!inp)return;
  const code=inp.value.toUpperCase().replace(/[^A-Z0-9\x2D]/g,'').trim();
  if(!code){showToast('Enter a group code.','warning');return;}
  if(STATE.dashGroups.some(g=>g.code===code)){showToast('Group already exists.','warning');return;}
  try{
    const ref=await db.collection('groups').add({code,createdAt:new Date().toISOString()});
    STATE.dashGroups.push({id:ref.id,code,createdAt:new Date().toISOString()});
    inp.value='';
    render();
    showToast('Group '+code+' added.','success');
  }catch(e){
    showToast('Error saving group.','error');
  }
}
async function deleteGroup(id,code){
  const ok=await showModal({icon:'\u{1F5D1}\uFE0F',title:'Delete Group?',body:'Remove group '+code+'? Students already assigned to this group will keep their code but it will no longer be accepted for new registrations.',type:'danger',confirmText:'Delete',cancelText:'Cancel'});
  if(!ok)return;
  try{
    await db.collection('groups').doc(id).delete();
    STATE.dashGroups=STATE.dashGroups.filter(g=>g.id!==id);
    render();
    showToast('Group '+code+' deleted.','success');
  }catch(e){
    showToast('Error deleting group.','error');
  }
}
function renderDashGroups(){
  const groups=STATE.dashGroups||[];
  const students=STATE.dashStudents||[];
  const rows=groups.map(g=>{
    const count=students.filter(s=>s.groupCode===g.code).length;
    const created=g.createdAt?new Date(g.createdAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
    return `<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;padding:11px 14px;border-bottom:.5px solid var(--bg)">`+
      `<div style="display:flex;align-items:center;gap:10px;flex:1;min-width:0">`+
      `<span style="font-size:14px;font-weight:600;color:var(--brand);font-family:'Courier New',monospace;letter-spacing:.5px">${esc(g.code)}</span>`+
      `<span style="font-size:11px;background:#EBF5FB;color:var(--brand);padding:2px 8px;border-radius:10px">${count} student${count!==1?'s':''}</span>`+
      `${created?`<span style="font-size:11px;color:#aaa">${created}</span>`:''}`+
      `</div>`+
      `<button onclick="deleteGroup('${g.id}','${esc(g.code)}')" style="padding:5px 10px;border-radius:6px;border:.5px solid var(--err)40;background:var(--err-tint);color:var(--err-2);font-size:11px;cursor:pointer;font-family:inherit;flex-shrink:0">\u{1F5D1}\uFE0F</button>`+
      `</div>`;
  }).join('');
  return `<div style="padding:14px">`+
    `<div style="font-size:13px;color:#555;line-height:1.6;margin-bottom:14px">Only codes listed here will be accepted when students enter a group code on their profile.</div>`+
    `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;margin-bottom:16px;overflow:hidden">`+
    `<div style="padding:10px 14px;background:#F4F6F7;border-bottom:.5px solid var(--border);font-size:11px;font-weight:600;color:#555;letter-spacing:.5px">ACTIVE GROUPS (${groups.length})</div>`+
    (groups.length?rows:`<div style="padding:20px;text-align:center;font-size:13px;color:#aaa">No groups yet — add one below.</div>`)+
    `</div>`+
    `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px">`+
    `<div style="font-size:12px;font-weight:600;color:#555;letter-spacing:.5px;margin-bottom:10px">ADD NEW GROUP</div>`+
    `<div style="display:flex;gap:8px;align-items:center">`+
    `<input id="new-group-input" type="text" placeholder="e.g. FC-JUN26" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9\x2D]/g,'')" maxlength="20" style="flex:1;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:'Courier New',monospace;outline:none;color:var(--ink);background:var(--surface);text-transform:uppercase" onkeydown="if(event.key==='Enter')saveGroup()">`+
    `<button onclick="saveGroup()" style="padding:10px 18px;border-radius:8px;border:none;background:var(--brand);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0">+ Add</button>`+
    `</div>`+
    `<div style="font-size:11px;color:#888;margin-top:6px">Letters, numbers and hyphens only. Max 20 characters.</div>`+
    `</div></div>`;
}

// ═════════════════════════════════════════════════════════════════════
// BATCH 2 — GROUP-SCOPED DASHBOARD ARCHITECTURE
//
// The previous loadDashboardP1() fetched EVERY doc from EVERY dashboard
// collection on every open — fine at 50 students, unsustainable at 320.
//
// New split:
//   loadDashGroupsList()          — unscoped, cheap. Groups + full student
//                                    roster (for chip counts). ~50 reads
//                                    total, cached across group switches.
//   loadDashScopedData(groupCode) — per-group scoped. Lectures, teaching-log,
//                                    exams, live pointer filtered to one
//                                    group. Re-fires on group switch.
//   loadLectureAttendance(id)     — on-demand per-lecture attendance. Only
//                                    fires when instructor taps a specific
//                                    lecture's attendance list.
//
// Cost profile at target scale (8 groups × 40 students × 15 lectures):
//   BEFORE Batch 2: ~4,800 reads/dashboard-open   (unusable at 6 months)
//   AFTER  Batch 2:   ~120 reads/dashboard-open   (98% reduction)
// ═════════════════════════════════════════════════════════════════════

// ── Persistence: remember the last-selected group forever ─────────────
function loadDashGroup(){try{return localStorage.getItem('cma-dash-group-v1')||'';}catch{return '';}}
function saveDashGroup(code){try{localStorage.setItem('cma-dash-group-v1',code||'');}catch{}}

// ── Groups + roster (unscoped, always fresh, called on first dashboard open) ──
async function loadDashGroupsList(){
  if(STATE.dashGroupsLoaded)return;
  try{
    const [gsnap,ssnap]=await Promise.all([
      db.collection('groups').get(),
      db.collection('students').get()
    ]);
    STATE.dashGroups=gsnap.docs.map(d=>({id:d.id,...d.data()}));
    STATE.dashStudents=ssnap.docs.map(d=>{const x=d.data();return {uid:d.id,groupCode:x.groupCode||'',name:x.name||'',...x};});
    STATE.dashGroupsLoaded=true;
  }catch(e){
    console.warn('[Dashboard groups] load failed:',e);
    STATE.dashError=true;
  }
}

// ── Scoped fetches — fires on dashboard open AND on group switch ──────
async function loadDashScopedData(groupCode){
  if(!groupCode){
    // No group selected — nothing to scope. Empty state will render.
    STATE.dashLectures=[];STATE.dashTeachingLog=[];STATE.dashExams=[];STATE.dashLive={};
    STATE.dashLoadedForGroup='';STATE.dashLoaded=true;STATE.dashLoading=false;
    render();return;
  }
  if(STATE.dashLoadedForGroup===groupCode&&STATE.dashLoaded)return;   // already cached
  STATE.dashLoading=true;STATE.dashError=false;
  // Instant-swap UX (Decision 2A): clear stale data so old group's numbers
  // never appear under the new group's header — skeleton renders instead.
  STATE.dashLectures=[];STATE.dashTeachingLog=[];STATE.dashExams=[];STATE.dashLive={};
  STATE.dashAttendanceByLecture={};   // group switch invalidates per-lecture cache
  render();
  try{
    const [lsnap,tsnap,exsnap,livedoc]=await Promise.all([
      db.collection('lectures').where('groupCode','==',groupCode).get(),
      db.collection('teaching-log').where('groupCode','==',groupCode).get(),
      db.collection('exams').where('groupCode','==',groupCode).get(),
      db.collection('live').doc(groupCode).get()
    ]);
    STATE.dashLectures=lsnap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(b.date||'')>(a.date||'')?1:(b.createdAt||'')>(a.createdAt||'')?1:-1);
    STATE.dashTeachingLog=tsnap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(b.date||'')>(a.date||'')?1:-1);
    STATE.dashExams=exsnap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(b.opensAt||'')>(a.opensAt||'')?1:-1);
    STATE.dashLive={};
    if(livedoc.exists)STATE.dashLive[groupCode]=livedoc.data();
    STATE.dashTeachingLogLoaded=true;STATE.dashExamsLoaded=true;
    STATE.dashLoadedForGroup=groupCode;STATE.dashLoaded=true;
  }catch(e){
    console.warn('[Dashboard scoped] load failed:',e);
    STATE.dashError=true;
  }
  STATE.dashLoading=false;render();
}

// ── Main entry point — called by renderDashboard on every open ────────
async function loadDashboardP1(){
  if(STATE.dashLoading)return;
  STATE.dashLoading=true;
  await loadDashGroupsList();
  // Auto-select logic (Decision 1C — persistent memory):
  //   1. If a group is already selected in STATE, honor it.
  //   2. Else, restore from localStorage if the stored code still exists.
  //   3. Else, if only one group exists, auto-select it.
  //   4. Else, leave empty — the empty state prompts a choice.
  if(!STATE.dashSelectedGroup){
    const stored=loadDashGroup();
    const exists=code=>STATE.dashGroups.some(g=>g.code===code);
    if(stored&&exists(stored))STATE.dashSelectedGroup=stored;
    else if(STATE.dashGroups.length===1)STATE.dashSelectedGroup=STATE.dashGroups[0].code;
  }
  STATE.dashLoading=false;
  if(STATE.dashSelectedGroup){
    await loadDashScopedData(STATE.dashSelectedGroup);
  }else{
    STATE.dashLoaded=true;render();
  }
}

// ── User handler: chip tap. Persist + swap + fetch. ───────────────────
function selectDashGroup(code){
  if(!code||code===STATE.dashSelectedGroup)return;
  STATE.dashSelectedGroup=code;
  saveDashGroup(code);
  STATE.dashLoadedForGroup=null;    // invalidate cache
  STATE.dashLoaded=false;
  STATE.dashExamViewingId=null;     // close any open exam-results drill-down
  STATE.dashExamPreviewId=null;     // Batch 6: close any open exam preview
  STATE.dashStudentAttendanceUid=null; // Batch 6: close any open attendance history
  loadDashScopedData(code);
}

// ── On-demand per-lecture attendance ──────────────────────────────────
async function loadLectureAttendance(lectureId){
  if(!lectureId)return[];
  const cache=STATE.dashAttendanceByLecture[lectureId];
  if(cache)return cache;
  try{
    const snap=await db.collection('attendance').where('lectureId','==',lectureId).get();
    const list=snap.docs.map(d=>({id:d.id,...d.data()}));
    // LRU-style bounded cache (30 lectures max in memory)
    const keys=Object.keys(STATE.dashAttendanceByLecture);
    if(keys.length>=30)delete STATE.dashAttendanceByLecture[keys[0]];
    STATE.dashAttendanceByLecture[lectureId]=list;
    return list;
  }catch(e){
    console.warn('[Attendance] load failed for lecture',lectureId,e);
    return [];
  }
}


// ==== INSTRUCTOR DASHBOARD — PHASE 2a (Lectures + live pointer) ====
// Data model:
//   lectures/{id}    : {title, groupCode, date, status:'scheduled'|'ended', createdAt, createdBy}
//   live/{GROUPCODE} : {lectureId, title, openedAt}  (open)  |  {lectureId:null}  (closed)
// "One live per group" is STRUCTURAL — the live doc key IS the group code.
// A lecture is "live" iff  STATE.dashLive[groupCode].lectureId === lecture.id.

async function createLecture(){
  const d=STATE.dashLectureDraft;
  // Batch 2: draft group is auto-prefilled from dashSelectedGroup by
  // renderDashLectures. Fall back defensively if the user navigated in
  // some other way.
  if(!d.groupCode)d.groupCode=STATE.dashSelectedGroup;
  if(!d.title||!d.title.trim()){showToast('Enter a lecture title.','warning');return;}
  if(!d.groupCode){showToast('Pick a group first (chip strip above).','warning');return;}
  try{
    const entry={
      title:d.title.trim(),
      groupCode:d.groupCode.toUpperCase(),
      date:d.date||new Date().toISOString().slice(0,10),
      status:'scheduled',
      createdAt:new Date().toISOString(),
      createdBy:STATE.user.uid
    };
    const ref=await db.collection('lectures').add(entry);
    STATE.dashLectures.unshift({id:ref.id,...entry});
    // Preserve selected-group prefill for the next lecture
    STATE.dashLectureDraft={title:'',groupCode:STATE.dashSelectedGroup,date:''};
    render();
    showToast('Lecture created.','success');
    // Batch 11: auto-open check-in immediately on creation — no separate
    // manual click needed. Reuses openLecture()'s existing "one live per
    // group" takeover-confirmation flow, so nothing about that UX changes.
    await openLecture(ref.id);
  }catch(e){console.warn('[Lecture] create failed:',e);showToast('Error creating lecture.','error');}
}

async function deleteLecture(id){
  const lec=(STATE.dashLectures||[]).find(l=>l.id===id);
  const ok=await showModal({icon:'\u{1F5D1}\uFE0F',title:'Delete Lecture?',body:'This permanently removes the lecture'+(lec?' "'+lec.title+'"':'')+'. If it is currently live, check-in will be closed.',type:'danger',confirmText:'Delete',cancelText:'Cancel'});
  if(!ok)return;
  try{
    // If this lecture is the live one for its group, clear the pointer first.
    if(lec&&STATE.dashLive[lec.groupCode]&&STATE.dashLive[lec.groupCode].lectureId===id){
      await db.collection('live').doc(lec.groupCode).set({lectureId:null});
      STATE.dashLive[lec.groupCode]={lectureId:null};
    }
    await db.collection('lectures').doc(id).delete();
    STATE.dashLectures=STATE.dashLectures.filter(l=>l.id!==id);
    // Batch 2: clear the attendance cache for this lecture — records may
    // still exist but the lecture is gone, so no reason to hold the entries
    delete STATE.dashAttendanceByLecture[id];
    render();
    showToast('Lecture deleted.','success');
  }catch(e){console.warn('[Lecture] delete failed:',e);showToast('Error deleting lecture.','error');}
}

async function openLecture(id){
  const lec=(STATE.dashLectures||[]).find(l=>l.id===id);
  if(!lec)return;
  const g=lec.groupCode;
  const currentLive=STATE.dashLive[g];
  // One-live-per-group: if another lecture is live for this group, confirm takeover.
  if(currentLive&&currentLive.lectureId&&currentLive.lectureId!==id){
    const prev=(STATE.dashLectures||[]).find(l=>l.id===currentLive.lectureId);
    const ok=await showModal({icon:'\u{1F534}',title:'Group Already Live',body:'Group '+g+' already has a live lecture'+(prev?' ("'+prev.title+'")':'')+'. Opening this one will close that one. Continue?',type:'warning',confirmText:'Open This Lecture',cancelText:'Cancel'});
    if(!ok)return;
    // mark the previous lecture ended
    if(prev){try{await db.collection('lectures').doc(prev.id).update({status:'ended'});prev.status='ended';}catch(e){}}
  }
  try{
    const _openedAt=new Date();
    const pointer={lectureId:id,title:lec.title,openedAt:_openedAt.toISOString(),autoCloseAt:new Date(_openedAt.getTime()+LIVE_AUTOCLOSE_MS).toISOString()};
    await db.collection('live').doc(g).set(pointer);
    STATE.dashLive[g]=pointer;
    // Re-open a previously-ended lecture returns it to scheduled while live.
    if(lec.status==='ended'){try{await db.collection('lectures').doc(id).update({status:'scheduled'});lec.status='scheduled';}catch(e){}}
    render();
    showToast('\u{1F534} '+lec.title+' is now LIVE for '+g,'success');
  }catch(e){console.warn('[Lecture] open failed:',e);showToast('Error opening lecture.','error');}
}

async function closeLecture(id){
  const lec=(STATE.dashLectures||[]).find(l=>l.id===id);
  if(!lec)return;
  const g=lec.groupCode;
  try{
    await db.collection('live').doc(g).set({lectureId:null});
    STATE.dashLive[g]={lectureId:null};
    // Batch 11: checkinClosedAt lives on the LECTURE doc (not the shared
    // live/{groupCode} pointer) so its 7-day feedback window survives even
    // after a newer lecture's check-in overwrites the group's live pointer.
    const checkinClosedAt=new Date().toISOString();
    await db.collection('lectures').doc(id).update({status:'ended',checkinClosedAt});
    lec.status='ended';
    lec.checkinClosedAt=checkinClosedAt;
    render();
    showToast('Lecture closed. Feedback is now open for 7 days.','info');
  }catch(e){console.warn('[Lecture] close failed:',e);showToast('Error closing lecture.','error');}
}
// Batch 11: feedback window is COMPUTED from checkinClosedAt, same pattern as
// _liveWindowOpen() for check-in — no write needed at the exact close moment,
// and multiple lectures can have independently-running windows.
function isFeedbackOpen(lec){
  if(!lec||!lec.checkinClosedAt)return false;
  const elapsed=Date.now()-Date.parse(lec.checkinClosedAt);
  return elapsed>=0 && elapsed<7*24*60*60*1000;
}
// Batch 11: lazy backfill for the AUTO-close case (8h lapse). There's no cron,
// so whichever client renders the lecture list first and notices the check-in
// window has lapsed (autoEnded) but checkinClosedAt was never written, writes
// it now — using the SCHEDULED autoCloseAt time (not "now"), so the 7-day
// feedback window starts from when the check-in should have closed.
function _maybeBackfillCheckinClosedAt(lec,ptr){
  if(!lec||lec.checkinClosedAt||!ptr||!ptr.autoCloseAt)return;
  if(ptr.lectureId!==lec.id)return;
  if(Date.now()<=Date.parse(ptr.autoCloseAt))return;   // still within window
  const checkinClosedAt=ptr.autoCloseAt;
  lec.checkinClosedAt=checkinClosedAt;   // optimistic, avoids repeat writes this session
  db.collection('lectures').doc(lec.id).update({status:'ended',checkinClosedAt}).catch(()=>{});
}

function isLectureLive(lec){
  const p=STATE.dashLive[lec.groupCode];
  return !!(p&&p.lectureId===lec.id&&_liveWindowOpen(p));
}

function renderDashLectures(){
  const lectures=STATE.dashLectures||[];
  const selectedGroup=STATE.dashSelectedGroup;
  const d=STATE.dashLectureDraft;
  // Batch 2: auto-prefill the draft group from the selected group so the
  // instructor never types the wrong code by mistake. Draft still overridable.
  if(selectedGroup&&!d.groupCode)d.groupCode=selectedGroup;
  const createCard=`
    <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">\u2795 Create a Lecture for <span style="font-family:'Courier New',monospace;color:var(--brand)">${esc(selectedGroup)}</span></div>
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="margin-bottom:10px"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Title *</label>
        <input id="lec-title" type="text" value="${esc(d.title||'')}" oninput="STATE.dashLectureDraft.title=this.value" placeholder="e.g. Section A \u2014 Cost Behavior" style="width:100%;padding:9px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface);box-sizing:border-box"></div>
      <div style="margin-bottom:12px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Date</label>
        <input id="lec-date" type="date" value="${esc(d.date||'')}" oninput="STATE.dashLectureDraft.date=this.value" style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
      </div>
      <button onclick="createLecture()" style="width:100%;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Create Lecture</button>
    </div>`;
  // Lecture rows — friendly empty state if none for this group
  if(lectures.length===0){
    return `<div style="padding:14px">${createCard}${renderDashTabEmpty('Lectures',selectedGroup,{icon:'\u{1F3AC}',body:'This group has no lectures yet. Use the form above to create one.'})}</div>`;
  }
  const rows=lectures.map(l=>{
    const live=isLectureLive(l);
    const dt=l.date?new Date(l.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
    const _ptr=STATE.dashLive[l.groupCode];
    const autoEnded=!live&&_ptr&&_ptr.lectureId===l.id;  // pointed here but window passed
    if(autoEnded)_maybeBackfillCheckinClosedAt(l,_ptr);   // Batch 11: lazy-detect auto-close
    const badge=live
      ?`<span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;background:var(--err-tint);color:#C0392B">\u{1F534} LIVE</span>`
      :(autoEnded
        ?`<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;background:#EAECEE;color:#566573">Ended (auto)</span>`
        :(l.status==='ended'
          ?`<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;background:#EAECEE;color:#566573">Ended</span>`
          :`<span style="font-size:10px;font-weight:600;padding:2px 9px;border-radius:10px;background:var(--warn-tint-2);color:#9A7D0A">Scheduled</span>`));
    // Batch 2: attendance count comes from lazy cache. If not yet fetched,
    // show a neutral "View check-ins" prompt instead of a stale zero.
    const cached=STATE.dashAttendanceByLecture[l.id];
    const attBtn=cached
      ?`<button onclick="openAttendanceList('${l.id}')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--brand)30;background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F465} ${cached.length} checked in</button>`
      :`<button onclick="openAttendanceList('${l.id}')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--border-4);background:var(--surface);color:#555;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F465} View check-ins</button>`;
    const action=live
      ?`<button onclick="closeLecture('${l.id}')" style="padding:7px 14px;border-radius:8px;border:none;background:#C0392B;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u25A0 Close check-in</button>`
      :`<button onclick="openLecture('${l.id}')" style="padding:7px 14px;border-radius:8px;border:none;background:#1E8449;color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u25B6 Open check-in</button>`;
    return `<div style="background:#fff;border:.5px solid ${live?'#C0392B40':'var(--border)'};border-radius:12px;padding:13px 14px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
        <div style="min-width:0"><div style="font-size:14px;font-weight:600;color:var(--ink);line-height:1.3">${esc(l.title)}</div>
          <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:5px;align-items:center">
            ${dt?`<span style="font-size:11px;color:#888">${dt}</span>`:''}${badge}</div></div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        ${action}
        ${attBtn}
        <button onclick="deleteLecture('${l.id}')" style="padding:7px 10px;border-radius:8px;border:.5px solid var(--err)40;background:var(--err-tint);color:var(--err-2);font-size:12px;cursor:pointer;font-family:inherit">\u{1F5D1}\uFE0F</button>
      </div>
    </div>`;
  }).join('');
  return `<div style="padding:14px">${createCard}
    <div style="font-size:12px;font-weight:500;color:#888;letter-spacing:.5px;margin-bottom:8px">LECTURES (${lectures.length})</div>
    ${rows}</div>`;
}

// ─── RENDER DASHBOARD: EXAMS ─────────────────────────────────────────
// ══ Batch 6: Exam Preview — instructor read-only view of frozen questions ══
// Uses the existing frozen questions snapshot on each exam doc (Batch 1).
// Rules: instructor-only access via existing signed-in read on /exams.

function openExamPreview(examId){
  STATE.dashExamPreviewId=examId;
  render();
}
function closeExamPreview(){
  STATE.dashExamPreviewId=null;
  render();
}

// Batch 6 · Item H helper — resolve frozen questionIds into full question
// objects using the section quiz JSON that ensureQuizzes() has already cached.
// qid format from saveExam(): "<lessonId>:<qid_or_index>".
// Returns null if the section isn't cached yet (caller triggers ensureQuizzes).
function _hydrateExamQuestions(ex){
  try{
    // Batch 11: multi-section aware — legacy single-section exams (no
    // sectionIds array) fall back to their one sectionId as before.
    const secIds=Array.isArray(ex.sectionIds)&&ex.sectionIds.length?ex.sectionIds:[ex.sectionId];
    const secs=secIds.map(sid=>S.find(s=>s.id===parseInt(sid))).filter(Boolean);
    if(!secs.length) return [];
    const hasCache=secs.some(sec=>sec.lessons.some(l=>Array.isArray(l.quizzes)&&l.quizzes.length));
    if(!hasCache) return null;
    const byLesson={};
    secs.forEach(sec=>{ sec.lessons.forEach(l=>{ byLesson[l.id]=l; }); });
    const out=[];
    (ex.questionIds||[]).forEach(qid=>{
      const [lid,tail]=String(qid).split(':');
      const l=byLesson[lid]; if(!l||!Array.isArray(l.quizzes)) return;
      let q=l.quizzes.find(x=>String(x.id)===String(tail));
      if(!q){
        const idx=parseInt(tail);
        if(Number.isFinite(idx) && l.quizzes[idx]) q=l.quizzes[idx];
      }
      if(q) out.push(q);
    });
    return out;
  }catch(e){ console.warn('[_hydrateExamQuestions] failed', e); return []; }
}

function renderDashExamPreview(){
  const examId=STATE.dashExamPreviewId;
  const ex=(STATE.dashExams||[]).find(e=>e.id===examId);
  if(!ex){STATE.dashExamPreviewId=null;return renderDashExams();}
  // Batch 6 · Item H — hydrate frozen questionIds into full question objects.
  // Fix: previous code read ex.questions which the exam doc never had; the
  // freeze writes ex.questionIds. Hydration is client-side (no extra reads)
  // because section quiz JSON is already cached after ensureQuizzes().
  let qs=ex.questions||[];
  // Batch 11: multi-section aware.
  const _previewSecIds=Array.isArray(ex.sectionIds)&&ex.sectionIds.length?ex.sectionIds:[ex.sectionId];
  if((!qs || !qs.length) && Array.isArray(ex.questionIds) && ex.questionIds.length){
    qs=_hydrateExamQuestions(ex);
    if(qs===null){
      Promise.all(_previewSecIds.map(sid=>ensureQuizzes(parseInt(sid)))).then(()=>{ if(STATE.dashExamPreviewId===examId) render(); }).catch(()=>{});
      qs=[];
    }
  }
  const sectionsSummary=_previewSecIds.map(sid=>{
    const s=sect(sid);
    const u=unitTitles(sid,(ex.unitsBySection&&ex.unitsBySection[sid])||ex.unitIds,{max:6});
    return 'Sec '+sid+(s?' — '+esc(s.title):'')+(u?' (Units: '+esc(u)+')':' (Full section)');
  }).join(' + ');
  const letters=['A','B','C','D','E'];

  const questionsHTML=qs.length?qs.map((q,i)=>{
    const opts=(q.o||q.options||q.opts||[]);
    const correctIdx=(typeof q.a==='number'?q.a:(typeof q.correct==='number'?q.correct:(typeof q.ans==='number'?q.ans:0)));
    const unit=q.unit||q.unitId||q._lid||'';
    const src=q.source||q.src||'';
    const wrongWhy=(q.wrongWhy!=null?q.wrongWhy:(q.wrong_why!=null?q.wrong_why:''));
    const optsHTML=opts.map((o,j)=>{
      const isCorrect=j===correctIdx;
      return `<div style="display:flex;align-items:flex-start;gap:10px;padding:9px 12px;margin-bottom:5px;border-radius:8px;background:${isCorrect?'var(--ok-tint-2)':'var(--surface)'};border:1px solid ${isCorrect?'#1E8449':'var(--border)'}">
        <div style="width:22px;height:22px;border-radius:50%;background:${isCorrect?'#1E8449':'#fff'};color:${isCorrect?'#fff':'#666'};display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;flex-shrink:0;border:1px solid ${isCorrect?'#1E8449':'var(--border-4)'}">${letters[j]||(j+1)}</div>
        <div style="font-size:13px;color:var(--ink);line-height:1.5;flex:1">${esc(o||'')}${isCorrect?' <span style="color:var(--ok-2);font-weight:600;font-size:11px">✓ correct</span>':''}</div>
      </div>`;
    }).join('');
    const expl=q.e||q.explanation||q.exp||'';
    const explHTML=expl?`<div style="background:var(--brand-tint-2);border-left:3px solid var(--brand-2);border-radius:6px;padding:8px 10px;margin-top:8px;font-size:12px;color:var(--brand);line-height:1.5"><b>Explanation:</b> ${esc(expl)}</div>`:'';
    // Batch 8: wrongWhy is a per-option array in the canonical quiz shape. Render
    // one line per wrong option; fall back to a single string for legacy data.
    let wrongHTML='';
    if(Array.isArray(wrongWhy)){
      const _wl=wrongWhy.map((w,j)=>(w&&j!==correctIdx)?`<div style="margin-top:3px"><b>${letters[j]||(j+1)}.</b> ${esc(w)}</div>`:'').filter(Boolean).join('');
      if(_wl)wrongHTML=`<div style="background:var(--err-tint);border-left:3px solid var(--err);border-radius:6px;padding:8px 10px;margin-top:8px;font-size:12px;color:#7d1f1f;line-height:1.5"><b>Why wrong options fail:</b>${_wl}</div>`;
    }else if(wrongWhy){
      wrongHTML=`<div style="background:var(--err-tint);border-left:3px solid var(--err);border-radius:6px;padding:8px 10px;margin-top:8px;font-size:12px;color:#7d1f1f;line-height:1.5"><b>Why wrong options fail:</b> ${esc(wrongWhy)}</div>`;
    }
    const meta=[unit?'Unit '+esc(unit):'',src?'Source: '+esc(src):''].filter(Boolean).join(' · ');
    return `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px;page-break-inside:avoid">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--brand);letter-spacing:.5px">Q ${i+1} of ${qs.length}</div>
        ${meta?`<div style="font-size:10px;color:#888">${meta}</div>`:''}
      </div>
      <div style="font-size:14px;color:var(--ink);line-height:1.55;margin-bottom:12px;font-weight:500">${esc(q.text||q.q||q.question||'(no text)')}</div>
      ${optsHTML}
      ${explHTML}
      ${wrongHTML}
    </div>`;
  }).join(''):`<div style="text-align:center;padding:40px 20px;color:var(--muted-2)">
    <div style="font-size:36px;margin-bottom:10px">${(ex.questionIds&&ex.questionIds.length)?'\u23F3':'\uD83D\uDCC4'}</div>
    <div style="font-size:14px;margin-bottom:6px;color:var(--ink)">${(ex.questionIds&&ex.questionIds.length)?'Loading questions\u2026':'No questions frozen for this exam'}</div>
    <div style="font-size:12px;color:var(--muted-3);line-height:1.5">${(ex.questionIds&&ex.questionIds.length)?'One moment while we fetch the section content.':'This can happen if the section content changed after the exam was scheduled. Try Re-shuffle to rebuild the question set.'}</div>
  </div>`;

  return `<div style="padding:14px" id="exam-preview-root">
    <button onclick="closeExamPreview()" style="background:none;border:none;color:var(--brand);font-size:14px;cursor:pointer;font-family:inherit;padding:0 0 12px;font-weight:500">‹ Back to exams</button>
    <div style="background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:14px;padding:18px;color:#fff;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;opacity:.85;margin-bottom:4px">EXAM PREVIEW · INSTRUCTOR VIEW</div>
      <div style="font-size:17px;font-weight:600;line-height:1.35;margin-bottom:8px">${esc(ex.title||'Untitled exam')}</div>
      <div style="font-size:12px;opacity:.85;line-height:1.6">${sectionsSummary}<br><b>${(ex.questionIds&&ex.questionIds.length)||qs.length||ex.count||0}</b> question${((ex.questionIds&&ex.questionIds.length)||qs.length||ex.count||0)===1?'':'s'} · <b>${ex.durationMinutes||0}</b> min · Group <b>${esc(ex.groupCode||'—')}</b></div>
    </div>
    <div style="display:flex;gap:8px;margin-bottom:14px">
      <button onclick="window.print()" style="flex:1;padding:10px;border-radius:10px;border:.5px solid var(--border-4);background:var(--surface-3);color:#333;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">🖨️ Print / Save as PDF</button>
    </div>
    <div style="background:var(--warn-tint-2);border:1px solid #F5CBA7;border-radius:10px;padding:10px 12px;margin-bottom:14px;font-size:12px;color:#7D6608;line-height:1.5">
      ⚠️ This is the <b>frozen snapshot</b> shown to students. Correct answers are highlighted for your review — do not share this view with students.
    </div>
    ${questionsHTML}
    <div style="height:40px"></div>
  </div>`;
}

function renderDashExams(){
  if(STATE.dashExamPreviewId)return renderDashExamPreview();
  if(STATE.dashExamViewingId)return renderDashExamResults();
  const d=STATE.dashExamDraft;
  const selectedGroup=STATE.dashSelectedGroup;
  const exams=STATE.dashExams||[];

  // Batch 2: auto-prefill draft group so exams save to the currently-viewed
  // group by default. Instructor doesn't have to pick manually every time.
  if(selectedGroup&&!d.groupCode)d.groupCode=selectedGroup;

  // Batch 11: Section is now a multi-select — pick 1+ sections (e.g. Cost +
  // Budget). Question count splits evenly across selected sections, then
  // each section's share splits evenly across its selected units.
  const selectedSections=new Set((d.sectionIds||[]).map(String));
  const sectionChips=S.map(s=>{
    const on=selectedSections.has(String(s.id));
    return `<button type="button" onclick="toggleExamSection('${s.id}')" style="padding:7px 12px;border-radius:14px;border:1px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':'#fff'};color:${on?'#fff':'#555'};font-size:12px;font-weight:${on?'600':'500'};cursor:pointer;font-family:inherit;white-space:nowrap">Sec ${s.id} \u2014 ${esc(s.title)}</button>`;
  }).join('');
  const unitPickers=(d.sectionIds||[]).map(sid=>renderExamUnitPicker(d,sid)).join('');

  const createCard=`
    <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">\u2795 Create an Exam for <span style="font-family:'Courier New',monospace;color:var(--brand)">${esc(selectedGroup)}</span></div>
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Title *</label>
        <input id="ex-title" type="text" value="${esc(d.title||'')}"
               oninput="STATE.dashExamDraft.title=this.value"
               placeholder="e.g. Section 1 Mid-Term Practice"
               style="width:100%;padding:9px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface);box-sizing:border-box">
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Section(s) * <span style="font-weight:400">— pick one or more; questions split evenly across your picks</span></label>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--surface);border:.5px solid var(--border);border-radius:8px">${sectionChips}</div>
      </div>
      ${unitPickers}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Questions (3\u201350) *</label>
          <input type="number" min="3" max="50" value="${esc(String(d.count||20))}"
                 oninput="STATE.dashExamDraft.count=this.value"
                 style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Duration (min) *</label>
          <input type="number" min="3" max="240" value="${esc(String(d.durationMinutes||30))}"
                 oninput="STATE.dashExamDraft.durationMinutes=this.value"
                 style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Opens at *</label>
          <input type="datetime-local" value="${esc(d.opensAt||'')}"
                 oninput="STATE.dashExamDraft.opensAt=this.value"
                 style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
        </div>
        <div>
          <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Closes at *</label>
          <input type="datetime-local" value="${esc(d.closesAt||'')}"
                 oninput="STATE.dashExamDraft.closesAt=this.value"
                 style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box">
        </div>
      </div>
      <button onclick="saveExam()"
              style="width:100%;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">
        \u{1F4BE} Create Exam
      </button>
    </div>`;

  const buckets={active:[],scheduled:[],closed:[]};
  exams.forEach(x=>{buckets[examWindowStatus(x)].push(x);});

  const fmtDT=(iso)=>{
    if(!iso)return '—';
    try{
      return new Date(iso).toLocaleString('en-GB',
        {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
    }catch{return iso;}
  };

  const badgeStyle={
    active:   'background:var(--ok-tint-2);color:var(--ok-2)',
    scheduled:'background:var(--warn-tint-2);color:#9A7D0A',
    closed:   'background:#EAECEE;color:#566573'
  };
  const badgeLabel={active:'🟢 ACTIVE',scheduled:'⏳ SCHEDULED',closed:'⚫ CLOSED'};

  const examCard=(x)=>{
    const status=examWindowStatus(x);
    // Batch 11: multi-section exams show every selected section + its units;
    // legacy single-section exams (no sectionIds array) show as before.
    const xSectionIds=Array.isArray(x.sectionIds)&&x.sectionIds.length?x.sectionIds:[x.sectionId];
    const sectionsLine=xSectionIds.map(sid=>{
      const s=sect(sid);
      const u=unitTitles(sid,(x.unitsBySection&&x.unitsBySection[sid])||x.unitIds,{max:3});
      return 'Sec '+sid+(s?' — '+esc(s.title):'')+(u?' (Units: '+esc(u)+')':'');
    }).join('<br>');
    const canClose=status!=='closed';
    return `<div style="background:#fff;border:.5px solid ${status==='active'?'#1E844940':'var(--border)'};border-radius:12px;padding:13px 14px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:8px">
        <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;letter-spacing:.4px;${badgeStyle[status]}">${badgeLabel[status]}</span>
      </div>
      <div style="font-size:14px;font-weight:600;color:var(--ink);line-height:1.35;margin-bottom:6px">${esc(x.title)}</div>
      <div style="font-size:11px;color:#666;line-height:1.7;margin-bottom:10px">
        ${sectionsLine}<br>
        <b>${x.count}</b> questions · <b>${x.durationMinutes}</b> min<br>
        Opens <b>${fmtDT(x.opensAt)}</b> · Closes <b>${fmtDT(x.closesAt)}</b>
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap">
        <button onclick="openExamPreview('${x.id}')" style="flex:1 1 28%;padding:7px 10px;border-radius:8px;border:.5px solid #1E844940;background:var(--ok-tint-2);color:var(--ok-2);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">👁️ Preview</button>
        <button onclick="openExamResults('${x.id}')" style="flex:1 1 28%;padding:7px 10px;border-radius:8px;border:.5px solid var(--brand-2)40;background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">📊 Results</button>
        ${status==='scheduled'?`<button onclick="reshuffleExam('${x.id}')" style="flex:1 1 28%;padding:7px 10px;border-radius:8px;border:.5px solid #7D3C9840;background:var(--accent-purple-tint);color:var(--accent-purple-strong);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">🔄 Re-shuffle</button>`:''}
        ${canClose?`<button onclick="closeExamNow('${x.id}')" style="flex:1 1 28%;padding:7px 10px;border-radius:8px;border:.5px solid #D2691E40;background:#FEF5E7;color:#7D6608;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">🛑 Close</button>`:''}
        <button onclick="deleteExam('${x.id}')" style="flex:1 1 28%;padding:7px 10px;border-radius:8px;border:.5px solid var(--err)40;background:var(--err-tint);color:var(--err-2);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">🗑️ Delete</button>
      </div>
    </div>`;
  };

  const bucketHTML=(label,arr)=>arr.length
    ? `<div style="font-size:12px;font-weight:500;color:#888;letter-spacing:.5px;margin:14px 0 8px">${label} (${arr.length})</div>${arr.map(examCard).join('')}`
    : '';

  const emptyState=exams.length===0
    ? renderDashTabEmpty('Exams',STATE.dashSelectedGroup,{icon:'\u{1F4DD}',body:'This group has no exams yet. Use the form above to create one for a specific section.'})
    : '';

  return `<div style="padding:14px">
    ${createCard}
    ${emptyState}
    ${bucketHTML('🟢 ACTIVE',buckets.active)}
    ${bucketHTML('⏳ SCHEDULED',buckets.scheduled)}
    ${bucketHTML('⚫ CLOSED',buckets.closed)}
    <div style="height:40px"></div>
  </div>`;
}

// ── Batch 2: chip strip renderer ──────────────────────────────────────
// Renders the horizontal group selector above the dashboard sub-nav.
// Each chip shows the group code + a student count derived from the roster.
// Special "+ New" chip at the end routes to the Groups tab (create flow).
function renderGroupChipStrip(){
  const groups=(STATE.dashGroups||[]).slice().sort((a,b)=>(a.code||'').localeCompare(b.code||''));
  const students=STATE.dashStudents||[];
  const countFor=code=>students.filter(s=>(s.groupCode||'').toUpperCase()===code.toUpperCase()).length;
  const active=STATE.dashSelectedGroup;
  const chips=groups.map(g=>{
    const isActive=g.code===active;
    const n=countFor(g.code);
    return `<button class="gs-chip${isActive?' active':''}" onclick="selectDashGroup('${esc(g.code)}')" title="${esc(g.code)} — ${n} student${n===1?'':'s'}">`
      +`<span>${esc(g.code)}</span>`
      +`<span class="gs-chip-count">\u00B7 ${n}</span>`
      +`</button>`;
  }).join('');
  const newChip=`<button class="gs-chip gs-chip-new" onclick="STATE.dashTab='groups';render();setTimeout(()=>{const i=document.getElementById('new-group-input');if(i)i.focus();},50)" title="Add a new group">\u002B New</button>`;
  return `<div class="gs-strip" role="tablist" aria-label="Select group">${chips}${newChip}</div>`;
}

// ── Batch 2: skeleton (Decision 2A — instant-swap loading UX) ─────────
function renderDashSkeleton(){
  const line=(cls)=>`<div class="gs-skeleton-line ${cls}"></div>`;
  const card=`<div class="gs-skeleton-card">${line('short')}${line('long')}${line('medium')}</div>`;
  return `<div style="padding:14px">${card}${card}${card}</div>`;
}

// ── Batch 2: empty states (Decision 3B — friendly + CTA) ──────────────
// Called when no group is selected on a scoped tab.
function renderDashPickGroupEmpty(tabLabel){
  const hasGroups=(STATE.dashGroups||[]).length>0;
  if(!hasGroups){
    return `<div class="gs-empty">
      <div class="gs-empty-icon">\u{1F465}</div>
      <div class="gs-empty-title">No groups yet</div>
      <div class="gs-empty-body">Create your first group to start managing ${esc(tabLabel)}, students, and exams.</div>
      <button class="gs-empty-cta" onclick="STATE.dashTab='groups';render();setTimeout(()=>{const i=document.getElementById('new-group-input');if(i)i.focus();},50)">\u002B Create your first group</button>
    </div>`;
  }
  return `<div class="gs-empty">
    <div class="gs-empty-icon">\u{1F446}</div>
    <div class="gs-empty-title">Pick a group to view its ${esc(tabLabel)}</div>
    <div class="gs-empty-body">Tap a group chip above to see its ${esc(tabLabel.toLowerCase())} and related activity.</div>
  </div>`;
}

// ── Batch 2: per-tab "no items" empty state for a selected group ──────
function renderDashTabEmpty(tabLabel,groupCode,cta){
  return `<div class="gs-empty">
    <div class="gs-empty-icon">${cta.icon||'\u{1F4CB}'}</div>
    <div class="gs-empty-title">No ${esc(tabLabel.toLowerCase())} yet for ${esc(groupCode)}</div>
    <div class="gs-empty-body">${esc(cta.body||('Create your first '+tabLabel.toLowerCase()+' below.'))}</div>
    ${cta.button?`<button class="gs-empty-cta" onclick="${cta.onclick||''}">${esc(cta.button)}</button>`:''}
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD SLIDES — presenter mode (instructor-only teaching aids)
// ═══════════════════════════════════════════════════════════════════════════
const DASH_SLIDES=[
  {
    id:'cost-behavior',
    title:'Cost Classification by Behavior',
    subtitle:'How does total cost react when activity volume changes?',
    cards:[
      {tag:'FC',tagBg:'#0C2D52',title:'Fixed Cost',desc:'Total stays constant regardless of volume',exColor:'#0C2D52',ex:'Factory rent'},
      {tag:'VC',tagBg:'#177F73',title:'Variable Cost',desc:'Total changes in direct proportion to volume',exColor:'#177F73',ex:'Direct material cost'},
      {tag:'MC',tagBg:'#C07A26',title:'Mixed Cost',desc:'Has both a fixed part and a variable part',exColor:'#C07A26',ex:'Electricity bill (base charge + usage)'}
    ],
    chart:{
      title:'Total Cost vs. Volume',xLabel:'Volume (units)',xMax:5,yMax:700,yStep:100,
      series:[
        {label:'Fixed Cost (FC)',color:'#0C2D52',data:[500,500,500,500,500,500]},
        {label:'Variable Cost (VC)',color:'#177F73',data:[0,100,200,300,400,500]},
        {label:'Mixed Cost (MC)',color:'#C07A26',data:[200,280,360,440,520,600]}
      ]
    }
  },
  {
    id:'cost-nature',
    title:'Cost Classification by Nature',
    subtitle:'Every product cost falls into one of three buckets',
    cards:[
      {tag:'DM',tagBg:'#0C2D52',title:'Direct Material',desc:'Raw materials directly traceable to the product',exColor:'#177F73',ex:'Wood used in a chair'},
      {tag:'DL',tagBg:'#0C2D52',title:'Direct Labor',desc:'Wages of workers directly making the product',exColor:'#0C2D52',ex:'Carpenter\u2019s wages'},
      {tag:'OH',tagBg:'#0C2D52',title:'Manufacturing Overhead',desc:'All other factory costs, not directly traceable',exColor:'#C07A26',ex:'Factory rent, utilities, supervisor salary'}
    ],
    banner:[
      {label:'Prime Cost',labelColor:'#F0B361',formula:'DM + DL',desc:'Cost of the core inputs that go straight into the product'},
      {label:'Conversion Cost',labelColor:'#5FC9BC',formula:'DL + OH',desc:'Cost of turning raw material into a finished product'}
    ]
  }
];

function renderSlideCard(c){
  return `<div style="flex:1 1 240px;background:var(--surface-2);border-radius:14px;padding:20px;min-width:220px">
    <div style="display:inline-block;background:${c.tagBg};color:#fff;font-weight:700;font-size:13px;padding:6px 14px;border-radius:8px;margin-bottom:14px">${esc(c.tag)}</div>
    <div style="font-size:18px;font-weight:700;color:var(--ink);margin-bottom:8px">${esc(c.title)}</div>
    <div style="font-size:14px;color:#555;line-height:1.5;margin-bottom:10px">${esc(c.desc)}</div>
    <div style="font-size:13px;color:#333"><span style="font-weight:700;color:${c.exColor||'var(--ink)'}">Example: </span>${esc(c.ex)}</div>
  </div>`;
}

function renderSlideBanner(items){
  return `<div style="background:var(--brand);border-radius:14px;padding:24px;margin-top:20px;display:flex;flex-wrap:wrap;gap:24px">
    ${items.map((b,i)=>`<div style="flex:1 1 260px;${i>0?'border-left:1px solid rgba(255,255,255,.25);padding-left:24px':''}">
      <div style="font-size:16px;margin-bottom:8px"><span style="font-weight:700;color:${b.labelColor}">${esc(b.label)}</span><span style="color:#fff"> = ${esc(b.formula)}</span></div>
      <div style="font-size:13px;color:rgba(255,255,255,.8)">${esc(b.desc)}</div>
    </div>`).join('')}
  </div>`;
}

function renderSlideChart(chart){
  const W=640,H=280,padL=46,padR=16,padT=14,padB=34;
  const plotW=W-padL-padR,plotH=H-padT-padB;
  const xCount=chart.xMax+1;
  const xStep=plotW/(xCount-1);
  const yScale=v=>padT+plotH-(v/chart.yMax)*plotH;
  const xScale=i=>padL+i*xStep;
  let gridLines='';
  for(let v=0;v<=chart.yMax;v+=chart.yStep){
    const y=yScale(v);
    gridLines+=`<line x1="${padL}" y1="${y}" x2="${W-padR}" y2="${y}" stroke="#e5e5e0" stroke-width="1"/><text x="${padL-8}" y="${y+4}" font-size="11" fill="#666" text-anchor="end">${v}</text>`;
  }
  let xLabels='';
  for(let i=0;i<xCount;i++){
    xLabels+=`<text x="${xScale(i)}" y="${H-padB+18}" font-size="11" fill="#666" text-anchor="middle">${i}</text>`;
  }
  let seriesSvg='';
  chart.series.forEach(s=>{
    const pts=s.data.map((v,i)=>`${xScale(i)},${yScale(v)}`).join(' ');
    const dots=s.data.map((v,i)=>`<circle cx="${xScale(i)}" cy="${yScale(v)}" r="3.5" fill="${s.color}"/>`).join('');
    seriesSvg+=`<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.5"/>${dots}`;
  });
  const legend=chart.series.map(s=>`<span style="display:inline-flex;align-items:center;gap:6px;margin-right:16px;font-size:12px;color:#333"><span style="width:14px;height:3px;background:${s.color};display:inline-block;border-radius:2px"></span>${esc(s.label)}</span>`).join('');
  return `<div style="margin-top:6px">
    <div style="font-weight:700;font-size:14px;color:var(--ink);margin-bottom:8px">${esc(chart.title)}</div>
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;height:auto;display:block">
      <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H-padB}" stroke="#ccc"/>
      <line x1="${padL}" y1="${H-padB}" x2="${W-padR}" y2="${H-padB}" stroke="#ccc"/>
      ${gridLines}${xLabels}${seriesSvg}
    </svg>
    <div style="margin-top:8px;text-align:center">${legend}</div>
    <div style="text-align:center;font-size:11px;color:#888;margin-top:2px">${esc(chart.xLabel)}</div>
  </div>`;
}

function dashSlideNav(dir){
  const n=DASH_SLIDES.length;
  STATE.dashSlideIdx=Math.min(n-1,Math.max(0,(STATE.dashSlideIdx||0)+dir));
  render();
}

function renderDashSlides(){
  const slides=DASH_SLIDES;
  const idx=Math.min(Math.max(STATE.dashSlideIdx||0,0),slides.length-1);
  const s=slides[idx];
  const prevDisabled=idx===0,nextDisabled=idx===slides.length-1;
  const cardsHtml=s.cards.map(renderSlideCard).join('');
  const extra=s.chart?renderSlideChart(s.chart):(s.banner?renderSlideBanner(s.banner):'');
  const dots=slides.map((_,i)=>`<button onclick="STATE.dashSlideIdx=${i};render()" style="width:9px;height:9px;border-radius:50%;border:none;padding:0;cursor:pointer;background:${i===idx?'var(--brand)':'#d8d8d2'}"></button>`).join('');
  return `<div style="max-width:900px;margin:0 auto;padding:8px 4px 30px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px">
      <button ${prevDisabled?'disabled':''} onclick="dashSlideNav(-1)" style="padding:8px 14px;border-radius:8px;border:.5px solid var(--border-4);background:#fff;font-size:14px;cursor:${prevDisabled?'default':'pointer'};opacity:${prevDisabled?'.35':'1'}">\u2190 Prev</button>
      <div style="display:flex;gap:6px">${dots}</div>
      <button ${nextDisabled?'disabled':''} onclick="dashSlideNav(1)" style="padding:8px 14px;border-radius:8px;border:.5px solid var(--border-4);background:#fff;font-size:14px;cursor:${nextDisabled?'default':'pointer'};opacity:${nextDisabled?'.35':'1'}">Next \u2192</button>
    </div>
    <h1 style="font-size:26px;font-weight:800;color:var(--ink);margin-bottom:6px">${esc(s.title)}</h1>
    <p style="font-size:15px;color:#666;margin-bottom:22px">${esc(s.subtitle)}</p>
    <div style="display:flex;flex-wrap:wrap;gap:14px">${cardsHtml}</div>
    ${extra}
  </div>`;
}

function renderDashboard(){
  if(!isInstructor())return renderIntro();
  if(!STATE.dashLoaded&&!STATE.dashLoading&&!STATE.dashGroupsLoaded)loadDashboardP1();
  const _pendingApprovalsCount=(STATE.dashApprovals&&STATE.dashApprovals.rows||[]).filter(r=>r.status==='pending').length;
  const SUB_DASH=[
    {id:'slides',      icon:'\u{1F4FD}\uFE0F', label:'Slides'},
    {id:'groups',      icon:'\u{1F465}', label:'Groups'},
    {id:'students',    icon:'\u{1F464}', label:'Students'},
    {id:'approvals',   icon:'\u2705', label:'Approvals'+(_pendingApprovalsCount?' \u00B7 '+_pendingApprovalsCount:'')},
    {id:'lectures',    icon:'\u{1F3AC}', label:'Lectures'},
    {id:'attendance',  icon:'\u{2705}', label:'Attendance'},
    {id:'exams',       icon:'\u{1F4DD}', label:'Exams'},
    {id:'results',     icon:'\u{1F4CA}', label:'Results'},
    {id:'progress',    icon:'\u{1F4C8}', label:'Progress'},
    {id:'leader',      icon:'\u{1F3C5}', label:'Leader'},
    {id:'plan',        icon:'\u{1F5D3}\uFE0F', label:'Plan'},
    {id:'teaching-log',icon:'\u{1F4D3}', label:'Actual Teaching'},
    {id:'at-risk',     icon:'\u{1F6A8}', label:'At Risk'}
  ];
  const _validTabs=['slides','groups','students','approvals','lectures','attendance','exams','results','progress','leader','plan','teaching-log','at-risk'];
  const tab=_validTabs.includes(STATE.dashTab)?STATE.dashTab:'groups';
  const subnav=`<div class="sub-nav">${SUB_DASH.map(it=>
    `<button class="sub-nav-btn${tab===it.id?' active':''}" onclick="STATE.dashTab='${it.id}';render()">${it.icon} ${it.label}</button>`
  ).join('')}</div>`;

  // ── Group chip strip: shown once we have the groups list ──
  const chipStrip=STATE.dashGroupsLoaded?renderGroupChipStrip():'';

  // ── Body dispatch ──
  const scopedTabs={lectures:'Lectures',exams:'Exams','teaching-log':'Actual Teaching','at-risk':'At-Risk students',students:'Students',attendance:'Attendance',results:'Results',progress:'Progress',leader:'Leader',plan:'Weekly Plan'};
  let body;
  if(STATE.dashError){
    body=`<div style="text-align:center;padding:50px 20px"><div style="font-size:34px;margin-bottom:10px">\u26A0\uFE0F</div><div style="font-size:14px;color:#555;margin-bottom:14px">Couldn't load dashboard data.</div><button onclick="STATE.dashError=false;STATE.dashGroupsLoaded=false;STATE.dashLoaded=false;loadDashboardP1()" style="padding:9px 18px;border-radius:8px;border:.5px solid var(--border-4);background:#fff;font-size:13px;cursor:pointer;font-family:inherit">Retry</button></div>`;
  }else if(tab==='groups'){
    // Groups tab: unscoped, always renders (roster management surface).
    body=STATE.dashGroupsLoaded?renderDashGroups():renderDashSkeleton();
  }else if(tab==='students'){
    // Batch 5 Students tab: unscoped (roster is already loaded with groups).
    body=STATE.dashGroupsLoaded?renderDashStudents():renderDashSkeleton();
  }else if(tab==='approvals'){
    // Batch 11: unscoped — pending join/switch requests span all groups.
    if(!STATE.dashApprovals||!STATE.dashApprovals.loaded){
      loadDashApprovals();
      body=renderDashSkeleton();
    }else{
      body=renderDashApprovals();
    }
  }else if(tab==='slides'){
    // Presenter mode: static teaching aids, no group/data dependency.
    body=renderDashSlides();
  }else if(!STATE.dashSelectedGroup){
    // Scoped tab but no group picked → empty state
    body=renderDashPickGroupEmpty(scopedTabs[tab]||'items');
  }else if(STATE.dashLoading||STATE.dashLoadedForGroup!==STATE.dashSelectedGroup){
    // Scoped tab, group picked, but data still loading (or stale from prior group)
    body=renderDashSkeleton();
  }else if(tab==='teaching-log'){
    body=renderDashActualTeaching();
  }else if(tab==='lectures'){
    body=renderDashLectures();
  }else if(tab==='attendance'){
    body=renderDashAttendance();
  }else if(tab==='exams'){
    body=renderDashExams();
  }else if(tab==='results'){
    body=renderDashResults();
  }else if(tab==='progress'){
    body=renderDashProgress();
  }else if(tab==='leader'){
    body=renderDashLeader();
  }else if(tab==='plan'){
    body=renderDashPlan();
  }else if(tab==='at-risk'){
    body=renderDashAtRisk();
  }else{
    body=renderDashGroups();
  }
  return `${subnav}${chipStrip}<div class="sh"><h2>Instructor Dashboard</h2><p>${STATE.dashSelectedGroup?'Viewing: <b>'+esc(STATE.dashSelectedGroup)+'</b> \u00B7 ':''}Groups \u00B7 lectures \u00B7 exams \u00B7 teaching log</p></div><div class="scroll-area">${body}</div>`;
}

// Instructor-only Dashboard tab appended to the student nav.
function getNavTabs(){
  return isInstructor() ? [...TABS,{id:'dashboard',label:'Dashboard',icon:'\u{1F6E1}\uFE0F'}] : TABS;
}

// ═══════════════════════════════════════════════════════════════════════════
// BATCH 4 — PILLAR 4: At Risk instructor view
// ═══════════════════════════════════════════════════════════════════════════
async function loadDashAtRisk(groupCode){
  if(!isInstructor()||!db||!groupCode)return;
  STATE.dashAtRiskLoading=true;
  try{
    const snap=await db.collection('student-analytics').where('groupCode','==',groupCode.toUpperCase()).get();
    const rows=snap.docs.map(d=>d.data());
    STATE.dashAtRisk=rows;
    STATE.dashAtRiskLoadedFor=groupCode;
  }catch(e){
    console.warn('at-risk load failed',e);STATE.dashAtRisk=[];STATE.dashAtRiskLoadedFor=groupCode;
  }
  STATE.dashAtRiskLoading=false;render();
}
function _atRiskReason(r){
  if((r.daysSinceActive||0)>=7)return{tag:'Silent '+r.daysSinceActive+' days',sev:'high'};
  const last7=r.last7DaysMinutes||0,prev7=r.previous7DaysMinutes||0;
  if(prev7>=60 && last7<prev7*0.5)return{tag:'Study time down '+Math.round((1-last7/prev7)*100)+'%',sev:'med'};
  if((r.streakCount||0)===0 && (r.streakWas||0)>=7)return{tag:'Streak broke ('+r.streakWas+'\u2192 0)',sev:'med'};
  return null;
}
function waLink(r){
  const phone=(r.phoneNumber||'').replace(/[^0-9]/g,'');
  if(!phone)return '';
  const ar=(r.language||'ar')==='ar';
  const days=r.daysSinceActive||0;
  const msg=ar
    ? `\u0623\u0647\u0644\u064B\u0627 ${r.displayName||''}\u060C\n\u0634\u0641\u062A \u0625\u0646\u0643 \u0645\u0634 \u062F\u0627\u062E\u0644 \u0639\u0644\u0649 \u062A\u0637\u0628\u064A\u0642 CMA \u0645\u0646 ${days} \u0623\u064A\u0627\u0645.\n\u0643\u0644\u0647 \u062A\u0645\u0627\u0645\u061F \u0644\u0648 \u0645\u062D\u062A\u0627\u062C \u0645\u0633\u0627\u0639\u062F\u0629 \u0641\u064A \u0623\u064A \u0645\u0648\u0636\u0648\u0639\u060C \u0642\u0648\u0644\u0651\u064A.\n\n\u2014 \u062F. \u0645\u062D\u0645\u062F`
    : `Hey ${r.displayName||''},\nNoticed you haven't been active on the CMA app for ${days} days.\nEverything okay? If you need help with any topic, let me know.\n\n\u2014 Dr. Mohamed`;
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
}
function renderDashAtRisk(){
  const g=STATE.dashSelectedGroup;
  if(STATE.dashAtRiskLoadedFor!==g && !STATE.dashAtRiskLoading){loadDashAtRisk(g);}
  if(STATE.dashAtRiskLoading||STATE.dashAtRiskLoadedFor!==g){return renderDashSkeleton();}
  const rows=(STATE.dashAtRisk||[]).map(r=>({r,reason:_atRiskReason(r)})).filter(x=>x.reason);
  rows.sort((a,b)=>(b.r.daysSinceActive||0)-(a.r.daysSinceActive||0));
  if(!rows.length){
    return `<div style="text-align:center;padding:48px 20px">
      <div style="font-size:40px;margin-bottom:12px">\u{1F389}</div>
      <div style="font-size:15px;font-weight:600;color:#333;margin-bottom:6px">No one at risk right now</div>
      <div style="font-size:13px;color:#888;line-height:1.5;max-width:280px;margin:0 auto">Everyone in <b>${esc(g)}</b> has been active recently. Check back after a few days of new data.</div>
    </div>`;
  }
  const sevColor={high:'var(--err)',med:'var(--warn)'};
  const cards=rows.map(({r,reason})=>{
    const wa=waLink(r);
    const initial=(r.displayName||'?').charAt(0).toUpperCase();
    const noPhone=!(r.phoneNumber||'').replace(/[^0-9]/g,'');
    return `<div style="background:#fff;border:.5px solid #eee;border-left:3px solid ${sevColor[reason.sev]||'var(--warn)'};border-radius:10px;padding:13px 14px;margin-bottom:10px;display:flex;align-items:center;gap:12px">
      <div style="width:40px;height:40px;border-radius:50%;background:var(--brand-tint);display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:600;color:var(--brand);flex-shrink:0">${initial}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:14px;font-weight:600;color:var(--ink);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(r.displayName||'Unknown')}</div>
        <div style="font-size:12px;color:${sevColor[reason.sev]||'#888'};margin-top:2px">${esc(reason.tag)}</div>
        ${noPhone?'<div style="font-size:11px;color:#c00;margin-top:2px">\u26A0\uFE0F no phone on file</div>':''}
      </div>
      ${wa?`<a href="${wa}" target="_blank" rel="noopener" style="flex-shrink:0;width:40px;height:40px;border-radius:10px;background:#25D366;display:flex;align-items:center;justify-content:center;text-decoration:none;font-size:20px" title="Message on WhatsApp">\u{1F4AC}</a>`:''}
    </div>`;
  }).join('');
  return `<div style="padding-top:4px">
    <div style="font-size:12px;color:#888;margin-bottom:12px">${rows.length} student${rows.length>1?'s':''} in <b>${esc(g)}</b> may need a nudge \u00B7 sorted by days silent</div>
    ${cards}
  </div>`;
}



// ==== PORTED STUDENT-LAYER FEATURES (from FMAA) ====

// --- fontsize+dailygoal ---
function loadFontSize(){try{return localStorage.getItem('cma-fontsize-v1')||'md';}catch{return 'md';}}
function saveFontSize(v){try{localStorage.setItem('cma-fontsize-v1',v);}catch{}STATE.fontSize=v;applyFontSize();}
function applyFontSize(){const c=document.getElementById('content-area');if(!c)return;const map={sm:'.9',md:'1',lg:'1.15'};c.style.zoom=map[STATE.fontSize]||'1';}
function loadDailyGoal(){try{const v=parseInt(localStorage.getItem('cma-goal-v1'));return v>0?v:30;}catch{return 30;}}
function saveDailyGoal(mins){const v=Math.max(5,Math.min(240,parseInt(mins)||30));try{localStorage.setItem('cma-goal-v1',String(v));}catch{}STATE.dailyGoalMinutes=v;if(STATE.user)db.collection('students').doc(STATE.user.uid).set({dailyGoalMinutes:v},{merge:true}).catch(()=>{});}
function todayStudyMinutes(){const st=loadStudyTime();const today=new Date().toDateString();return st.todayDate===today?(st.todayMinutes||0):0;}

// --- buildAllNotes ---
function buildAllNotes(){const out=[];S.forEach(sec=>{sec.lessons.forEach(l=>{const t=loadLessonNote(l.id);if(t&&t.trim())out.push({lessonId:l.id,lessonTitle:l.title,sec,text:t.trim()});});});return out;}

// --- flashcards ---
async function buildAllFlashcards(){await Promise.all([1,2,3,4,5,6].map(i=>ensureLessons(i)));const cards=[];S.forEach(sec=>{sec.lessons.forEach(l=>{(l.blocks||[]).forEach((b,i)=>{if(b.t==='def'&&b.term){cards.push({id:`${l.id}:def:${i}`,type:'def',front:b.term,back:b.v||'',sec,lessonId:l.id,lessonTitle:l.title});}else if(b.t==='f'&&b.l){cards.push({id:`${l.id}:f:${i}`,type:'f',front:b.l,back:(b.v||'').replace(/\n/g,'\n'),sec,lessonId:l.id,lessonTitle:l.title});}});});});return cards;}
function loadFlashReviewSet(){try{const d=localStorage.getItem('cma-flash-review-v1');return d?JSON.parse(d):[];}catch{return[];}}
function saveFlashReviewSet(arr){try{localStorage.setItem('cma-flash-review-v1',JSON.stringify(arr));}catch{}}
function toggleFlashReview(cardId){const rs=loadFlashReviewSet();const i=rs.indexOf(cardId);if(i>=0)rs.splice(i,1);else rs.push(cardId);saveFlashReviewSet(rs);}
async function ensureFlashcards(){if(STATE.flashcards&&STATE.flashcards.length)return;STATE.flashcards=await buildAllFlashcards();}
function filteredFlashcards(){const all=STATE.flashcards||[];const f=STATE.flashcardsFilter;const mode=STATE.flashcardsMode;let out=all;if(f!=='all'){const sid=parseInt(f);out=out.filter(c=>c.sec&&c.sec.id===sid);}if(mode==='review'){const rs=new Set(loadFlashReviewSet());out=out.filter(c=>rs.has(c.id));}return out;}
function flashNext(){const list=filteredFlashcards();if(!list.length)return;STATE.flashcardsIdx=(STATE.flashcardsIdx+1)%list.length;STATE.flashcardsFlipped=false;render();}
function flashPrev(){const list=filteredFlashcards();if(!list.length)return;STATE.flashcardsIdx=(STATE.flashcardsIdx-1+list.length)%list.length;STATE.flashcardsFlipped=false;render();}
function flashFlip(){STATE.flashcardsFlipped=!STATE.flashcardsFlipped;render();}
function flashSetFilter(v){STATE.flashcardsFilter=v;STATE.flashcardsIdx=0;STATE.flashcardsFlipped=false;render();}
function flashSetMode(v){STATE.flashcardsMode=v;STATE.flashcardsIdx=0;STATE.flashcardsFlipped=false;render();}
function flashMarkReview(cardId){toggleFlashReview(cardId);showToast('Marked for review','info',1500);render();}
function flashMarkKnow(cardId){const rs=loadFlashReviewSet();const i=rs.indexOf(cardId);if(i>=0){rs.splice(i,1);saveFlashReviewSet(rs);}flashNext();}

// --- qotd+helpers ---
function _hashCode(s){let h=0;for(let i=0;i<s.length;i++){h=((h<<5)-h+s.charCodeAt(i))|0;}return Math.abs(h);}
function _todayKey(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function loadQotdState(){try{const d=localStorage.getItem('cma-qotd-v1');return d?JSON.parse(d):{};}catch{return{};}}
function saveQotdState(v){try{localStorage.setItem('cma-qotd-v1',JSON.stringify(v));}catch{}}
async function ensureQotd(){const st=loadStudent();if(!st||!st.groupCode||!STATE.user)return;const dateKey=_todayKey();const stored=loadQotdState();const key=st.groupCode+'|'+dateKey;const already=stored[key];if(STATE.qotdState.dateKey===dateKey&&STATE.qotdState.question)return;
  try{const snap=await db.collection('teaching-log').where('groupCode','==',st.groupCode.toUpperCase()).get();const entries=snap.docs.map(d=>d.data());const taughtSet=new Set();entries.forEach(e=>(e.unitIds||[]).forEach(u=>taughtSet.add(u)));if(!taughtSet.size){STATE.qotdState={dateKey,question:null,taughtUnitCount:0,answered:false,selected:null};return;}
    const secIds=[...new Set([...taughtSet].map(u=>parseInt(u.split('-')[0])).filter(n=>n>0))];await Promise.all(secIds.map(i=>ensureQuizzes(i)));const pool=[];S.forEach(sec=>{sec.lessons.forEach(l=>{if(l.outOfScope)return;if(taughtSet.has(l.id)&&l.quizzes&&l.quizzes.length)l.quizzes.forEach(q=>{if(isOutOfScopeQ(l,q))return;pool.push({...q,secId:sec.id,secTitle:sec.title,secBar:sec.bar,lessonTitle:l.title});});});});if(!pool.length){STATE.qotdState={dateKey,question:null,taughtUnitCount:taughtSet.size,answered:false,selected:null};return;}
    const seed=_hashCode(st.groupCode+'|'+dateKey);const q=shuffleQuestionOptions(pool[seed%pool.length]);STATE.qotdState={dateKey,question:q,taughtUnitCount:taughtSet.size,answered:!!(already&&already.answered),selected:already?already.selected:null};if(STATE.tab==='intro')render();
  }catch(e){console.warn('QoD load failed:',e);}
}
function qotdAnswer(i){const st=loadStudent();if(!st||!st.groupCode)return;const q=STATE.qotdState.question;if(!q||STATE.qotdState.answered)return;STATE.qotdState.selected=i;STATE.qotdState.answered=true;const dateKey=_todayKey();const key=st.groupCode+'|'+dateKey;const stored=loadQotdState();stored[key]={answered:true,selected:i,correct:i===q.a};saveQotdState(stored);const p=STATE.progress;saveProg({...p,mcqTotal:(p.mcqTotal||0)+1,mcqRight:(p.mcqRight||0)+(i===q.a?1:0)});updateStreak();render();}

// ─── LESSON PREV/NEXT ────────────────────────────────────────────────────
function getPrevLesson(secId,lessonId){const si=S.findIndex(s=>s.id===secId);if(si<0)return null;const sec=S[si];const li=sec.lessons.findIndex(l=>l.id===lessonId);if(li>0)return{sec,lesson:sec.lessons[li-1]};if(si>0){const prev=S[si-1];return{sec:prev,lesson:prev.lessons[prev.lessons.length-1]};}return null;}

// --- shuffle ---
// ═════════════════════════════════════════════════════════════════════
// PHASE 3a-ii — GROUP EXAMS (student taking surface)
//
// State machine:
//   Home strip (renderExamsStrip) → student clicks Start → startExam()
//   creates exam-results/{examId_uid} doc with submitted:false, seeds
//   the deterministic question set, saves the session locally, opens the
//   full-screen runner. Runner persists to localStorage on every answer
//   so a refresh survives. Timer computes remaining from stored
//   deadlineAt. Submit grades locally, writes final result, clears local.
//
// Determinism: seededShuffle(pool, examId+uid) picks questions; a second
//   stream from the same seed reshuffles each question's options. Same
//   student always gets the same exam; refresh cannot change it.
//
// One-shot: Firestore doc id {examId}_{uid} + submitted-flag guard.
// Deadline: min(startedAt + durationMinutes, exam.closesAt) — hard stop.
// ═════════════════════════════════════════════════════════════════════

// ── Deterministic PRNG (mulberry32) + seeded shuffle utilities ───────
function _hashStr(s){
  let h=0x811c9dc5;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193);}
  return h>>>0;
}
function _mulberry32(seed){
  let a=seed>>>0;
  return function(){
    a=(a+0x6D2B79F5)>>>0;
    let t=a;
    t=Math.imul(t^t>>>15,t|1);
    t^=t+Math.imul(t^t>>>7,t|61);
    return ((t^t>>>14)>>>0)/4294967296;
  };
}
function seededShuffle(arr,seedStr){
  const rand=_mulberry32(_hashStr(seedStr));
  const a=arr.slice();
  for(let i=a.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [a[i],a[j]]=[a[j],a[i]];
  }
  return a;
}
function seededShuffleOptions(q,rand){
  const idx=q.o.map((_,i)=>i);
  for(let i=idx.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [idx[i],idx[j]]=[idx[j],idx[i]];
  }
  const newOpts=idx.map(i=>q.o[i]);
  const newA=idx.indexOf(q.a);
  const newWW={};
  if(q.wrongWhy){for(const[k,v]of Object.entries(q.wrongWhy)){const nk=idx.indexOf(Number(k));if(nk>=0)newWW[nk]=v;}}
  return{...q,o:newOpts,a:newA,wrongWhy:Object.keys(newWW).length?newWW:q.wrongWhy};
}

// ── Local session persistence (survives refresh) ─────────────────────
function _examLocalKey(examId){return 'cma-exam-session-v1:'+examId;}
function _examSaveLocal(sess){
  if(!sess||!sess.examId)return;
  try{
    localStorage.setItem(_examLocalKey(sess.examId),JSON.stringify({
      examId:sess.examId,answers:sess.answers,currentIdx:sess.currentIdx,
      startedAt:sess.startedAt,deadlineAt:sess.deadlineAt,submitted:sess.submitted,
      flagged:sess.flagged||{}   // Batch 11: mark-for-review, survives reload/resume
    }));
  }catch{}
}
function _examLoadLocal(examId){
  try{const d=localStorage.getItem(_examLocalKey(examId));return d?JSON.parse(d):null;}catch{return null;}
}
function _examClearLocal(examId){try{localStorage.removeItem(_examLocalKey(examId));}catch{}}

// ── Load student's group exams (lazy, cached in STATE) ────────────────
async function loadStudentExams(){
  if(STATE.studentExamsLoaded)return;
  const st=loadStudent();
  if(!st||!st.groupCode){STATE.studentExamsLoaded=true;STATE.studentExams=[];return;}
  try{
    const g=st.groupCode.toUpperCase();
    const snap=await db.collection('exams').where('groupCode','==',g).get();
    STATE.studentExams=snap.docs.map(d=>({id:d.id,...d.data()}))
      .sort((a,b)=>(a.opensAt||'')>(b.opensAt||'')?1:-1);
    STATE.studentExamsLoaded=true;
    if(STATE.studentExams.length&&STATE.user){
      const results={};
      await Promise.all(STATE.studentExams.map(async ex=>{
        try{
          const rid=ex.id+'_'+STATE.user.uid;
          const doc=await db.collection('exam-results').doc(rid).get();
          if(doc.exists)results[ex.id]=doc.data();
        }catch{}
      }));
      STATE.studentExamResults=results;
    }
    if(STATE.tab==='intro')render();
  }catch(e){
    console.warn('[Student Exams] load failed:',e);
    STATE.studentExamsLoaded=true;STATE.studentExams=[];
  }
}

// ── Build the deterministic question set for this student ──────────────
// Batch 5: if exam has a frozen `questionIds` array, look up those questions
// from the section pool by qid (format: `${lessonId}:${qid||index}`). Every
// student sees the SAME set; only ORDER and OPTION ORDER are shuffled per-uid.
// Legacy exams (created before Batch 5) fall through to the pool-random path.
async function buildExamQuestions(exam,uid){
  // Batch 11: multi-section aware. Legacy single-section exams (sectionId
  // only, no sectionIds array) still work unchanged via the fallback.
  const sectionIds=Array.isArray(exam.sectionIds)&&exam.sectionIds.length?exam.sectionIds:[exam.sectionId];
  const unitsBySection=exam.unitsBySection||(exam.unitIds?{[exam.sectionId]:exam.unitIds}:{});
  await Promise.all(sectionIds.map(sid=>ensureQuizzes(sid)));
  // Build a full pool with qid keys so we can resolve frozen sets and honor unit filter
  const poolAll=[];
  sectionIds.forEach(sid=>{
    const sec=S.find(s=>s.id===sid);
    if(!sec)return;
    const unitIds=Array.isArray(unitsBySection[sid])?unitsBySection[sid].map(String).filter(Boolean):[];
    const lessonMatch=(lid)=>!unitIds.length||unitIds.includes(String(lid));
    sec.lessons.forEach(l=>{
      if(!lessonMatch(l.id))return;
      if(l.quizzes&&l.quizzes.length)l.quizzes.forEach((q,i)=>{
        const qid=l.id+':'+(q.id||i);
        poolAll.push({...q,_qid:qid,_lid:l.id,_ltitle:l.title});
      });
    });
  });
  if(!poolAll.length)return[];
  const seed=exam.id+':'+uid;
  const rand=_mulberry32(_hashStr(seed));
  let picked;
  if(Array.isArray(exam.questionIds)&&exam.questionIds.length){
    // Batch 5 path — resolve frozen set in order, then per-uid shuffle
    const map=new Map(poolAll.map(q=>[q._qid,q]));
    picked=exam.questionIds.map(qid=>map.get(qid)).filter(Boolean);
    // If some frozen IDs are missing (e.g. content rebuild), top up from pool
    if(picked.length<exam.count){
      const have=new Set(picked.map(q=>q._qid));
      const filler=poolAll.filter(q=>!have.has(q._qid));
      // fill up to exam.count
      while(picked.length<exam.count&&filler.length){
        const j=Math.floor(rand()*filler.length);
        picked.push(filler.splice(j,1)[0]);
      }
    }
  }else{
    // Legacy path — deterministic pool shuffle & slice (backward compat)
    picked=poolAll.slice();
  }
  // Shuffle picked order per-uid
  const shuffled=picked.slice();
  for(let i=shuffled.length-1;i>0;i--){
    const j=Math.floor(rand()*(i+1));
    [shuffled[i],shuffled[j]]=[shuffled[j],shuffled[i]];
  }
  const finalPicked=shuffled.slice(0,Math.min(exam.count,shuffled.length));
  return finalPicked.map(q=>seededShuffleOptions(q,rand));
}

// ── Start / Resume / Answer / Submit ───────────────────────────────────
async function startExam(examId){
  const exam=STATE.studentExams.find(e=>e.id===examId);
  if(!exam)return;
  const status=examWindowStatus(exam);
  if(status!=='active'){showToast('This exam is not currently open.','warning');return;}
  const existing=(STATE.studentExamResults||{})[examId];
  if(existing&&existing.submitted){showToast('You have already submitted this exam.','warning');return;}

  const resumeMode=existing&&!existing.submitted&&existing.startedAt;
  const modalTitle=resumeMode?'Resume '+exam.title+'?':'Start '+exam.title+'?';
  // Batch 8: the modal body is set via textContent, so inline <b>/<br> HTML
  // showed up as literal text. Move the structured details into the list param
  // (which renders as bullets) and keep body as a single plain line.
  const modalBody=resumeMode
    ?'⏱️ Time remaining is calculated from when you first started. Any answers you saved earlier are restored.'
    :'⚠️ Timer starts immediately. The exam auto-submits at the deadline.';
  const modalList=resumeMode?null:['⏱️ Duration: '+exam.durationMinutes+' minutes','📊 Questions: '+exam.count];
  const ok=await showModal({
    icon:'\u{1F4DD}',title:modalTitle,body:modalBody,list:modalList,
    type:'primary',confirmText:resumeMode?'Resume':'Start Now',cancelText:'Not Yet'
  });
  if(!ok)return;

  let startedAt,deadlineAt,answers,currentIdx,flagged;
  if(resumeMode){
    startedAt=existing.startedAt;
    deadlineAt=existing.deadlineAt;
    const local=_examLoadLocal(examId);
    answers=(local&&local.answers)||{};
    currentIdx=(local&&local.currentIdx)||0;
    flagged=(local&&local.flagged)||{};   // Batch 11: restore flags on resume
  }else{
    startedAt=new Date().toISOString();
    const byDur=Date.now()+exam.durationMinutes*60000;
    const byClose=exam.closesAt?Date.parse(exam.closesAt):byDur;
    deadlineAt=new Date(Math.min(byDur,byClose)).toISOString();
    answers={};currentIdx=0;flagged={};
    try{
      await db.collection('exam-results').doc(examId+'_'+STATE.user.uid).set({
        examId,userId:STATE.user.uid,groupCode:exam.groupCode,sectionId:exam.sectionId,
        startedAt,deadlineAt,answers:{},submitted:false
      });
    }catch(e){showToast('Could not start exam: '+e.message,'error');return;}
  }

  const questions=await buildExamQuestions(exam,STATE.user.uid);
  if(!questions.length){showToast('No questions available for this section yet.','error');return;}

  STATE.examSession={
    examId,exam,questions,answers,currentIdx,flagged,
    startedAt,deadlineAt,submitting:false,submitted:false,results:null,navOpen:false
  };
  _examSaveLocal(STATE.examSession);
  STATE.tab='exam';render();
  _examStartTimer();
}

let _examTimerInterval=null;
function _examStartTimer(){
  _examStopTimer();
  _examTimerInterval=setInterval(()=>{
    if(STATE.tab!=='exam'||!STATE.examSession||STATE.examSession.submitted){_examStopTimer();return;}
    const remaining=Date.parse(STATE.examSession.deadlineAt)-Date.now();
    const el=document.getElementById('exam-timer');
    if(el){
      const s=Math.max(0,Math.floor(remaining/1000));
      const mm=String(Math.floor(s/60)).padStart(2,'0');
      const ss=String(s%60).padStart(2,'0');
      el.textContent=mm+':'+ss;
      el.style.color=remaining<60000?'var(--err)':remaining<300000?'#D2691E':'var(--ink)';
    }
    if(remaining<=0){_examStopTimer();submitExam(true);}
  },1000);
}
function _examStopTimer(){if(_examTimerInterval){clearInterval(_examTimerInterval);_examTimerInterval=null;}}

function examAnswer(qIdx,optIdx){
  if(!STATE.examSession||STATE.examSession.submitted)return;
  STATE.examSession.answers[qIdx]=optIdx;
  _examSaveLocal(STATE.examSession);
  _examRenderRunner();
}
// Batch 11: personal navigation aid only — never sent to Firestore, cleared
// with the rest of local exam state on submit (_examClearLocal).
function examToggleFlag(qIdx){
  if(!STATE.examSession||STATE.examSession.submitted)return;
  STATE.examSession.flagged=STATE.examSession.flagged||{};
  if(STATE.examSession.flagged[qIdx])delete STATE.examSession.flagged[qIdx];
  else STATE.examSession.flagged[qIdx]=true;
  _examSaveLocal(STATE.examSession);
  _examRenderRunner();
}
function examGoTo(idx){
  if(!STATE.examSession||STATE.examSession.submitted)return;
  const max=STATE.examSession.questions.length-1;
  STATE.examSession.currentIdx=Math.max(0,Math.min(max,idx));
  STATE.examSession.navOpen=false;
  _examSaveLocal(STATE.examSession);
  _examRenderRunner();
}
function examNavToggle(){
  if(!STATE.examSession)return;
  STATE.examSession.navOpen=!STATE.examSession.navOpen;
  _examRenderRunner();
}

async function submitExam(auto){
  const sess=STATE.examSession;
  if(!sess||sess.submitted||sess.submitting)return;
  if(!auto){
    const answered=Object.keys(sess.answers).length;
    const total=sess.questions.length;
    const ok=await showModal({
      icon:answered<total?'\u26A0\uFE0F':'\u2705',
      title:'Submit Exam?',
      body:answered<total
        ?'You have answered <b>'+answered+' of '+total+'</b> questions. Unanswered questions will be marked wrong. This action cannot be undone.'
        :'You have answered all '+total+' questions. Submit for grading?',
      type:answered<total?'danger':'primary',
      confirmText:'Submit',cancelText:'Keep Going'
    });
    if(!ok)return;
  }
  sess.submitting=true;_examStopTimer();
  let score=0;
  let unanswered=0;
  const answersOut=[];
  // Batch 11: per-lesson miss tally -> surfaces the weakest unit on the result screen.
  const missByLesson={};
  sess.questions.forEach((q,i)=>{
    const picked=sess.answers[i];
    const correct=picked===q.a;
    if(correct)score++;
    else{
      const lid=q._lid||'';
      if(!missByLesson[lid])missByLesson[lid]={count:0,title:q._ltitle||lid};
      missByLesson[lid].count++;
    }
    if(picked==null)unanswered++;
    answersOut.push({picked:picked==null?null:picked,correct});
  });
  const total=sess.questions.length;
  const percentage=total?Math.round(score/total*100):0;
  const submittedAt=new Date().toISOString();
  // Batch 11: actual time consumed + simple per-question average (overall
  // average only — per-question timestamps aren't captured in the exam
  // runner the way Quiz Mode's questionTimes[] are).
  const timeMs=Math.max(0,Date.parse(submittedAt)-Date.parse(sess.startedAt||submittedAt));
  const avgMsPerQ=total?Math.round(timeMs/total):0;
  // Batch 11: per-section correct/total — trivial for today's single-section
  // exams, becomes meaningful once multi-section exams ship.
  const bySection={};
  sess.questions.forEach((q,i)=>{
    const sid=(q._lid||'').split('-')[0]||'?';
    if(!bySection[sid])bySection[sid]={correct:0,total:0};
    bySection[sid].total++;
    if(answersOut[i].correct)bySection[sid].correct++;
  });
  const weakestLesson=Object.values(missByLesson).sort((a,b)=>b.count-a.count)[0]||null;
  try{
    const st=loadStudent()||{};
    const questionSnapshot=sess.questions.map(q=>({q:q.q,o:q.o,a:q.a,e:q.e||'',wrongWhy:q.wrongWhy||null,_lid:q._lid||'',_ltitle:q._ltitle||''}));
    await db.collection('exam-results').doc(sess.examId+'_'+STATE.user.uid).set({
      examId:sess.examId,userId:STATE.user.uid,studentName:st.name||STATE.user.displayName||'Student',
      groupCode:sess.exam.groupCode,sectionId:sess.exam.sectionId,
      startedAt:sess.startedAt,deadlineAt:sess.deadlineAt,
      answers:answersOut,questionSnapshot,score,total,percentage,
      submitted:true,submittedAt,autoSubmitted:!!auto
    },{merge:true});
    sess.submitted=true;
    sess.results={
      score,total,percentage,autoSubmitted:!!auto,submittedAt,
      unanswered,timeMs,avgMsPerQ,bySection,weakestLesson,
      passed:percentage>=EXAM_PASS_THRESHOLD
    };
    sess.submitting=false;
    _examClearLocal(sess.examId);
    STATE.studentExamResults=STATE.studentExamResults||{};
    STATE.studentExamResults[sess.examId]={submitted:true,score,total,percentage,submittedAt};
    render();
    if(auto)showToast('\u23F0 Time up — exam auto-submitted.','warning',4000);
    else showToast('\u2705 Exam submitted.','success');
  }catch(e){
    sess.submitting=false;
    showToast('Submission failed. Your answers are saved — please try again.','error',4000);
    _examStartTimer();
  }
}

function exitExam(){
  if(STATE.examSession&&!STATE.examSession.submitted){
    showToast('Submit the exam first.','warning');return;
  }
  const returnTab=STATE.examSession&&STATE.examSession.instructorReturnTab;
  _examStopTimer();
  STATE.examSession=null;
  if(returnTab){
    STATE.tab=returnTab;
    render();
    return;
  }
  STATE.studentExamsLoaded=false;
  STATE.tab='intro';
  loadStudentExams();
  render();
}

// ═════ RENDERERS ══════════════════════════════════════════════════════

// Home strip — shown atop renderIntro when the student's group has exams.
function renderExamsStrip(){
  const st=loadStudent();
  if(!STATE.user||isInstructor()||!st||!st.groupCode)return '';
  if(!STATE.studentExamsLoaded){
    loadStudentExams();
    // Batch 2 ride-along: subtle skeleton while we check for exams.
    // Prevents the "empty gap → sudden pop-in" flicker on Home load.
    return '<div style="margin-bottom:14px"><div class="gs-skeleton-card" style="border-radius:12px"><div class="gs-skeleton-line short"></div><div class="gs-skeleton-line long"></div><div class="gs-skeleton-line medium"></div></div></div>';
  }
  const exams=STATE.studentExams||[];
  if(!exams.length)return '';
  const results=STATE.studentExamResults||{};

  const fmtDT=(iso)=>{if(!iso)return '';try{return new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch{return iso;}};
  const fmtCountdown=(iso)=>{
    if(!iso)return '';
    const ms=Date.parse(iso)-Date.now();
    if(ms<=0)return 'now';
    const mins=Math.floor(ms/60000);
    if(mins<60)return 'in '+mins+' min';
    const hrs=Math.floor(mins/60);
    if(hrs<24)return 'in '+hrs+'h '+(mins%60)+'m';
    const days=Math.floor(hrs/24);
    return 'in '+days+' day'+(days===1?'':'s');
  };

  const active=exams.filter(e=>examWindowStatus(e)==='active'&&!(results[e.id]&&results[e.id].submitted));
  const scheduled=exams.filter(e=>examWindowStatus(e)==='scheduled');
  const completed=exams.filter(e=>results[e.id]&&results[e.id].submitted).slice(0,2);
  const cards=[...active,...scheduled,...completed].slice(0,3);
  if(!cards.length)return '';

  const cardHTML=(ex)=>{
    const st=examWindowStatus(ex);
    const res=results[ex.id];
    const submitted=res&&res.submitted;
    let banner,body,btn;
    if(submitted){
      banner={bg:'linear-gradient(135deg,var(--ok-strong-2),var(--ok))',label:'\u2705 COMPLETED'};
      // Batch 11: show when the exam was taken (was missing entirely).
      const takenDate=res.submittedAt?fmtDT(res.submittedAt):'';
      body='Score: <b>'+res.score+'/'+res.total+'</b> \u00B7 '+res.percentage+'%'+(takenDate?' \u00B7 '+takenDate:'');
      btn='<button onclick="openExamReview(\''+ex.id+'\')" style="background:rgba(255,255,255,.2);color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:8px;padding:6px 14px;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Review \u2192</button>';
    }else if(st==='active'){
      const inProgress=_examLoadLocal(ex.id);
      banner={bg:'linear-gradient(135deg,var(--brand),var(--brand-2))',label:inProgress?'\u25B6\uFE0F RESUME':'\u{1F7E2} ACTIVE'};
      body='<b>'+ex.count+'</b> Qs \u00B7 <b>'+ex.durationMinutes+'</b> min \u00B7 closes '+fmtCountdown(ex.closesAt);
      btn='<button onclick="startExam(\''+ex.id+'\')" style="background:#fff;color:var(--brand);border:none;border-radius:8px;padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+(inProgress?'Resume \u2192':'Start Exam \u2192')+'</button>';
    }else if(st==='scheduled'){
      banner={bg:'linear-gradient(135deg,#7A5A00,#B57E00)',label:'\u23F3 SCHEDULED'};
      body='Opens '+fmtCountdown(ex.opensAt)+' \u00B7 '+fmtDT(ex.opensAt);
      btn='<span style="font-size:11px;color:rgba(255,255,255,.75)">'+ex.count+' Qs \u00B7 '+ex.durationMinutes+' min</span>';
    }else{
      return '';
    }
    return '<div style="background:'+banner.bg+';border-radius:12px;padding:14px 16px;color:#fff;margin-bottom:10px;box-shadow:0 2px 6px rgba(0,0,0,.08)">'
      +'<div style="font-size:10px;font-weight:700;letter-spacing:.6px;opacity:.9;margin-bottom:4px">'+banner.label+'</div>'
      +'<div style="font-size:15px;font-weight:600;line-height:1.3;margin-bottom:4px">'+esc(ex.title)+'</div>'
      +'<div style="font-size:12px;opacity:.9;margin-bottom:10px">'+body+'</div>'
      +'<div>'+btn+'</div>'
      +'</div>';
  };
  const inner=cards.map(cardHTML).filter(Boolean).join('');
  if(!inner)return '';
  return '<div style="margin-bottom:14px">'+inner+'</div>';
}

// Full-screen runner + result. Dispatcher case: 'exam'
function renderExam(){
  if(!STATE.examSession)return renderIntro();
  if(STATE.examSession.reviewMode)return renderExamReview();
  if(STATE.examSession.submitted)return renderExamResult();
  return renderExamRunner();
}

function renderExamRunner(){
  const sess=STATE.examSession;
  const q=sess.questions[sess.currentIdx];
  if(!q)return '<div style="padding:30px;text-align:center;color:#888">No question.</div>';
  const total=sess.questions.length;
  const picked=sess.answers[sess.currentIdx];
  const isFlagged=!!(sess.flagged&&sess.flagged[sess.currentIdx]);   // Batch 11
  const answeredCount=Object.keys(sess.answers).length;
  const remaining=Math.max(0,Date.parse(sess.deadlineAt)-Date.now());
  const s=Math.floor(remaining/1000);
  const timerText=String(Math.floor(s/60)).padStart(2,'0')+':'+String(s%60).padStart(2,'0');
  const timerColor=remaining<60000?'var(--err)':remaining<300000?'#D2691E':'var(--ink)';

  const opts=q.o.map((opt,i)=>{
    const selected=picked===i;
    const bg=selected?'var(--ok-tint)':'var(--surface-3)';
    const border=selected?'1px solid var(--ok)':'.5px solid var(--border)';
    const circBg=selected?'#c0dd97':'var(--border-2)';
    const circC=selected?'var(--ok-strong)':'#666';
    return '<div class="q-opt" onclick="examAnswer('+sess.currentIdx+','+i+')" style="background:'+bg+';border:'+border+';cursor:pointer">'
      +'<div class="q-circle" style="background:'+circBg+';color:'+circC+';border:.5px solid #bbb">'+String.fromCharCode(65+i)+'</div>'
      +'<div class="q-text" style="color:var(--ink)">'+esc(normalizeCase(opt))+'</div>'
      +'</div>';
  }).join('');

  const navGrid=sess.navOpen
    ?'<div style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200" onclick="examNavToggle()">'
     +'<div onclick="event.stopPropagation()" style="position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:16px 16px 0 0;padding:16px;max-height:75vh;overflow-y:auto">'
     +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
     +'<div style="font-size:14px;font-weight:600">Questions ('+answeredCount+'/'+total+')</div>'
     +'<button onclick="examNavToggle()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888">\u00D7</button>'
     +'</div>'
     +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:8px">'
     +sess.questions.map((_,i)=>{
        const ans=sess.answers[i]!==undefined;
        const cur=i===sess.currentIdx;
        const flag=!!(sess.flagged&&sess.flagged[i]);   // Batch 11: mark-for-review overlay
        return '<button onclick="examGoTo('+i+')" style="position:relative;padding:9px 0;border-radius:8px;border:'+(cur?'2px solid var(--brand)':(flag?'1.5px solid #D2691E':'.5px solid var(--border-4)'))+';background:'+(ans?'var(--ok-tint)':'#fff')+';color:'+(ans?'var(--ok-strong)':'#666')+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+(flag?'<span style="position:absolute;top:-5px;right:-4px;font-size:11px">\u{1F6A9}</span>':'')+(i+1)+'</button>';
      }).join('')
     +'</div>'
     +'<button onclick="examNavToggle();submitExam(false)" style="margin-top:14px;width:100%;padding:12px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Submit Exam</button>'
     +'</div></div>'
    :'';

  const prevBtn=sess.currentIdx>0
    ?'<button onclick="examGoTo('+(sess.currentIdx-1)+')" style="flex:0 0 auto;padding:11px 16px;border-radius:10px;border:.5px solid var(--border-4);background:#fff;color:#333;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">\u2039 Prev</button>'
    :'<div style="flex:0 0 auto;width:1px"></div>';
  const isLast=sess.currentIdx>=total-1;
  const nextBtn=isLast
    ?'<button onclick="submitExam(false)" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--ok-strong-2);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Submit Exam \u2B07</button>'
    :'<button onclick="examGoTo('+(sess.currentIdx+1)+')" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Next \u203A</button>';
  const barW=Math.round((sess.currentIdx+1)/total*100);

  return '<div id="exam-runner" style="display:flex;flex-direction:column;height:100%">'
    +'<div style="background:#fff;border-bottom:.5px solid var(--border);padding:10px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0">'
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.4px">'+esc(sess.exam.title)+'</div>'
    +'<div style="font-size:13px;font-weight:600;color:var(--ink)">Question '+(sess.currentIdx+1)+' of '+total+' \u00B7 <span style="color:var(--ok-strong-2)">'+answeredCount+' answered</span></div>'
    +'</div>'
    +'<button onclick="examToggleFlag('+sess.currentIdx+')" title="Mark for review" style="padding:6px 10px;border-radius:8px;border:.5px solid '+(isFlagged?'#D2691E':'var(--border-4)')+';background:'+(isFlagged?'#FDF0E6':'var(--surface)')+';font-size:14px;cursor:pointer;font-family:inherit">'+(isFlagged?'\u{1F6A9}':'\u{1F3F3}\uFE0F')+'</button>'
    +'<button onclick="examNavToggle()" style="padding:6px 10px;border-radius:8px;border:.5px solid var(--border-4);background:var(--surface);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u2630 Nav</button>'
    +'<div style="background:var(--surface);border:.5px solid var(--border-4);border-radius:8px;padding:6px 10px;font-family:\'Courier New\',monospace;font-size:14px;font-weight:700;color:'+timerColor+'" id="exam-timer">'+timerText+'</div>'
    +'</div>'
    +'<div style="height:4px;background:var(--surface-4);flex-shrink:0"><div style="height:100%;width:'+barW+'%;background:var(--brand);transition:width .3s"></div></div>'
    +'<div class="scroll-area pad" style="padding-top:16px">'
    +'<div class="card" style="margin-bottom:12px">'
    +'<p style="font-size:15px;font-weight:500;line-height:1.55;margin-bottom:18px">'+stemHTML(q.q)+'</p>'
    +dataTableHTML(q)
    +askHTML(q)
    +opts
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:14px">'+prevBtn+nextBtn+'</div>'
    +'<div style="height:20px"></div>'
    +'</div>'
    +navGrid
    +'</div>';
}

// Batch 11: mm:ss for <1h, Xh Ym for >=1h.
function _fmtDuration(ms){
  const totalSec=Math.max(0,Math.round((ms||0)/1000));
  const h=Math.floor(totalSec/3600),m=Math.floor((totalSec%3600)/60),s=totalSec%60;
  if(h>0)return h+'h '+m+'m';
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}
function renderExamResult(){
  const sess=STATE.examSession;
  const r=sess.results;
  if(!r)return '';
  const emoji=r.percentage>=80?'\u{1F3C6}':r.percentage>=60?'\u{1F44D}':'\u{1F4DA}';
  const label=r.percentage>=80?'Excellent!':r.percentage>=60?'Good work!':'Keep studying!';
  // Batch 11: explicit pass/fail line, independent of the tiered emoji/label above.
  const passed=r.passed!=null?r.passed:(r.percentage>=EXAM_PASS_THRESHOLD);
  const passBadge='<div style="display:inline-block;margin-top:6px;padding:5px 14px;border-radius:14px;font-size:12px;font-weight:700;background:'+(passed?'var(--ok-tint-2)':'var(--err-tint)')+';color:'+(passed?'var(--ok-2)':'var(--err-2)')+'">'+(passed?'\u2705 Passed':'\u274C Not Passed \u2014 need '+EXAM_PASS_THRESHOLD+'%')+'</div>';
  // Batch 11: time / average / unanswered / section breakdown / weakest unit.
  const statRow=(label,val)=>'<div style="display:flex;justify-content:space-between;padding:6px 0;border-bottom:.5px solid var(--border)"><span style="color:#888">'+label+'</span><span style="font-weight:600;color:var(--ink)">'+val+'</span></div>';
  let statsHTML=''
    +statRow('Time taken',_fmtDuration(r.timeMs))
    +statRow('Avg. per question',_fmtDuration(r.avgMsPerQ))
    +statRow('Unanswered',(r.unanswered||0)+' of '+r.total);
  if(r.bySection){
    const sids=Object.keys(r.bySection);
    if(sids.length){
      const parts=sids.map(sid=>{
        const sec=S.find(s=>String(s.id)===String(sid));
        const b=r.bySection[sid];
        return (sec?sec.title:'Sec.'+sid)+': '+b.correct+'/'+b.total;
      });
      statsHTML+=statRow('By section',parts.join(' \u00B7 '));
    }
  }
  const weakBlock=(r.weakestLesson&&r.weakestLesson.count>0)
    ?'<div class="card" style="text-align:left;margin-bottom:14px;background:var(--warn-tint)">'
     +'<div style="font-size:12px;font-weight:600;color:var(--warn-strong);margin-bottom:4px">\u{1F4CC} Focus next on</div>'
     +'<div style="font-size:13px;color:#333">'+esc(r.weakestLesson.title)+' \u2014 '+r.weakestLesson.count+' missed here</div>'
     +'</div>':'';
  return '<div class="scroll-area" style="padding:36px 16px 20px;text-align:center">'
    +'<div style="font-size:56px">'+emoji+'</div>'
    +'<div style="font-size:20px;font-weight:500;margin-top:8px">'+label+'</div>'
    +'<div style="font-size:12px;color:#aaa;margin:4px 0 4px">'+esc(sess.exam.title)+(r.autoSubmitted?' \u00B7 auto-submitted at deadline':'')+'</div>'
    +passBadge
    +'<div style="font-size:52px;font-weight:500;color:'+(r.percentage>=60?'var(--ok-strong-2)':'var(--err)')+';margin:10px 0 2px">'+r.percentage+'%</div>'
    +'<div style="font-size:15px;color:#666;margin-bottom:20px">'+r.score+' out of '+r.total+' correct</div>'
    +'<div class="card" style="text-align:left;margin-bottom:14px">'+statsHTML+'</div>'
    +weakBlock
    +'<div class="card" style="text-align:left;margin-bottom:14px">'
    +'<div style="font-size:13px;font-weight:600;color:#333;margin-bottom:6px">Result recorded \u2705</div>'
    +'<div style="font-size:12px;color:#666;line-height:1.6">Your instructor can now see this result on their dashboard. Tap <b>Review Answers</b> to see the correct answers and explanations.</div>'
    +'</div>'
    +'<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap">'
    +'<button class="btn btn-outline" onclick="exitExam()" style="flex:0 1 auto">Back to Home</button>'
    +'<button class="btn" onclick="openExamReview(\''+sess.examId+'\')" style="background:var(--brand);color:#fff;flex:0 1 auto">Review Answers \u2192</button>'
    +'</div>'
    +'<div style="height:20px"></div>'
    +'</div>';
}

function _examRenderRunner(){
  if(STATE.tab!=='exam'||!STATE.examSession||STATE.examSession.submitted){render();return;}
  const area=document.getElementById('content-area');
  if(!area){render();return;}
  area.innerHTML=renderExamRunner();
}

// ═════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════
// PHASE 3a-iii-A — GROUP EXAMS (per-question review, student side)
//
// Adds:
//   • questionSnapshot written to exam-results on submit — full question
//     objects (as the student saw them, options already shuffled) so review
//     is bulletproof against future edits to s{N}.json.
//   • openExamReview(examId) — entry point from result screen or Home strip.
//     Just-submitted exams reuse the in-memory session (zero Firestore reads);
//     older exams fetch the exam-results doc and populate STATE.examSession
//     in reviewMode.
//   • renderExamReview — per-question walkthrough with verdict banner,
//     correct answer highlighted, student's wrong pick marked (if any),
//     explanation from expFor() / q.e, lesson attribution.
//   • Fallback for pre-3a-iii-A submissions without a snapshot: regenerate
//     the deterministic set (same seed still produces same questions if
//     s{N}.json hasn't changed).
// ═════════════════════════════════════════════════════════════════════

async function openExamReview(examId){
  // Case 1: we just submitted this exam and the in-memory session is intact.
  if(STATE.examSession&&STATE.examSession.examId===examId&&STATE.examSession.submitted&&Array.isArray(STATE.examSession.questions)&&STATE.examSession.questions.length){
    STATE.examSession.reviewMode=true;
    STATE.examSession.reviewIdx=0;
    STATE.examSession.navOpen=false;
    STATE.tab='exam';render();return;
  }
  // Case 2: reopening a previously submitted exam — fetch from Firestore.
  const exam=(STATE.studentExams||[]).find(e=>e.id===examId);
  if(!exam){showToast('Exam not found.','error');return;}
  showToast('Loading review\u2026','info',1500);
  try{
    const doc=await db.collection('exam-results').doc(examId+'_'+STATE.user.uid).get();
    if(!doc.exists){showToast('No result found.','error');return;}
    const data=doc.data();
    let questions=data.questionSnapshot;
    if(!questions||!Array.isArray(questions)||!questions.length){
      // Fallback: regenerate deterministically. Same seed will yield the same
      // set as long as s{N}.json hasn't changed since submission.
      questions=await buildExamQuestions(exam,STATE.user.uid);
      if(!questions.length){showToast('Cannot rebuild review data.','error');return;}
      // Watchlist #5 — backfill the snapshot so future reviews use stored
      // data (independent of s{N}.json). Fire-and-forget; silent on failure.
      try{
        const backfill=questions.map(q=>({q:q.q,o:q.o,a:q.a,e:q.e||'',wrongWhy:q.wrongWhy||null,_lid:q._lid||'',_ltitle:q._ltitle||''}));
        db.collection('exam-results').doc(examId+'_'+STATE.user.uid).update({questionSnapshot:backfill}).catch(()=>{});
      }catch{}
    }
    // Firestore stores answers as an array of {picked, correct}. Runner uses
    // an indexed object {qIdx: optIdx}. Convert here.
    const answers={};
    if(Array.isArray(data.answers)){
      data.answers.forEach((a,i)=>{if(a&&a.picked!=null)answers[i]=a.picked;});
    }
    STATE.examSession={
      examId,exam,questions,answers,currentIdx:0,reviewIdx:0,
      startedAt:data.startedAt,deadlineAt:data.deadlineAt,
      submitting:false,submitted:true,reviewMode:true,
      results:{
        score:data.score||0,
        total:data.total||questions.length,
        percentage:data.percentage||0,
        autoSubmitted:!!data.autoSubmitted,
        submittedAt:data.submittedAt||''
      },
      navOpen:false
    };
    STATE.tab='exam';render();
  }catch(e){showToast('Could not load review: '+e.message,'error');}
}

function examReviewGoTo(idx){
  if(!STATE.examSession)return;
  const max=STATE.examSession.questions.length-1;
  STATE.examSession.reviewIdx=Math.max(0,Math.min(max,idx));
  STATE.examSession.navOpen=false;
  _examRenderReview();
}
function examReviewNavToggle(){
  if(!STATE.examSession)return;
  STATE.examSession.navOpen=!STATE.examSession.navOpen;
  _examRenderReview();
}
function _examRenderReview(){
  if(STATE.tab!=='exam'||!STATE.examSession||!STATE.examSession.reviewMode){render();return;}
  const area=document.getElementById('content-area');
  if(!area){render();return;}
  area.innerHTML=renderExamReview();
}

function renderExamReview(){
  const sess=STATE.examSession;
  if(!sess||!Array.isArray(sess.questions)||!sess.questions.length)return renderIntro();
  const idx=sess.reviewIdx||0;
  const q=sess.questions[idx];
  const total=sess.questions.length;
  const picked=sess.answers[idx];
  const correct=picked===q.a;
  const skipped=picked==null;
  const correctCount=sess.questions.reduce((n,q2,i)=>n+(sess.answers[i]===q2.a?1:0),0);

  // Options: correct answer green, student's wrong pick red, others neutral.
  const opts=q.o.map((opt,i)=>{
    let bg='var(--surface-3)',border='.5px solid var(--border)',textC='var(--ink)',circBg='var(--border-2)',circC='#666',circTxt=String.fromCharCode(65+i);
    if(i===q.a){bg='var(--ok-tint)';border='1px solid var(--ok)';textC='var(--ok-strong)';circBg='#c0dd97';circC='var(--ok-strong)';circTxt='\u2713';}
    else if(i===picked){bg='var(--err-tint)';border='1px solid var(--err)';textC='var(--err-strong)';circBg='#f7c1c1';circC='var(--err-strong)';circTxt='\u2717';}
    else{textC='#888';}
    return '<div class="q-opt" style="background:'+bg+';border:'+border+';cursor:default">'
      +'<div class="q-circle" style="background:'+circBg+';color:'+circC+';border:.5px solid #bbb">'+circTxt+'</div>'
      +'<div class="q-text" style="color:'+textC+'">'+esc(normalizeCase(opt))+'</div>'
      +'</div>';
  }).join('');

  const verdictBar=skipped
    ?'<div style="background:var(--accent-purple-tint);border:1px solid #D2B4DE;color:#6C3483;padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px">\u25CB Not answered</div>'
    :correct
      ?'<div style="background:var(--ok-tint);border:1px solid var(--ok);color:var(--ok-strong);padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px">\u2705 Correct</div>'
      :'<div style="background:var(--err-tint);border:1px solid var(--err);color:var(--err-2);padding:9px 12px;border-radius:8px;font-size:12px;font-weight:600;margin-bottom:12px">\u274C Incorrect</div>';

  // Prefer per-option wrongWhy via expFor() for wrong picks; else use q.e.
  let explanationText='';
  if(!correct&&!skipped&&typeof expFor==='function'){
    try{explanationText=expFor(q,picked)||q.e||'';}catch{explanationText=q.e||'';}
  }else{
    explanationText=q.e||'';
  }
  const explanation=explanationText
    ?'<div style="margin-top:14px;padding:13px 14px;border-radius:10px;background:var(--surface);border:.5px solid var(--border)">'
     +'<div style="font-size:11px;font-weight:600;color:#666;text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Explanation</div>'
     +'<div style="font-size:13px;color:#333;line-height:1.6">'+expInner(q,(!correct&&!skipped)?picked:q.a)+'</div>'
     +'</div>'
    :'';

  const attribution=q._ltitle
    ?'<div style="font-size:11px;color:#888;margin-top:10px;font-style:italic">From: '+esc(q._ltitle)+'</div>'
    :'';

  const navGrid=sess.navOpen
    ?'<div style="position:fixed;inset:0;background:rgba(0,0,0,.35);z-index:200" onclick="examReviewNavToggle()">'
     +'<div onclick="event.stopPropagation()" style="position:absolute;left:0;right:0;bottom:0;background:#fff;border-radius:16px 16px 0 0;padding:16px;max-height:75vh;overflow-y:auto">'
     +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">'
     +'<div style="font-size:14px;font-weight:600">Review Questions</div>'
     +'<button onclick="examReviewNavToggle()" style="background:none;border:none;font-size:22px;cursor:pointer;color:#888">\u00D7</button>'
     +'</div>'
     +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(46px,1fr));gap:8px">'
     +sess.questions.map((q2,i)=>{
        const p=sess.answers[i];
        const c=p===q2.a;
        const sk=p==null;
        const bg=sk?'var(--accent-purple-tint)':c?'var(--ok-tint)':'var(--err-tint)';
        const col=sk?'#6C3483':c?'var(--ok-strong)':'var(--err-2)';
        const cur=i===idx;
        return '<button onclick="examReviewGoTo('+i+')" style="padding:9px 0;border-radius:8px;border:'+(cur?'2px solid var(--brand)':'.5px solid var(--border-4)')+';background:'+bg+';color:'+col+';font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">'+(i+1)+'</button>';
      }).join('')
     +'</div>'
     +'<div style="display:flex;gap:10px;margin-top:14px;font-size:11px;color:#888">'
     +'<div><span style="display:inline-block;width:10px;height:10px;background:var(--ok-tint);border-radius:2px;vertical-align:middle;margin-right:4px"></span>Correct</div>'
     +'<div><span style="display:inline-block;width:10px;height:10px;background:var(--err-tint);border-radius:2px;vertical-align:middle;margin-right:4px"></span>Wrong</div>'
     +'<div><span style="display:inline-block;width:10px;height:10px;background:var(--accent-purple-tint);border-radius:2px;vertical-align:middle;margin-right:4px"></span>Skipped</div>'
     +'</div>'
     +'</div></div>'
    :'';

  const prevBtn=idx>0
    ?'<button onclick="examReviewGoTo('+(idx-1)+')" style="flex:0 0 auto;padding:11px 16px;border-radius:10px;border:.5px solid var(--border-4);background:#fff;color:#333;font-size:14px;font-weight:500;cursor:pointer;font-family:inherit">\u2039 Prev</button>'
    :'<div style="flex:0 0 auto;width:1px"></div>';
  const isLast=idx>=total-1;
  const nextBtn=isLast
    ?'<button onclick="exitExam()" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Done \u2713</button>'
    :'<button onclick="examReviewGoTo('+(idx+1)+')" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">Next \u203A</button>';
  const barW=Math.round((idx+1)/total*100);

  const r=sess.results||{};
  const scoreBadge=r.score!=null
    ?'<div style="background:'+((r.percentage||0)>=60?'var(--ok-tint)':'var(--err-tint)')+';color:'+((r.percentage||0)>=60?'var(--ok-strong)':'var(--err-2)')+';border-radius:8px;padding:4px 10px;font-size:11px;font-weight:700;font-family:\'Courier New\',monospace">'+r.score+'/'+r.total+' \u00B7 '+(r.percentage||0)+'%</div>'
    :'';

  return '<div style="display:flex;flex-direction:column;height:100%">'
    +'<div style="background:#fff;border-bottom:.5px solid var(--border);padding:10px 14px;display:flex;align-items:center;gap:10px;flex-shrink:0">'
    +'<button onclick="exitExam()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--brand);padding:0 6px" title="Back">\u2039</button>'
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.4px">'+(sess.reviewStudent?'\u{1F464} '+esc(sess.reviewStudent.name||'Student')+' \u00B7 ':'Review \u00B7 ')+esc(sess.exam.title)+'</div>'
    +'<div style="font-size:13px;font-weight:600;color:var(--ink)">Q'+(idx+1)+' of '+total+' \u00B7 <span style="color:var(--ok-strong-2)">'+correctCount+' correct</span></div>'
    +'</div>'
    +scoreBadge
    +'<button onclick="examReviewNavToggle()" style="padding:6px 10px;border-radius:8px;border:.5px solid var(--border-4);background:var(--surface);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u2630 Nav</button>'
    +'</div>'
    +'<div style="height:4px;background:var(--surface-4);flex-shrink:0"><div style="height:100%;width:'+barW+'%;background:var(--brand);transition:width .3s"></div></div>'
    +'<div class="scroll-area pad" style="padding-top:14px">'
    +verdictBar
    +'<div class="card" style="margin-bottom:12px">'
    +'<p style="font-size:15px;font-weight:500;line-height:1.55;margin-bottom:16px">'+stemHTML(q.q)+'</p>'
    +(typeof dataTableHTML==='function'?dataTableHTML(q):'')
    +askHTML(q)
    +opts
    +explanation
    +attribution
    +'</div>'
    +'<div style="display:flex;gap:8px;margin-bottom:14px">'+prevBtn+nextBtn+'</div>'
    +'<div style="height:20px"></div>'
    +'</div>'
    +navGrid
    +'</div>';
}

// ═════════════════════════════════════════════════════════════════════
// ═════════════════════════════════════════════════════════════════════
// PHASE 3a-iii-B — GROUP EXAMS (instructor results view + CSV export)
//
// Flow:
//   Dashboard → Exams tab → per-card "📊 Results" → openExamResults()
//   fetches all exam-results docs for this examId (single query) and
//   caches them in STATE.dashExamResults[examId]. renderDashExamResults
//   shows aggregate stats (attempts, submitted, avg %, pass rate) and a
//   sortable student list. Click any student's "Review" → drill down
//   into renderExamReview with their session loaded; exitExam returns
//   here via instructorReturnTab='dashboard'.
//
// Cost:
//   ONE query per Results click (not per page load). Full docs are fetched
//   (~50KB × N students) so drill-down is instant afterwards from cache.
//   For ≤100 students per exam this is fine; beyond that we'd want a
//   summary-doc pattern (see Batch 3 / Watchlist #4).
// ═════════════════════════════════════════════════════════════════════

async function openExamResults(examId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  STATE.dashExamViewingId=examId;
  STATE.dashTab='exams';
  render();
  // Fire the load — renderDashExamResults will re-render when the cache fills.
  loadExamResults(examId);
}

async function loadExamResults(examId){
  const cache=STATE.dashExamResults[examId];
  if(cache&&cache.loaded&&!cache.loading)return;   // already have it
  STATE.dashExamResults[examId]={loading:true,loaded:false,results:[]};
  try{
    const snap=await db.collection('exam-results').where('examId','==',examId).get();
    // Batch 11: cross-reference userId against the already-loaded roster so rows
    // show the student's real name instead of falling back to "Student" —
    // exam-results docs never stored studentName at submit time, and this
    // works retroactively for old results with no Firestore migration needed.
    const rosterByUid={};
    (STATE.dashStudents||[]).forEach(s=>{rosterByUid[s.uid]=s.name||'';});
    const results=snap.docs.map(d=>{
      const data=d.data();
      return {_docId:d.id,...data,studentName:data.studentName||rosterByUid[data.userId]||'Student'};
    });
    // Compute aggregates
    const submitted=results.filter(r=>r.submitted);
    const scores=submitted.map(r=>r.percentage||0);
    const avg=scores.length?Math.round(scores.reduce((s,v)=>s+v,0)/scores.length):0;
    const passCount=submitted.filter(r=>(r.percentage||0)>=EXAM_PASS_THRESHOLD).length; // Batch 11: was hardcoded 60
    const passRate=submitted.length?Math.round(passCount/submitted.length*100):0;
    const sorted=[...scores].sort((a,b)=>a-b);
    const median=sorted.length?(sorted.length%2?sorted[(sorted.length-1)/2]:Math.round((sorted[sorted.length/2-1]+sorted[sorted.length/2])/2)):0;
    STATE.dashExamResults[examId]={
      loading:false,loaded:true,results,
      stats:{
        total:results.length,
        submitted:submitted.length,
        pending:results.length-submitted.length,
        avgPct:avg,
        medianPct:median,
        passCount,passRate,
        highest:scores.length?Math.max(...scores):0,
        lowest:scores.length?Math.min(...scores):0
      }
    };
    if(STATE.tab==='dashboard'&&STATE.dashExamViewingId===examId)render();
  }catch(e){
    console.warn('[Exam Results] load failed:',e);
    STATE.dashExamResults[examId]={loading:false,loaded:true,results:[],stats:null,error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashExamViewingId===examId)render();
  }
}

function closeExamResults(){
  STATE.dashExamViewingId=null;
  render();
}


// ═══════════════════════════════════════════════════════════════════════════
// BATCH 5 — DASHBOARD EXPANSION (Students / Attendance / Results / Progress /
//   Leader / Plan) + Weekly Plan surface for students
// ═══════════════════════════════════════════════════════════════════════════

// ── UI helpers ──────────────────────────────────────────────────────────────
function _dashSecTitle(secId){const s=S.find(x=>x.id===Number(secId));return s?s.title:('Section '+secId);}

// Unit picker used by the Exam create form. Empty selection = whole section.
// Batch 11: unit picker is now PER-SECTION — each selected section gets its
// own chip group, stored at unitsBySection[sectionId] (empty = whole section).
function renderExamUnitPicker(d,sectionId){
  const secId=parseInt(sectionId);
  const sec=S.find(s=>s.id===secId);
  if(!sec)return '';
  d.unitsBySection=d.unitsBySection||{};
  const selected=new Set((d.unitsBySection[secId]||[]).map(String));
  const chips=sec.lessons.map((l,idx)=>{
    const on=selected.has(String(l.id));
    // Batch 10: flag out-of-scope units so instructors see why a unit
    // (e.g. 4-14 Variances) is excluded from auto-built exam pools.
    const badge=l.outOfScope==='part2'?' \u26A0\uFE0F Part 2':(l.outOfScope?' \u26A0\uFE0F \u2192 Sec.3':'');
    return `<button type="button" onclick="toggleExamUnit(${secId},'${l.id}')" style="padding:6px 10px;border-radius:14px;border:1px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':(l.outOfScope?'#fff7ed':'#fff')};color:${on?'#fff':(l.outOfScope?'#b45309':'#555')};font-size:11px;font-weight:${on?'600':'500'};cursor:pointer;font-family:inherit;white-space:nowrap">U${idx+1}: ${esc(l.title.length>28?l.title.slice(0,26)+'\u2026':l.title)}${badge}</button>`;
  }).join('');
  const allCount=sec.lessons.length;
  const sel=selected.size;
  const label=sel===0?`All units (${allCount})`:`${sel} of ${allCount} units`;
  return `<div style="margin-bottom:10px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
      <label style="font-size:11px;color:#888">Sec ${secId} \u2014 ${esc(sec.title)} units <span style="font-weight:600;color:var(--brand)">${label}</span></label>
      <button type="button" onclick="clearExamUnits(${secId})" style="background:none;border:none;color:var(--brand);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Clear \u2192 all</button>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--surface);border:.5px solid var(--border);border-radius:8px;max-height:150px;overflow-y:auto">${chips}</div>
    <div style="font-size:11px;color:#888;margin-top:4px">Leave empty to include the whole section.</div>
  </div>`;
}
function toggleExamSection(sidStr){
  const sid=parseInt(sidStr);
  const d=STATE.dashExamDraft;
  d.sectionIds=d.sectionIds||[];
  const i=d.sectionIds.findIndex(x=>parseInt(x)===sid);
  if(i>=0){
    d.sectionIds.splice(i,1);
    if(d.unitsBySection)delete d.unitsBySection[sid];
  }else{
    d.sectionIds.push(sid);
  }
  render();
}
function toggleExamUnit(sectionId,uid){
  const d=STATE.dashExamDraft;
  d.unitsBySection=d.unitsBySection||{};
  const arr=d.unitsBySection[sectionId]||[];
  const i=arr.indexOf(uid);
  if(i>=0)arr.splice(i,1);else arr.push(uid);
  d.unitsBySection[sectionId]=arr.slice();
  render();
}
function clearExamUnits(sectionId){
  const d=STATE.dashExamDraft;
  d.unitsBySection=d.unitsBySection||{};
  d.unitsBySection[sectionId]=[];
  render();
}

// ── Ticket #9 exam re-shuffle (only while status === 'scheduled') ──────────
async function reshuffleExam(examId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const ex=(STATE.dashExams||[]).find(e=>e.id===examId);
  if(!ex){showToast('Exam not found.','error');return;}
  if(examWindowStatus(ex)!=='scheduled'){showToast('Only scheduled exams can be re-shuffled.','warning');return;}
  const ok=await showModal({icon:'\u{1F504}',title:'Re-shuffle Questions?',body:'This picks a fresh random set of '+ex.count+' questions from the same sections/units, keeping the same even split. Students haven\u2019t started yet, so this is safe.',type:'info',confirmText:'Re-shuffle',cancelText:'Cancel'});
  if(!ok)return;
  try{
    // Batch 11: same distribution logic as saveExam — legacy single-section
    // exams (no sectionIds array) fall back to their one sectionId/unitIds.
    const sectionIds=Array.isArray(ex.sectionIds)&&ex.sectionIds.length?ex.sectionIds:[ex.sectionId];
    const unitsBySection=ex.unitsBySection||(ex.unitIds?{[ex.sectionId]:ex.unitIds}:{});
    const result=await buildDistributedExamPool(sectionIds,unitsBySection,ex.count);
    if(!result.ok){showToast(result.message,'warning');return;}
    await db.collection('exams').doc(examId).update({questionIds:result.questionIds,reshuffledAt:new Date().toISOString()});
    showToast('Questions re-shuffled \u2705','success');
    await refreshDashScoped();
  }catch(e){console.warn('[reshuffleExam]',e);showToast('Error: '+e.message,'error');}
}

// ═══════════════════════════════════════════════════════════════════════════
//  STUDENTS TAB — all-groups roster with filter + search
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashStudentsFilter='';        // '' = All groups
STATE.dashStudentsSearch='';
STATE.dashStudentDetailUid=null;    // when set, opens profile view
STATE.dashStudentAttendanceUid=null;   // Batch 6: opens attendance history
STATE.dashStudentAttendanceRows=null;  // Batch 6: cached attendance rows
STATE.dashStudentAttendanceLoading=false;

function renderDashStudents(){
  if(STATE.dashStudentDetailUid)return renderDashStudentDetail();
  const all=STATE.dashStudents||[];
  const groups=(STATE.dashGroups||[]).slice().sort((a,b)=>(a.code||'').localeCompare(b.code||''));
  const f=(STATE.dashStudentsFilter||'').toUpperCase();
  const q=(STATE.dashStudentsSearch||'').trim().toLowerCase();
  let list=all.slice();
  if(f)list=list.filter(s=>(s.groupCode||'').toUpperCase()===f);
  if(q)list=list.filter(s=>{
    const hay=((s.name||'')+' '+(s.email||'')+' '+(s.mobile||'')+' '+(s.groupCode||'')).toLowerCase();
    return hay.includes(q);
  });
  list.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  const filterBtn=(v,l)=>{
    const on=(STATE.dashStudentsFilter||'')===v;
    return `<button onclick="STATE.dashStudentsFilter='${esc(v)}';render()" style="padding:6px 12px;border-radius:16px;border:1px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':'#fff'};color:${on?'#fff':'#555'};font-size:12px;font-weight:${on?'600':'500'};cursor:pointer;font-family:inherit;white-space:nowrap">${esc(l)}</button>`;
  };
  const filterChips='<div style="display:flex;gap:6px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none">'+
    filterBtn('','All ('+all.length+')')+
    groups.map(g=>{const n=all.filter(s=>(s.groupCode||'').toUpperCase()===g.code.toUpperCase()).length;return filterBtn(g.code,g.code+' ('+n+')');}).join('')+
    '</div>';
  if(!all.length){
    return `<div style="padding:14px">
      <div class="gs-empty">
        <div class="gs-empty-icon">\u{1F464}</div>
        <div class="gs-empty-title">No students yet</div>
        <div class="gs-empty-body">Once students register with a group code, they\u2019ll appear here.</div>
      </div></div>`;
  }
  const rows=list.map(s=>{
    const initials=(s.name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
    const avatar=s.photo?`<img src="${esc(s.photo)}" style="width:44px;height:44px;border-radius:50%;object-fit:cover;flex-shrink:0">`:`<div style="width:44px;height:44px;border-radius:50%;background:var(--brand-tint);color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;flex-shrink:0">${esc(initials)}</div>`;
    return `<div onclick="STATE.dashStudentDetailUid='${esc(s.uid)}';render()" style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px;cursor:pointer">
      ${avatar}
      <div style="min-width:0;flex:1">
        <div style="font-size:14px;font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.name||'Unnamed')}</div>
        <div style="font-size:11px;color:#888;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(s.groupCode||'\u2014 no group')} \u00B7 ${esc(s.email||s.mobile||'\u2014')}</div>
      </div>
      <span style="color:#bbb;font-size:20px">\u203A</span>
    </div>`;
  }).join('')||`<div style="text-align:center;padding:34px 20px;color:#888;font-size:13px">No students match your search.</div>`;
  return `<div style="padding:14px">
    <input type="text" placeholder="\u{1F50D} Search by name, email, mobile\u2026" value="${esc(STATE.dashStudentsSearch||'')}"
      oninput="STATE.dashStudentsSearch=this.value;render()"
      style="width:100%;padding:10px 12px;border-radius:10px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:var(--surface);box-sizing:border-box;margin-bottom:10px">
    ${filterChips}
    <div style="font-size:12px;font-weight:500;color:#888;letter-spacing:.5px;margin:6px 0 8px">STUDENTS (${list.length})</div>
    ${rows}
    <div style="height:30px"></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 11 — APPROVALS TAB (group join/switch requests)
// ═══════════════════════════════════════════════════════════════════════════
// Data model: group-requests/{id} = {uid,studentName,studentEmail,studentMobile,
//   groupCode,status:'pending'|'approved'|'rejected',requestedAt,resolvedAt,resolvedBy}
// Rules (add manually via Firebase Console — no firestore.rules file in project):
//   create: any signed-in user, doc.uid must equal auth.uid
//   read/update/delete: instructor only
STATE.dashApprovals={loaded:false,loading:false,rows:[]};

async function loadDashApprovals(){
  if(STATE.dashApprovals.loading)return;
  STATE.dashApprovals={loading:true,loaded:false,rows:STATE.dashApprovals.rows||[]};
  try{
    const snap=await db.collection('group-requests').where('status','==','pending').get();
    const rows=snap.docs.map(d=>({_docId:d.id,...d.data()}))
      .sort((a,b)=>(a.requestedAt||'').localeCompare(b.requestedAt||''));
    STATE.dashApprovals={loading:false,loaded:true,rows};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='approvals')render();
  }catch(e){
    console.warn('[loadDashApprovals] failed:',e);
    STATE.dashApprovals={loading:false,loaded:true,rows:[],error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='approvals')render();
  }
}

function renderDashApprovals(){
  const rows=(STATE.dashApprovals&&STATE.dashApprovals.rows)||[];
  if(!rows.length){
    return `<div style="padding:14px"><div class="gs-empty">
      <div class="gs-empty-icon">\u2705</div>
      <div class="gs-empty-title">No pending requests</div>
      <div class="gs-empty-body">When a student enters a new or different group code on their profile, their request to join shows up here for you to approve or reject.</div>
    </div></div>`;
  }
  const fmtDT=(iso)=>{if(!iso)return '';try{return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch{return iso;}};
  const cards=rows.map(r=>`<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:10px">
    <div style="font-size:14px;font-weight:600;color:var(--ink)">${esc(r.studentName||'Unnamed')}</div>
    <div style="font-size:11px;color:#888;margin-top:2px">${esc(r.studentEmail||r.studentMobile||'')}</div>
    <div style="font-size:12px;color:#555;margin-top:6px">Requesting group <b style="font-family:'Courier New',monospace">${esc(r.groupCode)}</b> \u00B7 ${fmtDT(r.requestedAt)}</div>
    <div style="display:flex;gap:8px;margin-top:10px">
      <button onclick="approveGroupRequest('${esc(r._docId)}')" style="flex:1;padding:9px;border-radius:8px;border:none;background:var(--ok-strong-2);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">\u2705 Approve</button>
      <button onclick="rejectGroupRequest('${esc(r._docId)}')" style="flex:1;padding:9px;border-radius:8px;border:.5px solid var(--err);background:var(--err-tint);color:var(--err-2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">\u2716 Reject</button>
    </div>
  </div>`).join('');
  return `<div style="padding:14px">
    <div style="font-size:12px;color:#888;margin-bottom:10px">${rows.length} pending request${rows.length===1?'':'s'}.</div>
    ${cards}
    <div style="height:30px"></div>
  </div>`;
}

async function approveGroupRequest(requestId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const req=(STATE.dashApprovals.rows||[]).find(r=>r._docId===requestId);
  if(!req)return;
  try{
    await db.collection('students').doc(req.uid).set({groupCode:req.groupCode,pendingGroupCode:''},{merge:true});
    await db.collection('group-requests').doc(requestId).update({status:'approved',resolvedAt:new Date().toISOString(),resolvedBy:STATE.user.uid});
    STATE.dashApprovals.rows=(STATE.dashApprovals.rows||[]).filter(r=>r._docId!==requestId);
    // Keep the roster's cached copy in sync so Students tab reflects it immediately.
    const idx=(STATE.dashStudents||[]).findIndex(s=>s.uid===req.uid);
    if(idx>=0){STATE.dashStudents[idx].groupCode=req.groupCode;STATE.dashStudents[idx].pendingGroupCode='';}
    showToast('\u2705 Approved — '+(req.studentName||'Student')+' is now in '+req.groupCode,'success');
    render();
  }catch(e){console.warn('[approveGroupRequest]',e);showToast('Error: '+e.message,'error');}
}

async function rejectGroupRequest(requestId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const req=(STATE.dashApprovals.rows||[]).find(r=>r._docId===requestId);
  if(!req)return;
  const ok=await showModal({icon:'\u2716',title:'Reject Request?',body:'This declines '+(req.studentName||'this student')+'\u2019s request to join '+req.groupCode+'. They\u2019ll see it was declined and can contact you or try a different code.',type:'warning',confirmText:'Reject',cancelText:'Cancel'});
  if(!ok)return;
  try{
    await db.collection('students').doc(req.uid).set({pendingGroupCode:''},{merge:true});
    // Kept as a record (status:'rejected'), not deleted — audit trail.
    await db.collection('group-requests').doc(requestId).update({status:'rejected',resolvedAt:new Date().toISOString(),resolvedBy:STATE.user.uid});
    STATE.dashApprovals.rows=(STATE.dashApprovals.rows||[]).filter(r=>r._docId!==requestId);
    const idx=(STATE.dashStudents||[]).findIndex(s=>s.uid===req.uid);
    if(idx>=0){STATE.dashStudents[idx].pendingGroupCode='';}
    showToast('Request rejected.','info');
    render();
  }catch(e){console.warn('[rejectGroupRequest]',e);showToast('Error: '+e.message,'error');}
}

// Batch 6 · Item G — Student Detail live re-fetch + full profile + G.5 notes.

// Fix: dashboard roster caches on first open (dashGroupsLoaded=true), so any
// profile fields the student completes AFTER cache-warm never appear here.
// We now re-fetch students/{uid} on detail open (one read per open — cheap)
// and merge over the cached row so the second open is instant.
// Batch 11: instructor-initiated removal from a group (confirm modal, then
// clears groupCode — student falls back to self-study until they re-join
// via a fresh request, which goes through approval again like any other).
async function removeStudentFromGroup(uid){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const s=(STATE.dashStudents||[]).find(x=>x.uid===uid);
  if(!s)return;
  const ok=await showModal({icon:'\u{1F6AA}',title:'Remove from Group?',body:'This removes '+(s.name||'this student')+' from group '+esc(s.groupCode)+'. They\u2019ll need a new request (approved by you) to rejoin any group.',type:'danger',confirmText:'Remove',cancelText:'Cancel'});
  if(!ok)return;
  try{
    await db.collection('students').doc(uid).set({groupCode:'',pendingGroupCode:''},{merge:true});
    s.groupCode='';s.pendingGroupCode='';
    showToast('Removed from group.','success');
    render();
  }catch(e){console.warn('[removeStudentFromGroup]',e);showToast('Error: '+e.message,'error');}
}

async function loadStudentDetailFresh(uid){

  if(!uid||!db) return;
  STATE.dashStudentDetailLoading=true;
  try{
    const [sdoc,ndoc]=await Promise.all([
      db.collection('students').doc(uid).get(),
      db.collection('instructor-notes').doc(uid).get()
    ]);
    if(sdoc.exists){
      const fresh=sdoc.data();
      const idx=(STATE.dashStudents||[]).findIndex(x=>x.uid===uid);
      if(idx>=0){
        STATE.dashStudents[idx]={...STATE.dashStudents[idx],...fresh,uid};
      }
    }
    STATE.dashInstructorNotes=STATE.dashInstructorNotes||{};
    STATE.dashInstructorNotes[uid]=ndoc.exists?(ndoc.data().text||''):'';
  }catch(e){ console.warn('[loadStudentDetailFresh] failed',e); }
  finally{
    STATE.dashStudentDetailLoading=false;
    STATE.dashStudentDetailLoadedFor=uid;
    if(STATE.dashStudentDetailUid===uid) render();
  }
}

async function saveInstructorNote(uid){
  const ta=document.getElementById('inst-note-'+uid);
  if(!ta) return;
  const text=String(ta.value||'').slice(0,4000);
  try{
    await db.collection('instructor-notes').doc(uid).set({text,updatedAt:new Date().toISOString(),by:STATE.user.uid});
    STATE.dashInstructorNotes=STATE.dashInstructorNotes||{};
    STATE.dashInstructorNotes[uid]=text;
    showToast('Note saved \u2713','success',1500);
  }catch(e){ showToast('Save failed: '+e.message,'error'); }
}

function renderDashStudentDetail(){
  // Batch 6: intercept for attendance history sub-view
  if(STATE.dashStudentAttendanceUid)return renderDashStudentAttendanceHistory();
  const uid=STATE.dashStudentDetailUid;
  const s=(STATE.dashStudents||[]).find(x=>x.uid===uid);
  if(!s){STATE.dashStudentDetailUid=null;return renderDashStudents();}
  // Trigger live re-fetch once per detail open. Guarded by _LoadedFor so a
  // re-render (typing in the note box) doesn't re-hit the network.
  if(STATE.dashStudentDetailLoadedFor!==uid && !STATE.dashStudentDetailLoading){
    setTimeout(()=>loadStudentDetailFresh(uid),0);
  }
  const initials=(s.name||'?').trim().split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase();
  const avatar=s.photo?`<img src="${esc(s.photo)}" style="width:96px;height:96px;border-radius:50%;object-fit:cover;border:3px solid var(--brand-tint)">`:`<div style="width:96px;height:96px;border-radius:50%;background:var(--brand-tint);color:var(--brand);display:flex;align-items:center;justify-content:center;font-size:32px;font-weight:700;border:3px solid var(--brand-tint)">${esc(initials)}</div>`;
  const field=(l,v)=>{if(v===undefined||v===null||v==='')return '';return `<div style="font-size:11px;color:var(--muted-2);margin-bottom:2px">${esc(l)}</div><div style="font-size:14px;color:var(--ink);font-weight:500;margin-bottom:12px;word-break:break-word">${esc(v)}</div>`;};
  const examdate=s.examdate?(function(){try{const d=new Date(s.examdate+'-01');return d.toLocaleDateString('en-GB',{month:'long',year:'numeric'});}catch{return s.examdate;}})():'';
  const registered=s.registeredAt?(function(){try{return new Date(s.registeredAt).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'});}catch{return '';}})():'';
  // ── Section-empty detection: hide a card completely when EVERY field is empty
  const contactVals=[s.email,s.mobile,s.country,s.city];
  const eduVals=[s.university,s.faculty,s.gradyear,s.title,s.company,s.experience];
  const cmaVals=[s.level,s.goal,examdate,s.preferredLang,s.attemptType,s.timezone];
  const anyContact=contactVals.some(v=>v);
  const anyEdu=eduVals.some(v=>v);
  const anyCma=cmaVals.some(v=>v);
  const loading=STATE.dashStudentDetailLoading && STATE.dashStudentDetailLoadedFor!==uid;
  const loadingBadge=loading?`<div style="font-size:11px;color:var(--muted-2);text-align:center;margin-bottom:10px">\u21BB Loading latest\u2026</div>`:'';
  const noteText=(STATE.dashInstructorNotes&&STATE.dashInstructorNotes[uid])||'';
  return `<div style="padding:14px">
    <button onclick="STATE.dashStudentDetailUid=null;STATE.dashStudentDetailLoadedFor=null;render()" style="background:none;border:none;color:var(--brand);font-size:14px;cursor:pointer;font-family:inherit;padding:0 0 12px;font-weight:500">\u2039 Back to students</button>
    <div style="background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:16px;padding:22px;text-align:center;color:#fff;margin-bottom:16px">
      <div style="display:flex;justify-content:center;margin-bottom:12px">${avatar}</div>
      <div style="font-size:18px;font-weight:600;margin-bottom:4px">${esc(s.name||'Unnamed')}</div>
      <div style="font-size:12px;opacity:.85">${esc(s.groupCode||'\u2014 no group')}${s.country?' \u00B7 '+esc(s.country):''}</div>
    </div>
    ${loadingBadge}
    ${anyContact?`<div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--brand);margin-bottom:10px;letter-spacing:.5px">CONTACT</div>
      ${field('Email',s.email)}
      ${field('Mobile',s.mobile)}
      ${field('Country',s.country)}
      ${field('City',s.city)}
    </div>`:''}
    ${anyEdu?`<div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--brand);margin-bottom:10px;letter-spacing:.5px">EDUCATION & CAREER</div>
      ${field('University',s.university)}
      ${field('Faculty',s.faculty)}
      ${field('Graduation Year',s.gradyear)}
      ${field('Job Title',s.title)}
      ${field('Company',s.company)}
      ${field('Years of Experience',s.experience)}
    </div>`:''}
    ${anyCma?`<div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="font-size:12px;font-weight:600;color:var(--brand);margin-bottom:10px;letter-spacing:.5px">CMA STUDY PROFILE</div>
      ${field('Accounting/Finance Level',s.level)}
      ${field('CMA Goal',s.goal)}
      ${field('Target Exam Date',examdate)}
      ${field('Preferred Language',s.preferredLang)}
      ${field('Attempt Type',s.attemptType)}
      ${field('Timezone',s.timezone)}
    </div>`:''}
    ${(!anyContact&&!anyEdu&&!anyCma&&!loading)?`<div style="background:var(--warn-tint);border:1px solid var(--warn);border-radius:12px;padding:14px;margin-bottom:12px;font-size:13px;color:var(--warn-strong);line-height:1.5">\u26A0\uFE0F This student hasn't completed their profile yet. Only the basic account info is available.</div>`:''}
    <!-- Batch 6 · G.5 — private instructor notes (visible only to instructor per rules) -->
    <div style="background:var(--card);border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:12px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <div style="font-size:12px;font-weight:600;color:var(--accent-purple-strong);letter-spacing:.5px">\u{1F512} PRIVATE NOTES · INSTRUCTOR ONLY</div>
      </div>
      <textarea id="inst-note-${esc(uid)}" placeholder="Coaching notes about this student — not visible to them. E.g. 'Needs extra help with Section 4', 'Prefers video over reading'\u2026" style="width:100%;min-height:88px;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:var(--accent-purple-tint);color:var(--ink);resize:vertical;line-height:1.5;box-sizing:border-box">${esc(noteText)}</textarea>
      <button onclick="saveInstructorNote('${esc(uid)}')" style="margin-top:8px;padding:8px 16px;border-radius:8px;border:none;background:var(--accent-purple-strong);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Save note</button>
    </div>
    <button onclick="openStudentAttendanceHistory('${esc(s.uid)}')" style="width:100%;padding:12px;border-radius:10px;border:.5px solid var(--brand-2);background:var(--brand-tint);color:var(--brand);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:12px">\u{1F4C5} View attendance history</button>
    ${s.groupCode?`<button onclick="removeStudentFromGroup('${esc(s.uid)}')" style="width:100%;padding:12px;border-radius:10px;border:.5px solid var(--err);background:var(--err-tint);color:var(--err-2);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;margin-bottom:12px">\u{1F6AA} Remove from group</button>`:''}
    ${registered?`<div style="text-align:center;font-size:11px;color:var(--muted-2);margin-bottom:8px">Registered ${esc(registered)}</div>`:''}
    <div style="height:30px"></div>
  </div>`;
}

// ══ Batch 6: Student attendance history — chronological per-student timeline ══
// Query: attendance where userId==X. Cross-references STATE.dashLectures to
// determine present/absent for each lecture in the student's group.
// No composite index needed — single-field query.

function openStudentAttendanceHistory(uid){
  STATE.dashStudentAttendanceUid=uid;
  STATE.dashStudentAttendanceLoading=true;
  STATE.dashStudentAttendanceRows=null;
  render();
  loadStudentAttendanceHistory(uid).then(rows=>{
    STATE.dashStudentAttendanceRows=rows;
    STATE.dashStudentAttendanceLoading=false;
    if(STATE.tab==='dashboard'&&STATE.dashStudentAttendanceUid===uid)render();
  }).catch(e=>{
    console.warn('[AttendanceHistory] load failed',e);
    STATE.dashStudentAttendanceRows=[];
    STATE.dashStudentAttendanceLoading=false;
    if(STATE.tab==='dashboard'&&STATE.dashStudentAttendanceUid===uid)render();
  });
}
function closeStudentAttendanceHistory(){
  STATE.dashStudentAttendanceUid=null;
  STATE.dashStudentAttendanceRows=null;
  STATE.dashStudentAttendanceLoading=false;
  render();
}
async function loadStudentAttendanceHistory(uid){
  const snap=await db.collection('attendance').where('userId','==',uid).get();
  return snap.docs.map(d=>({id:d.id,...d.data()}));
}

function renderDashStudentAttendanceHistory(){
  const uid=STATE.dashStudentAttendanceUid;
  const s=(STATE.dashStudents||[]).find(x=>x.uid===uid);
  if(!s){STATE.dashStudentAttendanceUid=null;return renderDashStudents();}
  const loading=STATE.dashStudentAttendanceLoading;
  const rows=STATE.dashStudentAttendanceRows||[];
  const groupLectures=(STATE.dashLectures||[]).filter(l=>(l.groupCode||'').toUpperCase()===(s.groupCode||'').toUpperCase());
  const lecturesSorted=groupLectures.slice().sort((a,b)=>{
    const da=a.date||a.createdAt||'';
    const db2=b.date||b.createdAt||'';
    return db2.localeCompare(da);
  });
  const attMap={};
  rows.forEach(r=>{if(r.lectureId)attMap[r.lectureId]=r;});
  const present=Object.keys(attMap).filter(lid=>groupLectures.find(l=>l.id===lid)).length;
  const total=groupLectures.length;
  const attRate=total?Math.round((present/total)*100):0;
  const rateColor=attRate>=80?'var(--ok-2)':(attRate>=50?'var(--warn)':'var(--err-2)');

  const fmtDate=(iso)=>{
    if(!iso)return '—';
    try{
      return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'});
    }catch{return iso;}
  };

  const rowsHTML=lecturesSorted.length?lecturesSorted.map(l=>{
    const att=attMap[l.id];
    const isPresent=!!att;
    const mode=att?(att.mode||'—'):'';
    const modeIcon=mode==='online'?'🌐':(mode==='offline'?'🏫':'');
    return `<div style="display:flex;align-items:center;gap:12px;padding:10px 12px;background:#fff;border:.5px solid var(--border);border-radius:10px;margin-bottom:6px">
      <div style="width:38px;height:38px;border-radius:50%;background:${isPresent?'var(--ok-tint-2)':'var(--err-tint)'};display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${isPresent?'✅':'❌'}</div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:600;color:var(--ink);line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(l.title||'(untitled)')}</div>
        <div style="font-size:11px;color:#888;margin-top:2px">${fmtDate(l.date||l.createdAt)}${mode?' · '+modeIcon+' '+esc(mode):''}</div>
      </div>
      <div style="font-size:11px;font-weight:600;color:${isPresent?'var(--ok-2)':'var(--err-2)'};flex-shrink:0">${isPresent?'Present':'Absent'}</div>
    </div>`;
  }).join(''):`<div style="text-align:center;padding:32px 20px;color:#888">
    <div style="font-size:36px;margin-bottom:10px">📅</div>
    <div style="font-size:13px">No lectures found for this group yet.</div>
  </div>`;

  const loadingHTML=loading?`<div style="text-align:center;padding:20px;color:#888"><div style="font-size:24px;margin-bottom:6px">⏳</div><div style="font-size:12px">Loading attendance history…</div></div>`:'';

  return `<div style="padding:14px">
    <button onclick="closeStudentAttendanceHistory()" style="background:none;border:none;color:var(--brand);font-size:14px;cursor:pointer;font-family:inherit;padding:0 0 12px;font-weight:500">‹ Back to student</button>
    <div style="background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:14px;padding:18px;color:#fff;margin-bottom:14px">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;opacity:.85;margin-bottom:4px">ATTENDANCE HISTORY</div>
      <div style="font-size:17px;font-weight:600;line-height:1.35;margin-bottom:2px">${esc(s.name||'Unnamed')}</div>
      <div style="font-size:12px;opacity:.85">${esc(s.groupCode||'—')} · ${total} lecture${total===1?'':'s'} in this group</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:14px">
      <div style="background:#fff;border:.5px solid var(--border);border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:var(--ok-2)">${present}</div><div style="font-size:10px;color:#888;margin-top:2px">PRESENT</div></div>
      <div style="background:#fff;border:.5px solid var(--border);border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:var(--err-2)">${total-present}</div><div style="font-size:10px;color:#888;margin-top:2px">ABSENT</div></div>
      <div style="background:#fff;border:.5px solid var(--border);border-radius:10px;padding:12px;text-align:center"><div style="font-size:22px;font-weight:700;color:${rateColor}">${attRate}%</div><div style="font-size:10px;color:#888;margin-top:2px">RATE</div></div>
    </div>
    ${loadingHTML}
    ${rowsHTML}
    <div style="height:40px"></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  Batch 6 · Item F — ATTENDANCE MATRIX VIEW
//  Rows = students, Columns = lectures (chronological). Cell shows mode
//  (online / offline / absent). Sticky left column + top row. Row & column
//  summaries. Uses the same STATE.dashAttendanceByLecture cache as the list
//  view — zero new Firestore reads.
// ═══════════════════════════════════════════════════════════════════════════
function setAttendanceView(v){
  STATE.dashAttendanceView=v;
  try{ localStorage.setItem('cma-attendance-view', v); }catch{}
  render();
}
// Batch 7: prime attendance view from localStorage on dashboard boot.
function _primeAttendanceView(){
  if(STATE.dashAttendanceView) return;
  try{ STATE.dashAttendanceView = localStorage.getItem('cma-attendance-view') || 'list'; }
  catch{ STATE.dashAttendanceView = 'list'; }
}

function renderDashAttendanceMatrix(groupCode, lectures, students){
  const lecturesSorted=lectures.slice().sort((a,b)=>{
    const da=a.date||a.createdAt||''; const dbb=b.date||b.createdAt||'';
    return String(da).localeCompare(String(dbb));
  });
  let missing=0;
  lecturesSorted.forEach(l=>{
    if(!STATE.dashAttendanceByLecture[l.id]){
      missing++;
      loadLectureAttendance(l.id).then(()=>{if(STATE.tab==='dashboard'&&STATE.dashTab==='attendance')render();}).catch(()=>{});
    }
  });
  if(missing>0){
    return `<div style="text-align:center;padding:34px 20px;color:var(--muted-2)"><div style="font-size:26px;margin-bottom:8px">\u23F3</div><div style="font-size:13px">Loading attendance for ${missing} lecture${missing===1?'':'s'}\u2026</div></div>`;
  }
  const att={};
  lecturesSorted.forEach(l=>{
    (STATE.dashAttendanceByLecture[l.id]||[]).forEach(a=>{
      if(!a.userId) return;
      if(!att[a.userId]) att[a.userId]={};
      att[a.userId][l.id]=a.mode||'present';
    });
  });
  const studentsSorted=students.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  if(!studentsSorted.length){
    return `<div style="text-align:center;padding:34px 20px;color:var(--muted-2)"><div style="font-size:36px;margin-bottom:8px">\u{1F464}</div><div style="font-size:13px">No students in group ${esc(groupCode)}.</div></div>`;
  }
  const rowSummary={}, colSummary={};
  studentsSorted.forEach(s=>{
    let attended=0;
    lecturesSorted.forEach(l=>{
      if(att[s.uid] && att[s.uid][l.id]) attended++;
    });
    rowSummary[s.uid]={attended,total:lecturesSorted.length,pct:lecturesSorted.length?Math.round(attended/lecturesSorted.length*100):0};
  });
  lecturesSorted.forEach(l=>{
    const rows=(STATE.dashAttendanceByLecture[l.id]||[]);
    const on=rows.filter(a=>a.mode==='online').length;
    const off=rows.filter(a=>a.mode==='offline').length;
    const attended=rows.length;
    const totalStu=studentsSorted.length;
    colSummary[l.id]={on,off,attended,absent:Math.max(0,totalStu-attended),pct:totalStu?Math.round(attended/totalStu*100):0};
  });
  const fmtDate=(iso)=>{ if(!iso) return '\u2014'; try{ return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}); }catch{return '\u2014';}};
  const cellFor=(s,l)=>{
    const mode=(att[s.uid]||{})[l.id];
    if(mode==='online')   return `<div title="Online" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--ok-tint-2);color:var(--ok-2);font-weight:700;font-size:11px">O</div>`;
    if(mode==='offline')  return `<div title="In-person" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--warn-tint);color:var(--warn-strong);font-weight:700;font-size:11px">F</div>`;
    if(mode)              return `<div title="Present" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--brand-tint);color:var(--brand);font-weight:700;font-size:11px">\u2713</div>`;
    return `<div title="Absent" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--err-tint);color:var(--err-2);font-weight:700;font-size:11px">\u2013</div>`;
  };
  const headerCells=lecturesSorted.map(l=>{
    const dt=fmtDate(l.date||l.createdAt);
    return `<th style="min-width:56px;max-width:56px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);line-height:1.2;position:sticky;top:0;z-index:2" title="${esc(l.title||'')} - ${esc(dt)}">${esc(dt)}</th>`;
  }).join('');
  const headerRow=`<thead><tr>
    <th style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:11px;color:var(--ink-2);text-align:left;position:sticky;left:0;top:0;z-index:3">Student</th>
    ${headerCells}
    <th style="min-width:70px;max-width:70px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);position:sticky;top:0;z-index:2">Rate</th>
  </tr></thead>`;
  const bodyRows=studentsSorted.map(s=>{
    const cells=lecturesSorted.map(l=>{
      return `<td style="min-width:56px;max-width:56px;height:34px;padding:0;border:1px solid var(--border);background:var(--card)">${cellFor(s,l)}</td>`;
    }).join('');
    const sum=rowSummary[s.uid];
    const rateColor=sum.pct>=80?'var(--ok-2)':(sum.pct>=50?'var(--warn-strong)':'var(--err-2)');
    return `<tr>
      <td onclick="STATE.dashStudentDetailUid='${esc(s.uid)}';render()" style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--card);border:1px solid var(--border);font-size:12px;color:var(--ink);text-align:left;position:sticky;left:0;z-index:1;cursor:pointer;font-weight:500;white-space:normal;word-break:break-word;line-height:1.3" title="${esc(s.name||'')}">${esc(s.name||'Unnamed')}</td>
      ${cells}
      <td style="min-width:70px;max-width:70px;padding:4px;border:1px solid var(--border);background:var(--card);text-align:center"><div style="font-size:12px;font-weight:700;color:${rateColor}">${sum.pct}%</div><div style="font-size:9px;color:var(--muted-2);margin-top:1px">${sum.attended}/${sum.total}</div></td>
    </tr>`;
  }).join('');
  const footerCells=lecturesSorted.map(l=>{
    const c=colSummary[l.id];
    const col=c.pct>=80?'var(--ok-2)':(c.pct>=50?'var(--warn-strong)':'var(--err-2)');
    return `<td style="min-width:56px;max-width:56px;padding:4px;border:1px solid var(--border);background:var(--surface-3);text-align:center"><div style="font-size:11px;font-weight:700;color:${col}">${c.pct}%</div><div style="font-size:9px;color:var(--muted-2);margin-top:1px">${c.attended}/${studentsSorted.length}</div></td>`;
  }).join('');
  const footerRow=`<tfoot><tr>
    <td style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);font-size:11px;font-weight:600;color:var(--ink-2);text-align:left;position:sticky;left:0;z-index:1">Lecture rate</td>
    ${footerCells}
    <td style="background:var(--surface-3);border:1px solid var(--border)"></td>
  </tr></tfoot>`;
  return `<div>
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:10px">
      <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:11px;color:var(--muted)">
        <span><span style="display:inline-block;width:14px;height:14px;background:var(--ok-tint-2);color:var(--ok-2);text-align:center;line-height:14px;font-weight:700;font-size:10px;border-radius:3px;vertical-align:middle">O</span> Online</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:var(--warn-tint);color:var(--warn-strong);text-align:center;line-height:14px;font-weight:700;font-size:10px;border-radius:3px;vertical-align:middle">F</span> In-person</span>
        <span><span style="display:inline-block;width:14px;height:14px;background:var(--err-tint);color:var(--err-2);text-align:center;line-height:14px;font-weight:700;font-size:10px;border-radius:3px;vertical-align:middle">\u2013</span> Absent</span>
      </div>
      <button onclick="exportAttendanceMatrixCSV('${esc(groupCode)}')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--border);background:var(--card);color:var(--ink);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F4E5} Export CSV</button>
    </div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;max-height:70vh;border-radius:10px;border:1px solid var(--border);background:var(--card)">
      <table style="border-collapse:collapse;font-family:inherit;width:auto">
        ${headerRow}
        <tbody>${bodyRows}</tbody>
        ${footerRow}
      </table>
    </div>
    <div style="font-size:11px;color:var(--muted-2);margin-top:8px;line-height:1.4">Tap a student name to open their profile. Cells show mode: <b>O</b>nline, o<b>F</b>fline (in-person), or absent.</div>
  </div>`;
}

function exportAttendanceMatrixCSV(groupCode){
  try{
    const lectures=(STATE.dashLectures||[]).slice().sort((a,b)=>{
      const da=a.date||a.createdAt||''; const dbb=b.date||b.createdAt||'';
      return String(da).localeCompare(String(dbb));
    });
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===String(groupCode).toUpperCase())
      .slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const att={};
    lectures.forEach(l=>{
      (STATE.dashAttendanceByLecture[l.id]||[]).forEach(a=>{
        if(!a.userId) return;
        if(!att[a.userId]) att[a.userId]={};
        att[a.userId][l.id]=a.mode||'present';
      });
    });
    const csvEsc=(s)=>{ s=String(s==null?'':s); return /[,"\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
    const fmtDate=(iso)=>{ try{ return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }catch{return '';} };
    const headers=['Student','Mobile','Email'].concat(lectures.map(l=>fmtDate(l.date||l.createdAt)+' - '+(l.title||''))).concat(['Attended','Total','Rate %']);
    const rows=[headers.map(csvEsc).join(',')];
    students.forEach(s=>{
      let attended=0;
      const cells=lectures.map(l=>{
        const mode=(att[s.uid]||{})[l.id];
        if(mode) attended++;
        return mode||'absent';
      });
      const pct=lectures.length?Math.round(attended/lectures.length*100):0;
      const row=[s.name||'',s.mobile||'',s.email||''].concat(cells).concat([attended,lectures.length,pct]);
      rows.push(row.map(csvEsc).join(','));
    });
    const csv='\uFEFF'+rows.join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const stamp=new Date().toISOString().slice(0,10);
    a.href=url; a.download=`attendance-${groupCode}-${stamp}.csv`;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 100);
    showToast('CSV downloaded','success',1500);
  }catch(e){ showToast('Export failed: '+e.message,'error'); }
}

// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 11 — FEEDBACK MATRIX (one row per student, one column per lecture)
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashFeedbackByGroup={};   // {groupCode: {loaded,loading,rows:[lecture-feedback docs]}}

async function loadGroupFeedback(groupCode){
  const cache=STATE.dashFeedbackByGroup[groupCode];
  if(cache&&(cache.loaded||cache.loading))return;
  STATE.dashFeedbackByGroup[groupCode]={loading:true,loaded:false,rows:[]};
  try{
    const snap=await db.collection('lecture-feedback').where('groupCode','==',groupCode).get();
    STATE.dashFeedbackByGroup[groupCode]={loading:false,loaded:true,rows:snap.docs.map(d=>d.data())};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='attendance')render();
  }catch(e){
    console.warn('[loadGroupFeedback] failed:',e);
    STATE.dashFeedbackByGroup[groupCode]={loading:false,loaded:true,rows:[],error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='attendance')render();
  }
}

function renderDashFeedbackMatrix(groupCode,lectures,students){
  const cache=STATE.dashFeedbackByGroup[groupCode];
  if(!cache||!cache.loaded){
    loadGroupFeedback(groupCode);
    return `<div style="text-align:center;padding:34px 20px;color:var(--muted-2)"><div style="font-size:26px;margin-bottom:8px">\u23F3</div><div style="font-size:13px">Loading feedback\u2026</div></div>`;
  }
  const lecturesSorted=lectures.slice().sort((a,b)=>{
    const da=a.date||a.createdAt||''; const dbb=b.date||b.createdAt||'';
    return String(da).localeCompare(String(dbb));
  });
  const studentsSorted=students.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  if(!studentsSorted.length){
    return `<div style="text-align:center;padding:34px 20px;color:var(--muted-2)"><div style="font-size:36px;margin-bottom:8px">\u{1F464}</div><div style="font-size:13px">No students in group ${esc(groupCode)}.</div></div>`;
  }
  // fb[userId][lectureId] = {rating,comment}
  const fb={};
  (cache.rows||[]).forEach(r=>{
    if(!r.userId)return;
    if(!fb[r.userId])fb[r.userId]={};
    fb[r.userId][r.lectureId]={rating:r.rating||0,comment:r.comment||''};
  });
  const rowSummary={}, colSummary={};
  studentsSorted.forEach(s=>{
    let sum=0,n=0;
    lecturesSorted.forEach(l=>{
      const r=(fb[s.uid]||{})[l.id];
      if(r){sum+=r.rating;n++;}
    });
    rowSummary[s.uid]={avg:n?Math.round(sum/n*10)/10:0,n,total:lecturesSorted.length};
  });
  lecturesSorted.forEach(l=>{
    let sum=0,n=0;
    studentsSorted.forEach(s=>{
      const r=(fb[s.uid]||{})[l.id];
      if(r){sum+=r.rating;n++;}
    });
    colSummary[l.id]={avg:n?Math.round(sum/n*10)/10:0,n,rate:studentsSorted.length?Math.round(n/studentsSorted.length*100):0};
  });
  const fmtDate=(iso)=>{ if(!iso) return '\u2014'; try{ return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short'}); }catch{return '\u2014';}};
  const cellFor=(s,l)=>{
    const r=(fb[s.uid]||{})[l.id];
    if(!r)return `<div title="No feedback" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted-2);font-size:12px">\u2013</div>`;
    const tip=r.comment?esc(r.comment):'No comment';
    return `<div title="${tip}" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:var(--warn-tint);color:var(--warn-strong);font-weight:700;font-size:11px">${r.rating}\u2605</div>`;
  };
  const headerCells=lecturesSorted.map(l=>{
    const dt=fmtDate(l.date||l.createdAt);
    return `<th style="min-width:56px;max-width:56px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);line-height:1.2;position:sticky;top:0;z-index:2" title="${esc(l.title||'')} - ${esc(dt)}">${esc(dt)}</th>`;
  }).join('');
  const headerRow=`<thead><tr>
    <th style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:11px;color:var(--ink-2);text-align:left;position:sticky;left:0;top:0;z-index:3">Student</th>
    ${headerCells}
    <th style="min-width:70px;max-width:70px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);position:sticky;top:0;z-index:2">Avg</th>
  </tr></thead>`;
  const bodyRows=studentsSorted.map(s=>{
    const cells=lecturesSorted.map(l=>`<td style="min-width:56px;max-width:56px;height:34px;padding:0;border:1px solid var(--border);background:var(--card)">${cellFor(s,l)}</td>`).join('');
    const sum=rowSummary[s.uid];
    const rateColor=sum.avg>=4?'var(--ok-2)':(sum.avg>=3?'var(--warn-strong)':'var(--err-2)');
    return `<tr>
      <td onclick="STATE.dashStudentDetailUid='${esc(s.uid)}';render()" style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--card);border:1px solid var(--border);font-size:12px;color:var(--ink);text-align:left;position:sticky;left:0;z-index:1;cursor:pointer;font-weight:500;white-space:normal;word-break:break-word;line-height:1.3" title="${esc(s.name||'')}">${esc(s.name||'Unnamed')}</td>
      ${cells}
      <td style="min-width:70px;max-width:70px;padding:4px;border:1px solid var(--border);background:var(--card);text-align:center"><div style="font-size:12px;font-weight:700;color:${sum.n?rateColor:'var(--muted-2)'}">${sum.n?sum.avg+'\u2605':'\u2014'}</div><div style="font-size:9px;color:var(--muted-2);margin-top:1px">${sum.n}/${sum.total}</div></td>
    </tr>`;
  }).join('');
  const footerCells=lecturesSorted.map(l=>{
    const c=colSummary[l.id];
    const col=c.avg>=4?'var(--ok-2)':(c.avg>=3?'var(--warn-strong)':'var(--err-2)');
    return `<td style="min-width:56px;max-width:56px;padding:4px;border:1px solid var(--border);background:var(--surface-3);text-align:center"><div style="font-size:11px;font-weight:700;color:${c.n?col:'var(--muted-2)'}">${c.n?c.avg+'\u2605':'\u2014'}</div><div style="font-size:9px;color:var(--muted-2);margin-top:1px">${c.rate}%</div></td>`;
  }).join('');
  const footerRow=`<tfoot><tr>
    <td style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);font-size:11px;font-weight:600;color:var(--ink-2);text-align:left;position:sticky;left:0;z-index:1">Lecture avg</td>
    ${footerCells}
    <td style="background:var(--surface-3);border:1px solid var(--border)"></td>
  </tr></tfoot>`;
  return `<div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      <button onclick="exportFeedbackMatrixCSV('${esc(groupCode)}')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--border);background:var(--card);color:var(--ink);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F4E5} Export CSV</button>
    </div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;max-height:70vh;border-radius:10px;border:1px solid var(--border);background:var(--card)">
      <table style="border-collapse:collapse;font-family:inherit;width:auto">
        ${headerRow}
        <tbody>${bodyRows}</tbody>
        ${footerRow}
      </table>
    </div>
    <div style="font-size:11px;color:var(--muted-2);margin-top:8px;line-height:1.4">Tap a student name to open their profile. Hover a cell to see the comment, if any.</div>
  </div>`;
}

function exportFeedbackMatrixCSV(groupCode){
  try{
    const cache=STATE.dashFeedbackByGroup[groupCode];
    const lectures=(STATE.dashLectures||[]).slice().sort((a,b)=>{
      const da=a.date||a.createdAt||''; const dbb=b.date||b.createdAt||'';
      return String(da).localeCompare(String(dbb));
    });
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===String(groupCode).toUpperCase())
      .slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const fb={};
    (cache&&cache.rows||[]).forEach(r=>{
      if(!r.userId)return;
      if(!fb[r.userId])fb[r.userId]={};
      fb[r.userId][r.lectureId]={rating:r.rating||0,comment:r.comment||''};
    });
    const csvEsc=(s)=>{ s=String(s==null?'':s); return /[,"\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
    const fmtDate=(iso)=>{ try{ return new Date(iso).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'}); }catch{return '';} };
    const headers=['Student','Mobile','Email'].concat(lectures.map(l=>fmtDate(l.date||l.createdAt)+' - '+(l.title||''))).concat(['Avg Rating','Responses','Total']);
    const rows=[headers.map(csvEsc).join(',')];
    students.forEach(s=>{
      let sum=0,n=0;
      const cells=lectures.map(l=>{
        const r=(fb[s.uid]||{})[l.id];
        if(r){sum+=r.rating;n++;return r.rating;}
        return '';
      });
      const avg=n?Math.round(sum/n*10)/10:'';
      const row=[s.name||'',s.mobile||'',s.email||''].concat(cells).concat([avg,n,lectures.length]);
      rows.push(row.map(csvEsc).join(','));
    });
    const csv='\uFEFF'+rows.join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const stamp=new Date().toISOString().slice(0,10);
    a.href=url; a.download=`feedback-${groupCode}-${stamp}.csv`;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 100);
    showToast('CSV downloaded','success',1500);
  }catch(e){ showToast('Export failed: '+e.message,'error'); }
}

// ═══════════════════════════════════════════════════════════════════════════
//  ATTENDANCE TAB — per-lecture summary with online/offline/absent counts
// ═══════════════════════════════════════════════════════════════════════════
function renderDashAttendance(){

  const g=STATE.dashSelectedGroup;
  const lectures=(STATE.dashLectures||[]).slice();
  const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===g.toUpperCase());
  const total=students.length;
  // Batch 7: ensure view mode is primed (may be null on first dashboard open)
  _primeAttendanceView();
  const activeView=STATE.dashAttendanceView||'list';
  // Batch 7/11: segmented toggle — List / Attendance Matrix / Feedback Matrix
  const viewToggle=`<div class="att-view-toggle">
    <button class="att-view-btn${activeView==='list'?' active':''}" onclick="setAttendanceView('list')">\u{1F4CB} List View</button>
    <button class="att-view-btn${activeView==='matrix'?' active':''}" onclick="setAttendanceView('matrix')">\u{1F4CA} Attendance Matrix</button>
    <button class="att-view-btn${activeView==='feedback'?' active':''}" onclick="setAttendanceView('feedback')">\u2B50 Feedback Matrix</button>
  </div>`;
  if(!lectures.length){
    return `<div style="padding:14px">${viewToggle}${renderDashTabEmpty('Attendance',g,{icon:'\u2705',body:'No lectures yet for this group. Create a lecture first, then attendance summaries will appear here.'})}</div>`;
  }
  // Batch 7: Matrix view — render heatmap + CSV export button
  if(activeView==='matrix'){
    const csvBtn=`<div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      <button onclick="exportAttendanceMatrixCSV('${g}')" style="padding:8px 14px;border-radius:8px;border:.5px solid var(--brand-2)40;background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u2B07 Export CSV</button>
    </div>`;
    return `<div style="padding:14px">
      ${viewToggle}
      <div style="font-size:12px;color:var(--muted-2);margin-bottom:12px">Group has <b>${total}</b> student${total===1?'':'s'} \u00B7 ${lectures.length} lecture${lectures.length===1?'':'s'}</div>
      ${csvBtn}
      ${renderDashAttendanceMatrix(g,lectures,students)}
      <div style="height:30px"></div>
    </div>`;
  }
  // Batch 11: Feedback Matrix view — one row per student, one column per lecture.
  if(activeView==='feedback'){
    return `<div style="padding:14px">
      ${viewToggle}
      <div style="font-size:12px;color:var(--muted-2);margin-bottom:12px">Group has <b>${total}</b> student${total===1?'':'s'} \u00B7 ${lectures.length} lecture${lectures.length===1?'':'s'}</div>
      ${renderDashFeedbackMatrix(g,lectures,students)}
      <div style="height:30px"></div>
    </div>`;
  }
  const rows=lectures.map(l=>{
    const cached=STATE.dashAttendanceByLecture[l.id];
    if(!cached){
      // Lazy load — trigger fetch and render skeleton row
      loadLectureAttendance(l.id).then(()=>{if(STATE.tab==='dashboard'&&STATE.dashTab==='attendance')render();}).catch(()=>{});
      const dt=l.date?new Date(l.date).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';
      return `<div class="gs-skeleton-card"><div class="gs-skeleton-line long"></div><div class="gs-skeleton-line medium"></div><div class="gs-skeleton-line short"></div></div>`;
    }
    const on=cached.filter(a=>a.mode==='online').length;
    const off=cached.filter(a=>a.mode==='offline').length;
    const unk=cached.length-on-off;
    const absent=Math.max(0,total-cached.length);
    const dt=l.date?new Date(l.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';
    return `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:10px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;margin-bottom:8px">
        <div style="min-width:0"><div style="font-size:14px;font-weight:600;color:var(--ink)">${esc(l.title)}</div>
          <div style="font-size:11px;color:#888;margin-top:2px">${esc(dt)}</div></div>
      </div>
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:8px">
        <div style="background:#EBF3FA;border-radius:8px;padding:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--brand)">${cached.length}</div><div style="font-size:9px;font-weight:600;color:var(--brand);letter-spacing:.5px;text-transform:uppercase">Total</div></div>
        <div style="background:#E8F5E9;border-radius:8px;padding:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--ok-2)">${on}</div><div style="font-size:9px;font-weight:600;color:var(--ok-2);letter-spacing:.5px;text-transform:uppercase">Online</div></div>
        <div style="background:#FEF5E7;border-radius:8px;padding:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:#7D6608">${off}</div><div style="font-size:9px;font-weight:600;color:#7D6608;letter-spacing:.5px;text-transform:uppercase">In-person</div></div>
        <div style="background:var(--err-tint);border-radius:8px;padding:8px;text-align:center"><div style="font-size:18px;font-weight:700;color:var(--err-2)">${absent}</div><div style="font-size:9px;font-weight:600;color:var(--err-2);letter-spacing:.5px;text-transform:uppercase">Absent</div></div>
      </div>
      ${unk?`<div style="font-size:11px;color:#888;margin-top:4px">${unk} legacy record${unk===1?'':'s'} with no mode.</div>`:''}
      <div style="display:flex;gap:6px;margin-top:10px">
        <button onclick="openAttendanceList('${l.id}')" style="flex:1;padding:8px;border-radius:8px;border:.5px solid var(--brand-2)40;background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F465} View details</button>
        <button onclick="openLectureFeedback('${l.id}')" style="flex:1;padding:8px;border-radius:8px;border:.5px solid #7D3C9840;background:var(--accent-purple-tint);color:var(--accent-purple-strong);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u2B50 Feedback</button>
        ${_lectureFeedbackToggleBtn(l)}
      </div>
    </div>`;
  }).join('');
  return `<div style="padding:14px">
    ${viewToggle}
    <div style="font-size:12px;color:var(--muted-2);margin-bottom:12px">Group has <b>${total}</b> student${total===1?'':'s'} \u00B7 attendance auto-refreshes when you open a lecture</div>
    ${rows}
    <div style="height:30px"></div>
  </div>`;
}
// Batch 7: end renderDashAttendance

// Feedback open/close toggle button per lecture (in Attendance tab)
function _lectureFeedbackToggleBtn(lec){
  const p=STATE.dashLive[lec.groupCode];
  const isPointer=p&&p.lectureId===lec.id;
  // Batch 11: default state is now COMPUTED (isFeedbackOpen — 7 days from
  // checkinClosedAt). The button still lets the instructor override early
  // (force-close during the auto window, or force-open before it) via the
  // existing live/{groupCode}.feedbackOpen flag while this lecture is current.
  const auto=isFeedbackOpen(lec);
  const manualOverride=isPointer&&p.feedbackOpen!=null?p.feedbackOpen:null;
  const on=manualOverride!=null?manualOverride:auto;
  return `<button onclick="toggleLectureFeedback('${lec.id}','${lec.groupCode}')" style="padding:8px 10px;border-radius:8px;border:.5px solid ${on?'#C0392B40':'#1E844940'};background:${on?'var(--err-tint)':'var(--ok-tint-2)'};color:${on?'var(--err-2)':'var(--ok-2)'};font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;flex:1">${on?'\u{1F6D1} Close Feedback':'\u25B6 Open Feedback'}</button>`;
}

async function toggleLectureFeedback(lectureId,groupCode){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const lec=(STATE.dashLectures||[]).find(l=>l.id===lectureId);
  if(!lec)return;
  const p=STATE.dashLive[groupCode]||{};
  const wasOn=p.lectureId===lectureId&&!!p.feedbackOpen;
  try{
    // Point live doc at this lecture (if not already) and flip feedbackOpen.
    const _now=new Date();
    const nextPointer={
      lectureId,
      title:lec.title,
      openedAt:p.openedAt||_now.toISOString(),
      autoCloseAt:p.autoCloseAt||new Date(_now.getTime()+LIVE_AUTOCLOSE_MS).toISOString(),
      // Preserve checkinOpen semantics via existing lectureId pointer
      feedbackOpen:!wasOn
    };
    await db.collection('live').doc(groupCode).set(nextPointer,{merge:true});
    STATE.dashLive[groupCode]=nextPointer;
    showToast(wasOn?'Feedback closed for '+lec.title:'Feedback open for '+lec.title,'success');
    render();
  }catch(e){console.warn('[feedback toggle]',e);showToast('Error: '+e.message,'error');}
}

// Load & display feedback for a lecture (instructor view)
async function openLectureFeedback(lectureId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const lec=(STATE.dashLectures||[]).find(l=>l.id===lectureId);
  try{
    const snap=await db.collection('lecture-feedback').where('lectureId','==',lectureId).get();
    const rows=snap.docs.map(d=>d.data()).sort((a,b)=>(b.submittedAt||'').localeCompare(a.submittedAt||''));
    if(!rows.length){showModal({icon:'\u2B50',title:(lec?lec.title:'Lecture')+' \u2014 Feedback',body:'No feedback submitted yet.',type:'info',confirmText:'Close'});return;}
    const avg=Math.round((rows.reduce((s,r)=>s+(r.rating||0),0)/rows.length)*10)/10;
    const list=rows.map(r=>{
      const stars='\u2605'.repeat(r.rating||0)+'\u2606'.repeat(5-(r.rating||0));
      const dt=r.submittedAt?new Date(r.submittedAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'}):'';
      const c=r.comment?' \u2014 "'+r.comment+'"':'';
      return esc(r.studentName||'Student')+'  '+stars+c+(dt?'  ('+dt+')':'');
    });
    showModal({icon:'\u2B50',title:(lec?lec.title:'Lecture')+' \u2014 '+rows.length+' feedback (avg '+avg+'\u2B50)',list,type:'info',confirmText:'Close'});
  }catch(e){console.warn('[openLectureFeedback]',e);showToast('Error: '+e.message,'error');}
}

// ═══════════════════════════════════════════════════════════════════════════
//  RESULTS TAB — all exam results for the group, expandable per exam
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashResultsExpanded={};

// Batch 11: Per-exam / Matrix view toggle, same pattern as Attendance tab.
STATE.dashResultsView=null;
function setResultsView(v){
  STATE.dashResultsView=v;
  try{ localStorage.setItem('cma-results-view', v); }catch{}
  render();
}
function _primeResultsView(){
  if(STATE.dashResultsView) return;
  try{ STATE.dashResultsView = localStorage.getItem('cma-results-view') || 'list'; }
  catch{ STATE.dashResultsView = 'list'; }
}
function renderDashResults(){
  const exams=(STATE.dashExams||[]).slice();
  if(!exams.length){
    return `<div style="padding:14px">${renderDashTabEmpty('Results',STATE.dashSelectedGroup,{icon:'\u{1F4CA}',body:'No exams yet for this group. Create one from the Exams tab.'})}</div>`;
  }
  _primeResultsView();
  const activeView=STATE.dashResultsView||'list';
  const viewToggle=`<div class="att-view-toggle">
    <button class="att-view-btn${activeView==='list'?' active':''}" onclick="setResultsView('list')">\u{1F4CB} Per-Exam View</button>
    <button class="att-view-btn${activeView==='matrix'?' active':''}" onclick="setResultsView('matrix')">\u{1F4CA} Matrix View</button>
  </div>`;
  if(activeView==='matrix'){
    const g=STATE.dashSelectedGroup;
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===String(g).toUpperCase());
    return `<div style="padding:14px">
      ${viewToggle}
      <div style="font-size:12px;color:var(--muted-2);margin-bottom:12px">Group has <b>${students.length}</b> student${students.length===1?'':'s'} \u00B7 ${exams.length} exam${exams.length===1?'':'s'}</div>
      ${renderDashResultsMatrix(g,exams,students)}
      <div style="height:30px"></div>
    </div>`;
  }
  const closed=exams.filter(x=>examWindowStatus(x)==='closed');
  const active=exams.filter(x=>examWindowStatus(x)==='active');
  const scheduled=exams.filter(x=>examWindowStatus(x)==='scheduled');
  const order=[...closed,...active,...scheduled];
  const rows=order.map(x=>renderResultsCard(x)).join('');
  return `<div style="padding:14px">
    ${viewToggle}
    <div style="font-size:12px;color:#888;margin:10px 0">Tap any exam to expand per-student breakdown.</div>
    ${rows}
    <div style="height:30px"></div>
  </div>`;
}

// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 11 — RESULTS MATRIX (one row per student, one column per exam)
// ═══════════════════════════════════════════════════════════════════════════
function renderDashResultsMatrix(groupCode,exams,students){
  let missing=0;
  exams.forEach(x=>{
    const cache=STATE.dashExamResults[x.id];
    if(!cache||!cache.loaded){
      missing++;
      loadExamResults(x.id).then(()=>{if(STATE.tab==='dashboard'&&STATE.dashTab==='results')render();}).catch(()=>{});
    }
  });
  if(missing>0){
    return `<div style="text-align:center;padding:34px 20px;color:var(--muted-2)"><div style="font-size:26px;margin-bottom:8px">\u23F3</div><div style="font-size:13px">Loading results for ${missing} exam${missing===1?'':'s'}\u2026</div></div>`;
  }
  const examsSorted=exams.slice().sort((a,b)=>(a.opensAt||'').localeCompare(b.opensAt||''));
  const studentsSorted=students.slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
  if(!studentsSorted.length){
    return `<div style="text-align:center;padding:34px 20px;color:var(--muted-2)"><div style="font-size:36px;margin-bottom:8px">\u{1F464}</div><div style="font-size:13px">No students in group ${esc(groupCode)}.</div></div>`;
  }
  // res[userId][examId] = percentage
  const res={};
  examsSorted.forEach(x=>{
    const cache=STATE.dashExamResults[x.id];
    (cache&&cache.results||[]).forEach(r=>{
      if(!r.userId||!r.submitted)return;
      if(!res[r.userId])res[r.userId]={};
      res[r.userId][x.id]=r.percentage||0;
    });
  });
  const rowSummary={};
  studentsSorted.forEach(s=>{
    let sum=0,n=0;
    examsSorted.forEach(x=>{
      const p=(res[s.uid]||{})[x.id];
      if(p!=null){sum+=p;n++;}
    });
    rowSummary[s.uid]={avg:n?Math.round(sum/n):0,n,total:examsSorted.length};
  });
  const colSummary={};
  examsSorted.forEach(x=>{
    let sum=0,n=0;
    studentsSorted.forEach(s=>{
      const p=(res[s.uid]||{})[x.id];
      if(p!=null){sum+=p;n++;}
    });
    colSummary[x.id]={avg:n?Math.round(sum/n):0,n,rate:studentsSorted.length?Math.round(n/studentsSorted.length*100):0};
  });
  const pctColor=(p)=>p>=80?'var(--ok-2)':(p>=60?'var(--warn-strong)':'var(--err-2)');
  const pctBg=(p)=>p>=80?'var(--ok-tint-2)':(p>=60?'#FEF5E7':'var(--err-tint)');
  const cellFor=(s,x)=>{
    const p=(res[s.uid]||{})[x.id];
    if(p==null)return `<div title="Not taken" style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--muted-2);font-size:12px">\u2013</div>`;
    return `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:${pctBg(p)};color:${pctColor(p)};font-weight:700;font-size:11px">${p}%</div>`;
  };
  const headerCells=examsSorted.map(x=>`<th style="min-width:64px;max-width:64px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);line-height:1.2;position:sticky;top:0;z-index:2" title="${esc(x.title||'')}">${esc((x.title||'').length>10?(x.title||'').slice(0,9)+'\u2026':(x.title||''))}</th>`).join('');
  const headerRow=`<thead><tr>
    <th style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:11px;color:var(--ink-2);text-align:left;position:sticky;left:0;top:0;z-index:3">Student</th>
    ${headerCells}
    <th style="min-width:80px;max-width:80px;padding:6px 4px;background:var(--surface-3);border:1px solid var(--border);font-weight:600;font-size:10px;color:var(--ink-2);position:sticky;top:0;z-index:2">Avg</th>
  </tr></thead>`;
  const bodyRows=studentsSorted.map(s=>{
    const cells=examsSorted.map(x=>`<td style="min-width:64px;max-width:64px;height:34px;padding:0;border:1px solid var(--border);background:var(--card)">${cellFor(s,x)}</td>`).join('');
    const sum=rowSummary[s.uid];
    return `<tr>
      <td onclick="STATE.dashStudentDetailUid='${esc(s.uid)}';render()" style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--card);border:1px solid var(--border);font-size:12px;color:var(--ink);text-align:left;position:sticky;left:0;z-index:1;cursor:pointer;font-weight:500;white-space:normal;word-break:break-word;line-height:1.3" title="${esc(s.name||'')}">${esc(s.name||'Unnamed')}</td>
      ${cells}
      <td style="min-width:80px;max-width:80px;padding:4px;border:1px solid var(--border);background:var(--card);text-align:center"><div style="font-size:12px;font-weight:700;color:${sum.n?pctColor(sum.avg):'var(--muted-2)'}">${sum.n?sum.avg+'%':'\u2014'}</div><div style="font-size:9px;color:var(--muted-2);margin-top:1px">${sum.n}/${sum.total}</div></td>
    </tr>`;
  }).join('');
  const footerCells=examsSorted.map(x=>{
    const c=colSummary[x.id];
    return `<td style="min-width:64px;max-width:64px;padding:4px;border:1px solid var(--border);background:var(--surface-3);text-align:center"><div style="font-size:11px;font-weight:700;color:${c.n?pctColor(c.avg):'var(--muted-2)'}">${c.n?c.avg+'%':'\u2014'}</div><div style="font-size:9px;color:var(--muted-2);margin-top:1px">${c.rate}%</div></td>`;
  }).join('');
  const footerRow=`<tfoot><tr>
    <td style="min-width:150px;max-width:170px;padding:8px 10px;background:var(--surface-3);border:1px solid var(--border);font-size:11px;font-weight:600;color:var(--ink-2);text-align:left;position:sticky;left:0;z-index:1">Exam avg</td>
    ${footerCells}
    <td style="background:var(--surface-3);border:1px solid var(--border)"></td>
  </tr></tfoot>`;
  return `<div>
    <div style="display:flex;justify-content:flex-end;margin-bottom:10px">
      <button onclick="exportResultsMatrixCSV('${esc(groupCode)}')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--border);background:var(--card);color:var(--ink);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F4E5} Export CSV</button>
    </div>
    <div style="overflow-x:auto;-webkit-overflow-scrolling:touch;max-height:70vh;border-radius:10px;border:1px solid var(--border);background:var(--card)">
      <table style="border-collapse:collapse;font-family:inherit;width:auto">
        ${headerRow}
        <tbody>${bodyRows}</tbody>
        ${footerRow}
      </table>
    </div>
    <div style="font-size:11px;color:var(--muted-2);margin-top:8px;line-height:1.4">Tap a student name to open their profile. Color bands: green \u226580%, amber \u226560%, red below.</div>
  </div>`;
}

function exportResultsMatrixCSV(groupCode){
  try{
    const exams=(STATE.dashExams||[]).slice().sort((a,b)=>(a.opensAt||'').localeCompare(b.opensAt||''));
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===String(groupCode).toUpperCase())
      .slice().sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    const res={};
    exams.forEach(x=>{
      const cache=STATE.dashExamResults[x.id];
      (cache&&cache.results||[]).forEach(r=>{
        if(!r.userId||!r.submitted)return;
        if(!res[r.userId])res[r.userId]={};
        res[r.userId][x.id]=r.percentage||0;
      });
    });
    const csvEsc=(s)=>{ s=String(s==null?'':s); return /[,"\n]/.test(s) ? '"'+s.replace(/"/g,'""')+'"' : s; };
    const headers=['Student','Mobile','Email'].concat(exams.map(x=>x.title||'')).concat(['Avg %','Exams Taken','Total Exams']);
    const rows=[headers.map(csvEsc).join(',')];
    students.forEach(s=>{
      let sum=0,n=0;
      const cells=exams.map(x=>{
        const p=(res[s.uid]||{})[x.id];
        if(p!=null){sum+=p;n++;return p;}
        return '';
      });
      const avg=n?Math.round(sum/n):'';
      const row=[s.name||'',s.mobile||'',s.email||''].concat(cells).concat([avg,n,exams.length]);
      rows.push(row.map(csvEsc).join(','));
    });
    const csv='\uFEFF'+rows.join('\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    const stamp=new Date().toISOString().slice(0,10);
    a.href=url; a.download=`results-${groupCode}-${stamp}.csv`;
    document.body.appendChild(a); a.click();
    setTimeout(()=>{ URL.revokeObjectURL(url); a.remove(); }, 100);
    showToast('CSV downloaded','success',1500);
  }catch(e){ showToast('Export failed: '+e.message,'error'); }
}

function renderResultsCard(exam){

  const expanded=!!STATE.dashResultsExpanded[exam.id];
  const cache=STATE.dashExamResults[exam.id];
  const status=examWindowStatus(exam);
  const badgeStyle={active:'background:var(--ok-tint-2);color:var(--ok-2)',scheduled:'background:var(--warn-tint-2);color:#9A7D0A',closed:'background:#EAECEE;color:#566573'};
  const badgeLabel={active:'\u{1F7E2} ACTIVE',scheduled:'\u23F3 SCHEDULED',closed:'\u26AB CLOSED'};
  if(expanded&&(!cache||!cache.loaded)){
    loadExamResults(exam.id).then(()=>{if(STATE.tab==='dashboard'&&STATE.dashTab==='results')render();}).catch(()=>{});
  }
  const stats=(cache&&cache.stats)?cache.stats:null;
  const summary=stats?`<div style="font-size:12px;color:#555;margin-top:4px;line-height:1.6">Submitted: <b>${stats.submitted}</b> \u00B7 Avg <b>${stats.avgPct}%</b> \u00B7 Pass rate <b>${stats.passRate}%</b> \u00B7 High <b>${stats.highest}%</b>, Low <b>${stats.lowest}%</b></div>`:'<div style="font-size:12px;color:#888;margin-top:4px">Tap to load results.</div>';
  const arrow=expanded?'\u25BE':'\u25B8';
  let bodyRows='';
  if(expanded){
    if(!cache||cache.loading){bodyRows='<div style="text-align:center;padding:20px;color:#888">Loading\u2026</div>';}
    else if(!cache.results||!cache.results.length){bodyRows='<div style="text-align:center;padding:20px;color:#888;font-size:13px">No students have started this exam.</div>';}
    else{
      const sorted=cache.results.slice().sort((a,b)=>(b.percentage||0)-(a.percentage||0));
      bodyRows=sorted.map(r=>{
        const pct=r.percentage||0;
        const color=pct>=80?'var(--ok-2)':pct>=60?'#7D6608':'var(--err-2)';
        const bg=pct>=80?'var(--ok-tint-2)':pct>=60?'#FEF5E7':'var(--err-tint)';
        const submittedFlag=r.submitted?'\u2705':'\u23F3 in progress';
        return `<div onclick="openInstructorReview('${exam.id}','${esc(r.userId||'')}')" style="background:#fff;border:.5px solid var(--border);border-radius:10px;padding:10px 12px;margin-top:6px;display:flex;align-items:center;gap:10px;cursor:pointer">
          <div style="min-width:0;flex:1"><div style="font-size:13px;font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.studentName||'Student')}</div>
          <div style="font-size:11px;color:#888;margin-top:2px">${submittedFlag} \u00B7 ${r.score||0}/${r.total||0}</div></div>
          <div style="background:${bg};color:${color};padding:5px 12px;border-radius:14px;font-size:13px;font-weight:700;flex-shrink:0">${pct}%</div>
          ${r.submitted?'<div style="flex-shrink:0;font-size:11px;font-weight:600;color:var(--brand);white-space:nowrap;padding-left:2px">Review \u203A</div>':''}
        </div>`;
      }).join('');
    }
  }
  return `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:10px">
    <div onclick="toggleResultsExpand('${exam.id}')" style="cursor:pointer">
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">
        <span style="font-size:16px;color:#888">${arrow}</span>
        <span style="font-size:10px;font-weight:700;padding:2px 9px;border-radius:10px;${badgeStyle[status]}">${badgeLabel[status]}</span>
      </div>
      <div style="font-size:14px;font-weight:600;color:var(--ink)">${esc(exam.title)}</div>
      ${summary}
    </div>
    ${bodyRows?'<div style="padding-top:10px;margin-top:8px;border-top:.5px solid var(--border)">'+bodyRows+'</div>':''}
  </div>`;
}
function toggleResultsExpand(examId){
  STATE.dashResultsExpanded[examId]=!STATE.dashResultsExpanded[examId];
  render();
}

// ═══════════════════════════════════════════════════════════════════════════
//  PROGRESS TAB — per-student progress across the group
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashProgressByGroup={}; // {groupCode: {loaded, loading, rows}}

function renderDashProgress(){
  const g=STATE.dashSelectedGroup;
  const cache=STATE.dashProgressByGroup[g];
  if(!cache||!cache.loaded){
    if(!cache||!cache.loading){loadDashProgress(g);}
    return `<div style="padding:14px">${renderDashSkeleton()}</div>`;
  }
  const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===g.toUpperCase());
  if(!students.length){return `<div style="padding:14px">${renderDashTabEmpty('Progress',g,{icon:'\u{1F4C8}',body:'No students in this group yet.'})}</div>`;}
  const rows=cache.rows.slice().sort((a,b)=>(b.acc||0)-(a.acc||0)).map(r=>{
    const pct=r.acc||0;
    const color=pct>=80?'var(--ok-2)':pct>=60?'#7D6608':'var(--err-2)';
    return `<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:12px 14px;margin-bottom:8px">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px">
        <div style="font-size:13px;font-weight:600;color:var(--ink);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name||'Student')}</div>
        <div style="font-size:12px;font-weight:700;color:${color};flex-shrink:0">${pct}%</div>
      </div>
      <div style="font-size:11px;color:#888;line-height:1.6">
        Lessons: <b>${r.lessons||0}</b> \u00B7 MCQs: <b>${r.mcqRight||0}/${r.mcqTotal||0}</b>${r.lastSeen?' \u00B7 Last seen <b>'+esc(r.lastSeen)+'</b>':''}
      </div>
    </div>`;
  }).join('')||`<div style="text-align:center;padding:30px 20px;color:#888;font-size:13px">No progress records yet for this group.</div>`;
  return `<div style="padding:14px">
    <div style="font-size:12px;color:#888;margin-bottom:12px">${cache.rows.length} of ${students.length} students have progress data</div>
    ${rows}
    <div style="height:30px"></div>
  </div>`;
}

async function loadDashProgress(g){
  STATE.dashProgressByGroup[g]={loading:true,loaded:false,rows:[]};
  render();
  try{
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===g.toUpperCase());
    // Fetch progress docs one-by-one (allow-owner-or-instructor rule requires doc-by-doc reads)
    const rows=await Promise.all(students.map(async s=>{
      try{
        const doc=await db.collection('progress').doc(s.uid).get();
        if(!doc.exists)return null;
        const p=doc.data()||{};
        const mcqRight=p.mcqRight||0,mcqTotal=p.mcqTotal||0;
        const acc=mcqTotal>0?Math.round((mcqRight/mcqTotal)*100):0;
        const lessonsDone=p.lessonsDone?Object.keys(p.lessonsDone).length:0;
        return {uid:s.uid,name:s.name||'Student',acc,mcqRight,mcqTotal,lessons:lessonsDone,lastSeen:p.lastSeen||''};
      }catch(e){return null;}
    }));
    STATE.dashProgressByGroup[g]={loading:false,loaded:true,rows:rows.filter(Boolean)};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='progress')render();
  }catch(e){
    console.warn('[loadDashProgress]',e);
    STATE.dashProgressByGroup[g]={loading:false,loaded:true,rows:[],error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='progress')render();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  LEADER TAB — group leaderboard
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashLeaderByGroup={}; // {groupCode: {loaded, loading, rows}}

function renderDashLeader(){
  const g=STATE.dashSelectedGroup;
  const cache=STATE.dashLeaderByGroup[g];
  if(!cache||!cache.loaded){
    if(!cache||!cache.loading){loadDashLeader(g);}
    return `<div style="padding:14px">${renderDashSkeleton()}</div>`;
  }
  const rows=cache.rows;
  if(!rows.length){return `<div style="padding:14px">${renderDashTabEmpty('Leader',g,{icon:'\u{1F3C5}',body:'No leaderboard entries for this group yet. Students need to complete quizzes for a ranking to appear.'})}</div>`;}
  const medals=['\u{1F947}','\u{1F948}','\u{1F949}'];
  const items=rows.map((r,i)=>{
    const medal=i<3?medals[i]:('#'+(i+1));
    const pct=r.accuracy||0;
    return `<div style="background:#fff;border:.5px solid ${i<3?'#F5B04140':'var(--border)'};border-radius:12px;padding:12px 14px;margin-bottom:8px;display:flex;align-items:center;gap:12px">
      <div style="font-size:${i<3?'22px':'14px'};font-weight:700;color:var(--brand);min-width:34px;text-align:center">${medal}</div>
      <div style="min-width:0;flex:1">
        <div style="font-size:14px;font-weight:600;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.name||'Student')}</div>
        <div style="font-size:11px;color:#888;margin-top:2px">${r.lessons||0} lessons \u00B7 ${r.mcqRight||0}/${r.mcqTotal||0} MCQs</div>
      </div>
      <div style="background:var(--brand-tint);color:var(--brand);padding:5px 12px;border-radius:14px;font-size:13px;font-weight:700;flex-shrink:0">${pct}%</div>
    </div>`;
  }).join('');
  return `<div style="padding:14px">
    <div style="font-size:12px;color:#888;margin-bottom:10px">Top ${rows.length} of ${g} \u2014 by accuracy</div>
    ${items}
    <div style="height:30px"></div>
  </div>`;
}

async function loadDashLeader(g){
  STATE.dashLeaderByGroup[g]={loading:true,loaded:false,rows:[]};
  render();
  try{
    const students=(STATE.dashStudents||[]).filter(s=>(s.groupCode||'').toUpperCase()===g.toUpperCase());
    const rows=await Promise.all(students.map(async s=>{
      try{
        const doc=await db.collection('leaderboard').doc(s.uid).get();
        if(!doc.exists)return null;
        const p=doc.data()||{};
        return {uid:s.uid,name:p.name||s.name||'Student',accuracy:p.accuracy||0,lessons:p.lessons||0,mcqRight:p.mcqRight||0,mcqTotal:p.mcqTotal||0};
      }catch(e){return null;}
    }));
    const filtered=rows.filter(Boolean).sort((a,b)=>{
      if((b.accuracy||0)!==(a.accuracy||0))return (b.accuracy||0)-(a.accuracy||0);
      return (b.mcqRight||0)-(a.mcqRight||0);
    }).slice(0,50);
    STATE.dashLeaderByGroup[g]={loading:false,loaded:true,rows:filtered};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='leader')render();
  }catch(e){
    console.warn('[loadDashLeader]',e);
    STATE.dashLeaderByGroup[g]={loading:false,loaded:true,rows:[],error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='leader')render();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
//  PLAN TAB — weekly plan CRUD (one active per group; publish auto-archives)
// ═══════════════════════════════════════════════════════════════════════════
STATE.dashPlanByGroup={};   // {groupCode: {loaded, loading, active, history}}
STATE.dashPlanDraft={weekLabel:'',sectionId:'',unitIds:[],note:''};

function renderDashPlan(){
  const g=STATE.dashSelectedGroup;
  const cache=STATE.dashPlanByGroup[g];
  if(!cache||!cache.loaded){
    if(!cache||!cache.loading)loadDashPlan(g);
    return `<div style="padding:14px">${renderDashSkeleton()}</div>`;
  }
  const active=cache.active;
  const history=cache.history||[];
  const d=STATE.dashPlanDraft;
  const secOpts=S.map(s=>`<option value="${s.id}" ${String(d.sectionId)===String(s.id)?'selected':''}>Sec ${s.id} \u2014 ${esc(s.title)}</option>`).join('');
  const secId=d.sectionId?parseInt(d.sectionId):0;
  const sec=secId?S.find(s=>s.id===secId):null;
  const selected=new Set((d.unitIds||[]).map(String));
  const unitChips=sec?sec.lessons.map((l,idx)=>{
    const on=selected.has(String(l.id));
    return `<button type="button" onclick="togglePlanUnit('${l.id}')" style="padding:6px 10px;border-radius:14px;border:1px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':'#fff'};color:${on?'#fff':'#555'};font-size:11px;font-weight:${on?'600':'500'};cursor:pointer;font-family:inherit;white-space:nowrap">U${idx+1}: ${esc(l.title.length>28?l.title.slice(0,26)+'\u2026':l.title)}</button>`;
  }).join(''):'<div style="font-size:11px;color:#aaa;padding:8px">Pick a section to select units.</div>';
  const activeCard=active?`
    <div style="background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:14px;padding:16px;margin-bottom:14px;color:#fff">
      <div style="font-size:10px;font-weight:700;letter-spacing:1px;opacity:.85;margin-bottom:6px">\u{1F5D3}\uFE0F CURRENT ACTIVE PLAN</div>
      <div style="font-size:16px;font-weight:600;margin-bottom:4px">${esc(active.weekLabel||'This Week')}</div>
      <div style="font-size:12px;opacity:.85;margin-bottom:8px">Section ${active.sectionId} \u00B7 ${(active.unitIds||[]).length||'All'} units</div>
      ${active.note?`<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:9px 12px;font-size:12px;line-height:1.5;margin-bottom:10px">${esc(active.note)}</div>`:''}
      <button onclick="archivePlan('${active.id}')" style="padding:7px 14px;border-radius:8px;border:1px solid rgba(255,255,255,.4);background:rgba(255,255,255,.12);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F5C4}\uFE0F Archive</button>
    </div>`:'';
  const historyList=history.length?`<div style="font-size:12px;font-weight:500;color:#888;letter-spacing:.5px;margin:14px 0 8px">HISTORY (${history.length})</div>${history.map(h=>{
    const dt=h.publishedAt?new Date(h.publishedAt).toLocaleDateString('en-GB',{day:'numeric',month:'short'}):'';
    return `<div style="background:var(--surface);border:.5px solid var(--border);border-radius:10px;padding:10px 12px;margin-bottom:6px;font-size:12px;color:#555">
      <div style="font-weight:600;color:var(--ink)">${esc(h.weekLabel||'Week')}</div>
      <div style="font-size:11px;color:#888;margin-top:2px">Sec ${h.sectionId} \u00B7 ${(h.unitIds||[]).length||'All'} units \u00B7 ${esc(dt)}</div>
    </div>`;
  }).join('')}`:'';
  return `<div style="padding:14px">
    ${activeCard}
    <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">\u2795 ${active?'Publish New Plan':'Create Weekly Plan'}</div>
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px">
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Week label *</label>
        <input type="text" value="${esc(d.weekLabel||'')}"
          oninput="STATE.dashPlanDraft.weekLabel=this.value"
          placeholder="e.g. Week 5 \u2014 Cost Behavior"
          style="width:100%;padding:9px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface);box-sizing:border-box">
      </div>
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Section *</label>
        <select onchange="onPlanSectionChange(this.value)"
          style="width:100%;padding:9px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;background:#fff;color:var(--ink);box-sizing:border-box">
          <option value="">Select...</option>${secOpts}
        </select>
      </div>
      <div style="margin-bottom:10px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
          <label style="font-size:11px;color:#888">Units <span style="font-weight:600;color:var(--brand)">${d.unitIds&&d.unitIds.length?d.unitIds.length+' selected':'All'}</span></label>
          <button type="button" onclick="STATE.dashPlanDraft.unitIds=[];render()" style="background:none;border:none;color:var(--brand);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Clear</button>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:6px;padding:8px;background:var(--surface);border:.5px solid var(--border);border-radius:8px;max-height:150px;overflow-y:auto">${unitChips}</div>
      </div>
      <div style="margin-bottom:14px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Note (optional)</label>
        <textarea rows="3" oninput="STATE.dashPlanDraft.note=this.value" placeholder="e.g. Focus on cost drivers this week. Solve chapters 2 & 3 MCQs before Friday."
          style="width:100%;padding:9px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface);box-sizing:border-box;resize:vertical">${esc(d.note||'')}</textarea>
      </div>
      <button onclick="publishPlan()" style="width:100%;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">
        \u{1F4E4} ${active?'Publish (archives current)':'Publish Plan'}
      </button>
    </div>
    ${historyList}
    <div style="height:30px"></div>
  </div>`;
}

function onPlanSectionChange(v){
  STATE.dashPlanDraft.sectionId=v;
  STATE.dashPlanDraft.unitIds=[];
  render();
}
function togglePlanUnit(uid){
  const arr=STATE.dashPlanDraft.unitIds||[];
  const i=arr.indexOf(uid);
  if(i>=0)arr.splice(i,1);else arr.push(uid);
  STATE.dashPlanDraft.unitIds=arr.slice();
  render();
}

async function loadDashPlan(g){
  STATE.dashPlanByGroup[g]={loading:true,loaded:false,active:null,history:[]};
  render();
  try{
    const snap=await db.collection('weekly-plans').where('groupCode','==',g).get();
    const rows=snap.docs.map(d=>({id:d.id,...d.data()}));
    const active=rows.filter(r=>r.active).sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''))[0]||null;
    const history=rows.filter(r=>!r.active).sort((a,b)=>(b.publishedAt||'').localeCompare(a.publishedAt||''));
    STATE.dashPlanByGroup[g]={loading:false,loaded:true,active,history};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='plan')render();
  }catch(e){
    console.warn('[loadDashPlan]',e);
    STATE.dashPlanByGroup[g]={loading:false,loaded:true,active:null,history:[],error:e.message};
    if(STATE.tab==='dashboard'&&STATE.dashTab==='plan')render();
  }
}

async function publishPlan(){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const g=STATE.dashSelectedGroup;
  const d=STATE.dashPlanDraft;
  if(!g){showToast('Pick a group first.','warning');return;}
  if(!d.weekLabel||!d.weekLabel.trim()){showToast('Add a week label.','warning');return;}
  if(!d.sectionId){showToast('Pick a section.','warning');return;}
  try{
    const cache=STATE.dashPlanByGroup[g]||{active:null};
    // Atomic: archive previous active + create new active
    const batch=db.batch();
    if(cache.active&&cache.active.id){
      batch.update(db.collection('weekly-plans').doc(cache.active.id),{active:false,archivedAt:new Date().toISOString()});
    }
    const newRef=db.collection('weekly-plans').doc();
    batch.set(newRef,{
      groupCode:g,
      weekLabel:d.weekLabel.trim(),
      sectionId:parseInt(d.sectionId),
      unitIds:(d.unitIds||[]).map(String).filter(Boolean),
      note:(d.note||'').trim().slice(0,1000),
      active:true,
      publishedAt:new Date().toISOString(),
      publishedBy:STATE.user.uid
    });
    await batch.commit();
    showToast('Plan published \u2705','success');
    STATE.dashPlanDraft={weekLabel:'',sectionId:'',unitIds:[],note:''};
    STATE.dashPlanByGroup[g]={loading:false,loaded:false,active:null,history:[]};
    loadDashPlan(g);
  }catch(e){console.warn('[publishPlan]',e);showToast('Error: '+e.message,'error');}
}

async function archivePlan(planId){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const ok=await showModal({icon:'\u{1F5C4}\uFE0F',title:'Archive Plan?',body:'Students will no longer see this plan at the top of their Study tab.',type:'warning',confirmText:'Archive',cancelText:'Cancel'});
  if(!ok)return;
  try{
    await db.collection('weekly-plans').doc(planId).update({active:false,archivedAt:new Date().toISOString()});
    const g=STATE.dashSelectedGroup;
    if(g){STATE.dashPlanByGroup[g]={loading:false,loaded:false,active:null,history:[]};loadDashPlan(g);}
    showToast('Plan archived.','info');
  }catch(e){console.warn('[archivePlan]',e);showToast('Error: '+e.message,'error');}
}

// ═══════════════════════════════════════════════════════════════════════════
//  STUDENT-SIDE — Weekly Plan surface at the top of Study tab
// ═══════════════════════════════════════════════════════════════════════════
STATE.studentActivePlan=null;
STATE.studentPlanLoaded=false;

async function ensureStudentPlan(){
  if(STATE.studentPlanLoaded)return;
  STATE.studentPlanLoaded=true;
  const st=loadStudent();
  const g=st&&st.groupCode?st.groupCode.toUpperCase():'';
  if(!g||!db||!STATE.user)return;
  try{
    const snap=await db.collection('weekly-plans').where('groupCode','==',g).where('active','==',true).limit(1).get();
    if(!snap.empty){STATE.studentActivePlan={id:snap.docs[0].id,...snap.docs[0].data()};if(STATE.tab==='study')render();}
  }catch(e){console.warn('[ensureStudentPlan]',e);}
}

function renderStudentActivePlanBanner(){
  const p=STATE.studentActivePlan;
  if(!p)return '';
  const sec=S.find(s=>s.id===Number(p.sectionId));
  const _ut=unitTitles(p.sectionId,p.unitIds,{max:2}); // Batch 8
  const units=(p.unitIds||[]).length?(_ut?esc(_ut):(p.unitIds.length+' unit'+(p.unitIds.length===1?'':'s'))):'All units';
  return `<div style="background:linear-gradient(135deg,#7D3C98,var(--accent-purple-strong));border-radius:14px;padding:14px 16px;margin:0 0 14px;color:#fff">
    <div style="font-size:10px;font-weight:700;letter-spacing:1px;opacity:.85;margin-bottom:4px">\u{1F5D3}\uFE0F WEEKLY PLAN</div>
    <div style="font-size:15px;font-weight:600;margin-bottom:4px;line-height:1.3">${esc(p.weekLabel||'This Week')}</div>
    <div style="font-size:11px;opacity:.85;margin-bottom:${p.note?'8px':'0'}">${sec?esc(sec.emoji+' '+sec.title):'Section '+p.sectionId} \u00B7 ${units}</div>
    ${p.note?`<div style="background:rgba(255,255,255,.15);border-radius:8px;padding:8px 11px;font-size:12px;line-height:1.5;white-space:pre-wrap">${esc(p.note)}</div>`:''}
  </div>`;
}

function setResultsSort(mode){
  STATE.dashResultsSort=mode;
  render();
}

// Drill down into a specific student's attempt. Reuses renderExamReview
// by populating STATE.examSession with the student's data + reviewMode:true.
async function openInstructorReview(examId,uid){
  if(!isInstructor()){showToast('Not authorized.','error');return;}
  const cache=STATE.dashExamResults[examId];
  if(!cache||!cache.results.length){showToast('Results not loaded.','error');return;}
  const result=cache.results.find(r=>r.userId===uid);
  if(!result){showToast('Student result not found.','error');return;}
  const exam=STATE.dashExams.find(e=>e.id===examId);
  const student=(STATE.dashStudents||[]).find(s=>s.uid===uid)||{name:'(unknown)'};

  let questions=result.questionSnapshot;
  if(!questions||!Array.isArray(questions)||!questions.length){
    // No snapshot — try deterministic rebuild (instructor can't backfill though).
    try{questions=await buildExamQuestions(exam,uid);}
    catch(e){showToast('Cannot rebuild questions for this student.','error');return;}
    if(!questions.length){showToast('Cannot rebuild questions for this student.','error');return;}
  }
  const answers={};
  if(Array.isArray(result.answers)){
    result.answers.forEach((a,i)=>{if(a&&a.picked!=null)answers[i]=a.picked;});
  }
  STATE.examSession={
    examId,exam,questions,answers,currentIdx:0,reviewIdx:0,
    startedAt:result.startedAt,deadlineAt:result.deadlineAt,
    submitting:false,submitted:true,reviewMode:true,
    reviewStudent:student,
    instructorReturnTab:'dashboard',
    results:{
      score:result.score||0,
      total:result.total||questions.length,
      percentage:result.percentage||0,
      autoSubmitted:!!result.autoSubmitted,
      submittedAt:result.submittedAt||''
    },
    navOpen:false
  };
  STATE.tab='exam';render();
}

// CSV export — one line per student. BOM prefix for Excel compat with UTF-8.
function exportResultsCSV(examId){
  const cache=STATE.dashExamResults[examId];
  if(!cache||!cache.results||!cache.results.length){
    showToast('No results to export.','warning');return;
  }
  const exam=STATE.dashExams.find(e=>e.id===examId);
  const students=STATE.dashStudents||[];
  const header=['Student Name','Student ID','Group','Score','Total','Percentage','Time Taken (min)','Started At','Submitted At','Auto-Submitted','Status'];
  const rows=[header];
  cache.results.forEach(r=>{
    const st=students.find(s=>s.uid===r.userId)||{};
    const timeMin=(r.startedAt&&r.submittedAt)
      ?Math.round((Date.parse(r.submittedAt)-Date.parse(r.startedAt))/60000)
      :'';
    rows.push([
      st.name||'(unknown)',
      st.studentId||'',
      r.groupCode||'',
      r.score!=null?r.score:'',
      r.total!=null?r.total:'',
      r.percentage!=null?r.percentage:'',
      timeMin,
      r.startedAt||'',
      r.submittedAt||'',
      r.autoSubmitted?'Yes':'No',
      r.submitted?'Submitted':'In Progress'
    ]);
  });
  const csv=rows.map(row=>row.map(cell=>{
    const s=String(cell==null?'':cell);
    return(s.includes(',')||s.includes('"')||s.includes('\n'))?'"'+s.replace(/"/g,'""')+'"':s;
  }).join(',')).join('\r\n');
  const filename='exam-'+((exam&&exam.title)?exam.title.replace(/[^a-zA-Z0-9]/g,'_').slice(0,40):examId)+'-results.csv';
  try{
    const blob=new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8;'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;a.download=filename;
    document.body.appendChild(a);a.click();document.body.removeChild(a);
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    showToast('CSV exported ✅','success');
  }catch(e){showToast('Export failed: '+e.message,'error');}
}

// ─── RENDER: INSTRUCTOR EXAM RESULTS ───────────────────────────────────
function renderDashExamResults(){
  const examId=STATE.dashExamViewingId;
  const exam=STATE.dashExams.find(e=>e.id===examId);
  const cache=STATE.dashExamResults[examId];
  const students=STATE.dashStudents||[];
  const groupStudents=exam?students.filter(s=>s.groupCode===exam.groupCode):[];

  const header='<div style="display:flex;align-items:center;gap:10px;padding:12px 14px;background:#fff;border-bottom:.5px solid var(--border);position:sticky;top:0;z-index:5">'
    +'<button onclick="closeExamResults()" style="background:none;border:none;font-size:22px;cursor:pointer;color:var(--brand);padding:0 6px" title="Back">\u2039</button>'
    +'<div style="flex:1;min-width:0">'
    +'<div style="font-size:11px;color:#888;text-transform:uppercase;letter-spacing:.4px">Results</div>'
    +'<div style="font-size:14px;font-weight:600;color:var(--ink);line-height:1.3">'+esc((exam&&exam.title)||'Exam')+'</div>'
    +'</div>'
    +(cache&&cache.loaded&&cache.results.length?('<button onclick="exportResultsCSV(\''+examId+'\')" style="padding:7px 12px;border-radius:8px;border:.5px solid var(--brand-2)40;background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">\u2B07 CSV</button>'):'')
    +'</div>';

  if(!cache||cache.loading){
    return header+'<div style="text-align:center;padding:60px 20px;color:#aaa"><div style="font-size:30px;margin-bottom:10px">\u23F3</div><div style="font-size:14px">Loading results\u2026</div></div>';
  }
  if(cache.error){
    return header+'<div style="text-align:center;padding:50px 20px"><div style="font-size:30px;margin-bottom:10px">\u26A0\uFE0F</div><div style="font-size:14px;color:#555;margin-bottom:14px">Couldn\'t load results.</div><button onclick="delete STATE.dashExamResults[\''+examId+'\'];loadExamResults(\''+examId+'\')" style="padding:9px 18px;border-radius:8px;border:.5px solid var(--border-4);background:#fff;font-size:13px;cursor:pointer;font-family:inherit">Retry</button></div>';
  }

  const stats=cache.stats||{};
  const enrolled=groupStudents.length;
  const takenPct=enrolled?Math.round(stats.submitted/enrolled*100):0;

  const statsCard='<div style="padding:14px 14px 6px">'
    +'<div style="background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:12px;padding:14px 16px;color:#fff;margin-bottom:12px">'
    +'<div style="font-size:11px;font-weight:600;letter-spacing:.5px;opacity:.9;margin-bottom:8px">OVERVIEW</div>'
    +'<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:10px;margin-bottom:10px">'
    +'<div><div style="font-size:11px;opacity:.75">Submitted</div><div style="font-size:20px;font-weight:600">'+(stats.submitted||0)+(enrolled?' / '+enrolled+' ('+takenPct+'%)':'')+'</div></div>'
    +'<div><div style="font-size:11px;opacity:.75">Average</div><div style="font-size:20px;font-weight:600">'+(stats.avgPct||0)+'%</div></div>'
    +'<div><div style="font-size:11px;opacity:.75">Pass Rate (\u226560%)</div><div style="font-size:20px;font-weight:600">'+(stats.passRate||0)+'% <span style="font-size:11px;opacity:.75">('+(stats.passCount||0)+' passed)</span></div></div>'
    +'<div><div style="font-size:11px;opacity:.75">Median</div><div style="font-size:20px;font-weight:600">'+(stats.medianPct||0)+'%</div></div>'
    +'</div>'
    +(stats.submitted>0?('<div style="display:flex;gap:14px;font-size:11px;opacity:.85;padding-top:8px;border-top:1px solid rgba(255,255,255,.2)"><div>Highest: <b>'+stats.highest+'%</b></div><div>Lowest: <b>'+stats.lowest+'%</b></div>'+(stats.pending>0?'<div>In progress: <b>'+stats.pending+'</b></div>':'')+'</div>'):'')
    +'</div>'
    +'</div>';

  if(!cache.results.length){
    return header+statsCard+'<div style="text-align:center;padding:30px 14px;color:#aaa;font-size:13px">No submissions yet. Students in group <b>'+esc((exam&&exam.groupCode)||'')+'</b> will appear here as they take the exam.</div>';
  }

  // Sort controls
  const sortMode=STATE.dashResultsSort||'score-desc';
  const sortBtn=(id,label)=>'<button onclick="setResultsSort(\''+id+'\')" style="padding:6px 10px;border-radius:6px;border:.5px solid '+(sortMode===id?'var(--brand)':'var(--border-4)')+';background:'+(sortMode===id?'var(--brand-tint)':'#fff')+';color:'+(sortMode===id?'var(--brand)':'#666')+';font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">'+label+'</button>';
  const sortBar='<div style="display:flex;gap:6px;padding:0 14px 12px;flex-wrap:wrap">'
    +'<span style="font-size:11px;color:#888;align-self:center;margin-right:4px">Sort:</span>'
    +sortBtn('score-desc','Score \u2193')
    +sortBtn('score-asc','Score \u2191')
    +sortBtn('name-asc','Name A\u2013Z')
    +sortBtn('submitted-desc','Newest')
    +sortBtn('time-asc','Fastest')
    +'</div>';

  // Sort results
  const withStudent=cache.results.map(r=>{
    const st=students.find(s=>s.uid===r.userId)||{};
    const timeMin=(r.startedAt&&r.submittedAt)?Math.round((Date.parse(r.submittedAt)-Date.parse(r.startedAt))/60000):null;
    return{...r,_stName:st.name||'(unknown)',_stId:st.studentId||'',_timeMin:timeMin};
  });
  const sorted=withStudent.slice().sort((a,b)=>{
    if(sortMode==='score-desc')return(b.percentage||0)-(a.percentage||0);
    if(sortMode==='score-asc')return(a.percentage||0)-(b.percentage||0);
    if(sortMode==='name-asc')return a._stName.localeCompare(b._stName);
    if(sortMode==='submitted-desc')return(b.submittedAt||'').localeCompare(a.submittedAt||'');
    if(sortMode==='time-asc')return(a._timeMin==null?1e9:a._timeMin)-(b._timeMin==null?1e9:b._timeMin);
    return 0;
  });

  const fmtDT=(iso)=>{if(!iso)return '—';try{return new Date(iso).toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});}catch{return iso;}};

  const row=(r)=>{
    const pct=r.percentage||0;
    const passed=pct>=60;
    const pctColor=passed?'var(--ok-strong-2)':'var(--err)';
    const pctBg=passed?'var(--ok-tint)':'var(--err-tint)';
    const statusPill=r.submitted
      ?(r.autoSubmitted?'<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;background:var(--warn-tint-2);color:#9A7D0A">AUTO</span>':'')
      :'<span style="font-size:9px;font-weight:700;padding:2px 6px;border-radius:8px;background:#EAECEE;color:#566573">IN PROGRESS</span>';
    return '<div style="background:#fff;border:.5px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:8px;display:flex;align-items:center;gap:10px">'
      +'<div style="flex:1;min-width:0">'
      +'<div style="font-size:13px;font-weight:600;color:var(--ink);line-height:1.3;display:flex;align-items:center;gap:6px">'+esc(r._stName)+' '+statusPill+'</div>'
      +'<div style="font-size:10px;color:#888;margin-top:2px">'+(r._stId?esc(r._stId)+' \u00B7 ':'')+fmtDT(r.submittedAt)+(r._timeMin!=null?' \u00B7 '+r._timeMin+' min':'')+'</div>'
      +'</div>'
      +(r.submitted?('<div style="background:'+pctBg+';color:'+pctColor+';border-radius:8px;padding:5px 10px;font-family:\'Courier New\',monospace;font-size:13px;font-weight:700;min-width:64px;text-align:center">'+(r.score||0)+'/'+(r.total||0)+'<br><span style="font-size:11px">'+pct+'%</span></div>'):'')
      +(r.submitted?('<button onclick="openInstructorReview(\''+examId+'\',\''+r.userId+'\')" style="padding:7px 10px;border-radius:8px;border:.5px solid var(--brand-2)40;background:var(--brand-tint);color:var(--brand);font-size:11px;font-weight:600;cursor:pointer;font-family:inherit">Review \u203A</button>'):'')
      +'</div>';
  };

  const list='<div style="padding:0 14px">'
    +sorted.map(row).join('')
    +'<div style="height:40px"></div>'
    +'</div>';

  return header+statsCard+sortBar+list;
}

// ═════════════════════════════════════════════════════════════════════


function shuffle(arr){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
function shuffleQuestionOptions(q){
  // Create index array [0,1,2,3], shuffle it, remap options and correct answer
  const idx=[0,1,2,3].slice(0,q.o.length);
  for(let i=idx.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[idx[i],idx[j]]=[idx[j],idx[i]];}
  const newOpts=idx.map(i=>q.o[i]);
  const newA=idx.indexOf(q.a);
  const newWrongWhy={};
  if(q.wrongWhy){for(const[k,v]of Object.entries(q.wrongWhy)){const newK=idx.indexOf(Number(k));if(newK>=0)newWrongWhy[newK]=v;}}
  return{...q,o:newOpts,a:newA,wrongWhy:Object.keys(newWrongWhy).length?newWrongWhy:q.wrongWhy};
}

// --- studentId ---
function genStudentId(){const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let s='';for(let i=0;i<6;i++)s+=chars[Math.floor(Math.random()*chars.length)];return s;}
async function genUniqueStudentId(){
  for(let i=0;i<6;i++){
    const cand=genStudentId();
    try{
      const snap=await db.collection('students').where('studentId','==',cand).limit(1).get();
      if(snap.empty)return cand;
    }catch(_){return cand;}
  }
  return genStudentId();
}

// --- renderNotes ---
function renderNotes(){
  const notes=buildAllNotes();
  const bySec={};notes.forEach(n=>{const sid=n.sec.id;if(!bySec[sid])bySec[sid]={sec:n.sec,items:[]};bySec[sid].items.push(n);});
  const groups=Object.values(bySec).sort((a,b)=>a.sec.id-b.sec.id);
  const body=notes.length===0
    ?`<div style="text-align:center;padding:40px 20px;color:#aaa"><div style="font-size:36px;margin-bottom:10px">📝</div><div style="font-size:14px">No notes yet.</div><div style="font-size:12px;margin-top:6px;color:#bbb">Open any lesson, scroll down, and write in the Notes box.</div></div>`
    :groups.map(g=>`<div style="margin-bottom:18px"><div class="notes-item-sec" style="color:${g.sec.text}">${g.sec.emoji} ${esc(g.sec.title)}</div>${g.items.map(n=>`<div class="notes-item"><div class="notes-item-title">${esc(n.lessonTitle)}</div><div class="notes-item-body">${esc(n.text)}</div><button onclick="studyGo(${g.sec.id},'${n.lessonId}')" style="margin-top:8px;padding:6px 12px;border-radius:8px;border:.5px solid var(--brand)40;background:#EBF5FB;color:var(--brand);font-size:11px;font-weight:500;cursor:pointer;font-family:inherit">Open lesson →</button></div>`).join('')}</div>`).join('');
  return `${renderSubNav(SUB_REFERENCE,'my-notes')}<div class="sh"><h2>My Notes</h2><p>${notes.length} note${notes.length===1?'':'s'} across your lessons</p></div>
  <div class="scroll-area pad" style="padding-top:14px">${body}<div style="height:20px"></div></div>`;
}

// ─── RENDER FLASHCARDS ───────────────────────────────────────────────────

// --- renderFlashcards ---
function renderFlashcards(){
  const all=STATE.flashcards||[];
  if(!all.length)return `${renderSubNav(SUB_PRACTICE,'flashcards')}<div class="sh"><h2>Flashcards</h2><p>Loading cards…</p></div><div class="scroll-area" style="display:flex;align-items:center;justify-content:center;height:60%;color:#aaa"><div style="text-align:center"><div style="font-size:32px;margin-bottom:10px">⏳</div><div>Building cards…</div></div></div>`;
  const list=filteredFlashcards();
  const idx=Math.min(STATE.flashcardsIdx,Math.max(0,list.length-1));
  const card=list[idx];
  const rs=new Set(loadFlashReviewSet());
  const filterBtns=[['all','All']].concat(S.map(s=>[String(s.id),s.emoji+' '+String(s.id)])).map(([v,l])=>{const on=STATE.flashcardsFilter===v;return `<button onclick="flashSetFilter('${v}')" style="padding:5px 10px;border-radius:14px;font-size:11px;cursor:pointer;font-family:inherit;border:.5px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand)':'var(--surface-3)'};color:${on?'#fff':'#555'};font-weight:${on?'600':'400'};white-space:nowrap">${l}</button>`;}).join('');
  const modeBtns=[['study','Study'],['review','Review only ('+rs.size+')']].map(([v,l])=>{const on=STATE.flashcardsMode===v;return `<button onclick="flashSetMode('${v}')" style="flex:1;padding:6px 10px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;border:.5px solid ${on?'#7D3C98':'var(--border-4)'};background:${on?'var(--accent-purple-tint)':'#fff'};color:${on?'var(--accent-purple-strong)':'#555'};font-weight:${on?'600':'400'}">${l}</button>`;}).join('');
  if(!card)return `${renderSubNav(SUB_PRACTICE,'flashcards')}<div class="sh"><h2>Flashcards</h2><p>${all.length} cards total</p></div><div class="scroll-area pad" style="padding-top:14px"><div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;scrollbar-width:none">${filterBtns}</div><div style="display:flex;gap:6px;margin-bottom:14px">${modeBtns}</div><div style="text-align:center;padding:40px 20px;color:#aaa"><div style="font-size:32px;margin-bottom:10px">✅</div><div style="font-size:14px">${STATE.flashcardsMode==='review'?'No cards marked for review!':'No cards match this filter.'}</div></div></div>`;
  const typeBadge=card.type==='def'?'<span class="flash-type-badge" style="background:#EBF3FA;color:var(--brand)">📖 DEFINITION</span>':'<span class="flash-type-badge" style="background:#F4EFFB;color:var(--accent-purple-strong)">📐 FORMULA</span>';
  const flipped=STATE.flashcardsFlipped;
  const isReview=rs.has(card.id);
  const cardBody=flipped
    ?`${typeBadge}<div class="flash-back">${esc(card.back).replace(/\n/g,'<br>')}</div>`
    :`${typeBadge}<div class="flash-front">${esc(card.front)}</div><div style="margin-top:16px;font-size:11px;color:#aaa">Tap to flip</div>`;
  return `${renderSubNav(SUB_PRACTICE,'flashcards')}<div class="sh"><h2>Flashcards</h2><p>${list.length} card${list.length===1?'':'s'} · card ${idx+1} of ${list.length}</p></div>
  <div class="scroll-area pad" style="padding-top:14px">
    <div style="display:flex;gap:6px;overflow-x:auto;margin-bottom:12px;scrollbar-width:none;-webkit-overflow-scrolling:touch">${filterBtns}</div>
    <div style="display:flex;gap:6px;margin-bottom:14px">${modeBtns}</div>
    <div class="flash-card" onclick="flashFlip()">${cardBody}</div>
    <div style="font-size:11px;color:#888;text-align:center;margin-top:10px">${esc(card.sec.title)} · ${esc(card.lessonTitle)}${isReview?' · <span style="color:var(--err-2)">📌 Marked</span>':''}</div>
    <div class="flash-nav">
      <button class="flash-btn flash-btn-review" onclick="flashMarkReview('${card.id}')">${isReview?'✓ Unmark':'📌 Review'}</button>
      <button class="flash-btn flash-btn-skip" onclick="flashPrev()">‹ Prev</button>
      <button class="flash-btn flash-btn-know" onclick="flashMarkKnow('${card.id}')">Know · Next →</button>
    </div>
    <div style="height:20px"></div>
  </div>`;
}

// ─── RENDER DASHBOARD: ACTUAL TEACHING ───────────────────────────────────
function renderDashActualTeaching(){
  const entries=STATE.dashTeachingLog||[];
  const d=STATE.dashTeachingDraft;
  const selectedGroup=STATE.dashSelectedGroup;
  // Batch 2: auto-prefill the draft group so entries always attach to the
  // currently-viewed group. Removes the group picker entirely (redundant).
  if(selectedGroup&&!d.groupCode)d.groupCode=selectedGroup;
  const allLessons=[];S.forEach(sec=>sec.lessons.forEach(l=>allLessons.push({sec,lesson:l})));
  const lessonPicker=S.map(sec=>{const items=sec.lessons.map(l=>{const on=d.unitIds.includes(l.id);return `<button onclick="toggleTeachingUnit('${l.id}')" style="padding:5px 9px;border-radius:8px;font-size:11px;cursor:pointer;font-family:inherit;border:.5px solid ${on?sec.text:'var(--border-4)'};background:${on?sec.bg:'var(--surface-3)'};color:${on?sec.strong:'#555'};font-weight:${on?'600':'400'};margin:2px">${l.id}. ${esc(l.title.slice(0,42))}${l.title.length>42?'…':''}</button>`;}).join('');return `<div style="margin-bottom:10px"><div style="font-size:11px;font-weight:600;color:${sec.strong};margin-bottom:6px">${sec.emoji} Section ${sec.id}</div><div>${items}</div></div>`;}).join('');
  const createForm=`<div style="padding:14px">
    <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">\u2795 Log a Lecture for <span style="font-family:'Courier New',monospace;color:var(--brand)">${esc(selectedGroup)}</span></div>
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="margin-bottom:10px">
        <label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Link a created lecture (optional)</label>
        <select onchange="onTeachingLecturePick(this.value)" style="width:100%;padding:8px;border-radius:8px;border:.5px solid var(--border-4);font-size:12px;font-family:inherit;background:#fff;color:var(--ink);box-sizing:border-box">
          <option value="">— none: enter manually below —</option>
          ${(STATE.dashLectures||[]).map(l=>`<option value="${esc(l.id)}" ${d.lectureId===l.id?'selected':''}>${esc(l.title||'Untitled')}${l.date?' \u00B7 '+esc(l.date):''}</option>`).join('')}
        </select>
        ${d.lectureTitle?`<div style="font-size:10px;color:var(--brand);margin-top:4px">\u{1F517} Linked: ${esc(d.lectureTitle)} — date auto-filled; pick the units taught below.</div>`:''}
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
        <div><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Lecture # *</label><input id="tl-lecno" type="number" min="1" value="${esc(String(d.lectureNumber||''))}" oninput="STATE.dashTeachingDraft.lectureNumber=this.value;this.classList.remove('field-error')" placeholder="1" style="width:100%;padding:8px;border-radius:8px;border:.5px solid var(--border-4);font-size:12px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box"></div>
        <div><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Date *</label><input id="tl-date" type="date" value="${esc(d.date||'')}" oninput="STATE.dashTeachingDraft.date=this.value;this.classList.remove('field-error')" style="width:100%;padding:8px;border-radius:8px;border:.5px solid var(--border-4);font-size:12px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box"></div>
      </div>
      <div style="margin-bottom:10px"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Units taught * (${d.unitIds.length} selected)</label><div id="tl-units" style="border:.5px solid var(--border);border-radius:8px;padding:10px;max-height:280px;overflow-y:auto;background:var(--surface)">${lessonPicker}</div></div>
      <div style="margin-bottom:10px"><label style="font-size:11px;color:#888;display:block;margin-bottom:4px">Notes (optional)</label><textarea oninput="STATE.dashTeachingDraft.notes=this.value" placeholder="What did you cover in this lecture? Any highlights or student questions?" style="width:100%;padding:8px;border-radius:8px;border:.5px solid var(--border-4);font-size:12px;font-family:inherit;outline:none;background:#fff;color:var(--ink);box-sizing:border-box;resize:vertical;min-height:60px">${esc(d.notes||'')}</textarea></div>
      <button onclick="saveTeachingEntry()" style="width:100%;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">\u{1F4BE} Save Entry</button>
    </div>`;
  if(entries.length===0){
    return `${createForm}${renderDashTabEmpty('Teaching entries',selectedGroup,{icon:'\u{1F4D3}',body:'No teaching entries yet for this group. Log your first lecture using the form above.'})}</div>`;
  }
  const rows=entries.map(e=>{const dt=e.date?new Date(e.date).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'';const titles=(e.unitIds||[]).map(uid=>{const found=allLessons.find(x=>x.lesson.id===uid);return found?`${uid}. ${found.lesson.title}`:uid;});return `<div class="teach-entry"><div class="teach-badges"><span class="teach-badge" style="background:#D6EAF8;color:var(--brand)">Lecture ${e.lectureNumber}</span><span class="teach-badge" style="background:var(--surface-3);color:#555">${dt}</span>${e.lectureTitle?'<span class="teach-badge" style="background:#EBF5FB;color:var(--brand)">\u{1F517} '+esc(e.lectureTitle)+'</span>':''}</div><div style="font-size:11px;color:#888;margin-bottom:8px">${titles.length} unit${titles.length===1?'':'s'} taught</div><div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px">${titles.map(t=>`<span style="font-size:10px;background:#EBF5FB;color:var(--brand);padding:2px 7px;border-radius:8px">${esc(t)}</span>`).join('')}</div>${e.notes?`<div style="font-size:12px;color:#444;background:var(--surface);border-radius:8px;padding:8px 10px;margin-bottom:8px;line-height:1.5">${esc(e.notes)}</div>`:''}<button onclick="deleteTeachingEntry('${e.id}')" style="padding:5px 10px;border-radius:6px;border:.5px solid var(--err)40;background:var(--err-tint);color:var(--err-2);font-size:11px;cursor:pointer;font-family:inherit">\u{1F5D1}\uFE0F Delete</button></div>`;}).join('');
  return `${createForm}
    <div style="font-size:12px;font-weight:500;color:#888;letter-spacing:.5px;margin-bottom:8px">RECENT ENTRIES (${entries.length})</div>
    ${rows}
  </div>`;
}





// ── LAZY LESSON LOADER ───────────────────────────────────────────────────────
// Blocks are loaded on-demand from ./lessons/lesson-sN.json files.
// This reduces the initial HTML parse cost by ~508KB.
const LESSON_CACHE={};

async function ensureLessons(sectionId){
  const sid=String(sectionId);
  if(LESSON_CACHE[sid])return;
  try{
    const res=await fetch('./lessons/lesson-s'+sid+'.json');
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    const sec=S.find(s=>String(s.id)===sid);
    if(sec){sec.lessons.forEach(l=>{if(data[l.id])l.blocks=data[l.id];});}
    LESSON_CACHE[sid]=true;
  }catch(e){console.error('Failed to load lessons for section '+sid,e);}
}

// Background pre-warm: silently load all sections 4s after app start
async function prewarmLessons(){
  try{await Promise.all([1,2,3,4,5,6].map(i=>ensureLessons(i)));}catch(e){}
}
setTimeout(prewarmLessons,4000);
// ── Ported prefs bootstrap ──
try{STATE.fontSize=loadFontSize();STATE.dailyGoalMinutes=loadDailyGoal();}catch(e){}


// ── LAZY QUIZ LOADER ─────────────────────────────────────────────────────────
const QUIZ_CACHE={};
async function ensureQuizzes(sectionId){
  const sid=String(sectionId);
  if(QUIZ_CACHE[sid])return;
  try{
    const res=await fetch('./questions/s'+sid+'.json');
    if(!res.ok)throw new Error('HTTP '+res.status);
    const data=await res.json();
    const sec=S.find(s=>String(s.id)===sid);
    if(sec){sec.lessons.forEach(l=>{if(data[l.id])l.quizzes=data[l.id];});}
    QUIZ_CACHE[sid]=true;
  }catch(e){console.error('Failed to load quizzes for section '+sid,e);}
}
// ─────────────────────────────────────────────────────────────────────────────
// ─── DATA INTEGRITY VALIDATOR ─────────────────────────────────────────────────
// Scans all loaded quiz questions for known authoring errors.
// Runs automatically 4s after app load. Call anytime via: validateQuizData()
// ─────────────────────────────────────────────────────────────────────────────
function validateQuizData(silent=false){
  const CONTEXT_PATTERNS=[
    /using the (data|information) above/i,
    /using the above (data|information)/i,
    /from the above/i,
    /previous question/i,
    /as (shown|stated|given) above/i,
    /refer(ring)? to (the )?above/i,
    /data above/i,
    /above data/i
  ];
  const issues=[];
  let totalChecked=0;
  S.forEach(sec=>{
    sec.lessons.forEach(lesson=>{
      if(!lesson.quizzes||!lesson.quizzes.length)return;
      lesson.quizzes.forEach((q,idx)=>{
        totalChecked++;
        // Check 1: Context-dependent question
        if(CONTEXT_PATTERNS.some(p=>p.test(q.q))){
          issues.push({type:'CONTEXT-DEPENDENT',severity:'HIGH',
            location:`Section ${sec.id} › ${lesson.title} › Q-index ${idx}`,
            detail:`Question references external data: "${q.q.slice(0,80)}..."`,
            fix:'Embed all required data directly in the question text.'});}
        // Check 2: Answer index out of bounds
        if(typeof q.a!=='number'||q.a<0||q.a>=(q.o||[]).length){
          issues.push({type:'INVALID ANSWER INDEX',severity:'CRITICAL',
            location:`Section ${sec.id} › ${lesson.title} › Q-index ${idx}`,
            detail:`"a": ${q.a} is out of range. Options length: ${(q.o||[]).length}`,
            fix:'Correct the "a" field to a valid index (0 to options.length - 1).'});}
        // Check 3: Missing explanation
        if(!q.e||q.e.trim().length<10){
          issues.push({type:'MISSING EXPLANATION',severity:'MEDIUM',
            location:`Section ${sec.id} › ${lesson.title} › Q-index ${idx}`,
            detail:`Explanation is empty or too short: "${(q.e||'').slice(0,40)}"`,
            fix:'Add a meaningful explanation to the "e" field.'});}
        // Check 4: Insufficient options
        if(!q.o||q.o.length<2){
          issues.push({type:'INSUFFICIENT OPTIONS',severity:'HIGH',
            location:`Section ${sec.id} › ${lesson.title} › Q-index ${idx}`,
            detail:`Only ${(q.o||[]).length} option(s) found. Minimum is 2.`,
            fix:'Add more answer options to the "o" array.'});}
        // Check 5: Duplicate options
        if(q.o&&q.o.length!==new Set(q.o.map(o=>o.trim().toLowerCase())).size){
          issues.push({type:'DUPLICATE OPTIONS',severity:'MEDIUM',
            location:`Section ${sec.id} › ${lesson.title} › Q-index ${idx}`,
            detail:`Duplicate answer options in: "${q.q.slice(0,60)}..."`,
            fix:'Ensure all answer options are unique.'});}
      });
    });
  });
  if(silent)return issues;
  const crit=issues.filter(i=>i.severity==='CRITICAL').length;
  const high=issues.filter(i=>i.severity==='HIGH').length;
  const med=issues.filter(i=>i.severity==='MEDIUM').length;
  if(issues.length===0){
    console.log('%c✅ Quiz Data Integrity: PASSED — '+totalChecked+' questions scanned, 0 issues.','color:var(--ok-strong);font-weight:bold;background:var(--ok-tint);padding:3px 8px;border-radius:4px');
    return issues;}
  console.group('%c⚠️ Quiz Data Integrity: '+issues.length+' issue(s) in '+totalChecked+' questions','color:var(--err-strong);font-weight:bold;background:var(--err-tint);padding:3px 8px;border-radius:4px');
  console.log('  🔴 CRITICAL: '+crit+'   🟠 HIGH: '+high+'   🟡 MEDIUM: '+med);
  issues.forEach((issue,i)=>{
    const c=issue.severity==='CRITICAL'?'var(--err-strong)':issue.severity==='HIGH'?'var(--warn-strong)':'#555';
    console.group('%c'+(i+1)+'. ['+issue.severity+'] '+issue.type,'color:'+c+';font-weight:bold');
    console.log('📍 Location:',issue.location);
    console.log('📋 Detail  :',issue.detail);
    console.log('🔧 Fix     :',issue.fix);
    console.groupEnd();
  });
  console.groupEnd();
  return issues;
}
// Auto-run validator after all quizzes load — non-blocking, never breaks the app
async function runValidatorAfterLoad(){
  try{await Promise.all([1,2,3,4,5,6].map(i=>ensureQuizzes(i)));validateQuizData();}
  catch(e){/* silent fail */}
}
setTimeout(runValidatorAfterLoad,4000);
// ─────────────────────────────────────────────────────────────────────────────
// ─── RENDER ───────────────────────────────────────────────────────────────────
// ── Primary Navigation (5 tabs) ──────────────────────────────────────────────
const TABS=[
  {id:'intro',           label:'About',    icon:'👤'},
  {id:'study',           label:'Study',    icon:'📚'},
  {id:'quiz-mode-select',label:'Practice', icon:'🎯'},
  {id:'progress',        label:'Progress', icon:'📊'},
  {id:'formula-bank',    label:'Tools',    icon:'🧰'},
  {id:'search',          label:'Search',   icon:'🔍'},
  {id:'community',       label:'Community',icon:'🌐'}
];

// Maps every screen → its primary nav tab
function activeNavTab(){
  const t=STATE.tab;
  if(t==='study'||t==='quiz-session'||t==='quiz-results'||t==='quiz-review'||t==='lessons')return'study';
  if(t==='quiz-mode-select'||t==='quiz-mode'||t==='cbq'||t==='mock-exam'||t==='flashcards'||t==='wrong-answers')return'quiz-mode-select';
  if(t==='progress'||t==='tracker'||t==='leaderboard')return'progress';
  if(t==='formula-bank'||t==='dictionary'||t==='my-notes')return'formula-bank';
  if(t==='search')return'search';
  if(t==='community'||t==='question-detail')return'community';
  if(t==='dashboard')return'dashboard';
  if(t==='intro'||t==='register'||t==='feedback')return'intro';
  return t;
}

// ── Sub-Navigation Renderer ───────────────────────────────────────────────────
// items: [{id, label, icon}]  |  activeId: current STATE.tab
function renderSubNav(items, activeId){
  return`<div class="sub-nav">${
    items.map(it=>`<button class="sub-nav-btn${activeId===it.id?' active':''}" onclick="navTo('${it.id}')">${it.icon} ${it.label}</button>`).join('')
  }</div>`;
}

// Sub-nav item definitions for each group
const SUB_PRACTICE=[
  {id:'quiz-mode-select', icon:'🎯', label:'MCQ Quiz'},
  {id:'cbq',              icon:'📝', label:'CBQ'},
  {id:'mock-exam',        icon:'🏆', label:'Mock Exam'},
  {id:'flashcards',       icon:'🃏', label:'Flashcards'},
  {id:'wrong-answers',    icon:'❌', label:'Wrong Answers'}
];
const SUB_PROGRESS=[
  {id:'progress',      icon:'📊', label:'Overview'},
  {id:'tracker',       icon:'📌', label:'Tracker'},
  {id:'leaderboard',   icon:'🏅', label:'Top Students'}
];
const SUB_REFERENCE=[
  {id:'formula-bank', icon:'📐', label:'Formula'},
  {id:'dictionary',   icon:'📖', label:'Dictionary'},
  {id:'my-notes',     icon:'📝', label:'My Notes'}
];
const SUB_ME=[
  {id:'intro',     icon:'🏠', label:'Home'},
  {id:'register',  icon:'🎓', label:'Profile'},
  {id:'feedback',  icon:'⭐', label:'Feedback'}
];
function render(){
  const content=document.getElementById('content-area');const nav=document.getElementById('bottom-nav');if(!content||!nav)return;

  // ── FIX 4: Save scroll position before re-render, restore if same tab ──
  // Without this, every render() call (answering quiz, syncing notes, etc.)
  // scrolls the user back to the top of the page — a jarring UX regression.
  const _prevTab=render._lastTab;
  const _scrollArea=content.querySelector('.scroll-area');
  const _savedScroll=_scrollArea?_scrollArea.scrollTop:0;

  let html='';
  // Batch 6 · Item B — render error boundary. Any renderer that throws now
  // yields a graceful recovery card instead of a blank screen.
  try{
    switch(STATE.tab){
      case'loading':html=renderLoading();break;case'onboarding':html=renderOnboarding();break;case'login':html=renderLogin();break;case'intro':html=renderIntro();break;case'register':html=renderRegister();break;case'progress':html=renderProgress();break;case'wrong-answers':html=renderWrongAnswers();break;case'study':html=renderStudy();break;case'quiz-session':html=renderQuizSession();break;case'quiz-results':html=renderQuizResults();break;case'quiz-review':html=renderQuizReview();break;case'search':html=renderSearch();break;case'quiz-mode':html=renderQuizMode();break;case'quiz-mode-select':html=renderQuizModeSelect();break;case'leaderboard':html=renderLeaderboard();break;case'tracker':html=renderTracker();break;case'feedback':html=renderFeedback();break;case'community':html=renderCommunity();break;case'question-detail':html=renderQuestionDetail();break;case'formula-bank':html=renderFormulaBank();break;case'dictionary':html=renderDictionary();break;case'flashcards':html=renderFlashcards();break;case'my-notes':html=renderNotes();break;case'dashboard':html=renderDashboard();break;case'cbq':html=renderCBQ();break;case'mock-exam':html=renderMockExamScreen();break;case'exam':html=renderExam();break;default:html=renderIntro();
    }
  }catch(err){
    console.error('[render] Renderer threw for tab='+STATE.tab, err);
    const _safeTab=esc(String(STATE.tab||'unknown'));
    const _msg=esc(String((err&&err.message)||err||'Unknown error'));
    html='<div class="scroll-area"><div class="pad" style="padding-top:40px"><div style="max-width:420px;margin:0 auto;background:var(--card);border:1px solid var(--border);border-radius:14px;padding:22px 20px;text-align:center"><div style="font-size:40px;margin-bottom:10px">\u26A0\uFE0F</div><div style="font-size:16px;font-weight:600;color:var(--ink);margin-bottom:6px">Something went wrong</div><div style="font-size:13px;color:var(--muted);line-height:1.55;margin-bottom:14px">A screen failed to render. Your data is safe. Try reloading the app.</div><div style="background:var(--surface-3);border-radius:8px;padding:8px 10px;margin-bottom:14px;font-family:monospace;font-size:11px;color:var(--muted);text-align:left;word-break:break-word">Tab: '+_safeTab+'<br>'+_msg+'</div><div style="display:flex;gap:8px"><button onclick="location.reload()" style="flex:1;padding:11px;border-radius:10px;border:none;background:var(--brand);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Reload</button><button onclick="STATE.tab=\'intro\';render();" style="flex:1;padding:11px;border-radius:10px;border:1px solid var(--border);background:var(--card);color:var(--ink);font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Go Home</button></div></div></div></div>';
  }
  content.innerHTML=html;

  // Batch 5: weekly plan banner — floats above content on Study tab.
  if(STATE.tab==='study' && STATE.studentActivePlan){
    try{
      const _bannerHTML=renderStudentActivePlanBanner();
      if(_bannerHTML){
        const _wrap=document.createElement('div');
        _wrap.style.cssText='margin:10px 12px 0;flex-shrink:0';
        _wrap.innerHTML=_bannerHTML;
        content.insertBefore(_wrap,content.firstChild);
      }
    }catch(e){}
  }

  // Batch 5: lecture feedback prompt — appears when instructor opens feedback
  // AND student attended AND hasn't submitted yet. Non-blocking floating card.
  try{ maybeShowFeedbackPrompt(); }catch(e){}
  // Batch 8 (feedback-popup): auto-open the rating modal instead of a passive
  // banner. "Later" suppresses it for the session (see markFeedbackDismissed);
  // it re-appears next app open. Deferred slightly so it lands after the screen
  // settles, matching the login-style popup feel. Guards prevent duplicate opens.
  if(STATE._feedbackPromptFor && !['loading','login','onboarding','quiz-session','exam','cbq','mock-exam'].includes(STATE.tab)){
    const fp=STATE._feedbackPromptFor;
    if(fp && fp.lectureId && !_feedbackDismissedSession[fp.lectureId] && !document.getElementById('feedback-overlay')){
      setTimeout(()=>{
        try{
          const cur=STATE._feedbackPromptFor;
          if(cur && cur.lectureId===fp.lectureId
             && !_feedbackDismissedSession[fp.lectureId]
             && !document.getElementById('feedback-overlay')
             && !['loading','login','onboarding','quiz-session','exam','cbq','mock-exam'].includes(STATE.tab)){
            showFeedbackModal({lectureId:fp.lectureId,title:fp.title},fp.groupCode);
          }
        }catch(e){}
      }, 350);
    }
  }

  // Batch 4: engagement card — floats above content on normal student screens.
  if(STATE._engagementCard && !['loading','login','onboarding','quiz-session','exam','cbq','mock-exam'].includes(STATE.tab)){
    const v=STATE._engagementCard;
    const card=document.createElement('div');
    card.style.cssText='margin:10px 12px 0;background:linear-gradient(135deg,var(--brand),var(--brand-3));border-radius:12px;padding:12px 14px;color:#fff;display:flex;align-items:center;gap:11px;box-shadow:0 3px 12px rgba(12,68,124,.25);cursor:pointer;flex-shrink:0';
    card.innerHTML='<span style="font-size:20px;flex-shrink:0">\u{1F514}</span><span style="flex:1;font-size:13px;line-height:1.4">'+esc(v.body)+'</span><span data-x="1" style="flex-shrink:0;font-size:18px;opacity:.7;padding:0 4px">\u00D7</span>';
    card.onclick=(e)=>{ if(e.target&&e.target.getAttribute('data-x')){dismissEngagementCard();} else {tapEngagementCard();} };
    content.insertBefore(card,content.firstChild);
  }

  // Restore scroll if we're re-rendering the same tab (not navigating to a new screen)
  if(STATE.tab===_prevTab&&_savedScroll>0){
    const newScrollArea=content.querySelector('.scroll-area');
    if(newScrollArea)newScrollArea.scrollTop=_savedScroll;
  }
  render._lastTab=STATE.tab;
  if(STATE.tab==='cbq'){content.style.overflow='hidden';setTimeout(()=>cbqInit(),0);}
  if(STATE.tab==='mock-exam'){content.style.overflow='hidden';if(STATE.mockExam.status==='mcq')setTimeout(()=>renderMockMCQContent(),0);if(STATE.mockExam.status==='cbq')setTimeout(()=>mockSetupMockDrag(),0);}
  if(STATE.tab==='study'&&STATE.lessonId){setTimeout(()=>syncNoteFromCloud(STATE.lessonId),0);}
  try{applyFontSize();}catch(e){}
  if(STATE.tab==='flashcards'&&(!STATE.flashcards||!STATE.flashcards.length)){ensureFlashcards().then(()=>{if(STATE.tab==='flashcards')render();});}
  if(STATE.tab==='intro'&&STATE.user){setTimeout(()=>{try{ensureQotd();}catch(e){}try{ensureStudentPlan();}catch(e){}},0);}
  if(STATE.tab==='study'&&STATE.user){setTimeout(()=>{try{ensureStudentPlan();}catch(e){}},0);}
  if(STATE.tab==='search'){setTimeout(()=>{const inp=document.getElementById('search-input');if(inp){inp.focus();if(STATE.searchQ)updateSearchResults();}},50);}
  if(STATE.tab==='dictionary'){if(!STATE.dictLoaded)setTimeout(ensureDictionary,0);setTimeout(()=>{const i=document.getElementById('dict-input');if(i)i.focus();},50);}
  content.style.display='flex';content.style.flexDirection='column';content.style.overflow=STATE.tab==='cbq'||STATE.tab==='mock-exam'?'hidden':'auto';
  const _mb=document.getElementById('mobile-brand');
  if(STATE.tab==='loading'||STATE.tab==='login'||STATE.tab==='onboarding'){nav.style.display='none';if(_mb)_mb.style.display='none';}
  else{nav.style.display='flex';if(_mb)_mb.style.display='';
    const active=activeNavTab();
    // #7: Only rebuild nav DOM when active group changes — avoids layout thrash
    if(active!==render._lastNavActive){
      render._lastNavActive=active;
      const brandHeader=`<div class="desktop-brand" style="display:flex;align-items:center;justify-content:space-between;gap:10px"><div style="display:flex;align-items:center;gap:10px;min-width:0"><img src="./gawad-avatar.webp" alt="Mohamed Abdelgawad" style="width:40px;height:40px;border-radius:50%;object-fit:cover;flex-shrink:0;border:2px solid var(--brand-tint)"><div style="min-width:0"><div style="font-size:13px;font-weight:600;color:var(--brand);letter-spacing:.5px">CMA Part One Prep</div><div style="font-size:10px;color:#888;margin-top:1px">With Gawad</div></div></div>${!window.matchMedia("(display-mode: standalone)").matches?'<button onclick="installApp()" title="Install App" style="display:flex;align-items:center;gap:5px;padding:6px 10px;border-radius:8px;border:1px solid #d0d8e8;background:var(--brand-tint);color:var(--brand);cursor:pointer;font-size:12px;font-weight:500;font-family:inherit;flex-shrink:0"><span style="font-size:14px">⬇</span><span>Install App</span></button>':''}</div>`;
      nav.innerHTML=brandHeader+getNavTabs().map(t=>`<button class="nav-btn${t.id===active?' active':''}" onclick="navTo('${t.id}')"><span class="nav-icon">${t.icon}</span><span>${t.label}</span></button>`).join('');
    }}
  // Start live per-question timer when on a quiz screen with unanswered question
  if(STATE.tab==='quiz-session'&&STATE.quizState&&STATE.quizState.selected===null){
    setTimeout(()=>startQTimer(()=>STATE.quizState.qTimerStart),20);
  } else if(STATE.tab==='quiz-mode'&&STATE.quizMode&&!STATE.quizMode.done&&STATE.quizMode.selected===null){
    setTimeout(()=>startQTimer(()=>STATE.quizMode.qTimerStart),20);
  } else {
    stopQTimer();
  }
}
function loadStudent(){try{const d=localStorage.getItem('cma-student-v1');return d?JSON.parse(d):null;}catch{return null;}}
function saveStudent(d){
  try{localStorage.setItem('cma-student-v1',JSON.stringify(d));}catch{}
  if(STATE.user){db.collection('students').doc(STATE.user.uid).set(d).catch(()=>{});}
}
function loadFeedback(){try{const d=localStorage.getItem('cma-feedback-v1');return d?JSON.parse(d):{rating:0,comments:'',improvements:''};}catch{return{rating:0,comments:'',improvements:''};}}
function saveFeedback(d){try{localStorage.setItem('cma-feedback-v1',JSON.stringify(d));}catch{}}

// Batch 4 — notification + email digest opt-in card (used in Profile/onboarding).
function renderNotifOptInCard(){
  const prefs=getNotifPrefs();
  const on=!!prefs.desired;
  const time=prefs.dailyTime||'19:00';
  const emailOn=!!prefs.emailDigestOptedIn;
  const granted=prefs.permissionGranted;
  return `
  <div class="info-title" style="font-size:14px;margin-bottom:10px">\u{1F514} Study Reminders <span style="font-size:11px;color:#888;font-weight:400">\u00B7 optional</span></div>
  <div class="card" style="margin-bottom:14px">
    <div style="display:flex;align-items:flex-start;gap:10px;margin-bottom:14px">
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:2px">Daily study nudge</div>
        <div style="font-size:12px;color:#888;line-height:1.5">A friendly reminder to keep your streak alive.${granted?' <span style=\"color:var(--ok)\">\u2713 enabled</span>':''}</div>
      </div>
      <button onclick="requestNotifPermission()" style="padding:8px 14px;border-radius:8px;border:.5px solid var(--brand-2);background:${on?'var(--brand-tint)':'#fff'};color:var(--brand);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;flex-shrink:0">${on?'On':'Enable'}</button>
    </div>
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px">
      <label style="font-size:12px;color:#666;flex-shrink:0">Reminder time</label>
      <input type="time" value="${time}" onchange="setNotifPrefs({dailyTime:this.value});showToast('Reminder time saved','success',1800)" style="padding:8px 10px;border-radius:8px;border:.5px solid var(--border-3);font-size:13px;font-family:inherit;background:#fff">
    </div>
    <label style="display:flex;align-items:center;gap:10px;cursor:pointer;padding-top:12px;border-top:.5px solid #eee">
      <input type="checkbox" ${emailOn?'checked':''} onchange="setNotifPrefs({emailDigestOptedIn:this.checked});showToast(this.checked?'Weekly email on':'Weekly email off','info',1800)" style="width:18px;height:18px;flex-shrink:0;accent-color:var(--brand)">
      <span style="font-size:13px;color:#333;line-height:1.4">Send me a weekly progress email on Sundays</span>
    </label>
  </div>`;
}

function renderRegister(){
  const st=loadStudent();
  const COUNTRIES=['Egypt','Saudi Arabia','UAE','Kuwait','Qatar','Bahrain','Oman','Jordan','Lebanon','Iraq','Syria','Palestine','Yemen','Libya','Tunisia','Algeria','Morocco','Sudan','Somalia','Djibouti','Comoros','Mauritania'];
  const TITLES=['Student','Accountant','Senior Accountant','Financial Analyst','Senior Financial Analyst','Cost Accountant','Internal Auditor','Finance Manager','CFO','Controller','Consultant','Other'];
  const LEVELS=['Complete Beginner','Some Accounting Background','Finance Professional','CPA/ACCA Holder','Other'];
  const GOALS=['Pass CMA Part 1 Only','Pass Both Parts','Career Change','Promotion/Salary Increase','Personal Development'];

  const isComplete=!!(st&&st.name&&st.mobile);
  // Profile nudge — gentle, not a blocker
  const warningBanner=!isComplete?`<div class="profile-nudge"><span style="font-size:22px;flex-shrink:0">👋</span><div class="profile-nudge-text"><strong style="display:block;margin-bottom:2px">Complete your profile</strong>Unlock the leaderboard, community posting, and let Mohamed personalise your experience.</div><button class="profile-nudge-btn" onclick="document.getElementById('f-name')?.scrollIntoView({behavior:'smooth'})">Complete →</button></div>`:'';

  const profileSection = st && isComplete ? `
    <div style="background:linear-gradient(135deg,var(--brand),var(--brand-3));border-radius:12px;padding:16px;margin-bottom:16px;color:#fff;display:flex;align-items:center;gap:12px">
      <div style="width:52px;height:52px;border-radius:50%;overflow:hidden;flex-shrink:0;border:2px solid rgba(255,255,255,.5)">${safePhotoURL(st.photo)?`<img src="${safePhotoURL(st.photo)}" style="width:100%;height:100%;object-fit:cover">`:`<div style="width:100%;height:100%;background:rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:22px">${st.name?st.name.charAt(0).toUpperCase():'?'}</div>`}</div>
      <div style="min-width:0">
        <div style="font-size:16px;font-weight:500">${esc(st.name||'')}</div>
        <div style="font-size:12px;opacity:.85;margin-top:2px">${esc(st.title||'')}${st.company?` · ${esc(st.company)}`:''}</div>
        <div style="font-size:11px;opacity:.7;margin-top:2px">${esc(st.country||'')}${st.university?` · ${esc(st.university)}`:''}</div>
      </div>
    </div>` : `
    <div style="background:var(--brand-tint);border-radius:12px;padding:14px 16px;margin-bottom:16px;text-align:center">
      <div style="font-size:18px;margin-bottom:6px">👋</div>
      <div style="font-size:14px;font-weight:500;color:var(--brand);margin-bottom:4px">Welcome! Please complete your profile</div>
      <div style="font-size:12px;color:var(--brand-2)">This helps Mohamed track your progress and personalize your learning experience.</div>
    </div>`;

  const fval=(k)=>st?esc(st[k]||''):'';
  const fsel=(k,v)=>st&&st[k]===v?'selected':'';

  // Batch 6: profile completeness progress bar (LinkedIn-style)
  const _progFields=['name','mobile','email','country','city','university','title','company','level','goal','examdate','timezone','preferredLang','attemptType'];
  const _progFilled=_progFields.filter(k=>st&&String(st[k]||'').trim()).length;
  const _progPct=Math.round((_progFilled/_progFields.length)*100);
  const _progColor=_progPct>=80?'var(--ok-2)':(_progPct>=50?'var(--brand)':'var(--warn)');
  const progressBar=`<div class="profile-progress" style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px 16px;margin-bottom:14px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px"><div style="font-size:13px;font-weight:600;color:var(--ink)">Profile completeness</div><div style="font-size:13px;font-weight:700;color:${_progColor}">${_progPct}%</div></div><div style="height:8px;background:var(--surface-4);border-radius:4px;overflow:hidden"><div style="height:100%;width:${_progPct}%;background:${_progColor};border-radius:4px;transition:width .4s ease"></div></div><div style="font-size:11px;color:#888;margin-top:6px">${_progFilled} of ${_progFields.length} fields filled${_progPct<100?' · the more we know, the better we can personalize your prep':' · nicely done!'}</div></div>`;

  return`${renderSubNav(SUB_ME,'register')}<div class="sh"><h2>Student Profile</h2><p>${isComplete?'Your profile is complete — welcome! Tap any field to update.':'Complete your profile to get started'}</p></div>
  <div class="scroll-area pad" style="padding-top:14px">
    ${warningBanner}
    ${profileSection}
    ${progressBar}

    ${renderNotifOptInCard()}

    <div class="info-title" style="font-size:14px;margin-bottom:10px">👤 Personal Information <span style="font-size:11px;color:var(--err-2);font-weight:400">· name &amp; mobile required</span></div>
    <div class="card" style="margin-bottom:14px">
      <div style="margin-bottom:16px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:8px">Profile Photo <span style="color:#aaa">(optional)</span></label>
        <div style="display:flex;align-items:center;gap:14px">
          <div id="photo-preview" onclick="document.getElementById('f-photo').click()" style="width:80px;height:80px;border-radius:50%;border:2px dashed var(--border-4);display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;overflow:hidden;background:var(--surface-3)">
            ${st&&safePhotoURL(st.photo)?`<img src="${safePhotoURL(st.photo)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`:`<span style="font-size:24px">📷</span><span style="font-size:10px;color:#aaa;margin-top:3px">Tap to add</span>`}
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:500;color:var(--ink);margin-bottom:4px">Upload your photo</div>
            <div style="font-size:12px;color:#888;line-height:1.5;margin-bottom:8px">A clear face photo helps personalize your profile. Optional — JPG or PNG, max 2MB.</div>
            <button onclick="document.getElementById('f-photo').click()" style="padding:7px 14px;border-radius:8px;border:.5px solid var(--brand-2);background:var(--brand-tint);color:var(--brand);font-size:12px;font-weight:500;cursor:pointer;font-family:inherit">
              ${st&&st.photo?'Change Photo':'Choose Photo'}
            </button>
          </div>
        </div>
        <input type="file" id="f-photo" accept="image/*" style="display:none" onchange="handlePhoto(this)">
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Full Name *</label>
        <input id="f-name" type="text" value="${fval('name')}" placeholder="Your full name" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Mobile (WhatsApp) *</label>
          <input id="f-mobile" type="tel" value="${fval('mobile')}" placeholder="+20..." style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
        </div>
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Country</label>
          <select id="f-country" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
            <option value="">Select...</option>
            ${COUNTRIES.map(c=>`<option value="${c}" ${fsel('country',c)}>${c}</option>`).join('')}
          </select>
        </div>
      </div>
      <div>
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Email</label>
        <input id="f-email" type="email" value="${(st&&st.email)?esc(st.email):(STATE.user&&STATE.user.email?esc(STATE.user.email):'')}" placeholder="your@email.com" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
      </div>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">🎓 Education & Career <span style="font-size:11px;color:#888;font-weight:400">· optional</span></div>
    <div class="card" style="margin-bottom:14px">
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">University / Institution</label>
        <input id="f-university" type="text" value="${fval('university')}" placeholder="e.g. Cairo University" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Faculty / Major</label>
          <input id="f-faculty" type="text" value="${fval('faculty')}" placeholder="e.g. Commerce" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
        </div>
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Graduation Year</label>
          <input id="f-gradyear" type="number" value="${fval('gradyear')}" placeholder="e.g. 2020" min="1990" max="2030" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
        </div>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Current Job Title</label>
        <select id="f-title" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
          <option value="">Select your title...</option>
          ${TITLES.map(t=>`<option value="${t}" ${fsel('title',t)}>${t}</option>`).join('')}
        </select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Company / Organization</label>
          <input id="f-company" type="text" value="${fval('company')}" placeholder="Company name" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
        </div>
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Years of Experience</label>
          <input id="f-experience" type="number" value="${fval('experience')}" placeholder="e.g. 5" min="0" max="40" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
        </div>
      </div>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">👥 Group Code <span style="font-size:11px;color:#aaa;font-weight:400">· if you're in a class</span></div><div class="card" style="margin-bottom:14px"><label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Your instructor's group code</label><input id="f-groupcode" type="text" value="${fval('groupCode')}" placeholder="" oninput="this.value=this.value.toUpperCase().replace(/[^A-Z0-9\x2D]/g,'')" maxlength="20" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:'Courier New',monospace;letter-spacing:.5px;outline:none;color:var(--ink);background:var(--surface);text-transform:uppercase">${(st&&st.pendingGroupCode&&st.pendingGroupCode!==(st.groupCode||''))?`<div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:var(--warn-tint);color:var(--warn-strong);font-size:12px;font-weight:600">⏳ Pending instructor approval for ${esc(st.pendingGroupCode)}</div>`:''}<div style="font-size:11px;color:#888;margin-top:6px;line-height:1.5">Enter the code your instructor gave you to unlock your group's <b>Question of the Day</b>. Leave blank if you're studying on your own.</div></div><div class="info-title" style="font-size:14px;margin-bottom:10px">📊 CMA Study Profile <span style="font-size:11px;color:#aaa;font-weight:400">· optional</span></div>
    <div class="card" style="margin-bottom:14px">
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Your current accounting/finance level</label>
        <select id="f-level" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
          <option value="">Select level...</option>
          ${LEVELS.map(l=>`<option value="${l}" ${fsel('level',l)}>${l}</option>`).join('')}
        </select>
      </div>
      <div style="margin-bottom:12px">
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Your CMA goal</label>
        <select id="f-goal" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
          <option value="">Select goal...</option>
          ${GOALS.map(g=>`<option value="${g}" ${fsel('goal',g)}>${g}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Target exam window</label>
        <select id="f-examdate" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
          ${(()=>{const current=fval('examdate');const normalized=_normalizeExamWindow(current);const windows=_getExamWindows();return '<option value="">— Select target window —</option>'+windows.map(w=>`<option value="${w.value}" ${normalized===w.value?'selected':''}>${w.label}</option>`).join('');})()}
        </select>
        <div style="font-size:11px;color:#888;margin-top:6px;line-height:1.5">CMA testing windows: <b>Jan/Feb</b>, <b>May/Jun</b>, <b>Sep/Oct</b>. Pick the window that matches your planned test date.</div>
      </div>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">🌍 Location & Preferences <span style="font-size:11px;color:#aaa;font-weight:400">· optional</span></div>
    <div class="card" style="margin-bottom:14px">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">City</label>
          <input id="f-city" type="text" value="${fval('city')}" placeholder="e.g. Cairo, Dubai" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
        </div>
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Timezone</label>
          <select id="f-timezone" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
            <option value="">Auto-detect</option>
            <option value="Africa/Cairo" ${fsel('timezone','Africa/Cairo')}>Cairo (GMT+2)</option>
            <option value="Asia/Riyadh" ${fsel('timezone','Asia/Riyadh')}>Riyadh (GMT+3)</option>
            <option value="Asia/Dubai" ${fsel('timezone','Asia/Dubai')}>Dubai (GMT+4)</option>
            <option value="Asia/Kuwait" ${fsel('timezone','Asia/Kuwait')}>Kuwait (GMT+3)</option>
            <option value="Asia/Qatar" ${fsel('timezone','Asia/Qatar')}>Qatar (GMT+3)</option>
            <option value="Asia/Bahrain" ${fsel('timezone','Asia/Bahrain')}>Bahrain (GMT+3)</option>
            <option value="Asia/Muscat" ${fsel('timezone','Asia/Muscat')}>Muscat (GMT+4)</option>
            <option value="Africa/Casablanca" ${fsel('timezone','Africa/Casablanca')}>Casablanca (GMT+1)</option>
            <option value="Africa/Tunis" ${fsel('timezone','Africa/Tunis')}>Tunis (GMT+1)</option>
            <option value="Europe/London" ${fsel('timezone','Europe/London')}>London (GMT+0)</option>
          </select>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Preferred Language</label>
          <select id="f-preferredLang" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
            <option value="">Auto (browser)</option>
            <option value="ar" ${fsel('preferredLang','ar')}>العربية · Arabic</option>
            <option value="en" ${fsel('preferredLang','en')}>English</option>
            <option value="mixed" ${fsel('preferredLang','mixed')}>Mixed (AR+EN)</option>
          </select>
        </div>
        <div>
          <label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Exam Attempt</label>
          <select id="f-attemptType" style="width:100%;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)">
            <option value="">Select...</option>
            <option value="first" ${fsel('attemptType','first')}>First attempt</option>
            <option value="retake" ${fsel('attemptType','retake')}>Retake</option>
            <option value="review" ${fsel('attemptType','review')}>Review / Refresher</option>
          </select>
        </div>
      </div>
    </div>

    <div class="info-title" style="font-size:14px;margin-bottom:10px">⚙️ App Preferences</div><div class="card" style="margin-bottom:14px"><div style="margin-bottom:12px"><label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Font size</label><div style="display:flex;gap:6px">${['sm','md','lg'].map(v=>{const on=STATE.fontSize===v;const lbl={sm:'Small',md:'Medium',lg:'Large'}[v];return `<button onclick="saveFontSize('${v}');render()" style="flex:1;padding:10px;border-radius:8px;border:.5px solid ${on?'var(--brand)':'var(--border-4)'};background:${on?'var(--brand-tint)':'var(--surface)'};color:${on?'var(--brand)':'#555'};font-size:${v==='sm'?'12px':v==='md'?'13px':'15px'};font-weight:${on?'600':'400'};cursor:pointer;font-family:inherit">${lbl}</button>`;}).join('')}</div><div style="font-size:11px;color:#888;margin-top:4px">Applied instantly across the app.</div></div><div><label style="font-size:12px;color:#888;display:block;margin-bottom:5px">Daily study goal (minutes)</label><div style="display:flex;gap:8px;align-items:center"><input id="f-dailygoal" type="number" min="5" max="240" step="5" value="${STATE.dailyGoalMinutes||30}" style="flex:1;padding:10px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:14px;font-family:inherit;outline:none;color:var(--ink);background:var(--surface)"><button onclick="saveDailyGoal(document.getElementById('f-dailygoal').value);showToast('Goal saved ✓','success',1500)" style="padding:10px 16px;border-radius:8px;border:none;background:var(--brand);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Save</button></div><div style="font-size:11px;color:#888;margin-top:4px">Tracked on the Home screen goal ring.</div></div></div><div style="background:var(--surface-3);border-radius:10px;padding:12px 14px;margin-bottom:12px;font-size:12px;color:#888;text-align:center;line-height:1.5">
      Only <b>Name</b> and <b>Mobile</b> are required. All other fields are optional — but the more you fill in, the more we can personalize your experience.
    </div>
    <button onclick="submitProfile()" class="btn submit-profile-btn" style="background:var(--brand);color:#fff;font-size:15px;margin-bottom:8px">
      ${isComplete?'Update My Profile ✓':'Complete Profile & Unlock the App →'}
    </button>
    <div style="height:20px"></div>
  </div>`;
}

let _currentRating = loadFeedback().rating || 0;
function setRating(n){
  _currentRating = n;
  [1,2,3,4,5].forEach(i=>{
    const el=document.getElementById('star-'+i);
    if(el){el.textContent=i<=n?'⭐':'☆';el.style.opacity=i<=n?'1':'0.3';}
  });
}

function handlePhoto(input){
  const file=input.files[0];
  if(!file)return;
  if(file.size>2*1024*1024){showToast('Photo is too large. Please choose an image under 2MB.','error');input.value='';return;}
  const reader=new FileReader();
  reader.onload=function(e){
    const b64=e.target.result;
    const preview=document.getElementById('photo-preview');
    if(preview){preview.innerHTML=`<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;}
    window._pendingPhoto=b64;
  };
  reader.readAsDataURL(file);
}

async function uploadToCloudinary(base64data){
  try{
    const res=await fetch(base64data);const blob=await res.blob();
    const fd=new FormData();fd.append('file',blob);fd.append('upload_preset',CLD_PRESET);
    const r=await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`,{method:'POST',body:fd});
    const d=await r.json();return d.secure_url||null;
  }catch(e){console.log('Cloudinary error:',e);return null;}
}

async function sendToSheet(data){
  try{
    await fetch('https://script.google.com/macros/s/AKfycbwwfDLTcBC70-zpLM0bySnOZN7XzReVVLXbE-_nJr_jFmIoRNRnBa2hw1P93iCI_tMscg/exec',{
      method:'POST',
      mode:'no-cors',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(data)
    });
  }catch(e){console.log('Sheet sync error:',e);}
}

// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 7 — CMA Exam Window Helpers
// ═══════════════════════════════════════════════════════════════════════════
// The IMA offers only three CMA testing windows per year: Jan/Feb, May/Jun,
// Sep/Oct. Storage stays 'YYYY-MM' (last month of window: -02, -06, -10) so
// existing countdown code (renderIntro, renderStudy) works unchanged.
function _getExamWindows(){
  const years=[2026,2027,2028];
  const out=[];
  years.forEach(y=>{
    out.push({value:`${y}-02`, label:`Jan/Feb ${y}`});
    out.push({value:`${y}-06`, label:`May/Jun ${y}`});
    out.push({value:`${y}-10`, label:`Sep/Oct ${y}`});
  });
  return out;
}
// Migrate legacy invalid months → snap forward to next valid window.
// Accepts 'YYYY-MM'. Returns valid 'YYYY-MM' or '' if input empty/invalid shape.
function _normalizeExamWindow(v){
  if(!v||typeof v!=='string')return '';
  const m=v.match(/^(\d{4})-(\d{2})$/);
  if(!m)return '';
  const year=parseInt(m[1],10);
  const month=parseInt(m[2],10);
  // Valid target months: 2 (Jan/Feb), 6 (May/Jun), 10 (Sep/Oct)
  if(month===2||month===6||month===10)return v;
  // Snap forward to next valid window in the same year, else next year
  let ny=year, nm;
  if(month===1)nm=2;
  else if(month>=3&&month<=5)nm=6;
  else if(month>=7&&month<=9)nm=10;
  else if(month===11||month===12){ ny=year+1; nm=2; }
  else return '';
  return `${ny}-${String(nm).padStart(2,'0')}`;
}

async function submitProfile(){
  const get=(id)=>document.getElementById(id)?.value?.trim()||'';
  const name=get('f-name'),mobile=get('f-mobile'),country=get('f-country');
  const email=get('f-email')||(STATE.user&&STATE.user.email)||'';
  const university=get('f-university'),faculty=get('f-faculty'),gradyear=get('f-gradyear');
  const title=get('f-title'),company=get('f-company'),experience=get('f-experience');
  const level=get('f-level'),goal=get('f-goal');
  // Batch 7: normalize exam date to valid CMA testing window
  const examdate=_normalizeExamWindow(get('f-examdate'));
  const groupCode=(get('f-groupcode')||'').toUpperCase();
  // Batch 6: new profile fields
  const city=get('f-city');
  const timezone=get('f-timezone');
  const preferredLang=get('f-preferredLang');
  const attemptType=get('f-attemptType');
  const missing=[];
  if(!name)missing.push('Full Name');if(!mobile)missing.push('Mobile (WhatsApp)');
  const existingPhoto=loadStudent()?.photo||'';
  const pendingB64=window._pendingPhoto||'';
  if(missing.length>0){
    showModal({icon:'📋',title:'Missing Required Fields',body:'Please complete the following to continue:',list:missing,type:'warning',confirmText:'OK'});return;
  }
  // ── Batch 11: Group join-approval workflow ────────────────────────────
  // A valid code no longer writes `groupCode` directly. It's only applied
  // immediately if it matches the student's ALREADY-APPROVED group
  // (grandfathered / unchanged — re-saving the profile shouldn't re-trigger
  // approval). Any NEW code or a SWITCH to a different code goes through
  // instructor approval via a `group-requests` doc + `pendingGroupCode`.
  // Empty code = leaving / self-study — allowed directly, no approval needed.
  const _priorStudent=loadStudent();
  const currentGroupCode=(_priorStudent&&_priorStudent.groupCode||'').toUpperCase();
  const currentPending=(_priorStudent&&_priorStudent.pendingGroupCode||'').toUpperCase();
  let groupCodeToSave=currentGroupCode;
  let pendingGroupCodeToSave=_priorStudent&&_priorStudent.pendingGroupCode||'';
  let justRequestedCode='';
  if(groupCode){
    if(groupCode===currentGroupCode){
      groupCodeToSave=groupCode;   // unchanged / grandfathered — no approval needed
      pendingGroupCodeToSave='';
    }else{
      try{
        const snap=await db.collection('groups').where('code','==',groupCode).limit(1).get();
        if(snap.empty){
          showModal({
            icon:'⚠️',
            title:'Group Code Not Found',
            body:`The group code "${groupCode}" doesn't match any active group. Please check with your instructor for the correct code, or leave it blank if you're studying on your own.`,
            type:'warning',
            confirmText:'OK'
          });
          return;
        }
        // New join, or switching from a different already-approved group —
        // both go through approval. Avoid duplicate request docs if a
        // request for this exact code is already pending.
        if(groupCode!==currentPending){
          await db.collection('group-requests').add({
            uid:STATE.user.uid,
            studentName:name,studentEmail:email,studentMobile:mobile,
            groupCode,status:'pending',
            requestedAt:new Date().toISOString(),resolvedAt:null,resolvedBy:null
          });
        }
        pendingGroupCodeToSave=groupCode;
        justRequestedCode=groupCode;
        // groupCodeToSave stays at currentGroupCode — real membership only
        // changes on instructor approval.
      }catch(err){
        // Network / permission failure — don't block the rest of the save.
        console.warn('[submitProfile] group code validation skipped (network error):', err);
      }
    }
  }else{
    groupCodeToSave='';
    pendingGroupCodeToSave='';
  }
  let photoUrl=existingPhoto;
  if(pendingB64&&pendingB64.startsWith('data:')){
    try{
      const fd=new FormData();fd.append('file',pendingB64);fd.append('upload_preset',CLD_PRESET);
      const res=await fetch(`https://api.cloudinary.com/v1_1/${CLD_CLOUD}/image/upload`,{method:'POST',body:fd});
      const cldData=await res.json();
      if(cldData.secure_url){photoUrl=cldData.secure_url;}else{photoUrl=pendingB64;}
    }catch(err){photoUrl=pendingB64;}
    window._pendingPhoto=null;
  }
  saveStudent({name,mobile,email,country,city,university,faculty,gradyear,title,company,experience,level,goal,examdate,groupCode:groupCodeToSave,pendingGroupCode:pendingGroupCodeToSave,timezone,preferredLang,attemptType,photo:photoUrl,registeredAt:loadStudent()?.registeredAt||new Date().toISOString()});
  STATE.showProfileWarning=false;
  try{STATE.qotdState={dateKey:'',question:null,selected:null,answered:false,taughtUnitCount:0};ensureQotd();}catch(e){}

  // Send to Google Sheets
  const fb2=loadFeedback();
  sendToSheet({
    name,mobile,email,country,city,university,faculty,gradyear,
    title,company,experience,level,goal,examdate,
    timezone,preferredLang,attemptType,
    photo:photoUrl||'No Photo'
  });

  render();
  setTimeout(()=>{
    const el=document.getElementById('content-area');
    if(el)el.scrollTop=0;
  },50);
  // Batch 11: let the student know a join/switch request is pending.
  const _pendingNote=justRequestedCode?`<br><br>⏳ Your request to join group <b>${esc(justRequestedCode)}</b> is pending your instructor's approval. You'll get full access to that group once approved.`:'';
  showModal({icon:'🎓',title:'Welcome Aboard!',body:"Great to have you here. I've received your info and I'm ready to help you pass the CMA. Let's get to work! — Gawad"+_pendingNote,type:'success',confirmText:'Let\'s Go 🚀'});
}

async function navTo(tab){
  // End any active study session when navigating away
  if(tab!=='study'&&tab!=='quiz-session') endStudyTimer();
  if(STATE.mockExam&&(STATE.mockExam.status==='mcq'||STATE.mockExam.status==='cbq')&&tab!=='mock-exam'){
    const _leaveOk=await showModal({icon:'⚠️',title:'Leave Exam?',body:'Your timer will stop and all progress will be lost.',type:'warning',confirmText:'Leave Exam',cancelText:'Stay'});
    if(!_leaveOk)return;
    mockClearTimers();STATE.mockExam.status='idle';
  }
  // Auth guard — only login/onboarding are accessible without sign-in
  if(!STATE.user&&tab!=='login'&&tab!=='loading'&&tab!=='onboarding'){
    STATE.tab='login';render();return;
  }
  STATE.showProfileWarning=false;
  if(tab==='lessons'&&tab!==STATE.tab){STATE.sectId=null;STATE.lessonId=null;}
  if(tab==='community'){STATE.communityLoaded=false;}
  STATE.tab=tab;render();
}
// ─── AUTH STATE LISTENER ──────────────────────────────────────────────────────
// ── PWA: Register Service Worker + Auto-Update ────────────────────────────────
if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{

    // Batch 4: handle deep-link intents posted by the SW notificationclick.
    navigator.serviceWorker.addEventListener('message', ev=>{
      if(ev.data && ev.data.type==='DEEP_LINK' && ev.data.target){
        try{navTo(ev.data.target);}catch(e){}
      }
    });

    navigator.serviceWorker.register('./sw.js',{scope:'./'})
      .then(reg=>{
        console.log('[SW] Registered, scope:', reg.scope);

        // ── Helper: tell the waiting SW to take over, then reload ──────────
        function activateWaitingAndReload(worker){
          worker.postMessage({type:'SKIP_WAITING'});
        }

        // ── When controller changes (new SW activated) → reload the page ───
        let reloading = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if(reloading) return;
          reloading = true;
          console.log('[SW] New version activated — reloading…');
          window.location.reload();
        });

        // ── If a new SW is already waiting right now (e.g. revisit) ────────
        if(reg.waiting){
          activateWaitingAndReload(reg.waiting);
          return;
        }

        // ── Watch for a new SW that installs while the page is open ────────
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if(!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if(newWorker.state === 'installed' && navigator.serviceWorker.controller){
              console.log('[SW] Update ready — activating…');
              activateWaitingAndReload(newWorker);
            }
          });
        });

        // ── Poll for updates on every page load ────────────────────────────
        reg.update();

        // ── Poll every 5 minutes so long sessions auto-update ──────────────
        setInterval(()=>{ reg.update(); }, 5 * 60 * 1000);
      })
      .catch(err => console.warn('[SW] Registration failed:', err));

    // Show install banner on mobile if not already installed/dismissed
    updateInstallBanner();
  });
}


// ════════════════════════════════════════════════════════════════
// CBQ — EMBEDDED CASE-BASED QUESTIONS
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// Change 2: CBQ data moved to cbq-data.js — removes 412 lines from main file
// cbq-data.js must be loaded BEFORE this script tag

const CBQ_SEC_KEYS = ['A','B','C','D','E','F']; // Batch 6: alphabetical
const CBQ_SEC_META = {
  C:{title:'Performance Management',color:'var(--accent-purple)'},
  D:{title:'Cost Management',color:'var(--warn-strong)'},
  A:{title:'External Financial Reporting',color:'var(--brand)'},
  B:{title:'Planning, Budgeting & Forecasting',color:'var(--brand-2)'},
  E:{title:'Internal Controls',color:'var(--ok)'},
  F:{title:'Technology & Analytics',color:'#534AB7'},
};

// Batch 7 (B7-01): persist CBQ scores across reloads. scores was memory-only
// before, so every refresh reset cases to "Not attempted". Hydrate on load,
// save on every graded case (see cbqCheck()).
function cbqLoadScores(){try{return JSON.parse(localStorage.getItem('cma-cbq-scores-v1'))||{};}catch{return{};}}
function cbqSaveScores(){try{localStorage.setItem('cma-cbq-scores-v1',JSON.stringify(CBQ_S.scores));}catch{}}
let CBQ_S = { secIdx:0, view:'list', cbqIdx:0, answers:{}, checked:false, scores:cbqLoadScores() };
let cbqDragItem=null, cbqDragFromZone=null, cbqDragQid=null;

function renderCBQ(){
  return `<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
    <div style="padding:14px 16px 12px;border-bottom:.5px solid var(--border);flex-shrink:0;background:#fff">
      <div style="display:flex;align-items:center;gap:10px">
        <button style="background:none;border:none;cursor:pointer;font-size:26px;color:#888;padding:0;line-height:1;font-family:inherit;flex-shrink:0" onclick="cbqGoBack()">‹</button>
        <div style="flex:1"><div id="hTitle" style="font-size:17px;font-weight:600;color:var(--ink)">🧩 CBQ Practice</div><div id="hSub" style="font-size:13px;color:#888;margin-top:3px">Case-Based Questions — New 2026 Format</div></div>
      </div>
    </div>
    <div class="cbq-sec-tabs" id="secTabs">
      <button class="cbq-sec-tab active" onclick="cbqSetSection(0)">📊 Section C</button>
      <button class="cbq-sec-tab" onclick="cbqSetSection(1)">💰 Section D</button>
      <button class="cbq-sec-tab" onclick="cbqSetSection(2)">📋 Section A</button>
      <button class="cbq-sec-tab" onclick="cbqSetSection(3)">📅 Section B</button>
      <button class="cbq-sec-tab" onclick="cbqSetSection(4)">🔒 Section E</button>
      <button class="cbq-sec-tab" onclick="cbqSetSection(5)">💡 Section F</button>
    </div>
    <div id="scrollArea" style="flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;padding-bottom:20px">
      <div id="listView"></div>
      <div id="detailView" class="hidden"></div>
      <div id="resultsView" class="hidden"></div>
    </div>
    <div class="cbq-bottom-bar hidden" id="bottomBar">
      <span class="score-pill" id="scorePill">0 / 0</span>
      <button class="cbq-btn cbq-btn-primary" id="mainBtn" onclick="cbqMainAction()">Check Answers</button>
    </div>
  </div>`;
}

function cbqInit(){ CBQ_S.view='list'; cbqRenderList(); }

function cbqShow(id){const e=document.getElementById(id);if(e)e.classList.remove('hidden');}
function cbqHide(id){const e=document.getElementById(id);if(e)e.classList.add('hidden');}
function cbqSet(id,txt){const e=document.getElementById(id);if(e)e.textContent=txt;}
function cbqSetBtn(label,cls,fn){const b=document.getElementById('mainBtn');if(!b)return;b.textContent=label;b.className=cls;b.onclick=fn;}

function cbqSetSection(i){
  CBQ_S.secIdx=i; CBQ_S.view='list'; CBQ_S.checked=false;
  document.querySelectorAll('.cbq-sec-tab').forEach((t,j)=>t.classList.toggle('active',i===j));
  cbqRenderList();
}

function cbqGoBack(){
  if(CBQ_S.view==='list') navTo('intro');
  else cbqRenderList();
}

function cbqRenderList(){
  CBQ_S.view='list';
  cbqShow('listView'); cbqHide('detailView'); cbqHide('resultsView');
  cbqShow('secTabs'); cbqHide('bottomBar');
  cbqSet('hTitle','🧩 CBQ Practice');
  cbqSet('hSub','Case-Based Questions — New 2026 Format');

  const key=CBQ_SEC_KEYS[CBQ_S.secIdx];
  const meta=CBQ_SEC_META[key];
  const cbqs=CBQ_DATA[key];

  if(!cbqs||!cbqs.length){
    document.getElementById('listView').innerHTML=`<div style="text-align:center;padding:50px 20px"><div style="font-size:40px;margin-bottom:12px">🚧</div><div style="font-size:17px;font-weight:600;margin-bottom:8px">Coming Soon</div><div style="font-size:14px;color:#888">CBQs for Section ${key} are being prepared.</div></div>`;
    return;
  }
  const totalQs=cbqs.reduce((a,c)=>a+c.questions.length,0);
  document.getElementById('listView').innerHTML=`<div class="cbq-list">
    <div style="margin-bottom:12px"><div style="font-size:13px;font-weight:600;color:${meta.color}">Section ${key} — ${meta.title}</div><div style="font-size:13px;color:#888;margin-top:3px">${cbqs.length} Case-Based Questions · ${totalQs} sub-questions</div></div>
    ${cbqs.map((c,i)=>{const sc=CBQ_S.scores[c.id];const pct=sc?Math.round(sc.s/sc.t*100):null;const badge=sc?(pct>=70?`<span class="cbq-badge" style="background:var(--ok-tint);color:var(--ok-strong)">✓ ${sc.s}/${sc.t} (${pct}%)</span>`:`<span class="cbq-badge" style="background:var(--warn-tint);color:var(--warn-strong)">⚑ ${sc.s}/${sc.t} (${pct}%)</span>`):`<span class="cbq-badge" style="background:var(--brand-tint);color:var(--brand-2)">Not attempted</span>`;
    return`<div class="cbq-card" onclick="cbqOpen(${i})"><div class="cbq-card-top"><div class="cbq-num">${c.num}</div><div style="flex:1"><div style="font-size:15px;font-weight:600;color:var(--ink);margin-bottom:2px">${c.title}</div><div style="font-size:13px;color:#888">${c.topics}</div></div><span style="font-size:22px;color:#ccc">›</span></div><div style="display:flex;gap:8px;flex-wrap:wrap">${badge}<span class="cbq-badge" style="background:var(--bg);color:#555">${c.questions.length} questions</span></div></div>`;
    }).join('')}
  </div>`;
}

function cbqOpen(i){CBQ_S.cbqIdx=i;CBQ_S.view='detail';CBQ_S.checked=false;CBQ_S.answers={};cbqRenderDetail();}

function cbqRenderDetail(){
  const cbq=CBQ_DATA[CBQ_SEC_KEYS[CBQ_S.secIdx]][CBQ_S.cbqIdx];
  cbqHide('listView');cbqHide('resultsView');cbqShow('detailView');cbqHide('secTabs');cbqShow('bottomBar');
  cbqSet('hTitle',`CBQ ${cbq.num} / ${CBQ_DATA[CBQ_SEC_KEYS[CBQ_S.secIdx]].length}`);
  cbqSet('hSub',cbq.title);
  cbqSetBtn('Check Answers','cbq-btn cbq-btn-primary',cbqMainAction);
  cbqUpdatePill(cbq);
  document.getElementById('detailView').innerHTML=cbqRenderCase(cbq)+cbq.questions.map((q,i)=>cbqRenderQ(q,i)).join('')+'<div style="height:8px"></div>';
  cbqSetupDrag();
  document.getElementById('scrollArea').scrollTop=0;
}

function cbqRenderCase(cbq){
  const ex=cbq.exhibit?`<div class="exhibit-wrap"><div style="font-size:11px;font-weight:700;color:var(--brand-2);letter-spacing:.6px;padding:6px 12px;background:var(--brand-tint);border-bottom:.5px solid #c0d4ea">📊 EXHIBIT</div><table class="exhibit-tbl"><tr>${cbq.exhibit.headers.map(h=>`<th>${h}</th>`).join('')}</tr>${cbq.exhibit.rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i>0?'num':''}">${c}</td>`).join('')}</tr>`).join('')}</table></div>`:'';
  return`<div class="case-box"><div class="case-label">📄 CASE STUDY</div><div class="case-text">${cbq.case.replace(/\n/g,'<br>')}</div>${ex}</div>`;
}

function cbqRenderQ(q,idx){
  const types={calc:'CALCULATION',select:'SELECT FROM LIST',drag:'DRAG & DROP',blank:'FILL IN BLANK'};
  let body='';
  if(q.type==='calc') body=`<div class="calc-wrap"><span class="calc-prefix">${q.pre||'$'}</span><input type="number" class="calc-input" id="inp_${q.id}" placeholder="0" step="any" oninput="CBQ_S.answers['${q.id}']=this.value"><span style="font-size:14px;color:#888">${q.suf||''}</span></div>`;
  else if(q.type==='select') body=`<div class="select-opts">${q.opts.map((o,i)=>`<div class="select-opt" id="so_${q.id}_${i}" onclick="cbqPickOpt('${q.id}',${i})">${o}</div>`).join('')}</div>`;
  else if(q.type==='drag') body=cbqRenderDragQ(q);
  else if(q.type==='blank') body=cbqRenderBlankQ(q);
  return`<div class="q-block" id="qb_${q.id}"><div class="q-header"><div class="q-num">${idx+1}</div><div style="flex:1"><div style="display:flex;gap:8px;align-items:center;margin-bottom:5px"><span class="q-type-badge">${types[q.type]}</span></div><div class="q-text">${q.text}</div>${q.hint?`<div style="font-size:12px;color:#888;margin-top:4px;font-style:italic">💡 ${q.hint}</div>`:''}</div></div><div class="q-body">${body}<div class="q-fb" id="fb_${q.id}"></div></div></div>`;
}

function cbqRenderDragQ(q){
  const chips=q.items.map(it=>`<div class="drag-chip" data-qid="${q.id}" data-item="${it}" id="chip_${q.id}_${it.replace(/\W/g,'_')}" draggable="true">${it}</div>`).join('');
  const zones=q.zones.map(z=>`<div class="drag-col"><div class="drag-col-label">${z}</div><div class="drop-zone" id="zone_${q.id}_${z.replace(/\W/g,'_')}"></div></div>`).join('');
  return`<div id="dsrc_${q.id}" class="drag-source">${chips}</div><div class="drag-area">${zones}</div>`;
}

function cbqRenderBlankQ(q){
  let txt=q.text;
  q.blanks.forEach(b=>{
    const opts=b.opts.map(o=>`<option value="${o}">${o}</option>`).join('');
    txt=txt.replace(`[${b.id}]`,`<select class="blank-sel" id="bl_${q.id}_${b.id}" onchange="cbqSetBlank('${q.id}','${b.id}',this.value)"><option value="">—select—</option>${opts}</select>`);
  });
  return`<div class="blank-sentence">${txt}</div>`;
}

function cbqPickOpt(qid,i){
  if(CBQ_S.checked)return;
  CBQ_S.answers[qid]=i;
  document.querySelectorAll(`[id^="so_${qid}_"]`).forEach((el,j)=>el.classList.toggle('selected',j===i));
}

function cbqSetBlank(qid,bid,val){
  if(!CBQ_S.answers[qid])CBQ_S.answers[qid]={};
  CBQ_S.answers[qid][bid]=val;
}

function cbqSetupDrag(){
  document.querySelectorAll('.drag-chip').forEach(chip=>{
    chip.addEventListener('dragstart',e=>{
      cbqDragItem=chip.dataset.item; cbqDragQid=chip.dataset.qid;
      cbqDragFromZone=chip.parentElement.id.startsWith('zone_')?chip.parentElement:null;
      e.dataTransfer.effectAllowed='move'; chip.style.opacity='.4';
    });
    chip.addEventListener('dragend',e=>{chip.style.opacity='1';});
  });
  document.querySelectorAll('.drop-zone').forEach(zone=>{
    zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('over');});
    zone.addEventListener('dragleave',()=>zone.classList.remove('over'));
    zone.addEventListener('drop',e=>{
      e.preventDefault();zone.classList.remove('over');
      if(!cbqDragItem)return;
      const parts=zone.id.split('_');parts.shift();parts.shift();
      const q=CBQ_DATA[CBQ_SEC_KEYS[CBQ_S.secIdx]][CBQ_S.cbqIdx].questions.find(x=>x.id===cbqDragQid);
      const matchedZone=q?q.zones.find(z=>z.replace(/\W/g,'_')===parts.join('_')):null;
      if(!matchedZone)return;
      if(!CBQ_S.answers[cbqDragQid])CBQ_S.answers[cbqDragQid]={};
      CBQ_S.answers[cbqDragQid][cbqDragItem]=matchedZone;
      const chip=document.getElementById(`chip_${cbqDragQid}_${cbqDragItem.replace(/\W/g,'_')}`);
      if(chip)zone.appendChild(chip);
      cbqDragItem=null;cbqDragQid=null;
    });
  });
}

function cbqMainAction(){
  if(!CBQ_S.checked) cbqCheck();
  else cbqNextOrResults();
}

function cbqCheck(){
  CBQ_S.checked=true;
  const cbq=CBQ_DATA[CBQ_SEC_KEYS[CBQ_S.secIdx]][CBQ_S.cbqIdx];
  let score=0;
  cbq.questions.forEach(q=>{
    let ok=false;
    const a=CBQ_S.answers[q.id];
    if(q.type==='calc'){
      const n=parseFloat((a+'').replace(/,/g,''));
      ok=!isNaN(n)&&Math.abs(n-q.exact)<=(q.tol||1);
      const el=document.getElementById(`inp_${q.id}`);
      if(el){el.classList.add(ok?'correct':'wrong');el.disabled=true;}
    } else if(q.type==='select'){
      ok=parseInt(a)===q.ans;
      document.querySelectorAll(`[id^="so_${q.id}_"]`).forEach((el,i)=>{
        if(i===q.ans)el.classList.add('correct');
        else if(i===parseInt(a)&&!ok)el.classList.add('wrong');
      });
    } else if(q.type==='drag'){
      const placed=a||{};
      ok=q.items.every(it=>placed[it]===q.correct[it]);
      q.zones.forEach(z=>{
        const zEl=document.getElementById(`zone_${q.id}_${z.replace(/\W/g,'_')}`);
        if(zEl){const exp=q.items.filter(it=>q.correct[it]===z);const got=q.items.filter(it=>(placed[it]||'')===z);const zOk=exp.length===got.length&&exp.every(it=>got.includes(it));zEl.classList.add(zOk?'correct':'wrong');}
      });
    } else if(q.type==='blank'){
      const placed=a||{};
      ok=q.blanks.every(b=>placed[b.id]===b.ans);
      q.blanks.forEach(b=>{
        const el=document.getElementById(`bl_${q.id}_${b.id}`);
        if(el){el.classList.add(placed[b.id]===b.ans?'correct':'wrong');el.disabled=true;}
      });
    }
    if(ok)score++;
    const fb=document.getElementById(`fb_${q.id}`);
    if(fb){fb.textContent=(ok?'✅ Correct! ':'❌ Incorrect. ')+q.fb;fb.className=`q-fb show ${ok?'ok':'no'}`;}
  });
  CBQ_S.scores[cbq.id]={s:score,t:cbq.questions.length};
  cbqSaveScores(); // Batch 7 (B7-01)
  cbqUpdatePill(cbq);
  const hasNext=CBQ_S.cbqIdx<CBQ_DATA[CBQ_SEC_KEYS[CBQ_S.secIdx]].length-1;
  cbqSetBtn(hasNext?'Next Case →':'View Results',`cbq-btn ${score/cbq.questions.length>=0.7?'cbq-btn-success':'cbq-btn-primary'}`,cbqMainAction);
}

function cbqNextOrResults(){
  const cbqs=CBQ_DATA[CBQ_SEC_KEYS[CBQ_S.secIdx]];
  if(CBQ_S.cbqIdx<cbqs.length-1){CBQ_S.cbqIdx++;CBQ_S.checked=false;CBQ_S.answers={};cbqRenderDetail();}
  else cbqRenderResults();
}

function cbqUpdatePill(cbq){
  const sc=CBQ_S.scores[cbq.id];
  const el=document.getElementById('scorePill');
  if(el)el.textContent=sc?`${sc.s} / ${sc.t}`:`0 / ${cbq.questions.length}`;
}

function cbqRenderResults(){
  CBQ_S.view='results';
  cbqHide('listView');cbqHide('detailView');cbqShow('resultsView');cbqHide('secTabs');cbqShow('bottomBar');
  cbqSet('hTitle','Results');cbqSet('hSub',CBQ_SEC_META[CBQ_SEC_KEYS[CBQ_S.secIdx]].title);
  const key=CBQ_SEC_KEYS[CBQ_S.secIdx];const cbqs=CBQ_DATA[key];
  let ts=0,tt=0;
  cbqs.forEach(c=>{const sc=CBQ_S.scores[c.id];if(sc){ts+=sc.s;tt+=sc.t;}});
  const pct=tt?Math.round(ts/tt*100):0;
  const icon=pct>=80?'🏆':pct>=60?'📈':'📚';
  const msg=pct>=80?'Excellent!':pct>=60?'Good progress!':'Keep practicing!';
  document.getElementById('resultsView').innerHTML=`<div style="padding:20px 16px;text-align:center">
    <div style="font-size:52px;margin-bottom:10px">${icon}</div>
    <div style="font-size:22px;font-weight:700;color:var(--ink);margin-bottom:4px">${msg}</div>
    <div style="font-size:14px;color:#888;margin-bottom:18px">Section ${key} — ${CBQ_SEC_META[key].title}</div>
    <div class="res-grid">
      <div class="res-stat"><div class="res-stat-l">Score</div><div class="res-stat-v" style="color:var(--brand-2)">${pct}%</div></div>
      <div class="res-stat"><div class="res-stat-l">Correct</div><div class="res-stat-v" style="color:var(--ok)">${ts}</div></div>
      <div class="res-stat"><div class="res-stat-l">Questions</div><div class="res-stat-v">${tt}</div></div>
    </div>
    ${cbqs.map(c=>{const sc=CBQ_S.scores[c.id];const p=sc?Math.round(sc.s/sc.t*100):0;
    return`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:.5px solid var(--bg);text-align:left">
      <div style="width:32px;height:32px;border-radius:8px;background:var(--brand-tint);display:flex;align-items:center;justify-content:center;font-size:14px;font-weight:700;color:var(--brand);flex-shrink:0">${c.num}</div>
      <div style="flex:1"><div style="font-size:14px;font-weight:500;margin-bottom:4px">${c.title}</div>
      <div style="height:5px;background:var(--bg);border-radius:3px;overflow:hidden"><div style="height:100%;width:${p}%;background:${p>=70?'var(--ok)':'var(--err)'};border-radius:3px"></div></div></div>
      <div style="font-size:13px;font-weight:700;color:${p>=70?'var(--ok-strong)':'var(--err-strong)'};flex-shrink:0">${sc?sc.s+'/'+sc.t:'—'}</div>
    </div>`;}).join('')}
  </div>`;
  const sp=document.getElementById('scorePill');if(sp)sp.textContent=`${ts} / ${tt}`;
  cbqSetBtn('Try Again','cbq-btn cbq-btn-primary',()=>{CBQ_S.scores={};cbqRenderList();});
}
// ════ END CBQ ════


// ════════════════════════════════════════════════════════════════
// MOCK EXAM SIMULATOR
// CMA Part 1: 100 MCQs / 3 hrs → 2 CBQs / 1 hr
// ════════════════════════════════════════════════════════════════

function mockShuffle(arr){
  const a=[...arr];
  for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

function mockFmtTime(s){
  const h=Math.floor(s/3600),m=Math.floor((s%3600)/60),ss=s%60;
  if(h>0)return`${h}:${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  return`${String(m).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}

// ── State ─────────────────────────────────────────────────────
if(!STATE.mockExam)STATE.mockExam={status:'idle',mcqQ:[],mcqA:{},mcqFlagged:[],mcqCurr:0,mcqTime:10800,mcqInterval:null,cbqCases:[],cbqA:{},cbqScores:{},cbqCurr:0,cbqTime:3600,cbqInterval:null,results:null,navOpen:false};

function mockClearTimers(){
  if(STATE.mockExam.mcqInterval){clearInterval(STATE.mockExam.mcqInterval);STATE.mockExam.mcqInterval=null;}
  if(STATE.mockExam.cbqInterval){clearInterval(STATE.mockExam.cbqInterval);STATE.mockExam.cbqInterval=null;}
}

// ── Question selection ─────────────────────────────────────────
// Batch 10: single source of truth for scope exclusion. Two levels:
//  - lesson-level: the whole unit is out of Part 1 scope (e.g. 4-14 Variances is
//    Part 2; 4-14 variances belong to Section C / app section 3)
//  - question-level: a handful of questions inside an otherwise in-scope
//    lesson are themselves out of scope (e.g. the 3 Theory-of-Constraints
//    questions inside 4-20, which is 90% legitimate Part 1 Process Analysis
//    content). Flagging the whole lesson would wrongly exclude the rest.
// Used at every pool-building site (mock exam, quiz mode, exam builder,
// exam re-shuffle) so Part-2 content never reaches a student-facing pool.
function isOutOfScopeQ(lesson,q){
  return !!(lesson.outOfScope || (q&&q.outOfScope));
}
function mockSelectMCQ(){
  const qs=[];
  S.forEach(sec=>{
    let pool=[];
    sec.lessons.forEach(l=>{if(l.outOfScope)return;if(l.quizzes&&l.quizzes.length)l.quizzes.forEach(q=>{if(isOutOfScopeQ(l,q))return;pool.push({...q,sid:sec.id,stitle:sec.title,sbar:sec.bar,sweight:sec.weight});});});
    pool=mockShuffle(pool);
    qs.push(...pool.slice(0,sec.weight));
  });
  return mockShuffle(qs);
}

function mockSelectCBQ(){
  let pool=[];
  CBQ_SEC_KEYS.forEach(k=>{if(CBQ_DATA[k])CBQ_DATA[k].forEach(c=>pool.push({...c,sk:k}));});
  return mockShuffle(pool).slice(0,2);
}

// ── Start ──────────────────────────────────────────────────────
async function startMockExam(){
  STATE.mockExam.status='loading';render();
  for(let i=1;i<=6;i++)await ensureQuizzes(i);
  STATE.mockExam={
    status:'mcq',
    mcqQ:mockSelectMCQ(),mcqA:{},mcqFlagged:[],mcqCurr:0,mcqTime:10800,mcqInterval:null,
    cbqCases:mockSelectCBQ(),cbqA:{},cbqScores:{},cbqCurr:0,cbqTime:3600,cbqInterval:null,
    results:null,navOpen:false
  };
  render();
  STATE.mockExam.mcqInterval=setInterval(()=>{
    if(STATE.tab!=='mock-exam'){mockClearTimers();return;}
    STATE.mockExam.mcqTime--;
    const tel=document.getElementById('mock-timer');
    if(tel){tel.textContent=mockFmtTime(STATE.mockExam.mcqTime);tel.style.color=STATE.mockExam.mcqTime<300?'var(--err)':'var(--ink)';}
    mockUpdateNav();
    if(STATE.mockExam.mcqTime<=0){clearInterval(STATE.mockExam.mcqInterval);STATE.mockExam.mcqInterval=null;mockSubmitMCQ(true);}
  },1000);
}

// ── MCQ Interactions ───────────────────────────────────────────
function mockAnswerQ(idx,opt){
  if(STATE.mockExam.mcqA[idx]===opt){delete STATE.mockExam.mcqA[idx];}
  else STATE.mockExam.mcqA[idx]=opt;
  // Re-render the question content so inline styles reflect the new selection
  renderMockMCQContent();
}

function mockFlagQ(idx){
  const fi=STATE.mockExam.mcqFlagged.indexOf(idx);
  if(fi>=0)STATE.mockExam.mcqFlagged.splice(fi,1);
  else STATE.mockExam.mcqFlagged.push(idx);
  const btn=document.getElementById('mock-flag-btn');
  if(btn){btn.textContent=STATE.mockExam.mcqFlagged.includes(idx)?'🚩 Flagged':'⚑ Flag';}
  mockUpdateNav();
}

function mockGoToQ(idx){
  STATE.mockExam.mcqCurr=idx;
  STATE.mockExam.navOpen=false;
  renderMockMCQContent();
}

function mockNavToggle(){STATE.mockExam.navOpen=!STATE.mockExam.navOpen;renderMockMCQContent();}

function mockUpdateNav(){
  const grid=document.getElementById('mock-nav-grid');
  if(!grid)return;
  const{mcqQ,mcqA,mcqFlagged,mcqCurr}=STATE.mockExam;
  grid.innerHTML=mcqQ.map((_,i)=>{
    const ans=mcqA[i]!==undefined,flag=mcqFlagged.includes(i),cur=i===mcqCurr;
    const bg=cur?'var(--brand)':flag?'var(--warn)':ans?'var(--brand-2)':'var(--bg)';
    const col=cur||ans?'#fff':flag?'#fff':'#555';
    return`<button onclick="mockGoToQ(${i})" style="width:32px;height:32px;border-radius:6px;border:none;cursor:pointer;font-size:12px;font-weight:600;background:${bg};color:${col};font-family:inherit">${i+1}</button>`;
  }).join('');
  const answered=Object.keys(mcqA).length;
  const prog=document.getElementById('mock-prog');
  if(prog)prog.textContent=`${answered}/100 answered · ${mcqFlagged.length} flagged`;
}

function renderMockMCQContent(){
  const cont=document.getElementById('mock-mcq-content');
  if(!cont)return;
  const{mcqQ,mcqA,mcqFlagged,mcqCurr,navOpen}=STATE.mockExam;
  const q=mcqQ[mcqCurr];
  if(!q)return;
  const flagged=mcqFlagged.includes(mcqCurr);
  const answered=mcqA[mcqCurr];
  const labels=['A','B','C','D'];

  cont.innerHTML=`
  <div style="flex:1;overflow-y:auto;padding:16px">
    ${navOpen?`<div style="background:var(--surface);border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:14px">
      <div style="font-size:12px;font-weight:600;color:#555;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">
        <span>Question Navigator</span><span id="mock-prog" style="font-size:11px;color:#888"></span>
      </div>
      <div id="mock-nav-grid" style="display:grid;grid-template-columns:repeat(10,1fr);gap:4px"></div>
      <div style="margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;font-size:11px;color:#888">
        <span>🟦 Answered</span><span>🟧 Flagged</span><span>⬜ Unanswered</span><span style="background:var(--brand);color:#fff;padding:1px 6px;border-radius:3px">Current</span>
      </div>
    </div>`:''}
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <span style="font-size:12px;font-weight:600;color:${q.sbar};background:${q.sbar}18;padding:3px 10px;border-radius:10px">${q.stitle}</span>
      <button id="mock-flag-btn" onclick="mockFlagQ(${mcqCurr})" style="border:none;background:none;cursor:pointer;font-size:13px;font-weight:600;color:${flagged?'var(--warn)':'#888'};font-family:inherit;padding:4px 8px;border-radius:8px;border:.5px solid ${flagged?'var(--warn)':'var(--border-3)'}">${flagged?'🚩 Flagged':'⚑ Flag'}</button>
    </div>
    <div style="font-size:15px;font-weight:500;color:var(--ink);line-height:1.6;margin-bottom:18px">${stemHTML(q.q)}</div>
    ${typeof dataTableHTML==='function'?dataTableHTML(q):''}
    ${askHTML(q)}
    <div style="display:flex;flex-direction:column;gap:9px" id="mock-opts">
      ${q.o.map((opt,i)=>{
        const sel=answered===i;
        return`<div class="mock-opt" onclick="mockAnswerQ(${mcqCurr},${i})" style="padding:12px 14px;border-radius:10px;border:.5px solid ${sel?'var(--brand-2)':'var(--border-3)'};background:${sel?'var(--brand-tint)':'var(--surface)'};cursor:pointer;display:flex;gap:12px;align-items:flex-start;transition:all .15s">
          <span style="width:22px;height:22px;border-radius:50%;background:${sel?'var(--brand-2)':'var(--border)'};color:${sel?'#fff':'#555'};display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:700;flex-shrink:0">${labels[i]}</span>
          <span style="font-size:14px;color:${sel?'var(--brand)':'#333'};font-weight:${sel?'500':'400'};line-height:1.45">${opt}</span>
        </div>`;
      }).join('')}
    </div>
  </div>
  <div style="padding:12px 16px;border-top:.5px solid var(--border);background:#fff;flex-shrink:0;display:flex;gap:10px;align-items:center">
    <button onclick="mockGoToQ(${Math.max(0,mcqCurr-1)})" ${mcqCurr===0?'disabled':''} style="padding:10px 16px;border-radius:10px;border:.5px solid var(--border-3);background:#fff;cursor:pointer;font-size:14px;font-family:inherit;opacity:${mcqCurr===0?'.4':'1'}">← Prev</button>
    <button onclick="mockNavToggle()" style="flex:1;padding:10px;border-radius:10px;border:.5px solid var(--border-3);background:var(--surface-3);cursor:pointer;font-size:13px;font-weight:500;font-family:inherit"># ${mcqCurr+1}/100</button>
    ${mcqCurr<99?`<button onclick="mockGoToQ(${mcqCurr+1})" style="padding:10px 16px;border-radius:10px;border:none;background:var(--brand-2);color:#fff;cursor:pointer;font-size:14px;font-family:inherit;font-weight:500">Next →</button>`
    :`<button onclick="mockConfirmSubmitMCQ()" style="padding:10px 16px;border-radius:10px;border:none;background:var(--ok);color:#fff;cursor:pointer;font-size:14px;font-family:inherit;font-weight:600">Submit ✓</button>`}
  </div>`;
  mockUpdateNav();
}

async function mockConfirmSubmitMCQ(){
  const answered=Object.keys(STATE.mockExam.mcqA).length;
  const unanswered=100-answered;
  const _submitOk=await showModal({
    icon: unanswered>0?'⚠️':'📋',
    title: unanswered>0?`${unanswered} Question${unanswered>1?'s':''} Unanswered`:'Submit MCQ Phase?',
    body: unanswered>0?`You have ${unanswered} unanswered question${unanswered>1?'s':''}. You can still submit — unanswered questions count as wrong.`:'Submit all 100 answers and move to the CBQ phase?',
    type: unanswered>0?'warning':'info',
    confirmText:'Submit',
    cancelText:'Go Back'
  });
  if(_submitOk)mockSubmitMCQ(false);
}

function mockSubmitMCQ(autoSubmit){
  mockClearTimers();
  STATE.mockExam.status='cbq';
  render();
  STATE.mockExam.cbqInterval=setInterval(()=>{
    if(STATE.tab!=='mock-exam'){mockClearTimers();return;}
    STATE.mockExam.cbqTime--;
    const tel=document.getElementById('mock-timer');
    if(tel){tel.textContent=mockFmtTime(STATE.mockExam.cbqTime);tel.style.color=STATE.mockExam.cbqTime<300?'var(--err)':'var(--ink)';}
    if(STATE.mockExam.cbqTime<=0){clearInterval(STATE.mockExam.cbqInterval);STATE.mockExam.cbqInterval=null;mockSubmitCBQ();}
  },1000);
}

// ── CBQ Interactions in Mock ────────────────────────────────────
function mockCBQPickOpt(caseIdx,qid,i){
  if(!STATE.mockExam.cbqA[caseIdx])STATE.mockExam.cbqA[caseIdx]={};
  STATE.mockExam.cbqA[caseIdx][qid]=i;
  document.querySelectorAll(`[id^="mso_${caseIdx}_${qid}_"]`).forEach((el,j)=>el.classList.toggle('selected',j===i));
}

function mockCBQSetBlank(caseIdx,qid,bid,val){
  if(!STATE.mockExam.cbqA[caseIdx])STATE.mockExam.cbqA[caseIdx]={};
  if(!STATE.mockExam.cbqA[caseIdx][qid])STATE.mockExam.cbqA[caseIdx][qid]={};
  STATE.mockExam.cbqA[caseIdx][qid][bid]=val;
}

function mockCBQCheck(caseIdx){
  const cbq=STATE.mockExam.cbqCases[caseIdx];
  const answers=STATE.mockExam.cbqA[caseIdx]||{};
  let score=0;
  cbq.questions.forEach(q=>{
    let ok=false;
    const a=answers[q.id];
    if(q.type==='calc'){const n=parseFloat((a+'').replace(/,/g,''));ok=!isNaN(n)&&Math.abs(n-q.exact)<=(q.tol||1);const el=document.getElementById(`minp_${caseIdx}_${q.id}`);if(el){el.classList.add(ok?'correct':'wrong');el.disabled=true;}}
    else if(q.type==='select'){ok=parseInt(a)===q.ans;document.querySelectorAll(`[id^="mso_${caseIdx}_${q.id}_"]`).forEach((el,i)=>{if(i===q.ans)el.classList.add('correct');else if(i===parseInt(a)&&!ok)el.classList.add('wrong');});}
    else if(q.type==='blank'){const placed=a||{};ok=q.blanks.every(b=>placed[b.id]===b.ans);q.blanks.forEach(b=>{const el=document.getElementById(`mbl_${caseIdx}_${q.id}_${b.id}`);if(el){el.classList.add(placed[b.id]===b.ans?'correct':'wrong');el.disabled=true;}});}
    else if(q.type==='drag'){const placed=a||{};ok=q.items.every(it=>placed[it]===q.correct[it]);}
    if(ok)score++;
    const fb=document.getElementById(`mfb_${caseIdx}_${q.id}`);
    if(fb){fb.textContent=(ok?'✅ Correct! ':'❌ Incorrect. ')+q.fb;fb.className=`q-fb show ${ok?'ok':'no'}`;}
  });
  STATE.mockExam.cbqScores[caseIdx]={s:score,t:cbq.questions.length};
  const btn=document.getElementById(`mock-cbq-check-${caseIdx}`);
  if(btn){btn.textContent='✓ Checked';btn.disabled=true;btn.style.background='var(--ok)';}
  const scoreEl=document.getElementById(`mock-cbq-score-${caseIdx}`);
  if(scoreEl)scoreEl.textContent=`${score}/${cbq.questions.length}`;
}

function renderMockCBQCase(caseIdx){
  const cbq=STATE.mockExam.cbqCases[caseIdx];
  if(!cbq)return'';
  const types={calc:'CALCULATION',select:'SELECT FROM LIST',drag:'DRAG & DROP',blank:'FILL IN BLANK'};
  const caseHTML=`<div class="case-box"><div class="case-label">📄 CASE STUDY ${caseIdx+1}</div><div class="case-text">${cbq.case.replace(/\n/g,'<br>')}</div>${cbq.exhibit?`<div class="exhibit-wrap"><div style="font-size:11px;font-weight:700;color:var(--brand-2);letter-spacing:.6px;padding:6px 12px;background:var(--brand-tint);border-bottom:.5px solid #c0d4ea">📊 EXHIBIT</div><table class="exhibit-tbl"><tr>${cbq.exhibit.headers.map(h=>`<th>${h}</th>`).join('')}</tr>${cbq.exhibit.rows.map(r=>`<tr>${r.map((c,i)=>`<td class="${i>0?'num':''}">${c}</td>`).join('')}</tr>`).join('')}</table></div>`:''}</div>`;

  const qsHTML=cbq.questions.map((q,qi)=>{
    let body='';
    if(q.type==='calc') body=`<div class="calc-wrap"><span class="calc-prefix">${q.pre||'$'}</span><input type="number" class="calc-input" id="minp_${caseIdx}_${q.id}" placeholder="0" step="any" oninput="if(!STATE.mockExam.cbqA[${caseIdx}])STATE.mockExam.cbqA[${caseIdx}]={};STATE.mockExam.cbqA[${caseIdx}]['${q.id}']=this.value"><span style="font-size:14px;color:#888">${q.suf||''}</span></div>`;
    else if(q.type==='select') body=`<div class="select-opts">${q.opts.map((o,i)=>`<div class="select-opt" id="mso_${caseIdx}_${q.id}_${i}" onclick="mockCBQPickOpt(${caseIdx},'${q.id}',${i})">${o}</div>`).join('')}</div>`;
    else if(q.type==='blank'){let txt=q.text;q.blanks.forEach(b=>{const opts=b.opts.map(o=>`<option value="${o}">${o}</option>`).join('');txt=txt.replace(`[${b.id}]`,`<select class="blank-sel" id="mbl_${caseIdx}_${q.id}_${b.id}" onchange="mockCBQSetBlank(${caseIdx},'${q.id}','${b.id}',this.value)"><option value="">—select—</option>${opts}</select>`);});body=`<div class="blank-sentence">${txt}</div>`;}
    else if(q.type==='drag'){
      const chips=q.items.map(it=>`<div class="drag-chip" data-mcaseidx="${caseIdx}" data-qid="${q.id}" data-item="${it}" id="mchip_${caseIdx}_${q.id}_${it.replace(/\W/g,'_')}" draggable="true">${it}</div>`).join('');
      const zones=q.zones.map(z=>`<div class="drag-col"><div class="drag-col-label">${z}</div><div class="drop-zone" id="mzone_${caseIdx}_${q.id}_${z.replace(/\W/g,'_')}"></div></div>`).join('');
      body=`<div class="drag-source">${chips}</div><div class="drag-area">${zones}</div>`;
    }
    return`<div class="q-block"><div class="q-header"><div class="q-num">${qi+1}</div><div style="flex:1"><div style="display:flex;gap:8px;align-items:center;margin-bottom:5px"><span class="q-type-badge">${types[q.type]}</span></div><div class="q-text">${q.text}</div></div></div><div class="q-body">${body}<div class="q-fb" id="mfb_${caseIdx}_${q.id}"></div></div></div>`;
  }).join('');

  const sc=STATE.mockExam.cbqScores[caseIdx];
  return`<div style="margin-bottom:16px">${caseHTML}${qsHTML}<div style="padding:12px 16px;display:flex;gap:10px;align-items:center">
    <span id="mock-cbq-score-${caseIdx}" style="font-size:13px;font-weight:600;color:var(--brand-2)">${sc?`${sc.s}/${sc.t}`:''}</span>
    <button id="mock-cbq-check-${caseIdx}" onclick="mockCBQCheck(${caseIdx})" ${sc?'disabled style="background:var(--ok)"':''} style="flex:1;padding:12px;border-radius:10px;border:none;background:${sc?'var(--ok)':'var(--brand-2)'};color:#fff;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit">${sc?'✓ Checked':'Check Answers'}</button>
  </div></div>`;
}

function mockSetupMockDrag(){
  document.querySelectorAll('[data-mcaseidx]').forEach(chip=>{
    chip.addEventListener('dragstart',e=>{
      cbqDragItem=chip.dataset.item;cbqDragQid=chip.dataset.qid;
      e.dataTransfer.effectAllowed='move';chip.style.opacity='.4';
      chip._mcaseIdx=parseInt(chip.dataset.mcaseidx);
    });
    chip.addEventListener('dragend',e=>{chip.style.opacity='1';});
  });
  document.querySelectorAll('.drop-zone').forEach(zone=>{
    if(zone.id.startsWith('mzone_')){
      zone.addEventListener('dragover',e=>{e.preventDefault();zone.classList.add('over');});
      zone.addEventListener('dragleave',()=>zone.classList.remove('over'));
      zone.addEventListener('drop',e=>{
        e.preventDefault();zone.classList.remove('over');
        if(!cbqDragItem)return;
        const parts=zone.id.split('_');parts.shift();parts.shift();
        const caseIdx=parseInt(parts.shift());
        const qid=parts.shift();
        const cbq=STATE.mockExam.cbqCases[caseIdx];
        const q=cbq?cbq.questions.find(x=>x.id===qid):null;
        const matchedZone=q?q.zones.find(z=>z.replace(/\W/g,'_')===parts.join('_')):null;
        if(!matchedZone)return;
        if(!STATE.mockExam.cbqA[caseIdx])STATE.mockExam.cbqA[caseIdx]={};
        if(!STATE.mockExam.cbqA[caseIdx][qid])STATE.mockExam.cbqA[caseIdx][qid]={};
        STATE.mockExam.cbqA[caseIdx][qid][cbqDragItem]=matchedZone;
        const chip=document.getElementById(`mchip_${caseIdx}_${qid}_${cbqDragItem.replace(/\W/g,'_')}`);
        if(chip)zone.appendChild(chip);
        cbqDragItem=null;cbqDragQid=null;
      });
    }
  });
}

async function confirmSubmitCBQ(){
  const _cbqOk=await showModal({icon:'📝',title:'Submit CBQ Phase?',body:'This will end the exam session and show your final results. You cannot go back.',type:'info',confirmText:'Submit & See Results',cancelText:'Keep Working'});
  if(_cbqOk)mockSubmitCBQ();
}

function mockSubmitCBQ(){
  mockClearTimers();
  // Calculate MCQ score
  const{mcqQ,mcqA}=STATE.mockExam;
  let mcqCorrect=0;
  const secScores={};
  mcqQ.forEach((q,i)=>{
    if(!secScores[q.sid])secScores[q.sid]={correct:0,total:0,title:q.stitle,bar:q.sbar,weight:q.sweight};
    secScores[q.sid].total++;
    if(mcqA[i]===q.a){mcqCorrect++;secScores[q.sid].correct++;}
  });
  // CBQ score
  let cbqTotal=0,cbqCorrect=0;
  Object.values(STATE.mockExam.cbqScores).forEach(sc=>{cbqTotal+=sc.t;cbqCorrect+=sc.s;});
  const mcqPct=Math.round(mcqCorrect/100*100);
  const cbqPct=cbqTotal?Math.round(cbqCorrect/cbqTotal*100):0;
  const weighted=Math.round(mcqPct*0.75+(cbqTotal?cbqPct:mcqPct)*0.25);
  STATE.mockExam.results={mcqCorrect,mcqTotal:100,secScores,cbqCorrect,cbqTotal};
  STATE.mockExam.status='results';
  // Item 2: Persist result to localStorage — students can track improvement over time
  saveMockResult({
    date:new Date().toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}),
    dateTs:Date.now(),
    weighted,mcqPct,cbqPct:cbqTotal?cbqPct:null,
    mcqCorrect,cbqCorrect,cbqTotal,
    pass:weighted>=70
  });
  render();
}

// ── RENDER FUNCTIONS ───────────────────────────────────────────
function renderMockExamScreen(){
  const me=STATE.mockExam;
  if(me.status==='idle'||me.status==='loading') return renderMockIntro();
  if(me.status==='mcq') return renderMockMCQ();
  if(me.status==='cbq') return renderMockCBQScreen();
  if(me.status==='results') return renderMockResults();
  return renderMockIntro();
}

function renderMockIntro(){
  const loading=STATE.mockExam.status==='loading';
  const history=loadMockResults();
  const historyHTML=history.length===0?'':`
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">📈 Your Attempt History</div>
      ${history.map((r,i)=>{
        const col=r.weighted>=70?'var(--ok)':r.weighted>=60?'var(--warn)':'var(--err)';
        const bg=r.weighted>=70?'var(--ok-tint)':r.weighted>=60?'var(--warn-tint)':'var(--err-tint)';
        return`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:${i<history.length-1?'.5px solid var(--bg)':'none'}">
          <div style="width:46px;height:46px;border-radius:10px;background:${bg};display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:${col};flex-shrink:0">${r.weighted}%</div>
          <div style="flex:1;min-width:0">
            <div style="font-size:13px;font-weight:500;color:var(--ink)">${r.pass?'✅ Pass estimate':'❌ Needs work'}</div>
            <div style="font-size:11px;color:#888;margin-top:2px">MCQ ${r.mcqPct}%${r.cbqPct!=null?` · CBQ ${r.cbqPct}%`:''} · ${r.date}</div>
          </div>
          ${i===0?`<span style="font-size:10px;background:var(--brand-tint);color:var(--brand);padding:2px 8px;border-radius:10px;font-weight:500">Latest</span>`:''}
        </div>`;
      }).join('')}
    </div>`;
  return`<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
  <div style="padding:16px 16px 12px;border-bottom:.5px solid var(--border);flex-shrink:0">
    <div style="font-size:18px;font-weight:600">🏆 Mock Exam</div>
    <div style="font-size:12px;color:#888;margin-top:3px">CMA Part 1 — Full Simulation</div>
  </div>
  <div style="flex:1;overflow-y:auto;padding:16px">
    <div style="background:linear-gradient(135deg,var(--brand),var(--brand-2));border-radius:16px;padding:20px;color:#fff;margin-bottom:16px;text-align:center">
      <div style="font-size:36px;margin-bottom:8px">📋</div>
      <div style="font-size:19px;font-weight:700;margin-bottom:4px">Full Exam Simulation</div>
      <div style="font-size:13px;opacity:.85">Conditions as close to exam day as possible</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:var(--brand-tint);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:var(--brand)">100</div>
        <div style="font-size:12px;color:#555;margin-top:3px">MCQ Questions</div>
        <div style="font-size:11px;color:#888;margin-top:2px">3 hours</div>
      </div>
      <div style="background:var(--ok-tint);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:24px;font-weight:700;color:var(--ok-strong)">2</div>
        <div style="font-size:12px;color:#555;margin-top:3px">CBQ Cases</div>
        <div style="font-size:11px;color:#888;margin-top:2px">1 hour</div>
      </div>
    </div>
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:10px">📊 Question Distribution</div>
      ${S.map(sec=>`<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">
        <div style="width:28px;height:28px;border-radius:8px;background:${sec.bar}20;display:flex;align-items:center;justify-content:center;font-size:14px;flex-shrink:0">${sec.emoji}</div>
        <div style="flex:1"><div style="font-size:12px;font-weight:500;color:#333">${sec.title}</div></div>
        <div style="font-size:13px;font-weight:700;color:${sec.bar}">${sec.weight} Qs</div>
      </div>`).join('')}
    </div>
    ${historyHTML}
    <div style="background:var(--warn-tint);border:.5px solid var(--warn);border-radius:12px;padding:12px;margin-bottom:16px;font-size:13px;color:#633806;line-height:1.6">
      ⚠️ <strong>Rules:</strong> Once you start, the timer runs. You can flag questions and navigate freely within MCQ. After submitting MCQ, you move to CBQ — you cannot go back.
    </div>
    <button onclick="startMockExam()" ${loading?'disabled':''} style="width:100%;padding:15px;border-radius:12px;border:none;background:${loading?'#888':'var(--brand)'};color:#fff;font-size:16px;font-weight:700;cursor:${loading?'default':'pointer'};font-family:inherit">
      ${loading?'⏳ Loading questions...':'🚀 Start Mock Exam'}
    </button>
  </div>
  </div>`;
}

function renderMockMCQ(){
  const q=STATE.mockExam.mcqQ[STATE.mockExam.mcqCurr];
  if(!q)return'';
  return`<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
  <div style="padding:10px 16px;border-bottom:.5px solid var(--border);flex-shrink:0;background:#fff;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="font-size:12px;font-weight:700;color:#555;letter-spacing:.5px">MCQ PHASE</div>
      <div style="font-size:11px;color:#888">Question ${STATE.mockExam.mcqCurr+1} of 100</div>
    </div>
    <div id="mock-timer" style="font-size:22px;font-weight:700;font-family:'Courier New',monospace;color:var(--ink)">${mockFmtTime(STATE.mockExam.mcqTime)}</div>
    <button onclick="mockConfirmSubmitMCQ()" style="padding:8px 14px;border-radius:8px;border:none;background:var(--ok);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Submit</button>
  </div>
  <div id="mock-mcq-content" style="display:flex;flex-direction:column;flex:1;overflow:hidden"></div>
  </div>`;
}

function renderMockCBQScreen(){
  const cases=STATE.mockExam.cbqCases;
  return`<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
  <div style="padding:10px 16px;border-bottom:.5px solid var(--border);flex-shrink:0;background:#fff;display:flex;align-items:center;justify-content:space-between">
    <div>
      <div style="font-size:12px;font-weight:700;color:var(--ok);letter-spacing:.5px">CBQ PHASE</div>
      <div style="font-size:11px;color:#888">2 Case-Based Questions</div>
    </div>
    <div id="mock-timer" style="font-size:22px;font-weight:700;font-family:'Courier New',monospace;color:var(--ink)">${mockFmtTime(STATE.mockExam.cbqTime)}</div>
    <button onclick="confirmSubmitCBQ()" style="padding:8px 14px;border-radius:8px;border:none;background:var(--brand-2);color:#fff;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit">Finish</button>
  </div>
  <div style="flex:1;overflow-y:auto;padding-bottom:16px" id="mock-cbq-scroll">
    <div style="padding:10px 16px;background:var(--ok-tint);border-bottom:.5px solid #c8e0b0;font-size:13px;color:var(--ok-strong)">
      ✅ MCQ phase complete. Answer both CBQ cases below, then tap Finish.
    </div>
    ${cases.map((_,i)=>renderMockCBQCase(i)).join('<div style="height:1px;background:var(--border);margin:0 16px"></div>')}
  </div>
  </div>`;
}

function renderMockResults(){
  const{mcqCorrect,mcqTotal,secScores,cbqCorrect,cbqTotal}=STATE.mockExam.results;
  const mcqPct=Math.round(mcqCorrect/mcqTotal*100);
  const cbqPct=cbqTotal?Math.round(cbqCorrect/cbqTotal*100):0;
  // CMA weighted estimate: MCQ 75%, CBQ 25%
  const weighted=Math.round(mcqPct*0.75+(cbqTotal?cbqPct:mcqPct)*0.25);
  const pass=weighted>=70;
  const passColor=weighted>=70?'var(--ok)':weighted>=60?'var(--warn)':'var(--err)';
  const passMsg=weighted>=70?'On Track to Pass 🎉':weighted>=60?'Borderline — Keep Practicing 📈':'Needs More Study 📚';

  return`<div style="display:flex;flex-direction:column;height:100%;overflow:hidden">
  <div style="padding:14px 16px 12px;border-bottom:.5px solid var(--border);flex-shrink:0">
    <div style="font-size:18px;font-weight:600">📊 Exam Results</div>
  </div>
  <div style="flex:1;overflow-y:auto;padding:16px;padding-bottom:80px">
    <div style="background:${passColor}15;border:1.5px solid ${passColor}40;border-radius:14px;padding:18px;text-align:center;margin-bottom:16px">
      <div style="font-size:42px;font-weight:800;color:${passColor}">${weighted}%</div>
      <div style="font-size:15px;font-weight:600;color:${passColor};margin-top:4px">${passMsg}</div>
      <div style="font-size:12px;color:#888;margin-top:6px">Weighted estimate (MCQ 75% · CBQ 25%)</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px">
      <div style="background:var(--surface-3);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:11px;color:#888;margin-bottom:4px">MCQ Score</div>
        <div style="font-size:22px;font-weight:700;color:var(--brand-2)">${mcqCorrect}/100</div>
        <div style="font-size:12px;color:#888">${mcqPct}%</div>
      </div>
      <div style="background:var(--surface-3);border-radius:12px;padding:14px;text-align:center">
        <div style="font-size:11px;color:#888;margin-bottom:4px">CBQ Score</div>
        <div style="font-size:22px;font-weight:700;color:var(--ok)">${cbqTotal?`${cbqCorrect}/${cbqTotal}`:'—'}</div>
        <div style="font-size:12px;color:#888">${cbqTotal?cbqPct+'%':'Not attempted'}</div>
      </div>
    </div>
    <div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:12px">Section Breakdown</div>
      ${Object.entries(secScores).sort((a,b)=>parseInt(a[0])-parseInt(b[0])).map(([sid,sc])=>{
        const pct=Math.round(sc.correct/sc.total*100);
        const col=pct>=70?'var(--ok)':pct>=50?'var(--warn)':'var(--err)';
        return`<div style="margin-bottom:10px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">
            <span style="font-size:13px;color:#333">${sc.title}</span>
            <span style="font-size:13px;font-weight:600;color:${col}">${sc.correct}/${sc.total} (${pct}%)</span>
          </div>
          <div style="height:6px;background:var(--bg);border-radius:3px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${col};border-radius:3px;transition:width .5s"></div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div style="display:flex;gap:10px">
      <button onclick="STATE.mockExam={status:'idle',mcqQ:[],mcqA:{},mcqFlagged:[],mcqCurr:0,mcqTime:10800,mcqInterval:null,cbqCases:[],cbqA:{},cbqScores:{},cbqCurr:0,cbqTime:3600,cbqInterval:null,results:null,navOpen:false};render();" style="flex:1;padding:13px;border-radius:10px;border:.5px solid var(--border-3);background:#fff;cursor:pointer;font-size:14px;font-weight:500;font-family:inherit">Try Again</button>
      <button onclick="navTo('study')" style="flex:1;padding:13px;border-radius:10px;border:none;background:var(--brand);color:#fff;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit">Back to Study</button>
    </div>
  </div>
  </div>`;
}
// ════ END MOCK EXAM ════

auth.onAuthStateChanged(async(user)=>{
  try{ if(user){ setTimeout(startLivePolling,3000); } else { stopLivePolling(); } }catch(e){}
  if(user){
    STATE.user=user;
    STATE.authLoading=false;
    // ── FIX 1: Parallel reads — was 3 sequential awaits, now one Promise.all ──
    // Cuts login data-load time by ~60% on average connections.
    try{
      const [pd,sd,td]=await Promise.all([
        db.collection('progress').doc(user.uid).get(),
        db.collection('students').doc(user.uid).get(),
        db.collection('tracker').doc(user.uid).get()
      ]);
      // FIX 4: merge cloud + local instead of cloud blindly overwriting local.
      // Runs only after a successful cloud read (inside this try), so an offline
      // login never pushes stale local data over good cloud data.
      const _localProg=loadProg();
      const _cloudProg=pd.exists?pd.data():null;
      const _merged=mergeProgress(_localProg,_cloudProg);
      STATE.progress=_merged;_invalidateDoneSet();
      try{localStorage.setItem('cma-html-v2',JSON.stringify(_merged));}catch{}
      // push the merged superset back so the cloud gains any local-only progress
      db.collection('progress').doc(user.uid).set(_merged).catch(e=>console.warn('progress merge-write failed',e));
      if(sd.exists){try{localStorage.setItem('cma-student-v1',JSON.stringify(sd.data()));}catch{}}
      if(td.exists){try{localStorage.setItem('cma-tracker-v1',JSON.stringify(td.data()));}catch{}}
    }catch{}
    const st=loadStudent();
    try{applyFontSize();}catch(e){}try{ensureQotd();}catch(e){}STATE.tab=st && st.name ? 'study' : 'register';
    STATE.showProfileWarning=false;
    // Batch 4: fire retention loops once student data is loaded (guarded internally).
    try{runRetentionBoot();}catch(e){console.warn('retention boot failed',e);}
  } else {
    STATE.user=null;STATE.tab=localStorage.getItem('cma-visited')?'login':'onboarding';STATE.authLoading=false;
  }
  render();
});


// ═══════════════════════════════════════════════════════════════════════
// Batch 4.5: accessibility enhancer (was a separate inline <script>
// after the main script). Kept as an IIFE so its internal state stays
// isolated from the global scope, matching original behavior.
// ═══════════════════════════════════════════════════════════════════════

/* ── Accessibility enhancer (row 11, phase 1) ───────────────────────
   Makes every click-only element keyboard-operable without rewriting the
   app's markup: after each screen render it tags clickable elements so they
   can be reached with Tab and announced by screen readers, and makes
   Enter / Space activate them. */
(function(){
  function enhance(root){
    if(!root) return;
    root.querySelectorAll('[onclick]').forEach(function(el){
      var t = el.tagName;
      if(t==='BUTTON'||t==='A'||t==='INPUT'||t==='SELECT'||t==='TEXTAREA') return;
      if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex','0');
      if(!el.hasAttribute('role')) el.setAttribute('role','button');
    });
  }
  var area = document.getElementById('content-area');
  if(!area) return;
  var scheduled = false;
  function schedule(){
    if(scheduled) return;
    scheduled = true;
    requestAnimationFrame(function(){ scheduled = false; enhance(area); });
  }
  new MutationObserver(schedule).observe(area, { childList:true, subtree:true });
  enhance(area);

  document.addEventListener('keydown', function(e){
    if(e.key!=='Enter' && e.key!==' ') return;
    var el = e.target;
    if(!el || el.getAttribute('role')!=='button' || !el.hasAttribute('onclick')) return;
    e.preventDefault();   // stop Space from scrolling the page
    el.click();
  });
})();

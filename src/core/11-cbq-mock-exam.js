// ════════════════════════════════════════════════════════════════
// CBQ — EMBEDDED CASE-BASED QUESTIONS
// ════════════════════════════════════════════════════════════════
// ════════════════════════════════════════════════════════════════
// Change 2: CBQ data moved to cbq-data.js — removes 412 lines from main file
// cbq-data.js must be loaded BEFORE this script tag

const CBQ_SEC_KEYS = ['A','B','C','D','E','F']; // Batch 6: alphabetical
// Batch 22 (B22-02): CBQ_SEC_KEYS above is the canonical alphabetical order used for data iteration (e.g. the mock-exam CBQ pool builder). The tab buttons
// in renderCBQ() are deliberately shown in a different order (C,D,A,B,E,F), so
// secIdx must resolve through THIS array instead -- using CBQ_SEC_KEYS directly
// was the bug: clicking the button labeled "Section C" (position 0) loaded
// CBQ_SEC_KEYS[0] = 'A', silently showing Section A's CBQs under a C label.
const CBQ_TAB_KEYS = ['C','D','A','B','E','F']; // must match the button order in renderCBQ()
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

function cbqInit(){
  // Batch 24 (B24-12): CBQ data is loaded on first use instead of at app start.
  if(typeof CBQ_DATA==='undefined'){
    const lv=document.getElementById('listView');
    if(lv)lv.innerHTML='<div style="text-align:center;padding:40px 20px;color:#888;font-size:14px">Loading cases\u2026</div>';
    ensureCBQData().then(()=>{if(STATE.tab==='cbq')cbqInit();}).catch(()=>{
      const l=document.getElementById('listView');
      if(l)l.innerHTML='<div style="text-align:center;padding:40px 20px;color:#888;font-size:14px">Couldn\u2019t load the cases. Check your connection.<br><button class="cbq-btn cbq-btn-primary" style="margin-top:14px" onclick="cbqInit()">Try again</button></div>';
    });
    return;
  }
  CBQ_S.view='list'; cbqRenderList();
}

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
  if(typeof CBQ_DATA==='undefined'){cbqInit();return;} // Batch 24 (B24-12): data not loaded yet
  CBQ_S.view='list';
  cbqShow('listView'); cbqHide('detailView'); cbqHide('resultsView');
  cbqShow('secTabs'); cbqHide('bottomBar');
  cbqSet('hTitle','🧩 CBQ Practice');
  cbqSet('hSub','Case-Based Questions — New 2026 Format');

  const key=CBQ_TAB_KEYS[CBQ_S.secIdx];
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
  const cbq=CBQ_DATA[CBQ_TAB_KEYS[CBQ_S.secIdx]][CBQ_S.cbqIdx];
  cbqHide('listView');cbqHide('resultsView');cbqShow('detailView');cbqHide('secTabs');cbqShow('bottomBar');
  cbqSet('hTitle',`CBQ ${cbq.num} / ${CBQ_DATA[CBQ_TAB_KEYS[CBQ_S.secIdx]].length}`);
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
      const q=CBQ_DATA[CBQ_TAB_KEYS[CBQ_S.secIdx]][CBQ_S.cbqIdx].questions.find(x=>x.id===cbqDragQid);
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
  const cbq=CBQ_DATA[CBQ_TAB_KEYS[CBQ_S.secIdx]][CBQ_S.cbqIdx];
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
  const hasNext=CBQ_S.cbqIdx<CBQ_DATA[CBQ_TAB_KEYS[CBQ_S.secIdx]].length-1;
  cbqSetBtn(hasNext?'Next Case →':'View Results',`cbq-btn ${score/cbq.questions.length>=0.7?'cbq-btn-success':'cbq-btn-primary'}`,cbqMainAction);
}

function cbqNextOrResults(){
  const cbqs=CBQ_DATA[CBQ_TAB_KEYS[CBQ_S.secIdx]];
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
  cbqSet('hTitle','Results');cbqSet('hSub',CBQ_SEC_META[CBQ_TAB_KEYS[CBQ_S.secIdx]].title);
  const key=CBQ_TAB_KEYS[CBQ_S.secIdx];const cbqs=CBQ_DATA[key];
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
  if(typeof CBQ_DATA==='undefined')return []; // Batch 24 (B24-12): data unavailable (offline, never cached)
  let pool=[];
  CBQ_SEC_KEYS.forEach(k=>{if(CBQ_DATA[k])CBQ_DATA[k].forEach(c=>pool.push({...c,sk:k}));});
  return mockShuffle(pool).slice(0,2);
}

// ── Start ──────────────────────────────────────────────────────
async function startMockExam(){
  STATE.mockExam.status='loading';render();
  for(let i=1;i<=6;i++)await ensureQuizzes(i);
  try{await ensureCBQData();}catch(e){} // Batch 24 (B24-12): CBQ data is lazy-loaded now
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
  try{ if(user){ setTimeout(flushQueuedClientErrors,5000); } }catch(e){} // Batch 24 (B24-08)
  if(user){
    STATE.user=user;
    // Batch 24 (B24-12): warm the instructor-only bundle in the background.
    try{ if(isInstructor())ensureDashboardBundle().catch(()=>{}); }catch(e){}
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



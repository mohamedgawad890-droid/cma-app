// ─── DASHBOARD ────────────────────────────────────────────────────────────────

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
function getPrevLesson(sectId,lessonId){const sec=sect(sectId);if(!sec)return null;const idx=sec.lessons.findIndex(l=>l.id===lessonId);if(idx<=0){const sIdx=S.findIndex(s=>s.id===sectId);if(sIdx<=0)return null;const prevSec=S[sIdx-1];return{sec:prevSec,lesson:prevSec.lessons[prevSec.lessons.length-1]};}return{sec,lesson:sec.lessons[idx-1]};}
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
    // Batch 24 (B24-05): deterministic id (one check-in per student per lecture)
    // + server timestamp. Rules also require the lecture to be the group's live one.
    await db.collection('attendance').doc(lectureId+'_'+STATE.user.uid).set({
      lectureId,groupCode,title,
      mode,                                    // Batch 5: 'online' | 'offline'
      userId:STATE.user.uid,                   // MUST match rule: create if userId==request.auth.uid
      studentName:st.name||STATE.user.displayName||'Student',
      studentId:st.studentId||'',
      checkedInAt:new Date().toISOString(),
      serverCheckedInAt:firebase.firestore.FieldValue.serverTimestamp()
    });
    const done=loadCheckedIn();done.push(lectureId);saveCheckedIn(done);
    const el=document.getElementById('checkin-overlay');if(el)el.remove();
    _liveShownFor=null;
    showToast('\u2705 You\u2019re checked in!','success',2200);
  }catch(e){
    console.warn('[CheckIn] failed:',e);
    if(btn){btn.disabled=false;btn.textContent='\u2705 Check in';}
    // Batch 24 (B24-05): a rules rejection means already checked in, or the lecture closed.
    if(e&&e.code==='permission-denied'){
      const el=document.getElementById('checkin-overlay');if(el)el.remove();
      const done=loadCheckedIn();if(!done.includes(lectureId)){done.push(lectureId);saveCheckedIn(done);}
      _liveShownFor=null;
      showToast('You\u2019re already checked in, or check-in for this lecture has closed.','info',3500);
    }else{
      showToast('Check-in failed \u2014 tap again.','error');
    }
  }
}


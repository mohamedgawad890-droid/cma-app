// ─── RENDER LESSON BLOCK ──────────────────────────────────────────────────────
// ─── LESSON ACCORDION (rolled out app-wide — was a Section 4 pilot) ───────
// Groups a lesson's content blocks by 'h' (topic-header) boundary and
// renders each topic as a collapsible section. The FIRST header in a lesson
// is treated as the lesson's own title echo (not a listed topic) and stays
// non-collapsible, matching the numbering rule from item 4 (topic numbers
// start after the intro header). Falls back to the flat renderBlock map for
// any lesson with 0-1 headers (nothing to collapse) — applies uniformly
// across all 6 sections now that every lesson has been confirmed to have
// 2+ header blocks.
function renderLessonBody(lesson,sec){
  // Batch 23 (B23-14): 'arsum' (Arabic recap) blocks are lifted out and rendered
  // as one dedicated card AFTER all topics — never inside the last topic body.
  // They are appended at the END of each lesson's blocks array in the JSON, so
  // flashcard ids (`${lessonId}:def:${index}`) of existing blocks never shift.
  const allBlocks=lesson.blocks||[];
  const arBlocks=allBlocks.filter(b=>b&&b.t==='arsum');
  const blocks=arBlocks.length?allBlocks.filter(b=>!(b&&b.t==='arsum')):allBlocks;
  const arHTML=arBlocks.map(b=>renderArSum(b,lesson,sec)).join('');
  const hIdx=[];
  blocks.forEach((b,i)=>{if(b&&b.t==='h')hIdx.push(i);});
  if(hIdx.length<=1) return blocks.map(b=>renderBlock(b,sec)).join('')+arHTML;
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
  const toolbarHTML=`<div class="no-print" style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
    <div style="position:relative;flex:1;min-width:0">
      <input type="text" id="lesson-search-${lesson.id}" placeholder="Search this lesson..." oninput="filterLessonTopics('${lesson.id}',this.value)"
        style="width:100%;padding:8px 30px 8px 12px;border-radius:8px;border:.5px solid var(--border-4);font-size:13px;font-family:inherit;outline:none;background:var(--surface);color:var(--ink);box-sizing:border-box">
      <span id="lesson-search-clear-${lesson.id}" onclick="document.getElementById('lesson-search-${lesson.id}').value='';filterLessonTopics('${lesson.id}','')" style="position:absolute;right:10px;top:50%;transform:translateY(-50%);font-size:16px;cursor:pointer;color:#aaa;line-height:1;display:none">×</span>
    </div>
    <button type="button" class="lesson-expand-all" onclick="toggleAllLessonTopics('${lesson.id}')" id="expand-all-${lesson.id}" style="flex-shrink:0">Expand all</button>
  </div>`;
  return introHTML+toolbarHTML+`<div id="topics-container-${lesson.id}">`+topicsHTML+arHTML+`</div>`;
}

// ─── ARABIC LESSON SUMMARY (Batch 23, B23-14) ──────────────────────────────
// Block shape: {t:'arsum', topics:[{h, en, part?, pts?, f?, trap?}]}
//   h    Arabic topic title          en   original English topic title
//   part divider row (lesson 4-16 Parts) pts  Arabic key points
//   f    formulas — rendered LTR     trap exam traps (⚠️ callout)
// Reuses the .lesson-topic accordion markup, so Expand all, in-lesson search,
// and the print stylesheet (forces .lesson-topic-body open) all work unchanged.
// RTL is scoped to this card only — no global layout change.
function renderArSum(block,lesson,sec){
  const topics=Array.isArray(block&&block.topics)?block.topics:[];
  if(!topics.length)return'';
  const tx=sec.text,st=sec.strong,bg=sec.bg;
  const topicId=lesson.id+'-ar';
  const items=topics.map(t=>{
    if(t.part)return`<div style="margin:18px 0 4px;padding:7px 12px;border-radius:8px;background:${bg};color:${st};font-size:13px;font-weight:600;line-height:1.6">${esc(t.h||'')}</div>`;
    const pts=(t.pts||[]).map(p=>`<li style="display:flex;gap:8px;margin:5px 0"><span style="color:${tx};font-weight:600;flex-shrink:0">•</span><span>${esc(p)}</span></li>`).join('');
    const f=(t.f&&t.f.length)?`<div dir="ltr" style="margin:8px 0;padding:8px 12px;border-radius:8px;background:${bg};border:1px solid ${tx}30;color:${st};font-size:12.5px;line-height:1.7;text-align:left;white-space:pre-wrap;overflow-x:auto;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace">${t.f.map(x=>esc(x)).join('\n')}</div>`:'';
    const trap=(t.trap&&t.trap.length)?`<div style="margin:8px 0 2px;padding:8px 12px;border-radius:8px;background:rgba(201,162,39,.12);border-right:3px solid #c9a227;color:var(--ink);font-size:13px;line-height:1.8"><b>⚠️ انتبه في الامتحان:</b> ${t.trap.map(x=>esc(x)).join(' ')}</div>`:'';
    const en=t.en?`<div dir="ltr" style="font-size:11px;color:#888;text-align:right;margin:1px 0 4px">${esc(t.en)}</div>`:'';
    return`<div style="padding:10px 0;border-bottom:.5px solid var(--border)"><div style="font-size:15px;font-weight:600;color:${st};line-height:1.6">${esc(t.h||'')}</div>${en}<ul style="list-style:none;margin:4px 0;padding:0;font-size:14px;line-height:1.85;color:var(--ink)">${pts}</ul>${f}${trap}</div>`;
  }).join('');
  return`<div class="lesson-topic" id="topic-wrap-${topicId}">
      <button type="button" class="lesson-topic-toggle" onclick="toggleLessonTopic('${topicId}')" id="topic-btn-${topicId}">
        <span class="lesson-topic-title" dir="rtl" lang="ar">📝 ملخص الدرس بالعربي</span>
        <span class="lesson-topic-chevron" id="topic-chevron-${topicId}">›</span>
      </button>
      <div class="lesson-topic-body" id="topic-body-${topicId}" style="display:none"><div dir="rtl" lang="ar" style="text-align:right">${items}</div></div>
    </div>`;
}

// ─── IN-LESSON SEARCH (searches topic headers + body text within the
// currently open lesson, auto-expands matching topics, highlights the
// matched substring, scrolls the first match into view). Pure DOM text-node
// walking so it never touches existing markup (e.g. dictionary term spans).
function _domClearLessonHighlights(container){
  container.querySelectorAll('mark.lesson-search-hit').forEach(m=>{
    m.replaceWith(document.createTextNode(m.textContent));
  });
  container.normalize();
}
function _domHighlightLessonText(container,query){
  if(!query)return false;
  const ql=query.toLowerCase();
  let found=false;
  const walker=document.createTreeWalker(container,NodeFilter.SHOW_TEXT,null);
  const textNodes=[];
  let n;
  while((n=walker.nextNode()))textNodes.push(n);
  textNodes.forEach(node=>{
    const text=node.nodeValue;
    const idx=text.toLowerCase().indexOf(ql);
    if(idx===-1)return;
    found=true;
    const before=text.slice(0,idx),match=text.slice(idx,idx+query.length),after=text.slice(idx+query.length);
    const frag=document.createDocumentFragment();
    if(before)frag.appendChild(document.createTextNode(before));
    const mark=document.createElement('mark');
    mark.className='lesson-search-hit';
    mark.textContent=match;
    frag.appendChild(mark);
    if(after)frag.appendChild(document.createTextNode(after));
    node.parentNode.replaceChild(frag,node);
  });
  return found;
}
function filterLessonTopics(lessonId,query){
  const container=document.getElementById('topics-container-'+lessonId);
  const clearBtn=document.getElementById('lesson-search-clear-'+lessonId);
  if(!container)return;
  if(clearBtn)clearBtn.style.display=query?'block':'none';
  const wraps=container.querySelectorAll('.lesson-topic');
  const q=(query||'').trim();
  if(!q){
    wraps.forEach(w=>{
      const body=w.querySelector('.lesson-topic-body');
      const chevron=w.querySelector('.lesson-topic-chevron');
      if(body){_domClearLessonHighlights(body);body.style.display='none';}
      if(chevron)chevron.style.transform='rotate(0deg)';
      w.style.outline='';
    });
    const btn=document.getElementById('expand-all-'+lessonId);
    if(btn)btn.textContent='Expand all';
    return;
  }
  let firstMatch=null;
  wraps.forEach(w=>{
    const titleEl=w.querySelector('.lesson-topic-title');
    const body=w.querySelector('.lesson-topic-body');
    const chevron=w.querySelector('.lesson-topic-chevron');
    if(!body)return;
    _domClearLessonHighlights(body);
    const headerMatch=titleEl&&titleEl.textContent.toLowerCase().includes(q.toLowerCase());
    const bodyMatch=_domHighlightLessonText(body,q);
    const isMatch=headerMatch||bodyMatch;
    body.style.display=isMatch?'block':'none';
    if(chevron)chevron.style.transform=isMatch?'rotate(90deg)':'rotate(0deg)';
    w.style.outline=isMatch?'2px solid var(--brand)':'';
    if(isMatch&&!firstMatch)firstMatch=w;
  });
  if(firstMatch)firstMatch.scrollIntoView({behavior:'smooth',block:'nearest'});
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

// ─── LESSON PDF DOWNLOAD (Batch 17) ─────────────────────────────────────────
// Reuses the browser's native print-to-PDF (same approach as exam preview),
// scoped to the lesson reader via #lesson-print-area + .print-only/.no-print
// helper classes in the @media print stylesheet. No external library needed —
// keeps this working offline inside the PWA and preserves Arabic RTL content
// exactly as rendered on screen.
function downloadLessonPDF(){
  if(!document.getElementById('lesson-print-area')){
    if(typeof showToast==='function')showToast('Open a lesson first to download it.','error',3000);
    return;
  }
  window.print();
}

// ─── SECTION PDF DOWNLOAD (Batch 18) ────────────────────────────────────────
// Same window.print() approach as downloadLessonPDF, extended to render every
// lesson in a section back-to-back into one printable document. Enters a
// dedicated print mode (STATE.printSectionId) rather than manipulating a
// temp/offscreen DOM, so it stays consistent with the render()-driven
// architecture and the existing #lesson-print-area/.print-only/.no-print
// print stylesheet needs zero section-specific changes — only a new
// page-break rule between lessons (.section-lesson-print, app.css).
async function downloadSectionPDF(sectionId){
  const sec=S.find(s=>s.id===sectionId);
  if(!sec)return;
  if(typeof showToast==='function')showToast('Preparing PDF — this can take a few seconds for long sections…','info',3500);
  await ensureLessons(sectionId); // no-op if already cached (prewarmLessons usually beat us here)
  STATE.printSectionId=sectionId;
  STATE.sectId=sectionId;
  STATE.lessonId=null;
  render();
}
// Fires once, right after entering print mode's render pass, so the print
// dialog opens against the freshly-rendered DOM instead of a stale one.
function _triggerSectionPrint(){
  const sec=S.find(s=>s.id===STATE.printSectionId);
  const prevTitle=document.title;
  if(sec)document.title='CMA Prep — '+sec.title;
  const restore=()=>{
    document.title=prevTitle;
    STATE.printSectionId=null;
    window.removeEventListener('afterprint',restore);
    render();
  };
  window.addEventListener('afterprint',restore);
  // rAF ensures layout has settled (accordion-forced-open print CSS, images)
  // before the print dialog measures page content.
  requestAnimationFrame(()=>requestAnimationFrame(()=>window.print()));
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
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <div style="font-size:11px;font-weight:500;color:${sec.text};letter-spacing:.5px">LESSONS & QUIZZES</div>
        <button onclick="event.stopPropagation();downloadSectionPDF(${sec.id})" title="Download all ${sec.lessons.length} lessons in this section as one PDF" style="flex-shrink:0;display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:7px;border:.5px solid ${sec.text}30;background:#fff;color:${sec.strong};font-size:11px;font-weight:500;cursor:pointer">⬇️ Section PDF</button>
      </div>
      ${html}
    </div>`;
    listEl.style.display = 'block';
    if(iconEl) iconEl.style.transform = 'rotate(90deg)';
  }
}

function renderStudy(){
  const{progress}=STATE;
  // ── Section print view (Batch 18) — all lessons in one printable doc ──────
  if(STATE.printSectionId!==null){
    const sec=S.find(s=>s.id===STATE.printSectionId);
    if(!sec){STATE.printSectionId=null;return renderStudy();}
    const lessonsHTML=sec.lessons.map((l,i)=>`
      <div class="section-lesson-print card" id="lesson-print-area-${l.id}" style="margin-top:14px;padding:4px 16px 16px">
        <div class="print-only" style="display:none">
          <div style="font-size:10px;color:#888;margin-bottom:2px">CMA Prep — Mohamed Abdelgawad</div>
          <div style="font-size:11px;color:#888;margin-bottom:10px">${sec.emoji} ${esc(sec.title)} · Lesson ${i+1} of ${sec.lessons.length}</div>
          <div style="font-size:19px;font-weight:700;margin-bottom:14px;color:#111">${i+1}. ${esc(l.title)}</div>
        </div>
        ${renderLessonBody(l,sec)}
      </div>`).join('');
    setTimeout(_triggerSectionPrint,0);
    return`<div class="bh no-print"><button class="bh-back" onclick="STATE.printSectionId=null;render();">‹</button>
      <div style="font-size:14px;font-weight:500">Preparing ${esc(sec.title)} PDF…</div></div>
      <div class="scroll-area pad">
        <div class="print-only" style="display:none;margin-bottom:20px">
          <div style="font-size:22px;margin-bottom:2px">${sec.emoji}</div>
          <div style="font-size:20px;font-weight:700;color:#111;margin-bottom:4px">${esc(sec.title)}</div>
          <div style="font-size:12px;color:#888">${sec.lessons.length} lessons · CMA Prep — Mohamed Abdelgawad</div>
        </div>
        ${lessonsHTML}
        <div style="height:20px"></div>
      </div>`;
  }
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
      <div style="min-width:0;flex:1"><div style="font-size:11px;font-weight:500;color:${sec.text}">${sec.emoji} ${esc(sec.title)}</div>
      <div class="ellipsis" style="font-size:15px;font-weight:500;margin-top:1px">${lessonIdx+1}. ${esc(lesson.title)}</div></div>
      <button class="no-print" onclick="downloadLessonPDF()" title="Download this lesson as PDF" style="flex-shrink:0;width:36px;height:36px;border-radius:9px;border:.5px solid var(--border-4);background:var(--surface-3);color:${sec.text};font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center">⬇️</button></div>
    <div class="scroll-area pad"><div class="card" id="lesson-print-area" style="margin-top:14px;padding:4px 16px 16px">
      <div class="print-only" style="display:none">
        <div style="font-size:10px;color:#888;margin-bottom:2px">CMA Prep — Mohamed Abdelgawad</div>
        <div style="font-size:11px;color:#888;margin-bottom:10px">${sec.emoji} ${esc(sec.title)} · Lesson ${lessonIdx+1} of ${sec.lessons.length}</div>
        <div style="font-size:19px;font-weight:700;margin-bottom:14px;color:#111">${esc(lesson.title)}</div>
      </div>
      ${renderLessonBody(lesson,sec)}${videoPlaceholder}</div>
    <button class="btn no-print" data-markdone="${lesson.id}" onclick="markDone('${lesson.id}')" style="margin-top:14px;background:${done?'var(--ok-tint)':sec.bar};color:${done?'var(--ok-strong)':'#fff'}">${done?'✓ Completed — Back':'Mark as Complete ✓'}</button>
    ${(()=>{const pv=getPrevLesson(sec.id,lesson.id);const nx=getNextLesson(sec.id,lesson.id);if(!pv&&!nx)return'';return`<div style="display:flex;gap:8px;margin-top:8px">
      ${pv?`<button class="btn btn-outline no-print" onclick="studyGo(${pv.sec.id},'${pv.lesson.id}')" style="flex:1;border-color:var(--brand-2)20;color:var(--brand-2)">← Previous: ${esc(pv.lesson.title)}</button>`:'<div style="flex:1"></div>'}
      ${nx?`<button class="btn btn-outline no-print" onclick="studyGo(${nx.sec.id},'${nx.lesson.id}')" style="flex:1;border-color:var(--brand-2)20;color:var(--brand-2)">Next: ${esc(nx.lesson.title)} →</button>`:''}
    </div>`;})()}
    <div class="no-print" style="margin-top:12px">
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
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
          <div style="font-size:11px;font-weight:500;color:${sec.text};letter-spacing:.5px">LESSONS & QUIZZES</div>
          <button onclick="event.stopPropagation();downloadSectionPDF(${sec.id})" title="Download all ${sec.lessons.length} lessons in this section as one PDF" style="flex-shrink:0;display:flex;align-items:center;gap:5px;padding:4px 10px;border-radius:7px;border:.5px solid ${sec.text}30;background:#fff;color:${sec.strong};font-size:11px;font-weight:500;cursor:pointer">⬇️ Section PDF</button>
        </div>
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


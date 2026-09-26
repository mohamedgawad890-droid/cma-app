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
  const had=upvotes.includes(uid);
  const newUpvotes=had?upvotes.filter(u=>u!==uid):[...upvotes,uid];
  try{
    // Batch 23 (B23-06): server-side arrayUnion/arrayRemove — only ever touches
    // this user's own uid, so a stale local list can't overwrite other votes
    // (the rules now reject any upvotes change other than the caller's own uid).
    const FV=firebase.firestore.FieldValue;
    await db.collection('questions').doc(qId).update({upvotes:had?FV.arrayRemove(uid):FV.arrayUnion(uid)});
    q.upvotes=newUpvotes;render();
  }catch(e){console.log('Upvote error:',e);}
}

async function upvoteReply(qId,rId){
  const uid=STATE.user.uid;
  const r=STATE.questionReplies.find(r=>r.id===rId);
  if(!r)return;
  const upvotes=r.upvotes||[];
  const had=upvotes.includes(uid);
  const newUpvotes=had?upvotes.filter(u=>u!==uid):[...upvotes,uid];
  try{
    // Batch 23 (B23-06): atomic toggle of the caller's own uid only.
    const FV=firebase.firestore.FieldValue;
    await db.collection('questions').doc(qId).collection('replies').doc(rId).update({upvotes:had?FV.arrayRemove(uid):FV.arrayUnion(uid)});
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
      // Batch 23 (B23-14): Arabic recap text is searchable from global search.
      if(b.t==='arsum'&&Array.isArray(b.topics))return b.topics.map(t=>[t.h||'',...(t.pts||[]),...(t.trap||[])].join(' ')).join(' ');
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

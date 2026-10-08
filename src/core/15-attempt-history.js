// ═══════════════════════════════════════════════════════════════════════════
//  BATCH 30 — ATTEMPT HISTORY: REVIEW & RETAKE
//  (Practice > MCQ Quiz, CBQ, Mock Exam, Custom Test)
// ═══════════════════════════════════════════════════════════════════════════
// BEFORE: only Custom Test kept finished attempts. MCQ Quiz kept nothing, CBQ
// kept only a score in localStorage, Mock Exam kept 5 percentages in
// localStorage — so a student could never review or retake anything.
//
// HOW IT WORKS
//   • Every finished attempt is saved to Firestore `custom-practice-results`
//     (the same private, owner-only collection Custom Test already uses — NO
//     firestore.rules change). Quiz and Mock attempts are full docs with a
//     question snapshot; CBQ attempts live inside the index (answers are tiny).
//   • One small INDEX doc per student, id `ah-index_<uid>` (kind:'index',
//     submitted:false so the existing rules allow updating it), holds a short
//     summary of recent attempts. A history list costs ONE read; the full doc
//     is fetched only when the student taps Review / Retake.
//   • First load for a student seeds the index from their existing Custom Test
//     docs (one-time query), so nothing already saved is lost.
//   • Retake runs in the existing timed exam runner as a private practice
//     session (same questions, new order, or wrong answers only).
//
// Loads AFTER 14-share-popup.js (numeric prefix). Like files 13 and 14 it wraps
// existing global functions instead of editing them; every wrapper calls the
// original first, returns its result untouched, and falls back to the original
// output if anything here throws. To remove the feature: delete this one file.
//
// GA4 events (ids/counts only): attempt_review {kind}, attempt_retake
// {kind, wrong_only, questions}.

(function(){
  'use strict';
  if(typeof db==='undefined'||typeof STATE==='undefined'||typeof firebase==='undefined')return;

  var COL='custom-practice-results';
  var CAPS={quiz:30,mock:15,custom:30,cbq:120};   // newest N kept per kind
  var SHOW=10;                                     // rows shown per screen
  var TABS={quiz:'quiz-mode-select',mock:'mock-exam',custom:'custom-practice'};
  var AH={uid:null,items:[],loaded:false,loading:null,failedAt:0,indexReady:false,docs:{},docOrder:[],hydrated:false,reviewing:false};
  var ahQmap=null;

  // ── tiny helpers ─────────────────────────────────────────────────────────
  function ahSafe(fn){try{return fn();}catch(e){return undefined;}}
  function ahUid(){return STATE.user?STATE.user.uid:null;}
  function ahCol(){return db.collection(COL);}
  function ahIdxRef(u){return ahCol().doc('ah-index_'+u);}
  function ahClean(o){return JSON.parse(JSON.stringify(o));}      // drops undefined (Firestore rejects it)
  function ahNewId(p){return p+'_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
  function ahPct(s,t){return t?Math.round(s/t*100):0;}
  function ahToast(m,t){ahSafe(function(){showToast(m,t||'info');});}
  function ahWarn(){try{console.warn.apply(console,arguments);}catch(e){}}
  function ahGa(n,p){ahSafe(function(){track(n,p||{});});}
  function ahIso(ms){var d=new Date(ms);return isNaN(d.getTime())?new Date().toISOString():d.toISOString();}
  function ahWhen(at){
    var d=new Date(at);
    if(!at||isNaN(d.getTime()))return '';
    return d.toLocaleString('en-GB',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
  }
  function ahMerge(a,b){                                           // later list wins on same id
    var m=new Map();
    (a||[]).concat(b||[]).forEach(function(x){if(x&&x.id)m.set(x.id,x);});
    return Array.from(m.values());
  }
  function ahNewest(a,b){return String(b.at||'').localeCompare(String(a.at||''));}
  function ahTrim(items){
    var n={};
    return items.slice().sort(ahNewest).filter(function(x){
      var k=x.kind||'custom';
      n[k]=(n[k]||0)+1;
      return n[k]<=(CAPS[k]||30);
    });
  }
  function ahFind(id){return AH.items.filter(function(x){return x.id===id;})[0]||null;}
  function ahBusy(){                                               // an INSTRUCTOR exam is mid-way
    var s=STATE.examSession;
    if(s&&!s.submitted&&!s.reviewMode&&!s.isPractice){
      ahToast('Finish or submit your current exam first.','warning');
      return true;
    }
    return false;
  }

  // ── question snapshots ───────────────────────────────────────────────────
  // Firestore forbids arrays directly inside arrays, and q.data is an array of
  // rows — so it is stored as a JSON string (dj) and unpacked on read.
  function ahPack(q,extra){
    var o={q:q.q,o:q.o,a:q.a,e:q.e||'',wrongWhy:q.wrongWhy||null,_lid:q._lid||'',_ltitle:q._ltitle||''};
    if(q.data&&q.data.length)o.dj=JSON.stringify(q.data);
    if(q.ask)o.ask=q.ask;
    if(extra){for(var k in extra)o[k]=extra[k];}
    return o;
  }
  function ahUnpack(s){
    var q=Object.assign({},s);
    if(!q.data&&q.dj){var d=ahSafe(function(){return JSON.parse(q.dj);});if(d)q.data=d;}
    return q;
  }
  function ahFit(snap){                                            // stay well under the 1 MB doc limit
    var len=function(){return JSON.stringify(snap).length;};
    if(len()>850000)snap.forEach(function(s){s.wrongWhy=null;});
    if(len()>850000)snap.forEach(function(s){s.e=String(s.e||'').slice(0,160);});
    return snap;
  }
  function ahQMap(){                                               // question text -> lesson (mock lost it)
    if(ahQmap)return ahQmap;
    var m=Object.create(null),n=0;
    S.forEach(function(sec){sec.lessons.forEach(function(l){(l.quizzes||[]).forEach(function(q){
      if(q&&q.q&&!m[q.q]){m[q.q]={lid:l.id,lt:l.title};n++;}
    });});});
    if(n)ahQmap=m;
    return m;
  }

  // ── index load / seed / write ────────────────────────────────────────────
  function ahEnsure(){
    var u=ahUid();
    if(!u)return Promise.resolve();
    if(AH.uid!==u){AH.uid=u;AH.items=[];AH.loaded=false;AH.loading=null;AH.failedAt=0;AH.indexReady=false;AH.docs={};AH.docOrder=[];AH.hydrated=false;}
    if(AH.loaded)return Promise.resolve();
    if(AH.loading)return AH.loading;
    if(Date.now()-AH.failedAt<30000)return Promise.resolve();
    var p=ahCol().where('userId','==',u).where('kind','==','index').limit(1).get().then(function(snap){
      if(!snap.empty){
        var arr=snap.docs[0].data().items;
        arr=Array.isArray(arr)?arr:[];
        AH.indexReady=true;
        var t=ahTrim(arr);
        AH.items=ahMerge(t,AH.items);
        if(t.length<arr.length)ahIdxRef(u).set({items:t},{merge:true}).catch(function(){});
        return;
      }
      return ahSeed(u);
    }).then(function(){
      AH.loaded=true;
    }).catch(function(e){
      AH.failedAt=Date.now();
      ahWarn('[history] load failed',e);
    }).then(function(){
      AH.loading=null;
      ahOnLoaded();
    });
    AH.loading=p;
    return p;
  }
  function ahSeed(u){                                              // one-time: index existing Custom Test docs
    return ahCol().where('userId','==',u).get().then(function(snap){
      var items=[];
      snap.docs.forEach(function(d){
        var x=d.data();
        if(!x||x.kind==='index'||!x.submitted)return;
        var it={id:d.id,doc:d.id,kind:x.kind||'custom',title:x.title||'Practice test',score:x.score||0,total:x.total||0,pct:x.percentage||0,at:x.submittedAt||''};
        if(x.rt)it.rt=1;
        if(it.kind==='mock'){it.w=(typeof x.weighted==='number')?x.weighted:it.pct;it.cb=(x.cbq&&x.cbq.total)?ahPct(x.cbq.correct,x.cbq.total):-1;}
        items.push(it);
      });
      items=ahTrim(items);
      AH.items=ahMerge(items,AH.items);
      if(!items.length)return;
      return ahIdxRef(u).set({userId:u,kind:'index',submitted:false,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),items:items},{merge:true})
        .then(function(){AH.indexReady=true;})
        .catch(function(e){ahWarn('[history] index seed write failed',e);});
    });
  }
  function ahOnLoaded(){
    if(AH.loaded)ahSafe(ahHydrate);
    ahSafe(ahRefresh);
  }
  function ahRefresh(){                                            // repaint only the screens that show history
    var t=STATE.tab;
    if(t==='quiz-mode-select'||t==='custom-practice')render();
    else if(t==='mock-exam'){var me=STATE.mockExam;if(!me||me.status==='idle')render();}
    else if(t==='cbq'&&typeof CBQ_S!=='undefined'&&CBQ_S.view==='list'&&typeof cbqRenderList==='function')cbqRenderList();
  }
  function ahHydrate(){                                            // CBQ badges survive a new device / reinstall
    if(AH.hydrated||typeof CBQ_S==='undefined')return;
    AH.hydrated=true;
    var seen={},any=false;
    AH.items.filter(function(x){return x.kind==='cbq';}).sort(ahNewest).forEach(function(x){
      if(seen[x.cid])return;
      seen[x.cid]=1;
      if(!CBQ_S.scores[x.cid]){CBQ_S.scores[x.cid]={s:x.score,t:x.total};any=true;}
    });
    if(any&&typeof cbqSaveScores==='function')cbqSaveScores();
  }
  function ahWriteIndex(item){
    var u=ahUid();
    if(!u)return Promise.resolve();
    var FVx=firebase.firestore.FieldValue;
    var full=AH.loaded&&!AH.indexReady;                            // no index on the server yet -> create it whole
    var payload={userId:u,kind:'index',submitted:false,updatedAt:FVx.serverTimestamp(),items:full?AH.items.slice():FVx.arrayUnion(item)};
    return ahIdxRef(u).set(payload,{merge:true}).then(function(){AH.indexReady=true;}).catch(function(e){
      ahWarn('[history] index write failed',e);
      ahToast('Couldn\u2019t update your attempt history.','warning');
    });
  }
  function ahAddItem(item){
    item=ahClean(item);
    AH.items=ahMerge(AH.items,[item]);
    return ahWriteIndex(item);
  }
  function ahCache(id,doc){
    AH.docs[id]=doc;
    AH.docOrder=AH.docOrder.filter(function(x){return x!==id;});
    AH.docOrder.push(id);
    while(AH.docOrder.length>6){delete AH.docs[AH.docOrder.shift()];}
  }
  function ahGetDoc(id){
    if(AH.docs[id])return Promise.resolve(AH.docs[id]);
    return ahCol().doc(id).get().then(function(d){
      if(!d.exists)return null;
      var x=d.data();
      ahCache(id,x);
      return x;
    });
  }

  // ── saving finished attempts ─────────────────────────────────────────────
  function ahSave(kind,title,at,started,answers,snap,score,total,itemX,docX){
    var u=ahUid();
    if(!u)return null;
    var pct=ahPct(score,total);
    var ref=ahCol().doc();
    var doc={userId:u,kind:kind,examId:ahNewId(kind),title:title,startedAt:started,answers:answers,questionSnapshot:ahFit(snap),score:score,total:total,percentage:pct,submitted:true,submittedAt:at,autoSubmitted:false};
    var k;
    if(docX){for(k in docX)doc[k]=docX[k];}
    doc=ahClean(doc);
    var item={id:ref.id,doc:ref.id,kind:kind,title:title,score:score,total:total,pct:pct,at:at};
    if(itemX){for(k in itemX)item[k]=itemX[k];}
    item=ahClean(item);
    ahCache(ref.id,doc);
    AH.items=ahMerge(AH.items,[item]);                             // show it immediately
    ref.set(doc).then(function(){return ahWriteIndex(item);}).catch(function(e){
      ahWarn('[history] save failed',e);
      AH.items=AH.items.filter(function(x){return x.id!==item.id;});
      delete AH.docs[item.id];
      ahToast('Couldn\u2019t save this attempt to your history.','warning');
    });
    return ref.id;
  }
  function ahRecordQuiz(qm){
    var qs=qm.questions||[];
    if(!qs.length||!ahUid())return;
    var snap=qs.map(function(q){return ahPack(q,{_lid:q.lessonId||'',_ltitle:q.lessonTitle||'',_sid:q.sectionId||0,_stitle:q.sectionTitle||''});});
    var answers=qs.map(function(q,i){var a=qm.answers[i];return {picked:(a&&a.selected!=null)?a.selected:null,correct:!!(a&&a.correct)};});
    var score=answers.filter(function(a){return a.correct;}).length;
    var sec=qm.sectionId?S.filter(function(s){return s.id===qm.sectionId;})[0]:null;
    var title=sec?sec.title+' Quiz':'Full CMA Quiz';
    var at=new Date().toISOString();
    ahSave('quiz',title,at,qm.quizStartTime?ahIso(qm.quizStartTime):at,answers,snap,score,qs.length);
  }
  function ahRecordMock(me){
    var r=me.results,qs=me.mcqQ||[];
    if(!r||!qs.length||!ahUid())return;
    var map=ahQMap();
    var snap=qs.map(function(q){var m=map[q.q]||{};return ahPack(q,{_lid:m.lid||'',_ltitle:m.lt||'',_sid:q.sid||0,_stitle:q.stitle||''});});
    var answers=qs.map(function(q,i){var p=me.mcqA[i];return {picked:p===undefined?null:p,correct:p===q.a};});
    var total=r.mcqTotal||qs.length;
    var mcqPct=ahPct(r.mcqCorrect,total);
    var cbqPct=r.cbqTotal?ahPct(r.cbqCorrect,r.cbqTotal):-1;
    var w=Math.round(mcqPct*0.75+(r.cbqTotal?cbqPct:mcqPct)*0.25);
    var at=new Date().toISOString();
    var used=Math.max(0,(10800-(me.mcqTime||0))+(3600-(me.cbqTime||0)));
    var id=ahSave('mock','Mock Exam',at,ahIso(Date.now()-used*1000),answers,snap,r.mcqCorrect,total,{w:w,cb:cbqPct},{cbq:{correct:r.cbqCorrect||0,total:r.cbqTotal||0},weighted:w,timeSec:used});
    if(id){
      me._ahDocId=id;
      if(STATE.tab==='mock-exam'&&me.status==='results')ahSafe(render);   // reveal the Review button
    }
  }
  function ahRecordCbq(key,cbq,sc,answers){
    if(!ahUid())return;
    ahAddItem({id:ahNewId('cbq'),kind:'cbq',key:key,cid:cbq.id,title:cbq.title,score:sc.s,total:sc.t,pct:ahPct(sc.s,sc.t),at:new Date().toISOString(),a:answers});
  }

  // ── list UI ──────────────────────────────────────────────────────────────
  function ahBtn(label,fn,id,solid){
    return '<button onclick="'+fn+'(\''+id+'\')" style="padding:6px 11px;border-radius:8px;font-size:11px;font-weight:600;cursor:pointer;font-family:inherit;border:.5px solid '+(solid?'var(--brand)':'var(--border-4)')+';background:'+(solid?'var(--brand)':'#fff')+';color:'+(solid?'#fff':'var(--brand)')+'">'+label+'</button>';
  }
  function ahWrap(heading,inner,tight){
    return '<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin:'+(tight?'0 0 16px':'16px 0 0')+'"><div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px">'+heading+'</div>'+inner+'</div>';
  }
  function ahRowHTML(it){
    var isMock=it.kind==='mock';
    var main=(isMock&&typeof it.w==='number')?it.w:(it.pct||0);
    var passAt=isMock?70:(typeof EXAM_PASS_THRESHOLD==='number'?EXAM_PASS_THRESHOLD:72);
    var good=main>=passAt;
    var col=good?'var(--ok-strong-2)':'var(--err)';
    var bg=good?'var(--ok-tint)':'var(--err-tint)';
    var sub=isMock?('MCQ '+(it.pct||0)+'%'+((typeof it.cb==='number'&&it.cb>=0)?' \u00B7 CBQ '+it.cb+'%':'')):((it.score||0)+'/'+(it.total||0));
    var wrong=Math.max(0,(it.total||0)-(it.score||0));
    var id=esc(it.id);
    var btns=ahBtn('Review \u203A','ahReview',id,true)+ahBtn('\uD83D\uDD01 Retake','ahRetake',id,false)+(wrong>0?ahBtn('Wrong only ('+wrong+')','ahRetakeWrong',id,false):'');
    var when=ahWhen(it.at);
    return '<div style="padding:10px 0;border-bottom:.5px solid var(--bg)">'
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<div style="background:'+bg+';color:'+col+';border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;min-width:46px;text-align:center">'+main+'%</div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+(it.rt?'\uD83D\uDD01 ':'')+esc(it.title||'Attempt')+'</div>'
      +'<div style="font-size:11px;color:#888;margin-top:1px">'+esc(sub)+(when?' \u00B7 '+esc(when):'')+'</div></div></div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+btns+'</div></div>';
  }
  function ahSkeleton(){return '<div class="gs-skeleton-line medium"></div><div class="gs-skeleton-line long"></div>';}
  function ahListSection(kind,heading,tight){
    if(!ahUid())return '';
    if(!AH.loaded){
      if(AH.failedAt&&!AH.loading)return '';
      return ahWrap(heading,ahSkeleton(),tight);
    }
    var rows=AH.items.filter(function(x){return x.kind===kind;}).sort(ahNewest).slice(0,SHOW);
    if(!rows.length)return ahWrap(heading,'<div style="font-size:12px;color:#888;line-height:1.6">Your finished attempts will appear here, with <b>Review</b> and <b>Retake</b>.</div>',tight);
    return ahWrap(heading,rows.map(ahRowHTML).join(''),tight);
  }
  function ahCbqRowHTML(it){
    var p=(it.pct!=null)?it.pct:ahPct(it.score,it.total);
    var good=p>=70;
    var col=good?'var(--ok-strong)':'var(--warn-strong)';
    var bg=good?'var(--ok-tint)':'var(--warn-tint)';
    var id=esc(it.id);
    var when=ahWhen(it.at);
    return '<div style="padding:10px 0;border-bottom:.5px solid var(--bg)">'
      +'<div style="display:flex;align-items:center;gap:10px">'
      +'<div style="background:'+bg+';color:'+col+';border-radius:8px;padding:5px 10px;font-size:12px;font-weight:700;min-width:46px;text-align:center">'+p+'%</div>'
      +'<div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:500;color:var(--ink)">'+esc(it.title||'Case')+'</div>'
      +'<div style="font-size:11px;color:#888;margin-top:1px">'+esc((it.score||0)+'/'+(it.total||0))+(when?' \u00B7 '+esc(when):'')+'</div></div></div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">'+ahBtn('Review \u203A','ahCbqReview',id,true)+ahBtn('\uD83D\uDD01 Retake','ahCbqRetake',id,false)+'</div></div>';
  }
  function ahCbqSection(key){
    if(!ahUid())return '';
    var heading='\uD83D\uDCDC Your attempts \u2014 Section '+key;
    var wrapC=function(inner){return '<div style="background:#fff;border:.5px solid var(--border);border-radius:12px;padding:14px;margin:0 16px 16px"><div style="font-size:13px;font-weight:600;color:var(--ink);margin-bottom:8px">'+heading+'</div>'+inner+'</div>';};
    if(!AH.loaded)return (AH.failedAt&&!AH.loading)?'':wrapC(ahSkeleton());
    var rows=AH.items.filter(function(x){return x.kind==='cbq'&&x.key===key;}).sort(ahNewest).slice(0,8);
    if(!rows.length)return '';
    return wrapC(rows.map(ahCbqRowHTML).join(''));
  }
  function ahAppend(h,block){
    if(!block||typeof h!=='string')return h;
    var i=h.lastIndexOf('</div>');
    return i<0?h+block:h.slice(0,i)+block+h.slice(i);
  }
  function ahInsertBefore(h,text,block){
    if(!block||typeof h!=='string')return h;
    var i=h.indexOf(text);
    if(i<0)return ahAppend(h,block);
    var j=h.lastIndexOf('<',i);
    return j<0?ahAppend(h,block):h.slice(0,j)+block+h.slice(j);
  }

  // ── review / retake (Quiz, Mock, Custom) ─────────────────────────────────
  function ahOpenReview(id){
    var it=ahFind(id);
    var docId=(it&&it.doc)||id;
    var kind=it?it.kind:'custom';
    if(ahBusy())return;
    ahGa('attempt_review',{kind:kind});
    if(!AH.docs[docId])ahToast('Loading review\u2026','info');
    ahGetDoc(docId).then(function(data){
      if(!data||!Array.isArray(data.questionSnapshot)||!data.questionSnapshot.length){ahToast('Review data is not available for this attempt.','error');return;}
      var qs=data.questionSnapshot,answers={};
      (data.answers||[]).forEach(function(a,i){if(a&&a.picked!=null)answers[i]=a.picked;});
      STATE.examSession={
        examId:data.examId||docId,docId:docId,exam:{title:data.title||'Attempt'},
        questions:qs,answers:answers,currentIdx:0,reviewIdx:0,
        startedAt:data.startedAt,deadlineAt:data.deadlineAt,
        submitting:false,submitted:true,reviewMode:true,isPractice:true,
        instructorReturnTab:TABS[kind]||'custom-practice',
        results:{score:data.score||0,total:data.total||qs.length,percentage:data.percentage||0,autoSubmitted:!!data.autoSubmitted,submittedAt:data.submittedAt||''},
        navOpen:false
      };
      STATE.tab='exam';
      render();
    }).catch(function(e){ahToast('Could not load review: '+((e&&e.message)||e),'error');});
  }
  function ahRetake(id,wrongOnly){
    var it=ahFind(id);
    if(!it||ahBusy())return;
    ahGetDoc(it.doc||it.id).then(function(data){
      if(!data||!Array.isArray(data.questionSnapshot)||!data.questionSnapshot.length){ahToast('Question data is not available for this attempt.','error');return null;}
      var pool=[];
      data.questionSnapshot.forEach(function(s,i){
        var a=(data.answers||[])[i];
        if(wrongOnly&&a&&a.correct)return;
        pool.push(ahUnpack(s));
      });
      if(!pool.length){ahToast('No wrong answers in this attempt \u2014 nice!','success');return null;}
      var qs=shuffle(pool).map(function(q){return shuffleQuestionOptions(q);});
      var dur=Math.max(5,Math.ceil(qs.length*1.8));               // CMA pace: 1.8 min / question
      var base=String(it.title||'Practice').replace(/^Retake( \(wrong only\))? \u2014 /,'');
      var title='Retake'+(wrongOnly?' (wrong only)':'')+' \u2014 '+base;
      return showModal({
        icon:'\uD83D\uDD01',title:'Retake '+qs.length+' question'+(qs.length===1?'':'s')+'?',
        body:'\u26A0\uFE0F The timer starts immediately and the test submits automatically at the deadline.',
        list:['\u23F1\uFE0F Duration: '+dur+' minutes','\uD83D\uDD00 Same questions, new order','\uD83D\uDD12 Private \u2014 only you can see this result'],
        type:'info',confirmText:'Start',cancelText:'Not yet'
      }).then(function(ok){if(ok)ahStartRetake(it,qs,dur,title,wrongOnly);});
    }).catch(function(e){ahToast('Could not start the retake: '+((e&&e.message)||e),'error');});
  }
  function ahStartRetake(it,qs,dur,title,wrongOnly){
    if(ahBusy())return;
    var now=Date.now(),examId='retake_'+now;
    var sess={
      examId:examId,exam:{id:examId,title:title,sectionIds:[],count:qs.length,durationMinutes:dur},
      questions:qs,answers:{},currentIdx:0,flagged:{},
      startedAt:new Date(now).toISOString(),deadlineAt:new Date(now+dur*60000).toISOString(),
      submitting:false,submitted:false,results:null,navOpen:false,
      isPractice:true,instructorReturnTab:TABS[it.kind]||'custom-practice',
      ahKind:it.kind,ahRetakeOf:it.id
    };
    STATE.examSession=sess;
    ahSafe(function(){_examSaveLocal(sess);});
    ahGa('attempt_retake',{kind:it.kind,wrong_only:wrongOnly?1:0,questions:qs.length});
    STATE.tab='exam';
    render();
    _examStartTimer();
  }

  // ── CBQ review / retake ──────────────────────────────────────────────────
  function ahSyncTabs(i){
    Array.prototype.forEach.call(document.querySelectorAll('.cbq-sec-tab'),function(t,j){t.classList.toggle('active',j===i);});
  }
  function ahCbqLocate(it){
    if(typeof CBQ_DATA==='undefined'||typeof CBQ_S==='undefined')return null;
    var ti=CBQ_TAB_KEYS.indexOf(it.key),arr=CBQ_DATA[it.key];
    var ci=arr?arr.map(function(c){return c.id;}).indexOf(it.cid):-1;
    if(ti<0||ci<0){ahToast('This case is no longer available.','warning');return null;}
    return {ti:ti,ci:ci,cbq:arr[ci]};
  }
  function ahCbqReview(id){
    var it=ahFind(id),loc=it&&ahCbqLocate(it);
    if(!loc)return;
    ahGa('attempt_review',{kind:'cbq'});
    CBQ_S.secIdx=loc.ti;ahSyncTabs(loc.ti);
    CBQ_S.cbqIdx=loc.ci;CBQ_S.view='detail';CBQ_S.checked=false;
    CBQ_S.answers=ahClean(it.a||{});
    cbqRenderDetail();
    var A=CBQ_S.answers;
    loc.cbq.questions.forEach(function(q){
      var a=A[q.id];
      if(a==null)return;
      if(q.type==='calc'){var el=document.getElementById('inp_'+q.id);if(el)el.value=a;}
      else if(q.type==='select'){cbqPickOpt(q.id,parseInt(a,10));}
      else if(q.type==='blank'){q.blanks.forEach(function(b){var e2=document.getElementById('bl_'+q.id+'_'+b.id);if(e2&&a[b.id])e2.value=a[b.id];});}
      else if(q.type==='drag'){q.items.forEach(function(item){
        var z=a[item];
        if(!z)return;
        var chip=document.getElementById('chip_'+q.id+'_'+item.replace(/\W/g,'_'));
        var zone=document.getElementById('zone_'+q.id+'_'+z.replace(/\W/g,'_'));
        if(chip&&zone)zone.appendChild(chip);
      });}
    });
    // Grade the restored answers without logging a new attempt or analytics event.
    var tk=window.track;
    AH.reviewing=true;
    window.track=function(){};
    try{cbqCheck();}finally{AH.reviewing=false;window.track=tk;}
  }
  function ahCbqRetake(id){
    var it=ahFind(id),loc=it&&ahCbqLocate(it);
    if(!loc)return;
    ahGa('attempt_retake',{kind:'cbq',wrong_only:0,questions:loc.cbq.questions.length});
    CBQ_S.secIdx=loc.ti;ahSyncTabs(loc.ti);
    cbqOpen(loc.ci);
  }

  // ── practice sessions: save richer docs + record them in the index ───────
  // The original submitExam writes the practice doc without q.data / q.ask, so a
  // review of a calculation question lost its table. While the call is running,
  // db.collection('custom-practice-results').add is wrapped to add them (and the
  // retake kind) to the outgoing doc. If enrichment fails the doc is sent as is.
  function ahEnrichPractice(doc,sess){
    if(!doc||!sess)return;
    var qs=sess.questions||[];
    if(Array.isArray(doc.questionSnapshot)&&doc.questionSnapshot.length===qs.length){
      doc.questionSnapshot=doc.questionSnapshot.map(function(s,i){
        var q=qs[i]||{};
        if(q.data&&q.data.length)s.dj=JSON.stringify(q.data);
        if(q.ask)s.ask=q.ask;
        return s;
      });
      ahFit(doc.questionSnapshot);
    }
    if(sess.ahKind){doc.kind=sess.ahKind;doc.rt=1;}
  }
  function ahWithEnrichment(sess,run){
    var own=false;
    try{
      var orig=db.collection;
      db.collection=function(name){
        var c=orig.apply(db,arguments);
        if(name===COL&&c&&typeof c.add==='function'){
          var oa=c.add;
          c.add=function(doc){ahSafe(function(){ahEnrichPractice(doc,sess);});return oa.apply(c,arguments);};
        }
        return c;
      };
      own=true;
    }catch(e){}
    var restore=function(){if(own){own=false;ahSafe(function(){delete db.collection;});}};
    return run().then(function(r){restore();return r;},function(e){restore();throw e;});
  }

  // ── wrappers ─────────────────────────────────────────────────────────────
  if(typeof finishQuizMode==='function'){                          // MCQ Quiz finished
    var _fqm=finishQuizMode;
    finishQuizMode=async function(){
      var before=!!(STATE.quizMode&&STATE.quizMode.done);
      var out=await _fqm.apply(this,arguments);
      ahSafe(function(){
        var qm=STATE.quizMode;
        if(qm&&qm.done&&!before&&!qm.isGrace&&!qm._ahSaved){qm._ahSaved=true;ahRecordQuiz(qm);}
      });
      return out;
    };
  }
  if(typeof mockSubmitCBQ==='function'){                           // Mock Exam finished
    var _msc=mockSubmitCBQ;
    mockSubmitCBQ=function(){
      var was=STATE.mockExam&&STATE.mockExam.status;
      var out=_msc.apply(this,arguments);
      ahSafe(function(){
        var me=STATE.mockExam;
        if(me&&me.status==='results'&&was!=='results'&&me.results&&!me._ahSaved){me._ahSaved=true;ahRecordMock(me);}
      });
      return out;
    };
  }
  if(typeof cbqCheck==='function'){                                // CBQ case graded
    var _cc=cbqCheck;
    cbqCheck=function(){
      var key=null,cbq=null,pre=null;
      if(!AH.reviewing)ahSafe(function(){key=CBQ_TAB_KEYS[CBQ_S.secIdx];cbq=CBQ_DATA[key][CBQ_S.cbqIdx];pre=ahClean(CBQ_S.answers||{});});
      var out=_cc.apply(this,arguments);
      if(!AH.reviewing)ahSafe(function(){
        if(!cbq)return;
        var sc=CBQ_S.scores[cbq.id];
        if(sc)ahRecordCbq(key,cbq,sc,pre);
      });
      return out;
    };
  }
  if(typeof submitExam==='function'){                              // Custom Test / retake submitted
    var _se=submitExam;
    submitExam=async function(){
      var self=this,args=arguments,s0=STATE.examSession,out;
      if(s0&&s0.isPractice&&!s0.submitted)out=await ahWithEnrichment(s0,function(){return _se.apply(self,args);});
      else out=await _se.apply(self,args);
      ahSafe(function(){
        var s=STATE.examSession;
        if(!s||!s.isPractice||!s.submitted||!s.results||s.results._ahSaved||!s.docId)return;
        s.results._ahSaved=true;
        var r=s.results;
        ahAddItem({id:s.docId,doc:s.docId,kind:s.ahKind||'custom',rt:s.ahRetakeOf?1:0,title:(s.exam&&s.exam.title)||'Practice test',score:r.score,total:r.total,pct:r.percentage,at:r.submittedAt||new Date().toISOString()});
      });
      return out;
    };
  }
  if(typeof dataTableHTML==='function'){                           // snapshots store q.data as a JSON string (dj)
    var _dt=dataTableHTML;
    dataTableHTML=function(q){
      if(q&&!q.data&&q.dj){var d=ahSafe(function(){return JSON.parse(q.dj);});if(d)q=Object.assign({},q,{data:d});}
      return _dt.call(this,q);
    };
  }
  if(typeof renderExamResult==='function'){                        // practice results are private
    var _rer=renderExamResult;
    renderExamResult=function(){
      var h=_rer.apply(this,arguments);
      if(STATE.examSession&&STATE.examSession.isPractice&&typeof h==='string'){
        h=h.replace('Your instructor can now see this result on their dashboard.','This is a private practice result \u2014 only you can see it. It is saved in your history.');
      }
      return h;
    };
  }

  // ── screens ──────────────────────────────────────────────────────────────
  if(typeof renderQuizModeSelect==='function'){
    var _rqs=renderQuizModeSelect;
    renderQuizModeSelect=function(){
      var h=_rqs.apply(this,arguments);
      try{ahEnsure();return ahInsertBefore(h,'BY SECTION',ahListSection('quiz','\uD83D\uDCDC Your Recent Quizzes',true));}catch(e){return h;}
    };
  }
  if(typeof renderCustomPractice==='function'){
    var _rcp=renderCustomPractice;
    renderCustomPractice=function(){
      var h,keep=STATE.practiceHistory;
      STATE.practiceHistoryLoaded=true;                            // our index replaces the heavy full-doc query
      STATE.practiceHistory=[];
      try{h=_rcp.apply(this,arguments);}finally{STATE.practiceHistory=keep;}
      try{ahEnsure();return ahAppend(h,ahListSection('custom','\uD83D\uDCC8 Your Recent Custom Tests')+'<div style="height:20px"></div>');}catch(e){return h;}
    };
  }
  if(typeof renderMockIntro==='function'){
    var _rmi=renderMockIntro;
    renderMockIntro=function(){
      var h,lmr=(typeof loadMockResults==='function')?loadMockResults:null;
      var have=AH.items.some(function(x){return x.kind==='mock';});
      if(have&&lmr)loadMockResults=function(){return [];};         // hide the old local-only list once ours has data
      try{h=_rmi.apply(this,arguments);}finally{if(lmr)loadMockResults=lmr;}
      try{
        ahEnsure();
        var block=ahListSection('mock','\uD83D\uDCC8 Your Mock Exam History',true);
        var i=h.lastIndexOf('<div style="background:var(--warn-tint);border:.5px solid var(--warn)');
        if(i<0)i=h.lastIndexOf('<button onclick="startMockExam()"');
        return i<0?ahAppend(h,block):h.slice(0,i)+block+h.slice(i);
      }catch(e){return h;}
    };
  }
  if(typeof renderMockResults==='function'){
    var _rmr=renderMockResults;
    renderMockResults=function(){
      var h=_rmr.apply(this,arguments);
      try{
        var me=STATE.mockExam;
        if(me&&me._ahDocId){
          var b='<button onclick="ahReview(\''+esc(me._ahDocId)+'\')" style="width:100%;padding:13px;border-radius:10px;border:none;background:var(--brand-2);color:#fff;cursor:pointer;font-size:14px;font-weight:600;font-family:inherit;margin-bottom:10px">\uD83D\uDCD6 Review MCQ Answers</button>';
          var i=h.lastIndexOf('<div style="display:flex;gap:10px">');
          if(i>=0)h=h.slice(0,i)+b+h.slice(i);
        }
      }catch(e){}
      return h;
    };
  }
  if(typeof cbqRenderList==='function'){
    var _crl=cbqRenderList;
    cbqRenderList=function(){
      ahSafe(ahEnsure);
      var out=_crl.apply(this,arguments);
      ahSafe(function(){
        var lv=document.getElementById('listView');
        if(!lv||typeof CBQ_DATA==='undefined'||CBQ_S.view!=='list')return;
        var html=ahCbqSection(CBQ_TAB_KEYS[CBQ_S.secIdx]);
        if(html)lv.insertAdjacentHTML('beforeend',html);
      });
      return out;
    };
  }

  // ── handlers used by inline onclick ──────────────────────────────────────
  window.ahReview=ahOpenReview;
  window.ahRetake=function(id){ahRetake(id,false);};
  window.ahRetakeWrong=function(id){ahRetake(id,true);};
  window.ahCbqReview=ahCbqReview;
  window.ahCbqRetake=ahCbqRetake;
})();

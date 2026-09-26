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
const STATE={tab:'loading',searchQ:'',dictQ:'',dictData:[],dictLoaded:false,leaderboardData:[],leaderboardLoaded:false,quizMode:{active:false,sectionId:null,idx:0,questions:[],answers:[],selected:null},user:null,authScreen:'login',authError:'',authLoading:false,communityFilter:'all',questionDetail:null,showAskForm:false,communityQuestions:[],communityLastDoc:null,communityHasMore:false,communityLoading:false,communityLoaded:false,questionReplies:[],draftTitle:'',draftBody:'',draftSection:'General',draftReply:'',trackerOpenSects:[],sectId:null,lessonId:null,printSectionId:null,quizState:null,showProfileWarning:false,progress:{done:[],lessonScores:{},mcqTotal:0,mcqRight:0},
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
    dashExamDraft:{title:'',groupCode:'',sectionIds:[],unitsBySection:{},count:20,durationMinutes:30,opensAt:'',closesAt:'',maxAttempts:3},
    practiceDraft:{sectionIds:[],unitsBySection:{},count:20,durationMinutes:30},
    practiceHistory:[],practiceHistoryLoaded:false,
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
  'Value Chain':'سلسلة القيمة',
  'Gross Profit':'إجمالي الربح',
  'Operating Income':'الدخل التشغيلي',
  'DM Variance':'انحراف المواد المباشرة',
  'Price Variance':'انحراف السعر',
  'Quantity Variance':'انحراف الكمية',
  'Rate Variance':'انحراف المعدل',
  'Efficiency Variance':'انحراف الكفاءة',
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
  'Variance Analysis':'تحليل الانحرافات',
  'Production Budget':'موازنة الإنتاج',
  'Capital Budget':'الموازنة الرأسمالية',
  'Flexible Budget':'الموازنة المرنة',
  'Static Budget':'الموازنة الثابتة',
  'Master Budget':'الموازنة الرئيسية',
  'Sales Budget':'موازنة المبيعات',
  'Cash Budget':'الموازنة النقدية',
  'Zero-Based Budgeting':'الموازنة الصفرية',
  'Rolling Budget':'الموازنة المتحركة',
  'Learning Curve':'منحنى التعلم',
  'Sensitivity Analysis':'تحليل الحساسية',
  'Scenario Analysis':'تحليل السيناريو',
  'SWOT Analysis':'تحليل نقاط القوة والضعف',
  'PESTLE Analysis':'تحليل بيستل',
  'Strategic Planning':'التخطيط الاستراتيجي',

  // ── Section B additions (Batch 23) — candidate terms from lesson content
  // audit, cross-checked against the full dict to avoid duplicates ───────────
  'Standard Price':'السعر المعياري',
  'Standard Rate':'المعدل المعياري',
  'Standard Quantity':'الكمية المعيارية',
  'Standard Hours':'الساعات المعيارية',
  'Expected Value':'القيمة المتوقعة',
  'Standard Deviation':'الانحراف المعياري',
  'Budgeted Income Statement':'قائمة الدخل التقديرية',
  'Budgeted Balance Sheet':'الميزانية التقديرية',
  'Capital Expenditure Budget':'موازنة الإنفاق الرأسمالي',
  'Cash Cow':'البقرة الحلوب',
  'Competitive Advantage':'الميزة التنافسية',
  'Cost Leadership':'ريادة التكلفة',
  'Ratchet Effect':'تأثير الترس',
  'Linear Regression':'الانحدار الخطي',
  'Cumulative Average Model':'نموذج المتوسط التراكمي',
  'Pro Forma Financial Statements':'القوائم المالية الاسترشادية',
  'Sales Revenue':'إيرادات المبيعات',

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
  'Selling Price Variance':'انحراف سعر البيع',
  'Sales Mix Variance':'انحراف مزيج المبيعات',
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

  // ── Section C additions (Batch 23) — candidate terms from lesson content
  // audit, cross-checked against the full dict to avoid duplicates ───────────
  'VOH Spending Variance':'انحراف إنفاق التكاليف الصناعية المتغيرة غير المباشرة',
  'VOH Efficiency Variance':'انحراف كفاءة التكاليف الصناعية المتغيرة غير المباشرة',
  'FOH Spending Variance':'انحراف إنفاق التكاليف الصناعية الثابتة غير المباشرة',
  'FOH Volume Variance':'انحراف حجم التكاليف الصناعية الثابتة غير المباشرة',
  'Mix Variance':'انحراف المزيج',
  'Yield Variance':'انحراف الإنتاجية',
  'Sales Quantity Variance':'انحراف كمية المبيعات',
  'Market Size Variance':'انحراف حجم السوق',
  'Market Share Variance':'انحراف حصة السوق',
  'Flexible Budget Variance':'انحراف الموازنة المرنة',
  'Static Budget Variance':'انحراف الموازنة الثابتة',
  'Controllable Margin':'الهامش القابل للتحكم',
  'Invested Capital':'رأس المال المستثمر',
  'Segment Margin':'هامش القطاع',
  'Common Costs':'التكاليف المشتركة',
  'Outlay Cost':'تكلفة الإنفاق الفعلي',

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
  'Equivalent Units':'الوحدات المكافئة',
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
  'Operating Leverage':'الرافعة التشغيلية',
  'DL Variance':'انحراف العمالة المباشرة',
  'Overhead Variance':'انحراف التكاليف غير المباشرة',
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

  // ── Section D additions (Batch 22, item 8) — candidate terms from lesson content
  // audit, cross-checked against the full dict to avoid duplicates ───────────────
  'Cost Behavior':'سلوك التكلفة',
  'High-Low Method':'طريقة أعلى وأقل نقطة',
  'Prime Cost':'التكلفة الأولية',
  'Conversion Cost':'تكلفة التحويل',
  'Product Cost':'تكلفة المنتج',
  'Period Cost':'تكلفة الفترة',
  'Differential Cost':'التكلفة التفاضلية',
  'Incremental Cost':'التكلفة الإضافية',
  'Cost Object':'موضوع التكلفة',
  'Cost Pool':'مجمع التكلفة',
  'Allocation Base':'أساس التوزيع',
  'Step Cost':'التكلفة المتدرجة',
  'Relevant Range':'المدى الملائم',
  'Costing Method':'طريقة التكليف',
  'Cost Accumulation Decision':'قرار تجميع التكلفة',
  'Cost Measurement Decision':'قرار قياس التكلفة',
  'Job-Order Costing':'محاسبة تكاليف الأوامر',
  'Cost of Quality':'تكلفة الجودة',
  'CoQ':'تكلفة الجودة',
  'Ideal Standard':'المعيار المثالي',
  'Practical Standard':'المعيار العملي',
  'Manufacturing Cost Flow':'تدفق تكلفة التصنيع',
  'Direct Materials Used':'المواد المباشرة المستخدمة',
  'Direct Materials':'المواد المباشرة',
  'Joint Products':'المنتجات المشتركة',
  'Physical Units Method':'طريقة الوحدات المادية',
  'Sales Value at Split-off Method':'طريقة القيمة البيعية عند نقطة الانفصال',
  'NRV Method':'طريقة صافي القيمة القابلة للتحقق',
  'Constant Gross Margin % Method':'طريقة نسبة هامش الربح الإجمالي الثابتة',
  'Average Cost Method':'طريقة متوسط التكلفة',
  'Sell-or-Process-Further Decision':'قرار البيع أو المعالجة الإضافية',
  'By-Product':'المنتج الثانوي',
  'Production Method':'طريقة الإنتاج',
  'Sales Method':'طريقة المبيعات',
  'Predetermined Overhead Rate':'معدل التحميل المحدد مسبقاً',
  'POHR':'معدل التحميل المحدد مسبقاً',
  'Job Cost Sheet':'بطاقة تكلفة الأمر',
  'Plant-wide Overhead Rate':'معدل التحميل الموحد على مستوى المصنع',
  'Departmental Overhead Rate':'معدل التحميل على مستوى القسم',
  'Cost Driver':'محرك التكلفة',
  'Under-applied Overhead':'تكاليف غير مباشرة محملة بأقل من الفعلي',
  'Over-applied Overhead':'تكاليف غير مباشرة محملة بأكثر من الفعلي',
  'Proration Method':'طريقة التوزيع النسبي',
  'Write-off to COGS':'الشطب على تكلفة البضاعة المباعة',
  'Actual Overhead':'التكاليف غير المباشرة الفعلية',
  'Applied Overhead':'التكاليف غير المباشرة المحملة',
  'Activity Driver':'محرك النشاط',
  'Cross-Subsidization':'الدعم التبادلي بين المنتجات',
  'Unit-Level Activities':'أنشطة على مستوى الوحدة',
  'Batch-Level Activities':'أنشطة على مستوى الدفعة',
  'Product-Level Activities':'أنشطة على مستوى المنتج',
  'Facility-Level Activities':'أنشطة على مستوى المنشأة',
  'Throughput Costing':'محاسبة تكلفة الإنتاجية',
  'Service Department Cost Allocation':'توزيع تكلفة أقسام الخدمات',
  'Single-Rate Method':'طريقة المعدل الواحد',
  'Dual-Rate Method':'طريقة المعدل المزدوج',
  'Direct Method':'الطريقة المباشرة',
  'Step-Down Method':'الطريقة التنازلية',
  'Reciprocal Method':'الطريقة التبادلية',
  'Cost Estimation':'تقدير التكلفة',
  'Least-Squares Method':'طريقة المربعات الصغرى',
  'Account Analysis':'تحليل الحسابات',
  'Engineering Approach':'المدخل الهندسي',
  'Coefficient of Determination':'معامل التحديد',
  'Cumulative Average-Time Model':'نموذج متوسط الوقت التراكمي',
  'Incremental Unit-Time Model':'نموذج وقت الوحدة الإضافية',
  'Supply Chain Management':'إدارة سلسلة التوريد',
  'Bullwhip Effect':'تأثير السوط',
  'Lean Management':'الإدارة الرشيقة',
  'TIMWOOD Waste Framework':'إطار الهدر TIMWOOD',
  'MRP II':'تخطيط موارد التصنيع الثاني',
  'Capacity':'الطاقة الإنتاجية',
  'Theoretical Capacity':'الطاقة النظرية',
  'Practical Capacity':'الطاقة العملية',
  'Normal Capacity':'الطاقة العادية',
  'Expected Capacity':'الطاقة المتوقعة',
  'Primary Activities':'الأنشطة الأساسية',
  'Support Activities':'الأنشطة المساندة',
  'Value Chain Analysis':'تحليل سلسلة القيمة',
  'Process Analysis':'تحليل العمليات',
  'Business Process Reengineering':'إعادة هندسة العمليات',
  'Process Map':'خريطة العملية',
  'Value-Stream Mapping':'رسم خريطة تدفق القيمة',
  'Takt Time':'وقت الإيقاع',
  'Bottleneck':'عنق الزجاجة',
  'TOC 5-Step Focusing Process':'عملية نظرية القيود ذات الخطوات الخمس',
  'Throughput Margin':'هامش الإنتاجية',
  'Prevention Costs':'تكاليف الوقاية',
  'Appraisal Costs':'تكاليف التقييم',
  'Internal Failure Costs':'تكاليف الفشل الداخلي',
  'External Failure Costs':'تكاليف الفشل الخارجي',
  'Total Productive Maintenance':'الصيانة الإنتاجية الشاملة',
  'Customer-Response Time':'زمن الاستجابة للعميل',
  'Manufacturing Cycle Time':'زمن دورة التصنيع',
  'ISO 9000 Family':'عائلة معايير الآيزو 9000',
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

// ── Batch 23 (B23-15): Arabic tooltip coverage for Sections 2, 3 & 4 ─────
// Curated CMA-technical terms only (generic words such as Budget, Cash,
// Business are deliberately excluded — they would underline most sentences).
// Arabic aligned with dictionary/terms.json where that entry was accurate.
// Merged BEFORE _termIndex / the matcher are built, so both see these keys.
Object.assign(TERM_DICT,{
  'Operating Budget':'الموازنة التشغيلية',
  'Financial Budget':'الموازنة المالية',
  'Direct Materials Budget':'موازنة المواد المباشرة',
  'Direct Labor Budget':'موازنة الأجور المباشرة',
  'Manufacturing Overhead Budget':'موازنة التكاليف الصناعية غير المباشرة',
  'Overhead Budget':'موازنة التكاليف غير المباشرة',
  'Project Budget':'موازنة المشروع',
  'Activity-Based Budgeting':'الموازنة على أساس الأنشطة',
  'Participative Budgeting':'الموازنة بالمشاركة',
  'Budget Slack':'الاحتياطي المُضمَّن في الموازنة (التراخي)',
  'Budget Committee':'لجنة الموازنة',
  'Top-Down':'من أعلى إلى أسفل',
  'Bottom-Up':'من أسفل إلى أعلى',
  'Pro Forma':'تقديري / افتراضي',
  'Pro Forma Statements':'القوائم المالية التقديرية',
  'Capital Budgeting':'الموازنة الرأسمالية',
  'Exponential Smoothing':'التمهيد الأُسّي',
  'Moving Average':'المتوسط المتحرك',
  'Weighted Moving Average':'المتوسط المتحرك المرجّح',
  'Time Series':'السلاسل الزمنية',
  'Regression Analysis':'تحليل الانحدار',
  'Regression Equation':'معادلة الانحدار',
  'Simple Regression':'الانحدار البسيط',
  'Multiple Regression':'الانحدار المتعدد',
  'Correlation Coefficient':'معامل الارتباط',
  'Coefficient of Variation':'معامل الاختلاف',
  'Standard Error':'الخطأ المعياري',
  'Delphi Method':'طريقة دلفي',
  'Scenario Planning':'التخطيط بالسيناريوهات',
  'Contingency Planning':'التخطيط للطوارئ',
  'SWOT':'تحليل نقاط القوة والضعف والفرص والتهديدات',
  'Strategic Plan':'الخطة الاستراتيجية',
  'Goal Congruence':'توافق الأهداف',
  'Profit Plan':'خطة الربح',
  'Economies of Scale':'وفورات الحجم',
  'Capital Investment':'الاستثمار الرأسمالي',
  'Cash Flow':'التدفق النقدي',
  'DM Price Variance':'انحراف سعر المواد المباشرة',
  'DM Quantity Variance':'انحراف كمية المواد المباشرة',
  'DL Rate Variance':'انحراف معدل الأجور المباشرة',
  'DL Efficiency Variance':'انحراف كفاءة الأجور المباشرة',
  'Materials Purchase Price Variance':'انحراف سعر شراء المواد',
  'Purchase Price Variance':'انحراف سعر الشراء',
  'Production Volume Variance':'انحراف حجم الإنتاج',
  'Budget Variance':'انحراف الموازنة',
  'Sales Price Variance':'انحراف سعر البيع',
  'Favorable Variance':'انحراف ملائم',
  'Unfavorable Variance':'انحراف غير ملائم',
  'Favorable':'ملائم',
  'Unfavorable':'غير ملائم',
  'Standard Hours Allowed':'الساعات المعيارية المسموح بها',
  'Management by Exception':'الإدارة بالاستثناء',
  'Controllable Cost':'التكلفة القابلة للرقابة',
  'Non-Controllable Cost':'التكلفة غير القابلة للرقابة',
  'Traceable Fixed Cost':'التكلفة الثابتة القابلة للتتبع',
  'Responsibility Accounting':'محاسبة المسؤولية',
  'Hurdle Rate':'معدل العائد الأدنى المقبول',
  'Required Rate of Return':'معدل العائد المطلوب',
  'Rate of Return':'معدل العائد',
  'Cost of Capital':'تكلفة رأس المال',
  'Market Price':'سعر السوق',
  'Net Income':'صافي الدخل',
  'Operating Profit':'الربح التشغيلي',
  'Sales Mix':'مزيج المبيعات',
  'Manufacturing Contribution Margin':'هامش المساهمة الصناعي',
  'Variable Manufacturing Cost':'التكلفة الصناعية المتغيرة',
  'Contribution Margin Income Statement':'قائمة الدخل بصيغة هامش المساهمة',
  'Performance Evaluation':'تقييم الأداء',
  'Performance Measurement':'قياس الأداء',
  'Profitability Analysis':'تحليل الربحية',
  'Resource Allocation':'تخصيص الموارد',
  'Denominator Level':'مستوى النشاط المستخدم في المقام',
  'Actual Cost':'التكلفة الفعلية',
  'Abnormal Spoilage':'التالف غير العادي',
  'Normal Spoilage':'التالف العادي',
  'Backflush Costing':'التكاليف بالتسجيل العكسي',
  'Carrying Cost':'تكلفة الاحتفاظ بالمخزون',
  'Safety Stock':'مخزون الأمان',
  'Lead Time':'مهلة التوريد / التسليم',
  'Kaizen Costing':'تكاليف التحسين المستمر',
  'Operation Costing':'نظام تكاليف العمليات',
  'Physical Units':'الوحدات المادية',
  'Split-Off Point':'نقطة الانفصال',
  'Separable Cost':'التكلفة القابلة للفصل',
  'Sales Value at Split-Off':'القيمة البيعية عند نقطة الانفصال',
  'Physical Measure Method':'طريقة القياس المادي',
  'Constant Gross Margin':'ثبات نسبة مجمل الربح',
  'Service Department':'قسم خدمي',
  'Production Department':'قسم إنتاجي',
  'Value Engineering':'هندسة القيمة',
  'Theory of Constraints':'نظرية القيود',
  'Throughput Contribution':'مساهمة الإنتاجية (الإيراد ناقص المواد المباشرة)',
  'Cycle Time':'زمن الدورة',
  'Reengineering':'إعادة الهندسة',
  'Continuous Improvement':'التحسين المستمر',
  'Critical Success Factors':'عوامل النجاح الحاسمة',
  'Overhead Rate':'معدل تحميل التكاليف غير المباشرة',
  'Departmental Overhead':'التكاليف غير المباشرة للقسم',
  'Plant-Wide Overhead':'التكاليف غير المباشرة على مستوى المصنع',
  'Factory Overhead':'التكاليف الصناعية غير المباشرة',
  'Inventoriable Cost':'التكلفة القابلة للتخزين',
  'Discretionary Cost':'التكلفة الاختيارية',
  'Committed Cost':'التكلفة الملتزم بها',
  'Sunk Cost':'التكلفة الغارقة',
  'Opportunity Cost':'تكلفة الفرصة البديلة',
  'Relevant Cost':'التكلفة الملائمة',
  'Marginal Cost':'التكلفة الحدية',
  'Unit Cost':'تكلفة الوحدة',
  'Direct Cost':'التكلفة المباشرة',
  'Indirect Cost':'التكلفة غير المباشرة',
  'Direct Costing':'التكاليف المباشرة (المتغيرة)',
  'Common Cost':'التكلفة المشتركة',
  'Full Cost':'التكلفة الكاملة',
  'Historical Cost':'التكلفة التاريخية',
  'Cost Management':'إدارة التكلفة',
  'Cost-Plus Pricing':'التسعير على أساس التكلفة زائد هامش',
  'Product Mix':'مزيج المنتجات',
  'Product Line':'خط المنتجات',
  'Inventory Valuation':'تقييم المخزون',
  'Accumulated Depreciation':'مجمع الإهلاك',
  'Prorate':'التوزيع النسبي',
  'Proration':'التوزيع النسبي',
  'Quality Control':'مراقبة الجودة',
  'Life-Cycle Cost':'تكلفة دورة الحياة',
  'Customer Life-Cycle Costing':'تكاليف دورة الحياة من منظور العميل',
  'Target Cost':'التكلفة المستهدفة',
  'Target Price':'السعر المستهدف',
  'Gap Analysis':'تحليل الفجوة',
  'Activity Analysis':'تحليل الأنشطة',
  'Cost Hierarchy':'التدرج الهرمي للتكاليف',
  'Unit-Level':'مستوى الوحدة',
  'Batch-Level':'مستوى الدفعة',
  'Product-Level':'مستوى المنتج',
  'Facility-Level':'مستوى المنشأة',
  'Material Requirements Planning':'تخطيط احتياجات المواد',
  'Manufacturing Resource Planning':'تخطيط موارد التصنيع',
  'Capacity Planning':'تخطيط الطاقة',
  'Direct Labor Hours':'ساعات العمل المباشر',
  'Machine Hours':'ساعات تشغيل الآلات',
  'Activity Base':'أساس النشاط',
  'Cost Allocation':'تخصيص التكاليف'
});

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
// ── Batch 23 (B23-15): single-pass term matcher ──────────────────────
// Replaces the per-term loop (one regex pass per term per block). All keys
// are compiled ONCE into a single alternation, longest-first, so each text
// block is scanned in one pass regardless of dictionary size.
// Behaviour kept: case-insensitive match, original casing preserved, every
// occurrence linked, alphanumeric-safe boundaries.
// Deliberate improvements over the old loop:
//   • no nested spans — "Fixed MOH" no longer gets a second "MOH" span inside
//   • a trailing plural "s" also matches (Cost Pools → Cost Pool tooltip)
//   • never matches inside an HTML entity produced by esc() (e.g. &lt;)
let _termRx=null,_termRxMode='';
function _getTermRx(){
  if(_termRx)return _termRx;
  const alts=Object.keys(TERM_DICT)
    .map(k=>esc(k))                       // match against esc()'d text
    .sort((a,b)=>b.length-a.length)       // longest first → "Fixed MOH" before "MOH"
    .map(escRx).join('|');
  try{
    _termRx=new RegExp('(?<![A-Za-z0-9_&])('+alts+')(s?)(?![A-Za-z0-9_])','gi');
    _termRxMode='lb';
  }catch{
    // Older engines without lookbehind: capture the boundary char and re-emit it.
    _termRx=new RegExp('(^|[^A-Za-z0-9_&])('+alts+')(s?)(?![A-Za-z0-9_])','gi');
    _termRxMode='pre';
  }
  return _termRx;
}
// esc()'d key (lowercased) → canonical TERM_DICT key
const _termEscIndex=(function(){
  const m=Object.create(null);
  Object.keys(TERM_DICT).forEach(k=>{ m[esc(k).toLowerCase()]=k; });
  return m;
})();
function _termSpan(matched,plural){
  const key=_termEscIndex[matched.toLowerCase()];
  if(!key)return matched+plural;
  return `<span class="ar-term" data-term="${esc(key)}" onclick="toggleTip(event,this)">${matched}${plural}</span>`;
}
function highlightTerms(text){
  const out=esc(text==null?'':text);
  const re=_getTermRx();
  re.lastIndex=0;
  if(_termRxMode==='lb')return out.replace(re,(m,t,pl)=>_termSpan(t,pl));
  return out.replace(re,(m,pre,t,pl)=>pre+_termSpan(t,pl));
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
  // Batch 12: if row 0 reads as a header (its value columns hold text labels,
  // not $ amounts or bare numbers) rather than data, bold it and underline it
  // with a rule so students can see it's naming the columns, not a data row.
  const looksLikeValue=c=>/^\s*\$?\s?[\d,]+(\.\d+)?%?\s*$/.test(c||'');
  const isHeaderRow=nCols>1&&rows[0].slice(1).every(c=>!looksLikeValue(c));
  const lineWidth=r=>{let w=0;for(let c=0;c<nCols;c++){const cell=(r[c]||'').replace(/\s+$/,'');w+=(c<nCols-1)?widths[c]+2:cell.length;}return w;};
  const lines=rows.map((r,ri)=>{
    let out='';
    for(let c=0;c<nCols;c++){
      const cell=(r[c]||'').replace(/\s+$/,'');
      out+=(c<nCols-1)?cell.padEnd(widths[c]+2):cell;
    }
    const escaped=esc(out);
    return(isHeaderRow&&ri===0)?`<strong>${escaped}</strong>\n${'\u2500'.repeat(lineWidth(r))}`:escaped;
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


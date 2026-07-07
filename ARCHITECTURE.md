# CMA Prep — Architecture

**Last updated:** Batch 6 (July 2026)
**Owner:** Mohamed Abdelgawad (@mohamedgawad890-droid)
**Repo:** [`mohamedgawad890-droid/cma-app`](https://github.com/mohamedgawad890-droid/cma-app)

## Purpose

This document is the **north star** for the app's evolution into a modular codebase. It defines what "done" looks like when Batch 3-A ships the Firebase CLI + Blaze billing + build pipeline. Until then, the app is a monolithic PWA and everything below is the *target*, not the current state.

The current codebase is:
- One file: `app.js` (~525 KB, ~8,000 lines, 292+ functions, one global `STATE`)
- Vanilla JS, no build step, no bundler, no framework
- Deployed as static files via GitHub Pages
- Firebase Auth + Firestore (Spark tier)
- Cloudinary for user photo uploads
- Google Apps Script for the weekly email digest

## Guiding principles

1. **Content velocity > engineering velocity.** Every refactor must justify itself against student outcomes. If it doesn't reduce time-to-ship new lessons/questions or reduce field bugs, defer it.
2. **Small technical change, large student outcome.** Prefer the smallest surface-area edit that unlocks the biggest teaching improvement.
3. **Backward compatibility on the data layer is non-negotiable.** Any schema change ships with a migration or a read-side shim; students in the middle of an exam or lesson must not see broken UI.
4. **One deploy path.** GitHub web editor → GitHub Pages. No CLI dependencies for anything that isn't Batch 3-A infrastructure.
5. **Firestore reads are precious.** Spark tier hard cap is 50k reads/day. Any new feature that adds reads must be justified per-open and ideally cached.

## Target module map

Once Batch 3-A adds the build pipeline, `app.js` splits along these boundaries. Names are indicative; the actual split may combine or subdivide.

```
src/
├── main.js                   # Boot sequence + auth listener + render loop
├── state/
│   ├── state.js              # STATE bag + persistence helpers
│   ├── student.js            # loadStudent / saveStudent / profile fields
│   ├── progress.js           # loadProg / saveProg / mergeProgress / debounce
│   ├── streak.js             # streak count, Freeze tokens, Grace period
│   └── studyTime.js          # timer + history
├── data/
│   ├── sections.js           # S[] structure + TOTAL_LESSONS + sect()
│   ├── lessons.js            # ensureQuizzes + lesson JSON loader
│   ├── terms.js              # TERM_DICT (Arabic tooltips)
│   └── formulas.js           # formula bank
├── firebase/
│   ├── init.js               # firebase.initializeApp + auth + db handles
│   ├── auth.js               # onAuthStateChanged + Promise.all cold-load
│   ├── students.js           # students collection + instructor-notes
│   ├── progress.js           # progress sync + tracker sync
│   ├── leaderboard.js        # syncLeaderboard + read
│   ├── community.js          # questions + replies + upvotes
│   ├── exams.js              # exams + exam-results + freeze/hydrate
│   ├── attendance.js         # attendance + live poller
│   ├── plans.js              # weekly-plans + student active plan
│   └── retention.js          # student-analytics + digest payload
├── renderers/
│   ├── shell/
│   │   ├── nav.js            # bottom nav + sidebar + brand header
│   │   ├── modal.js          # showModal / closeModal / toasts
│   │   └── errorBoundary.js  # render try/catch fallback UI
│   ├── auth/
│   │   ├── onboarding.js
│   │   ├── login.js
│   │   └── register.js
│   ├── study/
│   │   ├── intro.js          # home / dashboard for student
│   │   ├── study.js          # lesson list
│   │   ├── lesson.js         # renderBlock + all block types
│   │   ├── notes.js          # per-lesson notes
│   │   ├── search.js
│   │   ├── dictionary.js
│   │   ├── formulaBank.js
│   │   └── flashcards.js
│   ├── practice/
│   │   ├── quizList.js
│   │   ├── quizSession.js
│   │   ├── quizResults.js
│   │   ├── quizMode.js
│   │   ├── cbq.js
│   │   ├── mockExam.js
│   │   └── wrongAnswers.js
│   ├── exam/
│   │   ├── examList.js
│   │   ├── examRunner.js
│   │   ├── examResult.js
│   │   └── examReview.js
│   ├── social/
│   │   ├── leaderboard.js
│   │   ├── community.js
│   │   └── questionDetail.js
│   ├── progress/
│   │   ├── progress.js
│   │   └── tracker.js
│   └── dashboard/            # instructor-only surface
│       ├── shell.js          # tab strip + group chip strip
│       ├── groups.js
│       ├── students.js
│       ├── studentDetail.js
│       ├── attendance.js
│       ├── attendanceMatrix.js
│       ├── lectures.js
│       ├── exams.js
│       ├── examPreview.js
│       ├── results.js
│       ├── progress.js
│       ├── leader.js
│       ├── plan.js
│       ├── actualTeaching.js
│       └── atRisk.js
├── retention/
│   ├── engagement.js         # engagement card + retention boot
│   ├── notifications.js      # SW push wiring + iOS install nudge
│   └── digest.js             # weekly email digest client
├── utils/
│   ├── esc.js                # escape helpers
│   ├── date.js               # fmtDT + relative time
│   ├── format.js             # fmtStudyTime + number formatting
│   └── a11y.js               # accessibility enhancer IIFE
└── styles/
    ├── tokens.css            # :root design tokens
    ├── base.css              # reset + typography
    ├── layout.css            # #app + sidebar/bottom nav
    ├── components.css        # cards, buttons, chips, modals
    └── screens/              # per-screen styles as needed
```

Each module exports pure functions where possible. Renderers return HTML strings (matching the current `render()` contract). State access goes through `state/` modules — no direct `STATE.xyz=` in renderers once split.

## Data model — current collections

Firestore collections in active use:

| Collection | Doc key | Owner | Read | Write |
|---|---|---|---|---|
| `students` | `{uid}` | student | owner + instructor | owner |
| `progress` | `{uid}` | student | owner + instructor | owner |
| `tracker` | `{uid}` | student | owner + instructor | owner |
| `feedback` | `{uid}` | student | owner + instructor | owner |
| `notes/{uid}/lessons/{lid}` | `{lid}` | student | owner only | owner only |
| `leaderboard` | `{uid}` | student | any signed-in | owner (rules cap fields) |
| `mock-history` | `{uid}` | student | owner + instructor | owner |
| `student-analytics` | `{uid}` | student | owner + instructor | owner |
| `questions` | auto-id | any student | any signed-in | author (create); anyone (upvote); author/instructor (delete) |
| `questions/{qid}/replies` | auto-id | any student | any signed-in | author (create); anyone (upvote); author/instructor (delete) |
| `groups` | auto-id | instructor | any signed-in | instructor |
| `lectures` | auto-id | instructor | any signed-in | instructor |
| `teaching-log` | auto-id | instructor | any signed-in | instructor |
| `exams` | auto-id | instructor | any signed-in | instructor |
| `plans` | auto-id | instructor | any signed-in | instructor |
| `weekly-plans` | auto-id | instructor | any signed-in | instructor |
| `live/{groupCode}` | groupCode | instructor | any signed-in | instructor |
| `attendance` | auto-id | student | any signed-in | owner create; owner limited-fields update; instructor full |
| `lecture-feedback` | auto-id | student | owner + instructor | owner create; owner limited-fields update; instructor full |
| `exam-results` | auto-id | student | owner + instructor | owner create; owner update until `submitted:true` |
| `instructor-notes` | `{studentUid}` | instructor | instructor only | instructor only |
| `lessons` | auto-id | instructor | any signed-in | instructor |

## Deferred / on the roadmap

Ordered by priority. Cross-linked to the batch that will ship them.

- **Batch 3-A** — Firebase CLI + Blaze onboarding; Cloud Functions; build pipeline; `app.js` split per the map above
- **Batch 3-A** — Server-side leaderboard scoring (kills the client-writable spoof surface)
- **Batch 3-A** — Real push notifications via Cloud Function → SW `push` handler (already wired in `sw.js`)
- **Batch 3-A** — Server-signed digest webhook (removes `DIGEST_SECRET` from client)
- **Content batch** — Section 4 video recordings (single highest strategic risk)
- **Content batch** — Flashcard content audit (formula vs. definition balance)
- **UX batch** — Full RTL polish for Arabic
- **UX batch** — Dark mode (design tokens make this ~1 day work)
- **UX batch** — Community moderation surface for instructor
- **Monetization batch** — Paid tier design + payment integration
- **AI batch** — Qwen3-based on-device assistant, `bge-m3` for Arabic RAG
- **Ops batch** — Cohort analytics beyond the At Risk dashboard

## Known technical debt

Ordered by pain caused, not by size of fix.

1. **`app.js` is a monolith.** ~8,000 lines, one global `STATE`, full re-render on every state change. The single biggest velocity risk. Batch 3-A fixes.
2. **Leaderboard is client-writable.** Rules now cap value ranges (Batch 6 · Item E) but a determined tamperer can still submit believable-but-fake scores. Batch 3-A Cloud Function fixes properly.
3. **`DIGEST_SECRET` is in the client bundle.** A casual-abuse gate, not real security. Batch 3-A moves it server-side.
4. **Cloudinary preset is unsigned.** Anyone with the preset name can upload. Rate limits and folder scoping on Cloudinary console are the current protection.
5. **No error tracking service.** Console errors are all we have. Sentry or equivalent should be added when scale justifies it.
6. **Full re-render on every state change.** Fine on mid-tier phones; noticeable on low-end Android. Fixed by the module split + targeted DOM updates, not by adopting a framework.
7. **No test suite.** Manual on-device smoke tests are the current QA. Post-split, unit tests on state modules become cheap.

## Change control

- No changes to Firestore rules or data schema without a batch plan.
- No `app.js` edits that break the single-file deploy workflow until Batch 3-A lands.
- No new Firestore collections without a rules update in the same batch.
- No new third-party client libraries without an explicit weight/security review.
- Cache version (`sw.js` `CACHE_NAME`) bumps ONLY when `OFFLINE_URLS` changes.

## Batch history

- **Batch 1** — Live check-in via onSnapshot; exam question snapshotting; auto-backfill
- **Batch 2** — Group-scoped dashboard (~98% read reduction); exam-results immutability; persistent group memory
- **Batch 4** — Retention infra: streak Freeze/Grace, weekly digest, push notif scaffolding, At Risk analytics
- **Batch 4.1** — Bug fixes: weakestSection, MCQ metrics, lifetime accuracy, SW deep-link, boot ordering, DIGEST_SECRET
- **Batch 4.5** — Physical extraction of `app.js` from `index.html`
- **Batch 5** — Exam target date 2026–2028; flashcards moved to Practice; lecture check-in flow; six new dashboard sub-tabs; exam question freezing with unit filter; weekly plan publisher
- **Batch 6** — CSS design tokens; render error boundary; rules hardening (attendance, lecture-feedback, leaderboard caps); manifest lang; attendance matrix view; student detail live re-fetch + private instructor notes; exam preview hydration fix; ARCHITECTURE.md

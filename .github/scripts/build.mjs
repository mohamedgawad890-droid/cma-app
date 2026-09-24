// CMA Prep — build script (Batch 24, B24-01/02/11/12).
// Run by .github/workflows/minify.yml on every push. Produces _site/, the exact
// folder GitHub Pages serves. Nothing is committed back to the repo.
//
// Sources:
//   • src/core/*.js      → dist/app.min.js        (joined in filename order)
//   • src/dashboard/*.js → dist/dashboard.min.js  (instructor-only, lazy-loaded)
//   • app.js             → dist/app.min.js        (only while src/ doesn't exist)
//   • cbq-data.js        → dist/cbq-data.min.js
//   • app.css            → dist/app.min.css
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const OUT = '_site';
const SKIP = new Set(['.git', '.github', 'node_modules', '_site', 'src', 'dist']);

function fail(msg) {
  console.error('\n❌ BUILD FAILED: ' + msg + '\n');
  process.exit(1);
}
function joinDir(dir) {
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.js')).sort();
  if (!files.length) fail(dir + ' has no .js files');
  console.log('  ' + dir + ': ' + files.join(', '));
  return files.map(f => {
    const t = fs.readFileSync(path.join(dir, f), 'utf8');
    return t.endsWith('\n') ? t : t + '\n';
  }).join('');
}
async function minify(code, loader, outFile) {
  try {
    const r = await esbuild.transform(code, { loader, minify: true, legalComments: 'none' });
    fs.writeFileSync(path.join(OUT, outFile), r.code);
    console.log('  → ' + outFile + ' (' + Math.round(r.code.length / 1024) + ' KB)');
    return r.code;
  } catch (e) {
    fail(outFile + ' did not compile:\n' + e.message);
  }
}
// Every function name DECLARED at the top level of a source.
function topLevelFunctions(code) {
  const names = new Set();
  for (const m of code.matchAll(/^(?:async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)/gm)) names.add(m[1]);
  return names;
}

// 1) Copy the site (everything except sources, build folders and repo tooling).
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(path.join(OUT, 'dist'), { recursive: true });
for (const entry of fs.readdirSync('.')) {
  if (SKIP.has(entry)) continue;
  fs.cpSync(entry, path.join(OUT, entry), { recursive: true });
}

// 2) Assemble app sources.
const hasSrc = fs.existsSync('src/core');
if (hasSrc && fs.existsSync('app.js')) {
  fail('Both src/core/ and app.js exist. Since Batch 24 the app source lives in src/ — delete the old root app.js.');
}
let appCode;
let dashCode = null;
if (hasSrc) {
  appCode = joinDir('src/core');
  if (fs.existsSync('src/dashboard')) dashCode = joinDir('src/dashboard');
} else {
  if (!fs.existsSync('app.js')) fail('No app source found (expected src/core/ or app.js).');
  appCode = fs.readFileSync('app.js', 'utf8');
  console.log('  app.js (single-file mode)');
}

// 3) Minify.
const appMin = await minify(appCode, 'js', 'dist/app.min.js');
await minify(fs.readFileSync('cbq-data.js', 'utf8'), 'js', 'dist/cbq-data.min.js');
await minify(fs.readFileSync('app.css', 'utf8'), 'css', 'dist/app.min.css');

if (dashCode) {
  await minify(dashCode, 'js', 'dist/dashboard.min.js');
  // 4) Split-safety rule: the core bundle must never reference a dashboard
  //    function — students don't load dashboard.min.js, so such a call would
  //    crash for them. Checked on MINIFIED core (comments stripped).
  const ALLOWED = new Set(['renderDashboard']); // only via renderDashboardLazy()'s typeof guard
  const dashFns = topLevelFunctions(dashCode);
  const coreTokens = new Set(appMin.match(/[A-Za-z_$][\w$]*/g));
  const leaks = [...dashFns].filter(f => !ALLOWED.has(f) && coreTokens.has(f));
  if (leaks.length) {
    fail('src/core/ references dashboard-only function(s): ' + leaks.join(', ') +
      '\nEither move the calling code into src/dashboard/, or move the function into src/core/.');
  }
  const coreFns = topLevelFunctions(appCode);
  const dupes = [...dashFns].filter(f => coreFns.has(f));
  if (dupes.length) fail('Function(s) defined in BOTH src/core/ and src/dashboard/: ' + dupes.join(', '));
}
console.log('\n✅ Build OK');

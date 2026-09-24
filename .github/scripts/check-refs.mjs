// CMA Prep — deploy guard (Batch 24, B24-02).
// Runs after build.mjs, BEFORE deploy. If any file the app needs is missing,
// the deploy is cancelled and the live site stays on the last good version.
// (This is exactly what took the app down after Batch 23: index.html pointed
// at vendor/ files that were never uploaded.)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const SITE = '_site';
const problems = [];
const checked = new Set();

function exists(ref, from) {
  let p = ref.split('#')[0].split('?')[0];
  if (!p || p === './' || p === '.') p = 'index.html';
  p = p.replace(/^\.\//, '');
  if (checked.has(p)) return;
  checked.add(p);
  const full = path.join(SITE, p);
  if (!fs.existsSync(full) || fs.statSync(full).isDirectory()) problems.push(`${p}  (referenced by ${from})`);
}
const isLocal = r => r && !/^(https?:|data:|mailto:|tel:|#|\/\/|javascript:)/i.test(r);

// index.html: every src= / href= that points at our own files.
const html = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
for (const m of html.matchAll(/\s(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
  if (isLocal(m[1])) exists(m[1], 'index.html');
}

// sw.js: every './…' string (precache list, notification icons).
const sw = fs.readFileSync(path.join(SITE, 'sw.js'), 'utf8');
for (const m of sw.matchAll(/['"](\.\/[^'"#]*)['"]/g)) exists(m[1], 'sw.js');

// manifest.json: icons.
const manifest = JSON.parse(fs.readFileSync(path.join(SITE, 'manifest.json'), 'utf8'));
for (const ic of manifest.icons || []) if (isLocal(ic.src)) exists(ic.src, 'manifest.json');

// App bundle: every './dist/…' and './vendor/…' path it loads at runtime.
const app = fs.readFileSync(path.join(SITE, 'dist/app.min.js'), 'utf8');
for (const m of app.matchAll(/['"`](\.\/(?:dist|vendor)\/[^'"`]+)['"`]/g)) exists(m[1], 'dist/app.min.js');

// Built JS must parse.
for (const f of fs.readdirSync(path.join(SITE, 'dist')).filter(f => f.endsWith('.js'))) {
  try { execFileSync(process.execPath, ['--check', path.join(SITE, 'dist', f)], { stdio: 'pipe' }); }
  catch (e) { problems.push(`dist/${f} does not parse: ${String(e.stderr || e.message).split('\n')[0]}`); }
}

if (problems.length) {
  console.error('\n❌ DEPLOY BLOCKED — the live site was NOT changed. Missing or broken:\n');
  problems.forEach(p => console.error('   • ' + p));
  console.error('\nUpload the missing files (exact folder + name), then push again.\n');
  process.exit(1);
}
console.log(`✅ Deploy guard OK — ${checked.size} referenced files present.`);

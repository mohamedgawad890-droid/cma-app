// CMA Prep — automatic service-worker cache version (Batch 29).
// Run by .github/workflows/minify.yml right after the build, before the deploy
// guard. Replaces CACHE_NAME in the BUILT _site/sw.js with a name derived from
// a hash of every other file in _site/. Result:
//   • any change to the app, lessons, questions, CSS, JSON or images produces a
//     new cache name, so students pick the update up on their next open;
//   • an identical build produces the identical name, so nothing is re-downloaded
//     needlessly (a push that changes no site file keeps the old cache);
//   • nobody has to remember to bump the version by hand.
// The CACHE_NAME in the repo's sw.js is only a fallback label — never edit it
// for deploys. If sw.js is missing or the CACHE_NAME line is not found exactly
// once, this script exits with an error, the workflow stops, and the live site
// stays on the last good version.

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, relative, sep } from 'node:path';

const SITE = '_site';
const SW = join(SITE, 'sw.js');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}

if (!existsSync(SW)) {
  console.error('[version-sw] ' + SW + ' not found — build step did not produce it.');
  process.exit(1);
}

const files = walk(SITE).filter(f => f !== SW).sort();
const hash = createHash('sha256');
for (const f of files) {
  hash.update(relative(SITE, f).split(sep).join('/'));
  hash.update('\0');
  hash.update(readFileSync(f));
  hash.update('\0');
}
const version = 'cma-prep-' + hash.digest('hex').slice(0, 10);

const rx = /^const CACHE_NAME = '[^']*';/gm;   // anchored: comments that quote the line are ignored
let src = readFileSync(SW, 'utf8');
const found = src.match(rx);
if (!found || found.length !== 1) {
  console.error('[version-sw] expected exactly one line starting with "const CACHE_NAME = \'…\';" in ' + SW + ', found ' + (found ? found.length : 0) + '.');
  process.exit(1);
}
src = src.replace(rx, "const CACHE_NAME = '" + version + "';");
writeFileSync(SW, src);
console.log('[version-sw] hashed ' + files.length + ' files -> ' + version);

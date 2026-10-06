import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const assets=fs.readdirSync('dist/assets').filter(name=>!name.endsWith('.wasm')&&!name.startsWith('ort-wasm')).sort().map(name=>`/assets/${name}`);
const shell=['/','/index.html','/favicon.svg','/landscape.svg','/manifest.webmanifest'];
let worker=fs.readFileSync('public/sw.js','utf8');
const hash=crypto.createHash('sha256').update(worker).update(assets.join('|'));
for(const file of shell.filter(file=>file!=='/'))hash.update(fs.readFileSync(path.join('dist',file)));
const revision=hash.digest('hex').slice(0,12);
worker=worker.replace("'outward-shell-v2'",JSON.stringify(`outward-shell-${revision}`)).replace(/const PRECACHE = \[[^;]+;/,`const PRECACHE = ${JSON.stringify([...shell,...assets])};`);
fs.writeFileSync(path.join('dist','sw.js'),worker);
console.log(`Precache ready: ${assets.length} app assets; model and WASM stay opt-in. Updates preserve open trip tabs.`);

// Keep redistribution notices alongside the standalone static build.
fs.copyFileSync('LICENSE', path.join('dist', 'LICENSE.txt'));
fs.writeFileSync(path.join('dist', 'THIRD_PARTY_NOTICES.md'), fs.readFileSync('THIRD_PARTY_NOTICES.md', 'utf8').replaceAll('(public/licenses/', '(licenses/'));

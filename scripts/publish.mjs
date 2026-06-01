// Veröffentlicht (oder verwirft) einen freigegebenen Draft. Wird per repository_dispatch
// vom Approve-Endpoint ausgelöst. ACTION = 'publish' | 'reject'.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson } from './lib/util.mjs';
import { publishInstagram, publishFacebook } from './lib/meta.mjs';

const slug = process.env.SLUG || process.argv[2];
const action = process.env.ACTION || process.argv[3] || 'publish';
if (!slug) { console.error('SLUG fehlt.'); process.exit(1); }

const draftRel = `pending/${slug}.json`;
if (!fs.existsSync(path.join(ROOT, draftRel))) {
  console.error(`Kein Draft pending/${slug}.json (evtl. bereits verarbeitet).`);
  process.exit(0);
}
const draft = readJson(draftRel);

function move(toDir, extra = {}) {
  fs.mkdirSync(path.join(ROOT, toDir), { recursive: true });
  fs.writeFileSync(path.join(ROOT, toDir, `${slug}.json`), JSON.stringify({ ...draft, ...extra }, null, 2));
  fs.renameSync(path.join(ROOT, 'pending', `${slug}.jpg`), path.join(ROOT, toDir, `${slug}.jpg`));
  fs.rmSync(path.join(ROOT, 'pending', `${slug}.json`));
}

if (action === 'reject') {
  move('rejected', { rejectedAt: new Date().toISOString() });
  console.log(`✕ Draft ${slug} verworfen.`);
  process.exit(0);
}

const repo = process.env.GITHUB_REPOSITORY;
const branch = process.env.GITHUB_REF_NAME || 'main';
const imageUrl = process.env.IMAGE_BASE_URL
  ? `${process.env.IMAGE_BASE_URL}/${slug}.jpg`
  : `https://raw.githubusercontent.com/${repo}/${branch}/pending/${slug}.jpg`;

const results = [];
results.push(await publishInstagram({ imageUrl, caption: draft.caption }));
console.log(`✓ Instagram: ${results.at(-1).id}`);
results.push(await publishFacebook({ imageUrl, caption: draft.caption }));
console.log(`✓ Facebook: ${results.at(-1).id}`);

move('published', { publishedAt: new Date().toISOString(), results });
console.log(`✓ Draft ${slug} veröffentlicht auf Instagram + Facebook.`);

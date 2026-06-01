// Verschickt die Freigabe-Mail für einen frisch erzeugten Draft.
// Läuft NACH dem git push, damit die Bild-URL (raw.githubusercontent.com) bereits live ist.
import { readJson } from './lib/util.mjs';
import { sendReviewEmail } from './lib/email.mjs';

const slug = process.env.SLUG || process.argv[2];
if (!slug) { console.error('SLUG fehlt.'); process.exit(1); }

const brand = readJson('config/brand.json');
const draft = readJson(`pending/${slug}.json`);

const repo = process.env.GITHUB_REPOSITORY;           // owner/repo
const branch = process.env.GITHUB_REF_NAME || 'main';
const imageUrl = process.env.IMAGE_BASE_URL
  ? `${process.env.IMAGE_BASE_URL}/${slug}.jpg`
  : `https://raw.githubusercontent.com/${repo}/${branch}/pending/${slug}.jpg`;

await sendReviewEmail({ draft, imageUrl, brand });
console.log(`✉ Freigabe-Mail verschickt für ${slug} (Bild: ${imageUrl}).`);

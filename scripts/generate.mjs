// Erzeugt EINEN Beitrags-Entwurf: Content wählen → Caption texten → Motiv generieren
// → markengerecht aufbereiten → als Draft in pending/ ablegen. Kein Posten, kein Mail-Versand.
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson, writeJson, slugify, setOutput } from './lib/util.mjs';
import { buildPool, pickNext } from './lib/content.mjs';
import { writeCaption, generateImage } from './lib/openai.mjs';
import { composeMotive } from './lib/compose.mjs';

const DRY = process.env.DRY_RUN === '1';
const today = (process.env.RUN_DATE || new Date().toISOString().slice(0, 10));

const brand = readJson('config/brand.json');

const pool = await buildPool();
const usedPath = 'state/used.json';
const used = fs.existsSync(path.join(ROOT, usedPath)) ? readJson(usedPath) : [];

// PICK=<id|index> erzwingt einen bestimmten Beitrag (z.B. PICK=case-05). Sonst: nächster ungenutzter.
const item = process.env.PICK
  ? (pool.find(p => p.id === process.env.PICK) || pool[Number(process.env.PICK)])
  : pickNext(pool, used);
if (!item) { console.error('Kein Content im Pool gefunden.'); process.exit(1); }

console.log(`▶ Gewählt: [${item.type}] ${item.headline}`);

const { headline: motiveHeadline, caption } = await writeCaption(item, brand);
console.log('\n── Bild-Headline ───────────────────\n' + motiveHeadline);
console.log('\n── Caption ─────────────────────────\n' + caption + '\n────────────────────────────────────\n');

const raw = await generateImage(item, brand);
const kicker = item.type === 'case' ? 'Fallstudie' : (item.kicker || 'Magazin');
const finalJpg = await composeMotive({ imageBuffer: raw, kicker, headline: motiveHeadline, brand });

const slug = `${today}-${slugify(item.headline)}`.slice(0, 80);
const sourceLabel = item.type === 'case' ? `Fallstudie · ${item.branche}` : `Blogbeitrag · ${item.kicker}`;

const outDir = DRY ? 'dry-run' : 'pending';
fs.mkdirSync(path.join(ROOT, outDir), { recursive: true });
fs.writeFileSync(path.join(ROOT, outDir, `${slug}.jpg`), finalJpg);
writeJson(`${outDir}/${slug}.json`, {
  slug, type: item.type, sourceId: item.id, headline: item.headline,
  sourceLabel, link: item.link, caption,
  image: `${outDir}/${slug}.jpg`, createdAt: today,
});

if (DRY) {
  console.log(`✓ DRY-RUN: ${outDir}/${slug}.jpg + .json geschrieben (nichts gepostet, nichts gemailt).`);
} else {
  used.push({ id: item.id, slug, generatedAt: today });
  writeJson(usedPath, used);
  setOutput('slug', slug);
  console.log(`✓ Draft erstellt: pending/${slug}.json — wartet auf Freigabe.`);
}

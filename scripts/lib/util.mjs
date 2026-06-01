import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');

export function readJson(rel) {
  return JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
}

export function writeJson(rel, obj) {
  const p = path.join(ROOT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

export function ensureDir(rel) {
  fs.mkdirSync(path.join(ROOT, rel), { recursive: true });
}

export function stripHtml(s = '') {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#8211;/g, '–').replace(/&#8217;/g, '’').replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ').replace(/&[a-z0-9#]+;/gi, ' ')
    .replace(/\s+/g, ' ').trim();
}

export function slugify(s) {
  return s.toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue').replace(/ß/g, 'ss')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
}

// HMAC signature that ties an approval link to a specific draft + action.
export function sign(slug, action, secret) {
  return crypto.createHmac('sha256', secret).update(`${slug}:${action}`).digest('hex');
}

export function requireEnv(name) {
  const v = process.env[name];
  if (!v) throw new Error(`Fehlende Umgebungsvariable: ${name}`);
  return v;
}

export function setOutput(key, value) {
  const f = process.env.GITHUB_OUTPUT;
  if (f) fs.appendFileSync(f, `${key}=${value}\n`);
}

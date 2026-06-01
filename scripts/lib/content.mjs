import { readJson, stripHtml } from './util.mjs';

const WP = 'https://mainilkanjo.de/wp-json/wp/v2';

async function fetchCategoryMap() {
  try {
    const res = await fetch(`${WP}/categories?per_page=50&_fields=id,name`);
    if (!res.ok) return {};
    const cats = await res.json();
    return Object.fromEntries(cats.map(c => [c.id, stripHtml(c.name)]));
  } catch { return {}; }
}

// Alle veröffentlichten Blog-Posts holen (älteste zuerst, damit wir fair durchrotieren).
export async function fetchPosts() {
  const catMap = await fetchCategoryMap();
  const out = [];
  for (let page = 1; page <= 5; page++) {
    const url = `${WP}/posts?per_page=20&page=${page}&orderby=date&order=asc&_fields=id,date,link,title,excerpt,content,categories&_embed=0`;
    const res = await fetch(url);
    if (res.status === 400) break; // keine weitere Seite
    if (!res.ok) throw new Error(`WP REST ${res.status} bei ${url}`);
    const batch = await res.json();
    if (!batch.length) break;
    out.push(...batch);
    if (batch.length < 20) break;
  }
  return out.map(p => ({
    id: `post-${p.id}`,
    type: 'post',
    title: stripHtml(p.title?.rendered || ''),
    headline: stripHtml(p.title?.rendered || ''),
    topic: stripHtml(p.title?.rendered || ''),
    kicker: catMap[(p.categories || [])[0]] || 'Magazin',
    link: p.link,
    body: stripHtml(p.excerpt?.rendered || '').slice(0, 600) ||
          stripHtml(p.content?.rendered || '').slice(0, 600),
  }));
}

// Content-Pool = Blog-Posts + anonymisierte Fallstudien, abwechselnd gemischt.
export async function buildPool() {
  const posts = await fetchPosts();
  const cases = readJson('content/cases.json');
  const pool = [];
  const max = Math.max(posts.length, cases.length);
  for (let i = 0; i < max; i++) {
    if (posts[i]) pool.push(posts[i]);
    if (cases[i]) pool.push(cases[i]);
  }
  return pool;
}

// Nächstes Item wählen, das noch nicht gepostet wurde (least-recently-used).
export function pickNext(pool, used) {
  const usedIds = new Set(used.map(u => u.id));
  let candidates = pool.filter(item => !usedIds.has(item.id));
  if (candidates.length === 0) candidates = pool; // alles durch → von vorne
  return candidates[0] || null;
}

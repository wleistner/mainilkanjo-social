import { requireEnv } from './util.mjs';

const V = process.env.GRAPH_VERSION || 'v21.0';
const GRAPH = `https://graph.facebook.com/${V}`;

async function graph(pathStr, params) {
  const url = `${GRAPH}/${pathStr}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(params),
  });
  const data = await res.json();
  if (!res.ok || data.error) {
    throw new Error(`Graph ${pathStr}: ${JSON.stringify(data.error || data)}`);
  }
  return data;
}

// Instagram: 1) Media-Container mit Bild-URL + Caption anlegen, 2) veröffentlichen.
export async function publishInstagram({ imageUrl, caption }) {
  const igId = requireEnv('IG_USER_ID');
  const token = requireEnv('META_ACCESS_TOKEN');
  const container = await graph(`${igId}/media`, { image_url: imageUrl, caption, access_token: token });
  // kurze Wartezeit, damit Meta das Bild abholen kann
  await new Promise(r => setTimeout(r, 4000));
  const published = await graph(`${igId}/media_publish`, { creation_id: container.id, access_token: token });
  return { platform: 'instagram', id: published.id };
}

// Facebook-Seite: Foto-Post mit Bild-URL + Beschreibung.
export async function publishFacebook({ imageUrl, caption }) {
  const pageId = requireEnv('FB_PAGE_ID');
  const token = requireEnv('META_ACCESS_TOKEN');
  const post = await graph(`${pageId}/photos`, { url: imageUrl, caption, access_token: token, published: 'true' });
  return { platform: 'facebook', id: post.post_id || post.id };
}

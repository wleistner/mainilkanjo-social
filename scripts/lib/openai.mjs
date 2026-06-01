import { requireEnv } from './util.mjs';

const API = 'https://api.openai.com/v1';

// ── Text: ein Aufruf liefert knackige Bild-Headline + Caption im Markenton ──────
export async function writeCaption(item, brand) {
  const key = requireEnv('OPENAI_API_KEY');
  const system = `Du bist Social-Media-Redakteur:in für „${brand.name}" (${brand.domain}).
Positionierung: ${brand.positioning}
Claim: ${brand.claim}
Zielgruppe: ${brand.audience}
Ton: ${brand.voice.tone}
DO: ${brand.voice.do.join('; ')}
DON'T: ${brand.voice.dont.join('; ')}

Liefere ein JSON-Objekt mit genau zwei Feldern:
1) "headline": eine sehr kurze, plakative Bild-Headline fürs Post-Motiv – maximal 5 Wörter bzw. ~32 Zeichen, nutzenorientiert, ohne Punkt am Ende, keine Hashtags, keine Anführungszeichen. Beispiele guter Länge: "Dach verpachten, Rendite ernten", "600 kWp = +350.000 € Immobilienwert", "Alte PV-Anlage clever aufrüsten".
2) "caption": der Beitragstext für Instagram UND Facebook. Struktur: starker Hook-Satz, 2–4 kurze Sätze mit dem wirtschaftlichen Kern, dann die Handlungsaufforderung "${brand.cta}", dann 5–8 passende Hashtags NUR aus dieser Liste: ${brand.hashtags.join(' ')}. Max ~120 Wörter vor den Hashtags, max 2 dezente Emojis.

Verwende NUR Fakten/Zahlen, die in der Quelle stehen – erfinde nichts.`;

  const user = `QUELLE (${item.type === 'case' ? 'Fallstudie' : 'Blogbeitrag'}):
Titel/Branche: ${item.headline}
Thema: ${item.topic || ''}
Inhalt: ${item.body}
Link für die Bio/CTA: ${item.link}`;

  const res = await fetch(`${API}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.OPENAI_TEXT_MODEL || 'gpt-4o',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI caption ${res.status}: ${await res.text()}`);
  const data = await res.json();
  const parsed = JSON.parse(data.choices[0].message.content);
  return {
    headline: (parsed.headline || item.headline).trim(),
    caption: (parsed.caption || '').trim(),
  };
}

// ── Motiv: gpt-image-1 erzeugt das Hintergrundbild (Text wird später überlagert) ─
export async function generateImage(item, brand) {
  const key = requireEnv('OPENAI_API_KEY');
  const prompt = `${brand.image.stylePrompt}

Konkretes Thema dieses Motivs: ${item.topic || item.headline}.
Branche/Kontext: ${item.branche || 'Gewerbe/Industrie in NRW'}.
Erzeuge ein quadratisches Schlüsselbild dazu.`;

  const res = await fetch(`${API}/images/generations`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-image-1',
      prompt,
      size: brand.image.size || '1024x1024',
      quality: brand.image.quality || 'medium',
      n: 1,
    }),
  });
  if (!res.ok) throw new Error(`OpenAI image ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return Buffer.from(data.data[0].b64_json, 'base64');
}

import sharp from 'sharp';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './util.mjs';

const SIZE = 1080;

function esc(s = '') {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Headline auf mehrere Zeilen umbrechen (grobe Zeichenbreite-Heuristik).
function wrap(text, maxChars, maxLines) {
  const words = text.split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length <= maxChars) {
      cur = (cur + ' ' + w).trim();
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
    if (lines.length === maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) {
    lines[maxLines - 1] = lines[maxLines - 1].replace(/[.,;:]?$/, '') + ' …';
  }
  return lines;
}

/**
 * Nimmt das KI-Hintergrundbild und legt die Marken-Aufbereitung darüber:
 * Tiefblau-Verlauf unten, Grün-Akzentlinie, Kicker, Headline, Claim, Logo/Wortmarke.
 * Liefert ein fertiges 1080×1080-JPEG als Buffer.
 */
export async function composeMotive({ imageBuffer, kicker, headline, brand }) {
  const c = brand.colors;
  const bg = await sharp(imageBuffer).resize(SIZE, SIZE, { fit: 'cover' }).toBuffer();

  const lines = wrap(headline, 26, 3);
  const lineH = 78;
  const blockH = lines.length * lineH;
  const baseY = SIZE - 150 - blockH + lineH; // Startbaseline der ersten Zeile

  const logoPath = path.join(ROOT, 'config', 'logo.png');
  const hasLogo = fs.existsSync(logoPath);

  const headlineSvg = lines.map((ln, i) =>
    `<text x="72" y="${baseY + i * lineH}" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="64" fill="#ffffff" letter-spacing="-0.5">${esc(ln)}</text>`
  ).join('');

  const wordmark = hasLogo ? '' :
    `<text x="72" y="92" font-family="Montserrat, Arial, sans-serif" font-weight="800" font-size="34" fill="#ffffff">mainilkanjo</text>`;

  const svg = `<svg width="${SIZE}" height="${SIZE}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"  stop-color="${c.blueDeep}" stop-opacity="0"/>
        <stop offset="55%" stop-color="${c.blueDeep}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${c.blueDeep}" stop-opacity="0.96"/>
      </linearGradient>
      <linearGradient id="topshade" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="${c.blueDeep}" stop-opacity="0.55"/>
        <stop offset="100%" stop-color="${c.blueDeep}" stop-opacity="0"/>
      </linearGradient>
    </defs>
    <rect x="0" y="0" width="${SIZE}" height="190" fill="url(#topshade)"/>
    <rect x="0" y="${SIZE * 0.42}" width="${SIZE}" height="${SIZE * 0.58}" fill="url(#shade)"/>
    ${wordmark}
    <rect x="72" y="${baseY - lineH - 54}" width="64" height="6" rx="3" fill="${c.green}"/>
    <text x="72" y="${baseY - lineH - 22}" font-family="Inter, Arial, sans-serif" font-weight="700" font-size="26" fill="${c.green}" letter-spacing="2">${esc(kicker.toUpperCase())}</text>
    ${headlineSvg}
    <text x="72" y="${SIZE - 60}" font-family="Inter, Arial, sans-serif" font-weight="600" font-size="27" fill="#cfe0ee">${esc(brand.claim)}</text>
  </svg>`;

  const layers = [{ input: Buffer.from(svg) }];
  if (hasLogo) {
    const logo = await sharp(logoPath).resize({ height: 64, fit: 'inside' }).png().toBuffer();
    layers.unshift({ input: logo, left: 72, top: 56 });
  }

  return sharp(bg).composite(layers).jpeg({ quality: 90, mozjpeg: true }).toBuffer();
}

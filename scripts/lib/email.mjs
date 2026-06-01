import nodemailer from 'nodemailer';
import { requireEnv, sign } from './util.mjs';

// Versendet die Freigabe-Mail mit Bildvorschau, Caption und zwei Buttons (Posten / Verwerfen).
export async function sendReviewEmail({ draft, imageUrl, brand }) {
  const host = requireEnv('SMTP_HOST');
  const port = Number(process.env.SMTP_PORT || 587);
  const user = requireEnv('SMTP_USER');
  const pass = requireEnv('SMTP_PASS');
  const to = requireEnv('REVIEW_EMAIL_TO');
  const from = process.env.SMTP_FROM || user;

  const base = requireEnv('APPROVE_ENDPOINT'); // z.B. https://mainilkanjo.de/social-approve.php
  const secret = requireEnv('APPROVE_SECRET');
  const approveUrl = `${base}?id=${encodeURIComponent(draft.slug)}&action=approve&sig=${sign(draft.slug, 'approve', secret)}`;
  const rejectUrl = `${base}?id=${encodeURIComponent(draft.slug)}&action=reject&sig=${sign(draft.slug, 'reject', secret)}`;

  const c = brand.colors;
  const captionHtml = draft.caption.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/\n/g, '<br>');

  const html = `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;color:${c.ink}">
    <p style="font-size:13px;color:${c.muted};letter-spacing:1px;text-transform:uppercase;margin:0 0 4px">mainilkanjo · Social-Freigabe</p>
    <h2 style="margin:0 0 16px;color:${c.blue}">Neuer Beitrag für Instagram &amp; Facebook</h2>
    <img src="${imageUrl}" alt="Motiv" style="width:100%;border-radius:14px;display:block;margin-bottom:16px">
    <div style="background:${c.bgSoft};border:1px solid ${c.line || '#e4eaf1'};border-radius:14px;padding:18px 20px;font-size:15px;line-height:1.5;white-space:normal">${captionHtml}</div>
    <p style="font-size:13px;color:${c.muted};margin:18px 0 8px">Quelle: ${draft.sourceLabel} · Ziel: Instagram + Facebook</p>
    <table cellpadding="0" cellspacing="0" style="margin:8px 0 4px"><tr>
      <td style="padding-right:12px"><a href="${approveUrl}" style="background:${c.green};color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;display:inline-block">✅ Veröffentlichen</a></td>
      <td><a href="${rejectUrl}" style="background:#eef2f6;color:${c.ink};text-decoration:none;font-weight:700;padding:14px 28px;border-radius:10px;display:inline-block">✕ Verwerfen</a></td>
    </tr></table>
    <p style="font-size:12px;color:${c.muted};margin-top:18px">Mit „Veröffentlichen" geht der Beitrag automatisch auf beiden Kanälen live. Reagierst du nicht, passiert nichts.</p>
  </div>`;

  const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  await transporter.sendMail({
    from: `mainilkanjo Social <${from}>`,
    to,
    subject: `📣 Freigabe: ${draft.headline}`,
    html,
  });
  return { approveUrl, rejectUrl };
}

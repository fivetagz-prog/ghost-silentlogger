import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false });
  }

  res.setHeader('Access-Control-Allow-Origin', '*');

  const ip =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.headers['x-real-ip'] ||
    (req.socket && req.socket.remoteAddress) ||
    'unknown';

  const b = req.body || {};

  const entry = {
    ts: Date.now(),
    ip,
    ua: b.ua || req.headers['user-agent'] || '',
    ref: b.ref || '',
    page: b.page || '',
    host: b.host || '',
    tz: b.tz || '',
    lang: b.lang || '',
    screen: b.screen || '',
    id: b.id || '',
    country: req.headers['x-vercel-ip-country'] || '',
    city: req.headers['x-vercel-ip-city'] || '',
    region: req.headers['x-vercel-ip-country-region'] || '',
    lat: req.headers['x-vercel-ip-latitude'] || '',
    lon: req.headers['x-vercel-ip-longitude'] || ''
  };

  const key = `log:${entry.ts}:${ip}:${Math.random().toString(36).slice(2, 8)}`;

  try {
    await kv.set(key, JSON.stringify(entry), { ex: 60 * 60 * 24 * 30 });
    await kv.lpush('logs:all', key);
    await kv.ltrim('logs:all', 0, 9999);
  } catch (e) {
    console.error('[kv]', e && e.message);
  }

  if (process.env.TG_TOKEN && process.env.TG_CHAT) {
    const msg =
      `🛰 ${entry.host}\n` +
      `👤 ${entry.ip} — ${entry.country}${entry.city ? '/' + entry.city : ''}\n` +
      `📄 ${entry.page}\n` +
      `🖥 ${entry.ua.slice(0, 90)}`;
    try {
      await fetch(`https://api.telegram.org/bot${process.env.TG_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.TG_CHAT,
          text: msg,
          disable_web_page_preview: true
        })
      });
    } catch (e) {
      console.error('[tg]', e && e.message);
    }
  }

  return res.status(200).json({ ok: true });
}

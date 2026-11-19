import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const auth =
    (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '') ||
    req.query.token ||
    '';

  if (!process.env.LOG_TOKEN || auth !== process.env.LOG_TOKEN) {
    return res.status(401).json({ ok: false, err: 'unauthorized' });
  }

  const limit = Math.min(parseInt(req.query.limit || '100', 10) || 100, 1000);
  const keys = await kv.lrange('logs:all', 0, limit - 1);
  const entries = [];

  for (const k of keys) {
    const v = await kv.get(k);
    if (!v) continue;
    try {
      entries.push(typeof v === 'string' ? JSON.parse(v) : v);
    } catch (e) {}
  }

  entries.sort((a, b) => b.ts - a.ts);

  return res.status(200).json({ ok: true, count: entries.length, entries });
}

import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const auth =
    (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '') ||
    req.query.token ||
    '';

  if (!process.env.LOG_TOKEN || auth !== process.env.LOG_TOKEN) {
    return res.status(401).json({ ok: false, err: 'unauthorized' });
  }

  const limit = Math.min(parseInt(req.query.limit || '2000', 10) || 2000, 10000);
  const keys = await kv.lrange('logs:all', 0, limit - 1);

  const byCountry = {};
  const byHost = {};
  const byDay = {};
  const ips = new Set();
  const ids = new Set();
  let total = 0;

  for (const k of keys) {
    const v = await kv.get(k);
    if (!v) continue;
    let e;
    try {
      e = typeof v === 'string' ? JSON.parse(v) : v;
    } catch (err) {
      continue;
    }
    total++;
    if (e.ip) ips.add(e.ip);
    if (e.id) ids.add(e.id);
    byCountry[e.country || '?'] = (byCountry[e.country || '?'] || 0) + 1;
    byHost[e.host || '?'] = (byHost[e.host || '?'] || 0) + 1;
    const day = new Date(e.ts).toISOString().slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  }

  return res.status(200).json({
    ok: true,
    total,
    unique_ips: ips.size,
    unique_clients: ids.size,
    by_country: byCountry,
    by_host: byHost,
    by_day: byDay
  });
}

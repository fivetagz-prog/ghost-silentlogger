import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const auth =
    (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '') ||
    req.query.token ||
    '';

  if (!process.env.LOG_TOKEN || auth !== process.env.LOG_TOKEN) {
    return res.status(401).json({ ok: false, err: 'unauthorized' });
  }

  const limit = Math.min(parseInt(req.query.limit || '10000', 10) || 10000, 10000);
  const format = (req.query.format || 'json').toLowerCase();
  const keys = await kv.lrange('logs:all', 0, limit - 1);

  const rows = [];
  for (const k of keys) {
    const v = await kv.get(k);
    if (!v) continue;
    try {
      rows.push(typeof v === 'string' ? JSON.parse(v) : v);
    } catch (e) {}
  }
  rows.sort((a, b) => b.ts - a.ts);

  if (format === 'csv') {
    const header = [
      'ts','iso','ip','country','city','region','lat','lon',
      'host','page','ref','ua','tz','lang','screen','id'
    ].join(',');
    const esc = (x) => {
      const s = String(x == null ? '' : x).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const body = rows.map(r => [
      r.ts, new Date(r.ts).toISOString(), r.ip, r.country, r.city, r.region,
      r.lat, r.lon, r.host, r.page, r.ref, r.ua, r.tz, r.lang, r.screen, r.id
    ].map(esc).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="ghost-logs-${Date.now()}.csv"`);
    return res.status(200).send(header + '\n' + body);
  }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="ghost-logs-${Date.now()}.json"`);
  return res.status(200).send(JSON.stringify({ ok: true, count: rows.length, entries: rows }, null, 2));
}

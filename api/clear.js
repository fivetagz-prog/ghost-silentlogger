import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  const auth =
    (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '') ||
    req.query.token ||
    '';

  if (!process.env.LOG_TOKEN || auth !== process.env.LOG_TOKEN) {
    return res.status(401).json({ ok: false, err: 'unauthorized' });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, err: 'POST only' });
  }

  const keys = await kv.lrange('logs:all', 0, -1);
  let removed = 0;
  for (const k of keys) {
    try {
      await kv.del(k);
      removed++;
    } catch (e) {}
  }
  await kv.del('logs:all');

  return res.status(200).json({ ok: true, removed });
}

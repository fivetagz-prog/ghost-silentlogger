import { kv } from '@vercel/kv';

export default async function handler(req, res) {
  let kvOk = false;
  let count = 0;
  try {
    count = await kv.llen('logs:all');
    kvOk = true;
  } catch (e) {}

  return res.status(200).json({
    ok: true,
    ts: Date.now(),
    kv: kvOk,
    entries: count,
    telegram: Boolean(process.env.TG_TOKEN && process.env.TG_CHAT),
    token_set: Boolean(process.env.LOG_TOKEN)
  });
}

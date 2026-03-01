import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const event = req.body || {};
  console.log('analytics event:', event);
  res.status(200).json({ ok: true });
}

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // clear cookie and session
  const token = req.cookies.session;
  if (token) {
    res.setHeader('Set-Cookie', 'session=; HttpOnly; Path=/; Max-Age=0');
  }
  return res.status(200).json({ ok: true });
}

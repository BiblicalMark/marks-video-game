import type { NextApiRequest, NextApiResponse } from 'next';
import { getSessionUser } from '../../utils/sessions';
import { getScore, addScore } from '../../utils/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (!session) {
    return res.status(401).json({ error: 'not authenticated' });
  }
  const uid = session.userId;

  if (req.method === 'GET') {
    const score = getScore(uid);
    return res.status(200).json({ score });
  } else if (req.method === 'POST') {
    const score = addScore(uid, 1);
    return res.status(200).json({ score });
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}

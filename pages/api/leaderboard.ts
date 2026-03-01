import type { NextApiRequest, NextApiResponse } from 'next';
import type { NextApiRequest, NextApiResponse } from 'next';
import { getLeaderboard } from '../../utils/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  try {
    const rows = getLeaderboard(5);
    return res.status(200).json({ top: rows.map((r: any) => ({ username: r.username, score: r.total })) });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

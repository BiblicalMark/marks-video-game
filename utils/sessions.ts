import { randomBytes } from 'crypto';
import type { NextApiRequest } from 'next';

// replicate simple store used earlier
// simple session store mapping token to user id
export const sessions = new Map<string, number>(); // token -> userId

export function createSession(userId: number) {
  const token = randomBytes(16).toString('hex');
  sessions.set(token, userId);
  return token;
}

export function getSessionUser(req: NextApiRequest): { userId: number } | null {
  const token = req.cookies.session;
  if (token && sessions.has(token)) {
    return { userId: sessions.get(token)! };
  }
  return null;
}

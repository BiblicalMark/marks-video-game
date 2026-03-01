import type { NextApiRequest, NextApiResponse } from 'next';
import { randomBytes } from 'crypto';

// simple database-backed user store
import { createSession } from '../../utils/sessions';
import { findUser, ensureDefaultUser } from '../../utils/db';

// ensure alice exists
ensureDefaultUser();

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const { username, password } = req.body || {};
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const user = findUser(username);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'invalid credentials' });
  }

  // create session token containing user id
  const token = createSession(user.id);

  // set cookie
  res.setHeader('Set-Cookie', `session=${token}; HttpOnly; Path=/; Max-Age=86400`);
  return res.status(200).json({ user: { id: user.id, username: user.username, is_subscribed: !!user.is_subscribed } });
}

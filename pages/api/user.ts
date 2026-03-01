import type { NextApiRequest, NextApiResponse } from 'next';

// replicate same sessions map from login.ts
// for simplicity, import from a shared module
import { getSessionUser } from '../../utils/sessions';
import { findUser, findUserById } from '../../utils/db';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = getSessionUser(req);
  if (session) {
    const user = findUserById(session.userId);
    if (user) {
      return res.status(200).json({ user: { id: user.id, username: user.username, is_subscribed: !!user.is_subscribed } });
    }
    return res.status(200).json({ user: null });
  } else {
    return res.status(401).json({ user: null });
  }
}

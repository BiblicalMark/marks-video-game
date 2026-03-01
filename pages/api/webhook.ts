import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { setSubscribed } from '../../utils/db';

// disable body parsing so we can verify signature
export const config = {
  api: {
    bodyParser: false,
  },
};

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2022-11-15' });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const sig = req.headers['stripe-signature'] as string;
  // manually read raw body
  const body = await new Promise<Buffer>((resolve, reject) => {
    const chunks: any[] = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

  let event: Stripe.Event;
  try {
    if (process.env.STRIPE_WEBHOOK_SECRET) {
      event = stripe.webhooks.constructEvent(body.toString(), sig, process.env.STRIPE_WEBHOOK_SECRET);
    } else {
      // no verification for development
      event = JSON.parse(body.toString());
    }
  } catch (err: any) {
    console.error('Webhook signature verification failed.', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the checkout.session.completed event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    // assume metadata contains userId
    const userId = session.metadata?.userId ? parseInt(session.metadata.userId) : null;
    if (userId) {
      setSubscribed(userId, true);
    }
  }

  res.status(200).json({ received: true });
}

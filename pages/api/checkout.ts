import type { NextApiRequest, NextApiResponse } from 'next';
// stripe is a CommonJS module
const Stripe = require('stripe');

// stripe key from environment
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2022-11-15',
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  try {
    // attach user id for webhook processing
    const { getSessionUser } = require('../../utils/sessions');
    const sessionInfo = getSessionUser(req as any);
    let metadata: any = {};
    if (sessionInfo) {
      metadata.userId = sessionInfo.userId.toString();
    }
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID || 'price_XXXXXXXX', // replace with your price
          quantity: 1,
        },
      ],
      success_url: `${req.headers.origin}/?success=1`,
      cancel_url: `${req.headers.origin}/?canceled=1`,
      metadata,
    });
    res.status(200).json({ url: session.url });
  } catch (err: any) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

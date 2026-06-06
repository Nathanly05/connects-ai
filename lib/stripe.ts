import Stripe from "stripe";

export function createStripeClient() {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    throw new Error("请先配置 STRIPE_SECRET_KEY。");
  }

  return new Stripe(secretKey);
}

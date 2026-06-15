"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getBillingPlan } from "@/lib/billing-plans";
import { createClient } from "@/lib/supabase/server";
import { createStripeClient } from "@/lib/stripe";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function redirectWithError(message: string): never {
  redirect(`/billing?error=${encodeURIComponent(message)}`);
}

function redirectWithPaymentError(): never {
  redirectWithError("支付暂时无法发起，请稍后再试。");
}

const bannedMessage = "账号已被限制使用，如有疑问请联系客服。";

export async function createCheckoutSessionAction(formData: FormData) {
  const plan = getBillingPlan(getString(formData, "planId"));
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    redirectWithPaymentError();
  }

  if (profile?.status === "banned") {
    await supabase.auth.signOut();
    redirect(`/auth/login?error=${encodeURIComponent(bannedMessage)}`);
  }

  if (profile?.status === "rejected") {
    redirect("/auth/rejected");
  }

  if (profile?.status !== "approved") {
    redirect("/auth/pending");
  }

  const headerStore = await headers();
  const origin =
    headerStore.get("origin") ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    "http://localhost:3000";

  let checkoutUrl: string | null = null;
  let hasError = false;

  try {
    const stripe = createStripeClient();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: user.id,
      customer_email: user.email ?? undefined,
      success_url: `${origin}/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/billing?canceled=1`,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: plan.currency,
            unit_amount: plan.amountMinor,
            product_data: {
              name: `${plan.name} - ${plan.credits} chats`
            }
          }
        }
      ],
      metadata: {
        user_id: user.id,
        plan_name: plan.name,
        credits: String(plan.credits)
      }
    });

    const { error: insertError } = await supabase.from("payment_orders").insert({
      user_id: user.id,
      stripe_session_id: session.id,
      plan_name: plan.name,
      amount_gbp: plan.amountValue,
      credits: plan.credits,
      status: "pending"
    });

    if (insertError) {
      hasError = true;
    } else {
      checkoutUrl = session.url;
    }
  } catch {
    hasError = true;
  }

  if (hasError) {
    redirectWithPaymentError();
  }

  if (!checkoutUrl) {
    redirectWithPaymentError();
  }

  redirect(checkoutUrl);
}

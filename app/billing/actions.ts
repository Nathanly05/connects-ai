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
    redirectWithError("读取账号状态失败，请稍后重试。");
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
  let errorMessage: string | null = null;

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
            currency: "gbp",
            unit_amount: plan.amountPence,
            product_data: {
              name: `${plan.name} - ${plan.credits} credits`
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
      amount_gbp: plan.amountGbp,
      credits: plan.credits,
      status: "pending"
    });

    if (insertError) {
      errorMessage = `创建支付订单失败：${insertError.message}`;
    } else {
      checkoutUrl = session.url;
    }
  } catch (error) {
    errorMessage = error instanceof Error ? error.message : "创建 Stripe Checkout 失败。";
  }

  if (errorMessage) {
    redirectWithError(errorMessage);
  }

  if (!checkoutUrl) {
    redirectWithError("Stripe Checkout 没有返回支付链接。");
  }

  redirect(checkoutUrl);
}

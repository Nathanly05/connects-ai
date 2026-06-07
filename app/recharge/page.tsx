import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PaymentMethodPage } from "@/components/billing/payment-method-page";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Recharge"
};

type RechargePageProps = {
  searchParams: Promise<{
    method?: string;
    success?: string;
    canceled?: string;
    error?: string;
  }>;
};

export default async function RechargePage({ searchParams }: RechargePageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  return (
    <PaymentMethodPage
      basePath="/recharge"
      method={params.method}
      success={params.success}
      canceled={params.canceled}
      error={params.error}
    />
  );
}

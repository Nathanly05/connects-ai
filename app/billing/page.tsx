import { PaymentMethodPage } from "@/components/billing/payment-method-page";

type BillingPageProps = {
  searchParams: Promise<{
    method?: string;
    success?: string;
    canceled?: string;
    error?: string;
    session_id?: string;
  }>;
};

export default async function BillingPage({ searchParams }: BillingPageProps) {
  const params = await searchParams;

  return (
    <PaymentMethodPage
      basePath="/billing"
      method={params.method}
      success={params.success}
      canceled={params.canceled}
      error={params.error}
    />
  );
}

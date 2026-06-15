export type BillingPlanId = "basic" | "standard" | "premium";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  amountValue: number;
  amountMinor: number;
  currency: "cny";
  priceLabel: string;
  credits: number;
  badge?: string;
};

export const billingPlans: BillingPlan[] = [
  {
    id: "basic",
    name: "Basic",
    amountValue: 9.9,
    amountMinor: 990,
    currency: "cny",
    priceLabel: "¥9.9",
    credits: 50
  },
  {
    id: "standard",
    name: "Standard",
    amountValue: 39,
    amountMinor: 3900,
    currency: "cny",
    priceLabel: "¥39",
    credits: 300,
    badge: "推荐"
  },
  {
    id: "premium",
    name: "Premium",
    amountValue: 99,
    amountMinor: 9900,
    currency: "cny",
    priceLabel: "¥99",
    credits: 1000
  }
];

export function getBillingPlan(planId?: string | null) {
  return billingPlans.find((plan) => plan.id === planId) ?? billingPlans[1];
}

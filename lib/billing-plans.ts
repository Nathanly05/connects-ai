export type BillingPlanId = "starter" | "pro" | "max";

export type BillingPlan = {
  id: BillingPlanId;
  name: string;
  amountGbp: number;
  amountPence: number;
  priceLabel: string;
  credits: number;
};

export const billingPlans: BillingPlan[] = [
  {
    id: "starter",
    name: "Starter",
    amountGbp: 2.99,
    amountPence: 299,
    priceLabel: "£2.99",
    credits: 100
  },
  {
    id: "pro",
    name: "Pro",
    amountGbp: 9.99,
    amountPence: 999,
    priceLabel: "£9.99",
    credits: 500
  },
  {
    id: "max",
    name: "Max",
    amountGbp: 19.99,
    amountPence: 1999,
    priceLabel: "£19.99",
    credits: 1500
  }
];

export function getBillingPlan(planId?: string | null) {
  return billingPlans.find((plan) => plan.id === planId) ?? billingPlans[1];
}

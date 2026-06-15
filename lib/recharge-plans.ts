export type RechargePlanId = "basic" | "standard" | "premium";

export type RechargePlan = {
  id: RechargePlanId;
  name: string;
  amount: number;
  priceLabel: string;
  credits: number;
  badge?: string;
};

export const rechargePlans: RechargePlan[] = [
  {
    id: "basic",
    name: "Basic",
    amount: 9.9,
    priceLabel: "¥9.9",
    credits: 50
  },
  {
    id: "standard",
    name: "Standard",
    amount: 39,
    priceLabel: "¥39",
    credits: 300,
    badge: "推荐"
  },
  {
    id: "premium",
    name: "Premium",
    amount: 99,
    priceLabel: "¥99",
    credits: 1000
  }
];

export function getRechargePlan(planId?: string | null) {
  return rechargePlans.find((plan) => plan.id === planId) ?? rechargePlans[1];
}

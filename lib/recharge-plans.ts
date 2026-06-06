export type RechargePlanId = "starter" | "standard" | "pro";

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
    id: "starter",
    name: "Starter",
    amount: 9.9,
    priceLabel: "9.9 RMB",
    credits: 50
  },
  {
    id: "standard",
    name: "Standard",
    amount: 29.9,
    priceLabel: "29.9 RMB",
    credits: 200,
    badge: "🔥 最受欢迎"
  },
  {
    id: "pro",
    name: "Pro",
    amount: 99,
    priceLabel: "99 RMB",
    credits: 1000
  }
];

export function getRechargePlan(planId?: string | null) {
  return rechargePlans.find((plan) => plan.id === planId) ?? rechargePlans[1];
}

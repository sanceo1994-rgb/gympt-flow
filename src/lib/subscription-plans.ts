export type PlanId = "free" | "mini" | "basic" | "pro";

export type SubscriptionPlan = {
  id: PlanId;
  name: string;
  monthlyPrice: number;
  activeStudentLimit: number;
  monthlyAlimtalkLimit: number;
  extraAlimtalk100Price: number | null;
  extraPurchaseEnabled: boolean;
  displayOrder: number;
  popular?: boolean;
  proBadge?: boolean;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "free",
    name: "Free",
    monthlyPrice: 0,
    activeStudentLimit: 3,
    monthlyAlimtalkLimit: 20,
    extraAlimtalk100Price: null,
    extraPurchaseEnabled: false,
    displayOrder: 10,
  },
  {
    id: "mini",
    name: "Mini",
    monthlyPrice: 19000,
    activeStudentLimit: 5,
    monthlyAlimtalkLimit: 80,
    extraAlimtalk100Price: 3000,
    extraPurchaseEnabled: true,
    displayOrder: 20,
  },
  {
    id: "basic",
    name: "Basic",
    monthlyPrice: 39000,
    activeStudentLimit: 10,
    monthlyAlimtalkLimit: 200,
    extraAlimtalk100Price: 2500,
    extraPurchaseEnabled: true,
    displayOrder: 30,
    popular: true,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPrice: 79000,
    activeStudentLimit: 20,
    monthlyAlimtalkLimit: 500,
    extraAlimtalk100Price: 2000,
    extraPurchaseEnabled: true,
    displayOrder: 40,
    proBadge: true,
  },
];

export function planById(id: string | null | undefined): SubscriptionPlan {
  return SUBSCRIPTION_PLANS.find((plan) => plan.id === id) ?? SUBSCRIPTION_PLANS[0];
}

export function nextPlan(current: SubscriptionPlan): SubscriptionPlan | null {
  const index = SUBSCRIPTION_PLANS.findIndex((plan) => plan.id === current.id);
  return SUBSCRIPTION_PLANS[index + 1] ?? null;
}

export function annualPrice(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 12 * 0.7);
}

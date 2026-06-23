export type PlanName = "hobby" | "pro" | "team";

export function computePlan(credits: number): PlanName {
  if (credits >= 60000) return "team";
  if (credits >= 25000) return "pro";
  return "hobby";
}

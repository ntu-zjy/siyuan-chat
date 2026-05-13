import type { PlanEntity } from "lib/db/pg/schema.pg";

export const FREE_PLAN_CODE = "free";

// Fallback plan if `free` is not seeded in DB (e.g., fresh dev environment).
// Lets the app keep working without forcing every developer to seed before
// first request.
export const FALLBACK_FREE_PLAN: PlanEntity = {
  code: FREE_PLAN_CODE,
  name: "Free",
  monthlyPriceCents: 0,
  yearlyPriceCents: null,
  monthlyMsgLimit: 50,
  monthlyTokenLimit: 100_000,
  allowedModelPatterns: ["qwen-turbo*", "deepseek-chat*", "*:free"],
  features: [],
  displayOrder: 0,
  active: true,
};

export function matchModelPattern(
  modelId: string | undefined,
  patterns: string[],
): boolean {
  if (!modelId) return false;
  return patterns.some((p) => globMatch(modelId, p));
}

function globMatch(input: string, pattern: string): boolean {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i").test(input);
}

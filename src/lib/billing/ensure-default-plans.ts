import "server-only";

import { eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { PlanTable } from "lib/db/pg/schema.pg";
import { DEFAULT_BILLING_PLAN_ROWS } from "./default-plan-rows";

/**
 * Keeps built-in `plan` rows in sync with {@link DEFAULT_BILLING_PLAN_ROWS}.
 * Always upserts (pricing/checkout read from DB; old deploys otherwise keep
 * stale free/plus/pro rows forever).
 */
export async function ensureDefaultBillingPlans(): Promise<void> {
  for (const plan of DEFAULT_BILLING_PLAN_ROWS) {
    await pgDb
      .insert(PlanTable)
      .values(plan)
      .onConflictDoUpdate({
        target: PlanTable.code,
        set: {
          name: plan.name,
          monthlyPriceCents: plan.monthlyPriceCents,
          yearlyPriceCents: plan.yearlyPriceCents,
          monthlyMsgLimit: plan.monthlyMsgLimit,
          monthlyTokenLimit: plan.monthlyTokenLimit,
          allowedModelPatterns: plan.allowedModelPatterns,
          features: plan.features,
          displayOrder: plan.displayOrder,
          active: plan.active,
        },
      });
  }

  await pgDb
    .update(PlanTable)
    .set({ active: false })
    .where(eq(PlanTable.code, "plus"));
}

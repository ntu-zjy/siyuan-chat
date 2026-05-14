import "server-only";

import { eq } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import { PlanTable } from "lib/db/pg/schema.pg";
import { DEFAULT_BILLING_PLAN_ROWS } from "./default-plan-rows";

/**
 * When no active `plan` rows exist (common after migrate without `seed-plans`),
 * upsert built-in defaults so pricing and checkout work.
 */
export async function ensureDefaultBillingPlans(): Promise<void> {
  const anyActive = await pgDb
    .select({ code: PlanTable.code })
    .from(PlanTable)
    .where(eq(PlanTable.active, true))
    .limit(1);

  if (anyActive.length > 0) return;

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
}

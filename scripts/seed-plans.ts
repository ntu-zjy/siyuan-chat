import "dotenv/config";
import { eq } from "drizzle-orm";
import { pgDb } from "../src/lib/db/pg/db.pg";
import { PlanTable } from "../src/lib/db/pg/schema.pg";
import { DEFAULT_BILLING_PLAN_ROWS } from "../src/lib/billing/default-plan-rows";

async function seed() {
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
    console.log(`✅ Seeded plan: ${plan.code}`);
  }

  await pgDb
    .update(PlanTable)
    .set({ active: false })
    .where(eq(PlanTable.code, "plus"));

  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

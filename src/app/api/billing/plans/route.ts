import { pgDb } from "lib/db/pg/db.pg";
import { PlanTable } from "lib/db/pg/schema.pg";
import { eq, asc } from "drizzle-orm";
import { ensureDefaultBillingPlans } from "lib/billing/ensure-default-plans";

export const GET = async () => {
  await ensureDefaultBillingPlans();

  const plans = await pgDb
    .select()
    .from(PlanTable)
    .where(eq(PlanTable.active, true))
    .orderBy(asc(PlanTable.displayOrder));
  return Response.json(plans);
};

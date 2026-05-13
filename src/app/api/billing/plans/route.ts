import { pgDb } from "lib/db/pg/db.pg";
import { PlanTable } from "lib/db/pg/schema.pg";
import { eq, asc } from "drizzle-orm";

export const GET = async () => {
  const plans = await pgDb
    .select()
    .from(PlanTable)
    .where(eq(PlanTable.active, true))
    .orderBy(asc(PlanTable.displayOrder));
  return Response.json(plans);
};

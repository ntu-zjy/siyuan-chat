import { pgDb } from "lib/db/pg/db.pg";
import { PlanTable } from "lib/db/pg/schema.pg";
import { eq, asc } from "drizzle-orm";
import { getSession } from "auth/server";
import { ensureDefaultBillingPlans } from "lib/billing/ensure-default-plans";
import { resolvePlan } from "lib/billing/quota";
import { PricingCards } from "@/components/billing/pricing-cards";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  await ensureDefaultBillingPlans();

  const plans = await pgDb
    .select()
    .from(PlanTable)
    .where(eq(PlanTable.active, true))
    .orderBy(asc(PlanTable.displayOrder));

  const session = await getSession();
  const currentPlan = session?.user?.id
    ? await resolvePlan(session.user.id)
    : null;

  return (
    <div className="container max-w-6xl mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-3">选择适合你的方案</h1>
        <p className="text-muted-foreground">
          随时升降级，按月或按年订阅，国内支付（支付宝/微信）
        </p>
      </div>
      <PricingCards plans={plans} currentPlanCode={currentPlan?.code ?? null} />
    </div>
  );
}

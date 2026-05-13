import { getSession } from "auth/server";
import { getBillingSummary } from "lib/billing/quota";
import { unauthorized } from "next/navigation";
import { UsageBar } from "@/components/billing/usage-bar";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const session = await getSession();
  if (!session?.user?.id) {
    unauthorized();
  }

  const { plan, usage } = await getBillingSummary(session!.user.id);

  return (
    <div className="container max-w-3xl mx-auto py-12 px-4">
      <h1 className="text-3xl font-bold mb-8">订阅与账单</h1>

      <section className="border rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h2 className="text-sm text-muted-foreground">当前方案</h2>
            <p className="text-2xl font-semibold">{plan.name}</p>
          </div>
          <Link href="/pricing">
            <Button>升级方案</Button>
          </Link>
        </div>
      </section>

      <section className="border rounded-lg p-6">
        <h2 className="text-lg font-semibold mb-4">本月用量</h2>
        <div className="flex flex-col gap-4">
          <UsageBar
            label="消息数"
            used={usage.msgCount}
            limit={plan.monthlyMsgLimit}
          />
          <UsageBar
            label="Token 数"
            used={usage.totalTokens}
            limit={plan.monthlyTokenLimit}
          />
        </div>
      </section>
    </div>
  );
}

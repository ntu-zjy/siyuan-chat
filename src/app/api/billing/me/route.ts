import { getSession } from "auth/server";
import { getBillingSummary } from "lib/billing/quota";

export const GET = async () => {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }
  const summary = await getBillingSummary(session.user.id);
  return Response.json({
    plan: {
      code: summary.plan.code,
      name: summary.plan.name,
      monthlyMsgLimit: summary.plan.monthlyMsgLimit,
      monthlyTokenLimit: summary.plan.monthlyTokenLimit,
      allowedModelPatterns: summary.plan.allowedModelPatterns,
    },
    usage: summary.usage,
  });
};

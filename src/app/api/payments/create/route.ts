import { getSession } from "auth/server";
import { pgDb } from "lib/db/pg/db.pg";
import { OrderTable, PlanTable } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import { buildSubmitUrl, isZpayConfigured } from "lib/billing/zpay";
import { z } from "zod";

const bodySchema = z.object({
  planCode: z.string().min(1).max(32),
  period: z.enum(["monthly", "yearly"]),
  payType: z.enum(["alipay", "wxpay"]).default("alipay"),
});

const ORDER_TIMEOUT_MS = 30 * 60 * 1000;

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload;
  try {
    payload = bodySchema.parse(await req.json());
  } catch (e: any) {
    return Response.json(
      { message: "invalid_request", detail: e.message },
      {
        status: 400,
      },
    );
  }

  if (!isZpayConfigured()) {
    return Response.json(
      {
        message: "payment_not_configured",
        detail:
          "Zpay 商户信息未配置（ZPAY_PID / ZPAY_KEY / ZPAY_NOTIFY_URL / ZPAY_RETURN_URL）",
      },
      { status: 503 },
    );
  }

  const [plan] = await pgDb
    .select()
    .from(PlanTable)
    .where(eq(PlanTable.code, payload.planCode))
    .limit(1);

  if (!plan || !plan.active) {
    return Response.json({ message: "plan_not_found" }, { status: 404 });
  }
  if (plan.monthlyPriceCents <= 0) {
    return Response.json({ message: "plan_is_free" }, { status: 400 });
  }

  const amountCents =
    payload.period === "yearly"
      ? (plan.yearlyPriceCents ?? plan.monthlyPriceCents * 12)
      : plan.monthlyPriceCents;
  const amountYuan = (amountCents / 100).toFixed(2);

  const now = new Date();
  const [order] = await pgDb
    .insert(OrderTable)
    .values({
      userId: session.user.id,
      planCode: plan.code,
      period: payload.period,
      amountCents,
      status: "pending",
      provider: "zpay",
      providerPayType: payload.payType,
      createdAt: now,
      expiresAt: new Date(now.getTime() + ORDER_TIMEOUT_MS),
    })
    .returning();

  const submitUrl = buildSubmitUrl({
    outTradeNo: order.id,
    amountYuan,
    name: `思源 AI ${plan.name} (${payload.period === "yearly" ? "年付" : "月付"})`,
    payType: payload.payType,
  });

  return Response.json({ orderId: order.id, url: submitUrl });
}

import { verifyNotify } from "lib/billing/zpay";
import {
  grantOrExtendSubscription,
  markOrderPaid,
} from "lib/billing/subscriptions";
import { pgDb } from "lib/db/pg/db.pg";
import { OrderTable } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";
import logger from "logger";

/**
 * Zpay async callback. Z-pay.cn defaults to GET; some integrations are
 * configured for POST. We accept both so the route works regardless of how
 * the merchant dashboard is wired.
 *
 * Must be idempotent and return the literal string `success` within ~3s, or
 * Zpay will retry on a 0/15/15/30/180/1800s back-off for ~24h.
 */
async function handle(form: Record<string, string>): Promise<Response> {
  if (!verifyNotify(form)) {
    logger.warn("Zpay notify signature failed", {
      out_trade_no: form.out_trade_no,
    });
    return new Response("fail", { status: 200 });
  }

  if (form.trade_status !== "TRADE_SUCCESS") {
    logger.info("Zpay notify non-success", {
      status: form.trade_status,
      out_trade_no: form.out_trade_no,
    });
    return new Response("success", { status: 200 });
  }

  // Defense-in-depth: even with a valid signature, refuse to credit a
  // subscription unless the reported money exactly matches the stored order
  // amount. Protects against KEY-leakage scenarios where an attacker could
  // forge a valid sign but with a tampered low amount.
  const [pre] = await pgDb
    .select({ amountCents: OrderTable.amountCents })
    .from(OrderTable)
    .where(eq(OrderTable.id, form.out_trade_no))
    .limit(1);
  if (!pre) {
    logger.warn("Zpay notify for unknown order", {
      out_trade_no: form.out_trade_no,
    });
    return new Response("fail", { status: 200 });
  }
  const expectedYuan = (pre.amountCents / 100).toFixed(2);
  if (form.money !== expectedYuan) {
    logger.warn("Zpay notify amount mismatch", {
      out_trade_no: form.out_trade_no,
      expected: expectedYuan,
      got: form.money,
    });
    return new Response("fail", { status: 200 });
  }

  try {
    const { order, newlyPaid } = await markOrderPaid(
      form.out_trade_no,
      form.trade_no,
    );
    if (newlyPaid) {
      await grantOrExtendSubscription(order);
      logger.info(`Order ${order.id} paid + subscription granted`);
    } else {
      logger.info(`Order ${order.id} notify replayed (already paid)`);
    }
    return new Response("success", { status: 200 });
  } catch (e: any) {
    logger.error("Zpay notify processing failed", { error: e.message });
    return new Response("fail", { status: 200 });
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const form: Record<string, string> = {};
  for (const [k, v] of url.searchParams.entries()) form[k] = v;
  return handle(form);
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const form: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") form[k] = v;
  }
  return handle(form);
}

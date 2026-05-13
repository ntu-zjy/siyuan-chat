import { verifyNotify } from "lib/billing/zpay";
import {
  grantOrExtendSubscription,
  markOrderPaid,
} from "lib/billing/subscriptions";
import logger from "logger";

/**
 * Zpay async callback. Must be idempotent — Zpay retries if it doesn't get
 * exactly "success" plaintext within ~3 seconds, and resends every few minutes
 * for ~24 hours.
 */
export async function POST(req: Request) {
  const formData = await req.formData();
  const form: Record<string, string> = {};
  for (const [k, v] of formData.entries()) {
    if (typeof v === "string") form[k] = v;
  }

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
    // Returning a non-"success" body causes Zpay to retry — desirable for
    // transient errors but the user may see delayed activation.
    return new Response("fail", { status: 200 });
  }
}

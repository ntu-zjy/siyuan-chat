import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import {
  OrderTable,
  SubscriptionTable,
  type OrderEntity,
} from "lib/db/pg/schema.pg";

/**
 * Atomically mark an order paid. Returns `{ order, newlyPaid }` so the caller
 * can branch on idempotency: only `newlyPaid === true` should extend the
 * subscription, because Zpay may call /notify multiple times.
 */
export async function markOrderPaid(
  orderId: string,
  providerTradeNo: string,
): Promise<{ order: OrderEntity; newlyPaid: boolean }> {
  // Conditional UPDATE: only updates rows whose status is still 'pending'.
  // Returns the updated row, or nothing if the order was already paid.
  const [updated] = await pgDb
    .update(OrderTable)
    .set({
      status: "paid",
      providerTradeNo,
      paidAt: new Date(),
    })
    .where(and(eq(OrderTable.id, orderId), eq(OrderTable.status, "pending")))
    .returning();

  if (updated) {
    return { order: updated, newlyPaid: true };
  }

  // Already processed: fetch and return the existing record so the caller can
  // still respond `success` to Zpay (idempotent acknowledgement).
  const [existing] = await pgDb
    .select()
    .from(OrderTable)
    .where(eq(OrderTable.id, orderId))
    .limit(1);

  if (!existing) {
    throw new Error(`Order ${orderId} not found`);
  }
  return { order: existing, newlyPaid: false };
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function addDuration(base: Date, period: "monthly" | "yearly"): Date {
  const days = period === "yearly" ? 365 : 30;
  return new Date(base.getTime() + days * MS_PER_DAY);
}

/**
 * Grant or extend the user's subscription based on the paid order.
 *
 * Semantics:
 * - If the user has no active subscription, create one starting now.
 * - If they have an active subscription to the same plan, extend its
 *   `expiresAt` forward (renewals stack from the current expiry, not now).
 * - If they have an active subscription to a *different* plan, mark it
 *   canceled and start a fresh one (treat as plan switch).
 */
export async function grantOrExtendSubscription(order: OrderEntity) {
  const now = new Date();

  const [active] = await pgDb
    .select()
    .from(SubscriptionTable)
    .where(
      and(
        eq(SubscriptionTable.userId, order.userId),
        eq(SubscriptionTable.status, "active"),
        gte(SubscriptionTable.expiresAt, now),
      ),
    )
    .orderBy(sql`${SubscriptionTable.expiresAt} desc`)
    .limit(1);

  if (active && active.planCode === order.planCode) {
    const newExpiry = addDuration(
      active.expiresAt > now ? active.expiresAt : now,
      order.period as "monthly" | "yearly",
    );
    await pgDb
      .update(SubscriptionTable)
      .set({
        expiresAt: newExpiry,
        sourceOrderId: order.id,
        updatedAt: now,
      })
      .where(eq(SubscriptionTable.id, active.id));
    return;
  }

  if (active && active.planCode !== order.planCode) {
    await pgDb
      .update(SubscriptionTable)
      .set({ status: "canceled", updatedAt: now })
      .where(eq(SubscriptionTable.id, active.id));
  }

  await pgDb.insert(SubscriptionTable).values({
    userId: order.userId,
    planCode: order.planCode,
    status: "active",
    startedAt: now,
    expiresAt: addDuration(now, order.period as "monthly" | "yearly"),
    autoRenew: false,
    sourceOrderId: order.id,
  });
}

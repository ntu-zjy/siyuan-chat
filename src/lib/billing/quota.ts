import "server-only";
import { and, eq, gte, sql } from "drizzle-orm";
import { pgDb } from "lib/db/pg/db.pg";
import {
  PlanTable,
  SubscriptionTable,
  UsageLogTable,
  UserTable,
  type PlanEntity,
} from "lib/db/pg/schema.pg";
import { FALLBACK_FREE_PLAN, FREE_PLAN_CODE, matchModelPattern } from "./plans";
import { USER_ROLES } from "app-types/roles";

export type QuotaErrorReason =
  | "model_not_allowed"
  | "msg_limit_exceeded"
  | "token_limit_exceeded";

export class QuotaError extends Error {
  readonly status = 402;
  constructor(
    readonly reason: QuotaErrorReason,
    readonly detail: {
      planCode: string;
      modelId?: string;
      limit?: number;
      used?: number;
    },
  ) {
    super(`quota:${reason}`);
    this.name = "QuotaError";
  }
}

async function getUserRole(userId: string): Promise<string> {
  const [row] = await pgDb
    .select({ role: UserTable.role })
    .from(UserTable)
    .where(eq(UserTable.id, userId))
    .limit(1);
  return row?.role ?? "user";
}

export async function resolvePlan(userId: string): Promise<PlanEntity> {
  const now = new Date();
  const [sub] = await pgDb
    .select({ planCode: SubscriptionTable.planCode })
    .from(SubscriptionTable)
    .where(
      and(
        eq(SubscriptionTable.userId, userId),
        eq(SubscriptionTable.status, "active"),
        gte(SubscriptionTable.expiresAt, now),
      ),
    )
    .orderBy(sql`${SubscriptionTable.expiresAt} desc`)
    .limit(1);

  const planCode = sub?.planCode ?? FREE_PLAN_CODE;
  const [plan] = await pgDb
    .select()
    .from(PlanTable)
    .where(eq(PlanTable.code, planCode))
    .limit(1);

  return plan ?? FALLBACK_FREE_PLAN;
}

async function getMonthlyUsage(
  userId: string,
): Promise<{ msgCount: number; totalTokens: number }> {
  const startOfMonth = new Date();
  startOfMonth.setUTCDate(1);
  startOfMonth.setUTCHours(0, 0, 0, 0);

  const [agg] = await pgDb
    .select({
      msgCount: sql<number>`count(*)::int`,
      totalTokens: sql<number>`coalesce(sum(${UsageLogTable.totalTokens}), 0)::int`,
    })
    .from(UsageLogTable)
    .where(
      and(
        eq(UsageLogTable.userId, userId),
        gte(UsageLogTable.createdAt, startOfMonth),
      ),
    );

  return { msgCount: agg?.msgCount ?? 0, totalTokens: agg?.totalTokens ?? 0 };
}

export async function checkQuota(
  userId: string,
  modelId: string | undefined,
): Promise<void> {
  const role = await getUserRole(userId);
  if (role === USER_ROLES.ADMIN) return;

  const plan = await resolvePlan(userId);

  if (!matchModelPattern(modelId, plan.allowedModelPatterns)) {
    throw new QuotaError("model_not_allowed", {
      planCode: plan.code,
      modelId,
    });
  }

  const usage = await getMonthlyUsage(userId);

  if (plan.monthlyMsgLimit > 0 && usage.msgCount >= plan.monthlyMsgLimit) {
    throw new QuotaError("msg_limit_exceeded", {
      planCode: plan.code,
      limit: plan.monthlyMsgLimit,
      used: usage.msgCount,
    });
  }

  if (
    plan.monthlyTokenLimit > 0 &&
    usage.totalTokens >= plan.monthlyTokenLimit
  ) {
    throw new QuotaError("token_limit_exceeded", {
      planCode: plan.code,
      limit: plan.monthlyTokenLimit,
      used: usage.totalTokens,
    });
  }
}

export async function recordUsage(
  userId: string,
  modelId: string | undefined,
  usage:
    | {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
      }
    | undefined,
): Promise<void> {
  if (!modelId) return;

  const promptTokens = usage?.inputTokens ?? 0;
  const completionTokens = usage?.outputTokens ?? 0;
  const totalTokens = usage?.totalTokens ?? promptTokens + completionTokens;

  await pgDb.insert(UsageLogTable).values({
    userId,
    model: modelId,
    promptTokens,
    completionTokens,
    totalTokens,
    costCents: 0,
  });
}

export async function getBillingSummary(userId: string) {
  const plan = await resolvePlan(userId);
  const usage = await getMonthlyUsage(userId);
  return { plan, usage };
}

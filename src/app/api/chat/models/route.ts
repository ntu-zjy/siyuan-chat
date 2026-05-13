import { customModelProvider } from "lib/ai/models";
import { getSession } from "auth/server";
import { resolvePlan } from "lib/billing/quota";
import { matchModelPattern } from "lib/billing/plans";
import { USER_ROLES } from "app-types/roles";
import { pgDb } from "lib/db/pg/db.pg";
import { UserTable } from "lib/db/pg/schema.pg";
import { eq } from "drizzle-orm";

export const GET = async () => {
  const session = await getSession();
  const userId = session?.user?.id;

  // Read role fresh from DB; the session cookie caches role for up to 60 min
  // and admin demotion / promotion wouldn't propagate quickly enough otherwise.
  let isAdmin = false;
  if (userId) {
    const [row] = await pgDb
      .select({ role: UserTable.role })
      .from(UserTable)
      .where(eq(UserTable.id, userId))
      .limit(1);
    isAdmin = row?.role === USER_ROLES.ADMIN;
  }

  const plan = userId && !isAdmin ? await resolvePlan(userId) : null;

  return Response.json(
    customModelProvider.modelsInfo
      .map((entry) => ({
        ...entry,
        models: entry.models.map((m) => ({
          ...m,
          locked: plan
            ? !matchModelPattern(m.name, plan.allowedModelPatterns)
            : false,
        })),
      }))
      .sort((a, b) => {
        if (a.hasAPIKey && !b.hasAPIKey) return -1;
        if (!a.hasAPIKey && b.hasAPIKey) return 1;
        return 0;
      }),
  );
};

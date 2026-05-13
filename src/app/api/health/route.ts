import { pgDb } from "lib/db/pg/db.pg";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * Health check for Sealos / Kubernetes liveness + readiness probes.
 *
 * Returns 200 with `{ status: "ok", db: "ok" }` when Postgres is reachable
 * and 503 with the same shape (but `db: "error"`) otherwise. We deliberately
 * still respond JSON on failure so probes get a stable parser.
 */
export async function GET() {
  let dbStatus: "ok" | "error" = "error";
  try {
    await pgDb.execute(sql`SELECT 1`);
    dbStatus = "ok";
  } catch {
    dbStatus = "error";
  }

  const body = { status: dbStatus === "ok" ? "ok" : "degraded", db: dbStatus };
  return Response.json(body, { status: dbStatus === "ok" ? 200 : 503 });
}

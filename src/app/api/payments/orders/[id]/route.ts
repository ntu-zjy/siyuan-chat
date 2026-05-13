import { getSession } from "auth/server";
import { pgDb } from "lib/db/pg/db.pg";
import { OrderTable } from "lib/db/pg/schema.pg";
import { and, eq } from "drizzle-orm";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const session = await getSession();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const [order] = await pgDb
    .select({
      id: OrderTable.id,
      status: OrderTable.status,
      planCode: OrderTable.planCode,
      period: OrderTable.period,
      amountCents: OrderTable.amountCents,
      paidAt: OrderTable.paidAt,
      expiresAt: OrderTable.expiresAt,
    })
    .from(OrderTable)
    .where(and(eq(OrderTable.id, id), eq(OrderTable.userId, session.user.id)))
    .limit(1);

  if (!order) {
    return new Response("Not Found", { status: 404 });
  }

  return Response.json(order);
}

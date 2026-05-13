import { redirect } from "next/navigation";

/**
 * Sync return URL. User's browser is redirected here from Zpay after the
 * payment flow completes (regardless of success/fail). The async notify is
 * the authoritative confirmation — this just gives the user a place to land.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("out_trade_no");
  if (!orderId) {
    redirect("/billing");
  }
  redirect(`/billing/success?orderId=${encodeURIComponent(orderId!)}`);
}

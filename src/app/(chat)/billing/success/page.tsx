"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type OrderStatus = "pending" | "paid" | "expired" | "refunded";

const POLL_INTERVAL_MS = 2_000;
const POLL_DEADLINE_MS = 60_000; // give Zpay's async notify ~1 minute

export default function BillingSuccessPage() {
  const search = useSearchParams();
  const router = useRouter();
  const orderId = search.get("orderId");
  const [status, setStatus] = useState<OrderStatus | "loading" | "missing">(
    "loading",
  );

  useEffect(() => {
    if (!orderId) {
      setStatus("missing");
      return;
    }
    const start = Date.now();
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(`/api/payments/orders/${orderId}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const order = (await res.json()) as { status: OrderStatus };
        if (cancelled) return;
        if (order.status === "paid") {
          setStatus("paid");
          return;
        }
        if (
          order.status === "pending" &&
          Date.now() - start < POLL_DEADLINE_MS
        ) {
          setTimeout(tick, POLL_INTERVAL_MS);
          return;
        }
        setStatus(order.status);
      } catch {
        if (Date.now() - start < POLL_DEADLINE_MS) {
          setTimeout(tick, POLL_INTERVAL_MS);
        }
      }
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <div className="container max-w-md mx-auto py-20 px-4 text-center">
      {status === "paid" ? (
        <>
          <CheckCircle2 className="size-12 mx-auto text-emerald-500 mb-4" />
          <h1 className="text-2xl font-semibold mb-2">支付成功</h1>
          <p className="text-muted-foreground mb-6">
            订阅已开通，立即体验全部模型与功能
          </p>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => router.push("/billing")}>查看账单</Button>
            <Button variant="outline" onClick={() => router.push("/")}>
              开始聊天
            </Button>
          </div>
        </>
      ) : status === "loading" || status === "pending" ? (
        <>
          <Loader className="size-12 mx-auto animate-spin text-muted-foreground mb-4" />
          <h1 className="text-2xl font-semibold mb-2">等待支付确认</h1>
          <p className="text-muted-foreground">
            收到支付后约 30 秒生效，请稍候…
          </p>
        </>
      ) : (
        <>
          <AlertTriangle className="size-12 mx-auto text-amber-500 mb-4" />
          <h1 className="text-2xl font-semibold mb-2">订单未完成</h1>
          <p className="text-muted-foreground mb-6">
            如果你已经支付却仍看到此页，请稍后刷新或联系客服
          </p>
          <Button onClick={() => router.push("/pricing")}>返回套餐</Button>
        </>
      )}
    </div>
  );
}

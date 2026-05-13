"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { PlanEntity } from "lib/db/pg/schema.pg";
import { Check, Loader, Crown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export function PricingCards({
  plans,
  currentPlanCode,
}: {
  plans: PlanEntity[];
  currentPlanCode: string | null;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  const subscribe = async (planCode: string, period: "monthly" | "yearly") => {
    setLoading(`${planCode}:${period}`);
    try {
      const res = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode, period, payType: "alipay" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? `HTTP ${res.status}`);
      }
      const { url } = await res.json();
      window.location.href = url;
    } catch (e: any) {
      toast.error(e.message ?? "下单失败");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => {
        const isCurrent = plan.code === currentPlanCode;
        const isHighlighted = plan.code === "plus";
        return (
          <Card
            key={plan.code}
            className={
              isHighlighted ? "border-primary shadow-lg" : "border-border"
            }
          >
            <CardHeader className="text-center pb-2">
              <div className="flex items-center justify-center gap-2">
                {plan.code === "pro" && (
                  <Crown className="size-4 text-amber-500" />
                )}
                <h3 className="text-xl font-semibold">{plan.name}</h3>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold">
                  ¥{(plan.monthlyPriceCents / 100).toFixed(0)}
                </span>
                <span className="text-muted-foreground ml-1">/月</span>
              </div>
              {plan.yearlyPriceCents != null && plan.monthlyPriceCents > 0 && (
                <p className="text-xs text-muted-foreground mt-1">
                  年付 ¥{(plan.yearlyPriceCents / 100).toFixed(0)}
                  （节省{" "}
                  {Math.round(
                    (1 -
                      plan.yearlyPriceCents / (plan.monthlyPriceCents * 12)) *
                      100,
                  )}
                  %）
                </p>
              )}
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <ul className="flex flex-col gap-2 text-sm">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="size-4 mt-0.5 text-primary shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-2 pt-2">
                {plan.monthlyPriceCents === 0 ? (
                  <Button disabled variant="outline" className="w-full">
                    {isCurrent ? "当前方案" : "免费使用"}
                  </Button>
                ) : (
                  <>
                    <Button
                      disabled={loading != null}
                      onClick={() => subscribe(plan.code, "monthly")}
                      variant={isHighlighted ? "default" : "outline"}
                      className="w-full"
                    >
                      {loading === `${plan.code}:monthly` ? (
                        <Loader className="size-4 animate-spin" />
                      ) : isCurrent ? (
                        "续费月付"
                      ) : (
                        "月付订阅"
                      )}
                    </Button>
                    {plan.yearlyPriceCents != null && (
                      <Button
                        disabled={loading != null}
                        onClick={() => subscribe(plan.code, "yearly")}
                        variant="ghost"
                        className="w-full"
                      >
                        {loading === `${plan.code}:yearly` ? (
                          <Loader className="size-4 animate-spin" />
                        ) : (
                          "年付（更划算）"
                        )}
                      </Button>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

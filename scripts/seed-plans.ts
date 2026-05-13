import "dotenv/config";
import { pgDb } from "../src/lib/db/pg/db.pg";
import { PlanTable } from "../src/lib/db/pg/schema.pg";

const PLANS = [
  {
    code: "free",
    name: "免费版",
    monthlyPriceCents: 0,
    yearlyPriceCents: null,
    monthlyMsgLimit: 50,
    monthlyTokenLimit: 100_000,
    // Matches the short keys in src/lib/ai/models.ts. `*:free` covers all 7
    // OpenRouter free-tier models (deepseek-v3:free, qwen3-*:free, gpt-oss-20b:free, …).
    allowedModelPatterns: ["*:free"],
    features: [
      "免费模型 (DeepSeek / Qwen / GPT-OSS)",
      "每月 50 条消息",
      "10 万 token",
    ],
    displayOrder: 0,
    active: true,
  },
  {
    code: "plus",
    name: "Plus 版",
    monthlyPriceCents: 1900,
    yearlyPriceCents: 19000,
    monthlyMsgLimit: 2000,
    monthlyTokenLimit: 5_000_000,
    // Mid-tier paid models. Each pattern matches the short key in
    // staticModels (src/lib/ai/models.ts) — NOT the OpenRouter provider/model
    // route string. Add/remove names here when models.ts gains entries.
    allowedModelPatterns: [
      "*:free",
      "haiku-4.5",
      "gemini-2.5-flash*",
      "gpt-4.1-mini",
      "o4-mini",
      "grok-3-mini",
      "grok-4-1-fast",
      "kimi-k2-instruct",
    ],
    features: [
      "中档模型 (haiku-4.5 / gpt-4.1-mini / gemini-2.5-flash)",
      "每月 2000 条消息",
      "500 万 token",
      "MCP 工具",
    ],
    displayOrder: 1,
    active: true,
  },
  {
    code: "pro",
    name: "Pro 版",
    monthlyPriceCents: 9900,
    yearlyPriceCents: 99000,
    monthlyMsgLimit: -1,
    monthlyTokenLimit: 50_000_000,
    allowedModelPatterns: ["*"],
    features: [
      "全部顶级模型 (gpt-5.1 / sonnet-4.5 / opus-4.5 / gemini-3-pro / grok-4-1)",
      "无限消息",
      "5000 万 token",
      "工作流编排",
      "优先支持",
    ],
    displayOrder: 2,
    active: true,
  },
];

async function seed() {
  for (const plan of PLANS) {
    await pgDb
      .insert(PlanTable)
      .values(plan)
      .onConflictDoUpdate({
        target: PlanTable.code,
        set: {
          name: plan.name,
          monthlyPriceCents: plan.monthlyPriceCents,
          yearlyPriceCents: plan.yearlyPriceCents,
          monthlyMsgLimit: plan.monthlyMsgLimit,
          monthlyTokenLimit: plan.monthlyTokenLimit,
          allowedModelPatterns: plan.allowedModelPatterns,
          features: plan.features,
          displayOrder: plan.displayOrder,
          active: plan.active,
        },
      });
    console.log(`✅ Seeded plan: ${plan.code}`);
  }
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});

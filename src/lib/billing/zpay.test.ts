import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { createHash } from "node:crypto";

// We re-import inside tests so the module-level env reads pick up the stubs.
const ENV_STUBS = {
  ZPAY_PID: "test_pid",
  ZPAY_KEY: "test_key_4242",
  ZPAY_API_BASE: "https://example.test",
  ZPAY_NOTIFY_URL: "https://siyuan.test/api/payments/zpay/notify",
  ZPAY_RETURN_URL: "https://siyuan.test/api/payments/zpay/return",
};

const prevEnv: Record<string, string | undefined> = {};
beforeAll(() => {
  for (const [k, v] of Object.entries(ENV_STUBS)) {
    prevEnv[k] = process.env[k];
    process.env[k] = v;
  }
});
afterAll(() => {
  for (const k of Object.keys(ENV_STUBS)) {
    if (prevEnv[k] === undefined) delete process.env[k];
    else process.env[k] = prevEnv[k];
  }
});

function expectedSign(params: Record<string, string>, key: string): string {
  const ordered = Object.keys(params)
    .filter((k) => k !== "sign" && k !== "sign_type" && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return createHash("md5")
    .update(ordered + key, "utf8")
    .digest("hex");
}

describe("zpay buildSubmitUrl + verifyNotify", () => {
  it("emits a submit URL with deterministic MD5 sign matching Zpay's spec", async () => {
    const { buildSubmitUrl } = await import("./zpay");
    const url = buildSubmitUrl({
      outTradeNo: "abcd-1234",
      amountYuan: "19.00",
      name: "test order",
      payType: "alipay",
    });
    const parsed = new URL(url);
    expect(parsed.origin + parsed.pathname).toBe(
      "https://example.test/submit.php",
    );
    const params = Object.fromEntries(parsed.searchParams.entries());
    expect(params.pid).toBe("test_pid");
    expect(params.type).toBe("alipay");
    expect(params.money).toBe("19.00");
    expect(params.sign_type).toBe("MD5");
    expect(params.sign).toBe(
      expectedSign(
        {
          pid: params.pid,
          type: params.type,
          out_trade_no: params.out_trade_no,
          notify_url: params.notify_url,
          return_url: params.return_url,
          name: params.name,
          money: params.money,
        },
        "test_key_4242",
      ),
    );
  });

  it("verifyNotify rejects forged signatures and accepts correct ones", async () => {
    const { verifyNotify } = await import("./zpay");
    const params = {
      pid: "test_pid",
      out_trade_no: "abcd-1234",
      trade_no: "201906...",
      trade_status: "TRADE_SUCCESS",
      money: "19.00",
      type: "alipay",
      name: "test order",
    };
    const goodSign = expectedSign(params, "test_key_4242");
    expect(verifyNotify({ ...params, sign: goodSign, sign_type: "MD5" })).toBe(
      true,
    );
    expect(
      verifyNotify({ ...params, sign: "deadbeef", sign_type: "MD5" }),
    ).toBe(false);
    expect(verifyNotify(params as any)).toBe(false);
  });

  it("verifyNotify excludes empty values and the sign field itself", async () => {
    const { verifyNotify } = await import("./zpay");
    const params: Record<string, string> = {
      pid: "test_pid",
      out_trade_no: "x",
      trade_no: "y",
      trade_status: "TRADE_SUCCESS",
      money: "1.00",
      type: "alipay",
      name: "n",
      extra: "",
    };
    const goodSign = expectedSign(params, "test_key_4242");
    expect(verifyNotify({ ...params, sign: goodSign, sign_type: "MD5" })).toBe(
      true,
    );
  });
});

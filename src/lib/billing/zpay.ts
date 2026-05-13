import "server-only";
import { createHash } from "node:crypto";

type ZpayPayType = "alipay" | "wxpay";

interface ZpaySubmitParams {
  outTradeNo: string;
  amountYuan: string; // "19.00"
  name: string;
  payType: ZpayPayType;
}

function md5(input: string): string {
  return createHash("md5").update(input, "utf8").digest("hex");
}

/**
 * Zpay's signature: sort all non-empty params alphabetically (excluding `sign`
 * and `sign_type`), join as `k=v&k=v`, append the merchant key directly (NOT
 * `&key=...`), then MD5 the resulting string (lowercase hex).
 *
 * Values inside the sign string are NOT URL-encoded — only the final submit
 * URL needs encoding.
 */
function buildSign(params: Record<string, string>, key: string): string {
  const ordered = Object.keys(params)
    .filter((k) => k !== "sign" && k !== "sign_type" && params[k] !== "")
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&");
  return md5(ordered + key);
}

export function buildSubmitUrl(p: ZpaySubmitParams): string {
  const pid = required("ZPAY_PID");
  const key = required("ZPAY_KEY");
  const apiBase = process.env.ZPAY_API_BASE ?? "https://z-pay.cn";
  const notifyUrl = required("ZPAY_NOTIFY_URL");
  const returnUrl = required("ZPAY_RETURN_URL");

  const params: Record<string, string> = {
    pid,
    type: p.payType,
    out_trade_no: p.outTradeNo,
    notify_url: notifyUrl,
    return_url: returnUrl,
    name: p.name,
    money: p.amountYuan,
  };
  const sign = buildSign(params, key);

  const query = new URLSearchParams({
    ...params,
    sign,
    sign_type: "MD5",
  }).toString();

  return `${apiBase}/submit.php?${query}`;
}

/**
 * Verify a notify callback. Returns true iff the recomputed signature matches.
 * Caller is also responsible for checking `trade_status === "TRADE_SUCCESS"`.
 */
export function verifyNotify(form: Record<string, string>): boolean {
  const key = process.env.ZPAY_KEY;
  if (!key) return false;
  const provided = form.sign;
  if (!provided) return false;
  const recomputed = buildSign(form, key);
  return recomputed === provided;
}

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Zpay env ${name} is not configured. Set it in .env.local or Sealos env.`,
    );
  }
  return value;
}

export function isZpayConfigured(): boolean {
  return Boolean(
    process.env.ZPAY_PID &&
      process.env.ZPAY_KEY &&
      process.env.ZPAY_NOTIFY_URL &&
      process.env.ZPAY_RETURN_URL,
  );
}

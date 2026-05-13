import logger from "logger";

export async function sendSms(
  phoneNumber: string,
  code: string,
): Promise<void> {
  const provider = process.env.SMS_PROVIDER ?? "console";

  if (provider === "console") {
    logger.info(
      `[SMS:console] OTP for ${phoneNumber}: ${code} (set SMS_PROVIDER=aliyun in prod)`,
    );
    return;
  }

  if (provider === "aliyun") {
    throw new Error(
      "Aliyun SMS not yet integrated — pending signature + template approval. Set SMS_PROVIDER=console for dev.",
    );
  }

  throw new Error(`Unknown SMS_PROVIDER: ${provider}`);
}

"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader } from "lucide-react";
import { authClient } from "auth/client";
import { toast } from "sonner";
import { useTranslations } from "next-intl";

const PHONE_RE = /^1[3-9]\d{9}$/;
const RESEND_SECONDS = 60;

export function PhoneSignIn() {
  const t = useTranslations("Auth.SignIn");

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const sendOtp = async () => {
    if (!PHONE_RE.test(phone)) {
      toast.error(t("phoneInvalid"));
      return;
    }
    setSending(true);
    const { error } = await authClient.phoneNumber.sendOtp({
      phoneNumber: phone,
    });
    setSending(false);
    if (error) {
      toast.error(error.message || t("sendCodeFailed"));
      return;
    }
    setOtpSent(true);
    setCooldown(RESEND_SECONDS);
    toast.success(t("codeSent"));
  };

  const signIn = async () => {
    if (code.length !== 6) {
      toast.error(t("otpInvalid"));
      return;
    }
    setVerifying(true);
    const { error } = await authClient.phoneNumber.verify({
      phoneNumber: phone,
      code,
    });
    setVerifying(false);
    if (error) {
      toast.error(error.message || t("signInFailed"));
      return;
    }
    window.location.href = "/";
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-2">
        <Label htmlFor="phone">{t("phone")}</Label>
        <Input
          id="phone"
          autoFocus
          inputMode="numeric"
          maxLength={11}
          disabled={sending || verifying}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
          placeholder={t("phonePlaceholder")}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="otp">{t("otp")}</Label>
        <div className="flex gap-2">
          <Input
            id="otp"
            inputMode="numeric"
            maxLength={6}
            disabled={!otpSent || verifying}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            onKeyDown={(e) => e.key === "Enter" && signIn()}
            placeholder={t("otpPlaceholder")}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={sendOtp}
            disabled={sending || cooldown > 0 || !PHONE_RE.test(phone)}
            className="w-32 shrink-0"
          >
            {sending ? (
              <Loader className="size-4 animate-spin" />
            ) : cooldown > 0 ? (
              t("codeResendIn", { seconds: cooldown })
            ) : (
              t("sendCode")
            )}
          </Button>
        </div>
      </div>
      <Button
        onClick={signIn}
        disabled={verifying || !otpSent}
        className="w-full"
      >
        {verifying ? (
          <Loader className="size-4 animate-spin ml-1" />
        ) : (
          t("signInWithPhone")
        )}
      </Button>
    </div>
  );
}

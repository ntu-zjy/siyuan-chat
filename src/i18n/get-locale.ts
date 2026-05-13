"use server";
import { cookies } from "next/headers";
import { COOKIE_KEY_LOCALE, SUPPORTED_LOCALES } from "lib/const";

function validateLocale(locale?: string): boolean {
  return SUPPORTED_LOCALES.some((v) => v.code === locale);
}

async function getLocaleFromCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(COOKIE_KEY_LOCALE)?.value;

  return validateLocale(locale) ? locale : undefined;
}

export async function getLocaleAction() {
  const locale = await getLocaleFromCookie();
  return locale || SUPPORTED_LOCALES[0].code;
}

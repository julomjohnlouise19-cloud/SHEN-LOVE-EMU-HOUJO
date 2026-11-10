import { client } from "./cloud-client";
import { LocalStorageAdapter } from "./adapter";
import { AccountError, accountError } from "../core/account-errors";
import { hashSeed } from "../core/random";

const adapter = new LocalStorageAdapter();
const key = (email: string) =>
  `csl:email-wait:${hashSeed(email.trim().toLowerCase())}`;
export async function emailWait(email: string) {
  const until = await adapter.get<number>(key(email));
  return Math.max(0, Math.ceil(((Number(until) || 0) - Date.now()) / 1000));
}
export async function recordEmailWait(email: string, seconds: number) {
  const name = key(email);
  await adapter.transaction([name], (tx) =>
    tx.set(
      name,
      Math.max(tx.get<number>(name) || 0, Date.now() + seconds * 1000),
    ),
  );
}
export async function checkEmailWait(email: string) {
  const wait = await emailWait(email);
  if (wait)
    throw new AccountError(
      `Please wait ${wait >= 60 ? `${Math.ceil(wait / 60)} minute${wait > 60 ? "s" : ""}` : `${wait} seconds`} before requesting another account email. Existing accounts can still sign in.`,
      "rate",
      wait,
    );
}
export async function resendConfirmation(email: string) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
    throw new Error("Enter your email address first.");
  await checkEmailWait(email);
  const { error } = await client!.auth.resend({
    type: "signup",
    email: email.trim(),
    options: {
      emailRedirectTo: `${location.origin}${import.meta.env.BASE_URL}`,
    },
  });
  if (error) {
    const mapped = accountError(error);
    await recordEmailWait(email, mapped.waitSeconds || 60);
    throw mapped;
  }
  await recordEmailWait(email, 60);
}
export async function requestPasswordReset(email: string) {
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address))
    throw new Error("Enter your account email first.");
  if (!client) throw new Error("Account services are unavailable.");
  await checkEmailWait(address);
  const { error } = await client.auth.resetPasswordForEmail(address, {
    redirectTo: `${location.origin}${import.meta.env.BASE_URL}?flow=recovery`,
  });
  await recordEmailWait(
    address,
    error ? accountError(error).waitSeconds || 60 : 60,
  );
  if (error) throw accountError(error);
}

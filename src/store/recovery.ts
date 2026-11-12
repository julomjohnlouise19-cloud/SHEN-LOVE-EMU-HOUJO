import { client } from "./cloud-client";
import { accountError } from "../core/account-errors";

const KEY = "csl:password-recovery";
const WINDOW = 30 * 60 * 1000;
interface RecoveryTicket {
  userId: string;
  expiresAt: number;
}
let ticket: RecoveryTicket | undefined;
let verifiedUser: string | undefined;
let lastToken: string | undefined;
let generation = 0;
let checking: Promise<boolean> | undefined;

function readTicket(): RecoveryTicket | undefined {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (
      value &&
      typeof value.userId === "string" &&
      Number.isFinite(value.expiresAt) &&
      value.expiresAt > Date.now() &&
      value.expiresAt <= Date.now() + WINDOW
    )
      return { userId: value.userId, expiresAt: value.expiresAt };
  } catch {
    /* A fresh verified link still works when browser storage is unavailable. */
  }
}
function persistTicket() {
  try {
    if (ticket) sessionStorage.setItem(KEY, JSON.stringify(ticket));
    else sessionStorage.removeItem(KEY);
  } catch {
    /* The current tab can finish recovery without a persisted marker. */
  }
}
export function dismissPasswordRecovery() {
  generation++;
  ticket = undefined;
  verifiedUser = undefined;
  lastToken = undefined;
  persistTicket();
}
export const passwordRecoveryActive = () =>
  Boolean(
    ticket && ticket.expiresAt > Date.now() && verifiedUser === ticket.userId,
  );

// Only the Auth SDK's verified recovery event creates a ticket. A URL flag never does.
client?.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY" && session) {
    if (
      lastToken === session.access_token &&
      ticket?.userId === session.user.id
    )
      return;
    generation++;
    verifiedUser = undefined;
    lastToken = session.access_token;
    ticket = {
      userId: session.user.id,
      expiresAt: Math.min(
        Date.now() + WINDOW,
        (session.expires_at ?? Math.floor(Date.now() / 1000) + 3600) * 1000,
      ),
    };
    persistTicket();
    // Auth callbacks must stay synchronous; verify after the SDK releases its lock.
    setTimeout(() => {
      void restorePasswordRecovery().catch(() => undefined);
    }, 0);
  } else if (
    event === "SIGNED_OUT" ||
    (ticket && session && ticket.userId !== session.user.id)
  ) {
    dismissPasswordRecovery();
  }
});

export async function restorePasswordRecovery(): Promise<boolean> {
  if (!client) return false;
  if (passwordRecoveryActive()) return true;
  if (checking) return checking;
  checking = (async () => {
    const candidate = ticket ?? readTicket();
    if (!candidate) return false;
    ticket = candidate;
    const revision = generation;
    const { data, error } = await client.auth.getUser();
    if (revision !== generation) return false;
    if (
      error ||
      data.user?.id !== candidate.userId ||
      candidate.expiresAt <= Date.now()
    )
      return false;
    const latest = await client.auth.getSession();
    if (
      revision !== generation ||
      latest.data.session?.user.id !== candidate.userId
    )
      return false;
    verifiedUser = candidate.userId;
    sessionStorage.removeItem("csl:cloud-logged-out");
    persistTicket();
    window.dispatchEvent(new Event("csl:password-recovery"));
    return true;
  })().finally(() => {
    checking = undefined;
  });
  return checking;
}
export async function finishPasswordRecovery(password: string) {
  if (!client || !passwordRecoveryActive())
    throw new Error("Open a fresh password reset link from your email.");
  if (password.length < 8 || password.length > 128)
    throw new Error("Use a new password with 8–128 characters.");
  const userId = verifiedUser;
  const { data, error: verificationError } = await client.auth.getUser();
  if (
    verificationError ||
    data.user?.id !== userId ||
    !passwordRecoveryActive()
  )
    throw new Error(
      "Your reset session has expired or changed. Request one new reset link.",
    );
  const { error } = await client.auth.updateUser({ password });
  if (error) throw accountError(error);
  dismissPasswordRecovery();
}

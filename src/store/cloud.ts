import { client, cloudEnabled, AUTH_KEY } from "./cloud-client";
export { cloudEnabled } from "./cloud-client";
import {
  acknowledge,
  enqueue,
  jobForRun,
  readOutbox,
  type CloudOutbox,
} from "../core/cloud-records";
import type { Run } from "../core/types";
import { LocalStorageAdapter, type Tx } from "./adapter";
import { accountError } from "../core/account-errors";
import { checkEmailWait, recordEmailWait } from "./email";
export const OUTBOX_KEY = "csl:cloud-outbox";
const adapter = cloudEnabled ? new LocalStorageAdapter() : undefined;
let identity: string | undefined;
let recoveryUser: string | undefined;
client?.auth.onAuthStateChange((event, session) => {
  if (event === "PASSWORD_RECOVERY") {
    recoveryUser = session?.user.id;
    window.dispatchEvent(new Event("csl:password-recovery"));
  } else if (event === "SIGNED_OUT") recoveryUser = undefined;
});
export const passwordRecoveryActive = () =>
  !!identity && recoveryUser === identity;
export const dismissPasswordRecovery = () => {
  recoveryUser = undefined;
};
export async function finishPasswordRecovery(password: string) {
  if (!passwordRecoveryActive())
    throw new Error("Open a fresh password reset link from your email.");
  if (password.length < 8 || password.length > 128)
    throw new Error("Use a new password with 8–128 characters.");
  const { error } = await client!.auth.updateUser({ password });
  if (error) throw accountError(error);
  recoveryUser = undefined;
}
let backendReady = false;
let checking: Promise<void> | undefined;
let platform = 0;
export const platformVersion = () => platform;
let syncing = false;
let pending = 0;
let statusMessage = "";
let syncTimer: ReturnType<typeof setTimeout> | undefined;
export const cloudUserId = () => identity;
export const cloudStatus = () => ({ pending, syncing, message: statusMessage });
function status(message = statusMessage) {
  statusMessage = message;
  window.dispatchEvent(new Event("csl:cloud-status"));
}
export interface CloudProfile {
  user_id: string;
  display_name: string;
  grade: number;
  section: string;
  is_teacher: boolean;
  email: string;
  photo_path?: string | null;
  credits?: number;
}
export interface CloudRecord {
  id: string;
  user_id: string;
  display_name: string;
  grade: number;
  section: string;
  deck_id: string;
  level: string;
  mode: string;
  correct: number;
  total: number;
  received_at: string;
  responses: {
    question_id: string;
    prompt: string;
    value: unknown;
    correct: boolean;
    misconception?: string;
  }[];
}
function ready(): Promise<void> {
  if (backendReady) return Promise.resolve();
  checking ??= checkBackend().finally(() => {
    checking = undefined;
  });
  return checking;
}
async function checkBackend() {
  if (!client)
    throw new Error("Online accounts are not enabled on this website yet.");
  if (backendReady) return;
  const { data, error } = await client.rpc("csl_backend_status");
  if (error || data?.version !== 1 || data?.questions !== 972)
    throw new Error(
      "Account services are temporarily unavailable. You can still explore as a guest. Please contact your teacher if this continues.",
    );
  platform = Number(data.platform) || 0;
  backendReady = true;
}
async function profile(
  verifiedUser?: { id: string; email?: string },
  bindIdentity = true,
): Promise<CloudProfile> {
  const user = verifiedUser ?? (await client!.auth.getUser()).data.user;
  if (!user)
    throw new Error("Please sign in again to connect your saved records.");
  const { data, error } = await client!.rpc("csl_my_profile");
  if (error) throw accountError(error);
  if (
    !data ||
    data.user_id !== user.id ||
    typeof data.display_name !== "string" ||
    ![7, 8, 9, 10].includes(data.grade) ||
    typeof data.section !== "string" ||
    typeof data.is_teacher !== "boolean"
  )
    throw new Error(
      "Your profile could not be verified. Please sign in again.",
    );
  const latest = await client!.auth.getSession();
  if (
    latest.data.session?.user.id !== user.id ||
    sessionStorage.getItem("csl:cloud-logged-out")
  )
    throw new Error("Your account changed. Please sign in again.");
  if (bindIdentity) identity = user.id;
  return { ...data, email: user.email ?? "" } as CloudProfile;
}
export async function initCloud(
  signedOut: () => void,
): Promise<CloudProfile | undefined> {
  if (!client) return;
  client.auth.onAuthStateChange((event, session) => {
    const previous = identity;
    const next = session?.user.id;
    // Keep this callback synchronous: Supabase holds its Auth lock while calling it.
    if (event === "SIGNED_OUT" || (previous && previous !== next)) {
      identity = undefined;
      pending = 0;
      status("");
      signedOut();
    }
  });
  adapter!.subscribe(OUTBOX_KEY, () => {
    void refreshPending();
  });
  window.addEventListener("online", () => {
    void flushCloud();
  });
  try {
    const { data, error } = await client.auth.getSession();
    if (error) throw error;
    if (!data.session || sessionStorage.getItem("csl:cloud-logged-out")) {
      void ready().catch((error) =>
        status(
          error instanceof Error
            ? error.message
            : "Account services are unavailable.",
        ),
      );
      return;
    }
    const [, result] = await Promise.all([ready(), profile(undefined, false)]);
    identity = result.user_id;
    return result;
  } catch (e) {
    identity = undefined;
    status(
      e instanceof Error
        ? e.message
        : "Cloud sign-in is unavailable. Try again online.",
    );
    return;
  }
}
export async function cloudLogin(email: string, password: string) {
  const address = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address) || !password)
    throw new Error("Enter your account email and password.");
  if (!client) throw new Error("Account services are unavailable.");
  const { data, error } = await client.auth.signInWithPassword({
    email: address,
    password,
  });
  if (error) throw accountError(error);
  if (!data.user)
    throw new Error(
      "Your account could not be verified. Please sign in again.",
    );
  sessionStorage.removeItem("csl:cloud-logged-out");
  const [, result] = await Promise.all([ready(), profile(data.user, false)]);
  identity = result.user_id;
  status("");
  return result;
}
export async function cloudRegister(input: {
  username: string;
  password: string;
  name: string;
  grade: number;
  section: string;
}) {
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.username.trim()) ||
    input.password.length < 8 ||
    input.password.length > 128 ||
    input.name.trim().length < 2 ||
    input.name.trim().length > 40 ||
    ![7, 8, 9, 10].includes(input.grade) ||
    input.section.length > 40
  )
    throw new Error(
      "Use your email, an 8–128 character password, a name of 2–40 characters, and a grade from 7 to 10.",
    );
  await ready();
  await checkEmailWait(input.username);
  const { data, error } = await client!.auth.signUp({
    email: input.username.trim(),
    password: input.password,
    options: {
      emailRedirectTo: `${location.origin}${import.meta.env.BASE_URL}`,
      data: {
        display_name: input.name.trim(),
        grade: input.grade,
        section: input.section.trim(),
      },
    },
  });
  if (error) {
    const mapped = accountError(error);
    await recordEmailWait(input.username, mapped.waitSeconds || 60);
    throw mapped;
  }
  await recordEmailWait(input.username, 60);
  if (!data.session) return undefined;
  sessionStorage.removeItem("csl:cloud-logged-out");
  return profile();
}
export async function cloudLogout() {
  identity = undefined;
  pending = 0;
  sessionStorage.setItem("csl:cloud-logged-out", "1");
  status("");
  try {
    await client!.auth.signOut({ scope: "local" });
  } finally {
    // An unavailable Auth endpoint must not leave a cached browser credential after logout.
    for (const key of Object.keys(localStorage))
      if (key.startsWith(AUTH_KEY)) localStorage.removeItem(key);
  }
}
export async function cloudChangePassword(
  currentPassword: string,
  password: string,
) {
  const { data } = await client!.auth.getUser();
  if (!data.user?.email) throw new Error("Please sign in again.");
  const { error: verificationError } = await client!.auth.signInWithPassword({
    email: data.user.email,
    password: currentPassword,
  });
  if (verificationError)
    throw new Error("Your current password does not match.");
  const { error } = await client!.auth.updateUser({ password });
  if (error) throw accountError(error);
}
export async function cloudUpdateProfile(
  userId: string,
  name: string,
  grade: number,
  section: string,
) {
  const { error } = await client!.rpc("csl_update_profile", {
    p_user_id: userId,
    p_name: name.trim(),
    p_grade: grade,
    p_section: section.trim(),
  });
  if (error) throw accountError(error);
}
function outbox(tx: Tx): CloudOutbox {
  return readOutbox(tx.get<unknown>(OUTBOX_KEY));
}
export function stageCloudRun(tx: Tx, run: Run) {
  tx.set(OUTBOX_KEY, enqueue(outbox(tx), jobForRun(run)));
}
async function refreshPending() {
  try {
    const box = readOutbox(await adapter!.get<unknown>(OUTBOX_KEY));
    pending = box.pending.filter((p) => p.userId === identity).length;
    status();
  } catch (e) {
    status(
      e instanceof Error ? e.message : "The cloud upload queue needs recovery.",
    );
  }
}
export async function recoverCloudRuns(runs: Run[]) {
  if (!identity || !adapter) return;
  try {
    await adapter.transaction([OUTBOX_KEY], (tx) => {
      for (const run of runs)
        if (run.userId === identity && run.completed) stageCloudRun(tx, run);
    });
    requestCloudSync();
  } catch (e) {
    status(
      e instanceof Error ? e.message : "The cloud upload queue needs recovery.",
    );
  }
}
export function requestCloudSync() {
  if (!cloudEnabled) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    void flushCloud();
  }, 0);
}
export async function flushCloud() {
  if (!client || !adapter || !identity || syncing) return;
  const owner = identity;
  syncing = true;
  status("");
  try {
    await refreshPending();
    if (pending && !navigator.onLine)
      throw new Error(
        "Quiz records are waiting on this device. Reconnect to upload them.",
      );
    while (owner === identity) {
      const box = readOutbox(await adapter.get<unknown>(OUTBOX_KEY));
      const job = box.pending.find((p) => p.userId === owner);
      if (!job) break;
      const { error } = await client.rpc("csl_record_quiz", {
        p_user_id: job.userId,
        p_client_run_id: job.runId,
        p_deck_id: job.deckId,
        p_level: job.level,
        p_mode: job.mode,
        p_started_at: job.startedAt,
        p_answers: job.answers,
      });
      if (error) throw new Error(`Quiz upload is waiting: ${error.message}`);
      await adapter.transaction([OUTBOX_KEY], (tx) =>
        tx.set(OUTBOX_KEY, acknowledge(outbox(tx), job)),
      );
      window.dispatchEvent(new Event("csl:quiz-saved"));
    }
    if (owner === identity) status("");
  } catch (e) {
    if (owner === identity)
      status(
        e instanceof Error
          ? e.message
          : "Quiz upload is waiting. Try again online.",
      );
  } finally {
    syncing = false;
    await refreshPending();
    if (owner !== identity && identity) requestCloudSync();
  }
}
export async function cloudRecords(
  offset: number,
): Promise<{ rows: CloudRecord[]; teacher: boolean }> {
  const me = await profile();
  const { data, error } = await client!.rpc("csl_list_records", {
    p_limit: 100,
    p_offset: offset,
  });
  if (error) throw accountError(error);
  return { rows: (data ?? []) as CloudRecord[], teacher: me.is_teacher };
}

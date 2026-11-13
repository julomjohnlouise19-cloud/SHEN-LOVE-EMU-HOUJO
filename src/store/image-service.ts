import { currentUser } from ".";
import { client, projectOrigin, publicApiKey } from "./cloud-client";
import { cloudUserId, type CloudProfile } from "./cloud";
import { hasPlatform } from "./platform";
import { accountError } from "../core/account-errors";

export class ImageRequestError extends Error {
  constructor(
    message: string,
    public rejected: boolean,
  ) {
    super(message);
  }
}
export async function imageAccount(id: string) {
  if (!hasPlatform())
    throw new Error(
      "Image saving needs the classroom connection. Please try again when it is ready.",
    );
  if (currentUser()?.id !== id || cloudUserId() !== id)
    throw new Error("Sign in to update your own image.");
  const { data } = await client!.auth.getSession(),
    session = data.session;
  if (!session || session.user.id !== id)
    throw new Error("Please sign in again before saving your image.");
  const verified = await client!.auth.getUser(session.access_token);
  if (verified.error || verified.data.user?.id !== id)
    throw new Error(
      "Your account could not be verified. Sign in again before saving.",
    );
  const request = async (path: string, init: RequestInit = {}) => {
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(`${projectOrigin}${path}`, {
        ...init,
        headers: {
          ...init.headers,
          apikey: publicApiKey,
          Authorization: `Bearer ${session.access_token}`,
        },
        signal: controller.signal,
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new ImageRequestError(
          accountError({ ...body, status: response.status }).message,
          true,
        );
      return body;
    } catch (error) {
      if (error instanceof ImageRequestError) throw error;
      throw new ImageRequestError(
        controller.signal.aborted
          ? "The image service took too long. Reopen your profile to check the image, then try again."
          : "The image connection was interrupted. Reopen your profile to check the image, then try again.",
        false,
      );
    } finally {
      clearTimeout(timer);
    }
  };
  const profile = (await request("/rest/v1/rpc/csl_my_profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })) as CloudProfile;
  if (
    profile.user_id !== id ||
    currentUser()?.id !== id ||
    cloudUserId() !== id
  )
    throw new Error("Your account changed. Open your profile again.");
  const remove = (path: string) =>
    request("/storage/v1/object/csl-avatars", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prefixes: [path] }),
    });
  return { request, remove, profile, user: verified.data.user };
}

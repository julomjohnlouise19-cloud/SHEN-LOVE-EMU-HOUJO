export class AccountError extends Error {
  constructor(
    message: string,
    public kind:
      | "rate"
      | "delivery"
      | "confirm"
      | "credentials"
      | "configuration"
      | "other" = "other",
    public waitSeconds = 0,
  ) {
    super(message);
    this.name = "AccountError";
  }
}
export function accountError(value: unknown): AccountError {
  if (value instanceof AccountError) return value;
  const error = value as {
    code?: string;
    message?: string;
    status?: number;
  } | null;
  const code = error?.code ?? "",
    message = error?.message ?? "";
  if (/captcha/.test(code) || /captcha.*(fail|missing|invalid)/i.test(message))
    return new AccountError(
      "Sign-in verification needs an update. Ask your teacher to check the website’s sign-in protection settings.",
      "configuration",
    );
  if (code === "user_banned")
    return new AccountError(
      "This account is paused. Ask your teacher to review your access.",
      "configuration",
    );
  if (
    code === "over_email_send_rate_limit" ||
    /email.*rate.*(limit|exceed)/i.test(message)
  )
    return new AccountError(
      "The account email service has reached its sending limit. Existing accounts can still sign in. Please try again later or ask your teacher for help.",
      "rate",
      60,
    );
  if (code === "over_request_rate_limit" || error?.status === 429)
    return new AccountError(
      "Too many requests. Take a moment before trying again.",
      "rate",
      60,
    );
  if (
    /error sending (?:confirmation|recovery|reset|magic link|invite)?\s*email|failed to send (?:confirmation|recovery|reset)?\s*email/i.test(
      message,
    )
  )
    return new AccountError(
      "The account email could not be sent. Your teacher needs to check the email sender settings. If you already confirmed your account, you can still sign in. Wait before requesting one new link.",
      "delivery",
      60,
    );
  if (
    code === "email_address_not_authorized" ||
    /email address.*not authorized|only send.*team/i.test(message)
  )
    return new AccountError(
      "Email delivery is not ready for this address. Ask your teacher to create and confirm your account while the email service is configured.",
      "configuration",
    );
  if (code === "email_not_confirmed" || /email not confirmed/i.test(message))
    return new AccountError(
      "Confirm your email before signing in. Check your inbox and spam folder, or request one new confirmation link.",
      "confirm",
    );
  if (
    code === "invalid_credentials" ||
    /invalid login credentials/i.test(message)
  )
    return new AccountError(
      "That email or password does not match. Please check your details and try again.",
      "credentials",
    );
  if (
    code.startsWith("PGRST") ||
    /failed to fetch|networkerror|fetch failed/i.test(message)
  )
    return new AccountError(
      "We could not reach your saved data. Check your connection and try again.",
    );
  return new AccountError(
    (message || "Please try again in a moment.")
      .replace(/supabase/gi, "the account service")
      .slice(0, 500),
  );
}

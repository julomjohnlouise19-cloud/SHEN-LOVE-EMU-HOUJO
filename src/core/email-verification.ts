export function registrationEmail(value: string): string | undefined {
  const address = value.trim().toLowerCase();
  const local = address.split("@")[0] ?? "";
  const primary = local.split("+")[0].replace(/\./g, "");
  if (
    address.length > 254 ||
    local.length > 64 ||
    primary.length > 30 ||
    !/^[a-z0-9]+(?:\.[a-z0-9]+)*(?:\+[a-z0-9._-]+)?@gmail\.com$/.test(address)
  )
    return undefined;
  return address;
}

export function hasVerifiedInbox(user: {
  email?: string;
  email_confirmed_at?: string;
}): boolean {
  return (
    typeof user.email === "string" &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user.email) &&
    typeof user.email_confirmed_at === "string" &&
    Number.isFinite(Date.parse(user.email_confirmed_at))
  );
}

export function emailCode(value: string): string | undefined {
  const code = value.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(code) ? code : undefined;
}

// Gmail dot/plus variants share one inbox and must share the email cooldown.
export function emailMailbox(value: string): string {
  const address = value.trim().toLowerCase();
  if (!registrationEmail(address)) return address;
  return `${address.split("@")[0].split("+")[0].replace(/\./g, "")}@gmail.com`;
}

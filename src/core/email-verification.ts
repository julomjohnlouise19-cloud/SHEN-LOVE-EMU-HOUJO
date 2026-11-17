export function registrationEmail(value: string): string | undefined {
  const address = value.trim().toLowerCase();
  const local = address.split("@")[0] ?? "";
  if (
    address.length > 254 ||
    local.length > 64 ||
    !/^[a-z0-9]+(?:\.[a-z0-9]+)*(?:\+[a-z0-9._-]+)?@gmail\.com$/.test(address)
  )
    return undefined;
  return address;
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

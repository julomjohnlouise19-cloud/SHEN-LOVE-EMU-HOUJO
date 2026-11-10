export interface CloudConfig {
  enabled: boolean;
  url: string;
  publishableKey: string;
}
export function readCloudConfig(
  values: Record<string, string | undefined>,
): CloudConfig {
  if (
    Object.entries(values).some(
      ([name, value]) =>
        name.startsWith("VITE_") &&
        value &&
        (/SECRET|SERVICE_ROLE/i.test(name) || value.startsWith("sb_secret_")),
    )
  )
    throw new Error(
      "Private credentials must never be supplied to Vite browser variables.",
    );
  const mode = values.VITE_BACKEND_MODE || "local";
  if (!["local", "supabase"].includes(mode))
    throw new Error("VITE_BACKEND_MODE must be local or supabase.");
  const url = (values.VITE_SUPABASE_URL || "").trim().replace(/\/$/, "");
  const publishableKey = (values.VITE_SUPABASE_PUBLISHABLE_KEY || "").trim();
  if (
    publishableKey &&
    !/^sb_publishable_[A-Za-z0-9_-]{20,200}$/.test(publishableKey)
  )
    throw new Error(
      "Only a Supabase publishable key may be used in VITE_SUPABASE_PUBLISHABLE_KEY. Private keys must never enter a browser build.",
    );
  if (mode === "local") return { enabled: false, url: "", publishableKey: "" };
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("Set a valid VITE_SUPABASE_URL before enabling Supabase.");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    !parsed.hostname.endsWith(".supabase.co")
  )
    throw new Error(
      "VITE_SUPABASE_URL must be the HTTPS origin of your Supabase project.",
    );
  if (!publishableKey)
    throw new Error(
      "Set the public VITE_SUPABASE_PUBLISHABLE_KEY before enabling Supabase.",
    );
  return { enabled: true, url, publishableKey };
}

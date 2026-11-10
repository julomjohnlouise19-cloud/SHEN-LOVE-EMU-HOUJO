import { createClient } from "@supabase/supabase-js";
import { readCloudConfig } from "../src/core/cloud-config";

try {
  const config = readCloudConfig(process.env);
  if (!config.enabled && process.argv.includes("--require-cloud"))
    throw new Error(
      "Set the GitHub repository variable VITE_BACKEND_MODE to supabase. Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY under Settings → Secrets and variables → Actions → Variables.",
    );
  if (!config.enabled) {
    console.log("Local demo build selected. No cloud connection is required.");
  } else {
    const client = createClient(config.url, config.publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: {
        fetch: (url, init) =>
          fetch(url, { ...init, signal: AbortSignal.timeout(20000) }),
      },
    });
    const { data, error } = await client.rpc("csl_backend_status");
    if (error) {
      const code = /^[A-Za-z0-9_-]{1,32}$/.test(error.code ?? "")
        ? error.code
        : "request failed";
      const reason = /invalid api key/i.test(error.message)
        ? "Supabase rejected the publishable key. Copy the current publishable key into VITE_SUPABASE_PUBLISHABLE_KEY."
        : code === "PGRST202" || code === "42883"
          ? "The database setup function is missing. Run the complete supabase/setup.sql in this project's SQL Editor."
          : "Check the public project URL/key, project availability, and that supabase/setup.sql succeeded.";
      throw new Error(`Cloud deployment blocked (${code}). ${reason}`);
    }
    if (data?.version !== 1 || data?.questions !== 972)
      throw new Error(
        "Cloud deployment blocked: run the complete supabase/setup.sql in this project's SQL Editor. The installed backend must report version 1 and 972 questions.",
      );
    console.log(
      "Cloud backend is reachable: schema version 1 and all 972 questions. No private key was used.",
    );
  }
} catch (error) {
  const message =
    error instanceof Error
      ? error.message
      : "Cloud configuration could not be verified.";
  if (process.env.GITHUB_ACTIONS === "true") {
    const escaped = message
      .replaceAll("%", "%25")
      .replaceAll("\r", "%0D")
      .replaceAll("\n", "%0A");
    console.error(`::error title=Supabase setup::${escaped}`);
  } else console.error(message);
  process.exitCode = 1;
}

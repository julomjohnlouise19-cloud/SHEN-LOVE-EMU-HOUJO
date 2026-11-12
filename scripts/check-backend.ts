import { createClient } from "@supabase/supabase-js";
import { readCloudConfig } from "../src/core/cloud-config";

try {
  const config = readCloudConfig(process.env);
  if (!config.enabled && process.argv.includes("--require-cloud"))
    throw new Error(
      "Select the cloud build and add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY under Settings → Secrets and variables → Actions → Variables.",
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
    const installedPlatform = data?.platform;
    if (!Number.isInteger(installedPlatform) || installedPlatform < 2)
      throw new Error(
        "Deployment needs the classroom backend. Run the complete supabase/upgrade.sql in SQL Editor and check that csl_backend_status() reports platform 2 or newer. See docs/STUDIO_UPGRADE.md.",
      );
    console.log(
      `Cloud backend is reachable: schema version 1, classroom platform ${installedPlatform} and all 972 questions. No private key was used.`,
    );
    if (process.env.GITHUB_ACTIONS === "true")
      console.log(
        `::notice title=Verified classroom backend::Schema 1, platform ${installedPlatform}, 972 questions. ${installedPlatform >= 3 ? "Advanced Teacher Studio is enabled." : "Login/design are ready. Run supabase/studio-upgrade.sql to enable advanced archive, record-health and teaching-role tools."}`,
      );
    const inbox = await client.rpc("csl_suggestions_status");
    if (process.env.GITHUB_ACTIONS === "true")
      console.log(
        `::notice title=Scientist profile details::${Number(data.accounts) >= 1 ? "Enhanced teacher profile details are installed." : "Name, class, photos, bans and pickup messages work with the current backend. Run supabase/accounts-upgrade.sql to enable teacher email, biography and signup-agreement details."}`,
      );
    const inboxReady = !inbox.error && inbox.data?.version === 1;
    const inboxNotice = inboxReady
      ? "Classroom suggestion inbox version 1 is installed."
      : "Suggestion inbox not installed yet. Run supabase/suggestions-upgrade.sql to activate classroom delivery. Other features remain available.";
    console.log(inboxNotice);
    if (process.env.GITHUB_ACTIONS === "true")
      console.log(`::notice title=Suggestion inbox activation::${inboxNotice}`);
    if (installedPlatform < 3)
      console.log(
        "The login and design update is compatible with this installed backend. Advanced archive, record-health and teaching-role tools activate after the owner runs supabase/studio-upgrade.sql. See docs/STUDIO_UPGRADE.md.",
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

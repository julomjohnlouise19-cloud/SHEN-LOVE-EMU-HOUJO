import { createClient } from "@supabase/supabase-js";
import { readCloudConfig } from "../src/core/cloud-config";

const config = readCloudConfig(process.env);
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
  if (error || data?.version !== 1 || data?.questions !== 972)
    throw new Error(
      "Cloud deployment blocked: run supabase/setup.sql in this project's SQL Editor, then check the public URL/key. The installed backend must report version 1 and 972 questions.",
    );
  console.log(
    "Cloud backend is reachable: schema version 1 and all 972 questions. No private key was used.",
  );
}

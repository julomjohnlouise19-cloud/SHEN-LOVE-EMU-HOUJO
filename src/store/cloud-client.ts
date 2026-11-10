import { createClient } from "@supabase/supabase-js";
import { readCloudConfig } from "../core/cloud-config";
const config = readCloudConfig({
  VITE_BACKEND_MODE: import.meta.env.VITE_BACKEND_MODE,
  VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
});
export const cloudEnabled = config.enabled;
export const AUTH_KEY = "csl:cloud-auth";
export const client = cloudEnabled
  ? createClient(config.url, config.publishableKey, {
      auth: {
        storageKey: AUTH_KEY,
        persistSession: true,
        autoRefreshToken: true,
        flowType: "pkce",
        detectSessionInUrl: true,
      },
      global: {
        fetch: (url, init) =>
          fetch(url, {
            ...init,
            signal: init?.signal
              ? AbortSignal.any([init.signal, AbortSignal.timeout(15000)])
              : AbortSignal.timeout(15000),
          }),
      },
    })
  : undefined;
export const projectOrigin = config.url;

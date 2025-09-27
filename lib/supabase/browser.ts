import type { SupabaseClient } from "@supabase/supabase-js";

import { isBrowserSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

type Database = Record<string, unknown>;

let client: SupabaseClient<Database> | null = null;
let clientPromise: Promise<SupabaseClient<Database> | null> | null = null;

export async function loadSupabaseBrowserClient() {
  if (!isBrowserSupabaseConfigured()) {
    return null;
  }

  if (client) {
    return client;
  }

  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js")
      .then(({ createClient }) => {
        const nextClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
          auth: {
            detectSessionInUrl: true,
            persistSession: true,
            autoRefreshToken: true,
          },
        });
        client = nextClient;
        return nextClient;
      })
      .catch((error) => {
        clientPromise = null;
        throw error;
      });
  }

  return clientPromise;
}

export type SupabaseBrowserClient = SupabaseClient<Database>;

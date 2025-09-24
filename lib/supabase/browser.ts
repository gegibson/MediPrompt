import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isBrowserSupabaseConfigured, supabaseAnonKey, supabaseUrl } from "./config";

type Database = Record<string, unknown>;

let client: SupabaseClient<Database> | null = null;

export function getSupabaseBrowserClient() {
  if (!isBrowserSupabaseConfigured()) {
    return null;
  }

  if (!client) {
    client = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      auth: {
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return client;
}

export type SupabaseBrowserClient = SupabaseClient<Database>;

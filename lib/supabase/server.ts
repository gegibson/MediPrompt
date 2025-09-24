import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "./config";

type Database = Record<string, unknown>;

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function hasServiceRoleConfiguration() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export function createSupabaseServerClient(): SupabaseClient<Database> | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = cookies();
  const accessToken = cookieStore.get("sb-access-token")?.value;

  return createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

export function createSupabaseServiceRoleClient(): SupabaseClient<Database> | null {
  if (!hasServiceRoleConfiguration()) {
    return null;
  }

  return createClient<Database>(supabaseUrl!, supabaseServiceRoleKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

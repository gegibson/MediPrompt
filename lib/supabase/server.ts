import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import {
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from "./config";

// Minimal typed Supabase schema for safer queries
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          is_subscriber: boolean | null;
          subscribed_at: string | null;
        };
        Insert: {
          id: string;
          email: string;
          is_subscriber: boolean;
          subscribed_at: string | null;
        };
        Update: {
          email?: string | null;
          is_subscriber?: boolean | null;
          subscribed_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export function isSupabaseConfigured() {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function hasServiceRoleConfiguration() {
  return Boolean(supabaseUrl && supabaseServiceRoleKey);
}

export async function createSupabaseServerClient(): Promise<
  SupabaseClient<Database> | null
> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const cookieStore = await cookies();
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

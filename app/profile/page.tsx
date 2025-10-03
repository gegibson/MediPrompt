import type { Metadata } from "next";
import { redirect } from "next/navigation";

import UserProfilePage from "./UserProfilePage";
import {
  createSupabaseServerClient,
  isSupabaseConfigured,
  type Database,
} from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "My Profile — Mediprompt",
  description: "View and manage your Mediprompt profile.",
};

export default async function ProfileRoute() {
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  const supabase = await createSupabaseServerClient();

  if (!supabase) {
    redirect("/");
  }

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/");
  }

  type ProfileRow = Pick<
    Database["public"]["Tables"]["users"]["Row"],
    "id" | "email" | "is_subscriber" | "subscribed_at"
  >;

  const { data: profileRecord } = await supabase
    .from("users")
    .select("id, email, is_subscriber, subscribed_at")
    .eq("id", user.id)
    .maybeSingle<ProfileRow>();

  return (
    <UserProfilePage
      user={user}
      profile={profileRecord ?? null}
      subscription={null}
    />
  );
}

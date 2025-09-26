"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { useAuthContext } from "@/components/auth/AuthProvider";

export default function ResetPasswordPage() {
  const { supabase, loading: authLoading, user } = useAuthContext();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string>("");
  const [sessionReady, setSessionReady] = useState<boolean>(false);

  const supabaseConfigured = useMemo(() => Boolean(supabase), [supabase]);

  useEffect(() => {
    if (!supabase) {
      return;
    }

    let cancelled = false;

    async function captureRecoverySession() {
      const client = supabase;
      if (!client) {
        return;
      }
      const hashFragment = window.location.hash;

      if (hashFragment) {
        const params = new URLSearchParams(hashFragment.replace(/^#/, ""));
        const accessToken = params.get("access_token");
        const refreshToken = params.get("refresh_token");
        const type = params.get("type");

        if (accessToken && refreshToken && type === "recovery") {
          const { error } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Unable to establish recovery session", error);
            if (!cancelled) {
              setMessage(error.message);
              setStatus("error");
            }
            return;
          }

          // Clear the fragment so refreshes don’t repeat the exchange.
          window.location.hash = "";
        }
      }

      if (!cancelled) {
        setSessionReady(true);
      }
    }

    void captureRecoverySession();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    if (sessionReady && user && status !== "success") {
      setMessage(
        `Hi ${user.email ?? "there"}, choose a new password below to finish resetting your account.`,
      );
    }
  }, [sessionReady, status, user]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!supabase) {
      setStatus("error");
      setMessage("Supabase is not configured.");
      return;
    }

    if (password.trim() !== confirmPassword.trim()) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("loading");
    setMessage("");

    try {
      const { error } = await supabase.auth.updateUser({
        password: password.trim(),
      });

      if (error) {
        throw error;
      }

      setStatus("success");
      setMessage("Password updated — redirecting to the Wizard.");
      window.setTimeout(() => router.push("/wizard"), 1500);
    } catch (error) {
      console.error("Password reset failed", error);
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Unable to update password.",
      );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 text-slate-900">
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-6 py-16 md:px-10">
        <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Reset password
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Securely update your Mediprompt password.
        </h1>
        <p className="text-base text-slate-700">
          Use the recovery link we sent to confirm your account and choose a new password. Once updated you’ll return to the Wizard.
        </p>

        {!supabaseConfigured && (
          <p className="rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Supabase environment variables are missing. Add them to `.env.local` to enable password resets.
          </p>
        )}

        <form className="grid gap-4 rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label htmlFor="new-password" className="text-sm font-medium text-slate-800">
              New password
            </label>
            <input
              id="new-password"
              name="new-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              required
              disabled={authLoading || !sessionReady}
            />
          </div>

          <div className="grid gap-2">
            <label htmlFor="confirm-password" className="text-sm font-medium text-slate-800">
              Confirm password
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              required
              disabled={authLoading || !sessionReady}
            />
          </div>

          <button
            type="submit"
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            disabled={!sessionReady || status === "loading"}
          >
            {status === "loading" ? "Updating..." : "Save new password"}
          </button>

          {message && (
            <p
              className={`text-sm ${
                status === "success" ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {message}
            </p>
          )}
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
          <Link href="/wizard" className="hover:text-emerald-600">
            Return to Wizard
          </Link>
          <span>Need help? Email support@mediprompt.app</span>
        </div>
      </main>
    </div>
  );
}

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
      setMessage("Password updated — redirecting to your profile.");
      window.setTimeout(() => router.push("/profile"), 1500);
    } catch (error) {
      console.error("Password reset failed", error);
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Unable to update password.",
      );
    }
  };

  return (
    <div className="bg-[var(--color-secondary-background)] text-[var(--color-text-primary)]">
      <main className="mx-auto flex w-full max-w-[520px] flex-col gap-6 px-6 py-16 sm:px-8 lg:px-10">
        <header className="space-y-4">
          <span className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--color-text-secondary)]">
            Reset password
          </span>
          <h1 className="text-[32px] font-bold leading-tight">
            Securely update your MediPrompt password.
          </h1>
          <p className="text-base text-[var(--color-text-secondary)]">
            Use the recovery link we sent to confirm your account and choose a new password. After updating, you’ll return to your profile to keep going.
          </p>
        </header>

        {!supabaseConfigured ? (
          <p className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Supabase environment variables are missing. Add them to `.env.local` to enable password resets.
          </p>
        ) : null}

        {message ? (
          <p
            className={`rounded-2xl border px-4 py-3 text-sm transition-colors ${
              status === "success"
                ? "border-[#c5dcff] bg-[#e7f1ff] text-[var(--color-text-primary)]"
                : status === "error"
                  ? "border-rose-200 bg-rose-50 text-rose-700"
                  : "border-[var(--color-secondary-background)] bg-[var(--color-primary-background)] text-[var(--color-text-secondary)]"
            }`}
          >
            {message}
          </p>
        ) : null}

        <section className="rounded-3xl bg-[var(--color-primary-background)] p-6 shadow-[0_8px_24px_rgba(0,0,0,0.08)]">
          <form className="grid gap-4" onSubmit={handleSubmit}>
            <label className="grid gap-1 text-sm font-medium" htmlFor="new-password">
              New password
              <input
                id="new-password"
                name="new-password"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-secondary-background)] bg-[var(--color-primary-background)] px-4 py-3 text-sm text-[var(--color-text-primary)] shadow-inner focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                required
                disabled={authLoading || !sessionReady}
              />
            </label>

            <label className="grid gap-1 text-sm font-medium" htmlFor="confirm-password">
              Confirm password
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-xl border border-[var(--color-secondary-background)] bg-[var(--color-primary-background)] px-4 py-3 text-sm text-[var(--color-text-primary)] shadow-inner focus:border-[var(--color-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)]/20"
                required
                disabled={authLoading || !sessionReady}
              />
            </label>

            <button
              type="submit"
              className="btn-primary disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!sessionReady || status === "loading"}
            >
              {status === "loading" ? "Updating password…" : "Save new password"}
            </button>
          </form>
        </section>

        <p className="text-sm text-[var(--color-text-secondary)]">
          Need help? Email <a className="font-semibold text-[var(--color-accent)]" href="mailto:support@mediprompt.app">support@mediprompt.app</a> or{" "}
          <Link className="font-semibold text-[var(--color-accent)]" href="/library">return to the library</Link>.
        </p>
      </main>
    </div>
  );
}

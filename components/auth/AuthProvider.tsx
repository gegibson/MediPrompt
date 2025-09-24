"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import {
  getSupabaseBrowserClient,
  type SupabaseBrowserClient,
} from "@/lib/supabase/browser";
import { isBrowserSupabaseConfigured } from "@/lib/supabase/config";

type AuthContextValue = {
  supabase: SupabaseBrowserClient | null;
  session: Session | null;
  user: User | null;
  loading: boolean;
  openAuthModal: () => void;
  closeAuthModal: () => void;
  isAuthModalOpen: boolean;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function AuthModal({
  supabase,
  onClose,
  persistSession,
}: {
  supabase: SupabaseBrowserClient | null;
  onClose: () => void;
  persistSession: (session: Session | null) => Promise<void>;
}) {
  const [mode, setMode] = useState<"sign-in" | "sign-up" | "reset">(
    "sign-in",
  );
  const [supabaseError, setSupabaseError] = useState<string>(
    supabase ? "" : "Supabase configuration missing. Add your environment keys to enable authentication.",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    if (supabase) {
      setSupabaseError("");
    } else {
      setSupabaseError("Supabase configuration missing. Add your environment keys to enable authentication.");
    }
  }, [supabase]);

  const switchMode = (nextMode: typeof mode) => {
    setMode(nextMode);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setStatus("idle");
    setMessage("");
    setSupabaseError(supabase ? "" : "Supabase configuration missing. Add your environment keys to enable authentication.");
  };


  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    setSupabaseError("");

    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!supabase) {
      setStatus("error");
      setSupabaseError("Supabase configuration missing. Add your environment keys to enable authentication.");
      return;
    }

    try {
      if (mode === "sign-in") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password: trimmedPassword,
        });

        if (error) {
          throw error;
        }

        await persistSession(data.session);
        setStatus("success");
        setMessage("Signed in successfully.");
        window.setTimeout(onClose, 600);
        return;
      }

      if (mode === "sign-up") {
        if (trimmedPassword !== confirmPassword.trim()) {
          setStatus("error");
          setMessage("Passwords do not match.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: trimmedPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/reset-password`,
          },
        });

        if (error) {
          throw error;
        }

        await persistSession(data.session ?? null);
        setStatus("success");
        setMessage(
          data.session
            ? "Account created and signed in."
            : "Check your email to confirm your account.",
        );
        window.setTimeout(onClose, 1000);
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        throw error;
      }

      setStatus("success");
      setMessage("Reset instructions sent to your email.");
    } catch (error) {
      console.error("Auth flow error", error);
      setStatus("error");
      setMessage(
        error instanceof Error ? error.message : "Unable to process request.",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-slate-900">
          {mode === "sign-in"
            ? "Sign in to Mediprompt"
            : mode === "sign-up"
              ? "Create your Mediprompt account"
              : "Reset your password"}
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          {mode === "sign-in"
            ? "Use your email and password to continue."
            : mode === "sign-up"
              ? "You’ll use this account to access the Wizard."
              : "We’ll send a secure link to update your password."}
        </p>

        {!supabase && (
          <p className="mt-4 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            Supabase environment variables are missing. Add them to `.env.local` to enable authentication flows.
          </p>
        )}

        <form className="mt-4 grid gap-4" onSubmit={handleSubmit}>
          <div className="grid gap-2">
            <label htmlFor="auth-email" className="text-sm font-medium text-slate-800">
              Email address
            </label>
            <input
              id="auth-email"
              name="auth-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          </div>

          {mode !== "reset" && (
            <div className="grid gap-2">
              <label
                htmlFor="auth-password"
                className="text-sm font-medium text-slate-800"
              >
                Password
              </label>
              <input
                id="auth-password"
                name="auth-password"
                type="password"
                required
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}

          {mode === "sign-up" && (
            <div className="grid gap-2">
              <label
                htmlFor="auth-confirm-password"
                className="text-sm font-medium text-slate-800"
              >
                Confirm password
              </label>
              <input
                id="auth-confirm-password"
                name="auth-confirm-password"
                type="password"
                required
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          )}

          <button
            type="submit"
            className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
            disabled={status === "loading" || !supabase}
          >
            {status === "loading"
              ? "Working..."
              : mode === "sign-in"
                ? "Sign in"
                : mode === "sign-up"
                  ? "Create account"
                  : "Send reset link"}
          </button>

          {supabaseError && (
            <p className="text-sm text-rose-600">{supabaseError}</p>
          )}
          {message && (
            <p
              className={`text-sm ${
                status === "success" ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              {message}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
            {mode !== "sign-in" && (
              <button
                type="button"
                onClick={() => switchMode("sign-in")}
                className="text-emerald-600 hover:underline"
              >
                Back to sign in
              </button>
            )}
            {mode === "sign-in" && (
              <button
                type="button"
                onClick={() => switchMode("reset")}
                className="text-emerald-600 hover:underline"
              >
                Forgot password?
              </button>
            )}
            {mode === "sign-in" && (
              <button
                type="button"
                onClick={() => switchMode("sign-up")}
                className="text-emerald-600 hover:underline"
              >
                Need an account?
              </button>
            )}
          </div>
        </form>

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-400 hover:text-emerald-600"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [supabase] = useState(() => getSupabaseBrowserClient());
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(() => isBrowserSupabaseConfigured());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const persistSession = useCallback(async (nextSession: Session | null) => {
    if (!nextSession) {
      await fetch("/api/auth/session", { method: "DELETE" });
      return;
    }

    await fetch("/api/auth/session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        access_token: nextSession.access_token,
        refresh_token: nextSession.refresh_token,
        expires_at: nextSession.expires_at ?? null,
      }),
    });
  }, []);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let ignore = false;

    async function initSession() {
      try {
        const {
          data: { session: currentSession },
        } = await supabase.auth.getSession();

        if (ignore) {
          return;
        }

        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        await persistSession(currentSession);
      } catch (error) {
        console.error("Unable to load Supabase session", error);
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    void initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, nextSession) => {
      if (ignore) {
        return;
      }

      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (event === "SIGNED_OUT") {
        await persistSession(null);
        setIsAuthModalOpen(false);
        return;
      }

      await persistSession(nextSession);
    });

    return () => {
      ignore = true;
      subscription.unsubscribe();
    };
  }, [persistSession, supabase]);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      supabase,
      session,
      user,
      loading,
      openAuthModal: () => setIsAuthModalOpen(true),
      closeAuthModal: () => setIsAuthModalOpen(false),
      isAuthModalOpen,
    }),
    [supabase, session, user, loading, isAuthModalOpen],
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {isAuthModalOpen ? (
        <AuthModal
          supabase={supabase}
          onClose={() => setIsAuthModalOpen(false)}
          persistSession={persistSession}
        />
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuthContext must be used within AuthProvider");
  }

  return value;
}

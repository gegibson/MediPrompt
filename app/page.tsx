"use client";

import Link from "next/link";
import {
  type MouseEvent as ReactMouseEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useAuthContext } from "@/components/auth/AuthProvider";
import { trackEvent } from "@/lib/analytics/track";
import {
  promptCategories,
  promptLibraryEntries,
} from "@/lib/promptLibrary";

export default function LandingPage() {
  const { user, supabase, openAuthModal, loading } = useAuthContext();
  const categoryCounts = promptLibraryEntries.reduce<Record<string, number>>(
    (acc, entry) => {
      acc[entry.category] = (acc[entry.category] ?? 0) + 1;
      return acc;
    },
    {},
  );

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [copyState, setCopyState] = useState<Record<string, "idle" | "copied" | "error">>({});
  const [expandedPrompts, setExpandedPrompts] = useState<Record<string, boolean>>({});
  const promptLibraryRef = useRef<HTMLElement | null>(null);

  const categoryFilters = [
    {
      id: "all",
      label: "All Prompts",
      icon: "✨",
      count: promptLibraryEntries.length,
      description: "Browse every general template in one view.",
    },
    ...promptCategories.map((category) => ({
      id: category.id,
      label: category.name,
      icon: category.icon,
      count: categoryCounts[category.id] ?? 0,
      description: category.description ?? "",
    })),
  ];

  const filteredPrompts = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    return promptLibraryEntries.filter((entry) => {
      const matchesCategory =
        selectedCategory === "all" || entry.category === selectedCategory;

      if (!matchesCategory) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const haystack = [
        entry.title,
        entry.description,
        entry.promptText,
        ...(entry.tags ?? []),
      ]
        .join(" \n ")
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [searchQuery, selectedCategory]);

  useEffect(() => {
    const trimmed = searchQuery.trim();

    if (!trimmed) {
      return;
    }

    trackEvent("prompt_searched", {
      query_length: trimmed.length,
      matches: filteredPrompts.length,
    });
  }, [filteredPrompts.length, searchQuery]);

  useEffect(() => {
    trackEvent("prompt_library_viewed", {
      prompt_count: promptLibraryEntries.length,
      category_count: promptCategories.length,
    });
  }, []);

  const handleCopyPrompt = async (entryId: string, promptText: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      setCopyState((previous) => ({
        ...previous,
        [entryId]: "copied",
      }));
      trackEvent("prompt_copied", {
        prompt_id: entryId,
      });

      window.setTimeout(() => {
        setCopyState((previous) => ({
          ...previous,
          [entryId]: "idle",
        }));
      }, 2400);
    } catch (error) {
      console.error("Copy failed", error);
      setCopyState((previous) => ({
        ...previous,
        [entryId]: "error",
      }));

      window.setTimeout(() => {
        setCopyState((previous) => ({
          ...previous,
          [entryId]: "idle",
        }));
      }, 3200);
    }
  };

  const handleCtaClick = (payload: {
    location: string;
    type: "primary" | "secondary" | "nav";
    target: string;
  }) => {
    trackEvent("cta_clicked", payload);
  };

  const handleAuthModalOpen = () => {
    trackEvent("auth_modal_open", { source: "landing-nav" });
    openAuthModal();
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    try {
      await supabase.auth.signOut();
      trackEvent("auth_signed_out", { source: "landing" });
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const handleScrollToLibrary = (event?: ReactMouseEvent) => {
    event?.preventDefault();

    handleCtaClick({
      location: "hero",
      type: "secondary",
      target: "prompt-library",
    });

    if (promptLibraryRef.current) {
      promptLibraryRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }

    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "#prompt-library");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 via-white to-emerald-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 pb-7 pt-6 sm:px-6 sm:pb-8 sm:pt-7 md:gap-6 md:px-10 md:pb-10 md:pt-10">
        <nav className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-semibold text-emerald-800 shadow-sm sm:h-11 sm:w-11">
              MP
            </span>
            <div>
              <p className="text-base font-semibold text-slate-800">Mediprompt</p>
              <p className="text-[13px] text-slate-600 sm:text-sm">
                Safer AI prompts for patients & caregivers
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-sm font-medium sm:gap-3">
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-slate-300 px-4 py-1.75 text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600 sm:px-5 sm:py-2"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={handleAuthModalOpen}
                className="rounded-full border border-emerald-400 px-4 py-1.75 text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100/60 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400 sm:px-5 sm:py-2"
                disabled={loading}
              >
                Sign in
              </button>
            )}
            <Link
              href="/wizard"
              className="rounded-full border border-emerald-400 px-4 py-1.75 text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100/60 sm:px-5 sm:py-2"
              onClick={() =>
                handleCtaClick({
                  location: "nav",
                  type: "nav",
                  target: "wizard",
                })
              }
            >
              Skip to Wizard
            </Link>
            <Link
              href="/wizard"
              className="rounded-full bg-emerald-600 px-4 py-1.75 text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 sm:px-5 sm:py-2"
              onClick={() =>
                handleCtaClick({
                  location: "nav",
                  type: "nav",
                  target: "wizard",
                })
              }
            >
              Use Wizard
            </Link>
          </div>
        </nav>

        <div className="grid gap-3 md:max-w-2xl md:gap-4">
          <h1 className="text-[2.05rem] font-semibold leading-[1.15] tracking-tight text-slate-900 sm:text-[2.15rem] md:text-[2.4rem] lg:text-[2.6rem]">
            Get the Healthcare Answers You Need from AI
          </h1>
          <p className="text-[13.5px] leading-snug text-slate-700 sm:text-sm md:text-base">
            Clinician-designed questions to improve AI responses, such as ChatGPT.
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/wizard"
              className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 sm:px-5 sm:py-2.5"
              onClick={() =>
                handleCtaClick({
                  location: "hero",
                  type: "primary",
                  target: "wizard",
                })
              }
            >
              Build My Custom Prompt
            </Link>
            <Link
              href="#prompt-library"
              className="inline-flex items-center justify-center rounded-full border border-emerald-400 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100/70 focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:px-5 sm:py-2.5"
              onClick={handleScrollToLibrary}
            >
              Browse Free Library
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-7 px-4 pb-12 sm:px-6 sm:pb-14 md:gap-10 md:px-10 md:pb-16 lg:gap-14">
        <section
          ref={promptLibraryRef}
          id="prompt-library"
          className="rounded-3xl border border-sky-100 bg-white/85 p-4 text-slate-800 shadow-lg shadow-sky-100/40 backdrop-blur scroll-mt-20 sm:scroll-mt-24 sm:p-6 md:p-7"
        >
          <div className="flex flex-col gap-1.25 md:flex-row md:items-center md:justify-between md:gap-2">
            <div className="grid gap-1">
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h2 className="text-[1.55rem] font-semibold leading-tight text-slate-900 sm:text-[1.6rem] md:text-[1.75rem]">
                  Healthcare Library
                </h2>
                <span className="inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                  General templates • educational only
                </span>
              </div>
            </div>
          </div>

          <div className="mt-3.5 grid gap-3 sm:gap-3.5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible sm:pb-0">
                <div className="flex w-max items-center gap-1.25 px-1 sm:w-auto sm:flex-wrap sm:px-0">
                  {categoryFilters.map((filter) => {
                    const isSelected = selectedCategory === filter.id;

                    return (
                      <button
                        key={filter.id}
                        type="button"
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.25 text-[12.5px] font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-100/70 text-emerald-800 shadow"
                            : "border-slate-200 bg-white/80 text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                        }`}
                        aria-pressed={isSelected}
                        onClick={() => {
                          if (isSelected) {
                            return;
                          }

                          setSelectedCategory(filter.id);
                          trackEvent("prompt_category_selected", {
                            category_id: filter.id,
                            category_name: filter.label,
                          });
                        }}
                        title={filter.description}
                      >
                        <span className="text-base leading-none">{filter.icon}</span>
                        <span>{filter.label}</span>
                        <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500">
                          {filter.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
              <form className="w-full max-w-sm" role="search" aria-label="Prompt library search">
                <label className="sr-only" htmlFor="prompt-library-search">
                  Search prompt library
                </label>
                <div className="relative">
                  <input
                    id="prompt-library-search"
                    type="search"
                    placeholder="Search prompts (e.g. medications, billing)"
                    autoComplete="off"
                    value={searchQuery}
                    onChange={(event) => {
                      setSearchQuery(event.target.value);
                    }}
                    className="w-full rounded-full border border-slate-200 bg-slate-50 px-4 py-1.75 text-sm text-slate-700 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-slate-400" aria-hidden>
                    🔍
                  </span>
                </div>
              </form>
            </div>

            {filteredPrompts.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white/90 px-6 py-9 text-center text-sm text-slate-600">
                No prompts match your filters yet. Try a different keyword or choose another category.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-3.5 md:gap-4 md:[&>article]:max-w-[360px] md:justify-center xl:grid-cols-3 xl:justify-start xl:[&>article]:max-w-[330px]">
                {filteredPrompts.map((entry) => {
                  const category = promptCategories.find(
                    (item) => item.id === entry.category,
                  );

                  return (
                    <article
                      key={entry.id}
                      className="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-white/95 p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-emerald-200 hover:shadow-lg motion-reduce:transform-none motion-reduce:transition-none"
                  >
                    <div className="mb-3 grid gap-1.75">
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-slate-700">
                          <span>{category?.icon ?? "📌"}</span>
                          <span>{category?.name ?? "Prompt"}</span>
                        </span>
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-emerald-700">
                          General Template
                        </span>
                      </div>
                      <div className="grid gap-1.5">
                        <h3 className="text-[1.05rem] font-semibold leading-snug text-slate-900">
                          {entry.title}
                        </h3>
                        <p className="text-[12px] leading-snug text-slate-600">
                          {entry.description}
                        </p>
                      </div>
                    </div>

                    <div className="relative flex-1 rounded-2xl border border-slate-200 bg-slate-50/70 p-3 text-[12px] leading-relaxed text-slate-700">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Prompt preview
                      </p>
                      <p
                        id={`prompt-body-${entry.id}`}
                        className={`mt-2 whitespace-pre-line transition-[max-height] duration-300 ease-out ${
                          expandedPrompts[entry.id]
                            ? "max-h-[1200px]"
                            : "max-h-32 overflow-hidden"
                        }`}
                      >
                        {entry.promptText}
                      </p>
                      {!expandedPrompts[entry.id] && (
                        <div
                          className="pointer-events-none absolute inset-x-3.5 bottom-3.5 h-7 bg-gradient-to-t from-slate-50/90 to-slate-50/0"
                          aria-hidden
                        />
                      )}
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[10px] font-medium uppercase tracking-[0.16em] text-slate-500">
                      <div className="flex flex-wrap items-center gap-1">
                        {entry.tags?.map((tag) => (
                          <span
                            key={tag}
                            className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 lowercase text-slate-600"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] normal-case">
                        <button
                          type="button"
                          className={`inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[11px] font-medium transition focus:outline-none focus:ring-2 focus:ring-emerald-200 ${
                            copyState[entry.id] === "copied"
                              ? "border-emerald-400 bg-emerald-100/70 text-emerald-700"
                              : copyState[entry.id] === "error"
                                ? "border-rose-300 bg-rose-50 text-rose-600"
                                : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:text-emerald-700"
                          }`}
                          onClick={() => handleCopyPrompt(entry.id, entry.promptText)}
                          aria-label={
                            copyState[entry.id] === "copied"
                              ? "Prompt copied"
                              : copyState[entry.id] === "error"
                                ? "Copy failed"
                                : `Copy prompt: ${entry.title}`
                          }
                        >
                          {copyState[entry.id] === "copied"
                            ? "Copied!"
                            : copyState[entry.id] === "error"
                              ? "Copy failed"
                              : "Copy prompt"}
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center rounded-full border border-slate-200 px-3 py-1.5 text-[11px] font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"
                          aria-expanded={expandedPrompts[entry.id] ?? false}
                          aria-controls={`prompt-body-${entry.id}`}
                          onClick={() => {
                            setExpandedPrompts((previous) => {
                              const next = {
                                ...previous,
                                [entry.id]: !previous[entry.id],
                              };

                              trackEvent("prompt_expanded", {
                                prompt_id: entry.id,
                                expanded: next[entry.id],
                              });

                              return next;
                            });
                          }}
                        >
                          {expandedPrompts[entry.id] ? "Collapse" : "Expand"}
                        </button>
                      </div>
                    </div>
                  </article>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-sky-50 p-6 text-slate-800 shadow-lg shadow-emerald-100/40 sm:p-7 md:p-8">
          <div className="grid gap-5 sm:gap-6 md:grid-cols-[minmax(0,1.25fr)_minmax(0,0.9fr)] md:items-center md:gap-8 lg:gap-10">
            <div className="grid gap-3.5 sm:gap-4">
              <h2 className="text-2xl font-semibold text-slate-900 md:text-3xl">
                Ready for prompts tailored to your exact situation?
              </h2>
              <p className="text-sm text-slate-700 sm:text-[15px] md:text-base">
                These free templates stay intentionally broad so anyone can use them without sharing personal details. The Wizard upgrades your experience with context-aware questions, PHI-friendly safety checks, and unlimited prompt generation backed by the same privacy-first principles.
              </p>
              <ul className="grid gap-3 text-[13px] text-slate-700 sm:text-sm">
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                    1
                  </span>
                  <p>
                    Guided intake captures role, goals, tone, and safe background details so every prompt feels personal without storing identifiers.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                    2
                  </span>
                  <p>
                    Built-in PHI scanner highlights risky phrasing before you copy, helping you keep conversations compliant across tools.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                    3
                  </span>
                  <p>
                    Unlimited prompt generation with reminders for next steps, follow-up questions, and educational context tailored to you.
                  </p>
                </li>
              </ul>
            </div>

            <div className="flex h-full flex-col justify-between rounded-3xl border border-emerald-200 bg-white/80 p-5 text-sm shadow-sm sm:p-6">
              <div className="grid gap-1.5 text-slate-700 sm:gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-xs">
                  Upgrade in minutes
                </span>
                <h3 className="text-xl font-semibold text-slate-900">
                  Wizard access • $9/month
                </h3>
                <p>
                  Stripe-powered checkout. Cancel anytime. We never store payment info or prompt content.
                </p>
              </div>
              <div className="mt-5 grid gap-2.5 sm:mt-6 sm:gap-3">
                <Link
                  href="/wizard"
                  className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 sm:px-5 sm:py-2.5"
                  onClick={() =>
                    handleCtaClick({
                      location: "transition",
                      type: "primary",
                      target: "wizard",
                    })
                  }
                >
                  Unlock the Wizard
                </Link>
                <p className="text-[11px] text-slate-500 sm:text-xs">
                  Educational use only. Avoid sharing names, numbers, or other personal identifiers in any prompt.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white/85 p-6 text-slate-800 shadow-lg shadow-slate-100/40 sm:p-7 md:p-8">
          <div className="mb-5 flex flex-col gap-2.5 text-center sm:mb-6 sm:gap-3">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-600 sm:text-xs">
              Why patients trust Mediprompt
            </span>
            <h2 className="text-xl font-semibold text-slate-900 sm:text-2xl md:text-3xl">
              Built for privacy, empathy, and clarity
            </h2>
            <p className="mx-auto max-w-2xl text-[13px] text-slate-600 sm:text-sm">
              Every template balances clinical caution with plain-language education so you stay in control of your health conversations.
            </p>
          </div>

          <div className="grid gap-5 sm:gap-6 md:grid-cols-3 md:gap-7">
            <article className="flex flex-col gap-2.5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-5 text-left shadow-sm sm:gap-3 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">🔒</span>
                <h3 className="text-lg font-semibold text-emerald-900">Privacy First</h3>
              </div>
              <p className="text-[13px] text-emerald-800 sm:text-sm">
                Static prompts mean no chats are stored, tracked, or shared. PHI reminders sit beside every CTA so it&apos;s easy to keep personal data offline.
              </p>
            </article>

            <article className="flex flex-col gap-2.5 rounded-2xl border border-sky-100 bg-sky-50/80 p-5 text-left shadow-sm sm:gap-3 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl">🎓</span>
                <h3 className="text-lg font-semibold text-sky-900">Expertise Driven</h3>
              </div>
              <p className="text-[13px] text-sky-800 sm:text-sm">
                Prompts reference evidence-informed communication best practices and include actionable questions you can confirm with your care team.
              </p>
            </article>

            <article className="flex flex-col gap-2.5 rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm sm:gap-3 sm:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-xl text-emerald-700">✨</span>
                <h3 className="text-lg font-semibold text-slate-900">Simple to Use</h3>
              </div>
              <p className="text-[13px] text-slate-700 sm:text-sm">
                Copy-ready structure, future-friendly filters, and upgrade cues make it easy to browse now and unlock tailored prompts whenever you need them.
              </p>
            </article>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3.5 px-5 py-7 text-[11px] text-slate-500 sm:gap-4 sm:px-6 sm:py-8 sm:text-xs md:flex-row md:items-center md:justify-between md:px-10">
          <div className="max-w-xl space-y-1.5 sm:space-y-2">
            <p>
              Mediprompt is educational only — not medical advice, diagnoses, or treatment. We are not a HIPAA covered entity and never store prompt content or personal identifiers.
            </p>
            <p>
              Avoid sharing names, dates, ID numbers, or other PHI when using prompts. Always consult a licensed clinician for care decisions.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 font-medium text-slate-600 sm:gap-4">
            <Link href="/privacy" className="hover:text-emerald-600">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-emerald-600">
              Terms
            </Link>
            <Link href="/disclaimer" className="hover:text-emerald-600">
              Disclaimer
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

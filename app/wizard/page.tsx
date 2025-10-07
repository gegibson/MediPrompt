"use client";

import Link from "next/link";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useAuthContext } from "@/components/auth/AuthProvider";
import { trackEvent } from "@/lib/analytics/track";
import { detectPhi, buildWarningMessage } from "@/lib/safety/phiGuard";
import {
  Answers,
  Question,
  RedFlag,
  TriageTemplate,
} from "@/lib/wizard/schema/types";
import {
  wizardTemplateList,
  wizardTemplates,
  WizardTemplateId,
} from "@/lib/wizard/templates";
import { determineWizardAccess } from "@/lib/wizard/engine/access";
import { deriveCallToActionLabel } from "@/lib/wizard/engine/callToAction";
import {
  computeVisibleQuestions,
  pruneHiddenAnswers,
} from "@/lib/wizard/engine/questions";
import { evaluateRedFlags } from "@/lib/wizard/engine/redflags";
import { buildPrompt } from "@/lib/wizard/engine/buildPrompt";
import {
  formatGuidanceForCopy,
  type GuidanceSections,
} from "@/lib/wizard/engine/buildGuidance";
import { sanitizeFreeText } from "@/lib/wizard/engine/sanitizer";
import {
  getPreviewStorageKey,
  readPreviewUsage,
  writePreviewUsage,
} from "@/lib/wizard/storage/previewFlag";
import { CHECKOUT_SESSION_STORAGE_KEY } from "@/lib/subscription/checkout";

type WizardRole = "patient" | "caregiver";
type WizardGoal = "learn-basics" | "medications" | "insurance";

type CopyStatus = "idle" | "success" | "error";

type MeResponse = {
  id: string;
  email: string;
  is_subscriber: boolean;
};

const roleOptions: Array<{ label: string; value: WizardRole }> = [
  { label: "Patient", value: "patient" },
  { label: "Caregiver", value: "caregiver" },
];

const goalOptions: Array<{ label: string; value: WizardGoal }> = [
  { label: "Learn the basics", value: "learn-basics" },
  { label: "Medications & safety", value: "medications" },
  { label: "Insurance & coverage", value: "insurance" },
];

const goalSummaries: Record<WizardGoal, string> = {
  "learn-basics": "Understand key concepts and next steps",
  medications: "Review medication guidance and safety questions",
  insurance: "Clarify benefits, coverage, and paperwork",
};

function WizardPageInner() {
  const { supabase, user, loading: authLoading, openAuthModal } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedTemplateId, setSelectedTemplateId] = useState<WizardTemplateId | null>(null);
  const [role, setRole] = useState<WizardRole>("patient");
  const [goal, setGoal] = useState<WizardGoal>("learn-basics");
  const [answers, setAnswers] = useState<Answers>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState<number>(0);
  const [isFlowComplete, setIsFlowComplete] = useState<boolean>(false);
  const [resultPreview, setResultPreview] = useState<string>("");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const [triggeredRedFlags, setTriggeredRedFlags] = useState<RedFlag[]>([]);
  const [resultMode, setResultMode] = useState<"prompt" | "guidance">("prompt");
  const [guidanceError, setGuidanceError] = useState<string>("");
  const [guidancePayload, setGuidancePayload] = useState<{
    systemPrompt: string;
    userPrompt: string;
    model?: string | null;
  } | null>(null);
  const [guidanceSections, setGuidanceSections] = useState<GuidanceSections | null>(null);
  const [isFetchingGuidance, setIsFetchingGuidance] = useState<boolean>(false);
  const [freePreviewUsed, setFreePreviewUsed] = useState<boolean>(false);
  const [isSubscriber, setIsSubscriber] = useState<boolean>(false);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profileError, setProfileError] = useState<string>("");
  const [phiWarning, setPhiWarning] = useState<string>("");
  const [phiModal, setPhiModal] = useState<
    | {
        message: string;
        counts: ReturnType<typeof detectPhi>["counts"];
      }
    | null
  >(null);
  const [phiOverride, setPhiOverride] = useState<boolean>(false);
  const [isConfirmingSubscription, setIsConfirmingSubscription] =
    useState<boolean>(false);
  const [isCreatingCheckout, setIsCreatingCheckout] = useState<boolean>(false);
  const paywallTrackedRef = useRef(false);
  const triggeredFlagIdsRef = useRef<Set<string>>(new Set());

  const selectedTemplate = useMemo(() => {
    if (!selectedTemplateId) {
      return null;
    }
    return wizardTemplates[selectedTemplateId] ?? null;
  }, [selectedTemplateId]);

  const visibleQuestions = useMemo(() => {
    if (!selectedTemplate) {
      return [];
    }
    return computeVisibleQuestions(selectedTemplate, answers);
  }, [answers, selectedTemplate]);

  const currentQuestion = selectedTemplate
    ? visibleQuestions[currentQuestionIndex] ?? null
    : null;

  const emergencyFlags = useMemo(
    () => triggeredRedFlags.filter((flag) => flag.action === "ER_NOW"),
    [triggeredRedFlags],
  );

  const nonEmergencyFlags = useMemo(
    () => triggeredRedFlags.filter((flag) => flag.action !== "ER_NOW"),
    [triggeredRedFlags],
  );

  const questionCount = visibleQuestions.length;
  const hasTemplate = Boolean(selectedTemplate);
  const hasQuestions = questionCount > 0;
  const isOnLastQuestion = hasQuestions
    ? currentQuestionIndex + 1 === questionCount
    : false;

  const isEmergencyStop = emergencyFlags.length > 0;
  const goalLabel = useMemo(() => goalSummaries[goal], [goal]);
  const roleLabel = useMemo(
    () => roleOptions.find((option) => option.value === role)?.label ?? role,
    [role],
  );

  const previewStorageKey = useMemo(
    () => getPreviewStorageKey(user?.id),
    [user?.id],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const used = readPreviewUsage(window.localStorage, previewStorageKey);
    setFreePreviewUsed(used);
  }, [previewStorageKey]);

  const persistPreviewUsage = useCallback(
    (used: boolean) => {
      if (typeof window === "undefined") {
        return;
      }

      writePreviewUsage(window.localStorage, previewStorageKey, used);
    },
    [previewStorageKey],
  );

  const isLoggedIn = Boolean(user);

  const accessState = useMemo(
    () =>
      determineWizardAccess({
        isSubscriber,
        freePreviewUsed,
        isLoggedIn,
      }),
    [freePreviewUsed, isLoggedIn, isSubscriber],
  );

  const loadProfile = useCallback(async () => {
    if (!user) {
      setIsSubscriber(false);
      setProfileError("");
      return;
    }

    setProfileLoading(true);
    setProfileError("");

    try {
      const response = await fetch("/api/me", {
        credentials: "include",
      });

      if (response.status === 401) {
        setIsSubscriber(false);
        trackEvent("profile_load_unauthenticated");
        return;
      }

      if (response.status === 501) {
        setProfileError(
          "Supabase backend is not configured yet. Add your environment keys to enable auth.",
        );
        setIsSubscriber(false);
        trackEvent("profile_load_not_configured");
        return;
      }

      if (!response.ok) {
        throw new Error(`Unexpected response: ${response.status}`);
      }

      const data = (await response.json()) as MeResponse;
      const subscriber = Boolean(data?.is_subscriber);
      setIsSubscriber(subscriber);
      trackEvent("profile_loaded", {
        is_subscriber: subscriber,
      });
    } catch (error) {
      console.error("Unable to load subscription status", error);
      setProfileError(
        "Unable to load subscription status. Refresh the page or try again later.",
      );
      setIsSubscriber(false);
      trackEvent("profile_load_error");
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setIsSubscriber(false);
      return;
    }

    void loadProfile();
  }, [loadProfile, user]);

  useEffect(() => {
    if (isSubscriber) {
      setFreePreviewUsed(false);
      persistPreviewUsage(false);
    }
  }, [isSubscriber, persistPreviewUsage]);

  useEffect(() => {
    if (!isSubscriber && resultMode === "guidance") {
      setResultMode("prompt");
      setGuidancePayload(null);
      setGuidanceError("");
    }
  }, [isSubscriber, resultMode]);

  const checkoutStatus = searchParams.get("checkout");
  const sessionIdFromParams = searchParams.get("session_id");

  useEffect(() => {
    if (!user || checkoutStatus !== "success") {
      return;
    }

    let sessionId = sessionIdFromParams?.trim() ?? "";

    if (!sessionId || sessionId.includes("CHECKOUT_SESSION_ID")) {
      if (typeof window !== "undefined") {
        const storedId = window.sessionStorage.getItem(
          CHECKOUT_SESSION_STORAGE_KEY,
        );

        if (storedId && !storedId.includes("CHECKOUT_SESSION_ID")) {
          sessionId = storedId;
        }
      }
    }

    if (typeof window !== "undefined") {
      console.log("[Wizard] confirming subscription with sessionId", sessionId);
      // expose for quick inspection in devtools
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).mpLastCheckoutSession = sessionId;
    }

    if (!sessionId) {
      setProfileError(
        "We completed checkout but could not confirm the subscription. Refresh the page or contact support.",
      );
      trackEvent("subscription_confirm_missing_session");
      return;
    }

    setIsConfirmingSubscription(true);
    trackEvent("subscription_confirm_start");

    void (async () => {
      try {
        const response = await fetch("/api/subscribe/confirm", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ sessionId }),
        });

        if (response.status === 501) {
          setProfileError(
            "Stripe backend is not configured yet. Add your Stripe keys to enable checkout.",
          );
          trackEvent("subscription_confirm_not_configured");
          return;
        }

        if (!response.ok) {
          throw new Error(`Unable to confirm subscription: ${response.status}`);
        }

        await loadProfile();
        trackEvent("subscription_confirm_success");
      } catch (error) {
        console.error("Subscription confirmation failed", error);
        setProfileError(
          "We couldn't confirm the subscription. If you completed checkout, contact support and we'll resolve it.",
        );
        trackEvent("subscription_confirm_error", {
          error_type: error instanceof Error ? error.name : "unknown",
        });
      } finally {
        setIsConfirmingSubscription(false);
        if (typeof window !== "undefined") {
          window.sessionStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY);
        }
        router.replace("/wizard");
      }
    })();
  }, [checkoutStatus, loadProfile, router, sessionIdFromParams, user]);

  useEffect(() => {
    if (checkoutStatus !== "cancelled") {
      return;
    }

    trackEvent("subscription_checkout_cancelled");
    setProfileError("Checkout was cancelled. You can retry when you're ready.");
    router.replace("/wizard");
  }, [checkoutStatus, router]);

  useEffect(() => {
    if (!user || checkoutStatus !== "success" || sessionIdFromParams) {
      return;
    }

    trackEvent("subscription_confirm_missing_session");
    setProfileError(
      "We couldn't verify the checkout session. If you were charged, contact support and we'll resolve it.",
    );
    router.replace("/wizard");
  }, [checkoutStatus, router, sessionIdFromParams, user]);

  const canContinue = useMemo(() => {
    if (!selectedTemplate) {
      return false;
    }

    if (isEmergencyStop) {
      return false;
    }

    const question = currentQuestion;
    if (!question) {
      return false;
    }

    const isFinalQuestion =
      selectedTemplate && currentQuestionIndex + 1 === visibleQuestions.length;

    if (isFinalQuestion && accessState.state === "paywall_blocked") {
      return false;
    }

    if (!question.required) {
      return true;
    }

    const value = answers[question.id];
    if (value === undefined || value === null) {
      return false;
    }

    if (typeof value === "string") {
      return value.trim().length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return true;
  }, [
    answers,
    currentQuestion,
    currentQuestionIndex,
    isEmergencyStop,
    accessState.state,
    selectedTemplate,
    visibleQuestions.length,
  ]);

  const callToActionLabel = useMemo(
    () =>
      deriveCallToActionLabel({
        authLoading,
        profileLoading,
        isConfirmingSubscription,
        isCreatingCheckout,
        isSubscriber,
        freePreviewUsed,
        isEmergencyStop,
        hasTemplate,
        hasQuestions,
        isFlowComplete,
        isOnLastQuestion,
      }),
    [
      authLoading,
      freePreviewUsed,
      hasQuestions,
      hasTemplate,
      isConfirmingSubscription,
      isCreatingCheckout,
      isEmergencyStop,
      isFlowComplete,
      isOnLastQuestion,
      isSubscriber,
      profileLoading,
    ],
  );

  const resetFlowState = useCallback(() => {
    setAnswers({});
    setCurrentQuestionIndex(0);
    setIsFlowComplete(false);
    setResultPreview("");
    setPhiWarning("");
    setCopyStatus("idle");
    setTriggeredRedFlags([]);
    setResultMode("prompt");
    setGuidanceError("");
    setGuidancePayload(null);
    setGuidanceSections(null);
    setIsFetchingGuidance(false);
    triggeredFlagIdsRef.current.clear();
  }, []);

  const handleTemplateSelect = useCallback(
    (templateId: WizardTemplateId | "") => {
      const nextTemplateId = templateId ? (templateId as WizardTemplateId) : null;
      setSelectedTemplateId(nextTemplateId);
      resetFlowState();
    },
    [resetFlowState],
  );

  const handleRoleChange = useCallback((value: WizardRole) => {
    setRole(value);
  }, []);

  const handleGoalChange = useCallback((value: WizardGoal) => {
    setGoal(value);
  }, []);

  const triggerAuthModal = useCallback(
    (source: string) => {
      trackEvent("auth_modal_open", { source });
      openAuthModal();
    },
    [openAuthModal],
  );

  const handleAnswerChange = useCallback(
    (question: Question, value: unknown) => {
      if (!selectedTemplate) {
        return;
      }

      setAnswers((previous) => {
        const next: Answers = { ...previous };

        if (
          value === undefined ||
          value === null ||
          (typeof value === "string" && value.trim() === "") ||
          (Array.isArray(value) && value.length === 0)
        ) {
          delete next[question.id];
        } else {
          next[question.id] = value;
        }

        const pruned = pruneHiddenAnswers(selectedTemplate, next);
        const evaluation = evaluateRedFlags(selectedTemplate, pruned);

        setTriggeredRedFlags(evaluation.flags);

        evaluation.flags.forEach((flag) => {
          if (!triggeredFlagIdsRef.current.has(flag.id)) {
            triggeredFlagIdsRef.current.add(flag.id);
            trackEvent("wizard_redflag_triggered", {
              template_id: selectedTemplate.id,
              level: flag.action,
            });
          }
        });

        return pruned;
      });

      setIsFlowComplete(false);
      setResultPreview("");
      setPhiWarning("");
      setCopyStatus("idle");
      setGuidanceError("");
      setGuidancePayload(null);
      setGuidanceSections(null);
      setPhiOverride(false);
    },
    [selectedTemplate],
  );

  const buildPromptOutput = useCallback(() => {
    if (!selectedTemplate) {
      return "";
    }

    const redFlagSnippets = nonEmergencyFlags.map(
      (flag) => `- [${flag.action}] ${flag.description}`,
    );

    const prompt = buildPrompt({
      template: selectedTemplate,
      answers,
      role: roleLabel,
      goal: goalLabel,
      redFlags: redFlagSnippets,
    });

    setGuidancePayload(null);
    setGuidanceSections(null);
    return prompt;
  }, [answers, goalLabel, nonEmergencyFlags, roleLabel, selectedTemplate]);

  const requestGuidance = useCallback(async () => {
    if (!selectedTemplate) {
      return false;
    }

    setIsFetchingGuidance(true);
    setGuidanceError("");

    trackEvent("wizard_guidance_requested", {
      template_id: selectedTemplate.id,
      role,
      goal,
      answered_questions: Object.keys(answers).length,
      is_subscriber: isSubscriber,
    });

    try {
      const response = await fetch("/api/wizard/guidance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        cache: "no-store",
        body: JSON.stringify({
          templateId: selectedTemplate.id,
          answers,
          role: roleLabel,
          goal: goalLabel,
          redFlags: nonEmergencyFlags.map((flag) => `${flag.action}: ${flag.description}`),
        }),
      });

      const payload = await response.json();

      if (!response.ok) {
        const fallbackSections = payload?.sections as GuidanceSections | undefined;
        if (fallbackSections) {
          setGuidanceSections(fallbackSections);
          const fallbackCopy = formatGuidanceForCopy(fallbackSections);
          setResultPreview(fallbackCopy);
        }
        setGuidancePayload(payload?.payload ?? null);
        const message =
          typeof payload?.error === "string"
            ? payload.error
            : "We couldn't generate educational guidance right now.";
        setGuidanceError(message);
        trackEvent("wizard_guidance_error", {
          template_id: selectedTemplate.id,
          status: response.status,
        });
        return false;
      }

      const sections = payload.sections as GuidanceSections;
      setGuidanceSections(sections);
      const copy = formatGuidanceForCopy(sections);
      setResultPreview(copy);

      if (payload?.payload) {
        setGuidancePayload(payload.payload);
      } else {
        setGuidancePayload(null);
      }

      trackEvent("wizard_result_shown", {
        template_id: selectedTemplate.id,
        is_subscriber: isSubscriber,
        mode: "guidance",
        role,
        goal,
        answered_questions: Object.keys(answers).length,
      });

      return true;
    } catch (error) {
      console.error("[Wizard] guidance request failed", error);
      setGuidanceError("We couldn't generate educational guidance. Try again in a moment.");
      trackEvent("wizard_guidance_error", {
        template_id: selectedTemplate.id,
        status: "network_error",
      });
      return false;
    } finally {
      setIsFetchingGuidance(false);
    }
  }, [
    answers,
    goal,
    goalLabel,
    isSubscriber,
    nonEmergencyFlags,
    role,
    roleLabel,
    selectedTemplate,
  ]);

  const handleBack = useCallback(() => {
    setCurrentQuestionIndex((index) => Math.max(index - 1, 0));
    setIsFlowComplete(false);
    setPhiWarning("");
  }, []);

  const handleRestart = useCallback(() => {
    resetFlowState();
  }, [resetFlowState]);

  const checkPhi = useCallback(
    (template: TriageTemplate, currentAnswers: Answers) => {
      const segments: string[] = [];

      Object.entries(currentAnswers).forEach(([questionId, value]) => {
        const question = template.questions.find((item) => item.id === questionId);
        if (!question) {
          return;
        }

        if (typeof value === "string") {
          segments.push(value);
        } else if (Array.isArray(value)) {
          segments.push(value.map((item) => String(item)).join(", "));
        }
      });

      if (segments.length === 0) {
        return null;
      }

      const scan = detectPhi(segments.join("\n"));
      if (!scan.flagged) {
        return null;
      }

      return {
        message: buildWarningMessage(scan),
        counts: scan.counts,
      };
    },
    [],
  );

  const finalizeFlow = useCallback(async (options?: { bypassPhi?: boolean }) => {
    if (!selectedTemplate) {
      return;
    }

    if (isEmergencyStop) {
      return;
    }

    if (!accessState.canGenerate) {
      if (accessState.state === "anon_blocked") {
        trackEvent("wizard_prompt_blocked", { reason: accessState.reason });
        triggerAuthModal("wizard-submit");
      } else {
        trackEvent("wizard_prompt_blocked", { reason: accessState.reason });
      }
      return;
    }

    const shouldBypassPhi = options?.bypassPhi || phiOverride;

    const phiResult = checkPhi(selectedTemplate, answers);
    if (phiResult && !shouldBypassPhi) {
      const warningMessage = buildWarningMessage(phiResult);
      setPhiWarning(warningMessage);
      setPhiModal({
        message: warningMessage,
        counts: phiResult.counts,
      });
      trackEvent("wizard_input_flagged", {
        source: "wizard",
        template_id: selectedTemplate.id,
        names: phiResult.counts.name,
        dates: phiResult.counts.date,
        long_numbers: phiResult.counts.long_number,
        total: phiResult.counts.total,
      });
      return;
    }

    setCopyStatus("idle");
    setGuidanceError("");
    setPhiModal(null);
    setPhiOverride(false);

    let success = false;

    if (resultMode === "guidance") {
      const generated = await requestGuidance();
      success = generated;
    } else {
      const promptOutput = buildPromptOutput();
      setResultPreview(promptOutput);
      success = true;

      trackEvent("wizard_result_shown", {
        template_id: selectedTemplate.id,
        is_subscriber: isSubscriber,
        mode: "prompt",
        role,
        goal,
        answered_questions: Object.keys(answers).length,
      });
    }

    setIsFlowComplete(true);
    setCopyStatus("idle");

    if (success && !isSubscriber && !freePreviewUsed) {
      setFreePreviewUsed(true);
      persistPreviewUsage(true);
      trackEvent("wizard_free_preview_consumed");
    }

    if (!success) {
      trackEvent("wizard_result_blocked", {
        template_id: selectedTemplate.id,
        mode: resultMode,
      });
    }
  }, [
    answers,
    accessState,
    checkPhi,
    freePreviewUsed,
    goal,
    buildPromptOutput,
    isEmergencyStop,
    isSubscriber,
    persistPreviewUsage,
    phiOverride,
    requestGuidance,
    role,
    resultMode,
    selectedTemplate,
    triggerAuthModal,
  ]);

  const handlePhiEdit = useCallback(() => {
    if (!phiModal) {
      return;
    }

    trackEvent("wizard_phi_modal_action", {
      action: "edit",
      template_id: selectedTemplateId ?? undefined,
    });

    setPhiWarning(phiModal.message);
    setPhiModal(null);
    setPhiOverride(false);
  }, [phiModal, selectedTemplateId]);

  const handlePhiContinue = useCallback(() => {
    if (!phiModal) {
      return;
    }

    trackEvent("wizard_phi_modal_action", {
      action: "continue",
      template_id: selectedTemplateId ?? undefined,
    });

    setPhiModal(null);
    setPhiOverride(true);
    void finalizeFlow({ bypassPhi: true });
  }, [finalizeFlow, phiModal, selectedTemplateId]);

  const handleAdvance = useCallback(async () => {
    if (!selectedTemplate) {
      return;
    }

    if (isEmergencyStop) {
      return;
    }

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex < visibleQuestions.length) {
      setCurrentQuestionIndex(nextIndex);
      return;
    }

    await finalizeFlow();
  }, [
    finalizeFlow,
    currentQuestionIndex,
    isEmergencyStop,
    selectedTemplate,
    visibleQuestions.length,
  ]);

  const handleQuestionSubmit = useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canContinue) {
        return;
      }
      void handleAdvance();
    },
    [canContinue, handleAdvance],
  );

  const handleResultModeChange = useCallback(
    (mode: "prompt" | "guidance") => {
      if (mode === "guidance" && !isSubscriber) {
        return;
      }

      if (mode !== resultMode) {
        trackEvent("wizard_result_mode_change", {
          mode,
          is_subscriber: isSubscriber,
          template_id: selectedTemplate?.id,
        });
      }

      setResultMode(mode);
      setGuidanceError("");

      if (isFlowComplete && !isEmergencyStop && selectedTemplate) {
        if (mode === "guidance") {
          if (guidanceSections) {
            setResultPreview(formatGuidanceForCopy(guidanceSections));
          } else if (!isFetchingGuidance) {
            void requestGuidance();
          }
        } else {
          const promptOutput = buildPromptOutput();
          setResultPreview(promptOutput);
        }
      }
    },
    [
      buildPromptOutput,
      guidanceSections,
      isEmergencyStop,
      isFlowComplete,
      isFetchingGuidance,
      isSubscriber,
      requestGuidance,
      resultMode,
      selectedTemplate,
    ],
  );

  const renderQuestionInput = useCallback(
    (question: Question) => {
      const rawValue = answers[question.id];

      switch (question.kind) {
        case "text": {
          const value = typeof rawValue === "string" ? rawValue : "";
          const handleSanitize = () => {
            const sanitized = sanitizeFreeText(value);
            if (sanitized !== value) {
              handleAnswerChange(question, sanitized);
            }
          };

          return (
            <div className="grid gap-2">
              <textarea
                id={`wizard-question-${question.id}`}
                value={value}
                onChange={(event) => handleAnswerChange(question, event.target.value)}
                className="min-h-[140px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              />
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSanitize}
                  className="text-xs font-semibold text-emerald-600 underline-offset-2 hover:underline"
                >
                  Sanitize text
                </button>
              </div>
            </div>
          );
        }
        case "number": {
          const value =
            typeof rawValue === "number"
              ? rawValue
              : rawValue !== undefined
                ? Number(rawValue)
                : "";
          return (
            <input
              id={`wizard-question-${question.id}`}
              type="number"
              value={value}
              onChange={(event) => {
                const nextValue = event.target.value.trim();
                handleAnswerChange(
                  question,
                  nextValue === "" ? undefined : Number(nextValue),
                );
              }}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            />
          );
        }
        case "scale": {
          const value =
            typeof rawValue === "number"
              ? rawValue
              : rawValue !== undefined
                ? Number(rawValue)
                : 5;
          return (
            <div className="grid gap-3">
              <input
                id={`wizard-question-${question.id}`}
                type="range"
                min={1}
                max={10}
                value={value}
                onChange={(event) => handleAnswerChange(question, Number(event.target.value))}
                className="h-2 w-full cursor-pointer appearance-none rounded bg-slate-200 accent-emerald-500"
              />
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>1</span>
                <span className="font-semibold text-slate-700">{value}</span>
                <span>10</span>
              </div>
            </div>
          );
        }
        case "select": {
          const value = typeof rawValue === "string" ? rawValue : "";
          return (
            <select
              id={`wizard-question-${question.id}`}
              value={value}
              onChange={(event) => handleAnswerChange(question, event.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
            >
              <option value="" disabled>
                Select an option
              </option>
              {question.options?.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          );
        }
        case "multiselect": {
          const selectedValues = Array.isArray(rawValue)
            ? rawValue.map((item) => String(item))
            : [];
          return (
            <div className="grid gap-2">
              {question.options?.map((option) => {
                const isChecked = selectedValues.includes(option);
                return (
                  <label
                    key={option}
                    className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700 shadow-sm transition hover:border-emerald-200"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(event) => {
                        const nextSelection = event.target.checked
                          ? [...selectedValues, option]
                          : selectedValues.filter((value) => value !== option);
                        handleAnswerChange(question, nextSelection);
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>{option}</span>
                  </label>
                );
              })}
            </div>
          );
        }
        default:
          return null;
      }
    },
    [answers, handleAnswerChange],
  );

  useEffect(() => {
    if (!selectedTemplate) {
      setCurrentQuestionIndex(0);
      return;
    }

    if (visibleQuestions.length === 0) {
      setCurrentQuestionIndex(0);
      return;
    }

    if (currentQuestionIndex >= visibleQuestions.length) {
      setCurrentQuestionIndex(visibleQuestions.length - 1);
    }
  }, [currentQuestionIndex, selectedTemplate, visibleQuestions.length]);

  const handleCopy = async () => {
    if (!resultPreview || (resultMode === "guidance" && isFetchingGuidance)) {
      return;
    }

    try {
      await navigator.clipboard.writeText(resultPreview);
      setCopyStatus("success");
      window.setTimeout(() => setCopyStatus("idle"), 2400);
      trackEvent("wizard_prompt_copied", {
        is_subscriber: isSubscriber,
      });
    } catch (error) {
      console.error("Copy failed", error);
      setCopyStatus("error");
      window.setTimeout(() => setCopyStatus("idle"), 3200);
    }
  };

  const handleSignOut = async () => {
    if (!supabase) {
      return;
    }

    try {
      await supabase.auth.signOut();
      setSelectedTemplateId(null);
      setRole("patient");
      setGoal("learn-basics");
      resetFlowState();
      persistPreviewUsage(false);
      trackEvent("auth_signed_out", { source: "wizard" });
    } catch (error) {
      console.error("Sign out failed", error);
    }
  };

  const handleStartCheckout = async () => {
    if (isCreatingCheckout) {
      return;
    }

    if (!user) {
      triggerAuthModal("wizard-paywall");
      return;
    }

    setIsCreatingCheckout(true);
    setProfileError("");
    trackEvent("wizard_checkout_session_start");

    try {
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        credentials: "include",
      });

      if (response.status === 501) {
        setProfileError(
          "Stripe is not configured yet. Add your Stripe keys to enable checkout.",
        );
        trackEvent("wizard_checkout_session_not_configured");
        return;
      }

      if (!response.ok) {
        let serverMessage = "";

        try {
          const errorData = (await response.json()) as {
            error?: string;
            hint?: string;
          };
          serverMessage = errorData.hint || errorData.error || "";
        } catch (parseError) {
          console.warn("Unable to parse checkout session error", parseError);
        }

        if (serverMessage) {
          setProfileError(serverMessage);
        }

        throw new Error(`Unexpected response: ${response.status}`);
      }

      const data = (await response.json()) as {
        url?: string | null;
        sessionId?: string | null;
      };

      if (!data?.url) {
        throw new Error("Missing checkout URL");
      }

      if (typeof window !== "undefined") {
        if (data.sessionId) {
          console.log("[Wizard] storing checkout sessionId", data.sessionId);
          window.sessionStorage.setItem(
            CHECKOUT_SESSION_STORAGE_KEY,
            data.sessionId,
          );
        } else {
          window.sessionStorage.removeItem(CHECKOUT_SESSION_STORAGE_KEY);
        }
      }

      trackEvent("wizard_checkout_session_ready");
      window.location.href = data.url;
    } catch (error) {
      console.error("Unable to start Stripe checkout", error);
      setProfileError(
        "We couldn't open Stripe checkout. Refresh and try again or contact support.",
      );
      trackEvent("wizard_checkout_session_error", {
        error_type: error instanceof Error ? error.name : "unknown",
      });
    } finally {
      setIsCreatingCheckout(false);
    }
  };

  const showPaywall = isLoggedIn && !isSubscriber;
  const showFreePreviewNotice = !isSubscriber && freePreviewUsed;
  const showEligibleBanner = !isSubscriber && !freePreviewUsed;

  useEffect(() => {
    if (showPaywall && !paywallTrackedRef.current) {
      trackEvent("wizard_paywall_viewed", {
        free_preview_used: freePreviewUsed,
      });
      paywallTrackedRef.current = true;
    }
  }, [freePreviewUsed, showPaywall]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-sky-50 text-slate-900">
      <header className="border-b border-emerald-100 bg-white/80">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between md:px-10">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-lg font-semibold text-emerald-800 shadow-sm">
              MP
            </span>
            <div>
              <p className="text-base font-semibold text-slate-800">Mediprompt Wizard</p>
              <p className="text-sm text-slate-600">
                Structured prompts with HIPAA-safe guardrails
              </p>
              <div className="mt-2">
                <span
                  className={
                    "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold " +
                    (isSubscriber
                      ? "bg-emerald-100 text-emerald-700"
                      : isLoggedIn
                        ? "bg-sky-100 text-sky-700"
                        : "bg-slate-100 text-slate-700")
                  }
                  title={isSubscriber ? "Active subscriber" : isLoggedIn ? "Logged in (free preview)" : "Anonymous (free preview)"}
                >
                  {isSubscriber ? "Plan: Unlimited" : isLoggedIn ? "Plan: Free (account)" : "Plan: Free (anon)"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
            <Link
              href="/"
              className="rounded-full border border-slate-200 px-5 py-2 text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600"
            >
              Back to landing preview
            </Link>
            {user ? (
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-full border border-slate-300 px-5 py-2 text-slate-600 transition hover:border-emerald-400 hover:text-emerald-600"
              >
                Sign out
              </button>
            ) : (
              <button
                type="button"
                onClick={() => triggerAuthModal("wizard-header")}
                className="rounded-full border border-emerald-400 px-5 py-2 text-emerald-700 transition hover:border-emerald-500 hover:bg-emerald-100/60 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                disabled={authLoading}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 md:px-10">
        <section className="grid gap-4">
          <span className="w-fit rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
            Wizard workspace
          </span>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 md:text-4xl">
            Tailor safer AI prompts with structured context.
          </h1>
          <p className="text-base text-slate-700 md:text-lg">
            Generate one guided prompt without logging in. Create a free account afterward to sync your subscription and unlock unlimited prompt generation.
          </p>
        </section>

        {showEligibleBanner && (
          <section className="flex items-center justify-between gap-4 rounded-3xl border border-sky-200 bg-sky-50/80 px-5 py-4 text-sm text-slate-700 shadow-sm">
            <div className="grid gap-1">
              <span className="text-sm font-semibold text-slate-900">You have 1 free tailored triage.</span>
              <span className="text-xs text-slate-600">Work through the guided questions to use your complimentary result.</span>
            </div>
            <span className="hidden text-xs font-semibold uppercase tracking-wide text-sky-700 sm:inline">Free preview</span>
          </section>
        )}

        {!user && !authLoading && (
          <section className="rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Ready for more than one prompt?
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              Try your complimentary preview first. When you&apos;re ready for unlimited prompts, create a free account so we can remember your subscription without storing any prompt content.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                id="mp-open-auth"
                type="button"
                onClick={() => triggerAuthModal("wizard-gate")}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700"
              >
                Log in or sign up
              </button>
              <span className="text-xs text-slate-500">
                Stripe checkout is only available once you have an account.
              </span>
            </div>
          </section>
        )}

        {showPaywall && (
          <section
            id="mp-paywall"
            className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-6 shadow-sm"
          >
            <h2 className="text-lg font-semibold text-emerald-900">
              Subscribe to unlock unlimited triage — $9/month
            </h2>
            <ul className="mt-3 grid gap-2 text-sm text-emerald-800">
              <li>• Unlimited triage results</li>
              <li>• Advanced categories</li>
              <li>• In-app educational guidance</li>
              <li>• No ads, ever</li>
            </ul>
            {profileError && (
              <p className="mt-3 text-sm text-rose-600">{profileError}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                id="mp-paywall-cta"
                type="button"
                onClick={() => {
                  trackEvent("wizard_paywall_cta_click");
                  void handleStartCheckout();
                }}
                className="rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-300"
                disabled={isCreatingCheckout || isConfirmingSubscription}
              >
                {isCreatingCheckout ? "Opening Stripe..." : "Subscribe to unlock"}
              </button>
              <span className="text-xs text-emerald-700">
                After payment you&apos;ll return here automatically and unlock as soon as the subscription confirms.
              </span>
            </div>
          </section>
        )}

        {showFreePreviewNotice && (
          <section className="rounded-3xl border border-slate-200 bg-white/80 p-5 text-sm text-slate-700 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">
              Free triage used
            </h2>
            <p className="mt-1">
              {isLoggedIn
                ? "You've used your complimentary triage. Subscribe to keep generating structured nurse-guided results."
                : "You've used your complimentary triage. Sign in to subscribe for unlimited, guided results."}
            </p>
            {!isLoggedIn && (
              <button
                type="button"
                onClick={() => triggerAuthModal("wizard-free-preview")}
                className="mt-3 inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700"
              >
                Sign in to continue
              </button>
            )}
          </section>
        )}

        <section className="grid gap-6 rounded-3xl border border-sky-100 bg-white/90 p-6 shadow-lg shadow-sky-100/40 backdrop-blur md:p-8">
          <form
            id="mp-wizard-form"
            className="grid gap-6"
            onSubmit={handleQuestionSubmit}
          >
            <div className="grid gap-2">
              <label htmlFor="mp-template" className="text-sm font-medium text-slate-800">
                Triage template
              </label>
              <select
                id="mp-template"
                value={selectedTemplateId ?? ""}
                onChange={(event) => handleTemplateSelect(event.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              >
                <option value="" disabled>
                  Select a triage path
                </option>
                {wizardTemplateList.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500">
                Choose the scenario you want the Wizard to walk through.
              </p>
            </div>

            <div className="grid gap-2">
              <span className="text-sm font-medium text-slate-800">Your role</span>
              <div className="grid gap-2 sm:grid-cols-2">
                {roleOptions.map((option) => (
                  <label
                    key={option.value}
                    htmlFor={`mp-role-${option.value}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm transition ${
                      role === option.value
                        ? "border-emerald-400 bg-emerald-50 text-emerald-900"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200"
                    }`}
                  >
                    <input
                      id={`mp-role-${option.value}`}
                      type="radio"
                      name="mp-role"
                      value={option.value}
                      checked={role === option.value}
                      onChange={() => handleRoleChange(option.value)}
                      className="h-4 w-4"
                    />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="grid gap-2">
              <label htmlFor="mp-goal" className="text-sm font-medium text-slate-800">
                Main goal
              </label>
              <select
                id="mp-goal"
                value={goal}
                onChange={(event) => handleGoalChange(event.target.value as WizardGoal)}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-900 shadow-inner outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
              >
                {goalOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 rounded-3xl border border-slate-200 bg-slate-50/60 p-5 shadow-inner">
              {selectedTemplate ? (
                <>
                  <header className="flex flex-col gap-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {visibleQuestions.length > 0
                        ? `Question ${Math.min(currentQuestionIndex + 1, visibleQuestions.length)} of ${visibleQuestions.length}`
                        : "Questionnaire"}
                    </span>
                    <h3 className="text-lg font-semibold text-slate-900">
                      {selectedTemplate.name}
                    </h3>
                  </header>

                  {phiWarning && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      {phiWarning}
                    </div>
                  )}

                  {isEmergencyStop ? (
                    <div className="grid gap-4 rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-800 shadow-inner">
                      <div className="flex items-start gap-3">
                        <span className="text-2xl" aria-hidden>⚠️</span>
                        <div className="grid gap-2">
                          <p className="text-base font-semibold text-rose-900">
                            Potential emergency detected
                          </p>
                          <p className="text-sm">
                            Your answers suggest symptoms that need immediate medical attention. Call 911 or your local emergency number now. The Wizard will not continue this triage.
                          </p>
                        </div>
                      </div>
                      <div className="grid gap-2 text-sm">
                        <p className="font-semibold text-rose-900">Why we stopped:</p>
                        <ul className="grid gap-1 text-rose-800">
                          {emergencyFlags.map((flag) => (
                            <li key={flag.id}>• {flag.description}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleRestart}
                          className="rounded-full border border-rose-300 px-5 py-2 text-sm font-semibold text-rose-900 transition hover:border-rose-400 hover:text-rose-700"
                        >
                          Reset triage
                        </button>
                      </div>
                    </div>
                  ) : isFlowComplete ? (
                    <div className="grid gap-3 text-sm text-slate-700">
                      <p>
                        Your triage answers are recorded below. Review the result summary, copy it, or adjust any answer to refresh the output.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={handleRestart}
                          className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:border-emerald-300 hover:text-emerald-600"
                        >
                          Start over
                        </button>
                      </div>
                    </div>
                  ) : currentQuestion ? (
                    <div className="grid gap-4">
                      <div className="grid gap-2">
                        <p className="text-base font-medium text-slate-900">
                          {currentQuestion.label}
                        </p>
                        {currentQuestion.help && (
                          <p className="text-xs text-slate-500">{currentQuestion.help}</p>
                        )}
                      </div>
                      {renderQuestionInput(currentQuestion)}
                      <div className="flex flex-wrap items-center gap-3">
                        {currentQuestionIndex > 0 && (
                          <button
                            type="button"
                            onClick={handleBack}
                            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600"
                          >
                            Back
                          </button>
                        )}
                        <button
                          type="submit"
                          className="rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-600/30 transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
                          disabled={!canContinue}
                        >
                          {callToActionLabel}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 text-sm text-slate-700">
                      <p>All questions are answered. Continue to view your structured result.</p>
                      <div className="flex flex-wrap items-center gap-3">
                        {currentQuestionIndex > 0 && (
                          <button
                            type="button"
                            onClick={handleBack}
                            className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-600 transition hover:border-emerald-300 hover:text-emerald-600"
                          >
                            Back
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => void finalizeFlow()}
                          className="rounded-full bg-sky-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm shadow-sky-600/30 transition hover:bg-sky-700"
                        >
                          {callToActionLabel}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="grid gap-3 text-sm text-slate-600">
                  <p>Select a template to start the guided triage. You can change templates anytime.</p>
                </div>
              )}
            </div>
          </form>

          <div className="grid gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-700">
                Triage result preview
              </h2>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleResultModeChange("prompt")}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    resultMode === "prompt"
                      ? "bg-sky-600 text-white shadow-sm shadow-sky-600/40"
                      : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  Copyable prompt
                </button>
                <button
                  type="button"
                  onClick={() => handleResultModeChange("guidance")}
                  className={`rounded-full px-3 py-1 font-semibold transition ${
                    resultMode === "guidance"
                      ? "bg-emerald-600 text-white shadow-sm shadow-emerald-600/40"
                      : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                  } ${!isSubscriber ? "cursor-not-allowed opacity-40" : ""}`}
                  disabled={!isSubscriber}
                >
                  In-app guidance
                </button>
              </div>
            </div>
            {!isSubscriber && (
              <p className="text-xs text-slate-500">
                Subscribe to access the guidance view and internal LLM payload preview.
              </p>
            )}
            <div
              id="mp-wizard-output"
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 text-sm text-slate-800 shadow-inner"
            >
              {resultMode === "prompt" ? (
                resultPreview ? (
                  <pre className="whitespace-pre-wrap font-sans leading-relaxed">
                    {resultPreview}
                  </pre>
                ) : (
                  <p className="text-slate-500">
                    Work through the guided questions to see your copyable prompt.
                  </p>
                )
              ) : isFetchingGuidance ? (
                <p className="text-sky-700">Generating educational guidance…</p>
              ) : guidanceSections ? (
                <div className="grid gap-4">
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">
                      {guidanceSections.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-700">
                      {guidanceSections.summary}
                    </p>
                  </div>
                  <div className="grid gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">Red flags to watch</h4>
                    <ul className="grid gap-1 text-sm text-slate-700">
                      {guidanceSections.watch_for.map((item, index) => (
                        <li key={`watch-${index}`} className="flex gap-2">
                          <span aria-hidden>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">Guidance</h4>
                    <ul className="grid gap-1 text-sm text-slate-700">
                      {guidanceSections.guidance.map((item, index) => (
                        <li key={`guidance-${index}`} className="flex gap-2">
                          <span aria-hidden>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="grid gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">Doctor prep</h4>
                    <ul className="grid gap-1 text-sm text-slate-700">
                      {guidanceSections.doctor_prep.map((item, index) => (
                        <li key={`prep-${index}`} className="flex gap-2">
                          <span aria-hidden>•</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Safety reminder
                  </p>
                  <p className="text-sm text-slate-700">
                    {guidanceSections.safety_reminder}
                  </p>
                </div>
              ) : (
                <p className="text-slate-500">
                  Complete the triage and switch to guidance to view the educational walkthrough.
                </p>
              )}
            </div>
            {resultMode === "guidance" && guidancePayload?.systemPrompt && (
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-xs text-emerald-900">
                <p className="font-semibold">LLM payload preview</p>
                <p className="mt-2 whitespace-pre-wrap text-emerald-800">
                  <span className="font-semibold">System prompt:</span>
                  {"\n"}
                  {guidancePayload.systemPrompt}
                </p>
                <p className="mt-2 whitespace-pre-wrap text-emerald-800">
                  <span className="font-semibold">User prompt:</span>
                  {"\n"}
                  {guidancePayload.userPrompt}
                </p>
              </div>
            )}
            {guidanceError && (
              <p className="text-xs text-rose-600">{guidanceError}</p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button
                id="mp-copy-wizard"
                type="button"
                onClick={handleCopy}
                className="rounded-full border border-slate-300 px-5 py-2 text-sm font-medium text-slate-700 transition hover:border-emerald-400 hover:text-emerald-600 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
                disabled={
                  resultMode === "guidance"
                    ? isFetchingGuidance || !guidanceSections
                    : !resultPreview
                }
              >
                {copyStatus === "success"
                  ? "Copied!"
                  : copyStatus === "error"
                    ? "Copy failed"
                    : resultMode === "guidance"
                      ? "Copy guidance"
                      : "Copy prompt"}
              </button>
              <p className="text-xs text-slate-500">
                We never store your answers. Copy locally or restart anytime.
              </p>
            </div>
          </div>
        </section>
      </main>

      {phiModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 px-4 py-6">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl shadow-slate-900/10">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Possible identifiers detected
                </span>
                <p className="text-base font-semibold text-slate-900">
                  Please remove personal identifiers before continuing.
                </p>
                <p className="text-sm text-slate-700">{phiModal.message}</p>
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                <p className="font-semibold">Detected:</p>
                <ul className="mt-1 grid gap-1">
                  {phiModal.counts.name ? (
                    <li>• {phiModal.counts.name} name{phiModal.counts.name > 1 ? "s" : ""}</li>
                  ) : null}
                  {phiModal.counts.date ? (
                    <li>• {phiModal.counts.date} date{phiModal.counts.date > 1 ? "s" : ""}</li>
                  ) : null}
                  {phiModal.counts.long_number ? (
                    <li>
                      • {phiModal.counts.long_number} long number
                      {phiModal.counts.long_number > 1 ? "s" : ""}
                    </li>
                  ) : null}
                  {phiModal.counts.total === 0 ? <li>• Possible identifiers</li> : null}
                </ul>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={handlePhiEdit}
                  className="rounded-full bg-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-300"
                >
                  Edit &amp; resubmit
                </button>
                <button
                  type="button"
                  onClick={handlePhiContinue}
                  className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/30 transition hover:bg-emerald-700"
                >
                  Continue anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default function WizardPage() {
  return (
    <Suspense fallback={null}>
      <WizardPageInner />
    </Suspense>
  );
}

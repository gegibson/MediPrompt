export type WizardAccessInput = {
  isSubscriber: boolean;
  freePreviewUsed: boolean;
  isLoggedIn: boolean;
};

export type WizardAccessState =
  | {
      state: "subscriber" | "free_eligible";
      canGenerate: true;
      requiresAuth: false;
      reason: null;
    }
  | {
      state: "anon_blocked";
      canGenerate: false;
      requiresAuth: true;
      reason: "anon-login";
    }
  | {
      state: "paywall_blocked";
      canGenerate: false;
      requiresAuth: false;
      reason: "paywall";
    };

export const determineWizardAccess = ({
  isSubscriber,
  freePreviewUsed,
  isLoggedIn,
}: WizardAccessInput): WizardAccessState => {
  if (isSubscriber) {
    return {
      state: "subscriber",
      canGenerate: true,
      requiresAuth: false,
      reason: null,
    };
  }

  if (!freePreviewUsed) {
    return {
      state: "free_eligible",
      canGenerate: true,
      requiresAuth: false,
      reason: null,
    };
  }

  if (!isLoggedIn) {
    return {
      state: "anon_blocked",
      canGenerate: false,
      requiresAuth: true,
      reason: "anon-login",
    };
  }

  return {
    state: "paywall_blocked",
    canGenerate: false,
    requiresAuth: false,
    reason: "paywall",
  };
};

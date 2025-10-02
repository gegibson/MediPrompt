export type WizardCtaContext = {
  authLoading: boolean;
  profileLoading: boolean;
  isConfirmingSubscription: boolean;
  isCreatingCheckout: boolean;
  isSubscriber: boolean;
  freePreviewUsed: boolean;
  isEmergencyStop: boolean;
  hasTemplate: boolean;
  hasQuestions: boolean;
  isFlowComplete: boolean;
  isOnLastQuestion: boolean;
};

export const deriveCallToActionLabel = ({
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
}: WizardCtaContext): string => {
  if (authLoading || profileLoading) {
    return "Checking access...";
  }

  if (isConfirmingSubscription) {
    return "Unlocking subscription...";
  }

  if (isCreatingCheckout) {
    return "Opening Stripe...";
  }

  if (!isSubscriber && freePreviewUsed) {
    return "Subscribe to unlock";
  }

  if (isEmergencyStop) {
    return "Emergency detected";
  }

  if (!hasTemplate || !hasQuestions) {
    return "Start triage";
  }

  if (isFlowComplete) {
    return "Update triage result";
  }

  return isOnLastQuestion
    ? "Generate my tailored triage result"
    : "Next question";
};

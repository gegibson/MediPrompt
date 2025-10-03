"use client";

import { useState } from "react";

type CopyPromptButtonProps = {
  text: string;
  onCopy?: () => void;
};

export function CopyPromptButton({ text, onCopy }: CopyPromptButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy prompt", error);
    }
  };

  const baseClasses =
    "inline-flex items-center gap-2 rounded-full px-5 py-3 text-sm font-semibold shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
  const stateClasses = copied
    ? "border border-[var(--color-success)] bg-white text-[var(--color-success)] focus-visible:outline-[var(--color-success)]"
    : "bg-white text-[var(--color-primary)] focus-visible:outline-white hover:bg-white/90";

  return (
    <button type="button" onClick={handleCopy} className={`${baseClasses} ${stateClasses}`}>
      {copied ? (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="m5.5 12.5 4 4 9-9"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      ) : (
        <svg
          className="h-4 w-4"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <rect
            x="9"
            y="9"
            width="12"
            height="12"
            rx="2"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          <path
            d="M5 15V5a2 2 0 0 1 2-2h10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

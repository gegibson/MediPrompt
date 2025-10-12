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

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`btn-primary ${copied ? "bg-[var(--color-accent-hover)]" : ""}`.trim()}>
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

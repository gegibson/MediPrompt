"use client";

import { useState } from "react";

import { BrandIcon } from "@/components/ui/BrandIcon";

type SharePromptButtonProps = {
  url: string;
};

export function SharePromptButton({ url }: SharePromptButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy share link", error);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-teal)] ${
        copied
          ? "border-[var(--brand-teal)] bg-white/90 text-[var(--brand-teal)]"
          : "border-[var(--ww-outline)]/25 bg-white/85 text-[var(--brand-teal)] hover:border-[var(--brand-teal)]/40 hover:bg-white"
      }`}
    >
      <BrandIcon
        name={copied ? "check" : "leaf"}
        size={18}
        style={{ color: "currentColor" }}
        aria-hidden="true"
      />
      {copied ? "Link Copied" : "Copy Link"}
    </button>
  );
}

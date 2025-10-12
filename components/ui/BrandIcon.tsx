"use client";

import type { SVGProps } from "react";

const SPRITE_PATH = "/brand/icons.svg";

const ICON_SYMBOLS = {
  heart: "ic-heart-24",
  cross: "ic-cross-24",
  leaf: "ic-leaf-24",
  pill: "ic-pill-24",
  bandage: "ic-bandage-24",
  syringe: "ic-syringe-24",
  thermometer: "ic-thermometer-24",
  stethoscope: "ic-stethoscope-24",
  check: "ic-check-24",
  ambulance: "ic-ambulance-24",
  clipboard: "ic-clipboard-24",
} as const;

export type BrandIconName = keyof typeof ICON_SYMBOLS;

export type BrandIconProps = Omit<SVGProps<SVGSVGElement>, "viewBox"> & {
  name: BrandIconName;
  label?: string;
  size?: number;
};

export function BrandIcon({
  name,
  label,
  size = 24,
  className,
  ...props
}: BrandIconProps) {
  const symbolId = ICON_SYMBOLS[name];

  if (!symbolId) {
    return null;
  }

  const accessibleProps = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": "true" as const };

  const symbolHref = `${SPRITE_PATH}#${symbolId}`;

  return (
    <svg
      width={size}
      height={size}
      className={["icon", className].filter(Boolean).join(" ")}
      focusable="false"
      {...accessibleProps}
      {...props}
    >
      <use href={symbolHref} xlinkHref={symbolHref} />
    </svg>
  );
}

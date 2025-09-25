const DEFAULT_SCRIPT_SRC = "https://plausible.io/js/script.js";

const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN?.trim() ?? "";
const scriptSrc = process.env.NEXT_PUBLIC_PLAUSIBLE_SCRIPT_SRC?.trim();

export const PLAUSIBLE_DOMAIN = domain;
export const PLAUSIBLE_SCRIPT_SRC = scriptSrc && scriptSrc.length > 0 ? scriptSrc : DEFAULT_SCRIPT_SRC;
export const PLAUSIBLE_ENABLED = Boolean(domain);

export type PlausibleConfig = {
  enabled: boolean;
  domain: string;
  scriptSrc: string;
};

export function getPlausibleConfig(): PlausibleConfig {
  return {
    enabled: PLAUSIBLE_ENABLED,
    domain: PLAUSIBLE_DOMAIN,
    scriptSrc: PLAUSIBLE_SCRIPT_SRC,
  };
}

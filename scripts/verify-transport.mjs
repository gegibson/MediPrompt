#!/usr/bin/env node
/* eslint-disable no-console */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const configPath = join(root, "next.config.ts");

if (!existsSync(configPath)) {
  console.error("Could not find next.config.ts. Run this script from the web workspace root.");
  process.exit(1);
}

const source = readFileSync(configPath, "utf8");
const headerKeyPattern = /key:\s*["']Strict-Transport-Security["']/;
const expectedDirectives = "max-age=31536000; includeSubDomains; preload";
const headerValuePattern = new RegExp(
  `value:\\s*[\"\']${expectedDirectives.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}[\"\']`
);
const prodGuardPattern = /if\s*\(!IS_PROD\)[^{]*{[^}]*return\s*\[\s*\];?[^}]*}/;

if (!headerKeyPattern.test(source)) {
  console.error(
    "Strict-Transport-Security header is missing from next.config.ts securityHeaders."
  );
  process.exit(1);
}

if (!headerValuePattern.test(source)) {
  console.error(
    `Strict-Transport-Security directives should be exactly: ${expectedDirectives}`
  );
  process.exit(1);
}

if (!prodGuardPattern.test(source)) {
  console.warn(
    "Warning: HSTS headers appear to be applied outside the production guard. Ensure dev builds can still run."
  );
} else {
  console.log("Production guard detected for security headers (dev builds remain flexible).");
}

console.log(
  "Strict-Transport-Security header is configured with the recommended directives."
);

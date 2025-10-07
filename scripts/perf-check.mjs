#!/usr/bin/env node
import { rmSync, existsSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { spawn } from "node:child_process";

const root = process.cwd();
const nextBin = join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "next.cmd" : "next",
);

if (!existsSync(nextBin)) {
  console.error(
    "Could not find the Next.js binary. Did you run `npm install` in this workspace?",
  );
  process.exit(1);
}

const nextDir = join(root, ".next");
try {
  if (existsSync(nextDir)) {
    rmSync(nextDir, { recursive: true, force: true });
  }
} catch (error) {
  console.warn("Warning: unable to remove previous .next build output", error);
}

const runBuild = () => {
  return new Promise((resolve, reject) => {
    let stdout = "";
    let stderr = "";

    const build = spawn(nextBin, ["build"], {
      cwd: root,
      env: {
        ...process.env,
        NODE_ENV: "production",
        NEXT_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });

    build.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    build.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    const start = process.hrtime.bigint();
    build.on("close", (code) => {
      const end = process.hrtime.bigint();
      const durationMs = Number(end - start) / 1_000_000;
      if (code !== 0) {
        reject({ code, stdout, stderr });
        return;
      }
      resolve({ stdout, durationMs });
    });

    build.on("error", (error) => {
      reject({ code: 1, stdout, stderr: error.message });
    });
  });
};

function parseSizeToKb(value) {
  const trimmed = value.trim();
  const match = trimmed.match(/([0-9.]+)\s*(B|kB|MB)/i);
  if (!match) {
    return NaN;
  }
  const amount = Number.parseFloat(match[1]);
  const unit = match[2].toLowerCase();
  if (Number.isNaN(amount)) {
    return NaN;
  }
  switch (unit) {
    case "b":
      return amount / 1024;
    case "kb":
      return amount;
    case "mb":
      return amount * 1024;
    default:
      return NaN;
  }
}

function parseBuildOutput(stdout) {
  const lines = stdout.split(/\r?\n/);
  const routeRegex = /[┌├└] \s*[○ƒλ] \s*(\S+)\s+([0-9.]+\s*(?:B|kB|MB))\s+([0-9.]+\s*(?:B|kB|MB))/;
  const routes = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\u001b\[[0-9;]*m/g, "");
    const match = routeRegex.exec(line);
    if (match) {
      routes.push({
        route: match[1],
        sizeKb: parseSizeToKb(match[2]),
        firstLoadKb: parseSizeToKb(match[3]),
      });
    }
  }

  const sharedMatch = stdout.match(
    /\+ First Load JS shared by all\s+([0-9.]+\s*(?:B|kB|MB))/,
  );
  const sharedFirstLoadKb = sharedMatch ? parseSizeToKb(sharedMatch[1]) : NaN;

  return { routes, sharedFirstLoadKb };
}

function evaluateMetrics({ routes, sharedFirstLoadKb, durationMs }) {
  const durationSeconds = durationMs / 1000;
  const maxBuildSeconds = Number.parseFloat(
    process.env.MP_MAX_BUILD_SECONDS ?? "60",
  );
  const maxSharedFirstLoadKb = Number.parseFloat(
    process.env.MP_MAX_SHARED_FIRST_LOAD_KB ?? "180",
  );
  const maxRouteFirstLoadKb = Number.parseFloat(
    process.env.MP_MAX_ROUTE_FIRST_LOAD_KB ?? "220",
  );

  let largestRouteFirstLoadKb = 0;
  let largestRoute = "";

  for (const route of routes) {
    if (route.firstLoadKb > largestRouteFirstLoadKb) {
      largestRouteFirstLoadKb = route.firstLoadKb;
      largestRoute = route.route;
    }
  }

  const messages = [];
  let hasFailure = false;

  messages.push(
    `Build duration: ${durationSeconds.toFixed(2)}s (limit ${maxBuildSeconds}s)`,
  );
  if (durationSeconds > maxBuildSeconds) {
    hasFailure = true;
    messages.push(
      `✗ Build duration exceeded threshold by ${(durationSeconds - maxBuildSeconds).toFixed(2)}s`,
    );
  } else {
    messages.push("✓ Build duration within limit");
  }

  if (!Number.isNaN(sharedFirstLoadKb)) {
    messages.push(
      `Shared First Load JS: ${sharedFirstLoadKb.toFixed(1)} kB (limit ${maxSharedFirstLoadKb} kB)`,
    );
    if (sharedFirstLoadKb > maxSharedFirstLoadKb) {
      hasFailure = true;
      messages.push(
        `✗ Shared First Load JS exceeded by ${(sharedFirstLoadKb - maxSharedFirstLoadKb).toFixed(1)} kB`,
      );
    } else {
      messages.push("✓ Shared First Load JS within limit");
    }
  } else {
    messages.push(
      "⚠️  Unable to parse shared First Load JS metric from build output.",
    );
  }

  if (routes.length > 0) {
    messages.push(
      `Largest route first-load: ${largestRouteFirstLoadKb.toFixed(1)} kB (${largestRoute}) (limit ${maxRouteFirstLoadKb} kB)`,
    );
    if (largestRouteFirstLoadKb > maxRouteFirstLoadKb) {
      hasFailure = true;
      messages.push(
        `✗ Route ${largestRoute} exceeded first-load budget by ${(largestRouteFirstLoadKb - maxRouteFirstLoadKb).toFixed(1)} kB`,
      );
    } else {
      messages.push("✓ Route-level first-load within limit");
    }
  } else {
    messages.push("⚠️  No route metrics detected in build output.");
  }

  return { hasFailure, messages, durationSeconds, sharedFirstLoadKb, routes };
}

(async () => {
  try {
    const { stdout, durationMs } = await runBuild();
    const parsed = parseBuildOutput(stdout);
    const evaluation = evaluateMetrics({ ...parsed, durationMs });

    for (const message of evaluation.messages) {
      console.log(message);
    }

    const metricsPath = join(root, ".next", "perf-metrics.json");
    const payload = {
      buildSeconds: evaluation.durationSeconds,
      sharedFirstLoadKb: parsed.sharedFirstLoadKb,
      routes: parsed.routes,
      generatedAt: new Date().toISOString(),
    };
    try {
      writeFileSync(metricsPath, `${JSON.stringify(payload, null, 2)}\n`);
      console.log(`Saved metrics snapshot to ${metricsPath}`);
    } catch (error) {
      console.warn("Warning: unable to persist perf metrics snapshot", error);
    }

    if (evaluation.hasFailure) {
      process.exit(1);
    }
  } catch (error) {
    if (error && typeof error === "object" && "stdout" in error) {
      console.error("Next.js build failed while collecting metrics.\n");
      if (error.stdout) console.error(String(error.stdout));
      if (error.stderr) console.error(String(error.stderr));
      process.exit("code" in error && typeof error.code === "number" ? error.code : 1);
    }
    console.error(error);
    process.exit(1);
  } finally {
    try {
      if (
        process.env.MP_KEEP_BUILD_OUTPUT !== "1" &&
        existsSync(nextDir)
      ) {
        rmSync(nextDir, { recursive: true, force: true });
      }
    } catch (cleanupError) {
      console.warn("Warning: unable to clean up .next directory", cleanupError);
    }
  }
})();

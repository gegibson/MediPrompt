import type { NextConfig } from "next";

const allowedDevOrigins = process.env.NEXT_DEV_ALLOWED_ORIGINS?.split(",")
  .map((origin) => origin.trim())
  .filter((origin) => origin.length > 0);

const nextConfig: NextConfig = {
  allowedDevOrigins: allowedDevOrigins && allowedDevOrigins.length > 0 ? allowedDevOrigins : undefined,
};

export default nextConfig;

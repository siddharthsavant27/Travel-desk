import type { NextConfig } from "next";
import { browserSecurityHeaders } from "./src/lib/security-headers";

const nextConfig: NextConfig = {
  distDir: process.env.TRAVELDESK_TEST_RUN === "true" ? ".next-test" : ".next",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: browserSecurityHeaders }];
  },
};

export default nextConfig;

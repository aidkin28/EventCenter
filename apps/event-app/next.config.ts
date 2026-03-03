import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["common"],
  serverExternalPackages: ["pg"],
};

export default nextConfig;

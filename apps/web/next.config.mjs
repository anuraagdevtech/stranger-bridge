/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Lets Next transpile the workspace package's TS source directly instead
  // of requiring packages/shared to be pre-built to JS.
  transpilePackages: ["@stranger-bridge/shared"],
};

export default nextConfig;

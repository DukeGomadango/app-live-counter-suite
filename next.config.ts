import type { NextConfig } from "next";

/** 静的ホスティング向け。リダイレクト・セキュリティヘッダーは vercel.json 等で付与する。 */
const nextConfig: NextConfig = {
  output: "export",
};

export default nextConfig;

import type { NextConfig } from "next";

/** 静的ホスティング向け。リダイレクト・セキュリティヘッダーは vercel.json 等で付与する。 */
const nextConfig: NextConfig = {
  output: "export",
  env: {
    NEXT_PUBLIC_ENABLE_GACHA_INTEGRATION:
      process.env.NEXT_PUBLIC_ENABLE_GACHA_INTEGRATION ?? "",
  },
};

export default nextConfig;

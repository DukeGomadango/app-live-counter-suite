/**
 * Playwright 用のツール path 一覧（`src/lib/tools.ts` の TOOLS 順と一致させる）。
 * ズレは `src/lib/routes-contract.test.ts` で検知する。
 */
export const E2E_MIRROR_TOOL_PATHS = [
  "/counter",
  "/flowchart",
  "/panel",
  "/calculator",
  "/clock",
  "/split",
  "/gacha",
  "/roulette",
  "/slot",
] as const;

export const E2E_STATIC_EXTRA_PATHS = ["/", "/privacy-policy", "/terms", "/gatcha", "/admin"] as const;

export function allSmokePaths(): string[] {
  return [...new Set<string>([...E2E_STATIC_EXTRA_PATHS, ...E2E_MIRROR_TOOL_PATHS])];
}

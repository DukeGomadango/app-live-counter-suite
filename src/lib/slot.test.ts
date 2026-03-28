import { describe, it, expect, vi } from "vitest";
import {
  createDefaultSymbols,
  resolveStrip,
  normalizePaylines,
  checkPaylines,
  pickSymbolByWeight,
  type SlotSymbol,
} from "./slot";

describe("resolveStrip", () => {
  const master: SlotSymbol[] = [
    { id: "a", label: "A", weight: 1, payoutMultiplier: 1, role: "small" },
    { id: "b", label: "B", weight: 1, payoutMultiplier: 1, role: "small" },
  ];

  it("maps ids to symbols", () => {
    const out = resolveStrip(["a", "b", "a"], master);
    expect(out.map((s) => s.id)).toEqual(["a", "b", "a"]);
  });

  it("uses fallback for unknown id", () => {
    const out = resolveStrip(["x"], master);
    expect(out[0]!.id).toBe("a");
  });
});

describe("normalizePaylines", () => {
  it("defaults to single center line", () => {
    expect(normalizePaylines(undefined, 3, 3)).toEqual([[1, 1, 1]]);
  });

  it("pads short lines", () => {
    expect(normalizePaylines([[0, 0]], 3, 3)).toEqual([[0, 0, 1]]);
  });
});

describe("checkPaylines", () => {
  const symbols = createDefaultSymbols();
  const strips: SlotSymbol[][] = [
    [symbols[0]!, symbols[1]!, symbols[2]!],
    [symbols[0]!, symbols[1]!, symbols[2]!],
    [symbols[0]!, symbols[1]!, symbols[2]!],
  ];

  it("detects win when all reels show same symbol index", () => {
    const reelResults = [0, 0, 0];
    const res = checkPaylines(reelResults, strips, [[1, 1, 1]], 3);
    expect(res.win).toBe(true);
    expect(res.multiplier).toBeGreaterThan(0);
  });

  it("no win when symbols differ", () => {
    const reelResults = [0, 1, 2];
    const res = checkPaylines(reelResults, strips, [[1, 1, 1]], 3);
    expect(res.win).toBe(false);
  });
});

describe("pickSymbolByWeight", () => {
  it("returns 0 when no symbols", () => {
    expect(pickSymbolByWeight([])).toBe(0);
  });

  it("is deterministic when Math.random is fixed", () => {
    const symbols: SlotSymbol[] = [
      { id: "a", label: "A", weight: 1, payoutMultiplier: 1, role: "small" },
      { id: "b", label: "B", weight: 1, payoutMultiplier: 1, role: "small" },
    ];
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.1);
    const idx = pickSymbolByWeight(symbols);
    expect(idx).toBeGreaterThanOrEqual(0);
    expect(idx).toBeLessThan(symbols.length);
    spy.mockRestore();
  });
});

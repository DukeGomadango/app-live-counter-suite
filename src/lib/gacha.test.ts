import { describe, it, expect } from "vitest";
import {
  calculateProbabilities,
  getRarityProbabilities,
  getGlobalProbabilities,
  distributePercentagesProportionally,
  type GachaItem,
  type RarityTier
} from "./gacha";

const rarities: RarityTier[] = [
  { id: "n", name: "N", color: "#999", glowColor: "#999", bgColor: "#333", sortOrder: 1, defaultWeight: 70 },
  { id: "sr", name: "SR", color: "#gold", glowColor: "#gold", bgColor: "#222", sortOrder: 2, defaultWeight: 30 },
];

describe("calculateProbabilities (within-rarity)", () => {
  it("returns empty map when no items", () => {
    const items: GachaItem[] = [];
    expect(calculateProbabilities(items).size).toBe(0);
  });

  it("returns empty map when total weight is 0", () => {
    const items: GachaItem[] = [
      { id: "a", name: "A", rarityId: "n", weight: 0 },
      { id: "b", name: "B", rarityId: "n", weight: 0 },
    ];
    expect(calculateProbabilities(items).size).toBe(0);
  });

  it("calculates within-rarity probabilities", () => {
    const items: GachaItem[] = [
      { id: "a", name: "A", rarityId: "n", weight: 3 },
      { id: "b", name: "B", rarityId: "n", weight: 1 },
      { id: "c", name: "C", rarityId: "sr", weight: 1 },
    ];
    const m = calculateProbabilities(items);
    // Within N: A = 3/4 = 75%, B = 1/4 = 25%
    expect(m.get("a")).toBeCloseTo(75);
    expect(m.get("b")).toBeCloseTo(25);
    // Within SR: C = 1/1 = 100%
    expect(m.get("c")).toBeCloseTo(100);
  });
});

describe("getRarityProbabilities (defaultWeight-based)", () => {
  it("uses defaultWeight for rarity probabilities", () => {
    const items: GachaItem[] = [
      { id: "a", name: "A", rarityId: "n", weight: 10 },
      { id: "b", name: "B", rarityId: "sr", weight: 80 },
    ];
    const m = getRarityProbabilities(items, rarities);
    // N: 70/(70+30) = 70%, SR: 30/(70+30) = 30%
    expect(m.get("n")).toBeCloseTo(70);
    expect(m.get("sr")).toBeCloseTo(30);
  });

  it("excludes rarities without items", () => {
    const items: GachaItem[] = [
      { id: "a", name: "A", rarityId: "n", weight: 10 },
    ];
    const m = getRarityProbabilities(items, rarities);
    // Only N has items: 70/70 = 100%
    expect(m.get("n")).toBeCloseTo(100);
    expect(m.get("sr")).toBe(0);
  });
});

describe("getGlobalProbabilities", () => {
  it("calculates global probability = rarity% x within-rarity%", () => {
    const items: GachaItem[] = [
      { id: "a", name: "A", rarityId: "n", weight: 3 },
      { id: "b", name: "B", rarityId: "n", weight: 1 },
      { id: "c", name: "C", rarityId: "sr", weight: 1 },
    ];
    const m = getGlobalProbabilities(items, rarities);
    // N = 70%, within N: A = 75% → global A = 0.70 * 0.75 = 52.5%
    expect(m.get("a")).toBeCloseTo(52.5);
    // N = 70%, within N: B = 25% → global B = 0.70 * 0.25 = 17.5%
    expect(m.get("b")).toBeCloseTo(17.5);
    // SR = 30%, within SR: C = 100% → global C = 0.30 * 1.0 = 30%
    expect(m.get("c")).toBeCloseTo(30);
  });
});

describe("distributePercentagesProportionally", () => {
  it("adjusts percentages without lock", () => {
    const items = [
      { id: "a", value: 50 },
      { id: "b", value: 30 },
      { id: "c", value: 20 },
    ];
    // Set 'a' to 40, others are scaled up proportionally (original ratio b:c was 30:20 = 3:2)
    // Remaining = 60. New 'b' = 60 * 3/5 = 36. New 'c' = 60 * 2/5 = 24.
    const res = distributePercentagesProportionally(items, new Set(), "a", 40);
    expect(res.find(it => it.id === "a")?.value).toBe(40);
    expect(res.find(it => it.id === "b")?.value).toBe(36);
    expect(res.find(it => it.id === "c")?.value).toBe(24);
  });

  it("respects lock state on items", () => {
    const items = [
      { id: "a", value: 50 },
      { id: "b", value: 30 },
      { id: "c", value: 20 },
    ];
    // Lock 'b' (value 30). Set 'a' to 40.
    // Total locked = 40 + 30 = 70. Remaining for 'c' = 30.
    const res = distributePercentagesProportionally(items, new Set(["b"]), "a", 40);
    expect(res.find(it => it.id === "a")?.value).toBe(40);
    expect(res.find(it => it.id === "b")?.value).toBe(30);
    expect(res.find(it => it.id === "c")?.value).toBe(30);
  });

  it("strictly protects locked values by clamping target values", () => {
    const items = [
      { id: "a", value: 50 },
      { id: "b", value: 60 },
      { id: "c", value: 10 },
    ];
    // Lock 'b' (value 60). Try to set 'a' to 60.
    // Max allowed for 'a' is 100 - 60 = 40.
    // 'a' must be clamped to 40. Locked 'b' must remain 60. Unlocked 'c' becomes 0.
    const res = distributePercentagesProportionally(items, new Set(["b"]), "a", 60);
    expect(res.find(it => it.id === "a")?.value).toBe(40);
    expect(res.find(it => it.id === "b")?.value).toBe(60);
    expect(res.find(it => it.id === "c")?.value).toBe(0);
  });

  it("handles multiple locks and clamps target value to remaining percentage", () => {
    const items = [
      { id: "a", value: 20 },
      { id: "b", value: 30 },
      { id: "c", value: 40 },
      { id: "d", value: 10 },
    ];
    // Lock 'b' (30) and 'c' (40) -> sum of locked = 70.
    // Set target 'a' to 50.
    // Max allowed for 'a' is 100 - 70 = 30.
    // 'a' must be clamped to 30. Locked 'b' (30) and 'c' (40) must be untouched.
    // Unlocked 'd' becomes 0.
    const res = distributePercentagesProportionally(items, new Set(["b", "c"]), "a", 50);
    expect(res.find(it => it.id === "a")?.value).toBe(30);
    expect(res.find(it => it.id === "b")?.value).toBe(30);
    expect(res.find(it => it.id === "c")?.value).toBe(40);
    expect(res.find(it => it.id === "d")?.value).toBe(0);
  });
});

import { describe, it, expect } from "vitest";
import { calculateProbabilities, getRarityProbabilities, type GachaItem, type RarityTier } from "./gacha";

const rarities: RarityTier[] = [
  { id: "n", name: "N", color: "#999", glowColor: "#999", bgColor: "#333", sortOrder: 1 },
  { id: "sr", name: "SR", color: "#gold", glowColor: "#gold", bgColor: "#222", sortOrder: 2 },
];

describe("calculateProbabilities", () => {
  it("returns empty map when total weight is 0", () => {
    const items: GachaItem[] = [
      { id: "a", name: "A", rarityId: "n", weight: 0 },
      { id: "b", name: "B", rarityId: "n", weight: 0 },
    ];
    expect(calculateProbabilities(items).size).toBe(0);
  });

  it("splits by weight", () => {
    const items: GachaItem[] = [
      { id: "a", name: "A", rarityId: "n", weight: 25 },
      { id: "b", name: "B", rarityId: "sr", weight: 75 },
    ];
    const m = calculateProbabilities(items);
    expect(m.get("a")).toBeCloseTo(25);
    expect(m.get("b")).toBeCloseTo(75);
  });
});

describe("getRarityProbabilities", () => {
  it("aggregates by rarity", () => {
    const items: GachaItem[] = [
      { id: "a", name: "A", rarityId: "n", weight: 10 },
      { id: "b", name: "B", rarityId: "n", weight: 10 },
      { id: "c", name: "C", rarityId: "sr", weight: 80 },
    ];
    const m = getRarityProbabilities(items, rarities);
    expect(m.get("n")).toBeCloseTo(20);
    expect(m.get("sr")).toBeCloseTo(80);
  });
});

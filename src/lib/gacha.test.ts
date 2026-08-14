import { describe, it, expect } from "vitest";
import {
  calculateProbabilities,
  getRarityProbabilities,
  getGlobalProbabilities,
  distributePercentagesProportionally,
  performGachaPull,
  createDefaultPlayer,
  isPoolSoldOut,
  isItemSoldOut,
  sanitizeItemLimits,
  refillItemStock,
  type GachaItem,
  type RarityTier,
  type GachaPool,
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

describe("performGachaPull with item limits", () => {
  const pool: GachaPool = {
    id: "test-pool-limits",
    conceptName: "Limit Test Pool",
    rarities: [
      { id: "r1", name: "Rarity 1", color: "#fff", glowColor: "#fff", bgColor: "#000", sortOrder: 1, defaultWeight: 100 },
    ],
    items: [
      { id: "item-limited-global", name: "Global Limit 2", rarityId: "r1", weight: 50, maxGlobalCount: 2 },
      { id: "item-limited-player", name: "Per Player Limit 1", rarityId: "r1", weight: 50, maxPerPlayerCount: 1 },
      { id: "item-unlimited", name: "Unlimited Item", rarityId: "r1", weight: 1 },
    ],
    pullCount: 1,
    pityEnabled: false,
    pityThreshold: 10,
    pityGuaranteedRarityId: "r1",
  };

  it("respects maxPerPlayerCount per player", () => {
    const player1 = createDefaultPlayer("Player 1");
    // Pull item-limited-player until it reaches limit of 1
    const poolSingleItem: import("./gacha").GachaPool = {
      ...pool,
      items: [{ id: "item-per-player", name: "Per Player Limit 1", rarityId: "r1", weight: 100, maxPerPlayerCount: 1 }],
    };

    const res1 = performGachaPull(poolSingleItem, 3, player1);
    // Even though count=3 requested, player1 can only get 1 item because maxPerPlayerCount=1
    expect(res1.results.length).toBe(1);
    expect(res1.updatedPlayer.poolStates[poolSingleItem.id]?.inventory?.["item-per-player"]?.count).toBe(1);

    // Player 2 should still be able to pull 1 item
    const player2 = createDefaultPlayer("Player 2");
    const res2 = performGachaPull(poolSingleItem, 1, player2, [res1.updatedPlayer, player2]);
    expect(res2.results.length).toBe(1);
  });

  it("respects maxGlobalCount across all players", () => {
    const poolGlobal: import("./gacha").GachaPool = {
      ...pool,
      items: [{ id: "item-global-2", name: "Global Limit 2", rarityId: "r1", weight: 100, maxGlobalCount: 2 }],
    };

    const player1 = createDefaultPlayer("P1");
    const res1 = performGachaPull(poolGlobal, 2, player1);
    expect(res1.results.length).toBe(2);

    const player2 = createDefaultPlayer("P2");
    const res2 = performGachaPull(poolGlobal, 2, player2, [res1.updatedPlayer, player2]);
    // Global limit reached (2 total drawn by P1), P2 should get 0 results
    expect(res2.results.length).toBe(0);
  });

  it("correctly identifies when a pool is sold out", () => {
    const poolLimited: import("./gacha").GachaPool = {
      ...pool,
      items: [{ id: "item-only-1", name: "Only 1 Item", rarityId: "r1", weight: 100, maxGlobalCount: 1 }],
    };

    const p1 = createDefaultPlayer("P1");
    expect(isPoolSoldOut(poolLimited, [p1], p1)).toBe(false);

    const res1 = performGachaPull(poolLimited, 1, p1);
    const updatedP1 = res1.updatedPlayer;

    expect(isItemSoldOut(poolLimited, poolLimited.items[0]!, [updatedP1], updatedP1)).toBe(true);
    expect(isPoolSoldOut(poolLimited, [updatedP1], updatedP1)).toBe(true);
  });

  it("sanitizes item limits and clamps player limit to global limit", () => {
    // maxPerPlayerCount > maxGlobalCount should be clamped
    const r1 = sanitizeItemLimits(10, 41);
    expect(r1.maxGlobalCount).toBe(10);
    expect(r1.maxPerPlayerCount).toBe(10);

    // maxPerPlayerCount <= maxGlobalCount remains intact
    const r2 = sanitizeItemLimits(10, 2);
    expect(r2.maxGlobalCount).toBe(10);
    expect(r2.maxPerPlayerCount).toBe(2);

    // invalid or <= 0 numbers become undefined
    const r3 = sanitizeItemLimits(0, -5);
    expect(r3.maxGlobalCount).toBeUndefined();
    expect(r3.maxPerPlayerCount).toBeUndefined();
  });
});

describe("refillItemStock", () => {
  it("adds stock refill offset for add mode", () => {
    const p1 = createDefaultPlayer("P1");
    p1.poolStates = {
      "pool-1": {
        totalPulls: 10,
        pityCounter: 0,
        pityReachCount: 0,
        inventory: { "item-1": { itemId: "item-1", count: 10 } },
      },
    };
    const pool: GachaPool = {
      id: "pool-1",
      conceptName: "Test",
      rarities: [],
      items: [{ id: "item-1", name: "Item 1", rarityId: "r1", weight: 1, maxGlobalCount: 10 }],
      pullCount: 1,
      pityEnabled: false,
      pityThreshold: 10,
      pityGuaranteedRarityId: "r1",
    };

    expect(isItemSoldOut(pool, pool.items[0]!, [p1])).toBe(true);

    const updatedPool = refillItemStock(pool, "item-1", "add", 5, [p1]);
    expect(updatedPool.stockRefillOffsets?.["item-1"]).toBe(5);
    expect(isItemSoldOut(updatedPool, updatedPool.items[0]!, [p1])).toBe(false);
  });

  it("resets stock refill offset for reset mode", () => {
    const p1 = createDefaultPlayer("P1");
    p1.poolStates = {
      "pool-1": {
        totalPulls: 10,
        pityCounter: 0,
        pityReachCount: 0,
        inventory: { "item-1": { itemId: "item-1", count: 10 } },
      },
    };
    const pool: GachaPool = {
      id: "pool-1",
      conceptName: "Test",
      rarities: [],
      items: [{ id: "item-1", name: "Item 1", rarityId: "r1", weight: 1, maxGlobalCount: 10 }],
      pullCount: 1,
      pityEnabled: false,
      pityThreshold: 10,
      pityGuaranteedRarityId: "r1",
    };

    const resetPool = refillItemStock(pool, "item-1", "reset", 0, [p1]);
    expect(resetPool.stockRefillOffsets?.["item-1"]).toBe(10);
    expect(isItemSoldOut(resetPool, resetPool.items[0]!, [p1])).toBe(false);
  });

  it("reduces stock in subtract mode and updates maxGlobalCount when specified", () => {
    const p1 = createDefaultPlayer("P1");
    p1.poolStates = {
      "pool-1": {
        totalPulls: 5,
        pityCounter: 0,
        pityReachCount: 0,
        inventory: { "item-1": { itemId: "item-1", count: 5 } },
      },
    };
    const pool: GachaPool = {
      id: "pool-1",
      conceptName: "Test",
      rarities: [],
      items: [{ id: "item-1", name: "Item 1", rarityId: "r1", weight: 1, maxGlobalCount: 10 }],
      pullCount: 1,
      pityEnabled: false,
      pityThreshold: 10,
      pityGuaranteedRarityId: "r1",
      stockRefillOffsets: { "item-1": 5 },
    };

    // Subtracted stock by 3 -> offset decreases from 5 to 2
    // New maxGlobalCount changed to 20
    const updatedPool = refillItemStock(pool, "item-1", "subtract", 3, [p1], 20);
    expect(updatedPool.stockRefillOffsets?.["item-1"]).toBe(2);
    expect(updatedPool.items[0]?.maxGlobalCount).toBe(20);
  });
});

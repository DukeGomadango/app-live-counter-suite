import { describe, it, expect } from "vitest";
import type { GachaPool } from "./gacha";
import {
    normalizeDistributionLabel,
    buildAutoMappingSuggestions,
    applyItemAssetMapping,
    matchItemIdForFileName,
} from "./gachaDistribution";
import type { ExternalAsset } from "./gachaDistribution";

const basePool: GachaPool = {
    id: "p1",
    conceptName: "test",
    rarities: [{ id: "r1", name: "N", color: "#999", glowColor: "#9999", bgColor: "#333", sortOrder: 1, defaultWeight: 100 }],
    items: [
        { id: "i1", name: "テスト 1.png", rarityId: "r1", weight: 100 },
        { id: "i2", name: "テスト 2.png", rarityId: "r1", weight: 100 },
        { id: "i3", name: "ああ", rarityId: "r1", weight: 100 },
    ],
};

const assets: ExternalAsset[] = [
    { id: "a1", label: null, displayName: "テスト 1.png", asset_url: null },
    { id: "a2", label: "テスト 2.png", asset_url: null },
    { id: "a3", label: "other.png", asset_url: null },
];

describe("normalizeDistributionLabel", () => {
    it("lowercases and strips extension", () => {
        expect(normalizeDistributionLabel("  Test.PNG ")).toBe("test");
    });
});

describe("buildAutoMappingSuggestions", () => {
    it("suggests exact display name matches only for unmapped items", () => {
        const suggestions = buildAutoMappingSuggestions(basePool, assets, { i1: "a1" });
        expect(suggestions).toHaveLength(1);
        expect(suggestions[0]?.itemId).toBe("i2");
        expect(suggestions[0]?.assetId).toBe("a2");
    });

    it("does not assign one asset twice", () => {
        const pool = { ...basePool, items: [{ id: "i1", name: "dup.png", rarityId: "r1", weight: 100 }, { id: "i2", name: "dup.png", rarityId: "r1", weight: 100 }] };
        const asts: ExternalAsset[] = [{ id: "a1", label: "dup.png", asset_url: null }];
        const suggestions = buildAutoMappingSuggestions(pool, asts, {});
        expect(suggestions).toHaveLength(1);
    });
});

describe("applyItemAssetMapping", () => {
    it("sets linkedAssetId from mapping record", () => {
        const next = applyItemAssetMapping(basePool, { i1: "a1", i3: "" });
        expect(next.items.find((it) => it.id === "i1")?.linkedAssetId).toBe("a1");
        expect(next.items.find((it) => it.id === "i3")?.linkedAssetId).toBeUndefined();
    });
});

describe("matchItemIdForFileName", () => {
    it("matches unmapped item by normalized file name", () => {
        expect(matchItemIdForFileName(basePool, "テスト 2.png", {})).toBe("i2");
    });
});

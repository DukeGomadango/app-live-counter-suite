import { afterEach, describe, expect, it, vi } from "vitest";

import type { GachaPool, IntegrationConfig, Player } from "./gacha";
import {
  buildGachaPlayerExternalTransactionId,
  deleteExternalSlot,
  issueClaimForPlayer,
  mergePlayerWithRecipientSlotResult,
} from "./gachaDistribution";

const baseConfig: IntegrationConfig = {
  apiBaseUrl: "https://share.example.test",
  integrationToken: "test-token",
};

const basePool: GachaPool = {
  id: "pool-1",
  conceptName: "test",
  linkedCampaignId: "camp-1",
  rarities: [{ id: "r1", name: "N", color: "#999", glowColor: "#999", bgColor: "#333", sortOrder: 1, defaultWeight: 100 }],
  items: [
    {
      id: "item-1",
      name: "景品A",
      rarityId: "r1",
      weight: 100,
      linkedAssetId: "asset-1",
    },
  ],
};

const basePlayer: Player = {
  id: "player-1",
  name: "プレイヤーA",
  linkedRecipientId: "recipient-1",
  results: [{ itemId: "item-1", itemName: "景品A", rarityId: "r1", resultId: "r-1", timestamp: 1 }],
  poolStates: {},
  totalPulls: 1,
  pityCounter: 0,
};

describe("buildGachaPlayerExternalTransactionId", () => {
  it("builds stable gacha-prefixed id", () => {
    expect(buildGachaPlayerExternalTransactionId("pool-1", "player-1")).toBe(
      "gacha-pool-1-player-player-1"
    );
  });
});

describe("mergePlayerWithRecipientSlotResult", () => {
  it("updates slot and recipient fields from API result", () => {
    const player: Player = {
      id: "p1",
      name: "A",
      results: [],
      poolStates: {},
      totalPulls: 0,
      pityCounter: 0,
    };
    const merged = mergePlayerWithRecipientSlotResult(
      player,
      {
        ok: true,
        slot_id: "slot-1",
        recipient_id: "recv-1",
        reception_url: "https://example.test/receive/t",
        delivery_mode: "reception",
      },
      "camp-1"
    );
    expect(merged.issuedSlotId).toBe("slot-1");
    expect(merged.linkedRecipientId).toBe("recv-1");
    expect(merged.issuedCampaignId).toBe("camp-1");
    expect(merged.issuedClaimUrl).toBeUndefined();
  });
});

describe("issueClaimForPlayer (reception response)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("parses reception_url and slot_id from API response", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            ok: true,
            slot_id: "slot-abc",
            claim_id: "claim-abc",
            recipient_id: "recipient-1",
            external_transaction_id: "gacha-pool-1-player-player-1",
            linked_asset_count: 1,
            delivery_mode: "reception",
            reception_url: "https://share.example.test/receive/token-xyz",
            slot_status: "ready",
            resolved_existing: true,
          }),
          { status: 200 }
        )
      )
    );

    const result = await issueClaimForPlayer(basePlayer, basePool, baseConfig);

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.slot_id).toBe("slot-abc");
    expect(result.reception_url).toBe("https://share.example.test/receive/token-xyz");
    expect(result.delivery_mode).toBe("reception");
    expect(result.resolved_existing).toBe(true);
    expect(result.claim_url).toBeUndefined();

    const fetchMock = vi.mocked(fetch);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/recipient-slots");
    expect(init.method).toBe("POST");
    const body = JSON.parse(String(init.body));
    expect(body.recipient_id).toBe("recipient-1");
    expect(body.external_transaction_id).toBe("gacha-pool-1-player-player-1");
  });

  it("returns API error for recipient_slot_conflict", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: "recipient_slot_conflict",
            message: "この名簿は既に別のガチャプレイヤーに紐づいています。",
          }),
          { status: 409 }
        )
      )
    );

    const result = await issueClaimForPlayer(basePlayer, basePool, baseConfig);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toBe("recipient_slot_conflict");
    expect(result.message).toContain("名簿");
  });
});

describe("deleteExternalSlot", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("calls DELETE with mode=detach by default", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    );

    const ok = await deleteExternalSlot("player-1", basePool, baseConfig);

    expect(ok).toBe(true);
    const fetchMock = vi.mocked(fetch);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("mode=detach");
    expect(url).toContain(
      `external_transaction_id=${encodeURIComponent("gacha-pool-1-player-player-1")}`
    );
    expect(init.method).toBe("DELETE");
  });
});

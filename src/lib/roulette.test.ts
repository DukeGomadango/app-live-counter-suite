import { describe, it, expect, vi } from "vitest";
import {
  createDefaultSlots,
  pickRandomIndex,
  slotsToItems,
  getSlotCenterAngleDeg,
  getWheelRotationForNeedle,
  MAX_SLOTS,
  getHighLowZone,
  getHighLowCenterIndex,
} from "./roulette";


describe("createDefaultSlots", () => {
  it("clamps to MAX_SLOTS", () => {
    const s = createDefaultSlots(9999);
    expect(s.length).toBe(MAX_SLOTS);
  });

  it("returns numbered labels", () => {
    expect(createDefaultSlots(3)).toEqual(["1", "2", "3"]);
  });
});

describe("pickRandomIndex", () => {
  it("returns 0 for empty", () => {
    expect(pickRandomIndex(0)).toBe(0);
    expect(pickRandomIndex(-1)).toBe(0);
  });

  it("respects Math.random", () => {
    const spy = vi.spyOn(Math, "random").mockReturnValue(0.99);
    expect(pickRandomIndex(10)).toBe(9);
    spy.mockRestore();
  });
});

describe("slotsToItems", () => {
  it("assigns ids", () => {
    const items = slotsToItems(["a", "b"]);
    expect(items.map((x) => x.id)).toEqual(["slot-0", "slot-1"]);
    expect(items.map((x) => x.label)).toEqual(["a", "b"]);
  });
});

describe("geometry helpers", () => {
  it("getSlotCenterAngleDeg is finite", () => {
    expect(Number.isFinite(getSlotCenterAngleDeg(0, 30))).toBe(true);
  });

  it("getWheelRotationForNeedle is finite and respects offset", () => {
    expect(Number.isFinite(getWheelRotationForNeedle(2, 45))).toBe(true);
    
    const baseRotation = getWheelRotationForNeedle(0, 30, 0);
    const offsetRotation = getWheelRotationForNeedle(0, 30, 0.2);
    
    expect(baseRotation).not.toBe(offsetRotation);
  });
});

describe("high/low helpers", () => {


  it("identifies high, low, 6pin zones correctly for odd slot counts", () => {
    // For 13 slots:
    // center index is Math.floor(13 / 2) - 1 = 5 (value "6")
    // index < 5 is low (0, 1, 2, 3, 4)
    // index == 5 is 6pin
    // index > 5 is high (6, 7, 8, 9, 10, 11, 12)
    expect(getHighLowZone(0, 13)).toBe("low");
    expect(getHighLowZone(4, 13)).toBe("low");
    expect(getHighLowZone(5, 13)).toBe("6pin");
    expect(getHighLowZone(6, 13)).toBe("high");
    expect(getHighLowZone(12, 13)).toBe("high");
  });

  it("identifies high, low, 6pin zones correctly for even slot counts", () => {
    // For 14 slots:
    // center0 is 14 / 2 - 1 = 6
    // center1 is 14 / 2 = 7
    // index < 6 is low
    // index == 6 or 7 is 6pin
    // index > 7 is high
    expect(getHighLowZone(0, 14)).toBe("low");
    expect(getHighLowZone(5, 14)).toBe("low");
    expect(getHighLowZone(6, 14)).toBe("6pin");
    expect(getHighLowZone(7, 14)).toBe("6pin");
    expect(getHighLowZone(8, 14)).toBe("high");
    expect(getHighLowZone(13, 14)).toBe("high");
  });

  it("returns null for invalid slot counts or indices", () => {
    expect(getHighLowZone(-1, 13)).toBeNull();
    expect(getHighLowZone(13, 13)).toBeNull();
    expect(getHighLowZone(5, 0)).toBeNull();
  });

  it("determines high-low center index correctly", () => {
    expect(getHighLowCenterIndex(13)).toBe(5);
    expect(getHighLowCenterIndex(14)).toBe(6);
    expect(getHighLowCenterIndex(1)).toBeNull();
  });
});


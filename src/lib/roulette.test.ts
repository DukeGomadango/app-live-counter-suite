import { describe, it, expect, vi } from "vitest";
import {
  createDefaultSlots,
  pickRandomIndex,
  slotsToItems,
  getSlotCenterAngleDeg,
  getWheelRotationForNeedle,
  MAX_SLOTS,
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

  it("getWheelRotationForNeedle is finite", () => {
    expect(Number.isFinite(getWheelRotationForNeedle(2, 45))).toBe(true);
  });
});

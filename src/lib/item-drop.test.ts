import { describe, expect, it } from "vitest";
import { selectWeightedRandom, shouldDrop } from "@/lib/item-drop";

describe("item-drop", () => {
  it("should not drop when score is below 5", () => {
    expect(shouldDrop(4.99, () => 0)).toBe(false);
  });

  it("returns null when no candidates", () => {
    expect(selectWeightedRandom([])).toBeNull();
  });

  it("follows weighted distribution within tolerance", () => {
    const candidates = [
      { id: "a", dropWeight: 1 },
      { id: "b", dropWeight: 3 },
    ];

    let countA = 0;
    let countB = 0;

    for (let i = 0; i < 1000; i += 1) {
      const selected = selectWeightedRandom(candidates);
      if (selected?.id === "a") {
        countA += 1;
      }
      if (selected?.id === "b") {
        countB += 1;
      }
    }

    const rateA = countA / 1000;
    const rateB = countB / 1000;

    expect(rateA).toBeGreaterThan(0.2);
    expect(rateA).toBeLessThan(0.3);
    expect(rateB).toBeGreaterThan(0.7);
    expect(rateB).toBeLessThan(0.8);
  });
});

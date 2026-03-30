import { describe, expect, it } from "vitest";
import {
  calculateRawSessionScore,
  calculateXpFromRawScore,
} from "@/lib/scoring";

describe("scoring", () => {
  it("returns 0 score for 0 seconds", () => {
    expect(calculateRawSessionScore(0, 0)).toBe(0);
  });

  it("returns 0 score for 9m59s", () => {
    expect(calculateRawSessionScore(9 * 60 + 59, 0)).toBe(0);
  });

  it("returns positive score at 10 minutes", () => {
    expect(calculateRawSessionScore(10 * 60, 0)).toBeGreaterThan(0);
  });

  it("applies highest multipliers around 52m focus and 7m rest", () => {
    expect(calculateRawSessionScore(52 * 60, 7 * 60)).toBeCloseTo(52 * 1.15 * 1.05, 6);
  });

  it("applies long-session penalty at 121 minutes", () => {
    expect(calculateRawSessionScore(121 * 60, 0)).toBeCloseTo(121 * 0.35 * 0.95, 6);
  });

  it("floors xp from raw score", () => {
    expect(calculateXpFromRawScore(12.99)).toBe(12);
  });
});

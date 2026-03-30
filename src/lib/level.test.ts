import { describe, expect, it } from "vitest";
import {
  calculateLevel,
  calculateLevelProgress,
  secondsForLevel,
} from "@/lib/level";

describe("level", () => {
  it("returns level 1 at zero seconds", () => {
    expect(calculateLevel(0)).toBe(1);
  });

  it("is around level 70 at 1000h", () => {
    expect(calculateLevel(3_600_000)).toBeGreaterThanOrEqual(69);
    expect(calculateLevel(3_600_000)).toBeLessThanOrEqual(71);
  });

  it("is around level 100 at 5000h", () => {
    expect(calculateLevel(18_000_000)).toBeGreaterThanOrEqual(99);
    expect(calculateLevel(18_000_000)).toBeLessThanOrEqual(101);
  });

  it("returns 0 for secondsForLevel(1)", () => {
    expect(secondsForLevel(1)).toBe(0);
  });

  it("secondsForLevel is strictly increasing", () => {
    expect(secondsForLevel(10)).toBeLessThan(secondsForLevel(11));
  });

  it("level progress rate is between 0 and 1", () => {
    const progress = calculateLevelProgress(120_000);
    expect(progress.progressRate).toBeGreaterThanOrEqual(0);
    expect(progress.progressRate).toBeLessThanOrEqual(1);
  });
});

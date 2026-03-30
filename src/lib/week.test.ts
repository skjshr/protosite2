import { describe, expect, it } from "vitest";
import { getCurrentWeekEndUtc, getCurrentWeekStartUtc } from "@/lib/week";

describe("week", () => {
  it("returns Monday 00:00:00 UTC when input is Monday", () => {
    const monday = new Date("2026-03-30T15:45:10.000Z");
    expect(getCurrentWeekStartUtc(monday).toISOString()).toBe("2026-03-30T00:00:00.000Z");
  });

  it("returns previous Monday for Sunday input", () => {
    const sunday = new Date("2026-04-05T23:59:59.000Z");
    expect(getCurrentWeekStartUtc(sunday).toISOString()).toBe("2026-03-30T00:00:00.000Z");
  });

  it("returns week end as +7 days", () => {
    const weekStart = new Date("2026-03-30T00:00:00.000Z");
    expect(getCurrentWeekEndUtc(weekStart).toISOString()).toBe("2026-04-06T00:00:00.000Z");
  });
});

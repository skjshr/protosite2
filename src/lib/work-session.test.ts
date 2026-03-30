import { describe, expect, it } from "vitest";
import {
  calculateCurrentEffectiveSeconds,
  createWorkSession,
  endWorkSession,
  pauseWorkSession,
  resumeWorkSession,
} from "@/lib/work-session";

describe("work-session", () => {
  it("createWorkSession starts with working status", () => {
    const now = new Date("2026-03-30T10:00:00.000Z");
    const session = createWorkSession("field-1", "英語", now);

    expect(session.status).toBe("working");
    expect(session.startedAt).toBe(now.toISOString());
    expect(session.pauseAccumulatedSeconds).toBe(0);
  });

  it("pauseWorkSession sets paused status and pausedAt", () => {
    const startedAt = new Date("2026-03-30T10:00:00.000Z");
    const pausedAt = new Date("2026-03-30T10:10:00.000Z");
    const session = createWorkSession("field-1", "英語", startedAt);
    const paused = pauseWorkSession(session, pausedAt);

    expect(paused.status).toBe("paused");
    expect(paused.pausedAt).toBe(pausedAt.toISOString());
  });

  it("resumeWorkSession adds paused duration", () => {
    const startedAt = new Date("2026-03-30T10:00:00.000Z");
    const pausedAt = new Date("2026-03-30T10:10:00.000Z");
    const resumedAt = new Date("2026-03-30T10:15:30.000Z");
    const session = createWorkSession("field-1", "英語", startedAt);
    const paused = pauseWorkSession(session, pausedAt);
    const resumed = resumeWorkSession(paused, resumedAt);

    expect(resumed.status).toBe("working");
    expect(resumed.pauseAccumulatedSeconds).toBe(330);
    expect(resumed.pausedAt).toBeNull();
  });

  it("calculateCurrentEffectiveSeconds while working", () => {
    const startedAt = new Date("2026-03-30T10:00:00.000Z");
    const now = new Date("2026-03-30T10:20:00.000Z");
    const session = {
      ...createWorkSession("field-1", "英語", startedAt),
      pauseAccumulatedSeconds: 120,
    };

    expect(calculateCurrentEffectiveSeconds(session, now)).toBe(1080);
  });

  it("calculateCurrentEffectiveSeconds while paused", () => {
    const startedAt = new Date("2026-03-30T10:00:00.000Z");
    const pausedAt = new Date("2026-03-30T10:20:00.000Z");
    const session = {
      ...pauseWorkSession(createWorkSession("field-1", "英語", startedAt), pausedAt),
      pauseAccumulatedSeconds: 120,
    };

    expect(calculateCurrentEffectiveSeconds(session, new Date("2026-03-30T10:40:00.000Z"))).toBe(1080);
  });

  it("endWorkSession calculates effective seconds", () => {
    const startedAt = new Date("2026-03-30T10:00:00.000Z");
    const pausedAt = new Date("2026-03-30T10:30:00.000Z");
    const endedAt = new Date("2026-03-30T10:40:00.000Z");

    const paused = pauseWorkSession(createWorkSession("field-1", "英語", startedAt), pausedAt);
    const ended = endWorkSession(paused, endedAt);

    expect(ended.status).toBe("ended");
    expect(ended.effectiveSeconds).toBe(1800);
  });
});

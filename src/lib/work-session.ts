import {
  calculateRawSessionScore,
  calculateXpFromRawScore,
  roundScoreForDisplay,
} from "@/lib/scoring";
import type {
  ActiveWorkSession,
  EndedWorkSession,
} from "@/types/work-session";

export function createWorkSession(
  fieldId: string,
  fieldName: string,
  now: Date,
): ActiveWorkSession {
  return {
    fieldId,
    fieldName,
    status: "working",
    startedAt: now.toISOString(),
    pausedAt: null,
    pauseAccumulatedSeconds: 0,
  };
}

export function pauseWorkSession(
  workSession: ActiveWorkSession,
  now: Date,
): ActiveWorkSession {
  if (workSession.status !== "working") {
    throw new Error("Only working sessions can be paused.");
  }

  return {
    ...workSession,
    status: "paused",
    pausedAt: now.toISOString(),
  };
}

export function resumeWorkSession(
  workSession: ActiveWorkSession,
  now: Date,
): ActiveWorkSession {
  if (workSession.status !== "paused") {
    throw new Error("Only paused sessions can be resumed.");
  }
  if (!workSession.pausedAt) {
    throw new Error("Paused session is missing pausedAt.");
  }

  const pausedAtMs = new Date(workSession.pausedAt).getTime();
  const nowMs = now.getTime();
  const pausedDurationSeconds = Math.max(0, Math.floor((nowMs - pausedAtMs) / 1000));

  return {
    ...workSession,
    status: "working",
    pausedAt: null,
    pauseAccumulatedSeconds: workSession.pauseAccumulatedSeconds + pausedDurationSeconds,
  };
}

export function calculateCurrentEffectiveSeconds(
  workSession: ActiveWorkSession,
  now: Date,
): number {
  const startedAtMs = new Date(workSession.startedAt).getTime();
  const nowMs = now.getTime();

  if (workSession.status === "paused" && workSession.pausedAt) {
    const pausedAtMs = new Date(workSession.pausedAt).getTime();
    return Math.max(
      0,
      Math.floor((pausedAtMs - startedAtMs) / 1000) - workSession.pauseAccumulatedSeconds,
    );
  }

  return Math.max(
    0,
    Math.floor((nowMs - startedAtMs) / 1000) - workSession.pauseAccumulatedSeconds,
  );
}

export function endWorkSession(
  workSession: ActiveWorkSession,
  now: Date,
): EndedWorkSession {
  let pauseAccumulatedSeconds = workSession.pauseAccumulatedSeconds;

  if (workSession.status === "paused" && workSession.pausedAt) {
    const pausedAtMs = new Date(workSession.pausedAt).getTime();
    const nowMs = now.getTime();
    pauseAccumulatedSeconds += Math.max(0, Math.floor((nowMs - pausedAtMs) / 1000));
  }

  const startedAtMs = new Date(workSession.startedAt).getTime();
  const endedAtMs = now.getTime();
  const effectiveSeconds = Math.max(
    0,
    Math.floor((endedAtMs - startedAtMs) / 1000) - pauseAccumulatedSeconds,
  );
  const rawScore = calculateRawSessionScore(
    effectiveSeconds,
    pauseAccumulatedSeconds,
  );
  const score = roundScoreForDisplay(rawScore);
  const xp = calculateXpFromRawScore(rawScore);

  return {
    fieldId: workSession.fieldId,
    fieldName: workSession.fieldName,
    status: "ended",
    startedAt: workSession.startedAt,
    pausedAt: null,
    endedAt: now.toISOString(),
    pauseAccumulatedSeconds,
    effectiveSeconds,
    score,
    xp,
  };
}

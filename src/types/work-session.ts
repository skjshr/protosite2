export type WorkSessionStatus = "idle" | "working" | "paused" | "ended";

export interface ActiveWorkSession {
  fieldId: string;
  fieldName: string;
  status: "working" | "paused";
  startedAt: string;
  pausedAt: string | null;
  pauseAccumulatedSeconds: number;
}

export interface EndedWorkSession {
  fieldId: string;
  fieldName: string;
  status: "ended";
  startedAt: string;
  pausedAt: null;
  endedAt: string;
  pauseAccumulatedSeconds: number;
  effectiveSeconds: number;
  score: number;
  xp: number;
}

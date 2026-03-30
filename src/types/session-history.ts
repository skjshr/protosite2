import type { LevelProgress } from "@/types/level";

export type SavedWorkSession = {
  fieldId: string;
  fieldName: string;
  startedAt: string;
  endedAt: string;
  effectiveSeconds: number;
  score: number;
  xp: number;
};

export type SessionHistorySummary = {
  totalXp: number;
  totalEffectiveSeconds: number;
  level: number;
  levelProgress: LevelProgress;
};

export type FieldSessionTotals = {
  totalEffectiveSeconds: number;
  totalSessions: number;
};

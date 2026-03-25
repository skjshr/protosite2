export interface SavedSession {
  fieldId: string;
  fieldName: string;
  startedAt: string;
  endedAt: string;
  effectiveSeconds: number;
  score: number;
  xp: number;
}

export interface SessionHistorySummary {
  totalXp: number;
  totalEffectiveSeconds: number;
}

export interface FieldSessionTotals {
  totalEffectiveSeconds: number;
  totalSessions: number;
}

import type { Field } from "@/types/field";
import type {
  FieldSessionTotals,
  SavedSession,
  SessionHistorySummary,
} from "@/types/session-history";

export interface HomeDataResponse {
  fields: Field[];
  summary: SessionHistorySummary;
  recentSessions: SavedSession[];
  fieldTotals: Record<string, FieldSessionTotals>;
}

export interface CreateFieldRequest {
  name: string;
  theme: Field["theme"];
  isPublic: boolean;
}

export interface SaveEndedSessionRequest {
  fieldId: string;
  startedAt: string;
  endedAt: string;
  pauseAccumulatedSeconds: number;
}

export interface SaveEndedSessionResponse {
  fieldId: string;
  fieldName: string;
  startedAt: string;
  endedAt: string;
  pauseAccumulatedSeconds: number;
  effectiveSeconds: number;
  score: number;
  xpGained: number;
}

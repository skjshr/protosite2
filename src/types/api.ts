import type { Field, Theme, ThemeKey } from "@/types/field";
import type { LevelProgress } from "@/types/level";
import type {
  FieldSessionTotals,
  SavedWorkSession,
  SessionHistorySummary,
} from "@/types/session-history";

export type ItemRarity = "common" | "rare" | "epic";

export type HomeDataResponse = {
  fields: Field[];
  themes: Theme[];
  summary: SessionHistorySummary;
  recentWorkSessions: SavedWorkSession[];
  fieldTotals: Record<string, FieldSessionTotals>;
};

export type CreateFieldRequest = {
  name: string;
  themeKey: ThemeKey;
  isPublic: boolean;
};

export type SaveEndedWorkSessionRequest = {
  fieldId: string;
  startedAt: string;
  endedAt: string;
  pauseAccumulatedSeconds: number;
};

export type SaveEndedWorkSessionResponse = {
  fieldId: string;
  fieldName: string;
  startedAt: string;
  endedAt: string;
  pauseAccumulatedSeconds: number;
  effectiveSeconds: number;
  score: number;
  xpGained: number;
  droppedItem: {
    id: string;
    key: string;
    name: string;
    rarity: ItemRarity;
    description: string | null;
  } | null;
  totalEffectiveSeconds: number;
  totalXp: number;
  level: number;
  leveledUp: boolean;
  levelProgress: LevelProgress;
};

export type CollectionResponse = {
  themes: Array<{
    themeKey: string;
    themeDisplayName: string;
    items: Array<{
      id: string;
      key: string;
      name: string;
      rarity: ItemRarity;
      description: string | null;
      isAcquired: boolean;
      acquiredAt: string | null;
    }>;
  }>;
};

export type RankingEntry = {
  rank: number;
  username: string;
  weeklyScore: number;
  isCurrentUser: boolean;
};

export type RankingResponse = {
  weekStart: string;
  weekEnd: string;
  myRank: number | null;
  myWeeklyScore: number;
  nearby: RankingEntry[];
};

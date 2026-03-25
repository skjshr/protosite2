import type { EndedSession } from "@/types/session";
import type {
  FieldSessionTotals,
  SavedSession,
  SessionHistorySummary,
} from "@/types/session-history";

const SAVED_SESSIONS_STORAGE_KEY = "savedSessions";

function isBrowserEnvironment(): boolean {
  return typeof window !== "undefined";
}

function isValidSavedSession(value: unknown): value is SavedSession {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.fieldId === "string" &&
    typeof candidate.fieldName === "string" &&
    typeof candidate.startedAt === "string" &&
    typeof candidate.endedAt === "string" &&
    typeof candidate.effectiveSeconds === "number" &&
    Number.isFinite(candidate.effectiveSeconds) &&
    typeof candidate.score === "number" &&
    Number.isFinite(candidate.score) &&
    typeof candidate.xp === "number" &&
    Number.isFinite(candidate.xp)
  );
}

function normalizeSavedSessions(value: unknown): SavedSession[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((session): SavedSession | null => {
      if (isValidSavedSession(session)) {
        return session;
      }

      // 旧データ互換: fieldId がない保存形式を読み込んだ場合、
      // migration 用の固定 ID を付与して取り込む。
      if (!session || typeof session !== "object") {
        return null;
      }

      const legacy = session as Record<string, unknown>;
      if (
        typeof legacy.fieldName === "string" &&
        typeof legacy.startedAt === "string" &&
        typeof legacy.endedAt === "string" &&
        typeof legacy.effectiveSeconds === "number" &&
        Number.isFinite(legacy.effectiveSeconds) &&
        typeof legacy.score === "number" &&
        Number.isFinite(legacy.score) &&
        typeof legacy.xp === "number" &&
        Number.isFinite(legacy.xp)
      ) {
        return {
          fieldId: "legacy-fixed-field",
          fieldName: legacy.fieldName,
          startedAt: legacy.startedAt,
          endedAt: legacy.endedAt,
          effectiveSeconds: legacy.effectiveSeconds,
          score: legacy.score,
          xp: legacy.xp,
        };
      }

      return null;
    })
    .filter((session): session is SavedSession => session !== null);
}

function sortByEndedAtDesc(sessions: SavedSession[]): SavedSession[] {
  return [...sessions].sort((left, right) => {
    return new Date(right.endedAt).getTime() - new Date(left.endedAt).getTime();
  });
}

export function loadSavedSessions(): SavedSession[] {
  if (!isBrowserEnvironment()) {
    return [];
  }

  const rawValue = window.localStorage.getItem(SAVED_SESSIONS_STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return sortByEndedAtDesc(normalizeSavedSessions(parsedValue));
  } catch {
    return [];
  }
}

export function appendSavedSession(
  endedSession: EndedSession,
  currentSessions?: SavedSession[],
): SavedSession[] {
  if (!isBrowserEnvironment()) {
    return [];
  }

  const nextSession: SavedSession = {
    fieldId: endedSession.fieldId,
    fieldName: endedSession.fieldName,
    startedAt: endedSession.startedAt,
    endedAt: endedSession.endedAt,
    effectiveSeconds: endedSession.effectiveSeconds,
    score: endedSession.score,
    xp: endedSession.xp,
  };

  const baseSessions = currentSessions ?? loadSavedSessions();
  const mergedSessions = sortByEndedAtDesc([...baseSessions, nextSession]);
  window.localStorage.setItem(
    SAVED_SESSIONS_STORAGE_KEY,
    JSON.stringify(mergedSessions),
  );

  return mergedSessions;
}

export function calculateSessionHistorySummary(
  sessions: SavedSession[],
): SessionHistorySummary {
  return sessions.reduce(
    (summary, session) => {
      return {
        totalXp: summary.totalXp + session.xp,
        totalEffectiveSeconds: summary.totalEffectiveSeconds + session.effectiveSeconds,
      };
    },
    {
      totalXp: 0,
      totalEffectiveSeconds: 0,
    },
  );
}

export function getRecentSavedSessions(
  sessions: SavedSession[],
  limit: number,
): SavedSession[] {
  return sortByEndedAtDesc(sessions).slice(0, limit);
}

export function calculateFieldSessionTotals(
  sessions: SavedSession[],
): Record<string, FieldSessionTotals> {
  return sessions.reduce<Record<string, FieldSessionTotals>>((totalsByField, session) => {
    const current = totalsByField[session.fieldId] ?? {
      totalXp: 0,
      totalEffectiveSeconds: 0,
      totalSessions: 0,
    };

    totalsByField[session.fieldId] = {
      totalXp: current.totalXp + session.xp,
      totalEffectiveSeconds: current.totalEffectiveSeconds + session.effectiveSeconds,
      totalSessions: current.totalSessions + 1,
    };

    return totalsByField;
  }, {});
}

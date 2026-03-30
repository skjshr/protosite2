import { calculateLevelProgress } from "@/lib/level";
import type { HomeDataResponse } from "@/types/api";
import { listFieldsByUserId, listActiveThemes } from "@/server/repositories/field-repository";
import { listRecentWorkSessionsByUserId } from "@/server/repositories/work-session-repository";
import { findUserById } from "@/server/repositories/user-repository";

export async function getHomeData(userId: string): Promise<HomeDataResponse> {
  const user = await findUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  const [fields, recentWorkSessionRows, themes] = await Promise.all([
    listFieldsByUserId(user.id),
    listRecentWorkSessionsByUserId(user.id, 5),
    listActiveThemes(),
  ]);

  const levelProgress = calculateLevelProgress(user.totalEffectiveSeconds);

  const fieldTotals = fields.reduce<Record<string, { totalEffectiveSeconds: number; totalSessions: number }>>(
    (totals, field) => {
      totals[field.id] = {
        totalEffectiveSeconds: field.totalEffectiveSeconds,
        totalSessions: field.totalSessions,
      };
      return totals;
    },
    {},
  );

  return {
    fields: fields.map((field) => ({
      id: field.id,
      userId: field.userId,
      name: field.name,
      themeId: field.themeId,
      themeKey: field.theme.key,
      themeDisplayName: field.theme.displayName,
      isPublic: field.isPublic,
      totalEffectiveSeconds: field.totalEffectiveSeconds,
      totalSessions: field.totalSessions,
    })),
    themes: themes.map((theme) => ({
      id: theme.id,
      key: theme.key,
      displayName: theme.displayName,
      description: theme.description,
      sortOrder: theme.sortOrder,
      isActive: theme.isActive,
      createdAt: theme.createdAt.toISOString(),
      updatedAt: theme.updatedAt.toISOString(),
    })),
    summary: {
      totalXp: user.totalXp,
      totalEffectiveSeconds: user.totalEffectiveSeconds,
      level: levelProgress.level,
      levelProgress,
    },
    recentWorkSessions: recentWorkSessionRows.map((workSession) => ({
      fieldId: workSession.fieldId,
      fieldName: workSession.field.name,
      startedAt: workSession.startedAt.toISOString(),
      endedAt: (workSession.endedAt ?? workSession.startedAt).toISOString(),
      effectiveSeconds: workSession.effectiveSeconds,
      score: workSession.score,
      xp: workSession.xpGained,
    })),
    fieldTotals,
  };
}

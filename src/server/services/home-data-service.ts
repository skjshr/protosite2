import type { HomeDataResponse } from "@/types/api";
import { getOrCreateDefaultUser } from "@/server/repositories/user-repository";
import { listRecentSessionsByUserId } from "@/server/repositories/session-repository";
import { listFieldsByUserId } from "@/server/repositories/field-repository";

export async function getHomeData(): Promise<HomeDataResponse> {
  const user = await getOrCreateDefaultUser();

  const [fields, recentSessionRows] = await Promise.all([
    listFieldsByUserId(user.id),
    listRecentSessionsByUserId(user.id, 5),
  ]);

  const totalEffectiveSeconds = fields.reduce((total, field) => {
    return total + field.totalEffectiveSeconds;
  }, 0);

  const fieldTotals = fields.reduce<
    Record<string, { totalEffectiveSeconds: number; totalSessions: number }>
  >((totals, field) => {
    totals[field.id] = {
      totalEffectiveSeconds: field.totalEffectiveSeconds,
      totalSessions: field.totalSessions,
    };
    return totals;
  }, {});

  return {
    fields: fields.map((field) => {
      return {
        id: field.id,
        userId: field.userId,
        name: field.name,
        theme: field.theme,
        isPublic: field.isPublic,
      };
    }),
    summary: {
      totalXp: user.totalXp,
      totalEffectiveSeconds,
    },
    recentSessions: recentSessionRows.map((session) => {
      return {
        fieldId: session.fieldId,
        fieldName: session.field.name,
        startedAt: session.startedAt.toISOString(),
        endedAt: session.endedAt.toISOString(),
        effectiveSeconds: session.effectiveSeconds,
        score: session.score,
        xp: session.xpGained,
      };
    }),
    fieldTotals,
  };
}

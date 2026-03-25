import { SessionStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";

export async function saveEndedSessionForUser(input: {
  userId: string;
  fieldId: string;
  startedAt: string;
  endedAt: string;
  pauseAccumulatedSeconds: number;
  effectiveSeconds: number;
  score: number;
  xpGained: number;
}) {
  return prisma.$transaction(async (transaction) => {
    const createdSession = await transaction.session.create({
      data: {
        userId: input.userId,
        fieldId: input.fieldId,
        status: SessionStatus.ended,
        startedAt: new Date(input.startedAt),
        pausedAt: null,
        endedAt: new Date(input.endedAt),
        pauseAccumulatedSeconds: input.pauseAccumulatedSeconds,
        effectiveSeconds: input.effectiveSeconds,
        score: input.score,
        xpGained: input.xpGained,
      },
    });

    await transaction.field.update({
      where: { id: input.fieldId },
      data: {
        totalEffectiveSeconds: {
          increment: input.effectiveSeconds,
        },
        totalSessions: {
          increment: 1,
        },
      },
    });

    await transaction.user.update({
      where: { id: input.userId },
      data: {
        totalXp: {
          increment: input.xpGained,
        },
      },
    });

    return createdSession;
  });
}

export async function listRecentSessionsByUserId(userId: string, limit: number) {
  return prisma.session.findMany({
    where: { userId },
    include: {
      field: true,
    },
    orderBy: {
      endedAt: "desc",
    },
    take: limit,
  });
}

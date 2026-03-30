import { WorkSessionStatus } from "@prisma/client";
import { prisma } from "@/server/db/client";

type DroppedItemInput = {
  id: string;
  key: string;
  name: string;
  rarity: "common" | "rare" | "epic";
  description: string | null;
};

export async function saveEndedWorkSessionForUser(input: {
  userId: string;
  fieldId: string;
  startedAt: string;
  endedAt: string;
  pauseAccumulatedSeconds: number;
  effectiveSeconds: number;
  score: number;
  xpGained: number;
  droppedItem: DroppedItemInput | null;
}) {
  return prisma.$transaction(async (transaction) => {
    const createdWorkSession = await transaction.workSession.create({
      data: {
        userId: input.userId,
        fieldId: input.fieldId,
        status: WorkSessionStatus.ended,
        startedAt: new Date(input.startedAt),
        pausedAt: null,
        endedAt: new Date(input.endedAt),
        pauseAccumulatedSeconds: input.pauseAccumulatedSeconds,
        effectiveSeconds: input.effectiveSeconds,
        score: input.score,
        xpGained: input.xpGained,
      },
    });

    if (input.droppedItem) {
      await transaction.userItem.create({
        data: {
          userId: input.userId,
          itemId: input.droppedItem.id,
          acquiredWorkSessionId: createdWorkSession.id,
        },
      });
    }

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

    const updatedUser = await transaction.user.update({
      where: { id: input.userId },
      data: {
        totalXp: {
          increment: input.xpGained,
        },
        totalEffectiveSeconds: {
          increment: input.effectiveSeconds,
        },
      },
      select: {
        totalXp: true,
        totalEffectiveSeconds: true,
      },
    });

    return {
      workSession: createdWorkSession,
      updatedUser,
    };
  });
}

export async function listRecentWorkSessionsByUserId(userId: string, limit: number) {
  return prisma.workSession.findMany({
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

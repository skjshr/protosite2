import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth-options";
import { calculateLevel, calculateLevelProgress } from "@/lib/level";
import { determineRarity, selectWeightedRandom, shouldDrop } from "@/lib/item-drop";
import {
  calculateRawSessionScore,
  calculateXpFromRawScore,
  roundScoreForDisplay,
} from "@/lib/scoring";
import { findFieldByIdAndUserId } from "@/server/repositories/field-repository";
import { listThemeItemsWithItems } from "@/server/repositories/item-repository";
import { findUserById } from "@/server/repositories/user-repository";
import { saveEndedWorkSessionForUser } from "@/server/repositories/work-session-repository";
import type {
  SaveEndedWorkSessionRequest,
  SaveEndedWorkSessionResponse,
} from "@/types/api";

function isValidIsoDate(value: string): boolean {
  return !Number.isNaN(new Date(value).getTime());
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 });
  }

  const body = (await request.json()) as Partial<SaveEndedWorkSessionRequest>;
  if (
    !body
    || typeof body.fieldId !== "string"
    || typeof body.startedAt !== "string"
    || typeof body.endedAt !== "string"
    || typeof body.pauseAccumulatedSeconds !== "number"
  ) {
    return NextResponse.json({ error: "リクエストが不正です" }, { status: 400 });
  }

  if (!isValidIsoDate(body.startedAt) || !isValidIsoDate(body.endedAt)) {
    return NextResponse.json({ error: "日時の形式が不正です" }, { status: 400 });
  }

  const userId = session.user.id;

  try {
    const [field, user] = await Promise.all([
      findFieldByIdAndUserId(body.fieldId, userId),
      findUserById(userId),
    ]);

    if (!field) {
      return NextResponse.json({ error: "フィールドが見つかりません" }, { status: 404 });
    }
    if (!user) {
      return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    }

    const startedAtDate = new Date(body.startedAt);
    const endedAtDate = new Date(body.endedAt);
    const pauseAccumulatedSeconds = Math.max(0, Math.floor(body.pauseAccumulatedSeconds));
    const effectiveSeconds = Math.max(
      0,
      Math.floor((endedAtDate.getTime() - startedAtDate.getTime()) / 1000) - pauseAccumulatedSeconds,
    );

    const rawScore = calculateRawSessionScore(effectiveSeconds, pauseAccumulatedSeconds);
    const score = roundScoreForDisplay(rawScore);
    const xpGained = calculateXpFromRawScore(rawScore);

    const currentLevel = calculateLevel(user.totalEffectiveSeconds);
    let droppedItem: SaveEndedWorkSessionResponse["droppedItem"] = null;

    if (shouldDrop(score)) {
      const rarity = determineRarity(score);
      const themeItems = await listThemeItemsWithItems(field.themeId);
      const candidateItems = themeItems
        .filter((themeItem) => themeItem.item.rarity === rarity)
        .filter((themeItem) => {
          if (themeItem.unlockLevel === null) {
            return true;
          }
          return currentLevel >= themeItem.unlockLevel;
        })
        .map((themeItem) => ({
          id: themeItem.item.id,
          key: themeItem.item.key,
          name: themeItem.item.name,
          rarity: themeItem.item.rarity,
          description: themeItem.item.description,
          dropWeight: themeItem.dropWeight,
        }));

      const selectedItem = selectWeightedRandom(candidateItems);
      if (selectedItem) {
        droppedItem = {
          id: selectedItem.id,
          key: selectedItem.key,
          name: selectedItem.name,
          rarity: selectedItem.rarity,
          description: selectedItem.description,
        };
      }
    }

    const saved = await saveEndedWorkSessionForUser({
      userId,
      fieldId: body.fieldId,
      startedAt: body.startedAt,
      endedAt: body.endedAt,
      pauseAccumulatedSeconds,
      effectiveSeconds,
      score,
      xpGained,
      droppedItem,
    });

    const previousLevel = calculateLevel(user.totalEffectiveSeconds);
    const levelProgress = calculateLevelProgress(saved.updatedUser.totalEffectiveSeconds);

    const response: SaveEndedWorkSessionResponse = {
      fieldId: saved.workSession.fieldId,
      fieldName: field.name,
      startedAt: saved.workSession.startedAt.toISOString(),
      endedAt: (saved.workSession.endedAt ?? endedAtDate).toISOString(),
      pauseAccumulatedSeconds: saved.workSession.pauseAccumulatedSeconds,
      effectiveSeconds: saved.workSession.effectiveSeconds,
      score: saved.workSession.score,
      xpGained: saved.workSession.xpGained,
      droppedItem,
      totalEffectiveSeconds: saved.updatedUser.totalEffectiveSeconds,
      totalXp: saved.updatedUser.totalXp,
      level: levelProgress.level,
      leveledUp: levelProgress.level > previousLevel,
      levelProgress,
    };

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    console.error("Failed to save ended work session:", error);
    return NextResponse.json({ error: "セッション保存に失敗しました" }, { status: 500 });
  }
}

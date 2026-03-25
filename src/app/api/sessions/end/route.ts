import { NextResponse } from "next/server";
import {
  calculateRawSessionScore,
  calculateXpFromRawScore,
  roundScoreForDisplay,
} from "@/lib/scoring";
import { findFieldByIdAndUserId } from "@/server/repositories/field-repository";
import { saveEndedSessionForUser } from "@/server/repositories/session-repository";
import { getOrCreateDefaultUser } from "@/server/repositories/user-repository";
import type { SaveEndedSessionRequest } from "@/types/api";

function isSaveEndedSessionRequest(value: unknown): value is SaveEndedSessionRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.fieldId === "string" &&
    typeof candidate.startedAt === "string" &&
    typeof candidate.endedAt === "string" &&
    typeof candidate.pauseAccumulatedSeconds === "number" &&
    Number.isInteger(candidate.pauseAccumulatedSeconds) &&
    candidate.pauseAccumulatedSeconds >= 0
  );
}

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    if (!isSaveEndedSessionRequest(body)) {
      return NextResponse.json(
        { message: "Invalid ended session request." },
        { status: 400 },
      );
    }

    const user = await getOrCreateDefaultUser();
    const field = await findFieldByIdAndUserId(body.fieldId, user.id);
    if (!field) {
      return NextResponse.json({ message: "Field not found." }, { status: 404 });
    }

    const startedAt = new Date(body.startedAt);
    const endedAt = new Date(body.endedAt);
    if (
      Number.isNaN(startedAt.getTime()) ||
      Number.isNaN(endedAt.getTime()) ||
      endedAt.getTime() < startedAt.getTime()
    ) {
      return NextResponse.json(
        { message: "Invalid session date range." },
        { status: 400 },
      );
    }

    const totalDurationSeconds = Math.floor(
      (endedAt.getTime() - startedAt.getTime()) / 1000,
    );
    if (body.pauseAccumulatedSeconds > totalDurationSeconds) {
      return NextResponse.json(
        { message: "Pause duration exceeds total duration." },
        { status: 400 },
      );
    }

    const effectiveSeconds = Math.max(
      0,
      totalDurationSeconds - body.pauseAccumulatedSeconds,
    );
    const rawScore = calculateRawSessionScore(
      effectiveSeconds,
      body.pauseAccumulatedSeconds,
    );
    const score = roundScoreForDisplay(rawScore);
    const xpGained = calculateXpFromRawScore(rawScore);

    const savedSession = await saveEndedSessionForUser({
      userId: user.id,
      fieldId: body.fieldId,
      startedAt: body.startedAt,
      endedAt: body.endedAt,
      pauseAccumulatedSeconds: body.pauseAccumulatedSeconds,
      effectiveSeconds,
      score,
      xpGained,
    });

    return NextResponse.json({
      fieldId: savedSession.fieldId,
      fieldName: field.name,
      startedAt: savedSession.startedAt.toISOString(),
      endedAt: savedSession.endedAt.toISOString(),
      pauseAccumulatedSeconds: savedSession.pauseAccumulatedSeconds,
      effectiveSeconds: savedSession.effectiveSeconds,
      score: savedSession.score,
      xpGained: savedSession.xpGained,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Failed to save session." },
      { status: 500 },
    );
  }
}

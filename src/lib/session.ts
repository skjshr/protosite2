import {
  calculateRawSessionScore,
  calculateXpFromRawScore,
  roundScoreForDisplay,
} from "@/lib/scoring";
import type { ActiveSession, EndedSession } from "@/types/session";

export function createSession(
  fieldId: string,
  fieldName: string,
  now: Date,
): ActiveSession {
  // セッション開始時点の事実を最小セットで保存する。
  // ここでは経過秒を持たず、開始時刻だけを真実にする。
  // fieldName は今回は固定用途だが、将来複数用途へ拡張しやすいよう引数で受ける。
  return {
    fieldId,
    fieldName,
    status: "working",
    startedAt: now.toISOString(),
    pausedAt: null,
    pauseAccumulatedSeconds: 0,
  };
}

export function pauseSession(session: ActiveSession, now: Date): ActiveSession {
  if (session.status !== "working") {
    // 不正な状態遷移を早めに止めると、後続のデータ破損を防げる。
    throw new Error("Only working sessions can be paused.");
  }

  // pause では pausedAt だけ記録する。
  // 休憩総量の確定は resume / end のタイミングで行う。
  return {
    ...session,
    status: "paused",
    pausedAt: now.toISOString(),
  };
}

export function resumeSession(session: ActiveSession, now: Date): ActiveSession {
  if (session.status !== "paused") {
    // paused -> working 以外は仕様外の遷移。
    throw new Error("Only paused sessions can be resumed.");
  }
  if (!session.pausedAt) {
    // pausedAt がない paused は壊れたデータなので即エラーにする。
    throw new Error("Paused session is missing pausedAt.");
  }

  // Date を ms にして差分計算すると、端末の表示形式に依存しない。
  const pausedAtMs = new Date(session.pausedAt).getTime();
  const nowMs = now.getTime();
  // 小数秒は不要なので floor して、保存値の揺れを抑える。
  const pausedDurationSeconds = Math.max(0, Math.floor((nowMs - pausedAtMs) / 1000));

  return {
    ...session,
    status: "working",
    pausedAt: null,
    // 休憩時間は「再開した瞬間」に合算しておく。
    // こうすると終了時の計算が単純になり、UI表示の秒カウントに依存しない。
    pauseAccumulatedSeconds: session.pauseAccumulatedSeconds + pausedDurationSeconds,
  };
}

export function calculateCurrentEffectiveSeconds(
  session: ActiveSession,
  now: Date,
): number {
  // 有効時間 = 開始からの経過 - 休憩累積
  // という共通式を、状態ごとに「どの時刻で止めるか」だけ変えて使う。
  const startedAtMs = new Date(session.startedAt).getTime();
  const nowMs = now.getTime();

  if (session.status === "paused" && session.pausedAt) {
    const pausedAtMs = new Date(session.pausedAt).getTime();
    // paused 中は時間表示を進めないため、pausedAt 時点で止めて計算する。
    return Math.max(
      0,
      Math.floor((pausedAtMs - startedAtMs) / 1000) - session.pauseAccumulatedSeconds,
    );
  }

  return Math.max(
    0,
    Math.floor((nowMs - startedAtMs) / 1000) - session.pauseAccumulatedSeconds,
  );
}

export function endSession(session: ActiveSession, now: Date): EndedSession {
  // local 変数で再計算し、元の session を破壊しない。
  let pauseAccumulatedSeconds = session.pauseAccumulatedSeconds;

  if (session.status === "paused" && session.pausedAt) {
    const pausedAtMs = new Date(session.pausedAt).getTime();
    const nowMs = now.getTime();
    pauseAccumulatedSeconds += Math.max(0, Math.floor((nowMs - pausedAtMs) / 1000));
  }

  const startedAtMs = new Date(session.startedAt).getTime();
  const endedAtMs = now.getTime();
  const effectiveSeconds = Math.max(
    0,
    Math.floor((endedAtMs - startedAtMs) / 1000) - pauseAccumulatedSeconds,
  );
  // effectiveSeconds は負数になり得ないので 0 を下限にする。
  // （端末時刻のズレや手動編集などの異常値対策）
  // スコア計算と XP 計算を分けると、将来ルール変更時に差分を局所化できる。
  const rawScore = calculateRawSessionScore(
    effectiveSeconds,
    pauseAccumulatedSeconds,
  );
  const score = roundScoreForDisplay(rawScore);
  const xp = calculateXpFromRawScore(rawScore);

  return {
    fieldId: session.fieldId,
    fieldName: session.fieldName,
    status: "ended",
    startedAt: session.startedAt,
    pausedAt: null,
    endedAt: now.toISOString(),
    pauseAccumulatedSeconds,
    effectiveSeconds,
    score,
    xp,
  };
}

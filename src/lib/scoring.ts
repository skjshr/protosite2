const SECONDS_PER_MINUTE = 60;

function getSessionMultiplier(effectiveMinutes: number): number {
  // 長時間を単純に褒めないため、仕様の推奨帯に合わせて倍率を切り替える。
  // if を上から順番に読むだけで、仕様表との対応が追える構成にしている。
  if (effectiveMinutes < 10) {
    return 0.0;
  }
  if (effectiveMinutes <= 24) {
    return 0.6;
  }
  if (effectiveMinutes <= 44) {
    return 0.9;
  }
  if (effectiveMinutes <= 60) {
    return 1.15;
  }
  if (effectiveMinutes <= 90) {
    return 1.0;
  }
  if (effectiveMinutes <= 120) {
    return 0.75;
  }
  return 0.35;
}

function getRestMultiplier(restMinutes: number): number {
  // 休憩は「短すぎず長すぎず」を推奨するため、分数帯で倍率を分ける。
  // こちらも仕様書の帯をそのままコード化して、保守時の比較を簡単にする。
  if (restMinutes <= 4) {
    return 0.95;
  }
  if (restMinutes <= 10) {
    return 1.05;
  }
  if (restMinutes <= 20) {
    return 1.0;
  }
  return 0.9;
}

export function calculateRawSessionScore(
  effectiveSeconds: number,
  pauseAccumulatedSeconds: number,
): number {
  // 仕様の「10〜24分」などの帯を明確に扱うため、境界判定は floor した整数分で固定する。
  const effectiveWholeMinutes = Math.floor(effectiveSeconds / SECONDS_PER_MINUTE);
  const restWholeMinutes = Math.floor(pauseAccumulatedSeconds / SECONDS_PER_MINUTE);
  const sessionMultiplier = getSessionMultiplier(effectiveWholeMinutes);
  const restMultiplier = getRestMultiplier(restWholeMinutes);
  const score = effectiveWholeMinutes * sessionMultiplier * restMultiplier;

  return score;
}

export function roundScoreForDisplay(rawScore: number): number {
  // UI 表示や保存表示用の丸めはここだけで行い、計算元データと責務を分離する。
  return Number(rawScore.toFixed(2));
}

export function calculateXpFromRawScore(rawScore: number): number {
  // MVPでは XP は単純に raw score の切り捨てでよい。
  // 「端数は次回へ持ち越さない」という仕様をここで明示する。
  return Math.floor(rawScore);
}

export function calculateSessionScore(
  effectiveSeconds: number,
  pauseAccumulatedSeconds: number,
): number {
  // 既存呼び出し互換のため、表示向け score 取得 API は残している。
  return roundScoreForDisplay(
    calculateRawSessionScore(effectiveSeconds, pauseAccumulatedSeconds),
  );
}

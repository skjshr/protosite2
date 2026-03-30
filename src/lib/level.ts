import type { LevelProgress } from "@/types/level";

const LEVEL_COEFFICIENT = 14.4;
const LEVEL_EXPONENT = 0.227;
const SECONDS_PER_HOUR = 3600;

export function calculateLevel(totalEffectiveSeconds: number): number {
  if (totalEffectiveSeconds <= 0) {
    return 1;
  }

  const hours = totalEffectiveSeconds / SECONDS_PER_HOUR;
  return Math.floor(LEVEL_COEFFICIENT * Math.pow(hours, LEVEL_EXPONENT)) + 1;
}

export function secondsForLevel(level: number): number {
  if (level <= 1) {
    return 0;
  }

  const hours = Math.pow((level - 1) / LEVEL_COEFFICIENT, 1 / LEVEL_EXPONENT);
  return Math.ceil(hours * SECONDS_PER_HOUR);
}

export function calculateLevelProgress(totalEffectiveSeconds: number): LevelProgress {
  const normalizedTotalSeconds = Math.max(0, totalEffectiveSeconds);
  const level = calculateLevel(normalizedTotalSeconds);
  const currentLevelSeconds = secondsForLevel(level);
  const nextLevelSeconds = secondsForLevel(level + 1);
  const progressSeconds = Math.max(0, normalizedTotalSeconds - currentLevelSeconds);
  const rangeSeconds = Math.max(1, nextLevelSeconds - currentLevelSeconds);
  const progressRate = Math.min(progressSeconds / rangeSeconds, 1);

  return {
    level,
    currentLevelSeconds,
    nextLevelSeconds,
    progressSeconds,
    progressRate,
  };
}

import type { ItemRarity } from "@/types/api";

type RandomFunction = () => number;

export function shouldDrop(score: number, rand: RandomFunction = Math.random): boolean {
  if (score < 5) {
    return false;
  }

  const dropRate = score < 15
    ? 0.4
    : score < 30
      ? 0.65
      : score < 45
        ? 0.8
        : score < 60
          ? 0.9
          : 0.95;

  return rand() < dropRate;
}

export function determineRarity(
  score: number,
  rand: RandomFunction = Math.random,
): ItemRarity {
  const roll = rand();

  if (score < 15) {
    return roll < 0.95 ? "common" : "rare";
  }

  if (score < 30) {
    if (roll < 0.88) {
      return "common";
    }
    return roll < 0.99 ? "rare" : "epic";
  }

  if (score < 45) {
    if (roll < 0.8) {
      return "common";
    }
    return roll < 0.98 ? "rare" : "epic";
  }

  if (score < 60) {
    if (roll < 0.72) {
      return "common";
    }
    return roll < 0.96 ? "rare" : "epic";
  }

  if (roll < 0.65) {
    return "common";
  }
  return roll < 0.93 ? "rare" : "epic";
}

export function selectWeightedRandom<T extends { dropWeight: number }>(
  candidates: T[],
  rand: RandomFunction = Math.random,
): T | null {
  if (candidates.length === 0) {
    return null;
  }

  const totalWeight = candidates.reduce((sum, candidate) => {
    return sum + Math.max(0, candidate.dropWeight);
  }, 0);

  if (totalWeight <= 0) {
    return null;
  }

  const roll = rand() * totalWeight;
  let cumulative = 0;

  for (const candidate of candidates) {
    cumulative += Math.max(0, candidate.dropWeight);
    if (roll < cumulative) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1] ?? null;
}

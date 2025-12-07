import type { WrappedStats } from './types.js';

export type Tier = 'origin' | 'prime' | 'master';

const TIER_THRESHOLDS = {
  ORIGIN: 0,
  PRIME: 1000,
  MASTER: 3000,
};

/**
 * Calculate total score based on user stats
 *
 * Formula:
 * score = (totalCommits * 1) +
 *         (totalPRs * 5) +
 *         (totalRepos * 2) +
 *         (totalStars * 3) +
 *         (longestStreak * 10) +
 *         (currentStreak * 8)
 */
export function calculateScore(stats: WrappedStats): number {
  const score =
    (stats.totalCommits * 1) +
    (stats.totalPRs * 5) +
    (stats.totalRepos * 2) +
    (stats.totalStars * 3) +
    (stats.longestStreak * 10) +
    (stats.currentStreak * 8);

  return Math.floor(score);
}

/**
 * Determine tier based on score
 *
 * ORIGIN (Green): score < 1000
 * PRIME (Cyan): 1000 ≤ score < 3000
 * MASTER (Gold): score ≥ 3000
 */
export function determineTier(score: number): Tier {
  if (score >= TIER_THRESHOLDS.MASTER) {
    return 'master';
  } else if (score >= TIER_THRESHOLDS.PRIME) {
    return 'prime';
  } else {
    return 'origin';
  }
}

/**
 * Get tier name in uppercase for display
 */
export function getTierName(tier: Tier): string {
  return tier.toUpperCase();
}

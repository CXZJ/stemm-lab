import type { LeaderboardScoring } from "@/types/activity-config";
import type { ActivityAttempt, LeaderboardEntry } from "@/types/models";

export function readMetric(data: Record<string, unknown>, fieldId: string): number | null {
  const v = data[fieldId];
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = parseFloat(v);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

export function isScoredAttempt(attempt: ActivityAttempt): boolean {
  return !attempt.id.startsWith("draft_") && attempt.submittedAt != null;
}

export function bestMetricFromAttempts(
  attempts: ActivityAttempt[],
  scoring: LeaderboardScoring,
): { best: number | null; count: number } {
  const scored = attempts.filter(isScoredAttempt);
  let best: number | null = null;

  for (const a of scored) {
    const fromScore =
      typeof a.score === "number" && !Number.isNaN(a.score) ? a.score : null;
    const n = fromScore ?? readMetric(a.customData, scoring.metricFieldId);
    if (n == null || Number.isNaN(n)) continue;

    if (best == null) {
      best = n;
    } else if (scoring.higherIsBetter) {
      best = Math.max(best, n);
    } else {
      best = Math.min(best, n);
    }
  }

  return { best, count: scored.length };
}

export function compareLeaderboardMetrics(
  a: number,
  b: number,
  higherIsBetter: boolean,
): number {
  return higherIsBetter ? b - a : a - b;
}

export function sortLeaderboardEntries(
  rows: LeaderboardEntry[],
  higherIsBetter: boolean,
): LeaderboardEntry[] {
  return [...rows].sort((a, b) =>
    compareLeaderboardMetrics(a.metricValue ?? 0, b.metricValue ?? 0, higherIsBetter),
  );
}

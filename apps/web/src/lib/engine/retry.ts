import type { Review } from "@/lib/content/practice-types";

export const RETRY_THRESHOLD = 6;

export type RetryWhen = "tomorrow" | "three_days" | "next_week" | "two_weeks" | "someday" | "custom";

export function retryDueAt(when: RetryWhen, custom?: number): number {
  const day = 86_400_000;
  const base = Date.now();
  switch (when) {
    case "tomorrow":
      return base + day;
    case "three_days":
      return base + 3 * day;
    case "next_week":
      return base + 7 * day;
    case "two_weeks":
      return base + 14 * day;
    case "someday":
      return base + 60 * day;
    case "custom":
      return custom ?? base + day;
  }
}

export function shouldRecommendRetry(review?: Review | null): boolean {
  if (!review) return false;
  if (review.overall !== undefined && review.overall !== null && review.overall < RETRY_THRESHOLD) return true;
  if (review.flags.length >= 3) return true;
  return false;
}

export function suggestedRetryWhen(overall?: number | null): RetryWhen {
  if (overall === undefined || overall === null) return "next_week";
  if (overall < 4) return "tomorrow";
  if (overall < 6) return "three_days";
  if (overall < 8) return "next_week";
  return "two_weeks";
}

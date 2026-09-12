import { RATING_DIMENSIONS, type Review } from "@/lib/content/practice-types";

export function computeOverall(ratings: Review["ratings"]): number | undefined {
  const vals = RATING_DIMENSIONS.map((d) => ratings[d]).filter((v): v is number => typeof v === "number" && v > 0);
  if (!vals.length) return undefined;
  return Math.round((vals.reduce((s, v) => s + v, 0) / vals.length) * 10) / 10;
}

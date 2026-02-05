import type { NormalizedOffer } from "@/lib/types";

export type PricePoint = {
  hour: number; // 0-23
  minPrice: number | null;
  count: number;
};

export function pricePointsByDepartureHour(
  offers: NormalizedOffer[],
): PricePoint[] {
  const byHour = new Map<number, { min: number; count: number }>();
  for (let h = 0; h < 24; h++) {
    byHour.set(h, { min: Number.POSITIVE_INFINITY, count: 0 });
  }

  for (const o of offers) {
    const h = o.outbound.departLocalHour;
    if (h === null || h < 0 || h > 23) continue;
    const bucket = byHour.get(h)!;
    bucket.count += 1;
    if (o.price.amount < bucket.min) bucket.min = o.price.amount;
  }

  const points: PricePoint[] = [];
  for (let h = 0; h < 24; h++) {
    const b = byHour.get(h)!;
    points.push({ hour: h, minPrice: b.count ? b.min : null, count: b.count });
  }

  return points;
}

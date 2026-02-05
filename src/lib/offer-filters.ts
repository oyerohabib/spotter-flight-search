import type { NormalizedOffer } from "@/lib/types";

export type OfferFilters = {
  stops: Set<number>; // 0,1,2 (2 means 2+)
  priceMin: number | null;
  priceMax: number | null;
  airlines: Set<string>;
};

export function offerMatchesFilters(
  offer: NormalizedOffer,
  filters: OfferFilters,
) {
  const stopBucket = offer.stopsMax >= 2 ? 2 : offer.stopsMax;
  if (filters.stops.size && !filters.stops.has(stopBucket)) return false;

  if (filters.priceMin !== null && offer.price.amount < filters.priceMin)
    return false;
  if (filters.priceMax !== null && offer.price.amount > filters.priceMax)
    return false;

  if (filters.airlines.size) {
    const ok = offer.airlines.some((a) => filters.airlines.has(a));
    if (!ok) return false;
  }

  return true;
}

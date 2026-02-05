import { describe, expect, it } from "vitest";
import { offerMatchesFilters, type OfferFilters } from "./offer-filters";
import type { NormalizedOffer } from "./types";

function offer(partial: Partial<NormalizedOffer>): NormalizedOffer {
  return {
    id: "o1",
    price: { amount: 100, currency: "USD" },
    validatingAirlineCodes: [],
    airlines: ["AA"],
    outbound: {
      id: "out",
      duration: "PT1H",
      stops: 0,
      departLocalHour: 9,
      segments: [
        {
          id: "s",
          from: "JFK",
          to: "BOS",
          departAt: "2026-03-01T09:00:00-05:00",
          arriveAt: "2026-03-01T10:00:00-05:00",
          carrierCode: "AA",
          flightNumber: "1",
        },
      ],
    },
    inbound: {
      id: "in",
      duration: "PT1H",
      stops: 0,
      departLocalHour: 18,
      segments: [
        {
          id: "s2",
          from: "BOS",
          to: "JFK",
          departAt: "2026-03-05T18:00:00-05:00",
          arriveAt: "2026-03-05T19:00:00-05:00",
          carrierCode: "AA",
          flightNumber: "2",
        },
      ],
    },
    stopsMax: 0,
    ...partial,
  };
}

describe("offerMatchesFilters", () => {
  it("respects stops + price + airline", () => {
    const filters: OfferFilters = {
      stops: new Set([0]),
      priceMin: 90,
      priceMax: 110,
      airlines: new Set(["AA"]),
    };

    expect(offerMatchesFilters(offer({}), filters)).toBe(true);
    expect(
      offerMatchesFilters(
        offer({ price: { amount: 50, currency: "USD" } }),
        filters,
      ),
    ).toBe(false);
    expect(offerMatchesFilters(offer({ airlines: ["DL"] }), filters)).toBe(
      false,
    );
    expect(
      offerMatchesFilters(
        offer({ stopsMax: 2, outbound: { ...offer({}).outbound, stops: 2 } }),
        filters,
      ),
    ).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { pricePointsByDepartureHour } from "./price-trend";
import type { NormalizedOffer } from "./types";

function mkOffer(hour: number, price: number): NormalizedOffer {
  return {
    id: `${hour}-${price}`,
    price: { amount: price, currency: "USD" },
    validatingAirlineCodes: [],
    airlines: ["AA"],
    outbound: {
      id: "out",
      duration: "PT1H",
      stops: 0,
      departLocalHour: hour,
      segments: [
        {
          id: "s",
          from: "A",
          to: "B",
          departAt: "2026-03-01T00:00:00Z",
          arriveAt: "2026-03-01T01:00:00Z",
          carrierCode: "AA",
        },
      ],
    },
    inbound: {
      id: "in",
      duration: "PT1H",
      stops: 0,
      departLocalHour: 12,
      segments: [
        {
          id: "s2",
          from: "B",
          to: "A",
          departAt: "2026-03-05T00:00:00Z",
          arriveAt: "2026-03-05T01:00:00Z",
          carrierCode: "AA",
        },
      ],
    },
    stopsMax: 0,
  };
}

describe("pricePointsByDepartureHour", () => {
  it("produces 24 points and min aggregation", () => {
    const points = pricePointsByDepartureHour([
      mkOffer(8, 300),
      mkOffer(8, 250),
      mkOffer(9, 400),
    ]);
    expect(points).toHaveLength(24);
    expect(points[8]!.minPrice).toBe(250);
    expect(points[8]!.count).toBe(2);
    expect(points[9]!.minPrice).toBe(400);
    expect(points[0]!.minPrice).toBe(null);
  });
});

import { describe, expect, it } from "vitest";
import { normalizeAmadeusFlightOffers } from "./normalize-amadeus";

describe("normalizeAmadeusFlightOffers", () => {
  it("returns normalized offers", () => {
    const payload = {
      data: [
        {
          id: "1",
          price: { currency: "USD", grandTotal: "420.50" },
          validatingAirlineCodes: ["AA"],
          itineraries: [
            {
              duration: "PT5H10M",
              segments: [
                {
                  id: "s1",
                  departure: {
                    iataCode: "JFK",
                    at: "2026-03-01T08:20:00-05:00",
                  },
                  arrival: { iataCode: "DFW", at: "2026-03-01T11:40:00-06:00" },
                  carrierCode: "AA",
                  number: "123",
                  duration: "PT4H20M",
                },
              ],
            },
            {
              duration: "PT5H00M",
              segments: [
                {
                  id: "s2",
                  departure: {
                    iataCode: "DFW",
                    at: "2026-03-08T16:10:00-06:00",
                  },
                  arrival: { iataCode: "JFK", at: "2026-03-08T20:10:00-05:00" },
                  carrierCode: "AA",
                  number: "456",
                  duration: "PT4H00M",
                },
              ],
            },
          ],
        },
      ],
    };

    const { offers, currency } = normalizeAmadeusFlightOffers(payload);
    expect(currency).toBe("USD");
    expect(offers).toHaveLength(1);
    expect(offers[0]!.price.amount).toBe(420.5);
    expect(offers[0]!.stopsMax).toBe(0);
    expect(offers[0]!.outbound.departLocalHour).toBe(8);
    expect(offers[0]!.airlines).toEqual(["AA"]);
  });
});

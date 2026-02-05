import type { NormalizedOffer } from "@/lib/types";

type AmadeusOffer = {
  id?: string;
  price?: { currency?: string; grandTotal?: string };
  validatingAirlineCodes?: string[];
  itineraries?: Array<{
    duration?: string;
    segments?: Array<{
      id?: string;
      departure?: { iataCode?: string; at?: string };
      arrival?: { iataCode?: string; at?: string };
      carrierCode?: string;
      number?: string;
      duration?: string;
    }>;
  }>;
};

function parseAmount(n: unknown): number | null {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (typeof n !== "string") return null;
  const parsed = Number(n);
  return Number.isFinite(parsed) ? parsed : null;
}

function localHourFromIsoLike(at: string | undefined): number | null {
  if (!at || at.length < 13) return null;
  const hour = Number(at.slice(11, 13));
  return Number.isFinite(hour) ? hour : null;
}

export function normalizeAmadeusFlightOffers(payload: unknown): {
  offers: NormalizedOffer[];
  currency: string | null;
} {
  const data = (payload as { data?: unknown })?.data;
  if (!Array.isArray(data)) return { offers: [], currency: null };

  const offers: NormalizedOffer[] = [];
  let currency: string | null = null;

  for (const raw of data) {
    const offer = raw as AmadeusOffer;
    const id = offer.id || crypto.randomUUID();
    const amount = parseAmount(offer.price?.grandTotal);
    const offerCurrency = offer.price?.currency?.toUpperCase() || null;

    const itineraries = offer.itineraries || [];
    const out = itineraries[0];
    const back = itineraries[1];
    if (!out?.segments?.length || !back?.segments?.length) continue;
    if (amount === null || !offerCurrency) continue;

    currency ??= offerCurrency;

    const outboundSegments = out.segments
      .map((s, idx) => ({
        id: s.id || `${id}-o-${idx}`,
        from: s.departure?.iataCode || "",
        to: s.arrival?.iataCode || "",
        departAt: s.departure?.at || "",
        arriveAt: s.arrival?.at || "",
        carrierCode: s.carrierCode || "",
        flightNumber: s.number,
        duration: s.duration,
      }))
      .filter(
        (s) => s.from && s.to && s.departAt && s.arriveAt && s.carrierCode,
      );

    const inboundSegments = back.segments
      .map((s, idx) => ({
        id: s.id || `${id}-i-${idx}`,
        from: s.departure?.iataCode || "",
        to: s.arrival?.iataCode || "",
        departAt: s.departure?.at || "",
        arriveAt: s.arrival?.at || "",
        carrierCode: s.carrierCode || "",
        flightNumber: s.number,
        duration: s.duration,
      }))
      .filter(
        (s) => s.from && s.to && s.departAt && s.arriveAt && s.carrierCode,
      );

    if (!outboundSegments.length || !inboundSegments.length) continue;

    const airlines = Array.from(
      new Set([
        ...outboundSegments.map((s) => s.carrierCode),
        ...inboundSegments.map((s) => s.carrierCode),
      ]),
    ).sort();

    const outboundStops = Math.max(0, outboundSegments.length - 1);
    const inboundStops = Math.max(0, inboundSegments.length - 1);
    const stopsMax = Math.max(outboundStops, inboundStops);

    offers.push({
      id,
      price: { amount, currency: offerCurrency },
      validatingAirlineCodes: (offer.validatingAirlineCodes || []).filter(
        Boolean,
      ),
      airlines,
      outbound: {
        id: `${id}-out`,
        duration: out.duration,
        stops: outboundStops,
        departLocalHour: localHourFromIsoLike(outboundSegments[0]?.departAt),
        segments: outboundSegments,
      },
      inbound: {
        id: `${id}-in`,
        duration: back.duration,
        stops: inboundStops,
        departLocalHour: localHourFromIsoLike(inboundSegments[0]?.departAt),
        segments: inboundSegments,
      },
      stopsMax,
    });
  }

  return { offers, currency };
}

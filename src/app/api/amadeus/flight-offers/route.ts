import { amadeusFetch } from "@/lib/amadeus";
import type { FlightOffersSearchRequest } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request
    .json()
    .catch(() => null)) as FlightOffersSearchRequest | null;

  if (!body) {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const origin = body.origin?.trim().toUpperCase();
  const destination = body.destination?.trim().toUpperCase();
  const departureDate = body.departureDate?.trim();
  const tripType = body.tripType === "one_way" ? "one_way" : "round_trip";
  const returnDate = body.returnDate?.trim();

  if (!origin || !destination || !departureDate) {
    return Response.json(
      { error: "origin, destination, departureDate are required" },
      { status: 400 },
    );
  }

  if (tripType === "round_trip" && !returnDate) {
    return Response.json(
      { error: "returnDate is required for round-trip searches" },
      { status: 400 },
    );
  }

  const adults = Math.max(1, Math.floor(body.adults || 1));
  const currencyCode = (body.currencyCode || "USD").trim().toUpperCase();
  const max = Math.min(50, Math.max(1, Math.floor(body.max || 50)));
  const travelClass = body.travelClass?.trim?.().toUpperCase?.() as
    | "ECONOMY"
    | "PREMIUM_ECONOMY"
    | "BUSINESS"
    | "FIRST"
    | undefined;

  const params = new URLSearchParams({
    originLocationCode: origin,
    destinationLocationCode: destination,
    departureDate,
    adults: String(adults),
    currencyCode,
    max: String(max),
  });

  if (tripType === "round_trip" && returnDate) params.set("returnDate", returnDate);
  if (travelClass) params.set("travelClass", travelClass);

  let res: Response;
  try {
    res = await amadeusFetch(`/v2/shopping/flight-offers?${params}`);
  } catch (e) {
    return Response.json(
      {
        error: "Amadeus request failed",
        details: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  const text = await res.text().catch(() => "");

  if (!res.ok) {
    return Response.json(
      { error: `Amadeus flight offers failed (${res.status})`, details: text },
      { status: res.status },
    );
  }

  // Pass-through for now; we'll normalize in Day 2.
  return new Response(text, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}

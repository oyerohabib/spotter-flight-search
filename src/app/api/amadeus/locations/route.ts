import { amadeusFetch } from "@/lib/amadeus";
import type { LocationSuggestion } from "@/lib/types";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const query = (url.searchParams.get("query") || "").trim();

  if (query.length < 2) {
    return Response.json({ data: [] satisfies LocationSuggestion[] });
  }

  const params = new URLSearchParams({
    keyword: query,
    subType: "AIRPORT,CITY",
    "page[limit]": "10",
    view: "LIGHT",
  });

  let res: Response;
  try {
    res = await amadeusFetch(`/v1/reference-data/locations?${params}`);
  } catch (e) {
    return Response.json(
      {
        error: "Amadeus request failed",
        details: e instanceof Error ? e.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return Response.json(
      { error: `Amadeus locations failed (${res.status})`, details: text },
      { status: res.status },
    );
  }

  const json = (await res.json()) as {
    data?: Array<{
      iataCode?: string;
      name?: string;
      subType?: string;
      address?: { cityName?: string; countryCode?: string };
    }>;
  };

  const data: LocationSuggestion[] = (json.data || [])
    .filter((d) => d.iataCode && d.name)
    .map((d) => ({
      iataCode: d.iataCode as string,
      name: d.name as string,
      subType: d.subType,
      cityName: d.address?.cityName,
      countryCode: d.address?.countryCode,
    }));

  return Response.json({ data });
}

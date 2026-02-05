"use client";

import { PriceTrendChart } from "@/components/price-trend-chart";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { normalizeAmadeusFlightOffers } from "@/lib/normalize-amadeus";
import { type OfferFilters, offerMatchesFilters } from "@/lib/offer-filters";
import { pricePointsByDepartureHour } from "@/lib/price-trend";
import type { FlightOffersSearchRequest, NormalizedOffer } from "@/lib/types";
import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useState,
} from "react";

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "success"; offers: NormalizedOffer[]; currency: string | null };

function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${Math.round(amount)}`;
  }
}

function stopsLabel(stops: number) {
  if (stops <= 0) return "Nonstop";
  if (stops === 1) return "1 stop";
  return `${stops} stops`;
}

function timeHHMM(isoLike: string) {
  if (!isoLike || isoLike.length < 16) return "";
  return isoLike.slice(11, 16);
}

function routeLabel(offer: NormalizedOffer) {
  const o1 = offer.outbound.segments[0];
  const o2 = offer.outbound.segments[offer.outbound.segments.length - 1];
  return `${o1.from} → ${o2.to}`;
}

export function ResultsClient(props: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  adults: number;
}) {
  const { origin, destination, departureDate, returnDate, adults } = props;
  const canRun = origin && destination && departureDate && returnDate;

  const payload = useMemo(
    () =>
      ({
        origin,
        destination,
        departureDate,
        returnDate,
        adults,
        max: 50,
        currencyCode: "USD",
      }) satisfies FlightOffersSearchRequest,
    [origin, destination, departureDate, returnDate, adults],
  );

  const [state, setState] = useState<State>({ status: "idle" });
  const [sort, setSort] = useState<"best" | "price" | "stops">("best");
  const [filters, setFilters] = useState<OfferFilters>({
    stops: new Set<number>(),
    priceMin: null,
    priceMax: null,
    airlines: new Set<string>(),
  });

  async function run() {
    if (!canRun) return;
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/amadeus/flight-offers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        setState({
          status: "error",
          message: `Search failed (${res.status}). Check your .env Amadeus keys.`,
        });
        return;
      }
      const { offers, currency } = normalizeAmadeusFlightOffers(json);
      setState({ status: "success", offers, currency });

      // Initialize price bounds for filtering.
      if (offers.length) {
        const amounts = offers.map((o) => o.price.amount);
        const min = Math.floor(Math.min(...amounts));
        const max = Math.ceil(Math.max(...amounts));
        setFilters((prev) => ({
          ...prev,
          priceMin: prev.priceMin ?? min,
          priceMax: prev.priceMax ?? max,
        }));
      }
    } catch (e) {
      setState({
        status: "error",
        message: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const derived = useMemo(() => {
    if (state.status !== "success") {
      return {
        currency: "USD",
        allAirlines: [] as string[],
        allStopsCounts: { 0: 0, 1: 0, 2: 0 },
        priceMin: 0,
        priceMax: 0,
      };
    }

    const currency = state.currency || state.offers[0]?.price.currency || "USD";
    const allAirlines = Array.from(
      new Set(state.offers.flatMap((o) => o.airlines)),
    ).sort();

    const amounts = state.offers.map((o) => o.price.amount);
    const priceMin = amounts.length ? Math.floor(Math.min(...amounts)) : 0;
    const priceMax = amounts.length ? Math.ceil(Math.max(...amounts)) : 0;

    const allStopsCounts = { 0: 0, 1: 0, 2: 0 };
    for (const o of state.offers) {
      const b = o.stopsMax >= 2 ? 2 : o.stopsMax;
      allStopsCounts[b as 0 | 1 | 2] += 1;
    }

    return { currency, allAirlines, allStopsCounts, priceMin, priceMax };
  }, [state]);

  const filteredOffers = useMemo(() => {
    if (state.status !== "success") return [];
    return state.offers.filter((o) => offerMatchesFilters(o, filters));
  }, [state, filters]);

  const chartPoints = useMemo(() => {
    return pricePointsByDepartureHour(filteredOffers);
  }, [filteredOffers]);

  const sorted = useMemo(() => {
    const offers = [...filteredOffers];
    offers.sort((a, b) => {
      if (sort === "price") return a.price.amount - b.price.amount;
      if (sort === "stops")
        return a.stopsMax - b.stopsMax || a.price.amount - b.price.amount;
      // best: prioritize fewer stops, then price
      return a.stopsMax - b.stopsMax || a.price.amount - b.price.amount;
    });
    return offers;
  }, [filteredOffers, sort]);

  return (
    <section className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div className="grid gap-1">
          <h3 className="text-sm font-semibold tracking-tight">
            Flight results
          </h3>
          {state.status === "success" ? (
            <div className="text-xs text-[color:var(--muted)]">
              {sorted.length} offer(s) shown
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-[color:var(--muted)]">
            Sort
            <select
              className="ml-2 rounded-lg border bg-[color:var(--bg)] px-2 py-1 text-xs"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="best">Best</option>
              <option value="price">Lowest price</option>
              <option value="stops">Fewest stops</option>
            </select>
          </label>
          <Button
            type="button"
            onClick={run}
            disabled={!canRun || state.status === "loading"}
            className="px-3 py-2"
          >
            Refresh
          </Button>
        </div>
      </div>

      {state.status === "idle" ? (
        <Card>
          <div className="text-sm text-[color:var(--muted)]">
            Enter a search to load results.
          </div>
        </Card>
      ) : null}

      {state.status === "loading" ? (
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-4 w-40 rounded bg-black/10 dark:bg-white/10" />
              <div className="mt-3 h-3 w-64 rounded bg-black/10 dark:bg-white/10" />
              <div className="mt-2 h-3 w-52 rounded bg-black/10 dark:bg-white/10" />
            </Card>
          ))}
        </div>
      ) : null}

      {state.status === "error" ? (
        <Card>
          <div className="text-sm text-[color:var(--muted)]">
            {state.message}
          </div>
          <div className="mt-2 text-xs text-[color:var(--muted)]">
            Required: `AMADEUS_CLIENT_ID` and `AMADEUS_CLIENT_SECRET` in `.env`.
          </div>
        </Card>
      ) : null}

      {state.status === "success" ? (
        <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:items-start">
          <div className="hidden lg:block">
            <FiltersPanel
              derived={derived}
              filters={filters}
              onChange={setFilters}
            />
          </div>
          <div className="lg:hidden">
            <details className="rounded-2xl border bg-[color:var(--surface)] p-4">
              <summary className="cursor-pointer text-sm font-semibold">
                Filters
              </summary>
              <div className="mt-3">
                <FiltersPanel
                  derived={derived}
                  filters={filters}
                  onChange={setFilters}
                />
              </div>
            </details>
          </div>

          <div className="grid gap-4">
            <PriceTrendChart points={chartPoints} currency={derived.currency} />

            {sorted.length ? (
              <div className="grid gap-3">
                {sorted.map((offer) => (
                  <Card key={offer.id}>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="grid gap-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <div className="text-sm font-semibold tracking-tight">
                            {routeLabel(offer)}
                          </div>
                          <Badge tone="neutral">
                            {stopsLabel(offer.stopsMax)}
                          </Badge>
                          {offer.airlines.slice(0, 3).map((a) => (
                            <Badge key={a} tone="neutral">
                              {a}
                            </Badge>
                          ))}
                        </div>
                        <div className="text-xs text-[color:var(--muted)]">
                          Outbound:{" "}
                          {timeHHMM(offer.outbound.segments[0]?.departAt)} →{" "}
                          {timeHHMM(
                            offer.outbound.segments[
                              offer.outbound.segments.length - 1
                            ]?.arriveAt,
                          )}{" "}
                          • {stopsLabel(offer.outbound.stops)}
                        </div>
                        <div className="text-xs text-[color:var(--muted)]">
                          Return:{" "}
                          {timeHHMM(offer.inbound.segments[0]?.departAt)} →{" "}
                          {timeHHMM(
                            offer.inbound.segments[
                              offer.inbound.segments.length - 1
                            ]?.arriveAt,
                          )}{" "}
                          • {stopsLabel(offer.inbound.stops)}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                        <div className="text-lg font-semibold tracking-tight">
                          {formatMoney(
                            offer.price.amount,
                            derived.currency || offer.price.currency,
                          )}
                        </div>
                        <div className="text-xs text-[color:var(--muted)]">
                          Total price
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <div className="text-sm text-[color:var(--muted)]">
                  No offers match your filters.
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function FiltersPanel({
  derived,
  filters,
  onChange,
}: {
  derived: {
    currency: string;
    allAirlines: string[];
    allStopsCounts: { 0: number; 1: number; 2: number };
    priceMin: number;
    priceMax: number;
  };
  filters: OfferFilters;
  onChange: Dispatch<SetStateAction<OfferFilters>>;
}) {
  const priceMin = filters.priceMin ?? derived.priceMin;
  const priceMax = filters.priceMax ?? derived.priceMax;

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold tracking-tight">Filters</div>
          <div className="text-xs text-[color:var(--muted)]">
            Updates list + chart instantly
          </div>
        </div>
        <button
          type="button"
          className="text-xs font-medium text-[color:var(--spotter-secondary)] hover:underline"
          onClick={() =>
            onChange({
              stops: new Set<number>(),
              priceMin: derived.priceMin,
              priceMax: derived.priceMax,
              airlines: new Set<string>(),
            })
          }
        >
          Clear
        </button>
      </div>

      <div className="mt-4 grid gap-4">
        <div>
          <Label>Stops</Label>
          <div className="grid gap-2">
            {[
              { k: 0, label: `Nonstop (${derived.allStopsCounts[0]})` },
              { k: 1, label: `1 stop (${derived.allStopsCounts[1]})` },
              { k: 2, label: `2+ stops (${derived.allStopsCounts[2]})` },
            ].map((opt) => (
              <label key={opt.k} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={filters.stops.has(opt.k)}
                  onChange={(e) => {
                    onChange((prev) => {
                      const next = new Set(prev.stops);
                      if (e.target.checked) next.add(opt.k);
                      else next.delete(opt.k);
                      return { ...prev, stops: next };
                    });
                  }}
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <Label>Price range ({derived.currency})</Label>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <div className="mb-1 text-xs text-[color:var(--muted)]">Min</div>
              <Input
                type="number"
                value={priceMin}
                min={derived.priceMin}
                max={priceMax}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  onChange((prev) => ({
                    ...prev,
                    priceMin: Number.isFinite(v) ? v : null,
                  }));
                }}
              />
            </div>
            <div>
              <div className="mb-1 text-xs text-[color:var(--muted)]">Max</div>
              <Input
                type="number"
                value={priceMax}
                min={priceMin}
                max={derived.priceMax}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  onChange((prev) => ({
                    ...prev,
                    priceMax: Number.isFinite(v) ? v : null,
                  }));
                }}
              />
            </div>
          </div>
          <div className="mt-2 grid gap-2">
            <input
              type="range"
              min={derived.priceMin}
              max={derived.priceMax}
              value={priceMax}
              onChange={(e) => {
                const v = Number(e.target.value);
                onChange((prev) => ({ ...prev, priceMax: v }));
              }}
            />
            <div className="text-xs text-[color:var(--muted)]">
              Tip: drag max price for quick narrowing.
            </div>
          </div>
        </div>

        <div>
          <Label>Airlines</Label>
          <div className="max-h-56 overflow-auto rounded-xl border bg-[color:var(--bg)] p-2">
            {derived.allAirlines.length ? (
              <div className="grid gap-1">
                {derived.allAirlines.map((code) => (
                  <label
                    key={code}
                    className="flex items-center gap-2 px-1 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={filters.airlines.has(code)}
                      onChange={(e) => {
                        onChange((prev) => {
                          const next = new Set(prev.airlines);
                          if (e.target.checked) next.add(code);
                          else next.delete(code);
                          return { ...prev, airlines: next };
                        });
                      }}
                    />
                    <span>{code}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div className="text-sm text-[color:var(--muted)]">
                No airlines found.
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

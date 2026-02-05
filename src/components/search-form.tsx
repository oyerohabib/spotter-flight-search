"use client";

import { Button, Input, Label } from "@/components/ui";
import { DateRangePicker } from "@/components/date-range-picker";
import type { LocationSuggestion } from "@/lib/types";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type SelectedLocation = {
  iataCode: string;
  label: string;
};

function formatLocationLabel(s: LocationSuggestion): string {
  const bits = [s.name, s.cityName].filter(Boolean);
  const tail = s.countryCode ? ` • ${s.countryCode}` : "";
  return `${bits.join(" — ")} (${s.iataCode})${tail}`;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function LocationInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: SelectedLocation | null;
  onChange: (next: SelectedLocation | null) => void;
}) {
  const [query, setQuery] = useState(value?.label ?? "");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<LocationSuggestion[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<number | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    if (value?.label) setQuery(value.label);
  }, [value?.iataCode, value?.label]);

  async function search(nextQuery: string) {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    const seq = ++requestSeqRef.current;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/amadeus/locations?query=${encodeURIComponent(nextQuery)}`,
        { signal: ctrl.signal },
      );
      const json = (await res.json()) as { data?: LocationSuggestion[] };
      if (seq === requestSeqRef.current) setOptions(json.data || []);
    } catch (e) {
      // Ignore aborted requests; surface no UI error here.
      if ((e as { name?: string } | null)?.name !== "AbortError") {
        if (seq === requestSeqRef.current) setOptions([]);
      }
    } finally {
      if (seq === requestSeqRef.current) setLoading(false);
    }
  }

  return (
    <div className="relative">
      <Label>{label}</Label>
      <Input
        value={query}
        placeholder="City or airport"
        onChange={(e) => {
          const next = e.target.value;
          setQuery(next);
          setOpen(true);
          onChange(null);

          if (debounceRef.current) window.clearTimeout(debounceRef.current);

          const trimmed = next.trim();
          if (trimmed.length < 2) {
            abortRef.current?.abort();
            setLoading(false);
            setOptions([]);
            return;
          }

          debounceRef.current = window.setTimeout(() => {
            void search(trimmed);
          }, 500);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          // Delay close so click can register.
          window.setTimeout(() => setOpen(false), 120);
        }}
        autoComplete="off"
      />

      {open && (loading || options.length > 0) ? (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border bg-[color:var(--bg)] shadow-sm">
          {loading ? (
            <div className="px-3 py-2 text-xs text-[color:var(--muted)]">
              Searching…
            </div>
          ) : null}
          {options.slice(0, 8).map((opt) => (
            <button
              type="button"
              key={`${opt.iataCode}-${opt.name}`}
              className="block w-full px-3 py-2 text-left text-sm hover:bg-[color:var(--surface)]"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                const next = {
                  iataCode: opt.iataCode,
                  label: formatLocationLabel(opt),
                };
                setQuery(next.label);
                onChange(next);
                setOpen(false);
              }}
            >
              <div className="font-medium">{opt.iataCode}</div>
              <div className="text-xs text-[color:var(--muted)]">
                {formatLocationLabel(opt)}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function SearchForm({
  initial,
}: {
  initial?: {
    origin?: string;
    destination?: string;
    departureDate?: string;
    returnDate?: string;
    tripType?: string;
    adults?: string;
    travelClass?: string;
  };
}) {
  const router = useRouter();
  const today = useMemo(() => new Date(), []);
  const initialDepart = useMemo(() => toYmd(addDays(today, 14)), [today]);
  const initialReturn = useMemo(() => toYmd(addDays(today, 21)), [today]);

  const [origin, setOrigin] = useState<SelectedLocation | null>(null);
  const [destination, setDestination] = useState<SelectedLocation | null>(null);
  const [departureDate, setDepartureDate] = useState(initialDepart);
  const [returnDate, setReturnDate] = useState(initialReturn);
  const [adults, setAdults] = useState(1);
  const [tripType, setTripType] = useState<"round_trip" | "one_way">(
    "round_trip",
  );
  const [travelClass, setTravelClass] = useState<
    "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST"
  >("ECONOMY");

  const [recent, setRecent] = useState<
    Array<{
      origin: string;
      destination: string;
      depart: string;
      ret: string;
      adults: number;
      tripType: "round_trip" | "one_way";
      travelClass: "ECONOMY" | "PREMIUM_ECONOMY" | "BUSINESS" | "FIRST";
      ts: number;
    }>
  >([]);

  const canSearch =
    !!origin?.iataCode &&
    !!destination?.iataCode &&
    departureDate.length === 10 &&
    (tripType === "one_way" || returnDate.length === 10);

  useEffect(() => {
    const raw = window.localStorage.getItem("spotter_recent_searches");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return;
      const migrated = parsed
        .map((r) => {
          const obj = r as Partial<(typeof recent)[number]>;
          const tripType =
            obj.tripType === "one_way" || obj.tripType === "round_trip"
              ? obj.tripType
              : "round_trip";
          const tc = (obj.travelClass || "ECONOMY").toString().toUpperCase();
          const travelClass =
            tc === "ECONOMY" || tc === "PREMIUM_ECONOMY" || tc === "BUSINESS" || tc === "FIRST"
              ? (tc as (typeof recent)[number]["travelClass"])
              : "ECONOMY";

          const origin = (obj.origin || "").toString().toUpperCase();
          const destination = (obj.destination || "").toString().toUpperCase();
          const depart = (obj.depart || "").toString();
          const ret = (obj.ret || "").toString();
          const adults = Math.max(1, Math.floor(Number(obj.adults || 1)));
          const ts = Number(obj.ts || Date.now());
          if (!origin || !destination || !depart) return null;
          return { origin, destination, depart, ret, adults, tripType, travelClass, ts };
        })
        .filter(Boolean)
        .slice(0, 5) as typeof recent;

      setRecent(migrated);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (!initial) return;
    if (initial.origin)
      setOrigin({
        iataCode: initial.origin.toUpperCase(),
        label: initial.origin.toUpperCase(),
      });
    if (initial.destination)
      setDestination({
        iataCode: initial.destination.toUpperCase(),
        label: initial.destination.toUpperCase(),
      });
    if (initial.departureDate) setDepartureDate(initial.departureDate);
    if (initial.returnDate) setReturnDate(initial.returnDate);
    if (initial.adults)
      setAdults(Math.max(1, Math.floor(Number(initial.adults) || 1)));
    if (initial.tripType === "one_way") setTripType("one_way");
    const tc = initial.travelClass?.toUpperCase?.();
    if (tc === "ECONOMY" || tc === "PREMIUM_ECONOMY" || tc === "BUSINESS" || tc === "FIRST") {
      setTravelClass(tc);
    }
    // Only run on initial render / navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (tripType === "round_trip" && !returnDate) {
      setReturnDate(departureDate);
    }
  }, [tripType, departureDate, returnDate]);

  return (
    <form
      className="grid gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!canSearch) return;

        const qs = new URLSearchParams({
          o: origin!.iataCode,
          d: destination!.iataCode,
          depart: departureDate,
          ...(tripType === "round_trip" ? { return: returnDate } : {}),
          adults: String(adults),
          tripType,
          travelClass,
        });

        const nextRecent = [
          {
            origin: origin!.iataCode,
            destination: destination!.iataCode,
            depart: departureDate,
            ret: tripType === "round_trip" ? returnDate : "",
            adults,
            tripType,
            travelClass,
            ts: Date.now(),
          },
          ...recent,
        ]
          .filter(
            (r, idx, arr) =>
              idx ===
              arr.findIndex(
                (x) =>
                  x.origin === r.origin &&
                  x.destination === r.destination &&
                  x.depart === r.depart &&
                  x.ret === r.ret &&
                  x.adults === r.adults &&
                  x.tripType === r.tripType &&
                  x.travelClass === r.travelClass,
              ),
          )
          .slice(0, 5);

        window.localStorage.setItem(
          "spotter_recent_searches",
          JSON.stringify(nextRecent),
        );
        setRecent(nextRecent);

        router.push(`/results?${qs.toString()}`);
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr] sm:items-end">
        <div className="grid gap-1">
          <div className="mb-1 text-xs font-medium text-[color:var(--muted)]">
            Trip type
          </div>
          <div className="inline-flex w-full overflow-hidden rounded-xl border bg-[color:var(--bg)]">
            {[
              { k: "round_trip" as const, label: "Round trip" },
              { k: "one_way" as const, label: "One way" },
            ].map((opt) => (
              <button
                key={opt.k}
                type="button"
                onClick={() => setTripType(opt.k)}
                className={[
                  "w-1/2 px-3 py-2 text-sm",
                  tripType === opt.k
                    ? "bg-spotter-primary text-white"
                    : "text-[color:var(--muted)] hover:bg-[color:var(--surface)]",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Cabin</Label>
          <select
            className="w-full rounded-xl border bg-[color:var(--bg)] px-3 py-2 text-sm"
            value={travelClass}
            onChange={(e) => setTravelClass(e.target.value as typeof travelClass)}
          >
            <option value="ECONOMY">Economy</option>
            <option value="PREMIUM_ECONOMY">Premium economy</option>
            <option value="BUSINESS">Business</option>
            <option value="FIRST">First</option>
          </select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <LocationInput label="Origin" value={origin} onChange={setOrigin} />
        <LocationInput
          label="Destination"
          value={destination}
          onChange={setDestination}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <DateRangePicker
          label={tripType === "one_way" ? "Departure date" : "Dates"}
          start={departureDate}
          end={tripType === "round_trip" && returnDate ? returnDate : undefined}
          minDate={toYmd(today)}
          mode={tripType}
          onChange={(next) => {
            setDepartureDate(next.start);
            if (tripType === "round_trip") {
              setReturnDate(next.end || next.start);
            } else {
              setReturnDate("");
            }
          }}
        />
        <div>
          <Label>Adults</Label>
          <Input
            type="number"
            min={1}
            max={9}
            value={adults}
            onChange={(e) => setAdults(Number(e.target.value || 1))}
          />
        </div>
        <div className="hidden sm:block" />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[color:var(--muted)]">
          Tip: choose airports to improve results quality in the test API.
        </div>
        <Button type="submit" disabled={!canSearch} className="sm:w-auto">
          Search flights
        </Button>
      </div>

      <div className="border-t pt-4">
        {recent.length ? (
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-3">
              <div className="text-xs font-medium text-[color:var(--muted)]">
                Recent searches
              </div>
              <button
                type="button"
                className="text-xs font-medium text-[color:var(--spotter-secondary)] hover:underline"
                onClick={() => {
                  window.localStorage.removeItem("spotter_recent_searches");
                  setRecent([]);
                }}
              >
                Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {recent.map((r) => {
                const qs = new URLSearchParams({
                  o: r.origin,
                  d: r.destination,
                  depart: r.depart,
                  return: r.ret,
                  adults: String(r.adults),
                  tripType: r.tripType,
                  travelClass: r.travelClass,
                });
                return (
                  <Link
                    key={`${r.origin}-${r.destination}-${r.depart}-${r.ret}-${r.adults}-${r.tripType}-${r.travelClass}`}
                    href={`/results?${qs.toString()}`}
                    className="rounded-full border bg-[color:var(--bg)] px-3 py-1 text-xs hover:bg-white/60 dark:hover:bg-white/10"
                  >
                    {r.origin}→{r.destination} • {r.depart}
                    {r.tripType === "round_trip" && r.ret ? `–${r.ret}` : ""} •{" "}
                    {r.travelClass.replace("_", " ")}
                  </Link>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="grid gap-2 rounded-2xl bg-[color:var(--bg)] p-4">
            <div className="text-sm font-semibold tracking-tight">
              Ready for your next trip?
            </div>
            <div className="text-sm text-[color:var(--muted)]">
              Add your route and dates above to surface great options across
              airlines—then narrow it down instantly with filters.
            </div>
            <div className="mt-1 flex flex-wrap gap-2 text-xs">
              {[
                "Fast, live filtering",
                "Compare airlines",
                "Stops control",
                "Price insights by departure time",
              ].map((t) => (
                <span
                  key={t}
                  className="rounded-full border bg-[color:var(--bg)] px-3 py-1 text-[color:var(--muted)]"
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

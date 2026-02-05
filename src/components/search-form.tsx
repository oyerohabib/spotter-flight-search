"use client";

import { Button, Input, Label } from "@/components/ui";
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
    adults?: string;
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

  const [recent, setRecent] = useState<
    Array<{
      origin: string;
      destination: string;
      depart: string;
      ret: string;
      adults: number;
      ts: number;
    }>
  >([]);

  const canSearch =
    !!origin?.iataCode &&
    !!destination?.iataCode &&
    departureDate.length === 10 &&
    returnDate.length === 10;

  useEffect(() => {
    const raw = window.localStorage.getItem("spotter_recent_searches");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as typeof recent;
      if (Array.isArray(parsed)) setRecent(parsed.slice(0, 5));
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
    // Only run on initial render / navigation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          return: returnDate,
          adults: String(adults),
        });

        const nextRecent = [
          {
            origin: origin!.iataCode,
            destination: destination!.iataCode,
            depart: departureDate,
            ret: returnDate,
            adults,
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
                  x.adults === r.adults,
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
      <div className="grid gap-4 sm:grid-cols-2">
        <LocationInput label="Origin" value={origin} onChange={setOrigin} />
        <LocationInput
          label="Destination"
          value={destination}
          onChange={setDestination}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <Label>Departure</Label>
          <Input
            type="date"
            value={departureDate}
            min={toYmd(today)}
            onChange={(e) => setDepartureDate(e.target.value)}
          />
        </div>
        <div>
          <Label>Return</Label>
          <Input
            type="date"
            value={returnDate}
            min={departureDate || toYmd(today)}
            onChange={(e) => setReturnDate(e.target.value)}
          />
        </div>
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
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-[color:var(--muted)]">
          Tip: choose airports to improve results quality in the test API.
        </div>
        <Button type="submit" disabled={!canSearch} className="sm:w-auto">
          Search flights
        </Button>
      </div>

      {recent.length ? (
        <div className="grid gap-2 border-t pt-4">
          <div className="text-xs font-medium text-[color:var(--muted)]">
            Recent searches
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((r) => {
              const qs = new URLSearchParams({
                o: r.origin,
                d: r.destination,
                depart: r.depart,
                return: r.ret,
                adults: String(r.adults),
              });
              return (
                <Link
                  key={`${r.origin}-${r.destination}-${r.depart}-${r.ret}-${r.adults}`}
                  href={`/results?${qs.toString()}`}
                  className="rounded-full border bg-[color:var(--bg)] px-3 py-1 text-xs hover:bg-white/60 dark:hover:bg-white/10"
                >
                  {r.origin}→{r.destination} • {r.depart}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </form>
  );
}

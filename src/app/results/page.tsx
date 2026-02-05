import { ResultsClient } from "@/components/results-client";
import Link from "next/link";

export default function ResultsPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const origin = typeof searchParams.o === "string" ? searchParams.o : "";
  const destination = typeof searchParams.d === "string" ? searchParams.d : "";
  const departureDate =
    typeof searchParams.depart === "string" ? searchParams.depart : "";
  const returnDate =
    typeof searchParams.return === "string" ? searchParams.return : "";
  const adults =
    typeof searchParams.adults === "string" ? searchParams.adults : "1";

  return (
    <div className="grid gap-6">
      <section className="rounded-2xl border bg-[color:var(--surface)] p-4 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="text-xs text-[color:var(--muted)]">Round-trip</div>
            <h2 className="text-xl font-semibold tracking-tight">
              {origin && destination ? `${origin} → ${destination}` : "Results"}
            </h2>
            <div className="text-sm text-[color:var(--muted)]">
              {departureDate && returnDate
                ? `${departureDate} to ${returnDate} • ${adults} adult(s)`
                : "Missing search parameters"}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-xl border bg-[color:var(--bg)] px-4 py-2 text-sm font-medium hover:bg-white/60 dark:hover:bg-white/10"
            >
              New search
            </Link>
            {origin && destination && departureDate && returnDate ? (
              <Link
                href={`/?o=${encodeURIComponent(origin)}&d=${encodeURIComponent(destination)}&depart=${encodeURIComponent(departureDate)}&return=${encodeURIComponent(returnDate)}&adults=${encodeURIComponent(adults)}`}
                className="inline-flex items-center justify-center rounded-xl bg-spotter-primary px-4 py-2 text-sm font-medium text-white hover:opacity-95"
              >
                Edit search
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <ResultsClient
        origin={origin}
        destination={destination}
        departureDate={departureDate}
        returnDate={returnDate}
        adults={Number(adults || 1)}
      />
    </div>
  );
}

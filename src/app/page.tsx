import { SearchForm } from "@/components/search-form";

export default function HomePage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const initial =
    searchParams && typeof searchParams === "object"
      ? {
          origin:
            typeof searchParams.o === "string" ? searchParams.o : undefined,
          destination:
            typeof searchParams.d === "string" ? searchParams.d : undefined,
          departureDate:
            typeof searchParams.depart === "string"
              ? searchParams.depart
              : undefined,
          returnDate:
            typeof searchParams.return === "string"
              ? searchParams.return
              : undefined,
          tripType:
            typeof searchParams.tripType === "string"
              ? searchParams.tripType
              : undefined,
          adults:
            typeof searchParams.adults === "string"
              ? searchParams.adults
              : undefined,
          travelClass:
            typeof searchParams.travelClass === "string"
              ? searchParams.travelClass
              : undefined,
        }
      : undefined;

  return (
    <div className="grid gap-8">
      <section className="grid gap-3">
        <h1 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
          Find flights. Filter fast. See price trends instantly.
        </h1>
        <p className="max-w-2xl text-pretty text-sm text-[color:var(--muted)] sm:text-base">
          Round-trip flight search MVP. Results and the price graph will stay in
          sync as you filter by stops, price, and airline.
        </p>
      </section>
      <section className="rounded-2xl border bg-[color:var(--surface)] p-4 sm:p-6">
        <SearchForm initial={initial} />
      </section>
    </div>
  );
}

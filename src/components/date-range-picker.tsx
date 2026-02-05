"use client";

import { useEffect, useMemo, useRef, useState } from "react";

function clampDate(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function toYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseYmd(ymd: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const dt = new Date(y, mo, d);
  if (Number.isNaN(dt.getTime())) return null;
  return clampDate(dt);
}

function addMonths(date: Date, delta: number) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + delta);
  return d;
}

function formatPretty(ymd: string) {
  const d = parseYmd(ymd);
  if (!d) return ymd;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "2-digit",
    year: "numeric",
  }).format(d);
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(
    date,
  );
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function startWeekday(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).getDay(); // 0 Sun
}

function isSameYmd(a: string, b: string) {
  return a === b;
}

function compareYmd(a: string, b: string) {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function DateRangePicker({
  label,
  start,
  end,
  minDate,
  mode,
  onChange,
}: {
  label: string;
  start: string;
  end?: string;
  minDate: string;
  mode: "round_trip" | "one_way";
  onChange: (next: { start: string; end?: string }) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"start" | "end">("start");

  const min = useMemo(() => parseYmd(minDate) || clampDate(new Date()), [minDate]);
  const startDate = useMemo(() => parseYmd(start), [start]);
  const endDate = useMemo(() => (end ? parseYmd(end) : null), [end]);

  const [cursor, setCursor] = useState<Date>(() => {
    const d = startDate || min;
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!open) return;
      const t = e.target as Node | null;
      if (t && rootRef.current && !rootRef.current.contains(t)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, [open]);

  const display = mode === "one_way" ? formatPretty(start) : `${formatPretty(start)} → ${formatPretty(end || start)}`;

  function selectDay(ymd: string) {
    if (compareYmd(ymd, toYmd(min)) < 0) return;

    if (mode === "one_way") {
      onChange({ start: ymd });
      setOpen(false);
      return;
    }

    if (phase === "start") {
      onChange({ start: ymd, end: undefined });
      setPhase("end");
      return;
    }

    // phase === "end"
    if (compareYmd(ymd, start) < 0) {
      onChange({ start: ymd, end: undefined });
      setPhase("end");
      return;
    }

    onChange({ start, end: ymd });
    setOpen(false);
  }

  // When mode switches to one-way, clear end.
  useEffect(() => {
    if (mode === "one_way" && end) onChange({ start });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Ensure end >= start when provided.
  useEffect(() => {
    if (mode !== "round_trip") return;
    if (!end) return;
    if (compareYmd(end, start) < 0) onChange({ start, end: start });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, end, mode]);

  useEffect(() => {
    if (!open) return;
    setPhase("start");
  }, [open, mode]);

  const cal = useMemo(() => {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const days = daysInMonth(year, month);
    const offset = startWeekday(year, month);

    const cells: Array<{ ymd: string; day: number } | null> = [];
    for (let i = 0; i < offset; i++) cells.push(null);
    for (let d = 1; d <= days; d++) {
      const ymd = toYmd(new Date(year, month, d));
      cells.push({ ymd, day: d });
    }
    while (cells.length % 7 !== 0) cells.push(null);
    return { year, month, cells };
  }, [cursor]);

  function inSelectedRange(ymd: string) {
    if (mode === "one_way") return isSameYmd(ymd, start);
    if (!end) return isSameYmd(ymd, start);
    return compareYmd(ymd, start) >= 0 && compareYmd(ymd, end) <= 0;
  }

  function isDisabled(ymd: string) {
    return compareYmd(ymd, toYmd(min)) < 0;
  }

  return (
    <div ref={rootRef} className="relative">
      <div className="mb-1 text-xs font-medium text-[color:var(--muted)]">
        {label}
      </div>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 rounded-xl border bg-[color:var(--bg)] px-3 py-2 text-left text-sm hover:bg-white/60 dark:hover:bg-white/10"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <div className="truncate">{display}</div>
        <div className="text-xs text-[color:var(--muted)]">
          {mode === "round_trip" && phase === "end" ? "Pick return" : " "}
        </div>
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Choose dates"
          className="absolute left-0 z-20 mt-2 w-full min-w-[280px] overflow-hidden rounded-2xl border bg-[color:var(--bg)] shadow-sm sm:w-[360px]"
        >
          <div className="flex items-center justify-between border-b px-3 py-2">
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm hover:bg-[color:var(--surface)]"
              onClick={() => setCursor((c) => addMonths(c, -1))}
              aria-label="Previous month"
            >
              ←
            </button>
            <div className="text-sm font-semibold">{monthLabel(cursor)}</div>
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-sm hover:bg-[color:var(--surface)]"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              aria-label="Next month"
            >
              →
            </button>
          </div>

          <div className="px-3 py-3">
            <div className="grid grid-cols-7 gap-1 pb-2 text-center text-[10px] font-medium text-[color:var(--muted)]">
              {["S", "M", "T", "W", "T", "F", "S"].map((d) => (
                <div key={d}>{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {cal.cells.map((cell, idx) => {
                if (!cell) return <div key={idx} className="h-9" />;
                const disabled = isDisabled(cell.ymd);
                const selected = inSelectedRange(cell.ymd);
                const isStart = isSameYmd(cell.ymd, start);
                const isEnd = !!end && isSameYmd(cell.ymd, end);

                return (
                  <button
                    key={cell.ymd}
                    type="button"
                    disabled={disabled}
                    onClick={() => selectDay(cell.ymd)}
                    className={[
                      "h-9 rounded-lg text-sm",
                      disabled
                        ? "cursor-not-allowed opacity-40"
                        : "hover:bg-[color:var(--surface)]",
                      selected ? "bg-[color:var(--spotter-other)]" : "",
                      isStart || isEnd ? "bg-spotter-primary text-white" : "",
                    ].join(" ")}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="text-xs text-[color:var(--muted)]">
                {mode === "one_way"
                  ? "Select your departure date."
                  : phase === "start"
                    ? "Select your departure date."
                    : "Select your return date."}
              </div>
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-xs font-medium text-[color:var(--spotter-secondary)] hover:bg-[color:var(--surface)]"
                onClick={() => setOpen(false)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

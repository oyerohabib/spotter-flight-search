"use client";

import type { PricePoint } from "@/lib/price-trend";
import { useMemo, useState } from "react";

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

export function PriceTrendChart({
  points,
  currency,
  height = 220,
}: {
  points: PricePoint[];
  currency: string;
  height?: number;
}) {
  const [hoverHour, setHoverHour] = useState<number | null>(null);

  const { minY, maxY, pathD } = useMemo(() => {
    const prices = points
      .map((p) => p.minPrice)
      .filter((p): p is number => p !== null);
    const minY = prices.length ? Math.min(...prices) : 0;
    const maxY = prices.length ? Math.max(...prices) : 1;
    const pad = (maxY - minY) * 0.1 || 1;
    const y0 = minY - pad;
    const y1 = maxY + pad;

    const w = 1000;
    const h = 300;
    const left = 36;
    const right = 16;
    const top = 16;
    const bottom = 28;
    const plotW = w - left - right;
    const plotH = h - top - bottom;

    const xForHour = (hour: number) => left + (hour / 23) * plotW;
    const yForPrice = (price: number) =>
      top + (1 - (price - y0) / (y1 - y0)) * plotH;

    let d = "";
    let started = false;
    for (const p of points) {
      if (p.minPrice === null) {
        started = false;
        continue;
      }
      const x = xForHour(p.hour);
      const y = yForPrice(p.minPrice);
      d += `${started ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)} `;
      started = true;
    }

    return { minY: y0, maxY: y1, pathD: d.trim() };
  }, [points]);

  const hovered =
    hoverHour === null
      ? null
      : points.find((p) => p.hour === hoverHour) || null;

  return (
    <div className="rounded-2xl border bg-[color:var(--surface)] p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm font-semibold tracking-tight">
          Price by departure time
        </div>
        <div className="text-xs text-[color:var(--muted)]">
          Min price per hour (filtered offers)
        </div>
      </div>

      <div className="mt-3">
        <svg
          viewBox="0 0 1000 300"
          width="100%"
          height={height}
          role="img"
          aria-label="Price trend by departure hour"
          onMouseLeave={() => setHoverHour(null)}
        >
          <rect x="0" y="0" width="1000" height="300" fill="transparent" />

          {/* grid */}
          {[0, 6, 12, 18, 23].map((h) => (
            <g key={h}>
              <line
                x1={36 + (h / 23) * (1000 - 36 - 16)}
                x2={36 + (h / 23) * (1000 - 36 - 16)}
                y1={16}
                y2={300 - 28}
                stroke="rgba(127, 127, 127, 0.18)"
              />
              <text
                x={36 + (h / 23) * (1000 - 36 - 16)}
                y={300 - 10}
                textAnchor="middle"
                fontSize="12"
                fill="rgba(127, 127, 127, 0.75)"
              >
                {String(h).padStart(2, "0")}
              </text>
            </g>
          ))}

          {[0, 0.5, 1].map((t, idx) => (
            <g key={idx}>
              <line
                x1={36}
                x2={1000 - 16}
                y1={16 + t * (300 - 16 - 28)}
                y2={16 + t * (300 - 16 - 28)}
                stroke="rgba(127, 127, 127, 0.18)"
              />
            </g>
          ))}

          {/* line */}
          {pathD ? (
            <path
              d={pathD}
              fill="none"
              stroke="var(--spotter-primary)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : (
            <text
              x="500"
              y="160"
              textAnchor="middle"
              fontSize="14"
              fill="rgba(127, 127, 127, 0.8)"
            >
              Not enough data to chart.
            </text>
          )}

          {/* hover capture */}
          {Array.from({ length: 24 }).map((_, hour) => {
            const x = 36 + (hour / 23) * (1000 - 36 - 16);
            return (
              <rect
                key={hour}
                x={x - 12}
                y={16}
                width={24}
                height={300 - 16 - 28}
                fill="transparent"
                onMouseMove={() => setHoverHour(hour)}
              />
            );
          })}

          {/* tooltip */}
          {hovered && hovered.minPrice !== null ? (
            <g>
              <line
                x1={36 + (hovered.hour / 23) * (1000 - 36 - 16)}
                x2={36 + (hovered.hour / 23) * (1000 - 36 - 16)}
                y1={16}
                y2={300 - 28}
                stroke="rgba(248, 73, 96, 0.55)"
              />
              <foreignObject
                x={Math.min(
                  1000 - 16 - 220,
                  36 + (hovered.hour / 23) * (1000 - 36 - 16) + 12,
                )}
                y={20}
                width={220}
                height={80}
              >
                <div className="rounded-xl border bg-[color:var(--bg)] px-3 py-2 text-xs shadow-sm">
                  <div className="font-medium">
                    {String(hovered.hour).padStart(2, "0")}:00
                  </div>
                  <div className="text-[color:var(--muted)]">
                    Min: {formatMoney(hovered.minPrice, currency)} •{" "}
                    {hovered.count} offer(s)
                  </div>
                  <div className="text-[color:var(--muted)]">
                    Range shown: {formatMoney(minY, currency)} –{" "}
                    {formatMoney(maxY, currency)}
                  </div>
                </div>
              </foreignObject>
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
}

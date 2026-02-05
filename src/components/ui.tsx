import { type ButtonHTMLAttributes } from "react";

export function Button({
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={[
        "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium",
        "bg-spotter-primary text-white hover:opacity-95 active:opacity-90",
        "disabled:cursor-not-allowed disabled:opacity-60",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--spotter-secondary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--bg)]",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export function Input({
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "w-full rounded-xl border bg-[color:var(--bg)] px-3 py-2 text-sm",
        "placeholder:text-[color:var(--muted)]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--spotter-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--surface)]",
        className,
      ].join(" ")}
      {...props}
    />
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-1 text-xs font-medium text-[color:var(--muted)]">
      {children}
    </div>
  );
}

export function Badge({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "primary" | "secondary";
}) {
  const styles =
    tone === "primary"
      ? "bg-spotter-primary text-white"
      : tone === "secondary"
        ? "bg-spotter-secondary text-white"
        : "bg-[color:var(--bg)] text-[color:var(--muted)] border";
  return (
    <span
      className={[
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium",
        styles,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={[
        "rounded-2xl border bg-[color:var(--surface)] p-4",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

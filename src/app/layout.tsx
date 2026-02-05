import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import Image from "next/image";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Spotter Flights By Oyero Habib",
  description: "Responsive flight search MVP (round-trip) by Oyero Habib",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen pb-16">
          <header className="border-b">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
              <Link href="/" className="flex items-center gap-2">
                <Image
                  src="/spotter-mark.svg"
                  alt="Spotter Flights"
                  width={20}
                  height={20}
                  className="h-5 w-5"
                  priority
                />
                <span className="text-sm font-semibold tracking-tight">
                  Spotter Flights
                </span>
              </Link>
              <div className="text-xs text-[color:var(--muted)]">
                Test data via{" "}
                <a
                  href="https://developers.amadeus.com/self-service"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[color:var(--spotter-primary)] hover:underline"
                >
                  Amadeus
                </a>
              </div>
            </div>
          </header>
          <main className="mx-auto w-full max-w-6xl px-4 py-8">{children}</main>
        </div>
        <footer className="fixed inset-x-0 bottom-0 z-20 border-t bg-[color:var(--bg)]/90 backdrop-blur">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-2 px-4 py-3 text-xs text-[color:var(--muted)] sm:flex-row sm:items-center">
            <div>
              Developed with love by{" "}
              <span className="font-medium text-[color:var(--fg)]">
                Oyero Habib
              </span>
            </div>
            <div className="flex items-center gap-3">
              <a
                href="https://github.com/oyerohabib/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[color:var(--spotter-primary)] hover:underline"
              >
                GitHub
              </a>
              <a
                href="https://oyerohabib.com/"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-[color:var(--spotter-primary)] hover:underline"
              >
                Website
              </a>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}

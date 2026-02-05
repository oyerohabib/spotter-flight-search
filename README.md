# Spotter Flight Search (MVP)

Responsive flight search engine MVP (round-trip) with a modern UI and server-side proxy for the Amadeus Self‑Service API (test).

## Getting started

1. Install dependencies:
   - `npm install`
2. Create env file:
   - `cp .env.example .env`
3. Run the app:
   - `npm run dev`
4. Run tests:
   - `npm test`

## Environment variables

- `AMADEUS_CLIENT_ID`
- `AMADEUS_CLIENT_SECRET`
- `AMADEUS_HOST` (optional, defaults to `https://test.api.amadeus.com`)

## API routes

- `GET /api/amadeus/locations?query=lon`
- `POST /api/amadeus/flight-offers` (round-trip offers search)

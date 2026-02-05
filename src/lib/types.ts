export type LocationSuggestion = {
  iataCode: string;
  name: string;
  cityName?: string;
  countryCode?: string;
  subType?: string;
};

export type FlightOffersSearchRequest = {
  origin: string;
  destination: string;
  departureDate: string; // YYYY-MM-DD
  returnDate: string; // YYYY-MM-DD
  adults?: number;
  currencyCode?: string;
  max?: number;
};

export type Money = {
  amount: number;
  currency: string;
};

export type NormalizedSegment = {
  id: string;
  from: string;
  to: string;
  departAt: string; // ISO-like
  arriveAt: string; // ISO-like
  carrierCode: string;
  flightNumber?: string;
  duration?: string;
};

export type NormalizedItinerary = {
  id: string;
  duration?: string;
  stops: number;
  segments: NormalizedSegment[];
  departLocalHour: number | null;
};

export type NormalizedOffer = {
  id: string;
  price: Money;
  validatingAirlineCodes: string[];
  airlines: string[];
  outbound: NormalizedItinerary;
  inbound: NormalizedItinerary;
  stopsMax: number;
};

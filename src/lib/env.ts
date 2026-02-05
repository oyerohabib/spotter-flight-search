export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getAmadeusHost(): string {
  return process.env.AMADEUS_HOST || "https://test.api.amadeus.com";
}

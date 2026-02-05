import { getAmadeusHost, requireEnv } from "@/lib/env";

type TokenState = {
  accessToken: string;
  expiresAtMs: number;
};

declare global {
  // eslint-disable-next-line no-var
  var __amadeusTokenState: TokenState | undefined;
}

async function getAccessToken(): Promise<string> {
  const existing = globalThis.__amadeusTokenState;
  if (existing && existing.expiresAtMs - Date.now() > 30_000) {
    return existing.accessToken;
  }

  const host = getAmadeusHost();
  const clientId = requireEnv("AMADEUS_CLIENT_ID");
  const clientSecret = requireEnv("AMADEUS_CLIENT_SECRET");

  const res = await fetch(`${host}/v1/security/oauth2/token`, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `Amadeus token request failed (${res.status}): ${text || res.statusText}`,
    );
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  const expiresAtMs = Date.now() + json.expires_in * 1000;

  globalThis.__amadeusTokenState = {
    accessToken: json.access_token,
    expiresAtMs,
  };

  return json.access_token;
}

export async function amadeusFetch(path: string, init?: RequestInit) {
  const host = getAmadeusHost();
  const token = await getAccessToken();

  const res = await fetch(`${host}${path}`, {
    ...init,
    headers: {
      ...(init?.headers || {}),
      authorization: `Bearer ${token}`,
    },
  });

  return res;
}

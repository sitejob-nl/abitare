const CONNECT_TOKEN_URL = "https://xeshjkznwdrxjjhbpisn.supabase.co/functions/v1/exact-token";

export interface ExactTokenResponse {
  access_token: string;
  division: number;
  region: string;
  base_url: string;
  expires_at: string;
}

export class ExactReauthRequired extends Error {
  constructor() {
    super("Re-authentication required — open de Exact Online setup-link opnieuw");
    this.name = "ExactReauthRequired";
  }
}

/**
 * Get a fresh Exact Online access token via SiteJob Connect.
 * Call this before every Exact Online API call.
 */
export async function getExactToken(
  tenantId: string,
  webhookSecret: string
): Promise<ExactTokenResponse> {
  const res = await fetch(CONNECT_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      tenant_id: tenantId,
      secret: webhookSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    if (err.needs_reauth) {
      throw new ExactReauthRequired();
    }
    throw new Error(err.error || `Token request failed: ${res.status}`);
  }

  return res.json();
}

/**
 * Helper to get token from a connection record.
 * Decrypts the webhook_secret if encrypted, then fetches token from Connect.
 */
export async function getExactTokenFromConnection(
  connection: { tenant_id: string; webhook_secret: string }
): Promise<ExactTokenResponse> {
  const { decryptToken, isEncrypted } = await import("./crypto.ts");
  
  let webhookSecret = connection.webhook_secret;
  if (isEncrypted(webhookSecret)) {
    webhookSecret = await decryptToken(webhookSecret);
  }

  return getExactToken(connection.tenant_id, webhookSecret);
}

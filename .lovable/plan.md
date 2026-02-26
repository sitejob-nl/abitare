

## Plan: Migratie Exact Online naar SiteJob Connect

### Huidige situatie
Het systeem beheert OAuth tokens zelf: `exact-auth` start de OAuth flow, `exact-auth-callback` wisselt de code om voor tokens, en elke sync-functie (`exact-sync-customers`, `exact-sync-invoices`, `exact-sync-sales-orders`, `exact-sync-purchase-orders`, `exact-api`, `exact-webhooks-manage`) heeft een eigen `getValidToken()` functie die tokens decrypteert, refresht en opslaat. Dit is 6x gedupliceerde token-logica.

Met SiteJob Connect wordt token-management centraal afgehandeld. Het systeem haalt bij elke API call een verse token op via Connect.

### Wat verandert

```text
HUIDIG:
  exact-auth → Exact OAuth → exact-auth-callback → DB (encrypted tokens)
  sync-functies → decrypt → refresh indien nodig → Exact API

NIEUW:
  ExactOnlineSettings → popup connect.sitejob.nl → postMessage → exact-config (ontvangt division info)
  sync-functies → exact-token (SiteJob Connect) → Exact API (met verse token)
```

### Stap 1: Database migratie

Wijzig de `exact_online_connections` tabel:
- **Verwijder** kolommen: `access_token`, `refresh_token`, `token_expires_at` (tokens worden niet meer lokaal opgeslagen)
- **Voeg toe**: `tenant_id TEXT`, `webhook_secret TEXT` (encrypted), `company_name TEXT`, `region TEXT DEFAULT 'nl'`
- De kolommen `division_id`, `exact_division`, `is_active`, `connected_at`, `webhooks_enabled` blijven

### Stap 2: Nieuwe secret toevoegen

- `CONNECT_API_KEY` — nodig voor tenant-registratie bij SiteJob Connect

### Stap 3: Shared helper `_shared/exact-connect.ts`

Eén gedeelde functie die alle sync-functies gebruiken:

```typescript
async function getExactToken(tenantId: string, webhookSecret: string): Promise<{
  access_token: string;
  division: number;
  base_url: string;
}> {
  // POST naar SiteJob Connect exact-token endpoint
  // Bij needs_reauth: throw specifieke error
}
```

Vervangt alle 6 gedupliceerde `getValidToken()` functies. Geen decrypt/encrypt meer nodig.

### Stap 4: Nieuwe edge function `exact-config`

Ontvangt POST van SiteJob Connect na succesvolle OAuth:
- Verifieert `X-Webhook-Secret` header
- Slaat `division`, `company_name`, `region` op in `exact_online_connections`
- Handelt ook `action: disconnect` af

### Stap 5: Edge function `exact-register-tenant` (eenmalig)

Registreert Abitare als tenant bij SiteJob Connect. Wordt aangeroepen vanuit de settings-pagina als er nog geen `tenant_id` is.

### Stap 6: Refactor alle sync edge functions

Betreft 6 bestanden:
- `exact-api/index.ts`
- `exact-sync-customers/index.ts`
- `exact-sync-invoices/index.ts`
- `exact-sync-sales-orders/index.ts`
- `exact-sync-purchase-orders/index.ts`
- `exact-webhooks-manage/index.ts`

Per functie:
1. Verwijder `import { decryptToken, encryptToken, isEncrypted } from "../_shared/crypto.ts"`
2. Verwijder `EXACT_TOKEN_URL` constant
3. Verwijder hele `getValidToken()` functie (40-50 regels per bestand)
4. Importeer `getExactToken` uit `_shared/exact-connect.ts`
5. Vervang token-ophaling: in plaats van `connection.access_token` decrypt → `getExactToken(connection.tenant_id, decryptedWebhookSecret)`
6. Gebruik `base_url` uit Connect response i.p.v. hardcoded `EXACT_API_URL`

### Stap 7: Refactor `exact-webhooks-manage`

- Wijzig webhook CallbackURL naar SiteJob Connect router: `https://xeshjkznwdrxjjhbpisn.supabase.co/functions/v1/exact-webhook-router`
- Bestaande `exact-webhook` functie wordt aangepast om forwarded webhooks van Connect te ontvangen (verificatie via `X-Webhook-Secret` header i.p.v. HMAC)

### Stap 8: Verwijder oude auth functies

- **Verwijder**: `exact-auth/index.ts` en `exact-auth-callback/index.ts` (OAuth flow gaat via SiteJob Connect)
- **Cleanup**: `supabase/config.toml` entries voor `exact-auth` en `exact-auth-callback`

### Stap 9: Frontend — `ExactOnlineSettings.tsx`

- Vervang `useStartExactAuth` (redirect naar OAuth) met popup naar `connect.sitejob.nl/exact-setup?tenant_id={id}`
- Luister op `postMessage` event `exact-connected` (zelfde patroon als WhatsApp)
- Verwijder OAuth callback handling (`useEffect` met `searchParams`)
- Toon `company_name` uit Connect config

### Stap 10: Frontend — `useExactOnline.ts`

- Verwijder `useStartExactAuth` mutation
- Voeg `useRegisterExactTenant` mutation toe
- Pas `useDisconnectExact` aan om disconnect ook naar Connect te melden
- Interface `ExactOnlineConnection` bijwerken (tenant_id, webhook_secret, company_name, region; geen access_token/refresh_token meer)

### Bestanden overzicht

| Actie | Bestand |
|---|---|
| Nieuw | `supabase/functions/_shared/exact-connect.ts` |
| Nieuw | `supabase/functions/exact-config/index.ts` |
| Nieuw | `supabase/functions/exact-register-tenant/index.ts` |
| Refactor | `supabase/functions/exact-api/index.ts` |
| Refactor | `supabase/functions/exact-sync-customers/index.ts` |
| Refactor | `supabase/functions/exact-sync-invoices/index.ts` |
| Refactor | `supabase/functions/exact-sync-sales-orders/index.ts` |
| Refactor | `supabase/functions/exact-sync-purchase-orders/index.ts` |
| Refactor | `supabase/functions/exact-webhooks-manage/index.ts` |
| Refactor | `supabase/functions/exact-webhook/index.ts` |
| Refactor | `src/components/settings/ExactOnlineSettings.tsx` |
| Refactor | `src/hooks/useExactOnline.ts` |
| Verwijder | `supabase/functions/exact-auth/index.ts` |
| Verwijder | `supabase/functions/exact-auth-callback/index.ts` |
| Migratie | `exact_online_connections` tabel |
| Config | `supabase/config.toml` (nieuwe functies, verwijder oude) |
| Secret | `CONNECT_API_KEY` toevoegen |


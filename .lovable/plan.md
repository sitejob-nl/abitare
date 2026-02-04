
# Fix Microsoft Auth: SUPABASE_URL Heeft Verkeerd Formaat

## Probleem Gevonden

De logs tonen:
```
AuthUnknownError: Unexpected token '<', "<html><h"... is not valid JSON
```

Dit betekent dat de Supabase auth client een **HTML pagina** terugkrijgt in plaats van JSON. Dit gebeurt wanneer:
- De `SUPABASE_URL` secret een verkeerde waarde heeft
- Of de URL geen `https://` prefix heeft
- Of de URL verwijst naar een endpoint dat HTML teruggeeft

De environment check zegt `SUPABASE_URL_present: true`, maar dat betekent alleen dat er **iets** is ingevuld - niet dat het correct is.

## Oorzaak

In Supabase Edge Functions zijn `SUPABASE_URL` en `SUPABASE_ANON_KEY` **automatisch beschikbaar** als built-in environment variables. Door ze handmatig als secrets toe te voegen kunnen ze overschreven worden met verkeerde waarden.

## Oplossing

### Stap 1: Verwijder handmatige SUPABASE secrets
De secrets `SUPABASE_URL` en `SUPABASE_ANON_KEY` moeten **niet** handmatig worden toegevoegd - Supabase stelt deze automatisch beschikbaar in Edge Functions.

Deze secrets kunnen verwijderd worden via:
- Supabase Dashboard → Project Settings → Edge Functions → Secrets
- Of door de juiste Supabase secrets te verwijderen

### Stap 2: Update de edge function code
Pas de code aan zodat deze de correcte automatische waarden gebruikt en betere foutmeldingen geeft als ze toch ontbreken.

**Wijzigingen in `supabase/functions/microsoft-auth/index.ts`:**

```typescript
// Regel 13-14: Log de werkelijke URL (gemaskeerd) voor debugging
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

// Debug logging - toon begin van URL om te verifiëren dat het correct is
console.log("Environment check:", {
  MICROSOFT_CLIENT_ID_present: !!MICROSOFT_CLIENT_ID,
  MICROSOFT_TENANT_ID: MICROSOFT_TENANT_ID,
  SUPABASE_URL: SUPABASE_URL ? SUPABASE_URL.substring(0, 30) + "..." : "NOT SET",
  SUPABASE_ANON_KEY_present: !!SUPABASE_ANON_KEY,
});

// Valideer dat SUPABASE_URL correct formaat heeft
if (!SUPABASE_URL || !SUPABASE_URL.startsWith("https://")) {
  throw new Error(`SUPABASE_URL is invalid: ${SUPABASE_URL}`);
}
```

### Stap 3: Zelfde fix voor microsoft-api
Dezelfde aanpassing toepassen in `microsoft-api/index.ts`.

## Technische Details

| Component | Probleem | Oplossing |
|-----------|----------|-----------|
| SUPABASE_URL secret | Overschrijft automatische waarde met verkeerde | Verwijder handmatige secret |
| SUPABASE_ANON_KEY secret | Mogelijk ook verkeerd | Verwijder handmatige secret |
| Edge Function | Krijgt HTML terug i.p.v. JSON | Gebruikt nu automatische Supabase waarden |

## Verwacht Resultaat
Na het verwijderen van de handmatig toegevoegde secrets gebruikt de Edge Function de correcte automatische Supabase environment variables en kan de authenticatie succesvol verlopen.

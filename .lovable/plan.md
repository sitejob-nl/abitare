
# Fix Microsoft Auth: Ontbrekende Supabase Keys

## Probleem Gevonden

De `microsoft-auth` edge function faalt met "Not authenticated" omdat:

1. **`SUPABASE_ANON_KEY` ontbreekt** in de Lovable secrets  
   De functie doet `Deno.env.get("SUPABASE_ANON_KEY") || ""` → levert een lege string op → Supabase client kan geen geldige authenticatie doen

2. **`SUPABASE_URL` ontbreekt waarschijnlijk ook** (hoewel de check op regel 19-21 geen error geeft, wat suggereert dat deze wél beschikbaar is)

**Bewijs uit logs:**
- OPTIONS (preflight) → 200 ✓ (CORS werkt)
- POST → 400 met "Not authenticated" ✗ (auth faalt)

## Oplossing

### Stap 1: Secrets toevoegen
De volgende secrets moeten worden toegevoegd aan Lovable:

| Secret | Waarde |
|--------|--------|
| `SUPABASE_ANON_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZnF4c3BhYW16aHRneGh2bGliIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODgzOTIsImV4cCI6MjA4NTM2NDM5Mn0.GOrfHdV_Vahceqmmn8MajLLJbQan3TF6iQOHB-lGQeA` |
| `SUPABASE_URL` | `https://lqfqxspaamzhtgxhvlib.supabase.co` |

(Deze waarden staan al hardcoded in `src/integrations/supabase/client.ts`, dus ze zijn niet geheim en veilig om toe te voegen)

### Stap 2: Betere error logging in edge function
Pas `microsoft-auth/index.ts` aan om meer diagnostische informatie te loggen:

```typescript
// Voeg logging toe vóór het aanmaken van de client
const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
console.log("SUPABASE_URL present:", !!SUPABASE_URL);
console.log("SUPABASE_ANON_KEY present:", !!anonKey);

if (!anonKey) {
  throw new Error("SUPABASE_ANON_KEY is not configured");
}
```

En bij de auth error:
```typescript
if (userError || !user) {
  console.error("Auth error details:", userError);
  throw new Error(`Not authenticated: ${userError?.message || 'No user returned'}`);
}
```

### Stap 3: Zelfde fix voor microsoft-api
Deze functie heeft hetzelfde probleem en moet ook de SUPABASE secrets correct gebruiken.

## Technische Details

| Component | Status | Na Fix |
|-----------|--------|--------|
| SUPABASE_ANON_KEY secret | Ontbreekt | Toegevoegd |
| SUPABASE_URL secret | Onzeker | Toegevoegd |
| Auth token validatie | Faalt (lege anon key) | Werkt |
| Microsoft OAuth flow | Stopt bij stap 1 | Volledig pad mogelijk |

## Verwacht Resultaat
Na het toevoegen van de secrets en deployen van de verbeterde functie:
- De "Koppel Microsoft Account" knop start de OAuth flow
- Je wordt doorgestuurd naar de Microsoft login pagina
- Na inloggen wordt de connectie opgeslagen in de database

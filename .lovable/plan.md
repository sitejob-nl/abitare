
# Fix Microsoft Outlook Connectie Edge Function Error

## Probleem Geïdentificeerd

De "Not authenticated" error ontstaat doordat de `microsoft-auth` edge function **verouderde CORS headers** gebruikt. De Supabase JavaScript client stuurt extra headers mee die niet zijn toegestaan in de huidige configuratie:

```
Huidige (incorrect):
authorization, x-client-info, apikey, content-type

Vereist:
authorization, x-client-info, apikey, content-type, 
x-supabase-client-platform, x-supabase-client-platform-version, 
x-supabase-client-runtime, x-supabase-client-runtime-version
```

Door deze mismatch blokkeert de browser de `authorization` header tijdens de preflight CORS check, waardoor de authenticatie faalt.

## Oplossing

### Stap 1: Update CORS headers in microsoft-auth
Importeer de gedeelde CORS configuratie uit `_shared/cors.ts` in plaats van lokale headers te definiëren.

**Wijzigingen in `supabase/functions/microsoft-auth/index.ts`:**
- Verwijder de lokale `corsHeaders` definitie (regels 4-8)
- Importeer: `import { corsHeaders } from "../_shared/cors.ts";`

### Stap 2: Consistentie check voor microsoft-auth-callback
Controleer of de callback functie ook correcte CORS headers gebruikt (hoewel deze functie alleen redirects doet en geen JSON responses, dus CORS is daar minder relevant).

## Technische Details

| Component | Huidige Status | Na Fix |
|-----------|---------------|--------|
| microsoft-auth CORS | Verouderd | Gedeelde headers |
| Authorization header | Geblokkeerd | Doorgestuurd |
| getUser() call | Faalt | Werkt |

## Verwacht Resultaat
Na deze fix kan je succesvol je Microsoft/Outlook account koppelen via de Settings pagina.

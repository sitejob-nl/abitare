
# Fix Microsoft Auth: Gebruik Correcte Authenticatie Pattern

## Probleem

De huidige implementatie gebruikt een verkeerde aanpak voor token validatie:

| Aspect | Huidig (fout) | Werkend voorbeeld |
|--------|---------------|-------------------|
| Client key | `SUPABASE_ANON_KEY` | `SUPABASE_SERVICE_ROLE_KEY` |
| Token validatie | `getUser()` zonder token | `getUser(token)` met token |
| Headers | Global headers config | Niet nodig |

## Oplossing

### Stap 1: Update `supabase/functions/microsoft-auth/index.ts`

```text
Wijzigingen:
├── Vervang SUPABASE_ANON_KEY → SUPABASE_SERVICE_ROLE_KEY
├── Extract token uit Authorization header
├── Geef token direct mee aan getUser(token)
└── Verwijder onnodige global headers config
```

Nieuwe code pattern:
```typescript
const supabaseClient = createClient(
  Deno.env.get("SUPABASE_URL") ?? "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

const token = authHeader.replace("Bearer ", "");
const { data: { user } } = await supabaseClient.auth.getUser(token);
```

### Stap 2: Update `supabase/functions/microsoft-api/index.ts`

Zelfde fix toepassen - deze functie heeft exact hetzelfde probleem.

### Stap 3: Deploy en test

Na deployment zou de "Koppel Microsoft Account" knop direct moeten werken.

## Waarom dit werkt

- `SERVICE_ROLE_KEY` heeft admin rechten om elke token te valideren
- `getUser(token)` valideert de meegegeven JWT direct
- Geen afhankelijkheid van global headers die verkeerd kunnen worden geïnterpreteerd

## Technische Details

| Bestand | Actie |
|---------|-------|
| `supabase/functions/microsoft-auth/index.ts` | Vervang auth pattern |
| `supabase/functions/microsoft-api/index.ts` | Zelfde fix |

Geen database wijzigingen nodig. Secrets zijn al aanwezig (`SUPABASE_SERVICE_ROLE_KEY` bestaat al).

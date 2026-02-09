

# Fix: Microsoft OAuth Tenant ID wijzigen naar "common"

## Probleem

De foutmelding zegt: "Geselecteerde gebruikersaccount bestaat niet in tenant SiteJob". Dit komt doordat de OAuth URL de specifieke tenant ID (`2689a9fb-7a87-40fa-9770-2c5d30a95287`) gebruikt, waardoor alleen accounts binnen die ene tenant kunnen inloggen. Externe accounts (zoals `@worldofdeals.nl` of `@gmail.com`) worden geweigerd.

## Oplossing

In de edge function `supabase/functions/microsoft-auth/index.ts` wordt de `MICROSOFT_TENANT_ID` environment variable gebruikt, met fallback naar `"common"`. De huidige secret waarde is echter ingesteld op de SiteJob tenant ID. Er zijn twee opties:

**Optie A (aanbevolen):** De `MICROSOFT_TENANT_ID` secret verwijderen of leegmaken, zodat de fallback `"common"` wordt gebruikt. Dit staat alle Microsoft-accounts toe (persoonlijk, zakelijk, elke tenant).

**Optie B:** De code aanpassen zodat de tenant ID altijd `"common"` of `"organizations"` is, ongeacht de secret.

Ik ga voor **Optie B** -- de code aanpassen zodat het hardcoded `"common"` gebruikt. Dit is betrouwbaarder.

## Technische wijziging

**Bestand:** `supabase/functions/microsoft-auth/index.ts`

Huidige code (regel 13):
```typescript
const MICROSOFT_TENANT_ID = Deno.env.get("MICROSOFT_TENANT_ID") || "common";
```

Wijzigen naar:
```typescript
const MICROSOFT_TENANT_ID = "common";
```

Dat is de enige wijziging. De rest van de functie blijft ongewijzigd. Na deze aanpassing kunnen alle Microsoft-accounts (persoonlijk en zakelijk, ongeacht tenant) inloggen.


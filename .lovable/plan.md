

# Fix: WhatsApp templates worden niet getoond door stale cache

## Probleem

De templates query liep voordat de WhatsApp config bestond in de database. Het resultaat (lege array `[]`) werd gecachet met een staleTime van 5 minuten. Wanneer de config later wel aanwezig is, wordt het gecachete lege resultaat hergebruikt en worden er geen templates getoond.

## Oorzaak

In `useWhatsAppTemplates.ts` wordt bij een fout (geen config) een lege array `[]` geretourneerd. React Query behandelt dit als geldige data en cachet het. Latere calls binnen de staleTime gebruiken de gecachete lege array.

## Oplossing

Twee kleine aanpassingen:

### 1. `src/hooks/useWhatsAppTemplates.ts`

Bij een API-error: gooi een error in plaats van `[]` terug te geven. React Query zal dit als fout markeren (niet als geldige data cachen). Gecombineerd met `retry: false` voorkomt dit loops, maar de query zal opnieuw proberen bij de volgende mount of refetch.

```text
// Huidig (fout):
if (error || data?.error) return [];

// Nieuw:
if (error) throw new Error("WhatsApp API error");
if (data?.error) throw new Error(data.error);
```

### 2. `src/components/settings/WhatsAppSettings.tsx`

Voeg `refetchOnMount: "always"` niet toe aan de hook (die zit in een gedeelde hook). In plaats daarvan: invalideer de templates-query wanneer de status verandert naar connected. Of simpeler: de hook ontvangt al `enabled` parameter. Als `enabled` van `false` naar `true` gaat (status query resolves), zal React Query de data opnieuw ophalen als er geen gecachete SUCCESS data is (een error-state telt niet als success).

Door stap 1 is de cache-state bij een fout nu "error" in plaats van "success met lege data". Wanneer de settings pagina laadt en `isConnected` wordt `true`, zal React Query een verse fetch doen omdat er geen succesvolle cache is.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `src/hooks/useWhatsAppTemplates.ts` | Error gooien i.p.v. lege array retourneren |



# Fix: WhatsApp verbindingsstatus correct detecteren

## Probleem

De WhatsApp settings-pagina toont "Verbonden" terwijl de `whatsapp_config` tabel leeg is. Dit komt doordat de status-check een testbericht stuurt naar `whatsapp-send` en alleen zoekt naar de tekst "niet gekoppeld". Andere foutmeldingen (zoals validatiefouten) worden onterecht als "verbonden" geinterpreteerd.

## Oplossing

Vervang de huidige detectielogica door een directe query op `whatsapp_config` via de `whatsapp-send` edge function. Een betere aanpak: maak de status-check explicieter.

### Aanpassing `WhatsAppSettings.tsx`

In plaats van een testbericht te sturen, stuur een specifiek check-request naar `whatsapp-send` met alleen `{ check: true }`, of beter: pas de detectielogica aan zodat alleen het exacte antwoord "connected: true" als verbonden geldt.

De simpelste fix: draai de logica om. Beschouw de koppeling als **niet verbonden** tenzij het antwoord expliciet aangeeft dat de config bestaat. Concreet: check of `data?.error` een string is die "niet gekoppeld" of "niet geconfigureerd" bevat. Bij elke andere fout (inclusief netwerk errors) toon "Niet gekoppeld".

```text
// Huidige (foutieve) logica:
if (data?.error?.includes("niet gekoppeld")) return { connected: false };
return { connected: true };  // <-- hier gaat het mis

// Nieuwe logica:
if (data?.ok) return { connected: true };
return { connected: false };  // default = niet verbonden
```

De `whatsapp-send` functie geeft alleen `{ ok: true }` terug bij een succesvol verstuurd bericht. Bij alle fouten (geen config, validatie, rate limit) geeft het een error terug. Dus de status wordt alleen "Verbonden" als er daadwerkelijk een bericht verstuurd kan worden -- wat ook niet ideaal is.

**Betere aanpak**: Voeg een lichtgewicht status-endpoint toe aan `whatsapp-send` dat alleen checkt of de config bestaat, zonder daadwerkelijk een bericht te sturen.

### Aanpassing `whatsapp-send` edge function

Voeg ondersteuning toe voor een `action: "status"` parameter:

```text
POST /whatsapp-send
Body: { action: "status" }

Response bij config aanwezig:
{ connected: true, phone: "+31 6 12345678" }

Response bij geen config:
{ connected: false }
```

Dit vereist nog steeds JWT-authenticatie (alleen ingelogde gebruikers mogen de status checken).

### Aanpassing `WhatsAppSettings.tsx`

Vervang de huidige query door:

```text
const { data: configStatus } = useQuery({
  queryKey: ["whatsapp-config-status"],
  queryFn: async () => {
    const { data, error } = await supabase.functions.invoke("whatsapp-send", {
      body: { action: "status" },
    });
    if (error || !data?.connected) return { connected: false };
    return { connected: true, phone: data.phone || null };
  },
});
```

Toon het gekoppelde telefoonnummer als dat beschikbaar is.

## Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/whatsapp-send/index.ts` | Status-check endpoint toevoegen (`action: "status"`) |
| `src/components/settings/WhatsAppSettings.tsx` | Detectielogica vervangen door status-check |


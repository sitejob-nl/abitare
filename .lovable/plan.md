

# "Koppel WhatsApp" knop in WhatsApp Settings

## Wat wordt er gedaan

Een "Koppel WhatsApp" knop toevoegen aan de WhatsApp-instellingenkaart die een popup opent naar SiteJob Connect. Na succesvolle koppeling wordt de status en templates automatisch ververst via een `postMessage` listener.

## Wijzigingen

### `src/components/settings/WhatsAppSettings.tsx`

1. **Imports toevoegen**: `useEffect` en `useQueryClient` van `@tanstack/react-query`
2. **`useQueryClient()`** aanroepen voor cache-invalidatie
3. **`connectWhatsApp` functie**: opent popup naar `https://connect.sitejob.nl/whatsapp-setup?tenant_id=ABITARE_TENANT_ID`
4. **`useEffect` met `message` listener**: luistert naar `e.data.type === "whatsapp-connected"` en invalidateert dan `whatsapp-config-status` en `whatsapp-templates` queries
5. **Knop renderen** als `!isConnected`: een groene "Koppel WhatsApp" knop naast de "Niet gekoppeld" badge in de header

### Visueel

- De knop verschijnt rechts in de card header, naast de status badge
- Alleen zichtbaar als `isConnected === false`
- Styling: groene knop passend bij het WhatsApp-thema (`bg-[#25D366]`)

## Technische details

```text
// Nieuwe state/hooks bovenin component:
const queryClient = useQueryClient();

const connectWhatsApp = () => {
  window.open(
    "https://connect.sitejob.nl/whatsapp-setup?tenant_id=ABITARE_TENANT_ID",
    "whatsapp-setup",
    "width=600,height=700"
  );
};

useEffect(() => {
  const handler = (e: MessageEvent) => {
    if (e.data?.type === "whatsapp-connected") {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-config-status"] });
      queryClient.invalidateQueries({ queryKey: ["whatsapp-templates"] });
    }
  };
  window.addEventListener("message", handler);
  return () => window.removeEventListener("message", handler);
}, [queryClient]);
```

In de JSX header, na de badge:

```text
{!isConnected && (
  <Button
    size="sm"
    className="bg-[#25D366] hover:bg-[#25D366]/90 text-white"
    onClick={connectWhatsApp}
  >
    <MessageCircle className="h-4 w-4 mr-2" />
    Koppel WhatsApp
  </Button>
)}
```

| Bestand | Wijziging |
|---|---|
| `src/components/settings/WhatsAppSettings.tsx` | Knop, popup-functie en postMessage listener toevoegen |


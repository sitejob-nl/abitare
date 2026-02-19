
# WhatsApp Templates ophalen en tonen

## Overzicht

Voeg een `action: "templates"` toe aan de `whatsapp-send` edge function die de goedgekeurde templates ophaalt uit de Meta Graph API. Toon deze in een dropdown in de ComposeWhatsAppDialog en als overzicht in WhatsAppSettings.

## Edge function: `whatsapp-send/index.ts`

Voeg een nieuw `if (body.action === "templates")` blok toe naast het bestaande `action: "status"` blok (na regel 75):

- Haal config op uit `whatsapp_config` (service_role)
- Fetch `https://graph.facebook.com/v21.0/{waba_id}/message_templates?limit=100` met de access_token
- Map de response naar een compact formaat: `name`, `status`, `category`, `language`, `components`
- Return als `{ templates: [...] }`

## Nieuw: `src/hooks/useWhatsAppTemplates.ts`

Hook met `useQuery` die `supabase.functions.invoke("whatsapp-send", { body: { action: "templates" } })` aanroept. Cachet 5 minuten (`staleTime`).

## Aanpassen: `ComposeWhatsAppDialog.tsx`

- Importeer `useWhatsAppTemplates`
- Bij template-tab: vervang het handmatige template naam invoerveld door een `Select` dropdown
- Filter op `status === "APPROVED"`
- Toon template naam + categorie + taal in de opties
- Bij selectie: vul `templateName` en `templateLang` automatisch in
- Verwijder het handmatige taalveld (wordt overgenomen uit de template data)

## Aanpassen: `WhatsAppSettings.tsx`

- Importeer `useWhatsAppTemplates`
- Toon alleen als `isConnected === true`
- Render een lijst/tabel van alle templates met:
  - Naam
  - Status badge (groen voor APPROVED, geel voor PENDING, rood voor REJECTED)
  - Categorie (MARKETING, UTILITY, AUTHENTICATION)
  - Taal

## Bestanden

| Bestand | Wijziging |
|---|---|
| `supabase/functions/whatsapp-send/index.ts` | `action: "templates"` toevoegen |
| `src/hooks/useWhatsAppTemplates.ts` | Nieuw |
| `src/components/customers/ComposeWhatsAppDialog.tsx` | Template dropdown i.p.v. handmatig invoerveld |
| `src/components/settings/WhatsAppSettings.tsx` | Template overzicht tonen |

## Technische details

### Edge function templates action

```text
if (body.action === "templates") {
  // 1. Haal config op (service_role)
  // 2. Check of waba_id aanwezig is
  // 3. GET https://graph.facebook.com/v21.0/{waba_id}/message_templates?limit=100
  // 4. Map naar compact formaat
  // 5. Return { templates: [...] }
}
```

### Template selectie in ComposeWhatsAppDialog

Wanneer een template geselecteerd wordt uit de dropdown, wordt het `template` object automatisch opgebouwd met de juiste `name` en `language.code`. De `components` worden meegestuurd zodat de Meta API weet welke parameters verwacht worden (later uit te breiden met dynamische parameter-invulvelden).

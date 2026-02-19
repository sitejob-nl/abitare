
# Plan: WhatsApp berichten versturen + verbeterde nummernormalisatie

## Overzicht

Uitbreiding van de WhatsApp-integratie met drie verbeteringen op basis van feedback:
1. **Template berichten** naast vrije tekst (vereist buiten 24-uurs venster)
2. **Verbeterde nummernormalisatie** die `06-xxx` correct omzet naar `316xxx`
3. **Rate limiting** in de send function
4. Uitgebreide **webhook** voor status updates (delivered/read)

Plus een nieuwe `whatsapp_config` tabel voor credentials en een `whatsapp-send` edge function.

## Database wijzigingen

### Nieuwe tabel: `whatsapp_config`

Slaat de WhatsApp Business API credentials op (phone_number_id, access_token). RLS enabled zonder policies zodat alleen service_role (edge functions) erbij kan.

```text
whatsapp_config
  id               uuid PK default gen_random_uuid()
  phone_number_id  text NOT NULL
  access_token     text NOT NULL
  display_phone    text
  waba_id          text
  updated_at       timestamptz default now()
```

## Edge functions

### Nieuw: `whatsapp-send`

Verstuurt berichten via de Meta Graph API.

**Authenticatie:** JWT validatie via `getClaims()` -- alleen ingelogde gebruikers.

**Input (POST body):**
```text
{
  to: string,            // telefoonnummer
  message?: string,      // berichttekst (voor type=text)
  type: "text" | "template",
  template?: {           // voor type=template
    name: string,
    language: { code: string },
    components?: [...]
  },
  customer_id?: string,
  order_id?: string,
  ticket_id?: string
}
```

**Logica:**
1. Valideer JWT, haal user ID op
2. **Rate limit check**: max 20 berichten per gebruiker per minuut (telt via `communication_log` query op `sent_by` + `type='whatsapp'` + `direction='outbound'` van afgelopen 60 seconden)
3. Haal credentials op uit `whatsapp_config`
4. **Normaliseer telefoonnummer** met verbeterde functie:
   - Strip alles behalve cijfers en +
   - `06xxx` wordt `316xxx` (leading 0 vervangen door landcode)
   - Strip leading +
5. POST naar `https://graph.facebook.com/v21.0/{phone_number_id}/messages`
6. Bij succes: insert in `communication_log` met `direction='outbound'`, `external_message_id=wamid`
7. Return resultaat

**Config:** `verify_jwt = false` in config.toml (JWT wordt in code gevalideerd)

### Aanpassen: `whatsapp-webhook`

Twee verbeteringen:
1. **Verbeterde nummernormalisatie** bij klant-matching (zelfde `normalizePhone` functie)
2. **Status updates verwerken**: wanneer `changes[0].value.statuses` aanwezig is, update `communication_log.metadata` voor het bijbehorende `external_message_id` (wamid) met de nieuwe status (delivered/read)

## Frontend wijzigingen

### Nieuw: `src/hooks/useWhatsApp.ts`

Hook die:
- `supabase.functions.invoke("whatsapp-send")` aanroept
- Na succes de communicatie-log queries invalidated
- Error handling met toast notificaties

### Nieuw: `src/components/customers/ComposeWhatsAppDialog.tsx`

Dialog voor het versturen van WhatsApp berichten:
- Toggle tussen "Tekst" en "Template" modus
- Bij tekst: textarea voor vrij bericht
- Bij template: template naam selectie (handmatig invoeren, lijst kan later)
- Telefoonnummer veld (voorgevuld met klant mobile/phone)
- Verzendknop met loading state

### Aanpassen: `OrderCommunicationTab.tsx`

- WhatsApp verzendknop toevoegen naast de Email knop
- Zichtbaar wanneer klant een telefoonnummer heeft (mobile of phone)
- Opent `ComposeWhatsAppDialog`

### Aanpassen: `CustomerCommunicationTab.tsx`

- WhatsApp verzendknop toevoegen naast "Nieuwe email"
- Zelfde voorwaarde: klant heeft telefoonnummer

### Aanpassen: `WhatsAppSettings.tsx`

- Query `whatsapp_config` (via een lightweight edge function of direct) om te tonen of de koppeling actief is
- Toon het gekoppelde telefoonnummer als beschikbaar
- Beschrijving updaten: nu zowel ontvangen als versturen

## Bestanden

| Bestand | Actie |
|---|---|
| Database migratie | `whatsapp_config` tabel aanmaken |
| `supabase/functions/whatsapp-send/index.ts` | Nieuw |
| `supabase/functions/whatsapp-webhook/index.ts` | Aanpassen: normalisatie + status updates |
| `supabase/config.toml` | Toevoegen whatsapp-send config |
| `src/hooks/useWhatsApp.ts` | Nieuw |
| `src/components/customers/ComposeWhatsAppDialog.tsx` | Nieuw |
| `src/components/orders/OrderCommunicationTab.tsx` | WhatsApp knop toevoegen |
| `src/components/customers/CustomerCommunicationTab.tsx` | WhatsApp knop toevoegen |
| `src/components/settings/WhatsAppSettings.tsx` | Status + telefoonnummer tonen |

## Technische details

### Nummernormalisatie (gedeeld tussen send en webhook)

```text
function normalizePhone(phone: string): string {
  let cleaned = phone.replace(/[^0-9+]/g, "");
  if (cleaned.startsWith("06")) cleaned = "316" + cleaned.slice(2);
  if (cleaned.startsWith("00")) cleaned = cleaned.slice(2);
  if (cleaned.startsWith("+")) cleaned = cleaned.slice(1);
  return cleaned;
}
```

Wordt gebruikt in:
- `whatsapp-send`: normaliseer het doelnummer voor de Meta API
- `whatsapp-webhook`: normaliseer het afzendernummer EN de DB-nummers bij klant-matching

### Rate limiting

Simpele database-check: tel het aantal outbound WhatsApp berichten van de huidige gebruiker in de afgelopen 60 seconden. Bij meer dan 20 berichten wordt het request geweigerd met een duidelijke foutmelding. Dit voorkomt dat een frontend-bug honderden berichten verstuurt.

### Template berichten

Buiten het 24-uurs servicevenster accepteert de Meta API alleen template berichten. De `type` parameter in de send function bepaalt of een vrij tekstbericht of een template wordt verstuurd. De frontend biedt een toggle tussen beide opties.

### Credentials automatisering

De `whatsapp_config` tabel wordt na de SiteJob Connect Embedded Signup gevuld. Later kan dit geautomatiseerd worden via een callback endpoint van SiteJob Connect dat de credentials direct pusht naar deze tabel.

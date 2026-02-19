

# Plan: WhatsApp ontvangen via SiteJob Connect

## Wat er gebouwd wordt

Inkomende WhatsApp-berichten ontvangen via SiteJob Connect en tonen in de communicatie-tijdlijn van orders, klanten en service tickets. Berichten versturen wordt later toegevoegd.

## Overzicht

SiteJob Connect stuurt inkomende WhatsApp-berichten als standaard Meta webhook payload door naar een edge function. De edge function valideert het bericht, koppelt het telefoonnummer aan een klant, en slaat het op in `communication_log`. De bestaande communicatie-tabs tonen WhatsApp-berichten automatisch, aangevuld met een WhatsApp-icoon.

## Stappen

### 1. Secret toevoegen

Een secret `WHATSAPP_WEBHOOK_SECRET` met waarde `77c76847b89506c13c390997e695930809aebc8c5d434132bdd504a5f0789d42`.

### 2. Edge function: `whatsapp-webhook`

Nieuw bestand: `supabase/functions/whatsapp-webhook/index.ts`

Logica:
- **POST**: Valideer `X-Webhook-Secret` header tegen de secret
- Parse de Meta webhook entry: haal `from` (telefoonnummer), `text.body`, `timestamp`, en `contacts[0].profile.name` op
- Zoek klant op basis van telefoonnummer (vergelijk met `phone`, `phone_2`, `mobile` velden in `customers` tabel, genormaliseerd zonder + en spaties)
- Insert in `communication_log`:
  - `type` = `'whatsapp'`
  - `direction` = `'inbound'`
  - `subject` = `'WhatsApp van {naam}'`
  - `body_preview` = berichttekst (max 500 tekens)
  - `customer_id` = gevonden klant of `null`
  - `sent_at` = timestamp uit het bericht
- Return `200 OK` (SiteJob Connect verwacht een snelle response)

Config in `supabase/config.toml`:
```text
[functions.whatsapp-webhook]
verify_jwt = false
```

### 3. UI: WhatsApp-icoon in communicatie-tijdlijn

De `OrderCommunicationTab` en `CustomerCommunicationTab` tonen al items uit `communication_log`. Aanpassingen:

**OrderCommunicationTab:**
- Voeg een groen WhatsApp-icoon toe naast het pijl-icoon wanneer `log.type === 'whatsapp'`
- Verwijder de blokkade die de tab verbergt als Microsoft niet verbonden is (communicatie is nu breder dan alleen email)
- Toon de tab ook als er geen customerEmail is (WhatsApp werkt op telefoonnummer)

**CustomerCommunicationTab:**
- Voeg WhatsApp-berichten toe aan de tijdlijn (de tab haalt nu alleen Microsoft emails op; er moet ook een query op `communication_log` komen voor WhatsApp-berichten, gecombineerd met de email-lijst)

### 4. Settings: WhatsApp status tonen

In `src/pages/Settings.tsx` onder het koppelingen-tab een `WhatsAppSettings` component toevoegen dat toont:
- Verbindingsstatus (webhook URL is geconfigureerd)
- De webhook URL: `https://lqfqxspaamzhtgxhvlib.supabase.co/functions/v1/whatsapp-webhook`
- Instructie om de SiteJob Connect setup te voltooien

## Bestanden

| Bestand | Actie |
|---|---|
| `supabase/functions/whatsapp-webhook/index.ts` | Nieuw |
| `supabase/config.toml` | Toevoegen webhook config |
| `src/components/orders/OrderCommunicationTab.tsx` | WhatsApp icoon + verwijder Microsoft-blokkade |
| `src/components/customers/CustomerCommunicationTab.tsx` | WhatsApp berichten in tijdlijn |
| `src/components/settings/WhatsAppSettings.tsx` | Nieuw: status component |
| `src/pages/Settings.tsx` | WhatsApp settings toevoegen |

## Technische details

### Webhook payload verwerking

```text
// Binnenkomend payload (Meta format via SiteJob Connect):
entry.changes[0].value.messages[0].from      -> afzender telefoonnummer
entry.changes[0].value.messages[0].text.body  -> berichttekst
entry.changes[0].value.messages[0].timestamp  -> unix timestamp
entry.changes[0].value.contacts[0].profile.name -> naam afzender

// Klant matching:
Normaliseer telefoonnummer (strip +, spaties, landcode varianten)
Zoek in customers: phone, phone_2, mobile
```

### Telefoonnummer normalisatie

Het telefoonnummer van de afzender komt binnen als `31687654321` (zonder +). Bij het zoeken in de klantentabel worden alle telefoonnummervelden genormaliseerd door niet-numerieke tekens te verwijderen, zodat `+31 6-87654321`, `0687654321` en `31687654321` allemaal matchen.

### Communicatie-iconen

```text
type === 'email'    -> Mail icoon (blauw)
type === 'whatsapp' -> MessageCircle icoon (groen, WhatsApp-groen #25D366)
type === 'note'     -> bestaand gedrag
```


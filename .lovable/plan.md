

# Meeting Actiepunten - Gefaseerde Implementatie

## Samenvatting van de meeting

Het verslag beschrijft een end-to-end workflow met **harde gates** (blokkades) op statuswijzigingen, een **aanbetalings-prompt** bij offerte-naar-order conversie, en **visuele indicatoren** op Kanban-kaarten. Hieronder een overzicht van wat al bestaat en wat moet worden gebouwd, opgesplitst in logische fases.

---

## Wat al werkt

| Feature | Status |
|---------|--------|
| Offerte-flow (secties, prijsgroepen, kleuren, referenties) | Compleet |
| Offerte naar Order conversie | Werkend (zonder aanbetaling-prompt) |
| Order Kanban met 11 statussen | Werkend (zonder gates) |
| Betaling registreren (handmatig) | Werkend |
| Documenten en notities op orders | Werkend |
| Service tickets met "Wacht op onderdelen" | Al beschikbaar als status |
| Exact Online, Tradeplace, Outlook koppelingen | Basis werkend |
| Monteursapp | Basis werkend |
| Klantenportaal | Werkend |

---

## Fase 1: Aanbetaling-prompt bij Offerte naar Order (hoge prioriteit)

Bij het omzetten van een offerte naar een order wordt een verplichte keuze gevraagd over de aanbetaling.

### Wijzigingen

**ConvertToOrderDialog.tsx**
- Toevoegen van een stap: "Aanbetaling nu versturen?" met opties Ja/Nee
- Bij "Nee": verplicht datumveld "Wanneer opnieuw vragen?"
- Resultaat wordt opgeslagen op de order als nieuw veld

**useConvertQuoteToOrder.ts**
- Nieuwe parameters meegeven: `deposit_required`, `deposit_invoice_sent`, `deposit_reminder_date`
- Bij "Ja": order aanmaken met `deposit_required: true`, `deposit_invoice_sent: true`

**Database migratie**
- Drie nieuwe kolommen op `orders`:
  - `deposit_required` (boolean, default true)
  - `deposit_invoice_sent` (boolean, default false)
  - `deposit_reminder_date` (date, nullable)

---

## Fase 2: Gate-indicatoren op Kanban-kaarten

Visuele rood/groen bolletjes op elke orderkaart die de status van voorwaarden tonen.

### Indicatoren

- Aanbetaling betaald (groen als `payment_status` = "betaald" of "deels_betaald", of `deposit_required` = false)
- Dossier compleet (later, fase 3)
- Controle goedgekeurd (later, fase 3)

### Wijzigingen

**OrderKanbanCard.tsx**
- Indicators toevoegen onderaan de kaart: kleine gekleurde dots met tooltips
- Data ophalen: `payment_status` en `deposit_required` zijn al beschikbaar op de order

**useOrders.ts**
- De query bevat al alle benodigde velden; eventueel `deposit_required` en `deposit_invoice_sent` toevoegen aan de select

---

## Fase 3: Harde gates op statuswijzigingen (server-side)

Statusovergangen blokkeren als voorwaarden niet voldaan zijn.

### Gate-regels

```text
Naar "besteld" of "bestel_klaar":
  - deposit_required = true --> payment_status moet "deels_betaald" of "betaald" zijn
  
Naar "besteld":
  - Vorige status moet "controle" zijn geweest (vier-ogen principe)
```

### Wijzigingen

**useOrderMutations.ts (useUpdateOrderStatus)**
- Client-side validatie toevoegen voor directe feedback
- Blokkeer de mutatie als gates niet groen zijn, met duidelijke foutmelding

**OrderStatusSelect.tsx**
- Disabled states tonen voor statussen die niet bereikbaar zijn
- Tooltip met uitleg waarom een status geblokkeerd is

**OrderKanbanBoard.tsx**
- `handleDragEnd`: validatie voor het aanroepen van de mutatie
- Toast met reden als een gate de verplaatsing blokkeert

---

## Fase 4: Bestelklaar-checklist

Een configureerbare checklist die bepaalt of een order "bestelklaar" is.

### Wijzigingen

**Database migratie**
- Nieuwe tabel `order_checklist_items` met velden: `order_id`, `label`, `checked`, `checked_by`, `checked_at`
- Of: JSON-kolom `checklist` op de orders-tabel (eenvoudiger)

**OrderDetail.tsx**
- Nieuw component `ChecklistCard` in de sidebar
- Checkboxes voor standaard items (tekeningen aanwezig, inmeting gedaan, etc.)
- Gate-indicator: "Dossier compleet" wordt groen als alle items afgevinkt zijn

---

## Fase 5: Dashboard "Open taken" uitbreiden

Huidige `useActionItems` hook uitbreiden met nieuwe taaktypen.

### Nieuwe actietypes

- "Aanbetaling versturen" (orders waar `deposit_required = true` en `deposit_invoice_sent = false`)
- "Aanbetaling opvolgen" (orders waar `deposit_invoice_sent = true` maar `payment_status = 'open'`)
- "Herinnering aanbetaling" (orders waar `deposit_reminder_date` <= vandaag)
- "Bestellen vrijgegeven" (orders met status `controle` waar alle gates groen zijn)

---

## Aanbevolen startvolgorde

Ik stel voor te beginnen met **Fase 1** (aanbetaling-prompt), omdat dit direct voorkomt dat orders blijven hangen zonder aanbetalingsactie. Dit is de meest impactvolle wijziging met relatief weinig code.

### Bestanden die wijzigen in Fase 1

| Bestand | Wijziging |
|---------|-----------|
| Nieuwe SQL migratie | 3 kolommen op orders |
| `src/integrations/supabase/types.ts` | Types regenereren |
| `src/components/quotes/ConvertToOrderDialog.tsx` | Aanbetaling-stap toevoegen |
| `src/hooks/useConvertQuoteToOrder.ts` | Nieuwe parameters verwerken |

Zal ik starten met Fase 1?


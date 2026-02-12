

# Volledige Gap-Analyse: Systeem vs. Requirements Document

## Overzicht per fase

Dit plan brengt alle openstaande werkzaamheden in kaart, geordend naar het requirements document. Per onderdeel staat de huidige status en wat er concreet moet worden gebouwd.

---

## Fase 0 -- Basisinrichting

| Onderdeel | Status | Toelichting |
|---|---|---|
| Company/vestiging (divisions) | Gereed | Twee vestigingen, admin kan alles zien, sidebar-selector |
| Rollen/rechten | Gereed | admin, manager, verkoper, monteur |
| Leveranciers configureren | Gereed | Suppliers met price_factor, TradePlace tp_id |
| Koppelingen (Microsoft, Exact, TradePlace) | Gereed | OAuth flows + edge functions aanwezig |
| BTW-instellingen per company | Ontbreekt | Vast 21%; geen configureerbaar veld per division |
| Documenttemplates per company | Ontbreekt | PDF-template is hard-coded, niet per vestiging instelbaar |
| Nummerreeksen per company | Ontbreekt | quote_number en order_number zijn globale sequences, niet per vestiging |

### Wat te doen
- Nummerreeksen, BTW-instellingen en document-templates zijn "nice to have" voor nu. Geen blocker voor de klantdemo.

---

## Fase 1 -- Artikel- & prijslijstbeheer

| Onderdeel | Status | Toelichting |
|---|---|---|
| Import Excel/CSV (standaard + prijsgroepen) | Gereed | Edge function `import-products`, 69k items |
| 3-prijsmodel (inkoop/boek/abitare) | Gereed | `cost_price`, `base_price`, `abitare_price = cost x factor` |
| Prijsgroepen (E1-E10, varianten) | Gereed | `product_ranges`, `product_prices` |
| Correcties/overrides bij herimport | Deels | Upsert op article_code, maar geen expliciet "user override" veld dat herimport overleeft |
| Versiebeheer import | Ontbreekt | Geen import-versie of diff/rollback |
| Eenheid als first-class field | Deels | `unit` veld bestaat op quote_lines maar niet consequent op products |

### Wat te doen
- **Override-bescherming bij herimport**: voeg een `user_override` JSONB kolom toe aan products. Bij import: sla velden over die een override hebben.
- **Import-versiehistorie**: nieuw tabel `import_logs` (datum, bron, leverancier, aantal geimporteerd/bijgewerkt).

---

## Fase 2 -- Offerteflow

| Onderdeel | Status | Toelichting |
|---|---|---|
| Start offerte (klant + vestiging + categorie) | Gereed | QuoteFormDialog met categorie-selectie |
| Adresmodel (montage/huidig/aflever/factuur) | Gereed | Op orders; op klant alleen 1 adres |
| Configuratie voor artikelen (prijsgroep, kleur, corpus) | Gereed | QuoteSectionConfig met alle velden |
| Per-regel override (kleur/prijsgroep) | Gereed | `range_override_id`, `color_override` op quote_lines |
| Secties + drag-and-drop | Gereed | SortableSectionCard |
| Prijskeuze per regel + korting | Gereed | Boekprijs vs abitare, section/line discounts |
| Prijssnapshot (offerte bevriest prijs) | Gereed | `unit_price` wordt opgeslagen op line-niveau |
| Offerte PDF | Gereed | `quotePdfGenerator.ts` |
| Offerte versiebeheer/revisies | Ontbreekt | Geen revisie-tracking; duplicatie bestaat wel |
| Bundling/meebestellen (sanitair) | Ontbreekt | Geen dependency/bundle logica |

### Wat te doen
- **Offerte-revisies**: voeg `revision_number` en `parent_quote_id` toe aan quotes. Bij "nieuwe versie" dupliceer offerte met verhoogd revisienummer.
- **Bundling** is een latere fase (sanitairleveranciers).

---

## Fase 3 -- Offerte naar Order

| Onderdeel | Status | Toelichting |
|---|---|---|
| Conversie met alle data | Gereed | `useConvertQuoteToOrder` kopieert secties, regels, configuratie |
| Aanbetaling prompt (ja/nee + herinneringsdatum) | Gereed | ConvertToOrderDialog |
| Status "geaccepteerd" op offerte | Gereed | `accepted_at` wordt gezet |
| Offerte moet ondertekend zijn voor conversie | Ontbreekt | Geen akkoord/handtekening-check; iedereen kan converteren |

### Wat te doen
- **Offerte-akkoord gate**: voeg een `signed_at` / `signed_by` veld toe. Blokkeer conversie als niet ondertekend (of maak optioneel instelbaar).

---

## Fase 4 -- Orderworkflow met harde gates

| Onderdeel | Status | Toelichting |
|---|---|---|
| Kanban board met alle statussen | Gereed | 11 kolommen (nieuw t/m afgerond) |
| Client-side gate validatie | Gereed | `orderGates.ts` met checklist, betaling, vier-ogen checks |
| Server-side gate validatie | ONTBREEKT (KRITIEK) | Gates zijn alleen client-side; DnD of directe API calls omzeilen alles |
| Checklist per order | Gereed | `ChecklistCard` + `useOrderChecklist` |
| Audit trail (status history) | Gereed | `order_status_history` tabel + UI |
| Uitzondering met rol + reden + logging | Ontbreekt | Geen override-mogelijkheid met verplichte reden |
| Aanbetaling gate (betaald via Exact) | Deels | Gate checkt `payment_status`, maar betaalstatus wordt niet automatisch uit Exact gesynchroniseerd |
| Gate-indicatoren op Kanban-kaart | Gereed | Gekleurde dots op OrderKanbanCard |

### Wat te doen (hoogste prioriteit)
1. **Server-side gate validatie**: maak een database trigger `BEFORE UPDATE ON orders` die statuswijzigingen valideert. Dezelfde logica als `orderGates.ts` maar dan onbreekbaar.
2. **Admin override met reden**: voeg `override_reason` en `overridden_by` kolommen toe aan `order_status_history`. Alleen admin/manager mag overriden.
3. **Exact betaalstatus sync**: de `exact-sync-invoices` edge function bestaat maar de automatische polling/webhook die `payment_status` op orders bijwerkt ontbreekt.

---

## Fase 5 -- Planning & uitvoering

| Onderdeel | Status | Toelichting |
|---|---|---|
| Agenda (maand/week/dag) met DnD | Gereed | Calendar.tsx met alle views + drag-and-drop |
| Microsoft Outlook events in agenda | Gereed | `useMicrosoftCalendarEvents` + `MicrosoftEventCard` |
| Conflictdetectie (monteur dubbel ingepland) | Gereed | `useCalendarConflicts` |
| Service ticket inplannen via DnD | Gereed | ServiceTicketSidebar + scheduleTicket mutatie |
| Monteur-app (opdrachten, checklist, werkbon, foto's) | Gereed | InstallerDashboard/OrderDetail/WorkReportForm |
| Document-permissies (intern/monteur/klant) | Gereed | `visible_to_installer` en `visible_to_customer` op documents |
| Monteur ziet alleen eigen opdrachten | Gereed | `installer_orders` view met `installer_id = auth.uid()` filter |
| Financiele data afgeschermd voor monteur | Gereed | `installer_orders` view excludeert unit_price, margins etc. |
| Digitale handtekening klant | Ontbreekt | Geen signature pad in werkbon |
| Outlook event aanmaken vanuit order/ticket | Ontbreekt | Agenda toont events maar er is geen "maak Outlook event aan" vanuit een order |
| Deliverables/deelopdrachten per order | Ontbreekt | Geen sub-delivery model |

### Wat te doen
- **Outlook event aanmaken vanuit order**: knop op OrderDetail die via Microsoft Graph een event maakt in de monteur-agenda en de `external_event_id` opslaat.
- **Digitale handtekening**: canvas-based signature pad in WorkReportForm, opslaan als image in work-report-photos bucket.

---

## Fase 6 -- Facturatie & betalingen

| Onderdeel | Status | Toelichting |
|---|---|---|
| Facturen aanmaken (handmatig) | Gereed | CreateInvoiceDialog |
| Exact factuur sync | Gereed | `exact-sync-invoices` edge function |
| Exact klant sync | Gereed | `exact-sync-customers` edge function |
| Aanbetaling automatisch aanmaken in Exact bij order conversie | Ontbreekt | Prompt bestaat, maar "verstuur nu" maakt geen Exact factuur aan |
| Betaalstatus automatisch ophalen uit Exact | Ontbreekt | Geen automatische polling; handmatige sync knop bestaat |
| Betaalstatus terugkoppelen naar order gates | Ontbreekt | `payment_status` op orders wordt niet automatisch bijgewerkt bij Exact sync |
| Eindfactuur workflow | Ontbreekt | Geen trigger na oplevering om eindfactuur te genereren |
| Factuur-PDF in portaal | Deels | Portal toont facturen maar PDF download is niet geimplementeerd |

### Wat te doen
1. **Aanbetaling-factuur flow**: bij "verstuur nu" in ConvertToOrderDialog, roep `exact-api` edge function aan om SalesEntry te maken.
2. **Automatische betaalstatus sync**: periodic cron of webhook die `orders.payment_status` bijwerkt op basis van Exact receivables.
3. **Factuur PDF**: sla Exact factuur-PDF op in `order-documents` bucket met `visible_to_customer = true`.

---

## Fase 7 -- Communicatie

| Onderdeel | Status | Toelichting |
|---|---|---|
| Email lezen/versturen vanuit klantkaart | Gereed | CustomerCommunicationTab + ComposeEmailDialog via Graph |
| Email lezen/versturen vanuit order | Ontbreekt | Geen communicatie-tab op OrderDetail |
| Email lezen/versturen vanuit service ticket | Ontbreekt | Tickets hebben interne notities maar geen email-integratie |
| Communication log tabel | ONTBREEKT | Geen `communication_log` tabel; emails worden on-demand uit Graph opgehaald |
| Verplichte koppeling communicatie aan dossier/order/ticket | Ontbreekt | Mails zijn niet gelinkt aan orders/tickets in de database |
| WhatsApp Business | Ontbreekt | Niet gestart (bewuste keuze, latere fase) |

### Wat te doen
1. **Communication log tabel**: maak `communication_log` (id, type, direction, subject, body_preview, customer_id, order_id, ticket_id, sent_at, sent_by, external_message_id). Log elke verzonden mail.
2. **Email vanuit order/ticket**: hergebruik ComposeEmailDialog met order_id/ticket_id parameter, log in communication_log.

---

## Fase 8 -- Service

| Onderdeel | Status | Toelichting |
|---|---|---|
| Publiek intake formulier | Gereed | ServiceTicketPublicForm |
| Kanban + lijst view | Gereed | ServiceKanbanBoard + ServiceTicketTable |
| Statussen incl. "wacht op onderdelen/klant" | Gereed | 7 statussen waaronder wacht_op_klant/wacht_op_onderdelen |
| Assignees (meerdere) | Gereed | service_ticket_assignees |
| Interne notities | Gereed | service_ticket_notes |
| Bijlagen | Gereed | service_ticket_attachments |
| Koppeling aan klant/offerte/order | Deels | Klant + offerte koppeling bestaat; order koppeling ontbreekt |
| Extern bericht (mail naar klant) | Ontbreekt | Geen "extern bericht" tab; alleen interne notities |
| Email -> ticket threading | Ontbreekt | Geen automatische ticket aanmaak vanuit inkomende mail |
| Planning koppeling (ticket -> agenda event) | Gereed | DnD vanuit sidebar naar kalender |
| Follow-up reminders bij "wacht op" | Ontbreekt | Geen automatische herinneringen/taken |
| Validatie: niet "afgerond" als er open items zijn | Ontbreekt | Status kan vrij worden gewijzigd |

### Wat te doen
1. **Order koppeling op tickets**: voeg `order_id` foreign key toe aan `service_tickets`.
2. **Extern bericht tab**: splits notities in "intern" en "extern" (extern = mail verzenden via Graph).
3. **Status validatie**: blokkeer "afgerond" als status "wacht_op_onderdelen" of "wacht_op_klant" was zonder tussenliggende actie.

---

## Overige ontbrekende onderdelen

| Onderdeel | Status | Toelichting |
|---|---|---|
| Dossier/Project container | Ontbreekt | Offertes en orders hangen direct aan klant, geen groepering per project |
| Server-side order gates (database trigger) | ONTBREEKT (KRITIEK) | Alleen client-side validatie |
| Inkooporder (supplier order) per leverancier | Gereed | `supplier_orders` + `supplier_order_lines` + PlaceSupplierOrderModal |
| Rapporten/analytics | Minimaal | Reports pagina bestaat maar inhoud is beperkt |

---

## Aanbevolen implementatievolgorde (wat nu te bouwen)

Gebaseerd op impact en demo-waarde:

### Blok 1: Kritieke security + data-integriteit
1. **Server-side order gate trigger** -- database trigger die statuswijzigingen valideert (voorkomt fraude/fouten)
2. **Communication log tabel** -- fundament voor alle communicatie-tracking

### Blok 2: End-to-end financiele flow
3. **Exact aanbetaling-factuur aanmaken** bij order conversie
4. **Automatische betaalstatus sync** (Exact -> orders.payment_status)

### Blok 3: Communicatie completeren
5. **Email vanuit orders en tickets** (hergebruik bestaande ComposeEmailDialog)
6. **Extern bericht op service tickets** (mail naar klant vanuit ticket)

### Blok 4: Planning verrijken
7. **Outlook event aanmaken vanuit order** (montage/levering inplannen)
8. **Digitale handtekening** in werkbon

### Blok 5: Kwaliteitsverbetering
9. **Offerte revisie-tracking** (revision_number + parent_quote_id)
10. **Service ticket order-koppeling** + status validatie
11. **Product override-bescherming** bij herimport

---

## Technische details per prioriteitsitem

### 1. Server-side order gate trigger
- Nieuw: database trigger `validate_order_status_change` op `orders` tabel
- Logica: spiegelt `orderGates.ts` -- checkt payment_status, deposit_required, checklist completeness, vier-ogen principe
- Bij ongeldige transitie: `RAISE EXCEPTION`
- Admin override: als `current_setting('app.override_reason')` is gezet, sta toe en log in `order_status_history`

### 2. Communication log tabel
- Nieuwe migratie: `communication_log` (id, type enum(email/whatsapp/note), direction enum(inbound/outbound), subject, body_preview, customer_id FK, order_id FK nullable, ticket_id FK nullable, sent_at, sent_by FK, external_message_id, metadata JSONB)
- RLS: authenticated users van dezelfde division

### 3. Exact aanbetaling-factuur
- Wijzig `ConvertToOrderDialog`: bij "direct versturen" roep edge function aan die via `exact-api` een SalesEntry maakt
- Update `deposit_invoice_sent = true` en sla `exact_invoice_id` op

### 4. Betaalstatus sync
- Nieuwe edge function `exact-sync-payment-status` of uitbreiding van `exact-sync-invoices`
- Query Exact Receivables, match op `exact_invoice_id`, update `orders.payment_status`
- Optioneel: pg_cron of handmatige "sync" knop

### 5-6. Email vanuit orders/tickets
- Hergebruik `ComposeEmailDialog` met extra props: `orderId`, `ticketId`
- Na verzending: insert in `communication_log`
- Op OrderDetail: nieuwe tab "Communicatie"
- Op ServiceTicketDetail: "Extern bericht" naast "Interne notitie"

### 7. Outlook event vanuit order
- Knop "Plan in Outlook" op OrderDetail
- Roept `microsoft-api` edge function aan met `POST /me/events`
- Slaat `external_event_id` op in order (nieuw veld) of in een `calendar_links` tabel

### Bestanden die worden aangemaakt
| Bestand | Beschrijving |
|---|---|
| Migratie: server-side gate trigger | Database trigger + override kolommen |
| Migratie: communication_log tabel | Nieuwe tabel met RLS |
| Migratie: order kalender link velden | `outlook_event_id` op orders |
| `src/components/orders/OrderCommunicationTab.tsx` | Email tab op OrderDetail |

### Bestanden die worden gewijzigd
| Bestand | Wijziging |
|---|---|
| `src/pages/OrderDetail.tsx` | Communicatie tab toevoegen |
| `src/pages/ServiceTicketDetail.tsx` | Extern bericht functionaliteit, order koppeling |
| `src/components/quotes/ConvertToOrderDialog.tsx` | Exact factuur aanroep |
| `src/components/customers/ComposeEmailDialog.tsx` | order_id/ticket_id props + log naar communication_log |
| `supabase/functions/exact-sync-invoices/index.ts` | Betaalstatus terugkoppelen naar orders |


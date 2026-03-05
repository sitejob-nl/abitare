

# Productie-Gereedheidsplan Abitare ERP

Dit plan adresseert alle issues uit de systeemaudit, gegroepeerd in 7 fasen op volgorde van impact en afhankelijkheden.

---

## Fase 1: Exact Online Activering (hoogste prioriteit)

De hele boekhouding hangt af van werkende Exact-synchronisatie.

### 1A. Automatische sync triggers na create/update

**Probleem:** Sync is volledig handmatig via Settings-knop. 0/17 offertes, 0/14 orders, 0/21 klanten gesynchroniseerd.

**Oplossing:** Database triggers die een `exact_sync_queue` tabel vullen bij INSERT/UPDATE op `customers`, `orders`, `quotes`. Een cron-job (pg_cron + pg_net) verwerkt de queue elke 5 minuten door de bestaande sync edge functions aan te roepen.

| Wijziging | Detail |
|---|---|
| Migratie | Nieuwe tabel `exact_sync_queue(id, table_name, record_id, action, division_id, status, created_at)` |
| Migratie | Trigger functions op `customers`, `orders`, `quotes` die INSERT doen in `exact_sync_queue` |
| Edge function | Nieuw: `exact-process-queue` — leest queue, roept bestaande sync functions aan, markeert als verwerkt |
| Cron | `cron.schedule` elke 5 min voor `exact-process-queue` |
| Frontend | Badge in Settings die queue-status toont (pending count) |

### 1B. Webhook-registratie validatie

**Probleem:** `webhooks_enabled = true` maar 0 webhook logs — webhooks nooit geregistreerd bij Exact.

**Oplossing:** 
- Settings UI: "Controleer webhooks" knop die `exact-webhooks-manage` met action `status` aanroept en het resultaat toont
- Als 0 subscriptions: automatisch opnieuw registreren
- Webhook logs tabel toevoegen voor audit trail

### 1C. company_name op connectie

**Oplossing:** Na succesvolle token-ophaling in `exact-config` endpoint: fetch `/api/v1/{division}/current/Me` en sla `company_name` op.

### 1D. Token-validatietest

**Oplossing:** "Test verbinding" knop in Settings die een simpele API call doet (bijv. `GET /current/Me`) en success/failure toont.

---

## Fase 2: Verbroken Flows Repareren

### 2A. Offerte "Versturen naar klant" knop activeren

**Probleem:** De `handleSend` functie op `QuoteDetail.tsx:207` is een placeholder die "Binnenkort beschikbaar" toont. De onderliggende functionaliteit bestaat al: PDF genereren (`generateQuotePdfBase64`) + email versturen (`ComposeEmailDialog` via Microsoft Graph) + status updaten.

**Oplossing:** 
- `handleSend` opent een `SendQuoteDialog` (nieuw component) die:
  1. PDF genereert via `generateQuotePdfBase64`
  2. Email compose toont met klant-email vooringevuld, offerte-PDF als bijlage
  3. Na verzending: quote status naar `verstuurd` + `sent_at` timestamp + log in `communication_log`
- Hergebruik logica uit `ComposeEmailDialog` en `useMicrosoftMail`

| Bestand | Actie |
|---|---|
| `src/components/quotes/SendQuoteDialog.tsx` | Nieuw component |
| `src/pages/QuoteDetail.tsx` | `handleSend` opent dialog i.p.v. toast |

### 2B. Offerte-totalen reactief maken

**Probleem:** Totalen in database lopen achter op UI. `handleSave` moet handmatig geklikt worden.

**Oplossing:** Automatisch herberekenen bij elke line-mutatie:
- In `useQuoteLines.ts`: na succesvolle `createLine`, `updateLine`, `deleteLine` mutatie → recalculate totals en schrijf naar DB
- Verwijder de handmatige "Opslaan" knop niet (backup), maar maak totalen auto-sync

### 2C. Werkbon-indiening triggert order-status

**Probleem:** Monteur dient werkbon in, maar order blijft op `montage_gepland`. Geen notificatie.

**Oplossing:**
- Database trigger op `work_reports`: wanneer `status` naar `ingediend` → update gekoppelde order naar `gemonteerd`
- Insert `user_mention` voor de admin/manager van de divisie als notificatie
- Migratie: trigger function `on_work_report_submitted`

### 2D. Kalender bidirectioneel

**Probleem:** Outlook event aangemaakt maar geen sync terug.

**Oplossing (pragmatisch):** Dit vereist Microsoft webhook subscriptions (complex infra). Voorlopig:
- Bij openen van OrderDetail: vergelijk `expected_installation_date` met Outlook event datum via Graph API
- Toon waarschuwing als ze uit sync zijn
- "Sync vanuit Outlook" knop om de datum over te nemen
- Volledige bidirectionele sync via webhooks als latere fase

### 2E. Communication_log compleet maken

**Probleem:** Emails verstuurd vanuit Outlook verschijnen niet in order-timeline.

**Oplossing:** 
- Bij openen OrderCommunicationTab: naast `communication_log` ook live Microsoft Graph emails ophalen (gefilterd op klant-email), net als CustomerCommunicationTab al doet
- Merge en sorteer op datum

---

## Fase 3: Data-architectuur Opschonen

### 3A. Kleurensysteem consolideren

**Probleem:** 3 kleur-tabellen, `product_colors` is leeg maar wordt gerefereerd, kleuren worden als vrije tekst opgeslagen.

**Oplossing (niet-destructief):**
- `price_group_colors` is het actieve systeem → behoud als primair
- `quote_sections.color_id` → maak nullable, voeg `color_code` text kolom toe (mirror van front_color)
- `stosa_colors` → markeer als legacy, migreer data naar `price_group_colors` waar relevant
- Geen schema-break, alleen documentatie en UI-verduidelijking

### 3B. Prijsgroep-systeem verduidelijken

**Probleem:** `product_ranges` en `price_groups` bestaan naast elkaar met hetzelfde UI-label.

**Oplossing:**
- UI: hernoem "Prijsgroep" naar "Assortiment" voor ranges-flow (Flow A)
- Code: documenteer welke flow wanneer actief is
- Langetermijn: migreer ranges naar price_groups (aparte fase, niet nu)

### 3C. Factuurmodel

**Probleem:** Geen aparte invoices-tabel, 1:1 relatie orders-facturen limiteert termijnfacturen.

**Oplossing (later):** Dit is een architecturaal herontwerp. Voor nu:
- Documenteer de beperking
- Voeg `invoice_type` enum toe aan orders: `standaard`, `aanbetaling`, `restbetaling`, `meerwerk`
- Sta meerdere `is_standalone_invoice` orders toe per parent order

---

## Fase 4: TradePlace Activering

### 4A. Configuratie-data invullen

**Probleem:** Alle leveranciers hebben `tradeplace_enabled: false`, geen GLN-nummers.

**Oplossing:**
- Data-insert voor bekende leveranciers (Miele, BSH/Bosch/Siemens, Atag, Gaggenau) met GLN-nummers en TP-IDs
- `tradeplace_settings` vullen met retailer GLN en API credentials (via secrets tool)
- UI: validatie in SupplierTradeplaceDialog dat GLN formaat klopt (13 cijfers)

### 4B. End-to-end test flow

Na configuratie: test beschikbaarheidscheck → prijsopvraging → testorder voor één leverancier.

---

## Fase 5: Service & Meerwerk Koppeling

### 5A. Meerwerk-offerte vanuit service ticket

**Probleem:** `quote_id` op service tickets moet handmatig ingevuld.

**Oplossing:**
- "Meerwerk offerte aanmaken" knop op ServiceTicketDetail
- Maakt een quote aan met `category: 'Meerwerk'`, koppelt `quote_id` terug op ticket
- Pre-fill klant en order vanuit ticket

### 5B. Service budget tracking

- Bij afronden ticket (status `afgerond`): trek kosten af van `service_budgets` voor dat jaar
- Toon resterend budget op ServiceTicketDetail

---

## Fase 6: Technische Schuld

### 6A. Debounce fix

**Probleem:** `setTimeout` zonder cleanup in Customers.tsx, Quotes.tsx, Orders.tsx.

**Oplossing:** 
- Maak `useDebounce` hook met `useEffect` cleanup
- Vervang alle 4 pagina's (Products.tsx doet het al correct)

### 6B. PIMS image queue opruimen

**Probleem:** 81 stuck records in `processing`, 113K pending.

**Oplossing:**
- SQL update: reset stuck `processing` records (older than 1 hour) naar `pending`
- Voeg `retry_count` en `max_retries` toe aan queue
- Edge function: skip records met `retry_count >= 3`

### 6C. Realtime sync uitbreiden

**Status:** `useRealtimeSync` is al actief in `AppLayout` en `InstallerLayout` voor 16 tabellen. Het audit-rapport klopt niet — realtime werkt al.

**Verbetering:** Voeg `work_reports` toe aan `TABLE_QUERY_MAP` zodat werkbon-status updates realtime zijn.

### 6D. PWA offline mutation queue (later)

**Probleem:** Monteur in kelder verliest werkbon-data.

**Oplossing:** Dit is een significante feature. Plan:
- IndexedDB-based mutation queue
- Retry bij reconnect
- Conflict resolution UI
- **Aanbeveling:** Aparte fase, niet nu implementeren

---

## Fase 7: WhatsApp Automatisering

### 7A. Auto-templates bij statuswijzigingen

**Probleem:** Geen automatische WhatsApp bij bijv. "montage ingepland".

**Oplossing:**
- Database trigger op `orders.status` wijzigingen
- Bij specifieke statussen (`montage_gepland`, `afgerond`) → insert in `whatsapp_send_queue`
- Nieuw: `whatsapp-auto-send` edge function die queue verwerkt met juiste template
- Admin-configurabel: welke statussen een template triggeren

---

## Prioritering & Implementatievolgorde

| Fase | Geschatte omvang | Prioriteit |
|---|---|---|
| 2A. Offerte versturen activeren | Klein (1 component) | **P1 — direct waarde** |
| 2B. Reactieve totalen | Klein (hook aanpassing) | **P1** |
| 2C. Werkbon → order status | Klein (1 trigger) | **P1** |
| 6A. Debounce fix | Triviaal | **P1** |
| 1A-D. Exact Online activering | Groot (queue + cron + UI) | **P2** |
| 2E. Communication_log | Medium | **P2** |
| 3A-B. Kleur/prijsgroep verduidelijking | Medium | **P3** |
| 5A-B. Service meerwerk | Medium | **P3** |
| 4A-B. TradePlace activering | Klein (data + config) | **P3** |
| 7A. WhatsApp auto-templates | Medium | **P4** |
| 2D. Kalender bidirectioneel | Complex | **P4** |
| 6B. PIMS queue | Klein | **P4** |
| 6D. PWA offline | Zeer complex | **P5** |
| 3C. Factuurmodel redesign | Zeer complex | **P5** |

---

## Aanbevolen eerste stap

Begin met Fase 2A + 2B + 2C + 6A (alle P1 items). Dit zijn relatief kleine wijzigingen die direct merkbare waarde opleveren voor de dagelijkse gebruikers.


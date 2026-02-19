

# Statusoverzicht: Wat is gebouwd vs. Wat moet nog

## Legenda
- [x] = Gebouwd en werkend
- [~] = Deels gebouwd / basis aanwezig maar niet compleet
- [ ] = Nog niet gebouwd

---

## Fase A -- Foundation

- [x] **Organisatiestructuur (multi-vestiging)**: Divisions tabel met RLS-filtering per vestiging
- [x] **Gebruikers, rollen en rechten**: `user_roles` tabel met admin/manager/verkoper/monteur, RLS policies op alle tabellen
- [~] **SSO / Microsoft login**: Microsoft OAuth koppeling bestaat (microsoft-auth, microsoft-auth-callback), maar login gaat nu via Supabase email/password -- geen echte SSO (Microsoft als identity provider)
- [x] **Audit trail**: `order_status_history` en `service_ticket_status_history` tabellen met wie/wat/wanneer + override logging

---

## Fase B -- Product & leveranciersdata

- [x] **Merken/leveranciersbeheer**: Suppliers tabel met Tradeplace-velden, actief/inactief, pricing configuratie
- [~] **Content Hub (Tradeplace)**: PIMS import pipeline bestaat (pims-import, pims-process-images), maar er is **geen toestemmingsworkflow per merk** (aanvraag/goedkeuring/status tracking)
- [x] **Importpipeline**: import-products edge function, ProductImport pagina, import_logs tabel
- [~] **Pricing engine**: Basale pricing via `calc_selling_price` (points_to_eur, price_factor), maar **geen rule-based engine** met btw-handling, korting, index, opslag en auditability per revisie

---

## Fase C -- Salesflow

- [x] **Project aanmaken**: `projects` tabel met project_number, customer_id, division_id
- [x] **Deelofferte aanmaken binnen project**: Offertes gekoppeld aan project via `project_id`
- [x] **Revisies**: `parent_quote_id`, `revision_number`, reference met "(rev N)" suffix
- [x] **Kopieeractie expliciet**: DuplicateChoiceDialog met "Nieuwe revisie" vs "Nieuwe deelofferte"
- [x] **Offerte-output**: PDF generatie met jsPDF, secties, regels, totalen
- [~] **Offerte communicatie**: E-mail versturen bestaat, WhatsApp koppeling is net gebouwd maar **Meta permissions probleem blokkeert versturen**
- [x] **Akkoord naar order**: ConvertToOrderDialog met orderregels overnemen, project_id behouden

---

## Fase D -- Order-/projectportaal

- [x] **Statusmodel met drag-and-drop**: Kanban board met 11 statuskolommen
- [x] **Harde gates**: Checklist, aanbetaling en vier-ogen principe (client-side + server-side trigger `trg_validate_order_status`)
- [x] **Admin override**: Via `app.override_reason` sessievariabele met logging
- [x] **Stamdata en rollen**: Klant, adressen (montage/aflever/factuur), verkoper, assistent, monteur toewijzing
- [x] **Aanbetaling**: `deposit_required`, `payment_status`, `amount_paid` velden
- [x] **Checklist**: `order_checklist_items` tabel met checked/checked_by/sort_order
- [x] **Documenten met visibility**: `order_documents` met `visible_to_customer` en `visible_to_installer`
- [~] **Controle (2e paar ogen)**: Gate bestaat (vier-ogen principe), maar er is **geen expliciete validatie op verplichte velden/documenten** bij controle-akkoord
- [x] **Bestellen bij leveranciers**: Tradeplace order edge function + supplier_orders tracking

---

## Fase E -- Planning & monteurs-app

- [x] **Planning/Agenda**: Calendar pagina met dag/week-views, Microsoft Outlook sync
- [x] **Monteurs-app**: InstallerDashboard, InstallerOrderDetail, WorkReportForm
- [x] **Werkbon**: Taken, foto's (voor/tijdens/na/schade), tijdregistratie, handtekening
- [x] **Checklist in werkbon**: TaskChecklist component met add/toggle
- [~] **Schade-flow (hard blockend)**: Basis gebouwd -- hasDamage vraag + minimaal 1 foto + beschrijving verplicht. **Ontbreekt**: maatvoering, positie/locatie, koppeling aan artikelregel
- [ ] **Google Maps navigatie**: Niet geimplementeerd
- [~] **Planningvenster beperking**: Geen beperking van max 7 dagen vooruit in monteurs-app

---

## Fase F -- Oplevering, afsluiting, service en communicatie

- [x] **Service-module**: ServiceTickets met statusflow, prioriteit, type (klacht/garantie/schade/overig), publiek formulier
- [x] **Service gates**: Trigger `validate_ticket_status_change` blokkeert direct afronden vanuit wacht-statussen
- [x] **Service Kanban**: Drag-and-drop bord + tabelweergave
- [x] **Communicatie-logging**: `communication_log` tabel met type/richting/subject
- [~] **E-mail inbox per klant/zaak**: ComposeEmailDialog bestaat, maar **geen echte inbox** (alleen outbound)
- [~] **WhatsApp**: Backend gebouwd (whatsapp-send/webhook/config), UI voor templates + vrije tekst, maar **Meta permissions blokkeren nog**
- [ ] **Opleverdocumenten/klantportaal publicatie**: Klantportaal bestaat (portal/*), maar geen expliciete opleverstatus of publicatie-workflow
- [x] **Facturatie**: Invoices pagina + Exact sync

---

## Integraties

| Integratie | Status | Ontbreekt |
|---|---|---|
| Exact Online (stamdata) | [x] Gebouwd | Bi-directionele sync werkt, webhooks, klanten/facturen/orders |
| Tradeplace (bestellen) | [x] Gebouwd | Availability check + order placement |
| Tradeplace Content Hub | [~] Deels | Toestemmingsworkflow per merk ontbreekt |
| Microsoft 365 (OAuth) | [x] Gebouwd | Calendar sync + OneDrive opslag werkt |
| WhatsApp | [~] Deels | Backend klaar, UI klaar, Meta permissions probleem |
| Stocia | [ ] Niet gebouwd | Geen scope gedefinieerd |
| 3Play | [ ] Niet gebouwd | Geen scope gedefinieerd |
| Google Maps (monteur) | [ ] Niet gebouwd | Navigatie-link naar adres |

---

## Prioriteitenlijst: wat moet nog

### Hoge prioriteit (kernfunctionaliteit ontbreekt)

1. **WhatsApp Meta permissions fixen** -- WABA subscription uitvoeren (configuratie, geen code)
2. **Schade-flow completeren** -- Maatvoering, positie/locatie en koppeling aan artikelregel toevoegen in WorkReportForm
3. **Controle-validatie uitbreiden** -- Bij status "Controle" verplichte velden en documenten checken (niet alleen vier-ogen)
4. **Google Maps navigatie** -- Link/knop in monteurs-app om adres te openen in Google Maps

### Middel prioriteit (verbetering bestaande flows)

5. **Pricing engine verbeteren** -- Rule-based configuratie per leverancier met btw-handling, korting, index, auditability
6. **Content Hub toestemmingsworkflow** -- Status tracking per merk/leverancier (aanvraag/goedkeuring/import/updates)
7. **E-mail inbox** -- Inbound e-mails koppelen aan klant/zaak (niet alleen outbound)
8. **Planningvenster monteurs** -- Beperking tot max 7 dagen vooruit
9. **Opleverstatus en klantportaal-publicatie** -- Expliciete oplevering-flow met document-publicatie

### Lage prioriteit (uitbreidingen)

10. **SSO via Microsoft** -- Microsoft als identity provider ipv aparte login
11. **Stocia en 3Play connectors** -- Scope moet nog gedefinieerd worden
12. **Automatische taaktoewijzing** -- Op basis van workload/regio bij statuswijzigingen
13. **Automatische servicecase bij schade** -- Na werkbon-afronden met schade automatisch ticket aanmaken


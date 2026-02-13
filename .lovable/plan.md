

# Gap-analyse en Implementatie-roadmap

## Huidige status: wat is al gebouwd

Op basis van de codebase-analyse is het merendeel van de kernfunctionaliteit al operationeel:

### Volledig operationeel

| Fase | Onderdeel | Status |
|------|-----------|--------|
| A | Multi-vestiging (Roermond/Maastricht) met division_id filtering + RLS | Gereed |
| A | Gebruikersrollen (admin, manager, verkoper, assistent, monteur, werkvoorbereiding, administratie) | Gereed |
| A | Rolgebaseerde routering (monteurs naar /monteur, ProtectedRoute) | Gereed |
| A | Audit trail: statusgeschiedenis (orders + service tickets) met wie/wanneer/van-naar | Gedeeltelijk |
| B | Productenimport (JSON chunks + Excel) met prijsgroepen, ranges, kleuren | Gereed |
| B | Leveranciersbeheer met price_factor, Tradeplace config, kortingsgroepen | Gereed |
| B | Import geschiedenis logging | Gereed |
| C | Offertes met secties, inline bewerking, drag-and-drop, kortingen | Gereed |
| C | Revisies (parent_quote_id + revision_number) | Gereed |
| C | Offerte dupliceren | Gereed |
| C | Offerte naar Order conversie (inclusief secties/regels kopieren) | Gereed |
| C | PDF generatie met offerte/revisienummer | Gereed |
| D | Order statusflow (11 statussen) met Kanban-bord | Gereed |
| D | Harde gates: aanbetaling, checklist, vier-ogen principe (client + server-side trigger) | Gereed |
| D | Aanbetalingsbeheer (deposit_required, invoice_sent, reminder_date) | Gereed |
| D | Order documenten met visibility (intern/monteur/klant) | Gereed |
| D | Inkooporders gegroepeerd per leverancier + Tradeplace bestelling | Gereed |
| D | Notities met niveaus (intern/monteur/klant) | Gereed |
| E | Monteursapp: dagplanning, werkbonnen, checklist, foto's (voor/tijdens/na/schade), handtekening | Gereed |
| E | Planning max 1 week vooruit, read-only voor monteurs | Gereed |
| E | Werkbon workflow (concept/ingediend/goedgekeurd) met auto-statusupdate order | Gereed |
| F | Service tickets: publiek formulier, kanban, statusflow, toewijzing, bijlagen | Gereed |
| F | Service ticket scheduling via drag-and-drop op agenda | Gereed |
| F | E-mail integratie via Microsoft Graph API (live ophalen, versturen) | Gereed |
| F | Klantportaal (orders, offertes, documenten, planning) | Gereed |
| Int | Exact Online: klanten, facturen, verkoop-/inkooporders, betalingsstatus sync | Gereed |
| Int | Tradeplace: bestellen, beschikbaarheid, webhooks | Gereed |
| Int | Microsoft 365: agenda sync, e-mail, OneDrive documentopslag | Gereed |

---

## Wat ontbreekt: openstaande items

### Prioriteit 1 -- Structureel (voor 19 feb demo)

**1. Projectcontainer (Dossier)**
De architectuur voorziet in een "project" als overkoepelende container voor deeloffertes, orders en servicetickets. Momenteel zijn offertes en orders direct aan een klant gekoppeld, zonder tussenliggende projectlaag.

- Nieuwe tabel: `projects` (project_number, customer_id, division_id, status, created_by, created_at)
- FK's toevoegen: `quotes.project_id`, `orders.project_id`, `service_tickets.project_id`
- UI: Projectoverzicht op klantkaart, projectselector bij offerte/order aanmaak

**2. Deeloffertes en kopieeractie expliciet maken**
Bij het kopieren van een offerte moet de gebruiker expliciet kiezen tussen:
- "Nieuwe revisie" (zelfde offerte, revision_number + 1)
- "Nieuwe deelofferte" (nieuw offertenummer, gekoppeld aan hetzelfde project)

Dit vereist een UI-aanpassing in de dupliceerfunctie (QuoteDuplicate hook + dialog).

**3. Schaderegistratie hard blockend (monteursapp)**
Foto's met type 'schade' bestaan al, maar er is geen blokkerende logica:
- Bij afronden werkbon: verplichte vraag "Is er beschadiging?"
- Bij "Ja": minimaal 1 foto + omschrijving + koppeling aan orderregel verplicht
- Werkbon kan niet worden ingediend zonder volledige schade-invoer

### Prioriteit 2 -- Uitbreidingen (na demo)

**4. Uitgebreide audit trail**
Huidige logging dekt statuswijzigingen. Ontbreekt:
- Documentuploads loggen
- Checklistacties loggen
- Betalingswijzigingen loggen
- Integratieacties loggen (Exact sync, Tradeplace order)

Oplossing: generieke `audit_log` tabel (entity_type, entity_id, action, details_json, performed_by, performed_at).

**5. Pricing engine (rule-based, auditable)**
Huidige prijslogica: `calc_selling_price(catalog_price, supplier_id)` en `supplier.price_factor`. Het spec vraagt om:
- Per leverancier configureerbare regels (basisprijsbron, BTW-handling, korting, index/opslag, afronding)
- Per offerteregel opslaan welke prijsregels zijn toegepast (traceerbaarheid)

Dit is een grotere architectuurwijziging en kan gefaseerd worden ingevoerd.

**6. WhatsApp integratie**
Niet gebouwd. Vereist:
- WhatsApp Business API koppeling (via Meta/Twilio)
- Verificatieflow per klant
- Berichten koppelen aan klant/project/servicecase
- Templates beheer

**7. Google Maps navigatie in monteursapp**
Link naar Google Maps op basis van montageadres. Relatief eenvoudig toe te voegen.

**8. Content Hub (Tradeplace) met toestemmingsworkflow**
Huidige productimport is handmatig (upload). Het spec vraagt om:
- Per merk/leverancier: toestemmingsstatus bijhouden
- Automatische import activeren na goedkeuring
- Incremental sync met versioning

**9. Supplier Adapter framework**
Huidige code heeft specifieke Tradeplace functies. Het spec vraagt om een generieke adapterlaag:
- Interface: placeOrder, getOrderStatus
- Implementaties: TradeplaceAdapter, GalvanoAdapter, ManualAdapter

**10. Stocia en 3Play connectors**
Onvoldoende specificatie beschikbaar. Feature-flag architectuur voorbereiden.

---

## Aanbevolen implementatievolgorde richting 19 februari

| Dag | Taak | Impact |
|-----|------|--------|
| 1 | Projectcontainer (DB + basis UI) | Structureel fundament |
| 1 | Kopieeractie expliciet maken (revisie vs deelofferte dialog) | Voorkomt verwarring bij demo |
| 2 | Schadeflow hard blockend in werkbon | Proces-compliance |
| 2 | Google Maps link in monteursapp | Quick win |
| 3 | Uitgebreide audit trail tabel + logging bij statuswijzigingen | Traceerbaarheid |
| 4 | Demo-voorbereiding en E2E testscenario's | Kwaliteitsborging |

De overige items (pricing engine, WhatsApp, Content Hub, adapter framework, Stocia/3Play) worden na de demo opgepakt.

---

## Technische details per prioriteit-1 item

### Projectcontainer

```text
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_number SERIAL,
  customer_id UUID REFERENCES customers(id) NOT NULL,
  division_id UUID REFERENCES divisions(id),
  name TEXT,
  status TEXT DEFAULT 'actief',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE quotes ADD COLUMN project_id UUID REFERENCES projects(id);
ALTER TABLE orders ADD COLUMN project_id UUID REFERENCES projects(id);
ALTER TABLE service_tickets ADD COLUMN project_id UUID REFERENCES projects(id);
```

Gewijzigde bestanden:
- Nieuwe migration SQL
- `src/hooks/useProjects.ts` (nieuw)
- `src/pages/CustomerDetail.tsx` (projectoverzicht tab)
- `src/components/quotes/QuoteFormDialog.tsx` (projectselector)

### Kopieeractie dialog

Gewijzigde bestanden:
- `src/hooks/useQuoteDuplicate.ts` (parameter toevoegen: 'revision' | 'new_sub_quote')
- Nieuwe component: `src/components/quotes/DuplicateChoiceDialog.tsx`
- `src/components/quotes/QuoteActions.tsx` (dialog openen i.p.v. directe actie)

### Schadeflow blocking

Gewijzigde bestanden:
- `src/pages/installer/WorkReportForm.tsx` (verplichte schadevraag + validatie)
- `src/hooks/useWorkReports.ts` (validatie voor submit)
- Mogelijk: nieuwe tabel `work_report_damages` (photo_id, description, order_line_id, position, measurements)


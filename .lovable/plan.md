

# Plan: Service Ticket Systeem

## Overzicht

Dit plan beschrijft de implementatie van een volledig ticketsysteem voor klacht- en serviceaanvragen. Het systeem bestaat uit twee delen:

1. **Publieke indienformulier** - Een open link waar klanten (zonder login) een klacht/service-aanvraag kunnen indienen
2. **Interne Service module** - Een nieuw "Service" tabblad in de applicatie voor medewerkers om tickets te beheren

---

## Functionaliteiten

### Publieke Kant (zonder login)
- Eenvoudig formulier met klantgegevens en klachtomschrijving
- Mogelijkheid om foto's/documenten bij te voegen
- Automatische bevestigingsmail (optioneel, latere fase)
- Unieke ticketnummer voor referentie

### Interne Kant (voor medewerkers)
- Overzicht van alle tickets in lijst- en kanbanweergave
- Status workflow: Nieuw → In behandeling → Wacht op klant → Wacht op onderdelen → Ingepland → Afgerond
- Medewerker(s) toewijzen aan ticket
- Interne notities en communicatiegeschiedenis
- Koppeling aan bestaande order (optioneel)
- Prioriteit en categorie instellen
- Filter op vestiging, status, toegewezen medewerker

---

## Database Structuur

### Nieuwe Tabellen

```text
┌─────────────────────────────────────────────────────────────────┐
│ service_tickets                                                  │
├─────────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                            │
│ ticket_number       SERIAL (auto-increment, uniek nummer)       │
│ division_id         UUID → divisions (nullable)                 │
│ order_id            UUID → orders (optioneel, koppeling)        │
│ customer_id         UUID → customers (optioneel, bestaande)     │
│ status              ENUM service_ticket_status                  │
│ priority            ENUM (laag, normaal, hoog, urgent)          │
│ category            TEXT (klacht, garantie, schade, overig)     │
│ subject             TEXT (korte omschrijving)                   │
│ description         TEXT (volledige beschrijving)               │
│ submitter_name      TEXT (naam indiener)                        │
│ submitter_email     TEXT (email indiener)                       │
│ submitter_phone     TEXT (telefoon indiener)                    │
│ created_at          TIMESTAMP                                   │
│ updated_at          TIMESTAMP                                   │
│ resolved_at         TIMESTAMP (wanneer afgerond)                │
│ created_by          UUID → profiles (nullable, intern aangemaakt)│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ service_ticket_assignees                                         │
├─────────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                            │
│ ticket_id           UUID → service_tickets                      │
│ user_id             UUID → profiles                             │
│ assigned_at         TIMESTAMP                                   │
│ assigned_by         UUID → profiles                             │
│ UNIQUE(ticket_id, user_id)                                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ service_ticket_notes                                             │
├─────────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                            │
│ ticket_id           UUID → service_tickets                      │
│ content             TEXT                                        │
│ note_type           TEXT (intern, klantcommunicatie)           │
│ created_by          UUID → profiles                             │
│ created_at          TIMESTAMP                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ service_ticket_attachments                                       │
├─────────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                            │
│ ticket_id           UUID → service_tickets                      │
│ file_path           TEXT                                        │
│ file_name           TEXT                                        │
│ file_size           INTEGER                                     │
│ mime_type           TEXT                                        │
│ uploaded_by         UUID (nullable, null = klant)               │
│ created_at          TIMESTAMP                                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ service_ticket_status_history                                    │
├─────────────────────────────────────────────────────────────────┤
│ id                  UUID PRIMARY KEY                            │
│ ticket_id           UUID → service_tickets                      │
│ from_status         ENUM service_ticket_status (nullable)       │
│ to_status           ENUM service_ticket_status                  │
│ changed_by          UUID → profiles                             │
│ notes               TEXT (optioneel)                            │
│ created_at          TIMESTAMP                                   │
└─────────────────────────────────────────────────────────────────┘
```

### Nieuwe Enum

```sql
CREATE TYPE service_ticket_status AS ENUM (
  'nieuw',
  'in_behandeling',
  'wacht_op_klant',
  'wacht_op_onderdelen',
  'ingepland',
  'afgerond',
  'geannuleerd'
);
```

### Storage Bucket

- Nieuwe bucket `service-attachments` voor uploads van klanten en medewerkers

---

## Frontend Componenten

### Nieuwe Pagina's

| Route | Component | Beschrijving |
|-------|-----------|--------------|
| `/service` | `Service.tsx` | Overzicht alle tickets (lijst/kanban) |
| `/service/:id` | `ServiceTicketDetail.tsx` | Ticket detailpagina |
| `/service/new` | `ServiceTicketForm.tsx` | Publieke indienformulier (GEEN login vereist) |

### Nieuwe Componenten

```text
src/components/service/
├── ServiceTicketCard.tsx        # Kaart voor kanban view
├── ServiceTicketColumn.tsx      # Kolom voor kanban
├── ServiceKanbanBoard.tsx       # Kanban board container
├── ServiceTicketTable.tsx       # Lijstweergave tabel
├── ServiceTicketForm.tsx        # Formulier (publiek/intern)
├── TicketInfoCard.tsx           # Ticket details sidebar
├── TicketAssigneesCard.tsx      # Toegewezen medewerkers
├── TicketNotesCard.tsx          # Notities en communicatie
├── TicketAttachmentsCard.tsx    # Bijlagen
├── TicketStatusHistory.tsx      # Status geschiedenis
└── TicketStatusSelect.tsx       # Status dropdown
```

### Nieuwe Hooks

```text
src/hooks/
├── useServiceTickets.ts         # Fetch alle tickets
├── useServiceTicket.ts          # Fetch enkel ticket
└── useServiceTicketMutations.ts # Create, update, status, notes, etc.
```

---

## Sidebar Navigatie Update

Een nieuw "Service" item toevoegen aan de sidebar onder de sectie "Planning":

```typescript
{
  title: "Planning",
  items: [
    { icon: Calendar, label: "Agenda", href: "/calendar" },
    { icon: Wrench, label: "Montage", href: "/installation" },
    { icon: Ticket, label: "Service", href: "/service", badge: 5 }, // NIEUW
  ],
}
```

---

## Publieke Formulier Route

De route `/service/new` moet **publiek toegankelijk** zijn (buiten ProtectedRoute). Dit vereist een aanpassing in `App.tsx`:

```typescript
// Publieke route voor service aanvraag
<Route path="/service/new" element={<ServiceTicketPublicForm />} />

// Beschermde route voor interne service module
<Route path="/service" element={<ProtectedRoute><Service /></ProtectedRoute>} />
<Route path="/service/:id" element={<ProtectedRoute><ServiceTicketDetail /></ProtectedRoute>} />
```

---

## RLS Policies

### service_tickets
- **SELECT**: Authenticated users kunnen alle tickets zien
- **INSERT**: Iedereen (anon + authenticated) - voor publiek formulier
- **UPDATE**: Alleen authenticated users
- **DELETE**: Alleen admins

### service_ticket_attachments
- **SELECT**: Authenticated users
- **INSERT**: Iedereen (anon + authenticated) - klanten kunnen bijlagen uploaden
- **UPDATE/DELETE**: Alleen authenticated users

---

## Implementatie Stappen

### Fase 1: Database & Backend
1. Maak enum `service_ticket_status`
2. Maak tabel `service_tickets`
3. Maak tabel `service_ticket_assignees`
4. Maak tabel `service_ticket_notes`
5. Maak tabel `service_ticket_attachments`
6. Maak tabel `service_ticket_status_history`
7. Configureer RLS policies
8. Maak storage bucket `service-attachments`

### Fase 2: Publiek Formulier
1. Maak `ServiceTicketPublicForm.tsx` component
2. Voeg publieke route toe in `App.tsx`
3. Implementeer formulier validatie en submit
4. Toon bevestiging met ticketnummer

### Fase 3: Interne Module
1. Maak hooks: `useServiceTickets`, `useServiceTicket`, `useServiceTicketMutations`
2. Maak `Service.tsx` overzichtspagina met lijst/kanban toggle
3. Maak kanban componenten (hergebruik patronen van Orders)
4. Maak `ServiceTicketDetail.tsx` detailpagina
5. Implementeer toewijzing medewerkers
6. Implementeer notities en bijlagen
7. Voeg sidebar navigatie item toe

### Fase 4: Polish
1. Filter op vestiging, status, toegewezen
2. Zoekfunctionaliteit
3. Badge counter in sidebar voor open tickets

---

## Technische Details

### Publiek Formulier Velden

| Veld | Type | Verplicht | Beschrijving |
|------|------|-----------|--------------|
| submitter_name | text | Ja | Naam van indiener |
| submitter_email | text | Ja | E-mailadres |
| submitter_phone | text | Nee | Telefoonnummer |
| category | select | Ja | Klacht / Garantie / Schade / Overig |
| subject | text | Ja | Korte omschrijving |
| description | textarea | Ja | Volledige beschrijving |
| order_number | text | Nee | Ordernummer indien bekend |
| attachments | file[] | Nee | Max 5 bestanden, elk max 10MB |

### Status Workflow

```text
┌─────────┐     ┌───────────────┐     ┌─────────────────┐
│  Nieuw  │ ──► │ In behandeling│ ──► │ Wacht op klant  │
└─────────┘     └───────────────┘     └─────────────────┘
                       │                      │
                       ▼                      ▼
              ┌────────────────────┐   ┌───────────┐
              │Wacht op onderdelen │   │ Ingepland │
              └────────────────────┘   └───────────┘
                       │                      │
                       └──────────┬───────────┘
                                  ▼
                           ┌───────────┐
                           │ Afgerond  │
                           └───────────┘
```

---

## Geschatte Omvang

- **Database migraties**: 6 tabellen + 1 enum + RLS
- **Frontend componenten**: ~15 nieuwe componenten
- **Pagina's**: 3 nieuwe pagina's
- **Hooks**: 3 nieuwe hooks
- **Routes**: 3 nieuwe routes (1 publiek, 2 beschermd)


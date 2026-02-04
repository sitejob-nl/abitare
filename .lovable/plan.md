
# Plan: Monteur Omgeving met Werkbonnen

## Overzicht

Dit plan creëert een dedicated omgeving voor monteurs waar zij:
1. Hun toegewezen werkopdrachten kunnen zien (orders in status "montage_gepland" of "geleverd")
2. Werkbonnen kunnen aanmaken na een opdracht
3. Foto's, werkzaamheden en interne notities kunnen toevoegen
4. Alles wordt gekoppeld aan de klant en order

---

## Database Schema

### Nieuwe Tabel: `work_reports` (Werkbonnen)

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid | Primary key |
| report_number | serial | Automatisch volgnummer |
| order_id | uuid FK | Koppeling naar order |
| customer_id | uuid FK | Koppeling naar klant |
| installer_id | uuid FK | Monteur die rapporteert |
| division_id | uuid FK | Vestiging |
| status | enum | concept, ingediend, goedgekeurd |
| work_date | date | Datum werkzaamheden |
| start_time | time | Starttijd |
| end_time | time | Eindtijd |
| total_hours | decimal | Totaal gewerkte uren |
| work_description | text | Beschrijving werkzaamheden |
| materials_used | text | Gebruikte materialen |
| internal_notes | text | Interne notities (niet voor klant) |
| customer_signature | text | Handtekening klant (base64) |
| customer_name_signed | text | Naam ondertekenaar |
| signed_at | timestamp | Tijdstip ondertekening |
| created_at | timestamp | Aanmaakdatum |
| updated_at | timestamp | Laatst gewijzigd |

### Nieuwe Tabel: `work_report_photos`

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid | Primary key |
| work_report_id | uuid FK | Koppeling naar werkbon |
| file_path | text | Pad in storage |
| file_name | text | Bestandsnaam |
| file_size | integer | Bestandsgrootte |
| caption | text | Optioneel bijschrift |
| photo_type | enum | voor, tijdens, na, schade |
| created_at | timestamp | Upload tijdstip |

### Nieuwe Tabel: `work_report_tasks`

| Kolom | Type | Beschrijving |
|-------|------|--------------|
| id | uuid | Primary key |
| work_report_id | uuid FK | Koppeling naar werkbon |
| description | text | Uitgevoerde taak |
| is_completed | boolean | Afgerond ja/nee |
| sort_order | integer | Volgorde |

### Nieuwe Enum: `work_report_status`

```sql
CREATE TYPE work_report_status AS ENUM ('concept', 'ingediend', 'goedgekeurd');
```

### Nieuwe Enum: `work_report_photo_type`

```sql
CREATE TYPE work_report_photo_type AS ENUM ('voor', 'tijdens', 'na', 'schade');
```

---

## Storage Bucket

### `work-report-photos` (Nieuw)

- Privé bucket voor werkbon foto's
- RLS: Alleen toegankelijk voor monteur die rapport aanmaakte + admins/managers

---

## RLS Policies

### work_reports

```sql
-- Monteur ziet alleen eigen werkbonnen
CREATE POLICY "Installers can view own reports"
ON work_reports FOR SELECT TO authenticated
USING (
  installer_id = auth.uid()
  OR is_admin_or_manager(auth.uid())
  OR (division_id = get_user_division_id(auth.uid()))
);

-- Monteur kan alleen eigen werkbonnen aanmaken
CREATE POLICY "Installers can create reports"
ON work_reports FOR INSERT TO authenticated
WITH CHECK (installer_id = auth.uid());

-- Monteur kan eigen concept-werkbonnen bewerken
CREATE POLICY "Installers can update own draft reports"
ON work_reports FOR UPDATE TO authenticated
USING (
  (installer_id = auth.uid() AND status = 'concept')
  OR is_admin_or_manager(auth.uid())
);
```

### work_report_photos & work_report_tasks

- Zelfde pattern: monteur kan eigen foto's/taken beheren
- Admin/manager kan alles zien

---

## Frontend Componenten

### Nieuwe Pagina's

1. **`/monteur`** - Dashboard voor monteurs
   - Overzicht van toegewezen orders
   - Filter op status (gepland/geleverd)
   - Quick stats: vandaag, deze week

2. **`/monteur/opdracht/:orderId`** - Order detail voor monteur
   - Klantgegevens (naam, adres, telefoon)
   - Leverinformatie (verdieping, lift nodig)
   - Documenten die voor monteur zichtbaar zijn
   - Notities (monteur-type)
   - Knop: "Werkbon starten"

3. **`/monteur/werkbon/:id`** - Werkbon aanmaken/bewerken
   - Formulier met werkzaamheden
   - Foto uploads (voor/tijdens/na/schade)
   - Takenlijst met checkboxes
   - Tijdregistratie
   - Klant handtekening pad
   - Interne notities

4. **`/monteur/werkbonnen`** - Overzicht eigen werkbonnen
   - Lijst met status badges
   - Filter op datum/order

### Nieuwe Componenten

```text
src/components/installer/
├── InstallerNav.tsx           # Simplified navigation for installers
├── OrderCard.tsx              # Order summary card for installer
├── WorkReportForm.tsx         # Main work report form
├── PhotoUploader.tsx          # Photo upload with camera support
├── TaskChecklist.tsx          # Checklist of tasks
├── TimeTracker.tsx            # Start/end time inputs
├── SignaturePad.tsx           # Customer signature capture
└── WorkReportCard.tsx         # Work report summary card
```

### Nieuwe Hooks

```text
src/hooks/
├── useInstallerOrders.ts      # Orders assigned to current installer
├── useWorkReports.ts          # CRUD for work reports
├── useWorkReportPhotos.ts     # Photo management
└── useWorkReportMutations.ts  # Create/update mutations
```

---

## Bestaande Aanpassingen

### Order Model

De `orders` tabel heeft al `installer_id` - deze wordt gebruikt om orders aan monteurs te koppelen.

### AuthContext Uitbreiding

```typescript
// Toevoegen aan AuthContext
isInstaller: boolean;  // roles.includes("monteur")
```

### Route Protection

```tsx
// Nieuwe component voor monteur-only routes
<InstallerRoute>
  <InstallerDashboard />
</InstallerRoute>
```

### Sidebar Component

Wanneer gebruiker rol "monteur" heeft:
- Verberg financiële menu items (Facturaties, Reports)
- Toon vereenvoudigd menu: Mijn Opdrachten, Werkbonnen

---

## Workflow

```text
Order Status: geleverd
       │
       ▼
┌──────────────────────────────┐
│ Monteur opent opdracht       │
│ - Bekijkt klantgegevens      │
│ - Bekijkt documenten         │
│ - Leest monteur-notities     │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Monteur start werkbon        │
│ - Vult werkzaamheden in      │
│ - Maakt foto's (voor)        │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Werk uitvoeren               │
│ - Foto's (tijdens)           │
│ - Taken afvinken             │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Werkbon afronden             │
│ - Foto's (na)                │
│ - Klant ondertekent          │
│ - Status: ingediend          │
└──────────────┬───────────────┘
               │
               ▼
┌──────────────────────────────┐
│ Manager keurt werkbon goed   │
│ - Status: goedgekeurd        │
│ - Order → gemonteerd         │
└──────────────────────────────┘
```

---

## Data Privacy

### Wat de monteur NIET ziet:

- Prijzen en bedragen
- Marges en kostprijzen
- Betaalstatus
- Facturatiegegevens
- Interne verkoop-notities

### Wat de monteur WEL ziet:

- Klantgegevens (naam, adres, telefoon)
- Productomschrijvingen (zonder prijzen)
- Leverinformatie (verdieping, lift)
- Documenten gemarkeerd als "visible_to_installer"
- Notities van type "monteur"

---

## Mobile-First Design

Omdat monteurs primair op telefoon werken:

- Large touch targets (min 44px)
- Camera integratie voor foto's
- Offline-capable (PWA)
- Signature pad optimized for touch
- Swipe actions voor snelle navigatie

---

## Te Implementeren Bestanden

### Database Migrations

```text
supabase/migrations/
└── 2025XXXX_work_reports_schema.sql
    - CREATE TYPE work_report_status
    - CREATE TYPE work_report_photo_type  
    - CREATE TABLE work_reports
    - CREATE TABLE work_report_photos
    - CREATE TABLE work_report_tasks
    - Storage bucket creation
    - RLS policies
```

### Frontend Files

```text
src/
├── pages/
│   ├── installer/
│   │   ├── InstallerDashboard.tsx
│   │   ├── InstallerOrderDetail.tsx
│   │   ├── WorkReportForm.tsx
│   │   └── WorkReports.tsx
│
├── components/
│   ├── installer/
│   │   ├── InstallerNav.tsx
│   │   ├── InstallerOrderCard.tsx
│   │   ├── PhotoUploader.tsx
│   │   ├── TaskChecklist.tsx
│   │   ├── TimeTracker.tsx
│   │   ├── SignaturePad.tsx
│   │   └── WorkReportCard.tsx
│   │
│   └── auth/
│       └── InstallerRoute.tsx
│
├── hooks/
│   ├── useInstallerOrders.ts
│   ├── useWorkReports.ts
│   └── useWorkReportMutations.ts
│
└── App.tsx (route additions)
```

---

## Geschatte Effort

| Component | Uren |
|-----------|------|
| Database schema + RLS | 2-3 |
| Storage bucket + policies | 1 |
| InstallerRoute + Auth updates | 2 |
| InstallerDashboard pagina | 3-4 |
| InstallerOrderDetail pagina | 3-4 |
| WorkReportForm (compleet) | 6-8 |
| PhotoUploader met camera | 3-4 |
| SignaturePad component | 2-3 |
| WorkReports overzicht | 2-3 |
| Hooks en mutations | 3-4 |
| Testing + polish | 4-6 |
| **Totaal** | **31-42 uur** |

---

## Fase 1 (MVP)

1. Database schema + migrations
2. Basic InstallerDashboard met orders
3. InstallerOrderDetail met klantinfo
4. Eenvoudige WorkReportForm (zonder signature)
5. Foto uploads

## Fase 2 (Uitbreiding)

1. Signature pad
2. Takenlijst met checkboxes
3. Goedkeuringsflow voor managers
4. PDF export van werkbon

## Fase 3 (Nice-to-have)

1. Offline modus
2. Push notifications
3. GPS tracking
4. Automatische tijdregistratie

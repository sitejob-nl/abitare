

## Analyse

### Service module
De service module is **functioneel compleet**:
- `/service` — Kanban + tabelweergave met filters (status, categorie, prioriteit)
- `/service/:id` — Ticketdetail met @mentions, notities, statuswijzigingen
- `/service/nieuw` — Publiek formulier voor externe meldingen
- Automatische tickets bij schade in werkbonnen (via trigger `auto_create_damage_service_ticket`)
- Status-validatie trigger (`validate_ticket_status_change`) blokkeert directe afsluiting vanuit wachtstatussen

### Montage module
De montage module is **functioneel compleet**:
- `/installation` — Admin overzicht van alle montages
- `/installation/:orderId` — Read-only werkbon weergave
- `/monteur` — Installer dashboard met toegewezen orders
- `/monteur/order/:id` — Werkbon invullen met handtekening, foto's, schadeprotocol
- Trigger zet order automatisch op 'gemonteerd' bij werkbon-indiening

### Ontbrekend: Montage diensten beheer in Instellingen
De `installation_rates` tabel bestaat en de CRUD hooks (`useInstallationRates`, `useCreateInstallationRate`, `useUpdateInstallationRate`, `useDeleteInstallationRate`) zijn volledig. **Maar er is geen UI-component in de Instellingen pagina om deze tarieven te beheren.** De AddSectionDialog gebruikt ze wel al om automatisch montageregels toe te voegen bij een "Montage" sectie.

---

## Plan: Montage tarieven tab toevoegen in Instellingen

### 1. Nieuw component `src/components/settings/InstallationRatesSettings.tsx`

Een CRUD-tabel voor `installation_rates` met:
- Overzichtstabel met kolommen: Code, Naam, Eenheid, Standaardprijs, BTW%, Actief
- "Nieuw tarief" knop die inline formulier of dialog opent
- Inline editing of een edit-dialog per rij
- Verwijder-knop met bevestiging
- Toggle voor actief/inactief

Velden per tarief:
- `code` (tekst, verplicht) — bijv. "MONTAGE-BASIS"
- `name` (tekst, verplicht) — bijv. "Basismontage keuken"
- `unit` (tekst) — bijv. "stuk", "uur", "m²"
- `default_price` (numeriek) — standaardprijs
- `vat_rate` (numeriek, default 21)
- `is_active` (boolean)

### 2. Settings pagina uitbreiden

Nieuwe tab "Montage" toevoegen aan de admin tabs in `src/pages/Settings.tsx` met een `Wrench` icoon. Toont het `InstallationRatesSettings` component.

### Geschatte impact
- 1 nieuw bestand, 1 bestand gewijzigd
- Geen database wijzigingen


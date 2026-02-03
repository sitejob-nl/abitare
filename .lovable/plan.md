

# Grondige Beveiligings- en Workflow Analyse - Abitare ERP

## Overzicht Huidige Staat

Na een uitgebreide analyse van de codebase, database schema, RLS policies, edge functions en workflows volgt hieronder een samenvatting van bevindingen en aanbevelingen voor verdere ontwikkeling.

---

## Deel 1: Beveiligingsanalyse

### Kritieke Bevindingen

| Prioriteit | Probleem | Impact | Status |
|------------|----------|--------|--------|
| HOOG | Service Ticket RLS policies te permissief | Elke geauthenticeerde gebruiker kan alle tickets bewerken | Actie vereist |
| HOOG | Service Ticket Attachments openbaar | Anonieme gebruikers kunnen bestanden uploaden | Actie vereist |
| MEDIUM | Leaked Password Protection uitgeschakeld | Gebruikers kunnen gecompromitteerde wachtwoorden gebruiken | Aanbevolen |
| MEDIUM | Installer ziet financiele orderdata | Prijsinformatie zichtbaar voor monteurs | Aanbevolen |
| LAAG | Storage bucket policies ontbreken | Documenten mogelijk onbeveiligd | Controleren |

### Gedetailleerde RLS Analyse

#### 1. Service Tickets Module - KRITIEK

De volgende tabellen hebben te permissieve policies met `USING (true)`:

```
service_tickets          - UPDATE: true (iedereen kan elk ticket wijzigen)
service_ticket_notes     - INSERT/UPDATE/DELETE: true
service_ticket_assignees - INSERT/UPDATE/DELETE: true  
service_ticket_attachments - INSERT: true (inclusief anon!)
service_ticket_status_history - INSERT: true
```

**Risico**: Elke ingelogde gebruiker kan tickets van andere vestigingen wijzigen, notities verwijderen, en assignees aanpassen.

**Oplossing**:
- Vervang `true` door proper role-based checks
- Koppel service tickets aan divisies voor vestigings-isolatie
- Beperk wijzigingen tot toegewezen medewerkers of managers

#### 2. Goed Beveiligde Tabellen

De volgende tabellen hebben correcte RLS policies:
- `customers` - Divisie-isolatie + salesperson/assistant check
- `quotes` - Divisie + created_by + salesperson check
- `orders` - Divisie + installer view-only toegang
- `user_roles` - Alleen admin kan wijzigen
- `profiles` - Admin of eigen profiel
- `exact_online_connections` - Alleen admin

#### 3. Storage Buckets

De buckets `order-documents` en `service-attachments` zijn privaat, maar storage policies moeten worden geverifieerd.

---

## Deel 2: Workflow Analyse

### Huidige Workflows

```text
                    +---------------+
                    |   KLANT       |
                    +-------+-------+
                            |
                            v
+---------------------------+---------------------------+
|                      OFFERTE                          |
| Status: concept -> verzonden -> geaccepteerd/afgewezen|
| - Klant selecteren/aanmaken                          |
| - Secties met leverancier/prijsgroep/kleur           |
| - Producten met automatische prijslookup             |
| - Sectie- en offerte-niveau korting                  |
+---------------------------+---------------------------+
                            |
                            v (bij acceptatie)
+---------------------------+---------------------------+
|                      ORDER                            |
| Status: nieuw -> bestel_klaar -> besteld -> geleverd |
|         -> gemonteerd -> afgerond                    |
| - Sectie-configuratie gekopieerd                     |
| - Leveranciersorders per sectie                      |
| - Betaalstatus tracking                              |
| - Documenten en notities                             |
+---------------------------+---------------------------+
                            |
                            v
+---------------------------+---------------------------+
|                    FACTURATIE                         |
| - Automatisch gegenereerd bij order                  |
| - Push naar Exact Online                             |
+---------------------------+---------------------------+
```

### Workflow Sterke Punten
- Quote-to-Order conversie behoudt alle sectie-configuratie
- Order sections worden correct aangemaakt met kortingen
- Vier-ogen principe voor bestelklaar status
- Status historie wordt bijgehouden

### Workflow Verbeterpunten

| Gebied | Huidige Situatie | Verbetering |
|--------|------------------|-------------|
| Bestel workflow | Handmatig status aanpassen | Automatische status-transitie na leveranciersorder |
| Levering tracking | Geen koppeling met leverancier | Tradeplace webhook voor real-time updates |
| Montage planning | Basis datumvelden | Integratie met kalender + monteur notificaties |
| Servicetickets | Los van orders | Automatische koppeling bij klachtafhandeling |

---

## Deel 3: Ontbrekende Functionaliteit

### Must-Have (Kritiek voor dagelijks gebruik)

1. **Wachtwoord reset flow** - Gebruikers kunnen geen wachtwoord instellen/resetten
2. **Service ticket divisie-isolatie** - RLS policies repareren
3. **Monteur-specifieke view** - Beperkte orderdetails zonder financiele data
4. **Email notificaties** - Voor statuswijzigingen en toewijzingen

### Should-Have (Belangrijk voor effcientie)

1. **PDF generatie voor orders** - Orderbevestiging document
2. **Bulk acties** - Meerdere orders/quotes tegelijk verwerken
3. **Zoekfunctionaliteit** - Globale zoek over alle modules
4. **Audit logging** - Wie heeft wat wanneer gewijzigd
5. **Dashboard per rol** - Aangepaste widgets per gebruikerstype

### Nice-to-Have (Toekomstige uitbreiding)

1. **Klant portal** - Klanten kunnen eigen orders/offertes inzien
2. **Monteur app** - Dedicated mobile interface voor monteurs
3. **Analytics dashboard** - Geavanceerde rapportages
4. **Multi-taal ondersteuning** - Engels naast Nederlands
5. **Integratie met planning tools** - Externe kalenderkoppelingen

---

## Deel 4: Technische Schuld

### Te Refactoren

1. **Duplicatie in RLS policies** - Helper functies voor herhalende patterns
2. **Edge function error handling** - Consistente foutafhandeling
3. **Type safety** - Sommige hooks gebruiken `any` types
4. **Test coverage** - Minimale tests aanwezig

### Database Optimalisaties

1. **Indexes toevoegen** - Voor veelgebruikte query patterns
2. **Materialized views** - Voor dashboard statistieken
3. **Cascade deletes** - Sommige foreign keys missen cascades

---

## Deel 5: Implementatieplan

### Fase 1: Kritieke Beveiliging (Week 1-2)

```sql
-- 1. Service Tickets RLS repareren
DROP POLICY IF EXISTS "Authenticated users can update tickets" ON service_tickets;
CREATE POLICY "Users can update assigned or division tickets" 
ON service_tickets FOR UPDATE TO authenticated
USING (
  is_admin_or_manager(auth.uid()) 
  OR division_id = get_user_division_id(auth.uid())
  OR EXISTS (
    SELECT 1 FROM service_ticket_assignees 
    WHERE ticket_id = service_tickets.id 
    AND user_id = auth.uid()
  )
);

-- 2. Service Ticket Notes restrictief maken
DROP POLICY IF EXISTS "Authenticated users can delete notes" ON service_ticket_notes;
CREATE POLICY "Users can delete own notes" 
ON service_ticket_notes FOR DELETE TO authenticated
USING (created_by = auth.uid() OR is_admin(auth.uid()));

-- 3. Attachments beperken
DROP POLICY IF EXISTS "Anyone can upload attachments" ON service_ticket_attachments;
CREATE POLICY "Authenticated users can upload attachments" 
ON service_ticket_attachments FOR INSERT TO authenticated
WITH CHECK (true);
```

### Fase 2: Wachtwoord Management (Week 2)

1. Wachtwoord reset pagina toevoegen (`/reset-password`)
2. Magic link flow in `invite-user` edge function verbeteren
3. Email template configureren in Supabase

### Fase 3: Monteur View (Week 3)

1. Database view aanmaken zonder financiele kolommen
2. Aparte OrderDetailInstaller component
3. Role-based routing in frontend

### Fase 4: Notificaties (Week 4)

1. Edge function voor email verzending
2. Notification preferences in profiles
3. Triggers voor status wijzigingen

### Fase 5: Tradeplace Activatie (Week 5-6)

1. API documentatie integreren
2. Live order plaatsing implementeren
3. Webhook handlers afmaken
4. Prijslijst synchronisatie

### Fase 6: Klant Portal (Optioneel - Week 7-8)

1. Aparte auth context voor klanten
2. Read-only views voor eigen data
3. Service ticket indienen

---

## Prioriteiten Samenvatting

| Prioriteit | Item | Geschatte Effort |
|------------|------|------------------|
| P0 | Service ticket RLS repareren | 2-4 uur |
| P0 | Storage bucket policies controleren | 1 uur |
| P1 | Wachtwoord reset flow | 4-6 uur |
| P1 | Email notificaties basis | 6-8 uur |
| P2 | Monteur-specifieke view | 8-12 uur |
| P2 | PDF order bevestiging | 4-6 uur |
| P3 | Audit logging | 8-12 uur |
| P3 | Tradeplace live integratie | 16-24 uur |
| P4 | Klant portal | 24-40 uur |

---

## Aanbevolen Eerste Stappen

1. **Direct**: Schakel Leaked Password Protection in via Supabase Dashboard > Authentication > Settings
2. **Deze week**: Service ticket RLS policies repareren
3. **Volgende sprint**: Wachtwoord reset flow + email notificaties
4. **Backlog**: Monteur view, Tradeplace activatie, klant portal


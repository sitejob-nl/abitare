# Abitare ERP - Ontwikkelingsplan

## Status: Fase 1 & 2 Voltooid ✅

---

## Voltooide Fases

### ✅ Fase 1: Kritieke Beveiliging (Voltooid)

**Service Ticket RLS Policies gerepareerd:**
- `service_tickets` - UPDATE beperkt tot admin/manager, divisie-medewerkers, of toegewezen gebruikers
- `service_ticket_notes` - INSERT/UPDATE/DELETE beperkt tot gebruikers met ticket toegang / eigen notities
- `service_ticket_attachments` - INSERT beperkt tot authenticated users met ticket toegang, DELETE alleen eigen uploads
- `service_ticket_assignees` - INSERT/DELETE beperkt tot managers of divisie-medewerkers
- `service_ticket_status_history` - INSERT beperkt, DELETE geblokkeerd (audit trail)
- Storage policies voor `service-attachments` bucket toegevoegd

**Openstaand (handmatige actie vereist):**
- ⚠️ **Leaked Password Protection** moet handmatig worden ingeschakeld in Supabase Dashboard → Authentication → Settings

### ✅ Fase 2: Wachtwoord Management (Voltooid)

**Nieuwe pagina's toegevoegd:**
- `/reset-password` - Wachtwoord vergeten formulier
- `/set-password` - Nieuw wachtwoord instellen (voor recovery en invite links)
- Login pagina bevat nu "Vergeten?" link

---

## Volgende Fases

### 🔲 Fase 3: Monteur View (Gepland)

**Doel:** Monteurs krijgen een beperkte view zonder financiële data

**Te implementeren:**
1. Database view aanmaken voor orders zonder prijskolommen
2. Role-based component: `OrderDetailInstaller.tsx`
3. Conditional rendering in `OrderDetail.tsx` op basis van rol
4. Sidebar items verbergen voor monteur rol

**Geschatte effort:** 8-12 uur

### 🔲 Fase 4: Email Notificaties (Gepland)

**Doel:** Automatische notificaties bij belangrijke events

**Te implementeren:**
1. Edge function `send-notification` met email verzending
2. Database triggers voor:
   - Service ticket toewijzing
   - Order status wijziging
   - Nieuwe quote aan verkoper
3. Notification preferences in profiles tabel
4. Email templates

**Geschatte effort:** 6-8 uur

### 🔲 Fase 5: Tradeplace Integratie (Gepland)

**Doel:** Live bestellen bij leveranciers via Tradeplace API

**Te implementeren:**
1. Live order plaatsing (niet alleen test mode)
2. Webhook handler voor status updates
3. Prijslijst synchronisatie
4. Voorraad beschikbaarheid check

**Geschatte effort:** 16-24 uur

### 🔲 Fase 6: Klant Portal (Optioneel)

**Doel:** Klanten kunnen eigen orders/offertes inzien

**Te implementeren:**
1. Aparte authenticatie voor klanten
2. Read-only views voor eigen orders/offertes
3. Service ticket indienen met koppeling aan order
4. Document downloads

**Geschatte effort:** 24-40 uur

---

## Technische Schuld (Backlog)

| Item | Prioriteit | Effort |
|------|------------|--------|
| Audit logging toevoegen | P3 | 8-12 uur |
| Test coverage uitbreiden | P3 | 8-16 uur |
| Type safety verbeteren (any types) | P2 | 4-6 uur |
| Database indexes optimaliseren | P3 | 2-4 uur |
| Error boundary components | P2 | 2-4 uur |

---

## Quick Wins (Kleine verbeteringen)

- [ ] PDF generatie voor orderbevestiging
- [ ] Bulk status wijziging voor orders
- [ ] Globale zoekfunctionaliteit
- [ ] Dashboard widgets per rol

---

## Handmatige Acties Vereist

1. **Supabase Dashboard → Authentication → Settings:**
   - Schakel "Leaked Password Protection" in
   
2. **Email Templates configureren:**
   - Recovery email template aanpassen met Abitare branding
   - Invite email template configureren

---

*Laatst bijgewerkt: 2026-02-03*

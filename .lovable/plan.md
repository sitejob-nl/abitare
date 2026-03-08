

## P5 Items uit het Productie-Gereedheidsplan

P5 zijn de twee items met de laagste prioriteit, beide gemarkeerd als "zeer complex":

### 1. Factuurmodel Redesign (Fase 3C)

**Probleem:** Er is geen aparte `invoices` tabel. Facturen zijn orders met `is_standalone_invoice: true`. Dit beperkt:
- Meerdere facturen per order (aanbetaling + restbetaling + meerwerk)
- Creditnota's
- Termijnfacturen

**Geplande oplossing:**
- `invoice_type` enum toevoegen: `standaard`, `aanbetaling`, `restbetaling`, `meerwerk`
- Meerdere factuur-orders per parent order toestaan
- Op termijn: aparte `invoices` tabel met eigen lifecycle

### 2. PWA Offline Mutation Queue (Fase 6D)

**Probleem:** Monteurs in kelders/zonder bereik verliezen werkbon-data bij het indienen.

**Geplande oplossing:**
- IndexedDB-based mutation queue die writes lokaal opslaat
- Automatische retry bij reconnect
- Conflict resolution UI als data intussen server-side gewijzigd is

---

Beide items zijn bewust als laatste geprioriteerd omdat ze architecturaal ingrijpend zijn en het huidige systeem zonder ze functioneert. Wil je dat ik een van deze twee (of beide) nu implementeer?


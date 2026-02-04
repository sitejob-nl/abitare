
# Plan: Automatische Klant-Sync bij Factuur Push

## Huidige Situatie

Wanneer een factuur naar Exact Online wordt gepusht:
1. Het systeem controleert of de klant een `exact_account_id` heeft
2. Zo niet: de factuur wordt **overgeslagen** met de melding "Klant niet gekoppeld"
3. De gebruiker moet handmatig eerst klanten synchroniseren

## Nieuwe Situatie

Wanneer een factuur naar Exact Online wordt gepusht:
1. Het systeem controleert of de klant een `exact_account_id` heeft
2. **Zo niet: automatisch de klant aanmaken in Exact Online**
3. De `exact_account_id` wordt opgeslagen
4. De factuur wordt gepusht met de nieuwe account ID

---

## Technische Wijzigingen

### 1. Update `exact-sync-invoices/index.ts`

Voeg een helper functie toe die een klant naar Exact pusht als deze nog niet gekoppeld is:

```text
+----------------------------------------+
|  pushInvoicesInternal                  |
+----------------------------------------+
|  Voor elke order:                      |
|  1. Heeft klant exact_account_id?      |
|     - Ja: doorgaan                     |
|     - Nee: ensureCustomerInExact()     |
|       -> Push klant naar Exact         |
|       -> Sla exact_account_id op       |
|  2. Maak SalesInvoice aan              |
+----------------------------------------+
```

**Nieuwe functie `ensureCustomerInExact()`:**
- Haalt klantgegevens op
- Controleert eerst of klant al bestaat in Exact (op basis van Code/klantnummer)
- Bestaat niet? Maakt klant aan
- Slaat `exact_account_id` op in database
- Retourneert de account ID

### 2. Verbeterde Foutafhandeling

| Situatie | Actie |
|----------|-------|
| Klant pushen lukt | Doorgaan met factuur |
| Klant pushen mislukt | Factuur overslaan met duidelijke foutmelding |
| Factuur pushen mislukt | Fout loggen, klant blijft gekoppeld |

---

## Code Wijzigingen

### `supabase/functions/exact-sync-invoices/index.ts`

```typescript
// Nieuwe functie toevoegen
async function ensureCustomerInExact(
  supabase: any,
  accessToken: string,
  exactDivision: number,
  customerId: string
): Promise<string | null> {
  // 1. Haal klant op uit database
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", customerId)
    .single();
  
  if (!customer) return null;
  
  // 2. Al gekoppeld? Return bestaande ID
  if (customer.exact_account_id) {
    return customer.exact_account_id;
  }
  
  // 3. Check of klant al bestaat in Exact (op klantnummer)
  const existingAccount = await findExactAccountByCode(
    accessToken, 
    exactDivision, 
    customer.customer_number
  );
  
  if (existingAccount) {
    // Koppel bestaande account
    await supabase
      .from("customers")
      .update({ exact_account_id: existingAccount })
      .eq("id", customerId);
    return existingAccount;
  }
  
  // 4. Maak nieuwe account aan in Exact
  const newAccountId = await createExactAccount(
    accessToken, 
    exactDivision, 
    customer
  );
  
  if (newAccountId) {
    await supabase
      .from("customers")
      .update({ exact_account_id: newAccountId })
      .eq("id", customerId);
  }
  
  return newAccountId;
}
```

### Aanpassing in `pushInvoicesInternal`:

```typescript
// Huidige code:
if (!customer?.exact_account_id) {
  results.skipped++;
  results.errors.push(`Order #${order.order_number}: Klant niet gekoppeld`);
  continue;
}

// Nieuwe code:
let accountId = customer?.exact_account_id;

if (!accountId) {
  // Probeer klant automatisch te synchroniseren
  accountId = await ensureCustomerInExact(
    supabase,
    accessToken,
    exactDivision,
    order.customer_id
  );
  
  if (!accountId) {
    results.skipped++;
    results.errors.push(
      `Order #${order.order_number}: Kon klant niet aanmaken in Exact`
    );
    continue;
  }
}

// Gebruik accountId voor factuur
const exactInvoice = mapToExactInvoice(order, accountId);
```

---

## Samenvatting Wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/exact-sync-invoices/index.ts` | Voeg `ensureCustomerInExact()`, `findExactAccountByCode()`, en `createExactAccount()` functies toe. Pas `pushInvoicesInternal` aan om automatisch klanten te synchroniseren. |

## Resultaat

- Facturen kunnen direct worden gepusht zonder handmatige klant-sync
- Klanten worden automatisch aangemaakt in Exact als ze nog niet bestaan
- Bestaande klanten in Exact worden automatisch gekoppeld op basis van klantnummer
- Duidelijke foutmeldingen als klant niet kan worden aangemaakt

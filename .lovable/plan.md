
# Plan: Fix GL Account Type Filter

## Probleem

De huidige code zoekt naar grootboekrekeningen met `Type eq 32`, maar:
- **Type 32** = Herwaarderingsrekeningen (bijv. "Herwaarderingen bedrijfsinventaris")
- **Type 110** = Omzetrekeningen (bijv. "Omzet handelsgoederen")

De filter retourneert dus geen geschikte omzetrekening.

## Oplossing

Wijzig de `getDefaultRevenueGLAccount()` functie om te zoeken naar **Type 110** (Revenue) en specifiek een standaard omzetrekening te vinden (zoals code 80002 "Omzet handelsgoederen").

---

## Technische Wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/exact-sync-invoices/index.ts` | Wijzig filter van `Type eq 32` naar `Type eq 110` + zoek naar beste match |

### Code Wijziging

**Huidige code (regel 431):**
```typescript
const url = `${EXACT_API_URL}/api/v1/${exactDivision}/financial/GLAccounts?$filter=Type eq 32&$select=ID,Code,Description&$top=1`;
```

**Nieuwe code:**
```typescript
async function getDefaultRevenueGLAccount(
  accessToken: string,
  exactDivision: number
): Promise<string | null> {
  try {
    // Type 110 = Revenue accounts in Exact Online
    // Prefer accounts starting with "80" (standard sales/revenue accounts)
    const url = `${EXACT_API_URL}/api/v1/${exactDivision}/financial/GLAccounts?$filter=Type eq 110&$select=ID,Code,Description&$orderby=Code`;
    
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    });
    
    if (!response.ok) {
      console.error("Failed to fetch GL accounts:", await response.text());
      return null;
    }
    
    const data = await response.json();
    const accounts = data.d?.results || [];
    
    if (accounts.length === 0) {
      console.error("No revenue GL accounts (Type 110) found");
      return null;
    }
    
    // Prefer accounts starting with "80" (standard sales/revenue)
    const preferredAccount = accounts.find((acc: any) => 
      acc.Code?.startsWith("80") || 
      acc.Description?.toLowerCase().includes("omzet")
    );
    
    const selectedAccount = preferredAccount || accounts[0];
    console.log(`Using GL Account: ${selectedAccount.Code} - ${selectedAccount.Description}`);
    
    return selectedAccount.ID;
  } catch (err) {
    console.error("Error fetching GL accounts:", err);
    return null;
  }
}
```

---

## Exact Online GLAccount Types Reference

| Type | Beschrijving |
|------|-------------|
| 12 | Bankrekeningen |
| 20 | Debiteuren |
| 22 | Crediteuren |
| 24 | BTW-rekeningen |
| 32 | Herwaardering |
| **110** | **Omzet (Revenue)** |
| 111 | Inkoopwaarde |
| 122 | Afschrijvingen |
| 130 | Lasten |

---

## Resultaat

- Facturen kunnen naar Exact worden gepusht met de juiste omzetrekening
- De functie zoekt eerst naar een standaard omzetrekening (code 80xxx)
- Als fallback wordt de eerste beschikbare Type 110 rekening gebruikt


# Plan: Fix Installation Pagina Query Fout

## Probleem Geïdentificeerd

De Installation pagina (`/installation`) geeft een **400 database error** en toont geen montages. Dit is GEEN RLS probleem maar een **query syntax fout**.

### Foutmelding
```
"Could not find a relationship between 'orders' and 'profiles' 
using the hint 'orders_installer_id_fkey'"
```

### Oorzaak
De code in `Installation.tsx` (regel 33) probeert:
```typescript
installer:profiles!orders_installer_id_fkey(id, full_name)
```

Maar de foreign key `orders_installer_id_fkey` wijst naar `auth.users`, niet naar `profiles`. Supabase PostgREST kan deze join niet uitvoeren omdat er geen directe FK relatie is tussen `orders.installer_id` en `profiles`.

### Database Schema
| Column | Foreign Key | Verwijst naar |
|--------|-------------|---------------|
| installer_id | orders_installer_id_fkey | auth.users |
| salesperson_id | orders_salesperson_id_fkey | auth.users |
| customer_id | orders_customer_id_fkey | customers |

De `profiles` tabel heeft wel dezelfde ID's als `auth.users`, maar er is geen expliciete FK relatie gedefinieerd.

## Oplossing

Wijzig de query om de installer informatie apart op te halen, of verwijder de directe join en haal de profile data via een tweede query.

### Aanpak: Aparte Profiles Query

Haal eerst de orders op, en dan de profiles voor de installers in een aparte query.

## Bestandswijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `src/pages/Installation.tsx` | Fix query om installer data correct op te halen |

## Code Wijziging

```typescript
// src/pages/Installation.tsx - useInstallationOrders hook

function useInstallationOrders(statusFilter: string | null) {
  return useQuery({
    queryKey: ["installation-orders", statusFilter],
    queryFn: async () => {
      // Stap 1: Haal orders op zonder installer join
      let query = supabase
        .from("orders")
        .select(`
          id, order_number, expected_installation_date, actual_installation_date,
          status, requires_elevator, installer_id,
          customer:customers(id, first_name, last_name, company_name, city, delivery_floor)
        `)
        .in("status", ["montage_gepland", "gemonteerd", "geleverd"])
        .order("expected_installation_date", { ascending: true });

      if (statusFilter && statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Stap 2: Haal unieke installer IDs op
      const installerIds = [...new Set(
        orders
          ?.filter(o => o.installer_id)
          .map(o => o.installer_id) || []
      )];

      // Stap 3: Haal profiles op voor alle installers
      let profilesMap: Record<string, { full_name: string }> = {};
      if (installerIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", installerIds);
        
        profiles?.forEach(p => {
          profilesMap[p.id] = { full_name: p.full_name || "" };
        });
      }

      // Stap 4: Combineer data
      return orders?.map(order => ({
        ...order,
        installer: order.installer_id ? profilesMap[order.installer_id] : null
      })) || [];
    },
  });
}
```

## Resultaat Na Fix

- Admin kan alle montages zien (via RLS `is_admin()`)  
- Orders worden correct geladen met installer namen
- Geen 400 errors meer
- Monteur omgeving blijft werken zoals voorheen

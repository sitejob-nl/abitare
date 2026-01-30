

# Implementatieplan: Abitare Database Schema

## Overzicht

Dit plan beschrijft de implementatie van het complete database schema voor het Abitare ERP/CRM systeem. Het schema bevat 22 tabellen verdeeld over vier categorieën: Core, Producten, Sales en Extra functionaliteit.

---

## Belangrijke Aanpassing: Rollen Beveiliging

Het oorspronkelijke schema slaat gebruikersrollen op in de `users` tabel. Dit is een beveiligingsrisico dat kan leiden tot privilege escalation attacks. 

**Oplossing:** Ik zal een aparte `user_roles` tabel aanmaken volgens best practices:

```text
+------------------+       +------------------+
|     profiles     |       |   user_roles     |
+------------------+       +------------------+
| id (FK auth)     |<------| user_id (FK)     |
| email            |       | role (enum)      |
| full_name        |       +------------------+
| phone            |
| division_id (FK) |
| is_active        |
+------------------+
```

De `role` kolom wordt verplaatst naar een aparte tabel met een `SECURITY DEFINER` functie voor veilige role-checks in RLS policies.

---

## Implementatie in 4 Fasen

### Fase 1: Basis Infrastructuur
- Enums aanmaken (customer_type, quote_status, order_status, payment_status, app_role)
- Core tabellen: `divisions`, `profiles`, `user_roles`
- Helper functies voor RLS

### Fase 2: Product Catalogus
- `suppliers` (leveranciers)
- `product_categories` (categorieën)
- `product_ranges` (collecties/reeksen)
- `product_colors` (kleuren per reeks)
- `products` (artikelen)
- `product_prices` (prijzen per prijsgroep)

### Fase 3: Sales & Orders
- `customers` (klanten met referral tracking)
- `quotes`, `quote_sections`, `quote_lines` (offertes)
- `orders`, `order_lines`, `order_documents`, `order_notes`, `order_status_history`

### Fase 4: Extra Functionaliteit
- `subcontractors`, `subcontractor_orders` (onderaannemers)
- `referral_rewards` (klant-stuurt-klant)
- `service_budgets`, `service_transactions` (service potje)

---

## RLS Policies Samenvatting

Alle tabellen krijgen Row Level Security met vestiging-isolatie:

| Rol | Toegang |
|-----|---------|
| Admin | Volledige toegang tot alles |
| Manager | Lezen/schrijven binnen eigen vestiging |
| Verkoper | CRUD op eigen klanten, offertes, orders |
| Assistent | Lezen/schrijven op toegewezen orders |
| Monteur | Alleen lezen van toegewezen orders + eigen notities |

---

## Technische Details

### Aangepaste Users Structuur

In plaats van:
```sql
-- NIET VEILIG
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    role VARCHAR(50) NOT NULL, -- RISICO
    ...
);
```

Wordt dit:
```sql
-- VEILIG
CREATE TYPE app_role AS ENUM ('admin', 'manager', 'verkoper', 'assistent', 'monteur', 'werkvoorbereiding', 'administratie');

CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(200),
    phone VARCHAR(20),
    division_id UUID REFERENCES divisions(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    UNIQUE (user_id, role)
);
```

### Security Definer Functies

```sql
-- Veilige functie om rol te checken (voorkomt RLS recursie)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Huidige gebruiker's vestiging ophalen
CREATE OR REPLACE FUNCTION public.get_user_division_id(_user_id uuid)
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT division_id FROM public.profiles WHERE id = _user_id
$$;
```

### Triggers voor updated_at

Automatische timestamp updates op wijzigingen:
```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Database Indexes

Voor optimale query performance:
- `idx_customers_name` - Zoeken op naam
- `idx_customers_email` - Zoeken op email
- `idx_quotes_customer` - Offertes per klant
- `idx_orders_status` - Orders filteren op status
- `idx_products_supplier` - Producten per leverancier

---

## Na Implementatie

Na het aanmaken van het schema zijn de volgende stappen nodig:

1. **Authenticatie implementeren** - Voordat RLS werkt moeten gebruikers kunnen inloggen
2. **Seed data toevoegen** - Vestigingen, categorieën, leveranciers
3. **Frontend aanpassen** - Customers pagina koppelen aan database
4. **Admin gebruiker aanmaken** - Eerste gebruiker met admin rol

---

## Samenvatting Tabellen (22 totaal)

| Categorie | Tabellen |
|-----------|----------|
| Core (3) | divisions, profiles, user_roles |
| Producten (6) | suppliers, product_categories, product_ranges, product_colors, products, product_prices |
| Sales (9) | customers, quotes, quote_sections, quote_lines, orders, order_lines, order_documents, order_notes, order_status_history |
| Extra (4) | subcontractors, subcontractor_orders, referral_rewards, service_budgets, service_transactions |


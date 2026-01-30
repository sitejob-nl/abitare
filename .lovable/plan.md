# Implementatieplan: Abitare Database Schema

## Status: ✅ VOLLEDIG GECONFIGUREERD

Het volledige database schema is geïmplementeerd en geverifieerd:

---

## Geverifieerde Componenten

### ✅ Alle 22 Tabellen Aanwezig

| Categorie | Tabellen |
|-----------|----------|
| Core (3) | `divisions`, `profiles`, `user_roles` |
| Producten (6) | `suppliers`, `product_categories`, `product_ranges`, `product_colors`, `products`, `product_prices` |
| Sales (9) | `customers`, `quotes`, `quote_sections`, `quote_lines`, `orders`, `order_lines`, `order_documents`, `order_notes`, `order_status_history` |
| Extra (5) | `subcontractors`, `subcontractor_orders`, `referral_rewards`, `service_budgets`, `service_transactions` |

### ✅ Alle Enums Geconfigureerd
- `app_role`: admin, manager, verkoper, assistent, monteur, werkvoorbereiding, administratie
- `customer_type`: particulier, zakelijk
- `quote_status`: concept, verstuurd, bekeken, vervallen, geaccepteerd, afgewezen
- `order_status`: nieuw, bestel_klaar, controle, besteld, in_productie, levering_gepland, geleverd, montage_gepland, gemonteerd, nazorg, afgerond
- `payment_status`: open, deels_betaald, betaald

### ✅ Security Helper Functies
- `has_role(_user_id, _role)` - Controleer of gebruiker een rol heeft
- `is_admin(_user_id)` - Check admin status
- `is_admin_or_manager(_user_id)` - Check admin of manager status
- `get_user_division_id(_user_id)` - Haal vestiging op van gebruiker

### ✅ Alle Foreign Keys Aanwezig
- customers → divisions, profiles (salesperson/assistant)
- quotes → customers, divisions, profiles, product_ranges, product_colors
- orders → customers, quotes, divisions, profiles (salesperson/assistant/installer)
- order_lines → orders, products, suppliers, quote_lines
- product_* → suppliers, product_ranges
- etc.

### ✅ Alle Indexes Aanwezig
- `idx_customers_name`, `idx_customers_email`, `idx_customers_phone`, `idx_customers_division`
- `idx_quotes_customer`, `idx_quotes_status`, `idx_quotes_number`
- `idx_orders_customer`, `idx_orders_quote`, `idx_orders_status`, `idx_orders_number`
- `idx_products_supplier`, `idx_products_category`, `idx_products_code`
- `idx_order_lines_order`, `idx_quote_lines_quote`

### ✅ Alle Triggers Aanwezig
- `customers_updated_at`
- `quotes_updated_at`
- `orders_updated_at`
- `products_updated_at`
- `subcontractor_orders_updated_at`

### ✅ RLS Policies Actief
Alle tabellen hebben Row Level Security met vestiging-isolatie:
- Admin: Volledige toegang
- Manager: Lezen/schrijven binnen eigen vestiging
- Verkoper: CRUD op eigen klanten/offertes/orders
- Assistent: Lezen/schrijven op toegewezen items
- Monteur: Alleen lezen van toegewezen orders

### ✅ Database Linter: Geen Issues
Alle security checks passeren zonder waarschuwingen.

---

## Architectuur Overzicht

```
                                    ┌──────────────┐
                                    │  DIVISIONS   │
                                    └──────┬───────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              │                            │                            │
              ▼                            ▼                            ▼
       ┌──────────────┐             ┌──────────────┐             ┌──────────────┐
       │   PROFILES   │             │  CUSTOMERS   │             │   QUOTES     │
       │ + USER_ROLES │             └──────┬───────┘             └──────┬───────┘
       └──────────────┘                    │                            │
                                           │                            │
                                           ▼                            ▼
                                    ┌──────────────┐          ┌──────────────┐
                                    │   ORDERS     │          │ QUOTE_LINES  │
                                    └──────┬───────┘          └──────────────┘
                                           │
              ┌────────────┬───────────────┼───────────────┬────────────┐
              ▼            ▼               ▼               ▼            ▼
       ┌──────────┐ ┌──────────────┐ ┌──────────┐ ┌──────────────┐ ┌──────────┐
       │ORDER_LINE│ │ORDER_DOCUMENT│ │ORDER_NOTE│ │STATUS_HISTORY│ │SUBCON_ORD│
       └──────────┘ └──────────────┘ └──────────┘ └──────────────┘ └──────────┘


       ┌──────────────┐             ┌──────────────┐
       │  SUPPLIERS   │─────────────│   PRODUCTS   │
       └──────────────┘             └──────┬───────┘
              │                            │
              ▼                            ▼
       ┌──────────────┐             ┌──────────────┐
       │PRODUCT_RANGES│             │PRODUCT_PRICES│
       └──────┬───────┘             └──────────────┘
              │
              ▼
       ┌──────────────┐
       │PRODUCT_COLORS│
       └──────────────┘
```

---

## Volgende Stappen

1. **Authenticatie implementeren** - Login/registratie pagina met Supabase Auth
2. **Seed data toevoegen** - Vestigingen, categorieën, leveranciers
3. **Frontend koppelen** - Customers pagina aan database verbinden
4. **Admin gebruiker aanmaken** - Eerste gebruiker met admin rol



## Fix: RPC type mismatch in `get_products_for_price_group`

**Probleem**: De RPC geeft een 400 error: `"Returned type character varying(255) does not match expected type text in column 18"`. De functie declareert `supplier_name text` in de return type, maar `suppliers.name` is `varchar(255)` in de database. PostgreSQL ziet dit als type mismatch.

**Oplossing**: Eén migratie die de functie opnieuw aanmaakt met expliciete `::text` casts op de varchar kolommen, of de return types wijzigt naar `varchar`.

### Stap 1: Database migratie

`CREATE OR REPLACE FUNCTION get_products_for_price_group` — cast `s.name`, `s.code`, `pc.name`, en `pc.code` naar `::text` in de SELECT, zodat ze matchen met de gedeclareerde return types.

De betreffende kolommen:
- `s.name` → `s.name::text AS supplier_name`  
- `s.code` → `s.code::text AS supplier_code`
- `pc.name` → `pc.name::text AS category_name`
- `pc.code` → `pc.code::text AS category_code`

Geen frontend-wijzigingen nodig.


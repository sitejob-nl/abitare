

# Plan: Fix Admin Rol & Maak Monteur Account

## Probleem Analyse

Na onderzoek blijkt dat:
1. **demo@sitejob.nl heeft GEEN rollen** - De eerdere migratie is mislukt door RLS policies
2. De `user_roles` tabel heeft RLS policies die INSERT blokkeren als je geen admin bent
3. Migraties lopen als `supabase_admin` maar de RLS policies evalueren nog steeds `auth.uid()`

## Oplossing

### Stap 1: Fix de Migratie voor Rollen

Een nieuwe migratie die RLS tijdelijk uitschakelt om de rollen toe te voegen:

```sql
-- Tijdelijk RLS uitschakelen voor deze operatie
ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Admin rol voor demo@sitejob.nl
INSERT INTO public.user_roles (user_id, role)
VALUES ('94f1ad4d-2cf1-4978-bb6b-f61c820b2fa9', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- RLS weer inschakelen
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

### Stap 2: Monteur Account Aanmaken

Na het fixen van de admin rol kan je via de UI (Instellingen → Gebruikers) een nieuwe monteur uitnodigen:
- Klik op "Nieuwe gebruiker"
- Vul email en naam in
- Selecteer "Monteur" als rol
- Kies vestiging

**Of** we maken direct een monteur account aan via dezelfde migratie als er al een account bestaat.

---

## Technische Details

### Bestandswijzigingen

| Bestand | Actie |
|---------|-------|
| `supabase/migrations/XXXXXX_fix_user_roles.sql` | Nieuw - Fix admin rol + optioneel monteur |

### Migratie SQL

```sql
-- Fix: RLS tijdelijk uitschakelen voor rol-toewijzing
-- Dit is nodig omdat migraties als service role draaien maar
-- RLS policies auth.uid() gebruiken die null is in deze context

ALTER TABLE public.user_roles DISABLE ROW LEVEL SECURITY;

-- Admin rol voor demo@sitejob.nl (was niet toegevoegd door RLS blokkade)
INSERT INTO public.user_roles (user_id, role)
VALUES ('94f1ad4d-2cf1-4978-bb6b-f61c820b2fa9', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;

-- Voeg ook monteur rol toe aan demo@sitejob.nl zodat je kan testen
INSERT INTO public.user_roles (user_id, role)
VALUES ('94f1ad4d-2cf1-4978-bb6b-f61c820b2fa9', 'monteur')
ON CONFLICT (user_id, role) DO NOTHING;

-- RLS weer inschakelen
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
```

---

## Stappen na Implementatie

1. **Refresh de pagina** na de migratie
2. **Inloggen als demo@sitejob.nl** - Nu zou je toegang moeten hebben tot Instellingen
3. **Navigeer naar /monteur** - Je hebt nu ook de monteur rol om te testen
4. **Nieuwe monteur uitnodigen** via Instellingen → Gebruikers → Nieuwe gebruiker

---

## Alternatief: Dedicated Monteur Account

Als je een apart monteur account wilt (niet demo@sitejob.nl), kan ik na deze fix via de invite-user edge function een nieuwe gebruiker aanmaken. Dat vereist dat je eerst inlogt als admin (demo of kas).


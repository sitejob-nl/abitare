

# RLS-verbetering projects + Projectselector in QuoteFormDialog

## 1. RLS Policies verscherpen op `projects` tabel

De huidige INSERT en UPDATE policies zijn te ruim (elke ingelogde gebruiker kan alles). Deze worden aangescherpt naar het zelfde patroon als quotes/orders:

**Nieuwe migration:**

```text
-- DROP bestaande te ruime policies
DROP POLICY "Users can create projects" ON public.projects;
DROP POLICY "Users can update projects" ON public.projects;

-- INSERT: alleen eigen divisie of admin/manager
CREATE POLICY "Users can create projects in their division"
  ON public.projects FOR INSERT TO authenticated
  WITH CHECK (
    division_id IS NULL
    OR division_id = public.get_user_division_id(auth.uid())
    OR public.is_admin_or_manager(auth.uid())
  );

-- UPDATE: alleen eigen divisie of admin/manager
CREATE POLICY "Users can update projects in their division"
  ON public.projects FOR UPDATE TO authenticated
  USING (
    division_id IS NULL
    OR division_id = public.get_user_division_id(auth.uid())
    OR public.is_admin_or_manager(auth.uid())
  );
```

Dit zorgt ervoor dat:
- Gebruikers alleen projecten kunnen aanmaken/bewerken binnen hun eigen vestiging
- Admins en managers alles kunnen
- De SELECT en DELETE policies blijven ongewijzigd (zijn al correct)

## 2. Projectselector toevoegen aan QuoteFormDialog

Op stap 1 van het formulier, na de klantselectie, wordt een optionele projectselector toegevoegd:

**Wijzigingen in `src/components/quotes/QuoteFormDialog.tsx`:**
- Import `useCustomerProjects` uit `useProjects.ts`
- State toevoegen: `selectedProjectId`
- Na klantselectie: projecten ophalen voor die klant
- Select dropdown tonen met bestaande projecten + optie "Geen project"
- Bij submit: `project_id` meesturen naar `createQuote`

**Wijzigingen in `src/hooks/useQuotes.ts`:**
- `project_id` toevoegen aan het insert-object in `useCreateQuote`

**UI-positie:** Direct onder de klant-selector op stap 1, alleen zichtbaar als er een klant geselecteerd is. Bevat:
- "Geen project" (default)
- Lijst van bestaande projecten voor die klant (projectnummer + naam)

### Technische details

Het schema-veld `quotes.project_id` bestaat al (toegevoegd in eerdere migration). Er hoeft alleen de UI + hook-aanpassing te komen.

**Bestanden die gewijzigd worden:**
1. Nieuwe migration SQL -- RLS policy verscherping
2. `src/components/quotes/QuoteFormDialog.tsx` -- projectselector UI
3. `src/hooks/useQuotes.ts` -- project_id meesturen bij insert


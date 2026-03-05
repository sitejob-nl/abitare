

## Plan: Configureerbare rolgebaseerde navigatie + verlof-logica

### Huidige situatie

- **Sidebar**: Alle menu-items zijn voor iedereen zichtbaar (behalve monteurs die naar `/monteur` gaan)
- **Verlof**: Admin/manager kan goedkeuren/afkeuren. Iedereen kan aanvragen. Dit is al correct geïmplementeerd
- **Instellingen**: Alleen admin ziet admin-tabs, maar de pagina zelf is niet afgeschermd

### Wat er gebouwd wordt

**1. Database: tabel `role_menu_permissions`**

Sla per rol op welke menu-items zichtbaar zijn. Admin kan dit configureren in Instellingen.

| Kolom | Type |
|---|---|
| id | uuid PK |
| role | app_role |
| menu_key | text (bijv. "dashboard", "quotes", "settings") |
| visible | boolean default true |

Seed met standaard-waarden:
- **admin**: alles zichtbaar
- **manager**: alles behalve Instellingen
- **verkoper**: Dashboard, Klanten, Offertes, Orders, Facturen, Agenda, Verlof, Service, Inbox
- **monteur**: niet relevant (eigen portaal)

**2. Sidebar.tsx aanpassen**

- Voeg `menuKey` toe aan elk `NavItem`
- Haal `role_menu_permissions` op via een nieuwe hook `useMenuPermissions`
- Filter items: toon alleen als `visible = true` voor de huidige rol(len)
- Fallback: als er geen permissions zijn geladen, toon alles (voorkomt lege sidebar)

**3. Instellingen: nieuw tab "Menu-rechten"**

Een matrix-tabel waar de admin per rol checkboxes kan aan/uitzetten:

```text
                  Admin  Manager  Verkoper
Dashboard          ✓       ✓        ✓
Klanten            ✓       ✓        ✓
Offertes           ✓       ✓        ✓
Orders             ✓       ✓        ✓
Facturen           ✓       ✓        ✓
Agenda             ✓       ✓        ✓
Verlof             ✓       ✓        ✓
Montage            ✓       ✓        ☐
Service            ✓       ✓        ✓
Inbox              ✓       ✓        ✓
Producten          ✓       ✓        ☐
Rapportages        ✓       ✓        ☐
Instellingen       ✓       ☐        ☐
```

Elke checkbox-wijziging doet een upsert op `role_menu_permissions`.

**4. Verlof-logica verduidelijking**

De huidige implementatie is al correct:
- **Iedereen** kan verlof aanvragen (de "Verlof aanvragen" knop)
- **Alleen admin/manager** ziet de goedkeur/afkeur-knoppen (`isManager` check op regel 50)
- Normale medewerkers zien alleen hun eigen aanvragen + status

Wat nog verbeterd wordt:
- Verkopers zien nu ook andermans verlof — filter zodat niet-managers alleen hun eigen aanvragen zien
- Managers/admins zien alle aanvragen zodat ze kunnen goedkeuren

### Wijzigingen

| Bestand | Actie |
|---|---|
| Migratie | Nieuwe tabel `role_menu_permissions` + seed data |
| `src/hooks/useMenuPermissions.ts` | Nieuw: ophalen van permissions voor huidige rol |
| `src/components/layout/Sidebar.tsx` | `menuKey` per item + filter op permissions |
| `src/pages/Settings.tsx` | Nieuw tab "Menu-rechten" met matrix-editor |
| `src/components/settings/MenuPermissionsSettings.tsx` | Nieuw: matrix-component |
| `src/pages/LeaveManagement.tsx` | Filter: niet-managers zien alleen eigen aanvragen |
| `src/hooks/useLeaveRequests.ts` | Rol-gebaseerde query filter toevoegen |

### RLS-beleid

- `role_menu_permissions`: SELECT voor `authenticated`, INSERT/UPDATE/DELETE alleen voor `admin`
- Voorkomt dat niet-admins hun eigen menu-rechten aanpassen


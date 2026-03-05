

## Plan: Monteur toewijzen op Order Detail pagina

De hooks `useAssignInstaller` en `useInstallers` bestaan al en worden in de kalender-dagweergave gebruikt. Het enige dat ontbreekt is de UI op de order detail pagina.

### Aanpak

**Bestand: `src/components/orders/OrderInfoCard.tsx`**

Voeg een monteur-selectie toe onderaan de datums-sectie (na de prognose-week). Gebruikt dezelfde `useInstallers` hook als de kalender. De component krijgt twee nieuwe props:

- `installerId: string | null` — huidige monteur
- `onAssignInstaller: (installerId: string | null) => void` — callback

UI: een `<Select>` dropdown met "Geen monteur" + lijst van alle actieve monteurs (gebruikers met rol 'monteur'). Toont een `Wrench` icoon, consistent met de kalender.

**Bestand: `src/pages/OrderDetail.tsx`**

- Importeer `useAssignInstaller` en `useInstallers`
- Geef `installerId` en `onAssignInstaller` door aan `OrderInfoCard`
- De order query haalt al `*` op van orders, dus `installer_id` is beschikbaar

### Wijzigingen

| Bestand | Actie |
|---|---|
| `OrderInfoCard.tsx` | Props uitbreiden + monteur-select toevoegen |
| `OrderDetail.tsx` | Hook aansluiten + props doorgeven |

Geen database-wijzigingen nodig — `installer_id` kolom en de hooks bestaan al.


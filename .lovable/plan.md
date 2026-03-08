

## End-to-end Workflow Test Plan

Ik ga de volledige workflow testen via de browser automation. De user is ingelogd als `demo@sitejob.nl` met admin+monteur rollen op division `22222222-2222-2222-2222-222222222222`.

### Teststappen

1. **Klant aanmaken** — Navigeer naar `/customers`, klik "Nieuwe klant", vul formulier in (naam, e-mail, telefoon, adres), sla op, verifieer dat de klant in de lijst verschijnt.

2. **Offerte maken** — Navigeer naar `/quotes`, maak nieuwe offerte aan voor de zojuist aangemaakte klant, voeg een sectie en productregel toe, verifieer dat totalen correct berekend worden.

3. **Offerte omzetten naar order** — Open de offerte, gebruik de "Omzetten naar order" actie, verifieer dat een order wordt aangemaakt met status "nieuw" en dat de offerte-status wijzigt naar "geaccepteerd".

4. **Order workflow testen** — Open de aangemaakte order, controleer of de order gates correct werken (checklist, montageadres, documenten), verifieer statuswijzigingen.

5. **Factuur aanmaken** — Navigeer naar `/invoices`, maak een factuur aan voor de order, verifieer dat de factuurgegevens correct zijn.

### Naast de workflow: Bekende issues fixen

Uit de network requests blijkt een **PGRST200 error** op `user_mentions` — de foreign key `user_mentions_mentioned_by_fkey` naar `profiles` bestaat niet. Dit moet gefixt worden:
- De query in de frontend gebruikt `mentioner:profiles!user_mentions_mentioned_by_fkey` maar deze FK-relatie ontbreekt in de database.
- Fix: de query aanpassen of de FK toevoegen via migratie.

Uit de console logs: **StatCard ref warning** — `StatCard` component accepteert geen ref maar wordt er wel mee aangeroepen vanuit `Dashboard`. Fix: wrap `StatCard` in `React.forwardRef`.

### Totaal
- 5 browser-teststappen (workflow)
- 2 bugfixes (user_mentions FK error, StatCard ref warning)

